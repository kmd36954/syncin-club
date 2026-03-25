import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, PlusCircle, ArrowRight, Shield, Users, MapPin } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";

const HERO_PRIMARY  = "https://images.unsplash.com/photo-1503376760367-1b61b2565443?q=80&w=1920&auto=format&fit=crop";
const HERO_FALLBACK = "https://images.unsplash.com/photo-1614200187524-dc4b892acf16?q=80&w=1920&auto=format&fit=crop";
const NAVY = "#0B132B";
const BLUE = "#3A86FF";

export default function Lobby() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [heroImg, setHeroImg] = useState(HERO_PRIMARY);
  const userAny = (user as any) ?? {};
  const hostReady = Boolean(userAny?.vehicleRegNumber);

  /* Test if preferred hero image loads; fall back silently if 404 */
  useEffect(() => {
    const img = new Image();
    img.onerror = () => setHeroImg(HERO_FALLBACK);
    img.src = HERO_PRIMARY;
  }, []);

  const handleHost = () => {
    if (!isAuthenticated) {
      setLocation(`/login?returnTo=${encodeURIComponent("/dashboard?flow=host")}`);
      return;
    }
    /* Authenticated: go to dashboard — modal handles the rest */
    setLocation("/dashboard?flow=host");
  };

  const handleFind = () => {
    if (!isAuthenticated) {
      setLocation(`/login?returnTo=${encodeURIComponent("/dashboard?flow=request")}`);
      return;
    }
    setLocation("/dashboard?flow=request");
  };

  return (
    <div style={{ flex: 1, width: "100%" }}>

      {/* ── Full-width luxury hero ── */}
      <section
        style={{
          position: "relative",
          height: 480,
          overflow: "hidden",
          backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${heroImg}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >

        {/* Hero text content */}
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

          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              fontSize: "clamp(1.85rem, 3.8vw, 2.9rem)", fontWeight: 800,
              color: "#FFFFFF", lineHeight: 1.18, margin: "0 0 16px",
              textShadow: "0 2px 20px rgba(0,0,0,0.45)",
            }}
          >
            The exclusive professional<br />network for journey sharing.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{
              fontSize: 15.5, color: "rgba(255,255,255,0.82)",
              lineHeight: 1.7, margin: "0 0 32px", maxWidth: 500,
            }}
          >
            Connect with verified executives and professionals for secure, trusted,
            and affordable daily commutes across Pakistan.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ display: "flex", gap: 14, flexWrap: "wrap" }}
          >
            <button
              onClick={handleFind}
              disabled={isLoading}
              style={{
                background: BLUE, color: "#fff", border: "none",
                borderRadius: 12, padding: "13px 26px", fontSize: 14, fontWeight: 700,
                cursor: isLoading ? "wait" : "pointer",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 4px 20px rgba(58,134,255,0.40)", opacity: isLoading ? 0.7 : 1,
              }}
            >
              <Search size={16} />
              Request a Journey
            </button>
            <button
              onClick={handleHost}
              disabled={isLoading}
              style={{
                background: "rgba(255,255,255,0.12)", color: "#fff",
                border: "1.5px solid rgba(255,255,255,0.38)",
                borderRadius: 12, padding: "13px 26px", fontSize: 14, fontWeight: 700,
                cursor: isLoading ? "wait" : "pointer",
                display: "flex", alignItems: "center", gap: 8,
                backdropFilter: "blur(8px)", opacity: isLoading ? 0.7 : 1,
              }}
            >
              <PlusCircle size={16} />
              Host a Journey
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Navy action cards — side by side ── */}
      <section style={{ background: "#F3F4F6", padding: "44px 24px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: 24,
            width: "100%",
            maxWidth: "90%",
            margin: "0 auto",
          }}>

            {/* Host a Journey card — Midnight Navy */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              onClick={handleHost}
              style={{
                background: NAVY, borderRadius: 20, padding: "28px 28px 24px",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
                cursor: isLoading ? "wait" : "pointer",
                position: "relative", overflow: "hidden",
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: "rgba(255,255,255,0.10)",
                border: "1.5px solid rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>
                <PlusCircle size={22} color="#FFFFFF" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF", margin: "0 0 8px" }}>
                Host a Journey
              </h3>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.68)", lineHeight: 1.65, margin: "0 0 20px" }}>
                Share your daily route, split the fuel cost, and connect with professionals heading your way.
              </p>
              {isAuthenticated && !hostReady && (
                <div style={{
                  display: "inline-block", marginBottom: 16,
                  padding: "5px 12px", borderRadius: 8,
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.03em",
                  background: "rgba(245,158,11,0.20)", border: "1px solid rgba(245,158,11,0.35)",
                  color: "#fbbf24",
                }}>
                  Vehicle verification required
                </div>
              )}
              <button
                style={{
                  background: "#FFFFFF", color: NAVY, border: "none",
                  borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
                }}
              >
                {isAuthenticated && !hostReady ? "Complete Verification" : "Get Started"}
                <ArrowRight size={14} />
              </button>
            </motion.div>

            {/* Request a Journey card — Deep Sapphire #172554 */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              onClick={handleFind}
              style={{
                background: "#172554", borderRadius: 20, padding: "28px 28px 24px",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
                cursor: isLoading ? "wait" : "pointer",
                position: "relative", overflow: "hidden",
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: "rgba(255,255,255,0.10)",
                border: "1.5px solid rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>
                <Search size={22} color="#FFFFFF" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF", margin: "0 0 8px" }}>
                Request a Journey
              </h3>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.68)", lineHeight: 1.65, margin: "0 0 22px" }}>
                Browse verified journeys or post a public request so hosts heading your way can find you.
              </p>
              <button
                style={{
                  background: BLUE, color: "#fff", border: "none",
                  borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                  boxShadow: "0 4px 16px rgba(58,134,255,0.40)",
                }}
              >
                Browse &amp; Request <ArrowRight size={14} />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Trust indicators ── */}
      <section style={{ background: "#F3F4F6", padding: "52px 24px", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: NAVY, margin: "0 0 10px" }}>
              Why choose SyncIn Club?
            </h2>
            <p style={{ fontSize: 14, color: "#44556a", lineHeight: 1.6, margin: 0 }}>
              A verified community of white-collar professionals making every commute better.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 20 }}>
            {[
              { icon: Shield, title: "Verified Professionals Only", desc: "Every host is identity & vehicle-verified through our secure process." },
              { icon: Users,  title: "Community-Driven",             desc: "Thousands of daily commuters across Islamabad & Rawalpindi." },
              { icon: MapPin, title: "Live Route Matching",          desc: "Real-time map showing active journeys near you." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                style={{
                  background: "#FFFFFF", borderRadius: 16, padding: "24px 20px",
                  border: "1px solid rgba(0,0,0,0.07)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: "rgba(58,134,255,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 14,
                }}>
                  <Icon size={20} color={BLUE} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, margin: "0 0 8px" }}>{title}</h3>
                <p style={{ fontSize: 13, color: "#44556a", lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
