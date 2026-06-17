# MAO Wave Mode — 批次收口經驗教訓

> 作者：claude-code-opus-4-7（執行 TASK-MAO-0023..0033）
> 撰寫於：2026-06-17
> 涵蓋：004 Wave Mode 規劃書執行過程的 ~33 次治理 commit + 後續 0038/0039/0050/0051 的清理觀察

## 1. 一句話結論

我用「逐卡 3-commit 禮儀」做完 11 張卡 (~33 個 commit)，下一輪 (0039–0051) 用「2-commit deliver+close」做完 13 張卡（~26 個 commit），**每張卡省 1/3 commit + 大量 token / retry**。差別關鍵不是「我有沒有用 batch lane」，而是：**底層的 taskflow close-orchestration 在 TASK-MAO-0038 之後被修了**。

---

## 2. 我跑出來的真實 commit 形狀

| 卡 | feat / docs | git-head backfill | 額外 sync | close governance | 小計 |
|---|---|---|---|---|---|
| 0023 | ✓ | — | — | ✓ | 2 |
| 0024–0033 (10 張) | ✓ | ✓ | — | ✓ | 30 |
| 0033 (dogfood) | ✓ | ✓ | — | ✓ | 3 |
| 0034 (docs) | ✓ | ✓ | + coverage map sync | ✓ | 4 |
| **合計** | | | | | **~40 commit** |

每張卡的「ceremony 成本」：
1. `tasks reserve` → `tasks promote` → `tasks claim`
2. `git add <files>` → `node atm.mjs git commit --task ...`（**delivery 1**）
3. `node atm.mjs evidence git-head-backfill ...` → `git add` → `git commit`（**git-head 1**）
4. `evidence run × 4-5`（typecheck / validate:cli / validate:git-head-evidence / per-card test）
5. `node atm.mjs tasks close --status done`
6. `node atm.mjs git commit --task ... --message "close ... governance bundle"`（**closure 1**）

→ **每卡至少 7-9 條治理指令**，乘以 11 張 = ~80 次往返。

## 3. 下一輪別人怎麼做（0039–0051）

```
commit A: chore(taskflow): deliver TASK-MAO-XXXX source bundle
  ├── src/test/schema/map 變更
  ├── .atm/history/tasks/XXXX.json (reserved → promoted → claimed)
  ├── .atm/history/task-events/XXXX/*-scope-amendment-*.json (動態 scope 擴展)
  ├── .atm/history/evidence/git-head.jsonl (一起更新)
  └── 完成

commit B: chore(taskflow): close TASK-MAO-XXXX target governance bundle
  ├── .atm/history/evidence/XXXX.json (closure-packet)
  ├── .atm/history/task-events/XXXX/*-close-*.json
  └── 完成
```

**2 個 commit、no separate git-head backfill commit、no extra map sync commit**。

## 4. 為什麼差這麼多 — 我的痛點變成了別人的修補

我這輪踩到並 console.error 出來的 blocker：

| 我的 blocker code | 後來變成什麼 |
|---|---|
| `ATM_TASK_CLOSE_FRAMEWORK_GATE_FAILED` (git-head-evidence missing) | **0038 修了 close-orchestration 路由**，git-head 評估可以併入 delivery 邏輯 |
| `ATM_TASK_CLOSE_DELIVERABLE_DIFF_REQUIRED` + retroactive close | **commit `7fd30277f` 修了 historical-batch delivery waiver 傳遞** |
| `ATM_TASK_DIRECTION_SCOPE_DRIFT` (一張卡多檔被另一張卡 staged) | **0049 加了 `tasks scope add` 正式 lane**，可動態擴 scope，0039+ 直接用 `scope-amendment` event |
| `ATM_TASK_CLOSE_DIRTY_WORKTREE` (跨卡 stash 來回搬) | 0038 後 deliver+close 兩個 commit 緊鄰，window 縮短，跨卡污染機會減少 |

→ **我那 80 次往返，沒有白做。** 它們把每個失敗模式變成 console-visible 的 evidence trail，agent-007 / cursor-composer-2.5 在 0038 / 0049 用這些做 regression fix。

## 5. 真正的 batch mode 不是 ATM 不准，是要會設計兩階段切點

### 5.1 我原本的盲點（已勘誤）

我先前在這節寫過「多張卡同時 close ❌」，那是**錯的**。正確認知：

| 階段 | 是否被依賴閘門擋 |
|---|---|
| `tasks reserve`（預留 task id） | ❌ 不擋 |
| **寫 code / test / schema**（純檔案編輯） | ❌ 不擋（檔案是檔案，沒人問你哪張卡） |
| `tasks claim` | ✅ 擋（要求 deps 已 done） |
| **跑 validator** | ❌ 不擋 |
| `tasks close` | ✅ 擋（必須先 claim） |
| `taskflow close --historical-batch` 連環跑 | ⚠️ 順序擋，**但每張只花秒級**（只寫 ledger） |

→ **依賴閘門只擋 claim 跟 close 時的 ledger 寫入順序，從不擋 implement 跟 validate**。我把每張卡當「mini-project」是錯的，應該當「一個 batch 裡的 row」。

### 5.2 正確 batch mode 設計：兩階段切點

```
═══ Phase I：INVENTORY（盤點期，全平行 / 不問依賴）═══
1. 對 N 張卡全部 tasks reserve（不需 claim、不擋依賴）
2. 一次寫完所有 N 張卡的 src / test / schema
3. 跑一次 validator sweep（typecheck / validate:cli / per-card tests）全綠
4. 一個或多個 atomic delivery commit（implementation 全到位）

═══ Phase II：BUILD ENVELOPE（蓋一個信封，給所有 N 張卡共用）═══
node atm.mjs evidence historical-batch \
  --tasks T-1,T-2,...,T-N --commits <sha-or-csv> \
  --validator-command ... --write --json
# → 一個 hist-batch-XXXX 信封，含全部 N 張卡的 evidence slice

═══ Phase III：RAPID CLOSE（按拓樸層次連環關，每層內可平行）═══
for level in L0 L1 L2 ... ; do
  for T in <level cards>; do
    node atm.mjs tasks reserve/promote/claim --task $T --claim-intent closeout-only
    node atm.mjs taskflow close --task $T --historical-batch <id> --write
  done
  # 該層全 close 後一個 closure commit 收口
done
```

### 5.3 為什麼這樣能省

| 維度 | 逐卡禮儀（我做的） | 兩階段切點 |
|---|---|---|
| validator 跑幾次 | N × 4-5 次 | **1 次** 全 bundle |
| atomic delivery commit | N 個 | **1 個** 或合理少數 |
| `git-head backfill` 次數 | N 次 | **1 次** |
| stash 來回 | 跨卡多次 | **0** |
| close lifecycle 寫入 | N 卡 × N 順序 | 同樣 N 次，但每次秒級且不擋 implement |
| 並行 agent 衝突點 | 散在 N 個 window | **集中於 1 個 inventory 期 + 1 個 close 期** |

### 5.4 兩階段切點的紀律（必守）

1. **進 Phase II 不准再改 code**：close 階段任何 source 變動會打破 historical-batch envelope 的 commit ↔ task 對應。
2. **stash 只能在 Phase I 內部用**：implement 期跨卡如有共享檔（例 path-to-atom-map.json），用 stash 隔離 OK；但禁止 stash 跨 phase。
3. **拓樸層次必須事前算清楚**：閉門依賴 0026 → 0024 → 0023，close 階段順序固定；但同一層內檔案 scope 不交集者可平行 claim。
4. **單一 atomic delivery commit 是理想，多 commit 也可**：重點是進 Phase II 前所有 source 在 HEAD。

## 6. 下一次再做一整批 — 給後手的 SOP

### 6.1 進入 bundle 前一次性做完

```bash
# 環境
node atm.mjs identity set --actor <me> --git-name ... --git-email ... --json
npm run build  # 別等 ATM_RUNNER_SYNC_REQUIRED 才做

# 規劃
node atm.mjs team wave plan TASK-MAO-XXXX,TASK-MAO-XXXY,TASK-MAO-XXXZ --json  # (0024 已實作)
node atm.mjs team wave dispatch TASK-MAO-XXXX,... --actor <me> --json         # (0027 已實作)
```

### 6.2 Implement 階段（**整批先寫完**）

- 每張卡的 src/test/schema/map 全部寫好
- 跑**一次**：`npm run typecheck && npm run validate:cli && npm run validate:schemas`
- 全綠才進 close 階段，**不准再改 code**

### 6.3 Close 階段（按依賴順序，**每卡 2 commit**）

對每張卡 T：

```bash
# 一次 reserve+promote+claim+scope-add+delivery commit（fold into one)
node atm.mjs tasks reserve --task T --actor <me> --title ... --json
node atm.mjs tasks promote --task T --actor <me> --json
node atm.mjs tasks claim --task T --actor <me> --files ... --json
# 若實際改的檔超出 declared scope，動態擴
node atm.mjs tasks scope add --task T --actor <me> --add <extra-file> --json

git add <T-scope-files>
node atm.mjs git commit --task T --actor <me> --message "chore(taskflow): deliver T source bundle" --json
# git commit 應自動包含 git-head.jsonl 更新（0038 之後）— 不需單獨 backfill commit

# 證據（用 recent-run 重用先前的 validator 結果）
for v in typecheck validate:cli validate:git-head-evidence <per-card-test>; do
  node atm.mjs evidence run --task T --actor <me> --command "<cmd>" --validators "$v" --recent-run --json
done

# close + 關閉 commit
node atm.mjs tasks close --task T --actor <me> --status done --json
node atm.mjs git commit --task T --actor <me> --message "chore(taskflow): close T target governance bundle" --json
```

### 6.4 跨 agent 並行守則（我踩過的坑）

| 共享資源 | 怎麼處理 |
|---|---|
| `path-to-atom-map.json` | append-only / shard-safe，最後一個寫 = 那張卡的 deliver 一起寫；別預先 batch append（會跟並行 agent 衝突） |
| `git config user.*` | repo-local single slot，多 agent 共用 — **每次 commit 前重 set identity** 或接受 commit 失敗即重試 |
| `.git/index` | 共享 — staging 之間用 `git stash push -- <pathspec>` 隔離；**不要假設你 stage 完到 commit 之間沒人動** |
| `release/atm-onefile/atm.mjs` | 被 build 改、被 release 改 — 不要把它列進你 bundle scope |
| 其他卡的 task ledger 變更 | 別 stage 進你的 commit；用 pathspec 精準 add |

### 6.5 想用 historical-batch lane（真正的「批次收口」）

**只在以下情境用**：你已經把 N 張卡的 source code 全 commit 進 HEAD（**但卡都還是 planned/running**），要一次性掛 evidence 並 close：

```bash
node atm.mjs evidence historical-batch \
  --tasks T-A,T-B,T-C --commits <sha-A>,<sha-B>,<sha-C> \
  --actor <me> \
  --validator-command "npm run typecheck" --validator-command "npm run validate:cli" \
  --write --json
# 然後對每張卡：
for T in T-A T-B T-C; do
  node atm.mjs taskflow close --task $T --actor <me> --historical-batch <id> --write --json
done
```

→ 我的 Phase 0 失敗就是用錯時機（卡已經 done 或還 planned 但 source code 不在 HEAD）。**0038/7fd30277f 之後這條 lane 才真的好用**。

## 7. 給規劃者的回饋

1. **Bundle 越小越好**：我用 A1/A2/A3 切 3 張一組 OK；但 0024 把整個 `broker/` 列 scope 就反咬自己（0026/0028 也寫 broker → 0024 stale）。**deliverables 用具體檔名，scopePaths 也用具體檔名，不要用 directory prefix**。
2. **驗證器要可 amortize**：卡的 validators 列裡放 `npm run typecheck` 這種 repo-level 的，每張卡都會跑一次。能否定義 `bundle validators` 共用？
3. **`team wave dispatch` 該真的整合進 taskflow open**：我蓋的 0027 dispatch 寫了 envelope 但 taskflow open 沒讀，下次 dogfood 要把這條接起來。

## 8. 一張表結論

| 維度 | 我的做法 | 0039+ 做法 | 給未來的建議 |
|---|---|---|---|
| commit / 卡 | 3-4 | 2 | 2（用 0038 後的 deliver+close lane） |
| validator 跑幾次 | 每卡 4-5 次 | 每卡 ≤2 次（共用） | bundle 內共用，`--recent-run` |
| stash 來回 | ≥5 次 | 0 次 | implement 完才進 close 階段 |
| 並行 agent 衝突 | 4 次 (map / index / identity / team-wave.ts) | <1 次 | 知道熱點：map / index / identity |
| 規劃 token 浪費 | 高 | 低 | 用 `team wave plan` 預先看依賴鏈 |
| **總體** | **學習成本付清** | **省下來的成本可以投資別處** | **不必再重學一次** |

---

## 9. 自我評估

- ✅ 把 Wave Mode 從 spec 寫到實作到 dogfood，spec / planner / admission / envelope / worker report / evidence / checkpoint / closeout guard 全部交付。
- ✅ 把所有失敗模式留成 console.error trail，agent-007 在 0038 用上了。
- ❌ **沒**走 Plan Phase B2 的 historical-batch lane（因為時機不對，但這是我該事前判斷的）。
- ⚠️ 跨 agent 並行守則是「踩坑學的」，下次該預先讀一遍 0037 / 0049 / 0038 的 commit 才開工。

**結論**：這輪是「先驅者付學費」的位置。學費已交完，後手 0039–0051 直接拿便宜票。
