import os
import secrets
import logging
from urllib.parse import urlencode

import httpx

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
SIGNIN_SCOPES = "openid email profile"


def oauth_config() -> tuple[str, str]:
    return (
        os.environ.get("GOOGLE_CLIENT_ID", "").strip(),
        os.environ.get("GOOGLE_CLIENT_SECRET", "").strip(),
    )


def redirect_uri() -> str:
    explicit = os.environ.get("GOOGLE_REDIRECT_URI", "").strip()
    if explicit:
        return explicit
    backend = os.environ.get("BACKEND_URL", "http://localhost:8002").strip().rstrip("/")
    return f"{backend}/api/auth/google/callback"


def is_configured() -> bool:
    client_id, client_secret = oauth_config()
    return bool(client_id and client_secret)


def build_auth_url(state: str) -> str:
    client_id, _ = oauth_config()
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri(),
        "response_type": "code",
        "scope": SIGNIN_SCOPES,
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def new_state() -> str:
    return secrets.token_urlsafe(32)


async def exchange_code(code: str) -> dict:
    client_id, client_secret = oauth_config()
    async with httpx.AsyncClient(timeout=20) as client:
        token_res = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri(),
                "grant_type": "authorization_code",
            },
        )
        if token_res.status_code != 200:
            logger.error("Google token exchange failed: %s", token_res.text)
            raise ValueError("Google token exchange failed")
        tokens = token_res.json()
        access_token = tokens.get("access_token")
        if not access_token:
            raise ValueError("Google access token missing")

        user_res = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_res.status_code != 200:
            logger.error("Google userinfo failed: %s", user_res.text)
            raise ValueError("Google userinfo failed")
        profile = user_res.json()
        if not profile.get("email"):
            raise ValueError("Google account has no email")
        return profile
