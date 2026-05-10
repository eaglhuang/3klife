from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse

from extract_harvested_page_evidence_seeds import to_simplified_hint, to_traditional_hint


REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_PAGES_JSONL = Path("local/codex-smoke/knowledge-growth/tmp-wikisource-sanguozhi-sample/pages.jsonl")
DEFAULT_SOURCE_CONFIG = Path("server/npc-brain/pipelines/sanguo-rag/config/external-evidence-sources.json")
DEFAULT_ALIAS_MAP = Path("artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary/formal-mention-map.json")
DEFAULT_SCOREBOARD_JSON = Path(
    "local/codex-smoke/knowledge-growth/full-roster-highway-wang-yi-female-fix-r1/"
    "full-roster-highway-wang-yi-female-fix-r1-r1/scoreboard/full-roster-scoreboard.json"
)
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth/generic-passage-seeds-r1")

SOURCE_CLASSES = {"primary-text-site", "community-worldbuilding-site"}

TITLE_KEYWORDS = (
    "字",
    "號",
    "官至",
    "官拜",
    "封",
    "拜",
    "任",
    "太守",
    "刺史",
    "州牧",
    "將軍",
    "校尉",
    "侯",
    "王",
    "帝",
    "后",
    "皇后",
    "貴人",
)

RELATIONSHIP_KEYWORDS = (
    "父",
    "母",
    "妻",
    "妾",
    "嫁",
    "娶",
    "子",
    "女",
    "兄",
    "弟",
    "姊",
    "妹",
    "族",
    "從妹",
    "從子",
    "從弟",
    "之女",
    "之子",
    "部下",
    "麾下",
)

EVENT_KEYWORDS = (
    "攻",
    "擊",
    "討",
    "戰",
    "伐",
    "殺",
    "降",
    "守",
    "迎",
    "屯",
    "據",
    "奔",
    "叛",
    "反",
    "卒",
    "死",
    "敗",
    "破",
    "擒",
    "即位",
    "稱帝",
    "入朝",
    "起兵",
    "遷",
    "徙",
)

TRAIT_KEYWORDS = (
    "為人",
    "性",
    "姿貌",
    "容貌",
    "身長",
    "溫厚",
    "偉壯",
    "仁厚",
    "多疑",
    "驍勇",
    "勇",
    "智",
    "機敏",
    "剛愎",
    "果毅",
    "過目不忘",
    "善",
    "好",
    "長於",
)

WORLDBUILDING_KEYWORDS = (
    "演義",
    "傳說",
    "民間",
    "小說",
    "戲曲",
    "野史",
    "後人",
    "常被",
    "一說",
    "形象",
    "設定",
    "虛構",
)

TAIL_TRIM_MARKERS = ("Cookie", "Copyright", "ICP")
NOISE_MARKERS = (
    "維基文庫",
    "维基文库",
    "自由的圖書館",
    "自由的图书馆",
    "主菜單",
    "主菜单",
    "跳轉到內容",
    "跳转到内容",
    "移至側欄",
    "移至侧栏",
    "隨機作品",
    "随机作品",
    "創建賬號",
    "创建账号",
    "登入",
    "登录",
    "查看歷史",
    "查看历史",
    "頁面信息",
    "页面信息",
    "三國演義電子辭典",
    "投票總數",
    "总票数",
    "熱門人物",
    "热点人物",
)

CJK_NAME_RE = re.compile(r"^[\u4e00-\u9fff]{2,12}$")
HEADING_RE = re.compile(r"([\u4e00-\u9fff]{2,12})\s*\[\s*(?:编辑|編輯)\s*\]")
SPLIT_RE = re.compile(r"[。！？；?!;\n\r]+")
SPACE_RE = re.compile(r"\s+")
YEAR_HINT_RE = re.compile(r"\d{3,4}|建安|初平|興平|黃初|太和|延熙|景元|太康")


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def resolve_path(path_text: str | Path) -> Path:
    path = Path(path_text)
    return path if path.is_absolute() else (REPO_ROOT / path).resolve()


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def iter_jsonl(path: Path) -> Iterable[dict[str, Any]]:
    for line_number, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        text = line.strip()
        if not text:
            continue
        try:
            value = json.loads(text)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSONL at {repo_relative(path)}:{line_number}: {exc}") from exc
        if isinstance(value, dict):
            yield value


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
            count += 1
    return count


def normalize_text(text: str) -> str:
    value = (
        str(text or "")
        .replace("&nbsp;", " ")
        .replace("&mdash;", "—")
        .replace("&ldquo;", '"')
        .replace("&rdquo;", '"')
        .replace("&hellip;", "…")
        .replace("&amp;", "&")
    )
    value = SPACE_RE.sub(" ", value)
    return value.strip()


def stable_hash(*parts: Any, length: int = 20) -> str:
    digest = sha256("\n".join(str(part or "") for part in parts).encode("utf-8")).hexdigest()
    return digest[:length]


def page_slug(url: str) -> str:
    return Path(urlparse(url).path).stem.lower()


def load_source_policy(path: Path, source_id: str) -> dict[str, Any]:
    payload = read_json(path)
    rows = payload.get("sources") if isinstance(payload, dict) else []
    for row in rows:
        if isinstance(row, dict) and str(row.get("sourceId") or "").strip() == source_id:
            return row
    raise ValueError(f"sourceId not found in source config: {source_id}")


def load_scoreboard_rows(path: Path) -> list[dict[str, Any]]:
    payload = read_json(path)
    rows = payload.get("rows") if isinstance(payload, dict) else []
    return [row for row in rows if isinstance(row, dict)]


def add_alias(index: dict[str, str | None], alias: str, general_id: str) -> None:
    candidates = {
        normalize_text(alias),
        normalize_text(to_simplified_hint(alias)),
        normalize_text(to_traditional_hint(alias)),
    }
    for text in candidates:
        if not text or not CJK_NAME_RE.fullmatch(text):
            continue
        existing = index.get(text)
        if existing is None and text in index:
            continue
        if existing and existing != general_id:
            index[text] = None
            continue
        index[text] = general_id


def build_alias_index(alias_map_path: Path, scoreboard_rows: list[dict[str, Any]]) -> dict[str, str]:
    index: dict[str, str | None] = {}
    alias_payload = read_json(alias_map_path)
    entries = alias_payload.get("entries") if isinstance(alias_payload, dict) else []
    for row in entries:
        if not isinstance(row, dict):
            continue
        if str(row.get("status") or "") != "high-confidence":
            continue
        general_ids = row.get("generalIds") or []
        if not isinstance(general_ids, list) or len(general_ids) != 1:
            continue
        add_alias(index, str(row.get("alias") or ""), str(general_ids[0]))
    for row in scoreboard_rows:
        general_id = str(row.get("generalId") or "").strip()
        if not general_id:
            continue
        for key in ("displayName", "name"):
            add_alias(index, str(row.get(key) or ""), general_id)
        aliases = row.get("aliases") or []
        if isinstance(aliases, list):
            for alias in aliases:
                add_alias(index, str(alias or ""), general_id)
    return {alias: general_id for alias, general_id in index.items() if general_id}


def build_alias_first_char_map(alias_index: dict[str, str]) -> dict[str, list[tuple[str, str]]]:
    buckets: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for alias, general_id in alias_index.items():
        buckets[alias[0]].append((alias, general_id))
    for key in list(buckets):
        buckets[key].sort(key=lambda item: (-len(item[0]), item[0]))
    return dict(buckets)


def read_page_text(page: dict[str, Any]) -> str:
    text_path_value = str(page.get("textPath") or "").strip()
    if text_path_value:
        text_path = resolve_path(text_path_value)
        if text_path.exists():
            raw = text_path.read_text(encoding="utf-8-sig", errors="ignore")
            if "\n\n" in raw:
                raw = raw.split("\n\n", 1)[1]
            return raw
    return str(page.get("snippet") or "")


def trim_tail_noise(text: str, min_index: int = 800) -> str:
    value = text
    for marker in TAIL_TRIM_MARKERS:
        index = value.find(marker)
        if index >= min_index:
            value = value[:index]
    return value


def trim_wikisource_preamble(text: str) -> str:
    heading_match = HEADING_RE.search(text)
    if heading_match and heading_match.start() > 200:
        return text[heading_match.start() :]
    fallback_markers = ("姊妹计划", "姐妹计划", "數據項目", "数据项目")
    best_index = -1
    for marker in fallback_markers:
        index = text.find(marker)
        if index >= 0:
            best_index = max(best_index, index)
    if best_index >= 0 and best_index + 4 < len(text):
        return text[best_index + 4 :]
    return text


def clean_page_text(text: str, source_policy: dict[str, Any]) -> str:
    value = normalize_text(text)
    value = trim_tail_noise(value)
    source_id = str(source_policy.get("sourceId") or "")
    if source_id.startswith("wikisource-"):
        value = trim_wikisource_preamble(value)
    return normalize_text(value)


def split_long_segment(text: str, chunk_size: int = 120, overlap: int = 24) -> list[str]:
    if len(text) <= chunk_size:
        return [text]
    if " " in text:
        words = [word for word in text.split(" ") if word]
        chunks: list[str] = []
        current = ""
        for word in words:
            candidate = f"{current} {word}".strip()
            if current and len(candidate) > chunk_size:
                chunks.append(current)
                current = word
            else:
                current = candidate
        if current:
            chunks.append(current)
        return [chunk for chunk in chunks if chunk]
    chunks = []
    step = max(24, chunk_size - overlap)
    for start in range(0, len(text), step):
        chunk = text[start : start + chunk_size]
        if len(chunk) >= 24:
            chunks.append(chunk)
        if start + chunk_size >= len(text):
            break
    return chunks


def title_sentence(page: dict[str, Any]) -> str:
    title = normalize_text(str(page.get("title") or ""))
    return re.sub(r"\s*-\s*[^-]+$", "", title).strip()


def page_subject_name(page: dict[str, Any]) -> str:
    title = title_sentence(page)
    subject = title.split(" ")[0].strip()
    return subject if CJK_NAME_RE.fullmatch(subject) else ""


def match_mentions(text: str, alias_buckets: dict[str, list[tuple[str, str]]]) -> list[tuple[str, str]]:
    found: dict[str, str] = {}
    for char in set(text):
        bucket = alias_buckets.get(char)
        if not bucket:
            continue
        for alias, general_id in bucket:
            if alias in text and (general_id not in found or len(alias) > len(found[general_id])):
                found[general_id] = alias
    rows = [(alias, general_id) for general_id, alias in found.items()]
    rows.sort(key=lambda item: (-len(item[0]), item[0]))
    return rows


def infer_angle(text: str, mention_count: int, source_class: str) -> str:
    if mention_count >= 2 and any(keyword in text for keyword in RELATIONSHIP_KEYWORDS):
        return "relationship"
    if any(keyword in text for keyword in TITLE_KEYWORDS):
        return "title"
    if any(keyword in text for keyword in TRAIT_KEYWORDS):
        return "trait"
    if source_class == "community-worldbuilding-site" and any(keyword in text for keyword in WORLDBUILDING_KEYWORDS):
        return "worldbuilding_note"
    if any(keyword in text for keyword in EVENT_KEYWORDS):
        return "event"
    if source_class == "primary-text-site":
        return "event"
    return "worldbuilding_note"


def build_seed(
    *,
    source_policy: dict[str, Any],
    page: dict[str, Any],
    general_id: str | None,
    candidate_person_id: str | None,
    matched_name: str,
    angle_type: str,
    quote: str,
    locator_suffix: str,
    sentence_index: int | None,
    content_source: str,
) -> dict[str, Any]:
    locator = f"slug={page_slug(str(page.get('url') or ''))};field={locator_suffix}"
    if sentence_index is not None:
        locator += f";sentence={sentence_index}"
    person_id = general_id or candidate_person_id or ""
    seed_id = stable_hash(source_policy.get("sourceId"), person_id, angle_type, quote, locator)
    row: dict[str, Any] = {
        "version": "3.0.0",
        "seedId": f"seed:{source_policy['sourceId']}:{person_id}:{angle_type}:{seed_id}",
        "sourceId": source_policy["sourceId"],
        "sourceFamily": source_policy.get("sourceFamily"),
        "sourceLayer": source_policy.get("sourceLayer"),
        "trustTier": source_policy.get("trustTier"),
        "sourceUrl": page.get("url"),
        "pageTitle": page.get("title"),
        "matchedName": matched_name,
        "angleType": angle_type,
        "seedText": quote,
        "quote": quote,
        "locator": locator,
        "textHash": page.get("textHash"),
        "hasQuote": True,
        "hasLocator": True,
        "hasTime": bool(YEAR_HINT_RE.search(quote)),
        "hasLocation": False,
        "extractionMethod": "deterministic",
        "sourceLiveStatus": page.get("liveStatus"),
        "contentSource": content_source,
        "seedConfidenceScore": 0.0,
        "siteReliabilityMultiplier": 1.0,
        "crossSiteMatchCount": 0,
        "promotionTarget": "seed-only",
        "canonicalWrites": False,
    }
    if general_id:
        row["generalId"] = general_id
    elif candidate_person_id:
        row["candidatePersonId"] = candidate_person_id
    return row


def build_identity_seeds(
    source_policy: dict[str, Any],
    page: dict[str, Any],
    alias_buckets: dict[str, list[tuple[str, str]]],
) -> list[dict[str, Any]]:
    title = title_sentence(page)
    subject_name = page_subject_name(page)
    mentions = match_mentions(title, alias_buckets)
    if len(mentions) == 1:
        matched_name, general_id = mentions[0]
        candidate_person_id = None
    elif subject_name:
        matched_name = subject_name
        general_id = None
        candidate_person_id = f"shadow:{source_policy['sourceId']}:{page_slug(str(page.get('url') or ''))}"
    else:
        return []
    return [
        build_seed(
            source_policy=source_policy,
            page=page,
            general_id=general_id,
            candidate_person_id=candidate_person_id,
            matched_name=matched_name,
            angle_type="identity",
            quote=title,
            locator_suffix="title-identity",
            sentence_index=None,
            content_source="title",
        )
    ]


def build_sections(source_policy: dict[str, Any], page: dict[str, Any], source_class: str) -> list[tuple[str | None, str]]:
    body = clean_page_text(read_page_text(page), source_policy)
    sections: list[tuple[str | None, str]] = []
    if source_class == "primary-text-site":
        matches = list(HEADING_RE.finditer(body))
        for index, match in enumerate(matches):
            start = match.end()
            end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
            name = normalize_text(match.group(1))
            section_text = normalize_text(body[start:end])
            if not section_text:
                continue
            sections.append((name if CJK_NAME_RE.fullmatch(name) else None, section_text))
    if sections:
        return sections
    fallback = page_subject_name(page) or None
    return [(fallback, body)]


def sentence_candidates(
    source_policy: dict[str, Any], page: dict[str, Any], source_class: str
) -> list[tuple[int, str, str | None]]:
    rows: list[tuple[int, str, str | None]] = []
    seen: set[tuple[str, str | None]] = set()
    sentence_index = 0
    for fallback_name, body in build_sections(source_policy, page, source_class):
        for segment in SPLIT_RE.split(body):
            for chunk in split_long_segment(normalize_text(segment)):
                text = normalize_text(chunk)
                if len(text) < 12 or len(text) > 240:
                    continue
                if any(marker in text for marker in NOISE_MARKERS):
                    continue
                if text.startswith("http"):
                    continue
                key = (text, fallback_name)
                if key in seen:
                    continue
                seen.add(key)
                rows.append((sentence_index, text, fallback_name))
                sentence_index += 1
    return rows


def build_sentence_seeds(
    *,
    source_policy: dict[str, Any],
    page: dict[str, Any],
    source_class: str,
    alias_buckets: dict[str, list[tuple[str, str]]],
) -> tuple[list[dict[str, Any]], int]:
    seeds: list[dict[str, Any]] = []
    claim_bearing_passages = 0
    per_person_counts: dict[tuple[str, str], int] = defaultdict(int)
    page_slug_value = page_slug(str(page.get("url") or ""))

    for sentence_index, text, fallback_name in sentence_candidates(source_policy, page, source_class):
        mentions = match_mentions(text, alias_buckets)
        if not mentions and fallback_name and fallback_name in text:
            mentions = [(fallback_name, "")]
        if not mentions:
            continue
        angle_type = infer_angle(text, len(mentions), source_class)
        emitted_here = 0
        fallback_candidate_person_id = (
            f"shadow:{source_policy['sourceId']}:{page_slug_value}:{fallback_name}" if fallback_name else None
        )
        for matched_name, general_id in mentions[:4]:
            person_key = general_id or fallback_candidate_person_id or matched_name
            key = (person_key, angle_type)
            if per_person_counts[key] >= 2:
                continue
            per_person_counts[key] += 1
            seeds.append(
                build_seed(
                    source_policy=source_policy,
                    page=page,
                    general_id=general_id or None,
                    candidate_person_id=None if general_id else fallback_candidate_person_id,
                    matched_name=matched_name,
                    angle_type=angle_type,
                    quote=text,
                    locator_suffix=f"page-text-{angle_type}",
                    sentence_index=sentence_index,
                    content_source="page-text",
                )
            )
            emitted_here += 1
        if emitted_here:
            claim_bearing_passages += 1
    return seeds, claim_bearing_passages


def dedupe_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: dict[tuple[str, str, str], dict[str, Any]] = {}
    for row in rows:
        key = (
            str(row.get("generalId") or row.get("candidatePersonId") or ""),
            str(row.get("angleType") or ""),
            str(row.get("quote") or ""),
        )
        deduped[key] = row
    return list(deduped.values())


def render_markdown(summary: dict[str, Any]) -> str:
    metrics = summary["metrics"]
    lines = [
        "# Generic Passage Evidence Seed Extraction",
        "",
        f"- Source: `{summary['sourceId']}`",
        f"- Source Class: `{summary['sourceClass']}`",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Page Count: `{metrics['pageCount']}`",
        f"- Seed Count: `{metrics['seedCount']}`",
        f"- Page-text Seed Count: `{metrics['pageTextSeedCount']}`",
        f"- Claim-bearing Passages: `{metrics['claimBearingPassageCount']}`",
        f"- Quote/Locator/Hash Coverage: `{metrics['quoteLocatorHashCoverage']:.2%}`",
        "",
        "## Angle Counts",
        "",
        "| Angle | Count |",
        "| --- | ---: |",
    ]
    for angle, count in sorted((metrics.get("angleCounts") or {}).items()):
        lines.append(f"| `{angle}` | {count} |")
    lines.extend(
        [
            "",
            "## Sample Passages",
            "",
            "| Person | Angle | Quote |",
            "| --- | --- | --- |",
        ]
    )
    for row in summary.get("samplePassages") or []:
        quote = str(row.get("quote") or "").replace("|", "\\|")
        if len(quote) > 120:
            quote = quote[:117] + "..."
        lines.append(f"| `{row['personId']}` | `{row['angleType']}` | {quote} |")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract deterministic passage-level EvidenceSeed rows from generic harvested pages.")
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--source-class", choices=sorted(SOURCE_CLASSES), required=True)
    parser.add_argument("--pages-jsonl", default=str(DEFAULT_PAGES_JSONL))
    parser.add_argument("--source-config", default=str(DEFAULT_SOURCE_CONFIG))
    parser.add_argument("--alias-map", default=str(DEFAULT_ALIAS_MAP))
    parser.add_argument("--scoreboard-json", default=str(DEFAULT_SCOREBOARD_JSON))
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    pages_path = resolve_path(args.pages_jsonl)
    source_config_path = resolve_path(args.source_config)
    alias_map_path = resolve_path(args.alias_map)
    scoreboard_path = resolve_path(args.scoreboard_json)
    output_root = resolve_path(args.output_root)
    seeds_path = output_root / "manual-evidence-seeds.jsonl"
    summary_path = output_root / "manual-evidence-seeds-summary.json"
    markdown_path = output_root / "manual-evidence-seeds-summary.zh-TW.md"
    if output_root.exists() and any(output_root.iterdir()) and not args.overwrite:
        raise SystemExit(f"Output root already exists and is not empty: {repo_relative(output_root)}")

    source_policy = load_source_policy(source_config_path, args.source_id)
    scoreboard_rows = load_scoreboard_rows(scoreboard_path)
    alias_index = build_alias_index(alias_map_path, scoreboard_rows)
    alias_buckets = build_alias_first_char_map(alias_index)
    pages = list(iter_jsonl(pages_path))

    rows: list[dict[str, Any]] = []
    page_reports: list[dict[str, Any]] = []
    sample_passages: list[dict[str, Any]] = []
    claim_bearing_passage_count = 0
    matched_canonical_pages: set[str] = set()
    matched_shadow_pages: set[str] = set()

    for page in pages:
        page_rows = build_identity_seeds(source_policy, page, alias_buckets)
        sentence_rows, passage_hits = build_sentence_seeds(
            source_policy=source_policy,
            page=page,
            source_class=args.source_class,
            alias_buckets=alias_buckets,
        )
        page_rows.extend(sentence_rows)
        page_rows = dedupe_rows(page_rows)
        claim_bearing_passage_count += passage_hits
        rows.extend(page_rows)
        page_id = str(page.get("pageId") or page.get("url") or "")
        if any(row.get("generalId") for row in page_rows):
            matched_canonical_pages.add(page_id)
        if any(row.get("candidatePersonId") for row in page_rows):
            matched_shadow_pages.add(page_id)
        page_reports.append(
            {
                "title": page.get("title"),
                "url": page.get("url"),
                "seedCount": len(page_rows),
            }
        )
        for row in page_rows:
            if len(sample_passages) >= 20:
                break
            sample_passages.append(
                {
                    "personId": row.get("generalId") or row.get("candidatePersonId"),
                    "angleType": row.get("angleType"),
                    "quote": row.get("quote"),
                    "sourceUrl": row.get("sourceUrl"),
                }
            )

    rows.sort(
        key=lambda row: (
            str(row.get("generalId") or row.get("candidatePersonId") or ""),
            str(row.get("angleType") or ""),
            str(row.get("quote") or ""),
        )
    )
    seed_count = write_jsonl(seeds_path, rows)
    angle_counts = Counter(str(row.get("angleType") or "") for row in rows)
    qlh_count = sum(1 for row in rows if row.get("quote") and row.get("locator") and row.get("textHash"))
    summary = {
        "version": "3.1.0",
        "generatedAt": utc_now(),
        "mode": "generic-passage-evidence-seed-extraction",
        "sourceId": args.source_id,
        "sourceClass": args.source_class,
        "canonicalWrites": False,
        "inputs": {
            "pagesJsonl": repo_relative(pages_path),
            "sourceConfig": repo_relative(source_config_path),
            "aliasMap": repo_relative(alias_map_path),
            "scoreboardJson": repo_relative(scoreboard_path),
        },
        "outputs": {
            "manualSeedsJsonl": repo_relative(seeds_path),
            "summaryJson": repo_relative(summary_path),
            "summaryMarkdown": repo_relative(markdown_path),
        },
        "metrics": {
            "pageCount": len(pages),
            "seedCount": seed_count,
            "pageTextSeedCount": sum(1 for row in rows if str(row.get("contentSource") or "") == "page-text"),
            "matchedAnyPageCount": len(matched_canonical_pages | matched_shadow_pages),
            "matchedCanonicalPageCount": len(matched_canonical_pages),
            "shadowPageCount": len(matched_shadow_pages),
            "uniqueCanonicalGeneralCount": len({str(row.get("generalId")) for row in rows if row.get("generalId")}),
            "uniqueShadowPersonCount": len({str(row.get("candidatePersonId")) for row in rows if row.get("candidatePersonId")}),
            "claimBearingPassageCount": claim_bearing_passage_count,
            "quoteLocatorHashCoverage": (qlh_count / seed_count) if seed_count else 0.0,
            "angleCounts": dict(sorted(angle_counts.items())),
        },
        "samplePages": page_reports[:20],
        "samplePassages": sample_passages,
        "notes": [
            "This extractor is used for primary-text-site and community-worldbuilding-site benchmark runs.",
            "Seeds remain review artifacts only and keep canonicalWrites=false.",
        ],
    }
    write_json(summary_path, summary)
    markdown_path.write_text(render_markdown(summary) + "\n", encoding="utf-8")
    sys.stdout.buffer.write((json.dumps(summary, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
