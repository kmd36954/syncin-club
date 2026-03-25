import { Link } from "wouter";
import { motion } from "framer-motion";
import { Crown, Car, BarChart3, Building2, Shield, MessageCircle } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

const GOLD = "#D4AF37";
const BG = "#121212";
const CARD = "#1A1A1A";
const BORDER = "rgba(212,175,55,0.22)";
const BORDER_HOVER = "rgba(212,175,55,0.65)";
const GOLD_DIM = "rgba(212,175,55,0.10)";

const MODULES = [
  {
    icon: Car,
    title: "Executive Logistics",
    subtext: "Secure chauffeur-driven movement.",
    href: "/logistics",
    delay: 0.05,
  },
  {
    icon: BarChart3,
    title: "M&A Intelligence",
    subtext: "High-stakes business acquisitions.",
    href: "/intelligence",
    delay: 0.10,
  },
  {
    icon: Building2,
    title: "EstateClub",
    subtext: "Off-market premium real estate.",
    href: "/estate-club",
    delay: 0.15,
  },
  {
    icon: Shield,
    title: "Sovereign Aide",
    subtext: "24/7 Elite Executive Concierge.",
    href: "/aide",
    delay: 0.20,
  },
];

export default function SovereignDashboard() {
  const { user } = useAuth();
  const displayName = user?.firstName || user?.username || "Executive";

  return (
    <div className="flex-1 w-full min-h-screen pb-24" style={{ background: BG }}>

      {/* Top gold hairline */}
      <div
        className="w-full h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${GOLD}60, transparent)` }}
      />

      <div className="mx-auto max-w-4xl px-6 py-14">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-5 w-5" style={{ color: GOLD }} />
            <span
              className="text-[11px] font-black uppercase tracking-[5px]"
              style={{ color: `${GOLD}99` }}
            >
              Sovereign Member
            </span>
          </div>

          <h1
            className="text-4xl md:text-5xl font-black tracking-tight mb-3"
            style={{
              color: "#F5EED8",
              fontFamily: "'Georgia', 'Times New Roman', serif",
            }}
          >
            SyncIn{" "}
            <span style={{ color: GOLD }}>Sovereign Protocol</span>
          </h1>

          <p className="text-base" style={{ color: "rgba(212,175,55,0.55)" }}>
            Welcome back, <span style={{ color: GOLD }} className="font-semibold">{displayName}</span>
          </p>

          <div className="mt-8 h-px max-w-xs mx-auto" style={{ background: BORDER }} />
        </motion.div>

        {/* ── 4 Elite Modules ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {MODULES.map(({ icon: Icon, title, subtext, href, delay }) => (
            <Link key={title} href={href}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay, duration: 0.35 }}
                className="group relative overflow-hidden rounded-3xl p-8 cursor-pointer transition-all duration-300 h-full"
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 4px 32px rgba(0,0,0,0.40)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = BORDER_HOVER;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 40px rgba(212,175,55,0.12)`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = BORDER;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 32px rgba(0,0,0,0.40)";
                }}
              >
                {/* Ghost watermark */}
                <div className="absolute top-0 right-0 p-5 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-300 scale-100 group-hover:scale-110 transform">
                  <Icon className="w-28 h-28" style={{ color: GOLD }} />
                </div>

                <div className="relative z-10">
                  {/* Icon */}
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background: GOLD_DIM, border: `1px solid ${BORDER}` }}
                  >
                    <Icon className="h-7 w-7" style={{ color: GOLD }} />
                  </div>

                  {/* Text */}
                  <h2
                    className="text-xl font-bold mb-2"
                    style={{ color: "#F5EED8" }}
                  >
                    {title}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: "#9CA3AF" }}>
                    {subtext}
                  </p>

                  {/* CTA arrow */}
                  <div
                    className="mt-6 flex items-center gap-1.5 text-sm font-bold group-hover:gap-3 transition-all duration-200"
                    style={{ color: GOLD }}
                  >
                    Enter
                    <span className="inline-block group-hover:translate-x-1 transition-transform duration-200">→</span>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

      </div>

      {/* ── Floating Sovereign Aide WhatsApp ── */}
      <motion.a
        href="https://wa.me/923001234567?text=Sovereign%20Aide%3A%20I%20need%20executive%20support."
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 16 }}
        className="fixed bottom-8 right-8 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl cursor-pointer group select-none"
        style={{
          background: `linear-gradient(135deg, ${GOLD}, #B8933E)`,
          boxShadow: `0 8px 36px rgba(212,175,55,0.45)`,
        }}
      >
        <Crown className="h-4 w-4 text-[#0D0F14]" />
        <span className="text-[#0D0F14] text-sm font-black tracking-wide">Sovereign Aide</span>
        <MessageCircle className="h-4 w-4 text-[#0D0F14]/70 group-hover:scale-110 transition-transform" />
      </motion.a>

    </div>
  );
}
