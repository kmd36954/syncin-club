import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Clock, Users, Briefcase, CheckCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@workspace/replit-auth-web";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Ride {
  id: number;
  driverName: string;
  driverImage?: string;
  driverJobTitle?: string;
  driverCompany?: string;
  startLocation: string;
  destination: string;
  departureTime: string;
  price: number;
  seatsAvailable: number;
}

interface InterestModalProps {
  ride: Ride | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InterestModal({ ride, open, onClose, onSuccess }: InterestModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const userAny = (user as any) ?? {};
  const passengerName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "You";

  const handleSubmit = async () => {
    if (!ride) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rides/${ride.id}/interest`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to express interest");
      setDone(true);
      onSuccess();
    } catch (err: any) {
      toast({
        title: "Could not send interest",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setDone(false);
    onClose();
  };

  if (!ride) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", duration: 0.35 }}
            className="relative z-10 w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border/60 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-secondary/30">
              <div>
                <h2 className="text-xl font-bold">
                  {done ? "Interest Sent!" : "Express Interest"}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {ride.startLocation} → {ride.destination}
                </p>
              </div>
              <button onClick={handleClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {done ? (
              <div className="p-8 text-center space-y-5">
                <div className="flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-1">Request Sent!</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Your interest has been forwarded to <strong>{ride.driverName}</strong>.
                    They will be notified on their dashboard and can connect with you via WhatsApp.
                  </p>
                </div>
                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 text-sm text-muted-foreground text-left">
                  <p className="font-semibold text-foreground mb-1">What happens next?</p>
                  <p>Your Host will review your profile (name, designation, company) and decide to connect with you through WhatsApp.</p>
                </div>
                <Button className="w-full rounded-xl" onClick={handleClose}>Done</Button>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Journey Summary */}
                <div className="bg-secondary/40 rounded-2xl p-4 space-y-3 border border-border/40">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    {ride.startLocation} → {ride.destination}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      {format(new Date(ride.departureTime), "MMM d · h:mm a")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      {ride.seatsAvailable} spot{ride.seatsAvailable !== 1 ? "s" : ""} left
                    </span>
                    <span className="font-semibold text-primary" style={{ fontSize:11, color:"rgba(100,116,139,0.8)" }}>Fuel share agreed privately</span>
                  </div>
                </div>

                {/* Your profile being shared */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Your profile will be shared with the host
                  </p>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary/40 border border-border/40">
                    {user?.profileImage ? (
                      <img src={user.profileImage} alt={passengerName} className="h-12 w-12 rounded-full object-cover border-2 border-background" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-background flex-shrink-0">
                        <span className="text-lg font-bold text-primary">
                          {passengerName[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-foreground">{passengerName}</div>
                      {(userAny.jobTitle || userAny.companyName) ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Briefcase className="h-3 w-3 text-primary" />
                          <span className="text-xs text-muted-foreground">
                            {[userAny.jobTitle, userAny.companyName].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">SyncIn Community Member</div>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Once the host accepts, they will reach out via WhatsApp to coordinate your pickup.
                </p>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 rounded-xl gap-2 shadow-lg shadow-primary/20"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Heart className="h-4 w-4" />
                        I'm Interested
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
