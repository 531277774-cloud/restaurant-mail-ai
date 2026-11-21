import { sendEmail } from "@/lib/mailer";
import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const PRIMARY_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-flash";
const BACKUP_MODEL = "deepseek-v4-pro";
const MODELS = Array.from(new Set([PRIMARY_MODEL, BACKUP_MODEL]));

const DAILY_LIMIT = 1000;
const SESSION_LIMIT = 30;
const ALERT_THRESHOLD = 900;
const ALERT_EMAIL = "531277774@qq.com";
const SESSION_COOKIE = "rmai_session";
const DAY_SECONDS = 86400;
const TIMEOUT_MS = 60000;

// Persisted counter via Redis (Upstash Redis / Vercel KV backing store).
// When credentials are missing (local dev), rate limiting is skipped.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const SYSTEM_PROMPTS: Record<string, string> = {
  extract_info: `You extract structured fields from a user's restaurant email request. Return ONLY valid JSON (a single json object, no markdown fences) with these keys (use empty string when unknown): emailType, offer, offerExpiry, cta, restaurantName, restaurantType, tone, length. For "offer", capture only the discount/offer details (e.g. "15% off dine-in"). For "offerExpiry", capture the expiry date separately whenever mentioned (e.g. "This weekend (Sat-Sun)" or "March 31"); use empty string if no expiry is given.`,
  followup_question: `You are a copywriter editing an existing restaurant email based on the user's follow-up instruction. Return ONLY valid JSON (a single json object, no markdown fences) with any of these keys you changed: subject, previewText, body, cta.`,
  generate_final_email: `You are a restaurant email marketing expert for American independent restaurants. Based on the restaurant details and conversation provided, write a high-converting marketing email. Return ONLY valid JSON (a single json object, no markdown fences) with exactly these keys:
- "subject": the email subject line
- "previewText": a short preview text line
- "body": the plain-text email body (paragraphs separated by blank lines). If an offerExpiry is provided, state the deadline clearly (e.g. "Hurry — this offer ends this weekend") to create urgency.
- "cta": the main call-to-action button text
- "html": a clean HTML email template following these strict rules: table layout only with all inline styles (no <style>, no CSS classes, no flex/grid); simple palette with deep blue (#1e3a5f) as the primary color, soft rounded corners and a light shadow, compatible with Gmail, Apple Mail and Outlook; footer uses only placeholder text "[Your Street Address, City, State, ZIP]", "[Phone number or email]" and "[Unsubscribe link will be added automatically by your email platform]" (plain text, no link); the CTA is a bulletproof table-based button with border-radius and box-shadow on the outer <td> and bgcolor on the <td>, the <a> inside uses only display:block and href="https://replace-this-with-your-link.com"; the main card table must NOT use overflow:hidden; no external JS or external fonts; output only clean HTML with no comments and no markdown.`,
};

interface ChatMessage {
  role: string;
  content: string;
}

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function stripFences(text: string): string {
  return text.replace(/```(?:json)?/g, "").trim();
}

function friendlyMessage(status?: number): string {
  if (status === 429) {
    return "Our AI service is experiencing high demand. Please try again in a moment.";
  }
  if (status === 408 || status === 504) {
    return "The AI service took too long to respond. Please try again.";
  }
  return "Our AI service is temporarily unavailable. Please try again later.";
}

function logError(
  taskType: string,
  model: string,
  status: number | undefined,
  error: unknown
) {
  // Log full details only for local debugging; never leak to the frontend.
  if (process.env.NODE_ENV === "development") {
    console.error(
      `[generate-email] taskType=${taskType} model=${model} status=${status ?? "n/a"} error=`,
      error
    );
  }
}

function jsonWithSession(
  body: Record<string, unknown>,
  status: number,
  sessionId: string
) {
  const res = NextResponse.json(body, { status });
  res.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    maxAge: DAY_SECONDS,
    path: "/",
    sameSite: "lax",
  });
  return res;
}

async function sendDailyAlert(count: number) {
  try {
    await sendEmail({
      to: ALERT_EMAIL,
      subject: `[Restaurant Mail AI] Daily usage reached ${count}`,
      text: `Daily AI generation count reached ${count} (alert threshold ${ALERT_THRESHOLD} / limit ${DAILY_LIMIT}).`,
    });
  } catch (error) {
    console.error("[generate-email] Failed to send alert email:", error);
  }
}

async function callDeepSeek(
  model: string,
  messages: ChatMessage[],
  apiKey: string
): Promise<
  | { ok: true; content: string }
  | { ok: false; status?: number; error?: string }
> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";
    return { ok: true, content };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "AbortError") {
      return { ok: false, status: 408, error: "timeout" };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "fetch error",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  // Security: the API key stays server-side only and is never returned.
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI is not configured" },
      { status: 503 }
    );
  }

  const sessionId = req.cookies.get(SESSION_COOKIE)?.value || randomUUID();

  let sessionKey: string | null = null;
  let dailyKey: string | null = null;

  // Soft pre-check before the call; the authoritative increment happens after success.
  if (redis) {
    const date = dayKey();
    sessionKey = `rmai:session:${date}:${sessionId}`;
    dailyKey = `rmai:daily:${date}`;

    const [sessionCount, dailyCount] = await Promise.all([
      redis.get(sessionKey),
      redis.get(dailyKey),
    ]);
    const s = Number(sessionCount || 0);
    const d = Number(dailyCount || 0);

    if (d >= DAILY_LIMIT) {
      return jsonWithSession(
        {
          error: "DAILY_LIMIT",
          message:
            "We have reached our daily usage limit. Please try again tomorrow.",
        },
        429,
        sessionId
      );
    }
    if (s >= SESSION_LIMIT) {
      return jsonWithSession(
        {
          error: "SESSION_LIMIT",
          message:
            "You have reached your session limit of 30 conversations. Please come back tomorrow.",
        },
        429,
        sessionId
      );
    }
  }

  let taskType = "";
  let messages: ChatMessage[] = [];
  try {
    const body = await req.json();
    taskType = typeof body?.taskType === "string" ? body.taskType : "";
    const systemPrompt = SYSTEM_PROMPTS[taskType];
    if (!systemPrompt) {
      return NextResponse.json(
        { message: "Invalid taskType." },
        { status: 400 }
      );
    }

    let userMessage: string;
    if (taskType === "extract_info") {
      userMessage = typeof body?.text === "string" ? body.text : "";
    } else if (taskType === "followup_question") {
      userMessage = JSON.stringify({
        currentEmail: body?.email || {},
        instruction: body?.instruction || "",
      });
    } else {
      // generate_final_email
      const restaurantInfo = body?.restaurantInfo || {};
      const context: ChatMessage[] = Array.isArray(body?.messages)
        ? body.messages
        : [];
      userMessage =
        `Restaurant details:\n${JSON.stringify(restaurantInfo, null, 2)}\n\n` +
        `Conversation:\n${context
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")}`;
    }

    messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  // Model fallback: primary (deepseek-flash) → backup (deepseek-v4-pro).
  let parsed: Record<string, unknown> | null = null;
  let lastStatus: number | undefined;

  for (const model of MODELS) {
    const result = await callDeepSeek(model, messages, apiKey);
    if (result.ok) {
      try {
        parsed = JSON.parse(stripFences(result.content));
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[generate-email] taskType=${taskType} model=${model} status=200`
          );
        }
        break;
      } catch {
        logError(taskType, model, undefined, "Invalid JSON response");
      }
    } else {
      lastStatus = result.status;
      logError(taskType, model, result.status, result.error);
    }
  }

  if (!parsed) {
    return jsonWithSession(
      { message: friendlyMessage(lastStatus) },
      502,
      sessionId
    );
  }

  // Count only successful calls; failed fallback attempts are not counted.
  if (redis && sessionKey && dailyKey) {
    const [newDaily, newSession] = await Promise.all([
      redis.incr(dailyKey),
      redis.incr(sessionKey),
    ]);
    await Promise.all([
      redis.expire(dailyKey, DAY_SECONDS),
      redis.expire(sessionKey, DAY_SECONDS),
    ]);
    if (newDaily === ALERT_THRESHOLD) {
      sendDailyAlert(newDaily).catch(() => {});
    }
  }

  return jsonWithSession({ result: parsed }, 200, sessionId);
}
