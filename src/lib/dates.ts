// Dates that mean a day ("2027-03-25"), not a moment.
//
// `new Date("2027-03-25")` is midnight in London. For anyone west of London
// (an artist in New York, a collector in Toronto) that is still the 24th, so
// a show would appear to open a day early. And `new Date().toISOString()`
// gives London's date, so just after midnight in Prague "today" was still
// yesterday. These helpers keep a day a day, wherever the person is.

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date where the person is, as "YYYY-MM-DD". */
export function localDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A Date for showing a stored value. A plain day becomes noon that day, so it never slips. */
export function asDate(s: string): Date {
  return new Date(DAY.test(s) ? `${s}T12:00:00` : s);
}

/** Format a stored day or moment, e.g. fmtDay("2027-03-25", { day: "numeric", month: "short" }). */
export function fmtDay(s: string, opts: Intl.DateTimeFormatOptions, locale = "en-GB"): string {
  return asDate(s).toLocaleDateString(locale, opts);
}
