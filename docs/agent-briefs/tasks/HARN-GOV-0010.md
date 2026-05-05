---
doc_id: doc_task_0244
id: HARN-GOV-0010
priority: P1
phase: M0
created: 2026-05-05
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: 2026-05-05T13:16:14+08:00
started_by_agent: GitHubCopilot
type: implementation
chain_id: HARN-CHAIN-DOCID-HARDEN
chain_step: 1/1
sensor_triggered_by: user-followup-doc-id-complete
depends: []
notes: "2026-05-05 | 狀態: done | 驗證: inject-doc-ids --dry-run（index/other/spec/tech/server 20 筆 + UI 補漏 4 筆）、doc-id-registry --verify = 0 warning、check-encoding-touched PASS、compute-gate quick PASS | 變更: 剩餘 24 筆 warning 全數同步回 registry 真值，未改動 HARN-GOV-0007 內容 | 阻塞: none"
---
# [HARN-GOV-0010] 完成剩餘 doc_id warning 清理

> **Harness follow-up 開卡** — 把剩餘 index / other / spec / tech / server 類別 warning 一次同步到 registry 真值，收斂 doc-id verify。
> **定位**：Phase G+4 / Final registry hygiene
> **前置依賴**：HARN-GOV-0009 已清零 task / ai / agentskill backlog

## 問題描述

`HARN-GOV-0009` 完成後，`doc-id-registry --verify` 仍殘留 24 筆 warning，分散在 `index / other / spec / tech / server` 類別，另有 4 筆 `ui` 類 warning 於 verify 尾段浮現；需要一次同步回 registry 真值並清到 0 warning。

## INPUT_CONTRACT

- doc-id-registry --verify 剩 24 筆 warning
- inject-doc-ids 已支援 category/path filter 與 registry sync
- 不再改動 HARN-GOV-0007

## OUTPUT_CONTRACT

- [x] index / other / spec / tech / server 類別 warning 清零
- [x] verify 收斂到 0 warning
- [x] 任務卡與驗證結果回寫

## VALIDATION_CMD

```bash
node tools_node/inject-doc-ids.js --dry-run --categories index,other,spec,tech,server
node tools_node/inject-doc-ids.js --paths "docs/ui/UI-factory-agent-entry.md,docs/ui/UI-vibe-pipeline.md,docs/遊戲規格文件/系統規格書/英靈虎符與特種軍隊視覺契約補遺_2026-04-04.md,docs/UI品質檢核表.md"
node tools_node/doc-id-registry.js --verify
node tools_node/compute-gate.js --profile quick --agent-feedback --no-stop
```

## ROLLBACK_HINT

```bash
git checkout -- docs/keep-shards/keep-status.md docs/keep-shards/keep-workflow.md docs/tasks/README.md docs/battle-entry-unification-checklist.md docs/doc-id-registry.md docs/html_skill_plan3.md docs/html-to-ucuf-plan5-stale-rule-audit.md docs/sanguo-rag-abab-progress-workflow-plan.md docs/UCUF已驗收功能.md docs/學習文件/harness_engineering_analysis.md server/npc-brain/文件/人物資料生產線簡報圖.md server/npc-brain/文件/NPC行為決策流程.md docs/遊戲規格文件/系統規格書/戰場格子系統.md docs/遊戲規格文件/系統規格書/關卡設計系統.md docs/遊戲規格文件/討論來源/20260410/英靈祭奠與世家系統規則.md docs/遊戲規格文件/討論來源/三國遊戲模式串接與循環.md docs/遊戲規格文件/討論來源/比較舊的/遊戲機制優化與策略建議.md docs/遊戲規格文件/設計參考/育成與戰鬥公式基準手冊.md docs/特效研究/Cocos 3D 粒子生成器 Agent Skill.md docs/特效研究/vfx-health-report.md docs/ui/UI-factory-agent-entry.md docs/ui/UI-vibe-pipeline.md docs/遊戲規格文件/系統規格書/英靈虎符與特種軍隊視覺契約補遺_2026-04-04.md docs/UI品質檢核表.md temp_doc_id_changed.txt
```

## 執行步驟

1. 建立任務卡與 scope
2. dry-run 抽出剩餘 24 筆目標
3. 正式同步 doc_id 並驗證
4. 更新任務卡與解鎖

*由 GitHubCopilot 透過 task-card-opener 開立 | 2026-05-05*
