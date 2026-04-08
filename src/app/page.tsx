"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTicker(t => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  const features = [
    { id: "studio",   emoji: "🎨", label: "Studio",   title: "Every artwork.\nAlways tracked.", desc: "Inventory, images, location, price, status — one place, zero spreadsheets.", tag: "Art Inventory" },
    { id: "portfolio",emoji: "🌐", label: "Portfolio", title: "Your gallery,\nlive on the web.", desc: "A public portfolio page at artomango.com/you. Send it anywhere. No design needed.", tag: "Public Profile" },
    { id: "scene",    emoji: "🗺️", label: "Scene",     title: "Prague art scene,\non one map.", desc: "Events, collabs, venues — discover and connect with the local art world.", tag: "Art Scene Map" },
    { id: "collabs",  emoji: "🤝", label: "Collabs",   title: "Post. Match.\nCreate.", desc: "Artists find wall space. Venues find art. The Discovery Pool connects both sides.", tag: "Collaboration" },
    { id: "business", emoji: "📊", label: "Business",  title: "Know your numbers.\nGrow what matters.", desc: "Sales, commissions, collectors, analytics — your art is also your business.", tag: "Sales & CRM" },
    { id: "planner",  emoji: "📅", label: "Planner",   title: "Plan shows.\nManage everything.", desc: "Exhibitions, tasks, calendar — organized so you can focus on making work.", tag: "Planner" },
  ];

  const tickerWords = ["Manage.", "Exhibit.", "Collab.", "Grow.", "Discover.", "Connect.", "Create.", "Manage.", "Exhibit.", "Collab."];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@300;400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html { scroll-behavior: smooth; }

        body {
          font-family: 'Darker Grotesque', system-ui, sans-serif;
          background: #FFFBEA;
          color: #111110;
          overflow-x: hidden;
        }

        /* ── NAVBAR ── */
        .nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          padding: 12px 20px;
          transition: padding 0.2s;
        }
        .nav.scrolled { padding: 8px 20px; }

        .nav-pill {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 4px;
          background: #fff;
          border: 2.5px solid #111110;
          border-radius: 9999px;
          padding: 5px 6px 5px 10px;
          box-shadow: 4px 4px 0 #111110;
          transition: box-shadow 0.15s;
        }
        .nav-pill:hover { box-shadow: 6px 6px 0 #111110; }

        .nav-logo {
          font-size: 22px;
          line-height: 1;
          text-decoration: none;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .nav-logo-text {
          font-size: 16px;
          font-weight: 900;
          color: #111110;
          letter-spacing: -0.3px;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 0;
          flex: 1;
          justify-content: center;
        }
        .nav-link {
          padding: 7px 14px;
          font-size: 14px;
          font-weight: 700;
          color: #111110;
          text-decoration: none;
          border-radius: 9999px;
          transition: background 0.1s;
          white-space: nowrap;
        }
        .nav-link:hover { background: #F5F0E8; }

        .nav-divider {
          width: 1px; height: 22px;
          background: #E0D8CA;
          flex-shrink: 0;
          margin: 0 4px;
        }

        .nav-cta {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn-ghost-sm {
          padding: 7px 14px;
          font-size: 13px;
          font-weight: 700;
          color: #111110;
          text-decoration: none;
          border-radius: 9999px;
          border: 2px solid transparent;
          transition: background 0.1s, border-color 0.1s;
          font-family: inherit;
          background: none;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn-ghost-sm:hover { background: #F5F0E8; border-color: #E0D8CA; }
        .btn-primary-sm {
          padding: 7px 18px;
          font-size: 13px;
          font-weight: 800;
          color: #111110;
          background: #FFD400;
          border-radius: 9999px;
          border: 2px solid #111110;
          text-decoration: none;
          white-space: nowrap;
          transition: box-shadow 0.1s;
          cursor: pointer;
          font-family: inherit;
        }
        .btn-primary-sm:hover { box-shadow: 2px 2px 0 #111110; }

        /* ── HERO ── */
        .hero {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 3px solid #111110;
          padding-top: 80px;
        }

        .hero-left {
          padding: 80px 60px 80px 40px;
          border-right: 3px solid #111110;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          background: #FFD400;
        }

        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #111110;
          color: #FFD400;
          padding: 4px 12px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 28px;
          width: fit-content;
        }

        .hero-title {
          font-size: clamp(52px, 7vw, 88px);
          font-weight: 900;
          letter-spacing: -3px;
          line-height: 0.92;
          color: #111110;
          margin-bottom: 28px;
        }

        .hero-title .invert {
          display: inline-block;
          background: #111110;
          color: #FFD400;
          padding: 2px 12px 6px;
          line-height: 1;
        }

        .hero-sub {
          font-size: 18px;
          font-weight: 600;
          color: #111110;
          line-height: 1.5;
          max-width: 380px;
          margin-bottom: 40px;
          opacity: 0.75;
        }

        .hero-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn-hero-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: #111110;
          color: #FFD400;
          font-family: inherit;
          font-size: 15px;
          font-weight: 800;
          border: 2.5px solid #111110;
          text-decoration: none;
          cursor: pointer;
          transition: box-shadow 0.1s, transform 0.1s;
          box-shadow: 4px 4px 0 rgba(0,0,0,0.25);
        }
        .btn-hero-primary:hover {
          box-shadow: 6px 6px 0 rgba(0,0,0,0.3);
          transform: translate(-1px, -1px);
        }

        .btn-hero-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          background: transparent;
          color: #111110;
          font-family: inherit;
          font-size: 15px;
          font-weight: 800;
          border: 2.5px solid #111110;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.1s;
        }
        .btn-hero-secondary:hover { background: rgba(0,0,0,0.06); }

        .hero-right {
          background: #111110;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 40px;
          position: relative;
          overflow: hidden;
        }

        .hero-mango {
          font-size: 140px;
          line-height: 1;
          display: block;
          animation: floatMango 3s ease-in-out infinite;
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.5));
          margin-bottom: 32px;
        }

        @keyframes floatMango {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-16px) rotate(3deg); }
        }

        .hero-stats {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0;
          border: 2px solid #333;
          width: 100%;
          max-width: 340px;
        }

        .hero-stat {
          padding: 16px 12px;
          text-align: center;
          border-right: 1px solid #333;
        }
        .hero-stat:last-child { border-right: none; }
        .hero-stat-num {
          font-size: 28px;
          font-weight: 900;
          color: #FFD400;
          letter-spacing: -1px;
          display: block;
        }
        .hero-stat-label {
          font-size: 10px;
          font-weight: 700;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        /* ── TICKER ── */
        .ticker-wrap {
          background: #FFD400;
          border-top: 3px solid #111110;
          border-bottom: 3px solid #111110;
          padding: 14px 0;
          overflow: hidden;
          white-space: nowrap;
        }
        .ticker-track {
          display: inline-flex;
          gap: 48px;
          animation: ticker 20s linear infinite;
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ticker-item {
          font-size: 15px;
          font-weight: 800;
          color: #111110;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .ticker-dot {
          width: 6px;
          height: 6px;
          background: #111110;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* ── FEATURES ── */
        .features {
          display: grid;
          grid-template-columns: 280px 1fr;
          border-bottom: 3px solid #111110;
          min-height: 560px;
        }

        .features-nav {
          border-right: 3px solid #111110;
          background: #FFFBEA;
        }
        .features-nav-header {
          padding: 28px 24px 16px;
          border-bottom: 1px solid #E0D8CA;
        }
        .features-nav-label {
          font-size: 10px;
          font-weight: 800;
          color: #9B8F7A;
          text-transform: uppercase;
          letter-spacing: 0.2em;
        }
        .features-nav-title {
          font-size: 20px;
          font-weight: 900;
          color: #111110;
          letter-spacing: -0.5px;
          margin-top: 4px;
        }

        .feature-tab {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          cursor: pointer;
          border-bottom: 1px solid #E0D8CA;
          transition: background 0.1s;
          background: transparent;
          border-left: 3px solid transparent;
          width: 100%;
          text-align: left;
          font-family: inherit;
        }
        .feature-tab:hover { background: #F5F0E8; }
        .feature-tab.active {
          background: #FFD400;
          border-left-color: #111110;
          border-bottom-color: #111110;
        }
        .feature-tab-emoji { font-size: 20px; line-height: 1; }
        .feature-tab-label {
          font-size: 14px;
          font-weight: 800;
          color: #111110;
        }
        .feature-tab-tag {
          font-size: 10px;
          font-weight: 600;
          color: #9B8F7A;
          margin-top: 1px;
        }
        .feature-tab.active .feature-tab-tag { color: #5C5346; }

        .features-content {
          padding: 56px 60px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #FFFBEA;
          position: relative;
        }

        .feature-num {
          font-size: 120px;
          font-weight: 900;
          color: #F5F0E8;
          position: absolute;
          top: 20px;
          right: 32px;
          line-height: 1;
          letter-spacing: -4px;
          pointer-events: none;
          user-select: none;
        }

        .feature-emoji-large {
          font-size: 56px;
          line-height: 1;
          margin-bottom: 20px;
          display: block;
        }

        .feature-title {
          font-size: clamp(32px, 4vw, 48px);
          font-weight: 900;
          color: #111110;
          letter-spacing: -1.5px;
          line-height: 1;
          white-space: pre-line;
          margin-bottom: 20px;
        }

        .feature-desc {
          font-size: 16px;
          font-weight: 500;
          color: #5C5346;
          line-height: 1.7;
          max-width: 480px;
          margin-bottom: 28px;
        }

        .feature-badge {
          display: inline-flex;
          align-items: center;
          background: #111110;
          color: #FFD400;
          padding: 5px 14px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        /* ── HOW IT WORKS ── */
        .how {
          background: #111110;
          padding: 80px 40px;
          border-bottom: 3px solid #111110;
        }

        .how-inner {
          max-width: 1100px;
          margin: 0 auto;
        }

        .how-header {
          margin-bottom: 56px;
        }

        .section-eyebrow {
          display: inline-block;
          background: #FFD400;
          color: #111110;
          padding: 3px 12px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .section-eyebrow.light {
          background: #1a1a1a;
          color: #FFD400;
          border: 1px solid #333;
        }

        .section-title {
          font-size: clamp(32px, 4vw, 52px);
          font-weight: 900;
          letter-spacing: -2px;
          line-height: 1.05;
        }
        .section-title.light { color: #fff; }
        .section-title.dark { color: #111110; }

        .steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
          border: 2px solid #333;
        }

        .step {
          padding: 40px 32px;
          border-right: 1px solid #333;
          position: relative;
        }
        .step:last-child { border-right: none; }

        .step-num {
          font-size: 11px;
          font-weight: 800;
          color: #FFD400;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .step-num::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #333;
        }

        .step-emoji { font-size: 36px; line-height: 1; margin-bottom: 16px; display: block; }

        .step-title {
          font-size: 22px;
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.5px;
          margin-bottom: 12px;
        }

        .step-desc {
          font-size: 14px;
          font-weight: 500;
          color: #666;
          line-height: 1.7;
        }

        /* ── CTA BAND ── */
        .cta-band {
          background: #FFD400;
          border-bottom: 3px solid #111110;
          padding: 80px 40px;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 40px;
          max-width: 100%;
        }

        .cta-inner { max-width: 1100px; margin: 0 auto; width: 100%; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 40px; }

        .cta-title {
          font-size: clamp(36px, 5vw, 64px);
          font-weight: 900;
          color: #111110;
          letter-spacing: -2px;
          line-height: 1;
        }

        .cta-title .strikethrough {
          position: relative;
          display: inline-block;
        }
        .cta-title .strikethrough::after {
          content: '';
          position: absolute;
          left: 0; right: 0;
          top: 50%;
          height: 4px;
          background: #111110;
          transform: rotate(-2deg);
        }

        .btn-hero-dark {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 18px 36px;
          background: #111110;
          color: #FFD400;
          font-family: inherit;
          font-size: 16px;
          font-weight: 800;
          border: none;
          text-decoration: none;
          cursor: pointer;
          transition: box-shadow 0.1s, transform 0.1s;
          box-shadow: 6px 6px 0 rgba(0,0,0,0.3);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .btn-hero-dark:hover {
          box-shadow: 8px 8px 0 rgba(0,0,0,0.3);
          transform: translate(-1px, -1px);
        }

        /* ── SOCIAL PROOF ── */
        .proof {
          background: #FFFBEA;
          padding: 80px 40px;
          border-bottom: 3px solid #111110;
        }
        .proof-inner { max-width: 1100px; margin: 0 auto; }
        .proof-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
          border: 2.5px solid #111110;
          box-shadow: 6px 6px 0 #111110;
          margin-top: 48px;
        }
        .proof-card {
          padding: 36px 32px;
          border-right: 2px solid #111110;
          position: relative;
        }
        .proof-card:last-child { border-right: none; }
        .proof-card::before {
          content: '"';
          position: absolute;
          top: 16px;
          left: 24px;
          font-size: 72px;
          font-weight: 900;
          color: #FFD400;
          line-height: 1;
          opacity: 0.5;
        }
        .proof-quote {
          font-size: 16px;
          font-weight: 600;
          color: #111110;
          line-height: 1.6;
          margin-top: 40px;
          margin-bottom: 24px;
        }
        .proof-author {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .proof-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #FFD400;
          border: 2px solid #111110;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 900;
          color: #111110;
          flex-shrink: 0;
        }
        .proof-name {
          font-size: 13px;
          font-weight: 800;
          color: #111110;
        }
        .proof-role {
          font-size: 11px;
          font-weight: 600;
          color: #9B8F7A;
        }

        /* ── FOOTER ── */
        .footer {
          background: #111110;
          padding: 48px 40px 28px;
        }
        .footer-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .footer-top {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 40px;
          padding-bottom: 40px;
          border-bottom: 1px solid #222;
          margin-bottom: 28px;
        }
        .footer-brand {
          grid-column: span 1;
        }
        .footer-logo {
          font-size: 32px;
          display: block;
          margin-bottom: 8px;
        }
        .footer-brand-name {
          font-size: 18px;
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.3px;
          display: block;
          margin-bottom: 8px;
        }
        .footer-tagline {
          font-size: 12px;
          font-weight: 600;
          color: #555;
          line-height: 1.5;
        }
        .footer-col-title {
          font-size: 10px;
          font-weight: 800;
          color: #FFD400;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 16px;
        }
        .footer-link {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #555;
          text-decoration: none;
          margin-bottom: 10px;
          transition: color 0.1s;
        }
        .footer-link:hover { color: #fff; }
        .footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .footer-copy {
          font-size: 11px;
          font-weight: 600;
          color: #333;
        }

        /* ── MOBILE ── */
        .mobile-menu {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          flex-direction: column;
        }
        .mobile-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(2px);
        }
        .mobile-panel {
          position: relative;
          background: #FFFBEA;
          border-bottom: 3px solid #111110;
          padding: 20px;
          z-index: 1;
          max-height: 85vh;
          overflow-y: auto;
          margin-top: 72px;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-in { animation: fadeInUp 0.5s ease forwards; }
        .delay-1 { animation-delay: 0.1s; opacity: 0; }
        .delay-2 { animation-delay: 0.2s; opacity: 0; }
        .delay-3 { animation-delay: 0.3s; opacity: 0; }
        .delay-4 { animation-delay: 0.4s; opacity: 0; }

        @media (max-width: 900px) {
          .hero { grid-template-columns: 1fr; }
          .hero-right { min-height: 300px; padding: 40px 24px; }
          .hero-mango { font-size: 80px; }
          .hero-left { padding: 60px 24px; border-right: none; border-bottom: 3px solid #111110; }
          .features { grid-template-columns: 1fr; }
          .features-nav { border-right: none; border-bottom: 3px solid #111110; }
          .features-content { padding: 40px 24px; }
          .steps { grid-template-columns: 1fr; }
          .step { border-right: none; border-bottom: 1px solid #333; }
          .proof-grid { grid-template-columns: 1fr; }
          .proof-card { border-right: none; border-bottom: 2px solid #111110; }
          .cta-inner { grid-template-columns: 1fr; gap: 24px; }
          .footer-top { grid-template-columns: 1fr 1fr; gap: 28px; }
          .nav-links { display: none; }
        }

        @media (max-width: 600px) {
          .footer-top { grid-template-columns: 1fr; }
          .hero-stats { grid-template-columns: 1fr 1fr 1fr; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-pill">
          <a href="/" className="nav-logo">
            🥭
            <span className="nav-logo-text">artomango</span>
          </a>
          <div className="nav-divider" />
          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how" className="nav-link">How it works</a>
            <a href="/directory/artists" className="nav-link">Artists</a>
            <a href="/directory/venues" className="nav-link">Venues</a>
          </div>
          <div className="nav-cta" style={{ marginLeft: "auto" }}>
            <a href="/login" className="btn-ghost-sm">Sign in</a>
            <a href="/register" className="btn-primary-sm">Get started →</a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-eyebrow animate-in">
            🥭 artomango · art platform
          </div>

          <h1 className="hero-title animate-in delay-1">
            Your art.<br />
            <span className="invert">Managed.</span><br />
            Exhibited.
          </h1>

          <p className="hero-sub animate-in delay-2">
            The platform for artists and venues to manage work, discover collaborations, and grow in the art scene.
          </p>

          <div className="hero-actions animate-in delay-3">
            <a href="/register" className="btn-hero-primary">
              Start for free →
            </a>
            <a href="#features" className="btn-hero-secondary">
              See features
            </a>
          </div>

          <div style={{ position: "absolute", bottom: 24, left: 40, display: "flex", alignItems: "center", gap: 8, opacity: 0.5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#111110" }}>
              Manage, Exhibit, Collab
            </span>
          </div>
        </div>

        <div className="hero-right">
          <span className="hero-mango animate-in delay-2">🥭</span>

          <div className="hero-stats animate-in delay-3">
            <div className="hero-stat">
              <span className="hero-stat-num">47</span>
              <span className="hero-stat-label">Works</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">12</span>
              <span className="hero-stat-label">Shows</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">$18k</span>
              <span className="hero-stat-label">Revenue</span>
            </div>
          </div>

          {/* Floating cards */}
          <div style={{
            position: "absolute", top: 120, left: 32,
            background: "#FFD400", border: "2px solid #111110",
            padding: "8px 14px", boxShadow: "3px 3px 0 #FFD400",
            animation: "floatMango 4s ease-in-out infinite",
            animationDelay: "0.5s"
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#111110" }}>New collab request</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#111110", marginTop: 2 }}>Galerie Nord · Prague</div>
          </div>

          <div style={{
            position: "absolute", bottom: 140, right: 28,
            background: "#fff", border: "2px solid #333",
            padding: "8px 14px", boxShadow: "3px 3px 0 #333",
            animation: "floatMango 3.5s ease-in-out infinite",
            animationDelay: "1s"
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9B8F7A" }}>Artwork sold</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#111110", marginTop: 2 }}>$2,400 ✓</div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {[...Array(2)].map((_, i) =>
            ["Manage your artworks", "Exhibit anywhere", "Collab with venues", "Track every sale", "Map the art scene", "Build your portfolio", "Grow your practice"].map((word, j) => (
              <span key={`${i}-${j}`} className="ticker-item">
                {word} <span className="ticker-dot" />
              </span>
            ))
          )}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features">
        <div className="features">
          <div className="features-nav">
            <div className="features-nav-header">
              <div className="features-nav-label">What you get</div>
              <div className="features-nav-title">Everything<br />you need</div>
            </div>
            {features.map((f, i) => (
              <button
                key={f.id}
                className={`feature-tab${activeFeature === i ? " active" : ""}`}
                onClick={() => setActiveFeature(i)}
              >
                <span className="feature-tab-emoji">{f.emoji}</span>
                <div>
                  <div className="feature-tab-label">{f.label}</div>
                  <div className="feature-tab-tag">{f.tag}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="features-content">
            <div className="feature-num">0{activeFeature + 1}</div>
            <span className="feature-emoji-large">{features[activeFeature].emoji}</span>
            <h2 className="feature-title">{features[activeFeature].title}</h2>
            <p className="feature-desc">{features[activeFeature].desc}</p>
            <span className="feature-badge">{features[activeFeature].tag} →</span>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="how">
        <div className="how-inner">
          <div className="how-header">
            <div className="section-eyebrow light">How it works</div>
            <h2 className="section-title light">Three steps to<br />your art business.</h2>
          </div>
          <div className="steps">
            {[
              { n: "01", emoji: "🎨", title: "Add your work", desc: "Upload artworks with photos, details, prices, and location. Build your complete inventory in minutes." },
              { n: "02", emoji: "🌐", title: "Go public", desc: "Your portfolio page goes live instantly. Share it with galleries, collectors, and curators — or let them find you." },
              { n: "03", emoji: "🤝", title: "Grow & collaborate", desc: "Find exhibitions, connect with venues, track sales, and manage every collaboration from first contact to final show." },
            ].map((step) => (
              <div key={step.n} className="step">
                <div className="step-num">{step.n}</div>
                <span className="step-emoji">{step.emoji}</span>
                <div className="step-title">{step.title}</div>
                <div className="step-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <div className="cta-band">
        <div className="cta-inner">
          <div>
            <h2 className="cta-title">
              Stop managing art<br />
              in <span className="strikethrough">spreadsheets.</span>
            </h2>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#5C5346", marginTop: 16 }}>
              Join artists and venues already using Artomango.
            </p>
          </div>
          <a href="/register" className="btn-hero-dark">
            🥭 Get started free →
          </a>
        </div>
      </div>

      {/* ── SOCIAL PROOF ── */}
      <section className="proof">
        <div className="proof-inner">
          <div className="section-eyebrow">What they say</div>
          <h2 className="section-title dark" style={{ marginBottom: 0 }}>Artists love it.</h2>
          <div className="proof-grid">
            {[
              { quote: "Finally — a platform that gets how artists actually work. Not just a portfolio, a full business tool.", name: "Neda R.", role: "Oil painter · Prague", avatar: "N" },
              { quote: "The collab pool alone was worth it. I found three venue partners in my first month on Artomango.", name: "Arman K.", role: "Photographer · Brno", avatar: "A" },
              { quote: "I used to track everything in a notes app. Now I actually know where every piece is and what it's worth.", name: "Leila S.", role: "Mixed media artist · Berlin", avatar: "L" },
            ].map((t, i) => (
              <div key={i} className="proof-card">
                <div className="proof-quote">{t.quote}</div>
                <div className="proof-author">
                  <div className="proof-avatar">{t.avatar}</div>
                  <div>
                    <div className="proof-name">{t.name}</div>
                    <div className="proof-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <span className="footer-logo">🥭</span>
              <span className="footer-brand-name">artomango</span>
              <span className="footer-tagline">Manage, Exhibit, Collab.<br />The platform for artists and venues.</span>
            </div>
            <div>
              <div className="footer-col-title">Platform</div>
              <a href="/dashboard" className="footer-link">Dashboard</a>
              <a href="/dashboard/artworks" className="footer-link">Artworks</a>
              <a href="/dashboard/exhibitions" className="footer-link">Events</a>
              <a href="/dashboard/map" className="footer-link">Map</a>
              <a href="/dashboard/pool" className="footer-link">Collabs</a>
            </div>
            <div>
              <div className="footer-col-title">Explore</div>
              <a href="/directory/artists" className="footer-link">Artists</a>
              <a href="/directory/venues" className="footer-link">Venues</a>
              <a href="/dashboard/analytics" className="footer-link">Analytics</a>
              <a href="/dashboard/sales" className="footer-link">Sales</a>
            </div>
            <div>
              <div className="footer-col-title">Account</div>
              <a href="/login" className="footer-link">Sign in</a>
              <a href="/register" className="footer-link">Get started</a>
              <a href="/dashboard/profile" className="footer-link">Profile</a>
              <a href="/admin" className="footer-link">Admin</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="footer-copy">🥭 artomango · © 2026 · Manage, Exhibit, Collab</span>
            <div style={{ display: "flex", gap: 20 }}>
              <a href="#" className="footer-link" style={{ marginBottom: 0, fontSize: 11 }}>Privacy</a>
              <a href="#" className="footer-link" style={{ marginBottom: 0, fontSize: 11 }}>Support</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
