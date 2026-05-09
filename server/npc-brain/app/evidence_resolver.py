from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .llm_dialogue_renderer import ResolvedEvidence
from .runtime_profile_store import RuntimeProfileStore
from .vector_second_retriever import VectorSecondRetriever


INITIAL_ARTIFACT_LIMIT = 5
MAX_RESOLVED_EVIDENCE = 8


@dataclass(frozen=True)
class ResolvedEvidencePack:
    resolvedEvidence: list[ResolvedEvidence] = field(default_factory=list)
    unresolvedEvidenceRefs: list[str] = field(default_factory=list)
    resolutionTrace: list[str] = field(default_factory=list)


class EvidenceResolver:
    def __init__(self, store: RuntimeProfileStore) -> None:
        self.store = store
        self.vector_second = VectorSecondRetriever(store)

    def resolve(
        self,
        general_id: str,
        context: Any | None,
        keywords: list[Any],
        evidence_refs: list[str],
    ) -> ResolvedEvidencePack:
        if not evidence_refs:
            return ResolvedEvidencePack(resolutionTrace=["no-evidence-refs"])

        trace: list[str] = []
        keyword_refs = self._keyword_refs(keywords)
        context_refs = set(self._get(context, "evidenceRefs") or []) if context is not None else set()
        candidate_refs = keyword_refs or context_refs or set(evidence_refs)
        if keyword_refs:
            trace.append(f"keyword-ref-priority:{len(keyword_refs)}")
        elif context_refs:
            trace.append(f"context-ref-priority:{len(context_refs)}")
        else:
            trace.append(f"request-ref-priority:{len(candidate_refs)}")

        runtime_persona = self.store.read_runtime_persona(general_id)
        if runtime_persona:
            trace.append("runtime-profile:loaded")
            resolved, covered_refs = self._resolve_from_story_beats(runtime_persona, context, keywords, candidate_refs, trace)
        else:
            trace.append("runtime-profile:missing")
            resolved, covered_refs = self._resolve_from_ready_events(general_id, context, keywords, candidate_refs, trace)

        unresolved = [ref for ref in evidence_refs if ref not in covered_refs]
        resolved_refs = {item.evidenceRef for item in resolved}

        remaining_slots = max(MAX_RESOLVED_EVIDENCE - len(resolved), 0)
        if unresolved and remaining_slots > 0:
            exact_completion = self.vector_second.complete_exact_refs(
                general_id=general_id,
                unresolved_refs=unresolved,
                already_resolved_refs=resolved_refs,
                limit=remaining_slots,
            )
            resolved, resolved_refs = self._merge_resolved(resolved, resolved_refs, exact_completion.resolvedEvidence)
            covered_refs.update(exact_completion.coveredRefs)
            trace.extend(exact_completion.trace)
            unresolved = [ref for ref in evidence_refs if ref not in covered_refs]

        remaining_slots = max(MAX_RESOLVED_EVIDENCE - len(resolved), 0)
        if unresolved and remaining_slots > 0:
            semantic_completion = self.vector_second.retrieve_semantic(
                general_id=general_id,
                context=context,
                keywords=keywords,
                unresolved_refs=unresolved,
                already_resolved_refs=resolved_refs,
                limit=remaining_slots,
            )
            resolved, resolved_refs = self._merge_resolved(resolved, resolved_refs, semantic_completion.resolvedEvidence)
            covered_refs.update(semantic_completion.coveredRefs)
            trace.extend(semantic_completion.trace)
            unresolved = [ref for ref in evidence_refs if ref not in covered_refs]
        elif unresolved:
            trace.append("vector-second:skipped:no-slot")

        if unresolved:
            trace.append(f"unresolved:{len(unresolved)}")
        else:
            trace.append("all-evidence-resolved")
        return ResolvedEvidencePack(
            resolvedEvidence=resolved,
            unresolvedEvidenceRefs=unresolved,
            resolutionTrace=trace,
        )

    def _merge_resolved(
        self,
        resolved: list[ResolvedEvidence],
        resolved_refs: set[str],
        additions: list[ResolvedEvidence],
    ) -> tuple[list[ResolvedEvidence], set[str]]:
        for item in additions:
            if item.evidenceRef in resolved_refs:
                continue
            resolved.append(item)
            resolved_refs.add(item.evidenceRef)
            if len(resolved) >= MAX_RESOLVED_EVIDENCE:
                break
        return resolved, resolved_refs

    def _resolve_from_story_beats(
        self,
        runtime_persona: dict,
        context: Any | None,
        keywords: list[Any],
        candidate_refs: set[str],
        trace: list[str],
    ) -> tuple[list[ResolvedEvidence], set[str]]:
        event_keys = self._event_key_candidates(context, keywords)
        resolved: list[ResolvedEvidence] = []
        seen_refs: set[str] = set()
        covered_refs: set[str] = set()
        for beat in runtime_persona.get("storyBeats") or []:
            beat_refs = [str(ref) for ref in beat.get("sourceRefs") or []]
            matched_refs = [ref for ref in beat_refs if ref in candidate_refs]
            has_context_match = (beat.get("eventKey") in event_keys) or (beat.get("eventId") in event_keys)
            if not has_context_match and not matched_refs:
                continue
            evidence_ref = matched_refs[0] if matched_refs else (beat_refs[0] if beat_refs else str(beat.get("eventId") or "event"))
            covered_refs.update(matched_refs or beat_refs)
            if evidence_ref in seen_refs:
                continue
            seen_refs.add(evidence_ref)
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
            trace.append(f"story-beat:{evidence_ref}")
            if len(resolved) >= INITIAL_ARTIFACT_LIMIT:
                break
        return resolved, covered_refs

    def _resolve_from_ready_events(
        self,
        general_id: str,
        context: Any | None,
        keywords: list[Any],
        candidate_refs: set[str],
        trace: list[str],
    ) -> tuple[list[ResolvedEvidence], set[str]]:
        event_keys = self._event_key_candidates(context, keywords)
        resolved: list[ResolvedEvidence] = []
        seen_refs: set[str] = set()
        covered_refs: set[str] = set()
        for event in self.store.load_ready_events():
            if general_id not in event.get("generalIds", []):
                continue
            event_refs = [str(ref) for ref in event.get("sourceRefs", [])]
            matched_refs = [ref for ref in event_refs if ref in candidate_refs]
            has_context_match = event.get("eventKey") in event_keys
            if not has_context_match and not matched_refs:
                continue
            evidence_ref = matched_refs[0] if matched_refs else (event_refs[0] if event_refs else str(event.get("eventId") or "event"))
            covered_refs.update(matched_refs or event_refs)
            if evidence_ref in seen_refs:
                continue
            seen_refs.add(evidence_ref)
            resolved.append(
                ResolvedEvidence(
                    evidenceRef=evidence_ref,
                    sourceType="romance",
                    sourceQuote=event.get("sourceQuote"),
                    factSummary=event.get("summary"),
                    generalIds=[str(value) for value in event.get("generalIds") or []],
                    confidence=float(event.get("confidence") or 0.0),
                )
            )
            trace.append(f"ready-event:{evidence_ref}")
            if len(resolved) >= INITIAL_ARTIFACT_LIMIT:
                break
        return resolved, covered_refs

    def _event_key_candidates(self, context: Any | None, keywords: list[Any]) -> set[str]:
        candidates = set()
        if context is not None:
            context_key = self._get(context, "contextKey")
            if context_key:
                candidates.add(str(context_key))
        for keyword in keywords:
            if self._get(keyword, "category") != "event":
                continue
            keyword_key = str(self._get(keyword, "keywordKey") or "")
            if keyword_key:
                candidates.add(keyword_key)
                if keyword_key.startswith("event."):
                    candidates.add(keyword_key.removeprefix("event."))
        return candidates

    def _keyword_refs(self, keywords: list[Any]) -> set[str]:
        return {
            str(ref)
            for keyword in keywords
            for ref in (self._get(keyword, "sourceRefs") or [])
            if ref
        }

    def _get(self, value: Any, name: str) -> Any:
        if value is None:
            return None
        if isinstance(value, dict):
            return value.get(name)
        return getattr(value, name, None)
