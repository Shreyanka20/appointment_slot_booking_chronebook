import React, { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Copy, Trash2, Plus, Clock, Link as LinkIcon, Video, X,
  Calendar, ChevronRight, Settings, Users, BarChart2,
  Check, AlertCircle, Zap, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const COLORS = [
  { hex: "#6366f1", label: "Indigo" },
  { hex: "#8b5cf6", label: "Violet" },
  { hex: "#10b981", label: "Emerald" },
  { hex: "#f59e0b", label: "Amber" },
  { hex: "#ef4444", label: "Red" },
  { hex: "#06b6d4", label: "Cyan" },
];

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>
      <div className="font-display text-3xl font-bold text-slate-900 mb-0.5">{value}</div>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function BookingCard({ booking, onCancel }) {
  const start = new Date(booking.start_iso);
  const isToday = start.toDateString() === new Date().toDateString();
  const dateStr = isToday
    ? `Today at ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
      " · " + start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="group flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-600">
        <Calendar size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 truncate">{booking.meeting_title}</div>
        <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
          <span>{dateStr}</span>
          <span className="text-slate-300">·</span>
          <span>{booking.duration_min}m</span>
          <span className="text-slate-300">·</span>
          <span className="truncate">{booking.invitee_name}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {booking.meet_link && (
          <a
            href={booking.meet_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <Video size={13} /> Join
          </a>
        )}
        <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
          Confirmed
        </span>
        <button
          onClick={() => onCancel(booking.booking_id)}
          className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          title="Cancel booking"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

function MeetingTypeCard({ mt, onDelete }) {
  return (
    <div className="group flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
      <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: mt.color }} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 truncate">{mt.title}</div>
        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
          <Clock size={11} /> {mt.duration_min} min
        </div>
      </div>
      <button
        onClick={() => onDelete(mt.meeting_type_id)}
        className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
        title="Delete"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function TabButton({ id, label, icon: Icon, active, onClick, badge }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
        active
          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
      }`}
    >
      <Icon size={15} />
      {label}
      {badge != null && badge > 0 && (
        <span className={`min-w-5 h-5 text-xs font-bold rounded-full flex items-center justify-center px-1 ${
          active ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("meetings");
  const [meetingTypes, setMeetingTypes] = useState([]);
  const [bookings, setBookings]         = useState([]);
  const [availability, setAvailability] = useState({ rules: [], timezone: "UTC" });
  const [newMT, setNewMT]               = useState({ title: "", duration_min: 30, color: "#6366f1" });
  const [videoSettings, setVideoSettings] = useState({ video_mode: "google_meet", default_meet_link: "", custom_video_url: "" });
  const [linkCopied, setLinkCopied]     = useState(false);
  const [saving, setSaving]             = useState(false);

  const load = useCallback(async () => {
    const [mts, bks, av, vs] = await Promise.all([
      api.get("/meeting-types"),
      api.get("/bookings/mine"),
      api.get("/availability"),
      api.get("/settings/video").catch(() => ({ data: { video_mode: "google_meet" } })),
    ]);
    setMeetingTypes(mts.data);
    setBookings(bks.data);
    setAvailability({ rules: av.data.rules || [], timezone: av.data.timezone || "UTC" });
    setVideoSettings(vs.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const bookingUrl = `${window.location.origin}/u/${user?.username}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(bookingUrl);
    setLinkCopied(true);
    toast.success("Booking link copied!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const addMeetingType = async (e) => {
    e.preventDefault();
    if (!newMT.title.trim()) return;
    await api.post("/meeting-types", newMT);
    setNewMT({ title: "", duration_min: 30, color: "#6366f1" });
    toast.success("Meeting type added");
    load();
  };

  const deleteMT = async (id) => {
    await api.delete(`/meeting-types/${id}`);
    toast.success("Removed");
    load();
  };

  const toggleDay = (wd) => {
    const exists = availability.rules.find((r) => r.weekday === wd);
    const rules = exists
      ? availability.rules.filter((r) => r.weekday !== wd)
      : [...availability.rules, { weekday: wd, start: "09:00", end: "17:00" }];
    setAvailability({ ...availability, rules });
  };

  const updateRule = (wd, field, val) => {
    const rules = availability.rules.map((r) => (r.weekday === wd ? { ...r, [field]: val } : r));
    setAvailability({ ...availability, rules });
  };

  const saveAvailability = async () => {
    setSaving(true);
    await api.put("/availability", availability);
    setSaving(false);
    toast.success("Availability saved");
  };

  const saveVideoSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    await api.put("/settings/video", videoSettings);
    setSaving(false);
    toast.success("Settings saved");
  };

  const cancelBooking = async (id) => {
    if (!window.confirm("Cancel this booking? Both parties will be notified.")) return;
    await api.delete(`/bookings/${id}`);
    toast.success("Booking cancelled");
    load();
  };

  const upcoming = bookings.filter((b) => new Date(b.start_iso) >= new Date() && b.status === "confirmed");
  const past     = bookings.filter((b) => new Date(b.start_iso) < new Date() || b.status !== "confirmed");

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8" data-testid="dashboard-root">

        {/* ── Hero header ── */}
        <div className="mb-8">
          <p className="text-sm font-medium text-indigo-600 mb-1">Welcome back</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            {user?.name}
          </h1>
        </div>

        {/* ── Booking link banner ── */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 mb-8 shadow-lg shadow-indigo-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1.5">Your booking link</p>
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5">
                <LinkIcon size={14} className="text-indigo-200 shrink-0" />
                <span className="text-white/90 text-sm font-mono truncate" data-testid="dashboard-booking-link">
                  {bookingUrl}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                <ExternalLink size={14} /> Preview
              </a>
              <button
                onClick={copyLink}
                data-testid="copy-link-button"
                className="flex items-center gap-1.5 bg-white text-indigo-700 hover:bg-indigo-50 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                {linkCopied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Upcoming" value={upcoming.length} icon={Calendar} color="bg-indigo-50 text-indigo-600" sub="confirmed" />
          <StatCard label="Total bookings" value={bookings.length} icon={BarChart2} color="bg-blue-50 text-blue-600" />
          <StatCard label="Meeting types" value={meetingTypes.length} icon={Zap} color="bg-violet-50 text-violet-600" />
          <StatCard label="Available days" value={availability.rules.length} icon={Users} color="bg-emerald-50 text-emerald-600" sub="per week" />
        </div>

        {/* ── Tab nav ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          <TabButton id="meetings"     label="Bookings"      icon={Calendar}  active={tab === "meetings"}     onClick={setTab} badge={upcoming.length} />
          <TabButton id="types"        label="Meeting Types" icon={Zap}        active={tab === "types"}        onClick={setTab} />
          <TabButton id="availability" label="Availability"  icon={Clock}      active={tab === "availability"} onClick={setTab} />
          <TabButton id="settings"     label="Settings"      icon={Settings}   active={tab === "settings"}     onClick={setTab} />
        </div>

        {/* ══════════════════ BOOKINGS TAB ══════════════════ */}
        {tab === "meetings" && (
          <div className="space-y-8">
            {/* Upcoming */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Upcoming
                  <span className="ml-2 text-sm font-semibold text-slate-400">({upcoming.length})</span>
                </h2>
              </div>
              {upcoming.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                  <Calendar size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="font-semibold text-slate-700 mb-1">No upcoming bookings</p>
                  <p className="text-sm text-slate-400">Share your link and someone will book soon.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((b) => (
                    <BookingCard key={b.booking_id} booking={b} onCancel={cancelBooking} />
                  ))}
                </div>
              )}
            </section>

            {/* Past */}
            {past.length > 0 && (
              <section>
                <h2 className="font-display text-xl font-bold text-slate-900 mb-4">
                  Past
                  <span className="ml-2 text-sm font-semibold text-slate-400">({past.length})</span>
                </h2>
                <div className="space-y-2">
                  {past.slice(0, 10).map((b) => (
                    <div key={b.booking_id} className="flex items-center gap-3 bg-white/60 rounded-2xl border border-slate-100 p-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Calendar size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-500 text-sm truncate">{b.meeting_title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {new Date(b.start_iso).toLocaleDateString()} · {b.invitee_name}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                        b.status === "cancelled"
                          ? "bg-red-50 text-red-500"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ══════════════════ MEETING TYPES TAB ══════════════════ */}
        {tab === "types" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* List */}
            <section>
              <h2 className="font-display text-xl font-bold text-slate-900 mb-4">Your meeting types</h2>
              {meetingTypes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                  <Zap size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No meeting types yet. Add one →</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {meetingTypes.map((m) => (
                    <MeetingTypeCard key={m.meeting_type_id} mt={m} onDelete={deleteMT} />
                  ))}
                </div>
              )}
            </section>

            {/* Add form */}
            <section>
              <h2 className="font-display text-xl font-bold text-slate-900 mb-4">Add new type</h2>
              <form onSubmit={addMeetingType} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Title
                  </label>
                  <input
                    required
                    value={newMT.title}
                    onChange={(e) => setNewMT({ ...newMT, title: e.target.value })}
                    className="nb-input"
                    placeholder="e.g. 30 Minute Intro Call"
                    data-testid="mt-title-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Duration (minutes)
                  </label>
                  <div className="flex gap-2">
                    {[15, 30, 45, 60].map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setNewMT({ ...newMT, duration_min: d })}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                          newMT.duration_min === d
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200"
                            : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200"
                        }`}
                      >
                        {d}m
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={newMT.duration_min}
                    onChange={(e) => setNewMT({ ...newMT, duration_min: parseInt(e.target.value) })}
                    className="nb-input mt-2"
                    placeholder="Custom duration"
                    data-testid="mt-duration-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Colour
                  </label>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        type="button"
                        key={c.hex}
                        onClick={() => setNewMT({ ...newMT, color: c.hex })}
                        style={{ background: c.hex }}
                        title={c.label}
                        className={`w-9 h-9 rounded-xl transition-all ${
                          newMT.color === c.hex
                            ? "ring-2 ring-offset-2 ring-slate-700 scale-110"
                            : "hover:scale-105"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="nb-btn w-full"
                  data-testid="mt-create-button"
                >
                  <Plus size={16} /> Create meeting type
                </button>
              </form>
            </section>
          </div>
        )}

        {/* ══════════════════ AVAILABILITY TAB ══════════════════ */}
        {tab === "availability" && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">Weekly hours</h2>
                <p className="text-sm text-slate-400 mt-0.5">Set when you're available for bookings</p>
              </div>
              <button
                onClick={saveAvailability}
                disabled={saving}
                className="nb-btn"
                data-testid="save-availability-button"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
              {DAYS.map((day, idx) => {
                const rule   = availability.rules.find((r) => r.weekday === idx);
                const active = !!rule;
                return (
                  <div
                    key={day}
                    className={`flex items-center gap-4 px-5 py-4 transition-colors ${active ? "" : "opacity-50"}`}
                    data-testid={`avail-row-${idx}`}
                  >
                    <label className="flex items-center gap-3 w-24 cursor-pointer select-none">
                      <div
                        onClick={() => toggleDay(idx)}
                        className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                          active ? "bg-indigo-600" : "bg-slate-200"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            active ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </div>
                      <span className={`text-sm font-semibold ${active ? "text-slate-900" : "text-slate-400"}`}>
                        {day}
                      </span>
                    </label>
                    {active ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={rule.start}
                          onChange={(e) => updateRule(idx, "start", e.target.value)}
                          className="nb-input text-sm flex-1"
                        />
                        <span className="text-slate-400 font-medium">—</span>
                        <input
                          type="time"
                          value={rule.end}
                          onChange={(e) => updateRule(idx, "end", e.target.value)}
                          className="nb-input text-sm flex-1"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Unavailable</span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
              <Clock size={12} /> All times in UTC. Guests see times in their local timezone.
            </p>
          </div>
        )}

        {/* ══════════════════ SETTINGS TAB ══════════════════ */}
        {tab === "settings" && (
          <div className="max-w-xl space-y-6">
            {/* Video settings */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                    <Video size={16} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">Video meetings</h2>
                    <p className="text-xs text-slate-400 mt-0.5">A video link is generated for every booking</p>
                  </div>
                </div>
              </div>
              <form onSubmit={saveVideoSettings} className="px-6 py-5 space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Video provider
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "google_meet", label: "Auto video room", desc: "Unique link per booking (Google Meet / Jitsi)" },
                      { value: "custom",      label: "Custom link",     desc: "Same Zoom / Teams link for every booking" },
                      { value: "none",        label: "No video",        desc: "Text-only meetings" },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          videoSettings.video_mode === opt.value
                            ? "border-indigo-300 bg-indigo-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="video_mode"
                          value={opt.value}
                          checked={videoSettings.video_mode === opt.value}
                          onChange={(e) => setVideoSettings({ ...videoSettings, video_mode: e.target.value })}
                          className="text-indigo-600"
                        />
                        <div>
                          <div className="font-semibold text-sm text-slate-900">{opt.label}</div>
                          <div className="text-xs text-slate-400">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {videoSettings.video_mode === "custom" && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                      Meeting URL
                    </label>
                    <input
                      value={videoSettings.custom_video_url}
                      onChange={(e) => setVideoSettings({ ...videoSettings, custom_video_url: e.target.value })}
                      placeholder="https://zoom.us/j/..."
                      className="nb-input"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Static override (optional)
                  </label>
                  <input
                    value={videoSettings.default_meet_link}
                    onChange={(e) => setVideoSettings({ ...videoSettings, default_meet_link: e.target.value })}
                    placeholder="https://meet.google.com/xyz-abc-def"
                    className="nb-input"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">
                    If set, this link is used for all bookings instead of auto-generated ones.
                  </p>
                </div>

                <button type="submit" disabled={saving} className="nb-btn w-full">
                  {saving ? "Saving…" : "Save settings"}
                </button>
              </form>
            </div>

            {/* Email status */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                    <Check size={16} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">Email notifications</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Confirmations and cancellations</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-4">
                  <AlertCircle size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-slate-600 leading-relaxed">
                    Emails are sent automatically when bookings are confirmed or cancelled.
                    Configure <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">SMTP_HOST</code>,{" "}
                    <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">SMTP_USER</code>, and{" "}
                    <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">SMTP_PASSWORD</code>{" "}
                    in <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">backend/.env</code>.
                    For Gmail, use an <strong>App Password</strong> (not your regular password).
                  </div>
                </div>
              </div>
            </div>

            {/* Google Meet OAuth note */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <Video size={16} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">Real Google Meet links</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Upgrade from Jitsi to meet.google.com</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="space-y-2 text-sm text-slate-600">
                  <p>To auto-create <strong>real</strong> Google Meet links, set these env vars in <code className="text-xs bg-slate-100 px-1 rounded font-mono">backend/.env</code>:</p>
                  <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-200 space-y-1">
                    <div><span className="text-slate-400"># Google Cloud Console → OAuth2 credentials</span></div>
                    <div>GOOGLE_CLIENT_ID=<span className="text-emerald-400">your_client_id</span></div>
                    <div>GOOGLE_CLIENT_SECRET=<span className="text-emerald-400">your_client_secret</span></div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Then store the host's <code className="font-mono">google_refresh_token</code> in the database 
                    after they complete Google OAuth. Until then, bookings use a stable Jitsi room.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
