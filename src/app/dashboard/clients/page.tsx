"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Plus, Search, X, Users, TrendingUp,
  Mail, Phone, Edit2, Trash2,
  ChevronRight, Crown, DollarSign, ShoppingBag,
  Clock, Check, MoreHorizontal, ArrowUpRight,
  Sparkles, UserPlus, LayoutGrid, List,
  ArrowUpDown, ChevronUp, ChevronDown,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────
type ClientStatus = "active" | "vip" | "inactive";
type Client = {
  id: string; name: string; email?: string; phone?: string;
  total_spent: number; purchases: number; status: ClientStatus;
  notes?: string; last_purchase?: string; user_id?: string;
  artworks_bought?: { id: string; title: string; image?: string; price: number; date: string }[];
};
type Sale = {
  id: string; buyer_name?: string; buyer_email?: string;
  sale_price: number; sale_date?: string; status: string;
  artwork_id?: string; artwork_title?: string; artwork_image?: string;
};
type SortDir = "asc" | "desc";

// ── Config ────────────────────────────────────────────────────────
const STATUS_CFG: Record<ClientStatus, { label: string; color: string; bg: string; border: string }> = {
  active:   { label:"Active",   color:"#16A34A", bg:"#DCFCE7", border:"#86EFAC" },
  vip:      { label:"VIP",      color:"#CA8A04", bg:"#FEF9C3", border:"#FDE047" },
  inactive: { label:"Inactive", color:"#9B8F7A", bg:"#F5F0E8", border:"#E8E0D0" },
};

// ── Shared table CSS values ───────────────────────────────────────
const TH: React.CSSProperties = { padding:"11px 14px", textAlign:"left", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:".13em", background:"#F5F0E8", borderBottom:"2px solid #E8E0D0", whiteSpace:"nowrap", userSelect:"none", cursor:"pointer" };
const TD: React.CSSProperties = { padding:"12px 14px", fontSize:13, fontWeight:600, color:"#111110", borderBottom:"1px solid #F0EAE0", verticalAlign:"middle" };
const LBL: React.CSSProperties = { display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:".14em", marginBottom:6 };
const INP: React.CSSProperties = { width:"100%", padding:"10px 13px", border:"2px solid #E8E0D0", borderRadius:12, fontSize:13, fontFamily:"inherit", fontWeight:600, color:"#111110", background:"#fff", outline:"none", transition:"border-color .15s", boxSizing:"border-box" };

function fmtMoney(n: number) { if (!n) return "$0"; if (n >= 1000) return `$${(n/1000).toFixed(n%1000===0?0:1)}k`; return `$${n.toLocaleString()}`; }
function fmtDate(d?: string | null) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }
function initials(name: string) { return name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(); }
function avatarColor(name: string) {
  const cols=["#FFD400","#95E1D3","#F38181","#A8E6CF","#FFD3B6","#C7CEEA","#FFDAC1"]; let h=0;
  for(const c of name) h=(h*31+c.charCodeAt(0))%cols.length; return cols[h];
}

function StatusPill({ status }: { status: ClientStatus }) {
  const cfg = STATUS_CFG[status]||STATUS_CFG.active;
  return <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:99, background:cfg.bg, border:`1.5px solid ${cfg.border}`, fontSize:10, fontWeight:800, color:cfg.color, textTransform:"uppercase", letterSpacing:".1em", whiteSpace:"nowrap" }}>{status==="vip"&&<Crown size={9}/>}{cfg.label}</span>;
}

function SortTh({ label, col, sortCol, sortDir, onSort }: { label:string; col:string; sortCol:string; sortDir:SortDir; onSort:(c:string)=>void }) {
  const active = sortCol===col;
  return <th onClick={()=>onSort(col)} style={{...TH, color:active?"#111110":"#9B8F7A"}}>
    <span style={{display:"flex",alignItems:"center",gap:4}}>{label}{active ? sortDir==="asc"?<ChevronUp size={11} color="#FFD400"/>:<ChevronDown size={11} color="#FFD400"/> : <ArrowUpDown size={10} color="#D4C9A8"/>}</span>
  </th>;
}

// ── Client Detail Modal ───────────────────────────────────────────
function ClientModal({ client, onClose, onEdit, onDelete }: { client:Client; onClose:()=>void; onEdit:()=>void; onDelete:()=>void }) {
  const cfg = STATUS_CFG[client.status]||STATUS_CFG.active;
  const avg = client.purchases>0 ? client.total_spent/client.purchases : 0;
  return (
    <div style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(17,17,16,0.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#FFFBEA",border:"2.5px solid #111110",borderRadius:24,boxShadow:"8px 8px 0 #111110",width:"100%",maxWidth:540,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{height:110,borderRadius:"22px 22px 0 0",background:`linear-gradient(135deg,#111110 0%,#2D2B29 60%,${cfg.bg} 100%)`,position:"relative",display:"flex",alignItems:"flex-end",padding:"0 24px 20px"}}>
          <div style={{display:"flex",alignItems:"flex-end",gap:13,flex:1}}>
            <div style={{width:52,height:52,borderRadius:14,background:avatarColor(client.name),border:"3px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:"#111110",flexShrink:0}}>{initials(client.name)}</div>
            <div><h2 style={{fontSize:19,fontWeight:900,color:"#fff",letterSpacing:"-.4px",margin:"0 0 5px"}}>{client.name}</h2><StatusPill status={client.status}/></div>
          </div>
          <button onClick={onClose} style={{position:"absolute",top:12,right:12,width:30,height:30,borderRadius:9,background:"rgba(255,255,255,0.15)",border:"1.5px solid rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={14} color="#fff"/></button>
        </div>
        <div style={{padding:"20px 22px 24px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:18}}>
            {[{label:"Total Spent",value:fmtMoney(client.total_spent),color:"#16A34A"},{label:"Purchases",value:client.purchases,color:"#8B5CF6"},{label:"Avg. Spend",value:fmtMoney(avg),color:"#CA8A04"}].map(s=>(
              <div key={s.label} style={{background:"#F5F0E8",border:"1.5px solid #E8E0D0",borderRadius:12,padding:"11px 13px"}}>
                <div style={{fontSize:17,fontWeight:900,color:s.color,fontFamily:"monospace"}}>{s.value}</div>
                <div style={{fontSize:10,fontWeight:700,color:"#9B8F7A",marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16}}>
            {client.email&&<a href={`mailto:${client.email}`} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 13px",background:"#fff",border:"1.5px solid #E8E0D0",borderRadius:11,textDecoration:"none"}} onMouseEnter={e=>(e.currentTarget.style.borderColor="#111110")} onMouseLeave={e=>(e.currentTarget.style.borderColor="#E8E0D0")}>
              <div style={{width:26,height:26,borderRadius:7,background:"#E0F2FE",display:"flex",alignItems:"center",justifyContent:"center"}}><Mail size={12} color="#0EA5E9"/></div>
              <div style={{flex:1}}><div style={{fontSize:10,fontWeight:700,color:"#9B8F7A"}}>Email</div><div style={{fontSize:13,fontWeight:700,color:"#111110"}}>{client.email}</div></div>
              <ArrowUpRight size={12} color="#9B8F7A"/>
            </a>}
            {client.phone&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 13px",background:"#fff",border:"1.5px solid #E8E0D0",borderRadius:11}}>
              <div style={{width:26,height:26,borderRadius:7,background:"#DCFCE7",display:"flex",alignItems:"center",justifyContent:"center"}}><Phone size={12} color="#16A34A"/></div>
              <div><div style={{fontSize:10,fontWeight:700,color:"#9B8F7A"}}>Phone</div><div style={{fontSize:13,fontWeight:700,color:"#111110"}}>{client.phone}</div></div>
            </div>}
            {client.last_purchase&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 13px",background:"#fff",border:"1.5px solid #E8E0D0",borderRadius:11}}>
              <div style={{width:26,height:26,borderRadius:7,background:"#FEF9C3",display:"flex",alignItems:"center",justifyContent:"center"}}><Clock size={12} color="#CA8A04"/></div>
              <div><div style={{fontSize:10,fontWeight:700,color:"#9B8F7A"}}>Last Purchase</div><div style={{fontSize:13,fontWeight:700,color:"#111110"}}>{fmtDate(client.last_purchase)}</div></div>
            </div>}
          </div>
          {(client.artworks_bought||[]).length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:800,color:"#9B8F7A",textTransform:"uppercase",letterSpacing:".13em",marginBottom:8}}>Purchase History</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {(client.artworks_bought||[]).map((aw,i)=>(
                  <Link key={i} href={`/dashboard/artworks/${aw.id}`} style={{textDecoration:"none"}}>
                    <div style={{display:"flex",alignItems:"center",gap:9,padding:"8px 11px",background:"#F5F0E8",border:"1.5px solid #E8E0D0",borderRadius:10,transition:"border-color .15s"}} onMouseEnter={e=>(e.currentTarget.style.borderColor="#111110")} onMouseLeave={e=>(e.currentTarget.style.borderColor="#E8E0D0")}>
                      {aw.image?<img src={aw.image} alt="" style={{width:34,height:34,objectFit:"cover",borderRadius:7,border:"1.5px solid #E8E0D0",flexShrink:0}}/>:<div style={{width:34,height:34,borderRadius:7,background:"#E8E0D0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ShoppingBag size={13} color="#9B8F7A"/></div>}
                      <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:800,color:"#111110",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{aw.title}</div><div style={{fontSize:10,color:"#9B8F7A",fontWeight:600}}>{fmtDate(aw.date)}</div></div>
                      <div style={{fontSize:13,fontWeight:900,color:"#16A34A",fontFamily:"monospace"}}>${aw.price.toLocaleString()}</div>
                      <ChevronRight size={12} color="#C0B8A8"/>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {client.notes&&<div style={{padding:"11px 13px",background:"#FFFBEA",border:"1.5px solid #E8E0D0",borderRadius:11,marginBottom:16}}><div style={{fontSize:10,fontWeight:800,color:"#9B8F7A",textTransform:"uppercase",letterSpacing:".12em",marginBottom:5}}>Notes</div><p style={{fontSize:13,color:"#5C5346",fontWeight:500,lineHeight:1.6,margin:0}}>{client.notes}</p></div>}
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{onClose();onEdit();}} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"11px",background:"#FFD400",border:"2.5px solid #111110",borderRadius:12,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",color:"#111110",boxShadow:"3px 3px 0 #111110"}}><Edit2 size={13}/> Edit</button>
            {client.email&&<a href={`mailto:${client.email}`} style={{textDecoration:"none"}}><button style={{padding:"11px 14px",background:"#fff",border:"2px solid #E8E0D0",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",color:"#111110",display:"flex",alignItems:"center",gap:5}}><Mail size={13}/> Email</button></a>}
            <button onClick={()=>{if(confirm("Delete this client?")){onDelete();onClose();}}} style={{padding:"11px 14px",background:"#fff",border:"2px solid #EF4444",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",color:"#EF4444",display:"flex",alignItems:"center",gap:5}}><Trash2 size={13}/></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Client Form Modal ─────────────────────────────────────────────
function ClientFormModal({ existing, allArtworks, salesBuyers, onClose, onSaved }: {
  existing?: Client;
  allArtworks: { id:string; title:string; images?:string[]; price?:number }[];
  salesBuyers: { name:string; email:string }[];
  onClose:()=>void; onSaved:()=>void;
}) {
  const sb = createClient();
  const isEdit = !!existing;
  const [form, setForm] = useState({ name:existing?.name||"", email:existing?.email||"", phone:existing?.phone||"", status:(existing?.status||"active") as ClientStatus, notes:existing?.notes||"", total_spent:existing?.total_spent??0, purchases:existing?.purchases??0 });
  const [newP, setNewP] = useState({ artwork_id:"", price:"", date:new Date().toISOString().split("T")[0] });
  const [addingP, setAddingP] = useState(false);
  const [purchaseList, setPurchaseList] = useState<{artwork_id:string;title:string;price:number;date:string}[]>([]);
  const [saving, setSaving] = useState(false);
  const sf = (k:string) => (e:React.ChangeEvent<any>) => setForm(p=>({...p,[k]:e.target.value}));

  function addPurchase() {
    if(!newP.artwork_id||!newP.price) return;
    const aw = allArtworks.find(a=>a.id===newP.artwork_id); if(!aw) return;
    const purchase = {artwork_id:newP.artwork_id,title:aw.title,price:parseFloat(newP.price),date:newP.date};
    setPurchaseList(p=>[...p,purchase]);
    setForm(p=>({...p,total_spent:p.total_spent+purchase.price,purchases:p.purchases+1}));
    setNewP({artwork_id:"",price:"",date:new Date().toISOString().split("T")[0]});
    setAddingP(false);
  }
  function removePurchase(i:number) {
    const p=purchaseList[i];
    setForm(prev=>({...prev,total_spent:Math.max(0,prev.total_spent-p.price),purchases:Math.max(0,prev.purchases-1)}));
    setPurchaseList(prev=>prev.filter((_,j)=>j!==i));
  }

  async function handleSave(e:React.FormEvent) {
    e.preventDefault(); if(!form.name.trim()) return;
    setSaving(true);
    const {data:{user}} = await sb.auth.getUser(); if(!user){setSaving(false);return;}
    const lastDate = purchaseList.length>0 ? purchaseList.sort((a,b)=>b.date.localeCompare(a.date))[0].date : existing?.last_purchase||null;
    const payload:any = {name:form.name.trim(),email:form.email.trim()||null,phone:form.phone.trim()||null,status:form.status,notes:form.notes.trim()||null,total_spent:Number(form.total_spent)||0,purchases:Number(form.purchases)||0,last_purchase:lastDate};
    if(isEdit&&existing){ await sb.from("clients").update(payload).eq("id",existing.id); }
    else { await sb.from("clients").insert({...payload,user_id:user.id}); }
    for(const p of purchaseList) {
      await sb.from("sales").insert({user_id:user.id,artwork_id:p.artwork_id,buyer_name:form.name.trim(),buyer_email:form.email.trim()||null,sale_price:p.price,sale_date:p.date,status:"Completed",payment_method:"Direct"});
      await sb.from("artworks").update({status:"Sold"}).eq("id",p.artwork_id);
    }
    setSaving(false); onSaved(); onClose();
  }

  return (
    <div style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(17,17,16,0.8)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#FFFBEA",border:"2.5px solid #111110",borderRadius:24,boxShadow:"8px 8px 0 #111110",width:"100%",maxWidth:500,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"17px 22px 13px",borderBottom:"2px solid #E8E0D0",background:isEdit?"#FFD400":"#111110",borderRadius:"22px 22px 0 0"}}>
          <h2 style={{fontSize:17,fontWeight:900,color:isEdit?"#111110":"#FFD400",margin:0}}>{isEdit?`Edit: ${existing?.name}`:"New Client"}</h2>
          <button onClick={onClose} style={{width:28,height:28,borderRadius:8,background:isEdit?"rgba(17,17,16,0.15)":"rgba(255,255,255,0.1)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={14} color={isEdit?"#111110":"#FFD400"}/></button>
        </div>
        <form onSubmit={handleSave} style={{padding:"18px 22px 22px"}}>
          {!isEdit&&salesBuyers.length>0&&(
            <div style={{marginBottom:14,padding:"10px 13px",background:"#F0FDF4",border:"1.5px solid #86EFAC",borderRadius:12}}>
              <div style={{fontSize:10,fontWeight:800,color:"#16A34A",textTransform:"uppercase",letterSpacing:".12em",marginBottom:7,display:"flex",alignItems:"center",gap:4}}><Sparkles size={10}/> Import from sales</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {salesBuyers.slice(0,4).map((b,i)=>(
                  <button key={i} type="button" onClick={()=>setForm(p=>({...p,name:b.name,email:b.email}))} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",background:"#fff",border:"1.5px solid #86EFAC",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,color:"#16A34A"}}>
                    <div style={{width:20,height:20,borderRadius:5,background:avatarColor(b.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900,color:"#111110"}}>{initials(b.name)}</div>
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{marginBottom:12}}><label style={LBL}>Full Name *</label><input required style={INP} value={form.name} onChange={sf("name")} placeholder="Collector or buyer name…" onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={LBL}>Email</label><input type="email" style={INP} value={form.email} onChange={sf("email")} placeholder="email@…" onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
            <div><label style={LBL}>Phone</label><input type="tel" style={INP} value={form.phone} onChange={sf("phone")} placeholder="+1 555…" onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={LBL}>Status</label>
            <div style={{display:"flex",gap:7}}>
              {(["active","vip","inactive"] as ClientStatus[]).map(s=>{
                const cfg=STATUS_CFG[s]; const sel=form.status===s;
                return <button key={s} type="button" onClick={()=>setForm(p=>({...p,status:s}))} style={{flex:1,padding:"8px 0",border:`2px solid ${sel?"#111110":"#E8E0D0"}`,borderRadius:10,background:sel?cfg.bg:"#fff",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",color:sel?cfg.color:"#9B8F7A",boxShadow:sel?"2px 2px 0 #111110":"none",transition:"all .14s"}}>{s==="vip"&&"👑 "}{cfg.label}</button>;
              })}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={LBL}>Total Spent ($)</label><input type="number" min="0" style={INP} value={form.total_spent} onChange={sf("total_spent")} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
            <div><label style={LBL}>Purchases (#)</label><input type="number" min="0" style={INP} value={form.purchases} onChange={sf("purchases")} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
          </div>

          {/* ── Add Purchases ── */}
          <div style={{marginBottom:14,padding:"12px 14px",background:"#F5F0E8",border:"1.5px solid #E8E0D0",borderRadius:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:purchaseList.length>0||addingP?10:0}}>
              <div style={{fontSize:10,fontWeight:800,color:"#9B8F7A",textTransform:"uppercase",letterSpacing:".13em"}}>Link Artwork Purchases</div>
              <button type="button" onClick={()=>setAddingP(p=>!p)} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",background:addingP?"#111110":"#fff",border:`1.5px solid ${addingP?"#111110":"#E8E0D0"}`,borderRadius:8,fontSize:11,fontWeight:800,color:addingP?"#FFD400":"#9B8F7A",cursor:"pointer",fontFamily:"inherit"}}><Plus size={11} strokeWidth={3}/> Add</button>
            </div>
            {purchaseList.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"#fff",border:"1.5px solid #E8E0D0",borderRadius:9,marginBottom:6}}>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:800,color:"#111110",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</div><div style={{fontSize:10,color:"#9B8F7A"}}>{fmtDate(p.date)}</div></div>
                <div style={{fontSize:13,fontWeight:900,color:"#16A34A",fontFamily:"monospace"}}>${p.price.toLocaleString()}</div>
                <button type="button" onClick={()=>removePurchase(i)} style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",padding:2,display:"flex"}}><X size={12}/></button>
              </div>
            ))}
            {addingP&&(
              <div style={{display:"flex",flexDirection:"column",gap:7,padding:"10px",background:"#fff",border:"1.5px solid #E8E0D0",borderRadius:10}}>
                <select value={newP.artwork_id} onChange={e=>{const aw=allArtworks.find(a=>a.id===e.target.value);setNewP(p=>({...p,artwork_id:e.target.value,price:String(aw?.price||"")}));}} style={{...INP,padding:"8px 11px"}}>
                  <option value="">Select artwork…</option>
                  {allArtworks.map(a=><option key={a.id} value={a.id}>{a.title}{a.price?` — $${a.price}`:""}</option>)}
                </select>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <input type="number" min="0" placeholder="Price ($)" value={newP.price} onChange={e=>setNewP(p=>({...p,price:e.target.value}))} style={{...INP,padding:"8px 11px"}}/>
                  <input type="date" value={newP.date} onChange={e=>setNewP(p=>({...p,date:e.target.value}))} style={{...INP,padding:"8px 11px"}}/>
                </div>
                <button type="button" onClick={addPurchase} disabled={!newP.artwork_id||!newP.price} style={{padding:"8px",background:newP.artwork_id&&newP.price?"#FFD400":"#F5F0E8",border:`2px solid ${newP.artwork_id&&newP.price?"#111110":"#E8E0D0"}`,borderRadius:9,fontSize:12,fontWeight:800,cursor:newP.artwork_id&&newP.price?"pointer":"not-allowed",fontFamily:"inherit",color:"#111110"}}>✓ Add this purchase</button>
              </div>
            )}
          </div>

          <div style={{marginBottom:20}}><label style={LBL}>Notes</label><textarea rows={3} style={{...INP,resize:"vertical",minHeight:72}} value={form.notes} onChange={sf("notes")} placeholder="Preferences, relationship notes, follow-up reminders…" onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
          <div style={{display:"flex",gap:9}}>
            <button type="button" onClick={onClose} style={{flex:1,padding:"12px",border:"2px solid #E8E0D0",borderRadius:12,background:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",color:"#9B8F7A"}}>Cancel</button>
            <button type="submit" disabled={saving||!form.name.trim()} style={{flex:2,padding:"12px",border:"2.5px solid #111110",borderRadius:12,background:saving?"#F5F0E8":"#FFD400",fontSize:14,fontWeight:800,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",color:"#111110",boxShadow:saving?"none":"3px 3px 0 #111110"}}>{saving?"Saving…":isEdit?"Save Changes ✓":"Add Client ✓"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Client Card (grid) ────────────────────────────────────────────
function ClientCard({ client, onClick }: { client:Client; onClick:()=>void }) {
  const [hov, setHov] = useState(false);
  const cfg = STATUS_CFG[client.status]||STATUS_CFG.active;
  const isVip = client.status==="vip";
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onClick}
      style={{background:"#fff",border:`2.5px solid ${hov?"#111110":"#E8E0D0"}`,borderRadius:20,overflow:"hidden",cursor:"pointer",boxShadow:hov?"5px 6px 0 #111110":"3px 4px 0 #D4C9A8",transform:hov?"translate(-2px,-3px)":"none",transition:"all .25s cubic-bezier(.16,1,.3,1)"}}>
      <div style={{height:100,background:isVip?"linear-gradient(135deg,#713F12,#CA8A04,#FDE047)":client.status==="inactive"?"linear-gradient(135deg,#292524,#57534E)":"linear-gradient(135deg,#14532D,#16A34A,#4ADE80)",position:"relative"}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 20%,rgba(0,0,0,0.45) 100%)"}}/>
        {isVip&&<div style={{position:"absolute",top:9,left:11,display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:99,background:"rgba(255,255,255,0.15)",border:"1.5px solid rgba(255,255,255,0.3)",backdropFilter:"blur(8px)",fontSize:9,fontWeight:900,color:"#fff",textTransform:"uppercase"}}><Crown size={9}/> VIP</div>}
        {client.purchases>0&&<div style={{position:"absolute",top:9,right:11,display:"inline-flex",alignItems:"center",gap:3,padding:"3px 8px",borderRadius:99,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",fontSize:9,fontWeight:800,color:"#fff"}}><ShoppingBag size={8}/> {client.purchases}</div>}
        <div style={{position:"absolute",bottom:9,left:11,right:11,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:28,height:28,borderRadius:9,background:avatarColor(client.name),border:"2px solid rgba(255,255,255,0.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:"#111110",flexShrink:0}}>{initials(client.name)}</div>
          <div style={{fontSize:13,fontWeight:900,color:"#fff",textShadow:"0 1px 4px rgba(0,0,0,0.4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{client.name}</div>
        </div>
      </div>
      <div style={{padding:"11px 13px 13px"}}>
        <div style={{fontSize:20,fontWeight:900,color:"#111110",fontFamily:"monospace",letterSpacing:"-.4px"}}>{fmtMoney(client.total_spent)}</div>
        <div style={{fontSize:10,fontWeight:700,color:"#9B8F7A",marginBottom:8}}>total spent</div>
        {client.email&&<div style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:99,background:"#E0F2FE",fontSize:10,fontWeight:700,color:"#0EA5E9",marginBottom:8,maxWidth:"100%",overflow:"hidden"}}><Mail size={9}/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{client.email}</span></div>}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid #F5F0E8"}}><StatusPill status={client.status}/><ChevronRight size={14} color="#C0B8A8"/></div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const sb = createClient();
  const [clients, setClients]       = useState<Client[]>([]);
  const [sales, setSales]           = useState<Sale[]>([]);
  const [allArtworks, setAllArtworks] = useState<{id:string;title:string;images?:string[];price?:number}[]>([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState<"table"|"grid">("table");
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState<"all"|ClientStatus>("all");
  const [sortCol, setSortCol]       = useState("total_spent");
  const [sortDir, setSortDir]       = useState<SortDir>("desc");
  const [showForm, setShowForm]     = useState(false);
  const [editingClient, setEditingClient] = useState<Client|undefined>(undefined);
  const [selectedClient, setSelectedClient] = useState<Client|null>(null);
  const [showImport, setShowImport] = useState(false);
  const [rowMenu, setRowMenu]       = useState<string|null>(null);

  useEffect(()=>{load();},[]);

  async function load() {
    setLoading(true);
    const {data:{user}} = await sb.auth.getUser(); if(!user){setLoading(false);return;}
    const [{data:cd},{data:sd},{data:ad}] = await Promise.all([
      sb.from("clients").select("*").eq("user_id",user.id).order("created_at",{ascending:false}),
      sb.from("sales").select("*, artworks(id,title,images)").eq("user_id",user.id).order("sale_date",{ascending:false}),
      sb.from("artworks").select("id,title,images,price").eq("user_id",user.id).not("status","eq","Sold"),
    ]);
    const rawSales:Sale[] = (sd||[]).map((s:any)=>({...s,artwork_id:s.artworks?.id,artwork_title:s.artworks?.title,artwork_image:s.artworks?.images?.[0]||null}));
    setSales(rawSales); setAllArtworks(ad||[]);
    const enriched:Client[] = (cd||[]).map((c:any)=>{
      const cs=rawSales.filter(s=>(s.buyer_email&&c.email&&s.buyer_email.toLowerCase()===c.email.toLowerCase())||s.buyer_name?.toLowerCase()===c.name.toLowerCase());
      return {...c,artworks_bought:cs.filter(s=>s.artwork_title).map(s=>({id:s.artwork_id||"",title:s.artwork_title!,image:s.artwork_image,price:s.sale_price,date:s.sale_date||""}))};
    });
    setClients(enriched); setLoading(false);
  }

  async function handleDelete(id:string) { await sb.from("clients").delete().eq("id",id); setClients(p=>p.filter(c=>c.id!==id)); }

  async function importBuyer(b:{name:string;email:string}) {
    const {data:{user}}=await sb.auth.getUser(); if(!user) return;
    const bs=sales.filter(s=>s.buyer_name===b.name||(b.email&&s.buyer_email===b.email));
    await sb.from("clients").insert({user_id:user.id,name:b.name,email:b.email||null,status:"active",total_spent:bs.reduce((s,x)=>s+x.sale_price,0),purchases:bs.length,last_purchase:bs[0]?.sale_date||null});
    load();
  }

  function onSort(col:string) { if(sortCol===col) setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortCol(col);setSortDir("desc");} }

  const salesBuyers = Array.from(new Map(
    sales.filter(s=>s.buyer_name).filter(s=>!clients.some(c=>(s.buyer_email&&c.email&&s.buyer_email.toLowerCase()===c.email?.toLowerCase())||s.buyer_name?.toLowerCase()===c.name.toLowerCase()))
    .map(s=>[s.buyer_email||s.buyer_name,{name:s.buyer_name!,email:s.buyer_email||""}])
  ).values());

  const totalRev=clients.reduce((s,c)=>s+c.total_spent,0);
  const vipCount=clients.filter(c=>c.status==="vip").length;
  const avgSpend=clients.length?totalRev/clients.length:0;

  const filtered = clients
    .filter(c=>{
      if(statusFilter!=="all"&&c.status!==statusFilter) return false;
      if(search){const q=search.toLowerCase();return c.name.toLowerCase().includes(q)||c.email?.toLowerCase().includes(q)||c.phone?.includes(q);}
      return true;
    })
    .sort((a,b)=>{
      let av:any=(a as any)[sortCol]??""; let bv:any=(b as any)[sortCol]??"";
      const cmp=typeof av==="number"?av-bv:String(av).localeCompare(String(bv));
      return sortDir==="asc"?cmp:-cmp;
    });

  return (
    <>
      <style>{CSS}</style>

      {/* HEADER */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:3}}>
            <div style={{width:32,height:32,borderRadius:10,background:"#FFD400",border:"2.5px solid #111110",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"2px 2px 0 #111110"}}><Users size={16} color="#111110"/></div>
            <h1 style={{fontSize:24,fontWeight:900,color:"#111110",letterSpacing:"-.6px",margin:0}}>Clients</h1>
          </div>
          <p style={{fontSize:13,fontWeight:600,color:"#9B8F7A",margin:0}}>{clients.length} collectors · {fmtMoney(totalRev)} revenue · {vipCount} VIP</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {salesBuyers.length>0&&<button onClick={()=>setShowImport(p=>!p)} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 14px",border:"2px solid #86EFAC",borderRadius:12,background:"#DCFCE7",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",color:"#16A34A"}}><Sparkles size={13}/> Import ({salesBuyers.length})</button>}
          <button onClick={()=>{setEditingClient(undefined);setShowForm(true);}} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",background:"#FFD400",border:"2.5px solid #111110",borderRadius:12,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",color:"#111110",boxShadow:"3px 3px 0 #111110",transition:"all .15s"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.boxShadow="5px 5px 0 #111110";(e.currentTarget as HTMLElement).style.transform="translate(-1px,-1px)";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.boxShadow="3px 3px 0 #111110";(e.currentTarget as HTMLElement).style.transform="none";}}>
            <Plus size={14} strokeWidth={3}/> Add Client
          </button>
        </div>
      </div>

      {/* IMPORT PANEL */}
      {showImport&&salesBuyers.length>0&&(
        <div style={{background:"#F0FDF4",border:"2px solid #86EFAC",borderRadius:16,padding:"14px 18px",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:800,color:"#16A34A",display:"flex",alignItems:"center",gap:5}}><Sparkles size={12}/> Buyers from sales not yet in CRM</div>
            <button onClick={()=>setShowImport(false)} style={{background:"none",border:"none",cursor:"pointer",color:"#9B8F7A"}}><X size={13}/></button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {salesBuyers.map((b,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 11px",background:"#fff",border:"1.5px solid #86EFAC",borderRadius:10}}>
                <div style={{width:24,height:24,borderRadius:7,background:avatarColor(b.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"#111110"}}>{initials(b.name)}</div>
                <div><div style={{fontSize:12,fontWeight:800,color:"#111110"}}>{b.name}</div>{b.email&&<div style={{fontSize:10,color:"#9B8F7A"}}>{b.email}</div>}</div>
                <button onClick={()=>importBuyer(b)} style={{display:"flex",alignItems:"center",gap:3,padding:"3px 9px",background:"#16A34A",border:"none",borderRadius:7,fontSize:10,fontWeight:800,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}><UserPlus size={10}/> Add</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STAT CARDS */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"Total Clients",value:clients.length,color:"#8B5CF6",bg:"#EDE9FE",grad:"135deg,#4C1D95,#7C3AED"},
          {label:"Total Revenue",value:fmtMoney(totalRev),color:"#16A34A",bg:"#DCFCE7",grad:"135deg,#14532D,#16A34A"},
          {label:"VIP Clients",  value:vipCount,color:"#CA8A04",bg:"#FEF9C3",grad:"135deg,#713F12,#CA8A04"},
          {label:"Avg. Spend",   value:fmtMoney(avgSpend),color:"#0EA5E9",bg:"#E0F2FE",grad:"135deg,#0C4A6E,#0EA5E9"},
        ].map(s=>(
          <div key={s.label} style={{background:"#fff",border:"2px solid #E8E0D0",borderRadius:16,overflow:"hidden",boxShadow:"2px 3px 0 #E0D8CA"}}>
            <div style={{height:4,background:`linear-gradient(${s.grad})`}}/>
            <div style={{padding:"13px 15px"}}>
              <div style={{fontSize:20,fontWeight:900,color:"#111110",fontFamily:"monospace",letterSpacing:"-.4px"}}>{s.value}</div>
              <div style={{fontSize:10,fontWeight:700,color:"#9B8F7A",marginTop:2}}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <div className="cl-search">
          <Search size={13} color="#9B8F7A"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients…" className="cl-search-input"/>
          {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:"#9B8F7A",display:"flex",padding:0}}><X size={12}/></button>}
        </div>
        {(["all","active","vip","inactive"] as const).map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)} className={`cl-filter-btn${statusFilter===s?" active":""}`}>
            {s==="vip"&&<Crown size={10}/>}
            {s==="all"?"All":STATUS_CFG[s as ClientStatus]?.label}
            <span className="cl-filter-count">({s==="all"?clients.length:clients.filter(c=>c.status===s).length})</span>
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",border:"2px solid #111110",borderRadius:11,overflow:"hidden"}}>
          <button onClick={()=>setView("table")} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",border:"none",background:view==="table"?"#111110":"#fff",color:view==="table"?"#FFD400":"#9B8F7A",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:"pointer"}}><List size={13}/> Table</button>
          <button onClick={()=>setView("grid")} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",border:"none",borderLeft:"1px solid #E8E0D0",background:view==="grid"?"#111110":"#fff",color:view==="grid"?"#FFD400":"#9B8F7A",fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:"pointer"}}><LayoutGrid size={13}/> Grid</button>
        </div>
      </div>

      {/* TABLE VIEW */}
      {view==="table"&&(
        <div className="ripe-table-wrap">
          {loading?(<div style={{padding:48,textAlign:"center",color:"#9B8F7A"}}>Loading…</div>)
          :filtered.length===0?(<div style={{padding:"60px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>👥</div><div style={{fontSize:16,fontWeight:800,color:"#111110",marginBottom:6}}>{search||statusFilter!=="all"?"No clients match filters":"No clients yet"}</div><div style={{fontSize:13,color:"#9B8F7A",marginBottom:20}}>Add clients manually or import from sales</div><button onClick={()=>{setEditingClient(undefined);setShowForm(true);}} style={{padding:"10px 20px",background:"#FFD400",border:"2.5px solid #111110",borderRadius:12,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",color:"#111110",boxShadow:"3px 3px 0 #111110"}}>+ Add Client</button></div>)
          :(<table className="ripe-table">
            <thead><tr>
              <SortTh label="Name"          col="name"          sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
              <th style={TH}>Contact</th>
              <SortTh label="Total Spent"   col="total_spent"   sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
              <SortTh label="Purchases"     col="purchases"     sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
              <SortTh label="Last Purchase" col="last_purchase" sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
              <th style={TH}>Status</th>
              <th style={{...TH,width:44,cursor:"default"}}></th>
            </tr></thead>
            <tbody>
              {filtered.map(c=>(
                <tr key={c.id} className="ripe-row" onClick={()=>setSelectedClient(c)}>
                  <td style={TD}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <div style={{width:32,height:32,borderRadius:10,background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#111110",flexShrink:0,border:"1.5px solid rgba(0,0,0,0.08)"}}>{initials(c.name)}</div>
                      <div><div style={{fontWeight:800,color:"#111110"}}>{c.name}</div>{c.notes&&<div style={{fontSize:11,color:"#9B8F7A",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:180}}>{c.notes}</div>}</div>
                    </div>
                  </td>
                  <td style={TD}>
                    <div style={{display:"flex",flexDirection:"column",gap:2}}>
                      {c.email&&<a href={`mailto:${c.email}`} onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"#0EA5E9",fontWeight:600,textDecoration:"none"}}><Mail size={11}/>{c.email}</a>}
                      {c.phone&&<span style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"#9B8F7A",fontWeight:600}}><Phone size={11}/>{c.phone}</span>}
                      {!c.email&&!c.phone&&<span style={{color:"#D4C9A8"}}>—</span>}
                    </div>
                  </td>
                  <td style={{...TD,fontFamily:"monospace",fontSize:15,fontWeight:900,color:c.total_spent>0?"#111110":"#D4C9A8"}}>{c.total_spent>0?`$${c.total_spent.toLocaleString()}`:"—"}</td>
                  <td style={{...TD,textAlign:"center"}}>{c.purchases>0?<span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:99,background:"#EDE9FE",fontSize:12,fontWeight:800,color:"#7C3AED"}}><ShoppingBag size={10}/>{c.purchases}</span>:<span style={{color:"#D4C9A8"}}>—</span>}</td>
                  <td style={{...TD,fontSize:12,color:"#9B8F7A"}}>{fmtDate(c.last_purchase)}</td>
                  <td style={TD}><StatusPill status={c.status}/></td>
                  <td style={{...TD,padding:"12px 10px"}} onClick={e=>e.stopPropagation()}>
                    <div style={{position:"relative"}}>
                      <button onClick={()=>setRowMenu(rowMenu===c.id?null:c.id)} className="ripe-menu-btn"><MoreHorizontal size={14} color="#9B8F7A"/></button>
                      {rowMenu===c.id&&(
                        <div className="ripe-dropdown">
                          {[{label:"View",icon:ChevronRight,fn:()=>{setSelectedClient(c);setRowMenu(null);}},{label:"Edit",icon:Edit2,fn:()=>{setEditingClient(c);setShowForm(true);setRowMenu(null);}},{label:"Delete",icon:Trash2,fn:()=>{if(confirm("Delete?"))handleDelete(c.id);setRowMenu(null);},danger:true}].map(item=>(
                            <button key={item.label} onClick={item.fn} className={`ripe-dropdown-item${(item as any).danger?" danger":""}`}><item.icon size={12}/> {item.label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>)}
        </div>
      )}

      {/* GRID VIEW */}
      {view==="grid"&&(loading?<div style={{textAlign:"center",padding:60,color:"#9B8F7A"}}>Loading…</div>:
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
          {filtered.map((c,i)=>(
            <div key={c.id} style={{animation:`fadeUp .3s cubic-bezier(.16,1,.3,1) ${Math.min(i*0.04,0.3)}s both`}}>
              <ClientCard client={c} onClick={()=>setSelectedClient(c)}/>
            </div>
          ))}
        </div>
      )}

      {clients.length>0&&<div style={{marginTop:24}}><Link href="/dashboard/sales" style={{textDecoration:"none",display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",background:"#fff",border:"2px solid #E8E0D0",borderRadius:11,fontSize:12,fontWeight:700,color:"#111110",transition:"border-color .15s"}} onMouseEnter={e=>(e.currentTarget.style.borderColor="#111110")} onMouseLeave={e=>(e.currentTarget.style.borderColor="#E8E0D0")}><DollarSign size={13} color="#16A34A"/> View Sales Records <ChevronRight size={13} color="#9B8F7A"/></Link></div>}

      {selectedClient&&<ClientModal client={selectedClient} onClose={()=>setSelectedClient(null)} onEdit={()=>{setEditingClient(selectedClient);setShowForm(true);setSelectedClient(null);}} onDelete={()=>{handleDelete(selectedClient.id);setSelectedClient(null);}}/>}
      {showForm&&<ClientFormModal existing={editingClient} allArtworks={allArtworks} salesBuyers={salesBuyers} onClose={()=>{setShowForm(false);setEditingClient(undefined);}} onSaved={load}/>}
    </>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@500;600;700;800;900&display=swap');
  *{box-sizing:border-box} body{font-family:'Darker Grotesque',system-ui,sans-serif}
  .cl-search{display:flex;align-items:center;gap:8px;background:#fff;border:2px solid #E8E0D0;border-radius:11px;padding:0 12px;height:38px;flex:1;min-width:180px;max-width:280px;transition:border-color .15s}
  .cl-search:focus-within{border-color:#FFD400;box-shadow:0 0 0 3px rgba(255,212,0,.14)}
  .cl-search-input{flex:1;border:none;outline:none;font-family:inherit;font-size:13px;font-weight:600;color:#111110;background:transparent}
  .cl-search-input::placeholder{color:#C0B8A8}
  .cl-filter-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:99px;border:2px solid #E8E0D0;background:#fff;font-size:12px;font-weight:700;color:#9B8F7A;cursor:pointer;transition:all .12s;white-space:nowrap;font-family:inherit}
  .cl-filter-btn:hover{border-color:#111110;color:#111110}
  .cl-filter-btn.active{background:#111110;border-color:#111110;color:#FFD400}
  .cl-filter-count{font-size:10px;font-weight:600;opacity:.7}
  .ripe-table-wrap{background:#fff;border:2.5px solid #111110;border-radius:18px;overflow:hidden;box-shadow:4px 5px 0 #D4C9A8;margin-bottom:8px}
  .ripe-table{width:100%;border-collapse:collapse}
  .ripe-row{cursor:pointer;transition:background .1s}
  .ripe-row:hover td{background:#FFFBEA !important}
  .ripe-row:last-child td{border-bottom:none !important}
  .ripe-menu-btn{width:28px;height:28px;border-radius:8px;border:1.5px solid #E8E0D0;background:#FAF7F3;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .12s}
  .ripe-menu-btn:hover{border-color:#111110;background:#FFD400}
  .ripe-dropdown{position:absolute;top:calc(100% + 4px);right:0;background:#fff;border:2px solid #111110;border-radius:12px;box-shadow:4px 5px 0 #111110;z-index:50;min-width:140px;overflow:hidden;padding:4px}
  .ripe-dropdown-item{display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border:none;border-radius:8px;background:none;cursor:pointer;font-size:13px;font-weight:600;color:#111110;font-family:inherit;text-align:left;transition:background .1s}
  .ripe-dropdown-item:hover{background:#FFFBEA}
  .ripe-dropdown-item.danger{color:#EF4444}
  .ripe-dropdown-item.danger:hover{background:#FEF2F2}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
`;
