from __future__ import annotations

import os
from pathlib import Path


def resolve_repo_root(anchor_file: str | Path | None = None) -> Path:
    override = (os.environ.get("NPC_REPO_ROOT") or "").strip()
    if override:
        return Path(override).resolve()

    anchor = Path(anchor_file).resolve() if anchor_file else Path.cwd().resolve()
    start = anchor if anchor.is_dir() else anchor.parent
    for candidate in [start, *start.parents]:
        # Monorepo layout: <repo>/server/npc-brain
        if (candidate / "AGENTS.md").exists() and (candidate / "server/npc-brain").exists():
            return candidate
        # Standalone npc-brain layout: <repo>/app + <repo>/pipelines/sanguo-rag
        if (candidate / "app").exists() and (candidate / "pipelines/sanguo-rag").exists():
            return candidate
    raise FileNotFoundError("Could not resolve repo root. Set NPC_REPO_ROOT to override.")


def resolve_npc_brain_root(repo_root: Path) -> Path:
    override = (os.environ.get("NPC_BRAIN_ROOT") or "").strip()
    if override:
        return Path(override).resolve()

    monorepo_root = repo_root / "server/npc-brain"
    if monorepo_root.exists():
        return monorepo_root.resolve()
    return repo_root.resolve()


def pipeline_root(repo_root: Path) -> Path:
    return (resolve_npc_brain_root(repo_root) / "pipelines/sanguo-rag").resolve()


def pipeline_config_path(repo_root: Path, filename: str) -> Path:
    return (pipeline_root(repo_root) / "config" / filename).resolve()

