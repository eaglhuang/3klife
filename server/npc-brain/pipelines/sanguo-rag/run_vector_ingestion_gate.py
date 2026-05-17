from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from repo_layout import resolve_npc_brain_root, resolve_repo_root
from sanguo_governance_loader import SanguoGovernanceError, default_governance_root, load_source_browser_vector_readiness_policy

REPO_ROOT = resolve_repo_root(__file__)
PIPELINE_ROOT = Path(__file__).resolve().parent
SERVER_ROOT = resolve_npc_brain_root(REPO_ROOT)
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from app.llm_dialogue_renderer import load_local_env  # noqa: E402
from app.vector_store import VectorRecord  # noqa: E402


DEFAULT_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl")
DEFAULT_KEYWORD_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/keyword-options")
DEFAULT_PERSONA_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/persona-cards")
DEFAULT_VECTOR_READY_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/vector-ready")
DEFAULT_API_READINESS_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/api-readiness")
DEFAULT_STATE_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/vector-ready/vector-ingestion-state.json")
DEFAULT_CHECK_REPORT_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/api-readiness/vector-backend-check.json")
DEFAULT_GOVERNANCE_ROOT = default_governance_root()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="One-click vector ingestion gate: change detect -> export -> dual upsert -> dual query probe -> readiness report."
    )
    parser.add_argument("--events", default=str(DEFAULT_EVENTS_PATH), help="events JSONL path")
    parser.add_argument("--keyword-root", default=str(DEFAULT_KEYWORD_ROOT), help="keyword pack root")
    parser.add_argument("--persona-root", default=str(DEFAULT_PERSONA_ROOT), help="persona card root")
    parser.add_argument("--vector-ready-root", default=str(DEFAULT_VECTOR_READY_ROOT), help="vector-ready output root")
    parser.add_argument("--api-readiness-root", default=str(DEFAULT_API_READINESS_ROOT), help="api readiness output root")
    parser.add_argument("--state-path", default=str(DEFAULT_STATE_PATH), help="state file path for change detection")
    parser.add_argument("--check-report-path", default=str(DEFAULT_CHECK_REPORT_PATH), help="vector check report output JSON path")
    parser.add_argument("--providers", default="pinecone,qdrant", help="comma separated provider list, e.g. pinecone,qdrant")
    parser.add_argument("--embedding-provider", default="mock", help="embedding provider for upsert/probe")
    parser.add_argument("--limit", type=int, default=20, help="max record count per namespace for smoke upsert")
    parser.add_argument("--top-k", type=int, default=5, help="top-k for probe query")
    parser.add_argument("--general-id", default="zhang-fei", help="general id used for readiness fixture assembly")
    parser.add_argument("--keyword-pack", default="", help="explicit keyword pack path for readiness (optional)")
    parser.add_argument("--persona-card", default="", help="explicit persona card path for readiness (optional)")
    parser.add_argument("--force-ingestion", action="store_true", help="force export + upsert even when inputs did not change")
    parser.add_argument("--skip-readiness", action="store_true", help="skip build_api_readiness_index")
    parser.add_argument("--governance-root", default=str(DEFAULT_GOVERNANCE_ROOT), help="Sanguo governance root")
    parser.add_argument("--source-browser-vector-policy", default=None, help="Override policy-source-browser-vector-readiness.json path")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def resolve_path(path_text: str | Path) -> Path:
    raw = Path(path_text)
    if raw.is_absolute():
        return raw.resolve()
    return (REPO_ROOT / raw).resolve()


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def _hash_file(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as fh:
        while True:
            chunk = fh.read(1024 * 1024)
            if not chunk:
                break
            hasher.update(chunk)
    return hasher.hexdigest()


def fingerprint_inputs(events_path: Path, keyword_root: Path, persona_root: Path) -> dict:
    if not events_path.exists():
        raise FileNotFoundError(f"events file not found: {events_path}")
    if not keyword_root.exists():
        raise FileNotFoundError(f"keyword root not found: {keyword_root}")
    if not persona_root.exists():
        raise FileNotFoundError(f"persona root not found: {persona_root}")

    files: list[Path] = [events_path]
    files.extend(sorted(path for path in keyword_root.glob("*.keywords.json") if path.is_file()))
    files.extend(sorted(path for path in persona_root.glob("*.persona.json") if path.is_file()))

    hasher = hashlib.sha256()
    manifest = []
    for path in files:
        digest = _hash_file(path)
        rel = repo_relative(path)
        size = path.stat().st_size
        hasher.update(rel.encode("utf-8"))
        hasher.update(digest.encode("utf-8"))
        manifest.append({"path": rel, "size": size, "sha256": digest})

    return {
        "fingerprint": hasher.hexdigest(),
        "fileCount": len(files),
        "files": manifest,
    }


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def safe_print(text: str) -> None:
    encoding = getattr(sys.stdout, "encoding", None) or "utf-8"
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode(encoding, errors="replace").decode(encoding, errors="replace"))


def format_cmd(cmd: list[str], max_arg_chars: int = 96) -> str:
    rendered = []
    for arg in cmd:
        text = str(arg).replace("\r", "\\r").replace("\n", "\\n")
        if len(text) > max_arg_chars:
            text = text[: max_arg_chars - 3] + "..."
        rendered.append(text)
    return " ".join(rendered)


def run_python(script_path: Path, args: list[str], echo_output: bool = True) -> str:
    cmd = [sys.executable, str(script_path), *args]
    safe_print(f"[vector-ingestion-gate] run: {format_cmd(cmd)}")
    env = dict(os.environ)
    env.setdefault("PYTHONIOENCODING", "utf-8")
    result = subprocess.run(
        cmd,
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )
    if result.returncode != 0:
        if result.stdout.strip():
            safe_print(result.stdout.strip())
        if result.stderr.strip():
            safe_print(result.stderr.strip())
        raise subprocess.CalledProcessError(
            result.returncode,
            cmd,
            output=result.stdout,
            stderr=result.stderr,
        )
    if echo_output and result.stdout.strip():
        safe_print(result.stdout.strip())
    if echo_output and result.stderr.strip():
        safe_print(result.stderr.strip())
    return result.stdout


def pick_probe_record(vector_ready_root: Path) -> VectorRecord:
    facts_path = vector_ready_root / "vector-records.facts.jsonl"
    if not facts_path.exists():
        raise FileNotFoundError(f"missing facts file: {facts_path}")
    lines = [line for line in facts_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not lines:
        raise RuntimeError(f"facts file is empty: {facts_path}")
    return VectorRecord.from_payload(json.loads(lines[0]))


def run_query_probe(provider: str, namespace: str, record_id: str, query_text: str, top_k: int, embedding_provider: str) -> dict:
    stdout = run_python(
        PIPELINE_ROOT / "query_pinecone_records.py",
        [
            "--provider",
            provider,
            "--namespace",
            namespace,
            "--query-text",
            query_text,
            "--embedding-provider",
            embedding_provider,
            "--top-k",
            str(top_k),
            "--expected-id",
            record_id,
            "--metadata-filter",
            json.dumps({"recordType": "event"}, ensure_ascii=False),
        ],
        echo_output=False,
    )
    payload = json.loads(stdout)
    ids = [str(item.get("id") or "") for item in payload.get("matches") or []]
    return {
        "containsExpected": record_id in ids,
        "matchCount": len(ids),
        "topIds": ids[:3],
    }


def main() -> None:
    args = parse_args()
    try:
        load_source_browser_vector_readiness_policy(
            args.governance_root,
            source_browser_vector_policy=args.source_browser_vector_policy,
        )
    except SanguoGovernanceError as exc:
        print(f"[run_vector_ingestion_gate] governance error: {exc}")
        raise SystemExit(2) from None
    load_local_env(REPO_ROOT)

    events_path = resolve_path(args.events)
    keyword_root = resolve_path(args.keyword_root)
    persona_root = resolve_path(args.persona_root)
    vector_ready_root = resolve_path(args.vector_ready_root)
    api_readiness_root = resolve_path(args.api_readiness_root)
    state_path = resolve_path(args.state_path)
    check_report_path = resolve_path(args.check_report_path)
    providers = [item.strip().lower() for item in args.providers.split(",") if item.strip()]
    if not providers:
        raise SystemExit("providers cannot be empty")

    input_state = fingerprint_inputs(events_path, keyword_root, persona_root)
    previous_state = read_json(state_path) if state_path.exists() else {}
    previous_fingerprint = str(previous_state.get("inputFingerprint") or "")
    changed = args.force_ingestion or (input_state["fingerprint"] != previous_fingerprint)

    if changed:
        run_python(
            PIPELINE_ROOT / "export_vector_records.py",
            [
                "--events",
                str(events_path),
                "--keyword-root",
                str(keyword_root),
                "--persona-root",
                str(persona_root),
                "--output-root",
                str(vector_ready_root),
                "--overwrite",
            ],
        )

        for provider in providers:
            upsert_args = [
                "--provider",
                provider,
                "--records-root",
                str(vector_ready_root),
                "--embedding-provider",
                args.embedding_provider,
            ]
            if args.limit > 0:
                upsert_args.extend(["--limit", str(args.limit)])
            run_python(PIPELINE_ROOT / "upsert_pinecone_records.py", upsert_args)
    else:
        print("[vector-ingestion-gate] inputs unchanged; skip export + upsert.")

    probe_record = pick_probe_record(vector_ready_root)
    provider_results: dict[str, dict] = {}
    for provider in providers:
        provider_results[provider] = run_query_probe(
            provider=provider,
            namespace=probe_record.namespace,
            record_id=probe_record.id,
            query_text=probe_record.text,
            top_k=args.top_k,
            embedding_provider=args.embedding_provider,
        )

    status = "pass" if all(result.get("containsExpected") for result in provider_results.values()) else "fail"
    check_report = {
        "status": status,
        "generatedAt": utc_now(),
        "changed": bool(changed),
        "expectedRecordId": probe_record.id,
        "namespace": probe_record.namespace,
        "providers": provider_results,
    }
    write_json(check_report_path, check_report)

    if not args.skip_readiness:
        keyword_pack = resolve_path(args.keyword_pack) if args.keyword_pack else keyword_root / f"{args.general_id}.keywords.json"
        persona_card = resolve_path(args.persona_card) if args.persona_card else persona_root / f"{args.general_id}.persona.json"
        run_python(
            PIPELINE_ROOT / "build_api_readiness_index.py",
            [
                "--events",
                str(events_path),
                "--keyword-pack",
                str(keyword_pack),
                "--persona-card",
                str(persona_card),
                "--output-root",
                str(api_readiness_root),
                "--general-id",
                args.general_id,
                "--vector-check-report",
                str(check_report_path),
                "--overwrite",
            ],
        )

    new_state = {
        "updatedAt": utc_now(),
        "inputFingerprint": input_state["fingerprint"],
        "inputFileCount": input_state["fileCount"],
        "lastRunChanged": bool(changed),
        "lastCheckStatus": status,
        "providers": providers,
        "vectorReadyRoot": repo_relative(vector_ready_root),
        "apiReadinessRoot": repo_relative(api_readiness_root),
    }
    write_json(state_path, new_state)
    print(
        f"[vector-ingestion-gate] status={status} changed={changed} "
        f"report={repo_relative(check_report_path)} state={repo_relative(state_path)}"
    )
    if status != "pass":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
