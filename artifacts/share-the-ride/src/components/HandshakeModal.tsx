/**
 * HandshakeModal — full-screen gold celebration + WhatsApp CTA
 *
 * Fires when two parties mutually connect (either ride interest or journey request).
 *
 * Props:
 *   open         — show/hide
 *   partnerName  — name of the other party
 *   whatsappUrl  — generated wa.me link with pre-filled message
 *   onClose      — dismiss handler
 */
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, ShieldCheck } from "lucide-react";

const GOLD  = "#c8a84b";
const NAVY  = "#0B132B";
const BLUE  = "#3A86FF";
const SILVER= "#BDC3C7";

function HandshakeIcon({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* left arm */}
      <path d="M4 36 L18 28 L26 34" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* right arm */}
      <path d="M60 36 L46 28 L38 34" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* clasped hands */}
      <path d="M22 38 Q32 30 42 38" stroke={GOLD} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M26 34 L22 38 L26 44 L38 44 L42 38 L38 34 Z" fill="rgba(200,168,75,0.18)" stroke={GOLD} strokeWidth="2.5" strokeLinejoin="round" />
      {/* fingers hint */}
      <path d="M26 44 L26 48 M30 44 L30 49 M34 44 L34 49 M38 44 L38 48" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
      <path d="M26 34 L26 30 M30 34 L30 29 M34 34 L34 29 M38 34 L38 30" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* Floating gold particles */
function Particles() {
  const pts = Array.from({ length: 18 }, (_, i) => ({
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
    size: 3 + Math.random() * 5,
    delay: Math.random() * 0.8,
  }));
  return (
    <>
      {pts.map((p, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, scale: 0, x: `${p.x}vw`, y: `${p.y}vh` }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], y: [`${p.y}vh`, `${p.y - 20}vh`] }}
          transition={{ duration: 1.8, delay: p.delay, ease: "easeOut" }}
          style={{ position: "fixed", width: p.size, height: p.size, borderRadius: "50%", background: GOLD, pointerEvents: "none", zIndex: 100001 }}
        />
      ))}
    </>
  );
}

interface Props {
  open: boolean;
  partnerName: string;
  whatsappUrl: string;
  onClose: () => void;
}

export default function HandshakeModal({ open, partnerName, whatsappUrl, onClose }: Props) {
  /* Auto-dismiss after 12 s but keep the modal available */
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 12000);
    return () => clearTimeout(t);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <Particles />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 100000,
              background: `radial-gradient(ellipse at 50% 40%, rgba(200,168,75,0.15) 0%, rgba(11,19,43,0.97) 65%)`,
              backdropFilter: "blur(12px)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.82, opacity: 0, y: 32 }}
              animate={{ scale: 1,    opacity: 1, y: 0   }}
              exit={{    scale: 0.82, opacity: 0, y: 32  }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              style={{
                width: "100%", maxWidth: 420, textAlign: "center",
                background: `linear-gradient(165deg, #0C1830 0%, #0F1E3C 100%)`,
                borderRadius: 28, padding: "36px 28px 28px",
                border: `1.5px solid rgba(200,168,75,0.35)`,
                boxShadow: "0 30px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(200,168,75,0.1)",
                position: "relative",
              }}
            >
              {/* Close */}
              <button onClick={onClose}
                style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} color={SILVER} />
              </button>

              {/* Gold accent line */}
              <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 3, borderRadius: "0 0 3px 3px", background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

              {/* Animated handshake icon */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: [0, 1.2, 1], rotate: [-20, 8, 0] }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}
              >
                <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(200,168,75,0.08)", border: `2px solid rgba(200,168,75,0.35)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 60px rgba(200,168,75,0.20)" }}>
                  <HandshakeIcon size={58} />
                </div>
              </motion.div>

              {/* Text */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: GOLD, marginBottom: 10 }}>
                  ✦ Handshake Complete ✦
                </div>
                <h2 style={{ color: "#fff", fontWeight: 900, fontSize: 26, margin: "0 0 10px", lineHeight: 1.2 }}>
                  You've Synced In!
                </h2>
                <p style={{ color: SILVER, fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
                  You and <strong style={{ color: "#fff" }}>{partnerName}</strong> have successfully connected. Now coordinate your journey via WhatsApp.
                </p>
              </motion.div>

              {/* WhatsApp CTA */}
              <motion.a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: "15px 0", borderRadius: 16,
                  background: "#25D366",
                  color: "#fff", fontWeight: 900, fontSize: 16,
                  textDecoration: "none",
                  boxShadow: "0 8px 30px rgba(37,211,102,0.45)",
                  letterSpacing: "0.01em",
                  marginBottom: 16,
                }}
              >
                <MessageCircle size={22} /> Connect on WhatsApp
              </motion.a>

              {/* Safety reminder */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", textAlign: "left" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <ShieldCheck size={14} color="#f87171" />
                  <span style={{ color: "#f87171", fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>Reminder</span>
                </div>
                <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                  Physically verify ID &amp; vehicle reg. Agree on fuel share privately via WhatsApp. SyncIn Club is not liable for transactions or travel safety.
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
