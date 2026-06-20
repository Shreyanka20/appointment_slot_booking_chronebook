import React, { useEffect, useState, useCallback } from "react";
import HostShell from "@/components/layouts/HostShell";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Trash2, Plus, Clock, Video, X,
  Calendar, ChevronRight, Settings, Users, BarChart2,
  Check, AlertCircle, Zap, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const COLORS = [
  { hex: "#4F46E5", label: "Indigo" },
  { hex: "#6366F1", label: "Primary" },
  { hex: "#8B5CF6", label: "Violet" },
  { hex: "#16a34a", label: "Green" },
  { hex: "#dc2626", label: "Red" },
  { hex: "#0891b2", label: "Teal" },
];

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-host-card rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>
      <div className="font-display text-3xl font-bold text-host-text mb-0.5">{value}</div>
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
    <div className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-host-card rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 text-host-primary">
          <Calendar size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-host-text truncate">{booking.meeting_title}</div>
          <div className="text-sm text-stone-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{dateStr}</span>
            <span className="hidden sm:inline text-stone-300">·</span>
            <span>{booking.duration_min}m</span>
            <span className="hidden sm:inline text-stone-300">·</span>
            <span className="truncate">{booking.invitee_name}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 pl-14 sm:pl-0">
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
          className="sm:opacity-0 sm:group-hover:opacity-100 p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
    <div className="group flex items-center gap-3 bg-white rounded-2xl border border-stone-100 p-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
      <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: mt.color }} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-stone-900 truncate">{mt.title}</div>
        <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
          <Clock size={11} /> {mt.duration_min} min
        </div>
      </div>
      <button
        onClick={() => onDelete(mt.meeting_type_id)}
        className="opacity-0 group-hover:opacity-100 p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
        title="Delete"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [meetingTypes, setMeetingTypes] = useState([]);
  const [bookings, setBookings]         = useState([]);
  const [availability, setAvailability] = useState({ rules: [], timezone: "UTC" });
  const [newMT, setNewMT]               = useState({ title: "", duration_min: 30, color: "#4F46E5" });
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
    setNewMT({ title: "", duration_min: 30, color: "#4F46E5" });
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
    <HostShell
      user={user}
      activeTab={tab}
      onTabChange={setTab}
      bookingUrl={bookingUrl}
      linkCopied={linkCopied}
      onCopyLink={copyLink}
      upcomingCount={upcoming.length}
    >
        {/* ══════════════════ OVERVIEW ══════════════════ */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="rounded-2xl host-hero-gradient p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-indigo-300/30">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <p className="text-indigo-200 text-sm font-medium mb-1">Good to see you, {user?.name?.split(" ")[0]}</p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">Your scheduling hub</h2>
                <p className="text-indigo-100/80 text-sm max-w-lg">Share your booking link with clients. They get a clean booking page — you manage everything here.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard label="Upcoming" value={upcoming.length} icon={Calendar} color="bg-indigo-100 text-host-primary" sub="confirmed" />
              <StatCard label="Total bookings" value={bookings.length} icon={BarChart2} color="bg-violet-100 text-host-accent" />
              <StatCard label="Meeting types" value={meetingTypes.length} icon={Zap} color="bg-indigo-50 text-host-secondary" />
              <StatCard label="Open days" value={availability.rules.length} icon={Users} color="bg-emerald-100 text-emerald-700" sub="per week" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-host-card rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-host-text">Next bookings</h3>
                  <button type="button" onClick={() => setTab("meetings")} className="text-xs font-semibold text-host-primary hover:text-host-accent flex items-center gap-1">
                    View all <ChevronRight size={14} />
                  </button>
                </div>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-stone-500 py-6 text-center">No upcoming meetings. Share your link to get booked.</p>
                ) : (
                  <div className="space-y-2">
                    {upcoming.slice(0, 3).map((b) => (
                      <BookingCard key={b.booking_id} booking={b} onCancel={cancelBooking} />
                    ))}
                  </div>
                )}
              </section>
              <section className="bg-host-card rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
                <h3 className="font-display font-bold text-host-text mb-4">Quick actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: "Add meeting type", icon: Plus, tab: "types" },
                    { label: "Set availability", icon: Clock, tab: "availability" },
                    { label: "Video settings", icon: Video, tab: "settings" },
                    { label: "Preview client page", icon: ExternalLink, href: bookingUrl },
                  ].map((action) => (
                    action.href ? (
                      <a
                        key={action.label}
                        href={action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-sm font-semibold text-host-text"
                      >
                        <action.icon size={18} className="text-host-primary" />
                        {action.label}
                      </a>
                    ) : (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => setTab(action.tab)}
                        className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-sm font-semibold text-host-text text-left"
                      >
                        <action.icon size={18} className="text-host-primary" />
                        {action.label}
                      </button>
                    )
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ══════════════════ BOOKINGS TAB ══════════════════ */}
        {tab === "meetings" && (
          <div className="space-y-8">
            {/* Upcoming */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-stone-900">
                  Upcoming
                  <span className="ml-2 text-sm font-semibold text-stone-400">({upcoming.length})</span>
                </h2>
              </div>
              {upcoming.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-stone-200 p-10 text-center">
                  <Calendar size={32} className="text-stone-300 mx-auto mb-3" />
                  <p className="font-semibold text-stone-700 mb-1">No upcoming bookings</p>
                  <p className="text-sm text-stone-400">Share your link and someone will book soon.</p>
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
                <h2 className="font-display text-xl font-bold text-stone-900 mb-4">
                  Past
                  <span className="ml-2 text-sm font-semibold text-stone-400">({past.length})</span>
                </h2>
                <div className="space-y-2">
                  {past.slice(0, 10).map((b) => (
                    <div key={b.booking_id} className="flex items-center gap-3 bg-white/60 rounded-2xl border border-stone-100 p-4">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400 shrink-0">
                        <Calendar size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-stone-500 text-sm truncate">{b.meeting_title}</div>
                        <div className="text-xs text-stone-400 mt-0.5">
                          {new Date(b.start_iso).toLocaleDateString()} · {b.invitee_name}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                        b.status === "cancelled"
                          ? "bg-red-50 text-red-500"
                          : "bg-stone-100 text-stone-500"
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
              <h2 className="font-display text-xl font-bold text-stone-900 mb-4">Your meeting types</h2>
              {meetingTypes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-stone-200 p-8 text-center">
                  <Zap size={28} className="text-stone-300 mx-auto mb-2" />
                  <p className="text-stone-500 text-sm">No meeting types yet. Add one →</p>
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
              <h2 className="font-display text-xl font-bold text-stone-900 mb-4">Add new type</h2>
              <form onSubmit={addMeetingType} className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
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
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
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
                            ? "bg-host-primary text-white border-orange-600 shadow-sm shadow-indigo-200"
                            : "bg-white text-stone-600 border-stone-200 hover:border-indigo-200"
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
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
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
                            ? "ring-2 ring-offset-2 ring-stone-700 scale-110"
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
                <h2 className="font-display text-xl font-bold text-stone-900">Weekly hours</h2>
                <p className="text-sm text-stone-400 mt-0.5">Set when you're available for bookings</p>
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
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm divide-y divide-stone-100">
              {DAYS.map((day, idx) => {
                const rule   = availability.rules.find((r) => r.weekday === idx);
                const active = !!rule;
                return (
                  <div
                    key={day}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 transition-colors ${active ? "" : "opacity-50"}`}
                    data-testid={`avail-row-${idx}`}
                  >
                    <label className="flex items-center gap-3 w-full sm:w-24 cursor-pointer select-none">
                      <div
                        onClick={() => toggleDay(idx)}
                        className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
                          active ? "bg-host-primary" : "bg-stone-200"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            active ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </div>
                      <span className={`text-sm font-semibold ${active ? "text-stone-900" : "text-stone-400"}`}>
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
                        <span className="text-stone-400 font-medium">—</span>
                        <input
                          type="time"
                          value={rule.end}
                          onChange={(e) => updateRule(idx, "end", e.target.value)}
                          className="nb-input text-sm flex-1"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-stone-400">Unavailable</span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-stone-400 mt-3 flex items-center gap-1.5">
              <Clock size={12} /> All times in UTC. Guests see times in their local timezone.
            </p>
          </div>
        )}

        {/* ══════════════════ SETTINGS TAB ══════════════════ */}
        {tab === "settings" && (
          <div className="max-w-xl space-y-6">
            {/* Video settings */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-host-primary">
                    <Video size={16} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-stone-900">Video meetings</h2>
                    <p className="text-xs text-stone-400 mt-0.5">A video link is generated for every booking</p>
                  </div>
                </div>
              </div>
              <form onSubmit={saveVideoSettings} className="px-6 py-5 space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
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
                            : "border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="video_mode"
                          value={opt.value}
                          checked={videoSettings.video_mode === opt.value}
                          onChange={(e) => setVideoSettings({ ...videoSettings, video_mode: e.target.value })}
                          className="text-host-primary"
                        />
                        <div>
                          <div className="font-semibold text-sm text-stone-900">{opt.label}</div>
                          <div className="text-xs text-stone-400">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {videoSettings.video_mode === "custom" && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
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
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Static override (optional)
                  </label>
                  <input
                    value={videoSettings.default_meet_link}
                    onChange={(e) => setVideoSettings({ ...videoSettings, default_meet_link: e.target.value })}
                    placeholder="https://meet.google.com/xyz-abc-def"
                    className="nb-input"
                  />
                  <p className="text-xs text-stone-400 mt-1.5">
                    If set, this link is used for all bookings instead of auto-generated ones.
                  </p>
                </div>

                <button type="submit" disabled={saving} className="nb-btn w-full">
                  {saving ? "Saving…" : "Save settings"}
                </button>
              </form>
            </div>

            {/* Email status */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                    <Check size={16} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-stone-900">Email notifications</h2>
                    <p className="text-xs text-stone-400 mt-0.5">Confirmations and cancellations</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-start gap-3 bg-stone-50 rounded-xl p-4">
                  <AlertCircle size={16} className="text-stone-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-stone-600 leading-relaxed">
                    Emails are sent automatically when bookings are confirmed or cancelled.
                    Configure <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-stone-200 font-mono">SMTP_HOST</code>,{" "}
                    <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-stone-200 font-mono">SMTP_USER</code>, and{" "}
                    <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-stone-200 font-mono">SMTP_PASSWORD</code>{" "}
                    in <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-stone-200 font-mono">backend/.env</code>.
                    For Gmail, use an <strong>App Password</strong> (not your regular password).
                  </div>
                </div>
              </div>
            </div>

            {/* Google Meet OAuth note */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <Video size={16} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-stone-900">Real Google Meet links</h2>
                    <p className="text-xs text-stone-400 mt-0.5">Upgrade from Jitsi to meet.google.com</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="space-y-2 text-sm text-stone-600">
                  <p>To auto-create <strong>real</strong> Google Meet links, set these env vars in <code className="text-xs bg-stone-100 px-1 rounded font-mono">backend/.env</code>:</p>
                  <div className="bg-stone-900 rounded-xl p-4 font-mono text-xs text-stone-200 space-y-1">
                    <div><span className="text-stone-400"># Google Cloud Console → OAuth2 credentials</span></div>
                    <div>GOOGLE_CLIENT_ID=<span className="text-emerald-400">your_client_id</span></div>
                    <div>GOOGLE_CLIENT_SECRET=<span className="text-emerald-400">your_client_secret</span></div>
                  </div>
                  <p className="text-xs text-stone-400">
                    Then store the host's <code className="font-mono">google_refresh_token</code> in the database 
                    after they complete Google OAuth. Until then, bookings use a stable Jitsi room.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

    </HostShell>
  );
}
