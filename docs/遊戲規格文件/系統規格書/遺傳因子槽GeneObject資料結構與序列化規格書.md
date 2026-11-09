<!-- doc_id: doc_spec_0332 -->
# 遺傳因子槽GeneObject資料結構與序列化規格書

> **責任邊界**：本檔為武將遺傳因子槽（GeneObject）、結構化存讀（genesForSave / genesFromSave）與序列化驗證的單一真相來源。
> **關聯 WBS**：GEN-02（遺傳因子槽資料與讀寫）、GEN-01（武將基礎結構）、FBR-02（因子序列化）。
> **整併裁決**：確立每位武將 3~5 個結構化因子槽位標準；定案七曜色分類與缺欄位自動容錯補齊協議。

---

## §1. 遺傳因子槽核心結構模型 (GeneObject Schema)

武將身上所攜帶之遺傳因子，落盤與執行期嚴格依循下列型別定義：

```typescript
export interface GeneObject {
  /** 七曜色彩分類（取自 gene-dictionary 的 color：blue/crimson/emerald/gold/purple/white/silver） */
  type: string;
  /** 因子唯一代碼（必須存在於 gene-dictionary.json） */
  id: string;
  /** 當前因子星級等級（範圍 1 ~ 5） */
  level: number;
  /** 是否處於鎖定未覺醒狀態（true: 未生效石卵, false: 已綻放生效） */
  isLocked: boolean;
  /** 覺醒所需之探索門檻等級（如 1, 21, 45） */
  discoveryLevel: number;
}
```

### 欄位約束與邊界條件

1. **槽位數量邊界**：每位武將實例擁有 **3 ~ 5 個因子槽**。史實名將預設 3 槽，經由培育或轉生最多擴展至 5 槽。
2. **Type 與色彩對齊**：`type` 欄位代表七曜色彩，**嚴禁填寫中文分類**（如「謀略」、「統率」），一律對齊 `gene-dictionary` 之標準英文代碼。
3. **合法性斷言**：`level` 必須介於 1 與該因子之 `maxLevel` 之間，超出範圍自動 clamp。

---

## §2. 存檔序列化與容錯補齊協議 (genesForSave / genesFromSave)

為相容歷史存檔並防範欄位缺漏，存讀服務實施雙向安全轉換：

### 2.1 寫入存檔正規化 (`genesForSave`)

在武將資料寫入存檔（`PlayerRosterService`）時，執行壓縮與標準化：
- 過濾非法或未定義之因子條目。
- 保證輸出的 `GeneSaveEntry` 包含完整的 `id`, `level`, `isLocked`, `discoveryLevel` 四項核心標籤。

### 2.2 讀取存檔解碼與預設補齊 (`genesFromSave`)

從存檔還原資料至記憶體時，實施容錯防禦（Fail-Safe Defaults）：
- **缺 `isLocked`**：自動預設為 `false`（視為已解鎖正常生效）。
- **缺 `discoveryLevel`**：自動預設為 `1`（基礎等級可見）。
- **無因子武將**：若武將 `genes` 為空陣列，標記為「未開獎或資料待補」，不引發崩潰，允許後續注入。

---

## §3. 字典校驗與單一真相來源整合

因子實例在遊戲啟動載入時，透過 `validateGeneObjects` 與全域基因字典對齊：

```typescript
export function validateGeneObjects(
  genes: readonly GeneObject[],
  dictionary: Record<string, { color: string; maxLevel: number }>
): { isValid: boolean; invalidReason?: string }
```

- 若因子 `id` 不存在於 `gene-dictionary.json`，驗證器記錄警告並降級為通用白色基礎因子，防止戰鬥運算中斷。
