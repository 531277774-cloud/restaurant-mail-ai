"use client";

import { Button } from "@/components/ui/button";
import {
  Check,
  Copy,
  Loader2,
  Monitor,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  countWords,
  reportSessionEnd,
  trackEvent,
  trackSendMessage,
} from "@/lib/tracking";
import { FAQ_ITEMS } from "@/config/seo";

type FieldKey =
  | "emailType"
  | "offer"
  | "offerExpiry"
  | "cta"
  | "restaurantName"
  | "restaurantType"
  | "tone"
  | "length";

interface Collected {
  emailType: string;
  offer: string;
  offerExpiry: string;
  cta: string;
  restaurantName: string;
  restaurantType: string;
  tone: string;
  length: string;
}

interface Question {
  key: FieldKey;
  label: string;
  options: string[];
  placeholder?: string;
}

interface EmailResult {
  subject: string;
  previewText: string;
  body: string;
  suggestedCta: string;
  restaurantName: string;
  address: string;
  unsubscribe: string;
  contact: string;
  html?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const QUESTIONS: Question[] = [
  { key: "emailType", label: "What type of email would you like to create?", options: ["New Offer & Promotion", "Win-back & Loyalty", "Menu Launch", "Review Request", "Event & Booking", "Welcome Email", "I'll describe it myself"], placeholder: "Describe the email purpose" },
  { key: "offer", label: "Do you have a discount, bundle or limited-time offer to include?", options: ["No special offer"], placeholder: "e.g. 15% off dine-in, valid this weekend only" },
  { key: "cta", label: "What action do you want customers to take?", options: ["Book a table", "Order online", "Visit in store"], placeholder: "e.g. Book a table" },
  { key: "restaurantName", label: "What is your restaurant name?", options: [], placeholder: "e.g. Lily's Italian Bistro" },
  { key: "restaurantType", label: "What type of restaurant is it?", options: ["Casual American", "Pizza", "Burger", "Café / Bakery", "Italian", "Mexican", "Asian", "Fine Dining", "Bar / Pub", "I'll type it myself"], placeholder: "e.g. Italian" },
  { key: "tone", label: "What tone do you prefer for this email?", options: ["Warm", "Upscale", "Casual & Quick"], placeholder: "e.g. Warm" },
  { key: "length", label: "How long would you like this email to be?", options: ["Short (quick reminder)", "Standard (most promotions)", "Detailed (holiday / menu launches)"], placeholder: "Standard" },
];

const DEFAULTS: Collected = {
  emailType: "New Offer & Promotion",
  offer: "No special offer",
  offerExpiry: "",
  cta: "Visit us today",
  restaurantName: "Your Restaurant",
  restaurantType: "Restaurant",
  tone: "Warm",
  length: "Standard (most promotions)",
};

function extractFields(input: string): Collected {
  const text = input.toLowerCase();
  const c: Collected = {
    emailType: "",
    offer: "",
    offerExpiry: "",
    cta: "",
    restaurantName: "",
    restaurantType: "",
    tone: "",
    length: "",
  };

  if (/win.?back|loyalty|come back|inactive/.test(text)) c.emailType = "Win-back & Loyalty";
  else if (/menu launch|new menu|new dish|new item/.test(text)) c.emailType = "Menu Launch";
  else if (/review|feedback|rating/.test(text)) c.emailType = "Review Request";
  else if (/event|booking|reserv|mother.?s day|holiday|christmas|new year|valentine|birthday/.test(text)) c.emailType = "Event & Booking";
  else if (/welcome|sign.?up|new customer/.test(text)) c.emailType = "Welcome Email";
  else if (/offer|promo|promotion|discount|deal|sale|coupon/.test(text)) c.emailType = "New Offer & Promotion";

  if (/(\d+\s*%|\$\s*\d+|discount|off|free|bundle|deal|coupon|limited)/.test(text)) {
    c.offer = "Special offer (see your description)";
  }

  const expiryMatch = text.match(
    /(?:valid|expires?|until|through|deadline|ends)\s+(.+)/i
  );
  if (expiryMatch) c.offerExpiry = expiryMatch[1].trim().replace(/[.,!;].*$/, "");

  if (/book|reserve|reserv|table/.test(text)) c.cta = "Book a table";
  else if (/order|delivery|takeout|pickup/.test(text)) c.cta = "Order online";
  else if (/visit|dine.?in|store|come in/.test(text)) c.cta = "Visit in store";

  const nameMatch = input.match(
    /(?:i own|i run|we are|we're|called|named|our restaurant is)\s+(?:a\s+|an\s+|the\s+)?([A-Z][\w'’.\- ]+?(?:Bistro|Café|Cafe|Pizzeria|Restaurant|Bar|Pub|Diner|Bakery|Grill|Kitchen|Trattoria|Osteria|Eatery))/i
  );
  if (nameMatch) c.restaurantName = nameMatch[1].trim();

  if (/pizza/.test(text)) c.restaurantType = "Pizza";
  else if (/burger/.test(text)) c.restaurantType = "Burger";
  else if (/italian/.test(text)) c.restaurantType = "Italian";
  else if (/mexican/.test(text)) c.restaurantType = "Mexican";
  else if (/asian|sushi|thai|chinese/.test(text)) c.restaurantType = "Asian";
  else if (/caf[eé]|coffee/.test(text)) c.restaurantType = "Café";
  else if (/baker/.test(text)) c.restaurantType = "Bakery";
  else if (/fine dining|upscale/.test(text)) c.restaurantType = "Fine Dining";
  else if (/bar\b|pub/.test(text)) c.restaurantType = "Bar";

  if (/warm/.test(text)) c.tone = "Warm";
  else if (/upscale|elegant|refined/.test(text)) c.tone = "Upscale";
  else if (/casual|quick|friendly/.test(text)) c.tone = "Casual & Quick";

  if (/short|quick|brief/.test(text)) c.length = "Short (quick reminder)";
  else if (/detailed|long|full|holiday|menu launch/.test(text)) c.length = "Detailed (holiday / menu launches)";
  else if (/standard/.test(text)) c.length = "Standard (most promotions)";

  return c;
}

function isFieldPresent(c: Collected, key: FieldKey): boolean {
  return Boolean(c[key] && c[key].trim());
}

// Returns the single next question to ask, in strict order, or null when done.
// `asked` is the set of fields already extracted / answered / skipped, which
// guarantees the same question is never asked twice.
function nextQuestion(c: Collected, asked: Set<FieldKey>): Question | null {
  for (const q of QUESTIONS) {
    if (asked.has(q.key)) continue;
    if (isFieldPresent(c, q.key)) continue;
    return q;
  }
  return null;
}

function resolveCollected(c: Collected): Collected {
  return {
    emailType: c.emailType || DEFAULTS.emailType,
    offer: c.offer || DEFAULTS.offer,
    offerExpiry: c.offerExpiry || DEFAULTS.offerExpiry,
    cta: c.cta || DEFAULTS.cta,
    restaurantName: c.restaurantName || DEFAULTS.restaurantName,
    restaurantType: c.restaurantType || DEFAULTS.restaurantType,
    tone: c.tone || DEFAULTS.tone,
    length: c.length || DEFAULTS.length,
  };
}

function getSuggestedCta(c: Collected): string {
  const t = (c.emailType + " " + c.offer + " " + c.offerExpiry + " " + c.cta).toLowerCase();
  if (/menu launch|new menu|new dish/.test(t)) return "Try Our New Menu";
  if (/event|booking|reserv|holiday|mother/.test(t)) return "Reserve Your Table";
  if (/order|delivery|takeout/.test(t)) return "Order Now";
  if (/weekend|this week|limited|expire/.test(t)) return "Claim Your Offer";
  if (/christmas|new year|valentine|holiday/.test(t)) return "Celebrate With Us";
  if (/win.?back|loyalty/.test(t)) return "Come Back & Enjoy";
  if (/gift card/.test(t)) return "Buy a Gift Card";
  if (/happy hour/.test(t)) return "View Happy Hour Menu";
  if (/review/.test(t)) return "Leave a Review";
  if (/book|reserve/.test(c.cta)) return "Reserve Your Table";
  if (/order/.test(c.cta)) return "Order Now";
  if (/visit|dine/.test(c.cta)) return "Visit Us Today";
  return "Get Started";
}

function buildSubject(c: Collected, name: string): string {
  const t = c.emailType.toLowerCase();
  if (/win.?back|loyalty/.test(t)) return `We miss you at ${name} — a little something to say thanks`;
  if (/menu launch|new menu/.test(t)) return `Something new is on the menu at ${name}`;
  if (/review/.test(t)) return `How was your experience at ${name}?`;
  if (/event|booking|reserv/.test(t)) return `Reserve your table at ${name}`;
  if (/welcome/.test(t)) return `Welcome to ${name}!`;
  return `${name} has a special offer just for you`;
}

function buildPreview(c: Collected): string {
  const t = c.emailType.toLowerCase();
  if (/win.?back|loyalty/.test(t)) return "It's been a while — and we'd love to see you again.";
  if (/review/.test(t)) return "Tell us how we did. It only takes a minute.";
  if (/event|booking|reserv/.test(t)) return "Book your table before it fills up.";
  return "Don't miss out — details inside.";
}

function purposeSentence(emailType: string, name: string): string {
  const t = emailType.toLowerCase();
  if (/win.?back|loyalty/.test(t)) return `It's been a little while since we saw you at ${name}, and we'd love to welcome you back.`;
  if (/menu launch|new menu/.test(t)) return `We've been busy in the kitchen, and our newest dishes at ${name} are finally ready for you.`;
  if (/review/.test(t)) return `Thank you for dining at ${name}. We'd love to hear how your experience went.`;
  if (/event|booking|reserv/.test(t)) return `A special occasion is coming up at ${name}, and we'd love for you to be part of it.`;
  if (/welcome/.test(t)) return `Welcome to ${name}! We're so glad you're here.`;
  return `We've put together something special for you at ${name}.`;
}

function buildBody(c: Collected, name: string, cta: string, hasOffer: boolean, offerText: string, expiryText: string, short: boolean): string {
  const opening =
    c.tone === "Upscale"
      ? "Dear guest,"
      : c.tone === "Casual & Quick"
      ? "Hey there,"
      : "Hi there,";

  const lines = [opening, "", purposeSentence(c.emailType, name)];
  if (hasOffer) {
    lines.push("");
    lines.push(`Here's the detail you won't want to miss:${offerText}`);
    if (expiryText) {
      lines.push("");
      lines.push(expiryText);
    }
  }
  lines.push("");
  lines.push(`Tap below to ${cta.toLowerCase()}.`);
  if (!short) {
    lines.push("");
    lines.push("Thank you for being part of our table. We can't wait to serve you again soon.");
  }
  lines.push("");
  lines.push("Warm regards,");
  lines.push(`The ${name} team`);
  return lines.join("\n");
}

function generateEmail(c: Collected): EmailResult {
  const name = c.restaurantName;
  const cta = getSuggestedCta(c);
  const hasOffer = Boolean(c.offer && c.offer !== "No special offer");
  const offerText = hasOffer ? ` ${c.offer}` : "";
  const expiryText =
    hasOffer && c.offerExpiry && c.offerExpiry.trim()
      ? `Hurry — this offer ends ${c.offerExpiry.trim()}.`
      : "";
  const short = /short/i.test(c.length);

  return {
    subject: buildSubject(c, name),
    previewText: buildPreview(c),
    body: buildBody(c, name, cta, hasOffer, offerText, expiryText, short),
    suggestedCta: cta,
    restaurantName: name,
    address: "[Your Street Address, City, State, ZIP]",
    unsubscribe: "[Unsubscribe link will be added automatically by your email platform]",
    contact: "[Phone number or email]",
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPlainText(e: EmailResult): string {
  return [
    `Subject: ${e.subject}`,
    "",
    e.body,
    "",
    e.suggestedCta,
    "",
    "—",
    e.restaurantName,
    e.address,
    e.unsubscribe,
  ].join("\n");
}

function buildHtml(e: EmailResult): string {
  const pStyle = "margin:0 0 16px;line-height:1.6;color:#333333;font-size:15px;";
  const bodyHtml = `<p style="${pStyle}">${escapeHtml(e.body)
    .replace(/\n\n/g, `</p><p style="${pStyle}">`)
    .replace(/\n/g, "<br>")}</p>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f5f7;padding:24px 0;">
<tr>
<td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
<tr>
<td style="height:160px;background-color:#1e3a5f;text-align:center;vertical-align:middle;color:#ffffff;font-size:13px;letter-spacing:1px;">[ BANNER IMAGE — 600 × 200 ]</td>
</tr>
<tr>
<td style="padding:32px;">
<p style="margin:0 0 8px;font-size:13px;color:#888888;">${escapeHtml(e.previewText)}</p>
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#1e3a5f;">${escapeHtml(e.subject)}</h1>
${bodyHtml}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px auto 8px;">
<tr>
<td align="center" bgcolor="#1e3a5f" style="border-radius:8px;background-color:#1e3a5f;box-shadow:0 2px 6px rgba(30,58,95,0.2);">
<a href="https://replace-this-with-your-link.com" target="_blank" style="display:block;padding:12px 28px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;">${escapeHtml(e.suggestedCta)}</a>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="background-color:#f4f5f7;padding:24px;font-size:12px;color:#666666;line-height:1.7;">
<p style="margin:0;">${escapeHtml(e.restaurantName)}</p>
<p style="margin:0;">${escapeHtml(e.address)}</p>
<p style="margin:0;">${escapeHtml(e.contact)}</p>
<p style="margin:12px 0 0;">${escapeHtml(e.unsubscribe)}</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function applyEditInstruction(e: EmailResult, instruction: string): EmailResult {
  const ins = instruction.toLowerCase();
  const next: EmailResult = { ...e };

  if (/shorter|concise|brief|trim/.test(ins)) {
    next.body = e.body.split("\n\n").slice(0, 3).join("\n\n");
  } else if (/longer|more detail|detailed|elaborate|expand/.test(ins)) {
    next.body =
      e.body +
      "\n\nWe're also happy to share more about what makes dining with us special, from our seasonal ingredients to our friendly team. Stop by and see for yourself.";
  } else if (/more casual|casual|friendly|relaxed/.test(ins)) {
    next.body = e.body.replace(/Dear guest,|Hi there,|Hey there,/g, "Hey there,");
  } else if (/more formal|formal|upscale|elegant|professional/.test(ins)) {
    next.body = e.body.replace(/Dear guest,|Hi there,|Hey there,/g, "Dear guest,");
  } else if (/subject/.test(ins)) {
    const m = instruction.match(/subject\s+(?:to|:)?\s*(.+)/i);
    if (m) next.subject = m[1].trim();
  } else if (/\bcta\b|button|call to action/.test(ins)) {
    const m = instruction.match(/(?:cta|button|call to action)\s*(?:to|:)?\s*(.+)/i);
    if (m) next.suggestedCta = m[1].trim();
  } else {
    next.body =
      e.body +
      "\n\nP.S. Don't forget to follow us for more updates and special offers.";
  }

  return next;
}

type TaskType = "extract_info" | "followup_question" | "generate_final_email";

async function callUnifiedAI(
  taskType: TaskType,
  payload: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  let res: Response;
  try {
    res = await fetch("/api/generate-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskType, ...payload }),
    });
  } catch {
    return null; // network error → fall back to mock
  }

  const data = await res.json().catch(() => ({}));

  if (res.ok) {
    return data && typeof data.result === "object" && data.result !== null
      ? (data.result as Record<string, unknown>)
      : null;
  }

  if (res.status === 503) return null; // AI not configured → mock fallback

  const message =
    data && typeof data.message === "string" ? data.message : null;
  if (message) throw new Error(message);
  return null;
}

function normalizeCollected(raw: Partial<Collected>): Collected {
  return {
    emailType: typeof raw.emailType === "string" ? raw.emailType : "",
    offer: typeof raw.offer === "string" ? raw.offer : "",
    offerExpiry: typeof raw.offerExpiry === "string" ? raw.offerExpiry : "",
    cta: typeof raw.cta === "string" ? raw.cta : "",
    restaurantName:
      typeof raw.restaurantName === "string" ? raw.restaurantName : "",
    restaurantType:
      typeof raw.restaurantType === "string" ? raw.restaurantType : "",
    tone: typeof raw.tone === "string" ? raw.tone : "",
    length: typeof raw.length === "string" ? raw.length : "",
  };
}

async function extractFieldsWithAI(text: string): Promise<Collected> {
  const raw = await callUnifiedAI("extract_info", { text });
  if (raw) {
    return normalizeCollected(raw as Partial<Collected>);
  }
  return extractFields(text);
}

async function generateEmailWithAI(
  c: Collected,
  chatLog: ChatMessage[] = []
): Promise<EmailResult> {
  const raw = await callUnifiedAI("generate_final_email", {
    restaurantInfo: c,
    messages: chatLog.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.text,
    })),
  });
  const fallback = generateEmail(c);
  if (!raw) return fallback;

  return {
    subject:
      typeof raw.subject === "string" && raw.subject
        ? raw.subject
        : fallback.subject,
    previewText:
      typeof raw.previewText === "string" && raw.previewText
        ? raw.previewText
        : fallback.previewText,
    body: typeof raw.body === "string" && raw.body ? raw.body : fallback.body,
    suggestedCta:
      typeof raw.cta === "string" && raw.cta ? raw.cta : fallback.suggestedCta,
    restaurantName: c.restaurantName,
    address: fallback.address,
    unsubscribe: fallback.unsubscribe,
    contact: fallback.contact,
    html: typeof raw.html === "string" && raw.html ? raw.html : undefined,
  };
}

async function editEmailWithAI(
  e: EmailResult,
  instruction: string
): Promise<EmailResult> {
  const raw = await callUnifiedAI("followup_question", {
    email: e,
    instruction,
  });
  if (raw) {
    return {
      ...e,
      subject:
        typeof raw.subject === "string" && raw.subject
          ? raw.subject
          : e.subject,
      previewText:
        typeof raw.previewText === "string" && raw.previewText
          ? raw.previewText
          : e.previewText,
      body: typeof raw.body === "string" && raw.body ? raw.body : e.body,
      suggestedCta:
        typeof raw.cta === "string" && raw.cta ? raw.cta : e.suggestedCta,
    };
  }
  return applyEditInstruction(e, instruction);
}

function Conversation({ chatLog }: { chatLog: ChatMessage[] }) {
  if (chatLog.length === 0) return null;
  return (
    <div className="space-y-3">
      {chatLog.map((m, i) => (
        <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
          <div
            className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 text-left text-sm ${
              m.role === "user"
                ? "bg-blue-700 text-white"
                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-gray-200"
            }`}
          >
            {m.text}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RestaurantEmailGenerator() {
  const [stage, setStage] = useState<"input" | "loading" | "question" | "result">("input");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [collected, setCollected] = useState<Collected>({ ...DEFAULTS });
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [askedFields, setAskedFields] = useState<Set<FieldKey>>(new Set());
  const [answerText, setAnswerText] = useState("");
  const [questionError, setQuestionError] = useState("");
  const questionInputRef = useRef<HTMLInputElement>(null);
  const lastGenerateClickRef = useRef(0);

  // Report session_end once when the page is closed/unloaded.
  useEffect(() => {
    const handler = () => reportSessionEnd();
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, []);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [email, setEmail] = useState<EmailResult | null>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [copiedPlain, setCopiedPlain] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [followUpText, setFollowUpText] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const updateEmail = (patch: Partial<EmailResult>) =>
    setEmail((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleGenerate = async () => {
    const text = description.trim();
    if (!text) {
      setError("Please describe your email goal for your restaurant.");
      return;
    }
    setError("");
    setStage("loading");
    setChatLog([{ role: "user", text }]);
    // Debounce click_generate to avoid duplicate events on rapid clicks.
    const now = Date.now();
    if (now - lastGenerateClickRef.current > 2000) {
      lastGenerateClickRef.current = now;
      trackEvent("click_generate");
    }
    trackSendMessage(countWords(text));

    try {
      // Real LLM extraction when configured; falls back to mock otherwise.
      await new Promise((r) => setTimeout(r, 600));
      const extracted = await extractFieldsWithAI(text);
      setCollected(extracted);
      const asked = new Set<FieldKey>();
      for (const q of QUESTIONS) {
        if (isFieldPresent(extracted, q.key)) asked.add(q.key);
      }
      setAskedFields(asked);
      const next = nextQuestion(extracted, asked);

      if (!next) {
        const resolved = resolveCollected(extracted);
        setEmail(await generateEmailWithAI(resolved, [{ role: "user", text }]));
        setChatLog([
          { role: "user", text },
          { role: "assistant", text: "Here's your email. You can edit it below before copying." },
        ]);
        setStage("result");
      } else {
        setCurrentQuestion(next);
        setAnswerText("");
        setStage("question");
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Failed to generate email, please try again."
      );
      setStage("input");
    }
  };

  const handleAnswer = async (answer: string, skipped: boolean) => {
    if (!currentQuestion) return;
    const q = currentQuestion;
    const value = !skipped && answer.trim() ? answer.trim() : "";

    // Validation: restaurant type must not equal the restaurant name.
    if (q.key === "restaurantType" && !skipped && value) {
      const name = collected.restaurantName.trim().toLowerCase();
      if (name && value.toLowerCase() === name) {
        setQuestionError(
          "That looks like your restaurant name. Please enter the cuisine type instead, e.g. Pizza, Café, Mexican."
        );
        setAnswerText("");
        return;
      }
    }
    setQuestionError("");

    if (value) {
      trackSendMessage(countWords(value));
    }

    // Capture an expiry date typed inside the offer answer (optional field).
    let nextCollected = { ...collected, [q.key]: value };
    if (q.key === "offer" && !skipped && value) {
      const expiryMatch = value.match(
        /(?:valid|expires?|until|through|deadline|ends)\s+(.+)/i
      );
      if (expiryMatch) {
        nextCollected = {
          ...nextCollected,
          offerExpiry: expiryMatch[1].trim().replace(/[.,!;].*$/, ""),
        };
      }
    }

    const newChat: ChatMessage[] = [
      ...chatLog,
      { role: "assistant", text: q.label },
      { role: "user", text: value || "(Skipped)" },
    ];
    const nextAsked = new Set(askedFields);
    nextAsked.add(q.key);

    setCollected(nextCollected);
    setChatLog(newChat);
    setAskedFields(nextAsked);
    setAnswerText("");

    const next = nextQuestion(nextCollected, nextAsked);

    if (next) {
      setCurrentQuestion(next);
    } else {
      const resolved = resolveCollected(nextCollected);
      // Transition out of the question UI immediately so the last question
      // can't be re-answered (and double-counted) while generation runs.
      setCurrentQuestion(null);
      setStage("loading");
      try {
        setEmail(await generateEmailWithAI(resolved, newChat));
        setChatLog([
          ...newChat,
          { role: "assistant", text: "Here's your email. You can edit it below before copying." },
        ]);
        setStage("result");
      } catch (err) {
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Failed to generate email, please try again."
        );
        setStage("input");
      }
    }
  };

  const reset = () => {
    setStage("input");
    setDescription("");
    setError("");
    setChatLog([]);
    setEmail(null);
    setCurrentQuestion(null);
    setAskedFields(new Set());
    setAnswerText("");
    setQuestionError("");
    setCollected({ ...DEFAULTS });
    setViewMode("desktop");
    setCopiedPlain(false);
    setCopiedHtml(false);
    setFollowUpText("");
    setIsRefining(false);
  };

  const handleCopyPlain = async () => {
    if (!email) return;
    const ok = await copyToClipboard(buildPlainText(email));
    if (ok) {
      trackEvent("copy_text");
      setCopiedPlain(true);
      setTimeout(() => setCopiedPlain(false), 2000);
    }
  };

  const handleCopyHtml = async () => {
    if (!email) return;
    const ok = await copyToClipboard(email.html || buildHtml(email));
    if (ok) {
      trackEvent("copy_html");
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2000);
    }
  };

  const handleFollowUp = async () => {
    const instruction = followUpText.trim();
    if (!instruction || !email) return;
    setFollowUpText("");
    setChatLog((prev) => [...prev, { role: "user", text: instruction }]);
    trackSendMessage(countWords(instruction));
    setIsRefining(true);

    try {
      // Real LLM edit when configured; falls back to mock otherwise.
      await new Promise((r) => setTimeout(r, 500));
      const updated = await editEmailWithAI(email, instruction);
      setEmail(updated);
      setChatLog((prev) => [
        ...prev,
        { role: "assistant", text: "Updated the email based on your request." },
      ]);
    } catch (err) {
      setChatLog((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            err instanceof Error && err.message
              ? err.message
              : "Failed to update the email, please try again.",
        },
      ]);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <section
      id="email-tool"
      aria-label="Restaurant Mail AI — restaurant email copy generator"
      className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="mb-10 text-center">
        <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight text-slate-900 dark:text-gray-100 sm:text-4xl">
          Email Marketing for Restaurants
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
          Just one sentence to make your restaurant email.
        </p>
      </div>

      {stage === "input" && (
        <div className="mx-auto w-full max-w-3xl">
          <label
            htmlFor="email-description"
            className="mb-3 block text-center text-base font-medium text-slate-900 dark:text-gray-200"
          >
            Describe what email you want to create for your restaurant
          </label>
          <div className="rounded-[2rem] bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 p-[2px] shadow-lg shadow-blue-500/10">
            <textarea
              id="email-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="I run a family pizza shop, want a weekend dine-in discount email"
              className="w-full resize-none rounded-[calc(2rem-2px)] bg-white px-6 py-6 text-center text-lg text-slate-900 focus:outline-none dark:bg-slate-900 dark:text-gray-200"
            />
          </div>
          {error && (
            <p className="mt-2 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="mt-6 flex justify-center">
            <Button
              onClick={handleGenerate}
              className="h-14 w-full rounded-2xl bg-blue-700 px-10 text-lg font-semibold text-white hover:bg-blue-800 sm:w-auto"
            >
              <Sparkles className="h-5 w-5" />
              Generate Email
            </Button>
          </div>
          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            No need for all details upfront. We'll ask follow-up questions if
            anything is missing.
          </p>
        </div>
      )}

      {stage === "loading" && (
        <div className="mx-auto max-w-2xl py-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
          <p className="mt-3 text-slate-600 dark:text-slate-400">Understanding your request…</p>
        </div>
      )}

      {stage === "question" && currentQuestion && (
        <div className="mx-auto max-w-2xl">
          <Conversation chatLog={chatLog} />
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-base font-medium text-slate-900 dark:text-gray-100">
              {currentQuestion.label}
            </p>
            {currentQuestion.options.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      if (
                        opt === "I'll describe it myself" ||
                        opt === "I'll type it myself"
                      ) {
                        questionInputRef.current?.focus();
                      } else {
                        handleAnswer(opt, false);
                      }
                    }}
                    className="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <input
                ref={questionInputRef}
                type="text"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAnswer(answerText, false);
                }}
                placeholder={currentQuestion.placeholder || "Type your answer…"}
                aria-label={currentQuestion.label}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-200"
              />
              <Button variant="outline" onClick={() => handleAnswer(answerText, true)} className="h-12 px-4">
                Skip
              </Button>
            </div>
            {questionError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{questionError}</p>
            )}
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Press Enter to continue, or click Skip to leave this blank.
            </p>
          </div>
        </div>
      )}

      {stage === "result" && email && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex flex-col">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-gray-100">
              Conversation
            </h2>
            <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex-1 overflow-auto">
                <Conversation chatLog={chatLog} />
              </div>
              <div className="mt-4 flex gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <input
                  type="text"
                  value={followUpText}
                  onChange={(e) => setFollowUpText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleFollowUp();
                  }}
                  placeholder="Refine this email: e.g. make it shorter, add a discount, change tone"
                  disabled={isRefining}
                  aria-label="Refine the email"
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-200"
                />
                <Button onClick={handleFollowUp} disabled={isRefining} className="h-12 px-4">
                  {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                </Button>
              </div>
            </div>
            <button
              onClick={reset}
              className="mt-4 self-start text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              ← Start over
            </button>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
              <button
                onClick={() => setViewMode("desktop")}
                aria-label="Desktop preview"
                className={`rounded-md px-2 py-1 ${viewMode === "desktop" ? "bg-slate-200 dark:bg-slate-700" : ""}`}
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                aria-label="Mobile preview"
                className={`rounded-md px-2 py-1 ${viewMode === "mobile" ? "bg-slate-200 dark:bg-slate-700" : ""}`}
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Required: replace the physical mailing address placeholder with your real business address before sending (CAN-SPAM). Your email platform (Mailchimp, Brevo, etc.) adds the unsubscribe link automatically on import.
            </p>

            <div
              className={`mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${
                viewMode === "mobile" ? "max-w-[375px]" : "max-w-[640px]"
              }`}
            >
              <div className="bg-slate-100 px-4 py-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Email Preview
              </div>
              <div className="p-5">
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Email Subject
                </label>
                <input
                  value={email.subject}
                  onChange={(e) => updateEmail({ subject: e.target.value })}
                  className="w-full rounded border border-transparent bg-transparent px-1 text-lg font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-gray-100"
                />

                <label className="mb-1 mt-4 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Preview Text
                </label>
                <input
                  value={email.previewText}
                  onChange={(e) => updateEmail({ previewText: e.target.value })}
                  className="w-full rounded border border-transparent bg-transparent px-1 text-sm text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-slate-400"
                />

                <label className="mb-1 mt-4 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Email Body
                </label>
                <textarea
                  value={email.body}
                  onChange={(e) => updateEmail({ body: e.target.value })}
                  rows={8}
                  className="w-full resize-none rounded border border-transparent bg-transparent px-1 text-sm leading-relaxed text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-gray-300"
                />

                <div className="mt-4 text-center">
                  <span className="inline-block rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white">
                    {email.suggestedCta}
                  </span>
                </div>

                <div className="mt-5 space-y-1 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <p>{email.restaurantName}</p>
                  <p>{email.address}</p>
                  <p>{email.contact}</p>
                  <p className="underline">{email.unsubscribe}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleCopyPlain} className="h-11 flex-1 gap-2">
                {copiedPlain ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedPlain ? "Copied!" : "Copy Plain Text"}
              </Button>
              <Button onClick={handleCopyHtml} variant="outline" className="h-11 flex-1 gap-2">
                {copiedHtml ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedHtml ? "Copied!" : "Copy HTML Template"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto mt-16 w-full max-w-3xl text-center">
        <p className="text-base leading-relaxed text-slate-400 dark:text-slate-500">
          Our AI restaurant email marketing tool helps local restaurant owners
          create ready-to-send promotional emails. Generate subject lines,
          preview text, body copy and editable HTML templates for Mailchimp,
          Brevo and other email platforms. Build win-back offers, holiday
          announcements, menu launch emails and loyalty rewards in minutes.
        </p>
      </div>

      <div className="mx-auto mt-10 w-full max-w-3xl text-center">
        <p className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">
          Example Output
        </p>
        <img
          src="/restaurant-email-marketing-example.webp"
          alt="Restaurant Mail AI conversation and email generation preview"
          loading="lazy"
          className="w-full rounded-2xl shadow-md ring-1 ring-slate-200 dark:ring-slate-700"
        />
      </div>

      <div className="mt-20 w-full max-w-3xl border-t border-slate-200 pt-10 dark:border-slate-700">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-gray-100">
          Frequently Asked Questions
        </h2>
        <div className="mt-6 space-y-4">
          {FAQ_ITEMS.map((item) => (
            <div
              key={item.question}
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <h3 className="text-base font-semibold text-slate-900 dark:text-gray-100">
                {item.question}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
