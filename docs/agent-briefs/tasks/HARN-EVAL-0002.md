---
doc_id: doc_task_0012
id: HARN-EVAL-0002
priority: P2
phase: Phase2
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: vs-insiders-gpt-5.4-mini
status: done
type: baseline-fixture
chain_id: HARN-CHAIN-EVAL
chain_step: 2/3
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-EVAL-0001
started_at: "2026-05-06T15:28:22.7244378+08:00"
started_by_agent: "vs-insiders-gpt-5.4-mini"
completed_at: "2026-05-06T15:35:46.9910026+08:00"
completed_by_agent: "vs-insiders-gpt-5.4-mini"
notes: "2026-05-06 | 狀態: done | 驗證: baseline fixtures: 5；fixture schema/classification pass: 5；check:encoding:touched pass | 變更: 新增 tests/fixtures/harness-paths/index.json 與 5 份 canonical pass fixture，內含 turnArtifact + execution-trace + traceSummary 對照，供後續 comparator 直接引用 | 阻塞: none"
---

# [HARN-EVAL-0002] 建立 Workflow Baseline Fixture Pack

> **Harness rollout 開卡** — 為每類 path class 建立可回放的比較基準
> **定位**：Phase 2 / Eval baseline 第 2 步
> **前置依賴**：`HARN-EVAL-0001` taxonomy 已穩定

## 問題描述

path taxonomy 只有分類，還沒有 baseline。若沒有 fixture pack，之後每次 drift comparison 都只能拿當下真實案例臨時比對，無法穩定回歸。

這張卡要為主要 workflow 類別建立 1-2 組 baseline trace/artifact fixture，做為 path stability 的最小基準。

## INPUT_CONTRACT

- workflow path taxonomy 已明確定義 5 種主要類別
- artifact 與 trace 都已有可保存的正式路徑
- fixture 可從 pilot 或 mock trace 取得，不要求全部先來自真實 production run

## OUTPUT_CONTRACT

- [ ] 為每個主要 path class 建立至少 1 組 baseline fixture
- [ ] fixture 至少包含 turn artifact 與 trace summary 對照
- [ ] fixture metadata 需標示 path class、來源、驗證狀態
- [ ] 補 fixture pack 索引，讓 comparator 可直接讀取
- [ ] baseline fixture 必須可重跑或可被替換升版，不是一次性快照堆積

## VALIDATION_CMD

```bash
node -e "const fs=require('fs'); const p='tests/fixtures/harness-paths/index.json'; const data=JSON.parse(fs.readFileSync(p,'utf8')); console.log('baseline fixtures:', data.fixtures.length);"
```

## ROLLBACK_HINT

```bash
git checkout tests/fixtures/harness-paths/
```

## 執行步驟

1. fixture pack 先求覆蓋主要路徑，不求一開始就全來自真實生產案例。
2. 同一類 path 可先保留一份 canonical pass fixture，再逐步補 warn/fail 變體。
3. metadata 需寫清楚來源與適用版本，避免 fixture 過期卻沒人知道。
4. 基準樣本要能被後續 drift comparator 直接引用，不再做二次轉換。
5. 完成後再由 `HARN-EVAL-0003` 將 comparator 接到這批 fixture 上。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿）
- 驗證證據：taxonomy 尚未定義；未見 baseline fixture pack。
- 需修改：等 EVAL-0001 後建立 workflow baseline fixture pack。
