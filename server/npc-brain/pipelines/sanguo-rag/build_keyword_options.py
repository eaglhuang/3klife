from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, Field


DEFAULT_EVENTS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events.jsonl")
DEFAULT_GENERALS_PATH = Path("assets/resources/data/generals.json")
DEFAULT_MANUAL_ROSTER_PATH = Path("server/npc-brain/pipelines/sanguo-rag/config/manual-roster-seeds.json")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/keyword-options")
DEFAULT_GENERAL_ID = "zhang-fei"
DEFAULT_UI_LABEL_MAX_CHARS = 10
CATEGORY_LABEL_LIMITS = {
    "person": 8,
    "event": 10,
    "location": 8,
    "item": 8,
    "creature": 8,
}
EVENT_LABEL_OVERRIDES = {
    "changban-bridge": "長坂橋斷後",
}
KNOWN_ITEM_KEYWORDS = {
    "矛": "serpent-spear",
    "蛇矛": "serpent-spear",
    "丈八蛇矛": "serpent-spear",
    "橋樑": "bridge-beam",
    "傘蓋": "command-canopy",
    "旌旗": "battle-flags",
}
KNOWN_CREATURE_KEYWORDS = {"馬": "warhorse"}


class KeywordOption(BaseModel):
    keywordKey: str = Field(description="Stable keyword key")
    label: str = Field(description="Display label")
    fullLabel: str | None = Field(default=None, description="Long source label for detail views or tooltips")
    uiLabelMaxChars: int = Field(default=DEFAULT_UI_LABEL_MAX_CHARS, description="Recommended UI display limit")
    category: str = Field(description="person/event/location/item/creature")
    generalIds: list[str] = Field(default_factory=list, description="Related general ids")
    sourceRefs: list[str] = Field(default_factory=list, description="Evidence refs")
    confidence: float = Field(default=0.0, description="Keyword confidence")
    faction: str | None = Field(default=None, description="Faction when applicable")
    retired: bool = Field(default=False, description="Whether this keyword should be hidden from UI")


class KeywordPack(BaseModel):
    generalId: str = Field(description="Owner general id")
    keywordVersion: str = Field(default="general_keywords_v1", description="Keyword pack version")
    generatedAt: str = Field(description="UTC timestamp")
    sourceEventsPath: str = Field(description="Input event candidates path")
    categories: dict[str, list[KeywordOption]] = Field(description="Keyword options by category")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Project deterministic event candidates into E-6 keyword options.")
    parser.add_argument("--events", default=str(DEFAULT_EVENTS_PATH), help="events.jsonl path")
    parser.add_argument("--generals", default=str(DEFAULT_GENERALS_PATH), help="generals.json path")
    parser.add_argument("--manual-roster", default=str(DEFAULT_MANUAL_ROSTER_PATH), help="manual-roster-seeds.json path")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory for keyword packs")
    parser.add_argument("--general-id", default=DEFAULT_GENERAL_ID, help="General id to build keyword options for")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting output files")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_events(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def load_roster_names(generals_path: Path, manual_roster_path: Path) -> dict[str, dict]:
    roster: dict[str, dict] = {}
    if generals_path.exists():
        for entry in read_json(generals_path):
            general_id = entry.get("id")
            if general_id:
                roster[general_id] = {
                    "name": entry.get("name") or general_id,
                    "faction": entry.get("faction"),
                }
    if manual_roster_path.exists():
        payload = read_json(manual_roster_path)
        for entry in payload.get("entries") or []:
            general_id = entry.get("generalId")
            if general_id and general_id not in roster:
                roster[general_id] = {
                    "name": entry.get("name") or general_id,
                    "faction": entry.get("faction"),
                }
    return roster


def ensure_output_root(output_root: Path, general_id: str, overwrite: bool) -> None:
    output_root.mkdir(parents=True, exist_ok=True)
    outputs = [output_root / f"{general_id}.keywords.json", output_root / "keyword-options-summary.md"]
    existing = [path for path in outputs if path.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")


def slugify_label(label: str) -> str:
    if re.fullmatch(r"[a-z0-9-]+", label):
        return label
    return "u" + "-".join(f"{ord(char):x}" for char in label)


def compact_label(label: str, max_chars: int) -> str:
    cleaned = re.sub(r"\s+", "", label.strip())
    if len(cleaned) <= max_chars:
        return cleaned
    return cleaned[: max(max_chars - 1, 1)] + "…"


def build_event_display_label(event: dict) -> tuple[str, str | None, int]:
    event_key = str(event.get("eventKey") or event.get("eventId") or "event")
    full_label = str(event.get("summary") or event_key).strip()
    max_chars = CATEGORY_LABEL_LIMITS["event"]
    if event_key in EVENT_LABEL_OVERRIDES:
        return EVENT_LABEL_OVERRIDES[event_key], full_label, max_chars

    location = str(event.get("location") or "").strip()
    summary = full_label
    if location and ("斷後" in summary or "退走" in summary):
        return compact_label(f"{location}斷後", max_chars), full_label, max_chars
    if location and ("震懾" in summary or "大喝" in summary):
        return compact_label(f"{location}大喝", max_chars), full_label, max_chars

    first_clause = re.split(r"[，。；;,.]", summary, maxsplit=1)[0].strip()
    return compact_label(first_clause or event_key, max_chars), full_label, max_chars


def make_keyword(
    *,
    keyword_key: str,
    label: str,
    category: str,
    general_ids: list[str],
    source_refs: list[str],
    confidence: float,
    faction: str | None = None,
    full_label: str | None = None,
) -> KeywordOption:
    max_chars = CATEGORY_LABEL_LIMITS.get(category, DEFAULT_UI_LABEL_MAX_CHARS)
    display_label = compact_label(label, max_chars)
    return KeywordOption(
        keywordKey=keyword_key,
        label=display_label,
        fullLabel=full_label if full_label and full_label != display_label else None,
        uiLabelMaxChars=max_chars,
        category=category,
        generalIds=general_ids,
        sourceRefs=source_refs,
        confidence=confidence,
        faction=faction,
    )


def add_keyword(bucket: dict[str, dict], keyword: KeywordOption) -> None:
    existing = bucket.get(keyword.keywordKey)
    if existing is None:
        bucket[keyword.keywordKey] = keyword.model_dump()
        return
    existing["sourceRefs"] = sorted(set(existing.get("sourceRefs") or []) | set(keyword.sourceRefs))
    existing["generalIds"] = sorted(set(existing.get("generalIds") or []) | set(keyword.generalIds))
    existing["confidence"] = max(float(existing.get("confidence") or 0), keyword.confidence)
    if keyword.fullLabel and not existing.get("fullLabel"):
        existing["fullLabel"] = keyword.fullLabel
    existing["uiLabelMaxChars"] = min(int(existing.get("uiLabelMaxChars") or DEFAULT_UI_LABEL_MAX_CHARS), keyword.uiLabelMaxChars)


def build_keyword_pack(events: list[dict], roster: dict[str, dict], general_id: str, events_path: Path) -> KeywordPack:
    category_buckets: dict[str, dict[str, dict]] = defaultdict(dict)
    related_events = [
        event
        for event in events
        if general_id in (event.get("generalIds") or [])
        and event.get("reviewStatus", "ready") == "ready"
        and float(event.get("confidence") or 0) >= 0.5
        and not all(str(ref).startswith("fixture.") for ref in (event.get("sourceRefs") or []))
    ]
    for event in related_events:
        source_refs = event.get("sourceRefs") or []
        event_key = event.get("eventKey") or event.get("eventId")
        event_label, event_full_label, _event_max_chars = build_event_display_label(event)
        add_keyword(
            category_buckets["event"],
            make_keyword(
                keyword_key=event_key,
                label=event_label,
                full_label=event_full_label,
                category="event",
                general_ids=event.get("generalIds") or [general_id],
                source_refs=source_refs,
                confidence=min(float(event.get("confidence") or 0), 0.96),
            ),
        )
        location = event.get("location")
        if location:
            add_keyword(
                category_buckets["location"],
                make_keyword(
                    keyword_key=f"{slugify_label(str(location))}-location",
                    label=str(location),
                    category="location",
                    general_ids=event.get("generalIds") or [general_id],
                    source_refs=source_refs,
                    confidence=0.9,
                ),
            )
        for related_general_id in event.get("generalIds") or []:
            if related_general_id == general_id:
                continue
            roster_entry = roster.get(related_general_id, {})
            add_keyword(
                category_buckets["person"],
                make_keyword(
                    keyword_key=related_general_id,
                    label=roster_entry.get("name") or related_general_id,
                    category="person",
                    general_ids=sorted({general_id, related_general_id}),
                    source_refs=source_refs,
                    confidence=0.88,
                    faction=roster_entry.get("faction"),
                ),
            )
        source_quote = str(event.get("sourceQuote") or "")
        for label, keyword_key in KNOWN_ITEM_KEYWORDS.items():
            if label in source_quote:
                add_keyword(
                    category_buckets["item"],
                    make_keyword(
                        keyword_key=keyword_key,
                        label=label,
                        category="item",
                        general_ids=event.get("generalIds") or [general_id],
                        source_refs=source_refs,
                        confidence=0.78,
                    ),
                )
        for label, keyword_key in KNOWN_CREATURE_KEYWORDS.items():
            if label in source_quote:
                add_keyword(
                    category_buckets["creature"],
                    make_keyword(
                        keyword_key=keyword_key,
                        label="戰馬",
                        category="creature",
                        general_ids=event.get("generalIds") or [general_id],
                        source_refs=source_refs,
                        confidence=0.72,
                    ),
                )
    categories = {
        category: [KeywordOption.model_validate(value) for value in sorted(items.values(), key=lambda item: item["keywordKey"])]
        for category, items in category_buckets.items()
    }
    for category in ["person", "event", "location", "item", "creature"]:
        categories.setdefault(category, [])
    return KeywordPack(generalId=general_id, generatedAt=utc_now(), sourceEventsPath=str(events_path), categories=categories)


def render_summary(pack: KeywordPack) -> str:
    lines = [
        "# Keyword Options Summary",
        "",
        f"- Generated At: `{pack.generatedAt}`",
        f"- General ID: `{pack.generalId}`",
        f"- Source Events: `{pack.sourceEventsPath}`",
        "",
        "| Category | Count | Top Keywords |",
        "|---|---:|---|",
    ]
    for category in ["person", "event", "location", "item", "creature"]:
        items = pack.categories.get(category) or []
        top = ", ".join(f"{item.label} (`{item.keywordKey}`)" for item in items[:8]) or "-"
        lines.append(f"| `{category}` | {len(items)} | {top} |")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    events_path = Path(args.events)
    output_root = Path(args.output_root)
    ensure_output_root(output_root, args.general_id, args.overwrite)
    events = load_events(events_path)
    roster = load_roster_names(Path(args.generals), Path(args.manual_roster))
    pack = build_keyword_pack(events, roster, args.general_id, events_path)
    json_path = output_root / f"{args.general_id}.keywords.json"
    summary_path = output_root / "keyword-options-summary.md"
    json_path.write_text(json.dumps(pack.model_dump(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary_path.write_text(render_summary(pack), encoding="utf-8")
    print(f"[build_keyword_options] wrote {json_path}")
    print(f"[build_keyword_options] wrote {summary_path}")
    for category in ["person", "event", "location", "item", "creature"]:
        print(f"[build_keyword_options] {category}={len(pack.categories.get(category) or [])}")


if __name__ == "__main__":
    main()