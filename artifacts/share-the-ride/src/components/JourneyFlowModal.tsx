/**
 * JourneyFlowModal
 *
 * Multi-step modal triggered when user clicks "Host" or "Request a Journey".
 * Steps (each skipped if already complete):
 *   1. profile  — Complete profile form
 *   2. otp      — Mobile OTP verification  (bypass: '1234')
 *   3. car-reg  — Vehicle registration (Host mode only)
 *
 * On completion → calls onComplete(mode) so the parent can navigate.
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Phone, Mail, Briefcase, Building2, ArrowRight,
  CheckCircle, Car, Upload, ChevronDown, Shield, Loader2, Linkedin, CreditCard,
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useToast } from "@/hooks/use-toast";

/* ── Design tokens ──────────────────────────────────────────── */
const NAVY   = "#0B132B";
const CARD   = "#0F1E3C";
const BLUE   = "#3A86FF";
const GOLD   = "#D4AF37";
const INP: React.CSSProperties = {
  width: "100%", padding: "11px 14px",
  background: "#F8F9FA", border: "1.5px solid #E2E8F0",
  borderRadius: 12, fontSize: 14, color: NAVY,
  outline: "none", boxSizing: "border-box",
};

type Step = "profile" | "otp" | "car-reg";
type Mode = "host" | "request";

interface Props {
  open:       boolean;
  mode:       Mode;
  onClose:    () => void;
  onComplete: (mode: Mode) => void;
}

const VEHICLE_MAKES = ["Toyota","Honda","Suzuki","KIA","Hyundai","Changan","Mercedes-Benz","BMW","Audi","Nissan","Mitsubishi","DFSK","Other"];
const VEHICLE_TYPES = ["Sedan","SUV","Hatchback","Crossover","Pickup","Van","Other"];
const YEARS = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() - i));

export default function JourneyFlowModal({ open, mode, onClose, onComplete }: Props) {
  const { user, isAuthenticated, refetchUser } = useAuth();
  const { toast } = useToast();
  const userAny = (user as any) ?? {};

  /* ── Derive initial step (checks DB state + localStorage session cache) ── */
  function isMobileOk(): boolean {
    if (Boolean(userAny?.mobileVerified)) return true;
    try {
      return localStorage.getItem("syncin_mob_verified") === "1"
          || localStorage.getItem("auth_success") === "true";
    } catch { return false; }
  }

  function deriveStep(): Step {
    if (!userAny?.profileComplete) return "profile";
    if (!isMobileOk())             return "otp";
    if (mode === "host" && !userAny?.vehicleRegNumber) return "car-reg";
    return "profile"; // won't render; onComplete fires in useEffect below
  }

  const [step, setStep]   = useState<Step>(deriveStep);
  const [busy, setBusy]   = useState(false);

  /* ── Auto-complete: skip modal if user already has everything ── */
  useEffect(() => {
    if (!open) return;
    const profileDone = Boolean(userAny?.profileComplete);
    const mobileDone  = isMobileOk();
    const carDone     = Boolean(userAny?.vehicleRegNumber);
    if (profileDone && mobileDone && (mode !== "host" || carDone)) {
      onComplete(mode);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /* profile form */
  const [pForm, setPForm] = useState({
    firstName:   userAny.firstName   || "",
    lastName:    userAny.lastName    || "",
    email:       userAny.email       || "",
    mobileNumber:userAny.mobileNumber|| "",
    jobTitle:    userAny.jobTitle    || "",
    companyName: userAny.companyName || "",
    linkedinUrl: userAny.linkedinUrl || "",
    cnicNumber:  userAny.cnicNumber  || "",
    bio:         userAny.bio         || "",
  });

  /* otp */
  const [otpSent,   setOtpSent]   = useState(false);
  const [otpCode,   setOtpCode]   = useState("");
  const [devCode,   setDevCode]   = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* car-reg */
  const [carForm, setCarForm] = useState({
    make:  "", model: "", year: String(new Date().getFullYear()),
    type: "Sedan", plate: "",
  });
  const [docName, setDocName] = useState<string | null>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  /* ── Helpers ─────────────────────────────────────────────── */
  const startCountdown = (secs = 60) => {
    setCountdown(secs);
    if (countRef.current) clearInterval(countRef.current);
    countRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(countRef.current!); return 0; } return c - 1; });
    }, 1000);
  };

  /* ── Step handlers ───────────────────────────────────────── */

  /* STEP 1 — Save profile (sets profileComplete = true in DB) */
  const saveProfile = async () => {
    if (!pForm.jobTitle.trim() || !pForm.companyName.trim()) {
      toast({ title: "Required fields missing", description: "Please enter your Designation and Company Name.", variant: "destructive" }); return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pForm }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Server error ${res.status}`);
      }
      /* Refresh shared auth context immediately so other components see profileComplete=true */
      await refetchUser();
      /* next: skip OTP if already mobile-verified (DB) or verified this session (localStorage) */
      if (isMobileOk()) {
        if (mode === "host" && !userAny?.vehicleRegNumber) { setStep("car-reg"); }
        else { onComplete(mode); }
      } else { setStep("otp"); }
    } catch (err: any) {
      toast({ title: "Could not save profile", description: err?.message || "Please try again.", variant: "destructive" });
    }
    finally  { setBusy(false); }
  };

  /* STEP 2 — Send OTP */
  const sendOtp = async () => {
    const mobile = pForm.mobileNumber || userAny?.mobileNumber || "";
    if (!mobile) { toast({ title: "Add your mobile number first", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber: mobile }),
      });
      const data = await res.json();
      setDevCode(data.devOtp ?? null);
      setOtpSent(true);
      startCountdown(60);
    } catch { toast({ title: "Could not send OTP", variant: "destructive" }); }
    finally  { setBusy(false); }
  };

  /* STEP 2 — Verify OTP (hard bypass: '1234' always works) */
  const verifyOtp = async () => {
    if (!otpCode) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpCode }),   /* field name matches backend */
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.error || "Invalid code", variant: "destructive" }); return; }
      /* Cache in localStorage — skip OTP screen on all future modal opens */
      try {
        localStorage.setItem("syncin_mob_verified", "1");
        localStorage.setItem("auth_success", "true");
      } catch { /* safari private mode */ }
      await refetchUser();
      afterOtp();
    } catch { toast({ title: "Verification failed. Please try again.", variant: "destructive" }); }
    finally  { setBusy(false); }
  };

  const afterOtp = () => {
    if (mode === "host" && !userAny?.vehicleRegNumber) { setStep("car-reg"); }
    else { onComplete(mode); }
  };

  /* STEP 3 — Save vehicle (sets vehicleRegNumber in DB → car_registered = true) */
  const saveVehicle = async () => {
    if (!carForm.make || !carForm.model || !carForm.plate.trim()) {
      toast({ title: "Required fields missing", description: "Make, Model and License Plate are required.", variant: "destructive" }); return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleMake: carForm.make, vehicleModel: carForm.model,
          vehicleYear: carForm.year, vehicleType: carForm.type,
          vehicleRegNumber: carForm.plate.toUpperCase().trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Server error ${res.status}`);
      }
      /* Refresh shared auth context — dashboard sees vehicleRegNumber immediately */
      await refetchUser();
      onComplete(mode);
    } catch (err: any) {
      toast({ title: "Could not save vehicle", description: err?.message || "Please try again.", variant: "destructive" });
    }
    finally  { setBusy(false); }
  };

  /* ── Step indicators ─────────────────────────────────────── */
  const steps: { key: Step; label: string }[] = mode === "host"
    ? [{ key:"profile", label:"Profile" }, { key:"otp", label:"Verify" }, { key:"car-reg", label:"Vehicle" }]
    : [{ key:"profile", label:"Profile" }, { key:"otp", label:"Verify" }];

  const stepIdx = steps.findIndex(s => s.key === step);

  if (!open) return null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
      {/* Backdrop */}
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.62)", backdropFilter:"blur(6px)" }} onClick={onClose} />

      <motion.div
        initial={{ opacity:0, scale:0.95, y:16 }}
        animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:0.95, y:16 }}
        transition={{ type:"spring", stiffness:300, damping:28 }}
        style={{
          position:"relative", zIndex:1,
          background: CARD, borderRadius:24,
          padding: "28px 28px 32px",
          width:"100%", maxWidth:440,
          boxShadow:"0 24px 80px rgba(0,0,0,0.55)",
          border:"1px solid rgba(255,255,255,0.10)",
          maxHeight:"90vh", overflowY:"auto",
        }}
      >
        {/* Close */}
        <button onClick={onClose} style={{ position:"absolute", top:18, right:18, width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.08)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <X size={15} color="rgba(255,255,255,0.70)" />
        </button>

        {/* Step progress dots */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:22 }}>
          {steps.map((s, i) => (
            <div key={s.key} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{
                width: i === stepIdx ? 22 : 8, height:8, borderRadius:999,
                background: i < stepIdx ? "#4ade80" : i === stepIdx ? GOLD : "rgba(255,255,255,0.20)",
                transition:"all .3s",
              }} />
              {i < steps.length - 1 && <div style={{ width:16, height:1, background:"rgba(255,255,255,0.15)" }} />}
            </div>
          ))}
          <span style={{ marginLeft:6, fontSize:11, color:"rgba(255,255,255,0.40)", fontWeight:600 }}>
            Step {stepIdx + 1} of {steps.length}
          </span>
        </div>

        <AnimatePresence mode="wait">

          {/* ══════ STEP 1 — Profile ══════ */}
          {step === "profile" && (
            <motion.div key="profile" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#fff", margin:"0 0 4px" }}>Complete your profile</h2>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.50)", marginBottom:20 }}>
                Quick setup before you {mode === "host" ? "host a journey" : "request a journey"}.
              </p>

              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <Field icon={<User size={14} color="#94a3b8"/>} placeholder="First Name" value={pForm.firstName} onChange={v => setPForm(f=>({...f,firstName:v}))} />
                  <Field icon={<User size={14} color="#94a3b8"/>} placeholder="Last Name"  value={pForm.lastName}  onChange={v => setPForm(f=>({...f,lastName:v}))} />
                </div>
                <Field icon={<Mail size={14} color="#94a3b8"/>}     placeholder="Email"      value={pForm.email}        onChange={v => setPForm(f=>({...f,email:v}))} type="email" />
                <Field icon={<Phone size={14} color="#94a3b8"/>}    placeholder="Mobile (+92…)" value={pForm.mobileNumber} onChange={v => setPForm(f=>({...f,mobileNumber:v}))} type="tel" />
                <Field icon={<Briefcase size={14} color="#94a3b8"/>} placeholder="Designation *" value={pForm.jobTitle} onChange={v => setPForm(f=>({...f,jobTitle:v}))} required />
                <Field icon={<Building2 size={14} color="#94a3b8"/>} placeholder="Company *" value={pForm.companyName} onChange={v => setPForm(f=>({...f,companyName:v}))} required />
                <Field icon={<Linkedin size={14} color="#0A66C2"/>} placeholder="LinkedIn Profile URL" value={pForm.linkedinUrl} onChange={v => setPForm(f=>({...f,linkedinUrl:v}))} type="url" />
                <Field icon={<CreditCard size={14} color="#94a3b8"/>} placeholder="CNIC Number (e.g. 35202-1234567-1)" value={pForm.cnicNumber} onChange={v => setPForm(f=>({...f,cnicNumber:v}))} />
                {/* Motivation question */}
                <div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 6, fontWeight: 600 }}>Why do you want to join Synicin Club? <span style={{ color:"rgba(255,255,255,0.30)", fontWeight:400 }}>(optional)</span></p>
                  <textarea
                    rows={3}
                    placeholder="Brief answer — helps our team understand your use case…"
                    value={pForm.bio}
                    onChange={e => setPForm(f => ({ ...f, bio: e.target.value }))}
                    style={{ ...INP, resize: "none", lineHeight: 1.5 }}
                  />
                </div>
              </div>

              <SubmitBtn busy={busy} onClick={saveProfile} label="Save & Continue" />
            </motion.div>
          )}

          {/* ══════ STEP 2 — OTP ══════ */}
          {step === "otp" && (
            <motion.div key="otp" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <div style={{ width:52, height:52, borderRadius:16, background:"rgba(58,134,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
                <Shield size={26} color={BLUE} />
              </div>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#fff", margin:"0 0 4px" }}>Verify your mobile</h2>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.50)", marginBottom:20 }}>
                We'll send a 6-digit code to {pForm.mobileNumber || userAny?.mobileNumber || "your mobile"}.
              </p>

              {!otpSent ? (
                <>
                  {/* Dev hint */}
                  <div style={{ background:"rgba(200,168,75,0.08)", border:"1px solid rgba(200,168,75,0.22)", borderRadius:12, padding:"10px 14px", marginBottom:14, fontSize:12, color:"rgba(200,168,75,0.85)" }}>
                    <strong>Testing mode:</strong> Use bypass code <span style={{ fontFamily:"monospace", fontWeight:800, letterSpacing:"0.1em" }}>1234</span> after sending OTP.
                  </div>
                  <SubmitBtn busy={busy} onClick={sendOtp} label="Send OTP" />
                </>
              ) : (
                <>
                  <div style={{ background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.22)", borderRadius:12, padding:"10px 14px", marginBottom:14, fontSize:12, color:"rgba(74,222,128,0.85)" }}>
                    ✓ OTP sent{devCode ? ` — dev code: ${devCode}` : ""}. Enter it below.
                  </div>
                  <input
                    type="text" inputMode="numeric" maxLength={6}
                    placeholder="Enter 6-digit code (or 1234)"
                    value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    style={{ ...INP, fontSize:22, letterSpacing:"0.25em", textAlign:"center", marginBottom:12 }}
                  />
                  <SubmitBtn busy={busy} onClick={verifyOtp} label="Verify Code" disabled={otpCode.length < 4} />
                  <button
                    onClick={sendOtp} disabled={countdown > 0 || busy}
                    style={{ width:"100%", marginTop:10, background:"none", border:"none", color: countdown > 0 ? "rgba(255,255,255,0.30)" : "rgba(58,134,255,0.85)", fontSize:13, fontWeight:600, cursor: countdown > 0 ? "default" : "pointer" }}>
                    {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                  </button>
                </>
              )}
            </motion.div>
          )}

          {/* ══════ STEP 3 — Car Registration ══════ */}
          {step === "car-reg" && (
            <motion.div key="car-reg" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}>
              <div style={{ width:52, height:52, borderRadius:16, background:"rgba(212,175,55,0.12)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
                <Car size={26} color={GOLD} />
              </div>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#fff", margin:"0 0 4px" }}>Register your vehicle</h2>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.50)", marginBottom:20 }}>Required to host journeys on SyncIn Club.</p>

              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {/* Make */}
                <SelectField
                  label="Make *" value={carForm.make}
                  onChange={v => setCarForm(f=>({...f,make:v}))}
                  options={VEHICLE_MAKES}
                />
                <Field
                  icon={<Car size={14} color="#94a3b8"/>}
                  placeholder="Model (e.g. Corolla) *"
                  value={carForm.model} onChange={v => setCarForm(f=>({...f,model:v}))} required
                />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <SelectField label="Year" value={carForm.year} onChange={v => setCarForm(f=>({...f,year:v}))} options={YEARS} />
                  <SelectField label="Type" value={carForm.type} onChange={v => setCarForm(f=>({...f,type:v}))} options={VEHICLE_TYPES} />
                </div>
                <Field
                  icon={<Car size={14} color="#94a3b8"/>}
                  placeholder="License Plate (e.g. LEA-1234) *"
                  value={carForm.plate} onChange={v => setCarForm(f=>({...f,plate:v.toUpperCase()}))} required
                />

                {/* Document Upload */}
                <div>
                  <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display:"none" }}
                    onChange={e => setDocName(e.target.files?.[0]?.name ?? null)} />
                  <button type="button" onClick={() => fileRef.current?.click()}
                    style={{ width:"100%", padding:"11px 14px", borderRadius:12, background:"rgba(255,255,255,0.06)", border:"1.5px dashed rgba(255,255,255,0.22)", color:"rgba(255,255,255,0.65)", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    <Upload size={15} />
                    {docName ? docName : "Upload Vehicle Document (optional)"}
                  </button>
                  <p style={{ fontSize:11, color:"rgba(255,255,255,0.30)", marginTop:5 }}>Registration book or insurance certificate.</p>
                </div>
              </div>

              <SubmitBtn busy={busy} onClick={saveVehicle} label="Register & Continue" />
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function Field({ icon, placeholder, value, onChange, type = "text", required }: {
  icon?: React.ReactNode; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div style={{ position:"relative" }}>
      {icon && <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>{icon}</div>}
      <input
        type={type} value={value} placeholder={placeholder} required={required}
        onChange={e => onChange(e.target.value)}
        style={{ ...INP, paddingLeft: icon ? 36 : 14 }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div style={{ position:"relative" }}>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{ ...INP, appearance:"none", paddingRight:32, cursor:"pointer" }}
      >
        <option value="" disabled>{label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} color="#94a3b8" style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
    </div>
  );
}

function SubmitBtn({ busy, onClick, label, disabled }: { busy: boolean; onClick: ()=>void; label: string; disabled?: boolean }) {
  const GOLD = "#D4AF37";
  return (
    <button
      type="button" onClick={onClick}
      disabled={busy || disabled}
      style={{ width:"100%", marginTop:20, padding:"14px 0", borderRadius:16, background: busy || disabled ? "rgba(212,175,55,0.30)" : `linear-gradient(135deg, ${GOLD} 0%, #B8860B 100%)`, color: busy || disabled ? "rgba(255,255,255,0.50)" : "#0B132B", fontWeight:800, fontSize:15, border:"none", cursor: busy || disabled ? "default" : "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow: busy || disabled ? "none" : "0 4px 20px rgba(212,175,55,0.30)" }}>
      {busy ? <Loader2 size={18} className="animate-spin" /> : <><ArrowRight size={16}/>{label}</>}
    </button>
  );
}
