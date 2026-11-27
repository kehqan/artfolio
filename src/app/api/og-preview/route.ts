// src/app/api/og-preview/route.ts
// The title and cover of a pasted moodboard link (dashboard/mystore/BoardModal).
// Our server fetches a page someone typed in, so it must never be pointed at
// our own network: every address the name resolves to is checked, redirects
// are followed by hand (each one checked again, at most 3), and only the
// first 512 KB of the page is read.
import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;

/** Loopback, private, link-local (cloud metadata), carrier-grade NAT, multicast, reserved. */
function privateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return privateAddress(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9")
    || v.startsWith("fea") || v.startsWith("feb") || v.startsWith("ff") || v.startsWith("64:ff9b");
}

/** Throws unless the link is http(s), on a normal port, and every address it resolves to is public. */
async function checkUrl(raw: string): Promise<URL> {
  const u = new URL(raw);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad scheme");
  if (u.username || u.password) throw new Error("credentials");
  if (u.port && u.port !== "80" && u.port !== "443") throw new Error("port");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!addrs.length || addrs.some(a => privateAddress(a.address))) throw new Error("private address");
  return u;
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.length;
  }
  reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, MAX_BYTES));
}

const empty = (status = 200) =>
  NextResponse.json({ title: null, description: null, image: null, siteName: null }, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(req: NextRequest) {
  // Signed-in users only, so this can't be used as an open proxy.
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl.searchParams.get("url");
  if (!url || url.length > 2000) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let html = "";
  let finalUrl: URL;
  try {
    finalUrl = await checkUrl(url);
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      res = await fetch(finalUrl, {
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Artomango/1.0; +https://artomango.com)",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(6000),
      });
      const next = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (!next) break;
      res.body?.cancel().catch(() => {});
      if (hop === MAX_REDIRECTS) return empty();
      finalUrl = await checkUrl(new URL(next, finalUrl).toString());
    }
    if (!res || !res.ok || !(res.headers.get("content-type") || "").includes("html")) return empty();
    html = await readCapped(res);
  } catch {
    // Unreachable, private or slow: the link still saves without a preview.
    return empty();
  }

  const getMeta = (property: string): string => {
    const ogMatch =
      html.match(new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, "i")) ||
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, "i"));
    if (ogMatch?.[1]) return ogMatch[1].trim();
    const nameMatch =
      html.match(new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i")) ||
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"));
    if (nameMatch?.[1]) return nameMatch[1].trim();
    return "";
  };

  const getTitle = (): string => {
    const t = getMeta("title") || getMeta("twitter:title");
    if (t) return t;
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m?.[1]?.trim() || "";
  };

  const cap = (s: string, n: number) => (s ? s.slice(0, n) : null);
  let image = getMeta("image") || getMeta("twitter:image") || getMeta("image:secure_url");
  if (image) {
    try { image = new URL(image, finalUrl).toString(); } catch { image = ""; }
    if (!/^https?:\/\//i.test(image)) image = "";
  }

  return NextResponse.json(
    {
      title: cap(getTitle(), 300),
      description: cap(getMeta("description") || getMeta("twitter:description"), 1000),
      image: cap(image, 2000),
      siteName: cap(getMeta("site_name"), 200),
    },
    // Private: the answer is only for the signed-in person who asked.
    { headers: { "Cache-Control": "private, max-age=3600" } }
  );
}
