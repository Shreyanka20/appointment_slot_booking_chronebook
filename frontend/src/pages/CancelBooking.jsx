import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { XCircle } from "lucide-react";

export default function CancelBooking() {
  const { bookingId } = useParams();
  const [search] = useSearchParams();
  const token = search.get("token");
  const [booking, setBooking] = useState(null);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token) { setErr("Invalid cancellation link"); return; }
    api.get(`/bookings/${bookingId}`, { params: { token } })
      .then((r) => setBooking(r.data))
      .catch(() => setErr("Booking not found"));
  }, [bookingId, token]);

  const cancel = async () => {
    try {
      await api.post(`/bookings/${bookingId}/cancel`, { token });
      setDone(true);
    } catch (e) {
      setErr(e.response?.data?.detail || "Could not cancel");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-md mx-auto px-6 py-16">
        <div className="nb-card p-8 text-center">
          {done ? (
            <>
              <XCircle size={48} className="text-red-500 mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold mb-2">Booking cancelled</h1>
              <p className="text-slate-500 text-sm mb-6">Both parties have been notified by email.</p>
              <Link to="/" className="nb-btn">Back home</Link>
            </>
          ) : err ? (
            <p className="text-red-600">{err}</p>
          ) : !booking ? (
            <p className="text-slate-500">Loading…</p>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold mb-2">Cancel booking?</h1>
              <p className="text-slate-600 mb-1">{booking.meeting_title}</p>
              <p className="text-sm text-slate-500 mb-6">{new Date(booking.start_iso).toLocaleString()}</p>
              <div className="flex gap-3">
                <Link to="/" className="nb-btn nb-btn-secondary flex-1">Keep it</Link>
                <button onClick={cancel} className="nb-btn flex-1 bg-red-600 hover:bg-red-700" style={{ background: "#dc2626", boxShadow: "0 2px 8px rgba(220,38,38,0.35)" }}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
