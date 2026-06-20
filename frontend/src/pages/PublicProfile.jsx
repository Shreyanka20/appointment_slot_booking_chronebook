import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import CustomerShell from "@/components/layouts/CustomerShell";
import { api } from "@/lib/api";
import { Clock, ArrowRight, Star, Video } from "lucide-react";

export default function PublicProfile() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState({ reviews: [], average_rating: 0, count: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [profile, rev] = await Promise.all([
          api.get(`/profile/${username}`),
          api.get(`/reviews/${username}`).catch(() => ({ data: { reviews: [], average_rating: 0, count: 0 } })),
        ]);
        setData(profile.data);
        setReviews(rev.data);
      } catch (e) {
        setError("Profile not found");
      }
    })();
  }, [username]);

  if (error) {
    return (
      <CustomerShell hostName="Not found" showHostPanel={false}>
        <div className="client-card rounded-2xl border p-8 text-center shadow-xl shadow-black/20">
          <p className="font-display text-xl text-client-text">{error}</p>
        </div>
      </CustomerShell>
    );
  }

  if (!data) {
    return (
      <CustomerShell hostName="Loading" showHostPanel={false}>
        <div className="client-card rounded-2xl border p-8 text-center text-slate-400">Loading…</div>
      </CustomerShell>
    );
  }

  const { user, meeting_types } = data;

  return (
    <CustomerShell
      hostName={user.name}
      hostUsername={user.username}
      hostBio={user.bio}
      step="profile"
    >
      <div data-testid="public-profile-root">
        <div className="client-card rounded-2xl border overflow-hidden shadow-xl shadow-black/30">
          <div className="px-5 sm:px-6 py-4 border-b border-client-border client-gradient">
            <h2 className="font-display text-lg font-bold text-white">Select a session</h2>
            <p className="text-sm text-indigo-100/80 mt-0.5">Choose the type of meeting you'd like to book</p>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            {meeting_types.map((m) => (
              <Link
                to={`/book/${user.username}/${m.meeting_type_id}`}
                key={m.meeting_type_id}
                data-testid={`mt-link-${m.meeting_type_id}`}
                className="group block"
              >
                <div className="flex items-center gap-4 p-4 rounded-xl border border-client-border bg-client-bg/50 hover:border-client-primary hover:bg-client-primary/10 transition-all">
                  <div
                    style={{ background: m.color }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                  >
                    <Video size={20} className="text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base sm:text-lg font-bold text-client-text group-hover:text-violet-300 transition-colors">
                      {m.title}
                    </div>
                    <div className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Clock size={13} /> {m.duration_min} min
                    </div>
                  </div>
                  <ArrowRight className="text-slate-600 group-hover:text-client-primary group-hover:translate-x-1 transition-all shrink-0" size={20} />
                </div>
              </Link>
            ))}

            {meeting_types.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-sm">
                No sessions available right now. Please check back later.
              </div>
            )}
          </div>

          {reviews.count > 0 && (
            <div className="px-5 sm:px-6 py-5 border-t border-client-border bg-client-bg/60">
              <div className="flex items-center gap-2 mb-3">
                <Star size={16} className="text-amber-400" fill="currentColor" />
                <span className="font-bold text-client-text">{reviews.average_rating}</span>
                <span className="text-sm text-slate-400">({reviews.count} reviews)</span>
              </div>
              <div className="space-y-2">
                {reviews.reviews.slice(0, 2).map((r) => (
                  <p key={r.review_id} className="text-sm text-slate-400 italic">"{r.comment || "Great meeting!"}" — {r.reviewer_name}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </CustomerShell>
  );
}
