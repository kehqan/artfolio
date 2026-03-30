'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

// ── Types ──────────────────────────────────────────────────────────────────
interface StatCard {
  label: string
  value: string | number
  delta: string
  positive: boolean
  bars: number[]
}

interface ArtworkItem {
  id: string
  title: string
  medium: string | null
  price: number | null
  status: string | null
  image_url: string | null
  created_at: string
}

interface ClientItem {
  id: string
  name: string
  email: string | null
  status: 'online' | 'away' | 'offline'
  initials: string
  color: string
}

// ── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

const CLIENT_COLORS = ['#d1fae5', '#fef3c7', '#ffe4e6', '#e0f2fe', '#f3e8ff', '#dcfce7']
const CLIENT_STATUSES: ('online' | 'away' | 'offline')[] = ['online', 'away', 'offline', 'online', 'away', 'online']

// ── Sparkline bars (static decorative) ────────────────────────────────────
const SPARKLINES: Record<string, { heights: number[]; highlights: number[] }> = {
  artworks:    { heights: [16, 22, 14, 30, 36, 38], highlights: [3, 4, 5] },
  collections: { heights: [18, 28, 20, 32, 24, 38], highlights: [1, 3, 5] },
  exhibitions: { heights: [38, 30, 20, 28, 16, 22], highlights: [0, 3, 5] },
  followers:   { heights: [8,  8,  8,  8,  8,  8],  highlights: [5]       },
}

// ── Component ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  const [profile, setProfile]       = useState<{ full_name: string; username: string } | null>(null)
  const [artworks, setArtworks]     = useState<ArtworkItem[]>([])
  const [stats, setStats]           = useState({ artworks: 0, collections: 0, exhibitions: 0, followers: 0 })
  const [clients, setClients]       = useState<ClientItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [commentText, setCommentText] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [profRes, artRes, colRes, exhRes, folRes, cliRes] = await Promise.all([
        supabase.from('profiles').select('full_name, username').eq('id', user.id).single(),
        supabase.from('artworks').select('id, title, medium, price, status, image_url, created_at').eq('artist_id', user.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('collections').select('id', { count: 'exact', head: true }).eq('artist_id', user.id),
        supabase.from('exhibitions').select('id', { count: 'exact', head: true }).eq('artist_id', user.id),
        supabase.from('followers').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('clients').select('id, name, email').eq('artist_id', user.id).limit(6),
      ])

      if (profRes.data) setProfile(profRes.data)

      const rawArtworks = (artRes.data ?? []) as ArtworkItem[]
      setArtworks(rawArtworks)

      setStats({
        artworks:    rawArtworks.length,
        collections: colRes.count ?? 0,
        exhibitions: exhRes.count ?? 0,
        followers:   folRes.count ?? 0,
      })

      const rawClients = (cliRes.data ?? []) as { id: string; name: string; email: string | null }[]
      setClients(
        rawClients.map((c, i) => ({
          ...c,
          initials: initials(c.name),
          color: CLIENT_COLORS[i % CLIENT_COLORS.length],
          status: CLIENT_STATUSES[i % CLIENT_STATUSES.length],
        }))
      )

      setLoading(false)
    }
    load()
  }, [supabase])

  const displayName = profile?.full_name ?? 'Artist'
  const userInitial = displayName[0]?.toUpperCase() ?? 'A'

  const statCards: StatCard[] = [
    { label: 'Total Artworks',  value: stats.artworks,    delta: '+1 this month',  positive: true,  bars: SPARKLINES.artworks.heights    },
    { label: 'Collections',     value: stats.collections, delta: '+0 this month',  positive: true,  bars: SPARKLINES.collections.heights },
    { label: 'Exhibitions',     value: stats.exhibitions, delta: 'Upcoming',       positive: false, bars: SPARKLINES.exhibitions.heights },
    { label: 'Followers',       value: stats.followers,   delta: 'No change',      positive: true,  bars: SPARKLINES.followers.heights   },
  ]

  const sparkHighlights: number[][] = [
    SPARKLINES.artworks.highlights,
    SPARKLINES.collections.highlights,
    SPARKLINES.exhibitions.highlights,
    SPARKLINES.followers.highlights,
  ]

  return (
    <>
      {/* ── Global styles injected as a style tag ── */}
      <style>{`
        .db-stat-card:hover  { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 #111110 !important; }
        .db-topbar-btn:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #111110 !important; }
        .db-qaction:hover    { background: #F0EBE1; }
        .db-artwork-action:hover { color: #111110; }
        .db-card-link:hover  { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 #111110 !important; }
        .db-comment-input:focus { background: #fff; box-shadow: 3px 3px 0 #111110; }
        ::-webkit-scrollbar       { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* ── TOPBAR ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 28px',
          borderBottom: '2px solid #111110',
          background: '#FFFBEA',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', color: '#111110' }}>
              Dashboard
            </div>
            <div style={{ fontSize: 13, color: '#9B8F7A', marginTop: 2 }}>
              Welcome back{profile ? `, ${displayName}` : ''} — here's what's happening.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="db-topbar-btn"
              title="Search"
              style={{
                width: 36, height: 36, border: '2px solid #111110', background: '#fff',
                boxShadow: '3px 3px 0 #111110', borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s',
              }}
            >🔍</button>
            <button
              className="db-topbar-btn"
              title="Notifications"
              style={{
                width: 36, height: 36, border: '2px solid #111110', background: '#fff',
                boxShadow: '3px 3px 0 #111110', borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s',
              }}
            >🔔</button>
            <Link href="/dashboard/artworks">
              <button
                className="db-topbar-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', border: '2px solid #111110',
                  fontSize: 13, fontWeight: 700, background: '#FFD400', color: '#111110',
                  cursor: 'pointer', boxShadow: '3px 3px 0 #111110', borderRadius: 6,
                  transition: 'transform 0.1s, box-shadow 0.1s',
                }}
              >
                ＋ Add Artwork →
              </button>
            </Link>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>

          {/* ── STAT CARDS ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22,
          }}>
            {statCards.map((s, i) => (
              <div
                key={s.label}
                className="db-stat-card"
                style={{
                  background: '#fff', border: '2px solid #111110',
                  boxShadow: '3px 3px 0 #111110', borderRadius: 8,
                  padding: '16px 18px',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                  cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9B8F7A', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px', color: '#111110' }}>
                    {loading ? '—' : s.value}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, marginTop: 4,
                    color: s.positive ? '#00C853' : '#9B8F7A',
                  }}>
                    {s.positive && s.value !== 0 ? '↑ ' : ''}{s.delta}
                  </div>
                </div>
                {/* Sparkline */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 38 }}>
                  {s.bars.map((h, bi) => (
                    <div
                      key={bi}
                      style={{
                        width: 6, height: h, borderRadius: 2,
                        background: sparkHighlights[i].includes(bi) ? '#FFD400' : '#E0D8CA',
                        border: sparkHighlights[i].includes(bi) ? '1px solid #111110' : 'none',
                        transition: 'height 0.3s',
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── MAIN GRID ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18 }}>

            {/* ── LEFT: Recent Artworks Feed ── */}
            <div>
              <div style={{
                background: '#fff', border: '2px solid #111110',
                boxShadow: '3px 3px 0 #111110', borderRadius: 8, overflow: 'hidden',
              }}>
                {/* Card header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', borderBottom: '2px solid #111110',
                  fontSize: 14, fontWeight: 800, color: '#111110',
                }}>
                  Recent Artworks
                  <Link
                    href="/dashboard/artworks"
                    className="db-card-link"
                    style={{
                      fontSize: 12, fontWeight: 700, color: '#111110', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', border: '2px solid #111110', borderRadius: 20,
                      background: '#FFD400', boxShadow: '2px 2px 0 #111110',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                    }}
                  >
                    View all →
                  </Link>
                </div>

                {/* Artwork items */}
                {loading ? (
                  <div style={{ padding: '32px 18px', textAlign: 'center', color: '#9B8F7A', fontSize: 13 }}>
                    Loading artworks…
                  </div>
                ) : artworks.length === 0 ? (
                  <div style={{ padding: '40px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🎨</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#111110', marginBottom: 6 }}>No artworks yet</div>
                    <div style={{ fontSize: 13, color: '#9B8F7A', marginBottom: 18 }}>Add your first piece to get started.</div>
                    <Link href="/dashboard/artworks">
                      <button style={{
                        padding: '10px 20px', border: '2px solid #111110', borderRadius: 6,
                        background: '#FFD400', fontWeight: 700, fontSize: 13,
                        cursor: 'pointer', boxShadow: '3px 3px 0 #111110',
                      }}>
                        ＋ Add Artwork
                      </button>
                    </Link>
                  </div>
                ) : (
                  artworks.map((art, idx) => (
                    <div
                      key={art.id}
                      style={{
                        padding: '16px 18px',
                        borderBottom: idx < artworks.length - 1 ? '2px solid #111110' : 'none',
                      }}
                    >
                      {/* Meta row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: '#FFD400', border: '2px solid #111110',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 800, color: '#111110', flexShrink: 0,
                          }}>
                            {userInitial}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#111110' }}>{displayName}</div>
                            <div style={{ fontSize: 11, color: '#9B8F7A', marginTop: 1 }}>{timeAgo(art.created_at)}</div>
                          </div>
                        </div>
                        <button style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#9B8F7A' }}>···</button>
                      </div>

                      {/* Title / desc */}
                      <div style={{ fontSize: 13, color: '#5C5346', lineHeight: 1.5, marginBottom: 12 }}>
                        <span style={{ fontWeight: 700, color: '#111110' }}>{art.title}</span>
                        {art.medium ? ` — ${art.medium}` : ''}
                        {art.price ? `. Listed at $${art.price.toLocaleString()}.` : ''}
                      </div>

                      {/* Image */}
                      {art.image_url ? (
                        <div style={{ marginBottom: 12 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={art.image_url}
                            alt={art.title}
                            style={{
                              width: '100%', aspectRatio: '16/7', objectFit: 'cover',
                              border: '2px solid #111110', borderRadius: 6,
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          width: '100%', aspectRatio: '16/7',
                          border: '2px solid #111110', borderRadius: 6,
                          background: '#1a2a3a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 40, color: '#fff', fontWeight: 900, marginBottom: 12,
                        }}>
                          🖼
                        </div>
                      )}

                      {/* Status badge */}
                      <span style={{
                        display: 'inline-block', fontSize: 10, fontWeight: 800,
                        textTransform: 'uppercase', padding: '3px 8px',
                        border: '2px solid #111110', borderRadius: 4, letterSpacing: '0.5px',
                        background: art.status === 'sold' ? '#111110' : '#FFD400',
                        color: art.status === 'sold' ? '#fff' : '#111110',
                        marginBottom: 10,
                      }}>
                        {art.status ?? 'Available'}
                      </span>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, fontWeight: 600, color: '#5C5346' }}>
                        <div className="db-artwork-action" style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', transition: 'color 0.1s' }}>
                          💬 <span>0</span>
                        </div>
                        <div className="db-artwork-action" style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', transition: 'color 0.1s' }}>
                          ♡ <span>0</span>
                        </div>
                        <div className="db-artwork-action" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', transition: 'color 0.1s' }}>
                          ↗ Share
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Comment box */}
                <div style={{
                  padding: '12px 18px', borderTop: '2px solid #111110',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#FFD400', border: '2px solid #111110',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: '#111110', flexShrink: 0,
                  }}>
                    {userInitial}
                  </div>
                  <input
                    className="db-comment-input"
                    type="text"
                    placeholder="Type to add a note or comment…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    style={{
                      flex: 1, padding: '8px 12px',
                      border: '2px solid #111110', borderRadius: 6,
                      fontSize: 13, fontFamily: 'inherit',
                      background: '#F0EBE1', outline: 'none',
                      transition: 'background 0.1s, box-shadow 0.1s',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 18, cursor: 'pointer', opacity: 0.5 }}>😊</span>
                    <button
                      style={{
                        width: 34, height: 34, background: '#FFD400',
                        border: '2px solid #111110', boxShadow: '3px 3px 0 #111110',
                        borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: 14,
                      }}
                    >→</button>
                  </div>
                </div>
              </div>
            </div>
            {/* end left */}

            {/* ── RIGHT COLUMN ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Quick Actions */}
              <div style={{
                background: '#fff', border: '2px solid #111110',
                boxShadow: '3px 3px 0 #111110', borderRadius: 8, overflow: 'hidden',
              }}>
                <div style={{
                  padding: '14px 18px', borderBottom: '2px solid #111110',
                  fontSize: 14, fontWeight: 800, color: '#111110',
                }}>
                  Quick Actions
                </div>
                <div>
                  {/* Primary action */}
                  <Link href="/dashboard/artworks" style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: '#111110', color: '#fff',
                      margin: '8px 12px', borderRadius: 6,
                      border: '2px solid #111110', boxShadow: '3px 3px 0 #111110',
                      padding: '12px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    }}>
                      <span><span style={{ marginRight: 10, opacity: 0.7 }}>＋</span> Add Artwork</span>
                      <span style={{ color: '#FFD400' }}>→</span>
                    </div>
                  </Link>

                  {[
                    { icon: '📁', label: 'New Collection',   href: '/dashboard/collections' },
                    { icon: '💬', label: 'Post to Feed',     href: '/dashboard/feed' },
                    { icon: '🔍', label: 'Discover Artists', href: '/dashboard/discover' },
                    { icon: '🏛',  label: 'New Exhibition',  href: '/dashboard/exhibitions' },
                    { icon: '📊', label: 'Record Sale',      href: '/dashboard/sales' },
                  ].map((item) => (
                    <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                      <div
                        className="db-qaction"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '11px 18px', borderBottom: '1px solid #E0D8CA',
                          fontSize: 13, fontWeight: 600, color: '#111110',
                          cursor: 'pointer', transition: 'background 0.1s',
                        }}
                      >
                        <span><span style={{ marginRight: 10, opacity: 0.7 }}>{item.icon}</span>{item.label}</span>
                        <span style={{ color: '#9B8F7A', fontSize: 14 }}>→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Collectors & Clients */}
              <div style={{
                background: '#fff', border: '2px solid #111110',
                boxShadow: '3px 3px 0 #111110', borderRadius: 8, overflow: 'hidden',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', borderBottom: '2px solid #111110',
                  fontSize: 14, fontWeight: 800, color: '#111110',
                }}>
                  Collectors & Clients
                  <Link
                    href="/dashboard/clients"
                    className="db-card-link"
                    style={{
                      fontSize: 12, fontWeight: 700, color: '#111110', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', border: '2px solid #111110', borderRadius: 20,
                      background: '#FFD400', boxShadow: '2px 2px 0 #111110',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                    }}
                  >
                    All →
                  </Link>
                </div>
                <div>
                  {loading ? (
                    <div style={{ padding: '20px 18px', color: '#9B8F7A', fontSize: 13 }}>Loading…</div>
                  ) : clients.length === 0 ? (
                    <div style={{ padding: '24px 18px', textAlign: 'center', color: '#9B8F7A', fontSize: 13 }}>
                      No clients yet. <Link href="/dashboard/clients" style={{ color: '#111110', fontWeight: 700 }}>Add one →</Link>
                    </div>
                  ) : (
                    clients.map((c, i) => (
                      <div
                        key={c.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 18px',
                          borderBottom: i < clients.length - 1 ? '1px solid #E0D8CA' : 'none',
                        }}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: c.color, border: '2px solid #111110',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, color: '#111110', flexShrink: 0,
                        }}>
                          {c.initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#111110', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: 11, color: '#9B8F7A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.email ?? '—'}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          padding: '3px 8px', border: '2px solid #111110', borderRadius: 20, flexShrink: 0,
                          background: c.status === 'online' ? '#CFFDE1' : c.status === 'away' ? '#FFF3CD' : '#E0D8CA',
                          color: c.status === 'online' ? '#00874A' : c.status === 'away' ? '#856404' : '#5C5346',
                        }}>
                          {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
            {/* end right col */}
          </div>
          {/* end main grid */}

          {/* Footer */}
          <div style={{
            padding: '14px 0', marginTop: 24,
            borderTop: '2px solid #E0D8CA',
            display: 'flex', justifyContent: 'space-between',
            fontSize: 11, color: '#9B8F7A', fontWeight: 600,
          }}>
            <span>Artfolio ✦ {new Date().getFullYear()}</span>
            <span>Artist Dashboard</span>
          </div>
        </div>
        {/* end content */}
      </div>
    </>
  )
}
