"use client";
// A bot check for sign-up, sign-in, magic links and password resets, using
// Cloudflare Turnstile. Most people never see it; it only asks for a click
// when something looks off.
//
// Off until both halves are set up (see /mnt/project-files/security):
//   1. NEXT_PUBLIC_TURNSTILE_SITE_KEY in Vercel, and
//   2. Supabase → Authentication → Attack Protection → CAPTCHA, with the secret key.
// Turn on (1) first, deploy, then (2). With only (1), tokens are sent and ignored.
import { useEffect, useRef } from "react";

export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
export const captchaOn = !!CAPTCHA_SITE_KEY;

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { loading = null; reject(new Error("captcha")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/**
 * Renders the check and hands back a token (null when it expires).
 * Bump `resetKey` after each sign-in try: a token works only once.
 */
export function Captcha({ onToken, resetKey = 0 }: { onToken: (t: string | null) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!captchaOn) return;
    let gone = false;
    loadScript().then(() => {
      if (gone || !box.current || !window.turnstile) return;
      id.current = window.turnstile.render(box.current, {
        sitekey: CAPTCHA_SITE_KEY,
        appearance: "interaction-only",
        theme: "light",
        callback: (t: string) => cb.current(t),
        "expired-callback": () => cb.current(null),
        "error-callback": () => cb.current(null),
      });
    }).catch(() => cb.current(null));
    return () => {
      gone = true;
      if (id.current) window.turnstile?.remove(id.current);
      id.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey && id.current) { cb.current(null); window.turnstile?.reset(id.current); }
  }, [resetKey]);

  if (!captchaOn) return null;
  return <div ref={box} className="empty:hidden" />;
}

/** Extra options for supabase.auth calls: the token when the check is on. */
export const captchaOptions = (token: string | null) => (captchaOn && token ? { captchaToken: token } : {});

/** While the check is on and hasn't passed yet. */
export const captchaWaiting = (token: string | null) => captchaOn && !token;
