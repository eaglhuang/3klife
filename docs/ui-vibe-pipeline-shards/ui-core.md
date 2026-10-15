# UI Vibe Pipeline — Core（TL;DR · §1–§3 · §3.1）

> 這是 `UI-vibe-pipeline.md` 的「Core（TL;DR · §1–§3 · §3.1）」分片。完整索引見 `docs/ui/UI-vibe-pipeline.md`。

<!-- doc_id: doc_ui_0050 -->
# UI Vibe Coding 自動化生產藍圖

## TL;DR

本文件定義一條適用於 Cocos Creator 3.8 的 UI 自動化生產工作流，目標是用 `UI 示意圖 / proof draft + UCUF 藍圖 + JSON layout spec + skin asset manifest + Cocos 預覽生成器 + Browser QA + Agent Skill`，把 UI 生產流程從「手工拖節點 + 手工換圖」改造成「圖驅動啟動 + 資料驅動組裝 + 可預覽 + 可驗證 + 可自動迭代 + 可批量替換美術 Atlas」的模式。

Unity 對照：
- `ui-layout.json` 類似 Prefab 結構描述 + Layout 規則
- `ui-skin.json` 類似 Theme ScriptableObject / Sprite Atlas Mapping
- `ui-screen.json` 類似某個畫面的裝配設定
- Cocos 預覽生成器類似 Unity EditorWindow + Prefab Variant Builder
- Workspace Skill 類似團隊版的固定 SOP，自動要求 Agent 走一致流程

---

## 1. 目標與非目標

### 1.1 目標

1. 徹底降低 UI 錯亂風險
2. 能快速預覽，讓 AI 與人都能邊做邊調
3. 支援大量畫面量產，不靠每張面板手工重做
4. 支援後續美術 Atlas 無縫替換
5. 讓 Auto Atlas 成為打包期能力，而不是設計期綁死點
6. 讓 AI 產圖、AI 生碼、Cocos 匯入、畫面驗證形成一條閉環

### 1.2 非目標

1. 不追求一次性全自動產出完美視覺
2. 不把最終審美判斷完全交給 AI
3. 不把 stitch MCP 當唯一依賴
4. 不讓 Prefab 成為手工排版唯一真實來源

---

## 2. 核心原則

### 2.1 單一真實來源

UI 量產流程的真實來源不是 Prefab，而是三層資料契約：

1. `ui-layout/*.json`
   管結構、版位、Widget/Layout/SafeArea 規則
2. `ui-skins/*.json`
   管 SpriteFrame、9-slice border、字型、顏色、狀態圖對應
3. `ui-screens/*.json`
   管單一畫面的組裝結果，指定用哪個 layout、哪個 skin、哪個 bundle

### 2.2 白模先行，皮膚覆蓋

預覽與實作的第一版永遠可以先用白模跑通，再讓美術皮膚覆蓋。這延續現有 `assets/scripts/ui/components/SolidBackground.ts` 的設計方向。

### 2.3 設計期與打包期分離

設計期以原子資產與 manifest 工作。
打包期才依規則進行 Auto Atlas 彙整。
這樣可以避免美術改圖後，整個設計流程被 Auto Atlas 綁死。

### 2.4 驗證前移

九宮格、命名、padding、bleed、螢幕比例、文字溢出、點擊熱區遮擋，必須在進遊戲前就先驗證，而不是等到整合後才被動修圖。

---

## 3. 端到端工作流

### Phase A: UI 示意圖入口

1. 人工提供 `reference.png`、Figma snapshot、既有頁面截圖，或其他 proofSource
2. `ui-vibe-pipeline` 先將圖面送入 proof draft 分解，而不是先要求人手填完整 recipe
3. 若已有正式規格或既有 runtime sample，再把它們作為補充真相接入

目前 v0 已有 proof 起點的 orchestration 命令：

```bash
node tools_node/run-ui-vibe-workflow.js --proof assets/resources/ui-spec/proof/screens/shop-main.proof.json --use-recommended --write
```

若只有 UI 示意圖 / 截圖，現在也可直接從 proofSource 啟動：

```bash
node tools_node/run-ui-vibe-workflow.js --proof-source docs/戰場示意圖.png --screen-id BattleHudOverlay --family hud-overlay --use-recommended --write
```

這支命令會串接：

1. `compile-proof-to-mcq.js`
2. `compile-mcq-answer-to-recipe.js`
3. `compile-recipe-to-screen-spec.js`
4. `compile-recipe-to-task-card.js`
5. `compile-recipe-to-panel-scaffold.js`

### Phase B: Proof / Family / MCQ 收斂

1. 先拆成 `proof draft`
2. 根據 UCUF family 與既有頁面經驗推 family recommendation
3. 把無法直接推斷的欄位轉成 MCQ
4. 由 MCQ answers 產出 normalized recipe 與 design brief

### Phase C: 任務卡與文件自動化

1. 透過 `task-card-opener` skill 產出 task card / task shard，卡號命名依 `docs/遊戲規格文件/系統規格書/名詞定義文件.md (doc_spec_0008)`
2. 回寫 design brief / review skeleton / runtime skeleton
3. 把 generator、驗證與 smoke route 一起寫進文件，而不是留待人工補齊

### Phase D: UI 框架產生

1. 產出或更新 `layout / skin / screen` 三層 JSON
2. 產出 Composite / Child Panel scaffold
3. 補 mapper / bind path / content requirements

### Phase E: 靜態驗證與 runtime wiring 驗證

1. strict validate
2. asset-db refresh
3. contract / bind path / content requirements 檢查
4. 框架到齊後才准進畫面 QA

### Phase F: Browser QA 與自動調整

1. 在 Browser Review 環境截圖
2. 參考 proof 與既有 family 經驗自動調整 screen
3. 反覆驗證直到只剩 residual polish

### Phase G: 人類驗收

1. 輸出 handoff 摘要
2. 標示 residual polish / blocker
3. 等待人類最終視覺驗收

## 3.1 補充：素材與匯入子流程

以下子流程仍保留，但它們現在屬於上述主流程中的 supporting pipeline，而不再是另一條平行主幹。

建議原始素材區：

```text
artifacts/
  ui-source/
    battle-hud/
    lobby-main/
    popup-common/
```

### Subflow B1: 切片與貼圖 metadata

原始貼圖不能直接丟進 Cocos，要先產生切片 metadata。

每組貼圖至少要有：

1. `slice-manifest.json`
2. 原始 PNG
3. 邊距規則
4. 是否允許進 atlas
5. 是否為 9-slice
6. 是否屬於 hover/pressed/disabled 等狀態圖

### Subflow B2: Cocos 匯入

1. 貼圖匯入指定 bundle 或 resources 路徑
2. 依 manifest 套用 9-slice 設定
3. 由預覽生成器從 `ui-screen.json` 自動建構畫面
4. 如果 skin 未就緒，退回白模
5. 由 `UIManager` / `ResourceManager` 接入執行期流程

### Subflow B3: 預覽與調整

1. 產生預覽畫面
2. 檢查多種螢幕比例
3. 重新調整 layout json 或 skin manifest
4. 再生成一次預覽

### Subflow B4: 驗證與打包

1. 檢查命名規範
2. 檢查 9-slice 整數 border
3. 檢查文字溢出
4. 檢查互動熱區
5. 依 atlas policy 打包 Auto Atlas
6. 驗證 draw call 與圖集大小

---
