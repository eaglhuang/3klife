# close-orch-live-lane-escalation-2026-06-21

這份 archive 記錄 `close-orchestration.ts` 正向同檔案例在 **真實 live broker runtime** 下的第二階段觀察：當 Lane B 先以 `resolveClosebackPlanningPath` 重掛 active intent 後，Lane A 以 `buildClosebackPlan` 重新註冊時，broker 並未判成 blocked，而是把 Lane A 升級到 `needs-physical-split` / `deterministic-composer`。

## 核心意義

- 這不是負向衝突，也不是 freeze。
- 這表示 broker 在真實同檔情境下，先辨識到「實體同檔重疊」，再要求走 composer lane，而不是直接放任同檔寫入。
- 因為當時主工作樹已經同時帶有 A/B 兩個 patch，所以這一輪 **不適合再做 live steward apply**；否則只會重複套用已存在的 patch，無法形成乾淨的 apply 證據。

## 權威觀察點

- Lane B team run：`team-37cf2c117da9`
  - `lane=direct-brokered`
  - `verdict=parallel-safe`
- Lane A 重新 register 後：
  - `decision-1782047780952`
  - `verdict=needs-physical-split`
  - `lane=deterministic-composer`
  - reason: `Physical file overlap detected but no bounded overlap evidence; routed to deterministic-composer.`

## 檔案說明

- `write-broker.registry.json`：當下 registry snapshot，顯示 B 側 active intent 與 A 側 composer lane intent 共存。
- `team-37cf2c117da9.json`：Lane B 的最新 authoritative team-run。
- `team-53e5bae34958.json`：Lane A 的原始 authoritative team-run（早期 admission）。
- `bench-close-orch-a-intent.json`：A 側重掛時使用的 intent。
- `bench-close-orch-b-intent.json`：B 側重掛時使用的 intent。

## 對論文的誠實寫法

這個 archive 不應被寫成「兩側在 live runtime 直接完成 main 上的最終 apply」。它比較精確的定位是：

1. field admission layer：同檔不同函式，初始雙方可被允許進場。
2. runtime lane-escalation layer：當 live active intent 真正重疊到同一實體檔案時，broker 會把其中一側升到 `deterministic-composer`，要求走受控 compose 路徑。
3. final merge/apply success：仍由 `close-orch-positive-layered-2026-06-21` archive 中的 broker compose + steward apply replay artifact 提供。
