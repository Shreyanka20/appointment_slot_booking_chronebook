import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, User, LogOut, Shield, Menu, X } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  const handleLogout = async () => {
    closeMobile();
    await logout();
    navigate("/");
  };

  const navLinkClass =
    "text-sm font-medium text-stone-600 px-3 py-2 rounded-lg hover:text-stone-900 hover:bg-orange-50 transition-colors flex items-center gap-1.5";

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200/80">
      <div className="app-container h-14 sm:h-16 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0" data-testid="nav-logo" onClick={closeMobile}>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-sm shadow-orange-200">
            <Calendar size={16} className="text-white sm:hidden" strokeWidth={2.5} />
            <Calendar size={18} className="text-white hidden sm:block" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg sm:text-xl font-bold text-stone-900 tracking-tight">ChronoBook</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {!user && (
            <>
              <Link to="/login" data-testid="nav-login" className={navLinkClass}>Log in</Link>
              <Link to="/register" data-testid="nav-register" className="nb-btn text-sm px-4 lg:px-5 py-2 lg:py-2.5">Sign up</Link>
            </>
          )}
          {user && (
            <>
              <NotificationBell />
              <Link to="/dashboard" data-testid="nav-dashboard" className={navLinkClass}>
                <User size={16} /> Dashboard
              </Link>
              {user.role === "admin" && (
                <Link to="/admin" data-testid="nav-admin" className={navLinkClass}>
                  <Shield size={16} /> Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                data-testid="nav-logout"
                className="nb-btn nb-btn-secondary text-sm px-3 lg:px-4 py-2 flex items-center gap-1.5"
              >
                <LogOut size={15} /> Logout
              </button>
            </>
          )}
        </nav>

        {/* Mobile toggle */}
        <div className="flex md:hidden items-center gap-1">
          {user && <NotificationBell />}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="p-2 rounded-lg text-stone-700 hover:bg-orange-50 transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-stone-100 bg-white/95 backdrop-blur-md">
          <nav className="app-container py-3 flex flex-col gap-1">
            {!user && (
              <>
                <Link to="/login" data-testid="nav-login-mobile" className={navLinkClass} onClick={closeMobile}>Log in</Link>
                <Link to="/register" data-testid="nav-register-mobile" className="nb-btn text-sm w-full mt-1" onClick={closeMobile}>Sign up</Link>
              </>
            )}
            {user && (
              <>
                <Link to="/dashboard" className={navLinkClass} onClick={closeMobile}>
                  <User size={16} /> Dashboard
                </Link>
                {user.role === "admin" && (
                  <Link to="/admin" className={navLinkClass} onClick={closeMobile}>
                    <Shield size={16} /> Admin
                  </Link>
                )}
                <button onClick={handleLogout} className="nb-btn nb-btn-secondary text-sm w-full mt-1 flex items-center justify-center gap-1.5">
                  <LogOut size={15} /> Logout
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
