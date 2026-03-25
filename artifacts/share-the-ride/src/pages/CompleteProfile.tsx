import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  User, Phone, Mail, Briefcase, Building2, ArrowRight, CheckCircle, Linkedin, ChevronLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export default function CompleteProfile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const userAny = (user as any) ?? {};

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobileNumber: "",
    jobTitle: "",
    companyName: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) setLocation("/");
  }, [isLoading, isAuthenticated]);

  // Redirect if profile already complete
  useEffect(() => {
    if (!isLoading && isAuthenticated && userAny?.profileComplete) {
      setLocation("/dashboard");
    }
  }, [isLoading, isAuthenticated, userAny?.profileComplete]);

  // Pre-fill from auth data
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        firstName: f.firstName || user.firstName || "",
        lastName: f.lastName || user.lastName || "",
        email: f.email || (user as any).email || "",
        mobileNumber: f.mobileNumber || userAny.mobileNumber || "",
        jobTitle: f.jobTitle || userAny.jobTitle || "",
        companyName: f.companyName || userAny.companyName || "",
      }));
    }
  }, [user]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.jobTitle.trim() || !form.companyName.trim()) {
      toast({ title: "Required fields missing", description: "Please enter your Designation and Company Name.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          email: form.email.trim() || undefined,
          mobileNumber: form.mobileNumber.trim() || undefined,
          jobTitle: form.jobTitle.trim(),
          companyName: form.companyName.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSaved(true);
      toast({ title: "Profile saved!", description: "Welcome to SyncIn Club. Your journey begins now." });
      // Full reload so the auth state refreshes with profileComplete=true
      setTimeout(() => {
        const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
        window.location.href = `${base}/dashboard`;
      }, 1200);
    } catch {
      toast({ title: "Could not save profile", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full py-12" style={{ padding: "3rem 15px", background:"#F4F1EA" }}>
      <div className="mx-auto max-w-lg">

        {/* Back Arrow */}
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium mb-6 transition-colors group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <User className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            SyncIn is a professional network. Your profile is shown to co-travelers so they know who they're riding with.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl shadow-xl overflow-hidden" style={{ background:"#FFFFFF", border:"1px solid rgba(0,0,0,0.08)" }}
        >
          {/* LinkedIn Import */}
          <div className="px-7 pt-7 pb-5 border-b border-border/50">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Quick Import</p>
            <button
              onClick={() => toast({ title: "Coming Soon", description: "LinkedIn profile import will be available in the next update." })}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shadow-md"
              style={{ background: "#0A66C2" }}
            >
              <LinkedInIcon className="h-4 w-4" />
              Import from LinkedIn
            </button>
            <p className="text-center text-xs text-muted-foreground mt-2">Or fill in manually below</p>
          </div>

          {/* Form */}
          <div className="px-5 py-6 space-y-5">

            {/* Shared input style for light theme */}
            {/* Full Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ display:"block", fontSize:13, fontWeight:700, color:"#0B132B", marginBottom:6, letterSpacing:"0.02em" }}>First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4" style={{ color:"#94a3b8" }} />
                  <input
                    value={form.firstName} onChange={set("firstName")} placeholder="Ali"
                    style={{ width:"100%", paddingLeft:38, paddingRight:12, paddingTop:12, paddingBottom:12, borderRadius:12, border:"1.5px solid #E2E8F0", background:"#FFFFFF", color:"#0B132B", outline:"none", boxSizing:"border-box" as const }}
                    onFocus={e => (e.target.style.borderColor = "#3A86FF")}
                    onBlur={e => (e.target.style.borderColor = "#E2E8F0")}
                  />
                </div>
              </div>
              <div>
                <label style={{ display:"block", fontSize:13, fontWeight:700, color:"#0B132B", marginBottom:6 }}>Last Name</label>
                <input
                  value={form.lastName} onChange={set("lastName")} placeholder="Khan"
                  style={{ width:"100%", padding:"12px", borderRadius:12, border:"1.5px solid #E2E8F0", background:"#FFFFFF", color:"#0B132B", outline:"none", boxSizing:"border-box" as const }}
                  onFocus={e => (e.target.style.borderColor = "#3A86FF")}
                  onBlur={e => (e.target.style.borderColor = "#E2E8F0")}
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:700, color:"#0B132B", marginBottom:6 }}>Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 h-4 w-4" style={{ color:"#94a3b8" }} />
                <input
                  value={form.mobileNumber} onChange={set("mobileNumber")}
                  placeholder="+92 300 1234567" type="tel"
                  style={{ width:"100%", paddingLeft:38, paddingRight:12, paddingTop:12, paddingBottom:12, borderRadius:12, border:"1.5px solid #E2E8F0", background:"#FFFFFF", color:"#0B132B", outline:"none", boxSizing:"border-box" as const }}
                  onFocus={e => (e.target.style.borderColor = "#3A86FF")}
                  onBlur={e => (e.target.style.borderColor = "#E2E8F0")}
                />
              </div>
              <p style={{ fontSize:12, color:"#94a3b8", marginTop:5 }}>Used for WhatsApp coordination with co-travelers</p>
            </div>

            {/* Email */}
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:700, color:"#0B132B", marginBottom:6 }}>Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4" style={{ color:"#94a3b8" }} />
                <input
                  value={form.email} onChange={set("email")}
                  placeholder="ali.khan@company.com.pk" type="email"
                  style={{ width:"100%", paddingLeft:38, paddingRight:12, paddingTop:12, paddingBottom:12, borderRadius:12, border:"1.5px solid #E2E8F0", background:"#FFFFFF", color:"#0B132B", outline:"none", boxSizing:"border-box" as const }}
                  onFocus={e => (e.target.style.borderColor = "#3A86FF")}
                  onBlur={e => (e.target.style.borderColor = "#E2E8F0")}
                />
              </div>
            </div>

            {/* Designation */}
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:700, color:"#0B132B", marginBottom:6 }}>
                Designation <span style={{ color:"#ef4444" }}>*</span>
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3.5 h-4 w-4" style={{ color:"#94a3b8" }} />
                <input
                  value={form.jobTitle} onChange={set("jobTitle")}
                  placeholder="e.g. Senior Engineer, Branch Manager"
                  style={{ width:"100%", paddingLeft:38, paddingRight:12, paddingTop:12, paddingBottom:12, borderRadius:12, border:"1.5px solid #E2E8F0", background:"#FFFFFF", color:"#0B132B", outline:"none", boxSizing:"border-box" as const }}
                  onFocus={e => (e.target.style.borderColor = "#3A86FF")}
                  onBlur={e => (e.target.style.borderColor = "#E2E8F0")}
                />
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:700, color:"#0B132B", marginBottom:6 }}>
                Company / Organization <span style={{ color:"#ef4444" }}>*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3.5 h-4 w-4" style={{ color:"#94a3b8" }} />
                <input
                  value={form.companyName} onChange={set("companyName")}
                  placeholder="e.g. HBL, PTCL, Mari Petroleum, LUMS"
                  style={{ width:"100%", paddingLeft:38, paddingRight:12, paddingTop:12, paddingBottom:12, borderRadius:12, border:"1.5px solid #E2E8F0", background:"#FFFFFF", color:"#0B132B", outline:"none", boxSizing:"border-box" as const }}
                  onFocus={e => (e.target.style.borderColor = "#3A86FF")}
                  onBlur={e => (e.target.style.borderColor = "#E2E8F0")}
                />
              </div>
            </div>

            {/* Profile preview */}
            {(form.jobTitle || form.companyName) && (
              <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl text-sm">
                {user?.profileImage ? (
                  <img src={user.profileImage} className="h-9 w-9 rounded-full object-cover border-2 border-white shadow" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-foreground">
                    {[form.firstName, form.lastName].filter(Boolean).join(" ") || user?.firstName || "Your Name"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {form.jobTitle && <span className="text-primary font-medium">{form.jobTitle}</span>}
                    {form.jobTitle && form.companyName && " · "}
                    {form.companyName}
                  </div>
                </div>
              </div>
            )}

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving || saved || !form.jobTitle.trim() || !form.companyName.trim()}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-md shadow-primary/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #1E3A8A, #162e78)" }}
            >
              {saved ? (
                <><CheckCircle className="h-5 w-5" /> Profile Complete — Redirecting…</>
              ) : saving ? (
                <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              ) : (
                <>Save & Enter SyncIn Club <ArrowRight className="h-4 w-4" /></>
              )}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              <span className="text-destructive">*</span> Required fields. Your designation and company are shown on your journey cards.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
