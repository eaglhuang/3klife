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
    *   **資源目錄**：`assets/fx/tactics/` 下需包含對應 ID 的 Prefab。
3.  **戰場掠奪 (Loot)**：
    *   特定戰法（如峽谷落石、火燒敵營）被擊破或佔領後，觸發金色文字飄揚效果，顯示獲得的資源清單。

---
