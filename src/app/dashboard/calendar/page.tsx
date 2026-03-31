"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, ChevronRight, Plus, X, Filter,
  Calendar as CalIcon, Clock, Tag,
} from "lucide-react";

type CalEvent = {
  id: string; title: string; type: string;
  start_date: string; end_date?: string;
  start_time?: string; end_time?: string;
  all_day: boolean; color: string; description?: string;
};

type Task = {
  id: string; title: string; due_date?: string;
  type: string; status: string; priority: string;
};

type ViewMode = "month" | "week" | "day";

const TYPE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  personal:   { label: "Personal",   color: "#E0F2FE", dot: "#7C3AED" },
  exhibition: { label: "Exhibition", color: "#DCFCE7", dot: "#16A34A" },
  artwork:    { label: "Artwork",     color: "#FEF9C3", dot: "#CA8A04" },
  sale:       { label: "Sale",        color: "#FFE4E6", dot: "#E11D48" },
  collab:     { label: "Collab",      color: "#F0FDF4", dot: "#4ECDC4" },
  meeting:    { label: "Meeting",     color: "#EDE9FE", dot: "#8B5CF6" },
  deadline:   { label: "Deadline",   color: "#FEE2E2", dot: "#DC2626" },
};

const DAYS_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  let d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Mon=0
}
function isoDate(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function CalendarPage() {
  const today = new Date();
  const [view, setView]           = useState<ViewMode>("month");
  const [current, setCurrent]     = useState({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() });
  const [events, setEvents]       = useState<CalEvent[]>([]);
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [activeFilters, setFilters] = useState<Set<string>>(new Set(Object.keys(TYPE_CONFIG)));
  const [showForm, setShowForm]   = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({
    title: "", type: "personal", start_date: "", end_date: "",
    start_time: "", end_time: "", all_day: true, description: "", color: "#7C3AED",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: ev }, { data: tk }] = await Promise.all([
      supabase.from("calendar_events").select("*").eq("user_id", user.id).order("start_date"),
      supabase.from("tasks").select("id,title,due_date,type,status,priority").eq("user_id", user.id).not("due_date","is",null),
    ]);
    setEvents(ev || []);
    setTasks((tk || []).filter(t => t.due_date));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const color = TYPE_CONFIG[form.type]?.dot || "#7C3AED";
    await supabase.from("calendar_events").insert({
      user_id: user.id, ...form, color,
      start_date: form.start_date || selectedDate,
      end_date: form.end_date || null,
      start_time: form.all_day ? null : form.start_time || null,
      end_time: form.all_day ? null : form.end_time || null,
    });
    setShowForm(false);
    setForm({ title:"",type:"personal",start_date:"",end_date:"",start_time:"",end_time:"",all_day:true,description:"",color:"#7C3AED" });
    setSaving(false); load();
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    const supabase = createClient();
    await supabase.from("calendar_events").delete().eq("id", id);
    setSelectedEvent(null); load();
  }

  function toggleFilter(type: string) {
    setFilters(prev => {
      const n = new Set(prev);
      n.has(type) ? n.delete(type) : n.add(type);
      return n;
    });
  }

  // Merge events + tasks for display
  const allItems = [
    ...events.filter(e => activeFilters.has(e.type)),
    ...tasks
      .filter(t => activeFilters.has(t.type) && t.status !== "done")
      .map(t => ({
        id: t.id, title: `⚑ ${t.title}`, type: t.type,
        start_date: t.due_date!, all_day: true,
        color: TYPE_CONFIG[t.type]?.dot || "#9B8F7A",
      } as CalEvent)),
  ];

  function getItemsForDate(dateStr: string) {
    return allItems.filter(e => e.start_date === dateStr || (e.end_date && e.start_date <= dateStr && e.end_date >= dateStr));
  }

  // Navigation
  function prevPeriod() {
    if (view === "month") {
      let m = current.month - 1, y = current.year;
      if (m < 0) { m = 11; y--; }
      setCurrent(p => ({ ...p, year: y, month: m }));
    } else if (view === "week") {
      const d = new Date(current.year, current.month, current.day - 7);
      setCurrent({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() });
    } else {
      const d = new Date(current.year, current.month, current.day - 1);
      setCurrent({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() });
    }
  }
  function nextPeriod() {
    if (view === "month") {
      let m = current.month + 1, y = current.year;
      if (m > 11) { m = 0; y++; }
      setCurrent(p => ({ ...p, year: y, month: m }));
    } else if (view === "week") {
      const d = new Date(current.year, current.month, current.day + 7);
      setCurrent({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() });
    } else {
      const d = new Date(current.year, current.month, current.day + 1);
      setCurrent({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() });
    }
  }

  // Week dates
  function getWeekDates() {
    const base = new Date(current.year, current.month, current.day);
    const dayOfWeek = base.getDay() === 0 ? 6 : base.getDay() - 1;
    const monday = new Date(base);
    monday.setDate(base.getDate() - dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }

  const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am–6pm

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", background: "#fff",
    border: "2px solid #E0D8CA", fontSize: 13, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box", color: "#111110",
    borderRadius: 0,
  };
  const setField = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  // Month grid
  const daysInMonth = getDaysInMonth(current.year, current.month);
  const firstDay    = getFirstDayOfMonth(current.year, current.month);
  const prevDays    = getDaysInMonth(current.year, current.month - 1);
  const todayStr    = isoDate(today);

  return (
    <>
      <style>{`
        .cal-day:hover { background: #FFFBEA !important; cursor: pointer; }
        .cal-event:hover { opacity: .85; cursor: pointer; }
        .filter-btn:hover { opacity: .8; }
        .view-btn:hover { background: #F5F0E8 !important; }
        .cal-input:focus { border-color: #FFD400 !important; }
      `}</style>

      <div>
        {/* ── Header ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:900, color:"#111110", letterSpacing:"-0.5px", marginBottom:2 }}>Calendar</h1>
            <p style={{ fontSize:13, color:"#9B8F7A" }}>Events, deadlines & personal tasks</p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {/* Navigation */}
            <div style={{ display:"flex", border:"2px solid #111110" }}>
              <button onClick={prevPeriod} style={{ width:34, height:34, background:"#fff", border:"none", borderRight:"1px solid #E0D8CA", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={nextPeriod} style={{ width:34, height:34, background:"#fff", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <ChevronRight size={16} />
              </button>
            </div>
            {/* View switcher */}
            <div style={{ display:"flex", border:"2px solid #111110", overflow:"hidden" }}>
              {(["Month","Week","Day"] as const).map(v => (
                <button key={v} className="view-btn" onClick={() => setView(v.toLowerCase() as ViewMode)}
                  style={{ padding:"7px 16px", border:"none", borderRight: v!=="Day"?"1px solid #E0D8CA":"none", background: view===v.toLowerCase()?"#111110":"#fff", color: view===v.toLowerCase()?"#FFD400":"#111110", fontSize:12, fontWeight:700, cursor:"pointer", transition:"background 0.1s" }}>
                  {v}
                </button>
              ))}
            </div>
            {/* Sort */}
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", border:"2px solid #111110", background:"#fff", fontSize:11, fontWeight:700, color:"#111110" }}>
              <Filter size={12} /> Sort: A-Z
            </div>
            {/* New event */}
            <button onClick={() => { setShowForm(true); setSelectedDate(todayStr); }}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"#FFD400", border:"2px solid #111110", fontSize:12, fontWeight:800, cursor:"pointer", boxShadow:"2px 2px 0 #111110" }}>
              <Plus size={14} strokeWidth={3} /> Create new
            </button>
          </div>
        </div>

        {/* ── Filter chips ── */}
        <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginRight:4 }}>Show:</span>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <button key={key} className="filter-btn" onClick={() => toggleFilter(key)}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", border:`2px solid ${activeFilters.has(key) ? cfg.dot : "#E0D8CA"}`, background: activeFilters.has(key) ? cfg.color : "#fff", fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.1s", borderRadius:0 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background: activeFilters.has(key) ? cfg.dot : "#d4cfc4" }} />
              {cfg.label}
            </button>
          ))}
          <button onClick={() => setFilters(new Set(Object.keys(TYPE_CONFIG)))}
            style={{ padding:"4px 10px", border:"2px solid #d4cfc4", background:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", color:"#9B8F7A" }}>
            All
          </button>
          <button onClick={() => setFilters(new Set())}
            style={{ padding:"4px 10px", border:"2px solid #d4cfc4", background:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", color:"#9B8F7A" }}>
            None
          </button>
        </div>

        {/* ── Period label ── */}
        <div style={{ fontSize:22, fontWeight:900, color:"#111110", letterSpacing:"-0.5px", marginBottom:16 }}>
          {view === "month" && `${MONTHS[current.month]} ${current.year}`}
          {view === "week" && (() => { const w = getWeekDates(); return `${MONTHS[w[0].getMonth()]} ${w[0].getDate()} – ${w[6].getDate()}, ${w[6].getFullYear()}`; })()}
          {view === "day" && (() => { const d = new Date(current.year, current.month, current.day); return `${d.toLocaleDateString("en-US",{weekday:"long"})}, ${MONTHS[current.month]} ${current.day}`; })()}
        </div>

        {/* ── MONTH VIEW ── */}
        {view === "month" && (
          <div style={{ background:"#fff", border:"2px solid #111110", boxShadow:"3px 3px 0 #111110", overflow:"hidden" }}>
            {/* Day headers */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"2px solid #111110" }}>
              {DAYS_SHORT.map(d => (
                <div key={d} style={{ padding:"10px 0", textAlign:"center", fontSize:11, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", borderRight:"1px solid #E0D8CA" }}>
                  {d}
                </div>
              ))}
            </div>
            {/* Grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
              {/* Prev month days */}
              {Array.from({length: firstDay}).map((_, i) => (
                <div key={`p${i}`} style={{ minHeight:110, borderBottom:"1px solid #E0D8CA", borderRight:"1px solid #E0D8CA", padding:"8px 10px", background:"#FAFAF8" }}>
                  <span style={{ fontSize:12, fontWeight:600, color:"#d4cfc4" }}>{prevDays - firstDay + i + 1}</span>
                </div>
              ))}
              {/* Current month */}
              {Array.from({length: daysInMonth}).map((_, i) => {
                const day = i + 1;
                const dateStr = `${current.year}-${String(current.month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const dayItems = getItemsForDate(dateStr);
                const isToday = dateStr === todayStr;
                const colIndex = (firstDay + i) % 7;
                return (
                  <div key={day} className="cal-day"
                    onClick={() => { setSelectedDate(dateStr); setView("day"); setCurrent(p => ({...p, day})); }}
                    style={{ minHeight:110, borderBottom:"1px solid #E0D8CA", borderRight: colIndex===6?"none":"1px solid #E0D8CA", padding:"8px 10px", background:"#fff", position:"relative", transition:"background 0.1s" }}>
                    <div style={{ marginBottom:6 }}>
                      {isToday ? (
                        <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:24, height:24, background:"#111110", color:"#FFD400", fontSize:12, fontWeight:900, borderRadius:"50%" }}>{day}</span>
                      ) : (
                        <span style={{ fontSize:12, fontWeight:700, color:"#111110" }}>{day}</span>
                      )}
                    </div>
                    {dayItems.slice(0,3).map(ev => (
                      <div key={ev.id} className="cal-event"
                        onClick={e => { e.stopPropagation(); setSelectedEvent(ev); }}
                        style={{ display:"flex", alignItems:"center", gap:4, padding:"2px 6px", marginBottom:2, background: TYPE_CONFIG[ev.type]?.color||"#F5F0E8", border:`1px solid ${TYPE_CONFIG[ev.type]?.dot||"#E0D8CA"}`, fontSize:10, fontWeight:700, color:"#111110", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", transition:"opacity 0.1s" }}>
                        <div style={{ width:5, height:5, borderRadius:"50%", background: TYPE_CONFIG[ev.type]?.dot||"#9B8F7A", flexShrink:0 }} />
                        {ev.title}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div style={{ fontSize:9, fontWeight:700, color:"#9B8F7A", marginTop:2 }}>⋯ {dayItems.length-3} more</div>
                    )}
                  </div>
                );
              })}
              {/* Fill remaining */}
              {Array.from({length: (7 - (firstDay + daysInMonth) % 7) % 7}).map((_, i) => (
                <div key={`n${i}`} style={{ minHeight:110, borderBottom:"1px solid #E0D8CA", borderRight: i<5?"1px solid #E0D8CA":"none", padding:"8px 10px", background:"#FAFAF8" }}>
                  <span style={{ fontSize:12, fontWeight:600, color:"#d4cfc4" }}>{i+1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WEEK VIEW ── */}
        {view === "week" && (
          <div style={{ background:"#fff", border:"2px solid #111110", boxShadow:"3px 3px 0 #111110", overflow:"hidden" }}>
            {/* Headers */}
            <div style={{ display:"grid", gridTemplateColumns:"60px repeat(7,1fr)", borderBottom:"2px solid #111110" }}>
              <div style={{ borderRight:"1px solid #E0D8CA" }} />
              {getWeekDates().map((d, i) => {
                const ds = isoDate(d);
                const isT = ds === todayStr;
                return (
                  <div key={i} style={{ padding:"10px 8px", textAlign:"center", borderRight: i<6?"1px solid #E0D8CA":"none", background: isT?"#FFFBEA":"#fff" }}>
                    <div style={{ fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.08em" }}>{DAYS_SHORT[i]}, {d.getDate()}</div>
                  </div>
                );
              })}
            </div>
            {/* All-day row */}
            <div style={{ display:"grid", gridTemplateColumns:"60px repeat(7,1fr)", borderBottom:"1px solid #E0D8CA" }}>
              <div style={{ padding:"6px 8px", fontSize:9, fontWeight:700, color:"#9B8F7A", textAlign:"right", borderRight:"1px solid #E0D8CA", display:"flex", alignItems:"center", justifyContent:"flex-end" }}>all-day</div>
              {getWeekDates().map((d, i) => {
                const ds = isoDate(d);
                const dayItems = getItemsForDate(ds).filter(e => e.all_day);
                return (
                  <div key={i} style={{ padding:"4px 4px", borderRight: i<6?"1px solid #E0D8CA":"none", minHeight:28 }}>
                    {dayItems.slice(0,2).map(ev => (
                      <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                        style={{ fontSize:9, fontWeight:700, padding:"2px 5px", marginBottom:2, background: TYPE_CONFIG[ev.type]?.color||"#F5F0E8", border:`1px solid ${TYPE_CONFIG[ev.type]?.dot||"#E0D8CA"}`, color:"#111110", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"pointer" }}>
                        <span style={{ display:"inline-block", width:5, height:5, borderRadius:"50%", background: TYPE_CONFIG[ev.type]?.dot||"#9B8F7A", marginRight:3 }} />
                        {ev.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            {/* Hour rows */}
            {HOURS.map(h => (
              <div key={h} style={{ display:"grid", gridTemplateColumns:"60px repeat(7,1fr)", borderBottom:"1px solid #F0EBE1" }}>
                <div style={{ padding:"6px 8px", fontSize:10, fontWeight:600, color:"#9B8F7A", textAlign:"right", borderRight:"1px solid #E0D8CA" }}>{h > 12 ? `${h-12}pm` : h===12?"12pm":`${h}am`}</div>
                {getWeekDates().map((d, i) => {
                  const ds = isoDate(d);
                  const hourItems = getItemsForDate(ds).filter(e => !e.all_day && e.start_time && parseInt(e.start_time.split(":")[0]) === h);
                  return (
                    <div key={i} style={{ borderRight: i<6?"1px solid #E0D8CA":"none", minHeight:40, padding:"2px 4px" }}
                      onClick={() => { setSelectedDate(ds); setShowForm(true); setForm(p => ({...p, all_day:false, start_time:`${String(h).padStart(2,"0")}:00`})); }}>
                      {hourItems.map(ev => (
                        <div key={ev.id} onClick={e => { e.stopPropagation(); setSelectedEvent(ev); }}
                          style={{ fontSize:9, fontWeight:700, padding:"2px 5px", background: TYPE_CONFIG[ev.type]?.color||"#F5F0E8", border:`1px solid ${TYPE_CONFIG[ev.type]?.dot||"#E0D8CA"}`, color:"#111110", marginBottom:2, cursor:"pointer" }}>
                          {ev.start_time?.slice(0,5)} {ev.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ── DAY VIEW ── */}
        {view === "day" && (() => {
          const dateStr = `${current.year}-${String(current.month+1).padStart(2,"0")}-${String(current.day).padStart(2,"0")}`;
          const dayItems = getItemsForDate(dateStr);
          const allDayItems = dayItems.filter(e => e.all_day);
          const timedItems = dayItems.filter(e => !e.all_day);
          return (
            <div style={{ background:"#fff", border:"2px solid #111110", boxShadow:"3px 3px 0 #111110", overflow:"hidden" }}>
              <div style={{ padding:"12px 16px", borderBottom:"2px solid #111110", background:"#FFFBEA", fontSize:14, fontWeight:800, color:"#111110" }}>
                {new Date(current.year, current.month, current.day).toLocaleDateString("en-US",{weekday:"long", month:"long", day:"numeric"})}
              </div>
              {/* All-day events */}
              {allDayItems.length > 0 && (
                <div style={{ padding:"8px 16px", borderBottom:"1px solid #E0D8CA", background:"#FAFAF8" }}>
                  {allDayItems.map(ev => (
                    <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", marginBottom:4, background: TYPE_CONFIG[ev.type]?.color||"#F5F0E8", border:`1px solid ${TYPE_CONFIG[ev.type]?.dot||"#E0D8CA"}`, cursor:"pointer" }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background: TYPE_CONFIG[ev.type]?.dot||"#9B8F7A" }} />
                      <span style={{ fontSize:13, fontWeight:700, color:"#111110" }}>{ev.title}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Timed rows */}
              {HOURS.map(h => {
                const hourItems = timedItems.filter(e => e.start_time && parseInt(e.start_time.split(":")[0]) === h);
                return (
                  <div key={h} style={{ display:"grid", gridTemplateColumns:"80px 1fr", borderBottom:"1px solid #F0EBE1", minHeight:56 }}>
                    <div style={{ padding:"8px 12px", fontSize:12, fontWeight:600, color:"#9B8F7A", borderRight:"1px solid #E0D8CA", textAlign:"right" }}>
                      {h > 12 ? `${h-12}:00 pm` : h===12?"12:00 pm":`${h}:00 am`}
                    </div>
                    <div style={{ padding:"6px 12px" }}>
                      {hourItems.map(ev => (
                        <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                          style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px", background: TYPE_CONFIG[ev.type]?.color||"#F5F0E8", borderLeft:`3px solid ${TYPE_CONFIG[ev.type]?.dot||"#9B8F7A"}`, marginBottom:4, cursor:"pointer" }}>
                          <span style={{ fontSize:10, fontWeight:700, color:"#9B8F7A" }}>{ev.start_time?.slice(0,5)}</span>
                          <span style={{ fontSize:13, fontWeight:700, color:"#111110" }}>{ev.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── EVENT DETAIL MODAL ── */}
        {selectedEvent && (
          <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
            onClick={() => setSelectedEvent(null)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:"#fff", border:"2px solid #111110", boxShadow:"6px 6px 0 #111110", width:"100%", maxWidth:420, padding:24 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background: TYPE_CONFIG[selectedEvent.type]?.dot||"#9B8F7A", border:"1.5px solid #111110" }} />
                  <span style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", color:"#9B8F7A" }}>{TYPE_CONFIG[selectedEvent.type]?.label || selectedEvent.type}</span>
                </div>
                <button onClick={() => setSelectedEvent(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#9B8F7A" }}><X size={18} /></button>
              </div>
              <h2 style={{ fontSize:20, fontWeight:900, color:"#111110", letterSpacing:"-0.3px", marginBottom:12 }}>{selectedEvent.title}</h2>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#5C5346", fontWeight:600 }}>
                  <CalIcon size={14} /> {selectedEvent.start_date}{selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.start_date ? ` → ${selectedEvent.end_date}` : ""}
                </div>
                {selectedEvent.start_time && (
                  <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#5C5346", fontWeight:600 }}>
                    <Clock size={14} /> {selectedEvent.start_time?.slice(0,5)}{selectedEvent.end_time ? ` – ${selectedEvent.end_time?.slice(0,5)}` : ""}
                  </div>
                )}
                {selectedEvent.description && (
                  <p style={{ fontSize:13, color:"#5C5346", lineHeight:1.6, margin:"4px 0 0" }}>{selectedEvent.description}</p>
                )}
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setSelectedEvent(null)} style={{ flex:1, padding:"10px", border:"2px solid #111110", background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>Close</button>
                <button onClick={() => deleteEvent(selectedEvent.id)} style={{ padding:"10px 16px", border:"2px solid #FF6B6B", background:"#fff", color:"#FF6B6B", fontSize:13, fontWeight:700, cursor:"pointer" }}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* ── CREATE EVENT FORM ── */}
        {showForm && (
          <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
            onClick={() => setShowForm(false)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:"#fff", border:"2px solid #111110", boxShadow:"6px 6px 0 #111110", width:"100%", maxWidth:480 }}>
              {/* Modal header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"2px solid #111110", background:"#FFD400" }}>
                <h2 style={{ fontSize:16, fontWeight:900, color:"#111110", margin:0 }}>New Event</h2>
                <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={18} /></button>
              </div>
              <form onSubmit={handleSave} style={{ padding:20, display:"flex", flexDirection:"column", gap:14 }}>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Title *</label>
                  <input required className="cal-input" value={form.title} onChange={setField("title")} placeholder="Event title" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor="#FFD400")} onBlur={e => (e.target.style.borderColor="#E0D8CA")} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Type</label>
                  <select value={form.type} onChange={setField("type")} style={{ ...inputStyle, cursor:"pointer" }}>
                    {Object.entries(TYPE_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Start date *</label>
                    <input required type="date" value={form.start_date || selectedDate || ""} onChange={setField("start_date")} style={inputStyle}
                      onFocus={e => (e.target.style.borderColor="#FFD400")} onBlur={e => (e.target.style.borderColor="#E0D8CA")} />
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>End date</label>
                    <input type="date" value={form.end_date} onChange={setField("end_date")} style={inputStyle}
                      onFocus={e => (e.target.style.borderColor="#FFD400")} onBlur={e => (e.target.style.borderColor="#E0D8CA")} />
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"#F5F0E8" }}>
                  <input type="checkbox" id="allday" checked={form.all_day} onChange={setField("all_day")} style={{ width:16, height:16, accentColor:"#FFD400" }} />
                  <label htmlFor="allday" style={{ fontSize:13, fontWeight:700, color:"#111110", cursor:"pointer" }}>All-day event</label>
                </div>
                {!form.all_day && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div>
                      <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Start time</label>
                      <input type="time" value={form.start_time} onChange={setField("start_time")} style={inputStyle}
                        onFocus={e => (e.target.style.borderColor="#FFD400")} onBlur={e => (e.target.style.borderColor="#E0D8CA")} />
                    </div>
                    <div>
                      <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>End time</label>
                      <input type="time" value={form.end_time} onChange={setField("end_time")} style={inputStyle}
                        onFocus={e => (e.target.style.borderColor="#FFD400")} onBlur={e => (e.target.style.borderColor="#E0D8CA")} />
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Description</label>
                  <textarea rows={2} value={form.description} onChange={setField("description")} placeholder="Optional notes…"
                    style={{ ...inputStyle, resize:"vertical" }}
                    onFocus={e => (e.target.style.borderColor="#FFD400")} onBlur={e => (e.target.style.borderColor="#E0D8CA")} />
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex:1, padding:"11px", border:"2px solid #111110", background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ flex:1, padding:"11px", border:"2px solid #111110", background:"#FFD400", color:"#111110", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:"3px 3px 0 #111110" }}>
                    {saving ? "Saving…" : "Create Event"}
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
