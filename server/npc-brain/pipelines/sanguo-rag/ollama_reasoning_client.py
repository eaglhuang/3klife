from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from dataclasses import dataclass


DEFAULT_OLLAMA_API_URL = "http://127.0.0.1:11434/api/chat"
DEFAULT_DEEPSEEK_REASONER_MODEL = "deepseek-r1:7b"
DEFAULT_REASONING_TIMEOUT_MS = 30000
DEFAULT_REASONING_NUM_CTX = 8192
DEFAULT_REASONING_NUM_PREDICT = 900
DEFAULT_REASONING_TEMPERATURE = 0.2
DEFAULT_REASONING_TOP_P = 0.8
DEFAULT_REASONING_REPEAT_PENALTY = 1.08


@dataclass(frozen=True)
class OllamaReasoningResult:
    model: str
    rawContent: str
    cleanedContent: str
    reasoningTrace: str
    parsedJson: dict
    payloadSummary: dict


class OllamaReasoningError(RuntimeError):
    pass


def resolve_ollama_api_url(explicit_url: str | None = None) -> str:
    return (
        explicit_url
        or os.environ.get("NPC_LLM_DEEPSEEK_API_URL")
        or os.environ.get("NPC_LLM_LOCAL_LLAMA_API_URL")
        or DEFAULT_OLLAMA_API_URL
    )


def resolve_deepseek_model(explicit_model: str | None = None) -> str:
    return explicit_model or os.environ.get("NPC_LLM_MODEL_DEEPSEEK_REASONER") or DEFAULT_DEEPSEEK_REASONER_MODEL


def strip_reasoning_tags(text: str, max_reasoning_chars: int = 1200) -> tuple[str, str]:
    reasoning_parts = re.findall(r"<think>(.*?)</think>", text, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.IGNORECASE | re.DOTALL).strip()
    if not reasoning_parts:
        match = re.match(r"\s*思考[:：](.*?)(?=\{|```)", cleaned, flags=re.DOTALL)
        if match:
            reasoning_parts.append(match.group(1))
            cleaned = cleaned[match.end():].strip()
    reasoning = compact_text("\n".join(part.strip() for part in reasoning_parts if part.strip()), max_reasoning_chars)
    return cleaned, reasoning


def extract_json_object(text: str) -> dict:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as first_error:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start < 0 or end <= start:
            raise OllamaReasoningError(f"reasoner-json-parse:{first_error}") from first_error
        try:
            parsed = json.loads(cleaned[start:end + 1])
        except json.JSONDecodeError as second_error:
            raise OllamaReasoningError(f"reasoner-json-parse:{second_error}") from second_error
    if not isinstance(parsed, dict):
        raise OllamaReasoningError("reasoner-json-not-object")
    return parsed


def compact_text(text: str, max_chars: int) -> str:
    cleaned = re.sub(r"\s+", " ", str(text or "")).strip()
    if len(cleaned) <= max_chars:
        return cleaned
    minimum = max(20, int(max_chars * 0.55))
    candidates = [index + 1 for index, char in enumerate(cleaned[:max_chars]) if char in "。！？!?；;，,"]
    candidates = [index for index in candidates if index >= minimum]
    if candidates:
        return cleaned[:candidates[-1]].rstrip()
    return cleaned[: max(max_chars - 1, 1)].rstrip() + "…"


def request_ollama_reasoning_json(
    *,
    api_url: str,
    model: str,
    system_prompt: str,
    user_payload: dict,
    timeout_ms: int = DEFAULT_REASONING_TIMEOUT_MS,
    num_ctx: int = DEFAULT_REASONING_NUM_CTX,
    num_predict: int = DEFAULT_REASONING_NUM_PREDICT,
    temperature: float = DEFAULT_REASONING_TEMPERATURE,
    top_p: float = DEFAULT_REASONING_TOP_P,
    repeat_penalty: float = DEFAULT_REASONING_REPEAT_PENALTY,
) -> OllamaReasoningResult:
    request_body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
        ],
        "stream": False,
        "format": "json",
        "options": {
            "temperature": temperature,
            "top_p": top_p,
            "repeat_penalty": repeat_penalty,
            "num_ctx": num_ctx,
            "num_predict": num_predict,
        },
    }
    request = urllib.request.Request(
        api_url,
        data=json.dumps(request_body, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout_ms / 1000) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:300]
        raise OllamaReasoningError(f"reasoner-http-{exc.code}:{detail}") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise OllamaReasoningError(f"reasoner-network:{exc}") from exc

    message = response_payload.get("message") or {}
    raw_content = str(message.get("content") or "").strip()
    if not raw_content:
        raise OllamaReasoningError("reasoner-empty-content")
    cleaned_content, reasoning_trace = strip_reasoning_tags(raw_content)
    parsed = extract_json_object(cleaned_content)
    return OllamaReasoningResult(
        model=str(response_payload.get("model") or model),
        rawContent=raw_content,
        cleanedContent=cleaned_content,
        reasoningTrace=reasoning_trace,
        parsedJson=parsed,
        payloadSummary={
            "model": response_payload.get("model"),
            "done": response_payload.get("done"),
            "doneReason": response_payload.get("done_reason"),
            "evalCount": response_payload.get("eval_count"),
            "promptEvalCount": response_payload.get("prompt_eval_count"),
        },
    )