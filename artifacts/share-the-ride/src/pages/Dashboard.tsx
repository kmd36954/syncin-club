import { Link, useLocation } from "wouter";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search, PlusCircle, ArrowRight,
  Briefcase, User as UserIcon,
  ShieldCheck, BadgeDollarSign, Crown,
  Clock, MapPin, CheckCircle, X,
  MessageCircle, Eye, Users, Scale, BookOpen,
  Send, Bell, Car,
  Ban, Navigation, AlertTriangle, Shield,
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { format } from "date-fns";
import HandshakeModal from "@/components/HandshakeModal";
import ViewProfileModal from "@/components/ViewProfileModal";
import JourneyFlowModal from "@/components/JourneyFlowModal";

/* ── Design tokens ──────────────────────────────────────────── */
const BG       = "#F3F4F6";  /* page background — Clean Light Grey       */
const CARD     = "#0F1A3A";  /* list-item cards — deep navy variant      */
const NAVY     = "#0B132B";  /* Host card / primary navy                 */
const SAPPHIRE = "#172554";  /* Request card / deep sapphire             */
const DARK     = "#1d2229";  /* text on beige bg (outside cards)         */
const SLATE    = "#44556a";  /* secondary text on beige bg               */
const CT       = "#FFFFFF";  /* card title text (white on navy)          */
const CS       = "rgba(255,255,255,0.68)"; /* card secondary text       */
const BLUE     = "#3A86FF";  /* electric blue                            */
const BORDER   = "rgba(255,255,255,0.10)"; /* border inside dark cards  */
const GOLD     = "#c8a84b";
const HERO_PRIMARY  = "https://images.unsplash.com/photo-1503376760367-1b61b2565443?q=80&w=1920&auto=format&fit=crop";
const HERO_FALLBACK = "https://images.unsplash.com/photo-1614200187524-dc4b892acf16?q=80&w=1920&auto=format&fit=crop";
const SERIF    = "'Playfair Display', Merriweather, Georgia, serif";

/* FIX 2 — safe display name: never show email, fall back to "Member" */
const dn = (name?: string | null): string => {
  if (!name || name.includes("@")) return "Member";
  return name.trim() || "Member";
};

function profileCompletion(u: any): number {
  const fields = [u?.firstName, u?.lastName, u?.mobileNumber, u?.jobTitle, u?.companyName];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

interface OpenRequest {
  id: number;
  passengerId: string;
  passengerName: string;
  passengerJobTitle?: string | null;
  passengerCompany?: string | null;
  passengerImage?: string | null;
  startLocation: string;
  destination: string;
  startLat?: number | null;
  startLng?: number | null;
  destLat?: number | null;
  destLng?: number | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  /* counter offer (host view) */
  counterOfferText?: string | null;
  counterOfferHostId?: string | null;
  counterOfferHostName?: string | null;
}

/* Passenger's own broadcast requests */
interface MyRequest extends OpenRequest {
  acceptedByHostName?: string | null;
  passengerWhatsappUrl?: string | null;
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const userAny = (user as any) ?? {};

  /* Smart hero image — tries photo-1503376760367 (requested), falls back if 404 */
  const [heroImg, setHeroImg] = useState(HERO_PRIMARY);
  useEffect(() => {
    const img = new Image();
    img.onerror = () => setHeroImg(HERO_FALLBACK);
    img.src = HERO_PRIMARY;
  }, []);

  const [coTravelers,    setCoTravelers]    = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  /* Open Requests (for verified hosts only) */
  const [openRequests,   setOpenRequests]   = useState<OpenRequest[]>([]);
  const [reqLoading,     setReqLoading]     = useState(false);
  const [processingReq,  setProcessingReq]  = useState<number | null>(null);
  const [dismissedReqs,  setDismissedReqs]  = useState<Set<number>>(new Set());

  /* Counter Offer inline form (host side) */
  const [counterOfferReqId,    setCounterOfferReqId]    = useState<number | null>(null);
  const [counterOfferText,     setCounterOfferText]     = useState("");
  const [submittingCounterOffer, setSubmittingCounterOffer] = useState(false);

  /* Host pending counter offers (awaiting passenger response) */
  const [hostPendingOffers,  setHostPendingOffers]  = useState<OpenRequest[]>([]);
  const [hostOfferLoading,   setHostOfferLoading]   = useState(false);

  /* Passenger's own broadcast requests (all statuses) */
  const [myRequests,  setMyRequests]  = useState<MyRequest[]>([]);
  const [myReqLoading, setMyReqLoading] = useState(false);

  /* Available rides from other hosts — the core of "Journey Offers" */
  const [availableRides,        setAvailableRides]        = useState<any[]>([]);
  const [availableRidesLoading, setAvailableRidesLoading] = useState(false);
  /* rideId → { interestId, status } for rides the user already expressed interest in */
  const [outgoingInterestMap,   setOutgoingInterestMap]   = useState<Map<number,{interestId:number;status:string}>>(new Map());
  const [expressingInterest,    setExpressingInterest]    = useState<number|null>(null);
  /* rideIds the user locally dismissed from Journey Offers */
  const [ignoredRideIds,        setIgnoredRideIds]        = useState<Set<number>>(new Set());
  /* interestId being cancelled */
  const [cancellingInterest,    setCancellingInterest]    = useState<number|null>(null);
  /* reqId being deleted by passenger */
  const [cancellingRequest,     setCancellingRequest]     = useState<number|null>(null);

  /* Section 3 — My Journey Offers: my rides + passenger interests on them */
  const [myRides,            setMyRides]            = useState<any[]>([]);
  const [incomingInterests,  setIncomingInterests]  = useState<any[]>([]);
  const [myRidesLoading,     setMyRidesLoading]     = useState(false);
  const [processingInterest, setProcessingInterest] = useState<number|null>(null);
  const [cancellingRide,     setCancellingRide]     = useState<number|null>(null);
  const [safetyPending,      setSafetyPending]      = useState<{ interestId: number; passengerName: string }|null>(null);

  /* Handshake modal */
  const [handshakeData,  setHandshakeData]  = useState<{ partnerName: string; whatsappUrl: string } | null>(null);

  /* View Profile modal */
  const [vpUserId, setVpUserId]   = useState<string | null>(null);
  const [vpPrefill, setVpPrefill] = useState<any>(null);
  const [vpOpen,    setVpOpen]    = useState(false);

  const isHost = Boolean(userAny?.vehicleRegNumber);

  /* Journey flow modal */
  const [flowMode,  setFlowMode]  = useState<"host" | "request" | null>(null);

  /* Smart handlers — skip modal when user already passed all gates */
  const handleHostClick = () => {
    const profileDone = Boolean(userAny?.profileComplete);
    const mobileDone  = Boolean(userAny?.mobileVerified);
    const carDone     = Boolean(userAny?.vehicleRegNumber);
    if (profileDone && mobileDone && carDone) { setLocation("/offer-ride"); return; }
    setFlowMode("host");
  };
  const handleRequestClick = () => {
    const profileDone = Boolean(userAny?.profileComplete);
    const mobileDone  = Boolean(userAny?.mobileVerified);
    if (profileDone && mobileDone) { setLocation("/find-rides"); return; }
    setFlowMode("request");
  };

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { setLocation("/"); return; }
    /* Auto-open modal if arriving with ?flow=host|request */
    const params = new URLSearchParams(window.location.search);
    const flow = params.get("flow");
    if (flow === "host" || flow === "request") {
      setFlowMode(flow);
      /* Clean up URL without triggering re-render */
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [isLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setHistoryLoading(true);
    fetch("/api/co-travelers", { credentials: "include" })
      .then(r => r.ok ? r.json() : { coTravelers: [] })
      .then(d => setCoTravelers(d.coTravelers || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [isAuthenticated]);

  /* ── Named fetch functions — called on mount AND after every action ── */

  const fetchOpenRequests = useCallback(() => {
    if (!isAuthenticated || !isHost) return;
    setReqLoading(true);
    fetch("/api/journey-requests", { credentials: "include" })
      .then(r => r.ok ? r.json() : { requests: [] })
      .then(d => setOpenRequests(d.requests || []))
      .catch(() => {})
      .finally(() => setReqLoading(false));
  }, [isAuthenticated, isHost]);

  const fetchHostCounterOffers = useCallback(() => {
    if (!isAuthenticated || !isHost) return;
    setHostOfferLoading(true);
    fetch("/api/journey-requests/my-counter-offers", { credentials: "include" })
      .then(r => r.ok ? r.json() : { requests: [] })
      .then(d => setHostPendingOffers(d.requests || []))
      .catch(() => {})
      .finally(() => setHostOfferLoading(false));
  }, [isAuthenticated, isHost]);

  const fetchMyRequests = useCallback(() => {
    if (!isAuthenticated) return;
    setMyReqLoading(true);
    fetch("/api/journey-requests/mine", { credentials: "include" })
      .then(r => r.ok ? r.json() : { requests: [] })
      .then(d => setMyRequests(d.requests || []))
      .catch(() => {})
      .finally(() => setMyReqLoading(false));
  }, [isAuthenticated]);

  /* Seed ignoredRideIds from DB on mount */
  const fetchIgnoredRides = useCallback(() => {
    if (!isAuthenticated) return;
    fetch("/api/rides/ignored", { credentials: "include" })
      .then(r => r.ok ? r.json() : { rideIds: [] })
      .then(d => setIgnoredRideIds(new Set<number>(d.rideIds || [])))
      .catch(() => {});
  }, [isAuthenticated]);

  const fetchAvailableRides = useCallback(() => {
    if (!isAuthenticated) return;
    setAvailableRidesLoading(true);
    Promise.all([
      fetch("/api/rides", { credentials: "include" }).then(r => r.ok ? r.json() : { rides: [] }),
      fetch("/api/interests/outgoing", { credentials: "include" }).then(r => r.ok ? r.json() : { interests: [] }),
    ]).then(([rideData, interestData]) => {
      const others = (rideData.rides || []).filter((r: any) => r.driverId !== userAny.id && r.status === "active");
      setAvailableRides(others);
      const map = new Map<number,{interestId:number;status:string}>();
      for (const i of (interestData.interests || [])) map.set(i.rideId, { interestId: i.id, status: i.status });
      setOutgoingInterestMap(map);
    }).catch(() => {}).finally(() => setAvailableRidesLoading(false));
  }, [isAuthenticated, userAny.id]);

  const fetchMyRides = useCallback(() => {
    if (!isAuthenticated) return;
    setMyRidesLoading(true);
    fetch("/api/interests/incoming", { credentials: "include" })
      .then(r => r.ok ? r.json() : { interests: [], myRides: [] })
      .then(d => { setMyRides(d.myRides || []); setIncomingInterests(d.interests || []); })
      .catch(() => {})
      .finally(() => setMyRidesLoading(false));
  }, [isAuthenticated]);

  /* Trigger each fetch on mount (and whenever auth/host status changes) */
  useEffect(() => { fetchOpenRequests(); },    [fetchOpenRequests]);
  useEffect(() => { fetchHostCounterOffers(); }, [fetchHostCounterOffers]);
  useEffect(() => { fetchMyRequests(); },       [fetchMyRequests]);
  useEffect(() => { fetchAvailableRides(); },   [fetchAvailableRides]);
  useEffect(() => { fetchMyRides(); },          [fetchMyRides]);
  useEffect(() => { fetchIgnoredRides(); },     [fetchIgnoredRides]);

  /* Express interest in a ride — POST /api/rides/:id/interest */
  const handleExpressInterest = async (rideId: number) => {
    setExpressingInterest(rideId);
    try {
      const res = await fetch(`/api/rides/${rideId}/interest`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.interestId) {
        setOutgoingInterestMap(prev => {
          const next = new Map(prev);
          next.set(rideId, { interestId: data.interestId, status: "pending" });
          return next;
        });
      }
    } catch { /* ignore */ } finally {
      setExpressingInterest(null);
    }
  };

  /* Open route on Google Maps */
  const openMap = (startLat?: number|null, startLng?: number|null, destLat?: number|null, destLng?: number|null, startLoc?: string, dest?: string) => {
    let url: string;
    if (startLat && startLng && destLat && destLng) {
      url = `https://www.google.com/maps/dir/${startLat},${startLng}/${destLat},${destLng}`;
    } else {
      url = `https://www.google.com/maps/dir/${encodeURIComponent(startLoc || "")}/${encodeURIComponent(dest || "")}`;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  /* Persist an ignore for an available ride to the DB */
  const handleIgnoreRide = async (rideId: number) => {
    setIgnoredRideIds(prev => new Set([...prev, rideId]));
    try {
      await fetch(`/api/rides/${rideId}/ignore`, { method: "POST", credentials: "include" });
      fetchAvailableRides();
    } catch { /* silent — local state already updated */ }
  };

  /* Withdraw (cancel) an outgoing interest — refetches rides from server */
  const handleCancelInterest = async (rideId: number, interestId: number) => {
    setCancellingInterest(interestId);
    setIgnoredRideIds(prev => new Set([...prev, rideId]));
    try {
      await fetch(`/api/interests/${interestId}`, { method: "DELETE", credentials: "include" });
      fetchAvailableRides();
    } catch { /* silent */ } finally { setCancellingInterest(null); }
  };

  /* Cancel (delete) a passenger's own broadcast request — refetches from server */
  const handleCancelMyRequest = async (reqId: number) => {
    setCancellingRequest(reqId);
    try {
      await fetch(`/api/journey-requests/${reqId}`, { method: "DELETE", credentials: "include" });
      fetchMyRequests();
    } catch { /* silent */ } finally { setCancellingRequest(null); }
  };

  const handleAcceptRequest = async (req: OpenRequest) => {
    setProcessingReq(req.id);
    try {
      const res = await fetch(`/api/journey-requests/${req.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      });
      const data = await res.json();
      if (data.whatsappUrl) {
        setHandshakeData({ partnerName: data.partnerName ?? req.passengerName, whatsappUrl: data.whatsappUrl });
      }
      fetchOpenRequests();
    } catch { /* silent */ } finally { setProcessingReq(null); }
  };

  const handleIgnoreRequest = async (id: number) => {
    setDismissedReqs(prev => new Set([...prev, id]));
    try {
      await fetch(`/api/journey-requests/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ignored" }),
      });
      fetchOpenRequests();
    } catch { /* silent */ }
  };

  /* Host submits a counter offer for a passenger request */
  const handleCounterOfferSubmit = async (reqId: number) => {
    if (!counterOfferText.trim()) return;
    setSubmittingCounterOffer(true);
    try {
      const res = await fetch(`/api/journey-requests/${reqId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "counter_offered", counterOfferText }),
      });
      if (res.ok) {
        setCounterOfferReqId(null);
        setCounterOfferText("");
        fetchOpenRequests();
        fetchHostCounterOffers();
      }
    } catch { /* silent */ } finally { setSubmittingCounterOffer(false); }
  };

  /* Passenger accepts or declines a counter offer */
  const handlePassengerCounterResponse = async (reqId: number, accept: boolean) => {
    setProcessingReq(reqId);
    try {
      const res = await fetch(`/api/journey-requests/${reqId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: accept ? "counter_accepted" : "counter_declined" }),
      });
      const data = await res.json();
      if (accept && data.whatsappUrl) {
        setHandshakeData({ partnerName: data.partnerName ?? "Your Host", whatsappUrl: data.whatsappUrl });
      }
      fetchMyRequests();
    } catch { /* silent */ } finally { setProcessingReq(null); }
  };

  /* Section 3 — trigger safety modal before accepting an incoming interest */
  const handleAcceptInterest = (interestId: number, passengerName: string) => {
    setSafetyPending({ interestId, passengerName });
  };

  /* Section 3 — confirmed acceptance after safety alert */
  const confirmAcceptInterest = async () => {
    if (!safetyPending) return;
    const { interestId, passengerName } = safetyPending;
    setSafetyPending(null);
    setProcessingInterest(interestId);
    try {
      const res = await fetch(`/api/interests/${interestId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "connected" }),
      });
      const data = await res.json();
      if (data.whatsappUrl) {
        setHandshakeData({ partnerName: data.partnerName ?? passengerName, whatsappUrl: data.whatsappUrl });
      }
      fetchMyRides();
    } catch { /* silent */ } finally { setProcessingInterest(null); }
  };

  /* Section 3 — dismiss/ignore a passenger interest */
  const handleIgnoreInterest = async (interestId: number) => {
    try {
      await fetch(`/api/interests/${interestId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      fetchMyRides();
    } catch { /* silent */ }
  };

  /* Section 3 — cancel (delete) one of my own rides */
  const handleCancelMyRide = async (rideId: number) => {
    setCancellingRide(rideId);
    try {
      await fetch(`/api/rides/${rideId}`, { method: "DELETE", credentials: "include" });
      fetchMyRides();
    } catch { /* silent */ } finally { setCancellingRide(null); }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div style={{ width:40, height:40, borderRadius:"50%", border:`3px solid ${BLUE}`, borderTopColor:"transparent" }} className="animate-spin" />
      </div>
    );
  }

  /* ── Member status gating ─────────────────────────────────── */
  const memberStatus = userAny?.memberStatus ?? "approved";

  if (memberStatus === "rejected") {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: BG, minHeight: "100vh" }}>
        <div style={{ maxWidth: 440, margin: "0 auto", padding: "0 24px", textAlign: "center" as const }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(220,38,38,0.10)", border: "2px solid rgba(220,38,38,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <span style={{ fontSize: 30 }}>⛔</span>
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 800, color: "#0B132B", marginBottom: 10 }}>Access Revoked</h2>
          <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, marginBottom: 20 }}>
            Your membership application was not approved. If you believe this is an error, please contact the Synicin Club team.
          </p>
          <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.18)", borderRadius: 14, padding: "14px 18px", fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
            Status: Application Rejected
          </div>
        </div>
      </div>
    );
  }

  if (memberStatus === "pending") {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: BG, minHeight: "100vh" }}>
        <div style={{ maxWidth: 440, margin: "0 auto", padding: "0 24px", textAlign: "center" as const }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(251,191,36,0.10)", border: "2px solid rgba(251,191,36,0.30)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <span style={{ fontSize: 30 }}>⏳</span>
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 800, color: "#0B132B", marginBottom: 10 }}>Verification Pending</h2>
          <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, marginBottom: 20 }}>
            Your membership application is under review. Synicin Club reviews applications carefully — you will be notified once approved.
          </p>
          <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.28)", borderRadius: 14, padding: "14px 18px", fontSize: 13, color: "#d97706", fontWeight: 600 }}>
            Status: Application Under Review
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 14, fontStyle: "italic" }}>
            "Synicin Club operates as a selective network. Applications are reviewed carefully."
          </p>
        </div>
      </div>
    );
  }

  const displayName = [userAny.firstName, userAny.lastName].filter(Boolean).join(" ") || userAny.username || "Member";

  /* Fix 4: exclude current user's own requests; Fix 3: expose activeOffers */
  const visibleRequests = openRequests.filter(r => !dismissedReqs.has(r.id) && r.passengerId !== userAny.id);
  const activeOffers    = availableRides.filter((r: any) => r.status === "active" && !ignoredRideIds.has(r.id));

  /* IDs of everyone the user has already travelled with — for badge detection */
  const coTravelerIds = new Set(coTravelers.map((ct: any) => ct.id as string));

  /* Reusable "Travelled Together" badge */
  const TravelledBadge = () => (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:800, padding:"2px 9px", borderRadius:999, background:"rgba(34,197,94,0.15)", color:"#4ade80", border:"1px solid rgba(34,197,94,0.30)", flexShrink:0, whiteSpace:"nowrap" as const }}>
      ✓ Travelled together
    </span>
  );

  return (
    <div className="flex-1 w-full pb-16" style={{ background: BG }}>

      {/* ══════════════════════════════════════════════════════════
          LUXURY HERO BANNER — Full-width, luxury car image
      ══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.6 }}
        style={{
          position:"relative", width:"100%", overflow:"hidden",
          height: 260, flexShrink: 0,
        }}
      >
        {/* Hero image — separate background properties so image always renders */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:`linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${heroImg}')`,
          backgroundSize:"cover",
          backgroundPosition:"center",
        }} />

        {/* Welcome content over the hero */}
        <div style={{
          position:"relative", zIndex:1, height:"100%",
          display:"flex", flexDirection:"column", justifyContent:"center",
          maxWidth:960, margin:"0 auto", padding:"0 24px",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            {/* Profile avatar */}
            {user?.profileImage ? (
              <img src={user.profileImage} alt="Profile"
                style={{ width:72, height:72, borderRadius:"50%", objectFit:"cover", flexShrink:0, border:"3px solid rgba(212,175,55,0.6)", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }} />
            ) : (
              <div style={{ width:72, height:72, borderRadius:"50%", flexShrink:0, border:"3px solid rgba(212,175,55,0.5)", background:"rgba(58,134,255,0.20)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
                <UserIcon size={30} color="rgba(255,255,255,0.9)" />
              </div>
            )}

            <div>
              {/* Verified badge row */}
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:999, background:"rgba(212,175,55,0.18)", color: GOLD, border:"1px solid rgba(212,175,55,0.35)", letterSpacing:"0.08em", textTransform:"uppercase" }}>
                  ✔ Verified Member
                </span>
                {userAny?.createdAt && (
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.40)", fontWeight:500 }}>
                    Since {new Date(userAny.createdAt).toLocaleDateString("en-PK", { month:"short", year:"numeric" })}
                  </span>
                )}
              </div>
              <h1 style={{ fontSize:"1.75rem", fontWeight:800, color:"#FFFFFF", lineHeight:1.15, margin:0, textShadow:"0 2px 12px rgba(0,0,0,0.4)" }}>
                Welcome, {user?.firstName || user?.username}
              </h1>
              {(userAny?.jobTitle || userAny?.companyName) && (
                <p style={{ marginTop:6, display:"flex", alignItems:"center", gap:7, fontSize:13, color:"rgba(255,255,255,0.70)" }}>
                  <Briefcase size={13} color="#D4AF37" />
                  {[userAny.jobTitle, userAny.companyName].filter(Boolean).join(" · ")}
                </p>
              )}
              {userAny?.linkedinUrl && (
                <a href={userAny.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  style={{ marginTop:6, display:"inline-flex", alignItems:"center", gap:5, fontSize:12, color:"#6ab4f5", textDecoration:"none", fontWeight:600 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                  View LinkedIn Profile
                </a>
              )}
            </div>
          </div>
        </div>

      </motion.div>

      {/* ── Content container ────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">


        {/* ── Section label ──────────────────────────────────────── */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
          <div style={{ width:3, height:16, borderRadius:999, background: BLUE }} />
          <span style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.12em", color: SLATE }}>Your Commute</span>
        </div>

        {/* ══════════════════════════════════════════════════════════
            ACTION CARDS — Two states:
            A) Fully onboarded (profileComplete + vehicleRegNumber) → direct nav, no modal
            B) Not yet onboarded → "Get Started" opens JourneyFlowModal
        ══════════════════════════════════════════════════════════ */}
        {(() => {
          /* isOnboarded: true when profile + car are done (DB) OR emergency auth_success flag set */
          let authOverride = false;
          try { authOverride = localStorage.getItem("auth_success") === "true"; } catch { /* ok */ }
          const isOnboarded = (Boolean(userAny?.profileComplete) && Boolean(userAny?.vehicleRegNumber)) || authOverride;

          return (
            <div className="w-full max-w-[90%] md:max-w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* ── HOST A JOURNEY card ── */}
              <motion.div
                initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05 }}
                className="group relative overflow-hidden"
                style={{ background: NAVY, borderRadius:20, padding:28, boxShadow:"0 8px 32px rgba(0,0,0,0.28)", border:"1px solid rgba(255,255,255,0.08)", minHeight:260 }}
              >
                <div style={{ position:"absolute", top:0, right:0, padding:20, opacity:0.06 }} className="group-hover:opacity-[0.10] transition-opacity duration-300">
                  <PlusCircle size={120} color="#FFFFFF" />
                </div>
                <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", height:"100%" }}>
                  <div style={{ width:52, height:52, borderRadius:14, background:"rgba(255,255,255,0.10)", border:"1.5px solid rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
                    <PlusCircle size={24} color="#FFFFFF" />
                  </div>
                  <h3 style={{ fontSize:22, fontWeight:800, color: CT, marginBottom:8, lineHeight:1.2 }}>Host a Journey</h3>
                  <p style={{ fontSize:13, color: CS, lineHeight:1.6, marginBottom:24, flex:1 }}>
                    Share your daily route, split fuel costs, and connect with verified professionals heading your way.
                  </p>
                  {isOnboarded ? (
                    <button
                      onClick={() => setLocation("/offer-ride")}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"13px 24px", borderRadius:14, fontSize:14, fontWeight:800, background:"#FFFFFF", color: NAVY, border:"none", cursor:"pointer", width:"fit-content", boxShadow:"0 4px 20px rgba(0,0,0,0.20)", letterSpacing:"0.01em" }}
                      className="group-hover:gap-3 transition-all">
                      Host a Journey <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setFlowMode("host")}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"13px 24px", borderRadius:14, fontSize:14, fontWeight:800, background:"#FFFFFF", color: NAVY, border:"none", cursor:"pointer", width:"fit-content", boxShadow:"0 4px 20px rgba(0,0,0,0.20)", letterSpacing:"0.01em" }}
                      className="group-hover:gap-3 transition-all">
                      {profileCompletion(userAny) === 100 ? "Host Now" : "Get Started"} <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </motion.div>

              {/* ── REQUEST A JOURNEY card ── */}
              <motion.div
                initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.10 }}
                className="group relative overflow-hidden"
                style={{ background: SAPPHIRE, borderRadius:20, padding:28, boxShadow:"0 8px 32px rgba(0,0,0,0.28)", border:"1px solid rgba(255,255,255,0.08)", minHeight:260 }}
              >
                <div style={{ position:"absolute", top:0, right:0, padding:20, opacity:0.06 }} className="group-hover:opacity-[0.10] transition-opacity duration-300">
                  <Search size={120} color="#FFFFFF" />
                </div>
                <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", height:"100%" }}>
                  <div style={{ width:52, height:52, borderRadius:14, background:"rgba(255,255,255,0.10)", border:"1.5px solid rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
                    <Search size={24} color="#FFFFFF" />
                  </div>
                  <h3 style={{ fontSize:22, fontWeight:800, color: CT, marginBottom:8, lineHeight:1.2 }}>Request a Journey</h3>
                  <p style={{ fontSize:13, color: CS, lineHeight:1.6, marginBottom:24, flex:1 }}>
                    Broadcast your route — verified hosts heading your way will connect with you directly.
                  </p>
                  {isOnboarded ? (
                    <button
                      onClick={() => setLocation("/find-rides")}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"13px 24px", borderRadius:14, fontSize:14, fontWeight:800, background: BLUE, color:"#fff", border:"none", cursor:"pointer", width:"fit-content", boxShadow:`0 4px 20px rgba(58,134,255,0.40)`, letterSpacing:"0.01em" }}
                      className="group-hover:gap-3 transition-all">
                      Request a Journey <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setFlowMode("request")}
                      style={{ display:"flex", alignItems:"center", gap:8, padding:"13px 24px", borderRadius:14, fontSize:14, fontWeight:800, background: BLUE, color:"#fff", border:"none", cursor:"pointer", width:"fit-content", boxShadow:`0 4px 20px rgba(58,134,255,0.40)`, letterSpacing:"0.01em" }}
                      className="group-hover:gap-3 transition-all">
                      Request a Journey <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </motion.div>

            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════════════════
            SECTION 1 — JOURNEY OFFERS BY OTHERS
        ══════════════════════════════════════════════════════════ */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.13 }} style={{ marginTop:56 }}>
          <div style={{ marginBottom:20 }}>
            <span style={{ fontSize:20, fontWeight:700, color:"#1E3A5F" }}>Journey Offers</span>
            <div style={{ height:1, background:"rgba(255,255,255,0.12)", marginTop:12 }} />
          </div>
          {availableRidesLoading ? (
            <div style={{ display:"flex", justifyContent:"center", padding:"24px 0" }}>
              <div style={{ width:24, height:24, borderRadius:"50%", border:`2px solid ${BLUE}`, borderTopColor:"transparent" }} className="animate-spin" />
            </div>
          ) : activeOffers.length === 0 ? (
            <div style={{ borderRadius:14, border:"1.5px dashed rgba(58,134,255,0.22)", background:"rgba(58,134,255,0.04)", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" as const, padding:"28px 20px" }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(58,134,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                <Search size={20} color={BLUE} style={{ opacity:0.5 }} />
              </div>
              <p style={{ fontWeight:700, color: DARK, fontSize:13, margin:0, marginBottom:4 }}>No available rides right now</p>
              <p style={{ fontSize:12, color: SLATE, lineHeight:1.5, maxWidth:260, margin:0 }}>When verified hosts post journeys, they'll appear here.</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {activeOffers.map((ride: any, idx: number) => {
                const interest = outgoingInterestMap.get(ride.id);
                const alreadySent = interest?.status === "pending";
                const isConnected = interest?.status === "connected";
                const isExpressing = expressingInterest === ride.id;
                return (
                  <motion.div key={ride.id}
                    initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.04*idx }}
                    style={{ borderRadius:16, padding:"16px 18px", boxShadow:"0 4px 20px rgba(0,0,0,0.22)", background: isConnected ? "linear-gradient(135deg,#0a1e0f,#091a0d)" : CARD, border: isConnected ? "1px solid rgba(74,222,128,0.35)" : alreadySent ? "1px solid rgba(58,134,255,0.35)" : "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
                      {ride.driverImage ? (
                        <img src={ride.driverImage} alt={ride.driverName} style={{ width:46, height:46, borderRadius:"50%", objectFit:"cover", flexShrink:0, border:"2px solid rgba(58,134,255,0.3)" }} />
                      ) : (
                        <div style={{ width:46, height:46, borderRadius:"50%", background:"rgba(58,134,255,0.12)", border:"1.5px solid rgba(58,134,255,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <UserIcon size={20} color={BLUE} />
                        </div>
                      )}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" as const, marginBottom:2 }}>
                          <p style={{ fontWeight:800, fontSize:14, color: CT, margin:0 }}>{ride.driverName}</p>
                          {coTravelerIds.has(ride.driverId) && <TravelledBadge />}
                        </div>
                        {(ride.driverJobTitle || ride.driverCompany) && (
                          <p style={{ fontSize:12, color: CS, margin:"3px 0 0", display:"flex", alignItems:"center", gap:5 }}>
                            <Briefcase size={11} color="#93c5fd" />
                            {[ride.driverJobTitle, ride.driverCompany].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        <p style={{ fontSize:12, color: CS, margin:"4px 0 0", display:"flex", alignItems:"center", gap:5 }}>
                          <MapPin size={11} color="#93c5fd" />
                          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ride.startLocation} → {ride.destination}</span>
                        </p>
                        <p style={{ fontSize:11, color:"rgba(255,255,255,0.40)", margin:"4px 0 0", display:"flex", alignItems:"center", gap:5 }}>
                          <Clock size={10} />
                          {(() => { try { return format(new Date(ride.departureTime), "dd MMM yyyy · h:mm a"); } catch { return ride.departureTime; } })()}
                          {ride.seatsAvailable > 0 && <span style={{ marginLeft:6, color:"rgba(74,222,128,0.8)", fontWeight:700 }}>· {ride.seatsAvailable} seat{ride.seatsAvailable > 1 ? "s" : ""} free</span>}
                        </p>
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => { setVpUserId(ride.driverId); setVpPrefill({ name: ride.driverName, jobTitle: ride.driverJobTitle, company: ride.driverCompany }); setVpOpen(true); }} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"8px 0", borderRadius:10, background:"rgba(255,255,255,0.09)", border:"1px solid rgba(255,255,255,0.14)", color:"rgba(255,255,255,0.80)", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                          <Eye size={12} /> Profile
                        </button>
                        <button onClick={() => openMap(ride.startLat, ride.startLng, ride.destLat, ride.destLng, ride.startLocation, ride.destination)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"8px 0", borderRadius:10, background:"rgba(255,255,255,0.09)", border:"1px solid rgba(255,255,255,0.14)", color:"rgba(255,255,255,0.80)", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                          <Navigation size={12} /> View Map
                        </button>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        {isConnected ? (
                          <div style={{ flex:2, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px 0", borderRadius:10, background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.35)", color:"#4ade80", fontSize:11, fontWeight:800 }}><CheckCircle size={12} /> Connected ✓</div>
                        ) : alreadySent ? (
                          <div style={{ flex:2, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px 0", borderRadius:10, background:"rgba(58,134,255,0.12)", border:"1px solid rgba(58,134,255,0.30)", color:"#93c5fd", fontSize:11, fontWeight:800 }}><CheckCircle size={12} /> Interest Sent</div>
                        ) : (
                          <button onClick={() => handleExpressInterest(ride.id)} disabled={isExpressing} style={{ flex:2, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px 0", borderRadius:10, background: BLUE, border:"none", color:"#fff", fontSize:11, fontWeight:800, cursor:"pointer", boxShadow:"0 3px 14px rgba(58,134,255,0.30)", opacity: isExpressing ? 0.65 : 1 }}>
                            {isExpressing ? <div style={{ width:11, height:11, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff" }} className="animate-spin" /> : <><CheckCircle size={12} /> Accept</>}
                          </button>
                        )}
                        <button onClick={() => handleIgnoreRide(ride.id)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px 0", borderRadius:10, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.60)", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                          <Ban size={12} /> Ignore
                        </button>
                        {interest ? (
                          <button onClick={() => handleCancelInterest(ride.id, interest.interestId)} disabled={cancellingInterest === interest.interestId} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px 0", borderRadius:10, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.60)", fontSize:11, fontWeight:700, cursor:"pointer", opacity: cancellingInterest === interest.interestId ? 0.65 : 1 }}>
                            {cancellingInterest === interest.interestId ? <div style={{ width:11, height:11, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.2)", borderTopColor:"rgba(255,255,255,0.7)" }} className="animate-spin" /> : "Cancel"}
                          </button>
                        ) : (
                          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"9px 0", borderRadius:10, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.20)", fontSize:11, fontWeight:700 }}>Cancel</div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ══════════════════════════════════════════════════════════
            SECTION 2 — JOURNEY REQUESTS BY OTHERS
        ══════════════════════════════════════════════════════════ */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.14 }} style={{ marginTop:56 }}>
          <div style={{ marginBottom:20 }}>
            <span style={{ fontSize:20, fontWeight:700, color:"#1E3A5F" }}>Journey Requests</span>
            <div style={{ height:1, background:"rgba(255,255,255,0.12)", marginTop:12 }} />
          </div>
          {reqLoading ? (
            <div style={{ display:"flex", justifyContent:"center", padding:"32px 0" }}>
              <div style={{ width:28, height:28, borderRadius:"50%", border:`2px solid ${BLUE}`, borderTopColor:"transparent" }} className="animate-spin" />
            </div>
          ) : visibleRequests.length === 0 ? (
            <div style={{ borderRadius:16, border:"1.5px dashed rgba(200,168,75,0.30)", background:"rgba(200,168,75,0.04)", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" as const, padding:"32px 24px" }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(200,168,75,0.08)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                <Users size={22} color={GOLD} style={{ opacity:0.5 }} />
              </div>
              <p style={{ fontWeight:700, color: SLATE, fontSize:13, margin:0, marginBottom:4 }}>No open requests yet</p>
              <p style={{ fontSize:12, color:"rgba(100,116,139,0.65)", lineHeight:1.5, maxWidth:260, margin:0 }}>When passengers post journey requests, they'll appear here.</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {visibleRequests.map((req, idx) => (
                <motion.div key={req.id}
                  initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.05*idx }}
                  style={{ borderRadius:16, border:"1px solid rgba(200,168,75,0.22)", background: CARD, padding:"16px 18px", boxShadow:"0 4px 20px rgba(0,0,0,0.22)" }}
                >
                  <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
                    {req.passengerImage ? (
                      <img src={req.passengerImage} alt={req.passengerName} style={{ width:46, height:46, borderRadius:"50%", objectFit:"cover", flexShrink:0, border:"2px solid rgba(200,168,75,0.3)" }} />
                    ) : (
                      <div style={{ width:46, height:46, borderRadius:"50%", background:"rgba(200,168,75,0.12)", border:"1.5px solid rgba(200,168,75,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <UserIcon size={20} color={GOLD} />
                      </div>
                    )}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" as const, marginBottom:2 }}>
                        <p style={{ fontWeight:800, fontSize:14, color: CT, margin:0 }}>{req.passengerName}</p>
                        {coTravelerIds.has(req.passengerId) && <TravelledBadge />}
                      </div>
                      {(req.passengerJobTitle || req.passengerCompany) && (
                        <p style={{ fontSize:12, color: CS, margin:"3px 0 0", display:"flex", alignItems:"center", gap:5 }}>
                          <Briefcase size={11} color="#93c5fd" />
                          {[req.passengerJobTitle, req.passengerCompany].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <p style={{ fontSize:12, color: CS, margin:"4px 0 0", display:"flex", alignItems:"center", gap:5 }}>
                        <MapPin size={11} color="#93c5fd" />
                        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{req.startLocation} → {req.destination}</span>
                      </p>
                      {req.notes && <p style={{ fontSize:11, color:"rgba(255,255,255,0.45)", margin:"4px 0 0", fontStyle:"italic" }}>"{req.notes}"</p>}
                    </div>
                  </div>
                  {counterOfferReqId === req.id && (
                    <div style={{ marginBottom:10 }}>
                      <textarea value={counterOfferText} onChange={e => setCounterOfferText(e.target.value)} placeholder="Describe your proposed journey: timing, pickup point, etc." rows={3} style={{ width:"100%", padding:"10px 12px", borderRadius:10, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(200,168,75,0.35)", color:"#fff", fontSize:12, resize:"none", outline:"none", fontFamily:"inherit", boxSizing:"border-box" as const }} />
                      <div style={{ display:"flex", gap:6, marginTop:6 }}>
                        <button onClick={() => handleCounterOfferSubmit(req.id)} disabled={submittingCounterOffer || !counterOfferText.trim()} style={{ flex:2, padding:"9px 0", borderRadius:10, background: GOLD, border:"none", color:"#0B132B", fontSize:12, fontWeight:800, cursor:"pointer", opacity: submittingCounterOffer || !counterOfferText.trim() ? 0.6 : 1 }}>
                          {submittingCounterOffer ? "Sending…" : "Send Proposal"}
                        </button>
                        <button onClick={() => { setCounterOfferReqId(null); setCounterOfferText(""); }} style={{ flex:1, padding:"9px 0", borderRadius:10, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.60)", fontSize:12, fontWeight:700, cursor:"pointer" }}>Dismiss</button>
                      </div>
                    </div>
                  )}
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => { setVpUserId(req.passengerId); setVpPrefill({ name: req.passengerName, jobTitle: req.passengerJobTitle, company: req.passengerCompany }); setVpOpen(true); }} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"8px 0", borderRadius:10, background:"rgba(255,255,255,0.09)", border:"1px solid rgba(255,255,255,0.14)", color:"rgba(255,255,255,0.80)", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                        <Eye size={12} /> Profile
                      </button>
                      <button onClick={() => openMap(req.startLat, req.startLng, req.destLat, req.destLng, req.startLocation, req.destination)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"8px 0", borderRadius:10, background:"rgba(255,255,255,0.09)", border:"1px solid rgba(255,255,255,0.14)", color:"rgba(255,255,255,0.80)", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                        <Navigation size={12} /> View Map
                      </button>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => isHost ? handleAcceptRequest(req) : setCounterOfferReqId(req.id)} disabled={processingReq === req.id} style={{ flex:2, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px 0", borderRadius:10, background:"rgba(34,197,94,0.18)", border:"1.5px solid rgba(34,197,94,0.4)", color:"#4ade80", fontSize:11, fontWeight:800, cursor:"pointer", opacity: processingReq === req.id ? 0.6 : 1 }}>
                        {processingReq === req.id ? <div style={{ width:11, height:11, borderRadius:"50%", border:"2px solid rgba(74,222,128,0.3)", borderTopColor:"#4ade80" }} className="animate-spin" /> : <><CheckCircle size={12} /> Accept</>}
                      </button>
                      <button onClick={() => handleIgnoreRequest(req.id)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px 0", borderRadius:10, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.60)", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                        <Ban size={12} /> Ignore
                      </button>
                      <button onClick={() => handleIgnoreRequest(req.id)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px 0", borderRadius:10, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.60)", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {hostPendingOffers.length > 0 && (
            <div style={{ marginTop:24 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}>
                <div style={{ flex:1, height:"1px", background:"rgba(200,168,75,0.15)" }} />
                <span style={{ fontSize:9, fontWeight:800, textTransform:"uppercase" as const, letterSpacing:"0.12em", color:"rgba(200,168,75,0.55)" }}>Counter Offers Sent — Awaiting Response</span>
                <div style={{ flex:1, height:"1px", background:"rgba(200,168,75,0.15)" }} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {hostPendingOffers.map((r, idx) => (
                  <motion.div key={r.id} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.05*idx }} style={{ borderRadius:14, border:"1px solid rgba(200,168,75,0.25)", background: CARD, padding:"14px 16px", boxShadow:"0 4px 20px rgba(0,0,0,0.18)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                      {r.passengerImage ? (
                        <img src={r.passengerImage} alt={r.passengerName} style={{ width:38, height:38, borderRadius:"50%", objectFit:"cover", flexShrink:0, border:"1.5px solid rgba(200,168,75,0.3)" }} />
                      ) : (
                        <div style={{ width:38, height:38, borderRadius:"50%", background:"rgba(200,168,75,0.10)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <UserIcon size={16} color={GOLD} />
                        </div>
                      )}
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontWeight:800, fontSize:13, color: CT, margin:0 }}>{r.passengerName}</p>
                        <p style={{ fontSize:11, color: CS, margin:"2px 0 0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.startLocation} → {r.destination}</p>
                      </div>
                      <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:999, background:"rgba(200,168,75,0.15)", color: GOLD, flexShrink:0 }}>Pending</span>
                    </div>
                    <div style={{ background:"rgba(200,168,75,0.07)", border:"1px solid rgba(200,168,75,0.20)", borderRadius:10, padding:"9px 12px" }}>
                      <p style={{ fontSize:10, fontWeight:700, color:"rgba(200,168,75,0.6)", margin:"0 0 4px", letterSpacing:"0.08em" }}>YOUR COUNTER PROPOSAL</p>
                      <p style={{ fontSize:12, color:"rgba(255,255,255,0.80)", margin:0, lineHeight:1.5 }}>"{r.counterOfferText}"</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* ══════════════════════════════════════════════════════════
            SECTION 3 — MY ACTIVE JOURNEY
        ══════════════════════════════════════════════════════════ */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }} style={{ marginTop:56 }}>
          <div style={{ marginBottom:20 }}>
            <span style={{ fontSize:20, fontWeight:700, color:"#1E3A5F" }}>My Active Journey</span>
            <div style={{ height:1, background:"rgba(255,255,255,0.12)", marginTop:12 }} />
          </div>
          {(() => {
            const activeRide = myRides.filter((r: any) => r.status === "active")[0] ?? null;
            const activeRequest = myRequests.filter(r => !["ignored"].includes(r.status))[0] ?? null;
            const isLoading = myRidesLoading || myReqLoading;
            if (isLoading) {
              return (
                <div style={{ display:"flex", justifyContent:"center", padding:"32px 0" }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", border:`2px solid ${BLUE}`, borderTopColor:"transparent" }} className="animate-spin" />
                </div>
              );
            }
            if (!activeRide && !activeRequest) {
              return (
                <div style={{ borderRadius:16, border:"1.5px dashed rgba(255,255,255,0.12)", background:"rgba(255,255,255,0.03)", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center" as const, padding:"32px 24px" }}>
                  <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(58,134,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                    <Car size={22} color={BLUE} style={{ opacity:0.4 }} />
                  </div>
                  <p style={{ fontWeight:600, color:"rgba(255,255,255,0.55)", fontSize:13, margin:0 }}>No active journey yet. Host or request a journey above.</p>
                </div>
              );
            }
            if (activeRide) {
              const ride = activeRide;
              const rideInterests = incomingInterests.filter((i: any) => i.rideId === ride.id);
              const pendingCount = rideInterests.filter((i: any) => i.status === "pending").length;
              return (
                <motion.div key={ride.id} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} style={{ borderRadius:16, border:"1px solid rgba(167,139,250,0.22)", background: CARD, padding:"16px 18px", boxShadow:"0 4px 20px rgba(0,0,0,0.22)" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom:12 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, color: CT, margin:0, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
                        <MapPin size={12} color="#a78bfa" />
                        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ride.startLocation} → {ride.destination}</span>
                      </p>
                      <p style={{ fontSize:11, color:"rgba(255,255,255,0.40)", margin:"4px 0 0", display:"flex", alignItems:"center", gap:5 }}>
                        <Clock size={10} />
                        {(() => { try { return format(new Date(ride.departureTime), "dd MMM yyyy · h:mm a"); } catch { return ride.departureTime; } })()}
                        {ride.seatsAvailable > 0 && <span style={{ color:"rgba(74,222,128,0.8)", fontWeight:700 }}> · {ride.seatsAvailable} seat{ride.seatsAvailable > 1 ? "s" : ""} free</span>}
                      </p>
                    </div>
                    <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
                      {pendingCount > 0 && (
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:800, padding:"3px 9px", borderRadius:999, background:"rgba(167,139,250,0.15)", color:"#a78bfa", border:"1px solid rgba(167,139,250,0.30)" }}>
                          <span style={{ position:"relative", display:"inline-flex", width:6, height:6 }}>
                            <span className="animate-ping" style={{ position:"absolute", inset:0, borderRadius:"50%", background:"#a78bfa", opacity:0.75 }} />
                            <span style={{ position:"relative", width:6, height:6, borderRadius:"50%", background:"#7c3aed", display:"inline-flex" }} />
                          </span>
                          {pendingCount} interested
                        </span>
                      )}
                      <button onClick={() => handleCancelMyRide(ride.id)} disabled={cancellingRide === ride.id} style={{ padding:"4px 12px", borderRadius:8, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.10)", color:"rgba(255,255,255,0.45)", fontSize:10, fontWeight:700, cursor:"pointer", opacity: cancellingRide === ride.id ? 0.5 : 1 }}>
                        {cancellingRide === ride.id ? "Cancelling…" : "Cancel Ride"}
                      </button>
                    </div>
                  </div>
                  {rideInterests.length === 0 ? (
                    <div style={{ padding:"12px 14px", borderRadius:12, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", textAlign:"center" as const }}>
                      <p style={{ fontSize:12, color:"rgba(255,255,255,0.30)", margin:0 }}>No interest expressed yet — your ride is live.</p>
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                      {rideInterests.map((interest: any) => {
                        const isProc = processingInterest === interest.id;
                        const isConn = interest.status === "connected";
                        return (
                          <div key={interest.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:12, background: isConn ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.04)", border: isConn ? "1px solid rgba(74,222,128,0.22)" : "1px solid rgba(255,255,255,0.07)" }}>
                            {interest.passengerImage ? (
                              <img src={interest.passengerImage} alt={interest.passengerName} style={{ width:36, height:36, borderRadius:"50%", objectFit:"cover", flexShrink:0, border:"1.5px solid rgba(167,139,250,0.3)" }} />
                            ) : (
                              <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(167,139,250,0.10)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                <UserIcon size={16} color="#a78bfa" />
                              </div>
                            )}
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <p style={{ fontWeight:700, fontSize:13, color: CT, margin:0 }}>{interest.passengerName}</p>
                                {coTravelerIds.has(interest.passengerId) && <TravelledBadge />}
                              </div>
                              {(interest.passengerJobTitle || interest.passengerCompany) && (
                                <p style={{ fontSize:11, color: CS, margin:"2px 0 0", display:"flex", alignItems:"center", gap:4 }}>
                                  <Briefcase size={10} color="#93c5fd" />
                                  {[interest.passengerJobTitle, interest.passengerCompany].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>
                            <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                              <button onClick={() => { setVpUserId(interest.passengerId); setVpPrefill({ name: interest.passengerName, jobTitle: interest.passengerJobTitle, company: interest.passengerCompany }); setVpOpen(true); }} style={{ padding:"5px 10px", borderRadius:8, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.70)", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center" }}>
                                <Eye size={11} />
                              </button>
                              {isConn ? (
                                <div style={{ padding:"5px 12px", borderRadius:8, background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.25)", color:"#4ade80", fontSize:10, fontWeight:800 }}>✓ Connected</div>
                              ) : (
                                <>
                                  <button onClick={() => handleAcceptInterest(interest.id, interest.passengerName)} disabled={isProc} style={{ padding:"5px 12px", borderRadius:8, background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.35)", color:"#4ade80", fontSize:10, fontWeight:800, cursor:"pointer", opacity: isProc ? 0.6 : 1 }}>
                                    {isProc ? <div style={{ width:9, height:9, borderRadius:"50%", border:"2px solid rgba(74,222,128,0.3)", borderTopColor:"#4ade80" }} className="animate-spin" /> : "Accept"}
                                  </button>
                                  <button onClick={() => handleIgnoreInterest(interest.id)} style={{ padding:"5px 10px", borderRadius:8, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.10)", color:"rgba(255,255,255,0.50)", fontSize:10, fontWeight:700, cursor:"pointer" }}>Ignore</button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            }
            const r = activeRequest!;
            const isCounterPending = r.status === "counter_offered";
            const isMatched = r.status === "accepted";
            return (
              <motion.div key={r.id} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} style={{ borderRadius:14, padding:"14px 16px", boxShadow:"0 4px 20px rgba(0,0,0,0.18)", background: isCounterPending ? "linear-gradient(135deg,#1a1400,#1a1000)" : CARD, border: isCounterPending ? "1px solid rgba(200,168,75,0.45)" : isMatched ? "1px solid rgba(58,134,255,0.4)" : "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom: isCounterPending ? 12 : 0 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, color: CS, margin:0, display:"flex", alignItems:"center", gap:5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      <MapPin size={11} color="#93c5fd" />
                      {r.startLocation} → {r.destination}
                    </p>
                    {r.notes && <p style={{ fontSize:11, color:"rgba(255,255,255,0.40)", margin:"3px 0 0", fontStyle:"italic" }}>"{r.notes}"</p>}
                    {r.counterOfferHostId && coTravelerIds.has(r.counterOfferHostId) && <div style={{ marginTop:5 }}><TravelledBadge /></div>}
                  </div>
                  {isMatched ? (
                    <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:999, flexShrink:0, background:"rgba(58,134,255,0.22)", color:"#93c5fd" }}>Matched ✓</span>
                  ) : isCounterPending ? (
                    <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:999, flexShrink:0, background:"rgba(200,168,75,0.22)", color: GOLD }}>Counter Offer</span>
                  ) : (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:999, flexShrink:0, background:"rgba(34,197,94,0.15)", color:"#16a34a", border:"1px solid rgba(34,197,94,0.30)" }}>
                      <span style={{ position:"relative", display:"inline-flex", width:7, height:7, flexShrink:0 }}>
                        <span className="animate-ping" style={{ position:"absolute", inset:0, borderRadius:"50%", background:"#4ade80", opacity:0.75 }} />
                        <span style={{ position:"relative", display:"inline-flex", width:7, height:7, borderRadius:"50%", background:"#16a34a" }} />
                      </span>
                      Live Request
                    </span>
                  )}
                </div>
                {isCounterPending && (
                  <div style={{ background:"rgba(200,168,75,0.08)", border:"1px solid rgba(200,168,75,0.28)", borderRadius:11, padding:"11px 14px", marginBottom:10 }}>
                    <p style={{ fontSize:10, fontWeight:800, color:"rgba(200,168,75,0.7)", margin:"0 0 6px", letterSpacing:"0.08em" }}>HOST PROPOSAL FROM {(r.counterOfferHostName ?? "").toUpperCase()}</p>
                    <p style={{ fontSize:13, color:"rgba(255,255,255,0.88)", lineHeight:1.55, margin:0 }}>"{r.counterOfferText}"</p>
                  </div>
                )}
                <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:10 }}>
                  <div style={{ display:"flex", gap:6 }}>
                    {(r.counterOfferHostId || (r as any).acceptedByHostId) ? (
                      <button onClick={() => { const hostId = r.counterOfferHostId || (r as any).acceptedByHostId; const hostName = r.counterOfferHostName || (r as any).acceptedByHostName || ""; setVpUserId(hostId); setVpPrefill({ name: hostName }); setVpOpen(true); }} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"8px 0", borderRadius:10, background:"rgba(255,255,255,0.09)", border:"1px solid rgba(255,255,255,0.14)", color:"rgba(255,255,255,0.80)", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                        <Eye size={12} /> Profile
                      </button>
                    ) : (
                      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"8px 0", borderRadius:10, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.25)", fontSize:11, fontWeight:700 }}>
                        <Eye size={12} style={{ opacity:0.4 }} /> Profile
                      </div>
                    )}
                    <button onClick={() => openMap(r.startLat, r.startLng, r.destLat, r.destLng, r.startLocation, r.destination)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"8px 0", borderRadius:10, background:"rgba(255,255,255,0.09)", border:"1px solid rgba(255,255,255,0.14)", color:"rgba(255,255,255,0.80)", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      <Navigation size={12} /> View Map
                    </button>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => isCounterPending ? handlePassengerCounterResponse(r.id, true) : undefined} disabled={processingReq === r.id || (!isCounterPending && !isMatched)} style={{ flex:2, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px 0", borderRadius:10, background: isMatched ? "rgba(74,222,128,0.15)" : isCounterPending ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.05)", border: isMatched ? "1px solid rgba(74,222,128,0.35)" : isCounterPending ? "1.5px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.08)", color: isMatched ? "#4ade80" : isCounterPending ? "#4ade80" : "rgba(255,255,255,0.25)", fontSize:11, fontWeight:800, cursor: isCounterPending ? "pointer" : "default", opacity: processingReq === r.id ? 0.6 : 1 }}>
                      {processingReq === r.id ? <div style={{ width:11, height:11, borderRadius:"50%", border:"2px solid rgba(74,222,128,0.3)", borderTopColor:"#4ade80" }} className="animate-spin" /> : isMatched ? <><CheckCircle size={12} /> Matched ✓</> : <><CheckCircle size={12} /> Accept</>}
                    </button>
                    <button onClick={() => isCounterPending ? handlePassengerCounterResponse(r.id, false) : undefined} disabled={processingReq === r.id || !isCounterPending} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px 0", borderRadius:10, background: isCounterPending ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)", border: isCounterPending ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.07)", color: isCounterPending ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.25)", fontSize:11, fontWeight:700, cursor: isCounterPending ? "pointer" : "default", opacity: processingReq === r.id ? 0.6 : 1 }}>
                      <Ban size={12} /> Ignore
                    </button>
                    <button onClick={() => handleCancelMyRequest(r.id)} disabled={cancellingRequest === r.id} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"9px 0", borderRadius:10, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.60)", fontSize:11, fontWeight:700, cursor:"pointer", opacity: cancellingRequest === r.id ? 0.65 : 1 }}>
                      {cancellingRequest === r.id ? <div style={{ width:11, height:11, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.2)", borderTopColor:"rgba(255,255,255,0.7)" }} className="animate-spin" /> : "Cancel"}
                    </button>
                  </div>
                </div>
                {isMatched && r.passengerWhatsappUrl && (
                  <a href={r.passengerWhatsappUrl} target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:8, fontSize:11, fontWeight:700, color:"#16a34a", textDecoration:"none" }}>
                    <MessageCircle size={12} /> Message your Host on WhatsApp
                  </a>
                )}
              </motion.div>
            );
          })()}
        </motion.div>

        {/* ══════════════════════════════════════════════════════════
            SECTION 4 — JOURNEY HISTORY
        ══════════════════════════════════════════════════════════ */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.16 }} style={{ marginTop:56 }}>
          <div style={{ marginBottom:20 }}>
            <span style={{ fontSize:20, fontWeight:700, color:"#1E3A5F" }}>Journey History</span>
            <div style={{ height:1, background:"rgba(255,255,255,0.12)", marginTop:12 }} />
          </div>

          {historyLoading ? (
            <div style={{ display:"flex", justifyContent:"center", padding:"40px 0" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", border:`2px solid ${BLUE}`, borderTopColor:"transparent" }} className="animate-spin" />
            </div>
          ) : coTravelers.length === 0 ? (
            <div style={{ borderRadius:16, border:`1.5px dashed ${BORDER}`, background:"rgba(0,0,0,0.02)", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", padding:"40px 24px" }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(58,134,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                <Clock size={24} color="rgba(58,134,255,0.45)" />
              </div>
              <p style={{ fontWeight:700, color: DARK, fontSize:14, margin:0, marginBottom:4 }}>No past journeys yet</p>
              <p style={{ fontSize:12, color: SLATE, lineHeight:1.5, maxWidth:280, margin:0 }}>
                Once you host or join a journey, your travel history with co-travelers will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {coTravelers.map((ct: any, idx: number) => (
                <motion.div
                  key={ct.id}
                  initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.05*idx }}
                  style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"14px 16px", borderRadius:16, border:"1px solid rgba(255,255,255,0.08)", background: CARD, transition:"border-color .2s, box-shadow .2s", boxShadow:"0 4px 20px rgba(0,0,0,0.22)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(58,134,255,0.35)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(58,134,255,0.18)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.22)"; }}
                >
                  {ct.image ? (
                    <img src={ct.image} alt={ct.name}
                      style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover", flexShrink:0, border:`2px solid ${BORDER}` }} />
                  ) : (
                    <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(58,134,255,0.08)", border:"2px solid rgba(58,134,255,0.18)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <UserIcon size={20} color={BLUE} />
                    </div>
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                      <div>
                        <p style={{ fontWeight:700, fontSize:14, color: CT, margin:0, marginBottom:4 }}>{ct.name}</p>
                        <TravelledBadge />
                      </div>
                      <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:999, flexShrink:0, ...(ct.role === "passenger"
                        ? { background:"rgba(58,134,255,0.22)", color:"#93c5fd" }
                        : { background:"rgba(34,197,94,0.22)", color:"#6ee7b7" }) }}>
                        {ct.role === "passenger" ? "Co-Traveler" : "Your Host"}
                      </span>
                    </div>
                    {(ct.jobTitle || ct.company) && (
                      <p style={{ fontSize:12, color: CS, marginTop:3, display:"flex", alignItems:"center", gap:5 }}>
                        <Briefcase size={11} color="#93c5fd" />
                        {[ct.jobTitle, ct.company].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p style={{ fontSize:12, color: CS, marginTop:3, display:"flex", alignItems:"center", gap:5 }}>
                      <MapPin size={11} color="#93c5fd" />
                      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ct.route}</span>
                    </p>
                    <p style={{ fontSize:11, color:"rgba(255,255,255,0.40)", marginTop:3, display:"flex", alignItems:"center", gap:5 }}>
                      <Clock size={10} />
                      {(() => { try { return format(new Date(ct.connectedAt), "dd MMM yyyy"); } catch { return ct.connectedAt; } })()}
                    </p>
                    {ct.whatsappUrl && (
                      <a href={ct.whatsappUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:8, fontSize:11, fontWeight:700, color:"#16a34a", textDecoration:"none" }}>
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ══════════════════════════════════════════════════════════
            SAFETY PROTOCOL — CERTIFICATE STYLE (PERMANENT)
        ══════════════════════════════════════════════════════════ */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.20 }} style={{ marginTop:40 }}>

          <div style={{
            borderRadius:20,
            border:"1px solid rgba(255,255,255,0.12)",
            background:"linear-gradient(160deg,#0B1B3D 0%,#0A1428 100%)",
            overflow:"hidden",
            boxShadow:"0 12px 50px rgba(0,0,0,0.25)",
          }}>

            {/* Gold accent top border */}
            <div style={{ height:3, background:"linear-gradient(90deg,#c8a84b 0%,#e8d48a 40%,#c8a84b 100%)" }} />

            {/* Certificate header */}
            <div style={{ padding:"28px 28px 20px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{
                  width:52, height:52, borderRadius:"50%", flexShrink:0,
                  background:"linear-gradient(135deg,rgba(200,168,75,0.18),rgba(200,168,75,0.06))",
                  border:"2px solid rgba(200,168,75,0.4)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow:"0 0 20px rgba(200,168,75,0.12)",
                }}>
                  <Scale size={22} color="#c8a84b" />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:9, fontWeight:800, textTransform:"uppercase" as const, letterSpacing:"0.18em", color:"#c8a84b" }}>
                      SyncIn Club · Islamabad
                    </span>
                    <div style={{ flex:1, height:"1px", background:"rgba(200,168,75,0.2)" }} />
                    <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.1em", color:"rgba(200,168,75,0.5)" }}>OFFICIAL</span>
                  </div>
                  <h3 style={{ fontSize:17, fontWeight:800, color:"#ffffff", margin:0, lineHeight:1.2 }}>
                    Member Code of Conduct &amp; Safety Protocol
                  </h3>
                  <p style={{ fontSize:11, color:"rgba(189,195,199,0.6)", marginTop:3 }}>
                    Mandatory for all SyncIn Club members · Non-negotiable standards
                  </p>
                </div>
              </div>
            </div>

            {/* Articles */}
            <div style={{ padding:"20px 28px 24px", display:"flex", flexDirection:"column", gap:14 }}>

              {[
                { icon: ShieldCheck, color: BLUE, rgb:"58,134,255", article:"I", title:"Identity Verification",
                  body:"All hosts must share their CNIC (National ID) with confirmed co-travelers before every journey. Identity verification is non-negotiable for both parties." },
                { icon: BadgeDollarSign, color:"#4ade80", rgb:"74,222,128", article:"II", title:"Private Fee Agreement",
                  body:"This is a cost-sharing community — not a commercial service. All fuel contributions are privately agreed between host and co-travelers before departure. No commercial fares permitted." },
                { icon: Crown, color:GOLD, rgb:"200,168,75", article:"III", title:"Professional Community Standard",
                  body:"SyncIn Club is exclusively for verified white-collar professionals. Misrepresentation of identity or profession is grounds for immediate removal without appeal." },
              ].map(({ icon: Icon, color, rgb, article, title, body }) => (
                <div key={article} style={{ display:"flex", alignItems:"flex-start", gap:16, padding:"16px 18px", borderRadius:14, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ flexShrink:0 }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:`rgba(${rgb},0.12)`, border:`1px solid rgba(${rgb},0.25)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Icon size={18} color={color} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                      <span style={{ fontSize:9, fontWeight:800, letterSpacing:"0.15em", textTransform:"uppercase" as const, color:`rgba(${rgb},0.7)` }}>Article {article}</span>
                      <div style={{ width:24, height:"1px", background:`rgba(${rgb},0.2)` }} />
                    </div>
                    <p style={{ fontWeight:700, color:"#ffffff", fontSize:13, margin:0, marginBottom:5 }}>{title}</p>
                    <p style={{ fontSize:12, color:"#BDC3C7", lineHeight:1.6, margin:0, opacity:0.8 }}>{body}</p>
                  </div>
                </div>
              ))}

            </div>

            {/* Certificate footer */}
            <div style={{ padding:"14px 28px 20px", borderTop:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:10 }}>
              <BookOpen size={13} color="rgba(200,168,75,0.5)" />
              <p style={{ fontSize:11, color:"rgba(189,195,199,0.40)", fontStyle:"italic", margin:0 }}>
                By using this platform, you agree to abide by this Code of Conduct in full. These standards protect every member of our community.
              </p>
            </div>

          </div>
        </motion.div>

      </div>

      {/* Safety confirmation modal — shows before host accepts a passenger interest */}
      {safetyPending && (
        <div style={{ position:"fixed", inset:0, zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)", padding:20 }}>
          <div style={{ background:"#0B132B", border:"1.5px solid rgba(200,168,75,0.40)", borderRadius:20, padding:"28px 24px", maxWidth:360, width:"100%", boxShadow:"0 24px 64px rgba(0,0,0,0.50)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(200,168,75,0.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Shield size={20} color={GOLD} />
              </div>
              <div>
                <p style={{ fontFamily: SERIF, fontSize:16, fontWeight:800, color:"#fff", margin:0 }}>Safety Reminder</p>
                <p style={{ fontSize:11, color:"rgba(255,255,255,0.45)", margin:0 }}>Before connecting with {safetyPending.passengerName}</p>
              </div>
            </div>
            <div style={{ background:"rgba(200,168,75,0.06)", border:"1px solid rgba(200,168,75,0.20)", borderRadius:12, padding:"12px 14px", marginBottom:20 }}>
              <p style={{ fontSize:12, color:"rgba(255,255,255,0.80)", lineHeight:1.6, margin:0 }}>
                By accepting, you agree to share your WhatsApp contact with this verified member. Always meet in a <strong style={{ color: GOLD }}>public location</strong> for the first journey and inform a trusted contact of your plans.
              </p>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setSafetyPending(null)} style={{ flex:1, padding:"11px 0", borderRadius:12, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.65)", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={confirmAcceptInterest} style={{ flex:2, padding:"11px 0", borderRadius:12, background: GOLD, border:"none", color:"#0B132B", fontSize:13, fontWeight:800, cursor:"pointer" }}>
                I Understand — Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handshake modal (when host accepts a passenger request) */}
      {handshakeData && (
        <HandshakeModal
          open={Boolean(handshakeData)}
          partnerName={handshakeData.partnerName}
          whatsappUrl={handshakeData.whatsappUrl}
          onClose={() => setHandshakeData(null)}
        />
      )}

      {/* View Profile modal for open request passengers */}
      <ViewProfileModal
        open={vpOpen}
        userId={vpUserId}
        prefill={vpPrefill}
        role="cotraveler"
        onClose={() => setVpOpen(false)}
      />

      {/* Journey flow modal (Profile → OTP → CarReg) */}
      {flowMode && (
        <JourneyFlowModal
          open={true}
          mode={flowMode}
          onClose={() => setFlowMode(null)}
          onComplete={(mode) => {
            setFlowMode(null);
            setLocation(mode === "host" ? "/offer-ride" : "/find-rides");
          }}
        />
      )}
    </div>
  );
}
