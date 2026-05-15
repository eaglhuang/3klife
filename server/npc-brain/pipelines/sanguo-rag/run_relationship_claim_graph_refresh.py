from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

def resolve_workspace_root(anchor_file: str | Path) -> Path:
    anchor = Path(anchor_file).resolve()
    start = anchor if anchor.is_dir() else anchor.parent
    for candidate in [start, *start.parents]:
        if (candidate / "AGENTS.md").exists() and (candidate / "server/npc-brain").exists():
            return candidate
    raise FileNotFoundError("Could not resolve workspace root")


REPO_ROOT = resolve_workspace_root(__file__)
PIPELINE_ROOT = Path(__file__).resolve().parent
DEFAULT_RUNTIME_PROFILE_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/runtime-general-profiles")
DEFAULT_LOCK_PATH = Path("artifacts/data-pipeline/sanguo-rag/.locks/relationship-claim-graph-refresh.lock")
DEFAULT_REPORT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/relationship-claim-graph")
DEFAULT_GENERAL_IDS = [
    "cao-cao",
    "guan-yu",
    "liu-bei",
    "lu-bu",
    "sun-quan",
    "wei-yan",
    "yuan-shao",
    "zhang-fei",
    "zhao-yun",
    "zhuge-liang",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Refresh relationship claim graph, stable bootstrap, and runtime profiles under a repo-local lock.")
    parser.add_argument("--scope", choices=["core10", "runtime-existing", "all-generals"], default="runtime-existing")
    parser.add_argument("--general-id", action="append", default=[])
    parser.add_argument("--runtime-profile-root", default=str(DEFAULT_RUNTIME_PROFILE_ROOT))
    parser.add_argument("--lock-path", default=str(DEFAULT_LOCK_PATH))
    parser.add_argument("--report-root", default=str(DEFAULT_REPORT_ROOT))
    parser.add_argument("--step-timeout-seconds", type=int, default=60)
    parser.add_argument("--export-timeout-seconds", type=int, default=15)
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--skip-readiness", action="store_true")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def resolve_path(path_text: str | Path) -> Path:
    path = Path(path_text)
    if path.is_absolute():
        return path
    return (REPO_ROOT / path).resolve()


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def read_json(path: Path) -> Any:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def pid_exists(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


class PipelineLock:
    def __init__(self, path: Path, *, stale_seconds: int = 6 * 60 * 60) -> None:
        self.path = path
        self.stale_seconds = stale_seconds
        self.acquired = False

    def __enter__(self) -> "PipelineLock":
        self.path.parent.mkdir(parents=True, exist_ok=True)
        now = time.time()
        if self.path.exists():
            payload = read_json(self.path)
            pid = int(payload.get("pid") or 0) if isinstance(payload, dict) else 0
            created_at = float(payload.get("createdEpoch") or 0) if isinstance(payload, dict) else 0.0
            is_stale = created_at <= 0 or now - created_at > self.stale_seconds
            if pid_exists(pid) and not is_stale:
                raise RuntimeError(f"pipeline lock is active: {repo_relative(self.path)} pid={pid}")
            try:
                self.path.unlink()
            except FileNotFoundError:
                pass

        payload = {
            "pid": os.getpid(),
            "createdAt": utc_now(),
            "createdEpoch": now,
            "cwd": str(REPO_ROOT),
            "argv": sys.argv,
        }
        flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY
        fd = os.open(str(self.path), flags)
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
        self.acquired = True
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        if self.acquired:
            try:
                self.path.unlink()
            except FileNotFoundError:
                pass
            self.acquired = False


def run_step(name: str, cmd: list[str], *, timeout_seconds: int) -> dict[str, Any]:
    started = utc_now()
    start_time = time.time()
    proc = subprocess.run(
        cmd,
        cwd=str(REPO_ROOT),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=max(timeout_seconds, 1),
        check=False,
    )
    elapsed = round(time.time() - start_time, 3)
    row = {
        "name": name,
        "startedAt": started,
        "elapsedSeconds": elapsed,
        "returnCode": proc.returncode,
        "cmd": cmd,
        "stdoutTail": proc.stdout[-4000:],
        "stderrTail": proc.stderr[-4000:],
    }
    if proc.returncode != 0:
        raise RuntimeError(f"{name} failed rc={proc.returncode}\n{proc.stderr[-1200:]}")
    return row


def runtime_existing_ids(runtime_root: Path) -> list[str]:
    if not runtime_root.exists():
        return []
    return sorted(path.name for path in runtime_root.iterdir() if path.is_dir())


def all_general_ids() -> list[str]:
    payload = read_json(REPO_ROOT / "assets/resources/data/generals.json")
    if not isinstance(payload, list):
        return []
    return sorted(str(row.get("id") or row.get("generalId") or "").strip() for row in payload if isinstance(row, dict) and str(row.get("id") or row.get("generalId") or "").strip())


def selected_general_ids(args: argparse.Namespace) -> list[str]:
    if args.general_id:
        return sorted(dict.fromkeys(str(item).strip() for item in args.general_id if str(item).strip()))
    if args.scope == "core10":
        return list(DEFAULT_GENERAL_IDS)
    if args.scope == "all-generals":
        return all_general_ids()
    return runtime_existing_ids(resolve_path(args.runtime_profile_root))


def render_report(payload: dict[str, Any]) -> str:
    lines = [
        "# Relationship Claim Graph Refresh",
        "",
        f"- Generated At: `{payload['generatedAt']}`",
        f"- Scope: `{payload['scope']}`",
        f"- General Count: `{payload['generalCount']}`",
        f"- Failed: `{payload['failed']}`",
        "",
        "## Steps",
        "",
    ]
    for step in payload["steps"]:
        lines.append(f"- `{step['name']}` rc=`{step.get('returnCode')}` elapsed=`{step.get('elapsedSeconds')}`")
    if payload["errors"]:
        lines.extend(["", "## Errors", ""])
        for error in payload["errors"]:
            lines.append(f"- `{error}`")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    report_root = resolve_path(args.report_root)
    report_root.mkdir(parents=True, exist_ok=True)
    lock_path = resolve_path(args.lock_path)
    general_ids = selected_general_ids(args)
    if not general_ids:
        raise RuntimeError("no general ids selected")

    steps: list[dict[str, Any]] = []
    errors: list[str] = []
    with PipelineLock(lock_path):
        try:
            common = [sys.executable]
            overwrite = ["--overwrite"] if args.overwrite else []
            a_history_claims_path = report_root / "a-history-relationship-claims.jsonl"
            steps.append(
                run_step(
                    "build-relationship-claim-graph",
                    [
                        *common,
                        str(PIPELINE_ROOT / "build_relationship_claim_graph.py"),
                        *overwrite,
                    ],
                    timeout_seconds=args.step_timeout_seconds,
                )
            )
            steps.append(
                run_step(
                    "build-stable-knowledge-bootstrap",
                    [
                        *common,
                        str(PIPELINE_ROOT / "build_stable_knowledge_bootstrap.py"),
                        "--relationship-claim-graph",
                        str(a_history_claims_path),
                        *overwrite,
                    ],
                    timeout_seconds=args.step_timeout_seconds,
                )
            )
            for general_id in general_ids:
                steps.append(
                    run_step(
                        f"export-runtime:{general_id}",
                        [
                            *common,
                            str(PIPELINE_ROOT / "export_general_runtime_profile.py"),
                            "--general-id",
                            general_id,
                            *overwrite,
                        ],
                        timeout_seconds=args.export_timeout_seconds,
                    )
                )

            if not args.skip_readiness:
                ids_path = report_root / "relationship-claim-refresh-general-ids.txt"
                ids_path.write_text("\n".join(general_ids) + "\n", encoding="utf-8")
                steps.append(
                    run_step(
                        "build-runtime-readiness-matrix",
                        [
                            *common,
                            str(PIPELINE_ROOT / "build_runtime_readiness_matrix.py"),
                            "--general-id-file",
                            str(ids_path),
                            *overwrite,
                        ],
                        timeout_seconds=max(args.step_timeout_seconds, 90),
                    )
                )
        except subprocess.TimeoutExpired as exc:
            errors.append(f"timeout:{exc.cmd}: {exc.timeout}s")
        except Exception as exc:
            errors.append(str(exc))

    payload = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "scope": args.scope,
        "generalIds": general_ids,
        "generalCount": len(general_ids),
        "failed": bool(errors),
        "errors": errors,
        "steps": steps,
    }
    write_json(report_root / "relationship-claim-refresh-report.json", payload)
    (report_root / "relationship-claim-refresh-report.md").write_text(render_report(payload), encoding="utf-8")
    if errors:
        for error in errors:
            print(f"[run_relationship_claim_graph_refresh] error: {error}")
        return 1
    print(
        "[run_relationship_claim_graph_refresh] "
        f"completed scope={args.scope} generals={len(general_ids)} report={report_root / 'relationship-claim-refresh-report.json'}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
