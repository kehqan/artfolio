"use client";
// src/components/MessageModal.tsx
//
// Airbnb-style contextual messaging modal.
// Shows WHAT triggered the conversation (artwork, collab request) at the top.
// Works for logged-in users AND guests.
// In the dashboard inbox, conversations show their context card.
//
// Usage:
//   <MessageModal
//     isOpen={open}
//     onClose={() => setOpen(false)}
//     recipientId="uuid"
//     recipientName="Jane Artist"
//     recipientAvatar="https://..."
//     contextType="collab"                  // "direct" | "collab" | "artwork_inquiry"
//     contextTitle="Re: Looking to Showcase"
//     contextId="pool-request-uuid"
//     contextMeta={{ emoji: "🎨", label: "Artist seeking showcase", image: "..." }}
//   />

import { useState, useEffect, useRef } from "react";
import { X, Send, Sparkles, Check, MessageSquare, ArrowRight, User } from "lucide-react";

// ── Template sets per context ──────────────────────────────────────
const TEMPLATES: Record<string, { label: string; body: string }[]> = {
  collab: [
    { label: "I'm interested! 🤝",  body: "Hi! I saw your collab request and I'm very interested. Could we chat to discuss the details?" },
    { label: "Tell me more",         body: "Hello! Your request caught my eye. Could you share more about what you're looking for and the timeline?" },
    { label: "I'm available",        body: "Hi! I'm available for this collaboration and would love to discuss further. When would be a good time to connect?" },
    { label: "Love the idea ✨",     body: "This sounds like a fascinating project! I'd love to be involved. Can you tell me more about your vision?" },
    { label: "Not quite right",      body: "Thank you for your request! This isn't quite the right fit for me right now, but I'd love to stay in touch for future opportunities." },
  ],
  artwork_inquiry: [
    { label: "Price & availability", body: "Hi! I'm interested in this artwork. Could you let me know the price and whether it's still available?" },
    { label: "Commission inquiry",   body: "Hello! I love your work. Would you be open to creating a commission piece in a similar style?" },
    { label: "Gallery interest",     body: "Hi! I represent a gallery and would love to discuss the possibility of showing your work. Could we set up a call?" },
    { label: "Shipping question",    body: "Hi! I'm interested in purchasing this piece. Could you tell me about shipping options and costs to my location?" },
    { label: "Just admiring 💛",    body: "I came across this piece and had to reach out — it's absolutely stunning. Thank you for sharing your work!" },
  ],
  direct: [
    { label: "Love your work 💛",   body: "Hi! I came across your profile and I absolutely love what you're creating. I'd love to connect!" },
    { label: "Collaboration idea",   body: "Hello! I have an exciting collaboration idea I'd love to share with you. Would you be open to a conversation?" },
    { label: "Exhibition interest",  body: "Hi! I'm interested in featuring your work at an upcoming exhibition. Could we discuss the details?" },
    { label: "Press / media",        body: "Hello! I'm working on an article about artists in the region and I'd love to feature your work. Are you open to an interview?" },
  ],
};

type ContextMeta = {
  emoji?: string;
  label?: string;
  image?: string;
  subtitle?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  recipientRole?: string;
  contextType?: "direct" | "collab" | "artwork_inquiry";
  contextTitle?: string;
  contextId?: string;
  contextMeta?: ContextMeta;
};

export default function MessageModal({
  isOpen, onClose,
  recipientId, recipientName, recipientAvatar, recipientRole,
  contextType = "direct", contextTitle, contextId, contextMeta,
}: Props) {
  const [body, setBody]             = useState("");
  const [guestName, setGuestName]   = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [sending, setSending]       = useState(false);
  const [sent, setSent]             = useState(false);
  const [error, setError]           = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  const templates = TEMPLATES[contextType] || TEMPLATES.direct;

  useEffect(() => {
    if (!isOpen) return;
    setBody(""); setError(""); setSent(false); setGuestName(""); setGuestEmail("");
    // Check login
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user));
    }).catch(() => setIsLoggedIn(false));
    setTimeout(() => textRef.current?.focus(), 80);
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSend() {
    if (!body.trim()) { setError("Please write a message."); return; }
    if (!isLoggedIn && (!guestName.trim() || !guestEmail.trim())) {
      setError("Please enter your name and email so the artist can reply."); return;
    }
    setSending(true); setError("");

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_id: recipientId,
          context_type: contextType,
          context_id: contextId || null,
          context_title: contextTitle || `Message to ${recipientName}`,
          context_meta: contextMeta || null,
          initial_message: body.trim(),
          guest_name: !isLoggedIn ? guestName.trim() : undefined,
          guest_email: !isLoggedIn ? guestEmail.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setSending(false); return; }
      setSent(true); setSending(false);
      setTimeout(() => { onClose(); setSent(false); }, 2200);
    } catch {
      setError("Something went wrong. Please try again.");
      setSending(false);
    }
  }

  const initials = (recipientName || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const contextLabel = contextType === "collab"
    ? "Collab Request" : contextType === "artwork_inquiry"
    ? "Artwork Inquiry" : "Direct Message";

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9001,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        pointerEvents: "none",
      }}>
        <div style={{
          background: "#FFFBEA", border: "2.5px solid #111110", borderRadius: 22,
          boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 500,
          fontFamily: "'Darker Grotesque', system-ui, sans-serif",
          pointerEvents: "auto", overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{ background: "#111110", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
            {/* Recipient avatar */}
            <div style={{
              width: 42, height: 42, borderRadius: 12, overflow: "hidden",
              border: "2px solid #FFD400", background: "#FFD400", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 900, color: "#111110",
            }}>
              {recipientAvatar
                ? <img src={recipientAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#fff", marginBottom: 2 }}>{recipientName}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 10, fontWeight: 800, color: "rgba(255,212,0,0.7)",
                  textTransform: "uppercase", letterSpacing: ".15em",
                }}>
                  <MessageSquare size={9} /> {contextLabel}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Context card — Airbnb style "what you're replying about" */}
          {(contextTitle || contextMeta) && (
            <div style={{ margin: "14px 16px 0", background: "#fff", border: "2px solid #E8E0D0", borderRadius: 14, overflow: "hidden", display: "flex", alignItems: "stretch" }}>
              {contextMeta?.image && (
                <div style={{ width: 72, flexShrink: 0, background: "#F5F0E8", overflow: "hidden" }}>
                  <img src={contextMeta.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              <div style={{ padding: "10px 14px", flex: 1, minWidth: 0 }}>
                {contextMeta?.emoji && (
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
                    <span>{contextMeta.emoji}</span> {contextMeta.label || contextLabel}
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 800, color: "#111110", lineHeight: 1.3 }}>{contextTitle}</div>
                {contextMeta?.subtitle && (
                  <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600, marginTop: 2 }}>{contextMeta.subtitle}</div>
                )}
              </div>
            </div>
          )}

          {sent ? (
            /* Success state */
            <div style={{ padding: "40px 24px", textAlign: "center" }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#DCFCE7", border: "2.5px solid #16A34A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Check size={26} color="#16A34A" strokeWidth={3} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#111110", marginBottom: 6 }}>Message sent! 🎉</div>
              <div style={{ fontSize: 13, color: "#9B8F7A", fontWeight: 600, lineHeight: 1.6 }}>
                {recipientName} will receive your message and can reply directly.
                {!isLoggedIn && " Check your email for their response."}
              </div>
            </div>
          ) : (
            <div style={{ padding: "14px 16px 18px" }}>

              {/* Guest fields */}
              {isLoggedIn === false && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <div>
                    <div style={LABEL_S}>Your name *</div>
                    <input
                      style={INPUT_S}
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <div style={LABEL_S}>Email *</div>
                    <input
                      style={INPUT_S}
                      type="email"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div style={{ gridColumn: "1/-1", fontSize: 10, color: "#C0B8A8", fontWeight: 600 }}>
                    Your contact details are only shared with {recipientName} so they can reply.
                  </div>
                </div>
              )}

              {/* Quick reply templates */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".18em", display: "flex", alignItems: "center", gap: 4, marginBottom: 7 }}>
                  <Sparkles size={9} /> Quick replies
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {templates.map(t => (
                    <button
                      key={t.label}
                      onClick={() => { setBody(t.body); setTimeout(() => textRef.current?.focus(), 50); }}
                      style={{
                        padding: "4px 11px", background: body === t.body ? "#FFD400" : "#F5F0E8",
                        border: `1.5px solid ${body === t.body ? "#111110" : "#E8E0D0"}`,
                        borderRadius: 99, fontSize: 11, fontWeight: 700, color: "#111110",
                        cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message textarea */}
              <div style={{ marginBottom: 10 }}>
                <div style={LABEL_S}>Your message *</div>
                <textarea
                  ref={textRef}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }}
                  placeholder={`Write to ${recipientName}… (Cmd+Enter to send)`}
                  rows={4}
                  style={{ ...INPUT_S, resize: "vertical", minHeight: 90 }}
                />
              </div>

              {error && (
                <div style={{ fontSize: 12, fontWeight: 700, color: "#EF4444", marginBottom: 10 }}>{error}</div>
              )}

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={sending || !body.trim()}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px 20px", background: "#FFD400", border: "2.5px solid #111110",
                  borderRadius: 13, fontSize: 14, fontWeight: 900, cursor: sending ? "not-allowed" : "pointer",
                  fontFamily: "inherit", color: "#111110", boxShadow: sending ? "none" : "3px 3px 0 #111110",
                  opacity: (!body.trim() && !sending) ? 0.5 : 1, transition: "all .15s",
                }}
              >
                {sending
                  ? <><div style={SPINNER} /> Sending…</>
                  : <><Send size={15} /> Send Message</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const LABEL_S: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, color: "#9B8F7A",
  textTransform: "uppercase", letterSpacing: ".16em", marginBottom: 5,
};
const INPUT_S: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "2px solid #E8E0D0", borderRadius: 10, outline: "none",
  fontSize: 13, fontWeight: 600, color: "#111110",
  fontFamily: "'Darker Grotesque', system-ui, sans-serif",
  background: "#fff", transition: "border-color .15s",
  boxSizing: "border-box",
};
const SPINNER: React.CSSProperties = {
  width: 14, height: 14, borderRadius: "50%",
  border: "2px solid rgba(0,0,0,.15)", borderTopColor: "#111110",
  animation: "spin .6s linear infinite",
};
