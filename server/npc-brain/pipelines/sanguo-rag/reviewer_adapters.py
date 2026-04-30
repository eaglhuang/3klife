from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from ollama_reasoning_client import (
    DEFAULT_REASONING_REPEAT_PENALTY,
    DEFAULT_REASONING_TEMPERATURE,
    DEFAULT_REASONING_TOP_P,
    OllamaReasoningResult,
    request_ollama_reasoning_json,
    resolve_ollama_api_url,
)


DEFAULT_FAST_REVIEWER_MODEL = "qwen2.5:7b"
DEFAULT_QUALITY_REVIEWER_MODEL = "deepseek-r1:7b"


@dataclass(frozen=True)
class ReviewerAdapter:
    provider: str
    preset: str
    model: str
    apiUrl: str | None
    timeoutMs: int
    numCtx: int
    numPredict: int
    temperature: float
    topP: float
    repeatPenalty: float

    @property
    def uses_llm(self) -> bool:
        return self.provider == "ollama"

    def describe(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "preset": self.preset,
            "model": self.model,
            "apiUrl": self.apiUrl,
            "timeoutMs": self.timeoutMs,
            "numCtx": self.numCtx,
            "numPredict": self.numPredict,
            "temperature": self.temperature,
            "topP": self.topP,
            "repeatPenalty": self.repeatPenalty,
        }

    def request_json(self, *, system_prompt: str, user_payload: dict) -> OllamaReasoningResult:
        if not self.uses_llm:
            raise RuntimeError(f"reviewer-adapter-{self.provider}-does-not-call-llm")
        return request_ollama_reasoning_json(
            api_url=self.apiUrl or resolve_ollama_api_url(),
            model=self.model,
            system_prompt=system_prompt,
            user_payload=user_payload,
            timeout_ms=self.timeoutMs,
            num_ctx=self.numCtx,
            num_predict=self.numPredict,
            temperature=self.temperature,
            top_p=self.topP,
            repeat_penalty=self.repeatPenalty,
        )


def resolve_reviewer_adapter(
    *,
    preset: str | None = None,
    provider: str | None = None,
    api_url: str | None = None,
    model: str | None = None,
    timeout_ms: int | None = None,
    num_ctx: int | None = None,
    num_predict: int | None = None,
    temperature: float | None = None,
    top_p: float | None = None,
    repeat_penalty: float | None = None,
) -> ReviewerAdapter:
    selected_preset = (preset or os.environ.get("SANGUO_REVIEWER_PRESET") or "fast").strip().lower()
    selected_provider = (provider or os.environ.get("SANGUO_REVIEWER_PROVIDER") or "").strip().lower()
    if selected_preset in {"none", "hints", "hints-only", "deterministic"}:
        selected_provider = "hints-only"
        selected_preset = "hints-only"
    if selected_preset in {"agent", "agent-reviewer", "local-agent"}:
        selected_provider = "agent-reviewer"
        selected_preset = "agent"
    if not selected_provider:
        selected_provider = "ollama"

    if selected_preset in {"deepseek", "quality"}:
        default_model = os.environ.get("NPC_LLM_MODEL_DEEPSEEK_REASONER") or DEFAULT_QUALITY_REVIEWER_MODEL
        defaults = {
            "timeoutMs": 120000,
            "numCtx": 8192,
            "numPredict": 700,
            "temperature": DEFAULT_REASONING_TEMPERATURE,
            "topP": DEFAULT_REASONING_TOP_P,
            "repeatPenalty": DEFAULT_REASONING_REPEAT_PENALTY,
        }
    elif selected_preset in {"balanced", "qwen"}:
        default_model = os.environ.get("NPC_LLM_MODEL_FAST_REVIEWER") or DEFAULT_FAST_REVIEWER_MODEL
        defaults = {
            "timeoutMs": 45000,
            "numCtx": 4096,
            "numPredict": 550,
            "temperature": 0.1,
            "topP": 0.8,
            "repeatPenalty": 1.05,
        }
    elif selected_preset == "agent":
        default_model = "sanguo-agent-reviewer-v1"
        defaults = {
            "timeoutMs": 0,
            "numCtx": 0,
            "numPredict": 0,
            "temperature": 0.0,
            "topP": 0.0,
            "repeatPenalty": 0.0,
        }
    elif selected_preset == "hints-only":
        default_model = "source-grounded-hints"
        defaults = {
            "timeoutMs": 0,
            "numCtx": 0,
            "numPredict": 0,
            "temperature": 0.0,
            "topP": 0.0,
            "repeatPenalty": 0.0,
        }
    else:
        selected_preset = "fast"
        default_model = os.environ.get("NPC_LLM_MODEL_FAST_REVIEWER") or DEFAULT_FAST_REVIEWER_MODEL
        defaults = {
            "timeoutMs": 60000,
            "numCtx": 3072,
            "numPredict": 360,
            "temperature": 0.05,
            "topP": 0.75,
            "repeatPenalty": 1.05,
        }

    return ReviewerAdapter(
        provider=selected_provider,
        preset=selected_preset,
        model=model or default_model,
        apiUrl=resolve_ollama_api_url(api_url) if selected_provider == "ollama" else None,
        timeoutMs=int(timeout_ms if timeout_ms is not None else defaults["timeoutMs"]),
        numCtx=int(num_ctx if num_ctx is not None else defaults["numCtx"]),
        numPredict=int(num_predict if num_predict is not None else defaults["numPredict"]),
        temperature=float(temperature if temperature is not None else defaults["temperature"]),
        topP=float(top_p if top_p is not None else defaults["topP"]),
        repeatPenalty=float(repeat_penalty if repeat_penalty is not None else defaults["repeatPenalty"]),
    )