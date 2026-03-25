import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Briefcase, Building2, CheckCircle, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ firstName: "", lastName: "", mobileNumber: "", jobTitle: "", companyName: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open && user) {
      setForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        mobileNumber: (user as any).mobileNumber || "",
        jobTitle: (user as any).jobTitle || "",
        companyName: (user as any).companyName || "",
      });
      setSaved(false);
    }
  }, [open, user]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          mobileNumber: form.mobileNumber.trim() || undefined,
          jobTitle: form.jobTitle.trim() || undefined,
          companyName: form.companyName.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await queryClient.invalidateQueries();
      setSaved(true);
      toast({ title: "Profile updated!", description: "Your details have been saved." });
      setTimeout(() => { onClose(); }, 1000);
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative z-10 w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border/60 overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border/50 bg-secondary/30 flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Edit Profile</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Update your personal & professional details</p>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: User, label: "First Name", field: "firstName" as const, placeholder: "Ali" },
                  { icon: User, label: "Last Name", field: "lastName" as const, placeholder: "Khan" },
                ].map(({ icon: Icon, label, field, placeholder }) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold mb-1.5 text-foreground">
                      <Icon className="inline h-3.5 w-3.5 mr-1 text-primary" />
                      {label}
                    </label>
                    <input
                      value={form[field]}
                      onChange={set(field)}
                      placeholder={placeholder}
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm text-foreground"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-foreground">
                  <Phone className="inline h-3.5 w-3.5 mr-1 text-primary" />
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={form.mobileNumber}
                  onChange={set("mobileNumber")}
                  placeholder="+92 300 1234567"
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-foreground">
                  <Briefcase className="inline h-3.5 w-3.5 mr-1 text-primary" />
                  Job Title / Designation
                </label>
                <input
                  value={form.jobTitle}
                  onChange={set("jobTitle")}
                  placeholder="e.g. Senior Engineer, Product Manager"
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-foreground">
                  <Building2 className="inline h-3.5 w-3.5 mr-1 text-primary" />
                  Company / Organisation
                </label>
                <input
                  value={form.companyName}
                  onChange={set("companyName")}
                  placeholder="e.g. Habib Bank, Mari Petroleum, PTCL"
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm text-foreground"
                />
              </div>

              {(form.jobTitle || form.companyName) && (
                <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">
                    {[form.jobTitle, form.companyName].filter(Boolean).join(" · ")}
                  </span>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3 flex-shrink-0 border-t border-border/50 pt-4">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl shadow-md shadow-primary/20"
                onClick={handleSave}
                disabled={saving || saved}
              >
                {saved ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" /> Saved!
                  </span>
                ) : saving ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : (
                  "Save Profile"
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
