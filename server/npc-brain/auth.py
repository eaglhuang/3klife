from __future__ import annotations

import hmac
import os

from langgraph_sdk import Auth


DEPLOY_API_KEY_ENV = "NPC_BRAIN_DEPLOY_API_KEY"
DEPLOY_IDENTITY_ENV = "NPC_BRAIN_DEPLOY_IDENTITY"

auth = Auth()


def _normalize_headers(headers: dict[object, object] | None) -> dict[str, str]:
    normalized: dict[str, str] = {}
    if not headers:
        return normalized

    for raw_key, raw_value in headers.items():
        if raw_value is None:
            continue

        key = raw_key.decode("latin-1") if isinstance(raw_key, bytes) else str(raw_key)
        value = raw_value.decode("latin-1") if isinstance(raw_value, bytes) else str(raw_value)
        normalized[key.lower()] = value

    return normalized


def _extract_api_key(headers: dict[str, str]) -> str | None:
    direct_key = headers.get("x-api-key")
    if direct_key:
        return direct_key.strip()

    authorization = headers.get("authorization", "").strip()
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None

    return token.strip()


@auth.authenticate
async def authenticate(headers: dict[object, object] | None = None) -> Auth.types.MinimalUserDict:
    expected_key = os.getenv(DEPLOY_API_KEY_ENV, "").strip()
    if not expected_key:
        raise Auth.exceptions.HTTPException(
            status_code=503,
            detail=f"{DEPLOY_API_KEY_ENV} is not configured",
        )

    normalized_headers = _normalize_headers(headers)
    provided_key = _extract_api_key(normalized_headers)
    if not provided_key or not hmac.compare_digest(provided_key, expected_key):
        raise Auth.exceptions.HTTPException(status_code=401, detail="Invalid API key")

    return {
        "identity": os.getenv(DEPLOY_IDENTITY_ENV, "npc-brain-external-tester"),
        "is_authenticated": True,
    }