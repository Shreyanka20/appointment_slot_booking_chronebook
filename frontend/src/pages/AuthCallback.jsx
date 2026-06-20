import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

export default function AuthCallback() {
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) { navigate("/login"); return; }
    const sessionId = decodeURIComponent(match[1]);
    (async () => {
      try {
        const r = await api.post("/auth/google/session", { session_id: sessionId });
        // strip hash
        window.history.replaceState(null, "", window.location.pathname);
        navigate(r.data.user.role === "admin" ? "/admin" : "/dashboard");
        window.location.reload();
      } catch (e) {
        console.error(e);
        navigate("/login");
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="nb-card p-8 font-display text-xl font-semibold text-stone-700">Signing you in…</div>
    </div>
  );
}
