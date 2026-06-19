"""
meet_service.py
===============
Generates Google Meet links for each booking.

HOW IT WORKS
------------
Google Meet links can only be created via the Google Calendar API when
authenticated as the HOST (OAuth2).  Until the host connects their Google
account, we fall back to a stable Jitsi room so bookings still have a
working video link from day 1.

UPGRADE PATH (real Google Meet)
--------------------------------
1. Enable Google Calendar API in Google Cloud Console.
2. Create an OAuth 2.0 client (type: Web application).
   - Authorized redirect URI: <FRONTEND_URL>/auth/google/callback
3. Set env vars:
      GOOGLE_CLIENT_ID=...
      GOOGLE_CLIENT_SECRET=...
4. After the host logs in via Google, store their refresh_token in the
   `users` collection as `google_refresh_token`.
5. The `_create_google_meet()` helper below will then create a real
   Calendar event with conferenceData, returning a real meet.google.com link.

ENV VARS (optional)
-------------------
GOOGLE_CLIENT_ID      – OAuth2 client id
GOOGLE_CLIENT_SECRET  – OAuth2 client secret
JITSI_HOST            – override Jitsi server (default: meet.jit.si)
"""

import os
import secrets
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

JITSI_HOST = os.environ.get("JITSI_HOST", "meet.jit.si")


def _google_oauth_config() -> tuple[str, str]:
    return (
        os.environ.get("GOOGLE_CLIENT_ID", "").strip(),
        os.environ.get("GOOGLE_CLIENT_SECRET", "").strip(),
    )


# ── Jitsi fallback ────────────────────────────────────────────────────────────

def _jitsi_link(booking_id: str) -> str:
    """A stable, unguessable Jitsi room for this booking."""
    room = f"cb-{booking_id.replace('bk_', '')}"
    return (
        f"https://{JITSI_HOST}/{room}"
        f"#config.prejoinPageEnabled=false"
        f"&config.startWithAudioMuted=true"
    )


# ── Google Calendar / Meet ────────────────────────────────────────────────────

def _create_google_meet(
    host: dict,
    meeting_title: str,
    start_iso: str,
    duration_min: int,
    booking_id: str,
) -> str | None:
    """
    Create a Google Calendar event with a Meet link and return the Meet URL.
    Returns None if anything fails (caller falls back to Jitsi).

    Requires:
      - host["google_refresh_token"] to be set
      - GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in env
    """
    refresh_token = host.get("google_refresh_token")
    google_client_id, google_client_secret = _google_oauth_config()
    if not refresh_token or not google_client_id or not google_client_secret:
        missing = []
        if not refresh_token:
            missing.append("host.google_refresh_token")
        if not google_client_id:
            missing.append("GOOGLE_CLIENT_ID")
        if not google_client_secret:
            missing.append("GOOGLE_CLIENT_SECRET")
        logger.info(
            "[MEET] Google Meet skipped for %s — missing: %s",
            booking_id,
            ", ".join(missing),
        )
        return None

    try:
        import httpx, json

        # 1. Exchange refresh token for access token
        token_resp = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id":     google_client_id,
                "client_secret": google_client_secret,
                "refresh_token": refresh_token,
                "grant_type":    "refresh_token",
            },
            timeout=10,
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        # 2. Build event body
        try:
            start_dt = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
        except Exception:
            start_dt = datetime.now(timezone.utc) + timedelta(hours=1)
        end_dt = start_dt + timedelta(minutes=duration_min)

        event_body = {
            "summary": meeting_title,
            "description": f"Booked via ChronoBook (#{booking_id})",
            "start":  {"dateTime": start_dt.isoformat(), "timeZone": "UTC"},
            "end":    {"dateTime": end_dt.isoformat(),   "timeZone": "UTC"},
            "attendees": [
                {"email": host["email"]},
            ],
            "conferenceData": {
                "createRequest": {
                    "requestId":             booking_id,
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            },
        }

        # 3. Insert event
        cal_resp = httpx.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            params={"conferenceDataVersion": "1", "sendUpdates": "none"},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type":  "application/json",
            },
            content=json.dumps(event_body),
            timeout=15,
        )
        cal_resp.raise_for_status()
        data = cal_resp.json()

        meet_link = (
            data.get("conferenceData", {})
               .get("entryPoints", [{}])[0]
               .get("uri", "")
        )
        if meet_link:
            logger.info("Created Google Meet for booking %s: %s", booking_id, meet_link)
            return meet_link

    except Exception:
        logger.warning(
            "Google Meet creation failed for booking %s — falling back to Jitsi",
            booking_id,
            exc_info=True,
        )
    return None


# ── Public API ────────────────────────────────────────────────────────────────

def create_meet_link(
    booking_id:    str,
    host:          dict,
    meeting_title: str,
    start_iso:     str  = "",
    duration_min:  int  = 30,
) -> str:
    """
    Return the best available video call link for this booking.

    Priority:
      1. Host's manually-set default_meet_link (static override)
      2. Host's custom_video_url (if video_mode == "custom")
      3. Real Google Meet via Calendar API (if host has google_refresh_token)
      4. Jitsi stable room (always available)
    """
    host_id = host.get("user_id", "?")
    video_mode = host.get("video_mode", "google_meet")
    logger.info(
        "[MEET] create_meet_link booking=%s host=%s video_mode=%s default_meet_link=%r custom_video_url=%r",
        booking_id,
        host_id,
        video_mode,
        bool(host.get("default_meet_link")),
        bool(host.get("custom_video_url")),
    )

    # Static override
    if host.get("default_meet_link"):
        link = host["default_meet_link"]
        logger.info("[MEET] Using host default_meet_link for %s → %s", booking_id, link)
        return link

    if video_mode == "none":
        logger.warning(
            "[MEET] No meet link for %s — host video_mode is 'none' (Dashboard → Video settings)",
            booking_id,
        )
        return ""

    if video_mode == "custom" and host.get("custom_video_url"):
        link = host["custom_video_url"]
        logger.info("[MEET] Using host custom_video_url for %s → %s", booking_id, link)
        return link

    # Try real Google Meet
    if video_mode in ("google_meet", "custom"):
        real_link = _create_google_meet(
            host, meeting_title, start_iso, duration_min, booking_id
        )
        if real_link:
            return real_link

    # Jitsi fallback — always works, no auth required
    link = _jitsi_link(booking_id)
    logger.info("[MEET] Jitsi fallback for %s → %s", booking_id, link)
    return link


def generate_cancel_token() -> str:
    return secrets.token_urlsafe(32)
