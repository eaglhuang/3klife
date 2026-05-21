# 拆解大型功能優化原子 Map 計畫書 v2-r2

<!-- doc_id: doc_other_0161 -->

> 本版為 2026-05-21 審查回寫版。目的不是擴大願景，而是把 v2 計畫壓回 ATM 開源框架的核心精神：小核心、可驗證、可回放、可回滾、repo-neutral，讓 AI 更快、更穩定、更好使用。

## 0. 結論

原 v2 方向整體合理：它把大型功能拆成 Atomic Map，補上 fingerprint、edge contract、shadow A/B、capsule、rescue、daemon、cache、diff evidence 與一行式 task UX，確實能解決 AI 在大型 repo 中常見的「上下文太大、任務切片不穩、驗證不連續、回滾困難」問題。

但原計畫也有幾個需要立即修正的地方：

1. **文件本身不可讀**：原檔大量 mojibake，違反開源文件與 AI 入口必須可讀、可引用、可機器萃取的基本要求。
2. **依賴順序過度樂觀**：M22 Daemon 與 M24 Guide Cache 是高風險便利功能，不能早於 M26 Rescue Police 與 M27 Disaster Recovery。
3. **M18 狀態與依賴衝突**：審查期間 `TASK-MRP-0018` 曾在 `TASK-MRP-0017` 未完成時進入實作，後續已被並行流程標為 `done`。此卡需在 Notes/evidence 追認 dependency exception 與安全理由，避免 done-card 沒有可追溯依據。
4. **快取與常駐模式風險低估**：M14/M24 若 cache key 不含 atom CID、policy hash、tool version、runtime profile，會讓 AI 使用過期資訊。
5. **CID 描述過度簡化**：CID 應是內容位址與版本指標，不應承諾所有 capsule 都能壓到 200-400 字元；實作上應允許短 CID 指向本機/registry bundle。
6. **自動化升級不能直接 mutate**：M13/M23 只能產生 proposal 或 claimed session；apply / close 必須有 machine-readable evidence 與 human review gate。
7. **開源中立邊界不足**：任何 evidence、capsule、daemon log、guide cache 都不得把 3KLife、Cocos、npc-brain 等 adopter 私有脈絡寫回 upstream surface。

修正後，本計畫吻合 ATM 精神：AI 不靠記憶與猜測，而靠 task card、schema、evidence、police、regression、rollback 和 source-of-truth 重建路徑前進。

## 1. ATM 精神對照

| ATM 原則 | v2 可保留之處 | 必須補強 |
|---|---|---|
| 核心小而穩 | M11/M12/M20 先補觀測與合約 | Daemon、cache、auto progression 移到安全能力之後 |
| Evidence-first | M20/M25 強化 shadow 與 diff evidence | `intent` / `impact` 不可由 AI 自動假造 |
| Human-in-the-loop | M13/M16/M23 保留最終人工確認 | 任何 auto proposal 不得直接 active |
| Repo-neutral | Capsule / map:cid 有跨 repo 價值 | Public docs / evidence / cache 不可含 adopter 私有資訊 |
| Deterministic guard | Fingerprint / edge contract / rescue police | 所有 gate 需輸出 machine-readable findings |
| 可回滾 | M17/M27 補退役與救援 | 回滾要有 proof，不只是恢復檔案 |

## 2. 對「AI 更快、更穩定、更好使用」的實際幫助

**更快**：M14 memoization、M24 guide cache、M23 一行式 task flow 能降低重複掃描與操作成本。但快取必須 opt-in、可清除、可解釋，且 clean working tree 才能使用。

**更穩定**：M11 fingerprint、M12 edge contract、M20 shadow A/B、M26 rescue police、M27 disaster recovery 形成穩定性主幹。這些能力應優先於便利功能完成。

**更好使用**：M19 Mermaid、M23 `atm do --task`、M25 diff-as-evidence 讓 Agent 與人類比較容易理解下一步。但它們只能簡化操作，不可隱藏風險或跳過驗證。

## 3. 修正後執行順序

| 順序 | Task | 修正後定位 | 理由 |
|---|---|---|---|
| 1 | M12 Edge Contract | contract-first 基礎 | 讓 map edge 不靠語意猜測 |
| 2 | M20 Shadow A/B Metrics | 升級定量證據 | M13 必須讀它 |
| 3 | M15 Telemetry Dashboard | 熱點與 drift 觀測 | 提供 reshape / optimization 的依據 |
| 4 | M19 Mermaid Auto Gen | 衍生文件同步 | 讓人和 AI 快速理解 map，但不得成為 source-of-truth |
| 5 | M17 Retire | 退役閉環 | M18/M16 需要明確的舊 atom 下線語意 |
| 6 | M18 Atom Capsule | content-addressed atom | 需先處理 M17 依賴衝突與鎖定狀態 |
| 7 | M21 Map Capsule | content-addressed map | 建立 map:cid / Merkle tree |
| 8 | M26 Rescue Police | ATM 自身健康警察 | 必須早於 daemon/cache |
| 9 | M27 Disaster Recovery | 可重建/可回滾工具 | 讓高風險便利功能有救援路徑 |
| 10 | M25 Diff-as-evidence | close task 證據草稿 | 支援 M23 與後續 proposal flow |
| 11 | M23 atm do --task | task UX 簡化 | 只能自動 reserve/claim，不自動完成證據 |
| 12 | M22 Daemon Mode | opt-in 背景提示 | 只能在 M26/M27 後啟用 |
| 13 | M24 Guide Cache | opt-in guide 快取 | 只能在 rescue 可清除、可診斷後啟用 |
| 14 | M14 Memoization Cache | map 執行加速 | key 必須含 CID/policy/runtime |
| 15 | M13 Progression Automation | proposal 產生器 | 依賴 M12/M20/M25，不直接 promote |
| 16 | M16 behavior.reshape | 受控邊界調整 | 依賴 telemetry、retire、shadow evidence 與 human review |

## 4. 修正後依賴表

| Task | 修正後 `blocked_by` | 說明 |
|---|---|---|
| TASK-MRP-0012 | TASK-MRP-0011 | 已有 fingerprint 觸發基礎後再做 edge contracts |
| TASK-MRP-0013 | TASK-MRP-0012, TASK-MRP-0020, TASK-MRP-0025 | progression 必須有 contract、shadow metrics、evidence draft |
| TASK-MRP-0014 | TASK-MRP-0012 | schema/edge 穩定後才快取 atom output |
| TASK-MRP-0015 | TASK-MRP-0011, TASK-MRP-0012 | telemetry 需 fingerprint 與 contract 結果 |
| TASK-MRP-0016 | TASK-MRP-0013, TASK-MRP-0015, TASK-MRP-0017, TASK-MRP-0020 | reshape 需觀測、退役、shadow 與 progression gate |
| TASK-MRP-0017 | TASK-MRP-0010 | retirement proof 已存在即可先補退役流程 |
| TASK-MRP-0018 | TASK-MRP-0015, TASK-MRP-0017 | capsule 需健康指標與退役語意；目前卡片鎖定中，需由持有者同步 |
| TASK-MRP-0019 | TASK-MRP-0011 | 拓樸圖是 fingerprint 後的衍生輸出 |
| TASK-MRP-0020 | TASK-MRP-0010 | shadow 比對沿用既有 equivalence / evidence closure |
| TASK-MRP-0021 | TASK-MRP-0018 | map:cid 建立在 atom:cid 上 |
| TASK-MRP-0022 | TASK-MRP-0011, TASK-MRP-0026, TASK-MRP-0027 | daemon 必須晚於救援能力 |
| TASK-MRP-0023 | TASK-MRP-0025, TASK-MRP-0027 | 一行式 UX 必須有 evidence 與 rollback/rescue |
| TASK-MRP-0024 | TASK-MRP-0026, TASK-MRP-0027 | guide cache 必須能被 rescue police 偵測與清除 |
| TASK-MRP-0025 | TASK-MRP-0010 | diff evidence 需既有 evidence closure contract |
| TASK-MRP-0026 | TASK-MRP-0018, TASK-MRP-0021 | rescue police 監控 capsule/map 衍生狀態 |
| TASK-MRP-0027 | TASK-MRP-0018, TASK-MRP-0021, TASK-MRP-0026 | disaster recovery 依賴 rescue findings 與 capsule source-of-truth |

## 5. Source-of-truth 與衍生資料規則

任何 v2 功能都必須先分類資料來源：

| 類型 | 例子 | 規則 |
|---|---|---|
| Source-of-truth | atom source、map.spec.json、vendor capsule、evidence history | 可被驗證、可重建、不可由 cache 覆蓋 |
| Derived state | registry、lineage projection、map health report、Mermaid、cache index | 可刪除、可重建、需標 generatedAt/toolVersion |
| Local volatile state | daemon PID、guide cache、memoization cache | 預設不進 git；損壞時可直接清除 |
| Public surface | upstream docs、schemas、examples、templates | 必須 repo-neutral，不能包含 adopter 私有資訊 |

這條規則比單一 CLI 更重要。只要 source-of-truth 還在，M27 必須能重建所有衍生資料。

## 6. 功能級修正要點

### M12 Edge Contract

- 不可只從 TypeScript 型別猜 schema；必須優先讀 explicit JSON Schema / atom spec。
- contract report 需包含 `edgeId`、`binding`、`fromAtom`、`toAtom`、`schemaHash`、`passed`、`failReason`。
- CI 選擇性觸發要先輸出 affected edge 清單，避免「看似省時但漏測」。

### M13 Progression Automation

- 只能產生 `pending-human-approval` proposal。
- `automationLevel` 預設 `off`。
- 門檻需包含 sample size、confidence window、shadow days、rollback proof readiness。
- 不得直接改 `replacementLane=active`。

### M14 Memoization Cache

- cache key 至少包含 `atomCid | atomId@version | inputHash | policyHash | runtimeProfile | toolVersion`。
- side-effect、rollback-adapter、non-deterministic atom 永遠不可快取。
- cache hit report 要列出為何安全命中。

### M15 Telemetry

- telemetry 是本機/CI evidence，不是產品遙測。
- 不收集私有路徑全文、使用者姓名、prompt 原文。
- hotspot report 必須可由 test/report/log 重建。

### M16 behavior.reshape

- reshape 是 proposal，不是直接重寫。
- 外部 edge contract 必須不變；map internal hash 可變，但 public semantic fingerprint 不可退轉。
- split/merge 都需 old fixtures against new code 的 regression compare。

### M17 behavior.retire

- 退役不刪歷史；registry 保留 `legacy-retired`。
- 退役需證明 active downstream reference 為 0。
- 若 capsule/map 還引用該 atom，退役需 blocked。

### M18 Atom Capsule

- CID 是內容位址，也是版本指標。
- 進 hash 的內容需 deterministic canonical form；provenance 不進 CID，但 registry 需保留並可簽章/驗證。
- 不應承諾 capsule 一定可短到適合貼在註解；CLI 應支援短 CID + bundle 檔。
- 本卡目前鎖定中，持有者需在收工前補回本節修正。

### M19 Mermaid

- Mermaid 是 derived artifact，不是 source-of-truth。
- CI 應檢查 map.spec.json 與 mermaid drift。
- 節點文字要避免塞入私有路徑與內部 repo 名稱。

### M20 Shadow A/B

- output compare 需 canonicalize，避免排序/空白造成假 divergence。
- recommendation 不可只看 100% / 90%，需同時看 sample size 與 critical divergence。
- report 要能被 M13 讀取，不靠人看 Markdown 判斷。

### M21 Map Capsule

- map bundle 用 atom CID，不用 mutable atomId。
- map:cid 應包含 edge、entrypoints、qualityTargets、runtime policy hash。
- provenance 不進 hash，但 import/export report 必須保留 provenance 與 source route。

### M22 Daemon

- 預設 OFF，repo-local opt-in。
- 預設 read-only advisory，不得自動 mutate。
- 必須有 kill switch、single instance lock、debounce、event queue、crash recovery。
- 必須晚於 M26/M27。

### M23 atm do --task

- 只簡化 lifecycle，不替使用者做隱性決策。
- `do --task` 可 reserve/claim；`complete` 必須讀 evidence 且 validation pass。
- 對 locked / blocked task 必須 fail closed，不能搶鎖。

### M24 Persistent Guide Cache

- 預設 OFF；dirty working tree 一律 bypass。
- key 需含 git commit、goal、glob、toolVersion、policyHash、profileHash。
- cache result 需可解釋：hit/miss/bypass reason。
- Rescue Police 必須能偵測 poisoned cache。

### M25 Diff-as-evidence

- 自動產生 what changed；不自動假造 why changed。
- `intent` / `impact` / `testCoverage` 未填時 `_isValid=false`。
- patch summary 應限長並結構化，避免把巨大 diff 塞進 AI context。

### M26 Rescue Police

- findings 必須 machine-readable：`trigger / scope / severity / action / routeHint`。
- critical finding 需 block all mutation。
- 要區分 source-of-truth 損壞與 derived state 損壞。

### M27 Disaster Recovery

- 所有 mutating rescue command 預設 dry-run。
- 實際修復前先備份 `.atm/` 與 registry。
- `factory-reset` 必須需要長確認字串，不可被 `atm do` 自動觸發。
- recovery report 必須能附到 task evidence。

## 7. 本輪已回寫任務卡

本輪已回寫 `TASK-MRP-0012` 到 `TASK-MRP-0027` 的 v2-r2 審查補充。回寫期間有並行進度：`TASK-MRP-0018` 與 `TASK-MRP-0021` 已轉為 `done`，`TASK-MRP-0026` 已轉為 `in-progress`。

`TASK-MRP-0026` 仍屬進行中卡片；後續接手者需先確認鎖與 handoff。`TASK-MRP-0018` 雖已完成，仍已補上 v2-r2 追認驗收，要求 CID 實際 payload 限制、provenance/hash 分離、rescue rebuild evidence 與 dependency exception 必須在 Notes 或 evidence 中可追溯。

## 8. 最終判斷

v2 的願景正確，但原本像是「把所有好功能一次排上去」。v2-r2 的修正是把它整理成 ATM 會喜歡的形狀：先契約與證據，再 capsule 與救援，最後才是 daemon/cache/一行式 UX。這樣才會真的讓 AI 更快，而不是快到撞牆；更穩，而不是把錯誤藏進快取；更好用，而不是把高風險操作包成漂亮按鈕。
