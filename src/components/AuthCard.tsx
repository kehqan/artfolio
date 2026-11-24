// Small centred card shared by the password reset pages.
export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFBEA", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Darker Grotesque', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@500;600;700;800;900&display=swap');`}</style>
      <div style={{ background: "#fff", border: "2.5px solid #111110", borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: 400 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111110", margin: "0 0 6px", letterSpacing: "-0.5px" }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 14, fontWeight: 600, color: "#9B8F7A", margin: "0 0 20px", lineHeight: 1.5 }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export const authInput: React.CSSProperties = { width: "100%", padding: "11px 14px", border: "2px solid #E8E0D0", borderRadius: 12, fontSize: 15, fontFamily: "inherit", fontWeight: 600, color: "#111110", background: "#fff", outline: "none", marginBottom: 12, boxSizing: "border-box" };
export const authButton: React.CSSProperties = { width: "100%", padding: 13, border: "2.5px solid #111110", borderRadius: 12, background: "#FFD400", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110" };
export const authError: React.CSSProperties = { fontSize: 13, color: "#B91C1C", fontWeight: 700, marginBottom: 12 };
export const authLink: React.CSSProperties = { display: "block", textAlign: "center", marginTop: 16, fontSize: 13, color: "#9B8F7A", fontWeight: 700, textDecoration: "none" };
