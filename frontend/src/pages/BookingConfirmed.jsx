import React, { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import CustomerShell from "@/components/layouts/CustomerShell";
import { addCustomerBooking } from "@/lib/customerBookings";
import { CheckCircle2, Video, Calendar, Mail, LayoutDashboard, ChevronLeft } from "lucide-react";

export default function BookingConfirmed() {
  const { bookingId } = useParams();
  const { state } = useLocation();
  const b = state || {};

  useEffect(() => {
    if (b.booking_id) addCustomerBooking(b);
  }, [b]);

  return (
    <CustomerShell
      hostName={b.host_name || "Your host"}
      meetingTitle={b.meeting_title}
      step="confirm"
      showHostPanel={!!b.host_name}
    >
      <Link
        to="/my-bookings"
        className="inline-flex items-center gap-2 text-sm font-medium text-client-primary mb-4 hover:text-violet-300 transition-colors"
      >
        <ChevronLeft size={16} /> Back to my dashboard
      </Link>

      <div className="client-card rounded-2xl border overflow-hidden shadow-xl shadow-black/30" data-testid="booking-confirmed-root">
        <div className="client-gradient px-6 py-8 text-center text-white">
          <CheckCircle2 size={56} className="mx-auto mb-3 opacity-95" strokeWidth={1.5} />
          <h1 className="font-display text-2xl sm:text-3xl font-bold">You're all set!</h1>
          <p className="text-violet-200 text-sm mt-2">Confirmation #{bookingId?.slice(-8)}</p>
        </div>

        <div className="p-5 sm:p-6 space-y-3">
          {b.start_iso && (
            <>
              {[
                { icon: Calendar, label: "When", value: new Date(b.start_iso).toLocaleString() },
                { icon: Video, label: "Session", value: `${b.meeting_title} · ${b.duration_min} min` },
                { icon: Mail, label: "Host", value: b.host_name },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-4 rounded-xl bg-client-bg border border-client-border">
                  <Icon size={18} className="text-client-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
                    <div className="font-semibold text-client-text mt-0.5">{value}</div>
                  </div>
                </div>
              ))}

              {b.meet_link && (
                <a
                  href={b.meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl client-gradient text-white font-semibold shadow-lg shadow-violet-900/40 hover:opacity-95 transition-opacity"
                  data-testid="join-meet-button"
                >
                  <Video size={18} /> Join video call
                </a>
              )}
            </>
          )}

          <Link
            to="/my-bookings"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-client-border text-client-text font-semibold hover:border-client-primary hover:bg-client-primary/10 transition-all"
          >
            <LayoutDashboard size={18} /> Go to my dashboard
          </Link>

          <div className="text-sm text-slate-400 leading-relaxed pt-1">
            {b.emails_sent ? (
              <>
                {b.emails_sent.invitee
                  ? <p>Confirmation sent to <strong className="text-client-text">{b.invitee_email}</strong></p>
                  : <p className="text-amber-400">Email to <strong>{b.invitee_email}</strong> could not be sent.</p>}
                {b.emails_sent.host
                  ? <p className="text-slate-500 text-xs mt-1">Host notified at {b.host_email}</p>
                  : <p className="text-amber-400 text-xs mt-1">Host notification failed.</p>}
              </>
            ) : (
              <p>Confirmation emails have been sent.</p>
            )}
            {b.cancel_token && (
              <p className="mt-3">
                Need to change time?{" "}
                <Link to="/my-bookings" className="text-client-primary font-semibold hover:underline">
                  Reschedule from your dashboard
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </CustomerShell>
  );
}
