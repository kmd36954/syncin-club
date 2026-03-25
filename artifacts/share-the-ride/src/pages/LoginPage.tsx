import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, Zap, ArrowLeft, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { useState } from "react";
import { PuzzleLogo } from "@/components/PuzzleLogo";
const SERIF = "'Playfair Display', Merriweather, Georgia, serif";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const BLUE   = "#3A86FF";
const DARK   = "#0B132B";
const SLATE  = "#64748b";
const BORDER = "#E2E8F0";

const HERO_IMG = "https://images.unsplash.com/photo-1503376760367-1b61b2565443?q=80&w=1920&auto=format&fit=crop";

export default function LoginPage() {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  const searchParams = new URLSearchParams(window.location.search);
  const returnTo = searchParams.get("returnTo") || "/dashboard";
  const fullReturnTo = base + returnTo;
  const loginUrl = `/api/login?returnTo=${encodeURIComponent(fullReturnTo)}`;

  const [activeTab, setActiveTab] = useState<"linkedin" | "email">("linkedin");
  const [emailMode, setEmailMode] = useState<"signin" | "register">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", firstName: "", lastName: "" });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
    setError(null);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (emailMode === "register") {
      if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
      if (form.password !== form.confirmPassword) { setError("Passwords do not match. Please check and try again."); return; }
    }
    setLoading(true);
    try {
      const endpoint = emailMode === "signin" ? "/api/auth/email/login" : "/api/auth/email/register";
      const body: Record<string, string> = { email: form.email, password: form.password };
      if (emailMode === "register") {
        if (form.firstName) body.firstName = form.firstName;
        if (form.lastName) body.lastName = form.lastName;
      }
      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong. Please try again."); return; }
      window.location.href = fullReturnTo;
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally { setLoading(false); }
  };

  /* Light-theme input style for the form panel */
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: `1.5px solid ${BORDER}`,
    background: "#FFFFFF",
    color: DARK,
    fontSize: 16,
    fontWeight: 500,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: "border-color .2s",
  };

  const features = [
    { icon: Shield, title: "Verified Professionals", desc: "Every member identity-checked for trust and safety" },
    { icon: Users,  title: "Community-Driven",       desc: "Thousands of daily commuters across Pakistan" },
    { icon: Zap,    title: "Instant Matching",        desc: "Live route matching to professionals near you" },
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-5rem)]">

      {/* ── Left Panel / Mobile Hero: Executive hero image with navy overlay ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative lg:flex flex-col justify-between w-full lg:w-1/2"
        style={{
          background: `url(${HERO_IMG}) center/cover no-repeat`,
          minHeight: 300,
        }}
      >
        {/* Navy gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(160deg, rgba(11,19,43,0.88) 0%, rgba(14,30,80,0.82) 60%, rgba(11,19,43,0.75) 100%)",
        }} />

        {/* Content over overlay */}
        <div className="relative z-10 flex flex-col justify-between h-full px-10 py-12">
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PuzzleLogo size={34} />
            <span style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1, userSelect: "none" }}>
              <span style={{ color: "#FFFFFF" }}>Sync</span><span style={{ color: "#BDC3C7" }}>In</span>
            </span>
          </div>

          {/* Hero copy (desktop) */}
          <div className="hidden lg:block space-y-6 py-8">
            <div>
              <h1 className="text-4xl font-bold text-white leading-snug mb-4">
                The professional network<br />for journey sharing.
              </h1>
              <p className="text-white/65 text-lg leading-relaxed max-w-md">
                Connecting executives and professionals across Pakistan for secure, trusted, and affordable daily commutes.
              </p>
            </div>
            <div className="space-y-4">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-white/80" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-white/55">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile tagline shown over the hero */}
          <div className="lg:hidden py-6 text-center">
            <p className="text-white/80 text-base font-medium">
              Pakistan's executive carpooling network
            </p>
          </div>

          <p className="hidden lg:block text-white/30 text-xs">© {new Date().getFullYear()} SyncIn Club · Built for Pakistan</p>
        </div>
      </motion.div>

      {/* ── Right Panel: White light form area ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex-1 flex flex-col items-center justify-center px-5 py-12"
        style={{ background: "#FFFFFF" }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: DARK, marginBottom: 6, lineHeight: 1.2 }}>
              Welcome back
            </h2>
            <p style={{ color: SLATE, fontSize: 15 }}>
              Sign in to access your journeys and connections.
            </p>
          </div>

          {/* Tab Switcher */}
          <div style={{ display: "flex", padding: 4, borderRadius: 16, background: "#F1F5F9", marginBottom: 24, gap: 4 }}>
            {(["linkedin", "email"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setError(null); }}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 14, fontWeight: 700,
                  border: "none", cursor: "pointer", transition: "all .2s",
                  background: activeTab === tab ? BLUE : "transparent",
                  color: activeTab === tab ? "#ffffff" : SLATE,
                  boxShadow: activeTab === tab ? "0 2px 12px rgba(58,134,255,0.35)" : "none",
                }}
              >
                {tab === "linkedin" ? "LinkedIn" : "Email"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "linkedin" ? (
              <motion.div
                key="linkedin"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <a
                  href={loginUrl}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                    width: "100%", padding: "16px 20px", borderRadius: 16, fontSize: 16, fontWeight: 800,
                    color: "#ffffff", textDecoration: "none", transition: "opacity .2s",
                    background: "#0A66C2", boxShadow: "0 6px 24px rgba(10,102,194,0.30)",
                  }}
                >
                  <LinkedInIcon className="h-5 w-5" />
                  Continue with LinkedIn
                </a>

                {/* Why LinkedIn info box */}
                <div style={{ marginTop: 16, padding: 18, borderRadius: 16, border: `1.5px solid ${BORDER}`, background: "#F8F9FA" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: DARK, margin: "0 0 6px" }}>Why LinkedIn?</p>
                  <p style={{ fontSize: 12, color: SLATE, lineHeight: 1.6, margin: 0 }}>
                    SyncIn Club uses LinkedIn to verify you're a real professional. We never post on your behalf or access your connections.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {/* Sign In / Create Account toggle */}
                <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
                  {(["signin", "register"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => { setEmailMode(mode); setError(null); setForm(f => ({ ...f, password: "", confirmPassword: "" })); }}
                      style={{
                        fontSize: 14, fontWeight: 700, background: "none", border: "none", cursor: "pointer",
                        paddingBottom: 4, borderBottom: emailMode === mode ? `2px solid ${BLUE}` : "2px solid transparent",
                        color: emailMode === mode ? BLUE : SLATE,
                        transition: "all .2s",
                      }}
                    >
                      {mode === "signin" ? "Sign In" : "Create Account"}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                  {emailMode === "register" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ position: "relative" }}>
                        <User style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", width: 16, height: 16 }} />
                        <input
                          value={form.firstName} onChange={set("firstName")} placeholder="First name"
                          style={{ ...inputStyle, paddingLeft: 42 }}
                          onFocus={e => (e.target.style.borderColor = BLUE)}
                          onBlur={e => (e.target.style.borderColor = BORDER)}
                        />
                      </div>
                      <input
                        value={form.lastName} onChange={set("lastName")} placeholder="Last name"
                        style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = BLUE)}
                        onBlur={e => (e.target.style.borderColor = BORDER)}
                      />
                    </div>
                  )}

                  <div style={{ position: "relative" }}>
                    <Mail style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", width: 16, height: 16, pointerEvents: "none" }} />
                    <input
                      type="email" value={form.email} onChange={set("email")}
                      placeholder="Email address" required
                      style={{ ...inputStyle, paddingLeft: 42 }}
                      onFocus={e => (e.target.style.borderColor = BLUE)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                  </div>

                  <div style={{ position: "relative" }}>
                    <Lock style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", width: 16, height: 16, pointerEvents: "none" }} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password} onChange={set("password")}
                      placeholder={emailMode === "register" ? "Create password (min 8 chars)" : "Password"}
                      required
                      style={{ ...inputStyle, paddingLeft: 42, paddingRight: 48 }}
                      onFocus={e => (e.target.style.borderColor = BLUE)}
                      onBlur={e => (e.target.style.borderColor = BORDER)}
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "flex" }}>
                      {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>

                  {emailMode === "register" && (
                    <div style={{ position: "relative" }}>
                      <Lock style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", width: 16, height: 16, pointerEvents: "none" }} />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={form.confirmPassword} onChange={set("confirmPassword")}
                        placeholder="Confirm password" required
                        style={{
                          ...inputStyle, paddingLeft: 42, paddingRight: 48,
                          borderColor: form.confirmPassword
                            ? form.confirmPassword === form.password ? "#16a34a" : "#ef4444"
                            : BORDER,
                        }}
                        onFocus={e => (e.target.style.borderColor = BLUE)}
                        onBlur={e => (e.target.style.borderColor = form.confirmPassword ? (form.confirmPassword === form.password ? "#16a34a" : "#ef4444") : BORDER)}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(p => !p)}
                        style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "flex" }}>
                        {showConfirmPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                      </button>
                    </div>
                  )}

                  {error && (
                    <div style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)", fontSize: 13, color: "#dc2626" }}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit" disabled={loading}
                    style={{
                      padding: "16px 0", borderRadius: 16, fontSize: 16, fontWeight: 800, color: "#ffffff",
                      background: BLUE,
                      boxShadow: "0 6px 24px rgba(58,134,255,0.35)", border: "none", cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.7 : 1, width: "100%", transition: "opacity .2s",
                    }}
                  >
                    {loading ? "Please wait…" : emailMode === "signin" ? "Sign In" : "Create Account"}
                  </button>
                </form>

                <p style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: SLATE }}>
                  {emailMode === "signin" ? "Don't have an account? " : "Already have an account? "}
                  <button
                    onClick={() => { setEmailMode(emailMode === "signin" ? "register" : "signin"); setError(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: BLUE, fontWeight: 700, fontSize: 13 }}
                  >
                    {emailMode === "signin" ? "Create one" : "Sign in"}
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Back link */}
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <a
              href={base + "/"}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#94a3b8", textDecoration: "none" }}
            >
              <ArrowLeft style={{ width: 13, height: 13 }} />
              Back to home
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
