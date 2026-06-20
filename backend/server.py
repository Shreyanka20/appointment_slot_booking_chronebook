from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import secrets
import bcrypt
import jwt as pyjwt
import httpx
from datetime import datetime, timezone, timedelta, date as dt_date, time as dt_time
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse, RedirectResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
    HAS_LLM = True
except ImportError:
    HAS_LLM = False
    LlmChat = UserMessage = TextDelta = StreamDone = None  # type: ignore

from services.email_service import send_booking_confirmation, send_booking_cancellation, smtp_status
from services.meet_service import create_meet_link, generate_cancel_token
from services import notifications as notify_svc
from services import google_oauth


# ---------- Setup ----------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

app = FastAPI(title="ChronoBook API")
api = APIRouter(prefix="/api")


# ---------- Utils ----------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    return pyjwt.encode(
        {
            "sub": user_id,
            "email": email,
            "type": "access",
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
        },
        JWT_SECRET,
        algorithm=JWT_ALGO,
    )


def _use_cross_site_cookies() -> bool:
    explicit = os.environ.get("COOKIE_CROSS_SITE", "").lower()
    if explicit in ("1", "true", "yes"):
        return True
    if explicit in ("0", "false", "no"):
        return False
    if os.environ.get("RENDER") or FRONTEND_URL.startswith("https://"):
        return True
    return False


def set_auth_cookie(response: Response, token: str):
    cross_site = _use_cross_site_cookies()
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=cross_site,
        samesite="none" if cross_site else "lax",
        max_age=7 * 24 * 3600,
        path="/",
    )


def gen_id(prefix: str = "u") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Try JWT first
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if user:
            return user
    except Exception:
        pass

    # Try as Emergent session token
    sess = await db.sessions.find_one({"session_token": token}, {"_id": 0})
    if sess:
        exp = sess.get("expires_at")
        if isinstance(exp, str):
            exp = datetime.fromisoformat(exp)
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp >= datetime.now(timezone.utc):
            user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0, "password_hash": 0})
            if user:
                return user

    raise HTTPException(status_code=401, detail="Invalid or expired token")


async def require_admin(user=Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ---------- Models ----------
class RegisterReq(BaseModel):
    name: str
    email: EmailStr
    password: str
    username: Optional[str] = None


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class MeetingTypeReq(BaseModel):
    title: str
    description: Optional[str] = ""
    duration_min: int = 30
    color: str = "#FFD54F"


class AvailabilityReq(BaseModel):
    # weekly schedule: list of {weekday: 0-6, start: "HH:MM", end: "HH:MM"}
    rules: List[dict]
    timezone: str = "UTC"


class BookingReq(BaseModel):
    meeting_type_id: str
    host_user_id: str
    start_iso: str  # ISO date+time
    invitee_name: str
    invitee_email: EmailStr
    notes: Optional[str] = ""


class ChatReq(BaseModel):
    session_id: str
    message: str


class ReviewReq(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = ""
    reviewer_name: Optional[str] = ""
    cancel_token: Optional[str] = None


class VideoSettingsReq(BaseModel):
    video_mode: Literal["google_meet", "custom", "none"] = "google_meet"
    default_meet_link: Optional[str] = ""
    custom_video_url: Optional[str] = ""


class CancelTokenReq(BaseModel):
    token: str


class InviteeLookupReq(BaseModel):
    email: EmailStr


class RescheduleReq(BaseModel):
    token: str
    start_iso: str


# ---------- Auth Endpoints ----------
def _slugify(s: str) -> str:
    import re
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return s or f"user-{uuid.uuid4().hex[:6]}"


async def unique_username(base: str) -> str:
    candidate = base
    i = 1
    while await db.users.find_one({"username": candidate}):
        i += 1
        candidate = f"{base}-{i}"
    return candidate


async def seed_new_host(uid: str):
    for mt in [
        {"title": "15 Minute Chat", "duration_min": 15, "color": "#BBDEFB"},
        {"title": "30 Minute Meeting", "duration_min": 30, "color": "#FFD54F"},
        {"title": "60 Minute Deep Dive", "duration_min": 60, "color": "#A5D6A7"},
    ]:
        await db.meeting_types.insert_one({
            "meeting_type_id": gen_id("mt"),
            "user_id": uid,
            "title": mt["title"],
            "description": "",
            "duration_min": mt["duration_min"],
            "color": mt["color"],
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    await db.availability.insert_one({
        "user_id": uid,
        "timezone": "UTC",
        "rules": [{"weekday": wd, "start": "09:00", "end": "17:00"} for wd in range(0, 5)],
    })


async def find_or_create_google_user(profile: dict) -> dict:
    email = profile["email"].lower()
    google_id = profile.get("sub", "")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        updates = {}
        if google_id and user.get("google_id") != google_id:
            updates["google_id"] = google_id
        if profile.get("picture") and not user.get("picture"):
            updates["picture"] = profile["picture"]
        if updates:
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
            user.update(updates)
        return user

    uid = gen_id("u")
    username = await unique_username(_slugify(profile.get("name") or email.split("@")[0]))
    doc = {
        "user_id": uid,
        "name": profile.get("name") or email.split("@")[0],
        "email": email,
        "username": username,
        "password_hash": "",
        "google_id": google_id,
        "role": "user",
        "picture": profile.get("picture", ""),
        "bio": "",
        "timezone": "UTC",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    await seed_new_host(uid)
    doc.pop("_id", None)
    return doc


def public_user(u: dict) -> dict:
    return {
        "user_id": u["user_id"],
        "name": u["name"],
        "email": u["email"],
        "username": u.get("username"),
        "picture": u.get("picture"),
        "role": u.get("role", "user"),
        "bio": u.get("bio", ""),
    }


@api.post("/auth/register")
async def register(req: RegisterReq, response: Response):
    email = req.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    username = await unique_username(req.username or _slugify(req.name))
    uid = gen_id("u")
    doc = {
        "user_id": uid,
        "name": req.name,
        "email": email,
        "username": username,
        "password_hash": hash_password(req.password),
        "role": "user",
        "picture": "",
        "bio": "",
        "timezone": "UTC",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    await seed_new_host(uid)
    token = create_access_token(uid, email)
    set_auth_cookie(response, token)
    return {"user": public_user(doc), "token": token}


@api.post("/auth/login")
async def login(req: LoginReq, response: Response):
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["user_id"], email)
    set_auth_cookie(response, token)
    return {"user": public_user(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return public_user(user)


@api.get("/auth/google/login")
async def google_login(next: str = "/dashboard"):
    if not google_oauth.is_configured():
        raise HTTPException(status_code=503, detail="Google sign-in is not configured on the server")
    if not next.startswith("/") or next.startswith("//"):
        next = "/dashboard"
    state = google_oauth.new_state()
    cross_site = _use_cross_site_cookies()
    response = RedirectResponse(google_oauth.build_auth_url(state), status_code=302)
    response.set_cookie("oauth_state", state, httponly=True, max_age=600, samesite="lax", secure=cross_site, path="/")
    response.set_cookie("oauth_next", next, httponly=True, max_age=600, samesite="lax", secure=cross_site, path="/")
    return response


@api.get("/auth/google/callback")
async def google_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    front = FRONTEND_URL.rstrip("/")
    if error:
        return RedirectResponse(f"{front}/login?error=google_denied")
    saved_state = request.cookies.get("oauth_state")
    next_path = request.cookies.get("oauth_next") or "/dashboard"
    if not code or not state or not saved_state or state != saved_state:
        return RedirectResponse(f"{front}/login?error=google_invalid")
    try:
        profile = await google_oauth.exchange_code(code)
        user = await find_or_create_google_user(profile)
    except Exception as exc:
        logger.exception("Google OAuth callback failed: %s", exc)
        return RedirectResponse(f"{front}/login?error=google_failed")
    token = create_access_token(user["user_id"], user["email"])
    dest = "/admin" if user.get("role") == "admin" else next_path
    response = RedirectResponse(f"{front}{dest}")
    response.delete_cookie("oauth_state", path="/")
    response.delete_cookie("oauth_next", path="/")
    set_auth_cookie(response, token)
    return response


@api.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    # Process Emergent Google Auth session_id and create/lookup user
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = r.json()
    email = data["email"].lower()
    user = await db.users.find_one({"email": email})
    if not user:
        uid = gen_id("u")
        username = await unique_username(_slugify(data.get("name") or email.split("@")[0]))
        doc = {
            "user_id": uid,
            "name": data.get("name", email),
            "email": email,
            "username": username,
            "password_hash": "",  # google-only
            "role": "user",
            "picture": data.get("picture", ""),
            "bio": "",
            "timezone": "UTC",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(doc)
        await seed_new_host(uid)
        user = doc
    # Save session token
    session_token = data["session_token"]
    await db.sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    set_auth_cookie(response, session_token)
    return {"user": public_user(user), "token": session_token}


# ---------- Public Profile ----------
@api.get("/profile/{username}")
async def get_profile(username: str):
    user = await db.users.find_one({"username": username}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")
    mts = await db.meeting_types.find({"user_id": user["user_id"], "active": True}, {"_id": 0}).to_list(50)
    return {"user": public_user(user), "meeting_types": mts}


# ---------- Meeting Types ----------
@api.get("/meeting-types")
async def list_my_meeting_types(user=Depends(get_current_user)):
    mts = await db.meeting_types.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return mts


@api.post("/meeting-types")
async def create_meeting_type(req: MeetingTypeReq, user=Depends(get_current_user)):
    doc = {
        "meeting_type_id": gen_id("mt"),
        "user_id": user["user_id"],
        "title": req.title,
        "description": req.description or "",
        "duration_min": req.duration_min,
        "color": req.color,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.meeting_types.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/meeting-types/{mt_id}")
async def delete_meeting_type(mt_id: str, user=Depends(get_current_user)):
    res = await db.meeting_types.delete_one({"meeting_type_id": mt_id, "user_id": user["user_id"]})
    return {"deleted": res.deleted_count}


# ---------- Availability ----------
@api.get("/availability")
async def get_my_availability(user=Depends(get_current_user)):
    av = await db.availability.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return av or {"user_id": user["user_id"], "rules": [], "timezone": "UTC"}


@api.put("/availability")
async def set_my_availability(req: AvailabilityReq, user=Depends(get_current_user)):
    await db.availability.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"rules": req.rules, "timezone": req.timezone, "user_id": user["user_id"]}},
        upsert=True,
    )
    return {"ok": True}


# ---------- Slots ----------
@api.get("/slots")
async def get_slots(host_user_id: str, meeting_type_id: str, date: str, exclude_booking_id: Optional[str] = None):
    # date format: YYYY-MM-DD
    mt = await db.meeting_types.find_one({"meeting_type_id": meeting_type_id, "user_id": host_user_id}, {"_id": 0})
    if not mt:
        raise HTTPException(status_code=404, detail="Meeting type not found")
    av = await db.availability.find_one({"user_id": host_user_id}, {"_id": 0})
    if not av:
        return {"slots": []}
    try:
        target = datetime.fromisoformat(date).date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date")
    weekday = target.weekday()
    rules = [r for r in av.get("rules", []) if int(r.get("weekday", -1)) == weekday]
    if not rules:
        return {"slots": []}
    duration = int(mt["duration_min"])
    # existing bookings
    day_start = datetime.combine(target, dt_time(0, 0), tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)
    existing = await db.bookings.find({
        "host_user_id": host_user_id,
        "start_iso": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()},
        "status": "confirmed",
    }, {"_id": 0}).to_list(200)
    busy = []
    for b in existing:
        if exclude_booking_id and b.get("booking_id") == exclude_booking_id:
            continue
        s = datetime.fromisoformat(b["start_iso"])
        e = s + timedelta(minutes=int(b["duration_min"]))
        busy.append((s, e))
    slots = []
    for rule in rules:
        sh, sm = map(int, rule["start"].split(":"))
        eh, em = map(int, rule["end"].split(":"))
        cur = datetime.combine(target, dt_time(sh, sm), tzinfo=timezone.utc)
        end = datetime.combine(target, dt_time(eh, em), tzinfo=timezone.utc)
        while cur + timedelta(minutes=duration) <= end:
            slot_end = cur + timedelta(minutes=duration)
            conflict = any(not (slot_end <= bs or cur >= be) for bs, be in busy)
            if not conflict and cur > datetime.now(timezone.utc):
                slots.append(cur.isoformat())
            cur += timedelta(minutes=duration)
    return {"slots": slots, "duration_min": duration}


# ---------- Bookings ----------
@api.post("/bookings")
async def create_booking(req: BookingReq):
    mt = await db.meeting_types.find_one({"meeting_type_id": req.meeting_type_id, "user_id": req.host_user_id}, {"_id": 0})
    if not mt:
        raise HTTPException(status_code=404, detail="Meeting type not found")
    host = await db.users.find_one({"user_id": req.host_user_id}, {"_id": 0, "password_hash": 0})
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    try:
        start = datetime.fromisoformat(req.start_iso)
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid start_iso")
    # check conflict
    end = start + timedelta(minutes=int(mt["duration_min"]))
    existing = await db.bookings.find({
        "host_user_id": req.host_user_id,
        "status": "confirmed",
    }, {"_id": 0}).to_list(1000)
    for b in existing:
        bs = datetime.fromisoformat(b["start_iso"])
        if bs.tzinfo is None:
            bs = bs.replace(tzinfo=timezone.utc)
        be = bs + timedelta(minutes=int(b["duration_min"]))
        if not (end <= bs or start >= be):
            raise HTTPException(status_code=409, detail="Slot already booked")
    booking_id = gen_id("bk")
    logger.info(
        "[BOOKING] host video settings → user_id=%s video_mode=%s has_default_meet=%s has_custom_url=%s has_google_token=%s",
        host.get("user_id"),
        host.get("video_mode", "google_meet"),
        bool(host.get("default_meet_link")),
        bool(host.get("custom_video_url")),
        bool(host.get("google_refresh_token")),
    )
    meet_link = create_meet_link(
        booking_id,
        host,
        mt["title"],
        start_iso=start.isoformat(),
        duration_min=int(mt["duration_min"]),
    )
    logger.info(
        "[BOOKING] meet_link result → booking=%s meet_link=%r (empty=%s)",
        booking_id,
        meet_link,
        not bool(meet_link),
    )
    cancel_token = generate_cancel_token()
    booking = {
        "booking_id": booking_id,
        "host_user_id": req.host_user_id,
        "host_name": host["name"],
        "host_email": host["email"],
        "meeting_type_id": req.meeting_type_id,
        "meeting_title": mt["title"],
        "duration_min": int(mt["duration_min"]),
        "start_iso": start.isoformat(),
        "invitee_name": req.invitee_name,
        "invitee_email": req.invitee_email.lower(),
        "notes": req.notes or "",
        "meet_link": meet_link,
        "cancel_token": cancel_token,
        "status": "confirmed",
        "reviewed": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(booking)
    booking.pop("_id", None)

    invitee_sent = send_booking_confirmation(booking, booking["invitee_email"], "invitee")
    host_sent = send_booking_confirmation(booking, booking["host_email"], "host")
    logger.info(
        "[BOOKING] emails done → booking=%s invitee=%s sent=%s host=%s sent=%s meet_link=%r",
        booking_id,
        booking["invitee_email"],
        invitee_sent,
        booking["host_email"],
        host_sent,
        meet_link,
    )
    await notify_svc.notify_booking_created(db, booking)

    return {**booking, "emails_sent": {"invitee": invitee_sent, "host": host_sent}}


@api.get("/bookings/mine")
async def my_bookings(user=Depends(get_current_user)):
    bks = await db.bookings.find({"host_user_id": user["user_id"]}, {"_id": 0}).sort("start_iso", 1).to_list(500)
    return bks


@api.delete("/bookings/{booking_id}")
async def cancel_booking(booking_id: str, user=Depends(get_current_user)):
    booking = await db.bookings.find_one({"booking_id": booking_id, "host_user_id": user["user_id"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("status") == "cancelled":
        return {"updated": 0, "status": "cancelled"}
    await db.bookings.update_one({"booking_id": booking_id}, {"$set": {"status": "cancelled"}})
    booking["status"] = "cancelled"
    send_booking_cancellation(booking, booking["invitee_email"])
    send_booking_cancellation(booking, booking["host_email"])
    return {"updated": 1, "status": "cancelled"}


@api.post("/bookings/{booking_id}/cancel")
async def cancel_booking_by_token(booking_id: str, req: CancelTokenReq):
    booking = await db.bookings.find_one({"booking_id": booking_id, "cancel_token": req.token}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Invalid booking or token")
    if booking.get("status") == "cancelled":
        return {"status": "cancelled"}
    await db.bookings.update_one({"booking_id": booking_id}, {"$set": {"status": "cancelled"}})
    booking["status"] = "cancelled"
    send_booking_cancellation(booking, booking["invitee_email"])
    send_booking_cancellation(booking, booking["host_email"])
    await notify_svc.notify_booking_cancelled(db, booking, "invitee")
    return {"status": "cancelled"}


@api.post("/bookings/invitee/lookup")
async def invitee_bookings(req: InviteeLookupReq):
    email = req.email.lower()
    now = datetime.now(timezone.utc).isoformat()
    bks = await db.bookings.find(
        {"invitee_email": email},
        {"_id": 0},
    ).sort("start_iso", -1).to_list(100)
    out = []
    for b in bks:
        out.append({
            "booking_id": b["booking_id"],
            "host_name": b.get("host_name"),
            "host_user_id": b.get("host_user_id"),
            "meeting_type_id": b.get("meeting_type_id"),
            "meeting_title": b.get("meeting_title"),
            "start_iso": b.get("start_iso"),
            "duration_min": b.get("duration_min"),
            "meet_link": b.get("meet_link"),
            "status": b.get("status", "confirmed"),
            "invitee_email": b.get("invitee_email"),
            "invitee_name": b.get("invitee_name"),
            "cancel_token": b.get("cancel_token"),
            "is_upcoming": b.get("start_iso", "") >= now and b.get("status") == "confirmed",
        })
    return {"bookings": out, "email": email}


@api.patch("/bookings/{booking_id}/reschedule")
async def reschedule_booking(booking_id: str, req: RescheduleReq):
    booking = await db.bookings.find_one(
        {"booking_id": booking_id, "cancel_token": req.token},
        {"_id": 0},
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("status") != "confirmed":
        raise HTTPException(status_code=400, detail="Cannot reschedule a cancelled booking")
    mt = await db.meeting_types.find_one(
        {"meeting_type_id": booking["meeting_type_id"], "user_id": booking["host_user_id"]},
        {"_id": 0},
    )
    if not mt:
        raise HTTPException(status_code=404, detail="Meeting type not found")
    host = await db.users.find_one({"user_id": booking["host_user_id"]}, {"_id": 0, "password_hash": 0})
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    try:
        start = datetime.fromisoformat(req.start_iso.replace("Z", "+00:00"))
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid start_iso")
    if start <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Please choose a future time slot")
    end = start + timedelta(minutes=int(mt["duration_min"]))
    existing = await db.bookings.find({
        "host_user_id": booking["host_user_id"],
        "status": "confirmed",
        "booking_id": {"$ne": booking_id},
    }, {"_id": 0}).to_list(1000)
    for b in existing:
        bs = datetime.fromisoformat(b["start_iso"].replace("Z", "+00:00"))
        if bs.tzinfo is None:
            bs = bs.replace(tzinfo=timezone.utc)
        be = bs + timedelta(minutes=int(b["duration_min"]))
        if not (end <= bs or start >= be):
            raise HTTPException(status_code=409, detail="Slot already booked")
    meet_link = create_meet_link(
        booking_id,
        host,
        mt["title"],
        start_iso=start.isoformat(),
        duration_min=int(mt["duration_min"]),
    )
    await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {"start_iso": start.isoformat(), "meet_link": meet_link}},
    )
    booking["start_iso"] = start.isoformat()
    booking["meet_link"] = meet_link
    invitee_sent = send_booking_confirmation(booking, booking["invitee_email"], "invitee")
    host_sent = send_booking_confirmation(booking, booking["host_email"], "host")
    logger.info(
        "[BOOKING] rescheduled → booking=%s new_start=%s invitee_sent=%s host_sent=%s",
        booking_id, start.isoformat(), invitee_sent, host_sent,
    )
    booking.pop("cancel_token", None)
    return {
        **booking,
        "emails_sent": {"invitee": invitee_sent, "host": host_sent},
    }


@api.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, token: Optional[str] = None):
    q = {"booking_id": booking_id}
    if token:
        q["cancel_token"] = token
    booking = await db.bookings.find_one(q, {"_id": 0, "cancel_token": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@api.post("/bookings/{booking_id}/review")
async def submit_review(booking_id: str, req: ReviewReq):
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if req.cancel_token and booking.get("cancel_token") != req.cancel_token:
        raise HTTPException(status_code=403, detail="Invalid token")
    if booking.get("reviewed"):
        raise HTTPException(status_code=409, detail="Already reviewed")
    end = datetime.fromisoformat(booking["start_iso"].replace("Z", "+00:00"))
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    end = end + timedelta(minutes=int(booking["duration_min"]))
    if datetime.now(timezone.utc) < end:
        raise HTTPException(status_code=400, detail="Meeting has not ended yet")
    review = {
        "review_id": gen_id("rv"),
        "booking_id": booking_id,
        "host_user_id": booking["host_user_id"],
        "host_username": (await db.users.find_one({"user_id": booking["host_user_id"]}, {"username": 1}) or {}).get("username"),
        "reviewer_name": req.reviewer_name or booking["invitee_name"],
        "rating": req.rating,
        "comment": req.comment or "",
        "meeting_title": booking["meeting_title"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reviews.insert_one(review)
    await db.bookings.update_one({"booking_id": booking_id}, {"$set": {"reviewed": True}})
    review.pop("_id", None)
    return review


@api.get("/reviews/{username}")
async def get_host_reviews(username: str):
    host = await db.users.find_one({"username": username}, {"user_id": 1})
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    reviews = await db.reviews.find({"host_user_id": host["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    avg = sum(r["rating"] for r in reviews) / len(reviews) if reviews else 0
    return {"reviews": reviews, "average_rating": round(avg, 1), "count": len(reviews)}


@api.get("/notifications")
async def list_notifications(user=Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    unread = sum(1 for n in items if not n.get("read"))
    return {"notifications": items, "unread_count": unread}


@api.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user=Depends(get_current_user)):
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"read": True}},
    )
    return {"ok": True}


@api.post("/notifications/read-all")
async def mark_all_notifications_read(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api.get("/settings/video")
async def get_video_settings(user=Depends(get_current_user)):
    return {
        "video_mode": user.get("video_mode", "google_meet"),
        "default_meet_link": user.get("default_meet_link", ""),
        "custom_video_url": user.get("custom_video_url", ""),
    }


@api.put("/settings/video")
async def update_video_settings(req: VideoSettingsReq, user=Depends(get_current_user)):
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "video_mode": req.video_mode,
            "default_meet_link": req.default_meet_link or "",
            "custom_video_url": req.custom_video_url or "",
        }},
    )
    return {"ok": True}


@api.get("/health/email")
async def health_email():
    s = smtp_status()
    return {
        "enabled": s["enabled"],
        "provider": s.get("provider", "smtp"),
        "sender_email": s.get("sender_email"),
        "sender_name": s.get("sender_name"),
    }


# ---------- Admin ----------
@api.get("/admin/stats")
async def admin_stats(user=Depends(require_admin)):
    users_count = await db.users.count_documents({})
    bookings_count = await db.bookings.count_documents({})
    confirmed = await db.bookings.count_documents({"status": "confirmed"})
    mt_count = await db.meeting_types.count_documents({})
    return {
        "users": users_count,
        "bookings": bookings_count,
        "confirmed_bookings": confirmed,
        "meeting_types": mt_count,
    }


@api.get("/admin/users")
async def admin_users(user=Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return users


@api.get("/admin/bookings")
async def admin_bookings(user=Depends(require_admin)):
    bks = await db.bookings.find({}, {"_id": 0}).sort("start_iso", -1).to_list(500)
    return bks


# ---------- Chatbot (predefined FAQ) ----------
FAQ_ENTRIES = [
    {
        "keywords": ["what is", "chronobook", "about"],
        "answer": (
            "ChronoBook is a meeting scheduler — like Calendly. You set your availability, create meeting types, "
            "share your booking page, and invitees pick a time that works. No more back-and-forth emails."
        ),
    },
    {
        "keywords": ["sign up", "signup", "register", "create account"],
        "answer": (
            "Click Get started free on the homepage or go to /register. Enter your name, email, and password. "
            "After signing up you'll land on your dashboard where you can set up meeting types and availability."
        ),
    },
    {
        "keywords": ["meeting type", "meeting types"],
        "answer": (
            "Go to Dashboard → Meeting Types tab. Enter a title (e.g. \"30 min call\"), pick a duration, and click Add. "
            "You can create multiple types with different lengths."
        ),
    },
    {
        "keywords": ["availability", "available", "hours", "schedule"],
        "answer": (
            "Open Dashboard → Availability tab. Toggle the days you're free, set start/end times for each day, "
            "and choose your timezone. Available slots are calculated automatically from these rules."
        ),
    },
    {
        "keywords": ["share", "booking link", "public page", "link"],
        "answer": (
            "Your public page is at /u/your-username (shown on the Dashboard Overview tab). Click Copy link and share it "
            "via email, social media, or your website. Invitees book directly from that page."
        ),
    },
    {
        "keywords": ["book a meeting", "book meeting", "how to book", "invitee"],
        "answer": (
            "They open your /u/username page, pick a meeting type, choose an available date and time slot, "
            "enter their name and email, and confirm. Both of you receive a confirmation with meeting details."
        ),
    },
    {
        "keywords": ["cancel", "reschedule"],
        "answer": (
            "Yes. Invitees can cancel via the link in their confirmation email. Hosts can view bookings on the Dashboard "
            "and reschedule confirmed bookings to a new available slot."
        ),
    },
    {
        "keywords": ["admin", "administrator"],
        "answer": (
            "Admin accounts can access /admin to see platform-wide stats — total users, bookings, and recent activity. "
            "Regular users use /dashboard for their own meetings and settings."
        ),
    },
]

DEFAULT_FAQ_REPLY = (
    "Pick a topic and I'll help: signup, meeting types, availability, sharing your booking link, "
    "how invitees book, cancel/reschedule, or the admin dashboard."
)


def faq_reply(message: str) -> str:
    lower = message.lower().strip()
    for entry in FAQ_ENTRIES:
        if any(kw in lower for kw in entry["keywords"]):
            return entry["answer"]
    return DEFAULT_FAQ_REPLY


@api.post("/chat/stream")
async def chat_stream(req: ChatReq):
    async def event_gen():
        try:
            full_text = faq_reply(req.message)
            yield f"data: {full_text}\n\n".encode()
            await db.chat_messages.insert_one({
                "session_id": req.session_id,
                "user_message": req.message,
                "bot_message": full_text,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            yield b"event: done\ndata: [DONE]\n\n"
        except Exception as e:
            logger.exception("chat error")
            yield f"event: error\ndata: {str(e)}\n\n".encode()

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api.post("/chat")
async def chat_simple(req: ChatReq):
    """Non-streaming chat endpoint with predefined FAQ answers."""
    reply = faq_reply(req.message)
    await db.chat_messages.insert_one({
        "session_id": req.session_id,
        "user_message": req.message,
        "bot_message": reply,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"reply": reply}


# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("username", unique=True, sparse=True)
    await db.meeting_types.create_index("meeting_type_id", unique=True)
    await db.bookings.create_index("booking_id", unique=True)
    await db.sessions.create_index("session_token", unique=True)
    await db.notifications.create_index("notification_id", unique=True)
    await db.reviews.create_index("review_id", unique=True)

    smtp = smtp_status()
    print(
        f"[STARTUP] Email {'enabled' if smtp['enabled'] else 'DISABLED'} "
        f"provider={smtp.get('provider', 'smtp')} "
        f"host={smtp['host'] or '—'} user={smtp['user'] or '—'}",
        flush=True,
    )

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")

    # Prefer the canonical admin account (username "admin"), migrate email from .env
    existing = await db.users.find_one({"username": "admin"})
    if existing and existing.get("email") != admin_email:
        await db.users.update_one(
            {"user_id": existing["user_id"]},
            {"$set": {"email": admin_email, "role": "admin"}},
        )
        logger.info("Updated admin email to %s", admin_email)
        existing = await db.users.find_one({"username": "admin"})

    if not existing:
        existing = await db.users.find_one({"email": admin_email})

    if not existing:
        uid = gen_id("u")
        await db.users.insert_one({
            "user_id": uid,
            "name": "Admin",
            "email": admin_email,
            "username": "admin",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "picture": "",
            "bio": "Platform administrator",
            "timezone": "UTC",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin: {admin_email}")
        existing = await db.users.find_one({"email": admin_email})
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"user_id": existing["user_id"]},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
        )
        logger.info("Updated admin password")

    # Ensure admin has meeting types + availability (so /u/admin can be booked)
    try:
        if existing:
            admin_uid = existing["user_id"]
            mt_count = await db.meeting_types.count_documents({"user_id": admin_uid})
            if mt_count == 0:
                for mt in [
                    {"title": "15 Minute Chat", "duration_min": 15, "color": "#6366f1"},
                    {"title": "30 Minute Meeting", "duration_min": 30, "color": "#8b5cf6"},
                    {"title": "60 Minute Deep Dive", "duration_min": 60, "color": "#10b981"},
                ]:
                    await db.meeting_types.insert_one({
                        "meeting_type_id": gen_id("mt"),
                        "user_id": admin_uid,
                        "title": mt["title"],
                        "description": "",
                        "duration_min": mt["duration_min"],
                        "color": mt["color"],
                        "active": True,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    })
            av = await db.availability.find_one({"user_id": admin_uid})
            if not av:
                await db.availability.insert_one({
                    "user_id": admin_uid,
                    "timezone": "UTC",
                    "rules": [{"weekday": wd, "start": "09:00", "end": "17:00"} for wd in range(0, 5)],
                })
    except Exception:
        logger.exception("Failed to seed admin defaults")

    # Save test credentials
    try:
        Path("/app/memory").mkdir(parents=True, exist_ok=True)
        Path("/app/memory/test_credentials.md").write_text(
            f"# Test Credentials\n\n"
            f"## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: admin\n\n"
            f"## Auth Endpoints\n"
            f"- POST /api/auth/register\n- POST /api/auth/login\n- POST /api/auth/logout\n"
            f"- GET /api/auth/me\n- POST /api/auth/google/session\n"
        )
    except Exception:
        pass


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)

def _build_cors_config() -> tuple[list[str], Optional[str]]:
    origins: set[str] = set()
    for raw in (FRONTEND_URL, os.environ.get("CORS_ORIGINS", "")):
        for o in raw.split(","):
            o = o.strip().rstrip("/")
            if o:
                origins.add(o)
    origin_list = sorted(origins)
    regex = None
    allow_vercel = os.environ.get("CORS_ALLOW_VERCEL", "true").lower() in ("1", "true", "yes")
    if allow_vercel or any(".vercel.app" in o for o in origin_list):
        regex = r"https://[\w.-]+\.vercel\.app"
    return origin_list, regex


_cors_origins, _cors_origin_regex = _build_cors_config()
_cors_kwargs: dict = {
    "allow_origins": _cors_origins,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if _cors_origin_regex:
    _cors_kwargs["allow_origin_regex"] = _cors_origin_regex
app.add_middleware(CORSMiddleware, **_cors_kwargs)
