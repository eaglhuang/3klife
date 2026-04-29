from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_FORMAL_MAP_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary/formal-mention-map.json")
DEFAULT_OBSERVED_MENTIONS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-mentions.json")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/event-alias-hit-check")
DEFAULT_TARGETS = {
    "許諸": "xu-zhu",
    "孫郎": "sun-ce",
    "曹瞞": "cao-cao",
    "祝融": "zhu-rong-furen",
}
DECORATIVE_WRAPPER_CHARS = "【】[]()（）「」『』《》〈〉"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check whether newly curated aliases are safe for Phase 4b event extraction recall.")
    parser.add_argument("--formal-map", default=str(DEFAULT_FORMAL_MAP_PATH), help="formal-mention-map.json path")
    parser.add_argument("--observed-mentions", default=str(DEFAULT_OBSERVED_MENTIONS_PATH), help="observed-mentions.json path")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory for hit-check reports")
    parser.add_argument(
        "--target",
        action="append",
        default=[],
        help="Target alias mapping in label=generalId form. Defaults to 許諸, 孫郎, 曹瞞, 祝融.",
    )
    parser.add_argument("--max-snippets", type=int, default=5, help="Maximum snippets to keep per target")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting existing output files")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_label(value: str) -> str:
    cleaned = value.strip().strip(DECORATIVE_WRAPPER_CHARS)
    cleaned = re.sub(r"[\s　]+", "", cleaned)
    cleaned = re.sub(r"[·•‧・]", "", cleaned)
    return cleaned.strip().lower()


def parse_targets(raw_targets: list[str]) -> dict[str, str]:
    if not raw_targets:
        return dict(DEFAULT_TARGETS)
    targets: dict[str, str] = {}
    for raw_target in raw_targets:
        if "=" not in raw_target:
            raise ValueError(f"Invalid --target value, expected label=generalId: {raw_target}")
        label, general_id = raw_target.split("=", 1)
        label = label.strip()
        general_id = general_id.strip()
        if not label or not general_id:
            raise ValueError(f"Invalid --target value, expected label=generalId: {raw_target}")
        targets[label] = general_id
    return targets


def ensure_output_root(path: Path, overwrite: bool) -> None:
    path.mkdir(parents=True, exist_ok=True)
    collisions = [path / "event-alias-hit-check.json", path / "event-alias-hit-check.md"]
    existing = [item for item in collisions if item.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")


def load_formal_entries(path: Path) -> dict[str, dict]:
    payload = read_json(path)
    entries = payload.get("entries") or []
    return {entry.get("normalized") or normalize_label(entry.get("alias") or ""): entry for entry in entries}


def load_observed_mentions(path: Path) -> list[dict]:
    payload = read_json(path)
    return payload.get("data") or []


def build_target_report(label: str, expected_general_id: str, formal_entries: dict[str, dict], observed_mentions: list[dict], max_snippets: int) -> dict:
    normalized = normalize_label(label)
    formal_entry = formal_entries.get(normalized)
    formal_general_ids = formal_entry.get("generalIds") if formal_entry else []
    formal_status = formal_entry.get("status") if formal_entry else "missing"
    rows = [row for row in observed_mentions if normalize_label(str(row.get("normalized") or row.get("label") or "")) == normalized]
    resolved_rows = [
        row
        for row in rows
        if row.get("matchStatus") == "resolved" and expected_general_id in (row.get("matchedGeneralIds") or [])
    ]
    bad_rows = [
        row
        for row in rows
        if row.get("matchStatus") != "resolved" or expected_general_id not in (row.get("matchedGeneralIds") or [])
    ]
    chapter_counts = Counter(str(row.get("chapterNo") or "unknown") for row in resolved_rows)
    source_refs = []
    snippets = []
    seen_refs = set()
    for row in resolved_rows:
        source_ref = str(row.get("sourceRef") or "")
        if source_ref and source_ref not in seen_refs:
            seen_refs.add(source_ref)
            source_refs.append(source_ref)
        if len(snippets) < max_snippets:
            snippets.append(
                {
                    "sourceRef": source_ref,
                    "chapterNo": row.get("chapterNo"),
                    "sceneParticipants": row.get("sceneParticipants") or [],
                    "textSnippet": row.get("textSnippet") or "",
                }
            )
    checks = {
        "formalEntryExists": formal_entry is not None,
        "formalMapsExpectedGeneral": expected_general_id in formal_general_ids,
        "formalStatusHighConfidence": formal_status == "high-confidence",
        "hasResolvedObservedMentions": len(resolved_rows) > 0,
        "hasNoBadObservedMentions": len(bad_rows) == 0,
    }
    return {
        "label": label,
        "normalized": normalized,
        "expectedGeneralId": expected_general_id,
        "passed": all(checks.values()),
        "checks": checks,
        "formalMap": {
            "status": formal_status,
            "generalIds": formal_general_ids,
            "aliasSourceByGeneral": formal_entry.get("aliasSourceByGeneral") if formal_entry else {},
            "aliasTypeByGeneral": formal_entry.get("aliasTypeByGeneral") if formal_entry else {},
        },
        "observed": {
            "totalMentionCount": len(rows),
            "resolvedMentionCount": len(resolved_rows),
            "badMentionCount": len(bad_rows),
            "chapterCounts": dict(sorted(chapter_counts.items(), key=lambda item: item[0])),
            "sourceRefs": source_refs[:20],
            "snippets": snippets,
        },
    }


def render_markdown(report: dict) -> str:
    lines = [
        "# Event Alias Hit Check",
        "",
        f"- Generated At: `{report['generatedAt']}`",
        f"- Formal Map: `{report['inputs']['formalMapPath']}`",
        f"- Observed Mentions: `{report['inputs']['observedMentionsPath']}`",
        f"- Overall: `{'PASS' if report['passed'] else 'FAIL'}`",
        "",
        "## Summary",
        "",
        "| Label | Expected General | Result | Mentions | Chapters | Formal Status |",
        "|---|---|---|---:|---|---|",
    ]
    for target in report["targets"]:
        chapters = ", ".join(target["observed"]["chapterCounts"].keys()) or "-"
        lines.append(
            f"| {target['label']} | `{target['expectedGeneralId']}` | `{'PASS' if target['passed'] else 'FAIL'}` | "
            f"{target['observed']['resolvedMentionCount']} | {chapters} | `{target['formalMap']['status']}` |"
        )
    lines.extend(["", "## Details", ""])
    for target in report["targets"]:
        lines.extend(
            [
                f"### {target['label']} -> `{target['expectedGeneralId']}`",
                "",
                f"- Formal generalIds: `{', '.join(target['formalMap']['generalIds'])}`",
                f"- Total mentions: `{target['observed']['totalMentionCount']}`",
                f"- Resolved mentions: `{target['observed']['resolvedMentionCount']}`",
                f"- Bad mentions: `{target['observed']['badMentionCount']}`",
                "",
            ]
        )
        for snippet in target["observed"]["snippets"]:
            participants = ", ".join(snippet["sceneParticipants"][:12])
            lines.extend(
                [
                    f"- `{snippet['sourceRef']}` participants=`{participants}`",
                    f"  - {snippet['textSnippet']}",
                ]
            )
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    args = parse_args()
    formal_map_path = Path(args.formal_map)
    observed_mentions_path = Path(args.observed_mentions)
    output_root = Path(args.output_root)
    ensure_output_root(output_root, args.overwrite)

    targets = parse_targets(args.target)
    formal_entries = load_formal_entries(formal_map_path)
    observed_mentions = load_observed_mentions(observed_mentions_path)
    target_reports = [
        build_target_report(label, expected_general_id, formal_entries, observed_mentions, args.max_snippets)
        for label, expected_general_id in targets.items()
    ]
    report = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "inputs": {
            "formalMapPath": str(formal_map_path),
            "observedMentionsPath": str(observed_mentions_path),
        },
        "passed": all(target["passed"] for target in target_reports),
        "targets": target_reports,
    }

    json_path = output_root / "event-alias-hit-check.json"
    md_path = output_root / "event-alias-hit-check.md"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(render_markdown(report), encoding="utf-8")
    print(f"[check_event_alias_hits] wrote {json_path}")
    print(f"[check_event_alias_hits] wrote {md_path}")
    print(f"[check_event_alias_hits] result={'PASS' if report['passed'] else 'FAIL'} targets={len(target_reports)}")
    if not report["passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()