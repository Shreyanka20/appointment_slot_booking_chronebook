import React from "react";
import { Link } from "react-router-dom";
import { Calendar, Shield } from "lucide-react";

export function HostAvatar({ name, size = "lg" }) {
  const sizes = {
    sm: "w-12 h-12 text-lg",
    md: "w-16 h-16 text-xl",
    lg: "w-20 h-20 text-3xl",
  };
  return (
    <div className={`${sizes[size]} rounded-2xl client-gradient flex items-center justify-center font-display font-bold text-white shadow-lg shadow-violet-900/50 ring-4 ring-client-border`}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

export default function CustomerShell({
  hostName,
  hostUsername,
  hostBio,
  meetingTitle,
  step,
  mode = "booking",
  children,
  showHostPanel = true,
}) {
  const steps = ["Choose", "Schedule", "Confirm"];
  const stepIndex = step === "profile" ? 0 : step === "book" ? 1 : 2;

  return (
    <div className="min-h-screen min-h-[100dvh] client-shell-bg flex flex-col text-client-text">
      <header className="border-b border-client-border bg-client-bg/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Shield size={14} className="text-client-primary" />
            <span className="text-xs font-medium">
              {mode === "dashboard" ? "My bookings" : "Secure booking"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {mode !== "dashboard" && (
              <Link
                to="/my-bookings"
                className="text-xs font-semibold text-client-primary hover:text-violet-300 transition-colors"
              >
                My dashboard
              </Link>
            )}
            <Link to="/" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-client-primary transition-colors">
              <Calendar size={12} />
              <span className="hidden sm:inline">Powered by</span> ChronoBook
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full">
        {showHostPanel && hostName && (
          <aside className="lg:w-[340px] xl:w-[380px] shrink-0 p-6 sm:p-8 lg:border-r border-client-border">
            <div className="lg:sticky lg:top-8">
              <HostAvatar name={hostName} size="lg" />
              <p className="text-sm font-medium text-client-primary mt-5 mb-1">{hostUsername ? `@${hostUsername}` : "Your host"}</p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-client-text tracking-tight mb-3">{hostName}</h1>
              {meetingTitle && (
                <div className="inline-flex items-center gap-2 client-gradient text-white text-sm font-semibold px-4 py-2 rounded-full mb-4 shadow-lg shadow-violet-900/40">
                  {meetingTitle}
                </div>
              )}
              <p className="text-sm text-slate-400 leading-relaxed">
                {hostBio || "Pick a time that works for you. You'll receive instant confirmation by email."}
              </p>

              {step && step !== "profile" && (
                <div className="mt-8 hidden lg:block">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Progress</p>
                  <ol className="space-y-3">
                    {steps.map((label, i) => (
                      <li key={label} className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          i <= stepIndex
                            ? "client-gradient text-white"
                            : "bg-client-card border border-client-border text-slate-500"
                        }`}>
                          {i + 1}
                        </span>
                        <span className={`text-sm font-medium ${i <= stepIndex ? "text-client-text" : "text-slate-500"}`}>
                          {label}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </aside>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <div className={`mx-auto lg:mx-0 ${mode === "dashboard" ? "max-w-3xl" : "max-w-xl lg:max-w-none"}`}>
            {children}
          </div>
        </main>
      </div>

      <footer className="py-4 text-center text-xs text-slate-500 border-t border-client-border bg-client-bg">
        Your data is only used to confirm this booking.
      </footer>
    </div>
  );
}
