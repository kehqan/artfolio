'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  full_name: string | null
  username: string | null
  role: string | null
  avatar_url: string | null
}

interface StatData {
  artworks: number
  collections: number
  exhibitions: number
  followers: number
}

interface ArtworkItem {
  id: string
  title: string
  status: string | null
  created_at: string
  image_url: string | null
}

interface ClientItem {
  id: string
  name: string
  email: string | null
  status?: string
}

// ─── Sparkline bars ───────────────────────────────────────────────────────────

const BARS: Record<string, number[]> = {
  artworks:    [16, 22, 14, 30, 36, 38],
  collections: [18, 28, 20, 32, 24, 38],
  exhibitions: [38, 30, 20, 28, 16, 22],
  followers:   [8, 8, 8, 8, 8, 8],
}

function Sparkline({ type }: { type: keyof typeof BARS }) {
  const bars = BARS[type]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 38 }}>
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: h,
            borderRadius: 2,
            background: h >= 28 ? '#FFE000' : '#E0D8CA',
            border: h >= 28 ? '1px solid #0D0D0D' : undefined,
            transition: 'height 0.3s',
          }}
        />
      ))}
    </div>
  )
}

// ─── Quick Actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: '＋', label: 'Add Artwork',      href: '/dashboard/artworks',       primary: true },
  { icon: '📁', label: 'New Collection',   href: '/dashboard/collections' },
  { icon: '💬', label: 'Post to Feed',     href: '/dashboard/feed' },
  { icon: '🔍', label: 'Discover Artists', href: '/dashboard/discover' },
  { icon: '🏛',  label: 'New Exhibition',   href: '/dashboard/exhibitions' },
  { icon: '📊', label: 'Record Sale',      href: '/dashboard/sales' },
]

// ─── Status badge colours ─────────────────────────────────────────────────────

function statusBadge(s: string | null) {
  const v = (s || '').toLowerCase()
  if (v === 'available') return { background: '#FFE000', color: '#0D0D0D' }
  if (v === 'sold')      return { background: '#0D0D0D', color: '#FFFFFF' }
  return { background: '#E0D8CA', color: '#5C5346' }
}

// ─── Relative time ────────────────────────────────────────────────────────────

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [profile,    setProfile]    = useState<Profile | null>(null)
  const [stats,      setStats]      = useState<StatData>({ artworks: 0, collections: 0, exhibitions: 0, followers: 0 })
  const [artworks,   setArtworks]   = useState<ArtworkItem[]>([])
  const [clients,    setClients]    = useState<ClientItem[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, full_name, username, role, avatar_url')
        .eq('id', user.id)
        .single()
      setProfile(prof)

      // Stats (parallel)
      const [
        { count: aCount },
        { count: cCount },
        { count: eCount },
        { count: fCount },
      ] = await Promise.all([
        supabase.from('artworks').select('id', { count: 'exact', head: true }).eq('artist_id', user.id),
        supabase.from('collections').select('id', { count: 'exact', head: true }).eq('artist_id', user.id),
        supabase.from('exhibitions').select('id', { count: 'exact', head: true }).eq('artist_id', user.id),
        supabase.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
      ])
      setStats({
        artworks:    aCount ?? 0,
        collections: cCount ?? 0,
        exhibitions: eCount ?? 0,
        followers:   fCount ?? 0,
      })

      // Recent artworks
      const { data: aw } = await supabase
        .from('artworks')
        .select('id, title, status, created_at, image_url')
        .eq('artist_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)
      setArtworks(aw ?? [])

      // Clients
      const { data: cl } = await supabase
        .from('clients')
        .select('id, name, email')
        .eq('artist_id', user.id)
        .limit(6)
      setClients(cl ?? [])

      setLoading(false)
    }
    load()
  }, [])

  const initials = (name: string | null) =>
    name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'

  const displayName = profile?.full_name || profile?.username || 'Artist'

  // ─── Stat cards data ─────────────────────────────────────────────────────────
  const STAT_CARDS = [
    { label: 'Total Artworks', value: stats.artworks,    delta: '+1 this month', neg: false, type: 'artworks'    as const },
    { label: 'Collections',    value: stats.collections, delta: '+0.73%',        neg: false, type: 'collections' as const },
    { label: 'Exhibitions',    value: stats.exhibitions, delta: 'Upcoming',      neg: true,  type: 'exhibitions' as const },
    { label: 'Followers',      value: stats.followers,   delta: 'No change',     neg: false, neutral: true, type: 'followers' as const },
  ]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F5F0E8', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: '#9B8F7A' }}>
      Loading dashboard…
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --yellow:   #FFE000;
          --black:    #0D0D0D;
          --white:    #FFFFFF;
          --cream:    #F5F0E8;
          --gray-100: #F0EBE1;
          --gray-200: #E0D8CA;
          --gray-400: #9B8F7A;
          --gray-600: #5C5346;
          --border:   2px solid #0D0D0D;
          --shadow:   3px 3px 0px #0D0D0D;
          --shadow-lg:5px 5px 0px #0D0D0D;
          --green:    #00C853;
          --red:      #F50057;
        }
        body { font-family: 'Inter', sans-serif; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

        .topbar-btn:hover  { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #0D0D0D !important; }
        .stat-card:hover   { transform: translate(-2px,-2px); box-shadow: var(--shadow-lg) !important; }
        .card-header-link:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 #0D0D0D; }
        .quick-action-item:hover { background: var(--gray-100); }
        .primary-action:hover   { background: #222 !important; }
        .nav-item:hover { background: #1e1e1e; color: #fff; }
      `}</style>

      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, sans-serif', background: '#F5F0E8', color: '#0D0D0D' }}>

        {/* ── SIDEBAR ── */}
        <aside style={{ width: 220, background: '#0D0D0D', color: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: 'var(--border)', overflowY: 'auto' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 16px 14px', borderBottom: '1px solid #2a2a2a' }}>
            <div style={{ width: 32, height: 32, background: '#FFE000', border: 'var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#0D0D0D', flexShrink: 0 }}>A</div>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px', color: '#fff' }}>
              Artfolio<sup style={{ fontSize: 8, verticalAlign: 'super', opacity: 0.5 }}>✦</sup>
            </span>
          </div>

          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 14px', borderBottom: '1px solid #2a2a2a' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FFE000', border: '2px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#0D0D0D', flexShrink: 0 }}>
              {initials(profile?.full_name || null)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{displayName}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{profile?.role || 'Artist'}</div>
            </div>
          </div>

          {/* Nav sections */}
          {[
            { label: 'Overview', items: [{ icon: '▣', text: 'Dashboard', href: '/dashboard', active: true, badge: '3' }] },
            { label: 'Inventory', items: [
              { icon: '🖼', text: 'My Artworks', href: '/dashboard/artworks', badge: String(stats.artworks) },
              { icon: '📁', text: 'Collections', href: '/dashboard/collections' },
            ]},
            { label: 'Presence', items: [
              { icon: '🌐', text: 'My Portfolio', href: '/dashboard/portfolio' },
              { icon: '🏛',  text: 'Exhibitions', href: '/dashboard/exhibitions' },
            ]},
            { label: 'Community', items: [
              { icon: '💬', text: 'Feed', href: '/dashboard/feed' },
              { icon: '🔍', text: 'Discover', href: '/dashboard/discover' },
              { icon: '🤝', text: 'Collaborations', href: '/dashboard/collaborations' },
            ]},
            { label: 'Business', items: [
              { icon: '📊', text: 'Sales Tracking', href: '/dashboard/sales' },
              { icon: '👤', text: 'Clients', href: '/dashboard/clients' },
              { icon: '📈', text: 'Analytics', href: '/dashboard/analytics' },
            ]},
          ].map(section => (
            <div key={section.label}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: '#555', textTransform: 'uppercase', padding: '16px 16px 4px' }}>{section.label}</div>
              <nav style={{ padding: '0 8px' }}>
                {section.items.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="nav-item"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '8px 10px', borderRadius: 6,
                      fontSize: 13, fontWeight: item.active ? 700 : 500,
                      color: item.active ? '#0D0D0D' : '#aaa',
                      cursor: 'pointer', marginBottom: 2,
                      textDecoration: 'none',
                      background: item.active ? '#FFE000' : 'transparent',
                      border: item.active ? '2px solid #0D0D0D' : '2px solid transparent',
                      boxShadow: item.active ? '3px 3px 0px #0D0D0D' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 14, width: 16, textAlign: 'center', opacity: item.active ? 1 : 0.7 }}>{item.icon}</span>
                    {item.text}
                    {item.badge && (
                      <span style={{ marginLeft: 'auto', background: item.active ? '#0D0D0D' : '#2a2a2a', color: item.active ? '#FFE000' : '#aaa', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20 }}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
          ))}

          {/* Sign out */}
          <div
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            style={{ marginTop: 'auto', padding: '14px 16px', borderTop: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#f44', fontWeight: 600 }}
          >
            <span>→</span> Sign Out
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#F5F0E8' }}>

          {/* Topbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderBottom: '2px solid #0D0D0D', background: '#F5F0E8', position: 'sticky', top: 0, zIndex: 10 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px' }}>Dashboard</div>
              <div style={{ fontSize: 13, color: '#9B8F7A', marginTop: 1 }}>Welcome back — here&apos;s what&apos;s happening with your work.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, border: '2px solid #0D0D0D', background: '#fff', boxShadow: '3px 3px 0 #0D0D0D', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer' }}>🔍</div>
              <div style={{ width: 36, height: 36, border: '2px solid #0D0D0D', background: '#fff', boxShadow: '3px 3px 0 #0D0D0D', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer' }}>🔔</div>
              <Link href="/dashboard/artworks" className="topbar-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '2px solid #0D0D0D', fontSize: 13, fontWeight: 700, background: '#FFE000', color: '#0D0D0D', cursor: 'pointer', boxShadow: '3px 3px 0 #0D0D0D', borderRadius: 6, textDecoration: 'none', transition: 'transform 0.1s, box-shadow 0.1s' }}>
                ＋ Add Artwork →
              </Link>
            </div>
          </div>

          <div style={{ padding: '24px 28px' }}>

            {/* ── STAT CARDS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
              {STAT_CARDS.map(s => (
                <div key={s.label} className="stat-card" style={{ background: '#fff', border: '2px solid #0D0D0D', boxShadow: '3px 3px 0 #0D0D0D', borderRadius: 8, padding: '16px 18px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9B8F7A', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px', color: '#0D0D0D' }}>{s.value}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: (s as any).neutral ? '#9B8F7A' : s.neg ? '#F50057' : '#00C853', marginTop: 4 }}>
                      {(s as any).neutral ? '— ' : s.neg ? '↓ ' : '↑ '}{s.delta}
                    </div>
                  </div>
                  <Sparkline type={s.type} />
                </div>
              ))}
            </div>

            {/* ── MAIN GRID ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18 }}>

              {/* LEFT: Recent Artworks Feed */}
              <div>
                <div style={{ background: '#fff', border: '2px solid #0D0D0D', boxShadow: '3px 3px 0 #0D0D0D', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '2px solid #0D0D0D', fontSize: 14, fontWeight: 800 }}>
                    Recent Artworks
                    <Link href="/dashboard/artworks" className="card-header-link" style={{ fontSize: 12, fontWeight: 700, color: '#0D0D0D', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: '2px solid #0D0D0D', borderRadius: 20, background: '#FFE000', boxShadow: '2px 2px 0 #0D0D0D', transition: 'transform 0.1s, box-shadow 0.1s' }}>
                      View all →
                    </Link>
                  </div>

                  {artworks.length === 0 ? (
                    <div style={{ padding: '40px 18px', textAlign: 'center', color: '#9B8F7A', fontSize: 13, fontWeight: 600 }}>
                      No artworks yet.{' '}
                      <Link href="/dashboard/artworks" style={{ color: '#0D0D0D', fontWeight: 800, textDecoration: 'underline' }}>Add your first →</Link>
                    </div>
                  ) : artworks.map(aw => (
                    <div key={aw.id} style={{ padding: '16px 18px', borderBottom: '2px solid #0D0D0D' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FFE000', border: '2px solid #0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#0D0D0D', flexShrink: 0 }}>
                            {initials(displayName)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{displayName}</div>
                            <div style={{ fontSize: 11, color: '#9B8F7A', marginTop: 1 }}>Added {relTime(aw.created_at)}</div>
                          </div>
                        </div>
                        <button style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#9B8F7A' }}>···</button>
                      </div>

                      <div style={{ fontSize: 13, color: '#5C5346', lineHeight: 1.5, marginBottom: 12 }}>{aw.title}</div>

                      {aw.image_url ? (
                        <div style={{ marginBottom: 12 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={aw.image_url}
                            alt={aw.title}
                            style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', border: '2px solid #0D0D0D', borderRadius: 6 }}
                          />
                        </div>
                      ) : (
                        <div style={{ width: '100%', aspectRatio: '3/2', border: '2px solid #0D0D0D', borderRadius: 6, background: '#1a3a5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#fff', fontWeight: 900, marginBottom: 12 }}>?</div>
                      )}

                      <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', padding: '3px 8px', border: '2px solid #0D0D0D', borderRadius: 4, letterSpacing: '0.5px', marginBottom: 10, ...statusBadge(aw.status) }}>
                        {aw.status || 'Draft'}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, fontWeight: 600, color: '#5C5346' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>💬 <span>0</span></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>♡ <span>0</span></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginLeft: 'auto' }}>↗ Share</div>
                      </div>
                    </div>
                  ))}

                  {/* Comment input */}
                  <div style={{ padding: '12px 18px', borderTop: '2px solid #0D0D0D', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FFE000', border: '2px solid #0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#0D0D0D', flexShrink: 0 }}>
                      {initials(displayName)}
                    </div>
                    <input
                      type="text"
                      placeholder="Type to add your comment…"
                      style={{ flex: 1, padding: '8px 12px', border: '2px solid #0D0D0D', borderRadius: 6, fontSize: 13, fontFamily: 'Inter, sans-serif', background: '#F0EBE1', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 18, cursor: 'pointer', opacity: 0.5 }}>😊</span>
                      <span style={{ fontSize: 18, cursor: 'pointer', opacity: 0.5 }}>＋</span>
                      <div style={{ width: 34, height: 34, background: '#FFE000', border: '2px solid #0D0D0D', boxShadow: '3px 3px 0 #0D0D0D', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>→</div>
                    </div>
                  </div>

                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Quick Actions */}
                <div style={{ background: '#fff', border: '2px solid #0D0D0D', boxShadow: '3px 3px 0 #0D0D0D', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '2px solid #0D0D0D', fontSize: 14, fontWeight: 800 }}>Quick Actions</div>
                  <div style={{ padding: '8px 0' }}>
                    {QUICK_ACTIONS.map(a => (
                      <Link
                        key={a.label}
                        href={a.href}
                        className={a.primary ? 'primary-action' : 'quick-action-item'}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: a.primary ? '12px 16px' : '11px 18px',
                          margin: a.primary ? '8px 12px' : undefined,
                          borderBottom: a.primary ? undefined : '1px solid #E0D8CA',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          transition: 'background 0.1s',
                          textDecoration: 'none',
                          color: a.primary ? '#fff' : '#0D0D0D',
                          background: a.primary ? '#0D0D0D' : 'transparent',
                          borderRadius: a.primary ? 6 : undefined,
                          border: a.primary ? '2px solid #0D0D0D' : undefined,
                          boxShadow: a.primary ? '3px 3px 0 #0D0D0D' : undefined,
                        }}
                      >
                        <span><span style={{ fontSize: 14, marginRight: 10, opacity: 0.7 }}>{a.icon}</span>{a.label}</span>
                        <span style={{ fontSize: 14, color: a.primary ? '#FFE000' : '#9B8F7A' }}>→</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Collectors & Clients */}
                <div style={{ background: '#fff', border: '2px solid #0D0D0D', boxShadow: '3px 3px 0 #0D0D0D', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '2px solid #0D0D0D', fontSize: 14, fontWeight: 800 }}>Collectors &amp; Clients</div>
                  <div style={{ padding: '4px 0' }}>
                    {clients.length === 0 ? (
                      <div style={{ padding: '20px 18px', fontSize: 13, color: '#9B8F7A', fontWeight: 600 }}>
                        No clients yet.{' '}
                        <Link href="/dashboard/clients" style={{ color: '#0D0D0D', fontWeight: 800, textDecoration: 'underline' }}>Add one →</Link>
                      </div>
                    ) : clients.map((c, i) => {
                      const statusColors = [
                        { bg: '#CFFDE1', color: '#00874A', label: 'Online' },
                        { bg: '#FFF3CD', color: '#856404', label: 'Away'   },
                        { bg: '#E0D8CA', color: '#5C5346', label: 'Offline'},
                      ]
                      const sc = statusColors[i % 3]
                      return (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid #E0D8CA' }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid #0D0D0D', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: '#F0EBE1' }}>
                            {initials(c.name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: '#9B8F7A' }}>{c.email || '—'}</div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', border: '2px solid #0D0D0D', borderRadius: 20, flexShrink: 0, background: sc.bg, color: sc.color }}>
                            {sc.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 28px', borderTop: '2px solid #0D0D0D', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#9B8F7A', fontWeight: 500 }}>
            <span>Artfolio ✦ Artist Dashboard</span>
            <span>© {new Date().getFullYear()}</span>
          </div>

        </main>
      </div>
    </>
  )
}
