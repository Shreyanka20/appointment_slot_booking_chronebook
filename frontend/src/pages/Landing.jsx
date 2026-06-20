import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { ArrowRight, Calendar, Zap, Bot, ShieldCheck, Sparkles } from "lucide-react";

const features = [
  { icon: Calendar, color: "from-orange-500 to-amber-500", title: "Smart Calendar", desc: "Set weekly hours — available slots are computed automatically with no double-booking." },
  { icon: Zap, color: "from-amber-500 to-yellow-500", title: "Instant Booking", desc: "Share your link. Invitees pick a slot. Confirmation in seconds." },
  { icon: Bot, color: "from-orange-400 to-red-400", title: "AI Assistant", desc: "Built-in help bot walks you through signup, booking, and setup." },
  { icon: ShieldCheck, color: "from-emerald-500 to-teal-500", title: "Admin Controls", desc: "Platform-wide view of users, bookings, and metrics in one dashboard." },
  { icon: Calendar, color: "from-amber-500 to-orange-500", title: "Personal Pages", desc: "Every account gets a public booking page to share anywhere." },
  { icon: Zap, color: "from-rose-500 to-orange-400", title: "Zero Friction", desc: "No installs or plugins. Works in any browser, on any device." },
];

export default function Landing() {
  return (
    <div className="page-shell">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(800px,120vw)] h-[min(600px,80vh)] bg-orange-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[min(500px,90vw)] h-[min(400px,60vh)] bg-amber-200/35 rounded-full blur-3xl" />
      </div>

      <Navbar />

      <section className="app-container pt-10 sm:pt-16 md:pt-20 pb-16 sm:pb-24 lg:pb-28 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 border border-orange-100">
            <Sparkles size={14} />
            Scheduling, simplified
          </div>
          <h1 className="font-display text-4xl xs:text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] text-stone-900 mb-4 sm:mb-6">
            Share your link.
            <span className="block bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Let them book.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-stone-600 max-w-lg mx-auto lg:mx-0 mb-8 sm:mb-10 leading-relaxed">
            ChronoBook is a clean meeting scheduler. Stop the back-and-forth emails — share your page and let people pick a time that works.
          </p>
          <div className="flex flex-col xs:flex-row flex-wrap justify-center lg:justify-start gap-3 sm:gap-4">
            <Link to="/register" data-testid="hero-cta-button" className="nb-btn text-sm sm:text-base px-6 sm:px-7 py-3 sm:py-3.5 w-full xs:w-auto">
              Get started free <ArrowRight size={18} />
            </Link>
            <Link to="/u/admin" data-testid="hero-demo-button" className="nb-btn nb-btn-secondary text-sm sm:text-base px-6 sm:px-7 py-3 sm:py-3.5 w-full xs:w-auto">
              View demo page
            </Link>
          </div>
          <div className="mt-8 sm:mt-12 flex flex-col xs:flex-row items-center justify-center lg:justify-start gap-3 xs:gap-4">
            <div className="flex -space-x-2">
              {["bg-orange-400", "bg-amber-400", "bg-yellow-400", "bg-emerald-400"].map((c, i) => (
                <div key={i} className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${c} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <p className="text-sm text-stone-500">Trusted by freelancers & teams</p>
          </div>
        </div>

        <div className="relative w-full max-w-md mx-auto lg:max-w-none">
          <div className="nb-card p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 sm:pb-4 mb-4 sm:mb-5">
              <div className="text-[10px] sm:text-xs font-medium text-stone-400 truncate pr-2">chronobook.app/u/jane</div>
              <div className="flex gap-1.5 shrink-0">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-400" />
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-400" />
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400" />
              </div>
            </div>
            <div className="font-display text-lg sm:text-xl font-bold text-stone-900 mb-1">30 min meeting</div>
            <div className="text-xs sm:text-sm text-stone-500 mb-4 sm:mb-5">Wed · Feb 18 · 2026</div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {["09:00", "09:30", "10:00", "10:30", "11:00", "14:00"].map((t, i) => (
                <div
                  key={t}
                  className={`rounded-lg px-1.5 sm:px-2 py-2 sm:py-2.5 text-center text-xs sm:text-sm font-semibold transition-colors ${
                    i === 2
                      ? "bg-orange-600 text-white shadow-md shadow-orange-200"
                      : "bg-stone-50 text-stone-700 hover:bg-orange-50 hover:text-orange-700 border border-stone-100"
                  }`}
                >
                  {t}
                </div>
              ))}
            </div>
            <button type="button" className="nb-btn w-full mt-4 sm:mt-5 opacity-60 cursor-default text-sm" disabled>
              Confirm 10:00
            </button>
          </div>
          <div className="absolute -top-2 sm:-top-3 -right-2 sm:-right-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
            Live preview
          </div>
        </div>
      </section>

      <section className="app-container pb-16 sm:pb-24 lg:pb-28">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900 mb-2 sm:mb-3">
            Everything you need
          </h2>
          <p className="text-stone-500 text-base sm:text-lg">Powerful scheduling without the complexity.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="nb-card p-5 sm:p-6 hover:shadow-lg transition-shadow duration-200 group">
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 sm:mb-4 shadow-sm group-hover:scale-105 transition-transform`}>
                <Icon size={20} className="text-white" strokeWidth={2} />
              </div>
              <h3 className="font-display text-base sm:text-lg font-bold text-stone-900 mb-1.5 sm:mb-2">{title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="app-container pb-16 sm:pb-24 lg:pb-28">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 p-6 sm:p-10 md:p-16 shadow-xl shadow-orange-200">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8 text-center md:text-left">
            <div>
              <p className="text-orange-200 text-sm font-medium mb-2">Ready to start?</p>
              <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
                Create your booking page in minutes.
              </h3>
            </div>
            <Link to="/register" className="shrink-0 bg-white text-orange-700 font-semibold px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl hover:bg-orange-50 transition-colors shadow-lg w-full md:w-auto text-center" data-testid="cta-bottom">
              Create my page
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white">
        <div className="app-container py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-stone-500 text-center sm:text-left">
          <span>© 2026 ChronoBook</span>
          <span className="text-stone-400">Simple scheduling, done right.</span>
        </div>
      </footer>
    </div>
  );
}
