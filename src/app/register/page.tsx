"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "artist" | "venue";
type Step = "role" | "art" | "account";

const MEDIUMS = ["Oil painting","Acrylic","Watercolor","Photography","Sculpture","Digital art","Printmaking","Drawing","Ceramics","Installation","Video","Mixed media","Textile","Performance"];
const STYLES  = ["Abstract","Realism","Contemporary","Minimalist","Expressionism","Surrealism","Conceptual","Street art","Portrait","Landscape","Figurative","Geometric"];
const VENUE_TYPES = ["Gallery","Café","Restaurant","Hotel","Office","Cultural center","Studio","Pop-up space","Museum","Theater"];
const ART_STYLES  = ["Abstract","Realism","Contemporary","Minimalist","Photography","Illustration","Sculpture","Mixed media","Any style"];

function ProgressDots({ step }: { step: Step }) {
  const steps: Step[] = ["role","art","account"];
  const idx = steps.indexOf(step);
  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      {steps.map((_, i) => (
        <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{
            width:26,height:26,borderRadius:"50%",
            background:i<=idx?"#111110":"#E0D8CA",
            color:i<=idx?"#FFD400":"#9B8F7A",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:11,fontWeight:900,
            border:i<=idx?"2px solid #111110":"2px solid #C0B8A8",
            transition:"all 0.2s",
          }}>{i+1}</div>
          {i<2&&<div style={{width:28,height:2,background:i<idx?"#111110":"#E0D8CA",transition:"background 0.2s"}}/>}
        </div>
      ))}
    </div>
  );
}

function Chip({label,active,accent="#FFD400",onClick}:{label:string;active:boolean;accent?:string;onClick:()=>void}) {
  return (
    <button type="button" onClick={onClick} style={{
      padding:"7px 14px",
      background:active?"#111110":"#fff",
      color:active?accent:"#111110",
      border:`2px solid ${active?"#111110":"#E0D8CA"}`,
      fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
      transition:"all 0.1s",
      boxShadow:active?"2px 2px 0 #666":"none",
    }}>{label}</button>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [step,setStep]   = useState<Step>("role");
  const [role,setRole]   = useState<Role|null>(null);

  // artist
  const [mediums,setMediums]     = useState<string[]>([]);
  const [styles,setStyles]       = useState<string[]>([]);
  const [years,setYears]         = useState("");
  const [city,setCity]           = useState("");
  const [ig,setIg]               = useState("");
  const [bio,setBio]             = useState("");

  // venue
  const [vName,setVName]         = useState("");
  const [vType,setVType]         = useState("");
  const [vStyles,setVStyles]     = useState<string[]>([]);
  const [vCity,setVCity]         = useState("");
  const [vIg,setVIg]             = useState("");

  // account
  const [name,setName]           = useState("");
  const [email,setEmail]         = useState("");
  const [pw,setPw]               = useState("");
  const [loading,setLoading]     = useState(false);
  const [err,setErr]             = useState("");

  function tog(arr:string[],set:(v:string[])=>void,val:string){
    set(arr.includes(val)?arr.filter(x=>x!==val):[...arr,val]);
  }
  function canArt(){return role==="artist"?mediums.length>0:vName.trim()!=""&&vType!="";}

  async function submit(e:React.FormEvent){
    e.preventDefault(); if(!role)return;
    setLoading(true); setErr("");
    try {
      const sb = createClient();
      const {data,error:e2} = await sb.auth.signUp({email,password:pw,options:{data:{full_name:name,role}}});
      if(e2){setErr(e2.message);setLoading(false);return;}
      if(data.user){
        const p:Record<string,unknown>={id:data.user.id,full_name:name,email,role,onboarding_done:true};
        if(role==="artist"){p.mediums=mediums;p.style_tags=styles;p.years_active=years;p.location=city;p.instagram=ig;p.bio=bio;}
        else{p.venue_name=vName;p.venue_type=vType;p.art_styles_sought=vStyles;p.location=vCity;p.instagram=vIg;}
        await sb.from("profiles").upsert(p);
        router.push("/dashboard");
      }
    } catch { setErr("Something went wrong. Please try again."); setLoading(false); }
  }

  const S = { // inline style helpers
    inp: {width:"100%",padding:"11px 13px",border:"2px solid #111110",background:"#fff",fontFamily:"inherit",fontSize:15,fontWeight:600,color:"#111110",outline:"none",borderRadius:0,WebkitAppearance:"none" as const,resize:"none" as const},
    label: {display:"block",fontSize:10,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:"0.14em",color:"#111110",marginBottom:7},
    hint: {fontSize:11,fontWeight:600,color:"#9B8F7A",marginTop:4},
    eyebrow: {display:"inline-block",background:"#111110",color:"#FFD400",padding:"3px 12px",fontSize:10,fontWeight:800,letterSpacing:"0.2em",textTransform:"uppercase" as const,marginBottom:16},
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Darker Grotesque',system-ui,sans-serif;background:#FFFBEA;color:#111110;min-height:100vh}
        input:focus,textarea:focus,select:focus{box-shadow:3px 3px 0 #111110!important;outline:none}
        input::placeholder,textarea::placeholder{color:#C0B8A8;font-weight:500}
        @keyframes float{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-10px) rotate(4deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .fade{animation:fadeUp 0.35s ease forwards}
        .role-card:hover{background:#FFFBEA!important}
        .role-card:hover .cta-arrow{opacity:1!important;transform:translateX(0)!important}
        .btn-next:hover:not(:disabled){box-shadow:6px 6px 0 #9B8F7A!important;transform:translate(-1px,-1px)!important}
        .tag-chip:hover{background:#F5F0E8}
        @media(max-width:768px){.split-left{display:none!important}.split{grid-template-columns:1fr!important}.split-right{padding:40px 24px!important}.role-grid{grid-template-columns:1fr!important}.role-card{border-right:none!important;border-bottom:2.5px solid #111110!important}.role-card:last-child{border-bottom:none!important}}
      `}</style>

      {/* NAV */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:50,padding:"12px 20px"}}>
        <div style={{maxWidth:1000,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff",border:"2.5px solid #111110",borderRadius:9999,padding:"6px 8px 6px 14px",boxShadow:"4px 4px 0 #111110"}}>
          <a href="/" style={{display:"flex",alignItems:"center",gap:6,textDecoration:"none",fontSize:22,lineHeight:1}}>
            🥭<span style={{fontSize:16,fontWeight:900,color:"#111110",letterSpacing:"-0.3px"}}>artomango</span>
          </a>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <ProgressDots step={step}/>
            <a href="/login" style={{fontSize:13,fontWeight:700,color:"#111110",textDecoration:"none",padding:"7px 16px",border:"2px solid #111110",borderRadius:9999,transition:"background 0.1s"}}>Sign in</a>
          </div>
        </div>
      </div>

      <div style={{minHeight:"100vh",paddingTop:80,display:"flex",flexDirection:"column"}}>

        {/* ══ STEP 1: ROLE PICKER ══ */}
        {step==="role" && (
          <div className="fade" style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 20px 64px"}}>
            <div style={{textAlign:"center",marginBottom:48}}>
              <div style={S.eyebrow}>🥭 Create your account</div>
              <h1 style={{fontSize:"clamp(44px,6vw,76px)",fontWeight:900,color:"#111110",letterSpacing:"-2.5px",lineHeight:0.92}}>
                Who are<br/>
                <span style={{display:"inline-block",background:"#111110",color:"#FFD400",padding:"2px 14px"}}>you?</span>
              </h1>
              <p style={{fontSize:16,fontWeight:600,color:"#9B8F7A",marginTop:14}}>Choose your role — it shapes your whole experience.</p>
            </div>

            <div className="role-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",border:"2.5px solid #111110",boxShadow:"6px 6px 0 #111110",maxWidth:840,width:"100%"}}>
              {/* Artist */}
              <button className="role-card" onClick={()=>{setRole("artist");setStep("art");}} style={{padding:"44px 36px",cursor:"pointer",border:"none",background:"#fff",textAlign:"left",fontFamily:"inherit",borderRight:"2.5px solid #111110",transition:"background 0.12s"}}>
                <span style={{fontSize:52,lineHeight:1,display:"block",marginBottom:16}}>🎨</span>
                <span style={{display:"inline-block",background:"#111110",color:"#FFD400",padding:"3px 10px",fontSize:9,fontWeight:800,letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:12}}>Artist</span>
                <div style={{fontSize:24,fontWeight:900,color:"#111110",letterSpacing:"-0.5px",lineHeight:1.05,whiteSpace:"pre-line",marginBottom:16}}>{"Manage, exhibit\n& grow your practice."}</div>
                <ul style={{listStyle:"none",display:"flex",flexDirection:"column",gap:8,marginBottom:28}}>
                  {["Artwork inventory & tracking","Public portfolio page","Sales & collector CRM","Find venues to exhibit"].map(p=>(
                    <li key={p} style={{display:"flex",alignItems:"center",gap:10,fontSize:14,fontWeight:600,color:"#5C5346"}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:"#FFD400",border:"1.5px solid #111110",flexShrink:0}}/>
                      {p}
                    </li>
                  ))}
                </ul>
                <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 20px",background:"#111110",color:"#FFD400",fontFamily:"inherit",fontSize:13,fontWeight:800}}>
                  I'm an artist <span className="cta-arrow" style={{opacity:0,transform:"translateX(-6px)",transition:"all 0.15s"}}>→</span>
                </div>
              </button>

              {/* Venue */}
              <button className="role-card" onClick={()=>{setRole("venue");setStep("art");}} style={{padding:"44px 36px",cursor:"pointer",border:"none",background:"#fff",textAlign:"left",fontFamily:"inherit",transition:"background 0.12s"}}>
                <span style={{fontSize:52,lineHeight:1,display:"block",marginBottom:16}}>🏛️</span>
                <span style={{display:"inline-block",background:"#111110",color:"#4ECDC4",padding:"3px 10px",fontSize:9,fontWeight:800,letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:12}}>Venue</span>
                <div style={{fontSize:24,fontWeight:900,color:"#111110",letterSpacing:"-0.5px",lineHeight:1.05,whiteSpace:"pre-line",marginBottom:16}}>{"Discover artists &\nfill your walls."}</div>
                <ul style={{listStyle:"none",display:"flex",flexDirection:"column",gap:8,marginBottom:28}}>
                  {["Browse local artists","Manage exhibitions","Post collab requests","Event management"].map(p=>(
                    <li key={p} style={{display:"flex",alignItems:"center",gap:10,fontSize:14,fontWeight:600,color:"#5C5346"}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:"#4ECDC4",border:"1.5px solid #111110",flexShrink:0}}/>
                      {p}
                    </li>
                  ))}
                </ul>
                <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 20px",background:"#111110",color:"#4ECDC4",fontFamily:"inherit",fontSize:13,fontWeight:800}}>
                  I run a venue <span className="cta-arrow" style={{opacity:0,transform:"translateX(-6px)",transition:"all 0.15s"}}>→</span>
                </div>
              </button>
            </div>

            <p style={{textAlign:"center",marginTop:24,fontSize:14,fontWeight:600,color:"#9B8F7A"}}>
              Already have an account? <a href="/login" style={{color:"#111110",fontWeight:800,textUnderlineOffset:3}}>Sign in</a>
            </p>
          </div>
        )}

        {/* ══ STEP 2: ART / VENUE QUESTIONS ══ */}
        {step==="art" && role && (
          <div className="fade split" style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",borderTop:"3px solid #111110"}}>
            {/* Left */}
            <div className="split-left" style={{background:"#FFD400",borderRight:"3px solid #111110",padding:"60px 52px",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
              <div>
                <button onClick={()=>setStep("role")} style={{display:"inline-flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",marginBottom:24,padding:0}}>
                  <span style={{background:"#111110",color:"#FFD400",padding:"3px 10px",fontSize:10,fontWeight:800,letterSpacing:"0.16em",textTransform:"uppercase"}}>← {role==="artist"?"Artist":"Venue"}</span>
                </button>
                <div style={{fontSize:"clamp(32px,4vw,52px)",fontWeight:900,color:"#111110",letterSpacing:"-1.5px",lineHeight:0.95,whiteSpace:"pre-line",marginBottom:12}}>
                  {role==="artist"?"Tell us about\nyour art.":"Tell us about\nyour venue."}
                </div>
                <div style={{fontSize:15,fontWeight:600,color:"rgba(17,17,16,0.6)",lineHeight:1.5,marginBottom:28}}>
                  {role==="artist"?"This helps us match you with the right venues and collectors.":"This helps artists find you and understand what you're looking for."}
                </div>
                <ul style={{listStyle:"none",display:"flex",flexDirection:"column",gap:10}}>
                  {(role==="artist"
                    ?["Your medium & style","Years of practice","Where you're based","Instagram handle","Short bio"]
                    :["Venue name & type","Art styles you seek","Location","Instagram handle"]
                  ).map(p=>(
                    <li key={p} style={{display:"flex",alignItems:"center",gap:10,fontSize:15,fontWeight:700,color:"#111110"}}>
                      <span style={{width:20,height:20,background:"#111110",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#FFD400",fontWeight:900,flexShrink:0}}>✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <span style={{fontSize:56,lineHeight:1,animation:"float 3s ease-in-out infinite",display:"block"}}>🥭</span>
            </div>

            {/* Right */}
            <div className="split-right" style={{background:"#FFFBEA",padding:"56px 52px",display:"flex",flexDirection:"column",overflowY:"auto"}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.2em",textTransform:"uppercase",color:"#9B8F7A",marginBottom:6}}>Step 2 of 3 · About {role==="artist"?"your art":"your venue"}</div>
              <div style={{fontSize:32,fontWeight:900,color:"#111110",letterSpacing:"-0.8px",marginBottom:4}}>{role==="artist"?"Your practice.":"Your venue."}</div>
              <div style={{fontSize:15,fontWeight:600,color:"#9B8F7A",marginBottom:32}}>
                {role==="artist"?"Tell us what you make and where you're coming from.":"Help artists understand what you're looking for."}
              </div>

              {role==="artist"?(
                <div style={{display:"flex",flexDirection:"column",gap:20,marginBottom:28}}>
                  <div>
                    <label style={S.label}>What mediums do you work in? <span style={{color:"#FF6B6B"}}>*</span></label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {MEDIUMS.map(m=><Chip key={m} label={m} active={mediums.includes(m)} onClick={()=>tog(mediums,setMediums,m)}/>)}
                    </div>
                    <div style={S.hint}>Select all that apply</div>
                  </div>
                  <div>
                    <label style={S.label}>Your artistic style</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {STYLES.map(s=><Chip key={s} label={s} active={styles.includes(s)} onClick={()=>tog(styles,setStyles,s)}/>)}
                    </div>
                  </div>
                  <div>
                    <label style={S.label}>Years active</label>
                    <select style={{...S.inp}} value={years} onChange={e=>setYears(e.target.value)}>
                      <option value="">Select…</option>
                      {["Less than 1 year","1–3 years","3–5 years","5–10 years","10–20 years","20+ years"].map(y=><option key={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>City / Location</label>
                    <input style={S.inp} type="text" placeholder="e.g. Prague, Berlin, Tehran…" value={city} onChange={e=>setCity(e.target.value)}/>
                  </div>
                  <div>
                    <label style={S.label}>Instagram handle</label>
                    <input style={S.inp} type="text" placeholder="@yourhandle" value={ig} onChange={e=>setIg(e.target.value)}/>
                  </div>
                  <div>
                    <label style={S.label}>Short bio</label>
                    <textarea style={S.inp} rows={3} placeholder="A few words about your work and practice…" value={bio} onChange={e=>setBio(e.target.value)}/>
                    <div style={S.hint}>Shown on your public portfolio</div>
                  </div>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:20,marginBottom:28}}>
                  <div>
                    <label style={S.label}>Venue name <span style={{color:"#FF6B6B"}}>*</span></label>
                    <input style={S.inp} type="text" placeholder="e.g. Galerie Nord" value={vName} onChange={e=>setVName(e.target.value)} required/>
                  </div>
                  <div>
                    <label style={S.label}>Venue type <span style={{color:"#FF6B6B"}}>*</span></label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {VENUE_TYPES.map(t=><Chip key={t} label={t} active={vType===t} accent="#4ECDC4" onClick={()=>setVType(t)}/>)}
                    </div>
                  </div>
                  <div>
                    <label style={S.label}>Art styles you're looking for</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {ART_STYLES.map(s=><Chip key={s} label={s} active={vStyles.includes(s)} accent="#4ECDC4" onClick={()=>tog(vStyles,setVStyles,s)}/>)}
                    </div>
                  </div>
                  <div>
                    <label style={S.label}>City / Location</label>
                    <input style={S.inp} type="text" placeholder="e.g. Prague, Brno…" value={vCity} onChange={e=>setVCity(e.target.value)}/>
                  </div>
                  <div>
                    <label style={S.label}>Instagram handle</label>
                    <input style={S.inp} type="text" placeholder="@yourvenue" value={vIg} onChange={e=>setVIg(e.target.value)}/>
                  </div>
                </div>
              )}

              <button className="btn-next" disabled={!canArt()} onClick={()=>setStep("account")} style={{width:"100%",padding:15,background:"#111110",color:"#FFD400",fontFamily:"inherit",fontSize:15,fontWeight:900,border:"2.5px solid #111110",cursor:"pointer",boxShadow:"4px 4px 0 #9B8F7A",transition:"all 0.1s",letterSpacing:"-0.2px",opacity:canArt()?1:0.4}}>
                Continue →
              </button>
              <button onClick={()=>setStep("account")} style={{width:"100%",padding:10,background:"transparent",color:"#9B8F7A",fontFamily:"inherit",fontSize:13,fontWeight:700,border:"2px solid #E0D8CA",cursor:"pointer",marginTop:10}}>
                Skip for now — I'll fill this in later
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3: ACCOUNT ══ */}
        {step==="account" && role && (
          <div className="fade split" style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",borderTop:"3px solid #111110"}}>
            {/* Left */}
            <div className="split-left" style={{background:"#FFD400",borderRight:"3px solid #111110",padding:"60px 52px",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
              <div>
                <button onClick={()=>setStep("art")} style={{display:"inline-flex",alignItems:"center",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",marginBottom:24,padding:0}}>
                  <span style={{background:"#111110",color:"#FFD400",padding:"3px 10px",fontSize:10,fontWeight:800,letterSpacing:"0.16em",textTransform:"uppercase"}}>← Back</span>
                </button>
                <div style={{fontSize:"clamp(32px,4vw,52px)",fontWeight:900,color:"#111110",letterSpacing:"-1.5px",lineHeight:0.95,whiteSpace:"pre-line",marginBottom:12}}>{"Almost\nthere."}</div>
                <div style={{fontSize:15,fontWeight:600,color:"rgba(17,17,16,0.6)",lineHeight:1.5,marginBottom:28}}>Create your account and start managing your art from day one.</div>
                <ul style={{listStyle:"none",display:"flex",flexDirection:"column",gap:10}}>
                  {["Free to join","No credit card needed","Set up in under 2 minutes","Your data stays yours"].map(p=>(
                    <li key={p} style={{display:"flex",alignItems:"center",gap:10,fontSize:15,fontWeight:700,color:"#111110"}}>
                      <span style={{width:20,height:20,background:"#111110",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#FFD400",fontWeight:900,flexShrink:0}}>✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <span style={{fontSize:56,lineHeight:1,animation:"float 3s ease-in-out infinite",display:"block"}}>🥭</span>
            </div>

            {/* Right */}
            <div className="split-right" style={{background:"#FFFBEA",padding:"56px 52px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.2em",textTransform:"uppercase",color:"#9B8F7A",marginBottom:6}}>Step 3 of 3 · Create account</div>
              <div style={{fontSize:32,fontWeight:900,color:"#111110",letterSpacing:"-0.8px",marginBottom:4}}>Your account.</div>
              <div style={{fontSize:15,fontWeight:600,color:"#9B8F7A",marginBottom:32}}>Last step — fill in your details below.</div>

              {err&&<div style={{background:"#FFE4E6",border:"2px solid #FF6B6B",padding:"10px 14px",fontSize:13,fontWeight:700,color:"#9B1C1C",marginBottom:18}}>{err}</div>}

              <form onSubmit={submit}>
                <div style={{display:"flex",flexDirection:"column",gap:20,marginBottom:24}}>
                  <div>
                    <label style={S.label}>Full name</label>
                    <input style={S.inp} type="text" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} required autoFocus/>
                  </div>
                  <div>
                    <label style={S.label}>Email</label>
                    <input style={S.inp} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required/>
                  </div>
                  <div>
                    <label style={S.label}>Password</label>
                    <input style={S.inp} type="password" placeholder="Min. 8 characters" value={pw} onChange={e=>setPw(e.target.value)} required minLength={8}/>
                    <div style={S.hint}>At least 8 characters</div>
                  </div>
                </div>

                <button type="submit" className="btn-next" disabled={loading} style={{width:"100%",padding:15,background:"#111110",color:"#FFD400",fontFamily:"inherit",fontSize:15,fontWeight:900,border:"2.5px solid #111110",cursor:loading?"not-allowed":"pointer",boxShadow:"4px 4px 0 #9B8F7A",transition:"all 0.1s",opacity:loading?0.6:1}}>
                  {loading?"Creating account…":`Join as ${role==="artist"?"Artist":"Venue"} →`}
                </button>
              </form>

              <div style={{display:"flex",alignItems:"center",gap:12,margin:"18px 0"}}>
                <div style={{flex:1,height:1,background:"#E0D8CA"}}/>
                <div style={{fontSize:11,fontWeight:700,color:"#C0B8A8",textTransform:"uppercase",letterSpacing:"0.1em"}}>or</div>
                <div style={{flex:1,height:1,background:"#E0D8CA"}}/>
              </div>

              <p style={{textAlign:"center",fontSize:14,fontWeight:600,color:"#9B8F7A"}}>
                Already have an account? <a href="/login" style={{color:"#111110",fontWeight:800,textUnderlineOffset:3}}>Sign in</a>
              </p>
              <p style={{fontSize:11,fontWeight:600,color:"#C0B8A8",textAlign:"center",marginTop:14,lineHeight:1.5}}>
                By creating an account you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
