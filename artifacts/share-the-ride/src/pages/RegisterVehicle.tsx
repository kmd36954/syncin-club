import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Car, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { PuzzleLogo } from "@/components/PuzzleLogo";

const NAVY  = "#0B132B";
const GOLD  = "#D4AF37";
const BLUE  = "#3A86FF";
const BG    = "#F3F4F6";
const SERIF = "'Playfair Display', Merriweather, Georgia, serif";

const INP: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1.5px solid #E2E8F0",
  background: "#F8F9FA",
  color: NAVY,
  fontSize: 14,
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
};

const LABEL: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "rgba(255,255,255,0.75)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const VEHICLE_TYPES = ["Sedan", "SUV", "Crossover", "Hatchback", "Coupe", "MPV", "Pickup", "Other"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 25 }, (_, i) => String(CURRENT_YEAR - i));

export default function RegisterVehicle() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [form, setForm] = useState({
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: String(CURRENT_YEAR),
    vehicleType: "Sedan",
    vehicleRegNumber: "",
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm(p => ({ ...p, [key]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicleMake.trim()) { setError("Vehicle make is required"); return; }
    if (!form.vehicleModel.trim()) { setError("Vehicle model is required"); return; }
    if (!form.vehicleRegNumber.trim()) { setError("License plate is required"); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          vehicleMake: form.vehicleMake.trim(),
          vehicleModel: form.vehicleModel.trim(),
          vehicleYear: form.vehicleYear,
          vehicleType: form.vehicleType,
          vehicleRegNumber: form.vehicleRegNumber.trim().toUpperCase(),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to save vehicle");
      }
      setSuccess(true);
      setTimeout(() => setLocation("/offer-ride"), 1800);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: BG }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${GOLD}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: "100vh", background: BG }}>

      {/* Header strip */}
      <div style={{ background: NAVY, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={() => setLocation(-1 as any)}
          style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
        >
          <ArrowLeft size={18} color="#fff" />
        </button>
        <PuzzleLogo size={26} />
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.1 }}>
            Register Your Vehicle
          </h1>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", margin: "4px 0 0" }}>
            Required to host a journey on SyncIn
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 20px" }}>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ background: NAVY, borderRadius: 20, padding: 40, textAlign: "center" }}
          >
            <CheckCircle size={52} color="#22c55e" style={{ marginBottom: 16 }} />
            <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
              Vehicle Registered!
            </h2>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14 }}>
              Taking you to host a journey…
            </p>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            style={{ background: NAVY, borderRadius: 20, padding: 32, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(212,175,55,0.12)", border: `1.5px solid rgba(212,175,55,0.3)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Car size={22} color={GOLD} />
              </div>
              <div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0 }}>Vehicle Details</p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: "3px 0 0" }}>
                  All co-travelers will see this information
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={LABEL}>Make *</label>
                <input
                  style={INP}
                  placeholder="e.g. Toyota"
                  value={form.vehicleMake}
                  onChange={set("vehicleMake")}
                  required
                />
              </div>
              <div>
                <label style={LABEL}>Model *</label>
                <input
                  style={INP}
                  placeholder="e.g. Corolla"
                  value={form.vehicleModel}
                  onChange={set("vehicleModel")}
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
              <div>
                <label style={LABEL}>Year</label>
                <select style={{ ...INP, cursor: "pointer" }} value={form.vehicleYear} onChange={set("vehicleYear")}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL}>Type</label>
                <select style={{ ...INP, cursor: "pointer" }} value={form.vehicleType} onChange={set("vehicleType")}>
                  {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={LABEL}>License Plate *</label>
              <input
                style={{ ...INP, textTransform: "uppercase" }}
                placeholder="e.g. ABC-123"
                value={form.vehicleRegNumber}
                onChange={set("vehicleRegNumber")}
                required
              />
            </div>

            {error && (
              <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5", fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 24, width: "100%", padding: "14px", borderRadius: 12,
                background: loading ? "rgba(212,175,55,0.4)" : GOLD,
                color: NAVY, fontWeight: 800, fontSize: 15, border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loading ? "Saving…" : "Register & Host a Journey →"}
            </button>

            <p style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              Your vehicle details are only shown to matched co-travelers.
            </p>
          </motion.form>
        )}
      </div>
    </div>
  );
}
