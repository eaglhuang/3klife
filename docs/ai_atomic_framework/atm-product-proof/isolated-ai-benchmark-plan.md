---
doc_id: pending
title: ATM 隔離 AI 實驗與外部重現執行計畫
status: active
family_dir: atm-product-proof
createdByCommand: atm plan doc create
---

# ATM 隔離 AI 實驗與外部重現執行計畫

## 目標與完成定義

ATM 必須以公開可安裝的小套件、長期綠色 CI，以及外部可重跑的 A/B 數據證明其價值。
本計畫延伸母計畫，不把內部 pilot、工具測試成功或任務卡完成視為產品勝出。
完成條件是三條證據鏈同時成立：公開套件完成實際 adopter 操作；CI 滿足至少
30 個連續日且至少 90 次有效 protected-main 觀測（取較晚者）；正式 A/B 與獨立
重現具備完整原始資料，可評估安全、完成率與人工加 Token 成本。
負面結果同樣是有效交付，最終可為 keep、narrow、stop 或 inconclusive。

## 權威、範圍與現況

- planning_repo_root: C:/Users/User/3KLife
- planning_repo_is_external_to_target: true
- target_repo_root: C:/Users/User/AI-Atomic-Framework
- closure authority: target_repo；本輪只完成 planning-only 文件與卡片。
- source_plan_path: docs/ai_atomic_framework/atm-product-proof/atm-product-proof-plan.md
- source_task_card_path: docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0034 至 TASK-PRF-0044
- target_import_method: node atm.mjs tasks import --from <完整卡片路徑> --dry-run --json，實作接手時再 --write。

已知公開候選為 @ai-atomic-framework/cli@0.1.0-beta.5，歷史 clean-install 記錄為
3,357,365 unpacked bytes、78 files；執行前重新讀 registry 並綁 tarball digest。
修復後 CI 成功不代表 timeout 分支已驗證，也不代表長期門檻已滿足。
既有 benchmark v1 尚未執行；其簽章檢查不構成組織獨立性證明。
原始觀察：adjudication.ts 分母為全部 run；report.ts 只用 billedCost 與安全點估計，
尚未完整實現人工總成本、完成率及信賴區間。必須先修正再形成產品結論。

## 第一性原理與性價比

優先投資能降低下一步決策不確定性的工作。先確立測量契約，再隔離與取數，然後跑
小規模 pilot 檢查資料鏈；正式樣本量依預先指定的統計方法與 pilot 變異估計決定。
不以增加治理抽象、簽章數或多模型數代替可信度。pilot 用於儀器校準，不能併入正式
效果估計；正式資料產生後不得調低成功門檻或刪除不利試驗。

| 波次 | 任務 | 產出與出口 | 可並行條件 |
| --- | --- | --- | --- |
| 0 | 0034 契約與版本化 | v2 schema、證據等級、威脅模型、v1 保存 | 第一個實作入口 |
| 1 | 0035 測量；0036 隔離；0037 telemetry；0038 oracle | 各自正反控制通過 | 依 0034 公共契約、各自模組所有權 |
| 2 | 0039 雙組執行器 | 同 provider 的配對 AB/BA 真實執行與保留失敗 | 依 0035–0038 |
| 3 | 0040 pilot | 2 repo × 6 類情境 × 2 次配對 = 24 pairs/48 arm runs 上限 | 預算及工具 readiness 合格 |
| 4 | 0041 正式試驗 | 新 holdout、預註冊樣本量、獨立性揭露與全量結果 | pilot 完成且方法重新封存 |
| 5 | 0042 外部重現 | 外包操作者從公開包重跑、交回全部輸出 | 實際外部操作者及資料存取到位 |
| 持續 | 0043 CI/套件證據 | 不可覆寫 checkpoint 與完整觀測窗 | 與 benchmark 工程並行 |
| 最終 | 0044 綜合決策 | 原始七問題對照、產品決策、舊卡義務對帳 | 0041–0043 證據可核驗 |

這是排程依賴，不是承諾完成日期。首次 pilot 估算後才給正式實驗工期與費用。

## 隔離與角色設計

實驗宿主採獨立 clone 加受限容器或 VM。外部專案固定 commit，每次 run 建立乾淨
worktree；不可掛載 ATM 開發工作區、使用者 home、其他 run、共享聊天記憶或 oracle。
ATM 組從公開 registry 安裝固定 tarball，baseline 不載入 ATM 指令、hook 或技能。
baseline 保留正常 Git/CI 能力；ATM 組保留公開文件教導的完整 workflow，不特別調優。
只共享受控唯讀下載快取；記錄冷／暖快取、OS image、Node、lockfile、工具及提示 digest。
環境不可用時回報 readiness，禁止把同帳號不同資料夾說成強隔離。

獨立性分四級：內部交叉檢查、隔離內部實測、外部操作者重現、外部保管題庫與裁決。
不同 signer ID 或 key 不自動升級。每次執行記錄操作者、控制者、可讀目錄、上下文來源、
模型/provider/reasoning、工具權限及可能洩漏。subagent 使用空白對話；共用檔案系統的
subagent 只能擔任低等級角色，除非沙箱拒絕讀取的負控制實際通過。

Captain 持有公開契約和進度，不讀正式 hidden labels。Custodian 持有題庫與 oracle；
baseline/ATM operators 只看公開任務；adjudicator 依凍結 rubric 評分；telemetry collector
保存 provider 原始輸出。優先用可執行 oracle 判斷，AI 評分保留理由、信心與爭議。
程式碼可能透露 arm，故揭露盲評限制並禁止宣稱完全雙盲。

## 實驗公平性與統計

每個 provider/model/reasoning 都跑兩個 arm，同 prompt、repo SHA、預算和工具能力。
AB/BA 使用全新 session，不能傳遞前組解法；固定種子產生順序並封存，保留順序效應。
六類情境為 positive-conflict、benign-concurrency、semantic-conflict、stale-base、
recovery、negative-control。測試重點是工作成果與整合，不是 ATM 自己的 gate 是否通過。
baseline 缺少 admission API 時，以實際接受／阻擋的操作及 oracle 統一定義，不把欄位缺失記為零。

false block = 被阻擋的 oracle 良性操作 / 全部 oracle 良性操作；missed conflict =
被允許的 oracle 衝突操作 / 全部 oracle 衝突操作。零分母回 unavailable；未知 label 保持未知。
以任務／pair 作群聚單位，避免把同一 run 內操作當獨立樣本。輸出分母、缺失率、完成率、
差值與 95% 區間；樣本不足不能靠點估計通過安全非劣性。
0035 產出可設定 policy；0041 在正式試驗前封存非劣性 margin、power/sample-size 規則、
最低完成率及經濟門檻。預設經濟目標為總成本降低至少 20%，門檻與不確定性判定一併封存。
任何方法改動產生新版本；v1 結果若存在維持原樣，另列新舊差異。

## 成本與預算

逐 run 保存 provider request ID、原始 usage、Token 分類、帳務來源、實際時間、重試、
人工介入起訖與整合修復。API usage 可證 Token；帳務可證實付；Token×價目只可標估算。
總成本 = API 實付 + 人工分鐘×事前封存時薪 + 分攤運算費；首次導入、重複執行、研究出題
及裁判開銷分開列出，提供時薪敏感度。缺失不可補零，訂閱費不可冒充逐 run API 費。
pilot 上限 48 arm runs；正式用量由 pilot 推估。啟動前必須有明確金額／Token／時間上限、
可用 provider credentials 及所屬帳戶；未設定的付費上限視為未就緒，不能無限制呼叫。
保留被中止與超額試驗，依預註冊 stopping rule 處理，不因 ATM 表現差而換題重跑。

## 三個深模組與所有權

沿用 Comparative Evaluation：runArm 接受封存 runSpec，產出 raw event refs；adjudicate
接受輸出與 oracle ref，產出 operation labels；aggregate 接受驗證後 pairs 與 policy，
產出 metrics 與 decision。隔離、provider、簽章與統計實作可替換，不擴增第二個治理台帳。
0034 是 schema 公共面唯一寫入者；0035 擁有 measurement/report；0036 isolation；0037
telemetry；0038 oracle；0039 orchestration。修改公共 schema 必須先回到契約所有者。
採 expand-contract 與 tdd-oracle-fidelity 方法；各卡負責具體反例，避免只測字串存在。

## 證據保存、CI 與套件

大型 raw events、provider export、hidden corpus 存於 Git 外的可校驗儲存；Git 只保留
小型公開方法、摘要與 digest/ref。須實測從乾淨 reader 取得證據與 restore，隱藏資料在
封存前不公開。正式結束後提供可合法公開的重現資料及無法公開的明確原因。
CI 採既有 evaluator，至少 30 天且 90 runs；不得短時間補跑來替代日曆窗。區分
Product CI job 與整體 workflow、首次 attempt 與重跑，保留 timeout/cancel/失敗分類。
套件不只測 --version，須在乾淨 consumer 執行 help、init 及一個實際公開 workflow。
0043 同時核對 root-drop 與 npm 預算、runtime evidence Git 邊界；歷史重寫另行審核。

## 任務索引與規劃驗證

以下 11 張 source cards 已由 ATM planning CLI 建立，均為 planned；已逐張通過
tasks import --dry-run。33 條驗收有對應 case ID，依賴圖無循環。此預檢證明卡片可解析，
不證明尚未實作的 validator 或實驗已通過。本次未 write-import 到 target，也未 claim。

| 卡片 | 範圍 | 直接依賴 |
| --- | --- | --- |
| [0034](tasks/TASK-PRF-0034-define-versioned-benchmark-evidence-and-independence-contract.task.md) | v2 契約與獨立性 | 無 |
| [0035](tasks/TASK-PRF-0035-repair-operation-denominators-and-total-cost-decision.task.md) | 分母、總成本與決策 | 0034 |
| [0036](tasks/TASK-PRF-0036-build-isolated-benchmark-environment-and-leakage-controls.task.md) | 隔離與洩漏負控制 | 0034 |
| [0037](tasks/TASK-PRF-0037-capture-attributable-provider-and-human-cost-telemetry.task.md) | provider／人工成本 | 0034 |
| [0038](tasks/TASK-PRF-0038-implement-sealed-corpus-and-blinded-adjudication.task.md) | 題庫與裁決 | 0034 |
| [0039](tasks/TASK-PRF-0039-execute-paired-atm-and-git-baseline-arms.task.md) | 雙組配對執行器 | 0035–0038 |
| [0040](tasks/TASK-PRF-0040-run-bounded-isolated-ai-benchmark-pilot.task.md) | 隔離 pilot | 0039 |
| [0041](tasks/TASK-PRF-0041-preregister-and-execute-held-out-formal-benchmark.task.md) | 預註冊正式試驗 | 0040 |
| [0042](tasks/TASK-PRF-0042-deliver-independent-external-benchmark-replication.task.md) | 外部重現 | 0041 |
| [0043](tasks/TASK-PRF-0043-verify-sustained-ci-and-clean-adopter-evidence.task.md) | 長期 CI 與 adopter 證據 | 無 |
| [0044](tasks/TASK-PRF-0044-issue-integrated-atm-product-proof-decision.task.md) | 綜合產品決策 | 0041–0043 |

第一個實作接手入口為 0034；0043 可獨立推進。接手者讀卡後透過 target ATM
write-import 與 next --prompt 取得正式 authority/playbook，不能因本表標 planned 就直接修改程式。

## 舊卡、啟動順序與停止條件

0008/0019 作歷史關聯，不把 blocked 狀態設為新工程卡的依賴；0041/0042 承接其實驗
交付，0044 做義務對帳。0020 的 runner 修復若無具體依賴，不拖入 benchmark 卡。
先接 0034，完成後展開 0035–0038；0039、0040、0041、0042 逐 gate 前進；0043 並行。
卡片 owner 是角色規劃，不代表 AI 已上線；實際派工須記錄精確 model/reasoning 與 actor。
本輪不產生 API 費、不開外部 PR、不推送、不建立付費 VM，不冒稱外包工作已開始。

隔離負控制失敗、版本不符、缺失成本、題庫洩漏、超預算或簽署來源不可信時停止該 run，
保存原因和產物。pilot 不等外部簽署；外部重現 gate 才要求外部操作者，避免循環前置。
adjudication 與 telemetry 的最終簽章發生在 runs 固定之後，不能要求試驗前提供事後資料。
回滾使用單卡可逆 commit；實驗 cleanup 只依 owner/digest receipt 作用於其暫存環境。
最終 keep 必須同時滿足安全、完成率、經濟及證據等級；未滿足則 narrow/stop/inconclusive，
並指名可移除的最小 ATM 能力及後續可檢驗假說。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-09-13T00:17:33.728Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/isolated-ai-benchmark-plan.md","contentDigest":"sha256:69f1a6ad917b0b3b501583de828a4b63a33c6cb458680d2c8a2665b81af84424"} -->
