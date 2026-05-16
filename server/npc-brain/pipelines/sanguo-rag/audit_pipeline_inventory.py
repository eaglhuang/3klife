from __future__ import annotations

import argparse
import ast
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from repo_layout import pipeline_root, resolve_repo_root


NPC_REPO_ROOT = resolve_repo_root(__file__)


def resolve_workspace_root(anchor: Path) -> Path:
    for candidate in [anchor.resolve(), *anchor.resolve().parents]:
        if (candidate / "AGENTS.md").exists() and (candidate / "server/npc-brain").exists():
            return candidate
    return anchor.resolve()


WORKSPACE_ROOT = resolve_workspace_root(NPC_REPO_ROOT)
PIPELINE_ROOT = pipeline_root(NPC_REPO_ROOT)
DEFAULT_OUTPUT_ROOT = Path("artifacts/data-pipeline/sanguo-rag/refactor-audit")

ROLE_VALUES = {"step", "runner", "validator", "exporter", "assembler", "legacy-patch"}
JSON_ARRAY_THRESHOLD = 1000
LARGE_SCRIPT_BYTES = 40_000
VERY_LARGE_SCRIPT_BYTES = 80_000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a static inventory for Sanguo-RAG phase-1 pipeline refactor planning."
    )
    parser.add_argument("--pipeline-root", default=str(PIPELINE_ROOT))
    parser.add_argument("--output-root", default=str(DEFAULT_OUTPUT_ROOT))
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def repo_relative(path: Path) -> str:
    try:
        return path.resolve().relative_to(WORKSPACE_ROOT.resolve()).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig", errors="replace")


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def write_markdown(path: Path, payload: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(payload, encoding="utf-8")


def load_roster_terms() -> set[str]:
    terms: set[str] = set()
    generals_path = WORKSPACE_ROOT / "assets/resources/data/generals.json"
    manual_path = PIPELINE_ROOT / "config/manual-roster-seeds.json"

    if generals_path.exists():
        payload = read_json(generals_path)
        for row in payload if isinstance(payload, list) else []:
            for key in ("id", "name", "nameZh"):
                value = str(row.get(key) or "").strip()
                if len(value) >= 2:
                    terms.add(value)
            for alias in row.get("alias") or row.get("aliases") or []:
                value = str(alias).strip()
                if len(value) >= 2:
                    terms.add(value)

    if manual_path.exists():
        payload = read_json(manual_path)
        for row in payload.get("entries") or []:
            for key in ("id", "generalId", "name"):
                value = str(row.get(key) or "").strip()
                if len(value) >= 2:
                    terms.add(value)
            for alias in row.get("alias") or row.get("aliases") or []:
                value = str(alias).strip()
                if len(value) >= 2:
                    terms.add(value)

    return terms


def parse_ast(path: Path, text: str) -> ast.Module | None:
    try:
        return ast.parse(text, filename=str(path))
    except SyntaxError:
        return None


def top_level_assignments(tree: ast.Module | None) -> list[tuple[str, ast.AST]]:
    if tree is None:
        return []
    rows: list[tuple[str, ast.AST]] = []
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    rows.append((target.id, node.value))
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            rows.append((node.target.id, node.value))
    return rows


def collection_size(node: ast.AST | None) -> int:
    if isinstance(node, (ast.List, ast.Tuple, ast.Set)):
        return len(node.elts)
    if isinstance(node, ast.Dict):
        return len(node.keys)
    return 0


def collect_static_features(path: Path, text: str, roster_terms: set[str]) -> dict[str, Any]:
    tree = parse_ast(path, text)
    assignments = top_level_assignments(tree)
    constants = [name for name, _ in assignments if name.isupper()]
    collection_constants = [
        {"name": name, "size": collection_size(value)}
        for name, value in assignments
        if name.isupper() and collection_size(value) >= 3
    ]
    large_collections = [row for row in collection_constants if row["size"] >= 8]

    cli_args = sorted(set(re.findall(r"add_argument\(\s*[\"'](--[a-zA-Z0-9][^\"']*)[\"']", text)))
    path_literals = sorted(
        set(
            value
            for value in re.findall(r"Path\(\s*[\"']([^\"']+)[\"']\s*\)", text)
            if "/" in value or "\\" in value or value.endswith((".json", ".jsonl", ".md", ".py"))
        )
    )
    roster_hits = sorted(term for term in roster_terms if term in text)

    default_constant_count = sum(1 for name in constants if name.startswith("DEFAULT_"))
    rule_terms = count_any(text, ("RULE", "Rule_", "rule-", "taxonomy", "pattern", "semantic", "extractor"))
    policy_terms = count_any(text, ("POLICY", "Policy_", "policy-", "trustTier", "claimGrade", "sourceLayer"))
    catalog_terms = count_any(text, ("CATALOG", "Catalog_", "manual-roster", "alias", "canonical", "HARD_", "_SPECS"))
    schema_terms = count_any(text, ("SCHEMA", "Schema_", "schema", "DTO", "payload", "response"))

    return {
        "treeParsed": tree is not None,
        "lineCount": text.count("\n") + 1,
        "defaultConstantCount": default_constant_count,
        "constantCount": len(constants),
        "collectionConstantCount": len(collection_constants),
        "largeCollectionConstantCount": len(large_collections),
        "largestCollections": sorted(large_collections, key=lambda item: item["size"], reverse=True)[:8],
        "cliArgs": cli_args,
        "cliArgCount": len(cli_args),
        "pathLiteralCount": len(path_literals),
        "pathLiteralsPreview": path_literals[:10],
        "rosterTermHitCount": len(roster_hits),
        "rosterTermPreview": roster_hits[:12],
        "hasHardcodedPaths": bool(path_literals),
        "hasNamedCharacterHints": bool(roster_hits),
        "hasRuleCandidates": rule_terms > 0,
        "hasPolicyCandidates": policy_terms > 0,
        "hasCatalogCandidates": catalog_terms > 0,
        "hasSchemaCandidates": schema_terms > 0,
        "ruleSignalCount": rule_terms,
        "policySignalCount": policy_terms,
        "catalogSignalCount": catalog_terms,
        "schemaSignalCount": schema_terms,
        "readsJson": bool(re.search(r"json\.loads|json\.load|read_json\(", text)),
        "writesJson": bool(re.search(r"json\.dumps|json\.dump|write_json\(", text)),
        "readsJsonl": "read_jsonl" in text or ".jsonl" in text,
        "writesJsonl": "write_jsonl" in text or ".jsonl" in text,
        "usesPostgres": "postgres" in text.lower() or "pg_dsn" in text.lower(),
        "usesVectorStore": "pinecone" in text.lower() or "vector" in text.lower(),
        "repairSignals": count_any(text, ("repair", "backlog", "blitz", "fallback", "downgrade")),
        "relationshipSignals": count_any(text, ("relationship", "relationshipEdges", "claim", "sourceLayer")),
    }


def count_any(text: str, needles: tuple[str, ...]) -> int:
    lowered = text.lower()
    total = 0
    for needle in needles:
        value = needle.lower()
        total += lowered.count(value)
    return total


def classify_role(name: str, features: dict[str, Any]) -> str:
    lower = name.lower()
    if "repair" in lower or "blitz" in lower or "temporary" in lower:
        return "legacy-patch"
    if lower.startswith("run_"):
        return "runner"
    if lower.startswith("export_") or "readiness" in lower or "scoreboard" in lower:
        return "exporter"
    if lower.startswith(("validate_", "check_")) or "smoke_test" in lower or "gate" in lower:
        return "validator"
    if lower.startswith("build_") and (
        "stable" in lower or "summary" in lower or "claim_graph" in lower or "source_event" in lower
    ):
        return "assembler"
    if lower.startswith(("build_", "extract_", "collect_", "resolve_", "score_", "stage_", "merge_", "promote_", "apply_")):
        return "step"
    return "step"


def classify_hardcode(path: Path, features: dict[str, Any]) -> str:
    score = 0
    if path.stat().st_size >= VERY_LARGE_SCRIPT_BYTES:
        score += 3
    elif path.stat().st_size >= LARGE_SCRIPT_BYTES:
        score += 2
    if features["defaultConstantCount"] >= 20:
        score += 2
    elif features["defaultConstantCount"] >= 8:
        score += 1
    if features["largeCollectionConstantCount"] >= 5:
        score += 3
    elif features["largeCollectionConstantCount"] >= 2:
        score += 2
    elif features["largeCollectionConstantCount"] >= 1:
        score += 1
    if features["hasNamedCharacterHints"]:
        score += 2
    if features["hasHardcodedPaths"]:
        score += 1
    if features["repairSignals"] >= 20:
        score += 1

    if score >= 7:
        return "high"
    if score >= 4:
        return "medium"
    if score >= 1:
        return "low"
    return "none"


def classify_data_format_risk(path: Path, features: dict[str, Any]) -> str:
    size = path.stat().st_size
    if features["usesPostgres"]:
        return "stateful-db-candidate"
    if features["readsJson"] and features["writesJson"] and not features["writesJsonl"] and size >= LARGE_SCRIPT_BYTES:
        return "high-json-array-risk"
    if features["readsJson"] and not features["readsJsonl"] and size >= LARGE_SCRIPT_BYTES:
        return "medium-json-array-risk"
    if features["readsJsonl"] or features["writesJsonl"]:
        return "jsonl-aligned"
    if features["readsJson"] or features["writesJson"]:
        return "json-small-config-ok"
    return "none"


def priority_for(role: str, hardcode_level: str, data_format_risk: str, features: dict[str, Any], name: str) -> str:
    high_risk_names = {
        "build_stable_knowledge_bootstrap.py",
        "run_full_roster_convergence_loop.py",
        "run_progress_advancement_loop.py",
    }
    if name in high_risk_names:
        return "P0"
    if role in {"runner", "assembler", "legacy-patch"} and hardcode_level == "high":
        return "P0"
    if hardcode_level in {"high", "medium"} and (
        features["hasRuleCandidates"]
        or features["hasPolicyCandidates"]
        or features["hasCatalogCandidates"]
        or features["hasSchemaCandidates"]
    ):
        return "P1"
    if data_format_risk in {"high-json-array-risk", "medium-json-array-risk"}:
        return "P2"
    if data_format_risk == "stateful-db-candidate":
        return "P3"
    return "P4"


def recommended_action(role: str, hardcode_level: str, data_format_risk: str, features: dict[str, Any]) -> str:
    if role == "legacy-patch":
        return "保留舊入口，先確認是否能轉成 validator 或移入 Rule/Policy gate。"
    if role == "runner" and hardcode_level in {"high", "medium"}:
        return "拆分 orchestration 與內嵌資料；runner 只保留流程串接與 timeout。"
    if role == "assembler" and hardcode_level in {"high", "medium"}:
        return "保留相容輸出，先把 Catalog/Policy/Rule 候選外部化。"
    if data_format_risk in {"high-json-array-risk", "medium-json-array-risk"}:
        return "新增 JSONL 讀寫路徑或 mirror，避免大型 list 長期留在 JSON array。"
    if features["hasPolicyCandidates"] or features["hasRuleCandidates"]:
        return "標記為 Rule/Policy 外部化候選，第二階段再搬資料。"
    return "暫保留現狀；若後續重命名，使用 compatibility wrapper。"


def suggested_group(role: str) -> str:
    return {
        "runner": "runners",
        "validator": "validators",
        "exporter": "exporters",
        "assembler": "steps",
        "legacy-patch": "legacy",
        "step": "steps",
    }.get(role, "steps")


def inspect_script(path: Path, roster_terms: set[str]) -> dict[str, Any]:
    text = read_text(path)
    features = collect_static_features(path, text, roster_terms)
    role = classify_role(path.name, features)
    hardcode_level = classify_hardcode(path, features)
    data_format_risk = classify_data_format_risk(path, features)
    priority = priority_for(role, hardcode_level, data_format_risk, features, path.name)
    group = suggested_group(role)

    return {
        "path": repo_relative(path),
        "fileName": path.name,
        "sizeBytes": path.stat().st_size,
        "lineCount": features["lineCount"],
        "role": role,
        "suggestedGroup": group,
        "suggestedPath": f"server/npc-brain/pipelines/sanguo-rag/{group}/{path.name}",
        "hardcodeLevel": hardcode_level,
        "dataFormatRisk": data_format_risk,
        "priority": priority,
        "recommendedAction": recommended_action(role, hardcode_level, data_format_risk, features),
        "hasNamedCharacterHints": features["hasNamedCharacterHints"],
        "hasHardcodedPaths": features["hasHardcodedPaths"],
        "hasRuleCandidates": features["hasRuleCandidates"],
        "hasPolicyCandidates": features["hasPolicyCandidates"],
        "hasCatalogCandidates": features["hasCatalogCandidates"],
        "hasSchemaCandidates": features["hasSchemaCandidates"],
        "defaultConstantCount": features["defaultConstantCount"],
        "constantCount": features["constantCount"],
        "largeCollectionConstantCount": features["largeCollectionConstantCount"],
        "largestCollections": features["largestCollections"],
        "cliArgCount": features["cliArgCount"],
        "cliArgsPreview": features["cliArgs"][:12],
        "pathLiteralCount": features["pathLiteralCount"],
        "pathLiteralsPreview": features["pathLiteralsPreview"],
        "rosterTermHitCount": features["rosterTermHitCount"],
        "rosterTermPreview": features["rosterTermPreview"],
        "readsJson": features["readsJson"],
        "writesJson": features["writesJson"],
        "readsJsonl": features["readsJsonl"],
        "writesJsonl": features["writesJsonl"],
        "usesPostgres": features["usesPostgres"],
        "usesVectorStore": features["usesVectorStore"],
        "treeParsed": features["treeParsed"],
    }


def inspect_large_json_files() -> list[dict[str, Any]]:
    roots = [
        PIPELINE_ROOT / "config",
        WORKSPACE_ROOT / "artifacts/data-pipeline/sanguo-rag/extracted",
    ]
    rows: list[dict[str, Any]] = []
    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob("*.json"):
            size = path.stat().st_size
            if size < 64_000:
                continue
            text = path.read_text(encoding="utf-8-sig", errors="ignore")
            stripped = text.lstrip()
            if not stripped.startswith("["):
                continue
            item_estimate = stripped.count("\n  {") + stripped.count("\n{")
            rows.append(
                {
                    "path": repo_relative(path),
                    "sizeBytes": size,
                    "estimatedRowCount": item_estimate,
                    "recommendedAction": "P2: 評估轉為 JSONL 或提供 JSONL mirror。",
                }
            )
    return sorted(rows, key=lambda item: item["sizeBytes"], reverse=True)


def render_markdown(rows: list[dict[str, Any]], large_json_rows: list[dict[str, Any]]) -> str:
    generated_at = datetime.now(timezone.utc).isoformat()
    role_counts = Counter(row["role"] for row in rows)
    priority_counts = Counter(row["priority"] for row in rows)
    hardcode_counts = Counter(row["hardcodeLevel"] for row in rows)
    data_risk_counts = Counter(row["dataFormatRisk"] for row in rows)

    lines: list[str] = [
        "<!-- doc_id: doc_server_pipeline_audit_0001 -->",
        "# Sanguo-RAG Pipeline Inventory",
        "",
        f"- Generated at: `{generated_at}`",
        f"- Script count: `{len(rows)}`",
        f"- JSON array migration candidates: `{len(large_json_rows)}`",
        "",
        "## Summary",
        "",
        "### Role Counts",
        "",
    ]
    for key, count in sorted(role_counts.items()):
        lines.append(f"- `{key}`: `{count}`")

    lines.extend(["", "### Priority Counts", ""])
    for key, count in sorted(priority_counts.items()):
        lines.append(f"- `{key}`: `{count}`")

    lines.extend(["", "### Hardcode Level Counts", ""])
    for key, count in sorted(hardcode_counts.items()):
        lines.append(f"- `{key}`: `{count}`")

    lines.extend(["", "### Data Format Risk Counts", ""])
    for key, count in sorted(data_risk_counts.items()):
        lines.append(f"- `{key}`: `{count}`")

    lines.extend(
        [
            "",
            "## P0 / P1 Refactor Candidates",
            "",
            "| Priority | File | Role | Hardcode | Data risk | Recommended action |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
    )
    for row in sorted(rows, key=lambda item: (item["priority"], -item["sizeBytes"], item["fileName"])):
        if row["priority"] not in {"P0", "P1"}:
            continue
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{row['priority']}`",
                    f"`{row['fileName']}`",
                    f"`{row['role']}`",
                    f"`{row['hardcodeLevel']}`",
                    f"`{row['dataFormatRisk']}`",
                    row["recommendedAction"],
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## JSON Array Migration Candidates",
            "",
            "| File | Size | Estimated rows | Recommended action |",
            "| --- | ---: | ---: | --- |",
        ]
    )
    for row in large_json_rows[:40]:
        lines.append(
            f"| `{row['path']}` | {row['sizeBytes']} | {row['estimatedRowCount']} | {row['recommendedAction']} |"
        )
    if not large_json_rows:
        lines.append("| None | 0 | 0 | No large JSON array candidate found. |")

    lines.extend(
        [
            "",
            "## Full Script Inventory",
            "",
            "| File | Role | Priority | Hardcode | Data risk | Group |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
    )
    for row in sorted(rows, key=lambda item: item["fileName"]):
        lines.append(
            f"| `{row['fileName']}` | `{row['role']}` | `{row['priority']}` | "
            f"`{row['hardcodeLevel']}` | `{row['dataFormatRisk']}` | `{row['suggestedGroup']}` |"
        )

    lines.extend(
        [
            "",
            "## Notes",
            "",
            "- This report is static analysis only; it does not rename scripts or change pipeline behavior.",
            "- Suggested paths are planning hints, not migration actions.",
            "- JSONL is preferred for large homogeneous row data; JSON remains valid for policy, schema, and manifest files.",
            "- PostgreSQL candidates are marked as P3 for later state/performance planning.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    pipeline = Path(args.pipeline_root).resolve()
    output_root = (
        WORKSPACE_ROOT / args.output_root
    ).resolve() if not Path(args.output_root).is_absolute() else Path(args.output_root)
    jsonl_path = output_root / "pipeline-inventory.jsonl"
    md_path = output_root / "pipeline-inventory.md"

    if not pipeline.exists():
        raise FileNotFoundError(f"Pipeline root does not exist: {pipeline}")
    if not args.overwrite and (jsonl_path.exists() or md_path.exists()):
        raise FileExistsError(f"Output exists. Use --overwrite: {output_root}")

    roster_terms = load_roster_terms()
    scripts = sorted(path for path in pipeline.glob("*.py") if path.is_file())
    rows = [inspect_script(path, roster_terms) for path in scripts]
    large_json_rows = inspect_large_json_files()

    write_jsonl(jsonl_path, rows)
    write_markdown(md_path, render_markdown(rows, large_json_rows))

    print(f"[audit_pipeline_inventory] scripts={len(rows)} output={repo_relative(output_root)}")
    print(f"[audit_pipeline_inventory] wrote {repo_relative(jsonl_path)}")
    print(f"[audit_pipeline_inventory] wrote {repo_relative(md_path)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
