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
import CustomerDashboard from "@/pages/CustomerDashboard";
import AuthCallback from "@/pages/AuthCallback";
import ChatbotWidget from "@/components/ChatbotWidget";
import { Toaster } from "sonner";

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-shell p-8 sm:p-12 font-display text-xl sm:text-2xl text-center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  const isCustomerFlow = /^\/(u|book|confirmed|cancel|review|my-bookings)/.test(location.pathname);

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
        <Route path="/my-bookings" element={<CustomerDashboard />} />
        <Route path="/book/:username/:meetingTypeId" element={<BookingPage />} />
        <Route path="/confirmed/:bookingId" element={<BookingConfirmed />} />
        <Route path="/cancel/:bookingId" element={<CancelBooking />} />
        <Route path="/review/:bookingId" element={<ReviewPage />} />
        <Route path="/u/:username" element={<PublicProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isCustomerFlow && <ChatbotWidget />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
        <Toaster
          position="top-center"
          toastOptions={{
            className: "!bg-white !border !border-stone-200 !rounded-xl !shadow-lg",
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
