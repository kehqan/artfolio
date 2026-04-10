"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          font-family: 'Darker Grotesque', system-ui, sans-serif;
          height: 100%; overflow: hidden;
        }

        /* ── Layout ── */
        .login-root {
          display: grid;
          grid-template-columns: 1fr 1fr;
          height: 100vh;
          min-height: 600px;
        }

        /* ── LEFT PANEL ── */
        .login-left {
          background: #111110;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 36px 48px 40px;
          position: relative;
          overflow: hidden;
        }

        /* decorative circles */
        .login-left::before {
          content: '';
          position: absolute;
          width: 420px; height: 420px;
          border-radius: 50%;
          border: 1.5px solid rgba(255,212,0,.07);
          top: -120px; left: -120px;
          pointer-events: none;
        }
        .login-left::after {
          content: '';
          position: absolute;
          width: 280px; height: 280px;
          border-radius: 50%;
          border: 1.5px solid rgba(255,212,0,.05);
          bottom: 60px; right: -80px;
          pointer-events: none;
        }

        .left-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          position: relative;
          z-index: 2;
        }
        .left-logo-text {
          font-size: 17px;
          font-weight: 900;
          color: #FFD400;
          letter-spacing: -0.3px;
        }

        .left-hero {
          position: relative;
          z-index: 2;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .mango-float {
          font-size: 96px;
          line-height: 1;
          display: block;
          margin-bottom: 32px;
          animation: mangoFloat 4s ease-in-out infinite;
          filter: drop-shadow(0 20px 40px rgba(255,212,0,.2));
          opacity: 0;
          transform: translateY(20px);
          transition: opacity .7s .1s, transform .7s .1s cubic-bezier(.16,1,.3,1);
        }
        .mounted .mango-float { opacity: 1; transform: translateY(0); }
        @keyframes mangoFloat {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50%       { transform: translateY(-14px) rotate(4deg); }
        }

        .left-headline {
          font-size: clamp(38px, 4.5vw, 58px);
          font-weight: 900;
          color: #fff;
          letter-spacing: -2px;
          line-height: 0.92;
          margin-bottom: 20px;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity .6s .25s, transform .6s .25s cubic-bezier(.16,1,.3,1);
        }
        .mounted .left-headline { opacity: 1; transform: translateY(0); }

        .left-headline .hl-yellow {
          color: #FFD400;
          display: block;
        }

        .left-sub {
          font-size: 16px;
          font-weight: 600;
          color: rgba(255,255,255,.35);
          line-height: 1.6;
          max-width: 320px;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity .6s .38s, transform .6s .38s cubic-bezier(.16,1,.3,1);
        }
        .mounted .left-sub { opacity: 1; transform: translateY(0); }

        /* pill stats at bottom */
        .left-pills {
          display: flex;
          gap: 10px;
          position: relative;
          z-index: 2;
          flex-wrap: wrap;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity .6s .5s, transform .6s .5s cubic-bezier(.16,1,.3,1);
        }
        .mounted .left-pills { opacity: 1; transform: translateY(0); }
        .left-pill {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 14px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,.45);
        }
        .left-pill .pill-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #FFD400;
          flex-shrink: 0;
        }

        /* ── RIGHT PANEL ── */
        .login-right {
          background: #FFFBEA;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px 48px;
          position: relative;
          overflow-y: auto;
        }

        .login-form-wrap {
          width: 100%;
          max-width: 400px;
          opacity: 0;
          transform: translateY(28px);
          transition: opacity .65s .2s, transform .65s .2s cubic-bezier(.16,1,.3,1);
        }
        .mounted .login-form-wrap { opacity: 1; transform: translateY(0); }

        /* eyebrow */
        .form-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #111110;
          color: #FFD400;
          padding: 4px 14px;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .18em;
          text-transform: uppercase;
          margin-bottom: 18px;
        }
        .form-eyebrow-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #FFD400;
        }

        .form-title {
          font-size: clamp(34px, 4vw, 48px);
          font-weight: 900;
          color: #111110;
          letter-spacing: -2px;
          line-height: 0.93;
          margin-bottom: 6px;
        }
        .form-sub {
          font-size: 14px;
          font-weight: 600;
          color: #9B8F7A;
          margin-bottom: 32px;
        }

        /* error */
        .login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FEF2F2;
          border: 2px solid #FECACA;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
          color: #DC2626;
          margin-bottom: 20px;
        }

        /* field */
        .field { margin-bottom: 18px; }
        .field-label {
          display: block;
          font-size: 10px;
          font-weight: 800;
          color: #9B8F7A;
          text-transform: uppercase;
          letter-spacing: .14em;
          margin-bottom: 7px;
        }
        .field-wrap {
          position: relative;
        }
        .field-input {
          width: 100%;
          padding: 13px 16px;
          background: #fff;
          border: 2.5px solid #E8E0D0;
          border-radius: 14px;
          font-size: 15px;
          font-family: 'Darker Grotesque', system-ui, sans-serif;
          font-weight: 600;
          color: #111110;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
          box-sizing: border-box;
        }
        .field-input:focus {
          border-color: #FFD400;
          box-shadow: 0 0 0 3px rgba(255,212,0,.2);
        }
        .field-input::placeholder { color: #C0B8A8; font-weight: 500; }
        .field-input.has-icon { padding-right: 46px; }

        .pw-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #C0B8A8;
          display: flex;
          align-items: center;
          padding: 0;
          transition: color .15s;
        }
        .pw-toggle:hover { color: #111110; }

        /* submit */
        .btn-login {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background: #111110;
          color: #FFD400;
          border: 2.5px solid #111110;
          border-radius: 14px;
          font-family: 'Darker Grotesque', system-ui, sans-serif;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 4px 4px 0 #9B8F7A;
          transition: all .2s cubic-bezier(.16,1,.3,1);
          margin-top: 8px;
        }
        .btn-login:hover:not(:disabled) {
          box-shadow: 6px 6px 0 #9B8F7A;
          transform: translate(-1px, -1px);
        }
        .btn-login:active:not(:disabled) {
          box-shadow: 1px 1px 0 #9B8F7A;
          transform: translate(1px, 1px);
        }
        .btn-login:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .login-spinner {
          width: 16px; height: 16px;
          border: 2.5px solid rgba(255,212,0,.3);
          border-top-color: #FFD400;
          border-radius: 50%;
          animation: spin .65s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* divider */
        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0;
        }
        .divider-line { flex: 1; height: 1.5px; background: #E8E0D0; }
        .divider-txt {
          font-size: 11px;
          font-weight: 700;
          color: #C0B8A8;
          text-transform: uppercase;
          letter-spacing: .1em;
        }

        /* register CTA */
        .register-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 12px;
          background: transparent;
          border: 2.5px solid #E8E0D0;
          border-radius: 14px;
          font-family: 'Darker Grotesque', system-ui, sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #111110;
          text-decoration: none;
          transition: all .15s;
          cursor: pointer;
          width: 100%;
        }
        .register-cta:hover {
          border-color: #111110;
          background: #fff;
          box-shadow: 2px 2px 0 #111110;
        }
        .register-cta strong { font-weight: 900; }

        /* mobile */
        @media (max-width: 720px) {
          .login-root { grid-template-columns: 1fr; overflow: auto; }
          .login-left  { display: none; }
          .login-right { min-height: 100vh; padding: 40px 24px; }
        }
      `}</style>

      <div className={`login-root${mounted ? " mounted" : ""}`}>

        {/* ══════════════ LEFT ══════════════ */}
        <div className="login-left">
          <Link href="/" className="left-logo">
            <span style={{ fontSize: 22, lineHeight: 1 }}>🥭</span>
            <span className="left-logo-text">artomango</span>
          </Link>

          <div className="left-hero">
            <span className="mango-float">🥭</span>
            <h2 className="left-headline">
              Welcome<br />
              <span className="hl-yellow">back.</span>
            </h2>
            <p className="left-sub">
              Your artworks, exhibitions, collabs and collectors — all in one place.
            </p>
          </div>

          <div className="left-pills">
            {["Inventory", "Exhibitions", "Sales", "Collabs", "MyStore"].map(label => (
              <div key={label} className="left-pill">
                <span className="pill-dot" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════ RIGHT ══════════════ */}
        <div className="login-right">
          <div className="login-form-wrap">

            <div className="form-eyebrow">
              <span className="form-eyebrow-dot" />
              Sign in to Artomango
            </div>
            <h1 className="form-title">Sign in</h1>
            <p className="form-sub">Enter your email and password to continue.</p>

            {error && (
              <div className="login-error">
                <span style={{ fontSize: 15 }}>✕</span>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              {/* Email */}
              <div className="field">
                <label className="field-label">Email address</label>
                <div className="field-wrap">
                  <input
                    type="email"
                    required
                    className="field-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <label className="field-label" style={{ margin: 0 }}>Password</label>
                  {/* Forgot password — placeholder for future */}
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#C0B8A8" }}>
                    Forgot password?
                  </span>
                </div>
                <div className="field-wrap">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    className="field-input has-icon"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-login" disabled={loading}>
                {loading
                  ? <><div className="login-spinner" /> Signing in…</>
                  : <>Sign in <ArrowRight size={16} strokeWidth={2.5} /></>
                }
              </button>
            </form>

            <div className="divider">
              <div className="divider-line" />
              <span className="divider-txt">New here?</span>
              <div className="divider-line" />
            </div>

            <Link href="/register" className="register-cta">
              Create your free account <strong style={{ marginLeft: 3 }}>→</strong>
            </Link>

            {/* Back to explore */}
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <Link href="/explore" style={{ fontSize: 12, fontWeight: 700, color: "#C0B8A8", textDecoration: "none", transition: "color .15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#111110")}
                onMouseLeave={e => (e.currentTarget.style.color = "#C0B8A8")}>
                ← Back to Artomango
              </Link>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
