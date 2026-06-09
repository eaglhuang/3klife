<!-- doc_id: doc_team_templates_readme -->
---
doc_id: doc_team_templates_readme
owner: atm-core
status: active
related_plan: ../團隊自動化代理分工計畫.md
related_tasks: ../tasks/README.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
milestone: M0/M1 docs-only
public_tracking: false
created_at: 2026-05-28
last_updated: 2026-06-04
---

# Team Agents Templates

這個目錄存放 ATM Team Agents 的最小模板套件。
M0（先前的 commit）固化了 6 份 Markdown 模板，本份 README 屬於 **M1 docs-only**，定義它們的用途、選用時機、最小工作流。

> **這是 docs-only 規劃層**：模板尚未綁定完整 CLI runtime、不寫 `.atm/runtime/**`，也不取代任何 ATM gate。實作層（schema / validator / knowledge index / CLI）將在後續任務卡 `TASK-TEAM-0004 ~ TASK-TEAM-0006` 與 `TASK-TEAM-0020+`（target repo：AI-Atomic-Framework）中落地。

## 範圍

- M0：固化 6 份模板骨架（本目錄已完成）。
- M1：說明用途、選用時機、最小工作流（本份 README）。
- 之後：對應 `TASK-TEAM-0004 ~ 0006` 在 AI-Atomic-Framework 補上 schema validator 與 CLI 對應。

## 模板清單

| 檔案 | 中文定位 | 何時使用 |
|---|---|---|
| [`team-brief.md`](./team-brief.md) | 任務開工簡報 | **task start**：Captain 開新 team run 時必寫 |
| [`agent-report.md`](./agent-report.md) | 隊員工作回報 | **worker done**：每位 agent 完成一輪後交回 |
| [`team-summary.md`](./team-summary.md) | 隊長彙整 | **captain wrap-up**：close / checkpoint 前必寫 |
| [`captain-decision.md`](./captain-decision.md) | 隊長決策記錄 | **major decision**：遇到分歧、拆卡、升級 channel 等需拍板情境 |
| [`team-memory-shard.md`](./team-memory-shard.md) | 任務知識碎片 | **lesson learned**：任務後若有可重用經驗才寫；M2K+ 可作為 knowledge index 的 canonical shard source |
| [`patrol-report.md`](./patrol-report.md) | 巡邏報告 | **patrol**：Atomic Police / Patrol Agent 巡查時使用 |

## 最小工作流

```
[1] Captain 建 team-brief.md
     │  ─ 含完整 Atomization Plan，分配隊伍與權限
     ▼
[2] Agent 完成任務後寫 agent-report.md
     │  ─ 每位 agent 一份；validator / scope-guardian / evidence-collector 各自交付
     ▼
[3] Captain 寫 team-summary.md
     │  ─ Decision、Implementation、Validators、Evidence、Risk、Close-Ready 一次到位
     ▼
[4] 若中途遇到重大分歧 → captain-decision.md（每筆獨立一份，逐筆追溯）
     │
     ▼
[5] 任務結束後若有可重用經驗 → team-memory-shard.md（諮詢性，不是 task ledger；M2K+ 可被索引）
     │
     ▼
[6] 巡邏（daily / claim-preflight / close-preflight / big-script）→ patrol-report.md
        ─ 預設 read-only；未授權不得寫入 source
```

最簡情況：只用 1 + 2 + 3 三份模板即可完成一輪 team run。
4、5、6 視需要才寫，**不是每張任務都必寫**。

## 強制守則

1. **Atomization Planner 是每張 task 的必備角色。**
   `team-brief.md` 內的 `## Atomization Plan` 區塊（含 Primary atom / Related atoms / Capability touched / Command surface / Large-script risk / Map update needed / Recommended implementation slice / Do-not-cross boundary / Split recommendation 九個欄位）**全部必填**，不可省略。這個區塊是阻擋大檔細節吃掉整輪 token 的第一道閘門。

2. **Patrol 預設 read-only。**
   `patrol-report.md` 屬於診斷與建議文件，**不是修改授權**。巡邏隊（Atomic Police / Patrol Agent）未經獨立 task card 授權，不得對任何 source 進行寫入操作。任何修改提案必須走獨立 task card 完整 ATM 治理流程。

3. **這些模板不取代 ATM evidence。**
   `team-summary.md` 與 `team-memory-shard.md` 是諮詢層文件；正式 evidence 仍由 Coordinator 寫入 `.atm/history/evidence/<TASK-ID>.json`。

4. **知識查詢預設由 Captain / Planner / Knowledge Scout 先做。**
   不預設每位 agent 開工都自行掃描 shard corpus。正常流程應先 query、再濃縮 top hits 進 brief，避免 token 與延遲失控。

5. **這些模板不取代 task card。**
   ATM `TASK-*.task.md` 仍是任務真相來源；本目錄模板是工作面溝通格式，不能用來覆寫任務狀態。

6. **Exclusive permission 唯一性。**
   `team-brief.md` 內若分派寫入型權限（`task.lifecycle` / `git.write` / `file.write` / `database.write` / `pipeline.write` / `ci.write` / `evidence.write` / `sandbox.write`），同一 team run 內每個 exclusive 權限只能有一個 owner。

7. **canonical shard 與 generated cache 分層。**
   `team-memory-shard.md` 這類可 review 的 lesson source 與 `.atm/runtime/knowledge/**` 這類可重建 cache / index 不可混放。runtime cache 永遠不該成為新真相來源。

## 命名與檔案存放建議

- 模板本身（本目錄）：保留為「空白範本」，不寫入實際任務內容。
- 實際填寫的副本：建議放在所屬任務的 evidence 目錄或專案 working notes 中，例如：
  - `3KLife/local/team-runs/<TASK-ID>/team-brief.md`
  - `AI-Atomic-Framework/.atm/history/team-runs/<TASK-ID>/team-summary.md`（待 runtime 落地後才使用）
  - `AI-Atomic-Framework/.atm/knowledge/framework/shards/<SHARD-ID>.md`（framework 專屬 lesson）
  - `<adopter-repo>/.atm/knowledge/project/shards/<SHARD-ID>.md`（project / adopter 專屬 lesson）
  - `<repo>/.atm/runtime/knowledge/**`（manifest / inverted-index / stats / embedding cache；generated only）

> 本份 README 僅描述 docs-only 規範，存放路徑屬於建議；正式存放與 query / compact 規範將在 `TASK-TEAM-0011 ~ TASK-TEAM-0016` 與 `TASK-TEAM-0020+` 落地時定義。

## 相關文件

- 主計畫：[../團隊自動化代理分工計畫.md](../團隊自動化代理分工計畫.md)
- 任務索引：[../tasks/README.md](../tasks/README.md)
- 對應實作卡：`TASK-TEAM-0004`、`TASK-TEAM-0005`、`TASK-TEAM-0006`（target repo：AI-Atomic-Framework）
