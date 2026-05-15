from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Sequence

from .llm_dialogue_renderer import ResolvedEvidence
from .runtime_profile_store import RuntimeProfileStore
from .vector_config import VectorRuntimeConfig, load_vector_runtime_config
from .vector_embedding import load_text_embedder
from .vector_store import load_vector_store


DEFAULT_MIN_SCORE = 0.12
DEFAULT_TOP_K = 12
BACKEND_PROVIDERS = {"pinecone", "qdrant"}


@dataclass(frozen=True)
class VectorSecondResult:
    resolvedEvidence: list[ResolvedEvidence] = field(default_factory=list)
    coveredRefs: set[str] = field(default_factory=set)
    trace: list[str] = field(default_factory=list)


class VectorSecondRetriever:
    def __init__(
        self,
        store: RuntimeProfileStore,
        config: VectorRuntimeConfig | None = None,
        vector_store: Any | None = None,
        text_embedder: Any | None = None,
    ) -> None:
        self.store = store
        self.config = config or load_vector_runtime_config()
        self._vector_store = vector_store
        self._text_embedder = text_embedder
        self._provider_override = self._normalize_provider(os.environ.get("NPC_VECTOR_SECOND_PROVIDER"))

    def describe(self) -> dict[str, Any]:
        candidates = self._backend_provider_candidates()
        active_provider = self._provider_name(self._vector_store) if self._vector_store is not None else (candidates[0] if candidates else None)
        return {
            "enabled": True,
            "backendProvider": active_provider,
            "backendCandidates": candidates,
            "namespace": self.config.namespace_facts,
            "embedding": {
                "provider": self.config.embedding_provider,
                "model": self.config.embedding_model,
                "dimension": self.config.dimension,
            },
        }

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
                if general_id not in (event.get("generalIds") or []):
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
            relationship_hits = 0
            runtime_relationships = self.store.read_runtime_relationships(general_id) or {}
            for anchor in runtime_relationships.get("anchors") or []:
                anchor_refs = self._normalize_refs(anchor.get("evidenceRefs"))
                matched_refs = [ref for ref in anchor_refs if ref in wanted]
                if not matched_refs:
                    continue
                evidence_ref = matched_refs[0]
                covered_refs.update(matched_refs)
                if evidence_ref in seen_event_refs:
                    continue
                seen_event_refs.add(evidence_ref)
                relationship_hits += 1
                target_id = str(anchor.get("targetId") or "").strip()
                target_name = str(anchor.get("targetName") or target_id).strip()
                rel_label = str(anchor.get("typeLabel") or anchor.get("type") or "relationship").strip()
                source_quotes = [str(item) for item in (anchor.get("sourceQuotes") or []) if str(item).strip()]
                resolved.append(
                    ResolvedEvidence(
                        evidenceRef=evidence_ref,
                        sourceType="runtime-relationship",
                        sourceQuote=source_quotes[0] if source_quotes else None,
                        factSummary=f"{target_name}:{rel_label}",
                        generalIds=[value for value in [general_id, target_id] if value],
                        confidence=float(anchor.get("edgeConfidence") or 0.72),
                    )
                )
                if len(resolved) >= limit:
                    break
            if relationship_hits:
                trace.append(f"exact-ref-fill:runtime-relationship:{relationship_hits}")

        if len(resolved) < limit:
            packet_hits = 0
            for packet in self.store.load_source_event_packets():
                source_ref = str(packet.get("sourceRef") or "").strip()
                if source_ref not in wanted:
                    continue
                packet_general_ids = [str(value) for value in packet.get("generalIds") or [] if str(value).strip()]
                if packet_general_ids and general_id not in packet_general_ids:
                    continue
                covered_refs.add(source_ref)
                if source_ref in seen_event_refs:
                    continue
                seen_event_refs.add(source_ref)
                packet_hits += 1
                examples = [str(item) for item in (packet.get("examples") or []) if str(item).strip()]
                angles = [str(item) for item in (packet.get("angleFamilies") or []) if str(item).strip()]
                resolved.append(
                    ResolvedEvidence(
                        evidenceRef=source_ref,
                        sourceType="source-event-packet",
                        sourceQuote=examples[0] if examples else None,
                        factSummary=f"source-event-packet:{source_ref}:{'/'.join(angles[:4])}",
                        generalIds=packet_general_ids or [general_id],
                        confidence=0.64 if packet.get("packetStrength") == "strong" else 0.58,
                    )
                )
                if len(resolved) >= limit:
                    break
            if packet_hits:
                trace.append(f"exact-ref-fill:source-event-packet:{packet_hits}")

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

        adapter, adapter_trace = self._get_backend_adapter()
        if adapter is None:
            return VectorSecondResult(trace=[*adapter_trace, "vector-second:backend-unavailable"])

        embedder, embedder_trace = self._get_text_embedder()
        if embedder is None:
            return VectorSecondResult(trace=[*adapter_trace, *embedder_trace, "vector-second:embedding-unavailable"])

        try:
            query_vector = embedder.embed_texts([query_text])[0]
        except Exception as exc:
            return VectorSecondResult(trace=[*adapter_trace, *embedder_trace, f"vector-second:embedding-failed:{type(exc).__name__}"])

        provider_name = self._provider_name(adapter)
        namespace = self.config.namespace_facts
        top_k = max(limit * 4, DEFAULT_TOP_K)
        matches, query_trace = self._query_backend(
            adapter=adapter,
            provider_name=provider_name,
            namespace=namespace,
            query_vector=query_vector,
            general_id=general_id,
            top_k=top_k,
        )

        wanted = {str(ref) for ref in unresolved_refs if ref}
        seen_event_refs = set(already_resolved_refs)
        resolved: list[ResolvedEvidence] = []
        covered_refs: set[str] = set()
        for match in matches:
            evidence, matched_refs = self._match_to_evidence(
                match=match,
                general_id=general_id,
                wanted=wanted,
                seen_event_refs=seen_event_refs,
            )
            covered_refs.update(matched_refs)
            if evidence is None:
                continue
            if evidence.evidenceRef in seen_event_refs:
                continue
            seen_event_refs.add(evidence.evidenceRef)
            resolved.append(evidence)
            if len(resolved) >= limit:
                break

        query_trace.append(f"vector-second:{provider_name}:{namespace}:query={len(matches)}:used={len(resolved)}")
        if not resolved:
            query_trace.append("vector-second:backend-miss")
        return VectorSecondResult(
            resolvedEvidence=resolved,
            coveredRefs=covered_refs,
            trace=[*adapter_trace, *embedder_trace, *query_trace],
        )

    def _query_backend(
        self,
        adapter: Any,
        provider_name: str,
        namespace: str,
        query_vector: Sequence[float],
        general_id: str,
        top_k: int,
    ) -> tuple[list[Any], list[str]]:
        metadata_filter = {
            "recordType": "event",
            "generalIds": {"$in": [general_id]},
        }
        try:
            matches = list(adapter.query(namespace, query_vector, top_k=top_k, metadata_filter=metadata_filter) or [])
            return matches, [f"vector-second:{provider_name}:{namespace}:filter-ok"]
        except Exception as first_error:
            try:
                matches = list(adapter.query(namespace, query_vector, top_k=top_k, metadata_filter={"recordType": "event"}) or [])
            except Exception as second_error:
                return [], [
                    f"vector-second:{provider_name}:{namespace}:filter-failed:{type(first_error).__name__}",
                    f"vector-second:{provider_name}:{namespace}:query-failed:{type(second_error).__name__}",
                ]
            return matches, [f"vector-second:{provider_name}:{namespace}:filter-fallback"]

    def _match_to_evidence(
        self,
        match: Any,
        general_id: str,
        wanted: set[str],
        seen_event_refs: set[str],
    ) -> tuple[ResolvedEvidence | None, set[str]]:
        metadata = dict(self._get(match, "metadata") or {})
        record_type = str(metadata.get("recordType") or "").strip().lower()
        if record_type and record_type != "event":
            return None, set()

        metadata_general_ids = self._normalize_refs(metadata.get("generalIds"))
        if metadata_general_ids and general_id not in metadata_general_ids:
            return None, set()
        if not metadata_general_ids:
            general_id_value = str(metadata.get("generalId") or "").strip()
            if general_id_value and general_id_value != general_id:
                return None, set()

        source_refs = self._normalize_refs(metadata.get("sourceRefs"))
        if not source_refs:
            source_ref = str(metadata.get("sourceRef") or "").strip()
            if source_ref:
                source_refs = [source_ref]

        matched_refs = {ref for ref in source_refs if ref in wanted}
        representative_ref = next((ref for ref in source_refs if ref not in seen_event_refs), "")
        if not representative_ref:
            fallback_ref = str(
                metadata.get("sourceRef")
                or metadata.get("eventId")
                or metadata.get("eventKey")
                or self._get(match, "id")
                or ""
            ).strip()
            if fallback_ref not in seen_event_refs:
                representative_ref = fallback_ref
        if not representative_ref:
            return None, matched_refs

        raw_score = self._get(match, "score")
        if raw_score is None:
            raw_score = metadata.get("confidence")
        score = float(raw_score or 0.0)
        if score < DEFAULT_MIN_SCORE:
            return None, matched_refs

        source_quote = metadata.get("sourceQuote") or self._get(match, "text") or metadata.get("text")
        fact_summary = metadata.get("summary") or metadata.get("factSummary") or metadata.get("text") or self._get(match, "text")
        general_ids = metadata_general_ids or [general_id]
        return (
            ResolvedEvidence(
                evidenceRef=representative_ref,
                sourceType=str(metadata.get("sourceType") or "vector-ready-event"),
                sourceQuote=source_quote,
                factSummary=fact_summary,
                generalIds=general_ids,
                confidence=float(max(min(score, 0.95), 0.32)),
            ),
            matched_refs,
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

    def _backend_provider_candidates(self) -> list[str]:
        candidates: list[str] = []
        for provider in [self._provider_override, self.config.default_provider, *self.config.provider_order]:
            normalized = self._normalize_provider(provider)
            if normalized and normalized not in candidates:
                candidates.append(normalized)
        return candidates

    def _get_backend_adapter(self) -> tuple[Any | None, list[str]]:
        if self._vector_store is not None:
            provider_name = self._provider_name(self._vector_store)
            return self._vector_store, [f"vector-second:backend:{provider_name}"]

        errors: list[str] = []
        for provider in self._backend_provider_candidates():
            try:
                adapter = load_vector_store(provider, config=self.config)
            except Exception as exc:
                errors.append(f"vector-second:backend:{provider}:unavailable:{type(exc).__name__}")
                continue
            self._vector_store = adapter
            return adapter, [f"vector-second:backend:{provider}"]

        if not errors:
            errors.append("vector-second:backend-unavailable:no-candidates")
        return None, errors

    def _get_text_embedder(self) -> tuple[Any | None, list[str]]:
        if self._text_embedder is not None:
            return self._text_embedder, []
        try:
            self._text_embedder = load_text_embedder(
                self.config.embedding_provider,
                self.config.embedding_model,
                self.config.dimension,
            )
        except Exception as exc:
            return None, [f"vector-second:embedding:{self.config.embedding_provider}:unavailable:{type(exc).__name__}"]
        return self._text_embedder, [f"vector-second:embedding:{self.config.embedding_provider}"]

    def _normalize_provider(self, provider: Any | None) -> str | None:
        normalized = str(provider or "").strip().lower()
        if normalized in BACKEND_PROVIDERS:
            return normalized
        return None

    def _normalize_refs(self, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            return [value] if value.strip() else []
        if isinstance(value, dict):
            refs: list[str] = []
            for item in value.values():
                refs.extend(self._normalize_refs(item))
            return refs
        if isinstance(value, (list, tuple, set)):
            refs: list[str] = []
            for item in value:
                if item is None:
                    continue
                text = str(item).strip()
                if text:
                    refs.append(text)
            return refs
        text = str(value).strip()
        return [text] if text else []

    def _provider_name(self, adapter: Any | None) -> str:
        if adapter is None:
            return "unknown"
        provider = getattr(adapter, "provider_name", None) or getattr(adapter, "name", None) or "unknown"
        return str(provider).strip().lower() or "unknown"

    def _get(self, value: Any, name: str) -> Any:
        if value is None:
            return None
        if isinstance(value, dict):
            return value.get(name)
        return getattr(value, name, None)
