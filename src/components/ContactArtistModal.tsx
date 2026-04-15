"use client";
// src/components/ContactArtistModal.tsx
// Drop this anywhere on public-facing pages (artwork page, artist profile, collab cards)
// Usage:
//   <ContactArtistModal
//     recipientId="uuid-of-artist"
//     recipientName="Jane Artist"
//     contextType="artwork_inquiry"   // "direct" | "artwork_inquiry" | "collab"
//     contextTitle="Re: Sunrise Over Prague"
//   />

import { useState } from "react";
import { MessageSquare, X, Send, Sparkles, Check } from "lucide-react";

const COLLAB_TEMPLATES = [
  { label: "Interested in collab", body: "Hi! I saw your collab request and I'm very interested. Can we connect?" },
  { label: "Tell me more",         body: "Hello! Your request caught my eye. Could you share more details about what you're looking for?" },
  { label: "I'm available",        body: "Hi! I'm available for this collaboration and would love to discuss further." },
];

const INQUIRY_TEMPLATES = [
  { label: "Price inquiry",        body: "Hi, I'm interested in this artwork. Could you let me know the price and availability?" },
  { label: "Commission interest",  body: "Hello! I'd love to commission a similar piece. Are you available for commissions?" },
  { label: "Gallery interest",     body: "Hi! I represent a gallery and would love to discuss showing your work. Can we chat?" },
];

const DIRECT_TEMPLATES = [
  { label: "Love your work",       body: "Hi! I came across your work and absolutely love it. I'd love to connect!" },
  { label: "Collaboration idea",   body: "Hello! I have an exciting collaboration idea I'd love to run by you." },
];

type Props = {
  recipientId: string;
  recipientName: string;
  contextType?: "direct" | "artwork_inquiry" | "collab";
  contextTitle?: string;
  contextId?: string;
  // Style overrides
  buttonLabel?: string;
  buttonStyle?: React.CSSProperties;
  variant?: "primary" | "ghost";
};

export default function ContactArtistModal({
  recipientId,
  recipientName,
  contextType = "direct",
  contextTitle,
  contextId,
  buttonLabel,
  buttonStyle,
  variant = "primary",
}: Props) {
  const [open, setOpen]       = useState(false);
  const [body, setBody]       = useState("");
  const [guestName, setGuestName]   = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  // We don't import supabase here — check login status via cookie existence is unreliable
  // Instead we show guest fields and the API handles it server-side
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Check auth status on open
  async function handleOpen() {
    setOpen(true);
    setBody("");
    setError("");
    setSent(false);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      setIsLoggedIn(!!user);
    } catch {
      setIsLoggedIn(false);
    }
  }

  const templates = contextType === "collab"
    ? COLLAB_TEMPLATES
    : contextType === "artwork_inquiry"
    ? INQUIRY_TEMPLATES
    : DIRECT_TEMPLATES;

  async function handleSend() {
    if (!body.trim()) { setError("Please write a message."); return; }
    if (!isLoggedIn && (!guestName.trim() || !guestEmail.trim())) {
      setError("Please enter your name and email."); return;
    }
    setSending(true); setError("");

    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_id: recipientId,
        context_type: contextType,
        context_id: contextId,
        context_title: contextTitle || (contextType === "artwork_inquiry" ? `Artwork inquiry` : `Message to ${recipientName}`),
        initial_message: body.trim(),
        guest_name: !isLoggedIn ? guestName.trim() : undefined,
        guest_email: !isLoggedIn ? guestEmail.trim() : undefined,
      }),
    });

    const data = await res.json();
    if (data.error) { setError(data.error); setSending(false); return; }

    setSent(true);
    setSending(false);
    setTimeout(() => setOpen(false), 2000);
  }

  const btnDefault: React.CSSProperties = variant === "primary" ? {
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "10px 18px",
    background: "#FFD400", border: "2.5px solid #111110", borderRadius: 12,
    fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
    color: "#111110", boxShadow: "3px 3px 0 #111110", transition: "all .15s",
  } : {
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "8px 14px",
    background: "transparent", border: "2px solid rgba(255,255,255,.2)", borderRadius: 10,
    fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    color: "rgba(255,255,255,.7)", transition: "all .15s",
  };

  return (
    <>
      <button
        style={{ ...btnDefault, ...buttonStyle }}
        onClick={handleOpen}
        onMouseEnter={e => {
          if (variant === "primary") {
            (e.currentTarget as HTMLElement).style.transform = "translate(-1px,-1px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "5px 5px 0 #111110";
          }
        }}
        onMouseLeave={e => {
          if (variant === "primary") {
            (e.currentTarget as HTMLElement).style.transform = "none";
            (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #111110";
          }
        }}
      >
        <MessageSquare size={14} />
        {buttonLabel || (contextType === "collab" ? "Show Interest" : contextType === "artwork_inquiry" ? "Contact Artist" : "Send Message")}
      </button>

      {open && (
        <div style={OVERLAY} onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div style={MODAL}>
            {/* Header */}
            <div style={MODAL_HDR}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#111110" }}>
                  {contextType === "collab" ? "Express Interest" : contextType === "artwork_inquiry" ? "Inquire About Artwork" : `Message ${recipientName}`}
                </div>
                {contextTitle && (
                  <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600, marginTop: 2 }}>{contextTitle}</div>
                )}
              </div>
              <button style={CLOSE_BTN} onClick={() => setOpen(false)}><X size={15} /></button>
            </div>

            {sent ? (
              <div style={{ padding: "40px 24px", textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DCFCE7", border: "2.5px solid #16A34A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <Check size={24} color="#16A34A" strokeWidth={3} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 900, color: "#111110", marginBottom: 6 }}>Message sent!</div>
                <div style={{ fontSize: 13, color: "#9B8F7A", fontWeight: 600 }}>
                  {recipientName} will receive your message and can reply.
                </div>
              </div>
            ) : (
              <div style={{ padding: "16px 20px 20px" }}>

                {/* Guest fields */}
                {isLoggedIn === false && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                    <div>
                      <label style={LABEL}>Your name *</label>
                      <input
                        style={INPUT}
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div>
                      <label style={LABEL}>Email *</label>
                      <input
                        style={INPUT}
                        type="email"
                        value={guestEmail}
                        onChange={e => setGuestEmail(e.target.value)}
                        placeholder="jane@email.com"
                      />
                    </div>
                  </div>
                )}

                {/* Quick reply templates */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".15em", display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                    <Sparkles size={10} /> Quick replies
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {templates.map(t => (
                      <button
                        key={t.label}
                        style={{
                          padding: "4px 12px", background: "#F5F0E8",
                          border: "1.5px solid #E8E0D0", borderRadius: 99,
                          fontSize: 12, fontWeight: 700, color: "#111110",
                          cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FFD400"; (e.currentTarget as HTMLElement).style.borderColor = "#111110"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#F5F0E8"; (e.currentTarget as HTMLElement).style.borderColor = "#E8E0D0"; }}
                        onClick={() => setBody(t.body)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div style={{ marginBottom: 12 }}>
                  <label style={LABEL}>Message *</label>
                  <textarea
                    style={{ ...INPUT, minHeight: 110, resize: "vertical" as const }}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder={`Write your message to ${recipientName}…`}
                    rows={4}
                  />
                </div>

                {error && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#EF4444", marginBottom: 10 }}>{error}</div>
                )}

                <button
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "12px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 12,
                    fontSize: 14, fontWeight: 800, cursor: sending ? "not-allowed" : "pointer",
                    fontFamily: "inherit", color: "#111110", boxShadow: "3px 3px 0 #111110",
                    opacity: sending ? 0.7 : 1, transition: "all .15s",
                  }}
                  onClick={handleSend}
                  disabled={sending}
                >
                  <Send size={14} /> {sending ? "Sending…" : "Send Message"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const OVERLAY: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 999,
  background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 16,
};
const MODAL: React.CSSProperties = {
  background: "#FFFBEA", border: "2.5px solid #111110", borderRadius: 20,
  boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 480,
  fontFamily: "'Darker Grotesque', system-ui, sans-serif",
  overflow: "hidden",
};
const MODAL_HDR: React.CSSProperties = {
  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
  padding: "16px 20px", borderBottom: "2px solid #E8E0D0", background: "#fff",
};
const CLOSE_BTN: React.CSSProperties = {
  background: "#F5F0E8", border: "1.5px solid #E8E0D0", borderRadius: "50%",
  width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", color: "#111110", flexShrink: 0,
};
const LABEL: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A",
  textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 6,
};
const INPUT: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "2px solid #E8E0D0", borderRadius: 10,
  fontSize: 13, fontWeight: 600, color: "#111110",
  fontFamily: "inherit", background: "#fff", outline: "none",
  transition: "border-color .15s",
};
