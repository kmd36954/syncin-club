import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Building2, X, CheckCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateProfile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";

export default function CompleteProfilePrompt() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const updateProfileMutation = useUpdateProfile();

  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const userAny = user as any;
  const needsProfile = isAuthenticated && !isLoading && user && !userAny?.companyName && !dismissed;

  if (!needsProfile) return null;

  const handleSave = async () => {
    if (!companyName.trim() || !jobTitle.trim()) {
      toast({
        title: "Both fields required",
        description: "Please enter your company and job title to continue.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await updateProfileMutation.mutateAsync({
        data: {
          companyName: companyName.trim(),
          jobTitle: jobTitle.trim(),
        },
      });
      setSaved(true);
      toast({
        title: "Welcome to SyncIn!",
        description: "Your professional profile is set. Other commuters can now trust you.",
      });
      setTimeout(() => setDismissed(true), 1200);
    } catch {
      toast({
        title: "Could not save profile",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative z-10 w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border/60 overflow-hidden"
        >
          {/* Dismiss */}
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-4 right-4 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Top banner */}
          <div className="bg-gradient-to-r from-primary to-primary/80 px-6 pt-7 pb-6 text-primary-foreground">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 fill-white/80" />
              <span className="text-sm font-semibold uppercase tracking-wide">One more step</span>
            </div>
            <h2 className="text-2xl font-bold mb-1">Complete Your Professional Profile</h2>
            <p className="text-primary-foreground/75 text-sm">
              SyncIn is for verified professionals. Add your workplace to build trust with fellow commuters.
            </p>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                <Briefcase className="inline h-4 w-4 mr-1 text-primary" />
                Job Title <span className="text-destructive">*</span>
              </label>
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Engineer, Marketing Manager"
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">
                <Building2 className="inline h-4 w-4 mr-1 text-primary" />
                Company / Organization <span className="text-destructive">*</span>
              </label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Mari Petroleum, HBL, PTCL, LUMS"
                className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-sm transition-all"
              />
            </div>

            {/* Preview */}
            {(jobTitle || companyName) && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{jobTitle || "Job Title"}</span>
                  {companyName && <span> · {companyName}</span>}
                </span>
              </div>
            )}

            <Button
              className="w-full rounded-xl py-5 font-semibold shadow-md shadow-primary/20 mt-2"
              onClick={handleSave}
              disabled={saving || saved}
            >
              {saved ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" /> Profile Saved!
                </span>
              ) : saving ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save & Join the Community"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              This will be shown on your ride cards to other professionals.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
