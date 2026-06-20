import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";

const GOOGLE_ERRORS = {
  google_denied: "Google sign-in was cancelled.",
  google_invalid: "Google sign-in failed. Please try again.",
  google_failed: "Could not sign in with Google. Check server configuration.",
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("error");
    if (code && GOOGLE_ERRORS[code]) {
      setErr(GOOGLE_ERRORS[code]);
    }
  }, [searchParams]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}`);
      navigate(u.role === "admin" ? "/admin" : "/dashboard");
    } catch (e) {
      setErr(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="app-container max-w-md py-10 sm:py-16">
        <div className="nb-card p-6 sm:p-8">
          <h1 className="font-display text-3xl font-bold text-stone-900 mb-1">Welcome back</h1>
          <p className="text-stone-500 text-sm mb-8">Sign in to manage your bookings</p>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="nb-input" data-testid="login-email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="nb-input" data-testid="login-password" />
            </div>
            {err && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-medium" data-testid="login-error">
                {err}
              </div>
            )}
            <button type="submit" disabled={busy} className="nb-btn w-full" data-testid="login-submit-button">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-xs text-stone-400 font-medium">or</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>
          <GoogleSignInButton testId="login-google-button" />
          <p className="text-sm mt-6 text-center text-stone-500">
            New here?{" "}
            <Link to="/register" className="font-semibold text-orange-600 hover:text-orange-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
