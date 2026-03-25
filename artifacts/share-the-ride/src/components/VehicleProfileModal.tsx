/**
 * VehicleProfileModal — 3-step host registration gate
 *
 * Step 1 → Professional + vehicle form
 * Step 2 → OTP simulation (code sent to mobile)
 * Step 3 → Welcome confirmation (email sent)
 *
 * Appears when a user tries to host a journey without vehicle info set.
 */
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Car, FileText, Phone, Briefcase, Building2,
  CheckCircle, ArrowRight, Upload, ShieldCheck, Mail,
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useToast } from "@/hooks/use-toast";

/* ── Design tokens ─────────────────────────────────────────── */
const NAVY  = "#0B132B";
const CARD  = "#0F1E3C";
const BLUE  = "#3A86FF";
const SILVER= "#BDC3C7";
const BORDER= "rgba(255,255,255,0.10)";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "form" | "otp" | "welcome";

export default function VehicleProfileModal({ open, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const userAny = (user as any) ?? {};

  const [step, setStep] = useState<Step>("form");
  const [saving, setSaving] = useState(false);

  /* ── Step 1: Form state ── */
  const [form, setForm] = useState({
    mobileNumber:     userAny.mobileNumber     || "",
    jobTitle:         userAny.jobTitle         || "",
    companyName:      userAny.companyName      || "",
    vehicleRegNumber: userAny.vehicleRegNumber || "",
    vehicleType:      userAny.vehicleType      || "",
  });
  const [fileName, setFileName]   = useState<string>("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  /* ── Step 2: OTP state ── */
  const [otpCode,   setOtpCode]   = useState("");
  const [otpSent,   setOtpSent]   = useState("");   /* the "real" code shown in demo */
  const [otpError,  setOtpError]  = useState("");

  /* ── Derived ── */
  const formValid = form.mobileNumber.trim() && form.jobTitle.trim()
    && form.companyName.trim() && form.vehicleRegNumber.trim() && form.vehicleType.trim();

  /* ── Step 1 → 2: Save profile + generate demo OTP ── */
  const handleFormSubmit = async () => {
    if (!formValid) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileNumber:     form.mobileNumber.trim(),
          jobTitle:         form.jobTitle.trim(),
          companyName:      form.companyName.trim(),
          vehicleRegNumber: form.vehicleRegNumber.trim(),
          vehicleType:      form.vehicleType.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const code = String(Math.floor(100000 + Math.random() * 900000));
      setOtpSent(code);
      setOtpCode("");
      setOtpError("");
      /* In production this would be an SMS; for demo we show a toast */
      toast({
        title: "OTP Sent",
        description: `Your verification code is: ${code}  (Demo mode)`,
      });
      setStep("otp");
    } catch {
      toast({ title: "Failed to save profile", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* ── Step 2 → 3: Verify OTP ── */
  const handleOtpVerify = () => {
    if (otpCode.trim() !== otpSent) {
      setOtpError("Incorrect code. Check the toast notification above.");
      return;
    }
    setStep("welcome");
  };

  /* ── Step 3: Proceed to OfferRide ── */
  const handleDone = () => {
    onSuccess();
    resetAll();
  };

  const resetAll = () => {
    setStep("form");
    setOtpCode(""); setOtpSent(""); setOtpError("");
    setFileName("");
    setSaving(false);
  };

  const handleClose = () => { onClose(); resetAll(); };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "11px 12px 11px 38px",
    background: "rgba(255,255,255,0.07)",
    border: `1.5px solid ${BORDER}`,
    borderRadius: 12, color: "#fff", fontSize: 14, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700,
    color: SILVER, textTransform: "uppercase" as const,
    letterSpacing: "0.08em", marginBottom: 7,
  };

  return (
    <AnimatePresence>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0" }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            style={{
              position: "relative", zIndex: 1,
              width: "100%", maxWidth: 480,
              background: `linear-gradient(160deg, ${NAVY} 0%, ${CARD} 100%)`,
              borderRadius: "24px 24px 0 0",
              maxHeight: "92vh", display: "flex", flexDirection: "column",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
              border: `1px solid ${BORDER}`,
            }}
          >
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.22)" }} />
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px 16px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `rgba(58,134,255,0.15)`, border: `1px solid rgba(58,134,255,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Car size={20} color={BLUE} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>
                  {step === "form"    ? "Host Verification"
                  : step === "otp"   ? "Verify Mobile Number"
                  :                    "Welcome to SyncIn Club"}
                </div>
                <div style={{ color: SILVER, fontSize: 12, marginTop: 2 }}>
                  {step === "form"    ? "Complete your host profile to publish journeys"
                  : step === "otp"   ? "Enter the 6-digit code sent to your mobile"
                  :                    "You're now verified as a host"}
                </div>
              </div>
              {/* Step indicator */}
              <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                {(["form", "otp", "welcome"] as Step[]).map((s, i) => (
                  <div key={s} style={{ width: 8, height: 8, borderRadius: "50%", background: step === s ? BLUE : (["form","otp","welcome"].indexOf(step) > i ? "#4ade80" : "rgba(255,255,255,0.2)"), transition: "background .3s" }} />
                ))}
              </div>
              <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <X size={15} color="rgba(255,255,255,0.6)" />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px" }}>

              {/* ─── STEP 1: FORM ─────────────────────────────── */}
              {step === "form" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                  {/* Mobile */}
                  <div>
                    <label style={labelStyle}>Mobile Number *</label>
                    <div style={{ position: "relative" }}>
                      <Phone size={15} color={SILVER} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                      <input type="tel" value={form.mobileNumber} onChange={set("mobileNumber")}
                        placeholder="+92 300 1234567"
                        style={inputStyle} />
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(189,195,199,0.6)", marginTop: 5 }}>OTP will be sent to this number for verification</div>
                  </div>

                  {/* Designation */}
                  <div>
                    <label style={labelStyle}>Designation / Job Title *</label>
                    <div style={{ position: "relative" }}>
                      <Briefcase size={15} color={SILVER} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                      <input value={form.jobTitle} onChange={set("jobTitle")}
                        placeholder="e.g. Branch Manager, Senior Engineer"
                        style={inputStyle} />
                    </div>
                  </div>

                  {/* Company */}
                  <div>
                    <label style={labelStyle}>Company / Organisation *</label>
                    <div style={{ position: "relative" }}>
                      <Building2 size={15} color={SILVER} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                      <input value={form.companyName} onChange={set("companyName")}
                        placeholder="e.g. HBL, Mari Petroleum, LUMS"
                        style={inputStyle} />
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(58,134,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Car size={14} color={BLUE} />
                      </div>
                      <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Vehicle Information</span>
                      <span style={{ fontSize: 10, color: BLUE, fontWeight: 700, background: "rgba(58,134,255,0.12)", borderRadius: 99, padding: "2px 8px" }}>Required for Hosts</span>
                    </div>

                    {/* Vehicle Reg Number */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>Vehicle Registration Number *</label>
                      <div style={{ position: "relative" }}>
                        <FileText size={15} color={SILVER} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                        <input value={form.vehicleRegNumber} onChange={set("vehicleRegNumber")}
                          placeholder="e.g. LEA-1234, ISB-5678"
                          style={inputStyle} />
                      </div>
                    </div>

                    {/* Vehicle Type */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>Vehicle Type & Model *</label>
                      <div style={{ position: "relative" }}>
                        <Car size={15} color={SILVER} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                        <input value={form.vehicleType} onChange={set("vehicleType")}
                          placeholder="e.g. Toyota Corolla 2022, Honda Civic 2021"
                          style={inputStyle} />
                      </div>
                    </div>

                    {/* Registration Card Upload */}
                    <div>
                      <label style={labelStyle}>Vehicle Registration Card *</label>
                      <input ref={fileRef} type="file" accept="image/*,.pdf"
                        style={{ display: "none" }}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) setFileName(f.name);
                        }}
                      />
                      {fileName ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "rgba(74,222,128,0.08)", border: "1.5px solid rgba(74,222,128,0.3)", borderRadius: 12 }}>
                          <CheckCircle size={16} color="#4ade80" />
                          <span style={{ fontSize: 13, color: "#4ade80", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
                          <button onClick={() => setFileName("")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 0 }}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => fileRef.current?.click()}
                          style={{ width: "100%", padding: "13px 0", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: `1.5px dashed rgba(255,255,255,0.22)`, color: SILVER, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <Upload size={15} /> Upload Photo / PDF
                        </button>
                      )}
                      <div style={{ fontSize: 11, color: "rgba(189,195,199,0.55)", marginTop: 5 }}>Scan or photo of your vehicle registration document</div>
                    </div>
                  </div>

                  {/* Submit */}
                  <button type="button" onClick={handleFormSubmit}
                    disabled={saving || !formValid || !fileName}
                    style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: formValid && fileName ? BLUE : "rgba(58,134,255,0.3)", border: "none", color: "#fff", fontSize: 15, fontWeight: 800, cursor: formValid && fileName ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: formValid && fileName ? "0 6px 24px rgba(58,134,255,0.45)" : "none", transition: "all .25s" }}>
                    {saving
                      ? <><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }} className="animate-spin" /> Saving…</>
                      : <>Send OTP & Continue <ArrowRight size={16} /></>}
                  </button>
                  {(!formValid || !fileName) && (
                    <div style={{ textAlign: "center", fontSize: 11, color: "rgba(189,195,199,0.5)" }}>
                      All fields + registration card upload required
                    </div>
                  )}
                </div>
              )}

              {/* ─── STEP 2: OTP ──────────────────────────────── */}
              {step === "otp" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(58,134,255,0.12)", border: `1px solid rgba(58,134,255,0.3)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Phone size={28} color={BLUE} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Enter Verification Code</div>
                    <div style={{ color: SILVER, fontSize: 13, lineHeight: 1.5 }}>
                      A 6-digit code was sent to<br/>
                      <span style={{ color: "#fff", fontWeight: 700 }}>{form.mobileNumber}</span>
                    </div>
                  </div>

                  {/* OTP Input */}
                  <div style={{ width: "100%" }}>
                    <input type="text" inputMode="numeric" maxLength={6}
                      value={otpCode}
                      onChange={e => { setOtpCode(e.target.value.replace(/\D/g, "")); setOtpError(""); }}
                      placeholder="• • • • • •"
                      style={{
                        width: "100%", boxSizing: "border-box",
                        padding: "18px 0", textAlign: "center",
                        background: "rgba(255,255,255,0.07)",
                        border: `2px solid ${otpError ? "#f87171" : otpCode.length === 6 ? "#4ade80" : BORDER}`,
                        borderRadius: 14, color: "#fff", fontSize: 28, fontWeight: 800,
                        letterSpacing: "0.3em", outline: "none",
                        transition: "border-color .2s",
                      }}
                    />
                    {otpError && <div style={{ color: "#f87171", fontSize: 12, fontWeight: 600, marginTop: 8, textAlign: "center" }}>{otpError}</div>}
                  </div>

                  <button type="button" onClick={handleOtpVerify}
                    disabled={otpCode.length !== 6}
                    style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: otpCode.length === 6 ? BLUE : "rgba(58,134,255,0.3)", border: "none", color: "#fff", fontSize: 15, fontWeight: 800, cursor: otpCode.length === 6 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: otpCode.length === 6 ? "0 6px 24px rgba(58,134,255,0.45)" : "none", transition: "all .25s" }}>
                    <ShieldCheck size={16} /> Verify & Complete Registration
                  </button>

                  <button type="button" onClick={() => setStep("form")}
                    style={{ background: "none", border: "none", color: SILVER, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
                    ← Back to form
                  </button>
                  <div style={{ fontSize: 11, color: "rgba(189,195,199,0.45)", textAlign: "center" }}>
                    Demo mode — check the notification for your code
                  </div>
                </div>
              )}

              {/* ─── STEP 3: WELCOME ──────────────────────────── */}
              {step === "welcome" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center", paddingTop: 8 }}>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(74,222,128,0.12)", border: "2px solid rgba(74,222,128,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <CheckCircle size={36} color="#4ade80" />
                  </motion.div>

                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 6 }}>You're Verified!</div>
                    <div style={{ color: SILVER, fontSize: 13, lineHeight: 1.6 }}>
                      Your host profile is complete and verified.<br/>Welcome to SyncIn Club.
                    </div>
                  </div>

                  {/* Email confirmation */}
                  <div style={{ width: "100%", padding: "14px 16px", background: "rgba(58,134,255,0.08)", border: `1px solid rgba(58,134,255,0.2)`, borderRadius: 14, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(58,134,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Mail size={17} color={BLUE} />
                    </div>
                    <div>
                      <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>Welcome Email Sent</div>
                      <div style={{ color: SILVER, fontSize: 11, marginTop: 2 }}>
                        Check your inbox for your SyncIn Club host welcome packet
                      </div>
                    </div>
                  </div>

                  {/* Vehicle summary */}
                  <div style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 14 }}>
                    <div style={{ color: SILVER, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Verified Vehicle</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Car size={20} color={BLUE} />
                      <div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{form.vehicleType}</div>
                        <div style={{ color: SILVER, fontSize: 12 }}>Reg: {form.vehicleRegNumber}</div>
                      </div>
                    </div>
                  </div>

                  <button type="button" onClick={handleDone}
                    style={{ width: "100%", padding: "14px 0", borderRadius: 14, background: BLUE, border: "none", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 6px 24px rgba(58,134,255,0.45)" }}>
                    Continue to Post Journey <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
