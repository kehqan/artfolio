"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, ImageIcon, Globe, Users, BarChart3,
  CalendarDays, LogOut, Palette, Menu, Bell, Search,
  Plus, X, ChevronRight, ChevronDown, Handshake,
  FolderOpen, TrendingUp, CheckSquare, MapPin, CalendarRange,
} from "lucide-react";

// ── Nav structure with collapsible sections ───────────────────────
const NAV_SECTIONS = [
  {
    key: "studio",
    label: "Studio",
    icon: ImageIcon,
    color: "#FFD400",
    items: [
      { href: "/dashboard/artworks",    label: "Artworks",    icon: ImageIcon   },
      { href: "/dashboard/collections", label: "Collections", icon: FolderOpen  },
      { href: "/dashboard/portfolio",   label: "Portfolio",   icon: Globe       },
    ],
  },
  {
    key: "scene",
    label: "Scene",
    icon: CalendarRange,
    color: "#4ECDC4",
    items: [
      { href: "/dashboard/exhibitions", label: "Events",      icon: CalendarRange },
      { href: "/dashboard/pool",        label: "Collabs",     icon: Handshake     },
      { href: "/dashboard/map",         label: "Map",         icon: MapPin        },
    ],
  },
  {
    key: "business",
    label: "Business",
    icon: BarChart3,
    color: "#FF6B6B",
    items: [
      { href: "/dashboard/sales",       label: "Sales",       icon: BarChart3   },
      { href: "/dashboard/clients",     label: "Clients",     icon: Users       },
      { href: "/dashboard/analytics",   label: "Analytics",   icon: TrendingUp  },
    ],
  },
  {
    key: "planner",
    label: "Planner",
    icon: CalendarDays,
    color: "#8B5CF6",
    items: [
      { href: "/dashboard/tasks",       label: "Tasks",       icon: CheckSquare },
      { href: "/dashboard/calendar",    label: "Calendar",    icon: CalendarDays},
    ],
  },
];

const ALL_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ...NAV_SECTIONS.flatMap(s => s.items),
];

const MOCK_NOTIFS = [
  { id: 1, text: "New follower joined",        time: "2m ago",  read: false, dot: "#4ECDC4" },
  { id: 2, text: "Your artwork was saved",      time: "1h ago",  read: false, dot: "#FFD400" },
  { id: 3, text: "New collaboration request",   time: "3h ago",  read: true,  dot: "#FF6B6B" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();

  const [profile, setProfile]           = useState<{ full_name?: string; role?: string; avatar_url?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const [bellOpen, setBellOpen]         = useState(false);
  const [notifs, setNotifs]             = useState(MOCK_NOTIFS);

  // Track which sections are open — default all open
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    studio: true, scene: true, business: true, planner: true,
  });

  const bellRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("full_name,role,avatar_url")
        .eq("id", user.id).single()
        .then(({ data }) => setProfile(data));
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50); }, [searchOpen]);
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Auto-open the section containing the active route
  useEffect(() => {
    NAV_SECTIONS.forEach(s => {
      if (s.items.some(i => pathname.startsWith(i.href) && i.href !== "/")) {
        setOpenSections(p => ({ ...p, [s.key]: true }));
      }
    });
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href) && href !== "/";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const toggleSection = (key: string) =>
    setOpenSections(p => ({ ...p, [key]: !p[key] }));

  const searchResults = searchQuery
    ? ALL_NAV_ITEMS.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const unread = notifs.filter(n => !n.read).length;

  // ── Active breadcrumb ──────────────────────────────────────────
  const activeItem    = ALL_NAV_ITEMS.find(i => isActive(i.href));
  const activeSection = NAV_SECTIONS.find(s => s.items.some(i => isActive(i.href)));

  // ── Sidebar ────────────────────────────────────────────────────
  const Sidebar = () => (
    <aside style={{ display:"flex", flexDirection:"column", height:"100%", width:224, background:"#FCEEDC", flexShrink:0 }}>

      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"18px 16px 14px", borderBottom:"1px solid #1e1e1e" }}>
        <div style={{ width:30, height:30, background:"#FFD400", border:"2px solid #2a2a2a", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Palette size={14} color="#111110" />
        </div>
        <span style={{ fontSize:15, fontWeight:900, color:"#fff", letterSpacing:"-0.3px" }}>
          Artfolio<sup style={{ fontSize:7, opacity:0.4 }}>✦</sup>
        </span>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden"
          style={{ marginLeft:"auto", width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", background:"none", border:"none", cursor:"pointer", color:"#555" }}>
          <X size={14} />
        </button>
      </div>

      {/* Profile card */}
      {profile && (
        <Link href="/dashboard/profile" style={{ textDecoration:"none" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", borderBottom:"1px solid #1e1e1e", cursor:"pointer", transition:"background 0.1s" }}
            onMouseEnter={e => (e.currentTarget.style.background="#1a1a1a")}
            onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width:34, height:34, borderRadius:"50%", objectFit:"cover", border:"2px solid #2a2a2a", flexShrink:0 }} />
              : <div style={{ width:34, height:34, borderRadius:"50%", background:"#FFD400", border:"2px solid #2a2a2a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, color:"#111110", flexShrink:0 }}>
                  {profile.full_name?.[0]?.toUpperCase() || "A"}
                </div>
            }
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {profile.full_name || "Artist"}
              </div>
              <div style={{ fontSize:10, color:"#555", textTransform:"capitalize", fontWeight:600 }}>
                {profile.role || "artist"}
              </div>
            </div>
            <ChevronRight size={11} color="#333" />
          </div>
        </Link>
      )}

      {/* Nav */}
      <nav style={{ flex:1, overflowY:"auto", padding:"10px 10px 4px", scrollbarWidth:"none" }}>

        {/* Dashboard */}
        <Link href="/dashboard" style={{ textDecoration:"none" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", marginBottom:6, background: pathname==="/dashboard"?"#FFD400":"transparent", transition:"background 0.1s", cursor:"pointer" }}
            onMouseEnter={e => { if (pathname!=="/dashboard") e.currentTarget.style.background="#1a1a1a"; }}
            onMouseLeave={e => { if (pathname!=="/dashboard") e.currentTarget.style.background="transparent"; }}>
            <LayoutDashboard size={14} color={pathname==="/dashboard"?"#111110":"#555"} />
            <span style={{ fontSize:13, fontWeight: pathname==="/dashboard"?800:600, color: pathname==="/dashboard"?"#111110":"#aaa" }}>Dashboard</span>
          </div>
        </Link>

        {/* Collapsible sections */}
        {NAV_SECTIONS.map(section => {
          const isOpen      = openSections[section.key];
          const secActive   = section.items.some(i => isActive(i.href));
          const SIcon       = section.icon;

          return (
            <div key={section.key} style={{ marginBottom:2 }}>
              {/* Section header — clickable to toggle */}
              <button onClick={() => toggleSection(section.key)}
                style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"9px 12px", background: secActive && !isOpen ? "#1c1c1c" : "transparent", border:"none", cursor:"pointer", textAlign:"left", transition:"background 0.1s", marginBottom: isOpen ? 2 : 0 }}
                onMouseEnter={e => (e.currentTarget.style.background="#161616")}
                onMouseLeave={e => (e.currentTarget.style.background= secActive && !isOpen ? "#1c1c1c" : "transparent")}>
                {/* Colored section dot */}
                <div style={{ width:6, height:6, borderRadius:"50%", background: secActive ? section.color : "#333", flexShrink:0, transition:"background 0.2s" }} />
                <span style={{ fontSize:10, fontWeight:800, color: secActive ? "#fff" : "#444", textTransform:"uppercase", letterSpacing:"0.15em", flex:1 }}>
                  {section.label}
                </span>
                <ChevronDown size={11} color="#444" style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition:"transform 0.2s", flexShrink:0 }} />
              </button>

              {/* Items (animated collapse) */}
              {isOpen && (
                <div style={{ paddingLeft:8, marginBottom:4 }}>
                  {section.items.map(item => {
                    const active = isActive(item.href);
                    const IIcon  = item.icon;
                    return (
                      <Link key={item.href} href={item.href} style={{ textDecoration:"none" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 10px 7px 12px", borderLeft: `2px solid ${active ? section.color : "transparent"}`, background: active ? "#1c1c1c" : "transparent", transition:"all 0.1s", cursor:"pointer" }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.background="#161616"; }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.background="transparent"; }}>
                          <IIcon size={13} color={active ? section.color : "#4a4a4a"} />
                          <span style={{ fontSize:13, fontWeight: active ? 700 : 500, color: active ? "#fff" : "#666", flex:1 }}>
                            {item.label}
                          </span>
                          {active && <div style={{ width:5, height:5, borderRadius:"50%", background: section.color, flexShrink:0 }} />}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding:"10px 10px 12px", borderTop:"1px solid #1e1e1e" }}>
        <Link href="/dashboard/artworks/new" style={{ textDecoration:"none" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"#FFD400", marginBottom:4, cursor:"pointer", transition:"box-shadow 0.1s" }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow="3px 3px 0 #444")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow="none")}>
            <Plus size={14} color="#111110" strokeWidth={3} />
            <span style={{ fontSize:12, fontWeight:800, color:"#111110" }}>Add Artwork</span>
          </div>
        </Link>
        <button onClick={handleLogout}
          style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 14px", background:"transparent", border:"none", cursor:"pointer", transition:"background 0.1s" }}
          onMouseEnter={e => (e.currentTarget.style.background="#1a1a1a")}
          onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
          <LogOut size={13} color="#444" />
          <span style={{ fontSize:12, fontWeight:600, color:"#555" }}>Sign out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        nav::-webkit-scrollbar{display:none}
        .dbs-hover:hover{background:#F5F0E8!important}
        .dbn-hover:hover{background:#FFFBEA!important}
        @media(max-width:1023px){.desktop-sidebar{display:none!important}}
        @media(min-width:1024px){.mob-btn{display:none!important}}
      `}</style>

      <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:"#FFFBEA", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>

        {/* Desktop sidebar */}
        <div className="desktop-sidebar" style={{ height:"100vh", flexShrink:0, borderRight:"2px solid #1e1e1e" }}>
          <Sidebar />
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div style={{ position:"fixed", inset:0, zIndex:40, display:"flex" }}>
            <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)" }} onClick={() => setSidebarOpen(false)} />
            <div style={{ position:"relative", zIndex:41, height:"100%", borderRight:"2px solid #1e1e1e" }}>
              <Sidebar />
            </div>
          </div>
        )}

        {/* Main */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

          {/* Topbar */}
          <header style={{ flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px", height:54, borderBottom:"2px solid #111110", background:"#fff", gap:12 }}>

            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <button className="mob-btn" onClick={() => setSidebarOpen(true)}
                style={{ width:34, height:34, border:"2px solid #111110", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                <Menu size={15} />
              </button>
              {/* Breadcrumb */}
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                {activeSection && (
                  <>
                    <span style={{ fontSize:11, fontWeight:700, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em" }}>{activeSection.label}</span>
                    <ChevronRight size={11} color="#d4cfc4" />
                  </>
                )}
                <span style={{ fontSize:13, fontWeight:800, color:"#111110" }}>{activeItem?.label || "Dashboard"}</span>
              </div>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:8 }}>

              {/* Search */}
              <div style={{ position:"relative" }}>
                <button onClick={() => setSearchOpen(p=>!p)}
                  style={{ width:34, height:34, border:"2px solid #111110", background:searchOpen?"#FFD400":"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", boxShadow:"2px 2px 0 #111110" }}>
                  {searchOpen ? <X size={14}/> : <Search size={14}/>}
                </button>
                {searchOpen && (
                  <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, width:280, background:"#fff", border:"2px solid #111110", boxShadow:"4px 4px 0 #111110", zIndex:50, overflow:"hidden" }}>
                    <div style={{ padding:"10px 12px", borderBottom:"1px solid #E0D8CA", display:"flex", alignItems:"center", gap:8 }}>
                      <Search size={13} color="#9B8F7A"/>
                      <input ref={searchRef} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search pages…"
                        style={{ flex:1, border:"none", outline:"none", fontSize:13, fontFamily:"inherit", background:"transparent", color:"#111110" }}
                        onKeyDown={e=>{
                          if(e.key==="Escape"){setSearchOpen(false);setSearchQuery("");}
                          if(e.key==="Enter"&&searchResults.length>0){router.push(searchResults[0].href);setSearchOpen(false);setSearchQuery("");}
                        }}/>
                    </div>
                    {searchQuery ? (
                      searchResults.length===0
                        ? <div style={{padding:16,textAlign:"center",color:"#9B8F7A",fontSize:13}}>No results</div>
                        : searchResults.map(item=>(
                          <Link key={item.href} href={item.href} style={{textDecoration:"none"}} onClick={()=>{setSearchOpen(false);setSearchQuery("");}}>
                            <div className="dbs-hover" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid #F5F0E8"}}>
                              <item.icon size={14} color="#9B8F7A"/>
                              <span style={{fontSize:13,fontWeight:600,color:"#111110"}}>{item.label}</span>
                            </div>
                          </Link>
                        ))
                    ) : (
                      <div style={{padding:"10px 12px"}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#9B8F7A",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Quick nav</div>
                        {ALL_NAV_ITEMS.slice(0,6).map(item=>(
                          <Link key={item.href} href={item.href} style={{textDecoration:"none"}} onClick={()=>setSearchOpen(false)}>
                            <div className="dbs-hover" style={{display:"flex",alignItems:"center",gap:10,padding:"7px 4px",cursor:"pointer"}}>
                              <item.icon size={13} color="#9B8F7A"/>
                              <span style={{fontSize:13,fontWeight:600,color:"#5C5346"}}>{item.label}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bell */}
              <div ref={bellRef} style={{position:"relative"}}>
                <button onClick={()=>setBellOpen(p=>!p)}
                  style={{width:34,height:34,border:"2px solid #111110",background:bellOpen?"#FFD400":"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"2px 2px 0 #111110",position:"relative"}}>
                  <Bell size={14}/>
                  {unread>0 && <span style={{position:"absolute",top:-6,right:-6,width:16,height:16,borderRadius:"50%",background:"#FFD400",border:"2px solid #111110",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900,color:"#111110"}}>{unread}</span>}
                </button>
                {bellOpen && (
                  <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,width:300,background:"#fff",border:"2px solid #111110",boxShadow:"4px 4px 0 #111110",zIndex:50,overflow:"hidden"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:"2px solid #111110",background:"#F5F0E8"}}>
                      <span style={{fontSize:12,fontWeight:800,color:"#111110"}}>Notifications</span>
                      <button onClick={()=>setNotifs(p=>p.map(n=>({...n,read:true})))} style={{fontSize:10,fontWeight:700,color:"#9B8F7A",background:"none",border:"none",cursor:"pointer"}}>Mark all read</button>
                    </div>
                    {notifs.map((n,i)=>(
                      <div key={n.id} className="dbn-hover" onClick={()=>setNotifs(p=>p.map(x=>x.id===n.id?{...x,read:true}:x))}
                        style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 14px",borderBottom:i<notifs.length-1?"1px solid #F5F0E8":"none",background:n.read?"#fff":"#FFFBEA",cursor:"pointer"}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:n.read?"#d4cfc4":n.dot,flexShrink:0,marginTop:4,border:n.read?"none":"1.5px solid #111110"}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:n.read?500:700,color:"#111110",lineHeight:1.4}}>{n.text}</div>
                          <div style={{fontSize:10,color:"#9B8F7A",marginTop:2}}>{n.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Avatar */}
              {profile && (
                <Link href="/dashboard/profile">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{width:34,height:34,borderRadius:"50%",objectFit:"cover",border:"2px solid #111110",cursor:"pointer"}}/>
                    : <div style={{width:34,height:34,borderRadius:"50%",background:"#FFD400",border:"2px solid #111110",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#111110",cursor:"pointer"}}>
                        {profile.full_name?.[0]?.toUpperCase()||"A"}
                      </div>
                  }
                </Link>
              )}

              {/* New CTA */}
              <Link href="/dashboard/artworks/new" style={{textDecoration:"none"}} className="hidden sm:block">
                <button style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",border:"2px solid #111110",background:"#111110",color:"#FFD400",fontWeight:800,fontSize:12,cursor:"pointer",boxShadow:"2px 2px 0 #FFD400"}}>
                  <Plus size={13} strokeWidth={3}/> New
                </button>
              </Link>
            </div>
          </header>

          {/* Content */}
          <main style={{flex:1,overflowY:"auto"}}>
            <div style={{maxWidth:1280,margin:"0 auto",padding:"24px 20px"}}>
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer style={{flexShrink:0,borderTop:"2px solid #111110",background:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 20px"}}>
            <span style={{fontSize:10,fontWeight:700,color:"#9B8F7A",textTransform:"uppercase",letterSpacing:"0.1em"}}>Artfolio ✦</span>
            <span style={{fontSize:10,fontWeight:700,color:"#d4cfc4"}}>© 2026</span>
          </footer>
        </div>
      </div>
    </>
  );
}
