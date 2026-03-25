import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, ShieldCheck, ArrowLeft, RefreshCw, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { PuzzleLogo } from "@/components/PuzzleLogo";

const NAVY  = "#0B132B";
const GOLD  = "#D4AF37";
const BLUE  = "#3A86FF";
const BG    = "#F3F4F6";
const SERIF = "'Playfair Display', Merriweather, Georgia, serif";

const INP: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  borderRadius: 10,
  border: "1.5px solid #E2E8F0",
  background: "#F8F9FA",
  color: NAVY,
  fontSize: 15,
  fontWeight: 600,
  outline: "none",
  boxSizing: "border-box",
};

type Step = "enter-mobile" | "enter-otp" | "done";

export default function VerifyMobile() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [step, setStep]           = useState<Step>("enter-mobile");
  const [mobile, setMobile]       = useState("");
  const [otp, setOtp]             = useState("");
  const [devOtp, setDevOtp]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userAny = (user as any) ?? {};

  useEffect(() => {
    if (!isLoading && isAuthenticated && userAny?.mobileVerified) {
      setLocation("/dashboard");
    }
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
    if (userAny?.mobileNumber) {
      setMobile(userAny.mobileNumber);
    }
  }, [isLoading, isAuthenticated, userAny?.mobileVerified, userAny?.mobileNumber]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const requestOtp = async () => {
    if (!mobile.trim()) { setError("Please enter your mobile number"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mobileNumber: mobile.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setDevOtp(data.devOtp || null);
      setStep("enter-otp");
      startCountdown();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim() || otp.length !== 6) { setError("Please enter the 6-digit OTP"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setStep("done");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: BG }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${GOLD}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: "100vh", background: BG }}>

      {/* Header strip */}
      <div style={{ background: NAVY, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        {step === "enter-otp" && (
          <button
            onClick={() => { setStep("enter-mobile"); setOtp(""); setError(null); setDevOtp(null); }}
            style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <ArrowLeft size={18} color="#fff" />
          </button>
        )}
        <PuzzleLogo size={26} />
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.1 }}>
            Verify Your Mobile
          </h1>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", margin: "4px 0 0" }}>
            One-time verification to secure your account
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px" }}>

        {step === "done" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ background: NAVY, borderRadius: 20, padding: 48, textAlign: "center" }}
          >
            <CheckCircle size={56} color="#22c55e" style={{ marginBottom: 16 }} />
            <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
              Mobile Verified!
            </h2>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14 }}>
              Welcome to SyncIn Club. Redirecting to your dashboard…
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: NAVY, borderRadius: 20, padding: 32, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
          >
            {/* Icon */}
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(212,175,55,0.10)", border: `1.5px solid rgba(212,175,55,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              {step === "enter-mobile" ? <Phone size={26} color={GOLD} /> : <ShieldCheck size={26} color={GOLD} />}
            </div>

            <AnimatePresence mode="wait">
              {step === "enter-mobile" && (
                <motion.div key="mobile" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Enter Mobile Number</h2>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 24, lineHeight: 1.5 }}>
                    We'll send a 6-digit code to verify your number. Standard rates may apply.
                  </p>

                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Mobile Number
                  </label>
                  <input
                    style={{ ...INP, marginBottom: 8 }}
                    type="tel"
                    placeholder="+92 300 0000000"
                    value={mobile}
                    onChange={e => { setMobile(e.target.value); setError(null); }}
                    onKeyDown={e => e.key === "Enter" && requestOtp()}
                  />

                  {error && (
                    <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5", fontSize: 13 }}>
                      {error}
                    </div>
                  )}

                  <button
                    onClick={requestOtp}
                    disabled={loading}
                    style={{
                      marginTop: 12, width: "100%", padding: "14px", borderRadius: 12,
                      background: loading ? "rgba(212,175,55,0.4)" : GOLD,
                      color: NAVY, fontWeight: 800, fontSize: 15, border: "none",
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading ? "Sending OTP…" : "Send OTP →"}
                  </button>
                </motion.div>
              )}

              {step === "enter-otp" && (
                <motion.div key="otp" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Enter OTP</h2>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 6, lineHeight: 1.5 }}>
                    A 6-digit code was sent to <strong style={{ color: "rgba(255,255,255,0.85)" }}>{mobile}</strong>
                  </p>

                  {devOtp && (
                    <div style={{ marginBottom: 20, padding: "10px 14px", borderRadius: 10, background: "rgba(212,175,55,0.10)", border: `1px solid rgba(212,175,55,0.25)` }}>
                      <p style={{ fontSize: 11, color: GOLD, margin: 0, fontWeight: 700 }}>DEV MODE — Your OTP:</p>
                      <p style={{ fontSize: 22, color: "#fff", margin: "4px 0 0", fontWeight: 900, letterSpacing: "0.12em" }}>{devOtp}</p>
                    </div>
                  )}

                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.65)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    6-Digit OTP
                  </label>
                  <input
                    style={{ ...INP, fontSize: 22, letterSpacing: "0.18em", textAlign: "center" }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(null); }}
                    onKeyDown={e => e.key === "Enter" && verifyOtp()}
                    autoFocus
                  />

                  {error && (
                    <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5", fontSize: 13 }}>
                      {error}
                    </div>
                  )}

                  <button
                    onClick={verifyOtp}
                    disabled={loading}
                    style={{
                      marginTop: 16, width: "100%", padding: "14px", borderRadius: 12,
                      background: loading ? "rgba(212,175,55,0.4)" : GOLD,
                      color: NAVY, fontWeight: 800, fontSize: 15, border: "none",
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading ? "Verifying…" : "Verify & Enter Dashboard →"}
                  </button>

                  <div style={{ marginTop: 16, textAlign: "center" }}>
                    {countdown > 0 ? (
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
                        Resend OTP in {countdown}s
                      </p>
                    ) : (
                      <button
                        onClick={requestOtp}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: GOLD, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        <RefreshCw size={13} /> Resend OTP
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
              Your number is only used for account security. It is never shared.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
