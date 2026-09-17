---
doc_id: pending
title: ATM 輕量與可靠性交付收斂計畫
status: active
family_dir: atm-product-proof
createdByCommand: atm plan doc create
---

# ATM 輕量與可靠性交付收斂計畫

## 產品目的與裁示

ATM 的價值是讓 AI 更可靠、更低成本地交付軟體，並留下足以辨識偏移的足跡。最少足跡是原始目標/驗收、變更與版本、驗證結果/證據位置、偏差或例外原因。Git 與 CI 已能提供的資訊優先沿用。

本文件是 2026-09-14 Owner 收斂裁示的執行計畫，接續 [既有產品證明計畫](atm-product-proof-plan.md)。沿用 PRF 系列，不重寫已結案卡的 provenance。治理流程完美、收據數量、結案率、拆檔數都不是成功指標。

## 範圍與明確不做

開發位置 C:/Users/User/AI-Atomic-Framework；計畫/卡片位置 C:/Users/User/3KLife/docs/ai_atomic_framework/atm-product-proof。本輪新增七張有完整工作範圍的卡，既有外部 benchmark、CI 和 npm 卡直接接續。

包括：公開命令正確性、使用流程收斂、實際套件及依賴減量、重複 evidence 寫入移除、既有 Quickfix 操作簡化、可靠端到端驗證與最終產品判定。
不包括：新增治理狀態機、第二套 registry、為小 bug 發展通用框架、為收据欄位完整重建整個生命週期、未評估相容性直接刪 API、以多包拆分把體積搬到依賴中。

## 第一性原理與成本順序

每項工作用「觀察到的故障機率 × 影響 × 使用頻率 + 可節省人工/Token 成本」對比「實作 + 驗證 + 遷移 + 長期維護成本」。沒有可靠數據先標未知，不以主觀小數分數製造精確感。

1. 先修會阻擋安裝/核心功能或造成假綠燈的實際 bug；可重現、範圍明確者直接 Quickfix。
2. 優先量測並削減每個任務必經指令/gate 的實際耗時，以毫秒計分；先追查秒級熱點，再按每任務累積成本排序。移除重複掃描、重複驗證及操作，而不是只降低命令次數。
3. 從實際可達依賴/資產追查體積，刪掉無必要的行為、依賴及副本。
4. 收斂 evidence 與維修步驟，保留能驗證結果的最少紀錄。
5. 用固定任務的外部 A/B 決定剩餘 ATM 複雜度是否值得保留。

各線可獨立量測；寫入共享檔案/發布產物才排順序。遇到工具阻塞先做一次診斷和最小維修；相同問題第二次重現即改走 Owner 已授權的有範圍維修通道，不新增一系列治理卡。驗證失敗不能當作流程問題繞過。

## 必須保留的多 AI 並行能力（Owner 補充裁示）

簡化與多 AI 並行共同成立：保留可相容工作的並行、衝突辨識、變更歸屬及可恢復提交；縮減的是達成這些能力所需的控制面與等待成本。不得把全部工作串行化或降低衝突檢查品質來換取表面加速。

- 讀取與不相交工作並行；共享檔案是否衝突依實際邏輯/內容影響判斷，不單憑檔名。無法安全判定時明確重驗或等待，不假裝可合成。
- 僅不可分割的共享寫入區間（例如index/commit、同一產物發布）短暫序列化；分析、編輯提案、測試與證據準備移到區間外。
- 優先沿用現有協調實作，移除重複狀態、全repo掃描、緊密polling與未就緒長期佔鎖；不另造一套broker。
- 對固定1/2/4-agent工作負載各至少10次重跑，分無衝突、真衝突、stale-base、worker中斷四種情境。量測吞吐量、p95等待、CPU時間、峰值RSS、檔案掃描/子程序/輪詢次數、人工/Token與錯誤結果。
- 無衝突2/4-agent測試須觀察到實際執行區間重疊；候選吞吐量不可較同機同負載baseline低超過5%；既有安全性不退步。目標控制面CPU或協調呼叫下降至少20%，其餘主要成本不得有未解釋回歸。數字是本輪驗收目標，不是已量得收益。
- 真衝突不得遺失更新；stale-base不能套用過期提案；worker中斷可收回其資源而不釋放其他活躍worker的所有權；所有case保留actor/commit/test的歸屬。正式false-block/missed-conflict結論仍使用獨立oracle及分母。

此要求納入0096、0098、0099、0100、0101，主要由0099在既有快修/協調流程中交付性能與並行回歸驗證，0101負責把跨命令/gate的毫秒證據整合進產品判定。0101不新增常駐服務或第二套治理流程。必要時保留少量具有實際價值的協調程式；程式行數下降不能凌駕正確性與吞吐量。

## 已知基線與證據限制

- Node：WSL Ubuntu 原生 Linux v24.12.0/npm 11.6.2 已安裝並 smoke PASS；這只證明 Node 環境，不等於 pilot 完成。Windows 與 Linux 分開記錄。
- 公開 facade 的歷史表列曾是 21 個 commands，但目前 frozen runner 的 help 實際列出 62 個 top-level ATM 指令；名稱、runner 與 telemetry mapping 仍可能不一致。這個數字差異本身是可追溯性缺口，後續以 `listCommandSpecs()`／help 的實際輸出作為 inventory authority，不再沿用 21 的舊摘要。
- 先前 build 回報 64 files/2,629,665 bytes，只是 runtime manifest 口徑，不是完整 npm unpacked 或依賴體積。每項體積實驗必須凍結新的實際 tarball baseline。
- 先前 CI 匯出 800 attempts、180 success/620 failure 是歷史觀察，不是長期綠色證明；不可跨 workflow 混算。
- PRF-0092/0093 已提供外置 evidence/負測；PRF-0094 提供 job provenance。不能因卡 done 就認定所有 runtime evidence 已從 Git 歷史移除。
- 原始 external pilot 的 isolation/oracle/credential/lockfile 等條件必須重新讀現有證據，未知保持未知。

### 目前毫秒基線快照（探索樣本，不是產品成效）

2026-09-15 在 ATM repo 的 frozen runner 以同一工作區連續各 8 次執行讀取型命令；這組資料不是正式 30 組 AB/BA，且沒有清除 OS 快取。所有時間是從外部程序啟動到結束的 wall ms，供挑選第一批量測熱點：

| 命令 | p50（8 次排序第 4 筆） | 最大值／暫代 p95 | exit 結果 | 解讀 |
|---|---:|---:|---|---|
| `node atm.mjs doctor --json` | 15,461 ms | 16,587 ms | 8/8 失敗 | 秒級首要診斷；失敗原因是 `ATM_RUNNER_PUBLICATION_INVENTORY_INCOMPLETE`，不可直接宣稱效能問題 |
| `node atm.mjs atm-chart verify` | 979 ms | 1,001 ms | 8/8 通過 | 接近秒級；需在 runner-sync 修復後重測 |
| `node atm.mjs telemetry --coverage-report --json` | 868 ms | 877 ms | 8/8 通過 | 讀取/盤點成本候選；不等於所有 gate 已量測 |
| `node atm.mjs broker status --json` | 858 ms | 868 ms | 8/8 通過 | 讀取型 broker 成本候選 |
| `node atm.mjs --version` | 108 ms | 203 ms | 8/8 通過 | 程序啟動基線；單次低但高頻時仍計入累積成本 |

同一時間的 gate telemetry coverage report 顯示 9 個家族中 5 個 `instrumented`、2 個 `not-yet-covered`、2 個 `read-only-summary`；`m2Comparable=false`。缺口包括 validator queue/execution/cache/fan-out、evidence seal/readback/handoff、git governance/hooks/branch queue 及 runner-sync/release/projection 的真實 producer 或必要 correlation。這個快照只證明目前 coverage 不足，不能用來補造 duration=0。

下一個基線批次必須先把 `doctor` 的 runner-publication blocker 與性能觀測分離：同一固定版本建立可通過與預期失敗兩條 workload，分別報成功延遲、失敗延遲、錯誤碼及重工時間。完成正式 30 組前，本表所有 p50/p95 僅用於排序候選，不作門檻判定。

本次原始探索樣本已外置保存：[command-latency-baseline.json](C:/Users/User/atm-benchmark-sink/ATM-METRICS-20260915/command-latency-baseline.json)（`sha256:c2ef74d923df9a34240cd9e62d171efe28da3951bf2e67f122553a121b885553`），摘要為 [command-latency-baseline.md](C:/Users/User/atm-benchmark-sink/ATM-METRICS-20260915/command-latency-baseline.md)（`sha256:7608ce2f00a7340aa84345de4304bc0f8332f1b0475e6c8401459e2ff4bed17b`）。

唯讀 source 定位顯示 `doctor` 在產生 verdict 前會同時做 `packages/` 與 `scripts/` 遞迴檔案盤點／逐檔讀取 `@ts-nocheck`、hash-placeholder audit、integration/hooks/readiness、runner source/publication inspection、Git head/backlog 與 historical commit-scope patrol。這是「可能造成 15 秒」的候選清單，不是因果證明；下一個 probe 必須逐段計時並確認每段是否真的是必要 gate，再決定快取、移出預設路徑或合併掃描。不得因一次失敗樣本就刪除 runner-publication correctness check。

第一個局部候選已完成：commit `04c7d765f9e2a2344214db23690cccccb1abb6b6` 將 historical commit-scope patrol 的最多 200 次 `git diff-tree` 合併成單次 `git log --name-only`；focused tests 3/3 與 typecheck 通過。source-first 單次 probe 為 5,398 ms，舊 frozen runner 的 8 次中位數為 15,461 ms，但兩者 runner 不同且仍有 source drift，故目前狀態是 `candidate-improvement-pending-runner-sync`，不是 65% 產品效益。完整 probe 及 digest 見 [doctor-patrol-optimization-probe.json](C:/Users/User/atm-benchmark-sink/ATM-METRICS-20260915/doctor-patrol-optimization-probe.json)（`sha256:61b1b631769959d7ff67b0d56e07f83e35f87403366f75a0d3bcf6ffe9ffa728`）。

在同一乾淨 checkout 的 3×3 paired probe 中，frozen `doctor` 中位數 17,320.57 ms，source-first 中位數 7,480.34 ms，觀察差 9,840.23 ms（56.81%）；三次兩邊均 exit 0。這仍是 `candidate-signal-not-attributed`：frozen onefile 尚未由本 commit 重建，且可能含其他 source drift；完整資料見 [doctor-patrol-clean-paired-01.json](C:/Users/User/atm-benchmark-sink/ATM-METRICS-20260915/doctor-patrol-clean-paired-01.json)（`sha256:70183c3ee5d3e76ed3d89cf16d2b41553982bde23872fc31d8624bf8f56852de`）。

2026-09-15 的 onefile 交付完整性修補已落地於 framework commit `b5b897960c84ab3a89fe34b3943200e7cf32c379`：`buildOnefileRelease` 不再以「root-drop 目錄存在」當作新鮮度證據，而是在收集 payload 前重新 reconcile root-drop；`validate-onefile-release` 新增刪除 `cleanup.spec.js` 後重建仍必須恢復的回歸檢查。修補前，既有 root-drop 快照缺少 `packages/cli/dist/commands/command-specs/cleanup.spec.js`，onefile 會在 `tasks`/`doctor` 路徑出現 `ERR_MODULE_NOT_FOUND`；修補後完整 onefile validator 通過，且候選 `--version` 能回報有效 frozen seal。這證明的是「不再重用過期快照」，不是 npm publish 或正式性能收益。

同一 commit 的 sealed runner build 已完成 package/dist 與 onefile 組裝（`build-onefile-release` 回報 1,487 files），但 publication 在既有 takeover receipt 上停止：`ATM-FRAMEWORK-TEMP-codex-gpt-5-4-mini.runner-publication-takeover.json` 的 sealed source 與目前 HEAD 不一致。故目前狀態是 `candidate-runtime-complete-awaiting-publication-recovery`；在 stale takeover 以 recovery lane 重新對齊前，不宣稱 published、CI green 或外部成效。

本次修補的外部證據已移出 ATM Git history：[onefile-stale-rootdrop-fix-20260915.json](C:/Users/User/atm-benchmark-sink/ATM-METRICS-20260915/onefile-stale-rootdrop-fix-20260915.json)（`sha256:4daaa0c53e7f1136c31abc55a6ef41b88b946ec23de1abd6b81477bc57f72772`），摘要見 [onefile-stale-rootdrop-fix-20260915.md](C:/Users/User/atm-benchmark-sink/ATM-METRICS-20260915/onefile-stale-rootdrop-fix-20260915.md)（`sha256:11809bd58d3da3539cbdd24827175f611a2e50bca8b8d57aa4d720dce7612260`）。

## Deep-module 刪減方法

用 codebase-design 的 deletion test：刪掉此模組後，必要複雜度會回到多個 callers，或只是消失？後者優先列為刪除候選。介面應隱藏必要順序與實作細節，不把 ticket/lease/phase 轉嫁給一般 adopter。

逐個命令/模組列：實際用途、call sites、維護成本、影響流程、保留/合併/內部化/退役、替代入口及回退方式。零使用紀錄不是零使用的證明；公開能力退役仍須相容檢查。先合併重複邏輯與引导，再以別名遷移，最後刪除實作。單純 lazy-loading、改名、拆檔或藏 help 不算成功。

## 執行工作包與依賴

### 毫秒級減負計畫（Owner 補充：2026-09-15）

**主要評分依據是「固定任務實際少等待多少 ms」，不是指令變少、欄位齊全或 gate 全綠。** 「必經 gate」指任務必須執行的品質檢查，不代表它必然 PASS；正常情況經常通過的檢查，仍可能攔下少見但嚴重的錯誤。不可因通過率高就移除安全檢查。

#### 指標、分母與排序

| 指標 | 計算口徑 | 用途 |
|---|---|---|
| 每任務 ATM 必經等待 ms | 固定流程內 ATM 必經操作阻塞任務前進的實際時間；重疊區間取聯集，不重複加總父子 span | 第一順位減負成效；報 baseline/candidate 的 p50、p95、差值與百分比 |
| 每指令/gate ms | 外部程序啟動至結束的 wall time；內部分解啟動、排隊、掃描/I/O、執行、寫入及恢復 | 熱點定位；inclusive/exclusive 分開，不把內部耗時再加到整體 |
| 每任務累積成本 | 實際呼叫頻次 × 每次成本，另列重試、失敗與輪詢成本 | 防止只優化低頻慢命令，漏掉大量短呼叫 |
| 多 AI 成本 | 整批 makespan、吞吐量、每 actor 等待 ms、共享寫入佔用 ms、CPU ms | 保留並行效益；跨 worker 時間聯集不冒充關鍵路徑，CPU 加總不冒充 wall time |
| 量測覆蓋率 | 有真實樣本的必經步驟數／已盤點的必經步驟數；另列適用路徑與未覆蓋清單 | 欄位或 registry 存在不算實測；缺值為 null，不能填 0 |

先處理正確性 bug，再盤點 p50 或 p95 ≥1,000 ms 的指令/gate，≥5,000 ms 優先診斷。秒級是找熱點的起點，不是新增 blocking gate：100 ms 重複 100 次也可能比偶發的 5,000 ms 更值得修。

同一風險級內，依「預估可省 ms/任務 × 適用任務量 × 證據可信程度／實作、驗證、遷移及維護工時」排序。展示頻次、估算範圍與假設，不硬湊綜合分數；已有實測用實際節省 ms，未知候選先做短實驗。人工分鐘、Token、套件 bytes 另欄呈現，不任意換算成 ms。

#### 量測方法與可重跑性

1. 從實際命令註冊、gate registry、執行呼叫點與既有 receipt 交叉盤點所有指令/gate；標明開箱、普通修改、Quickfix、共享提交、batch 的必經／條件執行／可選步驟。先完整列出，再分批補量測，未量到不宣稱全面覆蓋。
2. 以外部單調時鐘量 CLI 程序全程，內部沿用既有 durationMs 與 correlation/run/task 欄位。只在不能定位瓶頸時補最小分段；不新建 telemetry registry、常駐服務或每指令全歷史掃描。保留量測原始精度，以 ms 顯示；既有整數截斷欄位不可作次毫秒成效證據。
3. 每組比較固定 workload、repo 規模、工具版本、lockfile、runner/artifact digest 與設定；baseline/candidate 分別綁定其 commit，除待測修改外條件一致。Windows 原生、WSL 原生與 interop 分組，不混算。cold 必須列出清除了哪些 cache；程序 cold 與 OS disk cold 不混稱。
4. 單機每 OS/cache 情境至少 30 組配對樣本，交錯 AB/BA 並加 A/A 雜訊控制；報 p50/p95、分散程度及樣本數。多 AI 沿用 1/2/4-agent 四情境矩陣，至少 10 次作回歸篩檢；正式 p95 比較至少 30 次，仍須揭露尾端估計不確定性。
5. 失敗、取消、timeout、重試全部保留；timeout 列為截尾資料，不當作準確完成時間。成功樣本延遲與全樣本失敗/重工成本並列，不能丟掉慢失敗來製造改善。
6. 型別檢查、測試、build、hooks 和 runner-sync 若在必經路徑內，納入耗時並分辨業務驗證與 ATM 額外成本。移到背景或預熱的工作仍列 CPU/I/O 成本，不能只隱藏等待。
7. raw samples 放 repo 外既有 evidence sink，Git 只留最少摘要與 digest 引用；不開啟遠端匿名 telemetry。量測開/關交叉檢查觀測負擔，目標每任務額外 wall time <1%；低於噪音時報無法分辨，不假稱零成本。

#### 既有儀表板／工具的重用裁示

以下是 ATM source 的唯讀盤點結果，不代表現有資料已完整或能直接支持產品效益：

| 現有位置（相對 ATM repo） | 可重用部分 | 限制與處理 |
|---|---|---|
| `packages/core/src/telemetry/observation.ts` | timing、correlation、producer inventory | producer 有未遷移狀態；duration 整數截斷。先補必要實測覆蓋，不另造模型 |
| `scripts/validate-gate-telemetry-coverage.ts`、`packages/cli/src/commands/telemetry.ts` | gate 家族盤點、coverage/task summary/report 入口 | registry 覆蓋不等於執行樣本覆蓋；fixture 不算實測 |
| `scripts/validate-next-warm-run-latency.ts` | 外部程序計時、CLI 邏輯與 wrapper 耗時拆解 | 執行包含 build，須在隔離候選工作區使用；不能當所有指令已量測 |
| `scripts/plan-performance-report-v4.ts` | command receipts、timing segments、AB/BA、A/A 報表概念 | 目前綁定特定任務、70 cells 與舊門檻；只重用適合的邏輯，不照搬整套驗收或認定舊摘要有效 |
| `packages/cli/src/commands/broker/replay/dashboard-view-model.ts` | 只讀呈現結構 | 輸入生成含固定 waitedMs=0/1 與 epoch 時間，是合成 replay；不得列入真實延遲排行榜 |
| `packages/cli/src/telemetry/index.ts` | 本地成本欄位的既有概念 | 外送 payload 沒有完整指令 duration；不用開啟匿名回傳來做本計畫 |

第一版只需要可重跑 JSON＋Markdown 排行榜，優先擴充現有 report，不建新 GUI。每列顯示指令/gate、適用路徑、mandatory、樣本數、頻次、p50/p95 ms、排隊 ms、累積成本、失敗率、版本及實測/未知標記；另顯示前十大熱點與未覆蓋清單。資料不足時不能只展示綠色結論。

**全量覆蓋硬門檻：** 最終產品證明的 command inventory 必須等於當版
`listCommandSpecs()`／help 的實際 top-level 指令集合（目前基線為 62），每個
被執行的指令都要有外部 wall `durationMs`；品質 gate 另依 workflow applicability
標示必經或條件執行。八個 canonical gate 的 registry 通過，不代表其餘指令已量測。
中途可保留 `unknown` 供排序，但在 0100 go/no-go 前，所有固定任務必經 gate 必須
有真實樣本，command coverage 與 mandatory-gate coverage 均不得以 fixture 或
`duration=0` 補足；未達覆蓋即 no-go。這項門檻只要求重用現有 telemetry/report
資料流，不新增常駐服務、第二 registry 或 GUI。

#### 執行順序、目標與停止條件

1. **盤點與基線：** 0099 接續固定小 bug 流程與上述必經路徑計時，0101 整合所有已量到的指令/gate 收據，先交覆蓋清單、真實 baseline 和前十大熱點；0096/0098 提供各自受影響步驟，不新增常駐治理機制。
2. **優先刪成本：** 選累積成本最高且能安全修的前三項，逐項最多兩個方案。優先刪重複掃描/子程序、共用單次計算、縮短共享鎖區間；跨程序 cache 必須證明輸入/版本失效正確，不能復用過期 PASS。
3. **局部驗收：** 所選秒級熱點以 p50 降低 ≥30% 為目標；固定任務必經等待 p50 降低 ≥20% 為主要目標。p95 回歸 >10% 即停下分析，不以平均值掩蓋；未達目標記為未證明，不放寬門檻湊結案。
4. **並行與安全驗收：** 沿用本計畫多 AI 吞吐量及衝突矩陣。無衝突吞吐量退步 >5%、漏擋真衝突、遺失更新或 stale-base 誤用，都不能以省時抵銷。不得全串行化換取控制面數字下降。
5. **交付判定：** 0100 消費版本綁定的 before/after 報告、失敗樣本、功能負測與實際總成本；0071/0040/外部驗證再量相對 worktree＋Git＋CI 的淨收益。內部加速不等於已證明市場價值。

以上百分比是預先提出的驗收目標，不是已實現的收益。0099 先前「6→3 次呼叫／減少 50%」只有指定流程算術比較，未建立可比的完整任務耗時 baseline，不能當成實測減負；一般 Quickfix 的 auto-stage 適用性也需另以真實路徑驗證。保留歷史紀錄但撤回收益推論，不重寫既有卡 provenance。

| 工作卡 | 範圍 | 開始條件 | 交付驗收 |
|---|---|---|---|
| [TASK-PRF-0095](tasks/TASK-PRF-0095-unify-public-command-registry-and-reject-inherited-command-names.task.md) | 公開命令表單一來源＋繼承命令負測 | 立即；本輪首項 | 21項能力保留、拒絕prototype名稱、刪除重複清單 |
| [TASK-PRF-0096](tasks/TASK-PRF-0096-converge-adopter-workflows-and-retire-redundant-command-implementations.task.md) | adopter 流程與重複命令實作收斂 | 0095 行為測試完成 | 推薦入口≤5；決策步驟下降≥30%；刪實作 |
| [TASK-PRF-0097](tasks/TASK-PRF-0097-reduce-runtime-dependency-closure-with-measured-feature-retirement.task.md) | 依賴可達性與實際套件瘦身 | 0095；消費0068/0069證據 | 實際unpacked下降≥20%；依賴不增加；正確性通過 |
| [TASK-PRF-0098](tasks/TASK-PRF-0098-simplify-evidence-ownership-while-preserving-deviation-traceability.task.md) | 最少足跡＋刪除重複 evidence 寫入 | 先讀0092/0093與0070證據 | 至少移除1個冗餘writer；遺失/篡改負測仍有效 |
| [TASK-PRF-0099](tasks/TASK-PRF-0099-deliver-bounded-quickfix-workflow-with-fewer-operator-decisions.task.md) | 既有 Quickfix 操作簡化 | 先量固定小bug的實际操作 | 固定bug必要呼叫或決策下降≥30%；不新增指令 |
| [TASK-PRF-0100](tasks/TASK-PRF-0100-verify-convergence-release-against-fixed-product-acceptance.task.md) | 整合產品 go/no-go 驗收 | 0096–0099，以及下表既有產品證據 | 全部產品門檻逐項有版本綁定證據 |
| [TASK-PRF-0101](tasks/TASK-PRF-0101-integrate-millisecond-cost-score-into-product-proof.task.md) | 將指令/gate 毫秒成本整合進產品判定 | 既有 telemetry/report 或獨立收集的固定 workload；可消費 0097、0099 樣本但不等待其結案 | 前十大熱點、覆蓋率、每任務節省 ms、p50/p95 與失敗成本可重跑；未量測不宣稱 |
| [TASK-PRF-0108](tasks/TASK-PRF-0108-eliminate-duplicate-package-dist-build-during-onefile-root-drop-assembly.task.md) | 移除 onefile/root-drop 重複 package-dist 建置 | 0101 熱點盤點顯示 validate-bootstrap 秒級成本；既有 artifact digest 可比對 | onefile 僅建置一次、直接 root-drop 安全預設不變、artifact digest/語義不變、AB/BA＋A/A 毫秒證據；未達門檻即停止 |
| [TASK-PRF-0109](tasks/TASK-PRF-0109-defer-full-framework-status-from-normal-next-guidance.task.md) | 將完整 framework status 延後至 claim/guard 邊界 | profiler 證明 `next` 的 `build-governance-readiness` 在框架 prompt 約 4.0–4.2 秒；完整 claim/guard 檢查仍可獨立執行 | normal guidance p50 至少下降 20%、p95 不回歸超過 10%；安全 blocker、claim hint 與多 AI private-read 語義不變；不新增 command、gate、registry、daemon 或第二狀態來源 |
| [TASK-PRF-0111](tasks/TASK-PRF-0111-complete-full-atm-command-and-mandatory-gate-millisecond-coverage.task.md) | 補齊全量 command 與必經 gate 的真實毫秒樣本 | 0101 ledger 已結案但目前只映射 8 個 canonical gate；help/listCommandSpecs 實際列出 62 個 top-level 指令 | inventory 對齊當版 62 commands；每個被執行指令有真實 wall `durationMs`；必經 gate coverage 不得用 fixture/0 補足；p50、p95、秒級熱點與 overhead 綁定 0100 go/no-go |

所有新卡由 plan CLI 分配。跨卡共享 atm-public.ts：0095先交付，0096/0097後續依實際source版本協调，不同時覆蓋彼此變更。六張卡是本轮新增範圍全部，下面是併入本計畫的既有工作，不能重複開發。

### 0109 的量測錨點（2026-09-15）

同一台 Windows／Node 24.12.0／frozen runner 的 profiler 結果：明確含 ATM／框架語意的
task prompt，`build-governance-readiness` 為 4,026–4,166 ms；只以 task id 路由時為
1,066–1,080 ms。差額約 3 秒，來自 guidance 階段無條件重建完整
`createFrameworkModeStatus()`，不是 task route 本身。這項差異是 0109 的候選優化邊界，
目前尚未是產品收益證明；正式判定仍需 30 組 AB/BA、A/A、失敗狀態與外部 receipt。

目前 telemetry snapshot（混合歷史樣本，僅作排序）：`next.route-resolution` 累積
576,061 ms、`doctor.readiness` 250,496 ms、`taskflow.close-readiness` 238,533 ms。
`taskflow.close-readiness` 雖在全域 registry 標為條件執行，但對 close 流程屬必經等待，
後續報表必須按 workflow applicability 重新計算，不得只依賴單一 global `mandatory` 布林值。

## 既有任務對照與接續

### CI 觀察窗口現況（2026-09-15 唯讀快照）

以 GitHub `ci.yml` 的最近 100 次 workflow run 作為目前可查的外部基線：
36 次 success、64 次 failure；最早 `2026-09-06T15:45:42Z`，最新
`2026-09-14T03:31:44Z`。因此目前只有約 7.5 天的混合結果，尚未達到產品
要求的「受保護主分支連續 30 天、90 次有效執行」，也不能把 CI badge 或最後一次
成功當成長期綠色證明。0100/0059/0066 必須保留每次首敗、重跑、修復耗時與排除理由，
並在同一 job 覆蓋 build、test、package、clean-install 後，才可重新計算 burn-in。

查詢口徑：
`gh run list --repo eaglhuang/AI-Atomic-Framework --workflow ci.yml --limit 100 --json databaseId,status,conclusion,createdAt,updatedAt`

補充：最近一次 lint 失敗的根因是 `external-benchmark-v2-contract.test.ts` 的重複
`protocol-v2.ts` import；該檔案已有合併 import 的修復提交。修復後可見的 4 次
`ci.yml` run（兩次在 `ba0b6335`、兩次在 `e46dfa74`）均為 success，這是修復後
的短期綠色訊號，不是 30 天／90 次 burn-in 證明。

公開 npm 的 `next` tag（`@ai-atomic-framework/cli@0.1.0-beta.5`）也已做一次
完整 clean-install 檢查：安裝與 version/doctor/bootstrap 可執行，但
`atm-chart render/verify` 仍回 `ATM_CHART_SCHEMA_SOURCE_MISSING`，因此不能用
beta tag 覆蓋 latest 的產品交付缺口。該次 receipt 已放在外部 sink：
`C:/Users/User/atm-benchmark-sink/npm-beta5-proof.json`。


| 原始問題 | 既有卡 | 本計畫的處理 |
|---|---|---|
| 安裝/發布/外部核心工作流 | 0053、0054；0052/0073的修復證據 | 先核對實際套件與source，復用已修部分；發布後也跑固定版本工作流 |
| 長期綠色CI | 0059、0066；0055/0094證據 | 依job provenance重新確認有效窗口，保留首敗/重試/修復成本 |
| 完整依賴體積與review | 0068、0069、0072 | 為0097提供基線與review，不以狀態或摘要代替資料 |
| runtime evidence | 0070、0092、0093 | 0098只做未完成的冗餘刪減；历史改寫另列一次性可回復操作 |
| 人工/Token/false block/missed conflict | 0071；0040 | 固定算費口徑後pilot，不把缺值填0 |
| held-out/external replication | 0041、0042 | pilot後凍結方案，獨立custodian/evaluator，外部重跑 |
| 原產品結論 | 0044 | 0100提供本輪收斂證據，0044保留整體判定職責，不建立第二套真相 |

開發前對相關既有卡做source/測試/產物核對。已交付則引用，不重跑生命周期；缺項只執行剩餘範圍。未import的外部卡仍是規劃，不宣稱正在執行。

## 量測與不可降低的品質底線

- 包裝：baseline/candidate固定commit、版本、tarball SHA、lock及Node；記錄compressed、actual unpacked含manifest、files、完整production依賴bytes。0097目標unpacked至少減20%，其餘不增，原有更嚴格cap保留。下載/快取不能藏成本。
- 延遲：Windows/Linux各至少30組配對量測；warm/cold清楚定義，median/p95、樣本與失敗全保留；p95回歸超過10%需停止或提出具體取捨。
- 使用負擔：推薦入口≤5與總API數分開算；固定開箱/普通修改/快修各一次baseline再跑candidate，記錄必要命令、人工決策、恢復次數、分鐘和tokens。
- 正確性：在repo外乾淨安裝；help/version之外跑init、next/tasks、doctor/guide及真正修改→驗證→交付。故意缺模組、缺schema、錯版本、失敗validator必須被抓到。
- CI：受保護主線至少30天且90個有效run；同一job build/test/package/clean-install。按事前口徑計首敗與重跑，不能刪紅燈、跳測或把樣本CI算產品CI。長期觀察期間的功能可先交付，但不宣稱burn-in達成。
- 偏移：false block分母是oracle確認可安全執行機會；missed conflict分母是oracle確認衝突機會；報各類case及分母。正確性由獨立oracle裁定，不由執行AI自己標答案。
- 成本：人類分鐘、每agent輸入/輸出/快取tokens、模型/單價日期、API USD、ATM控制面與恢復成本、wall time、重工。未知=null並說明原因。
- 效益：先註冊最小有意義收益（建議總成本下降20%），並同時要求正確率及missed conflict不劣於baseline；門檻与統計方法須在held-out執行前凍結。pilot只估可行性，不能外推正式勝出。

## 獨立驗證與環境

worktree隔離檔案，不隔離憑證/程序/網路，也不保證reviewer獨立。WSL原生Node改善可攜性，不等於第二台獨立外部環境。沿用0040的Docker/VM/OS-account選擇及封存輸入；Windows git interop、shim、原生Linux分開標記。需要付費key時只讀是否存在，不輸出秘密，不自行提高預算；沿用已有Owner核准範圍。

## Git歷史處理

立即規則是新runtime raw evidence不進Git/npm，Git保留必要摘要引用。已入歷史資料先分類、備份、驗證外置完整性與舊引用解析，再列精確重寫refs、協作者遷移方式、大小收益與回復步驟；不可因本計畫開卡就直接force-push。若目前收益低，明確報「歷史尚未移除」，不將新提交乾淨等同歷史清乾淨。

## 排程、角色與成本控制

第1階段：本輪完成文件/開卡及0095實作驗證。第2階段：0096/0097基線與刪減，0098/0099可在不共享寫入時推進。第3階段：候選包全流程、既有CI與外部pilot；第4階段：滿足觀察期及獨立replication後0100/0044判定。這是依賴順序，非未估工期的日期承諾。

目前Codex負責首項實作與本地驗證；外部Claude/Gemini僅在review或獨立驗證需要時另給精簡派工，尚未實際派出。每項最多兩種實測方案；未達即記錄反證與stop，不為湊數再造機制。每次交接只提供卡路徑、當前證據與下一步，不複製整份治理規格。

## 完成與回退

卡片完成須有真實diff、對應驗收及命令證據；0100與0044分清code-complete、candidate-verified、published-verified、CI-observed、externally-proven。每次退役保留相容/遷移说明及可revert提交；不要回退其他人的WIP。

最終交付為較少的維護邏輯、較少操作決策、較小完整套件、穩定核心流程及可重跑的淨收益證據。未達任何必要門檻，結論是未證明或no-go，保留失敗資料。

## 毫秒量測覆蓋 follow-up（TASK-PRF-0102）

0101 已提供單一延遲評分器與既有 telemetry report 的投影，但目前實測只覆蓋 2/8 個註冊路徑。0102 的目的不是增加新的治理流程，而是把既有必經命令／gate 的開始、結束、結果與重試資訊接到同一條事件鏈，讓 unknown 能逐步變成可驗證的毫秒數。

- 先覆蓋 `doctor.readiness`、`guard.framework-mode`、`tasks.claim-admission`、`taskflow.close-readiness`、`batch.checkpoint-readiness`、`broker.shared-surface-admission`；不得新增第二個 registry、常駐 daemon 或每次全歷史掃描。
- 事件只記錄 command、gate、task/run correlation、monotonic duration、outcome、failure/timeout/retry/recovery counters 與版本摘要；預設不收集 prompt、原始路徑內容或秘密。
- 以固定 workload 先建立 30 組 baseline，報告覆蓋率、p50/p95、累積必經等待與量測 overhead；任何未實測路徑維持 unknown，不能以 0 代替。
- 0102 完成後才允許 0100 將「固定任務必經等待降低 ≥20%」作為候選成效判定；先修 p50/p95 ≥1,000 ms 的秒級熱點，p95 回歸 >10% 即停止並回報。
- 回退方式為單一 revert commit，保留 0101 的純函式評分器與既有 report 介面。

## 秒級熱點快修 follow-up（TASK-PRF-0103）

0102 的 CPU profile 顯示 `doctor` 每次都為所有已安裝 integration adapter 執行完整 source-parity dry-run，造成不必要的編譯、檔案讀取與雜湊成本。0103 將 doctor 的控制面檢查收斂為已安裝 manifest／檔案完整性快速路徑，並把完整 source parity 留在使用者明確呼叫的 `integration verify`／`integration parity`。

## 30-run 毫秒驗證 follow-up（TASK-PRF-0104）

0103 的單次 A/B 已顯示 doctor source-first wall time 約由 16,984 ms 降至 5,394 ms，
但單次結果不能當成產品證明。0104 只使用既有 command/gate telemetry 與 latency
report，對固定任務做 AB/BA、A/A noise control，各條件至少 30 個有效樣本，保留
FAIL、BLOCKED、timeout 與 retry。報告以 frequency-weighted cumulative wait、p50、p95
及 coverage 排名，unknown 不補零；固定任務必經等待 p50 降低 ≥20%、p95 不得回歸 >10%，
否則標記 inconclusive/FAIL。這張卡不新增 daemon、資料庫、指令或治理 checkpoint，
也不把 frozen runner-sync 阻塞藏掉。

- 快速路徑必須在輸出中標示 `sourceParity: deferred`，不能把 deferred 當成 parity 通過；完整 parity 命令的結果與錯誤分類維持不變。
- 以相同工作區、Node、cache 與 runner 做前後配對，至少 30 組 doctor 樣本；目標 p50 降低 ≥30%，p95 不得回歸 >10%，並保留每個檢查結果與失敗碼。
- 若快速路徑不能證明 manifest 檔案完整性，仍須 fail-closed；不得移除 integration drift 的明確修復指引。
- 只改既有 health adapter seam 與測試，不新增命令、registry、daemon 或第二套狀態來源；回退為單一 revert commit。

## 累積熱點快修 follow-up（TASK-PRF-0105）

0104 的 30-run 量測已把「每次都會付出的控制面成本」改成可排序的毫秒資料。現有觀測中，
`next.route-resolution` 的 frequency-weighted cumulative mandatory wait 約 380,415 ms，
高於其他已量測路徑；因此下一步只處理 route resolution 的重複掃描／程序啟動成本，不擴張治理範圍。

- 先在相同 workload 以既有 telemetry 與外部單調時鐘拆出 route-resolution 的子步驟，確認最大成本是否來自 queue/task ledger 掃描、`spawnSync` 或重複路徑解析；沒有證據的部分維持 unknown。
- 只選一個最高成本、可回滾的 seam 做快修；保留多 AI 並行能力，讀取與各 agent 私有 evidence 不排隊，共享寫入仍使用既有 broker，不新增 gate、registry、daemon 或全歷史索引。
- 驗收必須同時看 p50、p95、每任務累積 ms、錯誤／重試語義與 CPU/記憶體開銷；候選至少讓 route-resolution p50 降低 20%，p95 不回歸超過 10%，否則記錄反證並停止擴大。
- 以同 runner、同 Node、同 cache 做 AB/BA 與 A/A；結果寫入外部 sink，Git 只保留摘要、腳本與 digest。回退為單一 revert commit。

首次外部同 runner 15 對 AB/BA 實測得到 baseline p50 129.982ms、candidate p50 111.276ms，下降 14.391%；candidate p95 126.644ms，改善 10.876%，A/A 噪聲控制 p50 108.349ms。這是方向正確且可回滾的實際減負，但未達 20% p50 正式門檻，因此標記為 inconclusive，不再為追門檻擴大程式或治理複雜度；receipt 與重跑 harness 留在外部 sink。

## Governance-readiness Git spawn follow-up（TASK-PRF-0106）

0105 的 profiling 顯示 `build-governance-readiness` 約 500–550ms，主要成本來自 `readDirtyWorktreeFiles` 同步啟動兩次 Git process。0106 只把這兩次讀取合併為一次 `git status --porcelain=v1 -z` 並保留 staged、tracked-dirty、untracked 與路徑正規化語義；不改 broker、claim、lock、close 或多 AI 並行規則。

驗收以同 runner、同 Node、同 dirty/staged fixture 做 AB/BA 與 A/A，記錄該 gate 的 p50、p95、累積 ms 與分類結果；若 p50 未下降至少 20% 或 dirty/staged 分類任一改變，停止並回退單一提交。不得新增 command、registry、daemon、database 或第二狀態源。

初次外部 15 對 AB/BA 結果：兩次 Git process baseline p50 264.362ms、p95 308.032ms；單次 status process candidate p50 120.583ms、p95 167.245ms；p50 下降 54.387%、p95 改善 45.705%，A/A p50 117.800ms。舊新 93-path digest 相同，故此切口達到 provisional gate；仍須在正式 release runner 與完整 command-level matrix 中重驗，不能把 substep 成效直接外推為整體 ATM 成效。

## npm 安裝完整性與毫秒評分接續（TASK-PRF-0107）

0104–0106 已把「必經 gate 的等待毫秒」變成可排序的證據，但公開 npm 0.1.0 的乾淨安裝仍在 `atm-chart render/verify` 失敗：套件 manifest 宣稱有 schema 的邏輯資產，實際 tarball 卻沒有可供 chart lifecycle 讀取的 source。這是產品交付缺口，不是再增加治理流程的理由；必須用最小的既有 runtime seam 修正，並把修正後的 clean-install wall ms 一起量測。

- 先以 clean install 重現 `ATM_CHART_SCHEMA_SOURCE_MISSING`，確認 registry tarball、候選 tarball、source-first runner 三者的差異；不得把 `--version` 通過當作功能通過。
- 以現有 `resolveATMChartSchemaSource` 與 `embeddedATMChartSchemaAssets` 為唯一 seam：優先讓 chart render/verify 在套件內使用已封存的 schema digest/最小必要資料；若必須攜帶檔案，先量測 bytes/entries 並證明不破壞既有 artifact budget。不得複製整個 `schemas/`，不得新增第二份 registry。
- 以 TDD 補一個「無 repo 根目錄、只有 npm runtime」的 render→verify case，再跑既有 public-install validator 的完整命令矩陣與故意缺 schema 負測。保留 missing/invalid schema 的 fail-closed 語義。
- 成效評分同時記錄 clean-install command/gate wall ms（p50/p95、失敗率、重試）與 unpacked bytes/entries；安裝正確性是硬門檻，毫秒改善不能抵銷功能失敗。若套件仍缺功能或超出預算，停止 publish，保留外部 receipt 與反證。
- 量測最少 30 組交錯 AB/BA 與 8 組 A/A；固定 Node/npm、registry version、cache 定義與 tarball digest。raw samples 放既有外部 sink，Git 只留摘要及 digest。回退為單一 revert commit，不重寫既有 0104–0106 provenance。

2026-09-15 對目前工作區 dist 產生的候選 tarball（2,654,799 unpacked bytes、66
entries）已在 Windows 與 WSL 原生 Linux Node 各自的全新 consumer 重跑：
`version`、`bootstrap`、`atm-chart render`、`atm-chart verify` 均以 exit 0
完成，未出現 module resolution failure。這只是 candidate-only 可攜性證據；
尚未改變公開 registry 的 0.1.0，也不涵蓋完整 62-command acceptance。

## Standard-validator build duplication follow-up (TASK-PRF-0108)

標準 profile 的最新 telemetry 顯示 `validate-bootstrap` 為 146,542 ms 熱點。
唯讀 source trace 發現 `buildOnefileRelease()` 先直接呼叫
`build-package-dist.ts`，再呼叫 `buildRootDropRelease()`；後者的安全預設又
無條件呼叫同一建置。0108 只會讓 onefile 將「已完成 package-dist 建置」明確
傳給 root-drop，保留 root-drop 被其他 caller 直接呼叫時的 freshness build。

這是重複工作刪除，不是移除驗證：驗收仍需比較 root-drop/onefile manifest、
launcher 行為與 bootstrap 語義，並以 AB/BA、A/A 的毫秒收據確認實際收益。若
digest 或任何語義改變，或 p50 未下降 20%／p95 回歸超過 10%，即回退單一提交，
不再擴張成新的建置快取或治理服務。

## Parallel-preserving command boundary follow-up (TASK-PRF-0110)

平行 adopter 實驗證明，不能靠刪除命令解決 bundle 衝突：最小四命令 profile
雖達 24.822% 解壓縮縮減，卻失去 `tasks`、`broker`、`taskflow`；保留多 AI
協作命令的 profile 只有 15.274%。目前 public CLI 又靜態載入完整命令圖，
最新 1,449 個事件中，必經 `next.route-resolution` 累積等待 1,679,895 ms。
0110 因此只負責一個 cohesive command-boundary refactor，不新增治理層。

- 定義單一 `PublicCommandBoundary` 介面，提供 capability discovery、命令解析
  與 lazy runner loading；保留既有命令名稱、錯誤語義、tasks/broker/taskflow
  行為與 opt-in telemetry。
- 提供兩個 production adapter（in-process/frozen runner、installed npm
  runtime）及一個 fixture adapter。不得新增第二 task store、daemon、網路下載
  或隱藏 runtime dependency。
- 每個命令及必經 gate 以毫秒量測，按「頻率 × p50/p95 × 必經性」排序；先處理
  `next.route-resolution`，再處理 `doctor.readiness`。候選必須讓必經等待 p50
  下降至少 20%，且 p95 不回歸超過 10%。
- 重建 clean npm tarball，驗證解壓大小、entries、依賴占用、安裝時間與完整
  命令矩陣；`tasks`、`broker`、`taskflow` 必須通過有效任務端到端測試，只有
  invalid-argument 探測不算證據。
- 保留 AB/BA、A/A timing receipt、失敗、重試、false-block 與 missed-conflict
  計數，raw evidence 放外部 sink。若靠刪除並行行為或未量測下載達標，立即拒絕；
  任一 public 或 parallel contract 改變即以單一 commit 回退。

## 全量 command/gate telemetry follow-up（TASK-PRF-0111）

目前 `commandGateCheckIds` 只對 8 個 canonical gate 產生 runtime event，然而
同版 frozen runner 的 help inventory 有 62 個 top-level commands；因此 0101
雖已在 live ledger 標為 done，仍不足以證明「每個 ATM 指令／gate 的耗時」。
0111 是對 0101 的產品證明補強，不改寫 0101 的歷史 provenance，也不新增第二套
telemetry store。

- 以現有 `listCommandSpecs()`／help 作 inventory authority；中央 dispatch wrapper
  對每個實際執行的 command 記錄外部 wall `durationMs`、runner/version、workload、
  run/task correlation 與 outcome。
- 依 workflow applicability 區分 canonical 與 local mandatory gate；固定任務等待
  以 span 聯集計算，不重複計父子或重疊 worker；失敗、timeout、取消與 retry 保留。
- 沿用 `telemetry --report --include-runtime` 與既有 latency report，秒級（p50/p95
  ≥5,000 ms）先診斷，再按 frequency-weighted cumulative wait 排序；不新增 daemon、
  database、remote collector、第二 registry 或 GUI。
- 0100 go/no-go 前 command inventory 與 mandatory-gate coverage 必須有真實樣本；
  unknown、fixture、`duration=0` 皆為 no-go。必經等待 p50 目標至少下降 20%，選定
  秒級熱點至少下降 30%，p95 回歸超過 10% 或 telemetry overhead ≥1% 即停止／回退。

### 目前可觀測基線（2026-09-15，僅 8 個已映射節點）

`telemetry --report --include-runtime` 目前讀到 2,054 個事件；這是
`sealed-history+runtime` 的觀測摘要，不是 62 個 top-level command 的全量證明。
在完成 0111 前，以下數字只用來決定優化順序，不能用來宣稱 ATM 整體已改善：

| 節點 | samples | p50 ms | p95 ms | 累積等待 ms | 優先級判讀 |
|---|---:|---:|---:|---:|---|
| `taskflow.close-readiness` | 75 | 19,871 | 50,605.2 | 1,634,005 | 首要秒級熱點；先查重複掃描與可安全快取的讀取 |
| `next.route-resolution`（mandatory） | 1,345 | 408 | 7,419 | 2,603,313 | 高頻累積成本；在 taskflow 後處理 |
| `doctor.readiness` | 73 | 3,655 | 12,310.4 | 396,988 | 第二層秒級熱點 |
| `tasks.claim-admission` | 221 | 2,153 | 3,325 | 439,917 | 中頻 admission 成本 |
| `batch.checkpoint-readiness` | 40 | 349.5 | 15,414.85 | 199,642 | p95 尾端異常，先補原因分類 |

目前 `measurementOverheadMs` 仍為 unknown，且只有 8/62 節點有真實事件；因此
任何優化 PR 都必須同時補上 overhead 與全量 coverage，並以相同 workload 做
AB/BA。優先順序固定為「先處理單次 ≥5 秒的 gate，再處理頻率加權累積成本」，
不以增加新服務或新治理資料源換取數字下降。

跨平台環境補充：WSL Ubuntu 已實測有原生 Linux Node v24.12.0 與 npm 11.6.2，
所以「WSL 缺 Linux Node」不再是目前 blocker。剩餘問題是本 repo 的
`.git/config` 將 `core.worktree` 固定為 `C:/Users/User/AI-Atomic-Framework`；
WSL 原生 Git 直接進入 repo 會失敗，但以明確的
`git --git-dir=/mnt/c/Users/User/AI-Atomic-Framework/.git --work-tree=/mnt/c/Users/User/AI-Atomic-Framework …`
可成功讀取。此 workaround 只供 cross-platform 測試標記使用，不修改既有 Git
設定，也不把 interop 結果混入 WSL 原生能力分數。

唯讀 source trace 顯示，`buildHistoricalClosePreflight` 會串行組合多個既有
檢查：target/planning 的 dirty 與 staged 探測、index ownership、歷史交付
檢查、planning mirror 檢查，以及 `computeMissingValidatorReport`。本機目前
單次 `git status --porcelain -uall` 約 111–213 ms、`git diff --name-only`
約 163–166 ms、`git diff --cached --name-only` 約 34–42 ms；因此不能把
19.9 秒的 gate p50 直接歸因於某一個 Git 子程序。這只是待驗證假設，下一步
必須先為上述每個子步驟記錄 internal span，再用相同 dirty/staged fixture 做
AB/BA；只有確認某個 span 佔據主要 wall time，才允許做單一快取、合併探測或
延後非必要檢查的改動。若分段後找不到可重現的主要熱點，保留現狀，不新增
抽象層或快取狀態。

0111 已由 plan CLI 建立並成功 import；目前實作仍須等待既有 batch queue head
`TASK-PRF-0100` 的治理路由釋放，不能以後續卡的 prompt 越過 queue。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-09-14T15:08:44.119Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/atm-convergence-plan.md","contentDigest":"sha256:fd2cae90ff25f44aed995c5bb00183c8e939cfb85b98568aee7207aa0f8f5b43"} -->
