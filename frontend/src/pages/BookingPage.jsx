import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api, formatApiErrorDetail } from "@/lib/api";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Clock, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

function formatDate(d) {
  // YYYY-MM-DD in local
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
      navigate(`/confirmed/${r.data.booking_id}`, { state: r.data });
    } catch (e) {
      setErr(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); }
  };

  if (err && !profile) return <div className="min-h-screen bg-slate-50"><Navbar /><div className="p-16 font-display text-2xl text-slate-700">{err}</div></div>;
  if (!profile || !meetingType) return <div className="min-h-screen bg-slate-50"><Navbar /><div className="p-16 font-display text-xl text-slate-500">Loading…</div></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 md:px-10 py-10" data-testid="booking-root">
        <button onClick={() => navigate(`/u/${username}`)} className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-6 hover:text-indigo-600 transition-colors" data-testid="booking-back"><ChevronLeft size={16}/> Back</button>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Host info */}
          <div className="md:col-span-4">
            <div className="nb-card p-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-display text-2xl font-bold text-white mb-4">
                {profile.user.name?.[0]?.toUpperCase()}
              </div>
              <div className="text-sm text-slate-500 mb-1">{profile.user.name}</div>
              <h1 className="font-display text-2xl font-bold text-slate-900 mb-3">{meetingType.title}</h1>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2"><Clock size={14}/> {meetingType.duration_min} minutes</div>
              {meetingType.description && <p className="text-sm text-slate-600 mt-3">{meetingType.description}</p>}
              {selectedSlot && (
                <div className="mt-5 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <div className="text-xs text-indigo-600 font-medium">Selected</div>
                  <div className="font-display text-base font-bold text-slate-900">{new Date(selectedSlot).toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>

          {/* Calendar + slots OR form */}
          <div className="md:col-span-8">
            {!selectedSlot ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="nb-card p-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Pick a date</p>
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={{ before: new Date() }}
                    data-testid="booking-calendar"
                  />
                </div>
                <div className="nb-card p-5">
                  <p className="text-sm font-medium text-slate-700 mb-3">Available slots</p>
                  {!selectedDate && <div className="text-sm font-medium">Pick a date first.</div>}
                  {selectedDate && loadingSlots && <div className="text-sm font-medium">Loading…</div>}
                  {selectedDate && !loadingSlots && slots.length === 0 && <div className="text-sm font-medium">No availability on this day.</div>}
                  <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                    {slots.map((s) => (
                      <button key={s} onClick={() => setSelectedSlot(s)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-semibold text-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors" data-testid={`time-slot-${s}`}>
                        {new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="nb-card p-6 space-y-4 max-w-lg">
                <h2 className="font-display text-2xl font-extrabold">Your details</h2>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2">Name</label>
                  <input required value={form.invitee_name} onChange={(e) => setForm({ ...form, invitee_name: e.target.value })} className="nb-input" data-testid="invitee-name" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2">Email</label>
                  <input type="email" required value={form.invitee_email} onChange={(e) => setForm({ ...form, invitee_email: e.target.value })} className="nb-input" data-testid="invitee-email" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2">Notes (optional)</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="nb-input" data-testid="invitee-notes" />
                </div>
                {err && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-medium">{err}</div>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setSelectedSlot(null)} className="nb-btn nb-btn-secondary">Change time</button>
                  <button type="submit" disabled={busy} className="nb-btn flex-1" data-testid="confirm-booking-button">{busy ? "Booking…" : "Confirm Booking"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
