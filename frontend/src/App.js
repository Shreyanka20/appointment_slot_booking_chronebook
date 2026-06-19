import React from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import PublicProfile from "@/pages/PublicProfile";
import BookingPage from "@/pages/BookingPage";
import BookingConfirmed from "@/pages/BookingConfirmed";
import CancelBooking from "@/pages/CancelBooking";
import ReviewPage from "@/pages/ReviewPage";
import ChatbotWidget from "@/components/ChatbotWidget";
import { Toaster } from "sonner";

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 font-display text-2xl">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  // Handle OAuth callback (URL fragment with session_id)
  if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        <Route path="/book/:username/:meetingTypeId" element={<BookingPage />} />
        <Route path="/confirmed/:bookingId" element={<BookingConfirmed />} />
        <Route path="/cancel/:bookingId" element={<CancelBooking />} />
        <Route path="/review/:bookingId" element={<ReviewPage />} />
        <Route path="/u/:username" element={<PublicProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatbotWidget />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
        <Toaster
          position="top-right"
          toastOptions={{
            className: "!bg-white !border !border-slate-200 !rounded-xl !shadow-lg",
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
