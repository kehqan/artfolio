"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, X, ArrowUpDown, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, DollarSign, TrendingUp,
  BarChart3, CheckCircle, MoreHorizontal, Edit2,
  Trash2, Users, ImageIcon, Search, ExternalLink,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────
type Sale = {
  id: string; buyer_name?: string; buyer_email?: string;
  sale_price: number; commission_percentage?: number;
  sale_date?: string; status: string; payment_method?: string;
  notes?: string; artwork_id?: string; artwork_title?: string; artwork_image?: string;
};

type SortDir = "asc" | "desc";

const STATUS_CFG: Record<string, { bg: string; color: string; border: string }> = {
  Completed: { bg:"#DCFCE7", color:"#166534", border:"#86EFAC" },
  completed: { bg:"#DCFCE7", color:"#166534", border:"#86EFAC" },
  Pending:   { bg:"#FEF9C3", color:"#854D0E", border:"#FDE047" },
  pending:   { bg:"#FEF9C3", color:"#854D0E", border:"#FDE047" },
  Cancelled: { bg:"#FEE2E2", color:"#991B1B", border:"#FCA5A5" },
  cancelled: { bg:"#FEE2E2", color:"#991B1B", border:"#FCA5A5" },
};

const PAGE_SIZE = 15;

// ── Shared table CSS values (same standard as clients page) ───────
const TH: React.CSSProperties = { padding:"11px 14px", textAlign:"left", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:".13em", background:"#F5F0E8", borderBottom:"2px solid #E8E0D0", whiteSpace:"nowrap", userSelect:"none", cursor:"pointer" };
const TD: React.CSSProperties = { padding:"12px 14px", fontSize:13, fontWeight:600, color:"#111110", borderBottom:"1px solid #F0EAE0", verticalAlign:"middle" };
const LBL: React.CSSProperties = { display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:".14em", marginBottom:6 };
const INP: React.CSSProperties = { width:"100%", padding:"10px 13px", border:"2px solid #E8E0D0", borderRadius:12, fontSize:13, fontFamily:"inherit", fontWeight:600, color:"#111110", background:"#fff", outline:"none", transition:"border-color .15s", boxSizing:"border-box" };

function fmtDate(d?: string | null) { if(!d) return "—"; return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }
function initials(name: string) { return name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(); }
function avatarColor(name: string) {
  const cols=["#FFD400","#95E1D3","#F38181","#A8E6CF","#FFD3B6","#C7CEEA","#FFDAC1"]; let h=0;
  for(const c of name) h=(h*31+c.charCodeAt(0))%cols.length; return cols[h];
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { bg:"#F5F0E8", color:"#9B8F7A", border:"#E8E0D0" };
  return <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:99, background:cfg.bg, border:`1.5px solid ${cfg.border}`, fontSize:10, fontWeight:800, color:cfg.color, textTransform:"uppercase", letterSpacing:".1em", whiteSpace:"nowrap" }}>{status}</span>;
}

function SortTh({ label, col, sortCol, sortDir, onSort, noSort }: { label:string; col:string; sortCol:string; sortDir:SortDir; onSort:(c:string)=>void; noSort?:boolean }) {
  const active = sortCol===col;
  if (noSort) return <th style={{...TH, cursor:"default"}}>{label}</th>;
  return <th onClick={()=>onSort(col)} style={{...TH, color:active?"#111110":"#9B8F7A"}}>
    <span style={{display:"flex",alignItems:"center",gap:4}}>{label}{active ? sortDir==="asc"?<ChevronUp size={11} color="#FFD400"/>:<ChevronDown size={11} color="#FFD400"/> : <ArrowUpDown size={10} color="#D4C9A8"/>}</span>
  </th>;
}

// ── Sale Detail / Edit Modal ──────────────────────────────────────
function SaleModal({ sale, artworks, clients, onClose, onDelete, onSaved }: {
  sale: Sale; artworks:{id:string;title:string;price?:number}[];
  clients:{id:string;name:string;email?:string}[];
  onClose:()=>void; onDelete:()=>void; onSaved:()=>void;
}) {
  const sb = createClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    artwork_id: sale.artwork_id||"", buyer_name: sale.buyer_name||"",
    buyer_email: sale.buyer_email||"", sale_price: String(sale.sale_price||""),
    commission_percentage: String(sale.commission_percentage||"0"),
    sale_date: sale.sale_date||"", payment_method: sale.payment_method||"Bank Transfer",
    status: sale.status||"Completed", notes: sale.notes||"",
  });
  const [saving, setSaving] = useState(false);
  const sf = (k:string) => (e:React.ChangeEvent<any>) => setForm(p=>({...p,[k]:e.target.value}));

  // Find linked client
  const linkedClient = clients.find(c =>
    (form.buyer_email && c.email && c.email.toLowerCase()===form.buyer_email.toLowerCase()) ||
    c.name.toLowerCase()===form.buyer_name.toLowerCase()
  );

  async function handleSave(e:React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await sb.from("sales").update({
      artwork_id: form.artwork_id||null, buyer_name: form.buyer_name||null,
      buyer_email: form.buyer_email||null, sale_price: parseFloat(form.sale_price),
      commission_percentage: parseFloat(form.commission_percentage)||0,
      sale_date: form.sale_date||null, payment_method: form.payment_method,
      status: form.status, notes: form.notes||null,
    }).eq("id", sale.id);
    setSaving(false); onSaved(); setEditing(false);
  }

  const commission = parseFloat(form.sale_price||"0") * (parseFloat(form.commission_percentage||"0")/100);
  const net = parseFloat(form.sale_price||"0") - commission;

  return (
    <div style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(17,17,16,0.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#FFFBEA",border:"2.5px solid #111110",borderRadius:24,boxShadow:"8px 8px 0 #111110",width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto"}}>
        {/* Header */}
        <div style={{padding:"18px 22px 14px",borderBottom:"2px solid #E8E0D0",background: editing?"#FFD400":"#111110",borderRadius:"22px 22px 0 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:10,fontWeight:800,color:editing?"rgba(17,17,16,0.5)":"#9B8F7A",textTransform:"uppercase",letterSpacing:".14em",marginBottom:2}}>{editing?"Edit Sale":"Sale Record"}</div>
            <h2 style={{fontSize:17,fontWeight:900,color:editing?"#111110":"#FFD400",margin:0}}>{sale.artwork_title||"Unknown Artwork"}</h2>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {!editing&&<button onClick={()=>setEditing(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"#FFD400",border:"2px solid #111110",borderRadius:9,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",color:"#111110"}}><Edit2 size={11}/> Edit</button>}
            <button onClick={onClose} style={{width:28,height:28,borderRadius:8,background:"rgba(255,255,255,0.1)",border:"1.5px solid rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={14} color={editing?"#111110":"#FFD400"}/></button>
          </div>
        </div>

        {!editing ? (
          <div style={{padding:"20px 22px 24px"}}>
            {/* Big numbers */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}}>
              {[{label:"Sale Price",value:`$${sale.sale_price.toLocaleString()}`,color:"#111110"},{label:"Commission",value:`$${(sale.sale_price*(sale.commission_percentage||0)/100).toFixed(0)}`,color:"#EF4444"},{label:"Net Revenue",value:`$${(sale.sale_price-(sale.sale_price*(sale.commission_percentage||0)/100)).toFixed(0)}`,color:"#16A34A"}].map(s=>(
                <div key={s.label} style={{background:"#F5F0E8",border:"1.5px solid #E8E0D0",borderRadius:12,padding:"11px 13px"}}>
                  <div style={{fontSize:18,fontWeight:900,color:s.color,fontFamily:"monospace"}}>{s.value}</div>
                  <div style={{fontSize:10,fontWeight:700,color:"#9B8F7A",marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Artwork */}
            {sale.artwork_id&&(
              <Link href={`/dashboard/artworks/${sale.artwork_id}`} style={{textDecoration:"none",display:"block",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",background:"#fff",border:"1.5px solid #E8E0D0",borderRadius:12,transition:"border-color .15s"}} onMouseEnter={e=>(e.currentTarget.style.borderColor="#111110")} onMouseLeave={e=>(e.currentTarget.style.borderColor="#E8E0D0")}>
                  {sale.artwork_image?<img src={sale.artwork_image} alt="" style={{width:40,height:40,objectFit:"cover",borderRadius:8,border:"1.5px solid #E8E0D0",flexShrink:0}}/>:<div style={{width:40,height:40,borderRadius:8,background:"#F5F0E8",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ImageIcon size={16} color="#9B8F7A"/></div>}
                  <div style={{flex:1}}><div style={{fontSize:10,fontWeight:700,color:"#9B8F7A"}}>Artwork</div><div style={{fontSize:13,fontWeight:800,color:"#111110"}}>{sale.artwork_title}</div></div>
                  <ExternalLink size={13} color="#9B8F7A"/>
                </div>
              </Link>
            )}
            {/* Buyer */}
            {sale.buyer_name&&(
              <div style={{marginBottom:10}}>
                {linkedClient ? (
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",background:"#FFFBEA",border:"1.5px solid #FFD400",borderRadius:12}}>
                    <div style={{width:36,height:36,borderRadius:10,background:avatarColor(linkedClient.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"#111110",flexShrink:0}}>{initials(linkedClient.name)}</div>
                    <div style={{flex:1}}><div style={{fontSize:10,fontWeight:700,color:"#9B8F7A"}}>Client</div><div style={{fontSize:13,fontWeight:800,color:"#111110"}}>{sale.buyer_name}</div>{sale.buyer_email&&<div style={{fontSize:11,color:"#9B8F7A"}}>{sale.buyer_email}</div>}</div>
                    <span style={{fontSize:10,fontWeight:800,color:"#CA8A04",background:"#FEF9C3",padding:"2px 8px",borderRadius:6}}>In CRM ✓</span>
                  </div>
                ):(
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",background:"#fff",border:"1.5px solid #E8E0D0",borderRadius:12}}>
                    <div style={{width:36,height:36,borderRadius:10,background:"#F5F0E8",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Users size={16} color="#9B8F7A"/></div>
                    <div style={{flex:1}}><div style={{fontSize:10,fontWeight:700,color:"#9B8F7A"}}>Buyer</div><div style={{fontSize:13,fontWeight:800,color:"#111110"}}>{sale.buyer_name}</div>{sale.buyer_email&&<div style={{fontSize:11,color:"#9B8F7A"}}>{sale.buyer_email}</div>}</div>
                    <Link href="/dashboard/clients" style={{fontSize:10,fontWeight:800,color:"#9B8F7A",textDecoration:"none",padding:"3px 8px",border:"1px solid #E8E0D0",borderRadius:6,background:"#F5F0E8"}}>Add to CRM →</Link>
                  </div>
                )}
              </div>
            )}
            {/* Meta */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
              {[{label:"Date",value:fmtDate(sale.sale_date)},{label:"Payment",value:sale.payment_method||"—"},{label:"Status",el:<StatusBadge status={sale.status}/>}].map((m:any)=>(
                <div key={m.label} style={{padding:"9px 12px",background:"#F5F0E8",border:"1.5px solid #E8E0D0",borderRadius:10}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#9B8F7A",marginBottom:3}}>{m.label}</div>
                  {m.el||<div style={{fontSize:13,fontWeight:700,color:"#111110"}}>{m.value}</div>}
                </div>
              ))}
            </div>
            {sale.notes&&<div style={{padding:"11px 13px",background:"#FFFBEA",border:"1.5px solid #E8E0D0",borderRadius:11,marginBottom:16}}><div style={{fontSize:10,fontWeight:800,color:"#9B8F7A",textTransform:"uppercase",letterSpacing:".12em",marginBottom:5}}>Notes</div><p style={{fontSize:13,color:"#5C5346",fontWeight:500,lineHeight:1.6,margin:0}}>{sale.notes}</p></div>}
            <button onClick={()=>{if(confirm("Delete this sale?")) {onDelete();onClose();}}} style={{width:"100%",padding:"10px",background:"#fff",border:"2px solid #EF4444",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",color:"#EF4444",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Trash2 size={13}/> Delete Sale</button>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{padding:"18px 22px 22px"}}>
            {/* Net preview */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:16}}>
              {[{label:"Sale Price",value:`$${(parseFloat(form.sale_price)||0).toLocaleString()}`,color:"#111110"},{label:"Commission",value:`$${commission.toFixed(0)}`,color:"#EF4444"},{label:"Net",value:`$${net.toFixed(0)}`,color:"#16A34A"}].map(s=>(
                <div key={s.label} style={{background:"#F5F0E8",border:"1.5px solid #E8E0D0",borderRadius:10,padding:"9px 11px"}}>
                  <div style={{fontSize:16,fontWeight:900,color:s.color,fontFamily:"monospace"}}>{s.value}</div>
                  <div style={{fontSize:10,fontWeight:700,color:"#9B8F7A",marginTop:1}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{marginBottom:12}}><label style={LBL}>Artwork</label>
              <select style={INP} value={form.artwork_id} onChange={sf("artwork_id")} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}>
                <option value="">No artwork linked</option>
                {artworks.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div><label style={LBL}>Buyer Name</label><input style={INP} value={form.buyer_name} onChange={sf("buyer_name")} placeholder="Name" onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
              <div><label style={LBL}>Buyer Email</label><input type="email" style={INP} value={form.buyer_email} onChange={sf("buyer_email")} placeholder="email@…" onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div><label style={LBL}>Sale Price ($)</label><input required type="number" min="0" style={INP} value={form.sale_price} onChange={sf("sale_price")} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
              <div><label style={LBL}>Commission (%)</label><input type="number" min="0" max="100" style={INP} value={form.commission_percentage} onChange={sf("commission_percentage")} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div><label style={LBL}>Sale Date</label><input type="date" style={INP} value={form.sale_date} onChange={sf("sale_date")} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
              <div><label style={LBL}>Payment</label>
                <select style={INP} value={form.payment_method} onChange={sf("payment_method")} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}>
                  {["Bank Transfer","Cash","Credit Card","PayPal","Stripe","Crypto","Check","Other"].map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:12}}><label style={LBL}>Status</label>
              <div style={{display:"flex",gap:7}}>
                {["Completed","Pending","Cancelled"].map(s=>(<button key={s} type="button" onClick={()=>setForm(p=>({...p,status:s}))} style={{flex:1,padding:"8px 0",border:`2px solid ${form.status===s?"#111110":"#E8E0D0"}`,borderRadius:10,background:form.status===s?(STATUS_CFG[s]?.bg||"#F5F0E8"):"#fff",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",color:form.status===s?(STATUS_CFG[s]?.color||"#9B8F7A"):"#9B8F7A",boxShadow:form.status===s?"2px 2px 0 #111110":"none",transition:"all .14s"}}>{s}</button>))}
              </div>
            </div>
            <div style={{marginBottom:18}}><label style={LBL}>Notes</label><textarea rows={2} style={{...INP,resize:"vertical"}} value={form.notes} onChange={sf("notes")} placeholder="Any additional notes…" onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
            <div style={{display:"flex",gap:9}}>
              <button type="button" onClick={()=>setEditing(false)} style={{flex:1,padding:"11px",border:"2px solid #E8E0D0",borderRadius:12,background:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",color:"#9B8F7A"}}>Cancel</button>
              <button type="submit" disabled={saving} style={{flex:2,padding:"11px",border:"2.5px solid #111110",borderRadius:12,background:saving?"#F5F0E8":"#FFD400",fontSize:14,fontWeight:800,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",color:"#111110",boxShadow:saving?"none":"3px 3px 0 #111110"}}>{saving?"Saving…":"Save Changes ✓"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Record Sale Modal ─────────────────────────────────────────────
function RecordSaleModal({ artworks, clients, onClose, onSaved }: {
  artworks:{id:string;title:string;price?:number}[];
  clients:{id:string;name:string;email?:string}[];
  onClose:()=>void; onSaved:()=>void;
}) {
  const sb = createClient();
  const [form, setForm] = useState({ artwork_id:"", buyer_name:"", buyer_email:"", sale_price:"", commission_percentage:"0", sale_date:new Date().toISOString().split("T")[0], payment_method:"Bank Transfer", status:"Completed", notes:"" });
  const [saving, setSaving] = useState(false);
  const [clientSuggestions, setClientSuggestions] = useState<typeof clients>([]);
  const sf = (k:string) => (e:React.ChangeEvent<any>) => setForm(p=>({...p,[k]:e.target.value}));

  // Auto-fill from client list
  function selectClient(c:{name:string;email?:string}) { setForm(p=>({...p,buyer_name:c.name,buyer_email:c.email||""})); setClientSuggestions([]); }

  const commission = parseFloat(form.sale_price||"0")*(parseFloat(form.commission_percentage||"0")/100);
  const net = parseFloat(form.sale_price||"0")-commission;

  async function handleRecord(e:React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const {data:{user}}=await sb.auth.getUser(); if(!user){setSaving(false);return;}
    await sb.from("sales").insert({ user_id:user.id, artwork_id:form.artwork_id||null, buyer_name:form.buyer_name||null, buyer_email:form.buyer_email||null, sale_price:parseFloat(form.sale_price), commission_percentage:parseFloat(form.commission_percentage)||0, sale_date:form.sale_date||null, payment_method:form.payment_method, status:form.status, notes:form.notes||null });
    if(form.status==="Completed"&&form.artwork_id) await sb.from("artworks").update({status:"Sold"}).eq("id",form.artwork_id);
    setSaving(false); onSaved(); onClose();
  }

  return (
    <div style={{position:"fixed",inset:0,zIndex:9000,background:"rgba(17,17,16,0.8)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#FFFBEA",border:"2.5px solid #111110",borderRadius:24,boxShadow:"8px 8px 0 #111110",width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"17px 22px 13px",borderBottom:"2px solid #E8E0D0",background:"#FFD400",borderRadius:"22px 22px 0 0"}}>
          <h2 style={{fontSize:17,fontWeight:900,color:"#111110",margin:0}}>Record a Sale</h2>
          <button onClick={onClose} style={{width:28,height:28,borderRadius:8,background:"rgba(17,17,16,0.15)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><X size={14} color="#111110"/></button>
        </div>
        <form onSubmit={handleRecord} style={{padding:"18px 22px 22px"}}>
          {/* Net preview */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:16,padding:"12px 14px",background:"#F5F0E8",border:"1.5px solid #E8E0D0",borderRadius:14}}>
            {[{label:"Sale Price",value:`$${(parseFloat(form.sale_price)||0).toLocaleString()}`,color:"#111110"},{label:"Commission",value:`$${commission.toFixed(0)}`,color:"#EF4444"},{label:"Net",value:`$${net.toFixed(0)}`,color:"#16A34A"}].map(s=>(
              <div key={s.label} style={{textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:900,color:s.color,fontFamily:"monospace"}}>{s.value}</div>
                <div style={{fontSize:10,fontWeight:700,color:"#9B8F7A"}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Artwork */}
          <div style={{marginBottom:12}}><label style={LBL}>Artwork *</label>
            <select required style={INP} value={form.artwork_id} onChange={e=>{const aw=artworks.find(a=>a.id===e.target.value);setForm(p=>({...p,artwork_id:e.target.value,sale_price:String(aw?.price||p.sale_price)}));}} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}>
              <option value="">Select artwork…</option>
              {artworks.map(a=><option key={a.id} value={a.id}>{a.title}{a.price?` — $${a.price}`:""}</option>)}
            </select>
          </div>

          {/* Buyer — with client autocomplete */}
          <div style={{marginBottom:12}}>
            <label style={LBL}>Buyer</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{position:"relative"}}>
                <input style={INP} value={form.buyer_name} placeholder="Name" onChange={e=>{sf("buyer_name")(e);const q=e.target.value.toLowerCase();setClientSuggestions(q.length>1?clients.filter(c=>c.name.toLowerCase().includes(q)).slice(0,4):[]);}} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>{e.target.style.borderColor="#E8E0D0";setTimeout(()=>setClientSuggestions([]),150);}}/>
                {clientSuggestions.length>0&&<div style={{position:"absolute",top:"calc(100%+4px)",left:0,right:0,background:"#fff",border:"2px solid #111110",borderRadius:12,boxShadow:"3px 4px 0 #111110",zIndex:100,overflow:"hidden",padding:4}}>
                  {clientSuggestions.map(c=><button key={c.id} type="button" onMouseDown={()=>selectClient(c)} style={{display:"flex",alignItems:"center",gap:7,width:"100%",padding:"7px 10px",border:"none",borderRadius:8,background:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,color:"#111110",textAlign:"left"}} onMouseEnter={e=>(e.currentTarget.style.background="#FFFBEA")} onMouseLeave={e=>(e.currentTarget.style.background="none")}>
                    <div style={{width:22,height:22,borderRadius:6,background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900,color:"#111110",flexShrink:0}}>{initials(c.name)}</div>
                    {c.name}
                  </button>)}
                </div>}
              </div>
              <input type="email" style={INP} value={form.buyer_email} placeholder="Email (optional)" onChange={sf("buyer_email")} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/>
            </div>
          </div>

          {/* Price + commission */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={LBL}>Sale Price ($) *</label><input required type="number" min="0" step="0.01" style={INP} value={form.sale_price} onChange={sf("sale_price")} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
            <div><label style={LBL}>Commission (%)</label><input type="number" min="0" max="100" style={INP} value={form.commission_percentage} onChange={sf("commission_percentage")} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
          </div>

          {/* Date + payment */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={LBL}>Sale Date</label><input type="date" style={INP} value={form.sale_date} onChange={sf("sale_date")} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
            <div><label style={LBL}>Payment Method</label>
              <select style={INP} value={form.payment_method} onChange={sf("payment_method")} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}>
                {["Bank Transfer","Cash","Credit Card","PayPal","Stripe","Crypto","Check","Other"].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Status */}
          <div style={{marginBottom:12}}><label style={LBL}>Status</label>
            <div style={{display:"flex",gap:7}}>
              {["Completed","Pending","Cancelled"].map(s=>{const cfg=STATUS_CFG[s];return(<button key={s} type="button" onClick={()=>setForm(p=>({...p,status:s}))} style={{flex:1,padding:"8px 0",border:`2px solid ${form.status===s?"#111110":"#E8E0D0"}`,borderRadius:10,background:form.status===s?(cfg?.bg||"#F5F0E8"):"#fff",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"inherit",color:form.status===s?(cfg?.color||"#9B8F7A"):"#9B8F7A",boxShadow:form.status===s?"2px 2px 0 #111110":"none"}}>{s}</button>);})}
            </div>
          </div>

          <div style={{marginBottom:20}}><label style={LBL}>Notes</label><textarea rows={2} style={{...INP,resize:"vertical"}} value={form.notes} onChange={sf("notes")} placeholder="Any notes about this sale…" onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E8E0D0")}/></div>
          <div style={{display:"flex",gap:9}}>
            <button type="button" onClick={onClose} style={{flex:1,padding:"12px",border:"2px solid #E8E0D0",borderRadius:12,background:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",color:"#9B8F7A"}}>Cancel</button>
            <button type="submit" disabled={saving} style={{flex:2,padding:"12px",border:"2.5px solid #111110",borderRadius:12,background:saving?"#F5F0E8":"#FFD400",fontSize:14,fontWeight:800,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",color:"#111110",boxShadow:saving?"none":"3px 3px 0 #111110"}}>{saving?"Recording…":"Record Sale ✓"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────
export default function SalesPage() {
  const sb = createClient();
  const [sales, setSales]       = useState<Sale[]>([]);
  const [artworks, setArtworks] = useState<{id:string;title:string;price?:number}[]>([]);
  const [clients, setClients]   = useState<{id:string;name:string;email?:string}[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale|null>(null);
  const [page, setPage]         = useState(1);
  const [sortCol, setSortCol]   = useState("sale_date");
  const [sortDir, setSortDir]   = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch]     = useState("");

  useEffect(()=>{load();},[]);

  async function load() {
    setLoading(true);
    const {data:{user}}=await sb.auth.getUser(); if(!user){setLoading(false);return;}
    const [{data:sd},{data:ad},{data:cd}] = await Promise.all([
      sb.from("sales").select("*, artworks(id,title,images)").eq("user_id",user.id).order("created_at",{ascending:false}),
      sb.from("artworks").select("id,title,price").eq("user_id",user.id),
      sb.from("clients").select("id,name,email").eq("user_id",user.id),
    ]);
    setSales((sd||[]).map((s:any)=>({...s,artwork_title:s.artworks?.title,artwork_image:s.artworks?.images?.[0]||null,artwork_id:s.artworks?.id||s.artwork_id})));
    setArtworks(ad||[]);
    setClients(cd||[]);
    setLoading(false);
  }

  async function handleDelete(id:string) { await sb.from("sales").delete().eq("id",id); setSales(p=>p.filter(s=>s.id!==id)); }

  function onSort(col:string) { if(sortCol===col) setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortCol(col);setSortDir("desc");} }

  // Stats
  const completed = sales.filter(s=>s.status?.toLowerCase()==="completed");
  const totalRevenue    = completed.reduce((a,s)=>a+s.sale_price,0);
  const totalCommission = completed.reduce((a,s)=>a+(s.sale_price*(s.commission_percentage||0)/100),0);
  const netRevenue      = totalRevenue-totalCommission;
  const avgSale         = completed.length?totalRevenue/completed.length:0;

  // Filter + sort + paginate
  const filtered = sales
    .filter(s=>{
      if(statusFilter!=="All"&&s.status?.toLowerCase()!==statusFilter.toLowerCase()) return false;
      if(search){const q=search.toLowerCase();return(s.buyer_name||"").toLowerCase().includes(q)||(s.artwork_title||"").toLowerCase().includes(q);}
      return true;
    })
    .sort((a,b)=>{
      const av=(a as any)[sortCol]??""; const bv=(b as any)[sortCol]??"";
      const cmp=typeof av==="number"?av-bv:String(av).localeCompare(String(bv),undefined,{numeric:true});
      return sortDir==="asc"?cmp:-cmp;
    });

  const totalPages = Math.ceil(filtered.length/PAGE_SIZE)||1;
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  return (
    <>
      <style>{CSS}</style>

      {/* HEADER */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:3}}>
            <div style={{width:32,height:32,borderRadius:10,background:"#FFD400",border:"2.5px solid #111110",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"2px 2px 0 #111110"}}><DollarSign size={16} color="#111110"/></div>
            <h1 style={{fontSize:24,fontWeight:900,color:"#111110",letterSpacing:"-.6px",margin:0}}>Sales</h1>
          </div>
          <p style={{fontSize:13,fontWeight:600,color:"#9B8F7A",margin:0}}>{sales.length} records · ${totalRevenue.toLocaleString()} revenue · ${netRevenue.toLocaleString()} net</p>
        </div>
        <button onClick={()=>setShowForm(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",background:"#FFD400",border:"2.5px solid #111110",borderRadius:12,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",color:"#111110",boxShadow:"3px 3px 0 #111110",transition:"all .15s"}}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.boxShadow="5px 5px 0 #111110";(e.currentTarget as HTMLElement).style.transform="translate(-1px,-1px)";}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.boxShadow="3px 3px 0 #111110";(e.currentTarget as HTMLElement).style.transform="none";}}>
          <Plus size={14} strokeWidth={3}/> Record Sale
        </button>
      </div>

      {/* STAT CARDS */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"Total Revenue",   value:`$${totalRevenue.toLocaleString()}`,  color:"#16A34A", bg:"#DCFCE7", grad:"135deg,#14532D,#16A34A"},
          {label:"Net Revenue",     value:`$${netRevenue.toLocaleString()}`,     color:"#8B5CF6", bg:"#EDE9FE", grad:"135deg,#4C1D95,#7C3AED"},
          {label:"Commission Paid", value:`$${totalCommission.toLocaleString()}`,color:"#EF4444", bg:"#FEE2E2", grad:"135deg,#7F1D1D,#EF4444"},
          {label:"Sales Count",     value:sales.length,                          color:"#0EA5E9", bg:"#E0F2FE", grad:"135deg,#0C4A6E,#0EA5E9"},
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
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search buyer or artwork…" className="cl-search-input"/>
          {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:"#9B8F7A",display:"flex",padding:0}}><X size={12}/></button>}
        </div>
        {["All","Completed","Pending","Cancelled"].map(s=>(
          <button key={s} onClick={()=>{setStatusFilter(s);setPage(1);}} className={`cl-filter-btn${statusFilter===s?" active":""}`}>{s}</button>
        ))}
        <Link href="/dashboard/clients" style={{marginLeft:"auto",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:5,padding:"6px 13px",border:"2px solid #E8E0D0",borderRadius:99,fontSize:12,fontWeight:700,color:"#9B8F7A",transition:"border-color .15s"}} onMouseEnter={e=>(e.currentTarget.style.borderColor="#111110")} onMouseLeave={e=>(e.currentTarget.style.borderColor="#E8E0D0")}><Users size={12}/> Clients</Link>
      </div>

      {/* TABLE */}
      <div className="ripe-table-wrap">
        {loading?(<div style={{padding:48,textAlign:"center",color:"#9B8F7A"}}>Loading…</div>)
        :filtered.length===0?(<div style={{padding:"60px 24px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>💰</div><div style={{fontSize:16,fontWeight:800,color:"#111110",marginBottom:6}}>{search||statusFilter!=="All"?"No sales match filters":"No sales recorded"}</div><div style={{fontSize:13,color:"#9B8F7A",marginBottom:20}}>Record your first artwork sale</div><button onClick={()=>setShowForm(true)} style={{padding:"10px 20px",background:"#FFD400",border:"2.5px solid #111110",borderRadius:12,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",color:"#111110",boxShadow:"3px 3px 0 #111110"}}>+ Record Sale</button></div>)
        :(<table className="ripe-table">
          <thead><tr>
            <SortTh label="Artwork"    col="artwork_title"         sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Buyer"      col="buyer_name"            sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Price"      col="sale_price"            sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Net"        col="sale_price"            sortCol={sortCol} sortDir={sortDir} onSort={onSort} noSort/>
            <SortTh label="Commission" col="commission_percentage" sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Date"       col="sale_date"             sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <SortTh label="Payment"    col="payment_method"        sortCol={sortCol} sortDir={sortDir} onSort={onSort}/>
            <th style={{...TH,cursor:"default"}}>Status</th>
          </tr></thead>
          <tbody>
            {paginated.map(s=>{
              const commission = s.sale_price*(s.commission_percentage||0)/100;
              const net = s.sale_price-commission;
              const linkedClient = clients.find(c=>(s.buyer_email&&c.email&&s.buyer_email.toLowerCase()===c.email.toLowerCase())||s.buyer_name?.toLowerCase()===c.name.toLowerCase());
              return (
                <tr key={s.id} className="ripe-row" onClick={()=>setSelectedSale(s)}>
                  {/* Artwork */}
                  <td style={TD}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {s.artwork_image?<img src={s.artwork_image} alt="" style={{width:34,height:34,objectFit:"cover",borderRadius:7,border:"1.5px solid #E8E0D0",flexShrink:0}}/>:<div style={{width:34,height:34,borderRadius:7,background:"#F5F0E8",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ImageIcon size={13} color="#9B8F7A"/></div>}
                      <div>
                        {s.artwork_id
                          ? <Link href={`/dashboard/artworks/${s.artwork_id}`} onClick={e=>e.stopPropagation()} style={{textDecoration:"none"}}><span style={{fontSize:13,fontWeight:800,color:"#111110",textDecoration:"underline",textDecorationColor:"transparent",transition:"text-decoration-color .15s"}} onMouseEnter={e=>(e.currentTarget.style.textDecorationColor="#111110")} onMouseLeave={e=>(e.currentTarget.style.textDecorationColor="transparent")}>{s.artwork_title||"—"}</span></Link>
                          : <span style={{fontSize:13,fontWeight:800,color:"#111110"}}>{s.artwork_title||"—"}</span>}
                      </div>
                    </div>
                  </td>
                  {/* Buyer */}
                  <td style={TD}>
                    {s.buyer_name?(
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <div style={{width:26,height:26,borderRadius:7,background:avatarColor(s.buyer_name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"#111110",flexShrink:0}}>{initials(s.buyer_name)}</div>
                        <div>
                          <div style={{fontSize:12,fontWeight:800,color:"#111110"}}>{s.buyer_name}</div>
                          {linkedClient&&<div style={{fontSize:9,fontWeight:800,color:"#CA8A04",background:"#FEF9C3",padding:"1px 5px",borderRadius:4,display:"inline-block"}}>CRM ✓</div>}
                        </div>
                      </div>
                    ):<span style={{color:"#D4C9A8"}}>—</span>}
                  </td>
                  {/* Price */}
                  <td style={{...TD,fontFamily:"monospace",fontSize:14,fontWeight:900,color:"#111110"}}>${s.sale_price.toLocaleString()}</td>
                  {/* Net */}
                  <td style={{...TD,fontFamily:"monospace",fontSize:13,fontWeight:800,color:"#16A34A"}}>${net.toFixed(0)}</td>
                  {/* Commission */}
                  <td style={{...TD,fontFamily:"monospace",fontSize:12,color:"#EF4444",fontWeight:700}}>{commission>0?`$${commission.toFixed(0)}`:<span style={{color:"#D4C9A8"}}>—</span>}</td>
                  {/* Date */}
                  <td style={{...TD,fontSize:12,color:"#9B8F7A"}}>{fmtDate(s.sale_date)}</td>
                  {/* Payment */}
                  <td style={TD}>{s.payment_method?<span style={{padding:"3px 9px",borderRadius:99,background:"#F5F0E8",border:"1.5px solid #E8E0D0",fontSize:10,fontWeight:700,color:"#5C5346"}}>{s.payment_method}</span>:<span style={{color:"#D4C9A8"}}>—</span>}</td>
                  {/* Status */}
                  <td style={TD}><StatusBadge status={s.status}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>)}
      </div>

      {/* PAGINATION */}
      {filtered.length>PAGE_SIZE&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:14}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",border:"2px solid #111110",borderRadius:11,fontSize:13,fontWeight:700,background:"#fff",color:"#111110",cursor:page===1?"not-allowed":"pointer",opacity:page===1?0.4:1,transition:"all .12s"}} onMouseEnter={e=>{ if(page>1)(e.currentTarget as HTMLElement).style.background="#FFD400";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="#fff";}}>
            <ChevronLeft size={14}/> Prev
          </button>
          <span style={{fontSize:12,fontWeight:700,color:"#9B8F7A"}}>{page} of {totalPages} · {filtered.length} records</span>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",border:"2px solid #111110",borderRadius:11,fontSize:13,fontWeight:700,background:"#fff",color:"#111110",cursor:page===totalPages?"not-allowed":"pointer",opacity:page===totalPages?0.4:1,transition:"all .12s"}} onMouseEnter={e=>{ if(page<totalPages)(e.currentTarget as HTMLElement).style.background="#FFD400";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="#fff";}}>
            Next <ChevronRight size={14}/>
          </button>
        </div>
      )}

      {/* Link to clients */}
      <div style={{marginTop:20}}>
        <Link href="/dashboard/clients" style={{textDecoration:"none",display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",background:"#fff",border:"2px solid #E8E0D0",borderRadius:11,fontSize:12,fontWeight:700,color:"#111110",transition:"border-color .15s"}} onMouseEnter={e=>(e.currentTarget.style.borderColor="#111110")} onMouseLeave={e=>(e.currentTarget.style.borderColor="#E8E0D0")}><Users size={13} color="#8B5CF6"/> Manage Clients <ChevronRight size={13} color="#9B8F7A"/></Link>
      </div>

      {showForm&&<RecordSaleModal artworks={artworks} clients={clients} onClose={()=>setShowForm(false)} onSaved={load}/>}
      {selectedSale&&<SaleModal sale={selectedSale} artworks={artworks} clients={clients} onClose={()=>setSelectedSale(null)} onDelete={()=>handleDelete(selectedSale.id)} onSaved={load}/>}
    </>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@500;600;700;800;900&display=swap');
  *{box-sizing:border-box} body{font-family:'Darker Grotesque',system-ui,sans-serif}
  .cl-search{display:flex;align-items:center;gap:8px;background:#fff;border:2px solid #E8E0D0;border-radius:11px;padding:0 12px;height:38px;flex:1;min-width:180px;max-width:300px;transition:border-color .15s}
  .cl-search:focus-within{border-color:#FFD400;box-shadow:0 0 0 3px rgba(255,212,0,.14)}
  .cl-search-input{flex:1;border:none;outline:none;font-family:inherit;font-size:13px;font-weight:600;color:#111110;background:transparent}
  .cl-search-input::placeholder{color:#C0B8A8}
  .cl-filter-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:99px;border:2px solid #E8E0D0;background:#fff;font-size:12px;font-weight:700;color:#9B8F7A;cursor:pointer;transition:all .12s;white-space:nowrap;font-family:inherit}
  .cl-filter-btn:hover{border-color:#111110;color:#111110}
  .cl-filter-btn.active{background:#111110;border-color:#111110;color:#FFD400}
  .ripe-table-wrap{background:#fff;border:2.5px solid #111110;border-radius:18px;overflow:hidden;box-shadow:4px 5px 0 #D4C9A8;margin-bottom:8px;overflow-x:auto}
  .ripe-table{width:100%;border-collapse:collapse;min-width:700px}
  .ripe-row{cursor:pointer;transition:background .1s}
  .ripe-row:hover td{background:#FFFBEA !important}
  .ripe-row:last-child td{border-bottom:none !important}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
`;
