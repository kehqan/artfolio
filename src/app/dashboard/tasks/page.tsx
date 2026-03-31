"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, X, ChevronRight, LayoutList, Columns,
  Check, Circle, Clock, AlertCircle, Trash2,
  Calendar, Tag, ChevronDown,
} from "lucide-react";

type Task = {
  id: string; title: string; description?: string;
  status: string; priority: string; type: string;
  due_date?: string; progress: number;
  checklist: { text: string; done: boolean }[];
  created_at: string;
};

const STATUS_CFG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  pending:     { label: "Pending",     color: "#FF6B6B", icon: Circle,       bg: "#FFE4E6" },
  in_progress: { label: "In Progress", color: "#FFD400", icon: Clock,        bg: "#FEF9C3" },
  done:        { label: "Done",        color: "#4ECDC4", icon: Check,        bg: "#DCFCE7" },
  cancelled:   { label: "Cancelled",   color: "#9B8F7A", icon: AlertCircle,  bg: "#F5F0E8" },
};

const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  low:    { label: "Low",    color: "#4ECDC4" },
  medium: { label: "Medium", color: "#FFD400" },
  high:   { label: "High",   color: "#FF6B6B" },
};

const TYPE_CFG: Record<string, string> = {
  personal:   "Personal",
  exhibition: "Exhibition",
  artwork:    "Artwork",
  sale:       "Sale",
  collab:     "Collab",
  event:      "Event",
};

type ViewMode = "list" | "kanban";
type FilterMode = "all" | "pending" | "done";

export default function TasksPage() {
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState<ViewMode>("list");
  const [filter, setFilter]       = useState<FilterMode>("all");
  const [showForm, setShowForm]   = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [saving, setSaving]       = useState(false);
  const [newCheckItem, setNewCheckItem] = useState("");

  const [form, setForm] = useState({
    title: "", description: "", type: "personal",
    priority: "medium", status: "pending",
    due_date: "", progress: 0,
    checklist: [] as { text: string; done: boolean }[],
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTasks((data || []).map(t => ({ ...t, checklist: Array.isArray(t.checklist) ? t.checklist : [] })));
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from("tasks").insert({
      user_id: user.id, ...form,
      due_date: form.due_date || null,
      checklist: form.checklist,
    });
    setShowForm(false);
    setForm({ title:"",description:"",type:"personal",priority:"medium",status:"pending",due_date:"",progress:0,checklist:[] });
    setSaving(false); load();
  }

  async function updateStatus(id: string, status: string) {
    const supabase = createClient();
    await supabase.from("tasks").update({ status, progress: status === "done" ? 100 : undefined }).eq("id", id);
    setTasks(p => p.map(t => t.id === id ? { ...t, status, progress: status==="done"?100:t.progress } : t));
    if (selectedTask?.id === id) setSelectedTask(p => p ? { ...p, status } : p);
  }

  async function updateProgress(id: string, progress: number) {
    const supabase = createClient();
    await supabase.from("tasks").update({ progress }).eq("id", id);
    setTasks(p => p.map(t => t.id === id ? { ...t, progress } : t));
    if (selectedTask?.id === id) setSelectedTask(p => p ? { ...p, progress } : p);
  }

  async function toggleChecklist(taskId: string, idx: number) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newList = task.checklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c);
    const done = newList.filter(c => c.done).length;
    const prog = Math.round((done / newList.length) * 100);
    const supabase = createClient();
    await supabase.from("tasks").update({ checklist: newList, progress: prog }).eq("id", taskId);
    setTasks(p => p.map(t => t.id === taskId ? { ...t, checklist: newList, progress: prog } : t));
    if (selectedTask?.id === taskId) setSelectedTask(p => p ? { ...p, checklist: newList, progress: prog } : p);
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    const supabase = createClient();
    await supabase.from("tasks").delete().eq("id", id);
    setTasks(p => p.filter(t => t.id !== id));
    setSelectedTask(null);
  }

  function addCheckItem() {
    if (!newCheckItem.trim()) return;
    setForm(p => ({ ...p, checklist: [...p.checklist, { text: newCheckItem.trim(), done: false }] }));
    setNewCheckItem("");
  }

  const filtered = tasks.filter(t => {
    if (filter === "pending") return t.status === "pending" || t.status === "in_progress";
    if (filter === "done") return t.status === "done";
    return true;
  });

  const inputStyle: React.CSSProperties = {
    width:"100%", padding:"9px 12px", background:"#fff",
    border:"2px solid #E0D8CA", fontSize:13, fontFamily:"inherit",
    outline:"none", boxSizing:"border-box", color:"#111110",
  };

  const ProgressBar = ({ value, priority }: { value: number; priority: string }) => (
    <div style={{ width:"100%", height:4, background:"#E0D8CA", overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${value}%`, background: PRIORITY_CFG[priority]?.color||"#FFD400", transition:"width 0.3s" }} />
    </div>
  );

  const TaskRow = ({ task }: { task: Task }) => {
    const StatusIcon = STATUS_CFG[task.status]?.icon || Circle;
    const done = task.status === "done";
    return (
      <div style={{ display:"grid", gridTemplateColumns:"32px 1fr auto auto auto auto", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:"1px solid #E0D8CA", transition:"background 0.1s", cursor:"pointer" }}
        onMouseEnter={e => (e.currentTarget.style.background="#FAFAF8")}
        onMouseLeave={e => (e.currentTarget.style.background="transparent")}
        onClick={() => setSelectedTask(task)}>
        {/* Check/status toggle */}
        <button onClick={e => { e.stopPropagation(); updateStatus(task.id, done?"pending":"done"); }}
          style={{ width:28, height:28, border:`2px solid ${STATUS_CFG[task.status]?.color||"#E0D8CA"}`, background: done?STATUS_CFG["done"].bg:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
          {done && <Check size={14} color="#4ECDC4" strokeWidth={3} />}
        </button>
        {/* Title + progress */}
        <div style={{ minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontSize:14, fontWeight:700, color: done?"#9B8F7A":"#111110", textDecoration: done?"line-through":"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {task.title}
            </span>
            {task.type !== "personal" && (
              <span style={{ padding:"1px 7px", background:"#F5F0E8", border:"1px solid #E0D8CA", fontSize:9, fontWeight:700, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.08em", flexShrink:0 }}>{TYPE_CFG[task.type]}</span>
            )}
          </div>
          <ProgressBar value={task.progress} priority={task.priority} />
        </div>
        {/* Checklist count */}
        {task.checklist.length > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700, color:"#9B8F7A", flexShrink:0 }}>
            <Check size={11} strokeWidth={2.5} />
            {task.checklist.filter(c=>c.done).length}/{task.checklist.length}
          </div>
        )}
        {/* Due date */}
        {task.due_date && (
          <div style={{ fontSize:11, fontWeight:700, color:"#9B8F7A", border:"1px solid #E0D8CA", padding:"3px 8px", flexShrink:0, background:"#fff" }}>
            {new Date(task.due_date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
          </div>
        )}
        {/* Arrow */}
        <ChevronRight size={14} color="#d4cfc4" />
      </div>
    );
  };

  return (
    <>
      <style>{`
        .task-row:hover { background: #FAFAF8 !important; }
        .kan-card:hover { box-shadow: 5px 5px 0 #111110 !important; transform: translate(-1px,-1px); }
      `}</style>

      <div>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:900, color:"#111110", letterSpacing:"-0.5px", marginBottom:2 }}>Tasks</h1>
            <p style={{ fontSize:13, color:"#9B8F7A" }}>{tasks.filter(t=>t.status!=="done").length} active · {tasks.filter(t=>t.status==="done").length} done</p>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {/* View toggle */}
            <div style={{ display:"flex", border:"2px solid #111110", overflow:"hidden" }}>
              <button onClick={() => setView("list")} style={{ width:36, height:34, border:"none", borderRight:"1px solid #E0D8CA", background: view==="list"?"#111110":"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                <LayoutList size={14} color={view==="list"?"#FFD400":"#111110"} />
              </button>
              <button onClick={() => setView("kanban")} style={{ width:36, height:34, border:"none", background: view==="kanban"?"#111110":"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                <Columns size={14} color={view==="kanban"?"#FFD400":"#111110"} />
              </button>
            </div>
            {/* Sort */}
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", border:"2px solid #111110", background:"#fff", fontSize:11, fontWeight:700, color:"#111110" }}>
              Sort: A-Z
            </div>
            <button onClick={() => setShowForm(true)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"#FFD400", border:"2px solid #111110", fontSize:12, fontWeight:800, cursor:"pointer", boxShadow:"2px 2px 0 #111110" }}>
              <Plus size={14} strokeWidth={3} /> New Task
            </button>
          </div>
        </div>

        {/* ── LIST VIEW ── */}
        {view === "list" && (
          <div style={{ background:"#fff", border:"2px solid #111110", boxShadow:"3px 3px 0 #111110", overflow:"hidden" }}>
            {/* Tab filters */}
            <div style={{ display:"flex", alignItems:"center", borderBottom:"2px solid #111110" }}>
              {([["all","All Tasks"],["pending","Pending"],["done","Done"]] as const).map(([k,l]) => (
                <button key={k} onClick={() => setFilter(k)}
                  style={{ padding:"10px 20px", border:"none", borderRight:"1px solid #E0D8CA", background: filter===k?"#111110":"transparent", color: filter===k?"#fff":"#111110", fontSize:13, fontWeight:filter===k?800:600, cursor:"pointer", transition:"all 0.1s" }}>
                  {l}
                </button>
              ))}
              <div style={{ marginLeft:"auto", padding:"0 14px", fontSize:11, fontWeight:700, color:"#9B8F7A" }}>
                Sort: A-Z
              </div>
            </div>

            {/* New task inline input */}
            <div style={{ display:"grid", gridTemplateColumns:"32px 1fr auto", alignItems:"center", gap:12, padding:"10px 16px", borderBottom:"2px dashed #E0D8CA", background:"#FAFAF8" }}>
              <div style={{ width:28, height:28, border:"2px dashed #d4cfc4", background:"#fff", flexShrink:0 }} />
              <button onClick={() => setShowForm(true)} style={{ textAlign:"left", background:"none", border:"none", fontSize:13, fontWeight:600, color:"#9B8F7A", cursor:"pointer", padding:0 }}>
                Type to add a new task …
              </button>
              <button onClick={() => setShowForm(true)} style={{ padding:"5px 12px", border:"2px solid #111110", background:"#111110", color:"#FFD400", fontSize:11, fontWeight:800, cursor:"pointer", boxShadow:"2px 2px 0 #FFD400" }}>
                Set date
              </button>
            </div>

            {/* Task rows */}
            {loading ? (
              <div style={{ padding:40, textAlign:"center", color:"#9B8F7A", fontSize:13 }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding:"60px 24px", textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>✓</div>
                <div style={{ fontSize:15, fontWeight:800, color:"#111110", marginBottom:6 }}>{filter==="done"?"No completed tasks":"No tasks found"}</div>
                <div style={{ fontSize:13, color:"#9B8F7A", marginBottom:20 }}>Create your first task to get started</div>
                <button onClick={() => setShowForm(true)} style={{ padding:"10px 20px", border:"2px solid #111110", background:"#FFD400", fontWeight:800, fontSize:13, cursor:"pointer", boxShadow:"3px 3px 0 #111110" }}>＋ Add Task</button>
              </div>
            ) : (
              filtered.map(task => <TaskRow key={task.id} task={task} />)
            )}
          </div>
        )}

        {/* ── KANBAN VIEW ── */}
        {view === "kanban" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20, alignItems:"start" }}>
            {(["pending","in_progress","done"] as const).map(status => {
              const cfg = STATUS_CFG[status];
              const StatusIcon = cfg.icon;
              const columnTasks = tasks.filter(t => t.status === status);
              return (
                <div key={status}>
                  {/* Column header */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, paddingLeft:4 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background: cfg.color, border:"2px solid #111110" }} />
                    <span style={{ fontSize:14, fontWeight:900, color:"#111110", letterSpacing:"-0.2px" }}>{cfg.label}</span>
                    <span style={{ marginLeft:"auto", background:"#F5F0E8", border:"1px solid #E0D8CA", padding:"1px 8px", fontSize:11, fontWeight:700, color:"#9B8F7A", borderRadius:20 }}>{columnTasks.length}</span>
                    <button style={{ width:26, height:26, border:"1.5px solid #E0D8CA", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
                      onClick={() => { setShowForm(true); setForm(p => ({...p, status})); }}>
                      <Plus size={13} />
                    </button>
                  </div>
                  {/* Cards */}
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {columnTasks.map(task => (
                      <div key={task.id} className="kan-card"
                        style={{ background:"#fff", border:"2px solid #111110", padding:"14px 16px", boxShadow:"3px 3px 0 #111110", cursor:"pointer", transition:"transform 0.1s, box-shadow 0.1s" }}
                        onClick={() => setSelectedTask(task)}>
                        <div style={{ fontSize:14, fontWeight:800, color:"#111110", marginBottom:10, lineHeight:1.3 }}>{task.title}</div>
                        {/* Progress */}
                        <div style={{ marginBottom:10 }}>
                          <ProgressBar value={task.progress} priority={task.priority} />
                        </div>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          {task.due_date && (
                            <div style={{ fontSize:11, fontWeight:700, color:"#9B8F7A", border:"1px solid #E0D8CA", padding:"2px 8px", background:"#fff" }}>
                              {new Date(task.due_date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                            </div>
                          )}
                          <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700, color:"#9B8F7A", marginLeft:"auto" }}>
                            {task.checklist.length > 0 && <><Check size={11} />{task.checklist.filter(c=>c.done).length}/{task.checklist.length}</>}
                          </div>
                          {/* Priority dot */}
                          <div style={{ width:8, height:8, borderRadius:"50%", background: PRIORITY_CFG[task.priority]?.color||"#FFD400", border:"1.5px solid #111110", marginLeft:8, flexShrink:0 }} />
                        </div>
                      </div>
                    ))}
                    {/* Add card */}
                    <button onClick={() => { setShowForm(true); setForm(p => ({...p, status})); }}
                      style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"center", padding:"10px", border:"2px dashed #d4cfc4", background:"transparent", fontSize:12, fontWeight:700, color:"#9B8F7A", cursor:"pointer" }}>
                      <Plus size={13} /> Add a task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TASK DETAIL MODAL ── */}
        {selectedTask && (
          <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
            onClick={() => setSelectedTask(null)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:"#fff", border:"2px solid #111110", boxShadow:"6px 6px 0 #111110", width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" }}>
              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", borderBottom:"2px solid #111110" }}>
                <button onClick={() => updateStatus(selectedTask.id, selectedTask.status==="done"?"pending":"done")}
                  style={{ display:"flex", alignItems:"center", gap:8, border:`2px solid ${STATUS_CFG[selectedTask.status]?.color||"#E0D8CA"}`, background: selectedTask.status==="done"?STATUS_CFG["done"].bg:"#fff", padding:"5px 12px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  {selectedTask.status === "done"
                    ? <><Check size={14} color="#4ECDC4" strokeWidth={3} /> Mark as complete</>
                    : <><Check size={14} color="#4ECDC4" strokeWidth={3} /> Mark as complete</>
                  }
                </button>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => deleteTask(selectedTask.id)} style={{ width:30, height:30, border:"1.5px solid #FF6B6B", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                    <Trash2 size={13} color="#FF6B6B" />
                  </button>
                  <button onClick={() => setSelectedTask(null)} style={{ width:30, height:30, border:"1.5px solid #E0D8CA", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
              <div style={{ padding:"20px 20px 24px" }}>
                <h2 style={{ fontSize:22, fontWeight:900, color:"#111110", letterSpacing:"-0.5px", marginBottom:6 }}>{selectedTask.title}</h2>
                <p style={{ fontSize:12, color:"#9B8F7A", fontWeight:600, marginBottom:20 }}>
                  Task created on {new Date(selectedTask.created_at).toLocaleDateString("en-US",{day:"numeric",month:"long",year:"numeric"})}
                </p>

                {/* Meta row */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20, paddingBottom:20, borderBottom:"1px dotted #E0D8CA" }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Status</div>
                    <select value={selectedTask.status} onChange={e => updateStatus(selectedTask.id, e.target.value)}
                      style={{ padding:"5px 10px", border:"2px solid #111110", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", background: STATUS_CFG[selectedTask.status]?.bg||"#fff" }}>
                      {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  {selectedTask.due_date && (
                    <div>
                      <div style={{ fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Due date</div>
                      <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 10px", border:"2px solid #111110", fontSize:12, fontWeight:700 }}>
                        {new Date(selectedTask.due_date).toLocaleDateString("en-US",{day:"numeric",month:"short",year:"numeric"})}
                        <span style={{ padding:"1px 6px", background:"#FEF9C3", fontSize:9, fontWeight:800, color:"#854D0E", border:"1px solid #E0D8CA" }}>{TYPE_CFG[selectedTask.type]||selectedTask.type}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress */}
                <div style={{ marginBottom:20, paddingBottom:20, borderBottom:"1px dotted #E0D8CA" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <div style={{ fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em" }}>Progress</div>
                    <span style={{ fontSize:12, fontWeight:800, color:"#111110" }}>{selectedTask.progress}%</span>
                  </div>
                  <div style={{ width:"100%", height:6, background:"#E0D8CA", marginBottom:8 }}>
                    <div style={{ height:"100%", width:`${selectedTask.progress}%`, background: PRIORITY_CFG[selectedTask.priority]?.color||"#FFD400", transition:"width 0.3s" }} />
                  </div>
                  <input type="range" min={0} max={100} value={selectedTask.progress}
                    onChange={e => updateProgress(selectedTask.id, parseInt(e.target.value))}
                    style={{ width:"100%", accentColor:"#FFD400" }} />
                </div>

                {/* Description */}
                {selectedTask.description && (
                  <div style={{ marginBottom:20, paddingBottom:20, borderBottom:"1px dotted #E0D8CA" }}>
                    <div style={{ fontSize:14, fontWeight:800, color:"#111110", marginBottom:8 }}>Description</div>
                    <p style={{ fontSize:13, color:"#5C5346", lineHeight:1.7, margin:0, fontWeight:500 }}>{selectedTask.description}</p>
                  </div>
                )}

                {/* Checklist */}
                {selectedTask.checklist.length > 0 && (
                  <div style={{ marginBottom:20, paddingBottom:20, borderBottom:"1px dotted #E0D8CA" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                      <div style={{ fontSize:14, fontWeight:800, color:"#111110" }}>Checklist</div>
                      <span style={{ fontSize:12, fontWeight:700, color:"#9B8F7A" }}>
                        {selectedTask.checklist.filter(c=>c.done).length} / {selectedTask.checklist.length}
                      </span>
                    </div>
                    {/* Checklist progress */}
                    <div style={{ height:4, background:"#E0D8CA", marginBottom:12 }}>
                      <div style={{ height:"100%", background:"#4ECDC4", width:`${Math.round((selectedTask.checklist.filter(c=>c.done).length/selectedTask.checklist.length)*100)}%`, transition:"width 0.3s" }} />
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {selectedTask.checklist.map((item, idx) => (
                        <div key={idx} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0" }}>
                          <button onClick={() => toggleChecklist(selectedTask.id, idx)}
                            style={{ width:22, height:22, border:`2px solid ${item.done?"#4ECDC4":"#E0D8CA"}`, background: item.done?"#DCFCE7":"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                            {item.done && <Check size={12} color="#4ECDC4" strokeWidth={3} />}
                          </button>
                          <span style={{ fontSize:13, fontWeight:600, color: item.done?"#9B8F7A":"#111110", textDecoration: item.done?"line-through":"none" }}>{item.text}</span>
                        </div>
                      ))}
                      <div style={{ display:"flex", gap:8, marginTop:4 }}>
                        <input value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)}
                          onKeyDown={e => e.key==="Enter" && (e.preventDefault(), /* can't update existing task checklist inline easily */ null)}
                          placeholder="Type to add more …"
                          style={{ flex:1, padding:"6px 10px", border:"2px dashed #d4cfc4", fontSize:12, fontFamily:"inherit", outline:"none", background:"#FAFAF8" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── CREATE TASK FORM ── */}
        {showForm && (
          <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
            onClick={() => setShowForm(false)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:"#fff", border:"2px solid #111110", boxShadow:"6px 6px 0 #111110", width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"2px solid #111110", background:"#FFD400" }}>
                <h2 style={{ fontSize:16, fontWeight:900, color:"#111110", margin:0 }}>New Task</h2>
                <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={18} /></button>
              </div>
              <form onSubmit={handleCreate} style={{ padding:20, display:"flex", flexDirection:"column", gap:14 }}>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Title *</label>
                  <input required value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} placeholder="Task title"
                    style={inputStyle} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Type</label>
                    <select value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))} style={{ ...inputStyle, cursor:"pointer" }}>
                      {Object.entries(TYPE_CFG).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Priority</label>
                    <select value={form.priority} onChange={e => setForm(p=>({...p,priority:e.target.value}))} style={{ ...inputStyle, cursor:"pointer" }}>
                      {Object.entries(PRIORITY_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Status</label>
                    <select value={form.status} onChange={e => setForm(p=>({...p,status:e.target.value}))} style={{ ...inputStyle, cursor:"pointer" }}>
                      {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Due date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(p=>({...p,due_date:e.target.value}))}
                    style={inputStyle} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Description</label>
                  <textarea rows={3} value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} placeholder="Optional description…"
                    style={{ ...inputStyle, resize:"vertical" }} onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")} />
                </div>
                {/* Checklist builder */}
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Checklist</label>
                  {form.checklist.map((item, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <div style={{ width:18, height:18, border:"2px solid #E0D8CA", flexShrink:0 }} />
                      <span style={{ flex:1, fontSize:13, fontWeight:600, color:"#111110" }}>{item.text}</span>
                      <button type="button" onClick={() => setForm(p=>({...p,checklist:p.checklist.filter((_,idx)=>idx!==i)}))} style={{ background:"none", border:"none", cursor:"pointer", color:"#9B8F7A" }}><X size={12} /></button>
                    </div>
                  ))}
                  <div style={{ display:"flex", gap:8 }}>
                    <input value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)}
                      onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); addCheckItem(); } }}
                      placeholder="Add checklist item… (Enter to add)"
                      style={{ flex:1, padding:"7px 10px", border:"2px dashed #d4cfc4", fontSize:12, fontFamily:"inherit", outline:"none", background:"#FAFAF8" }} />
                    <button type="button" onClick={addCheckItem} style={{ padding:"7px 12px", border:"2px solid #111110", background:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>+ Add</button>
                  </div>
                </div>
                <div style={{ display:"flex", gap:10, paddingTop:4 }}>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex:1, padding:"11px", border:"2px solid #111110", background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ flex:1, padding:"11px", border:"2px solid #111110", background:"#FFD400", color:"#111110", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:"3px 3px 0 #111110" }}>
                    {saving ? "Saving…" : "Create Task"}
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
