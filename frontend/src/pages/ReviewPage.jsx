import React, { useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import CustomerShell from "@/components/layouts/CustomerShell";
import { api } from "@/lib/api";
import { Star } from "lucide-react";
import { toast } from "sonner";

export default function ReviewPage() {
  const { bookingId } = useParams();
  const [search] = useSearchParams();
  const token = search.get("token");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return toast.error("Please select a rating");
    setBusy(true);
    try {
      await api.post(`/bookings/${bookingId}/review`, { rating, comment, cancel_token: token });
      setDone(true);
      toast.success("Thanks for your review!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not submit review");
    } finally { setBusy(false); }
  };

  return (
    <CustomerShell hostName="Rate your session" showHostPanel={false}>
      <div className="client-card rounded-2xl border p-6 sm:p-8 shadow-xl shadow-black/30">
        {done ? (
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-client-text mb-2">Thank you!</h1>
            <p className="text-slate-400 mb-6">Your feedback helps others book with confidence.</p>
            <Link to="/" className="inline-flex px-6 py-3 rounded-xl client-gradient text-white font-semibold text-sm">
              Done
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold text-client-text mb-1">How was your meeting?</h1>
            <p className="text-slate-400 text-sm mb-6">Rate your experience with the host</p>
            <form onSubmit={submit} className="space-y-5">
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`p-2 rounded-lg transition-colors ${rating >= n ? "text-amber-400" : "text-slate-600"}`}
                  >
                    <Star size={32} fill={rating >= n ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Comment (optional)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-client-border bg-client-bg px-4 py-3 text-client-text outline-none focus:border-client-primary"
                  placeholder="Share your experience…"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 rounded-xl client-gradient text-white font-semibold disabled:opacity-60"
              >
                {busy ? "Submitting…" : "Submit review"}
              </button>
            </form>
          </>
        )}
      </div>
    </CustomerShell>
  );
}
