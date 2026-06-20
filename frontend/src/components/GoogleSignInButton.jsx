import React from "react";
import { BACKEND_URL } from "@/lib/api";

export default function GoogleSignInButton({ next = "/dashboard", testId = "google-sign-in-button" }) {
  const start = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google/login?next=${encodeURIComponent(next)}`;
  };

  return (
    <button type="button" onClick={start} className="nb-btn nb-btn-secondary w-full flex items-center justify-center gap-2.5" data-testid={testId}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.203 36 24 36c-5.514 0-10-4.486-10-10s4.486-10 10-10c2.485 0 4.746.915 6.486 2.419l5.657-5.657C33.64 9.053 29.082 7 24 7 14.611 7 7 14.611 7 24s7.611 17 17 17c9.389 0 17-7.611 17-17 0-1.341-.148-2.65-.389-3.917z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 13 24 13c2.485 0 4.746.915 6.486 2.419l5.657-5.657C33.64 9.053 29.082 7 24 7 16.318 7 9.656 11.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 41c5.166 0 9.636-1.977 12.928-5.207l-5.966-4.729C29.203 36 24.796 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 41 24 41z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 5.966 4.729C42.021 35.641 44 30.075 44 24c0-1.341-.148-2.65-.389-3.917z" />
      </svg>
      Continue with Google
    </button>
  );
}
