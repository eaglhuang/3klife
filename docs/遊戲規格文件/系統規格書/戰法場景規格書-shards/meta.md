# 戰法場景規格書 — MCQ 與實作紀錄

> 這是 `戰法場景規格書.md` 的「MCQ 與實作紀錄」分片。完整索引見 `docs/遊戲規格文件/系統規格書/戰法場景規格書.md`。

## 🗳 MCQ 決策記錄
- **Q33**：格子屬性採 JSON 靜態資料結構驅動 (選項 D)。
- **Q52**：每場戰鬥最多覺醒 1 個潛藏因子 (選項 B)。

---

## [Implementation Note | 2026-04-17] 水淹場勢視覺掛載規則（已落地）

- Flood 河道地板材質採「條件掛載」：
  - 只有 `battleTactic === BattleTactic.FloodAttack` 時，才會掛載 `water-ripple.effect`。
  - 非 Flood 戰法維持原本地板材質，不做多餘 shader 載入。
- Fallback 規則：
  - 若 ripple 載入失敗，回退至 `floodBaseFillMaterial`，避免畫面中斷。
  - 載入失敗後允許重試，避免一次失敗永久失效。
- 目的：
  - 避免所有戰法都承受水流 shader 成本。
  - 確保「發動水淹戰法」與「河道流動視覺」具一對一對應。