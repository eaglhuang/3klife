<!-- doc_id: doc_other_0032 -->
# 3KLife × ATM 並行開發協議（Coexistence Plan）

> 補丁來源：`AI原子框架開發計畫書.md` v0.2.1 補強 §B4
> 文件位置：`docs/ai_atomic_framework/3klife-coexistence-plan.md`
> 適用期間：ATM Phase B（上游自舉）→ Phase C（3KLife adapter）→ Phase D（case study）= 約 10 週並行期

---

## 為什麼需要本協議

ATM upstream 開發期間（Phase B0–B3，約 6 週），3KLife 既有 `H2U-REFACTOR-0001~0006` / `PROG-2-0010/0011` 等任務卡仍在進行。沒有並行協議會撞上：

1. ATM-3 / ATM-6 預定切片的 helper 函式（normalizeCssColor / parseCssLength / parseFragmentList / html-parser）
2. H2U-REFACTOR-0001/0002 預定拆檔的 draft-builder.js 主幹
3. 同一檔案同時被兩套任務卡鎖定 → merge 衝突 / 行為退轉 / hash drift

本協議定義：**Freeze list（凍結清單）**、**路由協議（哪些工作開哪種任務卡）**、**仲裁順序（衝突時誰優先）**、**Cross-shard task-lock 強化**。

---

## 1. Freeze List（ATM 預定動區）

> 在 ATM-3 / ATM-6 任務卡開卡 **之後**、ATM-6 全部完成 **之前**，下列檔案中的特定區塊進入「ATM 預定動區」。3KLife 端在此期間 **只能 bug fix，不能 refactor**。

### 1.1 全檔級凍結
| 檔案 | 凍結原因 | 凍結期間 |
|---|---|---|
| `tools_node/lib/dom-to-ui/html-parser.js` | ATM-3-0004 預定整檔包成 adapter atom | ATM-3-0004 開卡 → ATM-6-0004 完成 |

### 1.2 函式級凍結（draft-builder.js 內）
| 函式 / 區塊 | 對應 ATM 卡 | 凍結期間 |
|---|---|---|
| `normalizeCssColor` 與其鄰近色彩 helper | ATM-3-0001 / ATM-6-0001 | ATM-3-0001 開卡 → ATM-6-0001 完成 |
| `parsePx` (~L1716) / `parseSvgNumber` (~L1328) / `resolveLength` (~L1733) | ATM-3-0002 / ATM-6-0002 | ATM-3-0002 開卡 → ATM-6-0002 完成 |
| `parseFragmentList` (~L869) | ATM-3-0003 / ATM-6-0003 | ATM-3-0003 開卡 → ATM-6-0003 完成 |

### 1.3 凍結期間允許的動作
- ✅ Bug fix（如 NPE / wrong-type 修正）— 必須在任務卡 notes 註明「coexistence-bug-fix」
- ✅ 非凍結區塊的 refactor / feature add
- ✅ 註解 / 文件 / 變數重命名
- ❌ 凍結函式的演算法重寫
- ❌ 凍結函式的 signature 變更
- ❌ 凍結函式的搬家（移到別的檔案）

---

## 2. 路由協議（哪種工作開哪種任務卡）

### 2.1 開 `ATM-*` 卡的條件
所有條件必須同時滿足：

- [ ] 改動標的是「純函式 helper」（無副作用、確定性、單一職責）
- [ ] 可獨立寫 ≥5 fixtures + ≥2 negative case + 1 legacy diff case
- [ ] 不涉及 Cocos runtime / UCUF schema / 業務組合邏輯
- [ ] 改動可獨立透過 AtomicInterface 注入回 legacy（rollback 1 行可逆）

### 2.2 開 `H2U-REFACTOR-*` 卡的條件
- 改動 draft-builder.js 主幹結構（拆檔、模組化、層次重組）
- 改動 rule-registry.json（除 H2U-REFACTOR-0006 已落地的 fidelityThresholds / exemptCategories / knownGaps 外）
- 改動 dom-to-ui/* 的多檔協作邏輯

### 2.3 開 `PROG-2-*` 卡的條件
- 業務邏輯、Cocos runtime、UCUF schema、skin/layout/screen 三層
- multi-fixture matrix / selector trace / capture protocol
- 美術 assetization 邊界與 family layer 規劃

### 2.4 邊界決策樹
```
要動的標的是純函式 helper 嗎？
├── 是 → 它在 freeze list 嗎？
│   ├── 是 → 開 ATM-* 卡（不是 H2U-*）
│   └── 否 → 看是否有原子化價值
│       ├── 有（將來會被 atom 化）→ 開 ATM-* 卡
│       └── 無（過於 domain-specific）→ 開 H2U-REFACTOR-*
└── 否 → 看 §2.2 / §2.3 條件
```

---

## 3. 仲裁順序（衝突時誰優先）

### 3.1 結構性原則
- **Cocos runtime / UCUF schema 改動 → PROG-2-* > 任何 ATM-***
- **draft-builder.js 主幹拆檔 → H2U-REFACTOR-0001/0002 > ATM-3/6**
- **純 helper 抽取 → ATM-3/6 > 任何 H2U-***

### 3.2 具體仲裁案例
| 情境 | 仲裁結果 | 理由 |
|---|---|---|
| H2U-REFACTOR-0001（拆 draft-builder）vs ATM-6-0001（替換 normalizeCssColor 呼叫點） | H2U-REFACTOR-0001 優先 | ATM 等 H2U 拆完後 call site 位置才穩定 |
| H2U-REFACTOR-0002（規則治理拆檔）vs ATM-3-0001（normalizeCssColor 抽 atom） | 同檔案不同區塊可並行；不同區塊 cross-shard 通過 | 兩者改動範圍不重疊 |
| PROG-2-0010（補 fixture）vs ATM-4-0002（用同 fixture 做 regression） | PROG-2-0010 優先 | ATM-4 需要 fixture 已存在才能跑 regression |
| H2U-REFACTOR-0006（rule-registry 補 fidelity）vs ATM-3 任何 atom | H2U-REFACTOR-0006 優先 | rule-registry 是規則真相，atom 必須遵循 |

### 3.3 衝突時的處理流程
1. 後鎖者必須先 `task-lock check` 偵測前鎖者
2. 若 cross-shard（H2U-* vs ATM-*）發生衝突，後鎖者於 task card frontmatter 補 `blocked_by: <前鎖者 ID>` 並暫停
3. 前鎖者完成（status=done）後，後鎖者重新 `task-lock check` → lock → 繼續

---

## 4. Cross-shard Task-lock 強化

### 4.1 現行 task-lock 行為
- 同一 task ID 不可重複鎖（已實作）
- 同一檔案被兩個 task 同時鎖：**目前不檢查**

### 4.2 強化內容（屬 3KLife 端，由 ATM-0 補強卡實作）
- `tools_node/task-lock.js` 加入 cross-shard 檔案重複鎖檢查
- 若鎖檔案 A 時，A 已被另一 task 鎖定 → 拒絕
- 例外：兩個 task 都標記 `coexistence: parallel` 且改動行範圍不重疊（透過 frontmatter 宣告）

### 4.3 Cross-shard 偵測命令
```bash
# 在 task-lock 前先偵測
node tools_node/task-lock.js check-cross-shard <task-id> --files <files>
# 期望輸出: { "conflicts": [], "ok": true }
```

---

## 5. 並行期間的同步機制

### 5.1 每週同步點
| 同步項 | 負責 | 形式 |
|---|---|---|
| ATM upstream 進度 | ATM upstream maintainer | 每週寫到 `docs/ai_atomic_framework/upstream-weekly-status.md`（非 plan 模式範圍）|
| 3KLife 任務卡進度 | 既有任務卡負責 agent | 透過 task-lock check / `tasks-*.json` 自動聚合 |
| Freeze list 變更 | 本文件維護者 | 修改本文件 §1 並 commit |

### 5.2 衝突早期警報
- ATM-3 / ATM-6 任務卡開卡時，同步在 `tasks-atm.json` 標 `coexistence: { freezes: [...files...] }`
- 3KLife 工程師在改 helper 前，先 `node tools_node/task-lock.js list --shard atm` 看是否撞 freeze list

---

## 6. 並行期結束條件

當下列條件全部滿足時，本協議自動失效：

- [ ] ATM-6-0001 / 0002 / 0003 / 0004 全部 status=done
- [ ] 第一批 atom（normalizeCssColor / parseCssLength / parseFragmentList / html-parser adapter）正式由 AtomicInterface 提供
- [ ] `draft-builder.js` 與 `html-parser.js` 完全經過 ATM rule guard 一次驗證
- [ ] 3KLife 端進入 S3/S4 consumption stage（既有治理工具 adapter 化）

並行期結束後，所有新 helper 一律走 ATM-* 路徑（不再開 H2U-REFACTOR-* 純 helper 卡），詳見 [`3klife-consumption-roadmap.md`](3klife-consumption-roadmap.md) §S3。

---

## 7. 落地檢查表

- [ ] 本文件落地並分配 doc_id
- [ ] `tasks-atm.json` 中 ATM-3-0001~0004、ATM-6-0001~0004 標 `coexistence` 區塊
- [ ] `tools_node/task-lock.js` 加 cross-shard 檢查（屬 3KLife 端，可開 ATM-0-0012 補強卡）
- [ ] H2U-REFACTOR-0001 / 0002 任務卡 notes 補 `coexistence: ATM-3 預定切 normalizeCssColor / parseCssLength / parseFragmentList`
- [ ] 每週 ATM upstream 進度同步點建立

---

## 8. 例外狀況的緊急處理

若並行期內發生：

| 緊急狀況 | 處理 |
|---|---|
| H2U-REFACTOR-* 撞到 freeze 區塊（業務需求驅動） | 視同 P0 衝突；H2U 卡先 pause，由 ATM 卡優先完成或主動釋放 freeze |
| ATM-* 卡發現需修改 freeze 區塊外的 helper | ATM-* 卡 frontmatter 補 `extends_freeze_list: [...]`，並更新本文件 §1 |
| 兩個 ATM-* 卡同時鎖同檔案不同區塊 | 通過 frontmatter `coexistence: parallel` 並標記 line ranges；cross-shard 檢查放行 |
| 並行期超過 12 週仍未結束 | 重新評估；可能需重新切割 ATM 任務範圍 |
