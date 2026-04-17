// src/app/api/og-preview/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Artomango/1.0; +https://artomango.com)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 200 });
    }

    const html = await res.text();

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

    const title       = getTitle();
    const description = getMeta("description") || getMeta("twitter:description");
    const siteName    = getMeta("site_name");
    let image         = getMeta("image") || getMeta("twitter:image") || getMeta("image:secure_url");

    if (image && !image.startsWith("http")) {
      try { image = new URL(image, url).toString(); } catch { /* keep as-is */ }
    }

    return NextResponse.json(
      { title: title || null, description: description || null, image: image || null, siteName: siteName || null, url },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json(
      { title: null, description: null, image: null, siteName: null, url, error: message },
      { status: 200 }
    );
  }
}
