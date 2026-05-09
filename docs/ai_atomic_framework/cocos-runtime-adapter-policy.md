<!-- doc_id: doc_other_0113 -->
# Cocos Runtime Adapter Policy

> **角色**：adopter — 3KLife 專案對 ATM 的 Cocos runtime 邊界宣告  
> **維護者**：GitHubCopilot（ATM-3-0005）  
> **依賴**：`ATM-3-0001`（ProjectAdapter shadow mode）

---

## 1. 目的

本政策定義在 3KLife 專案中，Cocos Creator 執行環境（runtime）哪些類型**可以**原子化，哪些**不能**進入 compute atom。  
核心原則：**compute atom 必須是純 TypeScript 計算邏輯，不得持有任何 Cocos 場景圖物件或 cc 引擎型別**。

---

## 2. 不可原子化的 Cocos Runtime 型別（黑名單）

以下型別及其子類別，**嚴禁出現在任何 compute atom 的 import、欄位或函式簽名中**：

| 類別 | 型別 / API | 理由 |
|---|---|---|
| 場景圖節點 | `cc.Node` | 持有場景圖位置，生命週期由 Cocos Director 管理，無法序列化 |
| 元件 | `cc.Component`（含 `cc.Sprite`, `cc.Label`, `cc.Button`, `cc.UITransform` 等） | 必須綁定節點，跨幀狀態可能改變 |
| 預製體 | `cc.Prefab` | 資產引用，屬於資產管線物件，不是計算資料 |
| 場景 | `cc.Scene` | 根節點物件，生命週期由 Director 管理 |
| 資產引用 | `cc.Asset` 及子類別（`cc.SpriteFrame`, `cc.AnimationClip`, `cc.AudioClip` 等） | 資產生命週期由引擎資產系統管理，不可被 atom 持有 |
| 引擎單例 | `cc.director`, `cc.game`, `cc.sys`, `cc.screen` | 全域 runtime 狀態，會引入隱性副作用 |
| 向量/顏色封裝 | `cc.Vec2`, `cc.Vec3`, `cc.Color`, `cc.Size`, `cc.Rect` | 這些類帶有可變原型方法；計算 atom 應改用 plain object `{ x, y }` |

**一句話規則**：任何 `import { ... } from 'cc'` 或 `import * as cc from 'cc'`，**只要出現在 compute atom 檔案中，即構成違規**。

### 2.1 Runtime 物件持有責任（強制）

下列型別只允許由 adapter/wrapper 持有，禁止流入 compute atom：

| 型別 | 允許持有層 | 禁止層 |
|---|---|---|
| `cc.Component` | `assets/scripts/ui/**`、`assets/scripts/battle/**` 的 runtime adapter | `assets/scripts/core/**`、`assets/scripts/shared/**` |
| `cc.Node` | runtime adapter / scene 組裝層 | compute atom / pure helper |
| `cc.Prefab` | runtime adapter / loader wrapper | compute atom |
| `cc.Scene` | scene route / bootstrap wrapper | compute atom |
| `cc.Asset`/`SpriteFrame` 等 AssetRef | runtime adapter / asset loader wrapper | compute atom |

這個責任矩陣對應 ATM-4-0006 的邊界要求：Cocos Component、Node、Prefab、Scene、AssetRef 僅能由 adapter/wrapper 持有。

---

## 3. 可原子化的模式（白名單）

以下模式**可安全進入 compute atom**：

| 類型 | 範例 |
|---|---|
| 純 TS 資料型別（plain object） | `{ hp: number; maxHp: number }` |
| 無副作用的計算函式 | 傷害公式、成長曲線、機率計算 |
| 有限狀態機（pure state） | `{ phase: 'idle' \| 'attack'; frame: number }` |
| 序列化 config | `GeneralConfig`, `SkillConfig`, `WeaponConfig`（不含 AssetRef） |
| 純字串/數字索引 | spriteFrame UUID 字串、資產 path 字串 |

---

## 4. Adapter 橋接模式

任何需要在 Cocos 元件中使用 compute atom 結果的場景，必須透過 **adapter wrapper** 進行橋接：

```
[ Compute Atom ] -- plain data --> [ Runtime Adapter ] --> [ cc.Component ]
      ↑                                                           |
      |                                                           |
   pure TS                                                  cc runtime
   no cc import                                             reads/writes node
```

### 4.1 實作建議（assets/scripts/shared 或 core）

```typescript
// ✅ 正確：compute atom（assets/scripts/core/battle/DamageCalc.ts）
export function calcDamage(atk: number, def: number): number {
  return Math.max(1, atk - def);
}

// ✅ 正確：runtime adapter（assets/scripts/ui/battle/DamageDisplayAdapter.ts）
import { calcDamage } from '../../core/battle/DamageCalc';
// cc imports 只在 adapter 層
import { Component, Label } from 'cc';

@ccclass('DamageDisplayAdapter')
export class DamageDisplayAdapter extends Component {
  @property(Label) label: Label = null!;

  showDamage(atk: number, def: number): void {
    const dmg = calcDamage(atk, def); // 呼叫純 atom 函式
    this.label.string = String(dmg);
  }
}
```

### 4.2 AssetRef 橋接

若 compute atom 需要知道「哪個 spriteFrame」，只傳字串 path 或 UUID，**由 adapter 負責 load**：

```typescript
// ✅ compute atom 返回 string ID
export function resolveGeneralPortraitKey(generalId: string): string {
  return `generals/portraits/${generalId}`;
}

// ✅ adapter 負責實際 asset load
import { resolveGeneralPortraitKey } from '../../core/generals/GeneralAssetKeys';
import { resources, SpriteFrame, Sprite } from 'cc';

export function loadGeneralPortrait(generalId: string, sprite: Sprite): void {
  const key = resolveGeneralPortraitKey(generalId);
  resources.load(`${key}/spriteFrame`, SpriteFrame, (err, sf) => {
    if (!err) sprite.spriteFrame = sf;
  });
}
```

---

## 5. 目錄分層對應

| 目錄 | 允許 cc import | 說明 |
|---|---|---|
| `assets/scripts/shared/` | **否** | 零依賴層，純 TS 工具型別與常數 |
| `assets/scripts/core/` | **否** | 計算核心，business logic，純 TS，不可引用 cc |
| `assets/scripts/ui/` | **是** | Cocos UI 元件，可引用 cc |
| `assets/scripts/battle/` | 僅 adapter | battle adapter 可引用 cc，battle pure logic 不可 |
| `tools_node/` | **否** | Node.js 工具，無 cc 執行環境 |

這與 `check-import-boundaries.js` 現有的 `shared → core → ui/battle` 單向依賴矩陣一致。

---

## 6. 強制規則（Atom Rule Guard）

為自動化執行本政策，`tools_node/check-import-boundaries.js`（或其繼任 `run-rule-guard.js --profile atm`）**必須包含以下掃描規則**：

```
RULE: no-cc-import-in-core-or-shared
  scope: assets/scripts/core/**, assets/scripts/shared/**
  pattern: /from ['"]cc['"]/
  action: hard-fail
  message: "compute atom / shared 層禁止引用 cc；請改由 ui/ 或 battle/ adapter 持有 cc 型別。"
```

現行 `check-import-boundaries.js` 的邊界矩陣已防止 `shared` 和 `core` 引用 `ui` 或 `battle`，但尚未掃描直接的 `import from 'cc'` 語句。本政策作為補充記錄，直到 rule-guard 工具新增此掃描為止。

---

## 7. 違規範例與修正

### ❌ 錯誤：在 core 層引用 cc

```typescript
// assets/scripts/core/ui/CardBuilder.ts
import { Node, Sprite } from 'cc'; // ← 違規：core 層不可引 cc

export function buildCard(node: Node): void { // ← 違規：簽名含 cc.Node
  ...
}
```

### ✅ 修正：拆分為 atom + adapter

```typescript
// assets/scripts/core/ui/CardConfig.ts（compute atom）
export interface CardConfig { portraitKey: string; nameText: string; }
export function buildCardConfig(generalId: string): CardConfig { ... }

// assets/scripts/ui/components/CardBuilder.ts（adapter）
import { CardConfig, buildCardConfig } from '../../core/ui/CardConfig';
import { Node, Sprite, Label } from 'cc';
export function applyCardConfig(node: Node, generalId: string): void {
  const cfg = buildCardConfig(generalId);
  node.getChildByName('Name')!.getComponent(Label)!.string = cfg.nameText;
  ...
}
```

---

## 8. 與 ATM upstream 的邊界

本政策是 3KLife adopter-scope 的 adapter 策略文件，不定義 ATM upstream core 規則。  
若 ATM upstream 需要類似的 runtime adapter boundary policy（例如 React DOM / Unity / Godot 版本），應在上游 `packages/plugin-rule-guard` 中另開對應的 layer-policy.json，而非把 Cocos 專屬規則寫入 core。

## 9. 與 H2U case study 的啟動契約（ATM-4-0006）

- 只有在 self-hosting alpha0 deterministic gate 全綠後，才允許啟動 H2U case study 注入流程。
- 第一輪注入限定為 dry-run 與 rollback 演練，不得直接替換 draft-builder 主幹行為。
- 若任一 guard 失敗，應回退至上一個已驗證基線，並保留 evidence 供下一輪修正。

---

*由 GitHubCopilot 透過 ATM-3-0005 建立 | 2026-05-09*
