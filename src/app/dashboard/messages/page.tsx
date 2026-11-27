"use client";
// Messages: every conversation on the left, the open one on the right.
// On a phone the list and the chat take turns. A second tab, Deals, holds
// every offer and request between artists and venues.
import { useState, useEffect, useRef, useCallback } from "react";
import { DealsPanel } from "@/components/deals/DealsPanel";
import { createClient } from "@/lib/supabase/client";
import { fetchJson, forget, timeoutSignal } from "@/lib/fetch-json";
import { ArrowLeft, Ban, Check, CheckCheck, ChevronRight, Flag, MessageSquare, Send, Sparkles } from "lucide-react";
import { BlockDialog, reportPersonHref } from "@/components/BlockDialog";
import Link from "next/link";
import { Avatar, Badge, Button, ButtonLink, Chip, EmptyState, Menu, SearchField, Skeleton, Tabs, cn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";

type OtherProfile = { id: string; full_name: string; username?: string; avatar_url?: string; role?: string };
type Conversation = {
  id: string; participant_a: string | null; participant_b: string | null;
  context_type: string; context_title: string | null; context_meta: any | null; context_id: string | null;
  guest_name: string | null; guest_email: string | null;
  last_message_at: string; last_message_preview: string | null; unread_count: number;
  other_profile: OtherProfile | null;
  blocked_by_me?: boolean;
};
type Message = {
  id: string; conversation_id: string; sender_id: string | null; guest_name: string | null;
  body: string; template_key: string | null; created_at: string; read_by_a: boolean; read_by_b: boolean;
};

const QUICK_REPLIES = [
  { key: "interested", label: "I'm interested", body: "Hi! I'm very interested. Could we chat to discuss the details?" },
  { key: "tell_more", label: "Tell me more", body: "Could you share more details? I'd love to understand what you're looking for." },
  { key: "available", label: "I'm available", body: "Thanks for reaching out! I'm available and would love to discuss further." },
  { key: "price", label: "Ask the price", body: "Could you tell me more about the pricing for this?" },
  { key: "visit", label: "Let's meet", body: "I'd love to arrange a meeting. What dates work best for you?" },
  { key: "pass", label: "Not a fit", body: "Thank you for reaching out! This isn't quite the right fit for me right now." },
];

const CONTEXT: Record<string, { label: string; tone: BadgeTone }> = {
  collab: { label: "Collab", tone: "violet" },
  artwork_inquiry: { label: "About a work", tone: "info" },
  direct: { label: "Message", tone: "neutral" },
};

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
function dayLabel(d: string) {
  const date = new Date(d), today = new Date(), y = new Date();
  y.setDate(y.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === y.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

const nameOf = (c: Conversation) => c.other_profile?.full_name || c.guest_name || "Guest";
const profileUrlOf = (c: Conversation) =>
  c.other_profile?.username && typeof window !== "undefined" ? `${window.location.origin}/${c.other_profile.username}` : null;
const hasContext = (c: Conversation) => !!(c.context_title || c.context_meta);

/** The post or work the conversation started from. */
function ContextCard({ convo }: { convo: Conversation }) {
  const ctx = CONTEXT[convo.context_type || "direct"] || CONTEXT.direct;
  const meta = convo.context_meta;
  const href = convo.context_type === "collab" ? "/dashboard/scene"
    : convo.context_type === "artwork_inquiry" && convo.context_id ? `/artwork/${convo.context_id}/passport` : null;
  const body = (
    <>
      {meta?.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" decoding="async" src={meta.image} alt="" className="h-12 w-12 shrink-0 rounded-chip border-hair border-line bg-sunken object-contain" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <Badge tone={ctx.tone} className="w-fit">{meta?.label || ctx.label}</Badge>
        {convo.context_title && <span className="truncate font-ui text-label font-semibold text-fg">{convo.context_title}</span>}
        {meta?.subtitle && <span className="truncate font-ui text-caption text-fg-3">{meta.subtitle}</span>}
      </span>
      {href && <ChevronRight size={16} aria-hidden className="shrink-0 text-fg-3" />}
    </>
  );
  const cls = "flex items-center gap-3 rounded-control border-hair border-line bg-surface px-3 py-2.5";
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={cn(cls, "hover:border-ink")}>{body}</a>
    : <div className={cls}>{body}</div>;
}

type View = "chats" | "deals";

export default function MessagesPage() {
  const [view, setView] = useState<View>("chats");
  const [needs, setNeeds] = useState<number | undefined>(undefined);
  const [chatKey, setChatKey] = useState(0);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "deals") setView("deals");
  }, []);

  function go(v: View, query = "") {
    setView(v);
    const url = new URL(window.location.href);
    url.search = query || (v === "deals" ? "?tab=deals" : "");
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs label="Messages" value={view} onChange={v => go(v)} className="self-start"
        items={[{ value: "chats", label: "Chats" }, { value: "deals", label: "Deals", count: needs || undefined }]} />
      {/* Deals stays mounted so its "needs you" count shows on the tab. */}
      <div className={view === "deals" ? "" : "hidden"}>
        <DealsPanel onCount={setNeeds} onOpenChat={id => { go("chats", `?c=${id}`); setChatKey(k => k + 1); }} />
      </div>
      {view === "chats" && <ChatsView key={chatKey} />}
    </div>
  );
}

function ChatsView() {
  const [myId, setMyId] = useState("");
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [showQuick, setShowQuick] = useState(false);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");
  const [blocking, setBlocking] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadConvos(fresh = false) {
    try {
      // Shares the shell's request on first load; `fresh` after reading a chat.
      if (fresh) forget("/api/conversations");
      const data = await fetchJson("/api/conversations");
      const list: Conversation[] = data.conversations || [];
      setConvos(list);
      return list;
    } catch { setError("Your messages didn't load. Please refresh the page."); }
    finally { setLoading(false); }
    return null;
  }

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setMyId(user.id);
      loadConvos().then(list => {
        // ?c=<id> opens that chat, e.g. right after offering a work.
        const want = new URLSearchParams(window.location.search).get("c");
        const hit = want && list?.find(c => c.id === want);
        if (hit) openConvo(hit);
      });
    });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const seen = useRef<{ id: string; n: number }>({ id: "", n: -1 });
  const loadMessages = useCallback(async (convoId: string, quiet = false) => {
    if (quiet && document.hidden) return; // no polling in a background tab
    if (!quiet) setMsgLoading(true);
    let changed = !quiet;
    try {
      const res = await fetch(`/api/conversations/${convoId}/messages`, { signal: timeoutSignal(10_000) });
      const data = await res.json();
      const msgs = data.messages || [];
      // Only re-render and refresh the list when something new arrived.
      if (seen.current.id !== convoId || seen.current.n !== msgs.length) {
        changed = true;
        seen.current = { id: convoId, n: msgs.length };
        setMessages(prev => (prev.some(m => String(m.id).startsWith("tmp-")) && quiet ? prev : msgs));
      }
    } catch { /* keep what we have */ }
    setMsgLoading(false);
    if (changed) loadConvos(true);
  }, []);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!active) return;
    pollRef.current = setInterval(() => loadMessages(active.id, true), 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [active, loadMessages]);

  useEffect(() => {
    const t = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
    return () => clearTimeout(t);
  }, [messages]);

  function openConvo(c: Conversation) {
    setActive(c); setShowQuick(false); setMessages([]); setSendError("");
    loadMessages(c.id);
  }

  async function send(body?: string) {
    const text = body ?? input.trim();
    if (!text || !active) return;
    setSending(true); setInput(""); setShowQuick(false); setSendError("");
    // Show the message straight away; swap in the saved one when the server answers.
    const tmpId = `tmp-${Date.now()}`;
    const now = new Date().toISOString();
    setMessages(p => [...p, { id: tmpId, conversation_id: active.id, sender_id: myId, body: text, created_at: now } as any]);
    setConvos(p => p.map(c => c.id === active.id
      ? { ...c, last_message_preview: text.slice(0, 120), last_message_at: now, unread_count: 0 } : c));
    const undo = () => { setMessages(p => p.filter(m => m.id !== tmpId)); setInput(text); };
    try {
      const res = await fetch(`/api/conversations/${active.id}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text }),
        signal: timeoutSignal(15_000),
      });
      const data = await res.json();
      if (data.message) {
        setMessages(p => p.map(m => (m.id === tmpId ? data.message : m)));
        seen.current = { id: active.id, n: seen.current.n + 1 };
      } else { undo(); setSendError(data.error || "Your message didn't send. Please try again."); }
    } catch { undo(); setSendError("Your message didn't send. Check your connection and try again."); }
    setSending(false);
    inputRef.current?.focus();
  }

  const q = search.toLowerCase().trim();
  const list = convos.filter(c => !q || [nameOf(c), c.context_title, c.last_message_preview].some(v => (v || "").toLowerCase().includes(q)));
  const totalUnread = convos.reduce((n, c) => n + (c.unread_count || 0), 0);

  return (
    <div className="flex h-[calc(100dvh-var(--shell-header)-6rem-var(--tabbar-space,0px))] min-h-[420px] overflow-hidden rounded-card border-outline border-ink bg-surface shadow-hard-2 lg:h-[calc(100dvh-var(--shell-header)-7rem)]">
      {/* ── List ── */}
      <section aria-label="Conversations" className={cn("flex w-full flex-col border-r-hair border-line md:w-80 md:shrink-0", active && "hidden md:flex")}>
        <div className="flex flex-col gap-3 border-b-hair border-line p-4">
          <h1 className="sr-only">Messages</h1>
          <SearchField value={search} onChange={setSearch} placeholder="Search people and posts" />
          {totalUnread > 0 && <p className="font-ui text-caption font-semibold text-fg-2">{totalUnread === 1 ? "1 unread message" : `${totalUnread} unread messages`}</p>}
        </div>
        {error && <p role="alert" className="px-4 pt-3 font-ui text-body-sm text-bad">{error}</p>}
        <ul className="flex-1 overflow-y-auto p-2">
          {loading ? [0, 1, 2, 3].map(i => <li key={i} className="p-2"><Skeleton className="h-14 rounded-control" /></li>)
            : list.length === 0 ? (
              <li className="px-4 py-10 text-center">
                <p className="font-ui text-label font-semibold text-fg">{q ? "No one by that name" : "No messages yet"}</p>
                <p className="mt-1 font-ui text-body-sm text-fg-3">{q ? "Try another search." : "When collectors, venues or artists write to you, it shows up here."}</p>
                {!q && <Link href="/dashboard/looking" className="mt-3 inline-block font-ui text-label font-semibold text-fg underline underline-offset-4">Find someone to talk to</Link>}
              </li>
            ) : list.map(c => {
              const on = active?.id === c.id;
              const unread = c.unread_count > 0;
              const ctx = hasContext(c) ? CONTEXT[c.context_type] || CONTEXT.direct : null;
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => openConvo(c)} aria-current={on ? "true" : undefined}
                    className={cn("flex w-full items-start gap-3 rounded-control border-outline px-3 py-2.5 text-left transition-colors duration-fast",
                      on ? "border-ink bg-mango-soft" : "border-transparent hover:bg-sunken")}>
                    <Avatar name={nameOf(c)} src={c.other_profile?.avatar_url} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={cn("truncate font-ui text-label text-fg", unread ? "font-bold" : "font-semibold")}>{nameOf(c)}</span>
                        <span className="shrink-0 font-ui text-caption tabular-nums text-fg-3">{timeAgo(c.last_message_at)}</span>
                      </span>
                      {ctx && c.context_title && <span className="truncate font-ui text-caption text-fg-2">{ctx.label} · {c.context_title}</span>}
                      <span className="flex items-center gap-2">
                        <span className={cn("min-w-0 flex-1 truncate font-ui text-body-sm", unread ? "font-semibold text-fg" : "text-fg-3")}>
                          {c.last_message_preview || "No messages yet"}
                        </span>
                        {unread && (
                          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-pill bg-ink px-1.5 font-ui text-caption font-bold leading-none text-on-inverse">
                            {c.unread_count > 9 ? "9+" : c.unread_count}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
        </ul>
      </section>

      {/* ── Chat ── */}
      <section aria-label="Conversation" className={cn("min-w-0 flex-1 flex-col bg-page", active ? "flex" : "hidden md:flex")}>
        {!active ? (
          <div className="grid flex-1 place-items-center p-6">
            <EmptyState icon={<MessageSquare size={20} aria-hidden />} title="Pick a conversation"
              description="Choose someone on the left to read and reply." className="border-none bg-transparent" />
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b-hair border-line bg-surface px-4 py-3">
              <button type="button" aria-label="Back to conversations" onClick={() => setActive(null)}
                className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-pill text-fg-2 hover:bg-sunken hover:text-fg md:hidden">
                <ArrowLeft size={18} aria-hidden />
              </button>
              <Avatar name={nameOf(active)} src={active.other_profile?.avatar_url} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-ui text-body font-semibold text-fg">{nameOf(active)}</span>
                {(active.guest_email || active.other_profile?.role) && (
                  <span className="truncate font-ui text-caption capitalize text-fg-3">
                    {active.guest_email ? <span className="normal-case">{active.guest_email}</span> : active.other_profile?.role === "gallery" ? "venue" : active.other_profile?.role}
                  </span>
                )}
              </span>
              {active.other_profile?.username && (
                <ButtonLink href={`/${active.other_profile.username}`} target="_blank" rel="noopener noreferrer" variant="ghost" size="sm">
                  Profile <ChevronRight size={14} aria-hidden />
                </ButtonLink>
              )}
              {active.other_profile && (
                <Menu label={`More for ${nameOf(active)}`} items={[
                  { label: "Report", icon: Flag, onSelect: () => { window.location.href = reportPersonHref(profileUrlOf(active)); } },
                  { label: active.blocked_by_me ? "Unblock" : "Block", icon: Ban, danger: !active.blocked_by_me, onSelect: () => setBlocking(true) },
                ]} />
              )}
            </header>
            {active.other_profile && (
              <BlockDialog open={blocking} onClose={() => setBlocking(false)} otherId={active.other_profile.id}
                name={nameOf(active)} blocked={!!active.blocked_by_me} profileUrl={profileUrlOf(active)}
                onDone={b => {
                  setActive(a => (a ? { ...a, blocked_by_me: b } : a));
                  setConvos(p => p.map(c => (c.id === active.id ? { ...c, blocked_by_me: b } : c)));
                }} />
            )}

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {hasContext(active) && <div className="mx-auto mb-4 max-w-md"><ContextCard convo={active} /></div>}
              {msgLoading ? (
                <div className="flex flex-col gap-3">{[0, 1, 2].map(i => <Skeleton key={i} className={cn("h-10 w-2/3 rounded-card", i % 2 === 1 && "ml-auto")} />)}</div>
              ) : messages.length === 0 ? (
                <p className="py-10 text-center font-ui text-body-sm text-fg-3">No messages yet. Say hello.</p>
              ) : (
                <ol className="flex flex-col gap-1">
                  {messages.map((m, i) => {
                    const mine = m.sender_id === myId;
                    const prev = messages[i - 1];
                    const newDay = !prev || new Date(m.created_at).toDateString() !== new Date(prev.created_at).toDateString();
                    const lastOfRun = !messages[i + 1] || messages[i + 1].sender_id !== m.sender_id;
                    return (
                      <li key={m.id} className="flex flex-col">
                        {newDay && <span className="my-3 self-center font-ui text-caption font-semibold text-fg-3">{dayLabel(m.created_at)}</span>}
                        <div className={cn("flex max-w-[78%] flex-col", mine ? "items-end self-end" : "items-start self-start")}>
                          {m.template_key && m.template_key !== "deal" && <span className="mb-0.5 inline-flex items-center gap-1 font-ui text-caption text-fg-3"><Sparkles size={11} aria-hidden /> Quick reply</span>}
                          <p className={cn("whitespace-pre-wrap break-words rounded-card border-outline px-3.5 py-2 font-ui text-body",
                            mine ? "border-ink bg-mango text-on-mango" : "border-line bg-surface text-fg")}>
                            {m.body}
                          </p>
                          {lastOfRun && (
                            <span className="mt-1 inline-flex items-center gap-1 px-1 font-ui text-caption tabular-nums text-fg-3">
                              {fmtTime(m.created_at)}
                              {mine && (m.read_by_b ? <CheckCheck size={13} aria-label="Read" className="text-ok" /> : <Check size={13} aria-label="Sent" />)}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
              <div ref={bottomRef} />
            </div>

            {active.blocked_by_me ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t-hair border-line bg-surface px-4 py-3">
                <p className="font-ui text-body-sm text-fg-2">You blocked {nameOf(active).split(" ")[0]}. You can&rsquo;t message each other.</p>
                <Button size="sm" variant="secondary" onClick={() => setBlocking(true)}>Unblock</Button>
              </div>
            ) : <>
            {sendError && <p role="alert" className="border-t-hair border-line bg-surface px-4 pt-3 font-ui text-body-sm text-bad">{sendError}</p>}
            {showQuick && (
              <div className="flex gap-2 overflow-x-auto border-t-hair border-line bg-surface px-4 py-3" role="group" aria-label="Quick replies">
                {QUICK_REPLIES.map(t => <Chip key={t.key} onClick={() => send(t.body)} className="shrink-0">{t.label}</Chip>)}
              </div>
            )}

            <form onSubmit={e => { e.preventDefault(); send(); }} className="flex items-end gap-2 border-t-hair border-line bg-surface px-3 py-3">
              <button type="button" aria-label="Quick replies" aria-pressed={showQuick} onClick={() => setShowQuick(v => !v)}
                className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-pill transition-colors duration-fast",
                  showQuick ? "bg-inverse text-on-inverse" : "text-fg-2 hover:bg-sunken hover:text-fg")}>
                <Sparkles size={18} aria-hidden />
              </button>
              <textarea ref={inputRef} value={input} rows={1} aria-label="Message"
                onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Write a message"
                className="max-h-36 min-h-10 flex-1 resize-none rounded-control border-hair border-line-strong bg-surface px-3 py-2 font-ui text-control text-fg outline-none placeholder:text-fg-3 focus:border-ink focus:shadow-hard-1" />
              <button type="submit" aria-label="Send" disabled={!input.trim() || sending}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-pill border-outline border-ink bg-mango text-on-mango shadow-hard-1 transition-transform duration-fast hover:-translate-y-px disabled:opacity-40 disabled:hover:translate-y-0">
                <Send size={17} aria-hidden />
              </button>
            </form>
            </>}
          </>
        )}
      </section>
    </div>
  );
}
