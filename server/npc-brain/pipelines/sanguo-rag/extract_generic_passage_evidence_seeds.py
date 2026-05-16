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

from extract_harvested_page_evidence_seeds import (
    contains_cjk_text,
    contains_latin_text,
    to_simplified_hint,
    to_traditional_hint,
    translate_seed_text_to_traditional,
)
from repo_layout import pipeline_config_path, resolve_repo_root
from sanguo_governance_loader import (
    default_governance_root,
    load_evidence_seed_direction_denoise_rules,
    load_evidence_seed_extraction_policy,
    load_evidence_seed_keyword_cue_rules,
)


REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_PAGES_JSONL = Path("local/codex-smoke/knowledge-growth/tmp-wikisource-sanguozhi-sample/pages.jsonl")
DEFAULT_SOURCE_CONFIG = pipeline_config_path(REPO_ROOT, "external-evidence-sources.json")
DEFAULT_ALIAS_MAP = Path("artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary/formal-mention-map.json")
DEFAULT_SCOREBOARD_JSON = Path(
    "local/codex-smoke/knowledge-growth/full-roster-highway-wang-yi-female-fix-r1/"
    "full-roster-highway-wang-yi-female-fix-r1-r1/scoreboard/full-roster-scoreboard.json"
)
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth/generic-passage-seeds-r1")
DEFAULT_GOVERNANCE_ROOT = default_governance_root()
REQUIRED_SOURCE_POLICY_FIELDS: tuple[str, ...] = ("sourceId", "sourceClass", "sourceFamily", "sourceLayer", "trustTier")

SOURCE_CLASSES = {"primary-text-site", "community-worldbuilding-site"}
SEED_ROW_DEFAULTS: dict[str, Any] = {
    "seedConfidenceScore": 0.0,
    "siteReliabilityMultiplier": 1.0,
    "crossSiteMatchCount": 0,
    "promotionTarget": "seed-only",
    "canonicalWrites": False,
}
DEFAULT_ALIAS_NOISE_DENYLIST = frozenset(
    (
        "\u5b50\u6853",  # 子桓
        "\u5b50\u5b5d",  # 子孝
        "\u738b\u7acb",  # 王立
    )
)

TITLE_KEYWORDS: tuple[str, ...] = ()

RELATIONSHIP_KEYWORDS: tuple[str, ...] = ()

EVENT_KEYWORDS: tuple[str, ...] = ()

TRAIT_KEYWORDS: tuple[str, ...] = ()

WORLDBUILDING_KEYWORDS: tuple[str, ...] = ()

IDENTITY_KEYWORDS: tuple[str, ...] = ()

ROLE_KEYWORDS: tuple[str, ...] = ()

LOCATION_KEYWORDS: tuple[str, ...] = ()

HABIT_KEYWORDS: tuple[str, ...] = ()

ACTIVITY_KEYWORDS: tuple[str, ...] = ()

DIALOGUE_KEYWORDS: tuple[str, ...] = ()

SOURCE_CONFLICT_KEYWORDS: tuple[str, ...] = ()

RELATIONSHIP_DIRECTION_HINTS: tuple[tuple[str, str], ...] = (
    ("父子", "父子"),
    ("父女", "父女"),
    ("母子", "母子"),
    ("母女", "母女"),
    ("夫妻", "夫妻"),
    ("義子", "義親"),
    ("從妹", "旁系親屬"),
    ("從弟", "旁系親屬"),
    ("從子", "旁系親屬"),
    ("宗親", "宗親"),
    ("麾下", "主從"),
    ("部下", "主從"),
    ("served under", "主從"),
    ("wife of", "婚配"),
    ("husband of", "婚配"),
    ("daughter of", "親屬"),
    ("son of", "親屬"),
    ("father of", "親屬"),
    ("mother of", "親屬"),
    ("brother of", "手足"),
    ("sister of", "手足"),
    ("嫁", "婚配"),
    ("娶", "婚配"),
    ("妻", "婚配"),
    ("夫", "婚配"),
    ("父", "親屬"),
    ("母", "親屬"),
    ("兄", "手足"),
    ("弟", "手足"),
    ("姊", "手足"),
    ("妹", "手足"),
    ("族", "族親"),
    ("子", "親屬"),
    ("女", "親屬"),
)

AMBIGUOUS_RELATION_ANCHORS = {"子", "女", "兄", "弟", "姊", "妹", "族"}
RELATION_ANCHOR_DISTANCE_LIMIT = 24
STRICT_KINSHIP_RELATION_LABELS = {"親屬", "手足", "族親", "宗親", "旁系親屬", "義親", "父子", "父女"}
STRICT_KINSHIP_RELATION_RAW = {"父子", "父女", "兄", "弟", "姊", "妹", "族", "子", "父", "brother of", "sister of"}
RELATION_DENSE_WINDOW_LIMIT = 6
RELATIONSHIP_DIRECTION_HINTS: tuple[tuple[str, str], ...] = ()
AMBIGUOUS_RELATION_ANCHORS: frozenset[str] = frozenset()
STRICT_KINSHIP_RELATION_LABELS: frozenset[str] = frozenset()
STRICT_KINSHIP_RELATION_RAW: frozenset[str] = frozenset()
COMPOUND_SURNAMES = (
    "司馬",
    "诸葛",
    "諸葛",
    "夏侯",
    "皇甫",
    "公孫",
    "司徒",
    "司空",
    "太史",
    "長孫",
    "慕容",
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
COURTESY_ALIAS_RE = re.compile(r"^\u5b50[\u4e00-\u9fff]{1,2}$")
HEADING_RE = re.compile(r"([\u4e00-\u9fff]{2,12})\s*\[\s*(?:编辑|編輯)\s*\]")
SPLIT_RE = re.compile(r"[。！？；?!;\n\r]+")
SPACE_RE = re.compile(r"\s+")
YEAR_HINT_RE = re.compile(r"\d{3,4}|建安|初平|興平|黃初|太和|延熙|景元|太康")
LOCATION_RE = re.compile(r"[\u4e00-\u9fff]{1,8}(?:城|郡|州|縣|县|關|关|山|江|河|谷|寨|營|营|渡|口|津|坡|原)|\b[A-Z][A-Za-z' -]{1,40}\s+(?:Commandery|Province|County|Fortress|Castle|Pass|River|Mount)\b")


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


def apply_evidence_seed_extraction_policy(
    governance_root: str | Path | None,
    *,
    evidence_seed_policy: str | Path | None = None,
) -> dict[str, Any]:
    global REQUIRED_SOURCE_POLICY_FIELDS, SOURCE_CLASSES, DEFAULT_ALIAS_NOISE_DENYLIST, SEED_ROW_DEFAULTS

    policy = load_evidence_seed_extraction_policy(governance_root, evidence_seed_policy=evidence_seed_policy)
    required_fields = policy.get("requiredSourcePolicyFields")
    if isinstance(required_fields, list) and required_fields:
        REQUIRED_SOURCE_POLICY_FIELDS = tuple(str(value).strip() for value in required_fields if str(value).strip())
    generic = policy.get("genericPassage") if isinstance(policy.get("genericPassage"), dict) else {}
    source_classes = generic.get("sourceClasses")
    if isinstance(source_classes, list) and source_classes:
        SOURCE_CLASSES = {str(value).strip() for value in source_classes if str(value).strip()}
    alias_noise_denylist = generic.get("aliasNoiseDenylist")
    if isinstance(alias_noise_denylist, list) and alias_noise_denylist:
        DEFAULT_ALIAS_NOISE_DENYLIST = frozenset(str(value).strip() for value in alias_noise_denylist if str(value).strip())
    defaults = generic.get("seedRowDefaults")
    if isinstance(defaults, dict):
        SEED_ROW_DEFAULTS = {**SEED_ROW_DEFAULTS, **defaults}
    return policy


def validate_source_policy_metadata(source_policy: dict[str, Any], *, expected_classes: set[str]) -> None:
    missing = [field for field in REQUIRED_SOURCE_POLICY_FIELDS if not str(source_policy.get(field) or "").strip()]
    if missing:
        source_id = str(source_policy.get("sourceId") or "<unknown>")
        raise ValueError(f"source policy {source_id} missing required governance fields: {', '.join(missing)}")
    source_class = str(source_policy.get("sourceClass") or "").strip()
    if expected_classes and source_class not in expected_classes:
        raise ValueError(f"source policy {source_policy.get('sourceId')} sourceClass={source_class} not allowed for generic-passage extractor")


def apply_evidence_seed_keyword_cue_rules(
    governance_root: str | Path | None,
    *,
    keyword_cue_rules: str | Path | None = None,
) -> None:
    required_constants = (
        "IDENTITY_KEYWORDS",
        "RELATIONSHIP_KEYWORDS",
        "TITLE_KEYWORDS",
        "TRAIT_KEYWORDS",
        "EVENT_KEYWORDS",
        "ROLE_KEYWORDS",
        "LOCATION_KEYWORDS",
        "HABIT_KEYWORDS",
        "ACTIVITY_KEYWORDS",
        "DIALOGUE_KEYWORDS",
        "SOURCE_CONFLICT_KEYWORDS",
        "WORLDBUILDING_KEYWORDS",
    )
    rows = load_evidence_seed_keyword_cue_rules(governance_root, keyword_cue_rules=keyword_cue_rules)
    by_name = {
        str(row.get("constantName") or ""): tuple(str(value) for value in row.get("keywords") or [])
        for row in rows
        if str(row.get("extractor") or "") == "genericPassage"
    }
    missing = [name for name in required_constants if not by_name.get(name)]
    if missing:
        raise ValueError(f"missing generic-passage keyword cue rules: {', '.join(missing)}")
    for name in required_constants:
        globals()[name] = by_name[name]


def apply_evidence_seed_direction_denoise_rules(
    governance_root: str | Path | None,
    *,
    relationship_direction_rules: str | Path | None = None,
) -> None:
    required_constants = (
        "RELATIONSHIP_DIRECTION_HINTS",
        "AMBIGUOUS_RELATION_ANCHORS",
        "STRICT_KINSHIP_RELATION_LABELS",
        "STRICT_KINSHIP_RELATION_RAW",
        "RELATION_DENSE_WINDOW_LIMIT",
    )
    rows = load_evidence_seed_direction_denoise_rules(
        governance_root,
        relationship_direction_denoise_rules=relationship_direction_rules,
    )
    by_name = {}
    for row in rows:
        if str(row.get("extractor") or "").strip() not in {"", "genericPassage"}:
            continue
        by_name[str(row.get("constantName") or "").strip()] = row
    missing = [name for name in required_constants if name not in by_name]
    if missing:
        raise ValueError(f"missing generic-passage direction denoise rules: {', '.join(missing)}")
    for row in rows:
        constant_name = str(row.get("constantName") or "").strip()
        kind = str(row.get("kind") or "").strip()
        value = row.get("value")
        if kind == "pair":
            tuples = [tuple(map(str, item)) for item in (value or []) if isinstance(item, list)]
            if not tuples:
                raise ValueError(f"invalid relation direction pair value for {constant_name}")
            globals()[constant_name] = tuple(tuples)
        elif kind == "set":
            values = tuple(sorted({str(value).strip() for value in (value or []) if str(value).strip()}))
            if not values:
                raise ValueError(f"invalid relation direction set value for {constant_name}")
            globals()[constant_name] = frozenset(values)
        elif kind == "int":
            globals()[constant_name] = int(value)
        else:
            raise ValueError(f"invalid relation direction rule kind={kind} for {constant_name}")


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


def build_general_name_hints(alias_index: dict[str, str]) -> dict[str, set[str]]:
    hints: dict[str, set[str]] = defaultdict(set)
    for alias, general_id in alias_index.items():
        if CJK_NAME_RE.fullmatch(alias):
            hints[general_id].add(alias)
    return dict(hints)


def load_alias_noise_denylist(source_policy: dict[str, Any]) -> set[str]:
    configured = source_policy.get("aliasNoiseDenylist") if isinstance(source_policy, dict) else None
    source_values: list[str] = []
    if isinstance(configured, list):
        source_values = [str(value or "").strip() for value in configured]
    elif isinstance(configured, str):
        source_values = [configured.strip()]
    values = source_values or list(DEFAULT_ALIAS_NOISE_DENYLIST)
    denylist: set[str] = set()
    for alias in values:
        for candidate in (
            normalize_text(alias),
            normalize_text(to_simplified_hint(alias)),
            normalize_text(to_traditional_hint(alias)),
        ):
            if candidate and CJK_NAME_RE.fullmatch(candidate):
                denylist.add(candidate)
    return denylist


def has_strong_anchor_for_alias(
    text: str,
    general_id: str,
    alias: str,
    general_name_hints: dict[str, set[str]],
    alias_noise_denylist: set[str],
) -> bool:
    anchors = general_name_hints.get(general_id) or set()
    for anchor in anchors:
        if anchor == alias:
            continue
        if anchor in alias_noise_denylist:
            continue
        if COURTESY_ALIAS_RE.fullmatch(anchor):
            continue
        if len(anchor) < 2:
            continue
        if anchor in text:
            return True
    return False


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
    value = trim_with_configured_markers(value, source_policy)
    source_id = str(source_policy.get("sourceId") or "")
    if source_id.startswith("wikisource-"):
        value = trim_wikisource_preamble(value)
    return normalize_text(value)


def extractor_policy(source_policy: dict[str, Any]) -> dict[str, Any]:
    policy = source_policy.get("extractorPolicy") if isinstance(source_policy, dict) else {}
    return policy if isinstance(policy, dict) else {}


def extractor_marker_list(source_policy: dict[str, Any], key: str) -> list[str]:
    raw = extractor_policy(source_policy).get(key)
    if isinstance(raw, str):
        return [raw]
    if isinstance(raw, list):
        return [str(value or "").strip() for value in raw if str(value or "").strip()]
    return []


def trim_with_configured_markers(text: str, source_policy: dict[str, Any]) -> str:
    value = text
    for marker in extractor_marker_list(source_policy, "bodyStartMarkers"):
        index = value.find(marker)
        if index >= 0:
            value = value[index + len(marker) :]
            break
    for marker in extractor_marker_list(source_policy, "bodyEndMarkers"):
        index = value.find(marker)
        if index >= 48:
            value = value[:index]
            break
    return value


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
    if CJK_NAME_RE.fullmatch(subject):
        return subject
    head_text = normalize_text(read_page_text(page)[:600])
    for candidate in re.findall(r"[\u4e00-\u9fff]{2,12}", head_text):
        if candidate in NOISE_MARKERS:
            continue
        if CJK_NAME_RE.fullmatch(candidate):
            return candidate
    return ""


def passage_mode(source_policy: dict[str, Any]) -> str:
    policy = extractor_policy(source_policy)
    return str(policy.get("passageMode") or "").strip().lower()


def relation_window_mode(source_policy: dict[str, Any]) -> bool:
    return passage_mode(source_policy) == "line-window"


def token_window_mode(source_policy: dict[str, Any]) -> bool:
    return passage_mode(source_policy) == "token-window"


def line_window_candidates(source_policy: dict[str, Any], page: dict[str, Any]) -> list[tuple[int, str, str | None]]:
    policy = extractor_policy(source_policy)
    window_size = max(2, min(6, int(policy.get("lineWindowSize") or 4)))
    raw_text = read_page_text(page)
    lines: list[str] = []
    for raw_line in raw_text.splitlines():
        text = normalize_text(raw_line)
        if len(text) < 2 or len(text) > 36:
            continue
        if text.startswith("http") or any(marker in text for marker in NOISE_MARKERS):
            continue
        lines.append(text)

    relationish_keywords = (
        *RELATIONSHIP_KEYWORDS,
        *TITLE_KEYWORDS,
        *ROLE_KEYWORDS,
        *SOURCE_CONFLICT_KEYWORDS,
    )
    rows: list[tuple[int, str, str | None]] = []
    seen: set[str] = set()
    sentence_index = 0
    for start in range(len(lines)):
        for size in range(2, window_size + 1):
            chunk = lines[start : start + size]
            if len(chunk) < 2:
                break
            joined = " / ".join(chunk)
            if len(joined) < 6 or len(joined) > 180:
                continue
            if not any(keyword in joined for keyword in relationish_keywords):
                continue
            if joined in seen:
                continue
            seen.add(joined)
            rows.append((sentence_index, joined, None))
            sentence_index += 1
    return rows


def token_window_candidates(source_policy: dict[str, Any], page: dict[str, Any]) -> list[tuple[int, str, str | None]]:
    policy = extractor_policy(source_policy)
    window_size = max(6, min(24, int(policy.get("tokenWindowSize") or 12)))
    step = max(1, min(window_size, int(policy.get("tokenWindowStep") or max(2, window_size // 3))))
    raw_text = clean_page_text(read_page_text(page), source_policy)
    normalized = (
        raw_text.replace("-->", " ")
        .replace("：", " ： ")
        .replace(":", " : ")
        .replace("，", " ， ")
        .replace(",", " , ")
        .replace("。", " 。 ")
        .replace("；", " ； ")
        .replace("|", " | ")
        .replace("/", " / ")
    )
    tokens = [
        token
        for token in SPACE_RE.split(normalized)
        if token
        and len(token) <= 24
        and not token.startswith("http")
        and not token.startswith("sourceId:")
        and not token.startswith("url:")
        and not token.startswith("title:")
        and not token.startswith("textHash:")
        and token not in {"canonicalWrites:", "false"}
        and not token.startswith("&#x")
    ]
    relationish_keywords = (
        *RELATIONSHIP_KEYWORDS,
        *ROLE_KEYWORDS,
        *SOURCE_CONFLICT_KEYWORDS,
        *LOCATION_KEYWORDS,
        *ACTIVITY_KEYWORDS,
        *HABIT_KEYWORDS,
        *DIALOGUE_KEYWORDS,
    )
    rows: list[tuple[int, str, str | None]] = []
    seen: set[str] = set()
    sentence_index = 0
    for start in range(0, len(tokens), step):
        chunk = tokens[start : start + window_size]
        if len(chunk) < 4:
            continue
        joined = normalize_text(" ".join(chunk))
        if len(joined) < 8 or len(joined) > 180:
            continue
        if any(marker in joined for marker in NOISE_MARKERS):
            continue
        if not any(keyword in joined for keyword in relationish_keywords):
            continue
        if joined in seen:
            continue
        seen.add(joined)
        rows.append((sentence_index, joined, None))
        sentence_index += 1
    return rows


def match_mentions(
    text: str,
    alias_buckets: dict[str, list[tuple[str, str]]],
    *,
    alias_noise_denylist: set[str] | None = None,
    general_name_hints: dict[str, set[str]] | None = None,
) -> list[tuple[str, str]]:
    found: dict[str, str] = {}
    denylist = alias_noise_denylist or set()
    name_hints = general_name_hints or {}
    for char in set(text):
        bucket = alias_buckets.get(char)
        if not bucket:
            continue
        for alias, general_id in bucket:
            if alias in denylist and not has_strong_anchor_for_alias(text, general_id, alias, name_hints, denylist):
                continue
            if alias in text and (general_id not in found or len(alias) > len(found[general_id])):
                found[general_id] = alias
    rows = [(alias, general_id) for general_id, alias in found.items()]
    rows.sort(key=lambda item: (-len(item[0]), item[0]))
    return rows


def infer_angle(text: str, mention_count: int, source_class: str) -> str:
    if mention_count >= 1 and any(keyword in text for keyword in SOURCE_CONFLICT_KEYWORDS):
        return "source_conflict"
    if mention_count >= 1 and any(keyword in text for keyword in RELATIONSHIP_KEYWORDS):
        return "relationship"
    if any(keyword in text for keyword in ROLE_KEYWORDS):
        return "role"
    if any(keyword in text for keyword in TITLE_KEYWORDS):
        return "title"
    if any(keyword in text for keyword in LOCATION_KEYWORDS) or LOCATION_RE.search(text):
        return "location"
    if any(keyword in text for keyword in HABIT_KEYWORDS):
        return "habit"
    if any(keyword in text for keyword in ACTIVITY_KEYWORDS):
        return "activity"
    if any(keyword in text for keyword in TRAIT_KEYWORDS):
        return "trait"
    if any(keyword in text for keyword in DIALOGUE_KEYWORDS):
        return "dialogue_seed"
    if source_class == "community-worldbuilding-site" and any(keyword in text for keyword in WORLDBUILDING_KEYWORDS):
        return "worldbuilding_note"
    if any(keyword in text for keyword in EVENT_KEYWORDS):
        return "event"
    if source_class == "primary-text-site":
        return "event"
    return "worldbuilding_note"


def relationship_anchor_hint(text: str) -> tuple[str, str, int, int] | None:
    for raw, label in sorted(RELATIONSHIP_DIRECTION_HINTS, key=lambda item: -len(item[0])):
        index = text.find(raw)
        if index >= 0:
            return raw, label, index, index + len(raw)
    return None


def ordered_mentions_in_text(
    text: str,
    mentions: list[tuple[str, str]],
    *,
    fallback_name: str | None = None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for matched_name, general_id in mentions:
        start = text.find(matched_name)
        if start < 0:
            continue
        key = (general_id, matched_name)
        if key in seen:
            continue
        seen.add(key)
        rows.append(
            {
                "matchedName": matched_name,
                "generalId": general_id,
                "start": start,
                "end": start + len(matched_name),
            }
        )
    if fallback_name and fallback_name not in {str(row["matchedName"]) for row in rows}:
        start = text.find(fallback_name)
        if start >= 0:
            rows.append(
                {
                    "matchedName": fallback_name,
                    "generalId": "",
                    "start": start,
                    "end": start + len(fallback_name),
                }
            )
    rows.sort(key=lambda row: (int(row["start"]), -len(str(row["matchedName"]))))
    return rows


def closest_before_anchor(ordered: list[dict[str, Any]], anchor_start: int) -> dict[str, Any] | None:
    candidates = [row for row in ordered if int(row["end"]) <= anchor_start]
    if not candidates:
        return None
    return max(candidates, key=lambda row: int(row["end"]))


def closest_after_anchor(ordered: list[dict[str, Any]], anchor_end: int) -> dict[str, Any] | None:
    candidates = [row for row in ordered if int(row["start"]) >= anchor_end]
    if not candidates:
        return None
    return min(candidates, key=lambda row: int(row["start"]))


def mention_within_anchor_distance(
    mention: dict[str, Any] | None,
    *,
    anchor_start: int,
    anchor_end: int,
    side: str,
    limit: int = RELATION_ANCHOR_DISTANCE_LIMIT,
) -> bool:
    if not mention:
        return False
    if side == "before":
        distance = anchor_start - int(mention["end"])
    else:
        distance = int(mention["start"]) - anchor_end
    return 0 <= distance <= limit


def extract_chinese_surname(name: str) -> str:
    value = normalize_text(name)
    if not CJK_NAME_RE.fullmatch(value):
        return ""
    for prefix in COMPOUND_SURNAMES:
        if value.startswith(prefix):
            return prefix
    return value[:1]


def legal_relationship_pair(
    *,
    anchor_raw: str,
    anchor_label: str,
    subject: str,
    object_name: str,
    ordered: list[dict[str, Any]],
    anchor_start: int,
    anchor_end: int,
) -> tuple[bool, str]:
    if not subject or not object_name:
        return False, "missing-subject-or-object"
    if subject == object_name:
        return False, "self-loop"
    if len(ordered) >= RELATION_DENSE_WINDOW_LIMIT and anchor_raw in AMBIGUOUS_RELATION_ANCHORS:
        return False, "ambiguous-anchor-in-dense-window"
    if len(ordered) >= RELATION_DENSE_WINDOW_LIMIT and anchor_label in {"親屬", "手足", "族親", "旁系親屬"}:
        return False, "dense-window-kinship-noise"

    subject_rows = [row for row in ordered if str(row["matchedName"]) == subject]
    object_rows = [row for row in ordered if str(row["matchedName"]) == object_name]
    if not subject_rows or not object_rows:
        return False, "subject-or-object-not-in-window"
    subject_row = subject_rows[0]
    object_row = object_rows[0]
    if not mention_within_anchor_distance(subject_row, anchor_start=anchor_start, anchor_end=anchor_end, side="before"):
        return False, "subject-too-far-from-anchor"
    if not mention_within_anchor_distance(object_row, anchor_start=anchor_start, anchor_end=anchor_end, side="after"):
        return False, "object-too-far-from-anchor"

    span = max(int(subject_row["end"]), int(object_row["end"])) - min(int(subject_row["start"]), int(object_row["start"]))
    if span > 36:
        return False, "pair-span-too-wide"
    if anchor_label in STRICT_KINSHIP_RELATION_LABELS or anchor_raw in STRICT_KINSHIP_RELATION_RAW:
        subject_surname = extract_chinese_surname(subject)
        object_surname = extract_chinese_surname(object_name)
        if subject_surname and object_surname and subject_surname != object_surname:
            return False, "kinship-surname-mismatch"
    return True, "ok"


def relationship_preview_hint(
    text: str,
    mentions: list[tuple[str, str]],
    *,
    fallback_name: str | None = None,
) -> dict[str, Any]:
    anchor = relationship_anchor_hint(text)
    if not anchor:
        return {}
    raw_anchor, anchor_label, anchor_start, anchor_end = anchor
    ordered = ordered_mentions_in_text(text, mentions, fallback_name=fallback_name)
    before_row = closest_before_anchor(ordered, anchor_start)
    after_row = closest_after_anchor(ordered, anchor_end)
    subject = str(before_row["matchedName"]) if before_row else ""
    object_name = str(after_row["matchedName"]) if after_row else ""
    if not subject and fallback_name:
        subject = fallback_name

    legal, reason = legal_relationship_pair(
        anchor_raw=raw_anchor,
        anchor_label=anchor_label,
        subject=subject,
        object_name=object_name,
        ordered=ordered,
        anchor_start=anchor_start,
        anchor_end=anchor_end,
    )

    if legal:
        preview = f"關係圖顯示 {subject} 與 {object_name} 有「{anchor_label}」關係線索。"
        confidence = 0.88
    else:
        subject = ""
        object_name = ""
        confidence = 0.5
        preview = f"關係圖出現「{raw_anchor}」關係詞，但未通過合法關係組合檢查（{reason}），已降噪為待人工複核。"

    return {
        "relationshipAnchorRaw": raw_anchor,
        "relationshipAnchorLabel": anchor_label,
        "relationshipSubjectHint": subject,
        "relationshipObjectHint": object_name,
        "relationshipDirectionConfidence": round(confidence, 2),
        "relationshipLegalityPassed": bool(legal),
        "relationshipLegalityReason": reason,
        "reviewPreviewTextZhTw": preview,
    }


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
        "hasLocation": angle_type == "location" or bool(LOCATION_RE.search(quote)),
        "extractionMethod": "deterministic",
        "sourceLiveStatus": page.get("liveStatus"),
        "contentSource": content_source,
        **SEED_ROW_DEFAULTS,
    }
    if general_id:
        row["generalId"] = general_id
    elif candidate_person_id:
        row["candidatePersonId"] = candidate_person_id
    translated = translate_seed_text_to_traditional(quote, matched_name=matched_name, angle_type=angle_type)
    if translated:
        row["translatedTraditionalText"] = translated
        row["translationProfile"] = "seed-text-to-zh-hant-v1"
        row["sourceLanguage"] = "en" if contains_latin_text(quote) and not contains_cjk_text(quote) else "zh"
    return row


def build_identity_seeds(
    source_policy: dict[str, Any],
    page: dict[str, Any],
    alias_buckets: dict[str, list[tuple[str, str]]],
) -> list[dict[str, Any]]:
    if bool(extractor_policy(source_policy).get("disableTitleIdentity")):
        return []
    title = title_sentence(page)
    subject_name = page_subject_name(page)
    mentions = match_mentions(title, alias_buckets)
    if len(mentions) == 1:
        matched_name, general_id = mentions[0]
        candidate_person_id = None
    elif subject_name:
        subject_mentions = match_mentions(subject_name, alias_buckets)
        if len(subject_mentions) == 1:
            matched_name, general_id = subject_mentions[0]
            candidate_person_id = None
        else:
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
    if relation_window_mode(source_policy):
        return line_window_candidates(source_policy, page)
    if token_window_mode(source_policy):
        return token_window_candidates(source_policy, page)
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
    alias_noise_denylist: set[str],
    general_name_hints: dict[str, set[str]],
) -> tuple[list[dict[str, Any]], int]:
    seeds: list[dict[str, Any]] = []
    claim_bearing_passages = 0
    per_person_counts: dict[tuple[str, str], int] = defaultdict(int)
    page_slug_value = page_slug(str(page.get("url") or ""))
    policy = extractor_policy(source_policy)
    allow_fallback_subject_anchoring = bool(policy.get("allowFallbackSubjectAnchoring"))
    relationship_direction_denoise = bool(policy.get("relationshipDirectionDenoise"))
    signal_keywords = (
        *IDENTITY_KEYWORDS,
        *RELATIONSHIP_KEYWORDS,
        *TITLE_KEYWORDS,
        *ROLE_KEYWORDS,
        *LOCATION_KEYWORDS,
        *HABIT_KEYWORDS,
        *ACTIVITY_KEYWORDS,
        *TRAIT_KEYWORDS,
        *DIALOGUE_KEYWORDS,
        *SOURCE_CONFLICT_KEYWORDS,
        *EVENT_KEYWORDS,
        *WORLDBUILDING_KEYWORDS,
    )

    for sentence_index, text, fallback_name in sentence_candidates(source_policy, page, source_class):
        mentions = match_mentions(
            text,
            alias_buckets,
            alias_noise_denylist=alias_noise_denylist,
            general_name_hints=general_name_hints,
        )
        if not mentions and fallback_name and fallback_name in text:
            mentions = [(fallback_name, "")]
        if (
            not mentions
            and fallback_name
            and allow_fallback_subject_anchoring
            and any(keyword in text for keyword in signal_keywords)
        ):
            mentions = [(fallback_name, "")]
        if not mentions:
            continue
        angle_type = infer_angle(text, len(mentions), source_class)
        preview_hint: dict[str, Any] = {}
        effective_mentions = mentions
        if angle_type == "relationship" and relationship_direction_denoise:
            preview_hint = relationship_preview_hint(text, mentions, fallback_name=fallback_name)
            if not bool(preview_hint.get("relationshipLegalityPassed")):
                continue
            hinted_names = {
                str(preview_hint.get("relationshipSubjectHint") or "").strip(),
                str(preview_hint.get("relationshipObjectHint") or "").strip(),
            }
            hinted_names.discard("")
            filtered_mentions = [item for item in mentions if str(item[0] or "").strip() in hinted_names]
            if filtered_mentions:
                effective_mentions = filtered_mentions
        emitted_here = 0
        fallback_candidate_person_id = (
            f"shadow:{source_policy['sourceId']}:{page_slug_value}:{fallback_name}" if fallback_name else None
        )
        for matched_name, general_id in effective_mentions[:4]:
            if (
                angle_type != "identity"
                and len(effective_mentions) == 1
                and matched_name
                and text.startswith(matched_name)
                and any(keyword in text for keyword in IDENTITY_KEYWORDS)
            ):
                angle_type = "identity"
            person_key = general_id or fallback_candidate_person_id or matched_name
            key = (person_key, angle_type)
            if per_person_counts[key] >= 2:
                continue
            per_person_counts[key] += 1
            row = build_seed(
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
            if angle_type == "relationship" and preview_hint:
                row.update(preview_hint)
                row["translatedTraditionalText"] = str(preview_hint.get("reviewPreviewTextZhTw") or row.get("translatedTraditionalText") or "")
                row["translationProfile"] = "relationship-direction-denoise-v1"
                row["sourceLanguage"] = "zh"
            seeds.append(row)
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
        quote = str(row.get("translatedTraditionalText") or row.get("quote") or "").replace("|", "\\|")
        if len(quote) > 120:
            quote = quote[:117] + "..."
        lines.append(f"| `{row['personId']}` | `{row['angleType']}` | {quote} |")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract deterministic passage-level EvidenceSeed rows from generic harvested pages.")
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--source-class", required=True)
    parser.add_argument("--pages-jsonl", default=str(DEFAULT_PAGES_JSONL))
    parser.add_argument("--source-config", default=str(DEFAULT_SOURCE_CONFIG))
    parser.add_argument("--alias-map", default=str(DEFAULT_ALIAS_MAP))
    parser.add_argument("--scoreboard-json", default=str(DEFAULT_SCOREBOARD_JSON))
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--governance-root", default=str(DEFAULT_GOVERNANCE_ROOT))
    parser.add_argument("--evidence-seed-policy", default=None)
    parser.add_argument("--keyword-cue-rules", default=None)
    parser.add_argument("--relationship-direction-rules", default=None)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    apply_evidence_seed_extraction_policy(args.governance_root, evidence_seed_policy=args.evidence_seed_policy)
    apply_evidence_seed_keyword_cue_rules(args.governance_root, keyword_cue_rules=args.keyword_cue_rules)
    apply_evidence_seed_direction_denoise_rules(
        args.governance_root,
        relationship_direction_rules=args.relationship_direction_rules,
    )
    if args.source_class not in SOURCE_CLASSES:
        raise SystemExit(f"source-class not allowed by evidence seed governance policy: {args.source_class}")
    pages_path = resolve_path(args.pages_jsonl)
    source_config_path = resolve_path(args.source_config)
    alias_map_path = resolve_path(args.alias_map)
    scoreboard_path = resolve_path(args.scoreboard_json)
    output_root = resolve_path(args.output_root)
    governance_root = resolve_path(args.governance_root)
    seeds_path = output_root / "manual-evidence-seeds.jsonl"
    summary_path = output_root / "manual-evidence-seeds-summary.json"
    markdown_path = output_root / "manual-evidence-seeds-summary.zh-TW.md"
    if output_root.exists() and any(output_root.iterdir()) and not args.overwrite:
        raise SystemExit(f"Output root already exists and is not empty: {repo_relative(output_root)}")

    source_policy = load_source_policy(source_config_path, args.source_id)
    validate_source_policy_metadata(source_policy, expected_classes=SOURCE_CLASSES)
    scoreboard_rows = load_scoreboard_rows(scoreboard_path)
    alias_index = build_alias_index(alias_map_path, scoreboard_rows)
    alias_buckets = build_alias_first_char_map(alias_index)
    general_name_hints = build_general_name_hints(alias_index)
    alias_noise_denylist = load_alias_noise_denylist(source_policy)
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
            alias_noise_denylist=alias_noise_denylist,
            general_name_hints=general_name_hints,
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
                    "translatedTraditionalText": row.get("translatedTraditionalText"),
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
            "governanceRoot": repo_relative(governance_root),
            "evidenceSeedPolicy": str(args.evidence_seed_policy or "policy-evidence-seed-extraction.json"),
            "keywordCueRules": str(args.keyword_cue_rules or "rule-evidence-seed-keyword-cues.jsonl"),
            "relationshipDirectionRules": str(args.relationship_direction_rules or "rule-relationship-direction-denoise.jsonl"),
            "aliasNoiseDenylist": sorted(alias_noise_denylist),
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
