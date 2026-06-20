import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Bell } from "lucide-react";

export default function NotificationBell() {
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
        className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600"
        aria-label="Notifications"
        data-testid="nav-notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-semibold text-sm text-slate-900">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-indigo-600 font-medium hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">No notifications yet</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.notification_id}
                  onClick={() => { markOne(n.notification_id); setOpen(false); }}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 ${!n.read ? "bg-indigo-50/50" : ""}`}
                >
                  <div className="text-sm font-medium text-slate-900">{n.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{n.message}</div>
                </button>
              ))
            )}
          </div>
          <Link to="/dashboard" onClick={() => setOpen(false)} className="block text-center text-xs text-indigo-600 py-3 hover:bg-slate-50 font-medium">
            View dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
