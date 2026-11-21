// Lightweight client-side tracking helpers.
// All calls are wrapped in try/catch and become no-ops when unavailable,
// so a failed script or blocked tracker never breaks the page.

export function trackEvent(action: string, params?: Record<string, unknown>) {
  try {
    if (typeof window === "undefined") return;
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    if (typeof w.gtag === "function") {
      w.gtag("event", action, params || {});
    }
  } catch {
    // ignore
  }
}

export function trackFirstVisit() {
  try {
    if (typeof window === "undefined") return;
    const KEY = "rmai_first_visit";
    if (localStorage.getItem(KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    const utmKeys = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
    ] as const;

    utmKeys.forEach((k) => {
      const v = params.get(k);
      if (v) utm[k] = v;
    });

    const record = {
      referrer: document.referrer || "",
      landingPage: window.location.pathname + window.location.search,
      utm,
      // Highlight utm_source=chatgpt traffic for later analysis.
      utmSource: params.get("utm_source") || "",
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}
