/**
 * HOST A JOURNEY — Full-Screen InDrive/Uber Architecture
 *
 * Layer stack (all relative to this fixed page, z-index 50):
 *   0    → Leaflet map tiles
 *   450  → Center needle SVG
 *   460  → Ribbon label
 *   10   → Top search panel (navy)
 *   20   → Bottom sheet (route + form)
 *   9999 → Suggestion dropdown (fixed, always on top of everything)
 *
 * Geocoding engine: Photon (photon.komoot.io) — purpose-built autocomplete,
 * results in ~50 ms, Pakistan bbox filter, no API key needed.
 * Reverse geocode: Nominatim (only fires on drag-end, so latency is fine).
 * Routing: OSRM (actual road polyline, distance, ETA).
 */
import { useLocation } from "wouter";
import { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle, Search, Loader2, ArrowLeft,
  Navigation2, Clock, MapPin, X, Users,
  Calendar as CalendarIcon, ChevronRight,
} from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useQueryClient } from "@tanstack/react-query";
import { getListRidesQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import PoliciesModal from "@/components/PoliciesModal";
import "leaflet/dist/leaflet.css";

/* ── Constants ─────────────────────────────────────────────── */
const DEFAULT_LAT = 33.6007;  /* Rawalpindi/Islamabad fallback */
const DEFAULT_LNG = 73.0679;
const NAVY        = "#0B132B";
const BLUE        = "#3A86FF";
const GREEN       = "#16a34a";
const RED         = "#dc2626";

/* Pakistan bounding box for Photon: lon_min,lat_min,lon_max,lat_max */
const PK_BBOX = "60.87,23.69,77.84,37.09";

/* ── Zod schema ────────────────────────────────────────────── */
const schema = z.object({
  startLocation:  z.string().min(2, "Starting point is required"),
  destination:    z.string().min(2, "Destination is required"),
  departureTime:  z.string().min(1, "Departure time is required"),
  price:          z.coerce.number().default(0),
  seatsAvailable: z.coerce.number().min(1).max(6),
});
type FormValues = z.infer<typeof schema>;
type GeoPoint   = { lat: number; lng: number; address: string };
type Suggestion = { lat: number; lng: number; display: string };

/* ══════════════════════════════════════════════════════════════
   GEOCODING ENGINES
══════════════════════════════════════════════════════════════ */

/**
 * Forward geocode — Photon API.
 * Designed for real-time autocomplete; returns results in ~50 ms.
 * Pakistan bbox filter ensures only local results.
 */
async function searchPlaces(q: string): Promise<Suggestion[]> {
  try {
    const url =
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
      `&limit=8&bbox=${PK_BBOX}&lang=en`;
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return [];
    const data = await r.json();
    const features = (data.features || []) as any[];

    // Build a readable label from Photon's property bag
    return features.map((f: any) => {
      const p = f.properties || {};
      const parts = [p.name, p.street, p.city || p.town || p.village, p.state]
        .filter(Boolean)
        .slice(0, 3);
      return {
        lat:     f.geometry.coordinates[1],
        lng:     f.geometry.coordinates[0],
        display: parts.length ? parts.join(", ") : (p.name || "Unknown"),
      };
    }).filter((s: Suggestion) => s.display !== "Unknown");
  } catch {
    return [];
  }
}

/**
 * Reverse geocode — Nominatim.
 * Only fires when the user releases a drag; latency is acceptable.
 */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" }, signal: AbortSignal.timeout(6000) },
    );
    const d = await r.json();
    return d.display_name
      ? d.display_name.split(",").slice(0, 3).join(", ").trim()
      : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

/* ── OSRM road routing ─────────────────────────────────────── */
interface RouteResult { coords: [number, number][]; km: number; min: number }

async function getRoadRoute(
  s: { lat: number; lng: number },
  d: { lat: number; lng: number },
): Promise<RouteResult | null> {
  try {
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${s.lng},${s.lat};${d.lng},${d.lat}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(8000) },
    );
    const data = await r.json();
    if (!data.routes?.length) return null;
    const route = data.routes[0];
    return {
      coords: route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
      ),
      km:  Math.round((route.distance / 1000) * 10) / 10,
      min: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}

/* ══════════════════════════════════════════════════════════════
   SUGGESTION DROPDOWN
   Rendered with position:fixed so it can NEVER be clipped by
   any parent overflow:hidden or overflow:auto container.
══════════════════════════════════════════════════════════════ */
interface DropdownProps {
  items:    Suggestion[];
  field:    "start" | "dest";
  anchorEl: HTMLElement | null;  /* the input it should appear below */
  onPick:   (item: Suggestion) => void;
  onClose:  () => void;
}

function SuggestionDropdown({ items, field, anchorEl, onPick, onClose }: DropdownProps) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  /* Recalculate whenever anchor or items change */
  useEffect(() => {
    if (!anchorEl) { setPos(null); return; }
    const rect = anchorEl.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  }, [anchorEl, items.length]);

  if (!pos || !items.length) return null;

  const dotColor = field === "start" ? "#4ade80" : "#f87171";

  return (
    <div
      style={{
        position: "fixed",
        top:   pos.top,
        left:  pos.left,
        width: pos.width,
        zIndex: 9999,
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
        maxHeight: 320,
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 14px", borderBottom:"1px solid rgba(0,0,0,0.08)" }}>
        <span style={{ color:"#64748b", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>
          {items.length} result{items.length !== 1 ? "s" : ""} · Pakistan
        </span>
        <button type="button" onClick={onClose}
          style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:0, lineHeight:1 }}>
          <X size={14} />
        </button>
      </div>

      {/* Results */}
      {items.map((s, i) => (
        <button key={i} type="button"
          onMouseDown={e => { e.preventDefault(); onPick(s); }}
          style={{
            display:"flex", alignItems:"flex-start", gap:10,
            width:"100%", padding:"11px 14px",
            background:"none", border:"none",
            borderBottom: i < items.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
            cursor:"pointer", textAlign:"left",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#F8F9FA")}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}
        >
          <div style={{ width:28, height:28, borderRadius:"50%", background:`${dotColor}1a`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
            <MapPin size={13} color={dotColor} />
          </div>
          <span style={{ color:"#0B132B", fontSize:13, lineHeight:1.45 }}>{s.display}</span>
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function OfferRide() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast }       = useToast();
  const queryClient     = useQueryClient();

  /* ── Map refs ─────────────────────────────────────────────── */
  const mapEl          = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<any>(null);
  const startMarker    = useRef<any>(null);
  const destMarker     = useRef<any>(null);
  const gpsMarkerRef   = useRef<any>(null);
  const routeLayer     = useRef<any>(null);
  const activeFieldRef = useRef<"start" | "dest">("start");
  const startPtRef     = useRef<GeoPoint | null>(null);
  const destPtRef      = useRef<GeoPoint | null>(null);

  /* Debounce timers */
  const debStart = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debDest  = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Input elements for dropdown anchor measurement */
  const startInputEl = useRef<HTMLInputElement>(null);
  const destInputEl  = useRef<HTMLInputElement>(null);

  /* ── UI state ─────────────────────────────────────────────── */
  const [activeField, setActiveField] = useState<"start" | "dest">("start");
  const [startQ,      setStartQ]      = useState("");
  const [destQ,       setDestQ]       = useState("");
  const [startPt,     setStartPt]     = useState<GeoPoint | null>(null);
  const [destPt,      setDestPt]      = useState<GeoPoint | null>(null);
  const [routeInfo,   setRouteInfo]   = useState<RouteResult | null>(null);
  const [dragging,    setDragging]    = useState(false);
  const [locating,    setLocating]    = useState(false);

  /* Per-field searching + suggestions */
  const [busyStart,   setBusyStart]   = useState(false);
  const [busyDest,    setBusyDest]    = useState(false);
  const [suggStart,   setSuggStart]   = useState<Suggestion[]>([]);
  const [suggDest,    setSuggDest]    = useState<Suggestion[]>([]);
  const [openDrop,    setOpenDrop]    = useState<"start" | "dest" | null>(null);

  /* Bottom sheet */
  const [sheetOpen,       setSheetOpen]       = useState(false);
  const [submitting,      setSubmitting]       = useState(false);
  const [journeyPublished, setJourneyPublished] = useState(false);

  /* Policies modal gate */
  const [showPolicies, setShowPolicies] = useState(false);
  const pendingData = useRef<FormValues | null>(null);

  /* Keep refs in sync */
  useEffect(() => { activeFieldRef.current = activeField; }, [activeField]);
  useEffect(() => { startPtRef.current = startPt; }, [startPt]);
  useEffect(() => { destPtRef.current  = destPt;  }, [destPt]);

  /* Open bottom sheet once both pins placed */
  useEffect(() => { if (startPt && destPt) setSheetOpen(true); }, [startPt, destPt]);

  /* ── Auth guard ───────────────────────────────────────────── */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({ title:"Login required", description:"Please log in to host a journey.", variant:"destructive" });
      setLocation("/");
    }
  }, [isLoading, isAuthenticated]);

  /* ── Form ─────────────────────────────────────────────────── */
  const { handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { startLocation:"", destination:"", departureTime:"", price: 0, seatsAvailable:3 },
  });

  /* ── Map pin icon ─────────────────────────────────────────── */
  const makeIcon = useCallback(async (color: string) => {
    const L = (await import("leaflet")).default;
    return L.divIcon({
      className: "",
      html: `<div style="width:26px;height:34px;filter:drop-shadow(0 3px 8px rgba(0,0,0,.5))">
        <svg viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 0C5.82 0 0 5.82 0 13c0 8.67 13 21 13 21S26 21.67 26 13C26 5.82 20.18 0 13 0z" fill="${color}"/>
          <circle cx="13" cy="13" r="5.5" fill="white"/>
          <circle cx="13" cy="13" r="2.5" fill="${color}"/>
        </svg></div>`,
      iconSize: [26, 34], iconAnchor: [13, 34],
    });
  }, []);

  const placeMarker = useCallback(async (which: "start" | "dest", lat: number, lng: number) => {
    if (!mapRef.current) return;
    const L    = (await import("leaflet")).default;
    const icon = await makeIcon(which === "start" ? GREEN : RED);
    const ref  = which === "start" ? startMarker : destMarker;
    if (ref.current) { try { ref.current.remove(); } catch {} }
    if (!mapRef.current) return;
    const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(mapRef.current);
    marker.on("dragend", async () => {
      const pos = marker.getLatLng();
      setLocating(true);
      const addr = await reverseGeocode(pos.lat, pos.lng);
      setLocating(false);
      const pt: GeoPoint = { lat: pos.lat, lng: pos.lng, address: addr };
      if (which === "start") {
        setStartQ(addr); setStartPt(pt);
        setValue("startLocation", addr, { shouldValidate: true });
        if (destPtRef.current) drawRoad(pt, destPtRef.current);
      } else {
        setDestQ(addr); setDestPt(pt);
        setValue("destination", addr, { shouldValidate: true });
        if (startPtRef.current) drawRoad(startPtRef.current, pt);
      }
    });
    ref.current = marker;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [makeIcon, setValue]);

  const drawRoad = useCallback(async (s: GeoPoint, d: GeoPoint) => {
    if (!mapRef.current) return;
    const L = (await import("leaflet")).default;
    if (routeLayer.current) { try { routeLayer.current.remove(); } catch {} routeLayer.current = null; }
    const res = await getRoadRoute(s, d);
    if (!mapRef.current) return;
    if (res) {
      routeLayer.current = L.polyline(res.coords, { color: BLUE, weight: 6, opacity: 0.92 }).addTo(mapRef.current);
      setRouteInfo(res);
      try { mapRef.current.fitBounds(L.latLngBounds(res.coords), { padding: [100, 100], animate: false }); } catch {}
    } else {
      routeLayer.current = L.polyline([[s.lat, s.lng], [d.lat, d.lng]], { color: BLUE, weight: 5, opacity: 0.6, dashArray: "10 6" }).addTo(mapRef.current);
      setRouteInfo(null);
    }
  }, []);

  /* ── Init Leaflet ─────────────────────────────────────────── */
  useEffect(() => {
    if (!mapEl.current || !isAuthenticated) return;
    let dead = false;
    const boot = async () => {
      const L = (await import("leaflet")).default;
      if (dead || !mapEl.current) return;
      if (mapRef.current) { try { mapRef.current.remove(); } catch {} mapRef.current = null; }
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(mapEl.current!, {
        zoomControl: false, scrollWheelZoom: true, doubleClickZoom: true,
        zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false,
      }).setView([DEFAULT_LAT, DEFAULT_LNG], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap", maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      map.on("dragstart", () => { setDragging(true); setOpenDrop(null); });
      map.on("dragend", async () => {
        setDragging(false);
        if (dead) return;
        const c = map.getCenter();
        setLocating(true);
        const addr = await reverseGeocode(c.lat, c.lng);
        if (dead) return;
        setLocating(false);
        const pt: GeoPoint = { lat: c.lat, lng: c.lng, address: addr };
        if (activeFieldRef.current === "start") {
          setStartQ(addr); setStartPt(pt);
          setValue("startLocation", addr, { shouldValidate: true });
          await placeMarker("start", c.lat, c.lng);
          if (destPtRef.current) drawRoad(pt, destPtRef.current);
        } else {
          setDestQ(addr); setDestPt(pt);
          setValue("destination", addr, { shouldValidate: true });
          await placeMarker("dest", c.lat, c.lng);
          if (startPtRef.current) drawRoad(startPtRef.current, pt);
        }
      });
      mapRef.current = map;

      /* ── GPS auto-detect ─────────────────────────────────── */
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (dead || !mapRef.current) return;
            const { latitude: lat, longitude: lng } = pos.coords;
            map.setView([lat, lng], 15, { animate: false });
            /* "Your Location" blue dot marker — non-draggable reference pin */
            const gpsIcon = L.divIcon({
              className: "",
              html: `<div style="width:22px;height:22px;border-radius:50%;background:#3A86FF;border:3px solid #fff;box-shadow:0 2px 10px rgba(58,134,255,0.6)"></div>`,
              iconSize: [22, 22], iconAnchor: [11, 11],
            });
            const gpsMkr = L.marker([lat, lng], { icon: gpsIcon, interactive: false, zIndexOffset: -200 })
              .addTo(map)
              .bindTooltip("Your Location", {
                permanent: true, direction: "top",
                offset: [0, -16],
                className: "gps-location-tooltip",
              });
            gpsMarkerRef.current = gpsMkr;
            /* Reverse geocode and pre-fill start field */
            const addr = await reverseGeocode(lat, lng);
            if (dead) return;
            const pt: GeoPoint = { lat, lng, address: addr };
            setStartQ(addr); setStartPt(pt);
            setValue("startLocation", addr, { shouldValidate: false });
            startPtRef.current = pt;
            await placeMarker("start", lat, lng);
          },
          () => {
            /* Permission denied — map stays at Rawalpindi/Islamabad default */
          },
          { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 },
        );
      }
    };
    const t = setTimeout(boot, 60);
    return () => {
      dead = true; clearTimeout(t);
      if (gpsMarkerRef.current) { try { gpsMarkerRef.current.remove(); } catch {} gpsMarkerRef.current = null; }
      if (mapRef.current) { try { mapRef.current.remove(); } catch {} mapRef.current = null; }
    };
  }, [isAuthenticated]);

  /* ── Search handlers — 300 ms debounce + instant spinner ──── */
  const handleStartInput = (v: string) => {
    setStartQ(v);
    setSuggStart([]);
    if (debStart.current) clearTimeout(debStart.current);
    if (v.trim().length < 2) { setBusyStart(false); setOpenDrop(null); return; }
    setBusyStart(true); /* spinner immediately */
    debStart.current = setTimeout(async () => {
      const results = await searchPlaces(v);
      setBusyStart(false);
      if (results.length) { setSuggStart(results); setOpenDrop("start"); }
      else setSuggStart([]);
    }, 300);
  };

  const handleDestInput = (v: string) => {
    setDestQ(v);
    setSuggDest([]);
    if (debDest.current) clearTimeout(debDest.current);
    if (v.trim().length < 2) { setBusyDest(false); setOpenDrop(null); return; }
    setBusyDest(true);
    debDest.current = setTimeout(async () => {
      const results = await searchPlaces(v);
      setBusyDest(false);
      if (results.length) { setSuggDest(results); setOpenDrop("dest"); }
      else setSuggDest([]);
    }, 300);
  };

  /* Manual trigger (Enter / button) — fires immediately */
  const triggerSearch = async (field: "start" | "dest") => {
    const q = field === "start" ? startQ : destQ;
    if (q.trim().length < 2) return;
    if (field === "start") {
      if (debStart.current) clearTimeout(debStart.current);
      setBusyStart(true);
      const r = await searchPlaces(q);
      setBusyStart(false);
      if (r.length) { setSuggStart(r); setOpenDrop("start"); }
    } else {
      if (debDest.current) clearTimeout(debDest.current);
      setBusyDest(true);
      const r = await searchPlaces(q);
      setBusyDest(false);
      if (r.length) { setSuggDest(r); setOpenDrop("dest"); }
    }
  };

  /* Pick a suggestion result */
  const pickResult = async (field: "start" | "dest", item: Suggestion) => {
    setOpenDrop(null);
    const pt: GeoPoint = { lat: item.lat, lng: item.lng, address: item.display };
    if (field === "start") {
      setStartQ(item.display); setSuggStart([]); setStartPt(pt);
      setValue("startLocation", item.display, { shouldValidate: true });
      await placeMarker("start", item.lat, item.lng);
      if (mapRef.current) mapRef.current.setView([item.lat, item.lng], 15, { animate: false });
      if (destPtRef.current) drawRoad(pt, destPtRef.current);
    } else {
      setDestQ(item.display); setSuggDest([]); setDestPt(pt);
      setValue("destination", item.display, { shouldValidate: true });
      await placeMarker("dest", item.lat, item.lng);
      if (mapRef.current) mapRef.current.setView([item.lat, item.lng], 15, { animate: false });
      if (startPtRef.current) drawRoad(startPtRef.current, pt);
    }
  };

  /* ── Submit intercept — show Policies modal first ─────────── */
  const onSubmit = (data: FormValues) => {
    pendingData.current = data;
    setShowPolicies(true);
  };

  /* ── Actual publish after policies accepted ────────────────── */
  const doPublish = async () => {
    const data = pendingData.current;
    if (!data) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/rides", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          startLat: startPt?.lat, startLng: startPt?.lng,
          destLat:  destPt?.lat,  destLng:  destPt?.lng,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to host journey");
      queryClient.invalidateQueries({ queryKey: getListRidesQueryKey() });
      setShowPolicies(false);
      /* Trigger welcome email (fire-and-forget) */
      fetch("/api/auth/welcome-email", { method:"POST", credentials:"include" }).catch(()=>{});
      setJourneyPublished(true);
      setTimeout(() => setLocation("/dashboard"), 3000);
    } catch (err: any) {
      toast({ title: "Failed", description: (err as Error).message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (isLoading || !isAuthenticated) return null;

  const needleColor = activeField === "start" ? GREEN : RED;
  const pinLabel    = activeField === "start" ? "Pick-up" : "Destination";

  /* Shared input style — light theme */
  const INP: React.CSSProperties = {
    background:  "#F8F9FA",
    border:      "1.5px solid #E2E8F0",
    color:       "#0B132B",
    fontSize:    "15px",
    outline:     "none",
    width:       "100%",
    boxSizing:   "border-box",
    paddingTop:  13,
    paddingBottom: 13,
    paddingLeft: 38,
    paddingRight: 12,
    borderRadius: 12,
  };

  return (
    /* ── Fixed split: map top 45vh · form bottom 55vh ── */
    <div style={{ position:"fixed", inset:0, zIndex:50, overflow:"hidden" }}>

      {/* ══ MAP — fixed at top, 45vh, always visible ══ */}
      <div style={{ position:"absolute", top:0, left:0, width:"100%", height:"45vh", zIndex:1, background:"#e8eaed" }}>
        <div ref={mapEl} style={{ position:"absolute", inset:0 }} />

        {/* Center needle */}
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none", zIndex:10 }}>
          <div style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            transform: dragging ? "translateY(-56%) scale(1.2)" : "translateY(-50%) scale(1)",
            transition: "transform 0.18s cubic-bezier(.22,1,.36,1)",
            filter: dragging ? "drop-shadow(0 14px 22px rgba(0,0,0,.65))" : "drop-shadow(0 5px 14px rgba(0,0,0,.5))",
          }}>
            <svg width="46" height="58" viewBox="0 0 46 58" xmlns="http://www.w3.org/2000/svg">
              <path d="M23 0C10.30 0 0 10.30 0 23c0 15.17 23 35 23 35S46 38.17 46 23C46 10.30 35.70 0 23 0z" fill={needleColor}/>
              <circle cx="23" cy="23" r="12" fill="white"/>
              <circle cx="23" cy="23" r="6.5" fill={needleColor}/>
            </svg>
            <div style={{ width: dragging ? 8 : 20, height: dragging ? 3 : 7, borderRadius:"50%", background:"rgba(0,0,0,0.28)", marginTop:-3, transition:"width .18s,height .18s" }} />
          </div>
        </div>

        {/* Ribbon */}
        <div style={{ position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)", background:`${needleColor}ee`, color:"#fff", fontWeight:700, fontSize:12, letterSpacing:"0.04em", borderRadius:999, padding:"6px 16px", pointerEvents:"none", zIndex:11, whiteSpace:"nowrap", boxShadow:"0 4px 16px rgba(0,0,0,0.35)" }}>
          {dragging ? "Release to drop pin…" : `Drag map · needle sets ${pinLabel}`}
        </div>

        {/* Locating overlay */}
        {locating && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.22)", backdropFilter:"blur(3px)", zIndex:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(255,255,255,0.96)", padding:"10px 20px", borderRadius:999, boxShadow:"0 6px 24px rgba(0,0,0,0.25)" }}>
              <Loader2 size={16} className="animate-spin" style={{ color: NAVY }} />
              <span style={{ fontSize:13, fontWeight:600, color:"#1f2937" }}>Reverse-geocoding…</span>
            </div>
          </div>
        )}
      </div>

      {/* ══ FORM PANEL — all fields, scrollable, bottom 55vh ══ */}
      <div style={{ position:"relative", top:"45vh", left:0, width:"100%", height:"55vh", maxHeight:"45vh", overflowY:"auto", zIndex:2, background:NAVY, boxShadow:"0 -4px 24px rgba(0,0,0,0.35)" }}>

        {/* Back + title */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px 10px" }}>
          <button type="button" onClick={() => setLocation("/dashboard")}
            style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.10)", border:"1.5px solid rgba(255,255,255,0.18)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
            <ArrowLeft size={20} color="#FFFFFF"/>
          </button>
          <div>
            <div style={{ color:"#FFFFFF", fontWeight:800, fontSize:17, lineHeight:1.2 }}>Host a Journey</div>
            <div style={{ color:"rgba(255,255,255,0.60)", fontSize:12, marginTop:2 }}>Set your route — co-travelers will find you</div>
          </div>
        </div>

        <div style={{ padding:"0 16px 8px", display:"flex", flexDirection:"column", gap:10 }}>

          {/* ── Starting Point ── */}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:"#16a34a", flexShrink:0 }} />
              <span style={{ color:"rgba(255,255,255,0.80)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Starting Point</span>
              {startPt   && <CheckCircle size={12} color="#16a34a" style={{ marginLeft:"auto" }}/>}
              {busyStart && <Loader2 size={12} color="#94a3b8" className="animate-spin" style={{ marginLeft:"auto" }}/>}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <div style={{ flex:1, position:"relative", minWidth:0 }}>
                <Search size={15} color="#94a3b8" style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}/>
                <input
                  ref={startInputEl}
                  type="text" value={startQ}
                  onChange={e => handleStartInput(e.target.value)}
                  onFocus={() => { setActiveField("start"); if (suggStart.length) setOpenDrop("start"); }}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); triggerSearch("start"); } }}
                  placeholder="e.g. F-6 Markaz, Islamabad…"
                  style={INP}
                />
              </div>
              <button type="button" onClick={() => triggerSearch("start")}
                disabled={startQ.trim().length < 2 || busyStart}
                style={{ width:46, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:BLUE, border:"none", borderRadius:12, cursor:"pointer", opacity: startQ.trim().length < 2 || busyStart ? 0.4 : 1 }}>
                {busyStart ? <Loader2 size={16} color="#fff" className="animate-spin"/> : <Search size={16} color="#fff"/>}
              </button>
            </div>
            {errors.startLocation && <p style={{ color:"#dc2626", fontSize:11, marginTop:3 }}>{errors.startLocation.message}</p>}
          </div>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ flex:1, borderTop:"1px solid rgba(255,255,255,0.15)" }}/>
            <div style={{ width:26, height:26, borderRadius:"50%", background:"rgba(255,255,255,0.10)", display:"flex", alignItems:"center", justifyContent:"center", color:"#FFFFFF", fontSize:13, fontWeight:700 }}>↓</div>
            <div style={{ flex:1, borderTop:"1px solid rgba(255,255,255,0.15)" }}/>
          </div>

          {/* ── Destination ── */}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:"#ef4444", flexShrink:0 }}/>
              <span style={{ color:"rgba(255,255,255,0.80)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Destination</span>
              {destPt   && <CheckCircle size={12} color="#ef4444" style={{ marginLeft:"auto" }}/>}
              {busyDest && <Loader2 size={12} color="#94a3b8" className="animate-spin" style={{ marginLeft:"auto" }}/>}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <div style={{ flex:1, position:"relative", minWidth:0 }}>
                <MapPin size={15} color="#94a3b8" style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}/>
                <input
                  ref={destInputEl}
                  type="text" value={destQ}
                  onChange={e => handleDestInput(e.target.value)}
                  onFocus={() => { setActiveField("dest"); if (suggDest.length) setOpenDrop("dest"); }}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); triggerSearch("dest"); } }}
                  placeholder="e.g. Gulberg III, Lahore…"
                  style={INP}
                />
              </div>
              <button type="button" onClick={() => triggerSearch("dest")}
                disabled={destQ.trim().length < 2 || busyDest}
                style={{ width:46, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:BLUE, border:"none", borderRadius:12, cursor:"pointer", opacity: destQ.trim().length < 2 || busyDest ? 0.4 : 1 }}>
                {busyDest ? <Loader2 size={16} color="#fff" className="animate-spin"/> : <Search size={16} color="#fff"/>}
              </button>
            </div>
            {errors.destination && <p style={{ color:"#dc2626", fontSize:11, marginTop:3 }}>{errors.destination.message}</p>}
          </div>

          {/* Active-field hint */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:needleColor, flexShrink:0 }}/>
            <span style={{ color:"rgba(255,255,255,0.50)", fontSize:11 }}>
              Needle targets <strong style={{ color:"#FFFFFF" }}>{pinLabel}</strong> — or drag map to pin manually
            </span>
          </div>
        </div>

        {/* Divider between search and journey details */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.10)", margin:"4px 0" }}/>

        {/* Route summary — shown once both pins placed */}
        {startPt && destPt && (
          <div style={{ padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,0.10)" }}>
            {routeInfo ? (
              <div style={{ display:"flex", alignItems:"center", gap:24 }}>
                {[
                  { icon:<Navigation2 size={16} color="#93c5fd"/>, label:"Road Dist", value:`${routeInfo.km}`, unit:"km" },
                  { icon:<Clock size={16} color="#93c5fd"/>,        label:"Est Time",  value:`${routeInfo.min}`, unit:"min" },
                ].map(({ icon, label, value, unit }, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:"rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center" }}>{icon}</div>
                    <div>
                      <div style={{ color:"rgba(255,255,255,0.55)", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</div>
                      <div style={{ color:"#FFFFFF", fontSize:18, fontWeight:800, lineHeight:1 }}>
                        {value} <span style={{ fontSize:11, fontWeight:400, color:"rgba(255,255,255,0.50)" }}>{unit}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Loader2 size={14} color="#93c5fd" className="animate-spin"/>
                <span style={{ color:"rgba(255,255,255,0.60)", fontSize:13 }}>Calculating road route…</span>
              </div>
            )}
          </div>
        )}

        {/* Journey details form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ padding:"12px 16px 36px", display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ color:"rgba(255,255,255,0.55)", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em" }}>Journey Details</div>

          <div>
            <label style={{ display:"flex", alignItems:"center", gap:6, color:"rgba(255,255,255,0.85)", fontSize:13, fontWeight:600, marginBottom:6 }}>
              <CalendarIcon size={13} style={{ opacity:0.7 }}/> Departure Time
            </label>
            <input type="datetime-local"
              onChange={e => setValue("departureTime", e.target.value, { shouldValidate:true })}
              style={{ ...INP, paddingLeft:14, colorScheme:"light" }}
            />
            {errors.departureTime && <p style={{ color:"#dc2626", fontSize:11, marginTop:3 }}>{errors.departureTime.message}</p>}
          </div>

          <div>
            <label style={{ display:"flex", alignItems:"center", gap:6, color:"rgba(255,255,255,0.85)", fontSize:13, fontWeight:600, marginBottom:6 }}>
              <Users size={13} style={{ opacity:0.7 }}/> Available Spots
            </label>
            <input type="number" defaultValue={3} min={1} max={6}
              onChange={e => setValue("seatsAvailable", Number(e.target.value), { shouldValidate:true })}
              style={{ ...INP, paddingLeft:14 }}
            />
          </div>

          <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.10)", borderRadius:12, padding:"10px 14px", fontSize:12, color:"rgba(255,255,255,0.50)", fontStyle:"italic" }}>
            Fuel contributions are agreed privately between members — no pricing on this platform.
          </div>

          <button type="submit" disabled={submitting}
            style={{ width:"100%", padding:"15px 0", borderRadius:18, background:BLUE, color:"#ffffff", fontWeight:800, fontSize:15, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity: submitting ? 0.7 : 1, boxShadow:"0 4px 20px rgba(58,134,255,0.35)" }}>
            {submitting
              ? <><Loader2 size={18} className="animate-spin"/> Hosting…</>
              : <>Host Journey <ChevronRight size={18}/></>}
          </button>
        </form>
      </div>

      {/* Success overlay — shown after journey is published, auto-redirects in 3s */}
      {journeyPublished && (
        <div style={{ position:"absolute", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(11,19,43,0.85)", backdropFilter:"blur(8px)" }}>
          <div style={{ background:"#0F1A3A", border:"1.5px solid rgba(34,197,94,0.40)", borderRadius:24, padding:"36px 32px", maxWidth:360, width:"100%", textAlign:"center", boxShadow:"0 24px 80px rgba(0,0,0,0.55)" }}>
            <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(34,197,94,0.12)", border:"2px solid rgba(34,197,94,0.35)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px" }}>
              <CheckCircle size={30} color="#4ade80" />
            </div>
            <h2 style={{ fontSize:22, fontWeight:800, color:"#ffffff", margin:"0 0 8px" }}>Journey Published Successfully!</h2>
            <p style={{ fontSize:14, color:"rgba(255,255,255,0.65)", lineHeight:1.6, margin:"0 0 20px" }}>
              Members nearby will see your journey now.<br/>Redirecting to dashboard…
            </p>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:12, color:"rgba(74,222,128,0.75)", fontWeight:600 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#4ade80" }} className="animate-ping" />
              Live on the feed
            </div>
          </div>
        </div>
      )}

      {/* Suggestion dropdown — position:fixed, floats above everything */}
      <SuggestionDropdown
        items={openDrop === "start" ? suggStart : openDrop === "dest" ? suggDest : []}
        field={openDrop || "start"}
        anchorEl={openDrop === "start" ? startInputEl.current : openDrop === "dest" ? destInputEl.current : null}
        onPick={item => pickResult(openDrop!, item)}
        onClose={() => setOpenDrop(null)}
      />

      {/* Policies & Terms gate */}
      <PoliciesModal
        open={showPolicies}
        submitting={submitting}
        onClose={() => setShowPolicies(false)}
        onAccept={doPublish}
      />
    </div>
  );
}
