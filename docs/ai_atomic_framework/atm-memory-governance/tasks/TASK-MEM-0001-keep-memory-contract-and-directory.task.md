---
task_id: TASK-MEM-0001
title: "keep-memory 記憶筆記契約與目錄落地（含首批種子記憶）"
status: done
owner: atm-core
priority: P1
milestone: MEM-M0
depends_on: []
related_plan: docs/ai_atomic_framework/atm-memory-governance/ATM 跨專案記憶治理計畫書.md
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "docs/keep-memory/README.md"
  - "docs/keep-memory/"
  - "docs/keep.summary.md"
deliverables:
  - "docs/keep-memory/README.md"
  - "docs/keep.summary.md"
validators:
  - "git diff --check"
  - "node tools_node/check-encoding-integrity.js --staged"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "純新增目錄與 summary 一個段落；revert 即回到現狀，keep-shards 不受影響。"
atomizationImpact:
  ownerAtomOrMap: "3klife.docs-keep"
completed_at: "2026-07-14T10:22:16.477Z"
completed_by_agent: "claude-fable-5"
closedAt: "2026-07-14T10:22:16.477Z"
closedByActor: "claude-fable-5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T10-56-33-600Z-close-debbbe7e1277"
lastTransitionAt: "2026-07-14T10:22:16.477Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "bea3e88510053e4c8658bdcaf20389ffa1467c5d"
---

# TASK-MEM-0001 keep-memory 契約與目錄

計畫書 Milestone 0。建立 `docs/keep-memory/` 目錄與契約 README，定義：

- frontmatter 欄位：`name`（kebab-case 唯一）/ `description`（一句 hook，索引用）/
  `type`（gotcha | feedback | status | reference）/ `updated`（絕對日期）/
  `repo`（教訓發生地）/ `status`（active | superseded | retired）。
- 命名慣例：`<type>_<slug>.md`，一則教訓一個檔案。
- 主動寫入觸發清單（踩坑確認解法後、重大收口時、被人類指正時、推翻舊記憶時）
  與不寫規則（repo 已記錄的不重複、只對當下對話有意義的不寫、治理事實優先進
  backlog / task card）。
- 與 keep-shards 的分工邊界與升降級通道（穩定半年的 gotcha 可提案升 shards，人審）。

## 驗收

- `docs/keep-memory/README.md` 契約完整，含至少一個合法範例 frontmatter。
- 首批 3-5 則種子記憶落地（從 Claude Code 私有記憶遷移可共享的 ATM 操作教訓，
  如 close/claim 陷阱、雙隊長並行陷阱、skill 模板同步教訓），每則過契約。
- `docs/keep.summary.md` 新增「keep-memory 索引」段落（一行一則），總行數仍在
  P0 Context Budget 紀律內。
- 中文內容全部通過 encoding 檢查。
