"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Save, Calendar, MapPin, Edit2, Trash2, ExternalLink } from "lucide-react";
import PlacesAutocomplete, { PlaceResult } from "@/components/PlacesAutocomplete";

const STATUS_OPTIONS = ["planning","upcoming","current","closed","cancelled"];
const STATUS_CFG: Record<string,{color:string;bg:string}> = {
  planning:  { color:"#9B8F7A", bg:"#F5F0E8" },
  upcoming:  { color:"#8B5CF6", bg:"#EDE9FE" },
  current:   { color:"#16A34A", bg:"#DCFCE7" },
  closed:    { color:"#CA8A04", bg:"#FEF9C3" },
  cancelled: { color:"#FF6B6B", bg:"#FFE4E6" },
};

const inputStyle: React.CSSProperties = {
  width:"100%", padding:"10px 12px", background:"#fff",
  border:"2px solid #E0D8CA", fontSize:13, fontFamily:"inherit",
  outline:"none", color:"#111110", boxSizing:"border-box",
};
const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{children}</div>
);

type Exhibition = { id:string; title:string; venue:string|null; start_date:string|null; end_date:string|null; status:string; is_public:boolean; description:string|null; location_name:string|null; lat:number|null; lng:number|null };

export default function ExhibitionsPage() {
  const router = useRouter();
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editId, setEditId]           = useState<string|null>(null);
  const [saving, setSaving]           = useState(false);
  const [locationCoords, setLocationCoords] = useState<{lat:number;lng:number}|null>(null);

  const [form, setForm] = useState({
    title:"", venue:"", description:"", start_date:"", end_date:"",
    status:"planning", is_public:true, location_name:"",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data:{ user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("exhibitions").select("*").eq("user_id", user.id).order("created_at",{ascending:false});
    setExhibitions(data || []);
    setLoading(false);
  }

  function openCreate() {
    setEditId(null);
    setForm({ title:"", venue:"", description:"", start_date:"", end_date:"", status:"planning", is_public:true, location_name:"" });
    setLocationCoords(null);
    setShowForm(true);
  }

  function openEdit(ex: Exhibition) {
    setEditId(ex.id);
    setForm({ title:ex.title, venue:ex.venue||"", description:ex.description||"", start_date:ex.start_date||"", end_date:ex.end_date||"", status:ex.status, is_public:ex.is_public, location_name:ex.location_name||ex.venue||"" });
    setLocationCoords(ex.lat&&ex.lng ? {lat:ex.lat,lng:ex.lng} : null);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const supabase = createClient();
    const { data:{ user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const payload = {
      title:         form.title,
      venue:         form.venue         || form.location_name || null,
      description:   form.description   || null,
      start_date:    form.start_date    || null,
      end_date:      form.end_date      || null,
      status:        form.status,
      is_public:     form.is_public,
      location_name: form.location_name || form.venue || null,
      lat:           locationCoords?.lat || null,
      lng:           locationCoords?.lng || null,
      updated_at:    new Date().toISOString(),
    };

    if (editId) {
      await supabase.from("exhibitions").update(payload).eq("id", editId);
    } else {
      await supabase.from("exhibitions").insert({ ...payload, user_id: user.id });
    }

    setShowForm(false); setSaving(false); load();
  }

  async function deleteEx(id: string) {
    if (!confirm("Delete this event?")) return;
    const supabase = createClient();
    await supabase.from("exhibitions").delete().eq("id", id);
    load();
  }

  const sf = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.type==="checkbox" ? e.target.checked : e.target.value }));

  return (
    <>
      <style>{`*{box-sizing:border-box} input:focus,select:focus,textarea:focus{border-color:#FFD400!important}`}</style>

      <div>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:900, color:"#111110", letterSpacing:"-0.5px", margin:0, display:"flex", alignItems:"center", gap:10 }}>
              <Calendar size={22}/> Events
            </h1>
            <p style={{ fontSize:13, color:"#9B8F7A", margin:"4px 0 0" }}>{exhibitions.length} events · exhibitions, shows & appearances</p>
          </div>
          <button onClick={openCreate}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", background:"#FFD400", border:"2px solid #111110", fontSize:12, fontWeight:800, cursor:"pointer", boxShadow:"2px 2px 0 #111110" }}>
            <Plus size={14} strokeWidth={3}/> New Event
          </button>
        </div>

        {/* Event cards */}
        {loading ? (
          <div style={{ padding:40, textAlign:"center", color:"#9B8F7A" }}>Loading…</div>
        ) : exhibitions.length === 0 ? (
          <div style={{ padding:"60px 24px", textAlign:"center", border:"2px dashed #E0D8CA" }}>
            <Calendar size={40} color="#d4cfc4" style={{ marginBottom:12 }}/>
            <div style={{ fontSize:15, fontWeight:800, color:"#111110", marginBottom:6 }}>No events yet</div>
            <div style={{ fontSize:13, color:"#9B8F7A", marginBottom:20 }}>Create your first exhibition, show or appearance</div>
            <button onClick={openCreate} style={{ padding:"10px 20px", border:"2px solid #111110", background:"#FFD400", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:"3px 3px 0 #111110" }}>
              + New Event
            </button>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px,1fr))", gap:16 }}>
            {exhibitions.map(ex => {
              const cfg = STATUS_CFG[ex.status] || STATUS_CFG.planning;
              return (
                <div key={ex.id} style={{ background:"#fff", border:"2px solid #111110", boxShadow:"3px 3px 0 #111110", overflow:"hidden" }}>
                  {/* Status bar */}
                  <div style={{ padding:"8px 14px", background:cfg.bg, borderBottom:"2px solid #111110", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 8px", background:cfg.bg, border:`1.5px solid ${cfg.color}`, fontSize:9, fontWeight:900, color:cfg.color, textTransform:"uppercase", letterSpacing:"0.1em" }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:cfg.color }}/>{ex.status}
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>openEdit(ex)} style={{ width:26, height:26, border:"1.5px solid #E0D8CA", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}><Edit2 size={11}/></button>
                      <button onClick={()=>deleteEx(ex.id)} style={{ width:26, height:26, border:"1.5px solid #FF6B6B", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}><Trash2 size={11} color="#FF6B6B"/></button>
                    </div>
                  </div>
                  <div style={{ padding:"14px 16px" }}>
                    <h3 style={{ fontSize:15, fontWeight:900, color:"#111110", letterSpacing:"-0.3px", margin:"0 0 8px" }}>{ex.title}</h3>
                    {(ex.location_name||ex.venue) && (
                      <div style={{ display:"flex", alignItems:"flex-start", gap:6, fontSize:12, color:"#9B8F7A", fontWeight:600, marginBottom:6 }}>
                        <MapPin size={12} style={{ flexShrink:0, marginTop:1 }}/> {ex.location_name||ex.venue}
                        {ex.lat && <span style={{ fontSize:9, color:"#4ECDC4", fontWeight:700 }}>· on map</span>}
                      </div>
                    )}
                    {ex.description && <p style={{ fontSize:12, color:"#5C5346", lineHeight:1.6, margin:"0 0 8px" }}>{ex.description.slice(0,100)}{ex.description.length>100?"…":""}</p>}
                    {(ex.start_date||ex.end_date) && (
                      <div style={{ fontSize:11, color:"#9B8F7A", fontWeight:600 }}>
                        <Calendar size={10} style={{ display:"inline", marginRight:4 }}/>
                        {ex.start_date ? new Date(ex.start_date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : ""}
                        {ex.end_date ? ` → ${new Date(ex.end_date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}` : ""}
                      </div>
                    )}
                  </div>
                  {ex.lat && (
                    <div style={{ padding:"8px 14px", borderTop:"1px solid #E0D8CA", background:"#FAFAF8" }}>
                      <Link href="/dashboard/map" style={{ textDecoration:"none", display:"inline-flex", alignItems:"center", gap:5, fontSize:10, fontWeight:700, color:"#FF6B6B" }}>
                        <MapPin size={10}/> View on map
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Form modal */}
        {showForm && (
          <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
            onClick={()=>setShowForm(false)}>
            <div onClick={e=>e.stopPropagation()}
              style={{ background:"#fff", border:"2px solid #111110", boxShadow:"8px 8px 0 #111110", width:"100%", maxWidth:540, maxHeight:"90vh", overflowY:"auto" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"2px solid #111110", background:"#FFD400", flexShrink:0 }}>
                <h2 style={{ fontSize:16, fontWeight:900, color:"#111110", margin:0 }}>{editId ? "Edit Event" : "New Event"}</h2>
                <button onClick={()=>setShowForm(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18 }}>✕</button>
              </div>
              <form onSubmit={handleSave} style={{ padding:20, display:"flex", flexDirection:"column", gap:14 }}>
                <div>
                  <Label>Title *</Label>
                  <input required value={form.title} onChange={sf("title")} placeholder="Exhibition or event name" style={inputStyle}/>
                </div>

                {/* Location with autocomplete */}
                <PlacesAutocomplete
                  label="Venue / location"
                  value={form.location_name || form.venue}
                  placeholder="Search gallery, museum, café…"
                  onChange={(result, raw) => {
                    setForm(p => ({ ...p, venue: raw, location_name: raw }));
                    if (result) setLocationCoords({ lat: result.lat, lng: result.lng });
                    else setLocationCoords(null);
                  }}
                />
                {locationCoords && <div style={{ fontSize:10, color:"#4ECDC4", fontWeight:700 }}>✓ Location saved — will appear on the Prague map</div>}

                <div>
                  <Label>Description</Label>
                  <textarea rows={3} value={form.description} onChange={(e)=>setForm(p=>({...p,description:e.target.value}))} placeholder="About this event…"
                    style={{ ...inputStyle, resize:"vertical" }}/>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <Label>Start date</Label>
                    <input type="date" value={form.start_date} onChange={sf("start_date")} style={inputStyle}/>
                  </div>
                  <div>
                    <Label>End date</Label>
                    <input type="date" value={form.end_date} onChange={sf("end_date")} style={inputStyle}/>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <select value={form.status} onChange={sf("status")} style={{ ...inputStyle, cursor:"pointer" }}>
                    {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"#F5F0E8", cursor:"pointer" }}
                  onClick={()=>setForm(p=>({...p,is_public:!p.is_public}))}>
                  <div style={{ width:20, height:20, border:`2px solid ${form.is_public?"#FFD400":"#E0D8CA"}`, background:form.is_public?"#FFD400":"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {form.is_public && <div style={{ width:10, height:10, background:"#111110" }}/>}
                  </div>
                  <label style={{ fontSize:13, fontWeight:700, color:"#111110", cursor:"pointer" }}>Public event (visible on profile)</label>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button type="button" onClick={()=>setShowForm(false)} style={{ flex:1, padding:"11px", border:"2px solid #111110", background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ flex:1, padding:"11px", border:"2px solid #111110", background:"#FFD400", color:"#111110", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:"3px 3px 0 #111110" }}>
                    <Save size={13} style={{ display:"inline", marginRight:6 }}/>{saving?"Saving…":"Save Event"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
