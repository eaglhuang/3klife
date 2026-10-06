---
doc_id: pending
title: Derived Atoms: two-phase symbol-level occupancy
status: active
family_dir: adapter-guided-atomization-sdk
createdByCommand: atm plan doc create
---

# Derived Atoms: two-phase symbol-level occupancy

| 欄位 | 內容 |
|------|------|
| 文件狀態 | v0.4 定稿 |
| 日期 | 2026-10-07 |
| 家族 | **ASP**（`adapter-guided-atomization-sdk`），卡號 TASK-ASP-0006 起；不開新系列 |
| 歷程 | v0.1 中央 atlas＋commit hook → v0.2 可推導不 commit → v0.3 認領當場算 → **v0.4 兩段式：認領預約＋提交 diff 確認** |

## 0. 一句話

認領時**預約**（可選宣告符號，否則檔案級可 compose 共享），提交時以 diff **確認**實際動到的推導原子，與正式原子疊合後比對佔用；推導結果不存檔、不常駐 Broker、不攔截寫入、永不自動升格；佔用沿用既有 `VirtualAtomInUseRecord`，不新建第二套佔用結構。

**價值**：基線是今日已有的 admission／compose。本計畫不發明並行，只把佔用從過粗（檔案／粗 owner）收斂成「diff 確認的符號級」，提高不相交可 compose 的比例。

## 1. 名詞

| 名稱 | 是什麼 | 不是什麼 |
|------|--------|----------|
| 正式原子 | registry 內原子（`atm create`／審核後） | 推導結果 |
| 推導原子 | 由程式碼算出的候選，CID v2 識別 | 「虛擬原子」（禁止混用） |
| 佔用紀錄 | 既有 `VirtualAtomInUseRecord`；其 `virtualAtomCid` 欄位存推導原子 CID | 新結構（不新建、不改欄位名） |

## 2. 非目標

常駐 Broker、寫入攔截、`.atm/atlas` 或任何預存全庫原子圖、自動升格、第二套 registry／CID／定位語意、v1 CID 相容旗標、綁 #180／#181／#184。

## 3. CID v2（ASP-0006）

```
atomCid = SHA-256( "cid.v2" ‖ languageId ‖ normalizedPath ‖ kind ‖ symbol ‖ ordinal? )
```

- 不含行號、不含 `detectionMethod`（移入 provenance；偵測器升級不得換 id）。
- **overload 合併**：連續同名函式宣告（TS overload 簽章＋實作）合併為一個原子。
- **ordinal**：僅當同檔存在同 `kind`＋同 `symbol` 的多個原子時才加入，值為原始碼出現順序（0 起）。無重名 → 無 ordinal。
- 已知限制：在既有同名符號之前插入新的同名符號會使後者 ordinal 位移、CID 改變 → 依第 6 節 stale 規則降檔案級，不另做穩定化。
- `contentVersion` = 原子範圍文字（換行正規化為 LF）之 SHA-256；不參與身分。
- 不做 v1 相容：實測 `computeCandidateAtomCid`／`candidatesToWriteIntent` 無非測試呼叫者，無持久化 v1 資料。同步修正 `candidate-bridge.ts` 註解與程式不一致。
- 方法級 `enclosingScope` 待 AST／`enclose()`（P-later）。

## 4. 兩段式佔用

### 4.1 認領：預約（ASP-0007）

- `--atoms <symbol,...>`（可選）：**意圖上限，不是獨佔保證**。解析為推導 CID 並登記預約。
- 未宣告：登記**檔案級可 compose 共享佔用**；它**不擋**他人的原子級預約。兩任務皆未宣告時，認領階段**不互斥整檔**，衝突判定一律延到提交（T7）。
- 計算只針對 `scopePaths` 內檔案；可用以內容雜湊為鍵的程序內快取，可丟棄。

### 4.2 提交：確認（ASP-0008）

1. 由本次 diff（讀 index 內容，不讀工作區）算出實際動到的推導 CID 集合 `D`，含新增符號長出的新 CID。
   - 失敗態：無法從 index 算出 `D`（二進位檔、不支援語言、解析失敗）→ 該檔降檔案級，走既有整檔路徑；**不得假造符號**。
2. 疊合正式原子：落在正式範圍內 → 以正式 `atomId` 計；跨兩個以上正式原子 → **全部佔用**。
3. 比對：`D ∩（他任務已確認 ∪ 仍預約的 CID）`。
   - 空 → 允許 compose。
   - 非空 → 既有衝突流程（排隊／proposal），不得降為共享檔案佔用了事。
4. 收斂：`D` 成為最終佔用；宣告了但未碰的預約釋放；超出宣告者補登記並重檢。
5. 先提交者先落地；後提交者走既有 stale-base／CAS 重新驗證。

## 5. Import 前導區（ASP-0009）

- 每檔一個前導區（import 區＋頂層語句）。
- **僅純新增 import 行** → 以集合聯集 compose；修改／刪除 import 或頂層語句 → 串列。

## 6. 正式原子 stale（ASP-0010）

- 正式原子定位對不上程式碼 → 標 `stale`。
- 認領／確認：**降檔案級**（B），附 doctor 修復指令。
- 會寫 registry 的操作（升格、重構提案）：**直接擋**（A）。
- doctor／警察回報漂移；不自動修。

## 7. 語意衝突防護（ASP-0009）

原子不相交仍可能語意衝突（例如改簽章）。compose 後必須重跑**雙方**既有 validator；失敗 → 退回串列。
**開工前調查項**：確認 composer 是否已有重新驗證入口；若無，使用任務卡 `validators` 經既有 `evidence run` 於合併後工作樹執行。不得另創驗證入口。

## 8. 升格

永不自動。只走 `atm create`／`behavior.atomize`＋審核。觸發來源：使用者選擇重構、警察 finding（例：同一推導原子在多任務反覆被佔用或高變動）、拆分大檔。

## 9. 測試

| ID | 案例 | 期望 |
|----|------|------|
| T1 | 上方插空行 | CID 不變 |
| T2 | 改函式名 | CID 變 |
| T3 | 只改函式體 | CID 不變、contentVersion 變 |
| T4 | CRLF ↔ LF | 皆不變 |
| T5 | TS overload | 單一原子 |
| T6 | 偵測方法字串改變 | CID 不變 |
| T7 | 兩任務同檔不同函式（皆未宣告） | 提交確認後 compose |
| T8 | 兩任務同函式 | 衝突流程 |
| T9 | 宣告 `--atoms a`、實際改 a+b | b 補登記並重檢 |
| T10 | 新增函式與他任務新增同名函式 | 衝突流程 |
| T11 | 正式範圍內修改 | 以正式 atomId 計，不另發推導 id |
| T12 | 跨兩正式原子 | 兩者皆佔用 |
| T13 | 雙方純新增 import | compose |
| T14 | 一方刪 import | 串列 |
| T15 | 原子不相交但改簽章致對方 validator 失敗 | 退回串列 |
| T16 | 正式原子 stale | 降檔案級＋doctor 指令 |

## 10. 驗收指標（ASP-0011 dogfood）

同檔並行被 admit 比例、因前導區衝突排隊比例、推導計算 p95、compose 後 validator 失敗次數（>0 需調查）。

## 11. 任務卡（ASP 家族）

| 卡 | 內容 | 依賴 |
|----|------|------|
| 前置 | `plan series register --series ASP --prefix TASK-ASP --family-dir adapter-guided-atomization-sdk --plan <本計畫> --owner-approved`（先 dry-run） | owner 批准 |
| ASP-0006 | CID v2（第 3 節）＋T1–T6 | — |
| ASP-0007 | 認領預約、`--atoms`、檔案級共享佔用；WriteIntent 組裝即具備「修改既有原子」operation 最小欄位 | 0006 |
| ASP-0008 | 提交 diff 確認、疊合正式、補登記重檢 | 0007 |
| ASP-0009 | 前導區規則、「修改既有原子」operation 完整規則、validator 重跑（含調查項） | 0008 |
| ASP-0010 | stale 降級（認領＋確認兩處皆套第 6 節）＋doctor／警察回報 | 0007、0008 |
| ASP-0011 | dogfood＋第 10 節指標 | 0009、0010 |
| P-later | 方法級 AST／`enclose()`、改名歷史、全庫報告、ErrorCode（`ATM_ATOM_*`／既有前綴，經 `atm-error-code-resolver`） | — |

## 12. 開工檢查清單

- [ ] 同意兩段式（預約＝上限、提交 diff＝最終佔用）
- [ ] 同意 CID v2 公式與 ordinal 規則及其已知限制
- [ ] 同意跨正式「全部佔用」、stale 認領降檔案級／寫 registry 擋
- [ ] 同意掛 ASP 家族並登記系列

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-10-06T16:54:39.673Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"adapter-guided-atomization-sdk/derived-atoms-plan.md","contentDigest":"sha256:f9b56e0c16d851bec8b8fb5d09fba63c978c0f1513da6835c9d5370a2f8b0031"} -->
