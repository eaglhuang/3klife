from __future__ import annotations

import hashlib
import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from .llm_dialogue_renderer import ProviderOutputError, ProviderUnavailableError, log_debug_event


DEFAULT_GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image"
DEFAULT_GEMINI_IMAGE_TIMEOUT_MS = 25000
DEFAULT_IMAGE_ASPECT_RATIO = "4:5"
DEFAULT_IMAGE_SIZE = "1K"
DEFAULT_CACHE_ROOT = Path("local/npc-scene-image-cache")
SUPPORTED_IMAGE_ASPECT_RATIOS = {
    "1:1",
    "1:4",
    "1:8",
    "2:3",
    "3:2",
    "3:4",
    "4:1",
    "4:3",
    "4:5",
    "5:4",
    "8:1",
    "9:16",
    "16:9",
    "21:9",
}
SUPPORTED_IMAGE_SIZES = {"512", "1K", "2K", "4K"}


@dataclass(frozen=True)
class SceneIllustrationResult:
    provider: str
    model: str
    prompt_used: str
    mime_type: str
    image_base64: str
    caption: str | None = None
    cache_hit: bool = False


class GeminiSceneImageRenderer:
    provider_name = "gemini_image"

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        timeout_ms: int | None = None,
        cache_root: Path | None = None,
    ) -> None:
        self.api_key = api_key or os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        self.model = model or os.environ.get("NPC_LLM_MODEL_GEMINI_IMAGE") or DEFAULT_GEMINI_IMAGE_MODEL
        self.timeout_ms = timeout_ms or int(os.environ.get("NPC_LLM_IMAGE_TIMEOUT_MS") or DEFAULT_GEMINI_IMAGE_TIMEOUT_MS)
        self.endpoint_base = os.environ.get("GEMINI_API_BASE") or "https://generativelanguage.googleapis.com/v1beta"
        self.default_aspect_ratio = os.environ.get("NPC_LLM_IMAGE_ASPECT_RATIO") or DEFAULT_IMAGE_ASPECT_RATIO
        self.default_image_size = os.environ.get("NPC_LLM_IMAGE_SIZE") or DEFAULT_IMAGE_SIZE
        self.disable_proxy = str(os.environ.get("NPC_LLM_DISABLE_PROXY") or "1").strip().lower() in {"1", "true", "yes", "on"}
        env_cache_root = os.environ.get("NPC_SCENE_IMAGE_CACHE_ROOT")
        self.cache_root = Path(env_cache_root) if env_cache_root else (cache_root or DEFAULT_CACHE_ROOT)
        self.cache_root.mkdir(parents=True, exist_ok=True)

    def render(
        self,
        prompt: str,
        *,
        aspect_ratio: str | None = None,
        image_size: str | None = None,
    ) -> SceneIllustrationResult:
        if not self.api_key:
            raise ProviderUnavailableError("gemini_image:no-api-key")
        cleaned_prompt = str(prompt or "").strip()
        if not cleaned_prompt:
            raise ProviderOutputError("gemini_image:empty-prompt")

        final_aspect_ratio = self._normalize_aspect_ratio(aspect_ratio)
        final_image_size = self._normalize_image_size(image_size)
        cache_key = self._build_cache_key(cleaned_prompt, final_aspect_ratio, final_image_size)
        cached_result = self._load_cache(cache_key)
        if cached_result is not None:
            log_debug_event(
                "scene-image.cache-hit",
                provider=self.provider_name,
                model=self.model,
                cacheKey=cache_key,
            )
            return cached_result

        request_body = {
            "contents": [
                {
                    "parts": [{"text": cleaned_prompt}],
                }
            ],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"],
                "imageConfig": {
                    "aspectRatio": final_aspect_ratio,
                    "imageSize": final_image_size,
                },
            },
        }
        log_debug_event(
            "scene-image.request",
            provider=self.provider_name,
            model=self.model,
            aspectRatio=final_aspect_ratio,
            imageSize=final_image_size,
            cacheKey=cache_key,
            promptPreview=cleaned_prompt[:420],
        )
        request = urllib.request.Request(
            f"{self.endpoint_base}/models/{self.model}:generateContent",
            data=json.dumps(request_body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": self.api_key,
            },
            method="POST",
        )
        try:
            with self._open_request(request) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:400]
            raise ProviderUnavailableError(f"gemini_image:http-{exc.code}:{detail}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise ProviderUnavailableError(f"gemini_image:network:{exc}") from exc

        image_part = self._extract_image_part(payload)
        if image_part is None:
            raise ProviderOutputError("gemini_image:no-image-part")
        inline_data = image_part.get("inlineData") or image_part.get("inline_data") or {}
        image_base64 = str(inline_data.get("data") or "").strip()
        mime_type = str(inline_data.get("mimeType") or inline_data.get("mime_type") or "image/png").strip() or "image/png"
        if not image_base64:
            raise ProviderOutputError("gemini_image:empty-image-data")
        caption = self._extract_caption(payload)
        result = SceneIllustrationResult(
            provider=self.provider_name,
            model=self.model,
            prompt_used=cleaned_prompt,
            mime_type=mime_type,
            image_base64=image_base64,
            caption=caption,
            cache_hit=False,
        )
        self._save_cache(cache_key, result)
        log_debug_event(
            "scene-image.response",
            provider=self.provider_name,
            model=self.model,
            mimeType=mime_type,
            hasCaption=bool(caption),
            cacheKey=cache_key,
        )
        return result

    def _normalize_aspect_ratio(self, aspect_ratio: str | None) -> str:
        value = str(aspect_ratio or self.default_aspect_ratio).strip()
        return value if value in SUPPORTED_IMAGE_ASPECT_RATIOS else self.default_aspect_ratio

    def _normalize_image_size(self, image_size: str | None) -> str:
        value = str(image_size or self.default_image_size).strip().upper()
        return value if value in SUPPORTED_IMAGE_SIZES else self.default_image_size

    def _build_cache_key(self, prompt: str, aspect_ratio: str, image_size: str) -> str:
        fingerprint = "|".join([self.model, aspect_ratio, image_size, prompt])
        return hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()

    def _cache_file_path(self, cache_key: str) -> Path:
        return self.cache_root / f"{cache_key}.json"

    def _load_cache(self, cache_key: str) -> SceneIllustrationResult | None:
        path = self._cache_file_path(cache_key)
        if not path.exists():
            return None
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None
        image_base64 = str(payload.get("imageBase64") or "").strip()
        mime_type = str(payload.get("mimeType") or "").strip() or "image/png"
        prompt_used = str(payload.get("promptUsed") or "").strip()
        if not image_base64 or not prompt_used:
            return None
        return SceneIllustrationResult(
            provider=self.provider_name,
            model=str(payload.get("model") or self.model),
            prompt_used=prompt_used,
            mime_type=mime_type,
            image_base64=image_base64,
            caption=str(payload.get("caption") or "").strip() or None,
            cache_hit=True,
        )

    def _save_cache(self, cache_key: str, result: SceneIllustrationResult) -> None:
        payload = {
            "provider": result.provider,
            "model": result.model,
            "promptUsed": result.prompt_used,
            "mimeType": result.mime_type,
            "imageBase64": result.image_base64,
            "caption": result.caption,
        }
        path = self._cache_file_path(cache_key)
        try:
            path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        except OSError:
            return

    def _extract_image_part(self, payload: dict) -> dict | None:
        for part in self._iter_visible_parts(payload):
            inline_data = part.get("inlineData") or part.get("inline_data") or {}
            if isinstance(inline_data, dict) and inline_data.get("data"):
                return part
        return None

    def _extract_caption(self, payload: dict) -> str | None:
        for part in self._iter_visible_parts(payload):
            text = str(part.get("text") or "").strip()
            if text:
                return text
        return None

    def _iter_visible_parts(self, payload: dict) -> list[dict]:
        parts: list[dict] = []
        for candidate in payload.get("candidates") or []:
            content = candidate.get("content") or {}
            for part in content.get("parts") or []:
                if part.get("thought") is True:
                    continue
                if isinstance(part, dict):
                    parts.append(part)
        return parts

    def _open_request(self, request: urllib.request.Request) -> object:
        if self.disable_proxy:
            opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
            return opener.open(request, timeout=self.timeout_ms / 1000)
        return urllib.request.urlopen(request, timeout=self.timeout_ms / 1000)
