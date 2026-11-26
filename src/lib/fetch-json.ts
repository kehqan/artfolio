/**
 * GET a JSON address from the browser without asking twice.
 *
 * - Calls for the same address that arrive while one is on its way share it
 *   (the shell, Home and Messages all ask for /api/conversations on load).
 * - An answer is reused for `ttl` ms (default 5 s).
 * - A request that takes longer than `timeoutMs` (default 10 s) is given up,
 *   so a slow server never leaves a screen waiting forever.
 *
 * Call `forget(url)` after changing what the address returns.
 */
const cache = new Map<string, { at: number; p: Promise<any> }>();

export function fetchJson<T = any>(url: string, opts: { ttl?: number; timeoutMs?: number } = {}): Promise<T> {
  const { ttl = 5000, timeoutMs = 10_000 } = opts;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttl) return hit.p;
  const p = fetch(url, { signal: timeoutSignal(timeoutMs) }).then(async res => {
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  });
  cache.set(url, { at: Date.now(), p });
  p.catch(() => cache.delete(url));
  return p;
}

export function forget(url: string) {
  cache.delete(url);
}

/** An AbortSignal that fires after `ms`. */
export function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) return AbortSignal.timeout(ms);
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}
