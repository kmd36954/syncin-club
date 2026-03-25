/**
 * ViewProfileModal — displays any user's public profile
 * Used by:
 *   - Host viewing a co-traveler who expressed interest
 *   - Co-traveler viewing the host's profile (including vehicle info)
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User as UserIcon, Briefcase, Building2, Car, FileText,
  Phone, CheckCircle, Shield, Linkedin,
} from "lucide-react";

const NAVY  = "#0B132B";
const CARD  = "#0F1E3C";
const BLUE  = "#3A86FF";
const SILVER= "#BDC3C7";
const BORDER= "rgba(255,255,255,0.10)";

interface PublicProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  jobTitle?: string;
  companyName?: string;
  mobileNumber?: string;
  vehicleRegNumber?: string;
  vehicleType?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  linkedinUrl?: string;
  mobileVerified?: boolean;
  createdAt?: string;
}

interface Props {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  /** Override name/image/title when you already have the data from interests */
  prefill?: {
    name?: string;
    image?: string;
    jobTitle?: string;
    company?: string;
  };
  /** If true, shows "View Co-traveler Profile" label; else "View Host Profile" */
  role?: "host" | "cotraveler";
}

export default function ViewProfileModal({ userId, open, onClose, prefill, role = "cotraveler" }: Props) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  useEffect(() => {
    if (!open || !userId) { setProfile(null); return; }
    setLoading(true); setErr("");
    fetch(`/api/users/${userId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject("Not found"))
      .then(d => { setProfile(d); setLoading(false); })
      .catch(() => { setErr("Could not load profile."); setLoading(false); });
  }, [open, userId]);

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(" ") || prefill?.name || "Member"
    : prefill?.name || "Member";

  const initial = displayName[0]?.toUpperCase() || "M";

  const rowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 0", borderBottom: `1px solid ${BORDER}`,
  };
  const iconBox = (color: string) => ({
    width: 34, height: 34, borderRadius: 10,
    background: `rgba(${color},0.12)`,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  } as React.CSSProperties);

  return (
    <AnimatePresence>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 310, damping: 32 }}
            style={{
              position: "relative", zIndex: 1, width: "100%", maxWidth: 460,
              background: `linear-gradient(160deg, ${NAVY} 0%, ${CARD} 100%)`,
              borderRadius: "24px 24px 0 0", maxHeight: "88vh",
              display: "flex", flexDirection: "column",
              boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
              border: `1px solid ${BORDER}`,
            }}
          >
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.22)" }} />
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px 14px", borderBottom: `1px solid ${BORDER}` }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>
                  {role === "host" ? "Host Profile" : "Co-Traveler Profile"}
                </div>
                <div style={{ color: SILVER, fontSize: 12, marginTop: 2 }}>Verified SyncIn Member</div>
              </div>
              <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} color="rgba(255,255,255,0.6)" />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 28px" }}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${BLUE}`, borderTopColor: "transparent" }} className="animate-spin" />
                </div>
              ) : err ? (
                <div style={{ textAlign: "center", color: "#f87171", padding: "36px 0", fontSize: 14 }}>{err}</div>
              ) : (
                <div>
                  {/* Profile avatar + name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                    {(profile?.profileImage || prefill?.image) ? (
                      <img src={profile?.profileImage || prefill?.image}
                        alt={displayName}
                        style={{ width: 68, height: 68, borderRadius: "50%", objectFit: "cover", border: `2px solid rgba(58,134,255,0.35)`, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 68, height: 68, borderRadius: "50%", background: `rgba(58,134,255,0.12)`, border: `2px solid rgba(58,134,255,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 26, fontWeight: 800, color: BLUE }}>{initial}</span>
                      </div>
                    )}
                    <div>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>{displayName}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }} />
                        <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 700 }}>Verified Member</span>
                        <Shield size={12} color="#4ade80" />
                      </div>
                    </div>
                  </div>

                  {/* Professional details */}
                  {(profile?.jobTitle || prefill?.jobTitle) && (
                    <div style={rowStyle}>
                      <div style={iconBox("58,134,255")}>
                        <Briefcase size={16} color={BLUE} />
                      </div>
                      <div>
                        <div style={{ color: SILVER, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Designation</div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{profile?.jobTitle || prefill?.jobTitle}</div>
                      </div>
                    </div>
                  )}

                  {(profile?.companyName || prefill?.company) && (
                    <div style={rowStyle}>
                      <div style={iconBox("58,134,255")}>
                        <Building2 size={16} color={BLUE} />
                      </div>
                      <div>
                        <div style={{ color: SILVER, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Organisation</div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{profile?.companyName || prefill?.company}</div>
                      </div>
                    </div>
                  )}

                  {profile?.mobileNumber && (
                    <div style={rowStyle}>
                      <div style={iconBox("74,222,128")}>
                        <Phone size={16} color="#4ade80" />
                      </div>
                      <div>
                        <div style={{ color: SILVER, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Mobile</div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{profile.mobileNumber}</div>
                      </div>
                    </div>
                  )}

                  {profile?.linkedinUrl && (
                    <div style={rowStyle}>
                      <div style={iconBox("10,102,194")}>
                        <Linkedin size={16} color="#0A66C2" />
                      </div>
                      <div>
                        <div style={{ color: SILVER, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>LinkedIn</div>
                        <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                          style={{ color: "#6ab4f5", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                          View LinkedIn Profile →
                        </a>
                      </div>
                    </div>
                  )}

                  {profile?.createdAt && (
                    <div style={{ ...rowStyle, borderBottom: "none" }}>
                      <div style={iconBox("212,175,55")}>
                        <Shield size={16} color="#D4AF37" />
                      </div>
                      <div>
                        <div style={{ color: SILVER, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Member Since</div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
                          {new Date(profile.createdAt).toLocaleDateString("en-PK", { month: "long", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Vehicle info — shown for hosts */}
                  {(profile?.vehicleRegNumber || profile?.vehicleType) && (
                    <div style={{ marginTop: 20, padding: "16px", background: "rgba(58,134,255,0.06)", border: `1px solid rgba(58,134,255,0.18)`, borderRadius: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <Car size={16} color={BLUE} />
                        <span style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>Verified Vehicle</span>
                        <CheckCircle size={14} color="#4ade80" />
                      </div>
                      {(profile.vehicleMake || profile.vehicleModel || profile.vehicleType) && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ color: SILVER, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Vehicle</div>
                          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
                            {[profile.vehicleMake, profile.vehicleModel, profile.vehicleType].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      )}
                      {profile.vehicleRegNumber && (
                        <div>
                          <div style={{ color: SILVER, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Registration Number</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <FileText size={14} color={BLUE} />
                            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: "0.05em" }}>{profile.vehicleRegNumber}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Safety note */}
                  <div style={{ marginTop: 20, padding: "12px 14px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: 12 }}>
                    <div style={{ color: "#f87171", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Safety Reminder</div>
                    <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, lineHeight: 1.5 }}>
                      Always verify the person's ID and vehicle registration in person before starting the journey.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
