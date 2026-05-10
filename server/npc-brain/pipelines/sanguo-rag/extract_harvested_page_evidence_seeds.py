from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse


REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_PAGES_JSONL = Path("local/codex-smoke/knowledge-growth/lishirenwu-page-harvest-r1/pages.jsonl")
DEFAULT_SOURCE_CONFIG = Path("server/npc-brain/pipelines/sanguo-rag/config/external-evidence-sources.json")
DEFAULT_ALIAS_MAP = Path("artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary/formal-mention-map.json")
DEFAULT_SCOREBOARD_JSON = Path(
    "local/codex-smoke/knowledge-growth/full-roster-highway-wang-yi-female-fix-r1/"
    "full-roster-highway-wang-yi-female-fix-r1-r1/scoreboard/full-roster-scoreboard.json"
)
DEFAULT_OUTPUT_ROOT = Path("local/codex-smoke/knowledge-growth/lishirenwu-pipeline-eval-r1/extracted-seeds")

RELATIONSHIP_KEYWORDS = (
    "之女",
    "之子",
    "之妻",
    "夫人",
    "皇后",
    "长女",
    "長女",
    "次女",
    "长子",
    "長子",
    "之妹",
    "之弟",
    "之兄",
    "之父",
    "之母",
    "父",
    "母",
    "妻",
    "嫁给",
    "嫁給",
    "嫁",
    "配偶",
    "妻子",
    "女儿",
    "女兒",
    "儿子",
    "兒子",
)

TITLE_KEYWORDS = (
    "皇帝",
    "皇后",
    "丞相",
    "太守",
    "将军",
    "將軍",
    "大将军",
    "大將軍",
    "谋士",
    "謀士",
    "名将",
    "名將",
    "军阀",
    "軍閥",
    "刺史",
    "太傅",
    "侍中",
    "王后",
    "妃",
    "名医",
    "名醫",
    "学者",
    "學者",
    "战略家",
    "戰略家",
    "外交家",
    "文学家",
    "文學家",
)

TRAIT_KEYWORDS = (
    "第一美人",
    "四大美女",
    "美女",
    "猛将",
    "猛將",
    "鬼才",
    "神医",
    "神醫",
    "五虎上将",
    "五虎上將",
    "宠妃",
    "寵妃",
    "名臣",
    "名士",
    "过目不忘",
    "過目不忘",
    "记忆力",
    "記憶力",
    "聪明机智",
    "聰明機智",
    "头脑灵活",
    "頭腦靈活",
    "见识通达",
    "見識通達",
    "其貌不扬",
    "其貌不揚",
    "才华",
    "才華",
    "善辩",
    "善辯",
    "口才",
    "短小放荡",
    "短小放蕩",
)

EVENT_KEYWORDS = (
    "之战",
    "之戰",
    "兵败",
    "兵敗",
    "攻打",
    "攻擊",
    "征讨",
    "征討",
    "讨伐",
    "討伐",
    "出使",
    "入蜀",
    "入益州",
    "献图",
    "獻圖",
    "密谋",
    "密謀",
    "斩杀",
    "斬殺",
    "被杀",
    "被殺",
    "推荐",
    "推薦",
    "劝",
    "勸",
    "迎备",
    "迎備",
    "倒背如流",
    "烧了",
    "燒了",
    "投靠",
    "投奔",
)

WORLDBUILDING_KEYWORDS = (
    "长得",
    "長得",
    "样子",
    "樣子",
    "额",
    "額",
    "鼻",
    "齿",
    "齒",
    "外露",
    "人物形象",
    "文學形象",
    "文学形象",
    "电视剧",
    "電視劇",
    "演义",
    "演義",
    "传说",
    "傳說",
    "特点",
    "特點",
    "好友",
    "個人介紹",
    "个人介绍",
)

BODY_NOISE_MARKERS = (
    "历史人物网",
    "歷史人物網",
    "当前位置",
    "當前位置",
    "首页",
    "首頁",
    "上一篇",
    "下一篇",
    "版权声明",
    "版權聲明",
    "本文链接",
    "本文鏈接",
    "热搜历史人物",
    "熱搜歷史人物",
    "Copyright",
    "ICP备",
)

BODY_TAIL_MARKERS = (
    "上一篇：",
    "上一篇:",
    "下一篇：",
    "下一篇:",
    "本文链接：",
    "本文链接:",
    "本文鏈接：",
    "本文鏈接:",
    "版权声明：",
    "版权声明:",
    "版權聲明：",
    "版權聲明:",
)

SIMPLIFIED_TO_TRADITIONAL = str.maketrans(
    {
        "东": "東",
        "汉": "漢",
        "刘": "劉",
        "备": "備",
        "关": "關",
        "张": "張",
        "马": "馬",
        "吕": "呂",
        "孙": "孫",
        "吴": "吳",
        "国": "國",
        "师": "師",
        "诸": "諸",
        "赵": "趙",
        "陈": "陳",
        "许": "許",
        "黄": "黃",
        "钟": "鍾",
        "陆": "陸",
        "鲁": "魯",
        "乔": "喬",
        "妇": "婦",
        "后": "後",
        "练": "練",
        "县": "縣",
        "严": "嚴",
        "邹": "鄒",
        "卢": "盧",
        "贾": "賈",
        "韦": "韋",
        "邓": "鄧",
        "颜": "顏",
        "谯": "譙",
        "庞": "龐",
        "异": "異",
        "宝": "寶",
        "权": "權",
        "肃": "肅",
        "宠": "寵",
        "凤": "鳳",
        "云": "雲",
        "蝉": "蟬",
        "琦": "琦",
        "睿": "叡",
        "莹": "瑩",
        "宁": "寧",
        "桓": "桓",
    }
)

TRADITIONAL_TO_SIMPLIFIED = str.maketrans(
    {
        traditional: simplified
        for simplified, traditional in SIMPLIFIED_TO_TRADITIONAL.items()
        if isinstance(traditional, str) and len(traditional) == 1
    }
)


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


def stable_hash(*parts: Any, length: int = 20) -> str:
    digest = sha256("\n".join(str(part or "") for part in parts).encode("utf-8")).hexdigest()
    return digest[:length]


def normalize_text(text: str) -> str:
    value = (
        str(text or "")
        .replace("&mdash;", "—")
        .replace("&ldquo;", '"')
        .replace("&rdquo;", '"')
        .replace("&middot;", "·")
        .replace("&nbsp;", " ")
    )
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def to_traditional_hint(text: str) -> str:
    return str(text or "").translate(SIMPLIFIED_TO_TRADITIONAL)


def to_simplified_hint(text: str) -> str:
    return str(text or "").translate(TRADITIONAL_TO_SIMPLIFIED)


def page_slug(url: str) -> str:
    return Path(urlparse(url).path).stem.lower()


def load_source_policy(path: Path, source_id: str) -> dict[str, Any]:
    payload = read_json(path)
    rows = payload.get("sources") if isinstance(payload, dict) else payload
    if not isinstance(rows, list):
        raise ValueError(f"Unexpected source config format: {repo_relative(path)}")
    for row in rows:
        if isinstance(row, dict) and str(row.get("sourceId") or "").strip() == source_id:
            return row
    raise ValueError(f"sourceId not found in source config: {source_id}")


def load_scoreboard_rows(path: Path) -> list[dict[str, Any]]:
    payload = read_json(path)
    rows = payload.get("rows") if isinstance(payload, dict) else []
    return [row for row in rows if isinstance(row, dict)]


def build_slug_index(rows: list[dict[str, Any]]) -> dict[str, str]:
    index: dict[str, str] = {}
    for row in rows:
        general_id = str(row.get("generalId") or "").strip()
        display_name = str(row.get("displayName") or row.get("name") or "").strip()
        if not general_id:
            continue
        base = general_id.replace("-", "")
        index.setdefault(base, general_id)
        if "呂" in display_name or "吕" in display_name:
            index.setdefault(base.replace("lu", "lv"), general_id)
    return index


def build_alias_index(path: Path) -> dict[str, list[str]]:
    payload = read_json(path)
    rows = payload.get("entries") if isinstance(payload, dict) else []
    index: dict[str, list[str]] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        if str(row.get("status") or "") != "high-confidence":
            continue
        general_ids = row.get("generalIds") or []
        if not isinstance(general_ids, list) or len(general_ids) != 1:
            continue
        alias = str(row.get("alias") or "").strip()
        if not alias:
            continue
        if len(alias) < 2 or len(alias) > 16:
            continue
        index.setdefault(alias, []).append(general_ids[0])
    return index


def extract_title_aliases(title: str) -> list[str]:
    base = normalize_text(title).split("_")[0]
    trad = to_traditional_hint(base)
    candidates: list[str] = [base, trad]
    trimmed = re.split(r"(简介|簡介|资料|資料|简历|簡歷|介绍|介紹|—|-)", trad)[0]
    candidates.append(trimmed)
    stripped_base = re.sub(r"^(三國|三国)", "", base)
    stripped_base = re.split(r"(简介资料|簡介資料|简介|簡介|资料|資料|简历资料|簡歷資料|简历|簡歷|介绍|介紹|—|-)", stripped_base)[0]
    candidates.append(stripped_base)
    stripped = re.sub(r"^(三國|三国)", "", trad)
    stripped = re.split(r"(简介资料|簡介資料|简介|簡介|资料|資料|简历资料|簡歷資料|简历|簡歷|介绍|介紹|—|-)", stripped)[0]
    candidates.append(stripped)
    chunks = re.findall(r"[\u4e00-\u9fff]{2,12}", trad)
    candidates.extend(chunks)
    deduped: list[str] = []
    seen: set[str] = set()
    for item in candidates:
        text = normalize_text(item)
        if not text or text in seen:
            continue
        seen.add(text)
        deduped.append(text)
    return deduped


def contained_alias_match(title: str, alias_index: dict[str, list[str]]) -> tuple[str | None, str]:
    title_main = re.split(r"(简介|簡介|资料|資料|简历|簡歷|介绍|介紹|—|-)", to_traditional_hint(normalize_text(title).split("_")[0]))[0]
    candidate = normalize_text(title_main)
    best_alias = ""
    best_general_id: str | None = None
    best_position = 9999
    for alias, general_ids in alias_index.items():
        if len(general_ids) != 1 or len(alias) < 2:
            continue
        position = candidate.find(alias)
        if position < 0:
            continue
        if len(alias) > len(best_alias) or (len(alias) == len(best_alias) and position < best_position):
            best_alias = alias
            best_general_id = general_ids[0]
            best_position = position
    return best_general_id, best_alias


def match_general_id(
    page: dict[str, Any],
    *,
    slug_index: dict[str, str],
    alias_index: dict[str, list[str]],
) -> tuple[str | None, str, str]:
    slug = page_slug(str(page.get("url") or ""))
    if slug in slug_index:
        return slug_index[slug], "slug", ""

    title = str(page.get("title") or "")
    for alias in extract_title_aliases(title):
        general_ids = alias_index.get(alias) or []
        if len(general_ids) == 1:
            return general_ids[0], "title-alias", alias

    contained_general_id, contained_alias = contained_alias_match(title, alias_index)
    if contained_general_id:
        return contained_general_id, "title-alias", contained_alias

    return None, "shadow", ""


def snippet_after_header(page: dict[str, Any]) -> str:
    title = normalize_text(str(page.get("title") or ""))
    snippet = normalize_text(str(page.get("snippet") or ""))
    if not snippet:
        return title
    if "日期：" in snippet:
        snippet = snippet.split("日期：", 1)[1]
    if "浏览：" in snippet:
        snippet = snippet.split("浏览：", 1)[1]
    if title and title in snippet:
        last = snippet.rfind(title)
        if last >= 0:
            snippet = snippet[last + len(title) :]
    snippet = re.sub(r"^[:：\-—> ]+", "", snippet)
    return normalize_text(snippet) or title


def sentence_candidates(page: dict[str, Any]) -> list[str]:
    title = normalize_text(str(page.get("title") or "")).split("_")[0]
    lead = snippet_after_header(page)
    parts = []
    for segment in re.split(r"[。！？；]", lead):
        text = normalize_text(segment)
        if len(text) < 6:
            continue
        if "历史人物网" in text or "首页" in text:
            continue
        if text.startswith("http"):
            continue
        parts.append(text)
    merged = [title]
    merged.extend(parts[:8])
    deduped: list[str] = []
    seen: set[str] = set()
    for item in merged:
        text = normalize_text(item)
        if not text or text in seen:
            continue
        seen.add(text)
        deduped.append(text)
    return deduped


def split_page_text_payload(text: str) -> str:
    raw = str(text or "")
    if "\n\n" in raw:
        return raw.split("\n\n", 1)[1]
    return raw


def read_page_text(page: dict[str, Any]) -> str:
    text_path_value = str(page.get("textPath") or "").strip()
    if not text_path_value:
        return ""
    text_path = resolve_path(text_path_value)
    if not text_path.exists():
        return ""
    return split_page_text_payload(text_path.read_text(encoding="utf-8-sig", errors="ignore"))


def trim_page_text_body(page: dict[str, Any]) -> str:
    body = normalize_text(read_page_text(page))
    if not body:
        return ""
    metadata_patterns = (
        r"^.*?日期[:：][^。！？；]{0,80}栏目[:：][^。！？；]{0,60}(?:浏览|瀏覽)[:：][^。！？；]{0,40}",
        r"^.*?日期[:：][^。！？；]{0,80}(?:浏览|瀏覽)[:：][^。！？；]{0,40}",
    )
    for pattern in metadata_patterns:
        match = re.search(pattern, body)
        if match:
            body = body[match.end() :]
            break
    for marker in BODY_TAIL_MARKERS:
        index = body.find(marker)
        if index > 0:
            body = body[:index]
            break
    return normalize_text(body)


def body_sentence_candidates(page: dict[str, Any]) -> list[tuple[int, str]]:
    body = trim_page_text_body(page)
    if not body:
        return []
    rows: list[tuple[int, str]] = []
    seen: set[str] = set()
    for index, segment in enumerate(re.split(r"[。！？；]", body)):
        text = normalize_text(segment)
        if len(text) < 12 or len(text) > 240:
            continue
        if text.startswith("http"):
            continue
        if any(marker in text for marker in BODY_NOISE_MARKERS):
            continue
        if text in seen:
            continue
        seen.add(text)
        rows.append((index, text))
    return rows


def has_year_like_text(text: str) -> bool:
    return bool(re.search(r"(公元|年|月|日|\d{3,4})", text))


def title_quote(page: dict[str, Any]) -> str:
    return normalize_text(str(page.get("title") or "")).split("_")[0]


def build_identity_seed(
    *,
    source_policy: dict[str, Any],
    page: dict[str, Any],
    general_id: str | None,
    matched_name: str,
    candidate_person_id: str | None,
) -> dict[str, Any]:
    quote = sentence_candidates(page)[0]
    locator = f"slug={page_slug(str(page.get('url') or ''))};field=title"
    seed_id = stable_hash(source_policy.get("sourceId"), general_id or candidate_person_id, "identity", quote)
    person_fields = {"generalId": general_id} if general_id else {"candidatePersonId": candidate_person_id}
    return {
        "version": "3.0.0",
        "seedId": f"seed:{source_policy['sourceId']}:{general_id or candidate_person_id}:identity:{seed_id}",
        "sourceId": source_policy["sourceId"],
        "sourceFamily": source_policy.get("sourceFamily"),
        "sourceLayer": source_policy.get("sourceLayer"),
        "trustTier": source_policy.get("trustTier"),
        "sourceUrl": page.get("url"),
        "pageTitle": page.get("title"),
        **person_fields,
        "matchedName": matched_name,
        "angleType": "identity",
        "seedText": quote,
        "quote": quote,
        "locator": locator,
        "textHash": page.get("textHash"),
        "hasQuote": True,
        "hasLocator": True,
        "hasTime": has_year_like_text(quote),
        "hasLocation": False,
        "extractionMethod": "deterministic",
        "sourceLiveStatus": page.get("liveStatus"),
        "contentSource": "title",
        "seedConfidenceScore": 0.0,
        "siteReliabilityMultiplier": 1.0,
        "crossSiteMatchCount": 0,
        "promotionTarget": "seed-only",
        "canonicalWrites": False,
    }


def build_extra_seed(
    *,
    source_policy: dict[str, Any],
    page: dict[str, Any],
    general_id: str | None,
    matched_name: str,
    candidate_person_id: str | None,
    angle_type: str,
    quote: str,
    locator_suffix: str,
    content_source: str = "snippet",
    sentence_index: int | None = None,
) -> dict[str, Any]:
    locator = f"slug={page_slug(str(page.get('url') or ''))};field={locator_suffix}"
    if sentence_index is not None:
        locator += f";sentence={sentence_index}"
    seed_id = stable_hash(source_policy.get("sourceId"), general_id or candidate_person_id, angle_type, quote)
    person_fields = {"generalId": general_id} if general_id else {"candidatePersonId": candidate_person_id}
    return {
        "version": "3.0.0",
        "seedId": f"seed:{source_policy['sourceId']}:{general_id or candidate_person_id}:{angle_type}:{seed_id}",
        "sourceId": source_policy["sourceId"],
        "sourceFamily": source_policy.get("sourceFamily"),
        "sourceLayer": source_policy.get("sourceLayer"),
        "trustTier": source_policy.get("trustTier"),
        "sourceUrl": page.get("url"),
        "pageTitle": page.get("title"),
        **person_fields,
        "matchedName": matched_name,
        "angleType": angle_type,
        "seedText": quote,
        "quote": quote,
        "locator": locator,
        "textHash": page.get("textHash"),
        "hasQuote": True,
        "hasLocator": True,
        "hasTime": has_year_like_text(quote),
        "hasLocation": angle_type == "location",
        "extractionMethod": "deterministic",
        "sourceLiveStatus": page.get("liveStatus"),
        "contentSource": content_source,
        "seedConfidenceScore": 0.0,
        "siteReliabilityMultiplier": 1.0,
        "crossSiteMatchCount": 0,
        "promotionTarget": "seed-only",
        "canonicalWrites": False,
    }


def match_name_from_page(page: dict[str, Any], general_id: str | None) -> str:
    title = normalize_text(str(page.get("title") or "")).split("_")[0]
    def looks_like_person_name(value: str) -> bool:
        return bool(re.fullmatch(r"[\u4e00-\u9fff]{2,6}", value))

    if general_id:
        for alias in extract_title_aliases(title):
            if looks_like_person_name(alias):
                return alias
        trad = to_traditional_hint(title)
        for alias in extract_title_aliases(trad):
            if looks_like_person_name(alias):
                return alias
        for alias in extract_title_aliases(trad):
            if alias:
                return alias
    aliases = extract_title_aliases(title)
    return aliases[-1] if aliases else page_slug(str(page.get("url") or ""))


def page_name_variants(page: dict[str, Any], matched_name: str) -> list[str]:
    variants: set[str] = set(extract_title_aliases(str(page.get("title") or "")))
    variants.add(normalize_text(matched_name))
    variants.add(to_traditional_hint(normalize_text(matched_name)))
    variants.add(to_simplified_hint(normalize_text(matched_name)))
    deduped = [value for value in (normalize_text(item) for item in variants) if 1 < len(value) <= 16]
    return sorted(set(deduped), key=len, reverse=True)


def sentence_mentions_name(text: str, name_variants: list[str]) -> bool:
    return any(variant in text for variant in name_variants if variant)


def collect_body_quotes(
    *,
    page: dict[str, Any],
    name_variants: list[str],
    keywords: tuple[str, ...],
    max_count: int = 2,
    fallback_long_sentence: bool = False,
) -> list[tuple[int, str]]:
    matches: list[tuple[int, int, str]] = []
    for sentence_index, text in body_sentence_candidates(page):
        if not sentence_mentions_name(text, name_variants):
            continue
        hit_count = sum(1 for keyword in keywords if keyword in text)
        if hit_count > 0:
            matches.append((hit_count, sentence_index, text))
    if matches or not fallback_long_sentence:
        matches.sort(key=lambda item: (-item[0], item[1], len(item[2])))
        return [(sentence_index, text) for _hit_count, sentence_index, text in matches[:max_count]]
    for sentence_index, text in body_sentence_candidates(page):
        if sentence_mentions_name(text, name_variants) and len(text) >= 28:
            matches.append((0, sentence_index, text))
            if len(matches) >= max_count:
                break
    return [(sentence_index, text) for _hit_count, sentence_index, text in matches[:max_count]]


def build_seeds_for_page(
    *,
    source_policy: dict[str, Any],
    page: dict[str, Any],
    general_id: str | None,
    candidate_person_id: str | None,
) -> list[dict[str, Any]]:
    matched_name = match_name_from_page(page, general_id)
    name_variants = page_name_variants(page, matched_name)
    seeds = [build_identity_seed(source_policy=source_policy, page=page, general_id=general_id, matched_name=matched_name, candidate_person_id=candidate_person_id)]
    sentences = sentence_candidates(page)
    title = title_quote(page)

    relationship_quotes: list[str] = []
    for text in sentences[:6]:
        if any(keyword in text for keyword in RELATIONSHIP_KEYWORDS):
            relationship_quotes.append(text)
    for quote in relationship_quotes[:2]:
        seeds.append(
            build_extra_seed(
                source_policy=source_policy,
                page=page,
                general_id=general_id,
                matched_name=matched_name,
                candidate_person_id=candidate_person_id,
                angle_type="relationship",
                quote=quote,
                locator_suffix="relationship",
                content_source="snippet",
            )
        )

    role_quote = next((text for text in sentences[:4] if any(keyword in text for keyword in TITLE_KEYWORDS)), "")
    if not role_quote and any(keyword in title for keyword in TITLE_KEYWORDS):
        role_quote = title
    if role_quote:
        seeds.append(
            build_extra_seed(
                source_policy=source_policy,
                page=page,
                general_id=general_id,
                matched_name=matched_name,
                candidate_person_id=candidate_person_id,
                angle_type="title",
                quote=role_quote,
                locator_suffix="title",
                content_source="title" if role_quote == title else "snippet",
            )
        )

    trait_quote = ""
    for text in [title, *sentences[:3]]:
        if any(keyword in text for keyword in TRAIT_KEYWORDS):
            trait_quote = text
            break
    if trait_quote:
        seeds.append(
            build_extra_seed(
                source_policy=source_policy,
                page=page,
                general_id=general_id,
                matched_name=matched_name,
                candidate_person_id=candidate_person_id,
                angle_type="trait",
                quote=trait_quote,
                locator_suffix="trait",
                content_source="title" if trait_quote == title else "snippet",
            )
        )

    for sentence_index, quote in collect_body_quotes(
        page=page,
        name_variants=name_variants,
        keywords=EVENT_KEYWORDS,
        max_count=2,
    ):
        seeds.append(
            build_extra_seed(
                source_policy=source_policy,
                page=page,
                general_id=general_id,
                matched_name=matched_name,
                candidate_person_id=candidate_person_id,
                angle_type="event",
                quote=quote,
                locator_suffix="page-text-event",
                content_source="page-text",
                sentence_index=sentence_index,
            )
        )

    for sentence_index, quote in collect_body_quotes(
        page=page,
        name_variants=name_variants,
        keywords=TRAIT_KEYWORDS,
        max_count=2,
    ):
        seeds.append(
            build_extra_seed(
                source_policy=source_policy,
                page=page,
                general_id=general_id,
                matched_name=matched_name,
                candidate_person_id=candidate_person_id,
                angle_type="trait",
                quote=quote,
                locator_suffix="page-text-trait",
                content_source="page-text",
                sentence_index=sentence_index,
            )
        )

    for sentence_index, quote in collect_body_quotes(
        page=page,
        name_variants=name_variants,
        keywords=WORLDBUILDING_KEYWORDS,
        max_count=2,
        fallback_long_sentence=True,
    ):
        seeds.append(
            build_extra_seed(
                source_policy=source_policy,
                page=page,
                general_id=general_id,
                matched_name=matched_name,
                candidate_person_id=candidate_person_id,
                angle_type="worldbuilding_note",
                quote=quote,
                locator_suffix="page-text-worldbuilding",
                content_source="page-text",
                sentence_index=sentence_index,
            )
        )

    deduped: dict[tuple[str, str], dict[str, Any]] = {}
    for row in seeds:
        key = (str(row.get("angleType")), str(row.get("quote")))
        deduped[key] = row
    return list(deduped.values())


def render_markdown(summary: dict[str, Any]) -> str:
    metrics = summary["metrics"]
    lines = [
        "# Harvested Site Evidence Seed Evaluation",
        "",
        f"- Source: `{summary['sourceId']}`",
        f"- Generated At: `{summary['generatedAt']}`",
        f"- canonicalWrites: `{summary['canonicalWrites']}`",
        f"- Page Count: `{metrics['pageCount']}`",
        f"- Seed Count: `{metrics['seedCount']}`",
        f"- Page-text Derived Seeds: `{metrics.get('pageTextSeedCount', 0)}`",
        f"- Canonical Matched Pages: `{metrics['matchedCanonicalPageCount']}`",
        f"- Shadow Pages: `{metrics['shadowPageCount']}`",
        f"- Matched By Slug: `{metrics['matchedBySlugCount']}`",
        f"- Matched By Title Alias: `{metrics['matchedByTitleAliasCount']}`",
        "",
        "## Angle Counts",
        "",
        "| Angle | Count |",
        "| --- | ---: |",
    ]
    for angle, count in sorted((summary["metrics"].get("angleCounts") or {}).items()):
        lines.append(f"| `{angle}` | {count} |")
    lines.extend(
        [
            "",
            "## Sample Pages",
            "",
            "| Page | Match Method | Person | Seed Count |",
            "| --- | --- | --- | ---: |",
        ]
    )
    for row in summary.get("samplePages") or []:
        lines.append(
            f"| {str(row['title']).replace('|', '\\|')} | `{row['matchMethod']}` | `{row['personId']}` | {row['seedCount']} |"
        )
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract deterministic EvidenceSeed rows from harvested biography pages.")
    parser.add_argument("--source-id", default="lishirenwu-sanguorenwu")
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
    output_root = resolve_path(args.output_root)
    source_config_path = resolve_path(args.source_config)
    alias_map_path = resolve_path(args.alias_map)
    scoreboard_path = resolve_path(args.scoreboard_json)
    seeds_path = output_root / "manual-evidence-seeds.jsonl"
    summary_path = output_root / "manual-evidence-seeds-summary.json"
    markdown_path = output_root / "manual-evidence-seeds-summary.zh-TW.md"

    if output_root.exists() and any(output_root.iterdir()) and not args.overwrite:
        raise SystemExit(f"Output root already exists and is not empty: {repo_relative(output_root)}")

    source_policy = load_source_policy(source_config_path, args.source_id)
    pages = list(iter_jsonl(pages_path))
    scoreboard_rows = load_scoreboard_rows(scoreboard_path)
    slug_index = build_slug_index(scoreboard_rows)
    alias_index = build_alias_index(alias_map_path)

    rows: list[dict[str, Any]] = []
    page_reports: list[dict[str, Any]] = []
    matched_by_slug = 0
    matched_by_title_alias = 0
    matched_pages = 0
    shadow_pages = 0

    for page in pages:
        general_id, match_method, _matched_alias = match_general_id(page, slug_index=slug_index, alias_index=alias_index)
        candidate_person_id = None
        if general_id:
            matched_pages += 1
            if match_method == "slug":
                matched_by_slug += 1
            elif match_method == "title-alias":
                matched_by_title_alias += 1
        else:
            shadow_pages += 1
            candidate_person_id = f"shadow:{args.source_id}:{page_slug(str(page.get('url') or ''))}"

        seeds = build_seeds_for_page(
            source_policy=source_policy,
            page=page,
            general_id=general_id,
            candidate_person_id=candidate_person_id,
        )
        rows.extend(seeds)
        page_reports.append(
            {
                "title": page.get("title"),
                "url": page.get("url"),
                "matchMethod": match_method,
                "personId": general_id or candidate_person_id,
                "seedCount": len(seeds),
            }
        )

    rows.sort(key=lambda row: (str(row.get("sourceId")), str(row.get("generalId") or row.get("candidatePersonId")), str(row.get("angleType")), str(row.get("quote"))))
    seed_count = write_jsonl(seeds_path, rows)
    angle_counts = Counter(str(row.get("angleType") or "") for row in rows)
    summary = {
        "version": "3.0.0",
        "generatedAt": utc_now(),
        "mode": "harvested-page-evidence-seed-extraction",
        "sourceId": args.source_id,
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
            "matchedCanonicalPageCount": matched_pages,
            "shadowPageCount": shadow_pages,
            "matchedBySlugCount": matched_by_slug,
            "matchedByTitleAliasCount": matched_by_title_alias,
            "uniqueCanonicalGeneralCount": len({str(row.get("generalId")) for row in rows if row.get("generalId")}),
            "uniqueShadowPersonCount": len({str(row.get("candidatePersonId")) for row in rows if row.get("candidatePersonId")}),
            "angleCounts": dict(sorted(angle_counts.items())),
            "pageTextSeedCount": sum(1 for row in rows if str(row.get("contentSource") or "") == "page-text"),
        },
        "samplePages": page_reports[:20],
        "notes": [
            "Identity seeds are always emitted once per harvested page.",
            "Relationship/title/trait seeds are emitted only when deterministic title or lead-text rules fire.",
            "Shadow pages remain valid EvidenceSeed inputs for later shadow-roster or cross-site pairing.",
        ],
    }
    write_json(summary_path, summary)
    markdown_path.write_text(render_markdown(summary) + "\n", encoding="utf-8")
    sys.stdout.buffer.write((json.dumps(summary, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
