/**
 * NotificationsDrawer — dark navy theme
 *
 * Features:
 *  - High-contrast white text on midnight navy background
 *  - "View Profile" on every incoming interest (co-traveler) card
 *  - "View Profile" on every outgoing interest (host) card
 *  - Safety Alert modal before accepting any co-traveler request
 *  - WhatsApp connect button after acceptance
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, X, CheckCircle, MessageCircle, Clock, MapPin,
  User as UserIcon, XCircle, Car, AlertTriangle, Eye, Shield,
} from "lucide-react";
import ViewProfileModal from "@/components/ViewProfileModal";

/* ── Tokens ─────────────────────────────────────────────────── */
const NAVY  = "#0B132B";
const CARD  = "#0F1E3C";
const BLUE  = "#3A86FF";
const SILVER= "#BDC3C7";
const BORDER= "rgba(255,255,255,0.10)";

/* ── Display-name helper — never shows email addresses ─────── */
const dn = (name?: string | null): string => {
  if (!name || name.includes("@")) return "Member";
  return name.trim() || "Member";
};

/* ── Time-ago helper ────────────────────────────────────────── */
function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } catch { return ""; }
}

/* ── Types ─────────────────────────────────────────────────────*/
export interface IncomingInterest {
  id: number; rideId: number;
  startLocation: string; destination: string;
  passengerId: string; passengerName: string;
  passengerJobTitle?: string; passengerCompany?: string; passengerImage?: string;
  status: string; createdAt: string;
}
export interface OutgoingInterest {
  id: number; rideId: number;
  startLocation: string; destination: string;
  hostId?: string; hostName: string;
  hostJobTitle?: string; hostCompany?: string;
  status: string; whatsappUrl?: string; createdAt: string;
}
export interface MyRide {
  id: number; startLocation: string; destination: string; status: string;
}

/* ── Safety Alert Modal ──────────────────────────────────────── */
function SafetyAlert({ open, onConfirm, onCancel, passengerName }: {
  open: boolean; onConfirm: () => void; onCancel: () => void; passengerName: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10001, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{
              position: "relative", zIndex: 1, width: "100%", maxWidth: 400,
              background: `linear-gradient(160deg, ${NAVY} 0%, ${CARD} 100%)`,
              borderRadius: 24, padding: 24,
              border: "1.5px solid rgba(248,113,113,0.35)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(248,113,113,0.1)",
            }}
          >
            {/* Alert icon */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(248,113,113,0.12)", border: "1.5px solid rgba(248,113,113,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={26} color="#f87171" />
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ color: "#f87171", fontWeight: 900, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 6 }}>⚠ Safety Alert</div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 17, marginBottom: 12, lineHeight: 1.3 }}>
                Before Accepting {passengerName}
              </div>
              <div style={{
                background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: 14, padding: "14px 16px", textAlign: "left",
              }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 12, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>IMPORTANT — Please Read</div>
                {[
                  "Both parties must physically verify IDs and Vehicle Registration before starting the journey.",
                  "Fare / Fuel sharing amount must be mutually agreed upon privately — not through this app.",
                  "SyncIn Club is a networking platform only. We are not responsible for financial transactions or physical safety during travel.",
                ].map((point, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: i < 2 ? 10 : 0 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <span style={{ color: "#f87171", fontWeight: 800, fontSize: 10 }}>{i + 1}</span>
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, lineHeight: 1.5 }}>{point}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onCancel}
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, background: "rgba(255,255,255,0.07)", border: `1px solid ${BORDER}`, color: SILVER, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={onConfirm}
                style={{ flex: 1.6, padding: "12px 0", borderRadius: 12, background: BLUE, border: "none", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 18px rgba(58,134,255,0.4)" }}>
                I Understand — Accept
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════════════════════
   HOOK
══════════════════════════════════════════════════════════════ */
export function useNotifications(enabled = true) {
  const [incoming,  setIncoming]  = useState<IncomingInterest[]>([]);
  const [outgoing,  setOutgoing]  = useState<OutgoingInterest[]>([]);
  const [myRides,   setMyRides]   = useState<MyRide[]>([]);
  const [processing, setProcessing] = useState<number | null>(null);
  const [localAccepted, setLocalAccepted] = useState<Map<number, string>>(new Map());
  const [localDismissed, setLocalDismissed] = useState<Set<number>>(new Set());
  const [localCancelledRides,    setLocalCancelledRides]    = useState<Set<number>>(new Set());
  const [localCancelledRequests, setLocalCancelledRequests] = useState<Set<number>>(new Set());
  const [lastHandshake, setLastHandshake] = useState<{ partnerName: string; whatsappUrl: string } | null>(null);

  /* seenIds — IDs already "seen" when panel was last opened. Persisted across reloads. */
  const [seenIds, setSeenIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("notif_seen_v1") || "[]")); } catch { return new Set(); }
  });

  const fetchAll = useCallback(async () => {
    if (!enabled) return;
    try {
      const [incRes, outRes] = await Promise.all([
        fetch("/api/interests/incoming", { credentials: "include" }),
        fetch("/api/interests/outgoing",  { credentials: "include" }),
      ]);
      if (incRes.ok) { const d = await incRes.json(); setIncoming(d.interests || []); setMyRides(d.myRides || []); }
      if (outRes.ok) { const d = await outRes.json(); setOutgoing(d.interests || []); }
    } catch { /* silent */ }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetchAll();
    const iv = setInterval(fetchAll, 15000);
    return () => clearInterval(iv);
  }, [enabled, fetchAll]);

  const accept = async (interest: IncomingInterest) => {
    setProcessing(interest.id);
    try {
      const res = await fetch(`/api/interests/${interest.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "connected" }),
      });
      const data = await res.json();
      if (data.whatsappUrl) {
        setLocalAccepted(prev => new Map([...prev, [interest.id, data.whatsappUrl]]));
        setLastHandshake({ partnerName: data.partnerName ?? interest.passengerName, whatsappUrl: data.whatsappUrl });
      }
      await fetchAll();
    } catch { /* silent */ } finally { setProcessing(null); }
  };

  const ignore = async (id: number) => {
    setLocalDismissed(prev => new Set([...prev, id]));
    try {
      await fetch(`/api/interests/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      await fetchAll();
    } catch { /* silent */ }
  };

  const cancelJourney = async (rideId: number) => {
    setLocalCancelledRides(prev => new Set([...prev, rideId]));
    try { await fetch(`/api/rides/${rideId}`, { method: "DELETE", credentials: "include" }); await fetchAll(); } catch { /* silent */ }
  };

  const cancelRequest = async (interestId: number) => {
    setLocalCancelledRequests(prev => new Set([...prev, interestId]));
    try {
      await fetch(`/api/interests/${interestId}`, {
        method: "DELETE", credentials: "include",
      });
      await fetchAll();
    } catch { /* silent */ }
  };

  const pendingIncoming = incoming.filter(i => i.status === "pending" && !localDismissed.has(i.id));
  const activeMyRides   = myRides.filter(r => r.status === "active" && !localCancelledRides.has(r.id));

  /* badgeCount = actionable items that haven't been "seen" yet */
  const badgeCount = useMemo(() => {
    const actionableIds = [
      ...incoming.filter(i => i.status === "pending" && !localDismissed.has(i.id)).map(i => `in-${i.id}`),
      ...outgoing.filter(i => !localCancelledRequests.has(i.id)).map(i => `out-${i.id}`),
    ];
    return actionableIds.filter(id => !seenIds.has(id)).length;
  }, [incoming, outgoing, localDismissed, localCancelledRequests, seenIds]);

  /* FIX 4 — play a soft ping when new notifications arrive */
  const prevBadgeRef = useRef(0);
  useEffect(() => {
    if (badgeCount > prevBadgeRef.current) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.45);
          osc.onended = () => ctx.close();
        }
      } catch { /* AudioContext unavailable — silent */ }
    }
    prevBadgeRef.current = badgeCount;
  }, [badgeCount]);

  /* markSeen — call when panel opens; snapshots current actionable IDs */
  const markSeen = useCallback(() => {
    const currentIds = new Set([
      ...incoming.filter(i => i.status === "pending").map(i => `in-${i.id}`),
      ...outgoing.map(i => `out-${i.id}`),
    ]);
    setSeenIds(currentIds);
    try { localStorage.setItem("notif_seen_v1", JSON.stringify([...currentIds])); } catch { /* ok */ }
  }, [incoming, outgoing]);

  const clearHandshake = () => setLastHandshake(null);

  return {
    incoming, outgoing, myRides, activeMyRides,
    pendingIncoming, badgeCount, processing,
    localAccepted, localCancelledRequests,
    lastHandshake, clearHandshake,
    accept, ignore, cancelJourney, cancelRequest,
    markSeen,
  };
}

/* ══════════════════════════════════════════════════════════════
   DRAWER UI
══════════════════════════════════════════════════════════════ */
export function NotificationsDrawer({
  open, onClose,
  incoming, outgoing, myRides, activeMyRides, pendingIncoming,
  processing, localAccepted, localCancelledRequests,
  onAccept, onIgnore, onCancelJourney, onCancelRequest,
  coTravelerIds,
}: {
  open: boolean; onClose: () => void;
  incoming: IncomingInterest[]; outgoing: OutgoingInterest[];
  myRides: MyRide[]; activeMyRides: MyRide[];
  pendingIncoming: IncomingInterest[]; processing: number | null;
  localAccepted: Map<number, string>; localCancelledRequests: Set<number>;
  onAccept: (i: IncomingInterest) => void;
  onIgnore: (id: number) => void;
  onCancelJourney: (rideId: number) => void;
  onCancelRequest: (interestId: number) => void;
  coTravelerIds?: Set<string>;
}) {
  const [tab,                  setTab]                  = useState<"incoming" | "outgoing">("incoming");
  const [cancelRideConfirm,    setCancelRideConfirm]    = useState<number | null>(null);
  const [cancelRequestConfirm, setCancelRequestConfirm] = useState<number | null>(null);

  /* View Profile modal */
  const [viewProfileUserId,    setViewProfileUserId]    = useState<string | null>(null);
  const [viewProfilePrefill,   setViewProfilePrefill]   = useState<any>(null);
  const [viewProfileRole,      setViewProfileRole]      = useState<"host"|"cotraveler">("cotraveler");
  const [viewProfileOpen,      setViewProfileOpen]      = useState(false);

  /* Safety Alert state */
  const [safetyTarget,         setSafetyTarget]         = useState<IncomingInterest | null>(null);
  const [safetyOpen,           setSafetyOpen]           = useState(false);

  const acceptedOutgoing  = outgoing.filter(i => i.status === "connected" && !localCancelledRequests.has(i.id));
  const pendingOutgoing   = outgoing.filter(i => i.status === "pending"   && !localCancelledRequests.has(i.id));

  const openCoTravelerProfile = (interest: IncomingInterest) => {
    setViewProfileUserId(interest.passengerId);
    setViewProfilePrefill({ name: interest.passengerName, image: interest.passengerImage, jobTitle: interest.passengerJobTitle, company: interest.passengerCompany });
    setViewProfileRole("cotraveler");
    setViewProfileOpen(true);
  };

  const openHostProfile = (i: OutgoingInterest) => {
    if (!i.hostId) return;
    setViewProfileUserId(i.hostId);
    setViewProfilePrefill({ name: i.hostName, jobTitle: i.hostJobTitle, company: i.hostCompany });
    setViewProfileRole("host");
    setViewProfileOpen(true);
  };

  const triggerAccept = (interest: IncomingInterest) => {
    setSafetyTarget(interest);
    setSafetyOpen(true);
  };

  const confirmAccept = () => {
    if (safetyTarget) onAccept(safetyTarget);
    setSafetyOpen(false);
    setSafetyTarget(null);
  };

  /* Reusable "Travelled Together" badge */
  const TravelledBadge = () => (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:800, padding:"2px 9px", borderRadius:999, background:"rgba(34,197,94,0.15)", color:"#4ade80", border:"1px solid rgba(34,197,94,0.30)", flexShrink:0, whiteSpace:"nowrap" as const }}>
      ✓ Travelled together
    </span>
  );

  /* Reusable section header */
  const SectionHeader = ({ label, count, color }: { label: string; count?: number; color: string }) => (
    <div style={{ padding: "8px 20px", background: `rgba(${color},0.07)`, borderBottom: `1px solid rgba(${color},0.12)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.10em", color: `rgb(${color})` }}>{label}</span>
      {count !== undefined && count > 0 && (
        <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: `rgba(${color},0.8)`, borderRadius: 999, padding: "2px 8px" }}>{count}</span>
      )}
    </div>
  );

  /* Row button */
  const Btn = ({ onClick, disabled, bg, color, children, style = {} }: any) => (
    <button onClick={onClick} disabled={disabled}
      style={{ flex: 1, padding: "10px 0", borderRadius: 11, background: bg, border: "none", color, fontSize: 12, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, opacity: disabled ? 0.6 : 1, transition: "opacity .2s", ...style }}>
      {children}
    </button>
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 9000 }}
            />

            {/* Drawer panel */}
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{
                position: "fixed", top: 0, right: 0, height: "100%",
                width: "100%", maxWidth: 420,
                background: `linear-gradient(160deg, ${NAVY} 0%, ${CARD} 100%)`,
                boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
                display: "flex", flexDirection: "column",
                zIndex: 9001,
                borderLeft: `1px solid ${BORDER}`,
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 16px", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Bell size={18} color={BLUE} />
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>Notifications</span>
                </div>
                <button onClick={onClose}
                  style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <X size={15} color={SILVER} />
                </button>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
                {(["incoming", "outgoing"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{
                      flex: 1, padding: "12px 0", background: "none", border: "none", cursor: "pointer",
                      borderBottom: tab === t ? `2px solid ${BLUE}` : "2px solid transparent",
                      color: tab === t ? BLUE : SILVER,
                      fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      transition: "color .2s",
                    }}>
                    {t === "incoming" ? "Journey Requests" : "Journey Offers"}
                    {t === "incoming" && pendingIncoming.length > 0 && (
                      <span style={{ background: "#f59e0b", color: "#fff", borderRadius: 999, fontSize: 9, fontWeight: 900, padding: "2px 7px" }}>{pendingIncoming.length}</span>
                    )}
                    {t === "outgoing" && outgoing.filter(i => !localCancelledRequests.has(i.id)).length > 0 && (
                      <span style={{ background: "rgba(255,255,255,0.18)", color: "#fff", borderRadius: 999, fontSize: 9, fontWeight: 900, padding: "2px 7px" }}>{outgoing.filter(i => !localCancelledRequests.has(i.id)).length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {tab === "incoming" ? (
                  <div>
                    {/* Active journeys */}
                    {activeMyRides.length > 0 && (
                      <div>
                        <SectionHeader label="Your Active Journeys" color="58,134,255" />
                        {activeMyRides.map(ride => (
                          <motion.div key={ride.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                              <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(58,134,255,0.12)", border: `1px solid rgba(58,134,255,0.25)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Car size={18} color={BLUE} />
                              </div>
                              <div>
                                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Hosted Journey</div>
                                <div style={{ color: SILVER, fontSize: 11, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                  <MapPin size={10} /> {ride.startLocation} → {ride.destination}
                                </div>
                              </div>
                            </div>
                            {cancelRideConfirm === ride.id ? (
                              <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 12, padding: "12px 14px" }}>
                                <div style={{ color: "#f87171", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                                  <AlertTriangle size={14} /> Cancel this journey? Co-travelers will be notified.
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <Btn onClick={() => { onCancelJourney(ride.id); setCancelRideConfirm(null); }}
                                    bg="#dc2626" color="#fff">Yes, Cancel</Btn>
                                  <Btn onClick={() => setCancelRideConfirm(null)}
                                    bg="rgba(255,255,255,0.08)" color={SILVER} style={{ border: `1px solid ${BORDER}` }}>Keep It</Btn>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setCancelRideConfirm(ride.id)}
                                style={{ width: "100%", padding: "10px 0", borderRadius: 11, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                <XCircle size={14} /> Cancel Journey
                              </button>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Pending requests */}
                    <SectionHeader label="Co-Traveler Requests" count={pendingIncoming.length} color="245,158,11" />

                    {pendingIncoming.length === 0 ? (
                      <div style={{ padding: "28px 20px", textAlign: "center" }}>
                        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                          <Bell size={22} color="#f59e0b" />
                        </div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 5 }}>Awaiting Co-Traveler Requests</div>
                        <div style={{ color: SILVER, fontSize: 12, lineHeight: 1.5 }}>When a co-traveler expresses interest, their profile will appear here for your review.</div>

                        {/* Ghost button preview */}
                        <div style={{ marginTop: 18, borderRadius: 14, border: `1.5px dashed rgba(245,158,11,0.25)`, background: "rgba(245,158,11,0.05)", padding: "14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <UserIcon size={16} color={SILVER} />
                            </div>
                            <div>
                              <div style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>Co-Traveler Name</div>
                              <div style={{ color: SILVER, fontSize: 10 }}>Designation · Company</div>
                            </div>
                            <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 800, color: "#f59e0b", background: "rgba(245,158,11,0.15)", padding: "2px 8px", borderRadius: 999 }}>Preview</span>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            {[["View Profile", SILVER], ["Accept", "#fff"], ["Ignore", SILVER]].map(([label, color]) => (
                              <div key={label} style={{ flex: 1, padding: "8px 0", borderRadius: 9, background: label === "Accept" ? "rgba(58,134,255,0.3)" : "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, color, fontSize: 10, fontWeight: 700, textAlign: "center", opacity: 0.55, cursor: "not-allowed" }}>{label}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      pendingIncoming.map(interest => {
                        const isAccepted = localAccepted.has(interest.id);
                        const whatsappUrl = localAccepted.get(interest.id);
                        return (
                          <motion.div key={interest.id}
                            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                            style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>

                            {/* Co-traveler info */}
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                              {interest.passengerImage ? (
                                <img src={interest.passengerImage} alt={interest.passengerName}
                                  style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(58,134,255,0.3)", flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  <UserIcon size={20} color="#f59e0b" />
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, marginBottom: 2 }}>
                                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>{interest.passengerName}</div>
                                  {coTravelerIds?.has(interest.passengerId) && <TravelledBadge />}
                                </div>
                                {(interest.passengerJobTitle || interest.passengerCompany) && (
                                  <div style={{ color: SILVER, fontSize: 11, marginTop: 3 }}>
                                    {[interest.passengerJobTitle, interest.passengerCompany].filter(Boolean).join(" · ")}
                                  </div>
                                )}
                                <div style={{ color: "rgba(189,195,199,0.6)", fontSize: 10, marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                                  <MapPin size={10} /> {interest.startLocation} → {interest.destination}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                                  <span style={{ color: "rgba(189,195,199,0.5)", fontSize: 10, fontStyle: "italic" }}>Requested to join your journey</span>
                                  {interest.createdAt && <span style={{ color: "rgba(189,195,199,0.4)", fontSize: 10 }}>{timeAgo(interest.createdAt)}</span>}
                                </div>
                              </div>
                            </div>

                            {isAccepted ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <div style={{ color: "#4ade80", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                                  <CheckCircle size={15} /> Request Accepted
                                </div>
                                {whatsappUrl && (
                                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", borderRadius: 12, background: "#25D366", color: "#fff", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
                                    <MessageCircle size={15} /> Connect on WhatsApp
                                  </a>
                                )}
                              </div>
                            ) : (
                              <div style={{ display: "flex", gap: 7 }}>
                                <Btn onClick={() => openCoTravelerProfile(interest)}
                                  bg="rgba(255,255,255,0.07)" color={SILVER}
                                  style={{ border: `1px solid ${BORDER}`, flex: "0 0 auto", padding: "10px 14px" }}>
                                  <Eye size={13} /> View Profile
                                </Btn>
                                <Btn onClick={() => triggerAccept(interest)}
                                  disabled={processing === interest.id}
                                  bg={BLUE} color="#fff" style={{ boxShadow: "0 3px 12px rgba(58,134,255,0.35)" }}>
                                  {processing === interest.id
                                    ? <div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }} className="animate-spin" />
                                    : <><CheckCircle size={13} /> Accept</>}
                                </Btn>
                                <Btn onClick={() => onIgnore(interest.id)}
                                  disabled={processing === interest.id}
                                  bg="rgba(255,255,255,0.06)" color={SILVER}
                                  style={{ border: `1px solid ${BORDER}`, flex: "0 0 auto", padding: "10px 14px" }}>
                                  <X size={13} />
                                </Btn>
                              </div>
                            )}
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  /* ── OUTGOING TAB ── */
                  <div>
                    {(pendingOutgoing.length + acceptedOutgoing.length) === 0 && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                          <Clock size={24} color={SILVER} />
                        </div>
                        <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>No requests yet</div>
                        <div style={{ color: SILVER, fontSize: 12, lineHeight: 1.5 }}>Your journey requests will appear here once you express interest in a host's journey.</div>
                      </div>
                    )}

                    {acceptedOutgoing.length > 0 && (
                      <div>
                        <SectionHeader label="Accepted" color="74,222,128" />
                        {acceptedOutgoing.map(i => (
                          <motion.div key={i.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                              <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <CheckCircle size={18} color="#4ade80" />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ color: "#4ade80", fontWeight: 800, fontSize: 13, marginBottom: 3 }}>Request Accepted!</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
                                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{i.hostName}{i.hostCompany ? ` · ${i.hostCompany}` : ""}</div>
                                  {i.hostId && coTravelerIds?.has(i.hostId) && <TravelledBadge />}
                                </div>
                                <div style={{ color: "rgba(189,195,199,0.6)", fontSize: 10, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                                  <MapPin size={10} /> {i.startLocation} → {i.destination}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                                  <span style={{ color: "rgba(189,195,199,0.5)", fontSize: 10, fontStyle: "italic" }}>Your request was accepted</span>
                                  {i.createdAt && <span style={{ color: "rgba(189,195,199,0.4)", fontSize: 10 }}>{timeAgo(i.createdAt)}</span>}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              {i.hostId && (
                                <Btn onClick={() => openHostProfile(i)}
                                  bg="rgba(255,255,255,0.07)" color={SILVER}
                                  style={{ border: `1px solid ${BORDER}`, flex: "0 0 auto", padding: "10px 14px" }}>
                                  <Eye size={13} /> View Host
                                </Btn>
                              )}
                              {i.whatsappUrl && (
                                <a href={i.whatsappUrl} target="_blank" rel="noopener noreferrer"
                                  style={{ flex: 1, padding: "10px 0", borderRadius: 11, background: "#25D366", color: "#fff", fontSize: 12, fontWeight: 800, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                  <MessageCircle size={14} /> WhatsApp Host
                                </a>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {pendingOutgoing.length > 0 && (
                      <div>
                        <SectionHeader label="Pending" color="189,195,199" />
                        {pendingOutgoing.map(i => (
                          <motion.div key={i.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                              <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Clock size={18} color={SILVER} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ color: SILVER, fontSize: 12, fontWeight: 700 }}>Awaiting host review…</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, marginTop: 2 }}>
                                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{i.hostName}{i.hostCompany ? ` · ${i.hostCompany}` : ""}</div>
                                  {i.hostId && coTravelerIds?.has(i.hostId) && <TravelledBadge />}
                                </div>
                                <div style={{ color: "rgba(189,195,199,0.55)", fontSize: 10, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                                  <MapPin size={10} /> {i.startLocation} → {i.destination}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                                  <span style={{ color: "rgba(189,195,199,0.5)", fontSize: 10, fontStyle: "italic" }}>You requested to join this journey</span>
                                  {i.createdAt && <span style={{ color: "rgba(189,195,199,0.4)", fontSize: 10 }}>{timeAgo(i.createdAt)}</span>}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              {i.hostId && (
                                <Btn onClick={() => openHostProfile(i)}
                                  bg="rgba(255,255,255,0.06)" color={SILVER}
                                  style={{ border: `1px solid ${BORDER}`, flex: "0 0 auto", padding: "10px 14px" }}>
                                  <Eye size={13} /> View Host
                                </Btn>
                              )}
                              {cancelRequestConfirm === i.id ? (
                                <div style={{ flex: 1, display: "flex", gap: 6 }}>
                                  <Btn onClick={() => { onCancelRequest(i.id); setCancelRequestConfirm(null); }}
                                    bg="#dc2626" color="#fff" style={{ fontSize: 11 }}>Withdraw</Btn>
                                  <Btn onClick={() => setCancelRequestConfirm(null)}
                                    bg="rgba(255,255,255,0.07)" color={SILVER} style={{ border: `1px solid ${BORDER}` }}>Keep</Btn>
                                </div>
                              ) : (
                                <Btn onClick={() => setCancelRequestConfirm(i.id)}
                                  bg="rgba(248,113,113,0.08)" color="#f87171"
                                  style={{ border: "1px solid rgba(248,113,113,0.2)", flex: 1 }}>
                                  <XCircle size={13} /> Withdraw Request
                                </Btn>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* View Profile Modal */}
      <ViewProfileModal
        open={viewProfileOpen}
        userId={viewProfileUserId}
        prefill={viewProfilePrefill}
        role={viewProfileRole}
        onClose={() => setViewProfileOpen(false)}
      />

      {/* Safety Alert */}
      <SafetyAlert
        open={safetyOpen}
        passengerName={safetyTarget?.passengerName ?? "this co-traveler"}
        onConfirm={confirmAccept}
        onCancel={() => { setSafetyOpen(false); setSafetyTarget(null); }}
      />
    </>
  );
}
