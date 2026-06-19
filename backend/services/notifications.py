from datetime import datetime, timezone
import uuid


def _nid() -> str:
    return f"ntf_{uuid.uuid4().hex[:12]}"


async def create_notification(db, user_id: str, title: str, message: str, link: str = "", ntype: str = "info"):
    doc = {
        "notification_id": _nid(),
        "user_id": user_id,
        "title": title,
        "message": message,
        "link": link,
        "type": ntype,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(doc)
    return doc


async def notify_booking_created(db, booking: dict):
    await create_notification(
        db,
        booking["host_user_id"],
        "New booking",
        f"{booking['invitee_name']} booked {booking['meeting_title']}",
        link="/dashboard",
        ntype="booking",
    )


async def notify_booking_cancelled(db, booking: dict, cancelled_by: str):
    if cancelled_by != "host":
        await create_notification(
            db,
            booking["host_user_id"],
            "Booking cancelled",
            f"{booking['invitee_name']} cancelled {booking['meeting_title']}",
            link="/dashboard",
            ntype="cancel",
        )
