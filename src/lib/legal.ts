// Who runs Artomango, shown on the privacy, terms and report pages.
// EU and Czech law want a website and its emails to say who is behind them.
// Fill these in before launch (the same details go in email_config, see
// database/migrations/20261126_legal.sql).
export const OPERATOR = {
  /** Legal name: your own name as a sole trader, or the company, e.g. "Artomango s.r.o." */
  name: "[Legal name of the operator]",
  /** IČO (company ID number). */
  companyId: "[IČO]",
  /** Registered address. */
  address: "[Street and number, postcode Praha, Czechia]",
  /** Where people write about privacy, reports and anything legal. */
  email: "hello@artomango.com",
};

/** Bump when the terms or privacy policy change in a way people must agree to again. */
export const TERMS_VERSION = "2026-11-26";
export const LAST_UPDATED = "26 November 2026";

/** Minimum age for an account. Artists sign agreements and sell, so adults only. */
export const MIN_AGE = 18;
