import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", username: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const u = await register(form);
      toast.success(`Welcome, ${u.name}! Your booking page is ready.`);
      navigate("/dashboard");
    } catch (e) {
      setErr(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); }
  };


  return (
    <div className="page-shell">
      <Navbar />
      <div className="app-container max-w-md py-10 sm:py-16">
        <div className="nb-card p-6 sm:p-8">
          <h1 className="font-display text-3xl font-bold text-stone-900 mb-1">Create your page</h1>
          <p className="text-stone-500 text-sm mb-8">Set up your personal booking link in seconds</p>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Full name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="nb-input" data-testid="register-name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Username (your link)</label>
              <div className="flex items-stretch rounded-xl border border-stone-200 overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-400">
                <span className="bg-stone-50 border-r border-stone-200 px-3 flex items-center text-xs text-stone-500 font-medium whitespace-nowrap">
                  chronobook/u/
                </span>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="jane-doe"
                  className="flex-1 px-3 py-2.5 outline-none text-sm bg-white"
                  data-testid="register-username"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="nb-input" data-testid="register-email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Password</label>
              <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="nb-input" data-testid="register-password" />
            </div>
            {err && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-medium" data-testid="register-error">
                {err}
              </div>
            )}
            <button type="submit" disabled={busy} className="nb-btn w-full" data-testid="register-submit-button">
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-xs text-stone-400 font-medium">or</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>
          <GoogleSignInButton testId="register-google-button" />
          <p className="text-sm mt-6 text-center text-stone-500">
            Have an account?{" "}
            <Link to="/login" className="font-semibold text-orange-600 hover:text-orange-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
