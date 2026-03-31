'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

interface ArtworkItem {
  id: string; title: string; medium: string | null; price: number | null;
  status: string | null; images: string[] | null; created_at: string;
}
interface ClientItem {
  id: string; name: string; email: string | null;
  status: 'online' | 'away' | 'offline'; initials: string; color: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d < 30 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const CLIENT_COLORS = ['#d1fae5','#fef3c7','#ffe4e6','#e0f2fe','#f3e8ff','#dcfce7']
const CLIENT_STATUSES: ('online'|'away'|'offline')[] = ['online','away','offline','online','away','online']
const SPARKLINES = {
  artworks:    { heights: [16,22,14,30,36,38], highlights: [3,4,5] },
  collections: { heights: [18,28,20,32,24,38], highlights: [1,3,5] },
  exhibitions: { heights: [38,30,20,28,16,22], highlights: [0,3,5] },
  followers:   { heights: [8,8,8,8,8,8],       highlights: [5]     },
}

export default function DashboardPage() {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  const [profile, setProfile]     = useState<{full_name:string;username:string}|null>(null)
  const [artworks, setArtworks]   = useState<ArtworkItem[]>([])
  const [stats, setStats]         = useState({artworks:0,collections:0,exhibitions:0,followers:0})
  const [clients, setClients]     = useState<ClientItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [note, setNote]           = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const [pr, ar, co, ex, fo, cl] = await Promise.all([
        supabase.from('profiles').select('full_name,username').eq('id',user.id).single(),
        supabase.from('artworks').select('id,title,medium,price,status,images,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(3),
        supabase.from('collections').select('id',{count:'exact',head:true}).eq('user_id',user.id),
        supabase.from('exhibitions').select('id',{count:'exact',head:true}).eq('user_id',user.id),
        supabase.from('follows').select('id',{count:'exact',head:true}).eq('following_id',user.id),
        supabase.from('clients').select('id,name,email').eq('user_id',user.id).limit(6),
      ])
      if (pr.data) setProfile(pr.data)
      const raws = (ar.data ?? []) as ArtworkItem[]
      setArtworks(raws)
      setStats({ artworks: ar.count ?? raws.length, collections: co.count ?? 0, exhibitions: ex.count ?? 0, followers: fo.count ?? 0 })
      const rawC = (cl.data ?? []) as {id:string;name:string;email:string|null}[]
      setClients(rawC.map((c,i) => ({ ...c, initials: getInitials(c.name), color: CLIENT_COLORS[i%CLIENT_COLORS.length], status: CLIENT_STATUSES[i%CLIENT_STATUSES.length] })))
      setLoading(false)
    }
    load()
  }, [supabase])

  const name = profile?.full_name ?? 'Artist'
  const initial = name[0]?.toUpperCase() ?? 'A'
  const statCards = [
    { label:'Total Artworks',  value:stats.artworks,    delta:'+1 this month', pos:true,  spark:SPARKLINES.artworks    },
    { label:'Collections',     value:stats.collections, delta:'+0 this month', pos:true,  spark:SPARKLINES.collections },
    { label:'Exhibitions',     value:stats.exhibitions, delta:'Upcoming',      pos:false, spark:SPARKLINES.exhibitions },
    { label:'Followers',       value:stats.followers,   delta:'No change',     pos:true,  spark:SPARKLINES.followers   },
  ]

  return (
    <>
      <style>{`
        .sc:hover { transform:translate(-2px,-2px); box-shadow:5px 5px 0 #111110 !important; }
        .qa:hover { background:#F0EBE1; }
        .ar:hover { background:#F5F0E8 !important; }
        .cl:hover { transform:translate(-1px,-1px); box-shadow:3px 3px 0 #111110 !important; }
        .ci:focus { background:#fff; box-shadow:3px 3px 0 #111110; }
      `}</style>
      <div>
        <div style={{marginBottom:24}}>
          <h1 style={{fontSize:26,fontWeight:900,color:'#111110',letterSpacing:'-0.5px',marginBottom:2}}>
            {loading ? 'Dashboard' : `Welcome back, ${name} ✦`}
          </h1>
          <p style={{fontSize:13,color:'#9B8F7A'}}>Here&apos;s what&apos;s happening with your work.</p>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
          {statCards.map((s,i) => (
            <div key={s.label} className="sc" style={{background:'#fff',border:'2px solid #111110',boxShadow:'3px 3px 0 #111110',borderRadius:8,padding:'16px 18px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',cursor:'pointer',transition:'transform 0.1s,box-shadow 0.1s'}}>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:'#9B8F7A',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>{s.label}</div>
                <div style={{fontSize:28,fontWeight:900,letterSpacing:'-1px',color:'#111110'}}>{loading?'—':s.value}</div>
                <div style={{fontSize:11,fontWeight:600,marginTop:4,color:s.pos?'#00C853':'#9B8F7A'}}>{s.pos&&s.value!==0?'↑ ':''}{s.delta}</div>
              </div>
              <div style={{display:'flex',alignItems:'flex-end',gap:3,height:38}}>
                {s.spark.heights.map((h,bi) => (
                  <div key={bi} style={{width:6,height:h,borderRadius:2,background:s.spark.highlights.includes(bi)?'#FFD400':'#E0D8CA',border:s.spark.highlights.includes(bi)?'1px solid #111110':'none'}} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:18}}>

          {/* Left — Recent artworks, each fully clickable */}
          <div style={{background:'#fff',border:'2px solid #111110',boxShadow:'3px 3px 0 #111110',borderRadius:8,overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'2px solid #111110',fontSize:14,fontWeight:800,color:'#111110'}}>
              Recent Artworks
              <Link href="/dashboard/artworks" className="cl" style={{fontSize:12,fontWeight:700,color:'#111110',textDecoration:'none',padding:'4px 10px',border:'2px solid #111110',borderRadius:20,background:'#FFD400',boxShadow:'2px 2px 0 #111110',transition:'transform 0.1s,box-shadow 0.1s'}}>View all →</Link>
            </div>

            {loading ? (
              <div style={{padding:'32px',textAlign:'center',color:'#9B8F7A',fontSize:13}}>Loading…</div>
            ) : artworks.length === 0 ? (
              <div style={{padding:'40px 18px',textAlign:'center'}}>
                <div style={{fontSize:36,marginBottom:10}}>🎨</div>
                <div style={{fontSize:15,fontWeight:800,color:'#111110',marginBottom:6}}>No artworks yet</div>
                <div style={{fontSize:13,color:'#9B8F7A',marginBottom:18}}>Add your first piece to get started.</div>
                <Link href="/dashboard/artworks/new"><button style={{padding:'10px 20px',border:'2px solid #111110',borderRadius:6,background:'#FFD400',fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:'3px 3px 0 #111110'}}>＋ Add Artwork</button></Link>
              </div>
            ) : artworks.map((art, idx) => {
              const img = art.images?.[0] ?? null
              const sold = art.status?.toLowerCase() === 'sold'
              return (
                <Link key={art.id} href={`/dashboard/artworks/${art.id}`} style={{textDecoration:'none',display:'block'}}>
                  <div className="ar" style={{padding:'13px 18px',borderBottom:idx<artworks.length-1?'1px solid #E0D8CA':'none',cursor:'pointer',transition:'background 0.1s',background:'#fff'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:50,height:50,borderRadius:6,border:'2px solid #111110',overflow:'hidden',background:'#F5F0E8',flexShrink:0}}>
                        {img ? <img src={img} alt={art.title} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🖼</div>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:3}}>
                          <span style={{fontSize:13,fontWeight:700,color:'#111110',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{art.title}</span>
                          <span style={{display:'inline-block',fontSize:9,fontWeight:800,textTransform:'uppercase',padding:'2px 6px',border:'1.5px solid #111110',borderRadius:3,background:sold?'#111110':'#FFD400',color:sold?'#FFD400':'#111110',flexShrink:0}}>{art.status??'Available'}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          {art.medium && <span style={{fontSize:11,color:'#9B8F7A'}}>{art.medium}</span>}
                          {art.price && <span style={{fontSize:11,fontFamily:'monospace',fontWeight:700,color:'#5C5346'}}>${art.price.toLocaleString()}</span>}
                          <span style={{fontSize:10,color:'#d4cfc4',marginLeft:'auto'}}>{timeAgo(art.created_at)}</span>
                        </div>
                      </div>
                      <span style={{fontSize:13,color:'#d4cfc4',flexShrink:0}}>→</span>
                    </div>
                  </div>
                </Link>
              )
            })}

            {/* Note input */}
            <div style={{padding:'12px 18px',borderTop:'2px solid #111110',display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'#FFD400',border:'2px solid #111110',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#111110',flexShrink:0}}>{initial}</div>
              <input className="ci" type="text" placeholder="Add a note…" value={note} onChange={e=>setNote(e.target.value)} style={{flex:1,padding:'8px 12px',border:'2px solid #111110',borderRadius:6,fontSize:13,fontFamily:'inherit',background:'#F0EBE1',outline:'none',transition:'background 0.1s,box-shadow 0.1s'}} />
              <button style={{width:34,height:34,background:'#FFD400',border:'2px solid #111110',boxShadow:'3px 3px 0 #111110',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:14,flexShrink:0}}>→</button>
            </div>
          </div>

          {/* Right */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {/* Quick Actions */}
            <div style={{background:'#fff',border:'2px solid #111110',boxShadow:'3px 3px 0 #111110',borderRadius:8,overflow:'hidden'}}>
              <div style={{padding:'14px 18px',borderBottom:'2px solid #111110',fontSize:14,fontWeight:800,color:'#111110'}}>Quick Actions</div>
              <div>
                <Link href="/dashboard/artworks/new" style={{textDecoration:'none'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#111110',color:'#fff',margin:'8px 12px',borderRadius:6,border:'2px solid #111110',boxShadow:'3px 3px 0 #111110',padding:'11px 14px',cursor:'pointer',fontSize:13,fontWeight:700}}>
                    <span>＋ Add Artwork</span><span style={{color:'#FFD400'}}>→</span>
                  </div>
                </Link>
                {[
                  {icon:'📁',label:'New Collection',href:'/dashboard/collections/new'},
                  {icon:'💬',label:'Post to Feed',href:'/dashboard/feed'},
                  {icon:'🔍',label:'Discover Artists',href:'/dashboard/discover'},
                  {icon:'🏛',label:'New Exhibition',href:'/dashboard/exhibitions/new'},
                  {icon:'📊',label:'Record Sale',href:'/dashboard/sales'},
                ].map(item => (
                  <Link key={item.href} href={item.href} style={{textDecoration:'none'}}>
                    <div className="qa" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 18px',borderBottom:'1px solid #E0D8CA',fontSize:13,fontWeight:600,color:'#111110',cursor:'pointer',transition:'background 0.1s'}}>
                      <span><span style={{marginRight:8,opacity:0.7}}>{item.icon}</span>{item.label}</span>
                      <span style={{color:'#9B8F7A',fontSize:14}}>→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Clients */}
            <div style={{background:'#fff',border:'2px solid #111110',boxShadow:'3px 3px 0 #111110',borderRadius:8,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'2px solid #111110',fontSize:14,fontWeight:800,color:'#111110'}}>
                Collectors
                <Link href="/dashboard/clients" className="cl" style={{fontSize:12,fontWeight:700,color:'#111110',textDecoration:'none',padding:'4px 10px',border:'2px solid #111110',borderRadius:20,background:'#FFD400',boxShadow:'2px 2px 0 #111110',transition:'transform 0.1s,box-shadow 0.1s'}}>All →</Link>
              </div>
              <div>
                {loading ? <div style={{padding:'20px',color:'#9B8F7A',fontSize:13}}>Loading…</div>
                : clients.length === 0 ? <div style={{padding:'24px',textAlign:'center',color:'#9B8F7A',fontSize:13}}>No clients yet. <Link href="/dashboard/clients" style={{color:'#111110',fontWeight:700}}>Add one →</Link></div>
                : clients.map((c,i) => (
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 18px',borderBottom:i<clients.length-1?'1px solid #E0D8CA':'none'}}>
                    <div style={{width:28,height:28,borderRadius:'50%',background:c.color,border:'2px solid #111110',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#111110',flexShrink:0}}>{c.initials}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:'#111110',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.name}</div>
                      <div style={{fontSize:10,color:'#9B8F7A'}}>{c.email??'—'}</div>
                    </div>
                    <span style={{fontSize:9,fontWeight:800,padding:'2px 7px',border:'1.5px solid #111110',borderRadius:20,flexShrink:0,textTransform:'uppercase',background:c.status==='online'?'#CFFDE1':c.status==='away'?'#FFF3CD':'#E0D8CA',color:c.status==='online'?'#00874A':c.status==='away'?'#856404':'#5C5346'}}>{c.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{padding:'14px 0',marginTop:24,borderTop:'1px solid #E0D8CA',display:'flex',justifyContent:'space-between',fontSize:11,color:'#9B8F7A',fontWeight:600}}>
          <span>Artfolio ✦ {new Date().getFullYear()}</span>
          <span>Artist Dashboard</span>
        </div>
      </div>
    </>
  )
}
