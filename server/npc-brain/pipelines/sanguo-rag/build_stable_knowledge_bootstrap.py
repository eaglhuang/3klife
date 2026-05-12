from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from repo_layout import pipeline_config_path, resolve_repo_root


REPO_ROOT = resolve_repo_root(__file__)
DEFAULT_GENERALS_PATH = Path("assets/resources/data/generals.json")
DEFAULT_MANUAL_ROSTER_PATH = pipeline_config_path(REPO_ROOT, "manual-roster-seeds.json")
DEFAULT_ALIAS_REPORT_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary/alias-review-report.json")
DEFAULT_OBSERVED_MENTIONS_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-mentions.json")
DEFAULT_OBSERVED_SUMMARY_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/observed-mentions/observed-label-summary.json")
DEFAULT_EVENTS_SUMMARY_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/events/events-summary.json")
DEFAULT_8BOOK_MANIFEST_PATH = Path(
    "artifacts/data-pipeline/sanguo-rag/extracted/plaintext-source-candidates/8book-baihua-sanguo-source-manifest.json"
)
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/stable-knowledge-bootstrap")


COMMON_RELATION_LABELS = {
    "夫人", "將軍", "先生", "丞相", "大王", "主公", "陛下", "公", "君", "子", "父", "母", "兄", "弟", "姊", "妹",
}

BASIC_PROFILE_SOURCE_FIELDS = [
    "title",
    "role",
    "source",
    "notes",
    "historicalAnecdote",
    "parentsSummary",
    "ancestorsSummary",
    "storyStripCells",
]


HARD_RELATIONSHIP_SPECS: list[dict[str, Any]] = [
    {
        "type": "sworn_sibling",
        "names": ["劉備", "關羽", "張飛"],
        "sourceRefs": ["001#taoyuan-oath"],
        "eventTags": ["taoyuan_oath"],
        "validFromChapter": 1,
        "confidence": 0.98,
        "status": "ready",
    },
    {"type": "parent_child", "fromName": "曹操", "toName": "曹丕", "sourceRefs": ["068#succession"], "confidence": 0.95},
    {"type": "parent_child", "fromName": "曹操", "toName": "曹植", "sourceRefs": ["079#succession"], "confidence": 0.95},
    {"type": "parent_child", "fromName": "曹操", "toName": "曹彰", "sourceRefs": ["079#succession"], "confidence": 0.93},
    {"type": "parent_child", "fromName": "曹操", "toName": "曹昂", "sourceRefs": ["016#wan-cheng"], "confidence": 0.93},
    {"type": "parent_child", "fromName": "曹丕", "toName": "曹睿", "sourceRefs": ["086#wei-succession"], "confidence": 0.9},
    {"type": "parent_child", "fromName": "孫堅", "toName": "孫策", "sourceRefs": ["007#jiangdong"], "confidence": 0.96},
    {"type": "parent_child", "fromName": "孫堅", "toName": "孫權", "sourceRefs": ["029#jiangdong"], "confidence": 0.96},
    {"type": "sibling", "fromName": "孫策", "toName": "孫權", "sourceRefs": ["029#jiangdong"], "confidence": 0.95},
    {"type": "parent_child", "fromName": "劉備", "toName": "劉禪", "sourceRefs": ["041#changban-a-dou"], "confidence": 0.94},
    {"type": "spouse", "fromName": "劉備", "toName": "孫尚香", "sourceRefs": ["054#marriage-alliance"], "confidence": 0.94},
    {"type": "parent_child", "fromName": "關羽", "toName": "關興", "sourceRefs": ["077#next-generation"], "confidence": 0.9},
    {"type": "parent_child", "fromName": "關羽", "toName": "關平", "sourceRefs": ["077#maicheng"], "confidence": 0.88},
    {"type": "parent_child", "fromName": "張飛", "toName": "張苞", "sourceRefs": ["081#next-generation"], "confidence": 0.9},
    {"type": "parent_child", "fromName": "劉表", "toName": "劉琦", "sourceRefs": ["034#jingzhou-family"], "confidence": 0.9},
    {"type": "parent_child", "fromName": "劉表", "toName": "劉琮", "sourceRefs": ["040#jingzhou-succession"], "confidence": 0.9},
    {"type": "sibling", "fromName": "劉琦", "toName": "劉琮", "sourceRefs": ["040#jingzhou-succession"], "confidence": 0.86},
    {"type": "parent_child", "fromName": "丁原", "toName": "呂布", "sourceRefs": ["003#ding-yuan"], "confidence": 0.84, "validToChapter": 3},
    {"type": "parent_child", "fromName": "董卓", "toName": "呂布", "sourceRefs": ["003#dong-zhuo-lu-bu"], "confidence": 0.84, "validFromChapter": 3, "validToChapter": 9},
    {"type": "parent_child", "fromName": "司馬懿", "toName": "司馬師", "sourceRefs": ["107#sima-family"], "confidence": 0.94},
    {"type": "parent_child", "fromName": "司馬懿", "toName": "司馬昭", "sourceRefs": ["107#sima-family"], "confidence": 0.94},
    {"type": "sibling", "fromName": "司馬師", "toName": "司馬昭", "sourceRefs": ["107#sima-family"], "confidence": 0.92},
    {"type": "parent_child", "fromName": "司馬昭", "toName": "司馬炎", "sourceRefs": ["119#jin-succession"], "confidence": 0.94},
    {"type": "parent_child", "fromName": "諸葛亮", "toName": "諸葛瞻", "sourceRefs": ["117#zhuge-family"], "confidence": 0.92},
    {"type": "parent_child", "fromName": "袁紹", "toName": "袁譚", "sourceRefs": ["032#yuan-family"], "confidence": 0.9},
    {"type": "parent_child", "fromName": "袁紹", "toName": "袁尚", "sourceRefs": ["032#yuan-family"], "confidence": 0.9},
    {"type": "sibling", "fromName": "袁譚", "toName": "袁尚", "sourceRefs": ["032#yuan-family"], "confidence": 0.88},
    {"type": "parent_child", "fromName": "孫權", "toName": "孫亮", "sourceRefs": ["108#wu-succession"], "confidence": 0.88},
]


FACTION_TIMELINE_SPECS: list[dict[str, Any]] = [
    {
        "name": "張遼",
        "intervals": [
            {"faction": "lu-bu", "validToChapter": 19, "evidenceRefs": ["019#bai-men-lou"], "confidence": 0.85},
            {"faction": "wei", "validFromChapter": 19, "evidenceRefs": ["019#bai-men-lou"], "confidence": 0.9},
        ],
    },
    {
        "name": "姜維",
        "intervals": [
            {"faction": "wei", "validToChapter": 93, "evidenceRefs": ["093#jiang-wei-surrenders"], "confidence": 0.82},
            {"faction": "shu", "validFromChapter": 93, "evidenceRefs": ["093#jiang-wei-surrenders"], "confidence": 0.92},
        ],
    },
    {
        "name": "司馬炎",
        "intervals": [
            {"faction": "jin", "validFromChapter": 119, "evidenceRefs": ["119#jin-usurpation"], "confidence": 0.95},
        ],
    },
    {
        "name": "呂布",
        "intervals": [
            {"faction": "ding-yuan", "validToChapter": 3, "evidenceRefs": ["003#ding-yuan"], "confidence": 0.8},
            {"faction": "dong-zhuo", "validFromChapter": 3, "validToChapter": 9, "evidenceRefs": ["003#dong-zhuo-lu-bu", "009#wang-yun"], "confidence": 0.85},
            {"faction": "lu-bu", "validFromChapter": 9, "validToChapter": 19, "evidenceRefs": ["019#bai-men-lou"], "confidence": 0.88},
        ],
    },
    {
        "name": "馬超",
        "intervals": [
            {"faction": "ma-family", "validToChapter": 64, "evidenceRefs": ["064#ma-chao-joins-liu-bei"], "confidence": 0.82},
            {"faction": "shu", "validFromChapter": 64, "evidenceRefs": ["064#ma-chao-joins-liu-bei"], "confidence": 0.9},
        ],
    },
    {
        "name": "法正",
        "intervals": [
            {"faction": "liu-zhang", "validToChapter": 60, "evidenceRefs": ["060#fa-zheng-to-shu"], "confidence": 0.82},
            {"faction": "shu", "validFromChapter": 60, "evidenceRefs": ["060#fa-zheng-to-shu"], "confidence": 0.9},
        ],
    },
]


EVENT_LOCATION_SEEDS: list[dict[str, Any]] = [
    {
        "eventTag": "taoyuan_oath",
        "chapterRange": [1, 1],
        "locationNames": ["涿郡", "桃園"],
        "participantNames": ["劉備", "關羽", "張飛"],
        "relationTypes": ["sworn_sibling"],
        "confidence": 0.98,
    },
    {
        "eventTag": "hulao_pass_battle",
        "chapterRange": [5, 5],
        "locationNames": ["虎牢關"],
        "participantNames": ["劉備", "關羽", "張飛", "呂布", "董卓"],
        "relationTypes": ["confronts", "allies"],
        "confidence": 0.9,
    },
    {
        "eventTag": "guandu_battle",
        "chapterRange": [30, 30],
        "locationNames": ["官渡", "烏巢"],
        "participantNames": ["曹操", "袁紹", "許攸"],
        "relationTypes": ["confronts", "betrayal_surrender"],
        "confidence": 0.9,
    },
    {
        "eventTag": "chibi_battle",
        "chapterRange": [43, 50],
        "locationNames": ["赤壁", "三江口", "華容道"],
        "participantNames": ["曹操", "孫權", "周瑜", "魯肅", "諸葛亮", "關羽"],
        "relationTypes": ["allies", "confronts"],
        "confidence": 0.92,
    },
    {
        "eventTag": "changban_slope_bridge",
        "chapterRange": [41, 42],
        "locationNames": ["長坂坡", "長坂橋", "漢津口"],
        "participantNames": ["劉備", "張飛", "趙雲", "劉禪", "曹操"],
        "relationTypes": ["retreat_pursuit", "confronts"],
        "confidence": 0.92,
    },
    {
        "eventTag": "liu_bei_sun_marriage_alliance",
        "chapterRange": [54, 55],
        "locationNames": ["東吳", "甘露寺"],
        "participantNames": ["劉備", "孫尚香", "孫權", "周瑜"],
        "relationTypes": ["spouse", "marriage_alliance"],
        "confidence": 0.9,
    },
    {
        "eventTag": "yiling_battle",
        "chapterRange": [81, 84],
        "locationNames": ["夷陵", "猇亭"],
        "participantNames": ["劉備", "孫權"],
        "relationTypes": ["confronts"],
        "confidence": 0.88,
    },
    {
        "eventTag": "wuzhang_plain",
        "chapterRange": [103, 104],
        "locationNames": ["五丈原"],
        "participantNames": ["諸葛亮", "司馬懿", "姜維"],
        "relationTypes": ["confronts", "mentor_student"],
        "confidence": 0.9,
    },
    {
        "eventTag": "three_kingdoms_to_jin",
        "chapterRange": [119, 120],
        "locationNames": ["洛陽", "石頭城", "建業"],
        "participantNames": ["司馬炎", "孫權"],
        "relationTypes": ["surrender", "dynastic_unification"],
        "confidence": 0.86,
    },
    {
        "eventTag": "baimenlou_surrender",
        "chapterRange": [19, 19],
        "locationNames": ["下邳", "白門樓"],
        "participantNames": ["曹操", "劉備", "呂布", "張遼", "陳宮", "高順"],
        "relationTypes": ["confronts", "betrayal_surrender"],
        "confidence": 0.9,
    },
    {
        "eventTag": "jingzhou_succession",
        "chapterRange": [40, 41],
        "locationNames": ["荊州", "襄陽"],
        "participantNames": ["劉表", "劉琦", "劉琮", "劉備", "曹操"],
        "relationTypes": ["parent_child", "sibling", "ruler_subject", "surrender"],
        "confidence": 0.86,
    },
    {
        "eventTag": "longzhong_recruitment",
        "chapterRange": [37, 38],
        "locationNames": ["隆中", "臥龍岡"],
        "participantNames": ["劉備", "諸葛亮", "關羽", "張飛"],
        "relationTypes": ["recruitment_visit", "strategist_advisor"],
        "confidence": 0.9,
    },
    {
        "eventTag": "luofengpo_pangtong",
        "chapterRange": [63, 63],
        "locationNames": ["落鳳坡", "雒城"],
        "participantNames": ["劉備", "龐統"],
        "relationTypes": ["deployment", "grief_regret"],
        "confidence": 0.86,
    },
    {
        "eventTag": "dingjunshan_battle",
        "chapterRange": [70, 71],
        "locationNames": ["定軍山"],
        "participantNames": ["黃忠", "曹操"],
        "relationTypes": ["confronts", "battle_duel"],
        "confidence": 0.86,
    },
    {
        "eventTag": "maicheng_guanyu",
        "chapterRange": [76, 77],
        "locationNames": ["麥城", "臨沮"],
        "participantNames": ["關羽", "孫權", "呂蒙"],
        "relationTypes": ["confronts", "retreat_pursuit"],
        "confidence": 0.88,
    },
    {
        "eventTag": "nanman_campaign",
        "chapterRange": [87, 90],
        "locationNames": ["南中", "瀘水"],
        "participantNames": ["諸葛亮", "孟獲"],
        "relationTypes": ["confronts", "mercy_compassion", "negotiate_surrender"],
        "confidence": 0.86,
    },
    {
        "eventTag": "jieting_masu",
        "chapterRange": [95, 96],
        "locationNames": ["街亭"],
        "participantNames": ["諸葛亮", "馬謖", "司馬懿"],
        "relationTypes": ["deployment", "law_order"],
        "confidence": 0.86,
    },
]


SOCIAL_ROLE_SEEDS: list[dict[str, Any]] = [
    {"name": "曹操", "roleActivityTags": ["warlord_ruler", "general_commander", "strategist_advisor"], "decisionWeightHints": ["prefers_battle", "prefers_governance"]},
    {"name": "劉備", "roleActivityTags": ["warlord_ruler", "general_commander"], "decisionWeightHints": ["values_loyalty", "protects_family"]},
    {"name": "關羽", "roleActivityTags": ["general_commander", "soldier_guard"], "decisionWeightHints": ["prefers_battle", "values_loyalty"]},
    {"name": "張飛", "roleActivityTags": ["general_commander", "soldier_guard"], "decisionWeightHints": ["prefers_battle", "values_loyalty"]},
    {"name": "孫權", "roleActivityTags": ["warlord_ruler", "diplomacy_speech"], "decisionWeightHints": ["prefers_diplomacy", "prefers_governance"]},
    {"name": "孫堅", "roleActivityTags": ["warlord_ruler", "general_commander"], "decisionWeightHints": ["prefers_battle"]},
    {"name": "孫策", "roleActivityTags": ["warlord_ruler", "general_commander"], "decisionWeightHints": ["prefers_battle"]},
    {"name": "袁紹", "roleActivityTags": ["warlord_ruler"], "decisionWeightHints": ["prefers_battle"]},
    {"name": "袁術", "roleActivityTags": ["warlord_ruler"], "decisionWeightHints": ["prefers_battle"]},
    {"name": "董卓", "roleActivityTags": ["warlord_ruler", "general_commander"], "decisionWeightHints": ["prefers_battle"]},
    {"name": "呂布", "roleActivityTags": ["general_commander", "outlaw_mercenary"], "decisionWeightHints": ["prefers_battle", "seeks_revenge"]},
    {"name": "諸葛亮", "roleActivityTags": ["strategist_advisor", "civil_governance", "craft_engineering"], "decisionWeightHints": ["prefers_governance", "prefers_diplomacy"]},
    {"name": "周瑜", "roleActivityTags": ["general_commander", "strategist_advisor"], "decisionWeightHints": ["prefers_battle"]},
    {"name": "魯肅", "roleActivityTags": ["strategist_advisor", "diplomacy_speech"], "decisionWeightHints": ["prefers_diplomacy"]},
    {"name": "司馬懿", "roleActivityTags": ["strategist_advisor", "general_commander"], "decisionWeightHints": ["prefers_strategy", "avoids_risk"]},
    {"name": "司馬炎", "roleActivityTags": ["warlord_ruler", "official_bureaucrat"], "decisionWeightHints": ["prefers_governance"]},
    {"name": "趙雲", "roleActivityTags": ["general_commander", "soldier_guard"], "decisionWeightHints": ["values_loyalty", "protects_family"]},
    {"name": "黃忠", "roleActivityTags": ["general_commander", "soldier_guard"], "decisionWeightHints": ["prefers_battle"]},
    {"name": "馬超", "roleActivityTags": ["general_commander", "outlaw_mercenary"], "decisionWeightHints": ["prefers_battle", "seeks_revenge"]},
    {"name": "魏延", "roleActivityTags": ["general_commander", "soldier_guard"], "decisionWeightHints": ["prefers_battle"]},
    {"name": "龐統", "roleActivityTags": ["strategist_advisor", "diplomacy_speech"], "decisionWeightHints": ["prefers_strategy", "prefers_diplomacy"]},
    {"name": "姜維", "roleActivityTags": ["general_commander", "strategist_advisor"], "decisionWeightHints": ["prefers_battle", "values_loyalty"]},
    {"name": "陸遜", "roleActivityTags": ["general_commander", "strategist_advisor"], "decisionWeightHints": ["prefers_strategy", "prefers_governance"]},
    {"name": "呂蒙", "roleActivityTags": ["general_commander", "soldier_guard"], "decisionWeightHints": ["prefers_battle", "values_loyalty"]},
    {"name": "荀彧", "roleActivityTags": ["strategist_advisor", "official_bureaucrat"], "decisionWeightHints": ["prefers_governance"]},
    {"name": "郭嘉", "roleActivityTags": ["strategist_advisor"], "decisionWeightHints": ["prefers_strategy"]},
    {"name": "法正", "roleActivityTags": ["strategist_advisor", "diplomacy_speech"], "decisionWeightHints": ["prefers_strategy", "prefers_diplomacy"]},
    {"name": "許攸", "roleActivityTags": ["strategist_advisor", "diplomacy_speech"], "decisionWeightHints": ["prefers_strategy", "prefers_diplomacy"]},
    {"name": "陳宮", "roleActivityTags": ["strategist_advisor", "official_bureaucrat"], "decisionWeightHints": ["prefers_strategy"]},
    {"name": "王允", "roleActivityTags": ["official_bureaucrat", "strategist_advisor"], "decisionWeightHints": ["prefers_governance", "prefers_strategy"]},
    {"name": "孟獲", "roleActivityTags": ["warlord_ruler", "general_commander"], "decisionWeightHints": ["prefers_battle", "values_autonomy"]},
    {"name": "馬謖", "roleActivityTags": ["strategist_advisor", "general_commander"], "decisionWeightHints": ["prefers_strategy"]},
    {"name": "劉禪", "roleActivityTags": ["warlord_ruler", "official_bureaucrat"], "decisionWeightHints": ["prefers_governance"]},
    {"name": "曹睿", "roleActivityTags": ["warlord_ruler", "official_bureaucrat"], "decisionWeightHints": ["prefers_governance"]},
    {"name": "劉琦", "roleActivityTags": ["official_bureaucrat"], "decisionWeightHints": ["protects_family"]},
    {"name": "劉琮", "roleActivityTags": ["official_bureaucrat"], "decisionWeightHints": ["avoids_risk"]},
    {"name": "關平", "roleActivityTags": ["general_commander", "soldier_guard"], "decisionWeightHints": ["values_loyalty", "protects_family"]},
    {"name": "高順", "roleActivityTags": ["general_commander", "soldier_guard"], "decisionWeightHints": ["values_loyalty", "prefers_battle"]},
    {"name": "丁原", "roleActivityTags": ["warlord_ruler", "official_bureaucrat"], "decisionWeightHints": ["prefers_governance"]},
]


TIME_SCOPED_ALIAS_HINTS: list[dict[str, Any]] = [
    {
        "alias": "子敬",
        "hints": [
            {"generalName": "魯肅", "chapterRange": [29, 57], "coMentionNames": ["周瑜", "孫權", "諸葛亮"], "confidence": 0.85},
            {"generalName": "孟達", "chapterRange": [62, 100], "coMentionNames": ["劉備", "諸葛亮", "司馬懿"], "confidence": 0.65},
        ],
    },
    {
        "alias": "子遠",
        "hints": [
            {"generalName": "許攸", "chapterRange": [30, 33], "coMentionNames": ["曹操", "袁紹"], "confidence": 0.85},
            {"generalName": "孫峻", "chapterRange": [107, 112], "coMentionNames": ["孫權", "司馬昭"], "confidence": 0.7},
        ],
    },
    {
        "alias": "安國",
        "hints": [
            {"generalName": "關興", "chapterRange": [77, 83], "coMentionNames": ["張苞", "關羽"], "confidence": 0.75},
        ],
        "negativeRule": "Do not resolve 安國 as 關興 outside next-generation Shu contexts without co-mention evidence.",
    },
]


KNOWN_FEMALE_NAMES = {
    "王異", "貂蟬", "大喬", "小喬", "甄姬", "甄氏", "孫尚香", "孫夫人", "蔡琰", "蔡文姬", "黃月英",
    "張春華", "辛憲英", "步練師", "關銀屏", "呂玲綺", "馬雲騄", "董白", "樊氏", "卞夫人", "吳國太",
    "郭女王", "王元姬", "夏侯氏", "夏侯令女", "甘氏", "甘夫人", "糜氏", "糜夫人", "麋夫人", "曹節",
    "孫魯班", "孫魯育", "趙娥", "羊徽瑜", "祝融夫人", "鮑三娘", "花鬘", "蔡氏", "曹華", "曹憲", "徐氏",
}


FEMALE_PROFILE_OVERRIDES: dict[str, dict[str, Any]] = {
    "貂蟬": {"archetype": "political_sacrificial_agent", "affectTags": ["romance_love", "grief_regret", "fear_shame"], "personalityTags": ["observant", "controlled", "high-agency-under-pressure"], "interactionPriorities": ["hidden_agency", "loyalty_conflict", "dangerous_romance"], "relationshipFocusNames": ["王允", "董卓", "呂布"], "eventHooks": ["連環計", "宴席試探", "義父託付"]},
    "孫尚香": {"archetype": "martial_marriage_alliance", "affectTags": ["romance_love", "family_affection", "anger_revenge"], "personalityTags": ["martial", "autonomous", "faction-torn"], "interactionPriorities": ["marriage_alliance", "faction_loyalty_conflict", "armed_household"], "relationshipFocusNames": ["劉備", "孫權", "周瑜"], "eventHooks": ["東吳聯姻", "甘露寺", "歸吳"]},
    "蔡琰": {"archetype": "exile_literary_survivor", "affectTags": ["grief_regret", "family_affection"], "personalityTags": ["literary", "trauma-bearing", "resilient"], "interactionPriorities": ["exile_memory", "literary_healing", "homecoming"], "relationshipFocusNames": ["曹操"], "eventHooks": ["塞外流離", "歸漢", "胡笳哀音"]},
    "黃月英": {"archetype": "craft_engineering_partner", "affectTags": ["friendship_loyalty", "ambition_pride"], "personalityTags": ["inventive", "practical", "strategic"], "interactionPriorities": ["craft_engineering", "strategic_partner", "shared_invention"], "relationshipFocusNames": ["諸葛亮"], "eventHooks": ["木牛流馬", "器械討論", "臥龍家室"]},
    "大喬": {"archetype": "jiangdong_household_anchor", "affectTags": ["romance_love", "family_affection"], "personalityTags": ["stabilizing", "dignified", "low-profile"], "interactionPriorities": ["household_diplomacy", "post-war_stability"], "relationshipFocusNames": ["孫策", "小喬"], "eventHooks": ["皖城", "喬氏聯姻", "江東家門"]},
    "小喬": {"archetype": "dufu_emotional_anchor", "affectTags": ["romance_love", "fear_shame"], "personalityTags": ["sensitive", "rhythmic", "composed"], "interactionPriorities": ["wartime_support", "musical_sensitivity", "red-cliff_shadow"], "relationshipFocusNames": ["周瑜", "大喬"], "eventHooks": ["赤壁前夜", "都督府", "喬氏聯姻"]},
    "甄姬": {"archetype": "palace_survivor", "affectTags": ["grief_regret", "fear_shame"], "personalityTags": ["reserved", "elegant", "survival-minded"], "interactionPriorities": ["palace_pressure", "silence_as_strategy", "northern_noble_transition"], "relationshipFocusNames": ["曹丕", "曹操"], "eventHooks": ["河北名門", "入魏宮", "洛神傳說"]},
    "王異": {"archetype": "defensive_warrior_spouse", "affectTags": ["family_affection", "anger_revenge"], "personalityTags": ["decisive", "defensive", "tactical"], "interactionPriorities": ["defend_city", "spousal_strategy", "revenge_against_ma_chao"], "relationshipFocusNames": ["馬超"], "eventHooks": ["冀城守城", "九條奇計", "祁山堅守"]},
    "張春華": {"archetype": "cold_household_political_operator", "affectTags": ["fear_shame", "ambition_pride"], "personalityTags": ["cold-judgment", "protective", "secretive"], "interactionPriorities": ["household_secrecy", "sima_family_survival"], "relationshipFocusNames": ["司馬懿", "司馬師", "司馬昭"], "eventHooks": ["司馬家門", "掩鋒", "深宅政治"]},
    "辛憲英": {"archetype": "political_foresight_advisor", "affectTags": ["family_affection", "fear_shame"], "personalityTags": ["foresight", "calm", "principled"], "interactionPriorities": ["political_warning", "family_counsel"], "relationshipFocusNames": ["曹爽", "司馬懿"], "eventHooks": ["察曹爽", "勸弟", "局勢預判"]},
    "步練師": {"archetype": "palace_harmony_keeper", "affectTags": ["romance_love", "family_affection"], "personalityTags": ["gentle", "restrained", "harmonizing"], "interactionPriorities": ["palace_harmony", "quiet_influence"], "relationshipFocusNames": ["孫權"], "eventHooks": ["東吳後宮", "宮中節制"]},
    "關銀屏": {"archetype": "lineage_warrior_daughter", "affectTags": ["family_affection", "ambition_pride"], "personalityTags": ["martial", "dutiful", "proud"], "interactionPriorities": ["lineage_duty", "battle_training"], "relationshipFocusNames": ["關羽", "關平"], "eventHooks": ["關家虎女", "後世補敘"]},
    "呂玲綺": {"archetype": "lonely_warrior_daughter", "affectTags": ["family_affection", "anger_revenge"], "personalityTags": ["sharp", "isolated", "fast"], "interactionPriorities": ["father_shadow", "warrior_identity"], "relationshipFocusNames": ["呂布"], "eventHooks": ["飛將之女", "後世補完"]},
    "馬雲騄": {"archetype": "xiliang_cavalry_heroine", "affectTags": ["ambition_pride", "romance_love"], "personalityTags": ["brisk", "mounted", "independent"], "interactionPriorities": ["cavalry_training", "frontier_identity", "romance_variant"], "relationshipFocusNames": ["馬超", "趙雲"], "eventHooks": ["西涼馬氏", "女騎", "後世補完"]},
    "祝融夫人": {"archetype": "nanman_warrior_queen", "affectTags": ["ambition_pride", "romance_love"], "personalityTags": ["fierce", "tribal-pride", "honor-bound"], "interactionPriorities": ["duel_capture", "tribal_alliance", "spousal_battle_pair"], "relationshipFocusNames": ["孟獲", "諸葛亮", "馬岱"], "eventHooks": ["南征", "飛刀", "七擒七縱"]},
    "徐氏": {"archetype": "revenge_planner_widow", "affectTags": ["grief_regret", "anger_revenge"], "personalityTags": ["patient", "vengeful", "planner"], "interactionPriorities": ["revenge_plot", "false_submission", "widow_agency"], "relationshipFocusNames": ["孫權"], "eventHooks": ["孫翊之死", "宴席復仇", "烈婦"]},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build conservative stable knowledge bootstrap seeds for Sanguo RAG review gates.")
    parser.add_argument("--generals", default=str(DEFAULT_GENERALS_PATH), help="generals.json path")
    parser.add_argument("--manual-roster", default=str(DEFAULT_MANUAL_ROSTER_PATH), help="manual-roster-seeds.json path")
    parser.add_argument("--alias-report", default=str(DEFAULT_ALIAS_REPORT_PATH), help="alias-review-report.json path")
    parser.add_argument("--observed-mentions", default=str(DEFAULT_OBSERVED_MENTIONS_PATH), help="observed-mentions.json path")
    parser.add_argument("--observed-summary", default=str(DEFAULT_OBSERVED_SUMMARY_PATH), help="observed-label-summary.json path")
    parser.add_argument("--events-summary", default=str(DEFAULT_EVENTS_SUMMARY_PATH), help="events-summary.json path")
    parser.add_argument("--8book-manifest", default=str(DEFAULT_8BOOK_MANIFEST_PATH), help="8book source manifest path")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory")
    parser.add_argument("--overwrite", action="store_true", help="Allow overwriting existing outputs")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def bounded_unique(values: list[str], limit: int) -> list[str]:
    result: list[str] = []
    for value in values:
        item = str(value or "").strip()
        if item and item not in result:
            result.append(item)
        if len(result) >= limit:
            break
    return result


def person_plain_text(person: dict[str, Any]) -> str:
    story_text = " / ".join(str(cell.get("text") or "") for cell in person.get("storyStripCells") or [])
    return "\n".join(
        str(part or "")
        for part in [
            person.get("title"),
            person.get("role"),
            person.get("source"),
            person.get("notes"),
            person.get("historicalAnecdote"),
            person.get("parentsSummary"),
            person.get("ancestorsSummary"),
            story_text,
        ]
    )


def load_observed_mentions(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    payload = read_json(path)
    rows = payload.get("data") if isinstance(payload, dict) else payload
    return rows if isinstance(rows, list) else []


def build_observed_general_stats(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    stats: dict[str, dict[str, Any]] = {}
    for row in rows:
        general_ids = sorted(set((row.get("matchedGeneralIds") or []) + (row.get("sceneParticipants") or [])))
        if not general_ids:
            continue
        chapter_no = row.get("chapterNo")
        source_ref = str(row.get("sourceRef") or "").strip()
        label = str(row.get("label") or row.get("normalized") or "").strip()
        for general_id in general_ids:
            bucket = stats.setdefault(
                str(general_id),
                {"mentionCount": 0, "chapters": set(), "labels": Counter(), "sourceRefs": []},
            )
            bucket["mentionCount"] += 1
            if isinstance(chapter_no, int):
                bucket["chapters"].add(chapter_no)
            if label:
                bucket["labels"][label] += 1
            if source_ref and source_ref not in bucket["sourceRefs"] and len(bucket["sourceRefs"]) < 12:
                bucket["sourceRefs"].append(source_ref)

    normalized: dict[str, dict[str, Any]] = {}
    for general_id, bucket in stats.items():
        chapters = sorted(bucket["chapters"])
        normalized[general_id] = {
            "mentionCount": bucket["mentionCount"],
            "firstChapter": chapters[0] if chapters else None,
            "lastChapter": chapters[-1] if chapters else None,
            "chapterCount": len(chapters),
            "topLabels": [label for label, _count in bucket["labels"].most_common(8)],
            "sourceRefs": bucket["sourceRefs"],
        }
    return normalized


def ensure_output_root(path: Path, overwrite: bool) -> None:
    path.mkdir(parents=True, exist_ok=True)
    outputs = [path / "stable-knowledge-bootstrap.json", path / "stable-knowledge-bootstrap.md"]
    existing = [item for item in outputs if item.exists()]
    if existing and not overwrite:
        raise FileExistsError(f"Output already exists. Re-run with --overwrite: {existing}")


def load_people(generals_path: Path, manual_roster_path: Path) -> list[dict[str, Any]]:
    people = []
    for raw in read_json(generals_path):
        record = dict(raw)
        record["generalId"] = record.get("id")
        record["sourceLayer"] = "generals"
        people.append(record)
    if manual_roster_path.exists():
        for raw in (read_json(manual_roster_path).get("entries") or []):
            record = dict(raw)
            record["id"] = record.get("generalId")
            record["sourceLayer"] = "manual-roster"
            people.append(record)
    return people


def build_name_index(people: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    for person in people:
        general_id = str(person.get("generalId") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not general_id or not name:
            continue
        labels = [name] + [str(alias).strip() for alias in (person.get("alias") or []) if str(alias).strip()]
        for label in labels:
            index.setdefault(label, person)
    return index


def resolve_name(name: str, index: dict[str, dict[str, Any]]) -> dict[str, Any] | None:
    person = index.get(name)
    if not person:
        return None
    return {
        "generalId": person.get("generalId") or person.get("id"),
        "name": person.get("name"),
        "baseFaction": person.get("faction"),
    }


def edge_key(edge: dict[str, Any]) -> tuple[str, str, str]:
    return (str(edge.get("fromId")), str(edge.get("toId")), str(edge.get("type")))


def add_edge(edges: list[dict[str, Any]], edge: dict[str, Any], seen: set[tuple[str, str, str]]) -> None:
    key = edge_key(edge)
    if key in seen:
        return
    seen.add(key)
    edges.append(edge)


def build_relationship_edges(index: dict[str, dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    edges: list[dict[str, Any]] = []
    missing: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    symmetric_types = {"sworn_sibling", "sibling", "spouse"}

    for spec in HARD_RELATIONSHIP_SPECS:
        if spec.get("names"):
            names = spec["names"]
            resolved = [resolve_name(name, index) for name in names]
            if any(item is None for item in resolved):
                missing.append({"kind": "relationship", "spec": spec, "missingNames": [name for name, item in zip(names, resolved) if item is None]})
                continue
            for i, left in enumerate(resolved):
                for right in resolved[i + 1 :]:
                    for from_item, to_item in ((left, right), (right, left)):
                        add_edge(
                            edges,
                            {
                                "fromId": from_item["generalId"],
                                "toId": to_item["generalId"],
                                "type": spec["type"],
                                "evidenceRefs": spec.get("sourceRefs") or [],
                                "eventTags": spec.get("eventTags") or [],
                                "validFromChapter": spec.get("validFromChapter"),
                                "validToChapter": spec.get("validToChapter"),
                                "edgeConfidence": spec.get("confidence", 0.9),
                                "reviewStatus": spec.get("status", "ready"),
                                "sourceLayer": "stable-bootstrap-seed",
                            },
                            seen,
                        )
            continue

        left = resolve_name(spec["fromName"], index)
        right = resolve_name(spec["toName"], index)
        if not left or not right:
            missing.append(
                {
                    "kind": "relationship",
                    "spec": spec,
                    "missingNames": [name for name, item in ((spec["fromName"], left), (spec["toName"], right)) if item is None],
                }
            )
            continue
        pairs = [(left, right)]
        if spec["type"] in symmetric_types:
            pairs.append((right, left))
        for from_item, to_item in pairs:
            add_edge(
                edges,
                {
                    "fromId": from_item["generalId"],
                    "toId": to_item["generalId"],
                    "type": spec["type"],
                    "evidenceRefs": spec.get("sourceRefs") or [],
                    "eventTags": spec.get("eventTags") or [],
                    "validFromChapter": spec.get("validFromChapter"),
                    "validToChapter": spec.get("validToChapter"),
                    "edgeConfidence": spec.get("confidence", 0.9),
                    "reviewStatus": spec.get("status", "ready"),
                    "sourceLayer": "stable-bootstrap-seed",
                },
                seen,
            )
    return edges, missing


def build_parent_summary_edges(people: list[dict[str, Any]], index: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    edges = []
    for child in people:
        child_id = str(child.get("generalId") or child.get("id") or "").strip()
        child_name = str(child.get("name") or "").strip()
        parents_summary = str(child.get("parentsSummary") or "").strip()
        if not child_id or not child_name or not parents_summary:
            continue
        match = re.search(r"父[:：]\s*([^\s／/、，,（(]+)", parents_summary)
        if not match:
            continue
        father_name = match.group(1).replace("氏", "").strip()
        if not father_name or father_name in {"不明", "未知"} or "🔒" in father_name:
            continue
        father = resolve_name(father_name, index)
        if not father or father.get("generalId") == child_id:
            continue
        edges.append(
            {
                "fromId": father["generalId"],
                "toId": child_id,
                "type": "parent_child",
                "evidenceRefs": [f"generals.parentsSummary:{child_id}"],
                "eventTags": ["parent_summary"],
                "edgeConfidence": 0.78,
                "reviewStatus": "ready",
                "sourceLayer": "generals-parent-summary",
            }
        )
    return edges


def resolve_names(names: list[str], index: dict[str, dict[str, Any]]) -> tuple[list[str], list[str]]:
    ids: list[str] = []
    missing: list[str] = []
    for name in names:
        resolved = resolve_name(name, index)
        if resolved:
            ids.append(str(resolved["generalId"]))
        else:
            missing.append(name)
    return sorted(set(ids)), missing


def build_event_location_seeds(index: dict[str, dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    seeds = []
    missing = []
    for spec in EVENT_LOCATION_SEEDS:
        participant_ids, missing_names = resolve_names(spec.get("participantNames") or [], index)
        seed = {
            "eventTag": spec["eventTag"],
            "chapterRange": spec["chapterRange"],
            "locationNames": spec["locationNames"],
            "participantIds": participant_ids,
            "relationTypes": spec.get("relationTypes") or [],
            "confidence": spec.get("confidence", 0.8),
            "reviewStatus": "ready" if not missing_names else "needs-id-coverage",
            "sourceLayer": "stable-bootstrap-seed",
        }
        seeds.append(seed)
        if missing_names:
            missing.append({"kind": "event-location", "eventTag": spec["eventTag"], "missingNames": missing_names})
    return seeds, missing


def build_faction_timeline(index: dict[str, dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    timelines = []
    missing = []
    for spec in FACTION_TIMELINE_SPECS:
        resolved = resolve_name(spec["name"], index)
        if not resolved:
            missing.append({"kind": "faction-timeline", "missingName": spec["name"]})
            continue
        timelines.append(
            {
                "generalId": resolved["generalId"],
                "name": resolved["name"],
                "baseFaction": resolved.get("baseFaction"),
                "intervals": spec["intervals"],
                "reviewStatus": "review-only",
                "sourceLayer": "stable-bootstrap-seed",
            }
        )
    return timelines, missing


def build_social_roles(index: dict[str, dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    roles = []
    missing = []
    for spec in SOCIAL_ROLE_SEEDS:
        resolved = resolve_name(spec["name"], index)
        if not resolved:
            missing.append({"kind": "social-role", "missingName": spec["name"]})
            continue
        roles.append(
            {
                "generalId": resolved["generalId"],
                "name": resolved["name"],
                "roleActivityTags": spec["roleActivityTags"],
                "decisionWeightHints": spec.get("decisionWeightHints") or [],
                "confidence": 0.82,
                "reviewStatus": "ready-for-gate-hint",
                "sourceLayer": "stable-bootstrap-seed",
            }
        )
    return roles, missing


def build_identity_seeds(people: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seeds = []
    seen: set[str] = set()
    for person in people:
        general_id = str(person.get("generalId") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not general_id or not name or general_id in seen:
            continue
        seen.add(general_id)
        aliases = []
        for alias in person.get("alias") or []:
            alias_text = str(alias).strip()
            if alias_text and alias_text != name and alias_text not in aliases:
                aliases.append(alias_text)
        title = str(person.get("title") or "").strip().strip("【】")
        if title and title != name and title not in aliases:
            aliases.append(title)
        anecdote = str(person.get("historicalAnecdote") or "")
        for pattern in (r"字([^，,。；;\s（）()]{1,4})", r"小字([^，,。；;\s（）()]{1,4})"):
            for match in re.finditer(pattern, anecdote):
                alias_text = match.group(1).strip("「」『』")
                if alias_text and alias_text != name and alias_text not in aliases:
                    aliases.append(alias_text)
        seeds.append(
            {
                "generalId": general_id,
                "name": name,
                "aliases": aliases[:12],
                "gender": person.get("gender"),
                "baseFaction": person.get("faction"),
                "title": person.get("title"),
                "sourceLayer": person.get("sourceLayer"),
                "reviewStatus": "identity-only",
            }
        )
    seeds.sort(key=lambda item: (str(item.get("baseFaction") or ""), str(item.get("generalId") or "")))
    return seeds


def append_unique(items: list[str], value: str) -> None:
    if value not in items:
        items.append(value)


def infer_role_tags_from_person(person: dict[str, Any]) -> tuple[list[str], list[str], list[str]]:
    text = "\n".join(
        str(part or "")
        for part in [
            person.get("role"),
            person.get("title"),
            person.get("source"),
            person.get("notes"),
            person.get("historicalAnecdote"),
            " / ".join(str(cell.get("text") or "") for cell in person.get("storyStripCells") or []),
        ]
    )
    role_tags: list[str] = []
    decision_hints: list[str] = []
    evidence_terms: list[str] = []

    def hit(tag: str, hint: str | None, *terms: str) -> None:
        if any(term and term in text for term in terms):
            append_unique(role_tags, tag)
            if hint:
                append_unique(decision_hints, hint)
            evidence_terms.extend(term for term in terms if term and term in text)

    role = str(person.get("role") or "")
    try:
        int_stat = int(person.get("int") or (person.get("stats") or {}).get("int") or 0)
        pol_stat = int(person.get("pol") or (person.get("stats") or {}).get("pol") or 0)
    except (TypeError, ValueError):
        int_stat = 0
        pol_stat = 0
    if role == "Commander":
        append_unique(role_tags, "general_commander")
        append_unique(role_tags, "warlord_ruler")
        append_unique(decision_hints, "prefers_battle")
    elif role == "Combat":
        append_unique(role_tags, "general_commander")
        append_unique(role_tags, "soldier_guard")
        append_unique(decision_hints, "prefers_battle")
    elif role == "Support" and (int_stat >= 75 or pol_stat >= 75):
        append_unique(role_tags, "strategist_advisor")
        append_unique(decision_hints, "prefers_strategy")

    hit("warlord_ruler", "prefers_governance", "皇帝", "開國", "君主", "諸侯", "割據", "最高掌權者")
    hit("general_commander", "prefers_battle", "名將", "將領", "統帥", "大都督", "將軍", "鎮守")
    hit("strategist_advisor", "prefers_strategy", "謀士", "軍師", "幕僚", "智囊", "軍事家", "戰略家")
    hit("official_bureaucrat", "prefers_governance", "政治家", "丞相", "太守", "刺史", "尚書", "官吏", "治理")
    hit("civil_governance", "prefers_governance", "治世", "民事", "行政", "法令", "賑", "屯田")
    hit("diplomacy_speech", "prefers_diplomacy", "外交", "使者", "辯", "說客", "談判", "聯盟")
    hit("scholar_literati", "prefers_governance", "文學家", "詩人", "儒", "散文家", "文章")
    hit("craft_engineering", "prefers_strategy", "發明", "木牛流馬", "連弩", "器械", "造船")
    hit("medicine_ritual", None, "醫", "方士", "占卜", "祭祀")
    hit("outlaw_mercenary", "seeks_revenge", "盜賊", "山賊", "亡命", "傭兵")

    return role_tags[:6], decision_hints[:6], sorted(set(evidence_terms))[:12]


def build_auto_social_roles(people: list[dict[str, Any]]) -> list[dict[str, Any]]:
    roles = []
    seen: set[str] = set()
    for person in people:
        general_id = str(person.get("generalId") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not general_id or not name or general_id in seen:
            continue
        role_tags, decision_hints, evidence_terms = infer_role_tags_from_person(person)
        if not role_tags:
            continue
        seen.add(general_id)
        roles.append(
            {
                "generalId": general_id,
                "name": name,
                "roleActivityTags": role_tags,
                "decisionWeightHints": decision_hints,
                "evidenceTerms": evidence_terms,
                "confidence": 0.62,
                "reviewStatus": "plain-field-hint-only",
                "sourceLayer": "structured-plain-fields",
            }
        )
    roles.sort(key=lambda item: str(item.get("generalId") or ""))
    return roles


def build_plain_fact_proposals(people: list[dict[str, Any]]) -> list[dict[str, Any]]:
    proposals = []
    for person in people:
        general_id = str(person.get("generalId") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not general_id or not name:
            continue
        role_tags, decision_hints, evidence_terms = infer_role_tags_from_person(person)
        if role_tags:
            proposals.append(
                {
                    "generalId": general_id,
                    "name": name,
                    "factType": "role_activity_tags",
                    "roleActivityTags": role_tags,
                    "decisionWeightHints": decision_hints,
                    "evidenceTerms": evidence_terms,
                    "sourceFields": ["role", "title", "source", "notes", "historicalAnecdote", "storyStripCells"],
                    "confidence": 0.58,
                    "reviewStatus": "plain-fact-proposal-only",
                }
            )
    proposals.sort(key=lambda item: (str(item.get("factType") or ""), str(item.get("generalId") or "")))
    return proposals


def infer_stat_tags(person: dict[str, Any]) -> tuple[list[str], list[str], list[str], list[str]]:
    raw_stats = person.get("stats") if isinstance(person.get("stats"), dict) else {}
    stat_keys = ["str", "int", "lea", "pol", "cha", "luk"]
    values: dict[str, int] = {}
    for key in stat_keys:
        try:
            values[key] = int(person.get(key) if person.get(key) is not None else raw_stats.get(key) or 0)
        except (TypeError, ValueError):
            values[key] = 0
    aptitude_tags: list[str] = []
    decision_hints: list[str] = []
    personality_tags: list[str] = []
    choice_hints: list[str] = []

    def stat_hit(key: str, threshold: int, aptitude: str, decision: str, personality: str, choice: str) -> None:
        if values.get(key, 0) >= threshold:
            append_unique(aptitude_tags, aptitude)
            append_unique(decision_hints, decision)
            append_unique(personality_tags, personality)
            append_unique(choice_hints, choice)

    stat_hit("str", 78, "martial_weapon", "prefers_battle", "direct_force", "chooses_frontline_action")
    stat_hit("lea", 78, "command_strategy", "prefers_battle", "commanding", "chooses_deployment_or_drill")
    stat_hit("int", 78, "command_strategy", "prefers_strategy", "analytical", "chooses_planning_or_trap")
    stat_hit("pol", 78, "civil_governance", "prefers_governance", "administrative", "chooses_office_or_policy")
    stat_hit("cha", 78, "diplomacy_speech", "prefers_diplomacy", "persuasive", "chooses_negotiation_or_recruitment")
    stat_hit("luk", 82, "opportunistic_survival", "prefers_risk", "opportunistic", "chooses_gamble_or_escape")
    return aptitude_tags[:8], decision_hints[:8], personality_tags[:8], choice_hints[:8]


def infer_affect_and_activity_tags(person: dict[str, Any]) -> tuple[list[str], list[str], list[str], list[str]]:
    text = person_plain_text(person)
    affect_tags: list[str] = []
    personality_tags: list[str] = []
    activity_hints: list[str] = []
    evidence_terms: list[str] = []

    def cue(tags: list[str], tag: str, *terms: str) -> None:
        hits = [term for term in terms if term and term in text]
        if not hits:
            return
        append_unique(tags, tag)
        evidence_terms.extend(hits)

    cue(affect_tags, "friendship_loyalty", "忠", "義", "報恩", "追隨", "核心幕僚", "禮遇器重")
    cue(affect_tags, "family_affection", "父", "母", "子", "家族", "宗室", "血脈", "家門")
    cue(affect_tags, "romance_love", "妻", "夫", "婚", "嫁", "聯姻")
    cue(affect_tags, "grief_regret", "亡", "死", "敗亡", "哀", "流離", "孤燈")
    cue(affect_tags, "anger_revenge", "復仇", "報仇", "雪讎", "仇", "反擊")
    cue(affect_tags, "mercy_compassion", "仁", "賑", "安民", "救", "體恤")
    cue(affect_tags, "ambition_pride", "開國", "稱帝", "霸", "野心", "功名", "最高掌權者")
    cue(affect_tags, "fear_shame", "猜忌", "避禍", "危險", "壓力", "怯")

    cue(personality_tags, "martial", "武勇", "猛", "虎", "槍", "騎", "上陣", "戰")
    cue(personality_tags, "strategic", "謀", "軍師", "策", "智囊", "落子", "奇計")
    cue(personality_tags, "governance-minded", "治", "政", "丞相", "行政", "法令", "安民")
    cue(personality_tags, "literary", "文學", "詩", "文章", "音律", "琴", "書")
    cue(personality_tags, "survival-minded", "流離", "俘", "避禍", "危險", "敗亡")
    cue(personality_tags, "family-bound", "父", "母", "子", "家族", "宗室", "血脈")

    cue(activity_hints, "serve_army", "將軍", "統帥", "守城", "鎮守", "從軍", "宿衛")
    cue(activity_hints, "appoint_office", "丞相", "太守", "刺史", "官", "封", "任")
    cue(activity_hints, "negotiate_surrender", "外交", "使者", "談判", "說降", "聯盟")
    cue(activity_hints, "teach_train", "教", "門生", "訓", "傳授")
    cue(activity_hints, "craft_build", "發明", "器械", "造船", "連弩", "木牛流馬")
    cue(activity_hints, "host_banquet", "宴", "酒", "會", "席")
    cue(activity_hints, "family_duty", "父", "母", "子", "家族", "宗室", "婚")
    cue(activity_hints, "recruitment_visit", "拜訪", "三顧", "投奔", "招募", "禮遇")
    cue(activity_hints, "raid_plunder", "盜賊", "山賊", "劫", "掠")
    cue(activity_hints, "suppress_unrest", "平亂", "剿", "黃巾", "亂")
    return affect_tags[:8], personality_tags[:8], activity_hints[:8], sorted(set(evidence_terms))[:16]


def build_basic_profile_seeds(people: list[dict[str, Any]], observed_stats: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    profiles: list[dict[str, Any]] = []
    seen: set[str] = set()
    for person in people:
        general_id = str(person.get("generalId") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not general_id or not name or general_id in seen:
            continue
        seen.add(general_id)
        aliases = [str(alias).strip() for alias in person.get("alias") or [] if str(alias).strip()]
        role_tags, role_decision_hints, role_terms = infer_role_tags_from_person(person)
        stat_aptitudes, stat_decisions, stat_personality, choice_hints = infer_stat_tags(person)
        affect_tags, plain_personality, activity_hints, affect_terms = infer_affect_and_activity_tags(person)
        mention_stats = observed_stats.get(general_id, {})
        text = person_plain_text(person)
        coverage_level = "plain-rich" if len(text.strip()) >= 80 else "observed-only" if mention_stats else "identity-only"
        profiles.append(
            {
                "generalId": general_id,
                "name": name,
                "aliases": bounded_unique(aliases, 12),
                "gender": person.get("gender"),
                "baseFaction": person.get("faction"),
                "title": person.get("title"),
                "role": person.get("role"),
                "sourceLayer": person.get("sourceLayer"),
                "coverageLevel": coverage_level,
                "roleActivityTags": bounded_unique(role_tags, 8),
                "aptitudeTags": bounded_unique(stat_aptitudes, 8),
                "affectTags": bounded_unique(affect_tags, 8),
                "personalityTags": bounded_unique(plain_personality + stat_personality, 10),
                "activitySeedHints": bounded_unique(activity_hints, 10),
                "decisionWeightHints": bounded_unique(role_decision_hints + stat_decisions, 10),
                "choiceWeightHints": bounded_unique(choice_hints, 10),
                "plainEvidenceTerms": bounded_unique(role_terms + affect_terms, 20),
                "observedMentionStats": mention_stats,
                "sourceFields": BASIC_PROFILE_SOURCE_FIELDS,
                "reviewStatus": "plain-basic-profile-only",
            }
        )
    profiles.sort(key=lambda item: (str(item.get("baseFaction") or ""), str(item.get("generalId") or "")))
    return profiles


def relation_labels_for_people(people: list[dict[str, Any]]) -> list[tuple[str, str, str]]:
    labels: list[tuple[str, str, str]] = []
    seen: set[tuple[str, str]] = set()
    for person in people:
        general_id = str(person.get("generalId") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not general_id or not name:
            continue
        raw_labels = [name] + [str(alias).strip() for alias in person.get("alias") or [] if str(alias).strip()]
        for label in raw_labels:
            if len(label) < 2 or label in COMMON_RELATION_LABELS:
                continue
            key = (general_id, label)
            if key in seen:
                continue
            seen.add(key)
            labels.append((label, general_id, name))
    labels.sort(key=lambda item: (-len(item[0]), item[0]))
    return labels


def infer_plain_relationship(source_id: str, target_id: str, text: str, label: str, match_start: int) -> tuple[str, str, str, str, list[str]]:
    window = text[max(0, match_start - 16) : match_start + len(label) + 16]
    terms: list[str] = []

    def has(*items: str) -> bool:
        hits = [item for item in items if item in window]
        terms.extend(hits)
        return bool(hits)

    if has("父親", "父亲", "父：", "母親", "母亲", "母："):
        return target_id, source_id, "parent_child_candidate", "family_plain_field", sorted(set(terms))[:8]
    if has("其子", "兒子", "儿子", "長子", "次子", "之子", "其女", "女兒"):
        return source_id, target_id, "parent_child_candidate", "family_plain_field", sorted(set(terms))[:8]
    if has("妻", "夫人", "丈夫", "嫁", "娶", "婚", "聯姻"):
        return source_id, target_id, "spouse_candidate", "marriage_plain_field", sorted(set(terms))[:8]
    if has("兄", "弟", "姊", "妹", "同族", "族兄", "族弟"):
        return source_id, target_id, "sibling_candidate", "kinship_plain_field", sorted(set(terms))[:8]
    if has("麾下", "幕僚", "臣", "主上", "禮遇", "器重", "效力", "追隨"):
        return target_id, source_id, "ruler_subject_candidate", "service_plain_field", sorted(set(terms))[:8]
    if has("仇", "敵", "討", "攻", "殺", "擊敗", "大敗", "復仇"):
        return source_id, target_id, "enemy_rival_candidate", "conflict_plain_field", sorted(set(terms))[:8]
    if has("好友", "知己", "同鄉", "結義", "盟", "同盟"):
        return source_id, target_id, "friend_or_ally_candidate", "affinity_plain_field", sorted(set(terms))[:8]
    return source_id, target_id, "plain_association", "co_mention_plain_field", sorted(set(terms))[:8]


def build_plain_relationship_proposals(people: list[dict[str, Any]], max_per_person: int = 8) -> list[dict[str, Any]]:
    labels = relation_labels_for_people(people)
    proposals: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    for source in people:
        source_id = str(source.get("generalId") or source.get("id") or "").strip()
        source_name = str(source.get("name") or "").strip()
        if not source_id or not source_name:
            continue
        text = person_plain_text(source)
        if not text.strip():
            continue
        per_person_count = 0
        for label, target_id, target_name in labels:
            if target_id == source_id or label == source_name or label not in text:
                continue
            match_start = text.find(label)
            from_id, to_id, proposed_type, reason, evidence_terms = infer_plain_relationship(source_id, target_id, text, label, match_start)
            key = (from_id, to_id, proposed_type)
            if key in seen:
                continue
            seen.add(key)
            proposals.append(
                {
                    "fromId": from_id,
                    "toId": to_id,
                    "sourceGeneralId": source_id,
                    "sourceName": source_name,
                    "targetName": target_name,
                    "matchedLabel": label,
                    "proposedType": proposed_type,
                    "reason": reason,
                    "evidenceTerms": evidence_terms,
                    "confidence": 0.54 if proposed_type != "plain_association" else 0.42,
                    "sourceFields": BASIC_PROFILE_SOURCE_FIELDS,
                    "reviewStatus": "plain-relationship-proposal-only",
                    "sourceLayer": "structured-plain-fields",
                }
            )
            per_person_count += 1
            if per_person_count >= max_per_person:
                break
    proposals.sort(key=lambda item: (str(item.get("proposedType") or ""), str(item.get("fromId") or ""), str(item.get("toId") or "")))
    return proposals


def is_female_priority_person(person: dict[str, Any]) -> bool:
    name = str(person.get("name") or "").strip()
    aliases = {str(alias).strip() for alias in person.get("alias") or []}
    return person.get("gender") == "女" or name in KNOWN_FEMALE_NAMES or bool(aliases.intersection(KNOWN_FEMALE_NAMES))


def infer_female_profile(person: dict[str, Any]) -> dict[str, Any]:
    text = "\n".join(
        str(part or "")
        for part in [
            person.get("title"),
            person.get("role"),
            person.get("source"),
            person.get("notes"),
            person.get("historicalAnecdote"),
            " / ".join(str(cell.get("text") or "") for cell in person.get("storyStripCells") or []),
        ]
    )
    affect_tags: list[str] = []
    personality_tags: list[str] = []
    interaction_priorities: list[str] = []
    event_hooks: list[str] = []

    def cue(tag_list: list[str], tag: str, *terms: str) -> None:
        if any(term and term in text for term in terms):
            append_unique(tag_list, tag)

    cue(affect_tags, "romance_love", "夫", "妻", "嫁", "婚", "寵愛", "聯姻")
    cue(affect_tags, "family_affection", "母", "父", "子", "女", "家門", "宗室", "家族")
    cue(affect_tags, "grief_regret", "流離", "哀", "亡", "死", "犧牲", "惋惜", "破碎")
    cue(affect_tags, "anger_revenge", "復仇", "報仇", "雪讎", "烈", "不肯", "拒絕")
    cue(affect_tags, "fear_shame", "宮", "後宮", "壓力", "危險", "猜忌", "禪讓")
    cue(affect_tags, "ambition_pride", "公主", "皇后", "女將", "武勇", "自主", "權勢")

    cue(personality_tags, "martial", "女將", "飛刀", "騎射", "上陣", "武勇", "守城", "雙刀")
    cue(personality_tags, "political", "政治", "宮", "後宮", "繼承", "禪讓", "內廷", "權門", "謀")
    cue(personality_tags, "literary", "文學", "詩", "文字", "樂聲", "胡笳")
    cue(personality_tags, "protective", "守", "護", "穩住", "家門", "孩子")
    cue(personality_tags, "vengeful", "復仇", "報仇", "雪讎")
    cue(personality_tags, "autonomous", "自主", "不肯", "決絕", "親自")

    cue(interaction_priorities, "romance_or_marriage_scene", "夫", "妻", "嫁", "婚", "聯姻")
    cue(interaction_priorities, "family_or_lineage_scene", "母", "父", "子", "宗室", "家門")
    cue(interaction_priorities, "palace_or_household_politics", "宮", "後宮", "內廷", "權門", "繼承")
    cue(interaction_priorities, "grief_or_exile_memory", "流離", "哀", "亡", "犧牲")
    cue(interaction_priorities, "revenge_or_refusal_scene", "復仇", "報仇", "雪讎", "不肯", "拒絕")
    cue(interaction_priorities, "battle_or_training_scene", "女將", "飛刀", "騎射", "上陣", "守城", "武勇")

    if not affect_tags:
        affect_tags = ["family_affection"]
    if not personality_tags:
        personality_tags = ["under-documented", "relationship-sensitive"]
    if not interaction_priorities:
        interaction_priorities = ["relationship_discovery", "low-source-personal_scene"]
    for term in ["連環計", "長坂", "赤壁", "南征", "禪讓", "復仇", "聯姻", "流離", "後宮", "守城"]:
        if term in text:
            event_hooks.append(term)

    return {
        "archetype": "female_priority_profile",
        "affectTags": affect_tags[:8],
        "personalityTags": personality_tags[:8],
        "interactionPriorities": interaction_priorities[:8],
        "eventHooks": event_hooks[:8],
    }


def build_female_priority_profiles(people: list[dict[str, Any]], index: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    profiles = []
    seen: set[str] = set()
    for person in people:
        if not is_female_priority_person(person):
            continue
        general_id = str(person.get("generalId") or person.get("id") or "").strip()
        name = str(person.get("name") or "").strip()
        if not general_id or not name or general_id in seen:
            continue
        seen.add(general_id)
        inferred = infer_female_profile(person)
        override = FEMALE_PROFILE_OVERRIDES.get(name, {})
        focus_names = override.get("relationshipFocusNames") or []
        focus_ids, missing_focus_names = resolve_names(focus_names, index)
        aliases = [str(alias).strip() for alias in person.get("alias") or [] if str(alias).strip()]
        affect_tags = override.get("affectTags") or inferred["affectTags"]
        love_hate_tendency = {
            "loveAxes": [tag for tag in affect_tags if tag in {"romance_love", "family_affection", "friendship_loyalty", "mercy_compassion"}],
            "hateAxes": [tag for tag in affect_tags if tag in {"anger_revenge", "fear_shame", "grief_regret"}],
            "ambitionAxes": [tag for tag in affect_tags if tag in {"ambition_pride"}],
        }
        profile = {
            "generalId": general_id,
            "name": name,
            "aliases": aliases[:12],
            "gender": person.get("gender"),
            "genderCorrection": "female-priority-sidecar" if person.get("gender") != "女" else None,
            "baseFaction": person.get("faction"),
            "archetype": override.get("archetype") or inferred["archetype"],
            "affectTags": affect_tags,
            "loveHateTendency": love_hate_tendency,
            "personalityTags": override.get("personalityTags") or inferred["personalityTags"],
            "interactionPriorities": override.get("interactionPriorities") or inferred["interactionPriorities"],
            "relationshipFocusIds": focus_ids,
            "missingRelationshipFocusNames": missing_focus_names,
            "eventHooks": override.get("eventHooks") or inferred["eventHooks"],
            "profileNeeds": ["basicInfo", "emotion", "personality", "loveHate", "affectEvents", "interactionEvents"],
            "externalSourceNeeded": not bool(override),
            "sourceFields": ["gender", "alias", "title", "role", "historicalAnecdote", "storyStripCells"],
            "contentGapPolicy": "high-priority: allow future authorized external stories as sidecar proposals; never canonical without source gate",
            "reviewStatus": "female-priority-profile-only",
            "sourceLayer": "female-priority-bootstrap",
        }
        profiles.append(profile)
    profiles.sort(key=lambda item: (str(item.get("baseFaction") or ""), str(item.get("generalId") or "")))
    return profiles


def build_alias_hints(index: dict[str, dict[str, Any]], alias_report: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    hints = []
    missing = []
    collision_aliases = {row.get("alias") for row in (alias_report.get("collisions") or [])}
    for spec in TIME_SCOPED_ALIAS_HINTS:
        resolved_hints = []
        for hint in spec.get("hints") or []:
            resolved = resolve_name(hint["generalName"], index)
            co_mention_ids, missing_co_mentions = resolve_names(hint.get("coMentionNames") or [], index)
            if not resolved:
                missing.append({"kind": "time-scoped-alias", "alias": spec["alias"], "missingName": hint["generalName"]})
                continue
            resolved_hints.append(
                {
                    "generalId": resolved["generalId"],
                    "name": resolved["name"],
                    "chapterRange": hint.get("chapterRange"),
                    "coMentionIds": co_mention_ids,
                    "missingCoMentionNames": missing_co_mentions,
                    "confidence": hint.get("confidence", 0.65),
                }
            )
        hints.append(
            {
                "alias": spec["alias"],
                "isCurrentCollision": spec["alias"] in collision_aliases,
                "hints": resolved_hints,
                "negativeRule": spec.get("negativeRule"),
                "reviewStatus": "review-only-time-scoped",
                "sourceLayer": "stable-bootstrap-seed",
            }
        )
    return hints, missing


def summarize_counts(payload: dict[str, Any]) -> dict[str, Any]:
    edge_types = Counter(edge["type"] for edge in payload["relationshipEdges"])
    role_tags = Counter(tag for row in payload["socialRoleSeeds"] for tag in row.get("roleActivityTags") or [])
    auto_role_tags = Counter(tag for row in payload["autoSocialRoleSeeds"] for tag in row.get("roleActivityTags") or [])
    basic_coverage = Counter(row.get("coverageLevel") or "unknown" for row in payload["basicProfileSeeds"])
    plain_relation_types = Counter(row.get("proposedType") or "unknown" for row in payload["plainRelationshipProposals"])
    identity_factions = Counter(row.get("baseFaction") or "unknown" for row in payload["identitySeeds"])
    female_archetypes = Counter(row.get("archetype") or "unknown" for row in payload["femalePriorityProfiles"])
    return {
        "identitySeedCount": len(payload["identitySeeds"]),
        "identityFactionCounts": dict(sorted(identity_factions.items())),
        "basicProfileSeedCount": len(payload["basicProfileSeeds"]),
        "basicProfileCoverageCounts": dict(sorted(basic_coverage.items())),
        "femalePriorityProfileCount": len(payload["femalePriorityProfiles"]),
        "femaleArchetypeCounts": dict(sorted(female_archetypes.items())),
        "relationshipEdgeCount": len(payload["relationshipEdges"]),
        "relationshipTypeCounts": dict(sorted(edge_types.items())),
        "plainRelationshipProposalCount": len(payload["plainRelationshipProposals"]),
        "plainRelationshipProposalTypeCounts": dict(sorted(plain_relation_types.items())),
        "eventLocationSeedCount": len(payload["eventLocationSeeds"]),
        "factionTimelineCount": len(payload["factionTimelines"]),
        "socialRoleSeedCount": len(payload["socialRoleSeeds"]),
        "autoSocialRoleSeedCount": len(payload["autoSocialRoleSeeds"]),
        "roleTagCounts": dict(sorted(role_tags.items())),
        "autoRoleTagCounts": dict(sorted(auto_role_tags.items())),
        "plainFactProposalCount": len(payload["plainFactProposals"]),
        "timeScopedAliasHintCount": len(payload["timeScopedAliasHints"]),
        "missingCoverageCount": len(payload["missingCoverage"]),
    }


def render_markdown(payload: dict[str, Any]) -> str:
    summary = payload["summary"]
    lines = [
        "# Stable Knowledge Bootstrap",
        "",
        f"- Generated At: `{payload['generatedAt']}`",
        f"- White Text Source Candidate: `{payload['sourceCandidates']['whiteTextManifestPath']}`",
        f"- White Text Status: `{payload['sourceCandidates']['whiteTextStatus']}`",
        "",
        "## Counts",
        "",
        f"- Identity seeds: `{summary['identitySeedCount']}`",
        f"- Basic profile seeds: `{summary['basicProfileSeedCount']}`",
        f"- Female priority profiles: `{summary['femalePriorityProfileCount']}`",
        f"- Relationship edges: `{summary['relationshipEdgeCount']}`",
        f"- Plain relationship proposals: `{summary['plainRelationshipProposalCount']}`",
        f"- Event-location seeds: `{summary['eventLocationSeedCount']}`",
        f"- Faction timelines: `{summary['factionTimelineCount']}`",
        f"- Social role seeds: `{summary['socialRoleSeedCount']}`",
        f"- Auto social role seeds: `{summary['autoSocialRoleSeedCount']}`",
        f"- Plain fact proposals: `{summary['plainFactProposalCount']}`",
        f"- Time-scoped alias hints: `{summary['timeScopedAliasHintCount']}`",
        f"- Missing coverage items: `{summary['missingCoverageCount']}`",
        "",
        "## Relationship Types",
        "",
        "| Type | Count |",
        "| --- | ---: |",
    ]
    for relation_type, count in summary["relationshipTypeCounts"].items():
        lines.append(f"| `{relation_type}` | {count} |")
    lines.extend(["", "## Plain Relationship Proposal Types", "", "| Type | Count |", "| --- | ---: |"])
    for relation_type, count in summary["plainRelationshipProposalTypeCounts"].items():
        lines.append(f"| `{relation_type}` | {count} |")
    lines.extend(
        [
            "",
            "## Gate Usage",
            "",
            "- 可作 A 升級輔助：`relationshipEdges`、`eventLocationSeeds`、`timeScopedAliasHints`。",
            "- 僅作提示：`identitySeeds`、`basicProfileSeeds`、`femalePriorityProfiles`、`plainRelationshipProposals`、`factionTimelines`、`socialRoleSeeds`、`autoSocialRoleSeeds`、`plainFactProposals` 目前是 review-only，避免把身份/女性互動 profile/白話欄位/君臣/陣營當永久關係。",
            "- 白話文只提供語意 sidecar；canonical 仍必須回到毛本文言 sourceRef gate。",
            "",
            "## Missing Coverage",
            "",
        ]
    )
    if not payload["missingCoverage"]:
        lines.append("- None")
    else:
        for item in payload["missingCoverage"][:30]:
            lines.append(f"- `{item.get('kind')}` {json.dumps(item, ensure_ascii=False)}")
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    args = parse_args()
    output_root = Path(args.output_root)
    ensure_output_root(output_root, args.overwrite)

    people = load_people(Path(args.generals), Path(args.manual_roster))
    name_index = build_name_index(people)
    alias_report = read_json(Path(args.alias_report)) if Path(args.alias_report).exists() else {}
    observed_summary = read_json(Path(args.observed_summary)) if Path(args.observed_summary).exists() else {}
    observed_mentions = load_observed_mentions(Path(args.observed_mentions))
    events_summary = read_json(Path(args.events_summary)) if Path(args.events_summary).exists() else {}
    manifest_path = Path(args.__dict__["8book_manifest"])
    white_manifest = read_json(manifest_path) if manifest_path.exists() else {}

    relationship_edges, missing_relationships = build_relationship_edges(name_index)
    seen_relationships = {edge_key(edge) for edge in relationship_edges}
    for edge in build_parent_summary_edges(people, name_index):
        add_edge(relationship_edges, edge, seen_relationships)
    event_location_seeds, missing_events = build_event_location_seeds(name_index)
    faction_timelines, missing_factions = build_faction_timeline(name_index)
    social_roles, missing_roles = build_social_roles(name_index)
    identity_seeds = build_identity_seeds(people)
    observed_general_stats = build_observed_general_stats(observed_mentions)
    basic_profile_seeds = build_basic_profile_seeds(people, observed_general_stats)
    female_priority_profiles = build_female_priority_profiles(people, name_index)
    auto_social_roles = build_auto_social_roles(people)
    plain_fact_proposals = build_plain_fact_proposals(people)
    plain_relationship_proposals = build_plain_relationship_proposals(people)
    alias_hints, missing_alias_hints = build_alias_hints(name_index, alias_report)

    payload = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "inputs": {
            "generalsPath": args.generals,
            "manualRosterPath": args.manual_roster,
            "aliasReportPath": args.alias_report,
            "observedMentionsPath": args.observed_mentions,
            "observedSummaryPath": args.observed_summary,
            "eventsSummaryPath": args.events_summary,
        },
        "baseline": {
            "alias": {
                "totalGenerals": alias_report.get("totalGenerals"),
                "totalAliasEntries": alias_report.get("totalAliasEntries"),
                "highConfidenceAliasCount": alias_report.get("highConfidenceAliasCount"),
                "collisionCount": alias_report.get("collisionCount"),
            },
            "observed": {
                "totalMentions": observed_summary.get("totalMentions"),
                "resolvedMentionCount": observed_summary.get("resolvedMentionCount"),
                "unresolvedMentionCount": observed_summary.get("unresolvedMentionCount"),
                "reviewPendingMentionCount": observed_summary.get("reviewPendingMentionCount"),
            },
            "events": {
                "eventCount": events_summary.get("eventCount"),
                "readyEventCount": events_summary.get("readyEventCount"),
                "genericBattleCandidateCount": events_summary.get("genericBattleCandidateCount"),
                "femaleInteractionCandidateCount": events_summary.get("femaleInteractionCandidateCount"),
            },
        },
        "sourceCandidates": {
            "whiteTextManifestPath": str(manifest_path),
            "whiteTextSourceId": white_manifest.get("sourceId"),
            "whiteTextStatus": "manifest-only-no-fulltext-ingestion",
            "chapterCount": white_manifest.get("chapterCount"),
            "licenseNotes": white_manifest.get("licenseNotes") or [],
        },
        "identitySeeds": identity_seeds,
        "basicProfileSeeds": basic_profile_seeds,
        "femalePriorityProfiles": female_priority_profiles,
        "relationshipEdges": relationship_edges,
        "plainRelationshipProposals": plain_relationship_proposals,
        "eventLocationSeeds": event_location_seeds,
        "factionTimelines": faction_timelines,
        "socialRoleSeeds": social_roles,
        "autoSocialRoleSeeds": auto_social_roles,
        "plainFactProposals": plain_fact_proposals,
        "timeScopedAliasHints": alias_hints,
        "promotionPolicy": {
            "canHelpPromoteToA": [
                "candidate has allowed generalIds matching stable relationship edge endpoints",
                "candidate sourceRef chapter falls inside eventLocationSeed.chapterRange",
                "candidate location matches eventLocationSeed.locationNames",
                "candidate alias collision is resolved by timeScopedAliasHints chapterRange and coMentionIds",
            ],
            "mustRemainReviewOnly": [
                "relationship relies only on whiteText sidecar without Mao Hant sourceRef gate",
                "identitySeeds without a Mao Hant sourceRef gate",
                "basicProfileSeeds without a Mao Hant sourceRef gate",
                "femalePriorityProfiles without a Mao Hant sourceRef gate",
                "plainRelationshipProposals without a Mao Hant sourceRef gate",
                "ruler_subject or faction membership without chapter/event interval",
                "socialRoleSeeds or decisionWeightHints without a Mao Hant sourceRef gate",
                "autoSocialRoleSeeds or plainFactProposals without a Mao Hant sourceRef gate",
                "missing generalId coverage",
                "alias collision outside time-scoped hint range",
            ],
        },
        "missingCoverage": missing_relationships + missing_events + missing_factions + missing_roles + missing_alias_hints,
    }
    payload["summary"] = summarize_counts(payload)

    write_json(output_root / "stable-knowledge-bootstrap.json", payload)
    (output_root / "stable-knowledge-bootstrap.md").write_text(render_markdown(payload), encoding="utf-8")
    print(f"[build_stable_knowledge_bootstrap] wrote {output_root / 'stable-knowledge-bootstrap.json'}")
    print(f"[build_stable_knowledge_bootstrap] wrote {output_root / 'stable-knowledge-bootstrap.md'}")
    print(
        "[build_stable_knowledge_bootstrap] "
        f"relationships={payload['summary']['relationshipEdgeCount']} "
        f"basicProfiles={payload['summary']['basicProfileSeedCount']} "
        f"plainRelationshipProposals={payload['summary']['plainRelationshipProposalCount']} "
        f"events={payload['summary']['eventLocationSeedCount']} "
        f"roles={payload['summary']['socialRoleSeedCount']} "
        f"missing={payload['summary']['missingCoverageCount']}"
    )


if __name__ == "__main__":
    main()
