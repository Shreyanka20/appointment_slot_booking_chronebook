import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { CheckCircle2, Video, Calendar } from "lucide-react";

export default function BookingConfirmed() {
  const { bookingId } = useParams();
  const { state } = useLocation();
  const b = state || {};
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="nb-card p-10 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100" data-testid="booking-confirmed-root">
          <CheckCircle2 size={48} className="text-emerald-600" strokeWidth={2} />
          <p className="text-sm text-emerald-700 font-medium mt-4 mb-1">Booking #{bookingId}</p>
          <h1 className="font-display text-4xl font-bold text-slate-900 mb-6">You're booked!</h1>
          {b.start_iso && (
            <>
              <div className="bg-white rounded-xl border border-slate-100 p-4 mb-3 shadow-sm">
                <div className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1"><Calendar size={12}/> When</div>
                <div className="font-display text-lg font-bold text-slate-900">{new Date(b.start_iso).toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4 mb-3 shadow-sm">
                <div className="text-xs text-slate-500 font-medium mb-1">What</div>
                <div className="font-display text-lg font-bold text-slate-900">{b.meeting_title} · {b.duration_min} min</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4 mb-3 shadow-sm">
                <div className="text-xs text-slate-500 font-medium mb-1">With</div>
                <div className="font-display text-lg font-bold text-slate-900">{b.host_name}</div>
              </div>
              {b.meet_link && (
                <a
                  href={b.meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full nb-btn mb-3"
                  data-testid="join-meet-button"
                >
                  <Video size={18} /> Join video call
                </a>
              )}
            </>
          )}
          <p className="text-slate-600 text-sm mb-6">
            {b.emails_sent ? (
              <>
                {b.emails_sent.invitee
                  ? <>Confirmation email sent to <strong>{b.invitee_email}</strong>.</>
                  : <>Could not send email to <strong>{b.invitee_email}</strong> — check backend logs.</>}
                {" "}
                {b.emails_sent.host
                  ? <>Host notified at <strong>{b.host_email}</strong>.</>
                  : <>Host email to <strong>{b.host_email}</strong> failed — check spam or SMTP logs.</>}
              </>
            ) : (
              <>Confirmation emails sent to you and {b.host_name || "the host"}.</>
            )}
            {b.cancel_token && (
              <> You can <Link to={`/cancel/${bookingId}?token=${b.cancel_token}`} className="text-indigo-600 font-medium hover:underline">cancel</Link> anytime.</>
            )}
          </p>
          <Link to="/" className="nb-btn nb-btn-secondary">Back to home</Link>
        </div>
      </main>
    </div>
  );
}
