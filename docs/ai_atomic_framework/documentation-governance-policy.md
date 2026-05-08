<!-- doc_id: doc_other_0090 -->
# ATM Documentation Governance Policy

## Purpose

本政策用來治理 `docs/ai_atomic_framework/` 底下多版本、多角色、跨時期累積的文件集合，避免同一個主題同時出現多份看起來都像「主文件」的平行真相。

本輪治理的目標是先完成**邏輯收斂**，不是立刻大量搬移檔案。也就是先定義每份文件的治理身分、真相邊界與回寫規則，再安排後續的實體目錄整理。

## Role Definitions

- `canonical`
  - 某個主題當前唯一的正式真相文件。
- `reference`
  - 補充說明、提案彙編、矩陣、手冊、案例或萃取結果，可解釋 canonical，但不能覆寫 canonical。
- `adopter`
  - 下游採用者或共存方案文件，例如 3KLife / html-to-ucuf / H2U；描述消費方式、整合方式、遷移方式，但不能定義 ATM 核心真相。
- `history`
  - 已被取代或凍結的歷史版本，只保留脈絡，不再承擔現行治理責任。
- `index`
  - 路由入口與閱讀索引，負責指向真相，不負責產生另一套真相。
- `shard`
  - 父文件的拆分投影，本身不是獨立真相；其內容應受父文件治理。
- `asset`
  - SVG / 圖示 / 視覺輔助素材，不承擔文字政策真相。

## Core Rules

1. One Topic, One Canonical Owner
   - 同一主題只能有一份 canonical owner。若新內容與既有 canonical 主題重疊，預設做 backwrite，不得平行再開一份新的主文件。

2. Decisions Must Backwrite Canonical
   - 任何新的正式決策、邊界修正、流程調整，必須在同一張 task card 內回寫到對應 canonical。

3. Reference Explains, Not Overrides
   - `reference` 可以提供分析、推導、案例、矩陣、手冊，但不能用來覆蓋 canonical 的定義。

4. History Is Frozen
   - `history` 文件一旦標記為凍結，不再接受新的現行決策回寫；若要保留，僅能加註 superseded 關係或遷移註記。

5. Shards Follow the Parent
   - `shard` 只能承接父文件的內容拆分。更新 shard 後，必須同步維護父文件 / 索引 / shard 關係，不能讓 shard 自己成為另一套真相。

6. Adopter Docs Cannot Define Core ATM Truth
   - `adopter` 文件可描述 3KLife 與 ATM 的共存、採用、回灌、版本追蹤與下游治理，但不可反向定義 ATM core 規範。

7. Index Routes, Not Governs
   - `index` 文件負責導覽與勾稽；若索引與 canonical 衝突，以 canonical 為準，索引必須修正。

## Root Admission Rule

`docs/ai_atomic_framework/` 根目錄應優先保留以下角色：

- `canonical`
- `index`
- `asset`
- 少量高價值、短期仍需要直接可見的 `reference`

新文件若沒有明確理由，不應直接進 root；優先判斷是否應 backwrite 既有 canonical，或放入 `references/`、`adopters/`、`history/`、`assets/` 等子目錄。

## Canonical Owner Rule

目前建議的 canonical owner 如下：

- `AI_Atomic_Framework_Roadmap.md`
  - 願景、核心原理、長期方向。
- `AI原子框架開發計畫書.md`
  - 當前可執行的主計畫與 rollout。
- `ATM框架演進執行規劃書.md`
  - 現行校正、治理補丁、演進 delta ledger。
- `ATM_cross_reference.md`
  - 唯一路由入口索引。
- `framework-function-atomization-manifest.md`
  - 全框架功能原子化 coverage manifest。
- `upstream-versioning-policy.md`
  - upstream 版本、相容性與生命周期政策。
- `原子行為參考手冊.md`
  - 行為層參考手冊。

## New Document Intake Workflow

每當有新文件或新版本要進來時，必須依序回答：

1. 這份內容到底在處理哪一個主題？
2. 這個主題是否已經有 canonical owner？
3. 如果有，這次應該是 backwrite、補 shard，還是新增 reference？
4. 如果沒有，是否真的需要新增一份主文件，而不是擴充既有 canonical？
5. 為這份文件指派 `canonical / reference / adopter / history / index / shard / asset` 角色。
6. 分配 `doc_id`，並同步更新 registry / cross-reference / 必要索引。

## Version and History Handling

新版本或歷史版本只能走三種路徑：

- `backwrite`
  - 內容吸收到既有 canonical。
- `reference`
  - 保留為補充文件，但明確標示不覆蓋 canonical。
- `history`
  - 凍結為歷史版本。

禁止再新增沒有治理身分的 root-level 平行主文件，例如：

- `v0.2`
- `optimized`
- `proposal`
- `new roadmap`

除非它們在建立當下就被清楚標成 `reference` 或 `history`。

## Physical Move Strategy

### Phase 1: Logical Classification First

先完成角色分類與 owner 指派，不急著大量搬檔。

### Phase 2: Routing Stabilization

補齊 cross-reference、doc registry、必要的 redirect stub、父文件與 shard 關係。

### Phase 3: Physical Reorganization

等勾稽穩定後，再將文件實際移入：

- `references/`
- `adopters/`
- `history/`
- `assets/`

## Maintenance Rules

- 每次新增 ATM 文件或大幅改版前，都要先檢查本政策。
- 新 proposal 若已被 canonical 吸收，原 proposal 應轉為 `reference` 或 `history`。
- 任何新 root 文件若沒有明確角色與 owner，視為不合格輸入。

## Future Automation Suggestion

後續可新增 `validate-atm-doc-governance`，至少檢查：

- root 文件是否都已有 role
- 是否出現重複 canonical owner
- `history` 文件是否仍被當主入口引用
- shard 與 parent 的映射是否完整

## Current Governance Position

目前真正需要的不是立刻「大搬家」，而是先讓每份文件有清楚的治理身分，避免未來新版本繼續以平行宇宙方式累積。當角色、owner、回寫規則先穩下來，後續的實體整理就會容易很多。
