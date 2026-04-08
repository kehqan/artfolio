"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "artist" | "venue" | null;
type Step = "pick" | "form";

const ROLES = [
  {
    id: "artist" as Role,
    emoji: "🎨",
    label: "I'm an artist",
    headline: "Manage, exhibit\n& grow your practice.",
    color: "#FFD400",
    perks: ["Artwork inventory & tracking", "Public portfolio page", "Sales & collector CRM", "Collab with venues"],
  },
  {
    id: "venue" as Role,
    emoji: "🏛️",
    label: "I run a venue",
    headline: "Discover artists &\nfill your walls.",
    color: "#4ECDC4",
    perks: ["Browse local artists", "Manage exhibitions", "Collab requests pool", "Event management"],
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("pick");
  const [role, setRole] = useState<Role>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function pickRole(r: Role) {
    setRole(r);
    setStep("form");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, role },
        },
      });

      if (signUpError) { setError(signUpError.message); setLoading(false); return; }

      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: name,
          role,
          email,
        });
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const selectedRole = ROLES.find(r => r.id === role);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Darker Grotesque', system-ui, sans-serif;
          background: #FFFBEA;
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* ── TOP BAR ── */
        .topbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 50;
          padding: 12px 20px;
        }
        .topbar-inner {
          max-width: 1000px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
          border: 2.5px solid #111110;
          border-radius: 9999px;
          padding: 6px 8px 6px 14px;
          box-shadow: 4px 4px 0 #111110;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          font-size: 22px;
        }
        .logo-text {
          font-size: 16px;
          font-weight: 900;
          color: #111110;
          letter-spacing: -0.3px;
        }
        .signin-link {
          font-size: 13px;
          font-weight: 700;
          color: #111110;
          text-decoration: none;
          padding: 7px 16px;
          border: 2px solid #111110;
          border-radius: 9999px;
          transition: background 0.1s;
        }
        .signin-link:hover { background: #F5F0E8; }

        /* ── LAYOUT ── */
        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding-top: 80px;
        }

        /* ── STEP: PICK ROLE ── */
        .pick-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 20px 60px;
        }

        .pick-header {
          text-align: center;
          margin-bottom: 48px;
        }

        .pick-eyebrow {
          display: inline-block;
          background: #111110;
          color: #FFD400;
          padding: 3px 12px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .pick-title {
          font-size: clamp(40px, 6vw, 72px);
          font-weight: 900;
          color: #111110;
          letter-spacing: -2.5px;
          line-height: 0.95;
        }
        .pick-title .yellow {
          display: inline-block;
          background: #FFD400;
          padding: 2px 12px;
        }

        .pick-sub {
          font-size: 16px;
          font-weight: 600;
          color: #9B8F7A;
          margin-top: 16px;
        }

        /* Role cards */
        .role-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          max-width: 800px;
          width: 100%;
          border: 2.5px solid #111110;
          box-shadow: 6px 6px 0 #111110;
        }

        .role-card {
          position: relative;
          padding: 48px 40px;
          cursor: pointer;
          border: none;
          background: #fff;
          text-align: left;
          font-family: inherit;
          transition: background 0.12s, transform 0.1s;
          border-right: 2.5px solid #111110;
        }
        .role-card:last-child { border-right: none; }
        .role-card:hover { background: #FFFBEA; }
        .role-card:active { transform: translate(2px, 2px); }

        .role-card-top {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
        }
        .role-emoji {
          font-size: 40px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border: 2.5px solid #111110;
          background: #FFD400;
          flex-shrink: 0;
        }
        .role-card:last-child .role-emoji {
          background: #4ECDC4;
        }
        .role-label-tag {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #9B8F7A;
          margin-bottom: 4px;
        }
        .role-card-title {
          font-size: 28px;
          font-weight: 900;
          color: #111110;
          letter-spacing: -0.8px;
          line-height: 1.05;
          white-space: pre-line;
          margin-bottom: 20px;
        }

        .role-perks {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 28px;
        }
        .role-perk {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 600;
          color: #5C5346;
        }
        .role-perk-dot {
          width: 6px;
          height: 6px;
          background: #FFD400;
          border: 1.5px solid #111110;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .role-card:last-child .role-perk-dot { background: #4ECDC4; }

        .role-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: #111110;
          color: #FFD400;
          font-family: inherit;
          font-size: 13px;
          font-weight: 800;
          border: none;
          cursor: pointer;
          transition: box-shadow 0.1s;
          pointer-events: none;
        }
        .role-card:hover .role-cta {
          box-shadow: 3px 3px 0 #555;
        }
        .role-card:last-child .role-cta {
          color: #4ECDC4;
        }

        /* Login CTA below grid */
        .login-hint {
          text-align: center;
          margin-top: 24px;
          font-size: 14px;
          font-weight: 600;
          color: #9B8F7A;
        }
        .login-hint a {
          color: #111110;
          font-weight: 800;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        /* ── STEP: FORM ── */
        .form-wrap {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-top: 3px solid #111110;
        }

        /* Left panel — brand side */
        .form-left {
          background: #FFD400;
          border-right: 3px solid #111110;
          padding: 64px 52px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        .form-left-top {}
        .form-left-role {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #111110;
          color: #FFD400;
          padding: 4px 12px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-bottom: 24px;
          cursor: pointer;
          transition: opacity 0.1s;
        }
        .form-left-role:hover { opacity: 0.75; }
        .form-big-title {
          font-size: clamp(36px, 4vw, 56px);
          font-weight: 900;
          color: #111110;
          letter-spacing: -2px;
          line-height: 0.95;
          white-space: pre-line;
          margin-bottom: 16px;
        }
        .form-tagline {
          font-size: 15px;
          font-weight: 600;
          color: rgba(17,17,16,0.6);
          line-height: 1.5;
        }
        .form-left-bottom {
          font-size: 24px;
          letter-spacing: -0.3px;
          font-weight: 900;
          color: #111110;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .form-left-emoji {
          font-size: 64px;
          display: block;
          animation: floatPick 3s ease-in-out infinite;
          line-height: 1;
        }
        @keyframes floatPick {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50% { transform: translateY(-10px) rotate(4deg); }
        }
        .form-perks-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 28px;
        }
        .form-perk {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 700;
          color: #111110;
        }
        .form-perk-check {
          width: 20px;
          height: 20px;
          background: #111110;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 11px;
          color: #FFD400;
          font-weight: 900;
        }

        /* Right panel — form */
        .form-right {
          background: #FFFBEA;
          padding: 64px 52px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .form-eyebrow {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #9B8F7A;
          margin-bottom: 8px;
        }
        .form-title {
          font-size: 36px;
          font-weight: 900;
          color: #111110;
          letter-spacing: -1px;
          margin-bottom: 6px;
        }
        .form-sub {
          font-size: 15px;
          font-weight: 600;
          color: #9B8F7A;
          margin-bottom: 36px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-bottom: 24px;
        }

        .field label {
          display: block;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #111110;
          margin-bottom: 6px;
        }

        .field input {
          width: 100%;
          padding: 12px 14px;
          border: 2px solid #111110;
          background: #fff;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          color: #111110;
          outline: none;
          transition: border-color 0.1s, box-shadow 0.1s;
          border-radius: 0;
          -webkit-appearance: none;
        }
        .field input:focus {
          border-color: #111110;
          box-shadow: 3px 3px 0 #111110;
        }
        .field input::placeholder { color: #C0B8A8; font-weight: 500; }

        .password-hint {
          font-size: 11px;
          font-weight: 600;
          color: #9B8F7A;
          margin-top: 5px;
        }

        .error-box {
          background: #FFE4E6;
          border: 2px solid #FF6B6B;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
          color: #9B1C1C;
          margin-bottom: 20px;
        }

        .submit-btn {
          width: 100%;
          padding: 15px;
          background: #111110;
          color: #FFD400;
          font-family: inherit;
          font-size: 16px;
          font-weight: 900;
          border: 2.5px solid #111110;
          cursor: pointer;
          transition: box-shadow 0.1s, transform 0.1s;
          letter-spacing: -0.2px;
          position: relative;
          box-shadow: 4px 4px 0 #9B8F7A;
        }
        .submit-btn:hover:not(:disabled) {
          box-shadow: 6px 6px 0 #9B8F7A;
          transform: translate(-1px, -1px);
        }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .form-footer-text {
          text-align: center;
          margin-top: 20px;
          font-size: 14px;
          font-weight: 600;
          color: #9B8F7A;
        }
        .form-footer-text a {
          color: #111110;
          font-weight: 800;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
        }
        .divider-line { flex: 1; height: 1px; background: #E0D8CA; }
        .divider-text { font-size: 11px; font-weight: 700; color: #C0B8A8; text-transform: uppercase; letter-spacing: 0.1em; }

        /* ── MOBILE ── */
        @media (max-width: 768px) {
          .role-grid { grid-template-columns: 1fr; }
          .role-card { border-right: none; border-bottom: 2.5px solid #111110; }
          .role-card:last-child { border-bottom: none; }
          .form-wrap { grid-template-columns: 1fr; }
          .form-left { display: none; }
          .form-right { padding: 40px 24px; }
        }
      `}</style>

      {/* ── TOP BAR ── */}
      <div className="topbar">
        <div className="topbar-inner">
          <a href="/" className="logo">
            🥭
            <span className="logo-text">artomango</span>
          </a>
          <a href="/login" className="signin-link">Sign in</a>
        </div>
      </div>

      <div className="page">

        {/* ══ STEP 1: PICK YOUR ROLE ══ */}
        {step === "pick" && (
          <div className="pick-wrap">
            <div className="pick-header">
              <div className="pick-eyebrow">🥭 Join artomango</div>
              <h1 className="pick-title">
                Who are<br />
                <span className="yellow">you?</span>
              </h1>
              <p className="pick-sub">Pick your role to get started.</p>
            </div>

            <div className="role-grid">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  className="role-card"
                  onClick={() => pickRole(r.id)}
                >
                  <div className="role-card-top">
                    <div className="role-emoji">{r.emoji}</div>
                    <div>
                      <div className="role-label-tag">{r.label}</div>
                    </div>
                  </div>

                  <div className="role-card-title">{r.headline}</div>

                  <ul className="role-perks">
                    {r.perks.map((p) => (
                      <li key={p} className="role-perk">
                        <span className="role-perk-dot" />
                        {p}
                      </li>
                    ))}
                  </ul>

                  <div className="role-cta">
                    {r.label} →
                  </div>
                </button>
              ))}
            </div>

            <p className="login-hint">
              Already have an account? <a href="/login">Sign in</a>
            </p>
          </div>
        )}

        {/* ══ STEP 2: REGISTRATION FORM ══ */}
        {step === "form" && selectedRole && (
          <div className="form-wrap">

            {/* Left: brand panel */}
            <div className="form-left">
              <div className="form-left-top">
                <button
                  className="form-left-role"
                  onClick={() => setStep("pick")}
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                >
                  <span style={{ fontSize: 14 }}>←</span>
                  <span style={{ background: "#111110", color: "#FFD400", padding: "3px 10px", fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" as const }}>
                    {selectedRole.label}
                  </span>
                </button>

                <div className="form-big-title">
                  {selectedRole.headline}
                </div>
                <div className="form-tagline">
                  Manage, Exhibit, Collab.
                </div>

                <ul className="form-perks-list">
                  {selectedRole.perks.map((p) => (
                    <li key={p} className="form-perk">
                      <span className="form-perk-check">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="form-left-bottom">
                <span className="form-left-emoji">🥭</span>
                artomango
              </div>
            </div>

            {/* Right: form */}
            <div className="form-right">
              <div className="form-eyebrow">Step 2 of 2 · Create account</div>
              <h2 className="form-title">Almost there.</h2>
              <p className="form-sub">Fill in your details to get started for free.</p>

              {error && <div className="error-box">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="field-group">
                  <div className="field">
                    <label>Full name</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <input
                      type="password"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <div className="password-hint">At least 8 characters</div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading}
                >
                  {loading ? "Creating account…" : `Join as ${selectedRole.label.replace("I'm an ", "").replace("I run a ", "")} →`}
                </button>
              </form>

              <div className="divider">
                <div className="divider-line" />
                <div className="divider-text">or</div>
                <div className="divider-line" />
              </div>

              <p className="form-footer-text">
                Already have an account? <a href="/login">Sign in</a>
              </p>

              <p style={{ fontSize: 11, fontWeight: 600, color: "#C0B8A8", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
                By creating an account you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
