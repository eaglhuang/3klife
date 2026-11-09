<!-- doc_id: doc_spec_0412 -->
# 道具定義ItemDef資料表與付費免費分類規格書

> 本規格書為 3KLife 道具系統識別碼（Item ID）、五大類別、資料結構與全域道具清單之唯一真相來源（Single Source of Truth）。
> 相關實作對齊：`assets/scripts/core/systems/ItemDef.ts`、`PlayerInventory.ts`。

---

## 1. 系統定位與單一真實來源

1. **道具識別碼之唯一根源**：
   - 全專案之背包（`PlayerInventory`）、商店（`ItemShopPricing`）、許願池（`WishPool`）、極限任務（`ExtremeTaskDrop`）與 UI 視圖（`ItemBagView`），一律統一引用 `ItemDef.ts` 定義之常數。
   - Unity 概念對照：相當於集中式 `ItemDatabaseSO` 資產庫，背包僅記錄 `{ itemId, count }`，道具屬性與顯示文字一律查表解析。
2. **五大核心分類（ItemCategory）**：
   - 消耗品：使用後即自背包扣除，觸發立即效果（如精力回復、天候改變）。
   - 材料：用於教官傳授、鍛造、突破與合成之素材。
   - 特殊道具：不可堆疊或具有系統轉換資格之特殊功能令旗（如轉職、歸宗）。
   - 貨幣：通用交易媒介（如精元、結義點數）。
   - 寶物：具備裝備屬性或高額典當價值之傳家逸品。

---

## 2. 資料結構契約

```typescript
export type ItemCategory = '消耗品' | '材料' | '特殊道具' | '貨幣' | '寶物';
export type ItemRarity = number;

export interface ItemDef {
    readonly id: string;
    readonly name: string;
    readonly category: ItemCategory;
    readonly rarity: ItemRarity; // 基準值為 1
}
```

---

## 3. 全域道具資料全表（ITEM_DEFS）

順序嚴格對應背包顯示順序（`ItemBagView` 依照此表順序展開）：

| 道具名稱 | 識別碼常數 (`id`) | 分類 (`category`) | 取得來源與功能定位 |
|---|---|:---:|---|
| **求籤令** | `ITEM_ORACLE` | 消耗品 | 百寶閣/任務；名士天命占卜 |
| **轉職令** | `ITEM_JOB_ORDER` | 特殊道具 | 百寶閣/許願池；20 歲追加副職與轉職 |
| **試用券** | `ITEM_TRIAL_TICKET` | 特殊道具 | 任務/活動；招募 Trial 傭兵 |
| **竹簡** | `ITEM_BAMBOO_SLIP` | 材料 | 文職退役產物；學府修養素材 |
| **戰法筆記** | `ITEM_BATTLE_NOTE` | 材料 | 千人斬等里程碑產出；教官轉化戰法 |
| **補元散** | `ITEM_VITALITY_PILL` | 消耗品 | 百寶閣/許願池；回復 50 點精力 |
| **高級補元散** | `ITEM_VITALITY_PILL_PREMIUM` | 消耗品 | 百寶閣；回復 100 點精力 |
| **歸宗令** | `ITEM_MERGE_TOKEN` | 特殊道具 | 特殊活動；血脈歸宗融合 |
| **傳道令** | `ITEM_LEGENDARY_MENTORING_TICKET` | 特殊道具 | 賽事/活動；名將終極傳道指導 |
| **祈風令** | `item-weather-wind` | 消耗品 | 戰役掉落/商城；戰場天氣強制改為大風 |
| **祈雨符** | `item-weather-rain` | 消耗品 | 戰役掉落/商城；戰場天氣強制改為雨天 |
| **刷新券** | `ITEM_REFRESH` | 消耗品 | 百寶閣；手動刷新傭兵池與地下城 |
| **安胎藥** | `ITEM_FERTILITY` | 消耗品 | 百寶閣；結緣受孕率提升至 1.5 倍 |
| **入學令** | `ITEM_ADMISSION_TOKEN` | 消耗品 | 許願池/百寶閣；書院高級培育入學 |
| **虎符精華** | `ITEM_TALLY_ESSENCE` | 材料 | 許願池/分解；虎符突破與升星素材 |
| **延壽丹** | `ITEM_LONGEVITY_PILL` | 消耗品 | 百寶閣/許願池；延長武將壽命上限 |
| **加速卡** | `ITEM_WISH_SPEED_CARD` | 消耗品 | 月卡每日/商城；許願池縮短 2 小時等待 |
| **天命重置卷** | `ITEM_FATE_RESET_SCROLL` | 消耗品 | 活動/商城；重擲結緣天命波動 |
| **傳家寶物** | `ITEM_TREASURE` | 寶物 | 無期徒刑囚犯繳交；裝備或高價販賣 |
| **石材** | `ITEM_STONE` | 材料 | 戰場撿拾/內政；主城建設素材 |
| **木材** | `ITEM_WOOD` | 材料 | 戰場撿拾/內政；器械研發素材 |
| **情報** | `ITEM_INTEL` | 材料 | 斥候巡邏/刺探；軍事任務解鎖素材 |
| **武器材料** | `ITEM_WEAPON_MATERIAL` | 材料 | 戰後打撈；裝備鍛造打磨素材 |
| **教官心得** | `ITEM_INSTRUCTOR_EXP` | 材料 | 學府結業；教官經驗值提升道具 |

---

## 4. 驗收與依賴原則

1. **依賴隔離（Dependency Isolation）**：
   - `ItemDef.ts` 位於底層核心層，嚴禁逆向引用 `PlayerInventory`、UI 元件或 Cocos 引擎模組。
2. **Schema 驗證保證**：
   - 所有的道具 `id` 必須為非空字串且全域唯一，`category` 必須受限於五大枚舉值內。
