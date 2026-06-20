import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import CustomerShell from "@/components/layouts/CustomerShell";
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
    <CustomerShell
      hostName={booking?.host_name || "Booking"}
      meetingTitle={booking?.meeting_title}
      step="confirm"
      showHostPanel={!!booking}
    >
      <div className="client-card rounded-2xl border p-6 sm:p-8 text-center shadow-xl shadow-black/30">
        {done ? (
          <>
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-client-text mb-2">Booking cancelled</h1>
            <p className="text-slate-400 text-sm mb-6">Both parties have been notified by email.</p>
            <Link to="/" className="inline-flex items-center justify-center px-6 py-3 rounded-xl client-gradient text-white font-semibold text-sm">
              Done
            </Link>
          </>
        ) : err ? (
          <p className="text-red-400">{err}</p>
        ) : !booking ? (
          <p className="text-slate-400">Loading…</p>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold text-client-text mb-2">Cancel booking?</h1>
            <p className="text-slate-300 mb-1">{booking.meeting_title}</p>
            <p className="text-sm text-slate-500 mb-6">{new Date(booking.start_iso).toLocaleString()}</p>
            <div className="flex flex-col xs:flex-row gap-3">
              <Link to="/" className="flex-1 py-3 rounded-xl border border-client-border font-semibold text-slate-300 hover:bg-client-bg transition-colors">
                Keep booking
              </Link>
              <button
                type="button"
                onClick={cancel}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
              >
                Yes, cancel
              </button>
            </div>
          </>
        )}
      </div>
    </CustomerShell>
  );
}
