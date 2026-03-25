import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Car, Menu, X, LogOut, User as UserIcon, ChevronDown,
  Bell, Edit3, Users2, Settings, Share2, Trash2, AlertTriangle,
  Download, Clock, LayoutDashboard, PlusCircle, Search, Shield,
} from "lucide-react";
import { PuzzleLogo } from "@/components/PuzzleLogo";
import { useAuth } from "@workspace/replit-auth-web";
import { motion, AnimatePresence } from "framer-motion";
import ProfileModal from "@/components/ProfileModal";
import { useNotifications, NotificationsDrawer } from "@/components/NotificationsDrawer";
import CommunityCovenantModal from "@/components/CommunityCovenantModal";
import HandshakeModal from "@/components/HandshakeModal";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

interface CoTraveler {
  id: string;
  name: string;
  jobTitle?: string;
  company?: string;
  image?: string;
  route: string;
  role: string;
}

function profileCompletion(user: any): number {
  const fields = [user?.firstName, user?.lastName, user?.mobileNumber, user?.jobTitle, user?.companyName];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export function Navbar() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [covenantOpen, setCovenantOpen] = useState(false);
  const [handshakeData, setHandshakeData] = useState<{ partnerName: string; whatsappUrl: string } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [coTravelers, setCoTravelers] = useState<CoTraveler[]>([]);
  const [allCoTravelerIds, setAllCoTravelerIds] = useState<Set<string>>(new Set());
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const notif = useNotifications(isAuthenticated);

  const userAny = user as any;
  const navLinks = isAuthenticated
    ? [
        { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { name: "Host a Journey", path: "/offer-ride", icon: PlusCircle },
        { name: "Request a Journey", path: "/find-rides", icon: Search },
        ...(userAny?.isSovereign ? [{ name: "Admin", path: "/admin", icon: Shield }] : []),
      ]
    : [{ name: "Home", path: "/", icon: Car }];

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Profile"
    : "Profile";

  const pct = user ? profileCompletion(user) : 0;

  useEffect(() => {
    if (!isAuthenticated || !dropdownOpen) return;
    fetch("/api/co-travelers", { credentials: "include" })
      .then(r => r.ok ? r.json() : { coTravelers: [] })
      .then(d => setCoTravelers((d.coTravelers || []).slice(0, 4)))
      .catch(() => {});
  }, [isAuthenticated, dropdownOpen]);

  /* Fetch all co-traveler IDs when authenticated — powers the "Travelled Together" badges */
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/co-travelers", { credentials: "include" })
      .then(r => r.ok ? r.json() : { coTravelers: [] })
      .then(d => setAllCoTravelerIds(new Set((d.coTravelers || []).map((ct: any) => ct.id as string))))
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); setCanInstall(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  /* Show Community Covenant to newly-logged-in users who haven't accepted yet */
  useEffect(() => {
    if (isAuthenticated && (user as any)?.profileComplete && !(user as any)?.covenantAccepted) {
      setCovenantOpen(true);
    }
  }, [isAuthenticated, (user as any)?.profileComplete, (user as any)?.covenantAccepted]);

  /* When a handshake fires from NotificationsDrawer, open the HandshakeModal */
  useEffect(() => {
    if (notif.lastHandshake) {
      setHandshakeData(notif.lastHandshake);
      notif.clearHandshake();
    }
  }, [notif.lastHandshake]);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setCanInstall(false);
    setInstallPrompt(null);
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const openProfile = () => { setDropdownOpen(false); setMobileMenuOpen(false); setProfileModalOpen(true); };
  const openNotifPanel = () => { notif.markSeen(); setNotifOpen(true); };
  const handleLogout = () => { setDropdownOpen(false); setMobileMenuOpen(false); logout(); };
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/auth/account", { method: "DELETE", credentials: "include" });
      if (res.ok) {
        window.location.href = "/";
      }
    } catch { /* silent */ } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full navbar-dark" style={{ background: "#0B132B", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 md:h-20 items-center justify-between">

            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center group" style={{ display:"flex", alignItems:"center", gap:9, textDecoration:"none" }}>
                <PuzzleLogo size={30} />
                <span style={{ fontFamily:"'Playfair Display', Merriweather, Georgia, serif", fontSize:26, fontWeight:800, letterSpacing:"-0.01em", lineHeight:1, userSelect:"none" }}>
                  <span style={{ color:"#FFFFFF" }}>Sync</span><span style={{ color:"#BDC3C7" }}>In</span>
                </span>
              </Link>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      location === link.path
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop Right — Bell + Account */}
            <div className="hidden md:flex items-center gap-2">
              {isLoading ? (
                <div className="h-10 w-36 animate-pulse rounded-lg bg-secondary" />
              ) : isAuthenticated && user ? (
                <>
                  {/* Bell */}
                  <button
                    onClick={openNotifPanel}
                    className="relative h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                    title="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {notif.badgeCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex min-w-[1.1rem] items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 shadow-sm" style={{ height: "1.1rem" }}>
                        {notif.badgeCount > 99 ? "99+" : notif.badgeCount}
                      </span>
                    )}
                  </button>

                  {/* Account dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen(o => !o)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border/50 hover:border-primary/40 transition-all"
                    >
                      {user.profileImage ? (
                        <img src={user.profileImage} alt={displayName} className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className="text-left hidden lg:block">
                        <div className="text-sm font-semibold leading-none text-foreground">{displayName}</div>
                        {(user as any).jobTitle && (
                          <div className="text-xs text-muted-foreground leading-none mt-0.5 truncate max-w-[120px]">
                            {(user as any).jobTitle}
                          </div>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-80 bg-card rounded-2xl border border-border/60 shadow-2xl overflow-hidden z-50"
                        >
                          {/* Header: avatar + name */}
                          <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-gradient-to-br from-primary/8 to-transparent">
                            {user.profileImage ? (
                              <img src={user.profileImage} alt={displayName}
                                className="h-12 w-12 rounded-xl object-cover flex-shrink-0 border-2 border-white shadow-sm" />
                            ) : (
                              <div className="h-12 w-12 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
                                <UserIcon className="h-6 w-6 text-primary" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">{displayName}</p>
                              {((user as any).jobTitle || (user as any).companyName) && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {[(user as any).jobTitle, (user as any).companyName].filter(Boolean).join(" · ")}
                                </p>
                              )}
                              {user.username && (
                                <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{user.username}</p>
                              )}
                            </div>
                          </div>

                          {/* Profile completion bar */}
                          <div className="px-4 py-3 border-b border-border/50">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-foreground">Profile {pct}% Complete</span>
                              <button
                                onClick={openProfile}
                                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                              >
                                <Edit3 className="h-3 w-3" />
                                Edit
                              </button>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${pct}%`,
                                  background: pct === 100
                                    ? "linear-gradient(90deg,#1E3A8A,#3B82F6)"
                                    : pct >= 60
                                    ? "linear-gradient(90deg,#3B82F6,#60a5fa)"
                                    : "linear-gradient(90deg,#f59e0b,#fbbf24)",
                                }}
                              />
                            </div>
                          </div>

                          {/* Co-Travelers */}
                          <div className="border-b border-border/50">
                            <div className="flex items-center justify-between px-4 pt-3 pb-2">
                              <div className="flex items-center gap-1.5">
                                <Users2 className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Co-Travelers
                                </span>
                              </div>
                            </div>
                            {coTravelers.length === 0 ? (
                              <p className="text-xs text-muted-foreground px-4 pb-3">
                                No past co-travelers yet. Share a journey to start connecting.
                              </p>
                            ) : (
                              <div className="px-4 pb-3 space-y-2">
                                {coTravelers.map(ct => (
                                  <div key={ct.id} className="flex items-center gap-2.5">
                                    {ct.image ? (
                                      <img src={ct.image} alt={ct.name}
                                        className="h-8 w-8 rounded-full object-cover flex-shrink-0 border border-border" />
                                    ) : (
                                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                                        <UserIcon className="h-4 w-4 text-primary" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-foreground truncate">{ct.name}</p>
                                      <p className="text-[11px] text-muted-foreground truncate">
                                        {ct.jobTitle || ct.company || ct.route}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Account Settings */}
                          <div className="border-b border-border/50 px-4 py-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Settings className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Account Settings
                              </span>
                            </div>
                            {user.username && (
                              <p className="text-xs text-foreground font-medium truncate">{user.username}</p>
                            )}
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <LinkedInIcon className="h-3.5 w-3.5 text-[#0A66C2]" />
                              <span className="text-xs text-muted-foreground">Connected via LinkedIn</span>
                            </div>
                          </div>

                          {/* Invite a Colleague */}
                          <div className="border-b border-border/50 px-4 py-3">
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(`I'm using SyncIn Club — Pakistan's professional journey-sharing network for executives!\n\nJoin me and start sharing commutes with verified professionals: ${window.location.origin}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2.5 w-full py-2.5 px-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-px"
                              style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}
                            >
                              <Share2 className="h-4 w-4 flex-shrink-0" />
                              Invite a Colleague via WhatsApp
                            </a>
                          </div>

                          {/* Install App */}
                          {canInstall && (
                            <div className="border-b border-border/50 px-4 py-3">
                              <button
                                onClick={handleInstallApp}
                                className="flex items-center gap-2.5 w-full py-2.5 px-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                                style={{ background: "linear-gradient(135deg,#1E3A8A,#3B82F6)" }}
                              >
                                <Download className="h-4 w-4 flex-shrink-0" />
                                Install App on Device
                              </button>
                            </div>
                          )}

                          {/* Logout */}
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left border-t border-border/50"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                          </button>
                          <button
                            onClick={() => { setDropdownOpen(false); setDeleteConfirmOpen(true); }}
                            className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Account
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <button
                  onClick={login}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 shadow-md"
                  style={{ background: "#0A66C2", boxShadow: "0 4px 14px rgba(10,102,194,0.30)" }}
                >
                  <LinkedInIcon className="h-4 w-4" />
                  Continue with LinkedIn
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="-mr-2 flex md:hidden items-center gap-2">
              {isAuthenticated && (
                <button
                  onClick={openNotifPanel}
                  className="relative h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all"
                >
                  <Bell className="h-5 w-5" />
                  {notif.badgeCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5 shadow-sm">
                      {notif.badgeCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-b border-border overflow-hidden" style={{ background:"#FFFFFF" }}
            >
              {/* ── Page Links ── */}
              <div className="space-y-1 px-4 pb-3 pt-3">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.name}
                      href={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                        location === link.path
                          ? "bg-primary text-white"
                          : "text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {link.name}
                    </Link>
                  );
                })}
              </div>

              {/* ── Quick Actions (auth only) ── */}
              {isAuthenticated && (
                <div className="border-t border-border px-4 py-3 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                    Quick Actions
                  </p>
                  <button
                    onClick={() => { setMobileMenuOpen(false); openNotifPanel(); }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <Bell className="h-4 w-4 text-primary flex-shrink-0" />
                    Notifications
                    {notif.badgeCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1">
                        {notif.badgeCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); openNotifPanel(); }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                    Journey History
                  </button>
                  <button
                    onClick={openProfile}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <UserIcon className="h-4 w-4 text-primary flex-shrink-0" />
                    Profile
                  </button>
                  {canInstall && (
                    <button
                      onClick={handleInstallApp}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                      style={{ background: "linear-gradient(135deg,#1E3A8A,#3B82F6)" }}
                    >
                      <Download className="h-4 w-4 flex-shrink-0" />
                      Install App
                    </button>
                  )}
                </div>
              )}

              {/* ── User / Auth Section ── */}
              <div className="border-t border-border pb-5 pt-4 px-5">
                {isLoading ? (
                  <div className="h-10 w-full animate-pulse rounded-xl bg-secondary" />
                ) : isAuthenticated && user ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      {user.profileImage ? (
                        <img src={user.profileImage} alt={displayName} className="h-11 w-11 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                          <UserIcon className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <div className="text-base font-semibold text-foreground">{displayName}</div>
                        {(user as any).jobTitle && (
                          <div className="text-xs text-muted-foreground">{(user as any).jobTitle}</div>
                        )}
                      </div>
                    </div>

                    {/* Profile % on mobile */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">Profile {pct}% Complete</span>
                        <button onClick={openProfile} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                          <Edit3 className="h-3 w-3" /> Edit
                        </button>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: "linear-gradient(90deg,#1E3A8A,#3B82F6)",
                          }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                    <button
                      onClick={() => { setMobileMenuOpen(false); setDeleteConfirmOpen(true); }}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { setMobileMenuOpen(false); login(); }}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: "#0A66C2" }}
                    >
                      <LinkedInIcon className="h-5 w-5" />
                      Continue with LinkedIn
                    </button>
                    <p className="text-center text-xs text-muted-foreground">Verified professionals only.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Notifications Drawer — rendered globally so it overlays any page */}
      <NotificationsDrawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        incoming={notif.incoming}
        outgoing={notif.outgoing}
        myRides={notif.myRides}
        activeMyRides={notif.activeMyRides}
        pendingIncoming={notif.pendingIncoming}
        processing={notif.processing}
        localAccepted={notif.localAccepted}
        localCancelledRequests={notif.localCancelledRequests}
        onAccept={notif.accept}
        onIgnore={notif.ignore}
        onCancelJourney={notif.cancelJourney}
        onCancelRequest={notif.cancelRequest}
        coTravelerIds={allCoTravelerIds}
      />

      {/* Profile editing modal */}
      <ProfileModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

      {/* Community Covenant — must accept before accessing Dashboard */}
      <CommunityCovenantModal
        open={covenantOpen}
        onAccepted={() => setCovenantOpen(false)}
      />

      {/* Handshake celebration modal — fires on mutual connection */}
      {handshakeData && (
        <HandshakeModal
          open={Boolean(handshakeData)}
          partnerName={handshakeData.partnerName}
          whatsappUrl={handshakeData.whatsappUrl}
          onClose={() => setHandshakeData(null)}
        />
      )}

      {/* Delete Account Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirmOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !deleteLoading && setDeleteConfirmOpen(false)}
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="fixed inset-0 z-[101] flex items-center justify-center px-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-red-50 border-2 border-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Delete Account?</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      This will permanently delete your account, all your hosted journeys, and all your connection requests. This action <strong>cannot be undone</strong>.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 w-full pt-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {deleteLoading ? (
                        <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting…</>
                      ) : (
                        <><Trash2 className="h-4 w-4" /> Yes, Delete My Account</>
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmOpen(false)}
                      disabled={deleteLoading}
                      className="w-full py-3.5 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-secondary transition-colors disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
