import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { Clock, ArrowRight, Star } from "lucide-react";

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

  if (error) return <div className="min-h-screen bg-slate-50"><Navbar /><div className="p-16 font-display text-2xl text-slate-700">{error}</div></div>;
  if (!data) return <div className="min-h-screen bg-slate-50"><Navbar /><div className="p-16 font-display text-xl text-slate-500">Loading…</div></div>;

  const { user, meeting_types } = data;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 md:px-10 py-12" data-testid="public-profile-root">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4">
            <div className="nb-card p-6 bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-100">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-display text-3xl font-bold text-white mb-4 shadow-md shadow-indigo-200">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="text-sm text-indigo-600 font-medium mb-1">@{user.username}</div>
              <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">{user.name}</h1>
              {reviews.count > 0 && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Star size={16} className="text-amber-400" fill="currentColor" />
                  <span className="font-semibold text-slate-900">{reviews.average_rating}</span>
                  <span className="text-sm text-slate-500">({reviews.count} reviews)</span>
                </div>
              )}
              <p className="text-sm text-slate-600">{user.bio || "Schedule a meeting using one of the options below."}</p>
            </div>
          </div>
          <div className="md:col-span-8">
            <p className="text-sm font-medium text-slate-500 mb-4">Choose a meeting type</p>
            <div className="space-y-3">
              {meeting_types.map((m) => (
                <Link to={`/book/${user.username}/${m.meeting_type_id}`} key={m.meeting_type_id} data-testid={`mt-link-${m.meeting_type_id}`}>
                  <div className="nb-card p-5 flex items-center justify-between hover:shadow-lg transition-shadow cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div style={{ background: m.color }} className="w-12 h-12 rounded-xl flex items-center justify-center">
                        <Clock size={20} strokeWidth={2} className="text-slate-700" />
                      </div>
                      <div>
                        <div className="font-display text-lg font-bold text-slate-900">{m.title}</div>
                        <div className="text-sm text-slate-500">{m.duration_min} minutes</div>
                      </div>
                    </div>
                    <ArrowRight className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" size={20} />
                  </div>
                </Link>
              ))}
              {meeting_types.length === 0 && (
                <div className="nb-card p-8 text-center text-slate-500">This host hasn't set up any meeting types yet.</div>
              )}
            </div>
            {reviews.reviews.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-lg font-bold text-slate-900 mb-4">Reviews</h2>
                <div className="space-y-3">
                  {reviews.reviews.slice(0, 5).map((r) => (
                    <div key={r.review_id} className="nb-card p-4">
                      <div className="flex items-center gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} size={14} className={n <= r.rating ? "text-amber-400" : "text-slate-200"} fill={n <= r.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                      {r.comment && <p className="text-sm text-slate-600">{r.comment}</p>}
                      <p className="text-xs text-slate-400 mt-2">— {r.reviewer_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
