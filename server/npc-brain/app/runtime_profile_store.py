from __future__ import annotations

import json
from pathlib import Path


class RuntimeProfileStore:
    def __init__(
        self,
        repo_root: Path,
        artifact_root: Path,
        persona_root: Path,
        runtime_profile_root: Path,
        event_root: Path,
    ) -> None:
        self.repo_root = repo_root
        self.artifact_root = self._resolve_path(artifact_root)
        self.persona_root = self._resolve_path(persona_root)
        self.runtime_profile_root = self._resolve_path(runtime_profile_root)
        self.event_root = self._resolve_path(event_root)
        self._ready_events_cache: list[dict] | None = None

    def read_api_fixture(self, filename: str) -> dict:
        return json.loads((self.artifact_root / filename).read_text(encoding="utf-8"))

    def read_optional_api_fixture(self, filename: str) -> dict | None:
        path = self.artifact_root / filename
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def read_runtime_persona(self, general_id: str) -> dict | None:
        return self._read_runtime_json(general_id, "persona")

    def read_runtime_keywords(self, general_id: str) -> dict | None:
        return self._read_runtime_json(general_id, "keywords")

    def read_runtime_relationships(self, general_id: str) -> dict | None:
        return self._read_runtime_json(general_id, "relationships")

    def read_persona_card(self, general_id: str) -> dict | None:
        path = self.persona_root / f"{general_id}.persona.json"
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
        payload = self.read_optional_api_fixture("persona-card.response.json")
        if payload and payload.get("generalId") == general_id:
            return payload
        return None

    def load_ready_events(self) -> list[dict]:
        if self._ready_events_cache is not None:
            return self._ready_events_cache
        path = self.event_root / "events.jsonl"
        if not path.exists():
            self._ready_events_cache = []
            return self._ready_events_cache
        events: list[dict] = []
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            payload = json.loads(line)
            if payload.get("reviewStatus") == "ready":
                events.append(payload)
        self._ready_events_cache = events
        return events

    def list_runtime_general_ids(self) -> list[str]:
        if not self.runtime_profile_root.exists():
            return []
        return sorted(
            path.name
            for path in self.runtime_profile_root.iterdir()
            if path.is_dir() and (path / f"{path.name}.persona.json").exists()
        )

    def _read_runtime_json(self, general_id: str, suffix: str) -> dict | None:
        path = self.runtime_profile_root / general_id / f"{general_id}.{suffix}.json"
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def _resolve_path(self, path: Path) -> Path:
        return path if path.is_absolute() else self.repo_root / path
