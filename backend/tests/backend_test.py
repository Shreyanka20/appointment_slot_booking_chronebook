"""
ChronoBook backend integration tests.
Covers: auth (register/login/me/logout), meeting types CRUD, availability,
slots computation, bookings (incl. 409 conflict), admin endpoints, chat (Gemini 3 Flash).
"""
import os
import uuid
import time
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://call-slot-booker.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Admin@123"


def _unique(prefix="TEST_user"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module")
def user_session():
    s = requests.Session()
    name = _unique("TEST_User")
    email = f"{name.lower()}@example.com"
    password = "Passw0rd!"
    r = s.post(f"{API}/auth/register", json={
        "name": name, "email": email, "password": password
    }, timeout=20)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    assert "user" in data and "token" in data
    user = data["user"]
    assert user["email"] == email
    assert user["role"] == "user"
    return {"session": s, "user": user, "email": email, "password": password, "token": data["token"]}


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    return {"session": s, "user": data["user"], "token": data["token"]}


# ---------- Auth ----------
class TestAuth:
    def test_register_creates_user_and_defaults(self, user_session):
        s = user_session["session"]
        # /auth/me works
        r = s.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        assert r.json()["email"] == user_session["email"]

        # default meeting types seeded (3)
        r = s.get(f"{API}/meeting-types", timeout=10)
        assert r.status_code == 200
        mts = r.json()
        assert len(mts) >= 3
        durations = sorted([m["duration_min"] for m in mts])
        assert 15 in durations and 30 in durations and 60 in durations

        # default availability Mon-Fri 9-17 seeded
        r = s.get(f"{API}/availability", timeout=10)
        assert r.status_code == 200
        av = r.json()
        assert len(av.get("rules", [])) == 5

    def test_register_duplicate_email_fails(self, user_session):
        s = requests.Session()
        r = s.post(f"{API}/auth/register", json={
            "name": "Dup",
            "email": user_session["email"],
            "password": "anything",
        }, timeout=10)
        assert r.status_code == 400

    def test_login_success_and_invalid(self, user_session):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={
            "email": user_session["email"], "password": user_session["password"]
        }, timeout=10)
        assert r.status_code == 200
        assert r.json()["user"]["email"] == user_session["email"]
        # cookie present
        assert any(c.name == "access_token" for c in s.cookies)

        # invalid
        r = s.post(f"{API}/auth/login", json={
            "email": user_session["email"], "password": "wrong"
        }, timeout=10)
        assert r.status_code == 401

    def test_logout_clears_cookie(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=10)
        assert r.status_code == 200
        r = s.post(f"{API}/auth/logout", timeout=10)
        assert r.status_code == 200
        # subsequent /me unauthenticated when cookie cleared (uses fresh session)
        s2 = requests.Session()
        r = s2.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401


# ---------- Meeting Types ----------
class TestMeetingTypes:
    def test_create_list_and_delete(self, user_session):
        s = user_session["session"]
        r = s.post(f"{API}/meeting-types", json={
            "title": "TEST_Quick Sync", "description": "demo",
            "duration_min": 45, "color": "#FFD54F"
        }, timeout=10)
        assert r.status_code == 200
        mt = r.json()
        assert mt["title"] == "TEST_Quick Sync"
        assert mt["duration_min"] == 45
        mt_id = mt["meeting_type_id"]

        r = s.get(f"{API}/meeting-types", timeout=10)
        assert r.status_code == 200
        assert any(m["meeting_type_id"] == mt_id for m in r.json())

        r = s.delete(f"{API}/meeting-types/{mt_id}", timeout=10)
        assert r.status_code == 200
        assert r.json()["deleted"] == 1

        r = s.get(f"{API}/meeting-types", timeout=10)
        assert not any(m["meeting_type_id"] == mt_id for m in r.json())


# ---------- Availability ----------
class TestAvailability:
    def test_update_availability_persists(self, user_session):
        s = user_session["session"]
        rules = [
            {"weekday": 0, "start": "10:00", "end": "16:00"},
            {"weekday": 2, "start": "11:00", "end": "15:00"},
        ]
        r = s.put(f"{API}/availability", json={"rules": rules, "timezone": "UTC"}, timeout=10)
        assert r.status_code == 200
        r = s.get(f"{API}/availability", timeout=10)
        assert r.status_code == 200
        av = r.json()
        assert len(av["rules"]) == 2
        assert av["timezone"] == "UTC"


# ---------- Slots + Bookings ----------
class TestBookingFlow:
    def _next_weekday_in_rules(self, rules):
        """Find next date in future that has a rule."""
        today = datetime.now(timezone.utc).date()
        weekdays = {int(r["weekday"]) for r in rules}
        for i in range(1, 14):
            d = today + timedelta(days=i)
            if d.weekday() in weekdays:
                return d
        return None

    def test_slots_and_no_double_booking(self, user_session):
        s = user_session["session"]
        # Reset to wide availability for all weekdays
        rules = [{"weekday": wd, "start": "09:00", "end": "17:00"} for wd in range(0, 7)]
        r = s.put(f"{API}/availability", json={"rules": rules, "timezone": "UTC"}, timeout=10)
        assert r.status_code == 200

        # pick 30-min meeting type
        mts = s.get(f"{API}/meeting-types", timeout=10).json()
        mt = next(m for m in mts if m["duration_min"] == 30)
        host_id = user_session["user"]["user_id"]

        target_date = self._next_weekday_in_rules(rules)
        date_str = target_date.isoformat()
        r = s.get(f"{API}/slots", params={
            "host_user_id": host_id, "meeting_type_id": mt["meeting_type_id"], "date": date_str
        }, timeout=10)
        assert r.status_code == 200
        slots = r.json()["slots"]
        assert len(slots) > 0, "Expected slots for an available weekday"
        first_slot = slots[0]

        # Book first slot (no auth needed for POST /bookings)
        s2 = requests.Session()
        payload = {
            "meeting_type_id": mt["meeting_type_id"],
            "host_user_id": host_id,
            "start_iso": first_slot,
            "invitee_name": "TEST Invitee",
            "invitee_email": "test_invitee@example.com",
            "notes": "TEST booking",
        }
        r = s2.post(f"{API}/bookings", json=payload, timeout=15)
        assert r.status_code == 200, f"booking failed: {r.status_code} {r.text}"
        booking = r.json()
        assert booking["status"] == "confirmed"
        assert booking["duration_min"] == 30
        assert booking["start_iso"].startswith(first_slot[:16])  # tolerate tz offset string format

        # Booking persists in /bookings/mine
        r = s.get(f"{API}/bookings/mine", timeout=10)
        assert r.status_code == 200
        assert any(b["booking_id"] == booking["booking_id"] for b in r.json())

        # Conflict on same slot → 409
        r = s2.post(f"{API}/bookings", json=payload, timeout=10)
        assert r.status_code == 409

        # After booking, slot should be excluded from /slots
        r = s.get(f"{API}/slots", params={
            "host_user_id": host_id, "meeting_type_id": mt["meeting_type_id"], "date": date_str
        }, timeout=10)
        new_slots = r.json()["slots"]
        assert first_slot not in new_slots

    def test_booking_invalid_meeting_type(self, user_session):
        host_id = user_session["user"]["user_id"]
        future = (datetime.now(timezone.utc) + timedelta(days=2)).replace(microsecond=0).isoformat()
        r = requests.post(f"{API}/bookings", json={
            "meeting_type_id": "mt_does_not_exist",
            "host_user_id": host_id,
            "start_iso": future,
            "invitee_name": "x", "invitee_email": "x@x.com",
        }, timeout=10)
        assert r.status_code == 404


# ---------- Public Profile ----------
class TestPublicProfile:
    def test_profile_returns_user_and_mts(self, user_session):
        username = user_session["user"]["username"]
        r = requests.get(f"{API}/profile/{username}", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["username"] == username
        assert isinstance(data["meeting_types"], list)
        assert len(data["meeting_types"]) >= 3

    def test_profile_not_found(self):
        r = requests.get(f"{API}/profile/no-such-user-xyz-zzz", timeout=10)
        assert r.status_code == 404


# ---------- Admin ----------
class TestAdmin:
    def test_admin_stats(self, admin_session):
        s = admin_session["session"]
        r = s.get(f"{API}/admin/stats", timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ["users", "bookings", "confirmed_bookings", "meeting_types"]:
            assert k in d and isinstance(d[k], int)

    def test_admin_users_and_bookings(self, admin_session):
        s = admin_session["session"]
        r = s.get(f"{API}/admin/users", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        r = s.get(f"{API}/admin/bookings", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_non_admin_blocked(self, user_session):
        s = user_session["session"]
        r = s.get(f"{API}/admin/stats", timeout=10)
        assert r.status_code == 403


# ---------- Chatbot ----------
class TestChat:
    def test_chat_returns_reply(self):
        # Gemini may be slow on first call
        payload = {"session_id": f"test_{uuid.uuid4().hex[:8]}", "message": "Hello, what is ChronoBook?"}
        r = requests.post(f"{API}/chat", json=payload, timeout=60)
        assert r.status_code == 200, f"chat failed: {r.status_code} {r.text[:300]}"
        data = r.json()
        assert "reply" in data
        assert isinstance(data["reply"], str)
        assert len(data["reply"].strip()) > 0
