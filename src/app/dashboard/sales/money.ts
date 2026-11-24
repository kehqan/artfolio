// Shared helpers for the Money pages.
export type Sale = {
  id: string; user_id?: string; artwork_id?: string | null; buyer_name?: string | null; buyer_email?: string | null;
  sale_price: number | null; currency?: string | null; commission_percentage?: number | null;
  sale_date?: string | null; status: string; payment_method?: string | null; notes?: string | null;
  created_at?: string; artworks?: { id: string; title: string; images?: string[] | null } | null;
};

export const SALE_STATUSES = ["Completed", "Pending", "Cancelled"] as const;
export const PAYMENT_METHODS = ["Bank transfer", "Cash", "Card", "PayPal", "Stripe", "Crypto", "Cheque", "Other"];
export const CURRENCIES = ["EUR", "USD", "GBP", "CZK", "CHF", "PLN", "SEK", "DKK", "NOK", "CAD", "AUD"];

export const isCompleted = (s: Sale) => (s.status || "").toLowerCase() === "completed";
export const statusKey = (s: string) => (s || "").toLowerCase();

/** The currency most of these rows use, so totals read in one currency. */
export function mainCurrency(rows: { currency?: string | null }[], fallback = "EUR"): string {
  const counts = new Map<string, number>();
  rows.forEach(r => { if (r.currency) counts.set(r.currency.toUpperCase(), (counts.get(r.currency.toUpperCase()) || 0) + 1); });
  let best = fallback, n = 0;
  counts.forEach((v, k) => { if (v > n) { best = k; n = v; } });
  return best;
}

export const net = (s: Sale) => (Number(s.sale_price) || 0) * (1 - (Number(s.commission_percentage) || 0) / 100);

export function fmtDay(d?: string | null) {
  return d ? new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
}
