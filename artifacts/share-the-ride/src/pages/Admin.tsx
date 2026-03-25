/**
 * Admin Panel — Sovereign access only
 * Allows reviewing and changing member status (pending / approved / rejected)
 */
import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Shield, CheckCircle, XCircle, Clock, Users,
  Briefcase, Building2, Linkedin, Phone, ChevronDown,
} from "lucide-react";

const NAVY  = "#0B132B";
const GOLD  = "#D4AF37";
const BLUE  = "#3A86FF";
const GREEN = "#16a34a";
const RED   = "#dc2626";
const BG    = "#F3F4F6";
const SERIF = "'Playfair Display', Merriweather, Georgia, serif";

type MemberStatus = "pending" | "approved" | "rejected";

interface Member {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  jobTitle?: string;
  companyName?: string;
  linkedinUrl?: string;
  cnicNumber?: string;
  mobileNumber?: string;
  mobileVerified?: boolean;
  profileComplete?: boolean;
  memberStatus?: MemberStatus;
  vehicleRegNumber?: string;
  bio?: string;
  isSovereign?: boolean;
  createdAt?: string;
}

const STATUS_CONFIG: Record<MemberStatus, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  approved: { label: "Approved", bg: "rgba(22,163,74,0.12)", color: "#16a34a", icon: <CheckCircle size={12} /> },
  pending:  { label: "Pending",  bg: "rgba(251,191,36,0.12)", color: "#d97706", icon: <Clock size={12} /> },
  rejected: { label: "Rejected", bg: "rgba(220,38,38,0.12)", color: "#dc2626", icon: <XCircle size={12} /> },
};

export default function Admin() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const userAny = (user as any) ?? {};

  const [members, setMembers] = useState<Member[]>([]);
  const [fetching, setFetching] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | MemberStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !userAny?.isSovereign) { setLocation("/dashboard"); return; }
    fetch("/api/admin/users", { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setMembers)
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [isLoading]);

  const updateStatus = async (id: string, memberStatus: MemberStatus) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberStatus }),
      });
      if (res.ok) {
        setMembers(prev => prev.map(m => m.id === id ? { ...m, memberStatus } : m));
      }
    } catch { /* silent */ } finally { setUpdating(null); }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${BLUE}`, borderTopColor: "transparent" }} className="animate-spin" />
      </div>
    );
  }

  if (!userAny?.isSovereign) return null;

  const filtered = filter === "all" ? members : members.filter(m => (m.memberStatus ?? "approved") === filter);

  const counts = {
    all:      members.length,
    approved: members.filter(m => (m.memberStatus ?? "approved") === "approved").length,
    pending:  members.filter(m => (m.memberStatus ?? "approved") === "pending").length,
    rejected: members.filter(m => (m.memberStatus ?? "approved") === "rejected").length,
  };

  return (
    <div className="flex-1 w-full pb-16" style={{ background: BG, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: NAVY, padding: "28px 0 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(212,175,55,0.15)", border: "1.5px solid rgba(212,175,55,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={20} color={GOLD} />
            </div>
            <div>
              <h1 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>Admin Panel</h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.50)", margin: 0 }}>Synicin Club · Member Management</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {(["all", "approved", "pending", "rejected"] as const).map(key => {
            const isAll = key === "all";
            const cfg = isAll ? null : STATUS_CONFIG[key];
            return (
              <motion.button key={key}
                whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={() => setFilter(key)}
                style={{
                  background: filter === key ? (isAll ? NAVY : cfg?.bg.replace("0.12", "0.22") ?? "#fff") : "#fff",
                  border: filter === key ? `2px solid ${isAll ? GOLD : cfg?.color}` : "2px solid transparent",
                  borderRadius: 16, padding: "16px 12px", textAlign: "center" as const, cursor: "pointer",
                  boxShadow: filter === key ? "0 4px 16px rgba(0,0,0,0.12)" : "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "all .2s",
                }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: filter === key ? (isAll ? "#fff" : cfg?.color) : NAVY }}>{counts[key]}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: filter === key ? (isAll ? "rgba(255,255,255,0.7)" : cfg?.color) : "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginTop: 2 }}>
                  {key === "all" ? "Total Members" : key}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Members list */}
        {fetching ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${BLUE}`, borderTopColor: "transparent" }} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8", fontSize: 14 }}>No members in this category.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(m => {
              const name = [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email || "Anonymous";
              const status = (m.memberStatus ?? "approved") as MemberStatus;
              const cfg = STATUS_CONFIG[status];
              const isExpanded = expandedId === m.id;

              return (
                <motion.div key={m.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>

                  {/* Row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px" }}>
                    {/* Avatar */}
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: `rgba(58,134,255,0.10)`, border: `2px solid rgba(58,134,255,0.20)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontWeight: 800, fontSize: 18, color: BLUE }}>{name[0]?.toUpperCase() || "?"}</span>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: NAVY }}>{name}</span>
                        {m.isSovereign && (
                          <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: "rgba(212,175,55,0.15)", color: GOLD, letterSpacing: "0.08em" }}>ADMIN</span>
                        )}
                      </div>
                      {(m.jobTitle || m.companyName) && (
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                          <Briefcase size={11} color="#94a3b8" />
                          {[m.jobTitle, m.companyName].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      {m.email && (
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{m.email}</div>
                      )}
                    </div>

                    {/* Status badge */}
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999, background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
                      {cfg.icon} {cfg.label}
                    </span>

                    {/* Expand toggle */}
                    <button onClick={() => setExpandedId(isExpanded ? null : m.id)}
                      style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.05)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform .2s", transform: isExpanded ? "rotate(180deg)" : "none" }}>
                      <ChevronDown size={15} color="#64748b" />
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", padding: "16px 20px 20px", background: "#fafafa" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                        {m.mobileNumber && (
                          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#374151" }}>
                            <Phone size={13} color="#94a3b8" /> {m.mobileNumber}
                            {m.mobileVerified && <span style={{ fontSize: 10, color: GREEN, fontWeight: 700 }}>✔ Verified</span>}
                          </div>
                        )}
                        {m.cnicNumber && (
                          <div style={{ fontSize: 13, color: "#374151" }}>
                            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>CNIC </span>
                            {m.cnicNumber}
                          </div>
                        )}
                        {m.vehicleRegNumber && (
                          <div style={{ fontSize: 13, color: "#374151" }}>
                            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Vehicle Reg </span>
                            {m.vehicleRegNumber}
                          </div>
                        )}
                        {m.createdAt && (
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>
                            Joined {new Date(m.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        )}
                      </div>
                      {m.bio && (
                        <div style={{ marginBottom: 14, fontSize: 13, color: "#374151", fontStyle: "italic", padding: "10px 14px", background: "rgba(58,134,255,0.04)", borderRadius: 10, border: "1px solid rgba(58,134,255,0.12)" }}>
                          "{m.bio}"
                        </div>
                      )}
                      {m.linkedinUrl && (
                        <a href={m.linkedinUrl} target="_blank" rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#0A66C2", fontWeight: 600, textDecoration: "none", marginBottom: 14 }}>
                          <Linkedin size={13} /> View LinkedIn
                        </a>
                      )}

                      {/* Status actions */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                        {(["approved", "pending", "rejected"] as MemberStatus[]).map(s => (
                          <button key={s}
                            disabled={status === s || updating === m.id}
                            onClick={() => updateStatus(m.id, s)}
                            style={{
                              padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 700, border: "none",
                              cursor: status === s || updating === m.id ? "default" : "pointer",
                              background: status === s ? STATUS_CONFIG[s].bg : "rgba(0,0,0,0.06)",
                              color: status === s ? STATUS_CONFIG[s].color : "#64748b",
                              opacity: updating === m.id && status !== s ? 0.5 : 1,
                              transition: "all .2s",
                            }}>
                            {s === "approved" ? "✔ Approve" : s === "pending" ? "◌ Set Pending" : "✕ Reject"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
