---
doc_id: pending
title: ATM 收斂、可靠交付與減負實施方案及 WBS
status: active
family_dir: atm-product-proof
createdByCommand: atm plan doc create
---

# ATM 收斂、可靠交付與減負實施方案及 WBS

## 1. 目標、權限與完成定義

Owner 已核准本方案實施，以及指定 `release:patch` 修復 PR 的自動 patch 發布政策。ATM 應用最少協作成本交付可靠的多 AI 成果；保留衝突防護、偏移辨識、測試和必要來源足跡，不把治理程序本身當成產品價值。

第一性原理：每項機制必須指出要防止的具體損害，比較 Git、CI 或更簡單替代方式，並證明節省損失大於執行、誤擋、維護與人工恢復成本。

- 規劃權威：`C:/Users/User/3KLife/docs/ai_atomic_framework/atm-product-proof`。既有 dirty 計畫及其他人的 WIP 不覆寫。
- 程式與驗收權威：ATM repo 的精確提交、GitHub main/必要 CI、公開 npm；本機來源不同時必須明示，不混算。
- WBS 是本計畫分解，不是第二套任務帳本。優先對應既有 PRF/TMP 卡，缺卡才用 plan CLI 建立和匯入。
- 狀態：待處理 → 實作完成 → 本機驗證 → 遠端整合 → 公開驗收。程式修正以 main 整合且必要 CI 綠燈完成；npm 修正以公開指定版本乾淨首次使用通過完成。
- 不自動刪他人 WIP、不放寬安全 gate、不改封存實驗規則、不把自跑 A/B 當獨立證明。

## 2. 操作順序與實作契約

### A. 既有成果收編

先 fetch 遠端，再盤點主工作樹、全部登記 worktree、未推送提交、0127 lock/WIP 與既有 patch。歷史 38/64/193 只當線索。每組記來源 SHA/位置、範圍、測試、目的及整合/保留/拒絕決定。CI 隔離修正優先，其次 telemetry；只取必要 source/test，不整批挑入分岔 main。

交付使用一條遠端 main 衍生的短命 PR 分支；同一問題一條正式寫入線，不另建同問題候選 clone。不同問題可並行，真正共享寫入維持必要協調。

交付通道與開發隔離分開：本次 Owner 已核准方案及 PR 整合操作，但不把聊天授權默認成全體 agent 的永久憲章修訂。0.1 須透過既有 waiver/裁決機制留下「唯一整合者的短命交付 PR」邊界、責任、失效/回復條件與來源；不推廣每 agent 一個開發分支。既有已合併成果不倒退重做。

共用主工作樹復原分兩段：先盤點並驗證備份，後才切換。備份涵蓋未整合 commit、index/working-tree 差異、未追蹤及必要 ignored 檔；普通 patch/stash 不足以默認完整。先掃 secret/私人資料，未確認不得推遠端封存 ref。Owner 未明確核准破壞性操作前不 reset、清空、覆蓋或釋放他人 lock。可先在現有可靠整合入口交付，不要求全部歷史 WIP 清帳才准發版。

### B. 薄交付入口

使用既有 GitHub 流程，不新增 public CLI 命令或交付引擎。入口推送指定非保護分支、尋找/建立同一 head/base PR、啟用 auto-merge；可重试、不建重複 PR、不 force-push、不直接推 main。失敗保留成果，回報精確步驟。

事前查詢 PR、分支及已知 patch；相同檔案只是提示，不是重複問題的證明。既有 branch protection、Product CI 與審查規則不降低。不使用全域 post-commit hook 發布任意提交。

同問題以 issue/task 關聯加上相同失敗行為、受影響版本及驗收為依據。錯誤碼僅是輔助：同一錯誤碼可代表不同缺陷，不可一律合併或阻擋。

平行交付前先處理共同產物邊界（4.5）：本版不立刻把產物全部移出 Git，也不加入合併後 bot 的遞迴 build 提交。先追查 frozen runner、dist/release、git-head evidence 的實際讀者與同步需求，提出單一 publication owner；來源 PR 在隔離 CI 建置/驗證，消費者取得同 SHA 的產物。只有 clean clone、doctor、hook、打包/公開安裝都能在新邊界成立時才移除追蹤產物；不以簡單 .gitignore 掩蓋依賴。

### C. 套件與指定 patch 發布

完整比較 pack entries，逐項說明新增檔案；測試、fixture、暫存及無關內容不得誤包。baseline/candidate 使用分離目錄，保存精確 commit/version/digest。候選與公開驗證共用首次使用流程，不建立兩套標準。

只有 `release:patch` 修復 PR 合併、精確 main SHA 必要 CI 成功、乾淨候選驗收成功才升 patch、建立唯一 tag、觸發既有 OIDC workflow。發布 concurrency 序列化；workspace closure、版本與 tag 一致；重試不重複升版。minor/major、純文件與治理紀錄不自動發布。

版本預設沿用 tag-driven CI，不新增合併後版本提交：現行 release-npm.yml 已先從 tag 在暫存 workspace 設定全部 closure 版本，再 build/pack/smoke/publish。自動化只選定一次 patch/tag 並指向驗證過的 main SHA；既有 tag 同 SHA 才可冪等跳過，不同 SHA 必須拒絕。來源 package.json 可保留開發版本；實際發布 tarball 版本必須與 tag 一致且先驗證，不可把舊版本 tarball 當發布候選。

標籤代表發布請求，不是單獨的授權憑證：預設由 Owner eaglhuang 發出，指定 bot 僅在明確 allowlist 後代為執行；workflow 必須驗證 requester，不假設 GitHub 原生能限制某一 label 只能某人加。此權限不授予任意 agent。

凍結旗標使用 repository variable `ATM_PATCH_RELEASE_FROZEN=true`，發布入口和 release workflow 都檢查；發布後驗收失敗設旗標並留下 run/version/SHA 原因。只有 Owner 批准解除，執行者使用最小必要 credential。不能宣稱 GitHub repo variable 自帶 Owner-only ACL；管理員/授權 token 的變更也要可稽核。

先 dry-run，再實際發布。公開指定版本須核對 registry/dist-tag 並跑同一首次使用。發布後失敗停止後續自動發布並通知，不自動 deprecate 或回退 dist-tag。功能修好不等於瘦身，禁止調高預算換通過。

### D. 減負與最小觀測

block 補既有欄位 errorCode/taskId/actorId/source，有 failure envelope 就引用；未知保留 unknown，歷史缺資料保持 inconclusive。不建新儀表板、夜間反事實平台或自動 gate 降級。

先刪不必要呼叫、重複 build、共用輸出副作用和重複狀態，再加速必要命令。CLI sweep 維持固定測試清單，不以 quarantine 或少跑測試製造改善。build 只清理自身暫存資源；既有 WIP/worktree 先驗證所有權、保存及復原，再處理。

### E. 三項產品證明

Proof 1：完整公開套件、首次使用、packed/unpacked/files、完整依賴占用、啟動量測。Proof 2：沿用既有封存規格的 30 天/90 次有效觀測；Product CI job/必要步驟與 workflow 結論分開，首次失敗、重跑、修復時間保留。Proof 3：固定版本/任务/模型/預算、配對 A/B，比較正確交付、false block、missed conflict、返工、人工分鐘、Token、費用、總耗時；獨立角色與 oracle 未到位就不宣稱完成。

## 3. WBS 與進度（2026-09-30 快照）

### 最新交付核對（優先於下表舊快照）

- 3.3：舊 dry-run 36731880033 跳過版本相容性 gate，不能作完整發布驗收。修正後 dry-run 36736621301 成功且執行該 gate；後續版本投影修正的 dry-run 36738325605 亦 SUCCESS，含 skew 驗證與乾淨套件驗收；dry-run 本身仍不構成公開發布證據。
- 3.5：正式 v0.1.3 run 36734900611 FAILURE；日誌確認 releaseTrain 與 root 版本不一致，後續完整驗證另發現 skew-matrix 的 package version 仍是 0.1.2。不得移動既有 tag 或宣稱公開修復完成；npm latest 核對仍是 0.1.2。
- 發布修復 PR #61 已通過 Product CI、ATM Dogfood、neutrality 與 sandbox，並 squash 合併為 main SHA `7b799a433e0120b0d1b8d4934ec5eb56dc2168d9`。相關修正讓 dry-run 也執行 release compatibility gate，並在發布前更新/驗證目前 workspace 的 skew 版本。
- main SHA `7b799a4` 的 push CI 正在執行（run `36741252511`）；tag `v0.1.4` 尚不存在，npm 公開版本仍為 0.1.2。main CI 通過後，才能用既有發布 workflow 做正式發布與公開首次使用驗收。
- 更新：main CI `36741252511` SUCCESS；已建立 `v0.1.4` 並指向 `7b799a433e0120b0d1b8d4934ec5eb56dc2168d9`。正式發布 run `36742581653` 全部 steps SUCCESS，含 post-publish full validation。npm registry 的 `@ai-atomic-framework/cli@0.1.4` 可查，`latest=0.1.4`，unpacked size `2,734,916` bytes、79 entries。GitHub post-publish proof status=verified，tarball SHA256 `b181416a23f2dfd63989c5f763408e14fd78c6103791e329ac9a4a29b0c1c456`，proof SHA256 `708bc3208b7425c475a47687b4b465228661923b4d65ef4ec09d8b9d0ca7f090`；乾淨 consumer 的 version/doctor/next/tasks/bootstrap smoke 均無 module-resolution failure，版本、doctor、bootstrap 成功，next/tasks 的非零碼是該測試目錄無任務時的預期結果。另在本機 `npm exec` 安裝公開 0.1.4 後執行 `atm --version` 成功。proof 已保存至 repo 外 sink `C:/Users/User/atm-benchmark-sink/ATM-RELIABLE-DELIVERY-20260930/release-0.1.4-proof/`。
- 2.2：PR #60 已合併至遠端 main，merge SHA `b14c6fcc58991946c6f9b85e37a1d7e5fa54f16f`；PR Product CI 與 Dogfood 成功。尚不宣稱已完成同問題偵測或 patch 自動發布。
- 3.3：舊 dry-run 36731880033 跳過版本相容性 gate，不能作完整發布驗收。修正後 dry-run 36736621301 成功且執行該 gate，但仍跳過 post-publish full validation；因此完整版本同步仍未證實。
- 3.5：正式 v0.1.3 run 36734900611 已 FAILURE；日誌確認 releaseTrain 與 root 版本不一致，後續完整驗證另發現 skew-matrix 的八個 package version 仍是 0.1.2。不得移動既有 tag 或宣稱公開修復完成；npm latest 核對仍是 0.1.2。
- 修復線保持同一 PR #61：HEAD `320e558642188817496dee5afffe5ad7f0a7315b`。版本 projection 與發布 gate contract 本機測試成功；六個缺失/跳過 gate 的反例失敗。針對該 HEAD 觸發 Product CI run 36737898767，等待結果。
- 下一動作：補齊 release version projection 的 skew 設定，並把相關完整驗證移至發布前可執行範圍；不靠略過檢查或改動歷史 tag 通過發布。

每次更新列日期、commit/PR/run、驗收、阻礙與下一步；不憑本機提交算百分之百。已有卡對應是導引，須核對 scope/驗收後才轉移 authority，不改寫歷史 close。

| WBS | 工作包 | 前置 | 必要驗收 | 狀態/證據 |
|---|---|---|---|---|
| 0.1 | 交付通道裁決落地 | 已核准方案 | INV-ATM-010/waiver 明確區分單一 PR 交付與多 agent 分支隔離；後續 agent/doctor 使用同一解釋 | 操作已授權；持久憲章對應待落地，不重複索取同一一般授權 |
| 1.1 | 全成果與 WIP 盤點 | 無 | 主工作樹、全部 worktree、未推送、0127 均有處置 | 部分；尚未完成完整處置 |
| 1.1a | 交付基準量測 | 1.1 資料可得 | 最近20件可辨识產品改動的首次提交→main 時間；未交付另列；人工介入無來源則 unknown | 待完成；不得只抽已成功提交或以檔案時間偽造人工分鐘 |
| 1.2 | CI 輸出隔離 | 1.1 | 平行讀寫成功、canonical 不變、main CI 通過 | 遠端整合完成：e07abaaa4；main CI 36733200572 Product CI/Dogfood SUCCESS；PRF-0128 候選 |
| 1.3 | telemetry 覆蓋修正 | 1.1 | 每 producer 實際觀測、假完整回歸、main CI | 遠端整合完成：e07abaaa4；main CI Product CI/Dogfood SUCCESS；PRF-0111 候選 |
| 1.4 | 0127 lock/WIP | 1.1 | 所有權、完整保存與復原，不覆寫 | 待核對；PRF-0127 |
| 1.5a | 共用主工作樹可恢復備份 | 1.1、1.4 | commits/index/WIP/untracked/必要ignored 完整；secret 檢查；可還原演練；清單/digest | 待執行；先本機repo外保存，遠端封存需符合資料授權 |
| 1.5b | 共用入口重新對齊 | 1.5a、Owner明確核准破壞性切換 | 指定工作樹對齊精確origin/main，版本/runner/doctor驗證，既有備份可找回 | 未授權reset；不得從一般方案核准推論破壞性權限 |
| 2.1 | GitHub auto-merge | 1.1 | 保護規則不降低 | 設定完成；PR #58 auto-merge 啟用，main Product CI strict 不變 |
| 2.2 | 可重試交付入口 | 0.1、2.1；平行來源PR啟用前須4.5完成 | 同一 PR 更新、失敗保存、無 force/main push | PR #60 已合併，main SHA b14c6fcc；Product CI/Dogfood PASS；工作流在首次推送與 ATM 原生 git push 的新分支查找缺陷仍需列入後續，不宣稱所有故障恢復已驗證 |
| 2.3 | 既有工作查詢 | 2.2 | 找到同問題既有修復；同檔不同問題不誤擋 | 待實作 |
| 3.1 | pack entries 核對 | 1.1 | 新增逐項分類、誤包為零 | 十個新增 schema 有引用；完整審查待完成 |
| 3.2 | 首次使用一致化 | 3.1 | 壞包 FAIL、修復包 PASS，同一驗證 | PR #58 合併 e07abaaa4；PR CI SUCCESS；0.1.4 公開 post-publish proof VERIFIED |
| 3.3 | 精確 SHA 發布 dry-run | 3.2 | version/closure/digest/tag 一致 | run 36738325605 dry-run SUCCESS；完整正式發布 run 36742581653 SUCCESS；v0.1.4→7b799a433；重複 publish 不升版仍需常態化測試 |
| 3.4 | 指定 patch 自動發布 | 2.2、3.3 | 標記才觸發、序列化、重試不重升版 | 政策已核准，待實作 |
| 3.4a | 發布授權與版本冪等 | 3.3 | 驗requester；tag同SHA跳過/異SHA拒絕；CI設定版本，不寫protected main | 待實作；Owner標籤請求為預設 |
| 3.4b | 發布凍結/解除 | 3.4a | 失敗持久凍結；正常PR無法自行解凍；Owner解除可稽核 | 待實作；旗標ATM_PATCH_RELEASE_FROZEN |
| 3.5 | 公開 npm 驗收 | 驗證過的發布提交；後續常態自動化依3.4 | 指定版本/dist-tag、首次使用完整 | DONE：@ai-atomic-framework/cli@0.1.4，latest=0.1.4，79 entries/2,734,916 bytes；proof VERIFIED；首次使用 smoke 成功 |
| 4.1 | block 最小上下文 | 1.3 | 可追錯誤碼與來源、未知不假判定 | 待核對 producer 寫入點 |
| 4.2 | 一項具體摩擦刪減 | 4.1 或已知重現 | 操作/人工成本下降、安全回歸 | 候選驗證少八次重複呼叫，PR #58 合併e07abaaa4；main CI 36733200572 SUCCESS；單樣本時間改善不能當長期效益證明 |
| 4.3 | CLI sweep 定點優化 | 1.2 | 同清單前後量測，不減測試 | 待執行；PRF-0115 候選 |
| 4.4 | build 自有暫存清理 | 1.1 | 正常/失敗清理自己資源，不動他人 WIP | 待實作 |
| 4.5 | 共同產物單一發布邊界 | 既有交付完成、0.1 | 同SHA乾淨build/doctor/hooks/npm成功；兩個source PR無生成物衝突；無bot遞迴提交 | 待設計/驗證；優先於啟用平行PR，不阻止眼前已驗證套件交付 |
| 5.1 | Proof 2 可重算 | 2.2 | 依封存規格從公開 run 重算、失敗不隱藏 | 待核對既有實作；PRF-0066/0123 候選 |
| 5.2 | 外部 A/B 準備 | 3.5 | 精確版本、oracle、獨立角色、预算到位 | 未就緒；PRF-0019/0040 候選 |
| 5.3 | 外部 A/B 結論 | 5.2 | 品質/成本與不確定性完整，不冒充獨立 | 未開始 |

### 補充後的執行順序

眼前交付已完成：0.1.4 遠端整合、公開 npm 驗收及完整 release workflow 均成功。下一輪優先以既有 0.1.4 作為穩定基準，推進減少 package footprint 的實測方案和 Proof 2/Proof 3 的實際準備；4.5 只先做兩個非重疊 source PR 的衝突實驗，不預先搬遷架構。清理工作樹、外部 A/B oracle/角色/預算依既有權限逐項處理，不自動接管別人 WIP。

Proof 2先核對真正存在的封存規則與日期，不能直接改成每SHA一次。若缺規則，新增v2 prospective規格，說明已看過哪些舊資料；歷史重算標示retrospective，不洗掉舊失敗。Proof 3在3.5完成後第一個工作回合提出獨立角色、oracle、credential/預算、版本/情境的具體決策包；日期由Owner確認，未確認不虛構deadline或更改原實驗。

## 4. 驗證與停損

必要案例：壞包首次使用失敗/修復包通過；同名 tarball 不覆寫；pack 無誤包；CI writer/reader 並行；PR 重試不重建；失敗 CI 不合併；非 release PR 不發布；版本/tag 重試冪等；發布後失敗停發布；測試/缺資料 telemetry 不冒充有效觀測；多 AI 非重疊可並行、真衝突/stale-base 保護通過。

同一假設兩輪重測無新資訊就停止重跑，改成整合決定或具體未解問題。審核只以可重現正確性、安全、產品偏移或不可交付問題阻擋；NOTE 進 backlog，不無限补件。CI 執行中凍結目前交付範圍，除阻斷修正外不連續追加提交重啟驗收。

量測總成本：必經步驟×單次成本＋誤擋恢復＋返工＋審核/建置/整合等待＋Token/費用。同機固定條件、交錯配對取樣；少量樣本不宣稱 p95 穩定改善。每日只報交付到哪裡、前置時間、下降 ms/人工介入、具體剩餘障礙。

## 5. 已取得量測與限制

- 公開 0.1.2：unpacked 2,683,003 bytes/69 entries；完整 node_modules 4,037,616 bytes/625 files。
- PR #58 候選 runtime：unpacked 2,734,916 bytes/79 entries；node_modules 4,089,529 bytes/635 files。不是瘦身完成。
- 去重前後 tarball digest 相同、命令矩陣相同、皆 PASS；單次耗時 21,477.8→18,563.2 ms，少 2,914.6 ms（13.6%），只算初步數據。
- 原始 receipts 已保存於 repo 外 `C:/Users/User/atm-benchmark-sink/ATM-RELIABLE-DELIVERY-20260930/`，不進 Git。`atm-candidate-before-dedup-20260930.json` SHA256 `a76ab2f4855609c1140b125cd70ade6b2496844284a5b677f3bb61290ee2cc16`；`atm-candidate-after-dedup-20260930.json` SHA256 `bd025c0f5ade1081ce59652748b347e737066c61581bda1d409e3c21a98ec42b`；`atm-public-footprint-corrected-20260930.json` SHA256 `8fc600f083d2ca958d025059f72ddb5b8b15c2074579c557b23a3d484db38f79`。
- PR：https://github.com/eaglhuang/AI-Atomic-Framework/pull/58 。head ddffe7e552572831c449c6857a8dc3cca092e6a1 的全部檢查 SUCCESS，2026-09-30T14:58:37Z squash 合併為 main e07abaaa47bae561cb4244884a8ac457501bda7d；main push CI 36733200572 的 Product CI/Dogfood SUCCESS。
- 本次實際發布依Owner已核准patch政策，由已登入Owner帳號的授權執行者將PR #58加上release:patch並建立唯一tag v0.1.3→e07abaaa4；release run https://github.com/eaglhuang/AI-Atomic-Framework/actions/runs/36734900611 執行中。這是已授權交付，不宣稱label-trigger常態自動化已實作。公開安裝驗收待完成。
- 本次物件庫登記 worktree 共 22 個；主 checkout b976cc29e 有 73 筆 porcelain 記錄。另一個原本指定的 `C:/Users/User/AI-Atomic-Framework` 是不同 checkout/物件庫，仍有 193 筆記錄、相對其 origin/main 左18/右38，0127 有 codex-gpt-5.4-mini 舊 lock/WIP。不可把兩個 checkout 的數量合併或直接清理；完整所有權/處置盤點仍未完成。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-09-30T14:51:19.900Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/atm-reliable-delivery-implementation-plan.md","contentDigest":"sha256:bd94d995c0249c52189167bdd8a906a03d2508b993d0fb3237c1bcdde8318930"} -->
