/**
 * CommunityCovenantModal
 *
 * Mandatory full-screen overlay shown to every new member.
 * User cannot proceed to Dashboard until they tick the checkbox and click
 * "I Accept & Join the Club".
 *
 * Acceptance is persisted to DB via PUT /api/profile so it never shows again.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Crown, Handshake, Users, Scale, BookOpen, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const NAVY  = "#0B132B";
const CARD  = "#0F1E3C";
const BLUE  = "#3A86FF";
const GOLD  = "#c8a84b";
const SILVER= "#BDC3C7";
const BORDER= "rgba(255,255,255,0.10)";

interface Props {
  open: boolean;
  onAccepted: () => void;
}

const sections = [
  {
    icon: Users,
    color: BLUE,
    rgb: "58,134,255",
    article: "I",
    title: "Professional Purpose",
    body: "SyncIn Club is exclusively for verified white-collar professionals. This platform exists for commute networking only. Using it for any commercial, illegal, or non-professional purpose is strictly prohibited.",
  },
  {
    icon: ShieldCheck,
    color: "#4ade80",
    rgb: "74,222,128",
    article: "II",
    title: "Sovereign Responsibility",
    body: "Every member is personally responsible for verifying their co-traveler's National ID (CNIC) and vehicle registration number in person before every journey. SyncIn Club provides a discovery platform — physical verification is your duty.",
  },
  {
    icon: Scale,
    color: GOLD,
    rgb: "200,168,75",
    article: "III",
    title: "Mutual Fee Agreement",
    body: "All fuel contributions and cost-sharing arrangements are privately negotiated between host and co-traveler. This app facilitates introductions only — no commercial fares, no financial commitments through this platform.",
  },
  {
    icon: Crown,
    color: "#f59e0b",
    rgb: "245,158,11",
    article: "IV",
    title: "Executive Code of Conduct",
    body: "Members must maintain professional decorum at all times. Harassment, misrepresentation of identity or profession, or any behaviour unbecoming of an executive professional is grounds for immediate and permanent removal.",
  },
];

export default function CommunityCovenantModal({ open, onAccepted }: Props) {
  const qc = useQueryClient();
  const [checked,  setChecked]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleAccept = async () => {
    if (!checked) return;
    setLoading(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ covenantAccepted: true }),
      });
      await qc.invalidateQueries();
      onAccepted();
    } catch {
      /* even if the request fails, let the user in — it will show again on next session */
      onAccepted();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: `${NAVY}f5`,
            backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
            overflowY: "auto",
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 24 }}
            animate={{ scale: 1,   opacity: 1, y: 0  }}
            exit={{    scale: 0.9, opacity: 0, y: 24  }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            style={{
              width: "100%", maxWidth: 580,
              background: `linear-gradient(165deg, #0C1830 0%, ${CARD} 100%)`,
              borderRadius: 24, overflow: "hidden",
              boxShadow: "0 30px 100px rgba(0,0,0,0.85)",
              border: `1px solid ${BORDER}`,
              position: "relative",
              margin: "auto",
            }}
          >
            {/* Gold top accent */}
            <div style={{ height: 4, background: `linear-gradient(90deg, ${GOLD} 0%, #e8d48a 50%, ${GOLD} 100%)` }} />

            {/* Header */}
            <div style={{ padding: "28px 28px 20px", textAlign: "center", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: `rgba(200,168,75,0.10)`, border: `2px solid rgba(200,168,75,0.35)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(200,168,75,0.15)" }}>
                  <BookOpen size={28} color={GOLD} />
                </div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: GOLD, marginBottom: 8 }}>
                SyncIn Club · Official
              </div>
              <h1 style={{ color: "#fff", fontWeight: 900, fontSize: 22, margin: 0, lineHeight: 1.2 }}>
                Community Covenant
              </h1>
              <p style={{ color: SILVER, fontSize: 13, marginTop: 8, lineHeight: 1.5, maxWidth: 380, margin: "8px auto 0" }}>
                Before joining, you must read and agree to SyncIn Club's standards. These rules exist to protect every member.
              </p>
            </div>

            {/* Articles */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12, maxHeight: "55vh", overflowY: "auto" }}>
              {sections.map(({ icon: Icon, color, rgb, article, title, body }) => (
                <div key={article}
                  style={{ display: "flex", gap: 14, padding: "16px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: `1px solid rgba(${rgb},0.12)` }}>
                  <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 13, background: `rgba(${rgb},0.10)`, border: `1.5px solid rgba(${rgb},0.25)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={19} color={color} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                      <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: `rgba(${rgb},0.8)` }}>Article {article}</span>
                      <div style={{ width: 20, height: 1, background: `rgba(${rgb},0.25)` }} />
                    </div>
                    <p style={{ color: "#fff", fontWeight: 800, fontSize: 13, margin: "0 0 5px" }}>{title}</p>
                    <p style={{ color: SILVER, fontSize: 12, lineHeight: 1.6, margin: 0, opacity: 0.85 }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer: checkbox + CTA */}
            <div style={{ padding: "18px 24px 24px", borderTop: `1px solid ${BORDER}` }}>
              {/* Checkbox row */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", marginBottom: 16, userSelect: "none" }}>
                <div
                  onClick={() => setChecked(c => !c)}
                  style={{
                    width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1,
                    border: `2px solid ${checked ? BLUE : "rgba(255,255,255,0.25)"}`,
                    background: checked ? BLUE : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .2s", cursor: "pointer",
                  }}
                >
                  {checked && <CheckCircle size={14} color="#fff" />}
                </div>
                <span style={{ color: "#fff", fontSize: 13, lineHeight: 1.55, fontWeight: 600 }}>
                  I understand this is a private professional network and I take full responsibility for verifying my partners' identity and vehicle details in person.
                </span>
              </label>

              {/* CTA Button */}
              <button
                type="button"
                onClick={handleAccept}
                disabled={!checked || loading}
                style={{
                  width: "100%", padding: "15px 0", borderRadius: 16,
                  background: checked ? `linear-gradient(135deg, ${BLUE}, #1d6fe8)` : "rgba(255,255,255,0.08)",
                  border: "none", color: checked ? "#fff" : "rgba(255,255,255,0.35)",
                  fontSize: 16, fontWeight: 900, cursor: checked ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  boxShadow: checked ? "0 8px 30px rgba(58,134,255,0.50)" : "none",
                  transition: "all .25s",
                  letterSpacing: "0.01em",
                }}
              >
                {loading ? (
                  <><div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }} className="animate-spin" /> Joining…</>
                ) : (
                  <><Handshake size={20} /> I Accept &amp; Join the Club</>
                )}
              </button>

              <p style={{ textAlign: "center", fontSize: 10, color: "rgba(189,195,199,0.4)", marginTop: 12 }}>
                You will not be able to access the Dashboard until you accept these terms.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
