import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Briefcase, Search, Users, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export type NetworkingModalType = "job-offer" | "job-seeker" | "connect";

interface NetworkingModalProps {
  type: NetworkingModalType | null;
  onClose: () => void;
}

const CONFIG = {
  "job-offer": {
    icon: Briefcase,
    title: "I Have a Job to Offer",
    subtitle: "Post an opportunity for your professional community",
    color: "text-primary",
    bg: "bg-primary/10",
    fields: [
      { key: "jobTitle", label: "Job Title", placeholder: "e.g. Senior Software Engineer", type: "text" },
      { key: "company", label: "Company / Organization", placeholder: "e.g. Mari Petroleum, HBL, PTCL", type: "text" },
      { key: "description", label: "Role Description", placeholder: "Brief description of the role, key responsibilities, and requirements...", type: "textarea" },
    ],
    disclaimer: "This opportunity will be visible to verified SyncIn Co-Travelers in your community.",
    successTitle: "Opportunity Posted!",
    successDesc: "Your job posting is now visible to verified SyncIn professionals.",
  },
  "job-seeker": {
    icon: Search,
    title: "I Am Looking for a Job",
    subtitle: "Let the community know you're open to opportunities",
    color: "text-primary",
    bg: "bg-primary/10",
    fields: [
      { key: "industry", label: "Target Industry", placeholder: "e.g. Energy, Banking, Technology, FMCG", type: "text" },
      { key: "role", label: "Desired Role", placeholder: "e.g. Product Manager, Finance Analyst", type: "text" },
      { key: "value", label: "What I Bring to the Table", placeholder: "Briefly describe your experience, skills, and what makes you stand out...", type: "textarea" },
    ],
    disclaimer: "This will be visible to verified SyncIn Co-Travelers who may refer or recommend you.",
    successTitle: "Profile Broadcast!",
    successDesc: "Your job search intent is now visible to the SyncIn professional community.",
  },
  "connect": {
    icon: Users,
    title: "I Want to Connect",
    subtitle: "Broadcast your networking intent to co-travelers",
    color: "text-primary",
    bg: "bg-primary/10",
    fields: [
      { key: "target", label: "Who Are You Looking For?", placeholder: "e.g. HR Manager, Project Lead, Data Scientist", type: "text" },
      { key: "department", label: "Company / Department", placeholder: "e.g. Mari Petroleum Engineering, HBL Risk Department", type: "text" },
    ],
    disclaimer: "This will be visible to verified SyncIn Co-Travelers who match your networking criteria.",
    successTitle: "Connection Broadcast!",
    successDesc: "Your networking intent has been shared with the SyncIn community.",
  },
};

export default function NetworkingModal({ type, onClose }: NetworkingModalProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const config = type ? CONFIG[type] : null;
  const Icon = config?.icon ?? Briefcase;

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!config) return;
    const missing = config.fields.find(f => !values[f.key]?.trim());
    if (missing) {
      toast({
        title: "Field required",
        description: `Please fill in: ${missing.label}`,
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    setLoading(false);
    setSubmitted(true);
  };

  const handleClose = () => {
    setValues({});
    setSubmitted(false);
    setLoading(false);
    onClose();
  };

  if (!type || !config) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 24 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative z-10 w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border/60 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-border/50 bg-secondary/30">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-snug">{config.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{config.subtitle}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground ml-2 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!submitted ? (
            <div className="p-6 space-y-4">
              {/* Fields */}
              {config.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-semibold mb-1.5">
                    {field.label} <span className="text-destructive">*</span>
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      rows={3}
                      placeholder={field.placeholder}
                      value={values[field.key] || ""}
                      onChange={e => handleChange(field.key, e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-sm transition-all resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={values[field.key] || ""}
                      onChange={e => handleChange(field.key, e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-sm transition-all"
                    />
                  )}
                </div>
              ))}

              {/* Disclaimer */}
              <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-xl p-3">
                <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{config.disclaimer}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl shadow-md shadow-primary/20"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Posting...
                    </span>
                  ) : (
                    "Post to Community"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center space-y-5">
              <div className="flex items-center justify-center">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">{config.successTitle}</h3>
                <p className="text-muted-foreground text-sm">{config.successDesc}</p>
              </div>
              <div className="bg-secondary/50 rounded-2xl p-4 text-left space-y-2">
                {config.fields.map(field => (
                  <div key={field.key} className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">{field.label}</span>
                    <span className="text-sm font-semibold">{values[field.key]}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full rounded-xl" onClick={handleClose}>
                Done
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
