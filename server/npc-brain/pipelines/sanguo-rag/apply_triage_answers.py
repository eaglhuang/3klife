from __future__ import annotations

import argparse
import json
from pathlib import Path

from repo_layout import pipeline_config_path, resolve_repo_root

REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_ANSWERS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop/unresolved-triage-answers.todo.json")
DEFAULT_DECISIONS_PATH = pipeline_config_path(REPO_ROOT, "unresolved-triage-decisions.json")
DEFAULT_MANUAL_ROSTER_PATH = pipeline_config_path(REPO_ROOT, "manual-roster-seeds.json")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Apply human MCQ answers to Sanguo unresolved triage config files.")
    parser.add_argument("--answers", default=str(DEFAULT_ANSWERS_PATH), help="Filled answer JSON path")
    parser.add_argument("--decisions", default=str(DEFAULT_DECISIONS_PATH), help="Triage decision JSON path")
    parser.add_argument("--manual-roster", default=str(DEFAULT_MANUAL_ROSTER_PATH), help="Manual roster seed JSON path")
    parser.add_argument("--dry-run", action="store_true", help="Print intended changes without writing files")
    return parser.parse_args()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize_alias(value: str) -> str:
    return "".join(str(value).strip().strip("【】[]()（）「」『』《》〈〉").split()).lower()


def append_unique(values: list[str], label: str) -> bool:
    if label in values:
        return False
    values.append(label)
    return True


def append_unique_normalized(values: list[str], label: str) -> bool:
    cleaned = str(label).strip()
    normalized = normalize_alias(cleaned)
    if not cleaned or not normalized:
        return False
    existing = {normalize_alias(value) for value in values if normalize_alias(value)}
    if normalized in existing:
        return False
    values.append(cleaned)
    return True


def normalize_answer(value: str) -> str:
    value = value.strip().upper()
    return {"PERSON": "A", "NOISE": "B", "AMBIGUOUS": "C", "DEFER": "D"}.get(value, value)


def validate_person_record(record: dict, label: str) -> dict:
    general_id = str(record.get("generalId") or "").strip()
    name = str(record.get("name") or label).strip()
    faction = str(record.get("faction") or "").strip()
    if not general_id or not faction:
        raise ValueError(f"person answer for {label} requires personRecord.generalId and personRecord.faction")
    aliases = [str(alias).strip() for alias in list(record.get("alias") or []) if str(alias).strip()]
    append_unique_normalized(aliases, label)
    return {
        "generalId": general_id,
        "name": name,
        "faction": faction,
        "title": str(record.get("title") or f"【{name}】").strip(),
        "alias": aliases,
    }


def merge_person_record(existing: dict, incoming: dict) -> int:
    aliases = existing.setdefault("alias", [])
    merged_aliases = 0
    for alias in incoming.get("alias") or []:
        merged_aliases += int(append_unique_normalized(aliases, alias))

    if not existing.get("name"):
        existing["name"] = incoming.get("name")
    if not existing.get("faction"):
        existing["faction"] = incoming.get("faction")
    if not existing.get("title"):
        existing["title"] = incoming.get("title")
    return merged_aliases


def main() -> None:
    args = parse_args()
    answers_path = Path(args.answers)
    decisions_path = Path(args.decisions)
    manual_roster_path = Path(args.manual_roster)

    answers_doc = read_json(answers_path)
    decisions = read_json(decisions_path)
    manual_roster = read_json(manual_roster_path)

    decisions.setdefault("noiseLabels", [])
    decisions.setdefault("ambiguousLabels", [])
    decisions.setdefault("personLabels", [])

    manual_by_id = {entry["generalId"]: entry for entry in manual_roster.get("entries", [])}
    added_noise = 0
    added_ambiguous = 0
    added_person_labels = 0
    added_roster = 0
    merged_roster_aliases = 0

    for answer in answers_doc.get("answers", []):
        label = str(answer.get("label") or "").strip()
        choice = normalize_answer(str(answer.get("answer") or ""))
        if not label or not choice or choice == "D":
            continue
        if choice == "A":
            added_person_labels += int(append_unique(decisions["personLabels"], label))
            raw_record = answer.get("personRecord") or {}
            if not raw_record.get("generalId") or not raw_record.get("faction"):
                continue
            record = validate_person_record(raw_record, label)
            if record["generalId"] not in manual_by_id:
                manual_roster.setdefault("entries", []).append(record)
                manual_by_id[record["generalId"]] = record
                added_roster += 1
            else:
                merged_roster_aliases += merge_person_record(manual_by_id[record["generalId"]], record)
            continue
        if choice == "B":
            added_noise += int(append_unique(decisions["noiseLabels"], label))
            continue
        if choice == "C":
            added_ambiguous += int(append_unique(decisions["ambiguousLabels"], label))
            continue
        raise ValueError(f"unsupported answer for {label}: {choice}")

    if not args.dry_run:
        write_json(decisions_path, decisions)
        write_json(manual_roster_path, manual_roster)

    print(
        "[apply_triage_answers] "
        f"noise+={added_noise} ambiguous+={added_ambiguous} personLabels+={added_person_labels} roster+={added_roster} "
        f"rosterAliasMerge+={merged_roster_aliases} "
        f"dryRun={bool(args.dry_run)}"
    )


if __name__ == "__main__":
    main()
