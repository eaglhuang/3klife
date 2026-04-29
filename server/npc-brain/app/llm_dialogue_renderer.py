from __future__ import annotations

import json
import logging
import os
import re
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Protocol


DEFAULT_GEMINI_MODEL = "gemini-2.5-pro"
DEFAULT_GEMINI_FLASH_MODEL = "gemini-2.5-flash"
DEFAULT_GEMINI_FLASH_LITE_MODEL = "gemini-2.5-flash-lite"
DEFAULT_TIMEOUT_MS = 2500
DEFAULT_GEMINI_THINKING_BUDGET = 128
DEFAULT_GEMINI_FLASH_LITE_THINKING_BUDGET = 512
DEFAULT_GEMINI_MAX_OUTPUT_TOKENS = 512
DEFAULT_GEMINI_RETRY_COUNT = 2
DEFAULT_LOCAL_LLAMA_MODEL = "llama3:latest"
DEFAULT_LOCAL_LLAMA_TIMEOUT_MS = 6000
DEFAULT_LOCAL_LLAMA_API_BASE = "http://127.0.0.1:11434"
DEFAULT_LOCAL_LLAMA_API_PATH = "/api/chat"
DEFAULT_HISTORY_CACHE_PATH = "local/npc-dialogue-history.jsonl"
DEFAULT_LOCALE = "zh-TW"
DEFAULT_SPEECH_CONTEXT_MODE = "life_chat"
_DEBUG_TRUE_VALUES = {"1", "true", "yes", "on"}
LOGGER = logging.getLogger("uvicorn.error")


LOCALE_INSTRUCTIONS = {
    "zh-TW": {
        "label": "Traditional Chinese",
        "instruction": "Write the dialogue in Traditional Chinese using Taiwan-style punctuation and wording.",
    },
    "en": {
        "label": "English",
        "instruction": "Write the dialogue in natural English, while keeping historical names recognizable.",
    },
    "ja": {
        "label": "Japanese",
        "instruction": "Write the dialogue in natural Japanese, while keeping historical names recognizable.",
    },
}


SPEECH_CONTEXT_INSTRUCTIONS = {
    "life_chat": {
        "label": "生活聊天",
        "instruction": "The NPC is casually chatting with the player about the selected keyword. Keep it conversational and personal.",
    },
    "encounter_speech": {
        "label": "遭遇發言",
        "instruction": "The NPC is directly facing or addressing the selected keyword target in the current scene. Make it immediate and outward-facing.",
    },
    "inner_monologue": {
        "label": "想法獨白",
        "instruction": "The NPC is expressing an inner thought, memory, judgment, or association about the selected keyword. Make it reflective but still in character.",
    },
    "meeting_statement": {
        "label": "會議發言",
        "instruction": "The NPC is speaking formally in a meeting to allies or officers. Make it public, concise, and suitable for council discussion.",
    },
}


def _is_debug_enabled() -> bool:
    return str(os.environ.get("NPC_LLM_DEBUG") or "").strip().lower() in _DEBUG_TRUE_VALUES


def _preview_text(text: str | None, limit: int = 220) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"\s+", " ", text).strip()
    if len(cleaned) <= limit:
        return cleaned
    return f"{cleaned[:limit]}..."


def log_debug_event(event: str, **payload) -> None:
    if not _is_debug_enabled():
        return
    LOGGER.info("[npc-brain-debug] %s %s", event, json.dumps(payload, ensure_ascii=False, default=str))


@dataclass(frozen=True)
class ResolvedEvidence:
    evidenceRef: str
    sourceType: str = "romance"
    sourceQuote: str | None = None
    factSummary: str | None = None
    confidence: float = 0.0


@dataclass(frozen=True)
class DialoguePromptPackage:
    generalId: str
    personaCardSubset: dict
    selectedContext: dict | None
    selectedKeywords: list[dict]
    resolvedEvidence: list[ResolvedEvidence]
    evidenceRefs: list[str]
    deterministicText: str
    maxChars: int
    toneMode: str
    locale: str = DEFAULT_LOCALE
    speechContextMode: str = DEFAULT_SPEECH_CONTEXT_MODE


@dataclass(frozen=True)
class DialogueGenerationResult:
    text: str
    provider: str
    model: str | None
    generationMode: str
    fallbackUsed: bool
    providerTrace: list[str] = field(default_factory=list)
    usedEvidenceRefs: list[str] = field(default_factory=list)


class DialogueProvider(Protocol):
    name: str

    def generate(self, package: DialoguePromptPackage) -> DialogueGenerationResult:
        ...


class ProviderUnavailableError(RuntimeError):
    pass


class ProviderOutputError(RuntimeError):
    pass


class DeterministicTemplateProvider:
    name = "deterministic"

    def generate(self, package: DialoguePromptPackage) -> DialogueGenerationResult:
        return DialogueGenerationResult(
            text=package.deterministicText[: package.maxChars],
            provider=self.name,
            model=None,
            generationMode="deterministic-template-v1+persona-card" if package.personaCardSubset else "deterministic-template-v1",
            fallbackUsed=not bool(package.evidenceRefs),
            usedEvidenceRefs=package.evidenceRefs,
        )


class MockDialogueProvider:
    name = "mock"

    def __init__(self, text: str | None = None) -> None:
        self.text = text or os.environ.get("NPC_LLM_MOCK_TEXT") or "曹操兵再多又如何？俺張飛守在橋上，先護住主公，誰敢近前！"

    def generate(self, package: DialoguePromptPackage) -> DialogueGenerationResult:
        if not package.resolvedEvidence:
            raise ProviderUnavailableError("mock:no-resolved-evidence")
        return DialogueGenerationResult(
            text=self.text[: package.maxChars],
            provider=self.name,
            model="mock-dialogue-v1",
            generationMode="mock-llm-v1+persona-card",
            fallbackUsed=False,
            usedEvidenceRefs=[package.resolvedEvidence[0].evidenceRef],
        )


class GeminiDialogueProvider:
    name = "gemini"

    def __init__(self, api_key: str | None = None, model: str | None = None, timeout_ms: int | None = None) -> None:
        self.api_key = api_key or os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        self.model = model or os.environ.get("NPC_LLM_MODEL_GEMINI") or os.environ.get("NPC_LLM_MODEL") or DEFAULT_GEMINI_MODEL
        self.timeout_ms = timeout_ms or int(os.environ.get("NPC_LLM_TIMEOUT_MS") or DEFAULT_TIMEOUT_MS)
        self.endpoint_base = os.environ.get("GEMINI_API_BASE") or "https://generativelanguage.googleapis.com/v1beta"
        self.thinking_budget = int(os.environ.get("NPC_LLM_GEMINI_THINKING_BUDGET") or DEFAULT_GEMINI_THINKING_BUDGET)
        self.max_output_tokens = int(os.environ.get("NPC_LLM_GEMINI_MAX_OUTPUT_TOKENS") or DEFAULT_GEMINI_MAX_OUTPUT_TOKENS)
        self.retry_count = max(1, int(os.environ.get("NPC_LLM_GEMINI_RETRY_COUNT") or DEFAULT_GEMINI_RETRY_COUNT))

    def generate(self, package: DialoguePromptPackage) -> DialogueGenerationResult:
        if not self.api_key:
            raise ProviderUnavailableError("gemini:no-api-key")
        if not package.resolvedEvidence:
            raise ProviderUnavailableError("gemini:no-resolved-evidence")

        prompt = self._build_prompt(package)
        request_body = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.75,
                "maxOutputTokens": self.max_output_tokens,
                "responseMimeType": "application/json",
                "thinkingConfig": {
                    "thinkingBudget": self.thinking_budget,
                },
            },
        }
        log_debug_event(
            "provider.request",
            provider=self.name,
            model=self.model,
            generalId=package.generalId,
            selectedKeywordKeys=[str(keyword.get("keywordKey") or "") for keyword in package.selectedKeywords],
            selectedKeywordLabels=[str(keyword.get("label") or "") for keyword in package.selectedKeywords],
            evidenceRefs=package.evidenceRefs,
            resolvedEvidenceRefs=[evidence.evidenceRef for evidence in package.resolvedEvidence],
            generationConfig=request_body["generationConfig"],
            promptPreview=_preview_text(prompt, 420),
        )
        url = f"{self.endpoint_base}/models/{self.model}:generateContent?key={self.api_key}"
        request = urllib.request.Request(
            url,
            data=json.dumps(request_body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        payload: dict | None = None
        last_error: ProviderUnavailableError | None = None
        for attempt_index in range(self.retry_count):
            try:
                with urllib.request.urlopen(request, timeout=self.timeout_ms / 1000) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                break
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="replace")[:300]
                last_error = ProviderUnavailableError(f"{self.name}:http-{exc.code}:{detail}")
                log_debug_event("provider.retry", provider=self.name, model=self.model, attempt=attempt_index + 1, error=str(last_error))
                if exc.code not in {429, 500, 502, 503, 504}:
                    raise last_error from exc
            except (urllib.error.URLError, TimeoutError) as exc:
                last_error = ProviderUnavailableError(f"{self.name}:network:{exc}")
                log_debug_event("provider.retry", provider=self.name, model=self.model, attempt=attempt_index + 1, error=str(last_error))
        if payload is None:
            raise last_error or ProviderUnavailableError(f"{self.name}:no-response")

        log_debug_event(
            "provider.response.raw",
            provider=self.name,
            model=self.model,
            payloadSummary=self._summarize_gemini_payload(payload),
        )
        text = self._extract_text(payload)
        parsed = self._parse_json_text(text)
        dialogue_text = self._extract_dialogue_text(parsed)
        if not dialogue_text:
            raise ProviderOutputError("gemini:empty-text")
        used_keyword_keys = self._extract_used_keyword_keys(parsed, package)
        if not self._matches_selected_keyword_focus(dialogue_text, package, used_keyword_keys):
            raise ProviderOutputError("gemini:missing-keyword-focus")
        if self._violates_taboos(dialogue_text, package):
            raise ProviderOutputError("gemini:taboo-violation")

        allowed_refs = {evidence.evidenceRef for evidence in package.resolvedEvidence}
        used_refs = [ref for ref in parsed.get("usedEvidenceRefs", []) if ref in allowed_refs]
        if not used_refs:
            used_refs = [package.resolvedEvidence[0].evidenceRef]

        log_debug_event(
            "provider.response.parsed",
            provider=self.name,
            model=self.model,
            usedEvidenceRefs=used_refs,
            usedKeywordKeys=used_keyword_keys,
            textPreview=_preview_text(dialogue_text),
        )

        return DialogueGenerationResult(
            text=dialogue_text[: package.maxChars],
            provider=self.name,
            model=self.model,
            generationMode="gemini-json-v1+persona-card",
            fallbackUsed=False,
            usedEvidenceRefs=used_refs,
        )

    def _extract_dialogue_text(self, parsed: dict) -> str:
        direct_text = str(parsed.get("text") or "").strip()
        if direct_text:
            return direct_text
        nested_format = parsed.get("format")
        if isinstance(nested_format, dict):
            return str(nested_format.get("text") or "").strip()
        return ""

    def _build_prompt(self, package: DialoguePromptPackage) -> str:
        selected_keyword_labels = [str(keyword.get("label") or "") for keyword in package.selectedKeywords if keyword.get("label")]
        locale_instruction = LOCALE_INSTRUCTIONS.get(package.locale, LOCALE_INSTRUCTIONS[DEFAULT_LOCALE])
        speech_instruction = SPEECH_CONTEXT_INSTRUCTIONS.get(package.speechContextMode, SPEECH_CONTEXT_INSTRUCTIONS[DEFAULT_SPEECH_CONTEXT_MODE])
        evidence_payload = [
            {
                "evidenceRef": evidence.evidenceRef,
                "sourceType": evidence.sourceType,
                "sourceQuote": evidence.sourceQuote,
                "factSummary": evidence.factSummary,
                "confidence": evidence.confidence,
            }
            for evidence in package.resolvedEvidence[:5]
        ]
        payload = {
            "task": "Write one in-character dialogue line for a Three Kingdoms game NPC.",
            "hardRules": [
                "Return JSON only.",
                "Use only personaCardSubset, selectedContext, selectedKeywords, and resolvedEvidence.",
                "Do not invent major historical facts not supported by resolvedEvidence.",
                "Do not mention being an AI or model.",
                "If selectedKeywords is not empty, the final line must directly mention or clearly allude to at least one selected keyword label.",
            ],
            "localeDirective": {
                "locale": package.locale,
                "languageLabel": locale_instruction["label"],
                "instruction": locale_instruction["instruction"],
            },
            "speechContextDirective": {
                "mode": package.speechContextMode,
                "label": speech_instruction["label"],
                "instruction": speech_instruction["instruction"],
            },
            "personaCardSubset": package.personaCardSubset,
            "selectedContext": package.selectedContext,
            "selectedKeywords": package.selectedKeywords,
            "keywordDirective": {
                "mustReflectSelectedKeyword": bool(selected_keyword_labels),
                "preferredLabels": selected_keyword_labels,
                "selectedKeywordCount": len(selected_keyword_labels),
            },
            "resolvedEvidence": evidence_payload,
            "outputContract": {
                "language": package.locale,
                "maxChars": package.maxChars,
                "format": {
                    "text": "string",
                    "usedKeywordKeys": ["keywordKey"],
                    "usedEvidenceRefs": ["evidenceRef"],
                    "usedPersonaAnchors": ["string"],
                    "safetyFallbackUsed": False,
                    "violations": [],
                },
            },
        }
        return json.dumps(payload, ensure_ascii=False)

    def _extract_text(self, payload: dict) -> str:
        candidates = payload.get("candidates") or []
        if not candidates:
            raise ProviderOutputError("gemini:no-candidates")
        parts = ((candidates[0].get("content") or {}).get("parts") or [])
        text_parts = [str(part.get("text") or "") for part in parts if part.get("text")]
        if not text_parts:
            raise ProviderOutputError("gemini:no-text-part")
        return "".join(text_parts).strip()

    def _parse_json_text(self, text: str) -> dict:
        cleaned = text.strip()
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            repaired = self._repair_json_contract(cleaned)
            if repaired is None:
                raise ProviderOutputError(f"gemini:json-parse:{exc}") from exc
            log_debug_event(
                "provider.response.repaired",
                provider=self.name,
                model=self.model,
                repairedKeys=sorted(repaired.keys()),
                textPreview=_preview_text(str(repaired.get("text") or "")),
            )
            parsed = repaired
        if not isinstance(parsed, dict):
            raise ProviderOutputError("gemini:json-not-object")
        return parsed

    def _repair_json_contract(self, cleaned: str) -> dict | None:
        text_value = self._extract_string_field(cleaned, "text")
        if not text_value:
            text_value = self._extract_nested_format_text(cleaned)
        used_keyword_keys = self._extract_string_array_field(cleaned, "usedKeywordKeys")
        used_evidence_refs = self._extract_string_array_field(cleaned, "usedEvidenceRefs")
        used_persona_anchors = self._extract_string_array_field(cleaned, "usedPersonaAnchors")
        violations = self._extract_string_array_field(cleaned, "violations")
        if not any([text_value, used_keyword_keys, used_evidence_refs, used_persona_anchors]):
            return None
        return {
            "text": text_value or "",
            "usedKeywordKeys": used_keyword_keys,
            "usedEvidenceRefs": used_evidence_refs,
            "usedPersonaAnchors": used_persona_anchors,
            "safetyFallbackUsed": False,
            "violations": violations,
        }

    def _extract_nested_format_text(self, text: str) -> str | None:
        format_index = text.find('"format"')
        if format_index < 0:
            return None
        return self._extract_string_field(text[format_index:], "text")

    def _extract_string_field(self, text: str, field_name: str) -> str | None:
        field_index = text.find(f'"{field_name}"')
        if field_index < 0:
            return None
        colon_index = text.find(':', field_index)
        if colon_index < 0:
            return None
        string_start = self._find_next_nonspace(text, colon_index + 1)
        if string_start is None or string_start >= len(text) or text[string_start] != '"':
            return None
        value, _end_index, _closed = self._scan_json_string(text, string_start)
        return value or None

    def _extract_string_array_field(self, text: str, field_name: str) -> list[str]:
        field_index = text.find(f'"{field_name}"')
        if field_index < 0:
            return []
        colon_index = text.find(':', field_index)
        if colon_index < 0:
            return []
        array_start = text.find('[', colon_index)
        if array_start < 0:
            return []
        items: list[str] = []
        cursor = array_start + 1
        while cursor < len(text):
            next_index = self._find_next_nonspace(text, cursor)
            if next_index is None:
                break
            cursor = next_index
            if text[cursor] == ']':
                break
            if text[cursor] != '"':
                break
            value, cursor, _closed = self._scan_json_string(text, cursor)
            if value:
                items.append(value)
            next_index = self._find_next_nonspace(text, cursor)
            if next_index is None:
                break
            cursor = next_index
            if text[cursor] == ',':
                cursor += 1
                continue
            if text[cursor] == ']':
                break
        return items

    def _find_next_nonspace(self, text: str, start_index: int) -> int | None:
        cursor = start_index
        while cursor < len(text) and text[cursor].isspace():
            cursor += 1
        return cursor if cursor < len(text) else None

    def _scan_json_string(self, text: str, quote_index: int) -> tuple[str, int, bool]:
        cursor = quote_index + 1
        raw_chars: list[str] = []
        escaped = False
        while cursor < len(text):
            char = text[cursor]
            if escaped:
                raw_chars.append('\\')
                raw_chars.append(char)
                escaped = False
                cursor += 1
                continue
            if char == '\\':
                escaped = True
                cursor += 1
                continue
            if char == '"':
                raw_value = ''.join(raw_chars)
                try:
                    value = json.loads(f'"{raw_value}"')
                except json.JSONDecodeError:
                    value = self._unescape_partial_json_string(raw_value)
                return value, cursor + 1, True
            raw_chars.append(char)
            cursor += 1
        return self._unescape_partial_json_string(''.join(raw_chars)), cursor, False

    def _unescape_partial_json_string(self, raw_value: str) -> str:
        repaired = raw_value
        repaired = repaired.replace('\\n', ' ')
        repaired = repaired.replace('\\r', ' ')
        repaired = repaired.replace('\\t', ' ')
        repaired = repaired.replace('\\"', '"')
        repaired = repaired.replace("\\'", "'")
        repaired = repaired.replace('\\\\', '\\')
        repaired = re.sub(r'\\u([0-9a-fA-F]{4})', lambda match: chr(int(match.group(1), 16)), repaired)
        return repaired.strip()

    def _extract_used_keyword_keys(self, parsed: dict, package: DialoguePromptPackage) -> list[str]:
        allowed_keys = {
            str(keyword.get("keywordKey") or "")
            for keyword in package.selectedKeywords
            if keyword.get("keywordKey")
        }
        raw_keys = parsed.get("usedKeywordKeys") or []
        if not isinstance(raw_keys, list):
            return []
        return [str(keyword_key) for keyword_key in raw_keys if str(keyword_key) in allowed_keys]

    def _matches_selected_keyword_focus(self, text: str, package: DialoguePromptPackage, used_keyword_keys: list[str]) -> bool:
        if not package.selectedKeywords:
            return True
        if used_keyword_keys:
            return True
        normalized_text = self._normalize_focus_text(text)
        focus_tokens: list[str] = []
        for keyword in package.selectedKeywords:
            focus_tokens.extend(self._focus_tokens_for_label(str(keyword.get("label") or "")))
        if package.selectedContext is not None:
            focus_tokens.extend(self._focus_tokens_for_label(str(package.selectedContext.get("label") or "")))
        return any(token in normalized_text for token in dict.fromkeys(token for token in focus_tokens if token))

    def _focus_tokens_for_label(self, label: str) -> list[str]:
        normalized = self._normalize_focus_text(label)
        if not normalized:
            return []
        tokens = [normalized]
        if len(normalized) >= 4:
            for index in range(len(normalized) - 1):
                token = normalized[index:index + 2]
                if token not in tokens:
                    tokens.append(token)
                if len(tokens) >= 5:
                    break
        return tokens

    def _normalize_focus_text(self, value: str) -> str:
        return re.sub(r"[\s\-_'\"`，。！？、：；（）()\[\]{}]", "", value or "")

    def _summarize_gemini_payload(self, payload: dict) -> dict:
        candidates = payload.get("candidates") or []
        first_candidate = candidates[0] if candidates else {}
        parts = ((first_candidate.get("content") or {}).get("parts") or [])
        usage = payload.get("usageMetadata") or {}
        return {
            "candidateCount": len(candidates),
            "finishReason": first_candidate.get("finishReason"),
            "partsCount": len(parts),
            "thoughtsTokenCount": usage.get("thoughtsTokenCount"),
            "candidatesTokenCount": usage.get("candidatesTokenCount"),
        }

    def _violates_taboos(self, text: str, package: DialoguePromptPackage) -> bool:
        forbidden = ["AI", "人工智慧", "模型", "網路", "哈哈哈", "lol"]
        persona_taboos = package.personaCardSubset.get("taboos") or []
        if any(token in text for token in forbidden):
            return True
        if "不可怯戰" in persona_taboos and any(token in text for token in ["逃吧", "我怕", "退縮"]):
            return True
        return False


class LocalLlamaDialogueProvider(GeminiDialogueProvider):
    name = "local_llama"

    def __init__(self, api_url: str | None = None, model: str | None = None, timeout_ms: int | None = None) -> None:
        self.model = model or os.environ.get("NPC_LLM_MODEL_LOCAL_LLAMA") or DEFAULT_LOCAL_LLAMA_MODEL
        self.timeout_ms = timeout_ms or int(os.environ.get("NPC_LLM_LOCAL_LLAMA_TIMEOUT_MS") or DEFAULT_LOCAL_LLAMA_TIMEOUT_MS)
        base_url = os.environ.get("NPC_LLM_LOCAL_LLAMA_API_BASE") or DEFAULT_LOCAL_LLAMA_API_BASE
        self.api_url = api_url or os.environ.get("NPC_LLM_LOCAL_LLAMA_API_URL") or f"{base_url.rstrip('/')}{DEFAULT_LOCAL_LLAMA_API_PATH}"
        self.max_output_tokens = int(os.environ.get("NPC_LLM_LOCAL_LLAMA_MAX_OUTPUT_TOKENS") or DEFAULT_GEMINI_MAX_OUTPUT_TOKENS)

    def generate(self, package: DialoguePromptPackage) -> DialogueGenerationResult:
        if not package.resolvedEvidence:
            raise ProviderUnavailableError("local_llama:no-resolved-evidence")

        prompt = self._build_prompt(package)
        request_body = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.75,
                "num_predict": self.max_output_tokens,
            },
        }
        log_debug_event(
            "provider.request",
            provider=self.name,
            model=self.model,
            apiUrl=self.api_url,
            generalId=package.generalId,
            selectedKeywordKeys=[str(keyword.get("keywordKey") or "") for keyword in package.selectedKeywords],
            selectedKeywordLabels=[str(keyword.get("label") or "") for keyword in package.selectedKeywords],
            evidenceRefs=package.evidenceRefs,
            resolvedEvidenceRefs=[evidence.evidenceRef for evidence in package.resolvedEvidence],
            requestOptions=request_body["options"],
            promptPreview=_preview_text(prompt, 420),
        )
        request = urllib.request.Request(
            self.api_url,
            data=json.dumps(request_body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_ms / 1000) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:300]
            raise ProviderUnavailableError(f"local_llama:http-{exc.code}:{detail}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise ProviderUnavailableError(f"local_llama:network:{exc}") from exc

        response_text = self._extract_local_llama_text(payload)
        log_debug_event(
            "provider.response.raw",
            provider=self.name,
            model=self.model,
            payloadSummary=self._summarize_local_llama_payload(payload),
            textPreview=_preview_text(response_text),
        )
        parsed = self._parse_json_text(response_text)
        dialogue_text = self._extract_dialogue_text(parsed)
        if not dialogue_text:
            raise ProviderOutputError("local_llama:empty-text")
        used_keyword_keys = self._extract_used_keyword_keys(parsed, package)
        if not self._matches_selected_keyword_focus(dialogue_text, package, used_keyword_keys):
            raise ProviderOutputError("local_llama:missing-keyword-focus")
        if self._violates_taboos(dialogue_text, package):
            raise ProviderOutputError("local_llama:taboo-violation")

        allowed_refs = {evidence.evidenceRef for evidence in package.resolvedEvidence}
        used_refs = [ref for ref in parsed.get("usedEvidenceRefs", []) if ref in allowed_refs]
        if not used_refs:
            used_refs = [package.resolvedEvidence[0].evidenceRef]

        log_debug_event(
            "provider.response.parsed",
            provider=self.name,
            model=self.model,
            usedEvidenceRefs=used_refs,
            usedKeywordKeys=used_keyword_keys,
            textPreview=_preview_text(dialogue_text),
        )
        return DialogueGenerationResult(
            text=dialogue_text[: package.maxChars],
            provider=self.name,
            model=self.model,
            generationMode="local-llama-json-v1+persona-card",
            fallbackUsed=False,
            usedEvidenceRefs=used_refs,
        )

    def _extract_local_llama_text(self, payload: dict) -> str:
        message = payload.get("message") or {}
        content = message.get("content")
        if not content:
            raise ProviderOutputError("local_llama:no-content")
        return str(content).strip()

    def _summarize_local_llama_payload(self, payload: dict) -> dict:
        return {
            "model": payload.get("model"),
            "done": payload.get("done"),
            "doneReason": payload.get("done_reason"),
            "evalCount": payload.get("eval_count"),
            "promptEvalCount": payload.get("prompt_eval_count"),
        }


class GeminiFlashDialogueProvider(GeminiDialogueProvider):
    name = "gemini_flash"

    def __init__(self, api_key: str | None = None, model: str | None = None, timeout_ms: int | None = None) -> None:
        super().__init__(
            api_key=api_key,
            model=model or os.environ.get("NPC_LLM_MODEL_GEMINI_FLASH") or DEFAULT_GEMINI_FLASH_MODEL,
            timeout_ms=timeout_ms,
        )


class GeminiFlashLiteDialogueProvider(GeminiDialogueProvider):
    name = "gemini_flash_lite"

    def __init__(self, api_key: str | None = None, model: str | None = None, timeout_ms: int | None = None) -> None:
        super().__init__(
            api_key=api_key,
            model=model or os.environ.get("NPC_LLM_MODEL_GEMINI_FLASH_LITE") or DEFAULT_GEMINI_FLASH_LITE_MODEL,
            timeout_ms=timeout_ms,
        )
        self.thinking_budget = int(os.environ.get("NPC_LLM_GEMINI_FLASH_LITE_THINKING_BUDGET") or DEFAULT_GEMINI_FLASH_LITE_THINKING_BUDGET)


class DialogueHistoryCacheProvider:
    name = "history_cache"

    def __init__(self, cache_path: str | None = None) -> None:
        self.cache_path = Path(cache_path or os.environ.get("NPC_LLM_HISTORY_CACHE_PATH") or DEFAULT_HISTORY_CACHE_PATH)

    def generate(self, package: DialoguePromptPackage) -> DialogueGenerationResult:
        if not self.cache_path.exists():
            raise ProviderUnavailableError("history_cache:empty")
        best_entry = self._find_best_entry(package)
        if best_entry is None:
            raise ProviderUnavailableError("history_cache:no-match")
        text = str(best_entry.get("text") or "").strip()
        if not text:
            raise ProviderOutputError("history_cache:empty-text")
        used_refs = [str(ref) for ref in best_entry.get("usedEvidenceRefs", []) if str(ref) in set(package.evidenceRefs)]
        if not used_refs:
            used_refs = [ref for ref in package.evidenceRefs[:1]]
        log_debug_event(
            "provider.response.history-cache",
            provider=self.name,
            matchScore=best_entry.get("_score"),
            sourceProvider=best_entry.get("provider"),
            sourceModel=best_entry.get("model"),
            keywordKeys=best_entry.get("keywordKeys"),
            textPreview=_preview_text(text),
        )
        return DialogueGenerationResult(
            text=text[: package.maxChars],
            provider=self.name,
            model="local-jsonl-history",
            generationMode="dialogue-history-cache-v1",
            fallbackUsed=False,
            usedEvidenceRefs=used_refs,
        )

    def _find_best_entry(self, package: DialoguePromptPackage) -> dict | None:
        selected_keyword_keys = {str(keyword.get("keywordKey") or "") for keyword in package.selectedKeywords if keyword.get("keywordKey")}
        selected_keyword_labels = {str(keyword.get("label") or "") for keyword in package.selectedKeywords if keyword.get("label")}
        evidence_refs = set(package.evidenceRefs)
        selected_context_key = str((package.selectedContext or {}).get("contextKey") or "")
        best_entry: dict | None = None
        best_score = 0
        for entry in self._iter_entries():
            if entry.get("generalId") != package.generalId:
                continue
            if str(entry.get("locale") or DEFAULT_LOCALE) != package.locale:
                continue
            if str(entry.get("speechContextMode") or DEFAULT_SPEECH_CONTEXT_MODE) != package.speechContextMode:
                continue
            score = 0
            entry_keyword_keys = {str(key) for key in entry.get("keywordKeys", [])}
            entry_keyword_labels = {str(label) for label in entry.get("keywordLabels", [])}
            exact_keyword_matches = selected_keyword_keys.intersection(entry_keyword_keys)
            label_matches = selected_keyword_labels.intersection(entry_keyword_labels)
            if exact_keyword_matches:
                score += 100 * len(exact_keyword_matches)
            if label_matches:
                score += 70 * len(label_matches)
            if selected_context_key and selected_context_key == entry.get("contextKey"):
                score += 20
            score += 5 * len(evidence_refs.intersection(str(ref) for ref in entry.get("evidenceRefs", [])))
            score += 10 * len(evidence_refs.intersection(str(ref) for ref in entry.get("usedEvidenceRefs", [])))
            if score > best_score:
                best_score = score
                best_entry = {**entry, "_score": score}
        if best_score <= 0:
            return None
        return best_entry

    def _iter_entries(self):
        try:
            lines = self.cache_path.read_text(encoding="utf-8").splitlines()
        except OSError:
            return
        for line in reversed(lines[-500:]):
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(entry, dict):
                yield entry


class DialogueProviderRouter:
    def __init__(self, provider_order: list[str] | None = None) -> None:
        self.provider_order = provider_order or self._read_provider_order()

    def generate(self, package: DialoguePromptPackage) -> DialogueGenerationResult:
        trace: list[str] = []
        for provider_name in self.provider_order:
            try:
                provider = self._create_provider(provider_name)
                result = provider.generate(package)
                return DialogueGenerationResult(
                    text=result.text,
                    provider=result.provider,
                    model=result.model,
                    generationMode=result.generationMode,
                    fallbackUsed=result.fallbackUsed or bool(trace),
                    providerTrace=[*trace, f"{provider.name}:ok"],
                    usedEvidenceRefs=result.usedEvidenceRefs,
                )
            except (ProviderUnavailableError, ProviderOutputError) as exc:
                trace.append(str(exc))
                continue
        deterministic = DeterministicTemplateProvider().generate(package)
        return DialogueGenerationResult(
            text=deterministic.text,
            provider=deterministic.provider,
            model=deterministic.model,
            generationMode=deterministic.generationMode,
            fallbackUsed=True,
            providerTrace=[*trace, "deterministic:ok"],
            usedEvidenceRefs=deterministic.usedEvidenceRefs,
        )

    def _read_provider_order(self) -> list[str]:
        raw = os.environ.get("NPC_LLM_PROVIDER_ORDER") or "deterministic"
        providers = [part.strip() for part in raw.split(",") if part.strip()]
        return providers or ["deterministic"]

    def _create_provider(self, provider_name: str) -> DialogueProvider:
        if provider_name == "gemini":
            return GeminiDialogueProvider()
        if provider_name == "gemini_flash":
            return GeminiFlashDialogueProvider()
        if provider_name == "gemini_flash_lite":
            return GeminiFlashLiteDialogueProvider()
        if provider_name == "local_llama":
            return LocalLlamaDialogueProvider()
        if provider_name == "history_cache":
            return DialogueHistoryCacheProvider()
        if provider_name == "mock":
            return MockDialogueProvider()
        if provider_name == "deterministic":
            return DeterministicTemplateProvider()
        raise ProviderUnavailableError(f"{provider_name}:unsupported-provider")


def load_local_env(repo_root) -> None:
    for path in [repo_root / "server/npc-brain/.env", repo_root / ".env"]:
        if not path.exists():
            continue
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
