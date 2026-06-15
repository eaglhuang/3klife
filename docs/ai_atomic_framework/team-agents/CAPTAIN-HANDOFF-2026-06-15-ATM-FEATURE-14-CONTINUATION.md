# Captain Handoff - ATM Feature 14 Continuation

Created: 2026-06-15
Owner: ATM Captain
Thread title: `自動化控制台 - 隊長開發ATM功能14`
Target repo: `C:\Users\User\AI-Atomic-Framework`
Planning repo: `C:\Users\User\3KLife`
Status: active continuation, blank captain thread requested

## New Thread Opening Prompt

Paste this into the new blank Codex conversation:

```text
請把這個新對話群標題視為：自動化控制台 - 隊長開發ATM功能14

你是新的 ATM Captain continuation thread。

Planning repo: C:\Users\User\3KLife
Target repo: C:\Users\User\AI-Atomic-Framework

不要假設任何先前聊天歷史。只根據本機 workspace 狀態與這份交接文件開始。請使用繁體中文，維持 Captain 模式，但不要空泛角色扮演。

Skill used: atm-dispatch
Delegation mode: internal sidecar default；外部 dispatch 是 opt-in，外部 write 必須等使用者明確授權 scope。

第一步完整遵守 repo 入口：
1. 讀 C:\Users\User\AI-Atomic-Framework\README.md
2. 從 C:\Users\User\AI-Atomic-Framework 執行：
   node atm.mjs next --prompt "Captain continuation for ATM feature 14 mainline and PAPER-A dispatch" --json
3. 如果 next 回傳 ATM_USER_NOTICE 或 evidence.userNotice，先展示給使用者
4. 讀 evidence.nextAction.playbook 後才做任何編輯、提交、closeout
5. 這是 ATM framework repo，沒有 keep.md / keep.summary.md 是正常現象

接著再讀：
1. C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\CAPTAIN-HANDOFF-2026-06-15-ATM-FEATURE-14-CONTINUATION.md
2. C:\Users\User\3KLife\docs\ai_atomic_framework\ATM_BUG_OPTIMIZATION_BACKLOG.md
3. C:\Users\User\3KLife\docs\ai_atomic_framework\team-agents\TEAM_AGENTS_CAPTAIN_LED_SOP.md

開場先回報：
- 你讀到的目前狀態
- AI repo / 3KLife dirty 清單
- 主線與論文支線的分工節奏
- 你第一個要執行的命令

重要：Captain 只做決策、治理、收斂、派工；不要再自己把 PAPER-A 側線一路做到底。
```

## Core Rules

- ATM 是產品、框架、CLI、治理流程名稱；AI-Atomic-Framework 只是 repo 名稱，不要把 ATM 簡稱成 AAF。
- 先跑 `node atm.mjs next --prompt "..." --json`，讀 playbook，再動手。
- 不要用 `--no-verify`、`--force`、`SAFE_MODE`、`git reset --hard`、`git checkout --`、`git clean`。
- 不要提交 `.atm/runtime/team-runs/`。
- Team Agents preference 已被使用者明確指定：每張 task 開始前盡量都跑 `team plan` / `team validate` / `team start`。
- 若不能啟動 Team Agents，必須明說原因：ATM bug、task card、dependency gate、scope conflict、capability gap 其一。
- Captain 預設只用 internal sidecar 做 preflight / review / checklist；外包只在使用者明確希望派工時啟用。

## What Just Happened

這一輪 Captain 有兩個重要結果：

1. 主線前置收斂
- bug backlog router 已提交
- Team Agents path normalization 的 `TASK-TEAM-0030` 已完成
- `TASK-AAO-0124` 已做 planning closeback sync，TEAM-0030 也已開完

2. 論文支線 PAPER-A 被推得太深
- 使用者原本要的是「Captain 接 MAO-0005 closeback，其他交給 004 / 007 / 008 派工收斂」
- 但 Captain 實際又把 `TASK-MAO-0006` 也親自走完 closeback
- 使用者已明確糾正：之後 PAPER-A 要回到「Captain 派工/治理，worker 實作/回報」節奏

這個糾正必須保留，下一位隊長不要再重演。

## Confirmed Completed State

### AI-Atomic-Framework commits

- `ba1d50df3` `docs(skills): add repo-aware bug backlog router`
- `855ad1cfc` `docs(governance): record team agents planning path blocker`
- `f29e8d148` `chore(task): release TASK-AAO-0118 claim`
- `c135f706` planning-side sync for `TASK-AAO-0124` and `TASK-TEAM-0030`
- `898d97515` `fix(team): normalize team lease target paths`
- `e49365ef5` `chore(task): add TASK-TEAM-0030 git-head evidence`
- `46264c4cc` `chore(task): close TASK-TEAM-0030`
- `962aa3003` `chore(task): prepare TASK-MAO-0005 closeback`
- `e037ff1ed` `chore(taskflow): close TASK-MAO-0005 target governance bundle`
- `e41539cdd` `chore(task): prepare TASK-MAO-0006 closeback`
- `ba9a0bdc6` `chore(taskflow): close TASK-MAO-0006 target governance bundle`

### 3KLife commits

- `513c5d0d` `docs(team): sync TASK-TEAM-0030 closeback`
- `67919582` `docs(taskflow): close TASK-MAO-0005 planning bundle`
- `3a7abec1` `docs(taskflow): close TASK-MAO-0006 planning bundle`

### Verified task states

- `TASK-MAO-0005`: done, no residue
- `TASK-MAO-0006`: done, no residue
- `TASK-MAO-0010`: still planned
- `TASK-TEAM-0030`: done

## Current Dirty State

### AI repo dirty / untracked

Keep untouched unless the next governed task explicitly covers them:

```text
M  release/atm-onefile/atm.mjs
M  release/atm-onefile/release-manifest.json
M  release/atm-root-drop/README.md
M  release/atm-root-drop/packages/cli/dist/commands/team.d.ts
M  release/atm-root-drop/packages/cli/dist/commands/team.js
M  release/atm-root-drop/packages/cli/src/commands/team.ts
M  release/atm-root-drop/release-manifest.json
?? .atm/history/task-events/TASK-MAO-0010/
?? .atm/history/tasks/TASK-MAO-0010.json
?? .atm/runtime/team-runs/
?? docs/reports/mao-parallel-routing-benchmark.md
?? scripts/fixtures/mao-parallel-routing/
?? scripts/lib/mao-parallel-routing-benchmark-runner.ts
?? scripts/validate-mao-parallel-routing.ts
```

Interpretation:

- `release/**` is stale runner/build output, not automatically part of the next task.
- `.atm/runtime/team-runs/` is runtime only, never commit.
- `TASK-MAO-0010` files are active PAPER-A draft implementation artifacts and ledger import state.

### 3KLife dirty / untracked

```text
M  docs/ai_atomic_framework/ATM_BUG_OPTIMIZATION_BACKLOG.md
M  docs/ai_atomic_framework/multi-agent-orchestration/tasks/TASK-MAO-0010-multi-agent-simulator-benchmark.task.md
?? docs/ai_atomic_framework/team-agents/CAPTAIN-HANDOFF-2026-06-15-TEAM-AGENTS-0016-CONTINUATION.md
?? docs/ai_atomic_framework/team-agents/CAPTAIN-HANDOFF-2026-06-15-ATM-FEATURE-14-CONTINUATION.md
```

Interpretation:

- `ATM_BUG_OPTIMIZATION_BACKLOG.md` is unrelated carryover; do not fold into task commits casually.
- `TASK-MAO-0010` card was already scope-synced and is part of PAPER-A.
- The older TEAM-0016 handoff file is unrelated carryover.
- This current handoff file is new and should be preserved.

## Mainline vs PAPER-A

### Mainline

Captain must return attention to ATM core / Team Agents mainline.

Priority order:

1. `TASK-AAO-0124`
   - normalize absolute and relative paths in task direction and hook scope checks
   - rationale: close to hook scope / direction lock / commit gate core
2. `TASK-AAO-0118`
   - opener-first active-claim commit guard MVP
3. Keep Team Agents dogfood-first behavior for future AAO/RFT/APO/APF work

### PAPER-A

PAPER-A is valid and important, but should run as a dispatched side line.

Goal: walk the paper support path through `TASK-MAO-0010` without letting Captain become the implementer for every subtask.

Current state:

- `TASK-MAO-0005`: done
- `TASK-MAO-0006`: done
- `TASK-MAO-0007`: not closed yet; closeback readiness already studied by 007
- `TASK-MAO-0008`: implementation handoff shape already studied by 007
- `TASK-MAO-0009`: still gated by 0008
- `TASK-MAO-0010`: planned; draft files already exist in AI repo

## Adopted PAPER-A Operating Rhythm

This is the rhythm the user explicitly wanted:

1. Captain handles the minimum governed closeback that truly needs Captain ownership.
2. 004 handles implementation/reconciliation work where actual code or tests are needed.
3. 007 prepares implementation handoff for follow-on repair cards.
4. 008 maintains the governance playbook / control table.
5. Captain synthesizes, decides sequence, and only performs lifecycle/commit/close work when needed.

The user specifically called out that the Captain should use:

- cheap internal sidecar for review / checklist / grep / preflight
- practical external workers for actual implementation or larger audits

Do not drift back into soloing the entire PAPER-A chain.

## Recommended Dispatch Table

### 004

Role:
- PAPER-A implementation/reconciliation worker

Next intended lane:
- review `TASK-MAO-0006` result and transition to `TASK-MAO-0007` or `TASK-MAO-0010` implementation support

Immediate suggestion:
- do not re-open 0006 unless evidence shows a defect
- instead prepare a practical `MAO-0010` implementation brief using the already-present draft runner/fixtures/report

### 007

Role:
- implementation handoff writer for `TASK-MAO-0008`

Next intended lane:
- maintain the exact `patch-envelope` implementation brief
- wait for `TASK-MAO-0007` closeback gate before pushing 0008 implementation

### 008

Role:
- PAPER-A governance controller

Next intended lane:
- keep the v2 governance playbook as the route-control table
- update the sequence to reflect that 0005 and 0006 are now already done
- make the next control point `0007 -> 0008 -> 0009 -> 0010`

## Short / Mid / Long Plan

### Short term

1. Re-establish Captain discipline:
   - mainline first
   - PAPER-A by dispatch, not by Captain solo implementation
2. Start `TASK-AAO-0124` with Team Agents:
   - `team plan`
   - `team validate`
   - `team start`
   - then ATM claim/playbook
3. In parallel, ask 008 to refresh PAPER-A control table now that `MAO-0005` and `MAO-0006` are closed

### Mid term

1. Move PAPER-A through the remaining dependency chain:
   - `TASK-MAO-0007` closeback
   - `TASK-MAO-0008` implementation + closeback
   - `TASK-MAO-0009` closeback
   - `TASK-MAO-0010` implementation and closure
2. Keep Team Agents dogfood-first on AAO/RFT/APO/APF cards
3. For refactor-shaped cards, prefer `atm-atom-map-refactor` guardrails before implementation

### Long term

1. Reach `TASK-MAO-0010` completion with evidence good enough for the paper line
2. After Team Agents cooperation patterns stabilize, continue remaining non-core tasks by closeness to ATM operating core
3. Use bug backlog routing consistently for ATM bugs vs adopter/project bugs

## If You Start TASK-AAO-0124

Preferred sequence:

1. Read README
2. `node atm.mjs next --prompt "<current user request>" --json`
3. `node atm.mjs team plan --task TASK-AAO-0124 --json`
4. `node atm.mjs team validate --task TASK-AAO-0124 --json`
5. if `safeToStart=true`, `node atm.mjs team start --task TASK-AAO-0124 --actor <id> --json`
6. then claim/playbook/validators/evidence/close

Captain report should include:

- Team run id
- Team plan conclusion
- Captain decision
- suggested roles
- validation / blockers
- final cooperation result

## If You Start PAPER-A Again

Do not jump straight into code.

Use this order:

1. 008 updates the governance control table for actual state
2. 007 keeps the `MAO-0008` implementation brief current
3. 004 takes the next implementation-heavy lane
4. Captain only executes the minimum lifecycle/governance step necessary

Current sequence to `MAO-0010`:

1. `TASK-MAO-0007`
2. `TASK-MAO-0008`
3. `TASK-MAO-0009`
4. `TASK-MAO-0010`

## Explicit Warning

The last Captain thread already made this mistake:

- it correctly closed `MAO-0005`
- then it also personally pushed `MAO-0006` end-to-end

The user called this out as overreach.

That means the next Captain must preserve this correction:

- Captain decides, dispatches, and closes
- workers implement, audit, and prepare

## First Report Expected From The New Captain

The new thread should start by reporting:

```text
我已讀 README 與 handoff。主線判斷是回到 AAO-0124，PAPER-A 保持 dispatch 節奏並以 MAO-0010 為里程碑。現在先回報 AI repo / 3KLife dirty 狀態，接著跑 ATM next 與 Team Agents preflight，避免再把 Captain 帶進 PAPER-A 實作深水區。
```
