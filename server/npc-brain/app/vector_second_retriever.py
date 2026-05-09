from __future__ import annotations

import hashlib
import math
import re
from dataclasses import dataclass, field
from typing import Any

from .llm_dialogue_renderer import ResolvedEvidence
from .runtime_profile_store import RuntimeProfileStore


DEFAULT_VECTOR_DIMENSION = 256
DEFAULT_MIN_SCORE = 0.12


@dataclass(frozen=True)
class VectorSecondResult:
    resolvedEvidence: list[ResolvedEvidence] = field(default_factory=list)
    coveredRefs: set[str] = field(default_factory=set)
    trace: list[str] = field(default_factory=list)


class VectorSecondRetriever:
    def __init__(self, store: RuntimeProfileStore) -> None:
        self.store = store

    def complete_exact_refs(
        self,
        general_id: str,
        unresolved_refs: list[str],
        already_resolved_refs: set[str],
        limit: int,
    ) -> VectorSecondResult:
        if limit <= 0:
            return VectorSecondResult(trace=["exact-ref-fill:skipped:no-slot"])
        wanted = {str(ref) for ref in unresolved_refs if ref}
        if not wanted:
            return VectorSecondResult(trace=["exact-ref-fill:skipped:no-unresolved"])

        runtime_persona = self.store.read_runtime_persona(general_id) or {}
        resolved: list[ResolvedEvidence] = []
        covered_refs: set[str] = set()
        seen_event_refs = set(already_resolved_refs)
        trace: list[str] = []

        story_hits = 0
        for beat in runtime_persona.get("storyBeats") or []:
            beat_refs = [str(ref) for ref in beat.get("sourceRefs") or [] if ref]
            matched_refs = [ref for ref in beat_refs if ref in wanted]
            if not matched_refs:
                continue
            evidence_ref = matched_refs[0]
            covered_refs.update(matched_refs)
            if evidence_ref in seen_event_refs:
                continue
            seen_event_refs.add(evidence_ref)
            story_hits += 1
            resolved.append(
                ResolvedEvidence(
                    evidenceRef=evidence_ref,
                    sourceType="romance-runtime-profile",
                    sourceQuote=beat.get("sourceQuote"),
                    factSummary=beat.get("summary"),
                    generalIds=[str(value) for value in beat.get("generalIds") or []],
                    confidence=float(beat.get("confidence") or 0.72),
                )
            )
            if len(resolved) >= limit:
                break
        if story_hits:
            trace.append(f"exact-ref-fill:story-beat:{story_hits}")

        if len(resolved) < limit:
            ready_event_hits = 0
            for event in self.store.load_ready_events():
                if general_id not in event.get("generalIds", []):
                    continue
                if str(event.get("eventType") or "") == "alias-smoke":
                    continue
                event_refs = [str(ref) for ref in event.get("sourceRefs") or [] if ref]
                matched_refs = [ref for ref in event_refs if ref in wanted]
                if not matched_refs:
                    continue
                evidence_ref = matched_refs[0]
                covered_refs.update(matched_refs)
                if evidence_ref in seen_event_refs:
                    continue
                seen_event_refs.add(evidence_ref)
                ready_event_hits += 1
                resolved.append(
                    ResolvedEvidence(
                        evidenceRef=evidence_ref,
                        sourceType=str(event.get("sourceType") or "romance"),
                        sourceQuote=event.get("sourceQuote"),
                        factSummary=event.get("summary"),
                        generalIds=[str(value) for value in event.get("generalIds") or []],
                        confidence=float(event.get("confidence") or 0.68),
                    )
                )
                if len(resolved) >= limit:
                    break
            if ready_event_hits:
                trace.append(f"exact-ref-fill:ready-event:{ready_event_hits}")

        if len(resolved) < limit:
            highlight_hits = 0
            for highlight in runtime_persona.get("sourceHighlights") or []:
                source_ref = str(highlight.get("sourceRef") or "")
                if not source_ref or source_ref not in wanted:
                    continue
                covered_refs.add(source_ref)
                if source_ref in seen_event_refs:
                    continue
                seen_event_refs.add(source_ref)
                highlight_hits += 1
                resolved.append(
                    ResolvedEvidence(
                        evidenceRef=source_ref,
                        sourceType="runtime-source-highlight",
                        sourceQuote=highlight.get("example"),
                        factSummary=highlight.get("example"),
                        generalIds=[general_id],
                        confidence=0.58,
                    )
                )
                if len(resolved) >= limit:
                    break
            if highlight_hits:
                trace.append(f"exact-ref-fill:source-highlight:{highlight_hits}")

        if not trace:
            trace.append("exact-ref-fill:miss")
        return VectorSecondResult(resolvedEvidence=resolved, coveredRefs=covered_refs, trace=trace)

    def retrieve_semantic(
        self,
        general_id: str,
        context: Any | None,
        keywords: list[Any],
        unresolved_refs: list[str],
        already_resolved_refs: set[str],
        limit: int,
    ) -> VectorSecondResult:
        if limit <= 0:
            return VectorSecondResult(trace=["vector-second:skipped:no-slot"])

        query_text = self._build_query_text(general_id, context, keywords)
        if not query_text:
            return VectorSecondResult(trace=["vector-second:skipped:no-query-text"])

        query_vector = self._hash_vector(query_text)
        wanted = {str(ref) for ref in unresolved_refs if ref}
        scored: list[tuple[float, dict, str, set[str]]] = []
        for event in self.store.load_ready_events():
            if general_id not in event.get("generalIds", []):
                continue
            if str(event.get("eventType") or "") == "alias-smoke":
                continue
            event_refs = [str(ref) for ref in event.get("sourceRefs") or [] if ref]
            representative_ref = next((ref for ref in event_refs if ref not in already_resolved_refs), "")
            if not representative_ref:
                continue
            score = self._cosine_similarity(query_vector, self._hash_vector(self._event_text(event)))
            matched_refs = {ref for ref in event_refs if ref in wanted}
            if matched_refs:
                score += 0.25
            if score < DEFAULT_MIN_SCORE:
                continue
            scored.append((score, event, representative_ref, matched_refs))

        scored.sort(key=lambda item: item[0], reverse=True)
        resolved: list[ResolvedEvidence] = []
        covered_refs: set[str] = set()
        for score, event, representative_ref, matched_refs in scored[:limit]:
            covered_refs.update(matched_refs)
            resolved.append(
                ResolvedEvidence(
                    evidenceRef=representative_ref,
                    sourceType="vector-ready-event",
                    sourceQuote=event.get("sourceQuote"),
                    factSummary=event.get("summary"),
                    generalIds=[str(value) for value in event.get("generalIds") or []],
                    confidence=float(max(min(score, 0.95), 0.32)),
                )
            )

        if not resolved:
            return VectorSecondResult(trace=["vector-second:local-ready-events:miss"])
        return VectorSecondResult(
            resolvedEvidence=resolved,
            coveredRefs=covered_refs,
            trace=[f"vector-second:local-ready-events:{len(resolved)}"],
        )

    def _build_query_text(self, general_id: str, context: Any | None, keywords: list[Any]) -> str:
        parts = [general_id]
        context_label = self._get(context, "label")
        context_key = self._get(context, "contextKey")
        if context_label:
            parts.append(str(context_label))
        if context_key:
            parts.append(str(context_key))
        for keyword in keywords[:4]:
            category = self._get(keyword, "category")
            label = self._get(keyword, "label")
            keyword_key = self._get(keyword, "keywordKey")
            if category:
                parts.append(str(category))
            if label:
                parts.append(str(label))
            if keyword_key:
                parts.append(str(keyword_key))
        return " ".join(part for part in parts if part).strip()

    def _event_text(self, event: dict[str, Any]) -> str:
        parts = [
            str(event.get("eventKey") or ""),
            str(event.get("location") or ""),
            str(event.get("summary") or ""),
            str(event.get("sourceQuote") or "")[:180],
        ]
        return " ".join(part for part in parts if part)

    def _hash_vector(self, text: str, dimension: int = DEFAULT_VECTOR_DIMENSION) -> list[float]:
        values = [0.0] * max(dimension, 8)
        tokens = self._tokenize(text)
        if not tokens:
            return values
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            slot = int.from_bytes(digest[:4], byteorder="big", signed=False) % len(values)
            sign = -1.0 if (digest[4] % 2) else 1.0
            values[slot] += sign
        norm = math.sqrt(sum(value * value for value in values))
        if norm <= 0:
            return values
        return [value / norm for value in values]

    def _tokenize(self, text: str) -> list[str]:
        raw = str(text or "").strip().lower()
        if not raw:
            return []
        tokens: list[str] = re.findall(r"[a-z0-9_\\-]{2,}", raw)
        dense_chars = [char for char in raw if not char.isspace() and not self._is_punctuation(char)]
        for index, char in enumerate(dense_chars):
            tokens.append(char)
            if index + 1 < len(dense_chars):
                tokens.append(char + dense_chars[index + 1])
        return tokens

    def _cosine_similarity(self, left: list[float], right: list[float]) -> float:
        if len(left) != len(right):
            return 0.0
        return float(sum(a * b for a, b in zip(left, right, strict=True)))

    def _is_punctuation(self, char: str) -> bool:
        return not char.isalnum() and ord(char) < 128

    def _get(self, value: Any, name: str) -> Any:
        if value is None:
            return None
        if isinstance(value, dict):
            return value.get(name)
        return getattr(value, name, None)
