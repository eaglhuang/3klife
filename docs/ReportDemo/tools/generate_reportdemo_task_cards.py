from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TASK_DIR = ROOT / "tasks"
PLAN_PATH = ROOT / "內部人員交易報表轉媒體儲存系統_功能里程碑計畫.md"
AGENT_TEAM_PLAN = "docs/ReportDemo/內部人員交易報表轉媒體儲存系統_Agent Team計畫書.md"
RELATED_PLAN = "docs/ReportDemo/內部人員交易報表轉媒體儲存系統_功能里程碑計畫.md"


SLUGS = {
    "M0-01": "legacy-report-inventory",
    "M0-02": "legacy-data-source-inventory",
    "M0-03": "legacy-result-baseline",
    "M0-04": "third-party-cross-platform-poc",
    "M0-05": "sp-sql-refactor-classification",
    "M0-06": "role-raci-critical-path",
    "M1-01": "import-batch-management",
    "M1-02": "staging-tables",
    "M1-03": "legacy-transform-porting",
    "M1-04": "audit-write-foundation",
    "M2-01": "validation-rule-versioning",
    "M2-02": "validation-result-severity",
    "M2-03": "legacy-new-validation-compare",
    "M2-04": "data-scope-foundation",
    "M3-01": "report-template-versioning",
    "M3-02": "report-generation-job",
    "M3-03": "report-version-state-machine",
    "M3-04": "dual-report-production-compare",
    "M4-01": "pdf-metadata",
    "M4-02": "pdf-storage-zone",
    "M4-03": "pdf-master-integrity-check",
    "M4-04": "pdf-reconciliation",
    "M5-01": "download-gateway",
    "M5-02": "dynamic-watermark",
    "M5-03": "download-copy-hash",
    "M5-03A": "download-copy-retention-policy",
    "M5-04": "high-confidential-pdf-control",
    "M6-01": "report-search",
    "M6-02": "secure-preview",
    "M6-03": "review-workflow",
    "M6-04": "regeneration-workflow",
    "M6-05": "void-workflow",
    "M7-01": "audit-query-hash-chain",
    "M7-02": "log-sensitive-data-protection",
    "M7-03": "alert-severity-routing",
    "M8-01": "role-management",
    "M8-02": "data-scope-management",
    "M8-03": "break-glass-workflow",
    "M9-01": "shadow-db",
    "M9-02": "go-no-go-gate",
    "M9-03": "rollback-runbook",
    "M9-04": "uat-training-operations-manual",
    "M9-05": "pilot-legacy-shutdown-gate",
    "M10-01": "release-acceptance",
    "M10-02": "legacy-coverage-confirmation",
}

DEPENDENCIES = {
    "M0-01": [],
    "M0-02": [],
    "M0-03": ["TASK-RPT-0001", "TASK-RPT-0002"],
    "M0-04": ["TASK-RPT-0001", "TASK-RPT-0002"],
    "M0-05": ["TASK-RPT-0002", "TASK-RPT-0004"],
    "M0-06": ["TASK-RPT-0001", "TASK-RPT-0002", "TASK-RPT-0003", "TASK-RPT-0004", "TASK-RPT-0005"],
    "M1-01": ["TASK-RPT-0006"],
    "M1-02": ["TASK-RPT-0002", "TASK-RPT-0007"],
    "M1-03": ["TASK-RPT-0005", "TASK-RPT-0008"],
    "M1-04": ["TASK-RPT-0007"],
    "M2-01": ["TASK-RPT-0003", "TASK-RPT-0009"],
    "M2-02": ["TASK-RPT-0011"],
    "M2-03": ["TASK-RPT-0011", "TASK-RPT-0012"],
    "M2-04": ["TASK-RPT-0006", "TASK-RPT-0010"],
    "M3-01": ["TASK-RPT-0001", "TASK-RPT-0013"],
    "M3-02": ["TASK-RPT-0015"],
    "M3-03": ["TASK-RPT-0016"],
    "M3-04": ["TASK-RPT-0015", "TASK-RPT-0016", "TASK-RPT-0017"],
    "M4-01": ["TASK-RPT-0017", "TASK-RPT-0018"],
    "M4-02": ["TASK-RPT-0004", "TASK-RPT-0019"],
    "M4-03": ["TASK-RPT-0019", "TASK-RPT-0020"],
    "M4-04": ["TASK-RPT-0020", "TASK-RPT-0021"],
    "M5-01": ["TASK-RPT-0014", "TASK-RPT-0020"],
    "M5-02": ["TASK-RPT-0023"],
    "M5-03": ["TASK-RPT-0023", "TASK-RPT-0024"],
    "M5-03A": ["TASK-RPT-0025"],
    "M5-04": ["TASK-RPT-0023", "TASK-RPT-0024", "TASK-RPT-0025", "TASK-RPT-0026"],
    "M6-01": ["TASK-RPT-0014", "TASK-RPT-0017", "TASK-RPT-0023"],
    "M6-02": ["TASK-RPT-0024", "TASK-RPT-0028"],
    "M6-03": ["TASK-RPT-0017", "TASK-RPT-0028"],
    "M6-04": ["TASK-RPT-0017", "TASK-RPT-0030"],
    "M6-05": ["TASK-RPT-0017", "TASK-RPT-0030"],
    "M7-01": ["TASK-RPT-0010", "TASK-RPT-0022", "TASK-RPT-0025"],
    "M7-02": ["TASK-RPT-0010"],
    "M7-03": ["TASK-RPT-0010", "TASK-RPT-0021", "TASK-RPT-0033", "TASK-RPT-0034"],
    "M8-01": ["TASK-RPT-0014", "TASK-RPT-0033"],
    "M8-02": ["TASK-RPT-0014", "TASK-RPT-0036"],
    "M8-03": ["TASK-RPT-0035", "TASK-RPT-0036", "TASK-RPT-0037"],
    "M9-01": ["TASK-RPT-0004", "TASK-RPT-0005", "TASK-RPT-0018"],
    "M9-02": ["TASK-RPT-0018", "TASK-RPT-0039"],
    "M9-03": ["TASK-RPT-0040"],
    "M9-04": ["TASK-RPT-0040", "TASK-RPT-0041"],
    "M9-05": ["TASK-RPT-0040", "TASK-RPT-0041", "TASK-RPT-0042"],
    "M10-01": ["TASK-RPT-0043"],
    "M10-02": ["TASK-RPT-0001", "TASK-RPT-0002", "TASK-RPT-0044"],
}

OWNER_BY_MILESTONE = {
    "M0": "project-captain",
    "M1": "backend-dba",
    "M2": "backend-qa-security",
    "M3": "backend-report-engineer",
    "M4": "backend-storage-devops",
    "M5": "backend-security",
    "M6": "backend-frontend-qa",
    "M7": "security-sre",
    "M8": "security-admin",
    "M9": "project-captain-devops",
    "M10": "project-captain-qa",
}


def parse_sections() -> list[dict[str, object]]:
    text = PLAN_PATH.read_text(encoding="utf-8")
    matches = list(re.finditer(r"^### (M\d+-\d+A?) (.+)$", text, flags=re.MULTILINE))
    sections = []
    for index, match in enumerate(matches):
        code = match.group(1)
        title = match.group(2).strip()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[match.end() : end]
        feature, acceptance = split_feature_acceptance(body)
        sections.append({"code": code, "title": title, "feature": feature, "acceptance": acceptance})
    return sections


def split_feature_acceptance(body: str) -> tuple[list[str], list[str]]:
    feature_part = body
    acceptance_part = ""
    if "驗收條件：" in body:
        feature_part, acceptance_part = body.split("驗收條件：", 1)
    if "功能描述：" in feature_part:
        feature_part = feature_part.split("功能描述：", 1)[1]
    return extract_bullets(feature_part), extract_bullets(acceptance_part)


def extract_bullets(text: str) -> list[str]:
    bullets = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("* "):
            bullets.append(line[2:].strip())
    return bullets


def yaml_list(items: list[str], indent: int = 2) -> str:
    if not items:
        return " []"
    pad = " " * indent
    return "\n" + "\n".join(f'{pad}- "{item}"' for item in items)


def legacy_placeholders(code: str) -> list[str]:
    numeric = code.replace("M", "").replace("-", "").replace("A", "A")
    return [
        f"legacy/舊系統報表模組_功能別{numeric}.xxx",
        f"legacy/舊系統資料轉換_SP_功能別{numeric}.sql",
    ]


def task_scope(code: str) -> list[str]:
    milestone = code.split("-")[0]
    base = [
        f"docs/ReportDemo/tasks/TASK-RPT-*-{SLUGS[code]}.task.md",
        f"docs/ReportDemo/evidence/{code}/**",
    ]
    module_paths = {
        "M0": ["docs/ReportDemo/inventory/**", "docs/ReportDemo/decision-records/**"],
        "M1": ["src/ReportDemo.Import/**", "db/migrations/reportdemo/**"],
        "M2": ["src/ReportDemo.Validation/**", "db/migrations/reportdemo/**"],
        "M3": ["src/ReportDemo.Reporting/**", "templates/reportdemo/**"],
        "M4": ["src/ReportDemo.DocumentStorage/**", "infra/storage/reportdemo/**"],
        "M5": ["src/ReportDemo.DownloadGateway/**", "src/ReportDemo.Watermark/**"],
        "M6": ["src/ReportDemo.Web/**", "src/ReportDemo.Workflow/**"],
        "M7": ["src/ReportDemo.Audit/**", "src/ReportDemo.Alerting/**"],
        "M8": ["src/ReportDemo.Admin/**", "src/ReportDemo.Security/**"],
        "M9": ["infra/migration/reportdemo/**", "runbooks/reportdemo/**"],
        "M10": ["docs/ReportDemo/acceptance/**", "runbooks/reportdemo/**"],
    }
    return base + module_paths.get(milestone, []) + legacy_placeholders(code)


def task_card(seq: int, section: dict[str, object]) -> tuple[str, str]:
    code = str(section["code"])
    title = str(section["title"])
    task_id = f"TASK-RPT-{seq:04d}"
    milestone = code.split("-")[0]
    slug = SLUGS[code]
    filename = f"{task_id}-{code.lower()}-{slug}.task.md"
    owner = OWNER_BY_MILESTONE[milestone]
    depends = DEPENDENCIES.get(code, [])
    feature = section["feature"] or ["依功能里程碑計畫完成本項功能交付。"]
    acceptance = section["acceptance"] or ["完成本項功能驗收並留下簽核紀錄。"]
    priority = "P0" if milestone in {"M0", "M1", "M2", "M7", "M8", "M9", "M10"} else "P1"
    validators = [
        "git diff --check",
        "目標系統 repo 建立後補：dotnet test 或等效自動化測試",
        "目標系統 repo 建立後補：Golden Dataset / Shadow Validation 比對命令",
    ]
    content = f"""---
task_id: {task_id}
source_milestone: {code}
title: "{title}"
status: planned
owner: {owner}
priority: {priority}
milestone: {milestone}
depends_on:{yaml_list(depends)}
related_plan: "{RELATED_PLAN}"
agent_team_plan: "{AGENT_TEAM_PLAN}"
planning_repo: 3KLife
target_repo: reportdemo-target-system
closure_authority: planning_repo
scopePaths:{yaml_list(task_scope(code))}
deliverables:
  - "docs/ReportDemo/evidence/{code}/implementation-notes.md"
  - "docs/ReportDemo/evidence/{code}/validation-result.md"
  - "目標系統 repo 中對應功能程式碼、DB migration、測試與操作文件"
validators:{yaml_list(validators)}
evidence:
  required: command-backed
rollback:
  strategy: revert-commit-or-feature-flag-disable
  notes: "若已進入正式資料流程，需先依 rollback runbook 停用新功能並回復舊系統路徑。"
atomizationImpact:
  ownerAtomOrMap: "reportdemo.{milestone.lower()}.{slug}"
  mapUpdates:
    - "待目標系統 repo 建立後補入 atom/path map"
  notes: "本卡先定義功能工作包；實作 repo 建立後需補齊實際 atom/map 與檔案邊界。"
outOfScope:
  - "使用未脫敏正式資料進行開發或一般測試"
  - "未完成舊系統覆蓋比對即切換正式流程"
  - "繞過 Admin、Data Scope、稽核與告警要求"
nonGoals:
  - "一次性重寫所有舊系統功能"
  - "在未完成 PoC / Gate 前承諾最終技術選型"
---
# {task_id} - {code} {title}

## Goal

完成 `{code}` 對應功能，並能證明新系統涵蓋舊系統必要行為；未知舊系統程式碼先以象徵性代號標記，後續盤點時替換為真實名稱。

## Legacy Coverage

- 需對照：`{legacy_placeholders(code)[0]}`
- 需對照：`{legacy_placeholders(code)[1]}`
- 若本卡涉及重寫，必須保留舊系統輸入、輸出、排序、欄位、狀態與例外案例的比對紀錄。

## Functional Scope
{chr(10).join(f"- {item}" for item in feature)}

## Implementation Contract

- 優先採漸進式承接：沿用、封裝、移植、重寫、廢止候選需逐項記錄。
- 不得用未脫敏正式資料做一般開發或測試；正式資料只可進受控 Shadow Validation。
- 涉及權限、資料範圍、PDF、稽核、告警或 break-glass 時，安全性與可稽核性優先於便利性。
- 每個可觀測流程需留下 trace ID / correlation ID，方便新舊系統比對與事故追蹤。

- Agent Team 派工、role、reviewer、validator、human sign-off 與 ADR gate 需依 Agent Team 計畫書 v1.0 執行：`docs/ReportDemo/內部人員交易報表轉媒體儲存系統_Agent Team計畫書.md`。

## Deliverables

- 實作程式碼、DB migration、設定檔或文件，依本卡 `scopePaths` 控制。
- `docs/ReportDemo/evidence/{code}/implementation-notes.md`
- `docs/ReportDemo/evidence/{code}/validation-result.md`

## Validators

- `git diff --check`
- 目標系統 repo 建立後補：`dotnet test` 或等效自動化測試。
- 目標系統 repo 建立後補：Golden Dataset / Shadow Validation 比對命令。

## Acceptance Criteria
{chr(10).join(f"- {item}" for item in acceptance)}

## Rollback

以 feature flag、路由切回舊系統、回復 migration 或 revert commit 為優先；若已接觸正式流程，必須先確認資料一致性與稽核紀錄完整。

## Notes

- 2026-07-02 | planned | 已同步 Agent Team 計畫書 v1.0；正式派工前需確認 role、reviewer、validator、human/ADR gate 與違規阻擋機制。

- 2026-07-02 | planned | 本卡由功能里程碑計畫自動拆分，等待人類確認優先順序、實際 owner 與目標系統 repo 路徑。
"""
    return filename, content


def readme(sections: list[dict[str, object]]) -> str:
    rows = []
    for seq, section in enumerate(sections, start=1):
        code = str(section["code"])
        milestone = code.split("-")[0]
        title = str(section["title"])
        task_id = f"TASK-RPT-{seq:04d}"
        filename = f"{task_id}-{code.lower()}-{SLUGS[code]}.task.md"
        depends = ", ".join(DEPENDENCIES.get(code, [])) or "none"
        rows.append(f"| [{task_id}](./{filename}) | {code} | {milestone} | {title} | planned | {depends} |")
    return f"""---
owner: project-captain
status: active
related_plan: {RELATED_PLAN}
agent_team_plan: {AGENT_TEAM_PLAN}
planning_repo: 3KLife
target_repo: reportdemo-target-system
created_at: 2026-07-02
---

# ReportDemo Task Card Index

本目錄依據「功能里程碑計畫」拆成可派工的功能任務卡。任務卡格式參考 `docs/ai_atomic_framework/team-agents/tasks`，但本目錄只作為 ReportDemo 專案規劃與派工來源，不修改 AI-Atomic-Framework 任務生命週期。

## Task Card Contract

- 每張 `TASK-RPT-*` 卡都必須對應一個功能里程碑項目。
- 每張卡都要保留舊系統覆蓋欄位；未知程式碼以 `舊系統報表模組_功能別XXX.xxx` 或 `舊系統資料轉換_SP_功能別XXX.sql` 代稱。
- 任務卡不得跳過 Golden Dataset、Shadow Validation、權限、Data Scope、稽核與 rollback 驗證。
- 目標系統 repo 尚未建立前，`target_repo` 使用 `reportdemo-target-system` 佔位；建立後需批次替換。

## Agent Team Dispatch Contract

- `Agent Team計畫書 v1.0` 是本任務卡目錄的 Agent Team 派工 source of truth，與 `3KLife` repo 或 `AI-Atomic-Framework` repo 沒有執行依賴。
- 正式接卡前需確認 Agent role、reviewer、validator、human sign-off 與 ADR gate。
- M5、M7、M8、M9 或涉及正式資料的任務卡，需額外納入 Security / Permission、Audit / Evidence、QA / Validation 或人類簽核。
- 若 Agent 自動決策與資安、稽核或 ADR 衝突，任務卡不得 closure，需先升級人類或 ADR 裁決。
- 違規阻擋機制至少包含：任務卡 scope、tool sandbox / CI scope check、validator / reviewer、command-backed evidence 與 closure gate。

## Task Roster

| Task ID | Source | Milestone | Title | Status | Depends |
|---|---|---|---|---|---|
{chr(10).join(rows)}

## Sequencing Note

建議先完成 M0 盤點與 PoC，再進入 M1/M9-01 的資料遷移基礎；M2-M5 可在資料基準穩定後分流開發，但 M7/M8 的稽核、告警、Admin 與 break-glass 不應延到最後才補。
"""


def main() -> None:
    sections = parse_sections()
    TASK_DIR.mkdir(parents=True, exist_ok=True)
    (TASK_DIR / "README.md").write_text(readme(sections), encoding="utf-8", newline="\n")
    for seq, section in enumerate(sections, start=1):
        filename, content = task_card(seq, section)
        (TASK_DIR / filename).write_text(content, encoding="utf-8", newline="\n")
    print(f"generated {len(sections)} task cards in {TASK_DIR}")


if __name__ == "__main__":
    main()
