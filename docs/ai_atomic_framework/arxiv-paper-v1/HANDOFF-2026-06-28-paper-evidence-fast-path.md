# HANDOFF-2026-06-28 Paper Evidence Fast-Path

## 1. 交接目的

這份交接給下一位 ATM 論文隊長，接續 2026-06-27 論文收尾與 evidence 補證工作。使用者原本要求直接實作 fast-path 計畫，但在正式大改前改為要求先把計畫與目前所有交接內容整理成文件，交給下一位隊長接手。

本文件的重點不是宣稱 fast-path 已完成，而是把「已完成的證據」、「已確認的工作樹狀態」、「尚未實作的 fast-path 計畫」、「不可越界主張」和「下一位隊長的起手命令」放在同一份 handoff 裡。

## 2. 必讀規則與路由提醒

3KLife 仍是論文與協調 repo，不是 framework 功能 closeout 的權威 repo。

本輪重新跑過：

```bash
node atm.mjs next --json
```

結果回報 `ATM_NEXT_FRAMEWORK_TARGET_REPO_REQUIRED`。意思是：目前 metadata 偵測到 ATM framework work；若要做 framework 功能、runner sync、git-head evidence gate、closure authority，不能在 3KLife 裡關，必須切到 framework target repo。

但本文件只是 3KLife 論文交接文件，因此可以留在 3KLife 寫 handoff。下一位隊長若要繼續 framework fast-path 實作，請使用 clean clone，不要碰舊的 bare repo。

## 3. 目前 repo 狀態快照

### 3.1 3KLife

路徑：

```text
C:/Users/User/3KLife
```

目前狀態：

```text
branch = master
HEAD = 898ed649a90ef85304f2380d39f56d94ec354ff4
origin relation = ahead 1
```

本地尚有既有 dirty 檔案，這些不是本 handoff 的工作範圍：

```text
M docs/ai_atomic_framework/CID-Conflict-Run-Log.md
M docs/ai_atomic_framework/broker-collision-evidence/broker-run-index.json
M docs/ai_atomic_framework/broker-collision-evidence/broker-run-report.md
```

不要回退這些檔案，也不要把它們混入 paper handoff commit，除非使用者另外要求整理 broker collision evidence。

### 3.2 Framework clean clone

Fast-path framework work 應使用這個 clean clone：

```text
C:/Users/User/AI-Atomic-Framework-readme-quick-verify-clean
```

目前狀態：

```text
branch = codex/paper-evidence-fast-path
HEAD = a823febb4ee3c9fc1477968d38b421ea4d4a88ed
worktree = clean
```

這個 clone 已切好 fast-path 分支，但尚未實作 fast-path 計畫中的 code / artifact 變更。它可以作為下一位隊長的安全起點。

### 3.3 舊 framework repo，不要碰

舊路徑：

```text
C:/Users/User/AI-Atomic-Framework
```

這個路徑目前是 `core.bare=true` 的 repo，不是一般 worktree；同時它正在用於 ATM 底層 bug lane。不要在這裡做 README、paper evidence、或 fast-path 功能修改。若需要確認 framework mode，只能按 ATM 指示做狀態檢查，不要在此直接編輯。

### 3.4 FastAPI / npc-brain repos

現有 dirty repo：

```text
C:/Users/User/3klife-npc-brain
```

目前狀態：

```text
branch = codex/fastapi-public-source-cid-evidence
HEAD = 05a3a5c676b7a101203ff53e80393c7ad5fb157b
worktree = dirty, contains many unrelated ATM/app changes and broker evidence artifacts
```

不要用這個 dirty repo 直接做 Phase A helper replay。

Phase A artifact repo/copy：

```text
C:/Users/User/3klife-npc-brain-phase-a
branch = codex/phase-a-fastapi-public-source
HEAD = 111669689f44b1ecf53f994c164dd5208841d32a
```

它包含現有 FastAPI Phase A 主案例 artifact，但該案例仍有 post-change helper caveat。

尚未建立的 clean clone：

```text
C:/Users/User/3klife-npc-brain-helper-replay-clean
```

下一位隊長若要補 Phase A helper replay，應先建立這個 clean clone，分支使用：

```text
codex/fastapi-helper-replay
```

## 4. 已完成且可放進論文的證據線

### 4.1 Framework 主線證據

已知正式回報：

```text
Framework 主分支工作樹：C:/Users/User/AI-Atomic-Framework-main-final
main HEAD：077ea6c7fbcdf39ec762e9b6e595fe9b2966196f
相關 commit：545c50aa5、077ea6c7f
validator：capture-broker-evidence 已重跑通過
```

Reviewer-safe claim：

```text
ATM 的 broker evidence capture 已具 repo-local 治理能力。
```

不可越界：

```text
不要宣稱所有 runtime race condition 已被解決。
不要把 broker evidence path repo-local 化寫成完整 framework liveness proof。
```

### 4.2 Phase A FastAPI external public-source snapshot 主案例

主 artifact 目錄：

```text
C:/Users/User/3klife-npc-brain-phase-a/artifacts/external-public-repo/fastapi/2026-06-27
```

已具備：

```text
provenance
baseline
governance readiness
touched-path artifact
artifact-hash manifest
host-visible replay framing
```

重要 caveat：

```text
summary.json 中 postChangeFastapiModulePath / postChangeHelper / postChangeSnapshotHead 顯示 post-change 總結 artifact 混入兩種 execution context。
```

Reviewer-safe claim：

```text
ATM 能把 FastAPI external public-source snapshot 納入宿主 repo 的本地治理邊界，留下 provenance-pinned baseline、host-visible replay 與治理邊界 framing。
```

不可越界：

```text
不要宣稱 ATM 已治理 FastAPI upstream maintainer workflow。
不要宣稱 FastAPI 主案例已完全乾淨地證明 post-change execution 只跑在 snapshot helper 上。
```

### 4.3 Phase B Structured Artifact Admission Track

Phase B 已完成並進入 framework main。

已知完成證據：

```text
origin/main = 70993ceaa00bf77dea1ab7fb168451b70228248a
主功能 commit = 014ab0fb39a2d025de84f37b64c09aae41c063b2
git-head evidence commit = 70993ceaa00bf77dea1ab7fb168451b70228248a
```

主證據路徑：

```text
C:/Users/User/AI-Atomic-Framework-phase-b-clean2/artifacts/generated/structured-artifact-admission/20260627-phase-b/summary.json
C:/Users/User/AI-Atomic-Framework-phase-b-clean2/artifacts/generated/structured-artifact-admission/20260627-phase-b/paper-safe-summary.md
C:/Users/User/AI-Atomic-Framework-phase-b-clean2/artifacts/generated/structured-artifact-admission/20260627-phase-b/results.jsonl
C:/Users/User/AI-Atomic-Framework-phase-b-clean2/docs/reports/structured-artifact-admission-track-2026-06-27.md
```

Evidence summary：

```text
15 deterministic cases
5 structured artifact classes
matchedCount = 15
shipSafe = true
decision distribution = parallel-safe 5, blocked-cid-conflict 5, serial 5
formats = JSON manifest, YAML workflow, TOML config, OpenAPI schema path, atom-map shard
```

Reviewer-safe claim：

```text
ATM 已有跨格式 structured artifact admission / routing evidence。
```

不可越界：

```text
不要把 Phase B 寫成 external public-source snapshot governance。
不要把 Phase B 寫成雙編輯器 live conflict 展示。
```

### 4.4 Phase C dual-live external public-source conflict 補證

新 broker artifact：

```text
C:/Users/User/3klife-npc-brain/.atm/history/evidence/broker-runs/d66566dc-d055-41db-87cc-939aa27e0910.json
```

Run 內容：

```text
Actor A = codex-gpt-5.4-mini
Actor B = antigravity-gemini-3.5-flash
target file = local/public-source-snapshots/fastapi-0.136.3/fastapi/__init__.py
Actor A verdict = applied / mergeable
Actor B verdict = queued / conflict
```

Reviewer-safe claim：

```text
在 Team Broker mode 下，ATM 的 CID broker 對 external public-source snapshot touched path 也會生效，並留下可審計的 applied / queued / conflict run artifact。
```

不可越界：

```text
不要宣稱此證據已解決所有多 Agent runtime race condition。
不要宣稱這等於上游 FastAPI maintainer workflow governance。
```

### 4.5 OperationalBench 論文 evidence

已寫入英文論文的 reviewer-safe 解讀：

```text
Admission decision / Steward apply / Total scenario 的分母不同。
totalScenarioMs P50 低於 stewardApplyMs P50 是預期，因為不是同一組 row 的平均值。
N=50 是壓力探測，不是 liveness proof。
tail latency 仍集中在 steward-mediated recovery path。
```

需要保持的用語：

```text
official paper run
artifact label
percentile rows
finite stress probe
```

避免用語：

```text
不要把 20260627 說成很大的 run count。
不要把 percentile 寫成平均值。
不要把 finite queue 或 N=50 寫成 liveness proof。
```

## 5. Fast-Path Plan：下一位隊長要實作的範圍

使用者要求的最快範圍：

```text
完成 items 1, 2, 3, 5, 6, 7, 8, 12-lite
暫緩 external Prettier smoke、heavy validator pressure、second public repo governance、large repo atomization scan
```

總原則：

```text
使用現有 foundations，不從零開新 track。
不要碰 C:/Users/User/AI-Atomic-Framework 舊 bare repo。
Framework work 用 clean clone。
FastAPI Phase A helper replay 用新 clean clone。
Paper 更新只寫 conservative claims 和 artifact paths。
```

### 5.1 Phase A helper replay

目標 clean clone：

```text
C:/Users/User/3klife-npc-brain-helper-replay-clean
branch = codex/fastapi-helper-replay
```

新增 artifact：

```text
artifacts/external-public-repo/fastapi/2026-06-27-helper-replay/
summary.json
paper-safe-summary.md
commands.log
artifact-hash-manifest.sha256
```

成功條件：

```text
postChangeFastapiModulePath resolves under local/public-source-snapshots/fastapi-0.136.3/
postChangeHelper != null
postChangeSnapshotHead = 82064857539e6286522c347b4b11331b48dd2378
```

注意：

```text
不要改現有 2026-06-27 artifact；它保留為 caveated baseline。
```

### 5.2 Structured AdmissionFailureReason

目標 framework clone：

```text
C:/Users/User/AI-Atomic-Framework-readme-quick-verify-clean
branch = codex/paper-evidence-fast-path
```

要做：

```text
在 BrokerDecision 加 additive optional failureReason payload。
保留既有 reason / conflicts / admission fields。
只在 blocked / serial / composer-routed decisions 填 failureReason。
parallel-safe 不需要 failureReason。
```

Payload 欄位：

```json
{
  "verdict": "blocked-shared-surface",
  "blockingLayer": "shared-surface",
  "conflictingCid": "...",
  "conflictKey": "...",
  "sharedSurface": "...",
  "preservedIntentId": "...",
  "patchEnvelope": "...",
  "recommendedRoute": "serialize",
  "validatorTranscript": null
}
```

預期 test / artifact：

```text
npm test -- broker/failure-reason
artifacts/generated/admission-failure-reason/20260628/
```

### 5.3 Pre-push stale-remote evidence

不要新寫 runner，重用：

```text
scripts/validate-git-boundary-paper-evidence.ts
```

正規化輸出到：

```text
artifacts/git-admit-stale-remote/20260628/
summary.json
results.jsonl
paper-safe-summary.md
artifact-hash-manifest.sha256
```

覆蓋現有五個 case：

```text
allow disjoint
block same record
composer disjoint records
recover block non-fast-forward
recover composer non-fast-forward
```

Paper wording：

```text
local Git boundary / pre-push evidence
not server-side enforcement
```

### 5.4 ConflictKey overlap predicate tests

新增最小測試，優先放在 broker adapter test family：

```text
broker/conflict-key-overlap
```

要覆蓋：

```text
JSON pointer equality / disjoint
numeric scalar equality
text-range overlap / disjoint
atom-map row equality / disjoint
atom-map metadata file-scope widening
OpenAPI path equality / disjoint if adapter already exists
```

如果 OpenAPI adapter 不存在：

```text
不要硬補大型 adapter。
用 structured artifact fixture path coverage 替代，並在 artifact 中標 OpenAPI path test deferred。
```

### 5.5 Adapter trust mini-suite

重用 AdmissionBench adversarial code，不重新開大 benchmark。

新增 artifact：

```text
artifacts/adversarial-adapter-containment/20260628/
summary.json
results.jsonl
paper-safe-summary.md
artifact-hash-manifest.sha256
```

要覆蓋：

```text
malformed ConflictKey -> fail-closed
over-declared surface -> conservative block
under-declared read dependency -> outside positive guarantee
validator catches under-declared dependency
CAS mismatch after under-declaration -> recovery routing
```

Claim boundary：

```text
只主張 containment evidence。
不要主張 adversarial adapter soundness。
```

### 5.6 Queue-drain finite contention smoke

新增或擴充 OperationalBench 小型 runner。

Artifact：

```text
artifacts/queue-drain-smoke/20260628/
summary.json
results.jsonl
paper-safe-summary.md
artifact-hash-manifest.sha256
```

Cases：

```text
N = 5, 10, 20, 50
same shared surface
preservedIntents = N
lostIntents = 0
queueDrains = true
terminal fail-closed only when policy selects it
```

Wording：

```text
finite queue-drain smoke
not liveness proof
```

### 5.7 README Quick Verify + last-verified

README Quick Verify 已知已 landed：

```text
framework main commit = a823febb
```

還要補：

```text
artifacts/verification/last-verified.json
```

內容包含：

```json
{
  "release": "v0.9.0-alpha.1",
  "commit": "...",
  "verifiedAt": "2026-06-28T...",
  "commands": [
    "npm test -- broker/decision",
    "npm run bench:admission:paper -- --seed 20260625",
    "npm run bench:operational -- --seed 20260627"
  ],
  "status": "pass"
}
```

### 5.8 Artifact hash manifest lite

每個新 artifact 目錄都要有：

```text
artifact-hash-manifest.sha256
```

這一輪不要做 global A/B/C mega-manifest，除非所有 artifact roots 都已穩定。

## 6. 建議下一位隊長的起手命令

### 6.1 先確認 3KLife handoff 狀態

```bash
cd C:\Users\User\3KLife
git status --short --branch
node tools_node/check-context-budget.js --changed --emit-keep-note
```

### 6.2 進 framework clean clone

```bash
cd C:\Users\User\AI-Atomic-Framework-readme-quick-verify-clean
git status --short --branch
git branch --show-current
git rev-parse HEAD
```

期望看到：

```text
branch = codex/paper-evidence-fast-path
HEAD = a823febb4ee3c9fc1477968d38b421ea4d4a88ed
worktree clean
```

### 6.3 Framework fast-path test plan

完成 code/artifact 後跑：

```bash
npm test -- broker/decision
npm test -- broker/failure-reason
npm test -- broker/conflict-key-overlap
npm run validate:operational-bench
node --strip-types scripts/validate-git-boundary-paper-evidence.ts
```

若新增 validators：

```bash
node --strip-types scripts/validate-admission-failure-reason.ts
node --strip-types scripts/validate-adversarial-adapter-containment.ts
node --strip-types scripts/validate-queue-drain-smoke.ts
node --strip-types scripts/validate-last-verified.ts
```

最後跑 touched encoding guard：

```bash
npm run check:encoding:touched -- --files <touched files>
```

### 6.4 建立 FastAPI helper replay clean clone

建議流程：

```bash
cd C:\Users\User
git clone <3klife-npc-brain-remote-url> 3klife-npc-brain-helper-replay-clean
cd C:\Users\User\3klife-npc-brain-helper-replay-clean
git switch -c codex/fastapi-helper-replay
```

若不確定 remote URL，先在既有 repo 查：

```bash
git -C C:\Users\User\3klife-npc-brain remote -v
```

成功後產出：

```text
artifacts/external-public-repo/fastapi/2026-06-27-helper-replay/
```

## 7. 論文更新策略

等 fast-path artifacts 真的生成並通過驗證後，才回到 3KLife paper 更新。

更新範圍要保守：

```text
claim table
Appendix evidence paths
artifact index / paper-safe summary references
必要的 limitation wording
```

不要大改：

```text
Abstract
Introduction
Contribution list
Related Work 大段 prose
```

可新增或強化的 reviewer-safe claim：

```text
Phase A helper replay strengthens host-visible snapshot replay evidence.
Structured AdmissionFailureReason shows blocked decisions preserve repair context.
Pre-push stale-remote suite is local Git boundary evidence, not server-side enforcement.
ConflictKey overlap tests align implementation with the paper's non-equality overlap definition.
Adapter trust suite provides containment evidence, not adversarial soundness.
Queue-drain smoke is finite contention smoke, not liveness proof.
```

## 8. 不可越界主張總表

請下一位隊長務必守住：

```text
不要宣稱 ATM 已治理 FastAPI upstream maintainer workflow。
不要宣稱 TypeScript 語言依賴等於已治理 microsoft/TypeScript repo。
不要宣稱 FastAPI baseline artifact 已完全乾淨地證明 post-change execution 只跑在 snapshot helper 上。
不要宣稱 Phase C 已解決所有 multi-agent runtime race condition。
不要宣稱 queue-drain smoke 是 liveness proof。
不要宣稱 adapter trust suite 證明 adversarial adapter soundness。
不要宣稱 stale-remote suite 是 Git server-side enforcement。
不要把 20260627 / 20260628 artifact label 寫成 run count。
不要把 percentile 寫成 average。
```

## 9. 若時間很少，請照這個最短順序

最小高 CP 路線：

```text
1. Framework clean clone 補 AdmissionFailureReason + tests + artifact
2. Framework clean clone 正規化 git-boundary evidence 到 git-admit-stale-remote artifact
3. Framework clean clone 補 ConflictKey overlap predicate tests
4. Framework clean clone 補 queue-drain smoke artifact
5. FastAPI helper replay clean clone 產出 helper-replay artifact
6. 回 3KLife 論文只補 claim table / appendix artifact path
```

如果被時間切斷，請至少留下：

```text
git status --short --branch
HEAD commit
已產出 artifact directory
未跑過的 validator
paper 尚未更新的段落
```

## 10. 本次 handoff 已做與未做

已做：

```text
讀取 docs/keep.summary.md
讀取 best-mode skill
讀取 atm-handoff skill
讀取 encoding-touched-guard skill
跑 node tools_node/check-context-budget.js --changed --emit-keep-note
跑 node atm.mjs next --json 並確認 framework target repo blocker
用 Node.js 檢查相關 repo / artifact path 存在性
新增本 handoff 文件
```

未做：

```text
尚未實作 framework fast-path code changes
尚未建立 3klife-npc-brain-helper-replay-clean
尚未產出 20260628 fast-path artifacts
尚未更新 paper.v3.1.en.md 到 fast-path claims
尚未 commit / push 本 handoff
```

## 11. 給下一位隊長的最短接手句

目前真正安全的接手方式是：把 3KLife 當作論文協調與 handoff repo；把 `C:/Users/User/AI-Atomic-Framework-readme-quick-verify-clean` 當作 framework fast-path 實作 repo；另建 `C:/Users/User/3klife-npc-brain-helper-replay-clean` 做 FastAPI helper replay。不要碰舊的 bare `C:/Users/User/AI-Atomic-Framework`，不要在 dirty `3klife-npc-brain` 裡補 helper replay。fast-path 的論文更新必須等 artifact 真的生成後再寫，而且全程維持 conservative claims。
