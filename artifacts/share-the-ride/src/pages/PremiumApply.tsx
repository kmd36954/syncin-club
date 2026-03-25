import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Briefcase, ArrowLeft, ChevronRight } from "lucide-react";
import { useLocation, useSearch } from "wouter";

export default function PremiumApply() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const tier = params.get("tier") || "sovereign";
  const isSovereign = tier === "sovereign";
  const [, setLocation] = useLocation();

  const accentColor = isSovereign ? "#C9A84C" : "#A8B2BF";
  const Icon = isSovereign ? Crown : Briefcase;
  const tierLabel = isSovereign ? "Sovereign — First Class" : "Business Class";
  const formTitle = isSovereign ? "Sovereign Admissions" : "Business Class Admissions";

  const [form, setForm] = useState({
    name: "",
    email: "",
    designation: "",
    company: "",
    linkedin: "",
    invitationCode: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.designation || !form.company || !form.linkedin) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 900));
    setLocation(`/application-received?tier=${tier}`);
  };

  const requiredFields = [
    { key: "name", label: "Full Name", placeholder: "Your full name", type: "text", required: true },
    { key: "email", label: "Corporate Email", placeholder: "you@company.com.pk", type: "email", required: true },
    { key: "designation", label: "Designation", placeholder: "e.g. VP Finance, Managing Director", type: "text", required: true },
    { key: "company", label: "Company / Organisation", placeholder: "e.g. OGDCL, HBL, Nestle Pakistan", type: "text", required: true },
    { key: "linkedin", label: "LinkedIn Profile URL", placeholder: "https://linkedin.com/in/yourname", type: "url", required: true },
  ];

  return (
    <div className="min-h-screen bg-[#0D0F14] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full blur-[100px] pointer-events-none"
        style={{ background: `${accentColor}08` }} />

      <div className="relative z-10 w-full max-w-md">

        {/* Back */}
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-[#6B7280] hover:text-white transition-colors mb-8 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Terminal
        </button>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-[#131720] border rounded-2xl p-8"
          style={{ borderColor: `${accentColor}30` }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center"
              style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
              <Icon className="h-5 w-5" style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: accentColor }}>
                {tierLabel}
              </p>
              <h1 className="text-white text-lg font-bold" style={{ fontFamily: "'Georgia', serif" }}>
                {formTitle}
              </h1>
            </div>
          </div>

          <div className="w-full h-px mb-8" style={{ background: `linear-gradient(90deg, ${accentColor}40, transparent)` }} />

          <form onSubmit={handleSubmit} className="space-y-5">
            {requiredFields.map(field => (
              <div key={field.key}>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: accentColor }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => handleChange(field.key, e.target.value)}
                  required={field.required}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[#3D4451] bg-[#0D0F14] border border-[#2A2F3D] focus:outline-none transition-all"
                  style={{ borderColor: form[field.key as keyof typeof form] ? `${accentColor}40` : undefined }}
                  onFocus={e => e.target.style.borderColor = `${accentColor}60`}
                  onBlur={e => e.target.style.borderColor = form[field.key as keyof typeof form] ? `${accentColor}40` : "#2A2F3D"}
                />
              </div>
            ))}

            {/* Invitation Code — optional */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: `${accentColor}80` }}>
                Priority Invitation Code{" "}
                <span className="normal-case tracking-normal font-normal text-[#3D4451]">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="Enter code if you have one"
                value={form.invitationCode}
                onChange={e => handleChange("invitationCode", e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[#3D4451] bg-[#0D0F14] border border-[#2A2F3D] focus:outline-none transition-all"
                style={{ borderColor: form.invitationCode ? `${accentColor}40` : undefined }}
                onFocus={e => e.target.style.borderColor = `${accentColor}60`}
                onBlur={e => e.target.style.borderColor = form.invitationCode ? `${accentColor}40` : "#2A2F3D"}
              />
            </div>

            <div className="pt-2">
              <p className="text-[#3D4451] text-xs mb-5 leading-relaxed">
                Applications are reviewed by the SyncIn Admissions Board. You will be notified at your corporate email upon a decision.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: submitting ? `${accentColor}30` : `${accentColor}20`,
                  border: `1px solid ${accentColor}50`,
                  color: accentColor,
                }}
                onMouseEnter={e => { if (!submitting) (e.target as HTMLButtonElement).style.background = `${accentColor}30`; }}
                onMouseLeave={e => { if (!submitting) (e.target as HTMLButtonElement).style.background = `${accentColor}20`; }}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: accentColor, borderTopColor: "transparent" }} />
                    Submitting Application...
                  </span>
                ) : (
                  <>
                    Submit Application
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
