<!-- doc_id: doc_spec_0395 -->
# 戰場地塊狀態矩陣與動態ZOC規則數值規格書

## 1. 核心定位與設計理念
本規格書定義《三國人生》戰場 40 格棋盤中地塊動態狀態矩陣（Tile-State Matrix）與控制領域（ZOC, Zone of Control）的執行契約（WBS `FORM-09`，代碼落位於 `TileStateRules.ts` 與 `tile-buffs.json`）。
地塊不僅承載基礎地形屬性，更可被戰法、天氣或事件動態附加持續性效果，為部隊行軍位移、回合損害結算與戰略阻隔提供確定性資料驅動機制。

```
              ┌──────────────────────────────────────────────┐
              │          TileStateRules 地塊狀態矩陣          │
              └──────────────────────┬───────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
   【進格事件 (OnEnter)】      【回合結束 (TurnEnd)】     【常駐防護與增益】
   • blocked: 阻擋行軍         • hazard: 延燒/落石扣血    • isFixedTile: 掩體/營帳
   • force-move: 即時推移      • river-current: 水流沖退    免受暫態火海覆蓋
   • stealth: 掩蔽防遠程                                  • tile-buffs: 每回合動態生成
```

---

## 2. 六大地塊狀態分類與時序生命週期（`TileStateKind`）

系統將所有動態地塊封裝為六大標準狀態，並由 `TileStateRule` 定義其觸發時序：

| 地塊狀態代碼 (`TileStateKind`) | 核心機制說明 | 進格阻擋 (`blocksOnEnter`) | 進格推移 (`pushesOnEnter`) | 進格隱蔽 (`hidesOnEnter`) | 回合扣血 (`damagesOnTurnEnd`) | 回合推移 (`pushesOnTurnEnd`) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **`normal`** | 無特殊效果之常規地塊 | 否 | 否 | 否 | 否 | 否 |
| **`hazard`** | 危險地形（火海、毒沼、落石） | 否 | 否 | 否 | **是** | 否 |
| **`river-current`** | 水流急湍（洪水流向沖退） | 否 | 否 | 否 | 否 | **是** |
| **`force-move`** | 強制位移（水淹陷阱衝擊） | 否 | **是** | 否 | 否 | 否 |
| **`stealth`** | 掩體茂林（森林伏兵遮蔽） | 否 | 否 | **是** | 否 | 否 |
| **`blocked`** | 實體障礙（巨石、拒馬、殘骸） | **是** | 否 | 否 | 否 | 否 |

---

## 3. 固定地塊防護與推導規則

### 3.1 固定地形格不可覆蓋保護（`isFixedTileState`）
戰場中存在戰略核心地塊，具備最高物理優先級，**暫態火場或水淹嚴格禁止覆蓋**：
- **`ambush-field`（戰術掩體）**：天然伏兵避難所，不受地表延燒覆蓋。
- **`scene-camp`（大軍營帳）**：陣營指揮要塞，受工事防護免除隨機地塊狀態侵蝕。

### 3.2 狀態自動推導流水線（`tileStateKindOf`）
```typescript
if (!effect) return 'normal';
if (effect.blocksMovement === true) return 'blocked';
if ((effect.damagePerTurn ?? 0) > 0) return 'hazard';
if (effect.state === 'river-current') return 'river-current';
if (effect.forcedMoveDirection) return 'force-move';
if (effect.state === 'ambush-field') return 'stealth';
return 'normal';
```

---

## 4. 動態地塊增益生成規則（`tile-buffs.json`）

在特定演武或劇本模式中，每大回合開始時動態生成戰略符文地塊：
1. **生成頻率**：每回合隨機生成 **1 ~ 3 格**（`minPerTurn: 1, maxPerTurn: 3`）。
2. **因子倍率**：增益/減益係數為 **2 ~ 5 倍**（`factorMin: 2, factorMax: 5`），稀有因子閾值為 5。
3. **效果庫定義**：
   - `atk-mul`：部隊踩上後攻擊力 $\times \text{factor}$。
   - `hp-mul`：部隊踩上後生命值 $\times \text{factor}$。
   - `atk-div`：部隊踩上後攻擊力 $\div \text{factor}$。
   - `hp-div`：部隊踩上後生命值 $\div \text{factor}$。
