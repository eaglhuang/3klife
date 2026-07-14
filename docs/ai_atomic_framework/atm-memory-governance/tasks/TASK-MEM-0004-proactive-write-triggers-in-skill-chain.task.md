---
task_id: TASK-MEM-0004
title: "主動寫入觸發契約寫進 handoff/dispatch/orient skill 源頭模板"
status: done
owner: atm-core
priority: P2
milestone: MEM-M2
depends_on:
  - "TASK-MEM-0001"
related_plan: docs/ai_atomic_framework/atm-memory-governance/ATM 跨專案記憶治理計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "templates/skills/atm-handoff.skill.md"
  - "templates/skills/atm-dispatch.skill.md"
  - "templates/skills/atm-orient.skill.md"
  - ".agents/skills/atm-handoff/SKILL.md"
  - ".agents/skills/atm-dispatch/SKILL.md"
  - ".agents/skills/atm-orient/SKILL.md"
deliverables:
  - "templates/skills/atm-handoff.skill.md"
  - "templates/skills/atm-dispatch.skill.md"
  - "templates/skills/atm-orient.skill.md"
validators:
  - "git diff --check"
  - "npm run typecheck"
  - "npm run validate:skill-templates"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "純模板文字新增段落；revert 不影響 skill 其他契約。"
atomizationImpact:
  ownerAtomOrMap: "atm.agent-skills"
completed_at: "2026-07-14T16:32:40.157Z"
completed_by_agent: "claude-fable-5"
closedAt: "2026-07-14T16:32:40.157Z"
closedByActor: "claude-fable-5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T16-32-40-157Z-close-f47a1375f87f"
lastTransitionAt: "2026-07-14T16:32:40.157Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "f45aed3c139228b2fd2c716b83155b997b2b8070"
---

# TASK-MEM-0004 主動寫入觸發契約進 skill 鏈

計畫書 Milestone 2 後半。把「什麼時候該寫記憶、什麼時候不寫」從個別代理的
習慣升級成 skill 鏈契約，寫進三個源頭模板（+ 同步 AAF 安裝副本）：

- `atm-handoff`：交接摘要收尾必答一段「memory write check」——本輪是否有
  (a) 踩坑已確認解法、(b) 重大收口快照、(c) 人類指正、(d) 推翻舊記憶。
  有則寫入該 repo 的 keep-memory（按 TASK-MEM-0001 契約），無則明寫「無」。
- `atm-dispatch`：condition review 收口段加同一組觸發檢查；代理回報格式
  增加一項「keep-memory 寫入：<檔名 | 無 + 理由>」。
- `atm-orient`：orientation 步驟加「讀取該 repo keep-memory 索引段落」，
  讓冷啟動代理先吃過既有教訓再動工。

三個模板都要同時載明**不寫規則**（repo 已記錄不重複、僅當下有效不寫、
治理事實優先 backlog / task card），防止記憶層變成垃圾場。

## 驗收

- 三個源頭模板 + 三個安裝副本同 commit、內容等價。
- `npm run validate:skill-templates` 綠。
- 觸發清單與不寫規則的文字與 `docs/keep-memory/README.md`（TASK-MEM-0001）
  一字不差引用同一版本（單一真相來源：README 是正文，模板是摘錄 + 連結）。
