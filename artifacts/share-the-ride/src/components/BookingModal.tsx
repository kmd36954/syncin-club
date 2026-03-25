import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, MessageCircle, X, Navigation, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookRide, getListRidesQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import "leaflet/dist/leaflet.css";

interface Ride {
  id: number;
  driverName: string;
  destination: string;
  startLocation: string;
  price: number;
}

interface BookingResult {
  driverName: string;
  riderName: string;
  destination: string;
  whatsappUrl?: string;
  pickupLat?: number;
  pickupLng?: number;
  bookingId: number;
}

interface BookingModalProps {
  ride: Ride | null;
  open: boolean;
  onClose: () => void;
}

const DEFAULT_LAT = 33.6844;
const DEFAULT_LNG = 73.0479;

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const data = await res.json();
    if (data.display_name) {
      // Trim to first two meaningful parts
      const parts = data.display_name.split(",").slice(0, 3).join(",").trim();
      return parts;
    }
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export default function BookingModal({ ride, open, onClose }: BookingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const bookRideMutation = useBookRide();

  const [pickupDescription, setPickupDescription] = useState("");
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [pinLat, setPinLat] = useState<number | null>(null);
  const [pinLng, setPinLng] = useState<number | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [step, setStep] = useState<"form" | "success">("form");

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!open) {
      setPickupDescription("");
      setPinLat(null);
      setPinLng(null);
      setBookingResult(null);
      setStep("form");
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open || step !== "form" || !mapRef.current) return;

    const timeout = setTimeout(async () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      const L = (await import("leaflet")).default;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      // Try geolocation first, fall back to Rawalpindi/Islamabad
      let startLat = DEFAULT_LAT;
      let startLng = DEFAULT_LNG;
      let startZoom = 12;

      try {
        if ("geolocation" in navigator) {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          startLat = pos.coords.latitude;
          startLng = pos.coords.longitude;
          startZoom = 15;
        }
      } catch {
        // use defaults
      }

      const map = L.map(mapRef.current!, { zoomControl: true })
        .setView([startLat, startLng], startZoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Create draggable marker at map centre
      const marker = L.marker([startLat, startLng], { draggable: true }).addTo(map);
      marker.bindPopup("Drag me to your pickup point").openPopup();
      markerRef.current = marker;

      setPinLat(startLat);
      setPinLng(startLng);

      // Reverse geocode initial position
      setIsReverseGeocoding(true);
      reverseGeocode(startLat, startLng).then(addr => {
        setPickupDescription(addr);
        setIsReverseGeocoding(false);
      });

      // On drag end: update coords + reverse geocode
      marker.on("dragend", async () => {
        const { lat, lng } = marker.getLatLng();
        setPinLat(lat);
        setPinLng(lng);
        setIsReverseGeocoding(true);
        const addr = await reverseGeocode(lat, lng);
        setPickupDescription(addr);
        setIsReverseGeocoding(false);
      });

      // Also allow clicking the map to move the pin
      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setPinLat(lat);
        setPinLng(lng);
        setIsReverseGeocoding(true);
        reverseGeocode(lat, lng).then(addr => {
          setPickupDescription(addr);
          setIsReverseGeocoding(false);
        });
      });

      leafletMapRef.current = map;
    }, 100);

    return () => clearTimeout(timeout);
  }, [open, step]);

  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      markerRef.current = null;
    };
  }, []);

  const handleSubmit = async () => {
    if (!pickupDescription.trim()) {
      toast({
        title: "Pickup location required",
        description: "Please confirm your pickup point on the map.",
        variant: "destructive",
      });
      return;
    }
    if (!ride) return;

    try {
      const result = await bookRideMutation.mutateAsync({
        id: ride.id,
        data: {
          pickupDescription: pickupDescription.trim(),
          pickupLat: pinLat ?? undefined,
          pickupLng: pinLng ?? undefined,
        },
      });

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      markerRef.current = null;

      setBookingResult(result);
      setStep("success");
      queryClient.invalidateQueries({ queryKey: getListRidesQueryKey() });
    } catch (err: any) {
      toast({
        title: "Booking failed",
        description: err.message || "Unable to book this ride. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!ride) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative z-10 w-full max-w-lg bg-card rounded-3xl shadow-2xl border border-border/60 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/50 bg-secondary/30">
              <div>
                <h2 className="text-xl font-bold">
                  {step === "form" ? "Confirm Your Pickup" : "You're Joining!"}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {step === "form"
                    ? `${ride.startLocation} → ${ride.destination}`
                    : `Fuel share agreed privately · ${ride.destination}`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {step === "form" ? (
              <div className="p-6 space-y-5">
                {/* Map */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    <Navigation className="inline h-4 w-4 mr-1 text-primary" />
                    Drag the pin to your pickup point
                  </label>
                  <div
                    ref={mapRef}
                    className="w-full h-52 rounded-xl border-2 border-border overflow-hidden bg-secondary/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-primary" />
                    Drag the blue pin or tap anywhere on the map to set your pickup
                  </p>
                </div>

                {/* Address field — auto-filled from reverse geocoding */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    <MapPin className="inline h-4 w-4 mr-1 text-primary" />
                    Pickup Address
                    {isReverseGeocoding && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground animate-pulse">
                        locating…
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="Drag pin above to auto-fill, or type manually"
                    value={pickupDescription}
                    onChange={e => setPickupDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm"
                  />
                  {pinLat && pinLng && (
                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Pin at {pinLat.toFixed(5)}, {pinLng.toFixed(5)}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 rounded-xl shadow-lg shadow-primary/20"
                    onClick={handleSubmit}
                    disabled={bookRideMutation.isPending}
                  >
                    {bookRideMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Joining...
                      </span>
                    ) : (
                      "Confirm & Join"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6 text-center">
                <div className="flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-1">You're in!</h3>
                  <p className="text-muted-foreground text-sm">
                    Your co-traveler spot is confirmed. Contact your Ride Host on WhatsApp to coordinate pickup.
                  </p>
                </div>
                <div className="bg-secondary/50 rounded-2xl p-4 text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ride Host</span>
                    <span className="font-semibold">{bookingResult?.driverName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Destination</span>
                    <span className="font-semibold">{bookingResult?.destination}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Your Pickup</span>
                    <span className="font-semibold text-right max-w-[60%]">{pickupDescription}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fuel Share</span>
                    <span className="text-muted-foreground italic">Agreed privately with host</span>
                  </div>
                </div>

                {bookingResult?.whatsappUrl && (
                  <a
                    href={bookingResult.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-xl py-4 px-6 font-semibold text-white bg-[#25D366] hover:bg-[#22c55e] transition-colors shadow-lg shadow-green-500/20"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Contact Ride Host on WhatsApp
                  </a>
                )}

                <Button variant="outline" className="w-full rounded-xl" onClick={onClose}>
                  Close
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
