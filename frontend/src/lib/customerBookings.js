const STORAGE_KEY = "chrono_customer";

export function getCustomerSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { email: "", bookings: [] };
  } catch {
    return { email: "", bookings: [] };
  }
}

export function saveCustomerEmail(email) {
  const session = getCustomerSession();
  session.email = email.toLowerCase().trim();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function addCustomerBooking(booking) {
  const session = getCustomerSession();
  if (booking.invitee_email) {
    session.email = booking.invitee_email.toLowerCase();
  }
  const idx = session.bookings.findIndex((b) => b.booking_id === booking.booking_id);
  const entry = {
    booking_id: booking.booking_id,
    cancel_token: booking.cancel_token,
    invitee_email: booking.invitee_email,
    invitee_name: booking.invitee_name,
    host_name: booking.host_name,
    host_user_id: booking.host_user_id,
    meeting_type_id: booking.meeting_type_id,
    meeting_title: booking.meeting_title,
    start_iso: booking.start_iso,
    duration_min: booking.duration_min,
    meet_link: booking.meet_link,
    status: booking.status || "confirmed",
  };
  if (idx >= 0) session.bookings[idx] = { ...session.bookings[idx], ...entry };
  else session.bookings.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function mergeBookingsFromApi(apiBookings, session) {
  const tokenById = Object.fromEntries(
    session.bookings.map((b) => [b.booking_id, b.cancel_token])
  );
  return apiBookings.map((b) => ({
    ...b,
    cancel_token: b.cancel_token || tokenById[b.booking_id],
  }));
}
