import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Bell } from "lucide-react";

export default function NotificationBell({ variant = "default" }) {
  const isHost = variant === "host";
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const r = await api.get("/notifications");
      setItems(r.data.notifications || []);
      setUnread(r.data.unread_count || 0);
    } catch {}
  }, [user]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const markAll = async () => {
    await api.post("/notifications/read-all");
    load();
  };

  const markOne = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative p-2 rounded-lg transition-colors ${
          isHost
            ? "text-slate-600 hover:bg-indigo-50 hover:text-host-primary"
            : "text-stone-600 hover:bg-stone-100"
        }`}
        aria-label="Notifications"
        data-testid="nav-notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center ${
            isHost ? "bg-host-primary" : "bg-orange-600"
          }`}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className={`absolute right-0 mt-2 w-80 rounded-xl shadow-xl z-50 overflow-hidden ${
          isHost ? "bg-host-card border border-slate-200" : "bg-white border border-stone-200"
        }`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${isHost ? "border-slate-200" : "border-stone-100"}`}>
            <span className={`font-semibold text-sm ${isHost ? "text-host-text" : "text-stone-900"}`}>Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAll}
                className={`text-xs font-medium hover:underline ${isHost ? "text-host-primary" : "text-orange-600"}`}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className={`p-4 text-sm text-center ${isHost ? "text-slate-500" : "text-stone-500"}`}>No notifications yet</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.notification_id}
                  onClick={() => { markOne(n.notification_id); setOpen(false); }}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-slate-50 ${
                    isHost ? "border-slate-100" : "border-slate-50 hover:bg-stone-50"
                  } ${!n.read ? (isHost ? "bg-indigo-50/60" : "bg-orange-50/50") : ""}`}
                >
                  <div className={`text-sm font-medium ${isHost ? "text-host-text" : "text-stone-900"}`}>{n.title}</div>
                  <div className={`text-xs mt-0.5 ${isHost ? "text-slate-500" : "text-stone-500"}`}>{n.message}</div>
                </button>
              ))
            )}
          </div>
          <Link
            to="/dashboard"
            onClick={() => setOpen(false)}
            className={`block text-center text-xs py-3 font-medium hover:bg-slate-50 ${
              isHost ? "text-host-primary" : "text-orange-600 hover:bg-stone-50"
            }`}
          >
            View dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
