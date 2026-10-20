# 結緣系統（配種）規格（分片索引） — K–L 近親繁殖範圍／精力值與生育限制

> 這是 `結緣系統（配種）.md` 的「K–L 近親繁殖範圍／精力值與生育限制」分片。完整索引見 `docs/遊戲規格文件/系統規格書/結緣系統（配種）.md`。

## K. 近親繁殖（Inbreeding）範圍設定（新規）

// 目標：以可配置參數定義禁止配對的近親範圍，避免模糊或全域封鎖。

- 參數：`Inbreeding.BlockGenerations`（整數，預設 3）
  - 含義：若父母雙方在最近 `BlockGenerations` 代內存在共同祖先（例如有相同的祖父母），則禁止配對。
  - 範例：`BlockGenerations = 3` → 若在 祖父母（3 代）內有交集，則配對被系統阻擋。

- 實作建議：在結緣前進行檢查
```
if (Ancestors_Intersection_Generations(father, mother) <= Inbreeding.BlockGenerations):
    reject("近親範圍內不可配對：請選擇血緣更遠的配對。")
```

- UI：在配對介面新增顯示「近親警告」的 tooltip，並展示共同祖先的最小世代距離。

// 備註：此設定為系統層級配置（`config/gameplay.json`），可由設計在不同階段調整數值以達到平衡或倫理考量。

---

## L. 精力值（Vigor）與生育限制補充

> **來源**：養成循環與營收節奏探討.md (doc_spec_0066)

### 精力冷卻機制

精力值（Vigor）是獨立於壽命的武將體力資源，控制結緣行為的**時間節奏**。

### 和平血統線與退役保種邊界

1. 退役武將若仍以活體 `General` 身分留存，且尚未轉為教官卡，可參與低風險的保種型結緣。
2. `Peace_Lineage` 只是既有結緣的模式標記，仍完整沿用 `Vigor`、`Pregnancy_Lock`、`Breeding_Cap` 與近親檢查，不另開 `宗廟`、`生命精氣槽` 或其他獨立母系統。
3. 武將一旦被卡片化為 `Mentor / Support_Card`，後續便只保留教學職能，不再作為親傳父母來源；血統延續只屬活體武將線。
4. 傳家寶、家族藏物與裝備轉移仍由倉庫 / 道具 / 俘虜處置等既有系統承接，本規格不額外建立祖廟或宗廟收藏線。

```
// 精力自然回復
Vigor_Recovery = 1 unit / governance_month   // 每治理月 +1 點

// 結緣後精力凍結期
Post_Breeding_Cooldown = 3 governance_months  // 母方結緣後需 3 個治理月才能再次行動
// 注意：此期間母方精力不回復（Pregnancy_Lock 狀態）

// 父方精力消耗
Father_Vigor_Cost = 50  // 父方結緣消耗精力
Mother_Vigor_Cost = 100 // 母方結緣消耗精力（+待產凍結）
```

### 一生生育上限

每位武將的**親傳子嗣**上限為 **3~5 次**（具體由武將根基與精力上限決定）。超過上限後，武將生育力枯竭，無法再受孕（即便精力回滿也無效）。

```
Lifetime_Breeding_Cap = 3 + floor(General.Vitality / 30)  // 精力上限越高，生育次數越多（上限 5）
// 精力上限 <90 → 3 次; 90~119 → 4 次; ≥120 → 5 次
```

> **付費道具連動**：補元散可快速回復精力縮短冷卻；傳宗秘藥可提升 Lifetime_Breeding_Cap +1（每武將最多使用 1 次）。

---
