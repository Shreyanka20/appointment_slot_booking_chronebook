import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, User, LogOut, Shield } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group" data-testid="nav-logo">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-200">
            <Calendar size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold text-slate-900 tracking-tight">ChronoBook</span>
        </Link>
        <nav className="flex items-center gap-2">
          {!user && (
            <>
              <Link
                to="/login"
                data-testid="nav-login"
                className="text-sm font-medium text-slate-600 px-4 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Log in
              </Link>
              <Link to="/register" data-testid="nav-register" className="nb-btn text-sm px-5 py-2.5">
                Sign up
              </Link>
            </>
          )}
          {user && (
            <>
              <NotificationBell />
              <Link
                to="/dashboard"
                data-testid="nav-dashboard"
                className="text-sm font-medium text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <User size={16} /> Dashboard
              </Link>
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  data-testid="nav-admin"
                  className="text-sm font-medium text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                >
                  <Shield size={16} /> Admin
                </Link>
              )}
              <button
                onClick={async () => { await logout(); navigate("/"); }}
                data-testid="nav-logout"
                className="nb-btn nb-btn-secondary text-sm px-4 py-2 flex items-center gap-1.5"
              >
                <LogOut size={15} /> Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
