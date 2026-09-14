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
- 公開 facade 原始表列 21 個 commands，名稱與 runner 重複維護；目前第一項開發驗證 inherited property 的行為，尚未宣稱修好。
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

同一時間的 gate telemetry coverage report 顯示 9 個家族中 5 個 `instrumented`、1 個 `not-yet-covered`、3 個 `read-only-summary`；`m2Comparable=false`。缺口包括 validator queue/execution/cache/fan-out、evidence seal/readback/handoff、git governance/hooks/branch queue 及 runner-sync/release/projection 的真實 producer 或必要 correlation。這個快照只證明目前 coverage 不足，不能用來補造 duration=0。

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

所有新卡由 plan CLI 分配。跨卡共享 atm-public.ts：0095先交付，0096/0097後續依實際source版本協调，不同時覆蓋彼此變更。六張卡是本轮新增範圍全部，下面是併入本計畫的既有工作，不能重複開發。

## 既有任務對照與接續

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

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-09-14T15:08:44.119Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/atm-convergence-plan.md","contentDigest":"sha256:61b1ba3a1bbcbb5daacce3f747356e2a1c465b0197ac19b4a685e27caa0f6d8c"} -->
