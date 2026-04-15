"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Send, Search, X, MessageSquare, ChevronRight,
  Handshake, ShoppingBag, User, Check, CheckCheck,
  Sparkles, ArrowLeft, ExternalLink,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type OtherProfile = { id: string; full_name: string; username?: string; avatar_url?: string; role?: string; };
type Conversation = {
  id: string;
  participant_a: string | null;
  participant_b: string | null;
  context_type: string;
  context_title: string | null;
  context_meta: any | null;
  guest_name: string | null;
  guest_email: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  other_profile: OtherProfile | null;
};
type Message = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  guest_name: string | null;
  body: string;
  template_key: string | null;
  created_at: string;
  read_by_a: boolean;
  read_by_b: boolean;
};

// ── Templates ─────────────────────────────────────────────────────
const TEMPLATES = [
  { key: "interested",  label: "Interested! 🤝",    body: "Hi! I'm very interested. Could we chat to discuss the details?" },
  { key: "tell_more",   label: "Tell me more",       body: "Could you share more details? I'd love to understand what you're looking for." },
  { key: "available",   label: "I'm available",      body: "Thanks for reaching out! I'm available and would love to discuss further." },
  { key: "price",       label: "Price inquiry",      body: "Could you tell me more about the pricing for this?" },
  { key: "visit",       label: "Let's meet",         body: "I'd love to arrange a meeting or studio visit. What dates work best for you?" },
  { key: "pass",        label: "Not a fit",          body: "Thank you for reaching out! This isn't quite the right fit for me right now, but I wish you all the best." },
];

// ── Context config ─────────────────────────────────────────────────
const CTX_CFG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  collab:           { label: "Collab Request",    icon: <Handshake size={12} />,    color: "#7C3AED", bg: "#EDE9FE", border: "#C4B5FD" },
  artwork_inquiry:  { label: "Artwork Inquiry",   icon: <ShoppingBag size={12} />,  color: "#0EA5E9", bg: "#E0F2FE", border: "#7DD3FC" },
  direct:           { label: "Direct Message",    icon: <MessageSquare size={12} />, color: "#9B8F7A", bg: "#F5F0E8", border: "#E8E0D0" },
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function fmtDateLabel(d: string) {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function Avatar({ profile, size = 36, guest }: { profile?: OtherProfile | null; size?: number; guest?: string }) {
  const name = profile?.full_name || guest || "?";
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3,
      background: profile ? "#FFD400" : "#E8E0D0",
      border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 900, color: "#111110", overflow: "hidden", flexShrink: 0,
    }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : initials
      }
    </div>
  );
}

// ── Context Card — the "what is this about" Airbnb-style card ──────
function ContextCard({ convo, compact = false }: { convo: Conversation; compact?: boolean }) {
  const ctx = CTX_CFG[convo.context_type || "direct"] || CTX_CFG.direct;
  const meta = convo.context_meta;
  const hasImage = meta?.image;
  const hasTitle = convo.context_title;

  if (!hasTitle && !meta) return null;

  if (compact) {
    // Inline pill shown in conversation list
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          padding: "1px 7px", borderRadius: 99,
          background: ctx.bg, border: `1px solid ${ctx.border}`,
          fontSize: 9, fontWeight: 800, color: ctx.color,
          textTransform: "uppercase", letterSpacing: ".1em",
        }}>
          {ctx.icon}
          {meta?.emoji && <span>{meta.emoji}</span>}
          {convo.context_title && convo.context_title.length > 22
            ? convo.context_title.slice(0, 22) + "…"
            : convo.context_title || ctx.label}
        </div>
      </div>
    );
  }

  // Full card — shown in chat header area, below the name/avatar row
  return (
    <div style={{
      margin: "0 16px 0",
      background: "#fff",
      border: `2px solid ${ctx.border}`,
      borderRadius: 14,
      overflow: "hidden",
      display: "flex",
      alignItems: "stretch",
      boxShadow: "2px 2px 0 " + ctx.border,
    }}>
      {/* Left: colored type stripe */}
      <div style={{
        width: 4, background: ctx.color, flexShrink: 0,
      }} />

      {/* Image if available */}
      {hasImage && (
        <div style={{ width: 64, height: 64, flexShrink: 0, overflow: "hidden", background: "#F5F0E8" }}>
          <img src={hasImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "10px 14px", flex: 1, minWidth: 0 }}>
        {/* Type badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "2px 8px", borderRadius: 99,
          background: ctx.bg, border: `1px solid ${ctx.border}`,
          fontSize: 9, fontWeight: 800, color: ctx.color,
          textTransform: "uppercase", letterSpacing: ".12em",
          marginBottom: 5,
        }}>
          {ctx.icon}
          {meta?.emoji && <span style={{ fontSize: 11 }}>{meta.emoji}</span>}
          {meta?.label ? meta.label : ctx.label}
        </div>

        {/* Title */}
        {convo.context_title && (
          <div style={{
            fontSize: 13, fontWeight: 900, color: "#111110",
            lineHeight: 1.3, marginBottom: 2,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {convo.context_title}
          </div>
        )}

        {/* Subtitle */}
        {meta?.subtitle && (
          <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>
            {meta.subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function MessagesPage() {
  const [myId, setMyId]             = useState<string>("");
  const [convos, setConvos]         = useState<Conversation[]>([]);
  const [active, setActive]         = useState<Conversation | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [loading, setLoading]       = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput]           = useState("");
  const [sending, setSending]       = useState(false);
  const [search, setSearch]         = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setMyId(user.id);
      loadConvos();
    });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function loadConvos() {
    setLoading(true);
    const res = await fetch("/api/conversations");
    const data = await res.json();
    setConvos(data.conversations || []);
    setLoading(false);
  }

  const loadMessages = useCallback(async (convoId: string) => {
    setMsgLoading(true);
    const res = await fetch(`/api/conversations/${convoId}/messages`);
    const data = await res.json();
    setMessages(data.messages || []);
    setMsgLoading(false);
    loadConvos();
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!active) return;
    pollRef.current = setInterval(() => loadMessages(active.id), 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [active, loadMessages]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [messages]);

  function openConvo(c: Conversation) {
    setActive(c);
    setMobileView("chat");
    loadMessages(c.id);
    setShowTemplates(false);
  }

  async function send(body?: string) {
    const text = body ?? input.trim();
    if (!text || !active) return;
    setSending(true);
    setInput("");
    setShowTemplates(false);

    const res = await fetch(`/api/conversations/${active.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    const data = await res.json();
    if (data.message) {
      setMessages(p => [...p, data.message]);
      setConvos(p => p.map(c =>
        c.id === active.id
          ? { ...c, last_message_preview: text.slice(0, 120), last_message_at: new Date().toISOString(), unread_count: 0 }
          : c
      ));
    }
    setSending(false);
    inputRef.current?.focus();
  }

  const filtered = convos.filter(c => {
    const name = c.other_profile?.full_name || c.guest_name || "";
    return name.toLowerCase().includes(search.toLowerCase()) ||
      (c.context_title || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.last_message_preview || "").toLowerCase().includes(search.toLowerCase());
  });

  const totalUnread = convos.reduce((sum, c) => sum + c.unread_count, 0);
  const isMe = (msg: Message) => msg.sender_id === myId;
  const hasContext = (c: Conversation) => c.context_type !== "direct" || c.context_title;

  return (
    <>
      <style>{CSS}</style>
      <div className="msg-root">

        {/* ── SIDEBAR ──────────────────────────────────────────── */}
        <div className={`msg-sidebar ${mobileView === "chat" ? "msg-hide-mobile" : ""}`}>

          <div className="msg-sidebar-hdr">
            <div className="msg-sidebar-title">
              <MessageSquare size={18} strokeWidth={2.5} />
              Messages
              {totalUnread > 0 && <span className="msg-badge">{totalUnread}</span>}
            </div>
            <div className="msg-search">
              <Search size={13} color="#9B8F7A" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…" className="msg-search-input" />
              {search && <button onClick={() => setSearch("")} className="msg-search-clear"><X size={12} /></button>}
            </div>
          </div>

          <div className="msg-list">
            {loading ? (
              <div className="msg-empty"><div className="msg-spinner" /></div>
            ) : filtered.length === 0 ? (
              <div className="msg-empty">
                <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#111110", marginBottom: 4 }}>
                  {search ? "No results" : "No messages yet"}
                </div>
                <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600, textAlign: "center" }}>
                  {search ? "Try a different search" : "Messages from collectors, venues & artists will appear here"}
                </div>
              </div>
            ) : filtered.map(c => {
              const isActive = active?.id === c.id;
              const name = c.other_profile?.full_name || c.guest_name || "Guest";
              const ctx = CTX_CFG[c.context_type || "direct"] || CTX_CFG.direct;

              return (
                <button key={c.id} className={`msg-convo-item ${isActive ? "active" : ""} ${c.unread_count > 0 ? "unread" : ""}`} onClick={() => openConvo(c)}>
                  <Avatar profile={c.other_profile} guest={c.guest_name || undefined} size={42} />
                  <div className="msg-convo-info">
                    <div className="msg-convo-top">
                      <span className="msg-convo-name">{name}</span>
                      <span className="msg-convo-time">{timeAgo(c.last_message_at)}</span>
                    </div>

                    {/* Context pill — compact */}
                    {hasContext(c) && <ContextCard convo={c} compact />}

                    <div className="msg-convo-preview">
                      {c.last_message_preview || "No messages yet"}
                    </div>
                  </div>
                  {c.unread_count > 0 && (
                    <div className="msg-unread-dot">{c.unread_count}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CHAT PANEL ───────────────────────────────────────── */}
        <div className={`msg-chat ${mobileView === "list" ? "msg-hide-mobile" : ""}`}>

          {!active ? (
            <div className="msg-chat-empty">
              <div style={{ fontSize: 56, marginBottom: 16 }}>💬</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#111110", marginBottom: 6 }}>Select a conversation</div>
              <div style={{ fontSize: 14, color: "#9B8F7A", fontWeight: 600 }}>Choose from the left to start messaging</div>
            </div>
          ) : (
            <>
              {/* ── Chat header ── */}
              <div className="msg-chat-hdr">
                <button className="msg-back-btn" onClick={() => setMobileView("list")}>
                  <ArrowLeft size={16} />
                </button>
                <Avatar profile={active.other_profile} guest={active.guest_name || undefined} size={38} />
                <div className="msg-chat-hdr-info">
                  <div className="msg-chat-hdr-name">
                    {active.other_profile?.full_name || active.guest_name || "Guest"}
                  </div>
                  {active.guest_email && (
                    <div className="msg-chat-hdr-sub">
                      <User size={10} /> {active.guest_email}
                    </div>
                  )}
                  {active.other_profile?.role && (
                    <div className="msg-chat-hdr-sub" style={{ textTransform: "capitalize" }}>
                      {active.other_profile.role}
                    </div>
                  )}
                </div>
                {active.other_profile?.username && (
                  <a href={`/${active.other_profile.username}`} target="_blank" rel="noopener noreferrer" className="msg-profile-link">
                    View profile <ChevronRight size={12} />
                  </a>
                )}
              </div>

              {/* ── Context card — PROMINENT, below the header ── */}
              {hasContext(active) && (
                <div style={{ padding: "10px 16px 0" }}>
                  <ContextCard convo={active} compact={false} />
                </div>
              )}

              {/* ── Messages ── */}
              <div className="msg-messages">
                {msgLoading ? (
                  <div className="msg-empty"><div className="msg-spinner" /></div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 24px", color: "#9B8F7A", fontSize: 13, fontWeight: 600 }}>
                    No messages yet — say hello!
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => {
                      const mine = isMe(msg);
                      const prev = messages[i - 1];
                      const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
                      const showAvatar = !mine && (!messages[i + 1] || messages[i + 1].sender_id !== msg.sender_id);

                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="msg-date-sep">{fmtDateLabel(msg.created_at)}</div>
                          )}
                          <div className={`msg-bubble-row ${mine ? "mine" : "theirs"}`}>
                            {!mine && (
                              showAvatar
                                ? <Avatar profile={active.other_profile} guest={active.guest_name || undefined} size={28} />
                                : <div style={{ width: 28, flexShrink: 0 }} />
                            )}
                            <div className="msg-bubble-col">
                              {msg.template_key && (
                                <div className="msg-template-tag">
                                  <Sparkles size={9} /> Quick reply
                                </div>
                              )}
                              <div className={`msg-bubble ${mine ? "msg-bubble-mine" : "msg-bubble-theirs"}`}>
                                {msg.body}
                              </div>
                              <div className={`msg-bubble-meta ${mine ? "mine" : ""}`}>
                                {fmtTime(msg.created_at)}
                                {mine && (
                                  msg.read_by_b
                                    ? <CheckCheck size={12} color="#16A34A" />
                                    : <Check size={12} color="#9B8F7A" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </>
                )}
              </div>

              {/* ── Quick reply templates ── */}
              {showTemplates && (
                <div className="msg-templates">
                  <div className="msg-templates-title">
                    <Sparkles size={12} /> Quick replies
                    <button onClick={() => setShowTemplates(false)} className="msg-templates-close"><X size={13} /></button>
                  </div>
                  <div className="msg-templates-grid">
                    {TEMPLATES.map(t => (
                      <button key={t.key} className="msg-template-btn" onClick={() => send(t.body)}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Input ── */}
              <div className="msg-input-area">
                <button className={`msg-template-toggle ${showTemplates ? "active" : ""}`} onClick={() => setShowTemplates(p => !p)} title="Quick replies">
                  <Sparkles size={15} />
                </button>
                <div className="msg-input-wrap">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Type a message… (Enter to send)"
                    className="msg-textarea"
                    rows={1}
                  />
                </div>
                <button className="msg-send-btn" onClick={() => send()} disabled={!input.trim() || sending}>
                  {sending ? <div className="msg-spinner-sm" /> : <Send size={16} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@500;600;700;800;900&display=swap');

  .msg-root {
    display: grid;
    grid-template-columns: 300px 1fr;
    height: calc(100vh - 80px);
    background: #fff;
    border: 2.5px solid #111110;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 5px 6px 0 #D4C9A8;
    font-family: 'Darker Grotesque', system-ui, sans-serif;
  }

  /* ── SIDEBAR ─────────────────────────────────────────────────── */
  .msg-sidebar {
    display: flex; flex-direction: column;
    border-right: 2px solid #E8E0D0;
    background: #FFFBEA;
  }
  .msg-sidebar-hdr {
    padding: 16px 14px 12px;
    border-bottom: 2px solid #E8E0D0;
    background: #fff;
  }
  .msg-sidebar-title {
    display: flex; align-items: center; gap: 8px;
    font-size: 17px; font-weight: 900; color: #111110;
    margin-bottom: 10px; letter-spacing: -.3px;
  }
  .msg-badge {
    background: #FFD400; color: #111110;
    font-size: 10px; font-weight: 900;
    padding: 1px 7px; border-radius: 99px;
    border: 2px solid #111110; min-width: 20px; text-align: center;
  }
  .msg-search {
    display: flex; align-items: center; gap: 8px;
    background: #F5F0E8; border: 2px solid #E8E0D0; border-radius: 10px;
    padding: 0 10px; height: 34px;
    transition: border-color .15s;
  }
  .msg-search:focus-within { border-color: #111110; background: #fff; }
  .msg-search-input {
    flex: 1; border: none; outline: none; background: transparent;
    font-family: inherit; font-size: 12px; font-weight: 600; color: #111110;
  }
  .msg-search-input::placeholder { color: #C0B8A8; }
  .msg-search-clear { background: none; border: none; cursor: pointer; color: #9B8F7A; display: flex; padding: 0; }

  .msg-list { flex: 1; overflow-y: auto; padding: 6px; }
  .msg-list::-webkit-scrollbar { width: 3px; }
  .msg-list::-webkit-scrollbar-thumb { background: #E8E0D0; border-radius: 99px; }

  /* Conversation items */
  .msg-convo-item {
    display: flex; align-items: flex-start; gap: 10px;
    width: 100%; padding: 10px 10px; border-radius: 12px;
    border: none; background: transparent; cursor: pointer; text-align: left;
    font-family: inherit; transition: background .12s;
    position: relative; margin-bottom: 2px;
  }
  .msg-convo-item:hover { background: #F5F0E8; }
  .msg-convo-item.active {
    background: #FFD400;
    box-shadow: 2px 2px 0 #111110;
    border: 2px solid #111110;
  }
  .msg-convo-item.unread .msg-convo-name { font-weight: 900; }
  .msg-convo-item.unread .msg-convo-preview { color: #111110; font-weight: 700; }

  .msg-convo-info { flex: 1; min-width: 0; }
  .msg-convo-top {
    display: flex; justify-content: space-between; align-items: baseline;
    gap: 4px; margin-bottom: 3px;
  }
  .msg-convo-name {
    font-size: 13px; font-weight: 800; color: #111110;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;
  }
  .msg-convo-time { font-size: 10px; font-weight: 700; color: #9B8F7A; flex-shrink: 0; }
  .msg-convo-preview {
    font-size: 11px; font-weight: 600; color: #9B8F7A;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-top: 2px;
  }
  .msg-unread-dot {
    background: #111110; color: #FFD400;
    font-size: 10px; font-weight: 900;
    min-width: 18px; height: 18px; border-radius: 99px;
    display: flex; align-items: center; justify-content: center;
    padding: 0 4px; flex-shrink: 0; margin-top: 2px;
  }

  /* ── CHAT ────────────────────────────────────────────────────── */
  .msg-chat {
    display: flex; flex-direction: column;
    background: #FFFBEA; overflow: hidden;
  }
  .msg-chat-empty {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; color: #9B8F7A;
  }

  /* Chat header — compact, just name + avatar */
  .msg-chat-hdr {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px 10px;
    border-bottom: 2px solid #E8E0D0;
    background: #fff;
  }
  .msg-back-btn {
    display: none; background: none; border: none; cursor: pointer;
    padding: 4px; color: #111110; border-radius: 8px;
  }
  .msg-chat-hdr-info { flex: 1; min-width: 0; }
  .msg-chat-hdr-name { font-size: 15px; font-weight: 900; color: #111110; line-height: 1.2; }
  .msg-chat-hdr-sub {
    display: flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 700; color: #9B8F7A;
  }
  .msg-profile-link {
    display: flex; align-items: center; gap: 3px;
    font-size: 11px; font-weight: 800; color: #111110;
    padding: 5px 10px; border: 2px solid #E8E0D0; border-radius: 9px;
    text-decoration: none; white-space: nowrap; transition: all .15s;
    background: #fff; flex-shrink: 0;
  }
  .msg-profile-link:hover { border-color: #111110; }

  /* Messages area */
  .msg-messages {
    flex: 1; overflow-y: auto; padding: 14px 16px;
    display: flex; flex-direction: column; gap: 2px;
  }
  .msg-messages::-webkit-scrollbar { width: 3px; }
  .msg-messages::-webkit-scrollbar-thumb { background: #E8E0D0; border-radius: 99px; }

  .msg-date-sep {
    text-align: center; font-size: 10px; font-weight: 700; color: #C0B8A8;
    padding: 10px 0 4px; letter-spacing: .06em;
  }
  .msg-bubble-row {
    display: flex; align-items: flex-end; gap: 6px; margin-bottom: 2px;
  }
  .msg-bubble-row.mine { flex-direction: row-reverse; }
  .msg-bubble-col { display: flex; flex-direction: column; max-width: 70%; }
  .msg-template-tag {
    display: flex; align-items: center; gap: 3px;
    font-size: 9px; font-weight: 800; color: #9B8F7A;
    letter-spacing: .08em; margin-bottom: 2px; padding-left: 2px;
  }
  .msg-bubble {
    padding: 9px 13px; border-radius: 16px; border: 2px solid #111110;
    font-size: 14px; font-weight: 600; line-height: 1.5; word-break: break-word;
  }
  .msg-bubble-mine {
    background: #FFD400; color: #111110;
    border-radius: 16px 16px 4px 16px;
    box-shadow: 2px 2px 0 #111110;
  }
  .msg-bubble-theirs {
    background: #fff; color: #111110;
    border-radius: 16px 16px 16px 4px;
    box-shadow: 1px 2px 0 #E8E0D0;
  }
  .msg-bubble-meta {
    display: flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 700; color: #C0B8A8;
    padding: 2px 3px; margin-top: 1px;
  }
  .msg-bubble-meta.mine { justify-content: flex-end; }

  /* Templates */
  .msg-templates {
    background: #fff; border-top: 2px solid #E8E0D0;
    padding: 10px 14px;
  }
  .msg-templates-title {
    display: flex; align-items: center; gap: 6px;
    font-size: 10px; font-weight: 800; color: #9B8F7A;
    text-transform: uppercase; letter-spacing: .12em; margin-bottom: 8px;
  }
  .msg-templates-close { background: none; border: none; cursor: pointer; color: #9B8F7A; margin-left: auto; display: flex; }
  .msg-templates-grid { display: flex; flex-wrap: wrap; gap: 5px; }
  .msg-template-btn {
    padding: 4px 11px; background: #F5F0E8; border: 1.5px solid #E8E0D0;
    border-radius: 99px; font-family: inherit; font-size: 11px; font-weight: 700;
    color: #111110; cursor: pointer; transition: all .15s;
  }
  .msg-template-btn:hover { background: #FFD400; border-color: #111110; }

  /* Input */
  .msg-input-area {
    display: flex; align-items: flex-end; gap: 8px;
    padding: 10px 14px; border-top: 2px solid #E8E0D0; background: #fff;
  }
  .msg-template-toggle {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    border: 2px solid #E8E0D0; background: #F5F0E8;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #9B8F7A; transition: all .15s;
  }
  .msg-template-toggle:hover, .msg-template-toggle.active {
    background: #FFD400; border-color: #111110; color: #111110;
  }
  .msg-input-wrap { flex: 1; }
  .msg-textarea {
    width: 100%; border: 2px solid #E8E0D0; border-radius: 12px;
    padding: 8px 13px; font-family: inherit; font-size: 14px; font-weight: 600;
    color: #111110; background: #fff; outline: none; resize: none;
    min-height: 36px; max-height: 120px; overflow-y: auto; line-height: 1.5;
    transition: border-color .15s;
  }
  .msg-textarea:focus { border-color: #111110; }
  .msg-textarea::placeholder { color: #C0B8A8; }
  .msg-send-btn {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    border: 2.5px solid #111110; background: #FFD400;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #111110; transition: all .15s;
    box-shadow: 2px 2px 0 #111110;
  }
  .msg-send-btn:hover:not(:disabled) { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 #111110; }
  .msg-send-btn:disabled { opacity: .4; cursor: not-allowed; }

  /* Loaders */
  .msg-empty {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 40px 24px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .msg-spinner {
    width: 22px; height: 22px;
    border: 3px solid #E8E0D0; border-top-color: #111110;
    border-radius: 50%; animation: spin .7s linear infinite;
  }
  .msg-spinner-sm {
    width: 14px; height: 14px;
    border: 2px solid rgba(0,0,0,.15); border-top-color: #111110;
    border-radius: 50%; animation: spin .7s linear infinite;
  }

  /* ── RESPONSIVE ──────────────────────────────────────────────── */
  @media (max-width: 700px) {
    .msg-root { grid-template-columns: 1fr; height: calc(100vh - 100px); }
    .msg-sidebar, .msg-chat { grid-column: 1; grid-row: 1; }
    .msg-hide-mobile { display: none !important; }
    .msg-back-btn { display: flex !important; }
  }
`;
