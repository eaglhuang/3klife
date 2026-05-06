# ATM 框架演進執行規劃書 — 附錄 A/B

> 這是 `ATM框架演進執行規劃書.md` 的「附錄 A/B」分片。完整索引見 `docs/ai_atomic_framework/ATM框架演進執行規劃書.md`。

## 附錄 A：v2 校正補丁（2026-05-06）

> 本附錄原作為 v1 主結構補丁；2026-05-06 已同步回寫 §1、§3、§4、§5、§7，後續以主文與本附錄一致後的版本為準。

### A.1 真相同步

- v2 + 附錄 B 落地後 `summary = { done: 32, in_progress: 0, open: 55, total: 87 }`，數字與 §1 一致；後續若再對齊，**一律以 thin index summary 為唯一真相**，不再人工列舉。
- §7 排除清單改為：`thin index status=done` 全部凍結（含 `ATM-0-0010 / 0011 / 0013 / 0014`、`ATM-2-0013` 等），不再人工列舉避免漏項。
- `ATM-0-0002` 的 `.md` frontmatter 與 JSON shard 已同步為 `done`（completed 2026-05-06），並已從 §5.1 alpha0 critical path 移除「等待 ATM-0-0002」這一步。

### A.2 9 項硬約束（落地為任務卡 acceptance）

1. **ATM-2-0014 schema-additive only**：不得修改既有 `packages/core/src/registry/*` 對外契約；舊 registry fixture 必須維持全綠；只能新增 `currentVersion` 與 `versions[]` 欄位。
2. **lifecycleMode 落點**：`birth | evolution` enum 寫入 `packages/plugin-sdk/src/lifecycle.ts`（由 ATM-2-0006 承接），並映射回 `schemas/atomic-spec.schema.json` 既有 `compatibility` 區塊；不另開新 schema。
3. **HumanReviewGate 永遠是 reference plugin**：ATM-2-0021 以 `packages/plugin-human-review/*` 形式提供；core 僅依賴 schema，不依賴實作；hard dependency 違規由 ATM-2-0010 layer-boundary scanner 阻擋。
4. **Neutrality scanner 範圍**：ATM-2-0010 的 deterministic / semantic 掃描必須同時涵蓋 `.atm/reports/upgrade-proposals/*` 與 evidence-store payload；adopter 私有資訊（如 3KLife / Cocos / UCUF）一律 hard fail。
5. **ATM-0-0002 階段降權**：已 done，從 alpha0 critical path 移除；新增 ATM-2-0014+ 不再受其阻塞。
6. **rollback proof 規格**：ATM-2-0022 acceptance 寫死「rollback 後執行 `atm verify --self`，spec/code/test 三段 hash 必須與目標版本 registry entry 完全一致；任一不符即 hard fail 並產出 `rollback-proof.failure.json`」。
7. **shard 容量先行檢查**：開新卡前必跑 `node tools_node/rebuild-tasks-atm-auto-parts.js`，若 part-22 已逼近 10KB / 300 行，由 store 自動切 part-23+，不手動管理。
8. **regression 不退轉**：所有 evolution-mode 工具新增時，birth-mode 既有 fixture 必須維持全綠；違規由 ATM-2-0017 compare gate 阻擋。
9. **alpha0 邊界守則**：alpha0 critical path 任何一步若需要 evolution 能力，立即停下重評估；evolution 在 alpha0 只可作為 advisory / readiness warning，不可作 blocker。

### A.3 替代方案備註

- **方案 B（合併 ATM-2-0014~0017 為單一 Pack）**：違反「一卡一驗收」，不採用。
- **方案 C（BuildAgentPrompt / ExecuteAgentTask 升格為 ATM-CORE-0004/0005 自舉）**：alpha0 critical path 會重新洗牌，不採用；維持 ATM-2-0018/0019 卡片粒度。

### A.4 實作順序覆寫 §5

由於 ATM-0-0002 已 done，alpha0 critical path 改為：

1. 補強並落地 `ATM-2-0005`（含 lifecycleMode 報告欄位）。
2. 落地 `ATM-2-0012` neutralityScanner（落於 `atomic_workbench/atoms/<Atomic ID>/`，資料夾名稱直接等於 Atomic ID）。
3. 通過 `ATM-2.5-0001` / `ATM-2.5-0002` deterministic gate。

α0+ 補洞：`ATM-2-0018` → `ATM-2-0019`。

α1-prep（演化基礎）：`ATM-2-0014` → `ATM-2-0015` → `ATM-2-0016` → `ATM-2-0017`，並補強 `ATM-2-0006/0007/0008/0009/0010/0011` acceptance。

α1 演化閉環首次完整驗證：`ATM-2-0020` → `ATM-2-0021` → `ATM-2-0022` → `ATM-3-0014` → `ATM-4-0007`。

---

## 附錄 B：原子地圖（Atomic Map）演化（2026-05-06）

> 補強：使用者於 v2 補丁後追加共識——重要功能的品質往往來自 **多個原子組成的 Atomic Map**，演化必須同時涵蓋「單一原子」與「原子地圖」兩個層級。

### B.1 核心定義

- **Atomic Map**：由多個 atom 透過 dependency / composition 組成的結構，自身有 `mapId` 與 `mapVersion`。
- **Map Composition Hash**：`mapHash = hash(sorted(atomId@version[]) + edges + entrypoints)`；任一成員 atom 升版都會反映到 mapHash。
- **品質量化目標**：每個 map 必須有可量化的 `qualityTargets`（例如 errorRate / latency / coverage / domain-specific KPI），作為比較基準。

### B.2 演化決策：版本升級 vs. 拆出新原子

每次 evolution proposal 必須先做一次 **decomposition decision**：

| 訊號 | 建議路徑 |
|---|---|
| 改動局限於單一 atom 內部、API 契約不變 | atom version bump（v1.0 → v1.1） |
| 行為差異大到會破壞既有 consumer 期待 | 拆出新 atom（atom v1.0 保留 + atom-fork v1.0 新增），map 改 edge 指向 |
| 改動跨越多個 atom 邊界 | map version bump（mapVersion 升級），同時對涉及 atom 做個別決策 |

decision 必須記錄在 `upgrade-proposal.json` 的 `decompositionDecision` 欄位（enum: `atom-bump | atom-extract | map-bump`），由自動 gate + 人類審核共同確認。

### B.3 整合測試硬規則

任一 atom 升版或 map 升版時，**必須**：

1. 跑該 atom 自身的 birth-mode regression（既有 ATM-2-0005 / 0017 已涵蓋）。
2. 跑 **所有引用該 atom 的 map** 的整合測試套件（map-level integration tests）。
3. 跑 **所有應用該 map 的 consumer atom / adapter** 的 application-level smoke tests。

任一層綠燈不全 → upgrade proposal 自動標記 `status=blocked`，不進 review queue。

### B.4 任務卡延伸（追加於 §B 章節 acceptance）

下列既有新卡 acceptance 在 v2 批次落地時已併入，但因屬於本附錄共識，特此索引：

| 卡號 | 追加內容 |
|---|---|
| ATM-2-0017 | quality-comparison-report 必須含 `mapImpactScope`（被影響的 mapIds[]）與 `propagationStatus`（per-map 整合測試結果）。 |
| ATM-2-0020 | upgrade-proposal.schema.json 增加 `decompositionDecision`、`mapImpactScope` 兩欄；CLI 新增 `--target atom|map` 切換。 |
| ATM-2-0022 | rollback 支援 `--target map`；map rollback 需同時驗證所有成員 atom 的 hash 與目標 mapVersion 一致。 |

### B.5 新增任務卡（map 層級）

| 卡號 | 名稱 | 階段 | 依賴 |
|---|---|---|---|
| ATM-2-0023 | Atomic Map Schema & Registry | α1-prep | ATM-2-0014 |
| ATM-2-0024 | Map-Level Upgrade & Extract-vs-Bump Decision | α1 | ATM-2-0020, ATM-2-0023 |
| ATM-2-0025 | Cross-Atom Integration Test Runner | α1 | ATM-2-0003, ATM-2-0023 |
| ATM-4-0008 | H2U Map Evolution Pilot | α1 | ATM-4-0007, ATM-2-0024, ATM-2-0025 |

詳細 acceptance / deliverables 見對應任務卡。

