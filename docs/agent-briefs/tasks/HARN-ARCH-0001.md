---
doc_id: doc_task_TBD
id: HARN-ARCH-0001
priority: P1
phase: G
created: 2026-05-04
created_by_agent: compute-gate-sensor
owner: Antigravity (Gemini 1.5 Pro)
status: done
type: system
chain_id: HARN-CHAIN-MODULE-BOUNDARY
chain_step: 1/3
sensor_triggered_by: compute-gate check-import-boundaries
depends:
  []
notes: "2026-05-04 | 狀態: done | Antigravity: 已建立 IBattleUIBridge 與 IBattleEntryParams 介面於 shared/interfaces/。"
---

# [HARN-ARCH-0001] 建立 UI Bridge 介面層（模組邊界修復前置）

> 🔗 **韁繩感測器自動偵測** — 由 `check-import-boundaries.js` 觸發
> ⚡ **修改上限**：2 個新建檔案
> ⚠️ **重要**：此為架構修復的**第一步**，後續 HARN-ARCH-0002/0003 依賴此介面

## 問題根源分析

`check-import-boundaries.js` 發現 **36 筆違規**，核心問題是 `battle/` ↔ `ui/` 雙向耦合：

```
battle/ → ui/：22 筆（battle views 直接引用 UI 元件）
ui/ → battle/：8 筆（UI 場景直接引用 battle controller/model）
core/ → ui/：2 筆（UIManager 引用 UI 元件）
core/ → tools/：1 筆（EffectSystem 引用 vfx-registry）
tools/ → battle/：3 筆（VfxComposerTool 引用 battle views）
```

**根本解法**：在 `shared/` 層建立 Bridge 介面，讓 battle 和 ui 都依賴 shared 抽象，而非互相依賴。

## INPUT_CONTRACT

- `assets/scripts/shared/` 目錄已存在
- 目前 `battle/views/BattleUIBridge.ts` 已存在（但方向錯誤）
- 所有違規檔案的語法正確（ts-syntax 通過）

## OUTPUT_CONTRACT

- [ ] 新建 `assets/scripts/shared/interfaces/IBattleUIBridge.ts`
  - 定義 battle 需要呼叫 UI 的所有方法介面（IBattleUIBridge）
  - 定義 UI 需要讀取 battle 狀態的所有介面（IBattleStateReader）
- [ ] 新建 `assets/scripts/shared/interfaces/IBattleEntryParams.ts`
  - 將 `battle/models/BattleEntryParams` 的型別定義搬到 shared
  - battle 和 ui 都改從 shared 引用此型別

## VALIDATION_CMD

```bash
node tools_node/compute-gate.js --gates ts-syntax eslint-rules
```

## ROLLBACK_HINT

```bash
rm assets/scripts/shared/interfaces/IBattleUIBridge.ts
rm assets/scripts/shared/interfaces/IBattleEntryParams.ts
```

## 建立指引

### IBattleUIBridge.ts

```typescript
/**
 * IBattleUIBridge — battle 與 UI 的通信介面（shared 層）
 * battle/ 不得直接引用 ui/ 的元件，改透過此介面通信
 */
export interface IBattleUIBridge {
  showHUD(): void;
  hideHUD(): void;
  showResultPopup(result: BattleResult): void;
  showBattleLog(entries: string[]): void;
  updateDeployState(state: DeployState): void;
}

export interface IBattleStateReader {
  getBattlePhase(): BattlePhase;
  getDeployableUnits(): DeployableUnit[];
}
```

### IBattleEntryParams.ts

```typescript
/**
 * IBattleEntryParams — 戰場進入參數（shared 層）
 * 原 battle/models/BattleEntryParams 的型別搬到此處
 */
export interface IBattleEntryParams {
  mapId: string;
  difficulty: 'easy' | 'normal' | 'hard';
  playerGenerals: string[];
}
```

---
*由 Harness Engineering compute-gate 感測器自動偵測開立 | 2026-05-04*
