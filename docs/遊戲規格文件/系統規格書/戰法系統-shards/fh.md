# 戰法系統 — F、H 公式與 UI 約束

> 這是 `戰法系統.md` 的「F、H 公式與 UI 約束」分片。完整索引見 `docs/遊戲規格文件/系統規格書/戰法系統.md`。

## F. 戰場戰法公式模型 (Battle Formulas)

### F-1. 傷害與結算公式

$$Final\_Damage = (Base\_ATK \times Skill\_Mult \times Counter\_Ratio) \times (1 + Terrain\_Bonus + Weather\_Bonus + Adaptation\_Bonus)$$

*   **Counter_Ratio (兵種相剋)**：相剋 1.3，被剋 0.8。
*   **Skill_Mult**：各戰法基礎倍率。

---

## H. UI 強約束、環境判定與資源需求

1.  **UI 強約束 (Weather Gray-out)**：
    *   ⚠️ 細節請見 **[戰場適性系統.md](戰場適性系統.md)**。當前天氣若觸發禁用條件，包含「火」之戰法按鈕變灰，禁止點擊並顯示 Toast 提示。
2.  **美術特效配合**：
    *   **品質分級**：SSR/UR 戰法需有「半身英靈面」閃現演出。
    *   **環境回饋**：火計需在格子上持續顯示火焰 VFX；水計需有流動波紋，且藍色水格本體要保有右向沖刷的方向感。
    *   **實作現況（PROG-2-10240 同步）**：戰法分組特效不使用 Prefab，也沒有 `assets/fx/tactics/` 資源目錄（該路徑只由 `tacticFxPath` 保留，供日後美術 Prefab 使用）。現況是「資料表驅動、程式繪製」：招式 id → 特效分組寫在 `assets/scripts/battle/shared/TacticVfxExtraGroups.ts`（`TACTIC_VFX_SKILL_GROUP`，表優先於第一批 7 組歸類規則），每組配方（配色、粒子量、前搖動機、命中動機）同檔；畫法在 `views/TacticVfxPlayer.ts`（零貼圖，整場一個加色 Graphics 節點）；音效沿用 `battle-audio-layers.json` 的 tactic 池（不擴充發聲池）。共 27 組：第一批 7 組、第二批 13 組（PROG-2-10236）、第三批 7 組（PROG-2-10240：虛弱、混亂、祝福、淨化、神罰、號令、戰吼）。新增一組＝配方一筆＋招式對照＋音效一筆，不用改 View。召喚類尚無招式規格，未做。
3.  **戰場掠奪 (Loot)**：
    *   特定戰法（如峽谷落石、火燒敵營）被擊破或佔領後，觸發金色文字飄揚效果，顯示獲得的資源清單。

---
