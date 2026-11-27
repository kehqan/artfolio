"use client";

// Last resort, when even the page frame fails to load. Plain on purpose:
// it can't rely on the app's styles or fonts.
import { useEffect } from "react";
import { reportError } from "@/lib/crash";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportError(error); }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#FBF8F0", color: "#141414", fontFamily: "system-ui, sans-serif", padding: 20 }}>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mango.svg" width={56} height={56} alt="" style={{ display: "block", margin: "0 auto 16px" }} />
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>Something broke</h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, margin: "0 0 20px", color: "#444" }}>
            It&rsquo;s on us, not you. We&rsquo;ve been told about it automatically.
          </p>
          <button onClick={reset} style={{ font: "inherit", fontWeight: 600, padding: "10px 18px", borderRadius: 10, border: "2px solid #141414", background: "#FFD400", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
