import React, { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import CustomerShell from "@/components/layouts/CustomerShell";
import { addCustomerBooking } from "@/lib/customerBookings";
import { CheckCircle2, Video, Calendar, Mail, LayoutDashboard, ChevronLeft } from "lucide-react";

export default function BookingConfirmed() {
  const { bookingId } = useParams();
  const { state: booking } = useLocation();

  useEffect(() => {
    if (booking?.booking_id) addCustomerBooking(booking);
  }, [booking]);

  return (
    <CustomerShell
      hostName={booking?.host_name || "Your host"}
      meetingTitle={booking?.meeting_title}
      step="confirm"
      showHostPanel={!!booking?.host_name}
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
          {booking?.start_iso && (
            <>
              {[
                { icon: Calendar, label: "When", value: new Date(booking.start_iso).toLocaleString() },
                { icon: Video, label: "Session", value: `${booking.meeting_title} · ${booking.duration_min} min` },
                { icon: Mail, label: "Host", value: booking.host_name },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-4 rounded-xl bg-client-bg border border-client-border">
                  <Icon size={18} className="text-client-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
                    <div className="font-semibold text-client-text mt-0.5">{value}</div>
                  </div>
                </div>
              ))}

              {booking.meet_link && (
                <a
                  href={booking.meet_link}
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
            {booking?.emails_sent ? (
              <>
                {booking.emails_sent.invitee
                  ? <p>Confirmation sent to <strong className="text-client-text">{booking.invitee_email}</strong></p>
                  : <p className="text-amber-400">Email to <strong>{booking.invitee_email}</strong> could not be sent.</p>}
                {booking.emails_sent.host
                  ? <p className="text-slate-500 text-xs mt-1">Host notified at {booking.host_email}</p>
                  : <p className="text-amber-400 text-xs mt-1">Host notification failed.</p>}
              </>
            ) : (
              <p>Confirmation emails have been sent.</p>
            )}
            {booking?.cancel_token && (
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
