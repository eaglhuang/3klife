---
doc_id: doc_task_0029
id: HARN-PILOT-0001
priority: P0
phase: Phase4
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: pilot
chain_id: HARN-CHAIN-PILOT
chain_step: 1/3
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-HDO-0003
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 建立 Doc-only Pilot 任務卡 | 阻塞: depends HARN-HDO-0003"
---

# [HARN-PILOT-0001] 執行 Doc-only Pilot

> **Harness rollout 開卡** — 以文件型工作驗證 artifact + handoff 的最小落地路線
> **定位**：Phase 4 / Pilot and adoption 第 1 步
> **前置依賴**：`HARN-HDO-0003` finalize 已可輸出 artifact 與 handoff diff

## 問題描述

正式 rollout 不能直接從最複雜的 UI workflow 開始。doc-only 是最便宜、最穩定、最適合檢查 handoff 漏檔問題的 pilot 類型。

這張卡要用文件工作流實際跑至少 3 次，驗證：

- turn artifact 是否足以描述本輪上下文
- handoff diff 是否能抓出漏檔或額外 dirty file
- 下一位 Agent 是否不用翻整段聊天紀錄也能接手

## INPUT_CONTRACT

- finalize 已可產出 turn artifact
- handoff diff validator 已整合進 finalize
- pilot 可使用 `docs/inside-openai-agent-collaboration-study-notes.md` 類型的文件工作作為樣本

## OUTPUT_CONTRACT

- [ ] 完成至少 3 次 doc-only pilot run
- [ ] 每次 run 都保存 artifact 與 handoff diff 結果
- [ ] 產出一份 doc-only pilot 摘要：漏檔率、warn/fail 次數、可交接性觀察
- [ ] 確認 doc-only workflow 在沒有 trace 的情況下仍可提供足夠證據
- [ ] 將觀察回寫到 rollout notes 或 governance 決策

## VALIDATION_CMD

```bash
node tools_node/finalize-agent-turn.js --workflow doc-only-pilot --task HARN-PILOT-0001 --goal "doc only pilot" --files docs/inside-openai-agent-collaboration-study-notes.md --emit-turn-artifact --validate-handoff --json
```

## ROLLBACK_HINT

```bash
git checkout artifacts/turn-artifacts/
git checkout scratch/
```

## 執行步驟

1. 先選 3 個代表性的 doc-only 任務，不要混入程式碼修改。
2. 每次 run 都保留 artifact 與 handoff verdict，供事後比較。
3. 觀察 handoff mismatch 類型是否集中在特定漏報模式。
4. 若 doc-only 已不穩，先修 artifact/handoff 層，再進下一類 pilot。
5. 完成後將結果交給 `HARN-PILOT-0002` 作為更複雜 workflow 的基線。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿）
- 驗證證據：HDO-0003 尚未交付；doc-only pilot run 未執行。
- 需修改：等 finalize handoff integration 後執行至少 3 次 doc-only pilot。
