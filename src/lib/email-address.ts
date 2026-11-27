// Emails as people type them: "Jana.Novak@Gmail.com " from an iPhone keyboard
// (capital first letter, a space after autocomplete). Mail servers treat the
// part before @ as case-insensitive in practice, and so do we.
export const normEmail = (s: string) => s.trim().toLowerCase();
