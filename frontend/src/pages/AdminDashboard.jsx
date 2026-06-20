import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { Users, Calendar, CheckCircle2, Layers } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    (async () => {
      const [s, u, b] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
        api.get("/admin/bookings"),
      ]);
      setStats(s.data); setUsers(u.data); setBookings(b.data);
    })();
  }, []);

  return (
    <div className="page-shell">
      <Navbar />
      <main className="app-container py-6 sm:py-10" data-testid="admin-root">
        <div className="mb-6 sm:mb-8">
          <p className="text-sm text-stone-500 mb-1">Admin</p>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900">Control Room</h1>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
            {[
              { icon: <Users />, label: "Users", value: stats.users, bg: "bg-orange-100 text-orange-600" },
              { icon: <Calendar />, label: "Bookings", value: stats.bookings, bg: "bg-amber-100 text-amber-700" },
              { icon: <CheckCircle2 />, label: "Confirmed", value: stats.confirmed_bookings, bg: "bg-emerald-100 text-emerald-600" },
              { icon: <Layers />, label: "Meeting Types", value: stats.meeting_types, bg: "bg-yellow-100 text-yellow-700" },
            ].map((s, i) => (
              <div key={i} className="nb-card p-4 sm:p-5" data-testid={`stat-${s.label.toLowerCase()}`}>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${s.bg} mb-2 sm:mb-3 flex items-center justify-center`}>{s.icon}</div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-stone-900">{s.value}</div>
                <div className="text-xs text-stone-500 font-medium mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <h2 className="font-display text-xl sm:text-2xl font-extrabold mb-3">All Users</h2>
        <div className="nb-card overflow-x-auto mb-8 sm:mb-10 -mx-1">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="bg-stone-800 text-white">
                <th className="text-left p-3 text-xs font-semibold">Name</th>
                <th className="text-left p-3 text-xs font-semibold">Email</th>
                <th className="text-left p-3 text-xs font-semibold">Username</th>
                <th className="text-left p-3 text-xs font-semibold">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-t border-stone-100 hover:bg-stone-50" data-testid={`user-row-${u.user_id}`}>
                  <td className="p-3 font-medium text-stone-900">{u.name}</td>
                  <td className="p-3 text-stone-600">{u.email}</td>
                  <td className="p-3 text-stone-600">{u.username}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === "admin" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-800"}`}>{u.role}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="font-display text-xl sm:text-2xl font-extrabold mb-3">All Bookings</h2>
        <div className="nb-card overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-stone-800 text-white">
                <th className="text-left p-3 text-xs font-semibold">When</th>
                <th className="text-left p-3 text-xs font-semibold">Host</th>
                <th className="text-left p-3 text-xs font-semibold">Invitee</th>
                <th className="text-left p-3 text-xs font-semibold">Type</th>
                <th className="text-left p-3 text-xs font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.booking_id} className="border-t border-stone-100 hover:bg-stone-50" data-testid={`booking-row-${b.booking_id}`}>
                  <td className="p-3 text-stone-600 whitespace-nowrap">{new Date(b.start_iso).toLocaleString()}</td>
                  <td className="p-3 font-medium">{b.host_name}</td>
                  <td className="p-3">{b.invitee_name}<br/><span className="text-xs text-stone-500">{b.invitee_email}</span></td>
                  <td className="p-3">{b.meeting_title} ({b.duration_min}m)</td>
                  <td className="p-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${b.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
