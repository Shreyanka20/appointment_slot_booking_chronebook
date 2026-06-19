import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from datetime import datetime

logger = logging.getLogger(__name__)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


def _log(msg: str) -> None:
    print(msg, flush=True)
    logger.info(msg)


def _log_error(msg: str) -> None:
    print(msg, flush=True)
    logger.error(msg)


def _smtp_config():
    # Strip surrounding quotes that get added in .env files
    from_raw = os.environ.get("EMAIL_FROM") or os.environ.get("SMTP_USER", "noreply@chronobook.app")
    from_clean = from_raw.strip().strip('"').strip("'")
    return {
        "host": os.environ.get("SMTP_HOST", ""),
        "port": int(os.environ.get("SMTP_PORT", "587")),
        "user": os.environ.get("SMTP_USER", "").strip(),
        "password": os.environ.get("SMTP_PASSWORD", "").strip(),
        "from_addr": from_clean,
    }


def _enabled() -> bool:
    c = _smtp_config()
    return bool(c["host"] and c["user"] and c["password"])


def smtp_status() -> dict:
    c = _smtp_config()
    return {
        "enabled": _enabled(),
        "host": c["host"],
        "user": c["user"],
    }


def _send(to: str, subject: str, html: str) -> bool:
    if not _enabled():
        msg = "[EMAIL skipped] SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in backend/.env"
        _log_error(msg)
        return False
    c = _smtp_config()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr(("ChronoBook", c["user"]))
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP(c["host"], c["port"], timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(c["user"], c["password"])
            server.sendmail(c["user"], [to], msg.as_string())
        _log(f"[EMAIL] sent → to={to} subject={subject}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        _log_error(
            f"[EMAIL] SMTP auth failed for {c['user']} — use a Gmail App Password. Error: {e}"
        )
        return False
    except Exception as e:
        _log_error(f"[EMAIL] failed → to={to} error={type(e).__name__}: {e}")
        logger.exception("Failed to send email to %s", to)
        return False


def _fmt_time(iso: str) -> str:
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).strftime(
            "%A, %b %d %Y · %I:%M %p UTC"
        )
    except Exception:
        return iso


# ── Brand colors ──────────────────────────────────────────────
_BRAND   = "#6366f1"
_BRAND2  = "#8b5cf6"
_SUCCESS = "#10b981"
_CANCEL  = "#ef4444"
_BG      = "#f8fafc"
_CARD_BG = "#ffffff"
_BORDER  = "#e2e8f0"
_TEXT    = "#0f172a"
_MUTED   = "#64748b"


def _base(title: str, body: str, accent: str = _BRAND) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:{_BG};font-family:'Inter',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:{_BG};padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,{_BRAND} 0%,{_BRAND2} 100%);border-radius:16px 16px 0 0;padding:28px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:10px;padding:6px 10px;font-size:12px;font-weight:700;color:#fff;letter-spacing:0.08em;text-transform:uppercase;">ChronoBook</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:{_CARD_BG};padding:32px;border-left:1px solid {_BORDER};border-right:1px solid {_BORDER};">
          {body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f1f5f9;border-radius:0 0 16px 16px;padding:20px 32px;border:1px solid {_BORDER};border-top:none;">
          <p style="margin:0;font-size:12px;color:{_MUTED};line-height:1.5;">
            You received this because a meeting was scheduled on ChronoBook. 
            If you didn't book anything, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _detail_row(label: str, value: str) -> str:
    return f"""<tr>
      <td style="padding:10px 0;border-bottom:1px solid {_BORDER};vertical-align:top;">
        <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:{_MUTED};">{label}</span>
      </td>
      <td style="padding:10px 0 10px 16px;border-bottom:1px solid {_BORDER};vertical-align:top;">
        <span style="font-size:15px;font-weight:600;color:{_TEXT};">{value}</span>
      </td>
    </tr>"""


def send_booking_confirmation(booking: dict, recipient: str, role: str) -> bool:
    meet = booking.get("meet_link", "")
    booking_id = booking.get("booking_id", "?")
    if meet:
        logger.info(
            "[EMAIL] meet link WILL be included → booking=%s role=%s to=%s link=%s",
            booking_id, role, recipient, meet,
        )
    else:
        logger.warning(
            "[EMAIL] meet link MISSING from email → booking=%s role=%s to=%s "
            "(booking.meet_link is empty — check [MEET] logs above)",
            booking_id, role, recipient,
        )
    meet_btn = ""
    if meet:
        btn_label = "Join Google Meet" if "meet.google.com" in meet else "Join video call"
        meet_btn = f"""
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
  <tr><td>
    <a href="{meet}" style="display:inline-block;background:linear-gradient(135deg,{_BRAND} 0%,{_BRAND2} 100%);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;box-shadow:0 4px 12px rgba(99,102,241,0.35);">
      🎥 {btn_label}
    </a>
  </td></tr>
</table>
<p style="font-size:12px;color:{_MUTED};margin:4px 0 0;">Or copy: <span style="font-family:monospace;background:#f1f5f9;padding:2px 6px;border-radius:4px;">{meet}</span></p>
"""

    cancel_url = (
        f"{FRONTEND_URL}/cancel/{booking['booking_id']}?token={booking.get('cancel_token', '')}"
    )
    other_name  = booking["invitee_name"] if role == "host" else booking["host_name"]
    other_label = "Guest" if role == "host" else "Host"
    greeting    = f"Hi {booking['host_name']}," if role == "host" else f"Hi {booking['invitee_name']},"

    body = f"""
<h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:{_TEXT};letter-spacing:-0.03em;">✅ You're booked!</h1>
<p style="margin:0 0 24px;font-size:15px;color:{_MUTED};line-height:1.6;">{greeting} Your meeting is confirmed. Here are the details:</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  {_detail_row("Meeting", booking['meeting_title'])}
  {_detail_row("When", _fmt_time(booking['start_iso']))}
  {_detail_row("Duration", f"{booking['duration_min']} minutes")}
  {_detail_row(other_label, other_name)}
  {_detail_row("Booking ID", f"#{booking['booking_id'][-8:]}")}
</table>

{meet_btn}

<p style="margin:24px 0 0;font-size:13px;color:{_MUTED};">
  Need to cancel? <a href="{cancel_url}" style="color:{_BRAND};font-weight:600;text-decoration:none;">Cancel this booking</a>
</p>
"""
    subject = f"✅ Confirmed: {booking['meeting_title']} on {_fmt_time(booking['start_iso'])}"
    sent = _send(recipient, subject, _base("You're booked!", body))
    if sent:
        logger.info(
            "[EMAIL] confirmation sent → booking=%s role=%s to=%s meet_in_email=%s",
            booking_id, role, recipient, bool(meet),
        )
    else:
        logger.error(
            "[EMAIL] confirmation FAILED → booking=%s role=%s to=%s meet_in_email=%s",
            booking_id, role, recipient, bool(meet),
        )
    return sent


def send_booking_cancellation(booking: dict, recipient: str) -> bool:
    body = f"""
<h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:{_TEXT};letter-spacing:-0.03em;">❌ Meeting Cancelled</h1>
<p style="margin:0 0 24px;font-size:15px;color:{_MUTED};line-height:1.6;">The following meeting has been <strong style="color:{_CANCEL};">cancelled</strong>.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  {_detail_row("Meeting", booking['meeting_title'])}
  {_detail_row("Was scheduled", _fmt_time(booking['start_iso']))}
</table>

<p style="font-size:13px;color:{_MUTED};margin:0;">
  If you'd like to reschedule, visit <a href="{FRONTEND_URL}" style="color:{_BRAND};font-weight:600;text-decoration:none;">ChronoBook</a>.
</p>
"""
    return _send(
        recipient,
        f"❌ Cancelled: {booking['meeting_title']}",
        _base("Meeting cancelled", body, _CANCEL),
    )


def send_meeting_reminder(booking: dict, recipient: str, hours_before: int) -> bool:
    meet = booking.get("meet_link", "")
    meet_btn = ""
    if meet:
        meet_btn = f"""
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
  <tr><td>
    <a href="{meet}" style="display:inline-block;background:linear-gradient(135deg,{_BRAND} 0%,{_BRAND2} 100%);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">
      🎥 Join meeting
    </a>
  </td></tr>
</table>
"""
    body = f"""
<h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:{_TEXT};letter-spacing:-0.03em;">⏰ Meeting in {hours_before}h</h1>
<p style="margin:0 0 24px;font-size:15px;color:{_MUTED};line-height:1.6;">
  <strong>{booking['meeting_title']}</strong> starts in approximately {hours_before} hour{'s' if hours_before != 1 else ''}.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
  {_detail_row("When", _fmt_time(booking['start_iso']))}
  {_detail_row("Duration", f"{booking['duration_min']} minutes")}
</table>

{meet_btn}
"""
    return _send(
        recipient,
        f"⏰ Reminder: {booking['meeting_title']} in {hours_before}h",
        _base("Upcoming meeting", body),
    )
