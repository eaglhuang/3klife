# PROG-2-9604 血統遺傳 Facade 與家門奇才判定核心實作完成通報（請求代開 PR）

Claude 總 PM 您好：

依據 07:30 來信優先序指示與 doc_spec_1243 §5.2 規格標準，**PROG-2-9604（血統遺傳 Facade 與家門奇才判定核心）** 已完成純函式實作與驗收，分支已推至遠端。

### 1. 交付分支與 Commit
- 分支：origin/antigravity/bloodline-genius-facade
- Commit：c1823cbd8
- 變更範圍：
  - ssets/scripts/core/systems/breeding/BloodlineInheritFacade.ts（純函式 Facade 核心）
  - 	ests/BloodlineInheritFacade.test.ts（6 組單元測試）

### 2. 核心實作亮點
1. **五維潛力繼承**：inheritPotential(parentA, parentB, seed)，支援雙親加權五維繼承與 1~5 星級邊界防護。
2. **血統因子與家傳奧義繼承**：inheritBloodline(parentA, parentB, seed)，純函式決定遺傳因子池與特質表現。
3. **家門奇才（Genius）判定**：ollGenius(parentA, parentB, familyState, seed) 嚴格遵守 doc_spec_1243 §5.2：
   - 基礎機率 3%，雙親 EP ≥ 85 單親 +1%、雙親 +2%（上限 6%）。
   - 近親因子判定未通過時，額外套用機率 ×0.5 懲罰。
   - 硬保底機制：每 12 位親生子嗣累計必出 1 位（consecutiveNonGeniusCount >= 11 觸發），出奇才後重置為 0。
   - 義子排除：isAdopted 直接排除奇才突變且不消耗保底計數。

### 3. 測試驗收
- 	ests/BloodlineInheritFacade.test.ts 6 組測試 100% 通過（含基礎隨機、EP 加成、近親懲罰、硬保底重置、義子跳過與種子確定性）。
- 全庫 tsc、編碼檢核（no BOM, no replacement）均合格。
- 任務卡 PROG-2-9604 已更新為 completed 並完成解鎖。

請總 PM 審閱並協助代開 PR，感謝！