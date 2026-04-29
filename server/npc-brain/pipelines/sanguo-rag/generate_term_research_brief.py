from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_CHOICES_PATH = Path("artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop/unresolved-triage-choices.json")
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop")
ROMANCE_CHARACTER_LIST_URL = "https://zh.wikipedia.org/wiki/%E4%B8%89%E5%9B%BD%E6%BC%94%E4%B9%89%E8%A7%92%E8%89%B2%E5%88%97%E8%A1%A8"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a web research brief for Sanguo unresolved triage labels.")
    parser.add_argument("--choices", default=str(DEFAULT_CHOICES_PATH), help="unresolved-triage-choices.json path")
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT), help="Output directory for research brief files")
    parser.add_argument("--top", type=int, default=30, help="Number of questions to include")
    return parser.parse_args()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build_search_queries(label: str) -> list[str]:
    return [
        f"site:zh.wikipedia.org/wiki/三國演義角色列表 {label}",
        f"{label} 三國 人物",
        f"{label} 三國演義",
        f"{label} 三國志",
        f"{label} 地名 官職 詞語",
    ]


def render_markdown(brief: dict) -> str:
    lines = [
        "# Sanguo Term Research Brief",
        "",
        f"Generated at: {brief['generatedAt']}",
        f"Source choices: `{brief['sourceChoicesPath']}`",
        "",
        f"優先檢查《三國演義角色列表》：{brief['preferredSourceUrl']}",
        "若該列表能直接命中人物，再用第二來源交叉確認是否為人名、別稱或稱號。",
        "",
        "請查證每個 label 是人物、地名/名詞/噪音、歧義，或暫無證據。回傳 A/B/C/D 與證據 URL。",
        "",
    ]
    for item in brief["items"]:
        lines.append(f"## {item['id']} {item['label']} ({item['count']} 次)")
        lines.append("")
        lines.append("Search queries:")
        for query in item["searchQueries"]:
            lines.append(f"- {query}")
        lines.append("")
        for snippet in item.get("sampleSnippets", []):
            lines.append(f"> {snippet}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    args = parse_args()
    choices_path = Path(args.choices)
    output_root = Path(args.output_root)
    choices = read_json(choices_path)
    questions = choices.get("questions", [])[: args.top]
    brief = {
        "version": "1.0.0",
        "generatedAt": utc_now(),
        "sourceChoicesPath": str(choices_path),
        "preferredSourceUrl": ROMANCE_CHARACTER_LIST_URL,
        "instructions": "Classify each label as A/person, B/noise, C/ambiguous, or D/defer. Return evidence URLs and personRecord only for A.",
        "items": [
            {
                "id": question.get("id"),
                "label": question.get("label"),
                "normalized": question.get("normalized"),
                "count": question.get("count"),
                "mentionType": question.get("mentionType"),
                "sourceRefs": question.get("sourceRefs", []),
                "sampleSnippets": question.get("sampleSnippets", []),
                "searchQueries": build_search_queries(str(question.get("label") or "")),
            }
            for question in questions
        ],
    }
    json_path = output_root / "term-research-brief.json"
    markdown_path = output_root / "term-research-brief.md"
    write_json(json_path, brief)
    markdown_path.write_text(render_markdown(brief), encoding="utf-8")
    print(f"[generate_term_research_brief] wrote {json_path}")
    print(f"[generate_term_research_brief] wrote {markdown_path}")
    print(f"[generate_term_research_brief] items={len(brief['items'])}")


if __name__ == "__main__":
    main()