import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Shield, MapPin, Clock, PlusCircle, Search } from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1503376760367-1b61b2565443?q=80&w=1920&auto=format&fit=crop";
const NAVY    = "#0B132B";
const BLUE    = "#3A86FF";
const SERIF   = "'Playfair Display', Merriweather, Georgia, serif";

export default function Home() {
  return (
    <div style={{ flex: 1, width: "100%" }}>

      {/* ── Full-width luxury hero ── */}
      <section
        style={{
          position: "relative",
          height: 480,
          overflow: "hidden",
          backgroundImage: `url(${HERO_IMG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark semi-transparent overlay — car stays clearly visible */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, rgba(11,19,43,0.68) 0%, rgba(14,28,70,0.50) 55%, rgba(11,19,43,0.60) 100%)",
        }} />

        {/* Hero content */}
        <div style={{
          position: "relative", zIndex: 1, height: "100%",
          display: "flex", flexDirection: "column", justifyContent: "center",
          maxWidth: 900, margin: "0 auto", padding: "0 32px",
        }}>
          {/* Live badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(58,134,255,0.18)", border: "1px solid rgba(58,134,255,0.32)",
            borderRadius: 20, padding: "5px 14px", marginBottom: 22, width: "fit-content",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: BLUE, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", letterSpacing: "0.05em" }}>Live in Pakistan</span>
          </div>

          <h1 style={{
            fontSize: "clamp(1.85rem, 3.8vw, 2.9rem)", fontWeight: 800,
            color: "#FFFFFF", lineHeight: 1.18, margin: "0 0 16px",
            textShadow: "0 2px 20px rgba(0,0,0,0.45)",
          }}>
            The exclusive professional<br />network for journey sharing.
          </h1>

          <p style={{
            fontSize: 15.5, color: "rgba(255,255,255,0.82)",
            lineHeight: 1.7, margin: "0 0 32px", maxWidth: 500,
          }}>
            Connect with verified executives and professionals for secure, trusted,
            and affordable daily commutes across Pakistan.
          </p>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link href="/find-rides">
              <button style={{
                background: BLUE, color: "#fff", border: "none",
                borderRadius: 12, padding: "13px 26px", fontSize: 14, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 4px 20px rgba(58,134,255,0.40)",
              }}>
                <Search size={16} />
                Request a Journey
              </button>
            </Link>
            <Link href="/offer-ride">
              <button style={{
                background: "rgba(255,255,255,0.12)", color: "#fff",
                border: "1.5px solid rgba(255,255,255,0.38)",
                borderRadius: 12, padding: "13px 26px", fontSize: 14, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                backdropFilter: "blur(8px)",
              }}>
                <PlusCircle size={16} />
                Host a Journey
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Action Cards — white, side by side ── */}
      <section style={{ background: "#F3F4F6", padding: "44px 24px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}>
            {/* Host a Journey */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                background: "#FFFFFF", borderRadius: 20, padding: "28px 28px 24px",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: "rgba(58,134,255,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>
                <PlusCircle size={22} color={BLUE} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: "0 0 8px" }}>
                Host a Journey
              </h3>
              <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.65, margin: "0 0 22px" }}>
                Share your daily route, split the fuel cost, and connect with professionals heading your way.
              </p>
              <Link href="/offer-ride">
                <button style={{
                  background: NAVY, color: "#fff", border: "none",
                  borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  Get Started <ArrowRight size={14} />
                </button>
              </Link>
            </motion.div>

            {/* Request a Journey */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                background: "#FFFFFF", borderRadius: 20, padding: "28px 28px 24px",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: "rgba(58,134,255,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>
                <Search size={22} color={BLUE} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: "0 0 8px" }}>
                Request a Journey
              </h3>
              <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.65, margin: "0 0 22px" }}>
                Browse verified journeys or post a public request so hosts heading your way can find you.
              </p>
              <Link href="/find-rides">
                <button style={{
                  background: BLUE, color: "#fff", border: "none",
                  borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  Browse & Request <ArrowRight size={14} />
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Why SyncIn? Features ── */}
      <section style={{ background: "#FFFFFF", padding: "56px 24px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: NAVY, margin: "0 0 10px" }}>
              Why choose SyncIn Club?
            </h2>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, margin: 0 }}>
              A verified community of white-collar professionals making every commute better.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {[
              { icon: MapPin,  title: "Flexible Pickup Points", desc: "Find journeys near your office or home. No detours — just a clean, direct route." },
              { icon: Shield,  title: "Professionals Only",     desc: "Every member is verified with a company and job title, creating a trusted community." },
              { icon: Clock,   title: "Split the Fuel Cost",    desc: "Share fuel contributions fairly and reach your destination affordably." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                style={{
                  background: "#F8FAFC", borderRadius: 16, padding: "24px 20px",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: "rgba(58,134,255,0.10)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 14,
                }}>
                  <Icon size={20} color={BLUE} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: "0 0 8px" }}>{title}</h3>
                <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
