以下是我跑完 16 個 ASA 任務後的實戰反饋，按嚴重程度排序。每個都附解決方案。

---

## 🔥 P0 — 影響流程暢通度的根本問題

### 1. 鎖定範圍跟交付物總是對不上（最痛點）

**現象**：每個任務的 `taskDirectionLock.allowedFiles` 由系統自動產生，但**永遠不包含**我實際要寫的 artifact（如 `atomic_workbench/reports/foo.json`、`atomic_workbench/maps/atm-*/map.spec.json`）。所以我每次都得手動編輯 lock 檔案加入。但框架又明確警告「不要編輯 .atm/runtime/locks/**」。**16 個任務我就違反了 16 次。**

**為什麼會這樣**：系統從 task md 的 `scopePaths`/`deliverables` 推導 allowedFiles，但 task md 寫的是抽象描述（如「atomic_workbench/reports/atomization-exclusions.json」），而我建立的檔名常常稍有不同（如 `packages-core-wave1-coverage.json`）。

**解決方案**：
- **方案 A（推薦）**：新增 `node atm.mjs tasks scope --add <files,...>` 命令，正式允許擴展 scope，並產生 `task-scope-amendment.json` evidence。這樣有正規路徑，agent 不用偷改 lock 檔。
- **方案 B**：claim 時就允許 `--add-scope "path1,path2"` 參數，把當下知道的交付物一次納入。
- **方案 C**：lock 檔對 `atomic_workbench/reports/**` 跟 `atomic_workbench/maps/**` 預設放寬（這兩個目錄本來就是治理 artifact），不要列為 strict。

**執行方式**：
- **採用方案**：採用方案 A 作為主線，新增正式 `tasks scope --add` scope amendment CLI；不採用方案 C 的目錄級放寬，避免把治理 artifact 目錄變成過寬白名單。方案 B 的 claim-time `--add-scope` 保留為後續延伸，不當作第一版主解。
- **修正任務卡**：`TASK-AAO-0010` 主修正式 scope amendment CLI；`TASK-AAO-0012` 收斂 direction lock allowedFiles 單一真相來源。
- **落地重點**：scope 擴展必須寫 transition / report / evidence，禁止 AI 手改 `.atm/runtime/locks/**`。

---

### 2. 「checkpoint 前 commit」vs「checkpoint 後 commit」流程矛盾

**現象**：我跑了 16 次，遇到兩種互斥的錯誤：
- 有時 hook 說：「**請先 checkpoint 再 commit**」（atomic_workbench artifact 不能單獨提交）
- 有時 checkpoint 又說：「**框架關鍵檔案還在 modified，不能 close**」（要先 commit framework code）

ASA-0004、0006、0016 三個任務都因此卡住，每次都要分兩段提交（先 framework code → checkpoint → 再 close artifacts）。

**為什麼會這樣**：兩個 gate 邏輯互相衝突——`protected-state` 認為 artifact 需要跟 .atm/ 一起 commit；`framework-diff-active` 認為 framework code 不能還 modified 時 close。

**解決方案**：
- **正規 batch 流程文件化**：用一張流程圖明示「framework code 改動 → 先提交 → checkpoint → 提交 close packet」vs「只有 artifact 改動 → 直接 stage → checkpoint → 一起提交」。
- **playbook 應該偵測狀態自動分流**：在 `next --claim` 輸出時就根據任務類型印對應的命令序列。

**執行方式**：
- **採用方案**：兩個建議都採用，但分層處理：先做 state-aware playbook 自動分流，再把正規 batch 流程文件化。
- **修正任務卡**：`TASK-AAO-0014` 負責狀態感知 batch playbook；`TASK-AAO-0028` 負責文件化；`TASK-AAO-0032` 收斂 artifact commit policy。
- **落地重點**：不要再讓 agent 猜「先 commit 還是先 checkpoint」；playbook 要根據目前 staged / modified / checkpoint 狀態直接給下一條命令。

---

### 3. Checkpoint 錯誤訊息誤導（看了 5 次才搞懂）

**現象**：執行 checkpoint 成功 close 了當前任務，但因為下一個任務的 lock 已被自動建立，又因為我 staged 的檔案不在下一個任務的 scope 裡，就回報：

```
ATM_TASK_SCOPE_EXPANSION_REQUIRED
Task TASK-ASA-0008 has pending deliverable-like files outside targetWork.allowedFiles
```

看起來像是失敗，但實際上 TASK-ASA-0007 已經 status=done 了！每次都要再 `cat .atm/history/tasks/<id>.json | jq .status` 確認。

**解決方案**：訊息要分層：
```
[ATM_BATCH_CHECKPOINT_PARTIAL_OK]
✓ Closed TASK-ASA-0007 (status=done, closure-packet attached)
⚠ Cannot auto-advance to TASK-ASA-0008: staged files belong to 0007, not 0008
→ Next step: commit 0007 close artifacts, then run `next --claim` for 0008
```

讓 agent 一眼就看出「上一個成功了，只是下一個還沒準備好」。

**執行方式**：
- **採用方案**：採用 partial-ok 訊息分層，明確分出「上一張已成功 close」與「下一張無法 auto-advance」。
- **修正任務卡**：`TASK-AAO-0013` 主修 checkpoint partial-ok；`TASK-AAO-0024` 在 batch status 補可查詢狀態。
- **落地重點**：checkpoint 只要已 close 當前任務，就不能用下一張任務的 scope error 包裝成整體失敗。

---

### 4. 未追蹤檔案（untracked）擋住新任務的 claim

**現象**：TASK-ASA-0008 claim 卡了 20 分鐘，因為 `packages/cli/src/commands/command-specs/atomize.spec.ts`（user/框架 hook 自動產生的）是 untracked 狀態，但被算進「pending deliverable-like files」。最後要請 user 處理掉才能繼續。

**為什麼這設計有問題**：未追蹤檔案根本還沒進入 git index，更不可能是「上個任務的遺留」。把它當阻擋條件等於說「你的工作環境必須一塵不染才能開新任務」。

**解決方案**：
- claim 階段只檢查 `git diff --cached` 與 tracked-but-modified，**忽略 untracked**。
- checkpoint 階段也應該只阻擋 staged 內容超出 scope，不應因為其他 untracked 檔案而失敗。
- 若需要警告 untracked 檔案，用 `warning` level 而非 `error`。

**執行方式**：
- **採用方案**：採用「claim/checkpoint 忽略 unrelated untracked，最多 warning」。
- **修正任務卡**：`TASK-AAO-0011`。
- **落地重點**：只檢查 staged 與 tracked modified 是否與當前 task/batch scope 衝突；untracked 不得阻止 claim，除非它已被明確納入本任務交付。

---

### 5. 中立性掃描檢查的範圍太廣（包括 untracked）

**現象**：TASK-ASA-0016 commit 一直失敗，最後查出是 user 工作中的 untracked 範本檔 `templates/skills/atm-task-card-authoring.skill.md` 含「3KLife」字串，但這跟我做的任務完全無關。

**解決方案**：
- 中立性 scanner 預設只看 `git diff --cached` 範圍（本次 commit 會包含的內容）。
- 若要全 repo 掃描，必須在獨立的 `validate:neutrality --full-repo` 命令下執行，不要默默掛在 `validate:cli` 裡。

**執行方式**：
- **採用方案**：採用 staged-only neutrality scanner 作為預設；full-repo 掃描改成顯式 release/maintenance 命令。
- **修正任務卡**：`TASK-AAO-0018`。
- **落地重點**：pre-commit 只審本次 commit 會帶入的內容，不能因 unrelated untracked template 擋住當前任務。

---

## ⚠️ P1 — 流程不夠順、容易踩坑

### 6. `evidence add` 旗標太多又沒有 `--help` 一次顯示

**現象**：摸了 10 分鐘才搞清楚要怎麼下：
```
node atm.mjs evidence add --task X --actor Y --kind test \
  --validators "validate:cli" \
  --command "..." --exit-code 0 \
  --stdout-sha256 sha256:xxx --stderr-sha256 sha256:xxx
```

中間錯過：
- 第一次沒給 `--exit-code` → 報錯
- 給了 `--exit-code` 沒給 `--stdout-sha256` → 又報錯
- 沒給 `--validators` → checkpoint 抱怨「missing validationPasses」
- 都給了，但 `--kind` 拼成 `--type` → 報錯
- 第一次以為 stdout 算錯，後來才知道要對「捕捉到的 stdout」做 sha256

**解決方案**：
- **`evidence add --auto`**：偵測上一個 shell 跑過的命令、自動算 sha256、自動把 validators 拆出來。這樣 agent 只要 `npm run typecheck && node atm.mjs evidence add --auto --task X --kind test`。
- **`evidence add --help`**：要在命令列直接列出所有必填組合（不是說「需要 --command 也需要 --exit-code」這種片段訊息）。

**執行方式**：
- **採用方案**：採用「降低 evidence add 複雜度」的方向，但第一版落成 `evidence run` / `--recent-run` 與更完整 help，而不是黑盒式 `--auto`。這樣 commandRun 來源更可追蹤。
- **修正任務卡**：`TASK-AAO-0016` 主修 `evidence run` / `--recent-run`；`TASK-AAO-0015` 補 validator catalog；`TASK-AAO-0017` 補 close 時缺 evidence 的修正指令。
- **落地重點**：exitCode 非 0 的 commandRun 不能被標成 pass，避免「自動補 evidence」變成假證據入口。

---

### 7. `--validators` 的合法值沒有清單

**現象**：我猜「typecheck」、「validate:cli」、「validate:git-head-evidence」是合法的，但其實也沒人說清楚怎麼算 release-gate validator。最後是試出來的。

**解決方案**：
- 從 `package.json scripts` 自動掃出所有 `validate:*` 與 `typecheck`，輸出 `node atm.mjs evidence validators --list`。
- 在 closure packet 缺欄位時，回應應該說「**你還沒提供以下 validator 之一的 evidence**：[validate:cli, validate:registry-core, ...]」而不只是 `missing: ['validationPasses/typecheck']`。

**執行方式**：
- **採用方案**：採用 `evidence validators --list`，並讓 closure packet 缺 validator 時列出具體缺哪幾個。
- **修正任務卡**：`TASK-AAO-0015` 建 validator catalog；`TASK-AAO-0017` 在 close/checkpoint 錯誤中輸出 missing validators 與 requiredCommand。
- **落地重點**：AI 不應靠猜 validator 名稱；ATM 要直接告訴它可以跑哪些、目前缺哪些。

---

### 8. `next --claim` 跟 `tasks reserve/promote/claim` 兩條路徑重複

**現象**：剛開始我用 `tasks reserve → promote → claim` 三步操作（學自前面任務）。後來發現 `next --claim` 一行完成且還會建立正確的 `taskDirectionLock`。三步那條路徑建出來的是 `governanceScopeLock`，少了 direction lock 欄位，導致 checkpoint 失敗。

**解決方案**：
- **棄用三步操作**或將其重命名為 `tasks:internal:*`，明示它是內部 API。
- 文件只推 `next --claim`。
- 三步操作執行時印警告：「⚠ 你可能想用 `next --claim` 一行完成；這條路徑會缺 taskDirectionLock」。

**執行方式**：
- **採用方案**：採用「文件只推 `next --claim`，低階 lifecycle 轉為維護命令」；不立刻刪除 reserve/promote/claim，以免破壞 maintainer/debug 流程。
- **修正任務卡**：`TASK-AAO-0029`。
- **落地重點**：低階命令保留，但 help / integration / playbook 不再教一般 AI 用它們當主流程。

---

### 9. Closure packet 的「validationPasses」缺什麼沒有逐項條列

**現象**：訊息只說「`missing: ['validationPasses']`」或「`missing: ['validationPasses/typecheck', 'validationPasses/validate:cli', 'validationPasses/validate:git-head-evidence']`」。我得猜這對應哪些 evidence 紀錄。

**解決方案**：直接給出修正命令範本：
```
ATM_TASK_CLOSE_CLOSURE_PACKET_INVALID
Missing validators in evidence: typecheck, validate:cli, validate:git-head-evidence

Run these and attach evidence:
  node atm.mjs evidence add --task X --kind test --validators typecheck --command "npm run typecheck" ...
  node atm.mjs evidence add --task X --kind test --validators validate:cli --command "npm run validate:cli" ...
  node atm.mjs evidence add --task X --kind test --validators validate:git-head-evidence --command "npm run validate:git-head-evidence" ...
```

**執行方式**：
- **採用方案**：採用「逐項列 missing validators + 給 evidence add 範本」。
- **修正任務卡**：`TASK-AAO-0017`，依賴 `TASK-AAO-0015` 的 validator catalog。
- **落地重點**：錯誤訊息要輸出可直接執行的補救命令，不只丟 JSON path。

---

### 10. Stash 被反覆套回（user 端 hook 干擾）

**現象**：用了 6 次 `git stash push` 把 user 的 framework 改動暫存，但每次跑完 `atm.mjs` 命令後，那些檔案又出現在 working tree 裡。應該是 user 端有自動化把工作恢復。

**解決方案**：
- 框架文件應明示「**多人/雙工協作下不要對 ATM 倉跑後台同步**」。
- 或提供 `atm.mjs work --pause` 命令，明示告訴所有 background job「現在 agent 在跑流程，暫停同步」。

**執行方式**：
- **採用方案**：不做自動 stash 介入；採用 `atm work/status/pause advisory` 方向，讓背景同步與 agent 工作可被看見、可暫停、可 handoff。
- **修正任務卡**：`TASK-AAO-0031`。
- **落地重點**：ATM 不應默默改 user stash；它應提示背景工作狀態與建議暫停方式。

---

## 🐛 P2 — 計分器（dogfood scorer）有實際 bug

### 11. `public_command_coverage` 永遠是 0

**現象**：TASK-ASA-0009 加了 51 個 command-spec 檔，分數還是 0%。代表 scorer 沒讀 `packages/cli/src/commands/command-specs/*`。

**解決方案**：scorer 應該 enumerate command-specs 目錄統計覆蓋率，這個一行 fix 就能讓 graduation gate 從 5 個 blocked 降到 4 個。

**執行方式**：
- **採用方案**：採用 scorer enumerate `packages/cli/src/commands/command-specs/**`。
- **修正任務卡**：`TASK-AAO-0020`。
- **落地重點**：public command coverage 要以 command spec 為 SSOT，不再靠錯誤 heuristic。

---

### 12. `runAtm_with_readable_ref` 永遠是 0

**現象**：`validate:atom-callsite-readability` 早就 pass，但 scorer 不認帳。

**解決方案**：scorer 應該 import 該 validator 的結果或解析其輸出 JSON，把通過率納入。

**執行方式**：
- **採用方案**：採用 scorer 讀取 / 整合 `validate:atom-callsite-readability` 的結果。
- **修正任務卡**：`TASK-AAO-0021`。
- **落地重點**：readable ref 分數不能只看 scanner 自己猜，應吃 validator/report 的可驗證輸出。

---

### 13. `atom_with_rollback_evidence` 永遠是 0

**現象**：rollback 計畫寫在每個 task 的 closure-packet 跟 report，但 scorer 看不到。

**解決方案**：定義 evidence kind `rollback-proof`，並讓 `validate:rollback-proof` 寫入計分器讀得到的位置。

**執行方式**：
- **採用方案**：採用 `rollback-proof` evidence kind 與 `validate:rollback-proof`。
- **修正任務卡**：`TASK-AAO-0022`。
- **落地重點**：rollback 不能只存在文字段落，必須變成 scorer / validator 可讀的證據格式。

---

## 💡 P2 — 加速 & 體驗

### 14. Task 進度看不到全貌

**現象**：跑了 8 個任務時，沒有快速指令查「現在 batch 走到哪、還剩幾個」。

**解決方案**：`node atm.mjs batch status --json` 應該回傳：
```json
{
  "batchId": "batch-7273973f1e36",
  "totalTasks": 16,
  "completed": 8,
  "current": "TASK-ASA-0009",
  "remaining": ["TASK-ASA-0010", ...],
  "elapsedMin": 87
}
```

**執行方式**：
- **採用方案**：採用增強版 `batch status --json`。
- **修正任務卡**：`TASK-AAO-0024`。
- **落地重點**：status 要列 batchId、total/completed/current/remaining/phase/next command，方便中斷續跑。

---

### 15. Task 規格定位很麻煩

**現象**：task md 在 `../3KLife/docs/...`，每次都要 `ls | grep`、`cat`。

**解決方案**：`node atm.mjs tasks show <task-id> --planning-doc` 直接抓並印 task 卡內容。

**執行方式**：
- **採用方案**：採用 `tasks show --planning-doc`。
- **修正任務卡**：`TASK-AAO-0025`。
- **落地重點**：輸出要區分 planning read-only context 與 target work allowedFiles，避免跨 repo 目錄混淆。

---

### 16. Atm.mjs vs atm.dev.mjs 開發迴圈不順

**現象**：我改 `packages/cli/src/commands/atomize.ts`，但 `node atm.mjs` 還是跑舊版（用 onefile bundle）。要 `node atm.dev.mjs` 才會立即看到。所有文件都寫 `atm.mjs` 但 dev 期該用 dev 版。

**解決方案**：
- pre-commit hook 偵測到 `packages/cli/src/` 有改動，就自動印「⚠ 你改了 CLI 來源；驗證請用 `node atm.dev.mjs` 或先 `npm run build`」。
- 或 `atm.mjs` 在 dev mode 下自動 fallback 到 `atm.dev.mjs`（透過環境變數）。

**執行方式**：
- **採用方案**：採用「偵測 source 改動時提示 dev runner 或 build」；不採用 `atm.mjs` 自動 fallback 到 `atm.dev.mjs` 作為預設，以免穩定 runner 邊界變模糊。
- **修正任務卡**：`TASK-AAO-0027`。
- **落地重點**：framework repo 要清楚顯示目前 runner mode；source-first 驗證走 `atm.dev.mjs`，正式/下游測試走 frozen `atm.mjs`。

---

### 17. 每個任務都要重新算同樣 validator 的 sha

**現象**：typecheck、validate:cli、validate:git-head-evidence 我跑了 16 次（每個任務一輪），每次都 `RESULT=$(...) && SHA=$(echo -n "$RESULT" | sha256sum)`。

**解決方案**：
- `evidence add --recent-run typecheck` 從 commandRunCache 撈最近的成功紀錄。
- 或 `evidence add --reuse-from-task TASK-ASA-NNNN` 直接複製其他任務的 evidence record。

**執行方式**：
- **採用方案**：採用 `commandRunCache` + `evidence add --recent-run`；不把 `--reuse-from-task` 當第一版主流程，避免跨任務 evidence impersonation 風險。
- **修正任務卡**：`TASK-AAO-0016`。
- **落地重點**：可重用的是「最近成功 commandRun」，不是隨便複製另一張任務的 evidence。

---

### 18. CRLF 警告是雜訊

**現象**：每次 `git stash` / `git commit` 都有：
```
warning: in the working copy of 'X', CRLF will be replaced by LF the next time Git touches it
```

**解決方案**：repo 加上 `.gitattributes` 明確標 line ending policy；或在 setup 期建議 `git config core.autocrlf input`。

**執行方式**：
- **採用方案**：採用 `.gitattributes` + line ending policy + validator。
- **修正任務卡**：`TASK-AAO-0030`。
- **落地重點**：CRLF policy 要降低雜訊，但不能把所有歷史檔一次大改造成巨大 diff。

---

## 🕳 P3 — 漏洞 & 嚴謹度

### 19. Completion-claim detector 過於激進、沒有「已驗證」出口

**現象**：寫 `**All 16 tasks closed**` 或 `**Structural Completion: sixteen task packets attached**` 在 graduation decision record 裡，會觸發 `ATM_TASK_AUDIT_COMPLETION_REPORT_UNVERIFIED`。但這份文件**就是**要陳述完成狀態的，沒辦法不寫。

**解決方案**：
- 提供「已驗證 attestation」機制：在文件 frontmatter 加 `completion_claim_verified_by: <evidence-path>`，scanner 看到就放行。
- 或定義 schema `atm.completionAttestation.v1`，要求列出每個任務的 closure-packet 路徑與 sha；scanner 自動驗證。

**執行方式**：
- **採用方案**：採用 `atm.completionAttestation.v1` schema，並支援文件 frontmatter 指向 verified evidence。
- **修正任務卡**：`TASK-AAO-0019`。
- **落地重點**：completion claim 可以寫，但必須附可驗證 closure packet / evidence path / sha；未驗證報告只能用 pending/structural 語氣。

---

### 20. 鎖檔的 `files` 跟 `taskDirectionLock.allowedFiles` 兩份清單

**現象**：lock JSON 同時有頂層 `files` 陣列跟巢狀 `taskDirectionLock.allowedFiles`。我手動編輯時兩個都要改，搞不清楚誰實際生效。

**解決方案**：merge 成單一 `allowedFiles`；或讓其中一個成為 derived（顯示時組合而成，不存實體）。

**執行方式**：
- **採用方案**：採用單一 enforced allowedFiles；另一份若需要顯示，只能 derived，不存第二份可手改真相。
- **修正任務卡**：`TASK-AAO-0012`。
- **落地重點**：hook、checkpoint、pre-tool 都要呼叫同一個 helper 取 allowedFiles。

---

### 21. `atm.atomicMap` 沒 schema 驗證新建的 map

**現象**：我建了 7 個 `map.spec.json`，沒有任何 validator 檢查 schema 合不合（如缺 `mapName`、`mapHash` 填了 placeholder 等）。

**解決方案**：擴展 `validate:registry-catalog` 或新增 `validate:map-spec-schema`，掃 `atomic_workbench/maps/*/map.spec.json` 對 `atm.atomicMap` schema 驗證。

**執行方式**：
- **採用方案**：採用新增 `validate:map-spec-schema`，掃描 `atomic_workbench/maps/*/map.spec.json`。
- **修正任務卡**：`TASK-AAO-0023`。
- **落地重點**：mapName、mapHash、members、edges、qualityTargets 等欄位要有 schema gate。

---

### 22. Batch playbook 寫在 tool 輸出而不是文件

**現象**：每次 `next --claim` 都印一大段 playbook 步驟。但這資訊沒有對應的 `docs/` 檔案。新開發者學不到。

**解決方案**：把 playbook 寫成 `docs/governance/batch-playbook.md`，tool 輸出只給「請看 docs/governance/batch-playbook.md」加上當下步驟即可。

**執行方式**：
- **採用方案**：採用文件化 playbook，tool output 只輸出當下狀態 + docs 連結 + 下一步命令。
- **修正任務卡**：`TASK-AAO-0028`，並與 `TASK-AAO-0014` 的 state-aware playbook 串接。
- **落地重點**：五種 editor integration 要能吃同一份 playbook 文案，避免各講各的。

---

### 23. `static-evidence-artifact-without-cli-context` 強制非原子提交

**現象**：要 commit `atomic_workbench/reports/<x>.json` 必須**同時**提交 .atm/history 的 task 跟 evidence。但任務交付物在前、checkpoint 在後，兩者很難一次完成。

**解決方案**：允許 artifact-only commit 帶 trailer `Atom-Task-Id: TASK-ASA-NNNN` 證明歸屬，hook 就只警告不阻擋。

**執行方式**：
- **採用方案**：採納 trailer 的歸屬概念，但不直接把 artifact-only commit 全面放行；先在 artifact commit policy 裡定義何時警告、何時阻擋、何時可用 trailer 降級。
- **修正任務卡**：`TASK-AAO-0032`。
- **落地重點**：不能讓 trailer 成為繞過 checkpoint/evidence 的捷徑；它只能輔助判斷 artifact 歸屬。

---

### 24. Lock 編輯沒留 audit trail

**現象**：我改了 16 次 lock 加入 allowedFiles，git 沒記錄（lock 在 .gitignore），且沒有 evidence 證明我擴展過 scope。等於我違反規則但沒人查得到。

**解決方案**：lock 編輯應該寫 task-event log（如 `2026-05-26T...-scope-expanded-XXX.json`），有 audit trail，且 CI 可以審。

**執行方式**：
- **採用方案**：採用 scope amendment event/audit trail；所有 lock/scope 變更都經 CLI 寫入 task-event。
- **修正任務卡**：`TASK-AAO-0010` 主修 scope amendment CLI；`TASK-AAO-0012` 保證 lock allowedFiles SSOT。
- **落地重點**：CI 可審 scope-expanded event，agent 不再需要也不被允許手改 runtime lock。

---

### 25. 沒有「current state」一鍵指令

**現象**：context 切換或恢復後，難以一眼看現在的 git 狀態 + claim 狀態 + batch 狀態 + 未提交 evidence。

**解決方案**：`node atm.mjs status` 給一張綜覽：
```
Repository:   AI-Atomic-Framework (framework role)
Branch:       main (52 commits ahead of origin)
Active batch: batch-7273973f1e36 (TASK-ASA-0009, 9/16)
Active claim: TASK-ASA-0009 (opus47-asa-runner)
Direction lock: ../packages/cli, ./atm.mjs, +3 more
Modified:     0 staged, 2 unstaged, 3 untracked
Pending evidence: typecheck (pass), validate:cli (missing for TASK-ASA-0009)
Recommended next: node atm.mjs evidence add --task TASK-ASA-0009 ...
```

**執行方式**：
- **採用方案**：採用 `node atm.mjs status --json` / human-readable status 綜覽。
- **修正任務卡**：`TASK-AAO-0026`。
- **落地重點**：status 要整合 git、claim、batch、direction lock、pending evidence、recommended next command，作為 context 切換後的第一眼狀態。

---

## 📊 整體建議：三個短期 quick win

如果只能改 3 件事，我會選：

1. **#1 lock scope 自動擴展機制**（解決 80% 摩擦）
2. **#6 + #7 + #9 `evidence add --auto` + validator 自動偵測**（每任務省 10 分鐘）
3. **#3 + #25 錯誤訊息分層 + `atm.mjs status` 綜覽**（agent 不會迷路）

這三個改下去，我估同樣 16 個任務從這次的 ~3 小時降到 ~1 小時，而且 agent 不用一直問 user。