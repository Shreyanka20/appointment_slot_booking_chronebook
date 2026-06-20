import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomerShell from "@/components/layouts/CustomerShell";
import { api, formatApiErrorDetail } from "@/lib/api";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Clock, ChevronLeft, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { addCustomerBooking } from "@/lib/customerBookings";

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function BookingPage() {
  const { username, meetingTypeId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ invitee_name: "", invitee_email: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/profile/${username}`);
        setProfile(r.data);
      } catch (e) {
        setErr("Profile not found");
      }
    })();
  }, [username]);

  const meetingType = useMemo(
    () => profile?.meeting_types.find((m) => m.meeting_type_id === meetingTypeId),
    [profile, meetingTypeId]
  );

  useEffect(() => {
    if (!selectedDate || !profile) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    api.get("/slots", {
      params: {
        host_user_id: profile.user.user_id,
        meeting_type_id: meetingTypeId,
        date: formatDate(selectedDate),
      },
    }).then((r) => setSlots(r.data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, profile, meetingTypeId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setBusy(true); setErr("");
    try {
      const r = await api.post("/bookings", {
        meeting_type_id: meetingTypeId,
        host_user_id: profile.user.user_id,
        start_iso: selectedSlot,
        invitee_name: form.invitee_name,
        invitee_email: form.invitee_email,
        notes: form.notes,
      });
      toast.success("Booked!");
      addCustomerBooking(r.data);
      navigate(`/confirmed/${r.data.booking_id}`, { state: r.data });
    } catch (e) {
      setErr(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); }
  };

  if (err && !profile) {
    return (
      <CustomerShell hostName="Error" showHostPanel={false}>
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center text-stone-700">{err}</div>
      </CustomerShell>
    );
  }

  if (!profile || !meetingType) {
    return (
      <CustomerShell hostName="Loading" showHostPanel={false}>
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center text-stone-500">Loading…</div>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell
      hostName={profile.user.name}
      hostUsername={profile.user.username}
      hostBio={profile.user.bio}
      meetingTitle={meetingType.title}
      step="book"
    >
      <div data-testid="booking-root">
      <button
        type="button"
        onClick={() => navigate(`/u/${username}`)}
        className="flex items-center gap-2 text-sm font-medium text-client-primary mb-4 hover:text-violet-300 transition-colors"
        data-testid="booking-back"
      >
        <ChevronLeft size={16} /> Back to sessions
      </button>

      <div className="client-card rounded-2xl border overflow-hidden shadow-xl shadow-black/30">
        {!selectedSlot ? (
          <>
            <div className="px-5 sm:px-6 py-4 border-b border-client-border flex items-center gap-2 text-sm text-slate-400">
              <Clock size={16} className="text-client-primary" />
              <span>{meetingType.duration_min} minutes</span>
              {meetingType.description && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="truncate">{meetingType.description}</span>
                </>
              )}
            </div>

            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={16} className="text-client-primary" />
                  <p className="text-sm font-semibold text-client-text">1. Pick a date</p>
                </div>
                <div className="rounded-xl border border-client-border p-2 overflow-x-auto bg-client-bg">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={{ before: new Date() }}
                    data-testid="booking-calendar"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-client-primary" />
                  <p className="text-sm font-semibold text-client-text">2. Pick a time</p>
                </div>
                {!selectedDate && (
                  <p className="text-sm text-slate-500 py-8 text-center rounded-xl bg-client-bg border border-dashed border-client-border">
                    Select a date first
                  </p>
                )}
                {selectedDate && loadingSlots && (
                  <p className="text-sm text-slate-500 py-8 text-center">Loading times…</p>
                )}
                {selectedDate && !loadingSlots && slots.length === 0 && (
                  <p className="text-sm text-slate-500 py-8 text-center rounded-xl bg-client-bg">No slots on this day</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      className="rounded-xl border border-client-border bg-client-bg px-3 py-3 font-semibold text-sm text-client-text hover:border-client-primary hover:bg-client-primary/20 transition-all"
                      data-testid={`time-slot-${s}`}
                    >
                      {new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-client-primary/15 border border-client-primary/30 text-sm">
              <Calendar size={16} className="text-client-primary shrink-0" />
              <span className="font-semibold text-client-text">{new Date(selectedSlot).toLocaleString()}</span>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="ml-auto text-xs font-semibold text-client-primary hover:underline"
              >
                Change
              </button>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <User size={16} className="text-client-primary" />
              <h2 className="font-display text-xl font-bold text-client-text">3. Your details</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Full name</label>
              <input required value={form.invitee_name} onChange={(e) => setForm({ ...form, invitee_name: e.target.value })} className="w-full rounded-xl border border-client-border bg-client-bg px-4 py-3 text-client-text outline-none focus:border-client-primary focus:ring-2 focus:ring-client-primary/20" data-testid="invitee-name" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Email</label>
              <input type="email" required value={form.invitee_email} onChange={(e) => setForm({ ...form, invitee_email: e.target.value })} className="w-full rounded-xl border border-client-border bg-client-bg px-4 py-3 text-client-text outline-none focus:border-client-primary focus:ring-2 focus:ring-client-primary/20" data-testid="invitee-email" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Notes (optional)</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full rounded-xl border border-client-border bg-client-bg px-4 py-3 text-client-text outline-none focus:border-client-primary focus:ring-2 focus:ring-client-primary/20" data-testid="invitee-notes" />
            </div>

            {err && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 text-sm font-medium">{err}</div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 rounded-xl client-gradient text-white font-semibold shadow-lg shadow-violet-900/40 hover:opacity-95 transition-opacity disabled:opacity-60"
              data-testid="confirm-booking-button"
            >
              {busy ? "Confirming…" : "Confirm booking"}
            </button>
          </form>
        )}
      </div>
      </div>
    </CustomerShell>
  );
}
