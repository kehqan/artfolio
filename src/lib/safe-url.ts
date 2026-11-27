// Links people type (a website, a submission link, a Buy link) end up as
// <a href>. A link that starts with "javascript:" would run code for whoever
// clicks it. Only web and email links get through; "mysite.com" becomes
// "https://mysite.com".
export function safeHref(raw: string | null | undefined): string | undefined {
  const s = (raw || "").trim();
  if (!s) return undefined;
  if (/^(https?:\/\/|mailto:)/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^[^:/]+:\d/.test(s)) return undefined; // javascript:, data:, vbscript:
  return `https://${s.replace(/^\/+/, "")}`;
}
