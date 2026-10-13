# [PROG-2-0102] 血統活性 Wild Gene 與因子變異 Star Jump 的純邏輯（BLT-07）

給：Codex Agent　｜　里程碑：M2（血統理論）　｜　WBS v3：BLT-07，P0，工時 2.0，狀態「未開始」

## 1. 基本資料
- Repo：`eaglhuang/3klife`，基底分支：`master`
- 工作分支：`codex/PROG-2-0102-wild-gene`，交一個 PR 目標 `master`
- **編號規則**：只用本工單編號 PROG-2-0102，不得自行另取編號。0090～0101 已被占用（0101 已作廢），不要使用。
- 任務卡：`docs/agent-briefs/tasks/PROG/PROG-2-0102.md`（格式照 `PROG-2-0094.md`），依 `CLAUDE.md` / `AGENTS.md` 接卡上鎖、完成後解鎖。
- 先查撞號：開工前搜尋所有遠端分支與 PR，確認沒有人在做 Wild Gene 或 Star Jump。

## 2. 為什麼做
血統理論的兩個機制目前都沒有程式：
- **Wild Gene（血統活性）**：虛擬祖先（BLT-02 已完成）產生時，初代祖先的變異率較高。
- **Star Jump（因子變異）**：變異只提升星級（例如 3→5），不改因子種類。

WBS 寫明：變異只提升星級，初代變異率高於一般。

> 注意：Q38 的機率數字在決策題與待辦檔都沒有記錄。本卡的機率一律用具名常數並標為「暫定」，不要自行寫死在邏輯裡。PR 說明要列出所有暫定常數，等 PM 裁定。

## 3. 先讀
1. `assets/scripts/core/systems/` 內 BLT-02 虛擬祖先生成器與其測試（找 `VirtualAncestor` 或 `V_PID` 相關檔，只讀）
2. `assets/scripts/core/systems/` 內 BLT-04 的相關檔（只讀，確認依賴）
3. `assets/scripts/core/systems/BreedingSystem.ts` 的 `INBREEDING_*` 常數寫法（沿用常數命名）
4. `tests/run-cli.ts`（新套件註冊）

## 4. 範圍（嚴格限制）
**只新增一個純邏輯模組與測試，不接進任何流程。**
- 新增 `assets/scripts/core/systems/WildGene.ts`（名稱可微調，需在 PR 說明註明）：
  - `WILD_GENE_FIRST_GEN_BONUS`、`STAR_JUMP_CHANCE`、`STAR_JUMP_STEP` 等暫定常數，註解標明「暫定，Q38 未定案」。
  - `rollWildGene(ancestorGeneration, random)`：初代的變異率高於後代；`random` 由呼叫端注入，模組內不自行取亂數。
  - `applyStarJump(factor, random)`：只改星級，不改因子 id 與顏色；星級上限夾住，不超過上限。
  - 純函式，不依賴 cc，不讀寫存檔，不發事件，不修改輸入物件。
- 新增測試套件（例如 `tests/WildGene.test.ts`），並在 `tests/run-cli.ts` 註冊。

**禁止修改**：
- BLT-02 生成器、BLT-04、`BreedingSystem.ts`、`FactorInheritance.ts`、`FactorAwakening.ts`（只讀）。
- 結緣、受孕、培育、教官、戰場、UI、存檔格式、meta、spec JSON、`generals.json`。

## 5. 驗收條件
- 測試全部通過，至少涵蓋：初代變異率高於後代（用注入的 random 固定數值比較）；變異只改星級、不改因子 id 與顏色；星級到上限後不再上升；同樣的 random 輸入結果一致（可重現）。
- 全套 headless 測試通過（`npx ts-node --project tsconfig.test.json tests/run-cli.ts`，本機需 cc stub preload）。
- `compute-gate --profile standard --agent-feedback` 通過。
- 編碼（UTF-8 無 BOM）與 `git diff --check` 通過。
- 新模組沒有 `cc` import、沒有 `any`。

## 6. 不要做
- 不接進結緣或培育流程；接線另開卡。
- 不自行定案 Q38 的機率，只用暫定常數並在 PR 列出。
- 不開 Cocos 編輯器；不手改 meta。

## 7. 交回格式
- PR 說明開頭寫「Before／After」，並列出所有暫定常數與數值。
- 任務卡 `status: done`，寫明測試結果、暫定項目與未驗證的部分，然後解鎖。
