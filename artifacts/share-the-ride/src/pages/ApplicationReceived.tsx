import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Briefcase, Clock, Mail } from "lucide-react";
import { useSearch, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";

const POLL_INTERVAL_MS = 6000;

async function fetchApprovalStatus(): Promise<{ isSovereign: boolean; isBusiness: boolean; authenticated: boolean }> {
  try {
    const res = await fetch("/api/auth/user", { credentials: "include" });
    if (!res.ok) return { isSovereign: false, isBusiness: false, authenticated: false };
    const data = await res.json();
    return {
      authenticated: !!data.authenticated,
      isSovereign: !!(data.user?.isSovereign),
      isBusiness: !!(data.user?.isBusiness),
    };
  } catch {
    return { isSovereign: false, isBusiness: false, authenticated: false };
  }
}

export default function ApplicationReceived() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const tier = params.get("tier") || "sovereign";
  const isSovereign = tier === "sovereign";
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const [isApproved, setIsApproved] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isLoading) return;
    const u = user as any;
    if (u?.isSovereign || u?.isBusiness) {
      setIsApproved(true);
      setLocation("/dashboard");
    }
  }, [isLoading, user, setLocation]);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      const status = await fetchApprovalStatus();
      if (status.isSovereign || status.isBusiness) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsApproved(true);
        setLocation("/dashboard");
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [setLocation]);

  const accentColor = isSovereign ? "#C9A84C" : "#A8B2BF";
  const Icon = isSovereign ? Crown : Briefcase;
  const tierLabel = isSovereign ? "Sovereign" : "Business Class";

  return (
    <div className="min-h-screen bg-[#0D0F14] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: `${accentColor}06` }} />

      <div className="relative z-10 w-full max-w-lg text-center">

        {/* Animated seal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 1, delay: 0.1 }}
          className="flex items-center justify-center mb-8"
        >
          <div className="relative">
            <div className="h-28 w-28 rounded-full flex items-center justify-center"
              style={{ border: `1px solid ${accentColor}30` }}>
              <div className="h-20 w-20 rounded-full flex items-center justify-center"
                style={{ border: `1px solid ${accentColor}50`, background: `${accentColor}10` }}>
                <Icon className="h-9 w-9" style={{ color: accentColor }} />
              </div>
            </div>
            <div className="absolute inset-0 rounded-full animate-ping"
              style={{ background: `${accentColor}08`, animationDuration: "2.5s" }} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-xs uppercase tracking-[4px] font-semibold mb-3" style={{ color: accentColor }}>
            {tierLabel} Access
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            Application Received.
          </h1>

          <div className="w-16 h-px mx-auto mb-6" style={{ background: `${accentColor}50` }} />

          <p className="text-[#8B9299] text-base leading-relaxed mb-8 max-w-sm mx-auto">
            <strong className="text-white">Admissions Board Verification Pending.</strong>
            <br />
            You will be notified via email when your{" "}
            <span style={{ color: accentColor }}>{tierLabel}</span> access is granted.
          </p>

          {/* Status cards */}
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-10">
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#131720]"
              style={{ border: `1px solid ${accentColor}20` }}>
              <Clock className="h-5 w-5" style={{ color: accentColor }} />
              <span className="text-[#6B7280] text-xs">Est. Review Time</span>
              <span className="text-white text-sm font-semibold">24–72 Hours</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#131720]"
              style={{ border: `1px solid ${accentColor}20` }}>
              <Mail className="h-5 w-5" style={{ color: accentColor }} />
              <span className="text-[#6B7280] text-xs">Notification</span>
              <span className="text-white text-sm font-semibold">Corporate Email</span>
            </div>
          </div>

          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm transition-colors"
            style={{ color: `${accentColor}60` }}
            onMouseEnter={e => (e.currentTarget.style.color = `${accentColor}99`)}
            onMouseLeave={e => (e.currentTarget.style.color = `${accentColor}60`)}
          >
            ← Return to Lobby
          </a>
        </motion.div>
      </div>
    </div>
  );
}
