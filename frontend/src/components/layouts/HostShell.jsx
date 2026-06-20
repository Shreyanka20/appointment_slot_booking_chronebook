import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import {
  LayoutDashboard, Calendar, Zap, Clock, Settings, LogOut,
  Menu, X, ExternalLink, Copy, Check, Link as LinkIcon,
} from "lucide-react";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "meetings", label: "Bookings", icon: Calendar },
  { id: "types", label: "Meeting types", icon: Zap },
  { id: "availability", label: "Availability", icon: Clock },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function HostShell({
  user,
  activeTab,
  onTabChange,
  bookingUrl,
  linkCopied,
  onCopyLink,
  upcomingCount = 0,
  children,
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const NavItem = ({ id, label, icon: Icon, badge }) => (
    <button
      type="button"
      onClick={() => { onTabChange(id); setSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        activeTab === id
          ? "bg-white/20 text-white shadow-md shadow-indigo-900/20"
          : "text-indigo-200 hover:text-white hover:bg-white/10"
      }`}
    >
      <Icon size={18} strokeWidth={2} />
      <span className="flex-1 text-left">{label}</span>
      {badge > 0 && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          activeTab === id ? "bg-white/25 text-white" : "bg-white/15 text-indigo-100"
        }`}>
          {badge}
        </span>
      )}
    </button>
  );

  const sidebar = (
    <div className="flex flex-col h-full host-hero-gradient">
      <div className="h-16 shrink-0 flex items-center px-5 border-b border-white/15">
        <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center ring-1 ring-white/30">
            <Calendar size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-bold text-white text-sm">ChronoBook</div>
            <div className="text-[10px] text-indigo-200 uppercase tracking-widest">Host console</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(({ id, label, icon }) => (
          <NavItem
            key={id}
            id={id}
            label={label}
            icon={icon}
            badge={id === "meetings" ? upcomingCount : 0}
          />
        ))}
      </nav>

      <div className="p-4 border-t border-white/15 space-y-3">
        <div className="rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-200 mb-2">Your link</p>
          <p className="text-xs text-white/90 font-mono truncate mb-2" data-testid="dashboard-booking-link">{bookingUrl}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCopyLink}
              data-testid="copy-link-button"
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-white text-host-primary hover:bg-indigo-50 transition-colors"
            >
              {linkCopied ? <Check size={12} /> : <Copy size={12} />}
              {linkCopied ? "Copied" : "Copy"}
            </button>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-2 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 rounded-full bg-white/20 ring-2 ring-white/30 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-indigo-200 truncate">@{user?.username}</p>
          </div>
          <button
            type="button"
            onClick={async () => { await logout(); navigate("/"); }}
            data-testid="nav-logout"
            className="p-2 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-host-bg flex overflow-hidden" data-testid="dashboard-root">
      <aside className="hidden lg:flex w-72 shrink-0 h-full flex-col overflow-hidden shadow-xl shadow-indigo-200/40">
        {sidebar}
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-host-text/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] h-full shadow-2xl">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white"
            >
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <header className="shrink-0 z-30 bg-host-card border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Host workspace</p>
              <h1 className="font-display font-bold text-host-text truncate text-sm sm:text-base">
                {NAV.find((n) => n.id === activeTab)?.label || "Dashboard"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <NotificationBell variant="host" />
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-host-primary bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              <LinkIcon size={14} />
              <span className="hidden sm:inline">View booking page</span>
              <span className="sm:hidden">Booking page</span>
            </a>
          </div>
        </header>

        <main className="flex-1 min-h-0 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden text-host-text">
          {children}
        </main>
      </div>
    </div>
  );
}
