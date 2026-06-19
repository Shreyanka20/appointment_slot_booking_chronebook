import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { ArrowRight, Calendar, Zap, Bot, ShieldCheck, Sparkles } from "lucide-react";

const features = [
  { icon: Calendar, color: "from-indigo-500 to-violet-500", title: "Smart Calendar", desc: "Set weekly hours — available slots are computed automatically with no double-booking." },
  { icon: Zap, color: "from-violet-500 to-purple-500", title: "Instant Booking", desc: "Share your link. Invitees pick a slot. Confirmation in seconds." },
  { icon: Bot, color: "from-blue-500 to-indigo-500", title: "AI Assistant", desc: "Built-in help bot walks you through signup, booking, and setup." },
  { icon: ShieldCheck, color: "from-emerald-500 to-teal-500", title: "Admin Controls", desc: "Platform-wide view of users, bookings, and metrics in one dashboard." },
  { icon: Calendar, color: "from-amber-500 to-orange-500", title: "Personal Pages", desc: "Every account gets a public booking page to share anywhere." },
  { icon: Zap, color: "from-rose-500 to-pink-500", title: "Zero Friction", desc: "No installs or plugins. Works in any browser, on any device." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-violet-200/30 rounded-full blur-3xl" />
      </div>

      <Navbar />

      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-20 pb-28 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8 border border-indigo-100">
            <Sparkles size={14} />
            Scheduling, simplified
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] text-slate-900 mb-6">
            Share your link.
            <span className="block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Let them book.
            </span>
          </h1>
          <p className="text-lg text-slate-600 max-w-lg mb-10 leading-relaxed">
            ChronoBook is a clean meeting scheduler. Stop the back-and-forth emails — share your page and let people pick a time that works.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/register" data-testid="hero-cta-button" className="nb-btn text-base px-7 py-3.5">
              Get started free <ArrowRight size={18} />
            </Link>
            <Link to="/u/admin" data-testid="hero-demo-button" className="nb-btn nb-btn-secondary text-base px-7 py-3.5">
              View demo page
            </Link>
          </div>
          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-2">
              {["bg-indigo-400", "bg-violet-400", "bg-blue-400", "bg-emerald-400"].map((c, i) => (
                <div key={i} className={`w-9 h-9 rounded-full ${c} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500">Trusted by freelancers & teams</p>
          </div>
        </div>

        <div className="relative">
          <div className="nb-card p-6 lg:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="text-xs font-medium text-slate-400">chronobook.app/u/jane</div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
            </div>
            <div className="font-display text-xl font-bold text-slate-900 mb-1">30 min meeting</div>
            <div className="text-sm text-slate-500 mb-5">Wed · Feb 18 · 2026</div>
            <div className="grid grid-cols-3 gap-2">
              {["09:00", "09:30", "10:00", "10:30", "11:00", "14:00"].map((t, i) => (
                <div
                  key={t}
                  className={`rounded-lg px-2 py-2.5 text-center text-sm font-semibold transition-colors ${
                    i === 2
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-100"
                  }`}
                >
                  {t}
                </div>
              ))}
            </div>
            <button type="button" className="nb-btn w-full mt-5 opacity-60 cursor-default" disabled>
              Confirm 10:00
            </button>
          </div>
          <div className="absolute -top-3 -right-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
            Live preview
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-28">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Everything you need
          </h2>
          <p className="text-slate-500 text-lg">Powerful scheduling without the complexity.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="nb-card p-6 hover:shadow-lg transition-shadow duration-200 group">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform`}>
                <Icon size={20} className="text-white" strokeWidth={2} />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-28">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-10 md:p-16 shadow-xl shadow-indigo-200">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <p className="text-indigo-200 text-sm font-medium mb-2">Ready to start?</p>
              <h3 className="font-display text-3xl md:text-4xl font-bold text-white leading-tight">
                Create your booking page in minutes.
              </h3>
            </div>
            <Link to="/register" className="shrink-0 bg-white text-indigo-700 font-semibold px-7 py-3.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg" data-testid="cta-bottom">
              Create my page
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 flex items-center justify-between text-sm text-slate-500">
          <span>© 2026 ChronoBook</span>
          <span className="text-slate-400">Simple scheduling, done right.</span>
        </div>
      </footer>
    </div>
  );
}
