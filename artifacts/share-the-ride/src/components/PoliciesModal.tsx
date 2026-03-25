/**
 * PoliciesModal
 *
 * Shown when user clicks "Publish" / "Host Journey".
 * Journey is only submitted AFTER the user clicks Accept.
 * On first acceptance, onFirstAccept() fires (welcome email trigger).
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle, Scale, ShieldCheck, Users, Crown, Loader2 } from "lucide-react";

const NAVY = "#0B132B";
const CARD = "#0F1E3C";
const BLUE = "#3A86FF";
const GOLD = "#D4AF37";

const articles = [
  {
    icon: Users, color: BLUE,
    article: "I", title: "Professional Purpose",
    body: "SyncIn Club is exclusively for verified white-collar professionals. This platform exists for commute networking only. Using it for any commercial, illegal, or non-professional purpose is strictly prohibited.",
  },
  {
    icon: ShieldCheck, color: "#4ade80",
    article: "II", title: "Sovereign Responsibility",
    body: "Every host is personally responsible for verifying their co-traveler's National ID (CNIC) and vehicle registration number in person before every journey. SyncIn Club provides a discovery platform — physical verification is your duty.",
  },
  {
    icon: Scale, color: GOLD,
    article: "III", title: "Mutual Fee Agreement",
    body: "All fuel contributions are privately negotiated between host and co-traveler. No commercial fares, no financial commitments through this platform. Cost-sharing only.",
  },
  {
    icon: Crown, color: "#f59e0b",
    article: "IV", title: "Executive Conduct",
    body: "Members must maintain professional decorum at all times. Harassment, misrepresentation of identity or profession, or any behaviour unbecoming of an executive professional is grounds for immediate removal.",
  },
];

interface Props {
  open:          boolean;
  submitting:    boolean;
  onClose:       () => void;
  onAccept:      () => void;
}

export default function PoliciesModal({ open, submitting, onClose, onAccept }: Props) {
  const [checked, setChecked] = useState(false);

  if (!open) return null;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9500, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      {/* Backdrop */}
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.70)", backdropFilter:"blur(6px)" }} onClick={!submitting ? onClose : undefined} />

      <motion.div
        initial={{ opacity:0, scale:0.95, y:20 }}
        animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:0.95, y:20 }}
        transition={{ type:"spring", stiffness:300, damping:28 }}
        style={{
          position:"relative", zIndex:1,
          background: CARD, borderRadius:24,
          width:"100%", maxWidth:480,
          boxShadow:"0 24px 80px rgba(0,0,0,0.60)",
          border:"1px solid rgba(255,255,255,0.10)",
          maxHeight:"86vh", display:"flex", flexDirection:"column",
        }}
      >
        {/* Header */}
        <div style={{ padding:"24px 24px 16px", borderBottom:"1px solid rgba(255,255,255,0.08)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(212,175,55,0.70)", marginBottom:4 }}>SyncIn Club · Policies</div>
            <h2 style={{ fontSize:18, fontWeight:800, color:"#fff", margin:0 }}>Terms of Journey Hosting</h2>
          </div>
          <button onClick={!submitting ? onClose : undefined}
            style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.08)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={15} color="rgba(255,255,255,0.70)" />
          </button>
        </div>

        {/* Scrollable articles */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 24px" }}>
          {articles.map(({ icon: Icon, color, article, title, body }) => (
            <div key={article} style={{ display:"flex", gap:14, marginBottom:18 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:`rgba(${hexToRgb(color)},0.12)`, border:`1px solid rgba(${hexToRgb(color)},0.25)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(255,255,255,0.35)", marginBottom:3 }}>Article {article}</div>
                <div style={{ fontSize:13, fontWeight:800, color:"#fff", marginBottom:4 }}>{title}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)", lineHeight:1.6 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 24px 24px", borderTop:"1px solid rgba(255,255,255,0.08)", flexShrink:0 }}>
          {/* Checkbox */}
          <label style={{ display:"flex", alignItems:"flex-start", gap:12, cursor:"pointer", marginBottom:16 }}>
            <div
              onClick={() => setChecked(c => !c)}
              style={{
                width:22, height:22, borderRadius:6, flexShrink:0, marginTop:1,
                border: checked ? "none" : "2px solid rgba(255,255,255,0.30)",
                background: checked ? GOLD : "transparent",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", transition:"all .2s",
              }}
            >
              {checked && <CheckCircle size={14} color={NAVY} />}
            </div>
            <span style={{ fontSize:13, color:"rgba(255,255,255,0.70)", lineHeight:1.5 }}>
              I have read and agree to the SyncIn Club Hosting Policies. I accept full personal responsibility for my journeys and the safety of my co-travelers.
            </span>
          </label>

          <button
            onClick={checked ? onAccept : undefined}
            disabled={!checked || submitting}
            style={{
              width:"100%", padding:"14px 0", borderRadius:16, fontWeight:800, fontSize:15,
              border:"none", cursor: checked && !submitting ? "pointer" : "default",
              background: checked && !submitting
                ? `linear-gradient(135deg, ${GOLD} 0%, #B8860B 100%)`
                : "rgba(255,255,255,0.10)",
              color: checked && !submitting ? NAVY : "rgba(255,255,255,0.35)",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              boxShadow: checked && !submitting ? "0 4px 20px rgba(212,175,55,0.30)" : "none",
              transition:"all .2s",
            }}
          >
            {submitting
              ? <><Loader2 size={18} className="animate-spin" /> Publishing…</>
              : <>Accept &amp; Publish Journey</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "255,255,255";
}
