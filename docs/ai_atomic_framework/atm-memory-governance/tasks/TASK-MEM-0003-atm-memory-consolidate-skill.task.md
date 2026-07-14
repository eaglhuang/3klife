---
task_id: TASK-MEM-0003
title: "atm-memory-consolidate skill：源頭模板與安裝副本"
status: done
owner: atm-core
priority: P1
milestone: MEM-M2
depends_on:
  - "TASK-MEM-0001"
  - "TASK-MEM-0002"
related_plan: docs/ai_atomic_framework/atm-memory-governance/ATM 跨專案記憶治理計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "templates/skills/atm-memory-consolidate.skill.md"
  - ".agents/skills/atm-memory-consolidate/SKILL.md"
  - "scripts/validate-skill-templates.ts"
deliverables:
  - "templates/skills/atm-memory-consolidate.skill.md"
  - ".agents/skills/atm-memory-consolidate/SKILL.md"
validators:
  - "git diff --check"
  - "npm run typecheck"
  - "npm run validate:skill-templates"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert template + installed copy together; requiredTemplateIds list in the validator must be reverted in the same commit."
atomizationImpact:
  ownerAtomOrMap: "atm.agent-skills"
completed_at: "2026-07-14T16:33:40.318Z"
completed_by_agent: "claude-fable-5"
closedAt: "2026-07-14T16:33:40.318Z"
closedByActor: "claude-fable-5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T16-33-40-318Z-close-d8caad05daec"
lastTransitionAt: "2026-07-14T16:33:40.318Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "47100ce95591fb40aabcb03742b897e3dd704b8e"
---

# TASK-MEM-0003 atm-memory-consolidate skill

計畫書 Milestone 2 前半。仿照 Claude Code `consolidate-memory` skill 的三階段
流程，寫成 ATM skill：**源頭模板** `templates/skills/atm-memory-consolidate.skill.md`
（英文、schemaId atm.skillTemplate）+ AAF 本地安裝副本
`.agents/skills/atm-memory-consolidate/SKILL.md`。TASK-AAO-FABLE-009 教訓：
兩者必須同 commit 落地且內容等價，缺源頭模板等於各廠商永遠裝不到。

Skill 三階段（操作對象是目前 repo 經 keep registry 解析出的 keep-memory 目錄）：

1. **Take stock**：讀 summary 記憶索引段落 + 掃每檔 frontmatter，標記重複、
   過期（引用 `memory-manager stale-report`）、單薄。
2. **Consolidate**：分離耐久與過期（status 型過期即退役或摘要併入耐久檔）；
   合併同主題檔案；相對時間改絕對日期；可從 repo 正式文件重查的內容刪除；
   穩定半年以上的 gotcha 提案升級 keep-shards（列清單交人審，不自動改 shards）。
3. **Tidy index**：跑 `node tools_node/memory-manager.js rebuild-index`，確認
   summary 預算內；報告觸碰檔數與變更摘要。

## 驗收

- `npm run validate:skill-templates` 綠（含把新 id 加進 requiredTemplateIds）。
- 模板可被五個 adapter compiler 正常編譯（validator 既有斷言涵蓋）。
- 安裝副本與模板內容等價（modulo 模板 frontmatter schema）。
- Skill 文字明載：升級 shards 一律人審、不自動 mutate 共識層。
