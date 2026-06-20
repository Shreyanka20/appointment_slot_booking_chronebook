import React, { useCallback, useEffect, useState } from "react";
import CustomerShell from "@/components/layouts/CustomerShell";
import { api, formatApiErrorDetail } from "@/lib/api";
import {
  getCustomerSession, saveCustomerEmail, mergeBookingsFromApi, addCustomerBooking,
} from "@/lib/customerBookings";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  Calendar, Clock, Video, Mail, RefreshCw, X, ChevronLeft, LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function BookingCard({ booking, onReschedule, onCancel }) {
  const upcoming = booking.status === "confirmed" && new Date(booking.start_iso) >= new Date();
  return (
    <div className="client-card rounded-2xl border p-5 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{booking.host_name}</p>
          <h3 className="font-display text-lg font-bold text-client-text mt-0.5">{booking.meeting_title}</h3>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
          booking.status === "cancelled"
            ? "bg-red-500/15 text-red-400"
            : upcoming
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-slate-500/15 text-slate-400"
        }`}>
          {booking.status === "cancelled" ? "Cancelled" : upcoming ? "Upcoming" : "Past"}
        </span>
      </div>

      <div className="space-y-2 text-sm text-slate-400 mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-client-primary shrink-0" />
          {new Date(booking.start_iso).toLocaleString()}
        </div>
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-client-primary shrink-0" />
          {booking.duration_min} minutes
        </div>
      </div>

      {upcoming && booking.cancel_token && (
        <div className="flex flex-wrap gap-2">
          {booking.meet_link && (
            <a
              href={booking.meet_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl client-gradient text-white text-xs font-semibold"
            >
              <Video size={14} /> Join call
            </a>
          )}
          <button
            type="button"
            onClick={() => onReschedule(booking)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-client-primary text-client-primary text-xs font-semibold hover:bg-client-primary/10 transition-colors"
          >
            <RefreshCw size={14} /> Change slot
          </button>
          <button
            type="button"
            onClick={() => onCancel(booking)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-client-border text-slate-400 text-xs font-semibold hover:border-red-500/50 hover:text-red-400 transition-colors"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function ReschedulePanel({ booking, onClose, onDone }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    api.get("/slots", {
      params: {
        host_user_id: booking.host_user_id,
        meeting_type_id: booking.meeting_type_id,
        date: formatDate(selectedDate),
        exclude_booking_id: booking.booking_id,
      },
    })
      .then((r) => setSlots(r.data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, booking]);

  const confirm = async (slot) => {
    setBusy(true);
    try {
      const r = await api.patch(`/bookings/${booking.booking_id}/reschedule`, {
        token: booking.cancel_token,
        start_iso: slot,
      });
      addCustomerBooking(r.data);
      toast.success("Slot updated!");
      onDone(r.data);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Could not reschedule");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="client-card rounded-2xl border p-5 sm:p-6 shadow-xl shadow-black/30">
      <button type="button" onClick={onClose} className="flex items-center gap-1 text-sm text-client-primary mb-4 hover:underline">
        <ChevronLeft size={16} /> Back to bookings
      </button>
      <h2 className="font-display text-xl font-bold text-client-text mb-1">Pick a new time</h2>
      <p className="text-sm text-slate-500 mb-5">{booking.meeting_title} with {booking.host_name}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-client-border p-2 bg-client-bg">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={{ before: new Date() }}
          />
        </div>
        <div>
          {!selectedDate && <p className="text-sm text-slate-500 text-center py-10">Select a date</p>}
          {selectedDate && loadingSlots && <p className="text-sm text-slate-500 text-center py-10">Loading…</p>}
          {selectedDate && !loadingSlots && slots.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-10">No slots available</p>
          )}
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => confirm(s)}
                className="py-2.5 rounded-xl border border-client-border text-sm font-semibold text-client-text hover:border-client-primary hover:bg-client-primary/15 transition-all disabled:opacity-50"
              >
                {new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const [email, setEmail] = useState(getCustomerSession().email || "");
  const [inputEmail, setInputEmail] = useState(email);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);

  const load = useCallback(async (lookupEmail) => {
    if (!lookupEmail) return;
    setLoading(true);
    try {
      const r = await api.post("/bookings/invitee/lookup", { email: lookupEmail });
      const session = getCustomerSession();
      const merged = mergeBookingsFromApi(r.data.bookings, session);
      merged.forEach((b) => addCustomerBooking(b));
      setBookings(merged);
      saveCustomerEmail(lookupEmail);
      setEmail(lookupEmail);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Could not load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (email) load(email);
  }, [email, load]);

  const handleLookup = (e) => {
    e.preventDefault();
    if (!inputEmail.trim()) return;
    load(inputEmail.trim());
  };

  const handleCancel = async (booking) => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      await api.post(`/bookings/${booking.booking_id}/cancel`, { token: booking.cancel_token });
      toast.success("Booking cancelled");
      load(email);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Could not cancel");
    }
  };

  const upcoming = bookings.filter((b) => b.status === "confirmed" && new Date(b.start_iso) >= new Date());
  const past = bookings.filter((b) => b.status !== "confirmed" || new Date(b.start_iso) < new Date());

  return (
    <CustomerShell mode="dashboard" showHostPanel={false}>
      <div data-testid="customer-dashboard-root">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl client-gradient flex items-center justify-center">
            <LayoutDashboard size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-client-text">My bookings</h1>
            <p className="text-sm text-slate-500">View, reschedule, or cancel your sessions</p>
          </div>
        </div>

        {rescheduleTarget ? (
          <ReschedulePanel
            booking={rescheduleTarget}
            onClose={() => setRescheduleTarget(null)}
            onDone={(updated) => {
              setRescheduleTarget(null);
              setBookings((prev) => prev.map((b) => (b.booking_id === updated.booking_id ? { ...b, ...updated, cancel_token: rescheduleTarget.cancel_token } : b)));
              load(email);
            }}
          />
        ) : (
          <>
            <form onSubmit={handleLookup} className="client-card rounded-2xl border p-4 sm:p-5 mb-6 flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  <Mail size={12} className="inline mr-1" /> Your email
                </label>
                <input
                  type="email"
                  required
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-client-border bg-client-bg px-4 py-2.5 text-client-text outline-none focus:border-client-primary focus:ring-2 focus:ring-client-primary/20"
                  data-testid="customer-email-input"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="sm:self-end px-6 py-2.5 rounded-xl client-gradient text-white font-semibold text-sm disabled:opacity-60 shrink-0"
              >
                {loading ? "Loading…" : "Find bookings"}
              </button>
            </form>

            {!email && !loading && (
              <p className="text-center text-slate-500 text-sm py-12">Enter your email to see your bookings</p>
            )}

            {email && !loading && bookings.length === 0 && (
              <div className="client-card rounded-2xl border p-10 text-center text-slate-500">
                No bookings found for {email}
              </div>
            )}

            {upcoming.length > 0 && (
              <section className="mb-8">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Upcoming</h2>
                <div className="space-y-4">
                  {upcoming.map((b) => (
                    <BookingCard
                      key={b.booking_id}
                      booking={b}
                      onReschedule={setRescheduleTarget}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Past & cancelled</h2>
                <div className="space-y-4 opacity-80">
                  {past.map((b) => (
                    <BookingCard key={b.booking_id} booking={b} onReschedule={() => {}} onCancel={() => {}} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </CustomerShell>
  );
}
