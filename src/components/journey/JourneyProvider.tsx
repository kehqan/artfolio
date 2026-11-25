"use client";
// Guidance that travels with you through the app:
//   toast()     a small note after a move: what happened, what's next.
//   later()     do something in a few seconds, with Undo until then
//               (instead of "Are you sure?" boxes).
//   celebrate() a short moment at a real milestone, once per milestone.
//   hints       one-time page hints (see Hint.tsx).
// Mounted once in the dashboard layout, so it survives page changes.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type Journey, type Milestone, journeyOf, saveJourney } from "@/lib/journey";
import { Burst } from "./Burst";
import { cn } from "@/components/ui";

export type ToastAction = { label: string; href?: string; onClick?: () => void };
export type ToastInput = { title: string; body?: string; action?: ToastAction; tone?: "ok" | "plain" };
export type LaterInput = ToastInput & {
  /** Runs when the time is up (or the page is left). */
  commit: () => void | Promise<void>;
  /** Runs if they tap Undo in time. */
  undo: () => void;
  ms?: number;
};
export type MomentInput = {
  title: string;
  body?: string;
  /** A picture to hold up in the middle, usually the work. */
  image?: string | null;
  primary?: ToastAction;
  secondary?: ToastAction;
};

type Toast = ToastInput & { id: number; ms: number; undo?: () => void };

type Ctx = {
  ready: boolean;
  toast: (t: ToastInput) => void;
  later: (t: LaterInput) => void;
  /** Shows the moment only the first time this milestone is reached. Resolves true if it showed. */
  /** first: false when we know it isn't really their first (it is then only marked). */
  celebrate: (m: Milestone, moment: MomentInput, first?: boolean) => Promise<boolean>;
  /** Marks a milestone without showing anything. Resolves true if it is new. */
  win: (m: Milestone) => Promise<boolean>;
  has: (m: Milestone) => boolean;
  hintOpen: (id: string) => boolean;
  closeHint: (id: string) => void;
};

const JourneyCtx = createContext<Ctx | null>(null);

// Outside the provider everything quietly does nothing.
const NOOP: Ctx = {
  ready: false, toast: () => {}, later: t => { void t.commit(); }, celebrate: async () => false, win: async () => false,
  has: () => false, hintOpen: () => false, closeHint: () => {},
};

export function useJourney(): Ctx {
  return useContext(JourneyCtx) || NOOP;
}

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [j, setJ] = useState<Journey | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [moment, setMoment] = useState<MomentInput | null>(null);
  const seq = useRef(0);
  const pending = useRef(new Map<number, { commit: () => void | Promise<void>; timer: ReturnType<typeof setTimeout> }>());
  const jRef = useRef<Journey | null>(null);
  jRef.current = j;

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUid(user.id);
      setJ(journeyOf(user));
    });
  }, []);

  const dismiss = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), []);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = ++seq.current;
    setToasts(list => [...list.slice(-2), { ...t, id }]);
    setTimeout(() => dismiss(id), t.ms);
    return id;
  }, [dismiss]);

  const toast = useCallback((t: ToastInput) => { push({ ...t, ms: t.action ? 7000 : 5000 }); }, [push]);

  const later = useCallback((t: LaterInput) => {
    const ms = t.ms ?? 6000;
    let id = 0;
    const timer = setTimeout(() => {
      const p = pending.current.get(id);
      pending.current.delete(id);
      if (p) void p.commit();
    }, ms);
    id = push({ ...t, ms, undo: () => {
      const p = pending.current.get(id);
      if (p) clearTimeout(p.timer);
      pending.current.delete(id);
      dismiss(id);
      t.undo();
    } });
    pending.current.set(id, { commit: t.commit, timer });
  }, [push, dismiss]);

  // Leaving or reloading the page: do what was promised now.
  useEffect(() => {
    const flush = () => {
      pending.current.forEach(p => { clearTimeout(p.timer); void p.commit(); });
      pending.current.clear();
    };
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
  }, []);

  const has = useCallback((m: Milestone) => !!jRef.current?.won.includes(m), []);

  const win = useCallback(async (m: Milestone) => {
    if (!uid) {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) return false;
      const cur = journeyOf(user);
      if (cur.won.includes(m)) return false;
      setUid(user.id);
      setJ(await saveJourney(createClient(), user.id, { won: [m] }));
      return true;
    }
    if (jRef.current?.won.includes(m)) return false;
    setJ(p => (p ? { ...p, won: [...p.won, m] } : { hints: [], won: [m] }));
    void saveJourney(createClient(), uid, { won: [m] }).then(setJ);
    return true;
  }, [uid]);

  const celebrate = useCallback(async (m: Milestone, mo: MomentInput, first = true) => {
    const fresh = await win(m);
    if (fresh && first) { setMoment(mo); return true; }
    return false;
  }, [win]);

  const hintOpen = useCallback((id: string) => !!j && !j.hints.includes(id), [j]);
  const closeHint = useCallback((id: string) => {
    setJ(p => (p ? { ...p, hints: [...p.hints, id] } : p));
    if (uid) void saveJourney(createClient(), uid, { hints: [id] });
  }, [uid]);

  const value: Ctx = { ready: !!j, toast, later, celebrate, win, has, hintOpen, closeHint };

  return (
    <JourneyCtx.Provider value={value}>
      {children}
      <Toasts list={toasts} onClose={dismiss} />
      <Moment moment={moment} onClose={() => setMoment(null)} />
    </JourneyCtx.Provider>
  );
}

// ── Toasts ──────────────────────────────────────────────────────────
function Toasts({ list, onClose }: { list: Toast[]; onClose: (id: number) => void }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
      {list.map(t => (
        <div key={t.id} role="status"
          className="pointer-events-auto relative flex w-full max-w-[420px] items-start gap-3 overflow-hidden rounded-card border-outline border-ink bg-surface p-4 pr-3 shadow-hard-2 animate-toast-in">
          <span aria-hidden className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-pill border-outline border-ink",
            t.tone === "plain" ? "bg-surface text-fg" : "bg-mango text-on-mango")}>
            <Check size={14} strokeWidth={3} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-ui text-body-sm font-semibold text-fg">{t.title}</span>
            {t.body && <span className="font-ui text-body-sm text-fg-2">{t.body}</span>}
            {(t.action || t.undo) && (
              <span className="mt-1.5 flex flex-wrap gap-4">
                {t.undo && (
                  <button type="button" onClick={t.undo} className="font-ui text-label font-semibold text-fg underline underline-offset-4 hover:no-underline">Undo</button>
                )}
                {t.action && (t.action.href
                  ? <Link href={t.action.href} onClick={() => onClose(t.id)} className="font-ui text-label font-semibold text-fg underline underline-offset-4 hover:no-underline">{t.action.label}</Link>
                  : <button type="button" onClick={() => { t.action?.onClick?.(); onClose(t.id); }} className="font-ui text-label font-semibold text-fg underline underline-offset-4 hover:no-underline">{t.action.label}</button>)}
              </span>
            )}
          </div>
          <button type="button" aria-label="Close" onClick={() => onClose(t.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-chip text-fg-3 hover:bg-sunken hover:text-fg">
            <X size={15} aria-hidden />
          </button>
          {t.undo && <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 origin-left bg-mango animate-toast-timer" style={{ animationDuration: `${t.ms}ms` }} />}
        </div>
      ))}
    </div>
  );
}

// ── Moments ─────────────────────────────────────────────────────────
function Moment({ moment, onClose }: { moment: MomentInput | null; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!moment) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moment, onClose]);
  if (!moment) return null;
  const act = (a: ToastAction, variant: "primary" | "secondary") => {
    const cls = variant === "primary"
      ? "inline-flex h-11 items-center justify-center gap-2 rounded-control border-outline border-ink bg-mango px-5 font-ui text-control font-semibold text-on-mango shadow-hard-1 transition hover:-translate-x-px hover:-translate-y-px hover:bg-mango-hover hover:shadow-hard-2"
      : "inline-flex h-11 items-center justify-center gap-2 rounded-control border-outline border-ink bg-surface px-5 font-ui text-control font-semibold text-fg hover:bg-sunken";
    return a.href
      ? <Link href={a.href} onClick={onClose} className={cls}>{a.label}</Link>
      : <button type="button" onClick={() => { a.onClick?.(); onClose(); }} className={cls}>{a.label}</button>;
  };
  return (
    <div className="fixed inset-0 z-modal grid place-items-center p-4">
      <div aria-hidden className="absolute inset-0 bg-scrim animate-fade-in" onClick={onClose} />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={moment.title} tabIndex={-1}
        className="relative flex w-full max-w-[420px] flex-col items-center gap-5 rounded-card border-outline border-ink bg-surface px-6 pb-6 pt-10 text-center shadow-hard-3 outline-none animate-moment-in">
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-chip text-fg-3 hover:bg-sunken hover:text-fg">
          <X size={16} aria-hidden />
        </button>
        <div className="relative grid h-32 w-32 place-items-center">
          <Burst />
          {moment.image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={moment.image} alt="" className="relative h-28 w-28 rounded-card border-outline border-ink bg-sunken object-contain p-1.5 shadow-hard-2 animate-pop" />
            : <span className="relative grid h-20 w-20 place-items-center rounded-pill border-outline border-ink bg-mango text-on-mango shadow-hard-2 animate-pop"><Check size={34} strokeWidth={3} aria-hidden /></span>}
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-h2 leading-tight text-fg">{moment.title}</h2>
          {moment.body && <p className="mx-auto max-w-[34ch] font-ui text-body text-fg-2">{moment.body}</p>}
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row-reverse sm:justify-center">
          {moment.primary ? act(moment.primary, "primary") : <button type="button" onClick={onClose} className="inline-flex h-11 items-center justify-center rounded-control border-outline border-ink bg-mango px-5 font-ui text-control font-semibold text-on-mango shadow-hard-1">Lovely</button>}
          {moment.secondary && act(moment.secondary, "secondary")}
        </div>
      </div>
    </div>
  );
}
