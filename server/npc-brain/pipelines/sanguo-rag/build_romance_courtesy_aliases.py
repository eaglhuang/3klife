from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

from repo_layout import pipeline_config_path, resolve_repo_root

REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_GENERALS_PATH = Path("assets/resources/data/generals.json")
DEFAULT_PEOPLE_PATH = Path("assets/resources/data/person-registry.json")
DEFAULT_MANUAL_ROSTER_PATH = pipeline_config_path(REPO_ROOT, "manual-roster-seeds.json")
DEFAULT_OUTPUT_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary/romance-courtesy-aliases.json")
ROMANCE_CHARACTER_LIST_RAW_URL = "https://zh.wikipedia.org/w/index.php?title=%E4%B8%89%E5%9B%BD%E6%BC%94%E4%B9%89%E8%A7%92%E8%89%B2%E5%88%97%E8%A1%A8&action=raw"
DECORATIVE_WRAPPER_CHARS = "【】[]「」『』《》〈〉"
LINK_RE = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]")
HTML_TAG_RE = re.compile(r"<[^>]+>")
REF_RE = re.compile(r"<ref[^>]*>.*?</ref>|<ref[^>]*/>", re.DOTALL)
TEMPLATE_RE = re.compile(r"\{\{[^{}]*\}\}")
PAREN_RE = re.compile(r"[（(][^）)]*[）)]")
BAD_COURTESY_VALUES = {"", "--", "---", "－－", "—", "不詳", "不详", "無", "无", "佚名"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build matched courtesy-name aliases from zh.wikipedia Romance character list.")
    parser.add_argument("--generals", default=str(DEFAULT_GENERALS_PATH), help="Path to assets/resources/data/generals.json")
    parser.add_argument("--people", default=str(DEFAULT_PEOPLE_PATH), help="Path to person-registry.json")
    parser.add_argument("--manual-roster", default=str(DEFAULT_MANUAL_ROSTER_PATH), help="Path to manual-roster-seeds.json")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT_PATH), help="Output JSON path")
    parser.add_argument("--source-url", default=ROMANCE_CHARACTER_LIST_RAW_URL, help="MediaWiki raw URL")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting output")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 3KLife-Copilot/1.0"})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def clean_wikitext(value: str) -> str:
    text = REF_RE.sub("", str(value or ""))
    text = TEMPLATE_RE.sub("", text)
    text = LINK_RE.sub(lambda match: match.group(2) or match.group(1), text)
    text = HTML_TAG_RE.sub("", text)
    text = text.replace("&nbsp;", " ")
    text = re.sub(r"'''?", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip().strip(DECORATIVE_WRAPPER_CHARS).strip()


def normalize_label(value: str) -> str:
    text = clean_wikitext(value)
    text = PAREN_RE.sub("", text)
    text = re.sub(r"[（(].*$", "", text)
    text = re.sub(r"[\s　·•‧・,，、/／:：;；]+", "", text)
    return text.strip().lower()


def unique_preserving_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        cleaned = clean_wikitext(value)
        normalized = normalize_label(cleaned)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        ordered.append(cleaned)
    return ordered


def split_row_cells(line: str) -> list[str]:
    body = line[1:].strip()
    if "||" in body:
        return [cell.strip() for cell in body.split("||")]
    if "!!" in body:
        return [cell.strip() for cell in body.split("!!")]
    return [body]


def parse_wiki_rows(raw_text: str) -> list[dict]:
    rows: list[dict] = []
    current_cells: list[str] = []

    def flush() -> None:
        nonlocal current_cells
        cells = [clean_wikitext(cell) for cell in current_cells]
        current_cells = []
        if len(cells) < 2:
            return
        names = extract_name_candidates(cells[0])
        courtesy_aliases = extract_courtesy_aliases(cells[1])
        if not names or not courtesy_aliases:
            return
        rows.append(
            {
                "wikiName": names[0],
                "nameCandidates": names,
                "courtesyRaw": clean_wikitext(cells[1]),
                "courtesyAliases": courtesy_aliases,
            }
        )

    for raw_line in raw_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line == "|-":
            flush()
            continue
        if line == "|}":
            flush()
            continue
        if line.startswith("!"):
            continue
        if line.startswith("|") and not line.startswith("|-"):
            current_cells.extend(split_row_cells(line))
    flush()
    return rows


def extract_name_candidates(first_cell: str) -> list[str]:
    candidates: list[str] = []
    for target, label in LINK_RE.findall(first_cell):
        candidates.extend([label or target, target])
    if not candidates:
        candidates.append(first_cell)
    expanded: list[str] = []
    for candidate in candidates:
        cleaned = clean_wikitext(candidate)
        if not cleaned:
            continue
        expanded.append(cleaned)
        without_paren = PAREN_RE.sub("", cleaned).strip()
        without_paren = re.sub(r"[（(].*$", "", without_paren).strip()
        if without_paren and without_paren != cleaned:
            expanded.append(without_paren)
        head = re.split(r"[，、/／;；\s]", without_paren, maxsplit=1)[0].strip()
        if head:
            expanded.append(head)
    return unique_preserving_order(expanded)


def extract_courtesy_aliases(courtesy_cell: str) -> list[str]:
    cleaned = clean_wikitext(courtesy_cell)
    if not cleaned or normalize_label(cleaned) in BAD_COURTESY_VALUES:
        return []
    pieces = re.split(r"[，、/／;；\s]+", cleaned)
    aliases: list[str] = []
    for piece in pieces:
        value = clean_wikitext(piece)
        if not value:
            continue
        value = PAREN_RE.sub("", value).strip()
        value = re.sub(r"^(演義字|演义字|史載字|史载字|小字|別名|别名|字)", "", value).strip()
        value = re.sub(r"^(名|號|号)", "", value).strip()
        normalized = normalize_label(value)
        if normalized in BAD_COURTESY_VALUES or len(normalized) < 2:
            continue
        aliases.append(value)
    return unique_preserving_order(aliases)


def add_local_name(index: dict[str, list[dict]], label: str, general_id: str, source: str) -> None:
    normalized = normalize_label(label)
    if not normalized or not general_id:
        return
    bucket = index.setdefault(normalized, [])
    if any(item["generalId"] == general_id for item in bucket):
        return
    bucket.append({"generalId": general_id, "matchedLabel": clean_wikitext(label), "source": source})


def build_local_name_index(generals_path: Path, people_path: Path, manual_roster_path: Path) -> dict[str, list[dict]]:
    index: dict[str, list[dict]] = {}
    if generals_path.exists():
        generals = read_json(generals_path)
        if isinstance(generals, list):
            for general in generals:
                general_id = str(general.get("id") or "").strip()
                add_local_name(index, str(general.get("name") or ""), general_id, "generals-name")
                for alias in general.get("alias") or []:
                    add_local_name(index, str(alias), general_id, "generals-alias")
    if people_path.exists():
        people_payload = read_json(people_path)
        people = people_payload.get("persons") if isinstance(people_payload, dict) else people_payload
        if isinstance(people, list):
            for person in people:
                general_id = str(person.get("uid") or person.get("id") or "").strip()
                add_local_name(index, str(person.get("name") or ""), general_id, "person-registry-name")
                for alias in person.get("alias") or []:
                    add_local_name(index, str(alias), general_id, "person-registry-alias")
    if manual_roster_path.exists():
        manual = read_json(manual_roster_path)
        for entry in manual.get("entries") or []:
            general_id = str(entry.get("generalId") or "").strip()
            add_local_name(index, str(entry.get("name") or ""), general_id, "manual-roster-name")
            for alias in entry.get("alias") or []:
                add_local_name(index, str(alias), general_id, "manual-roster-alias")
    return index


def main() -> None:
    args = parse_args()
    output_path = Path(args.output)
    if output_path.exists() and not args.overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {output_path}")

    raw_text = fetch_text(args.source_url)
    wiki_rows = parse_wiki_rows(raw_text)
    local_index = build_local_name_index(Path(args.generals), Path(args.people), Path(args.manual_roster))

    entries_by_id: dict[str, dict] = {}
    unmatched_rows: list[dict] = []
    for row in wiki_rows:
        matches: list[dict] = []
        for name in row["nameCandidates"]:
            for match in local_index.get(normalize_label(name), []):
                if match not in matches:
                    matches.append(match)
        if not matches:
            unmatched_rows.append(row)
            continue
        for match in matches:
            general_id = match["generalId"]
            entry = entries_by_id.setdefault(
                general_id,
                {
                    "generalId": general_id,
                    "matchedLocalLabels": [],
                    "wikiNames": [],
                    "courtesyAliases": [],
                    "sourceRows": [],
                },
            )
            if match["matchedLabel"] not in entry["matchedLocalLabels"]:
                entry["matchedLocalLabels"].append(match["matchedLabel"])
            if row["wikiName"] not in entry["wikiNames"]:
                entry["wikiNames"].append(row["wikiName"])
            for alias in row["courtesyAliases"]:
                if normalize_label(alias) not in {normalize_label(existing) for existing in entry["courtesyAliases"]}:
                    entry["courtesyAliases"].append(alias)
            entry["sourceRows"].append(
                {
                    "wikiName": row["wikiName"],
                    "courtesyRaw": row["courtesyRaw"],
                    "matchedLocalLabel": match["matchedLabel"],
                    "matchSource": match["source"],
                }
            )

    entries = sorted(entries_by_id.values(), key=lambda item: item["generalId"])
    payload = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "sourceUrl": args.source_url,
        "sourceLicenseNote": "zh.wikipedia page text is available under CC BY-SA 4.0; this artifact stores matched factual courtesy-name aliases for internal review.",
        "generalsPath": str(args.generals),
        "peoplePath": str(args.people),
        "manualRosterPath": str(args.manual_roster),
        "wikiRowsWithCourtesy": len(wiki_rows),
        "matchedGeneralCount": len(entries),
        "matchedAliasCount": sum(len(entry["courtesyAliases"]) for entry in entries),
        "unmatchedRowCount": len(unmatched_rows),
        "entries": entries,
    }
    write_json(output_path, payload)
    print(
        "[build_romance_courtesy_aliases] "
        f"wrote {output_path} matchedGenerals={payload['matchedGeneralCount']} aliases={payload['matchedAliasCount']}"
    )


if __name__ == "__main__":
    main()
