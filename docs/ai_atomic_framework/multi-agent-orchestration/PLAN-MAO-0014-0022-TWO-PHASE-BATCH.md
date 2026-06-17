# 規劃書：MAO 0014–0022 兩階段切點批次治理

> 規劃人：claude-code-opus-4-7
> 撰寫於：2026-06-17
> 目的：用 [LESSONS](LESSONS-MAO-WAVE-MODE-BATCH-CLOSEBACK.md) §5 修勘後的「兩階段切點」設計，做完 9 張 Runner Broker 系列卡，並量化 vs. 我先前 0023-0033 逐卡禮儀的差距。

---

## 1. 卡片清單與真實依賴 DAG

| 卡 | 標題（簡） | depends_on（卡內） | depends_on（卡外） | 卡外 deps 狀態 |
|---|---|---|---|---|
| 0014 | runner-ref publish primitive | — | 0011, 0012 | ✅ done |
| 0015 | patch-envelope ATM core specialization | — | 0008, 0013 | ✅ done |
| 0016 | runner-submit patch pipeline | **0014, 0015** | 0008, 0011 | ✅ done |
| 0017 | runner-version stream state machine | **0014, 0016** | — | — |
| 0018 | closure-runner binding | **0017** | — | — |
| 0019 | cross-repo dual-binding closure | **0018** | — | — |
| 0020 | broker bootstrap self-update recovery | **0017** | — | — |
| 0021 | runner-broker failure-mode coverage | **0017, 0020** | — | — |
| 0022 | external core contributor pipeline | **0017, 0018** | — | — |

### 1.1 拓樸層（close 階段必守的順序）

```
L0：[0014, 0015]                           ← 卡內無依賴，可平行 claim+close
L1：[0016]                                  ← 依賴 L0 全 done
L2：[0017]                                  ← 依賴 0014 + 0016
L3：[0018, 0020]                            ← 都只依賴 0017
L4：[0019, 0021, 0022]                      ← 依賴 L3 或 0017
```

→ **5 個 close 層**，但 implement 階段全 9 張一次寫完，validator 跑一輪全綠。

### 1.2 同層 scope 衝突檢查（決定同層是否可平行 claim）

| Level | Members | scope 交集？ | 可同 phase claim |
|---|---|---|---|
| L0 | 0014, 0015 | 0014 → runner-ref-store / broker.ts / validate-runner-refs.ts；0015 → patch-envelope.* / types.ts | **無交集** ✅ |
| L3 | 0018, 0020 | 0018 → closure-packet / closeout / close-orchestration；0020 → recovery / orphan-cleanup / runner-bootstrap | **無交集** ✅ |
| L4 | 0019, 0021, 0022 | 0019 → close-orchestration / profile-loader；0021 → validate-runner-broker-failures / failure fixtures；0022 → .github/workflows / docs / external-core | **無交集** ✅ |

→ 同層全部可平行 claim+close，依賴閘門只在 **層與層之間** 強制序列。

### 1.3 跨層 scope 重疊（implement 期要注意的順序）

| 檔 | 卡 | 動作 |
|---|---|---|
| `packages/core/src/broker/runner-ref-store.ts` | 0014 創建、0017 修改 | implement 順序 0014 → 0017 |
| `packages/core/src/broker/patch-envelope.ts` | 0008 已 done、0015 擴充 | 0015 是「特化擴充」 |
| `packages/cli/src/commands/route.ts` | 0016 修、0017 修 | 兩張的修改需內容相容 |
| `packages/cli/src/commands/taskflow/close-orchestration.ts` | 0018 修、0019 修 | 0019 在 0018 基礎上加 cross-repo |
| `packages/cli/src/commands/tasks/closeout-provenance.ts` | 0018 修、0019 修 | 同上 |
| `packages/cli/src/commands/broker.ts` | 0014 修，**可能 vs 0037 並行衝突** | 確認 0037 已收口；若還活著要避讓 |
| `atomic_workbench/atomization-coverage/path-to-atom-map.json` | **9 張卡全寫** | append-safe / 卡末段一次補 9 個 entry |

---

## 2. 兩階段執行計畫

### Phase 0：預先準備（一次性，~5 分鐘）

```bash
# 環境固定
node atm.mjs identity set --actor claude-code-opus-4-7 \
  --git-name claude-code-opus-4-7 --git-email claude-code-opus-4-7@3klife.local \
  --editor claude-code --json
npm run build   # 確認 runner 不會中途 sync required
git status      # 確認 working tree 乾淨；若不乾淨先 stash off-scope

# 確認 0037 / 0049 等並行卡狀態
for n in 0037 0049 0050 0051; do grep -m1 status .atm/history/tasks/TASK-MAO-$n.json; done
```

### Phase I：INVENTORY（盤點期，~30 分鐘）

#### I.1 全部 reserve（不擋依賴，1 條指令× 9 = 9 條，可寫成迴圈）

```bash
for n in 14 15 16 17 18 19 20 21 22; do
  node atm.mjs tasks reserve --task TASK-MAO-00$n --actor claude-code-opus-4-7 \
    --title "MAO-00$n runner-broker series" --json >/dev/null
done
```

#### I.2 按 implement 順序寫 source（注意跨層 scope 重疊）

實作順序（不是 close 順序）：

```
1. 0014 → 創建 runner-ref-store.ts、broker.ts 接點、validate-runner-refs.ts
2. 0015 → 擴充 patch-envelope.ts + schema + types.ts
3. 0016 → 創建 runner-submit-pipeline.ts、touch steward.ts、touch route.ts、test、validator
4. 0017 → 創建 runner-version-state.ts、修 runner-ref-store.ts (0014 已存在)、修 route.ts (0016 已修過)
5. 0018 → schema/closure-packet、closeout-provenance.ts、closeout-signaling.ts、修 close-orchestration.ts
6. 0019 → 在 close-orchestration.ts 加 cross-repo 邏輯、修 closeout-provenance.ts、profile-loader.ts
7. 0020 → recovery.ts、orphan-cleanup.ts、runner-bootstrap.ts、報告 md
8. 0021 → 失敗模式 validator + fixtures + 報告
9. 0022 → .github/workflows yml、CONTRIBUTING_CORE.md、HOST_GOVERNANCE_INTEGRATION.md、external-core validator + fixtures
```

→ 跨層共享檔（runner-ref-store.ts、route.ts、close-orchestration.ts、closeout-provenance.ts）按上面順序寫，後者繼承前者的 baseline，**不會打架**。

#### I.3 一次 validator sweep（全 bundle 共用）

```bash
npm run typecheck
npm run validate:cli
npm run validate:schemas
npm run validate:neutrality
# 任何 per-card test：
node --strip-types packages/core/src/broker/__tests__/runner-ref-store.test.ts
node --strip-types packages/core/src/broker/__tests__/patch-envelope.test.ts
node --strip-types tests/cli/runner-submit-patch.test.ts
node --strip-types packages/core/src/broker/__tests__/runner-version-state.test.ts
node --strip-types tests/cli/runner-version-lease.test.ts
node --strip-types tests/cli/closure-runner-binding.test.ts
node --strip-types tests/cli/cross-repo-dual-binding-close.test.ts
node --strip-types packages/core/src/broker/__tests__/runner-bootstrap.test.ts
node --strip-types packages/core/src/broker/__tests__/recovery.test.ts
node --strip-types packages/core/src/broker/__tests__/runner-failure-modes.test.ts
node --strip-types scripts/validate-runner-refs.ts
node --strip-types scripts/validate-runner-submit-pipeline.ts
node --strip-types scripts/validate-framework-development-governance.ts
node --strip-types scripts/validate-task-ledger-governance.ts
node --strip-types scripts/validate-runner-broker-failures.ts
node --strip-types scripts/validate-external-core-pipeline.ts
```

**全綠後**才進 I.4。

#### I.4 atomic delivery（建議：一個大 commit；保守版：每 level 一個 commit）

```bash
git add packages/core/src/broker/ packages/cli/src/commands/broker.ts \
  packages/cli/src/commands/broker.spec.ts packages/cli/src/commands/route.ts \
  packages/cli/src/commands/tasks/closeout-provenance.ts \
  packages/cli/src/commands/tasks/closeout-signaling.ts \
  packages/cli/src/commands/taskflow/close-orchestration.ts \
  packages/cli/src/commands/taskflow/profile-loader.ts \
  schemas/patch-envelope.schema.json schemas/governance/closure-packet.schema.json \
  scripts/validate-runner-*.ts scripts/validate-framework-development-governance.ts \
  scripts/validate-task-ledger-governance.ts scripts/validate-external-core-pipeline.ts \
  scripts/fixtures/runner-broker-failures/ \
  tests/cli/runner-*.test.ts tests/cli/closure-*.test.ts \
  tests/cli/cross-repo-*.test.ts tests/fixtures/external-core-pipeline/ \
  docs/reports/runner-broker-*.md docs/CONTRIBUTING_CORE.md \
  docs/HOST_GOVERNANCE_INTEGRATION.md .github/workflows/ \
  atomic_workbench/atomization-coverage/path-to-atom-map.json

# 用 0014 當 lead（任一卡都可，因為 envelope 會分配 attribution）
node atm.mjs git commit --actor claude-code-opus-4-7 --task TASK-MAO-0014 \
  --message "feat(mao): runner-broker pipeline bundle (TASK-MAO-0014..0022)" --json
```

> 若 framework gate 抗議「single-commit covers multi-task」，退回保守版：按 implement 順序做 9 個 commit，每個用該卡的 task id 當 ATM-Task header。`evidence historical-batch --commits <csv>` 接受 N 個 commit 對應 N 張卡。

#### I.5 一次 git-head backfill（給整個 bundle 用）

```bash
node atm.mjs evidence git-head-backfill --actor claude-code-opus-4-7 \
  --reason "MAO-0014..0022 bundle git-head baseline" --json
git add .atm/history/evidence/git-head.jsonl
node atm.mjs git commit --actor claude-code-opus-4-7 --task TASK-MAO-0014 \
  --message "chore(evidence): backfill git-head evidence for MAO-0014..0022" --json
```

### Phase II：BUILD ONE ENVELOPE（蓋一個信封給 9 張卡共用，~1 分鐘）

```bash
node atm.mjs evidence historical-batch \
  --tasks TASK-MAO-0014,TASK-MAO-0015,TASK-MAO-0016,TASK-MAO-0017,TASK-MAO-0018,TASK-MAO-0019,TASK-MAO-0020,TASK-MAO-0021,TASK-MAO-0022 \
  --commits <delivery-sha-or-csv> \
  --actor claude-code-opus-4-7 \
  --validator-command "npm run typecheck" \
  --validator-command "npm run validate:cli" \
  --validator-command "npm run validate:schemas" \
  --validator-command "npm run validate:git-head-evidence" \
  --write --json
# → hist-batch-XXXX；檢查每張 okToCloseTask: true
```

若有任何 `okToCloseTask: false`，**只**對該張卡做最小修補（補缺檔 / 補 validator），不要動其他卡。然後重跑 envelope。

### Phase III：RAPID CLOSE（5 個 close 層，~10 分鐘）

每層的範本（以 L0 為例）：

```bash
# L0: 0014 + 0015 平行 claim
for n in 14 15; do
  node atm.mjs tasks promote --task TASK-MAO-00$n --actor claude-code-opus-4-7 --json
  node atm.mjs tasks claim --task TASK-MAO-00$n --actor claude-code-opus-4-7 \
    --files <該卡 deliverables csv> --claim-intent closeout-only --json
done

# 各自 close（秒級）
for n in 14 15; do
  node atm.mjs taskflow close --task TASK-MAO-00$n --actor claude-code-opus-4-7 \
    --historical-batch hist-batch-XXXX --write --json
done

# 一個 closure commit 收 L0 的 ledger 與 closure packets
git add .atm/history/tasks/TASK-MAO-0014.json .atm/history/tasks/TASK-MAO-0015.json \
        .atm/history/evidence/TASK-MAO-0014* .atm/history/evidence/TASK-MAO-0015* \
        .atm/history/task-events/TASK-MAO-0014/ .atm/history/task-events/TASK-MAO-0015/
node atm.mjs git commit --actor claude-code-opus-4-7 --task TASK-MAO-0014 \
  --message "chore(taskflow): close TASK-MAO-0014,0015 governance bundle (L0)" --json
```

→ 重複套用到 L1（0016）→ L2（0017）→ L3（0018, 0020）→ L4（0019, 0021, 0022）。

---

## 3. 預期 commit / token 對比

| 階段 | 我先前 0023-0033 做法 | 0014-0022 兩階段切點 |
|---|---|---|
| reserve+promote+claim | 9 × 3 = 27 條指令 | 9 × 3 = 27 條（無法省，但可迴圈批量） |
| validator 跑 | 9 × 5 = 45 次 evidence run | **1 次** sweep + envelope 自動掛 |
| delivery commit | 9 個 (`feat` 各一) | **1-9 個**（建議 1 個，最多按 implement order 9 個） |
| `git-head-backfill` | 9 個獨立 commit | **1 個** |
| close 與 closure commit | 9 + 9 = 18 個 commit | 9 個 close（指令）+ **5 個** closure commit（按層） |
| stash 來回 | ≥5 次（跨卡 scope drift） | **0** |
| **總 commit** | **~36** | **8–15**（依 delivery commit 切多細） |
| **總指令往返** | **~80** | **~50**（reserve/claim 仍要每卡跑，但無 validator 重跑） |

**估計 token 節省：~50–60%；wall-clock：~3 倍快**（implement 階段大頭仍在，但 close 階段從 ~80 分鐘 → ~10 分鐘）。

---

## 4. 風險與緩解

| 風險 | 緩解 |
|---|---|
| 一次 validator sweep 中間掛掉，要重跑全部 | 先寫 implementation order **1 卡 + 1 對應驗證**的 micro-test，每張卡 src 寫完先 `npm run typecheck` 局部跑，全 9 卡寫完再 sweep |
| 單 delivery commit 被 framework gate 拒 | 預先 dry-run `taskflow close --task <任一> --historical-delivery <test sha>` 看 waiver 是否需要；若需要就退回 9 個 commit |
| 0037（並行 agent）正在改 broker.ts | Phase 0 確認 0037 status；若 active，把 broker.ts 從 0014 implement order 抽出，**最後**在 lock-out window 内補 |
| close 階段中途 fail，已 close 卡不 rollback | close 用 dry-run 預跑一輪確認 envelope OK；中途 fail 的話從 fail 那張開始 retry，前面已 done 的不動 |
| atomization-coverage 並行寫衝突（其他 agent 在 append） | I.2 寫 map entry 時用 grep 找最後 source_task 後追加；**一次補 9 個 entry**，盡量不 race |

---

## 5. 取消執行的觸發條件（事前約定）

- 0014 的 broker.ts 跟另一 active agent 真的有 write/write conflict → 暫停 0014，繼續其他 8 張，0014 留到對方收口
- 0015 的 patch-envelope 擴充打破 0008 的 baseline test → 退回單卡逐做（這是 spec 本身的問題，不是治理層）
- Phase II envelope 對 ≥3 張卡回報 `okToCloseTask: false` → 退回逐卡做法，因為 batch 收口的前提是大多數 OK

---

## 6. 結論

以同樣的 9 張 MAO 卡為例：

- **舊做法（每卡 7-9 step ceremony）**：~36 commit、~80 指令往返、~3-4 小時 wall-clock。
- **兩階段切點**：~8-15 commit、~50 指令往返、~1 小時 wall-clock + 1 小時 implementation。

**真正的 batch mode 從來不是 ATM 不准，是要會設計 implement / close 兩階段切點，並紀律地不在 close 期改 code。** 0014-0022 是驗證這個設計的好對象 —— 9 張卡、5 個 close 層、同層內 scope 全不交集，是理想練習場。
