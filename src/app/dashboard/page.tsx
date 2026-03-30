export default function DashboardPage() {
  return (
    <>
      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">A</div>
            <span className="sidebar-logo-text">
              Artfolio<sup className="logo-sup">✦</sup>
            </span>
          </div>

          <div className="sidebar-user">
            <div className="sidebar-user-avatar">K</div>
            <div>
              <div className="sidebar-user-name">Kazra</div>
              <div className="sidebar-user-role">Artist</div>
            </div>
          </div>

          <div className="sidebar-section-label">Overview</div>
          <nav className="sidebar-nav">
            <a className="nav-item active">▣ Dashboard</a>
          </nav>

          <div className="sidebar-section-label">Inventory</div>
          <nav className="sidebar-nav">
            <a className="nav-item">🖼 My Artworks</a>
            <a className="nav-item">📁 Collections</a>
          </nav>

          <div className="sidebar-section-label">Presence</div>
          <nav className="sidebar-nav">
            <a className="nav-item">🌐 My Portfolio</a>
            <a className="nav-item">🏛 Exhibitions</a>
          </nav>

          <div className="sidebar-section-label">Community</div>
          <nav className="sidebar-nav">
            <a className="nav-item">💬 Feed</a>
            <a className="nav-item">🔍 Discover</a>
            <a className="nav-item">🤝 Collaborations</a>
          </nav>

          <div className="sidebar-section-label">Business</div>
          <nav className="sidebar-nav">
            <a className="nav-item">📊 Sales Tracking</a>
            <a className="nav-item">👤 Clients</a>
            <a className="nav-item">📈 Analytics</a>
          </nav>

          <div className="sidebar-footer">→ Sign Out</div>
        </aside>

        {/* MAIN */}
        <main className="main">
          <div className="topbar">
            <div>
              <div className="topbar-title">Dashboard</div>
              <div className="topbar-subtitle">
                Welcome back — here's what's happening with your work.
              </div>
            </div>

            <div className="topbar-actions">
              <div className="topbar-icon-btn">🔍</div>
              <div className="topbar-icon-btn">🔔</div>
              <button className="topbar-btn primary">＋ Add Artwork →</button>
            </div>
          </div>

          <div className="content">
            {/* STATS */}
            <div className="stats-row">
              <div className="stat-card">
                <div>
                  <div className="stat-label">Total Artworks</div>
                  <div className="stat-value">3</div>
                  <div className="stat-delta">↑ +1 this month</div>
                </div>
              </div>

              <div className="stat-card">
                <div>
                  <div className="stat-label">Collections</div>
                  <div className="stat-value">3</div>
                  <div className="stat-delta">↑ +0.73%</div>
                </div>
              </div>

              <div className="stat-card">
                <div>
                  <div className="stat-label">Exhibitions</div>
                  <div className="stat-value">1</div>
                  <div className="stat-delta neg">↓ Upcoming</div>
                </div>
              </div>

              <div className="stat-card">
                <div>
                  <div className="stat-label">Followers</div>
                  <div className="stat-value">0</div>
                  <div className="stat-delta">— No change</div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* GLOBAL STYLES */}
      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: Inter, sans-serif;
        }

        body {
          background: #f5f0e8;
        }

        .layout {
          display: flex;
          height: 100vh;
        }

        .sidebar {
          width: 220px;
          background: #0d0d0d;
          color: white;
          display: flex;
          flex-direction: column;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 18px 16px;
          border-bottom: 2px solid #2a2a2a;
        }

        .sidebar-logo-icon {
          width: 32px;
          height: 32px;
          background: #ffe000;
          border: 2px solid black;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          color: black;
        }

        .sidebar-user {
          display: flex;
          gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid #2a2a2a;
        }

        .sidebar-user-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #ffe000;
          display: flex;
          align-items: center;
          justify-content: center;
          color: black;
          font-weight: 700;
        }

        .sidebar-section-label {
          font-size: 10px;
          color: #666;
          padding: 16px;
          text-transform: uppercase;
        }

        .nav-item {
          display: block;
          padding: 8px 16px;
          color: #aaa;
          cursor: pointer;
        }

        .nav-item:hover {
          background: #1e1e1e;
          color: white;
        }

        .nav-item.active {
          background: #ffe000;
          color: black;
          font-weight: 700;
        }

        .sidebar-footer {
          margin-top: auto;
          padding: 14px 16px;
          color: #ff6666;
          cursor: pointer;
        }

        .main {
          flex: 1;
          overflow-y: auto;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          padding: 16px 28px;
          border-bottom: 2px solid black;
          background: #f5f0e8;
        }

        .topbar-title {
          font-size: 22px;
          font-weight: 900;
        }

        .topbar-subtitle {
          font-size: 13px;
          color: #888;
        }

        .topbar-actions {
          display: flex;
          gap: 10px;
        }

        .topbar-btn {
          padding: 8px 14px;
          border: 2px solid black;
          background: white;
          font-weight: 700;
          cursor: pointer;
        }

        .topbar-btn.primary {
          background: #ffe000;
        }

        .topbar-icon-btn {
          width: 36px;
          height: 36px;
          border: 2px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        }

        .content {
          padding: 24px 28px;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .stat-card {
          background: white;
          border: 2px solid black;
          padding: 16px;
        }

        .stat-label {
          font-size: 11px;
          color: #777;
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 900;
        }

        .stat-delta {
          font-size: 12px;
          color: green;
        }

        .stat-delta.neg {
          color: red;
        }
      `}</style>
    </>
  );
}
