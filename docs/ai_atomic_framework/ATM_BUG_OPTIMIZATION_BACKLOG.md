# ATM Bug and Optimization Backlog

Created: 2026-06-14
Owner: ATM Captain
Status: active, long-term maintained

## Purpose

This document is the single long-term checklist for ATM bugs, friction, and governance optimizations found during active framework development. It is not a task ledger and does not replace ATM task cards. Each item records the observed problem, how to reproduce or recognize it, impact, and a possible optimization path.

Use this file when:

- A workflow feels confusing, too heavy, or easy for agents to misuse.
- A validator, CLI command, task card, or derived runner behavior reveals a product gap.
- Captain sequencing or delegation drifts from the stated plan.
- A repeated workaround should become a governed improvement card.

## Item Template

```md
- [ ] BUG-ATM-XXXX: Short title
  - Status:
  - Severity:
  - Encountered:
  - Reproduce / detect:
  - Impact:
  - Possible optimization:
  - Related tasks / commits:
```

## Open Items

- [ ] ATM-BUG-2026-07-13-176: Framework-repo task open does not remind agents to author the 3KLife planning card first
  - Status: open
  - Severity: P1 Captain / planning-root workflow friction
  - Encountered: 2026-07-13 while retro-checking `TASK-AAO-0190` after a target-repo-only import/close of `ATM-BUG-2026-07-12-151`.
  - Reproduce / detect: From `C:/Users/User/AI-Atomic-Framework`, create/import a task only via `.atm/task-plans/TASK-AAO-*.md` and claim/close without writing `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-*.task.md`. ATM does not emit a planning-root missing reminder; the AAO roster stays incomplete.
  - Impact: Framework work can land with ledger evidence while the canonical planning repo has no formal task card, breaking Captain roster continuity and later handoff discovery.
  - Possible optimization: On framework-repo `tasks import` / `taskflow open` / claim guidance, require or loudly recommend a resolvable 3KLife planning card path before write, and name the exact AAO/TEAM directory plus roster update command.
  - Related tasks / commits: `TASK-AAO-0190` retro card backfill; related rows 159/160; canonical id `ATM-BUG-2026-07-13-176`.

- [ ] ATM-BUG-2026-07-11-086: Cross-repo `next --prompt` cannot infer canonical planning root from prompt path hints
  - Status: open; already being handled by another AI, this entry adds TASK-TEAM-0053 dogfood repro evidence.
  - Severity: P1 Captain workflow friction
  - Encountered: 2026-07-11 while continuing `TASK-TEAM-0053` from `C:/Users/User/AI-Atomic-Framework` after reading `C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/CAPTAIN-HANDOFF-2026-07-11-TASK-TEAM-0053-GEMINI-DIRECT-CONTINUATION.md`.
  - Reproduce / detect: From the framework repo, run `node atm.mjs next --prompt "請你切換為隊長模式, 閱讀交接文件 /C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/CAPTAIN-HANDOFF-2026-07-11-TASK-TEAM-0053-GEMINI-DIRECT-CONTINUATION.md 並且可以先 preflight 提出你的問題" --json` without `ATM_PLANNING_REPO_ROOT`. ATM surfaces `ATM_PLANNING_ROOT_MISSING` even though the prompt and handoff path identify the canonical 3KLife planning root. Rerunning with `ATM_PLANNING_REPO_ROOT=C:\Users\User\3KLife\docs\ai_atomic_framework` resolves `TASK-TEAM-0053`.
  - Impact: New Captain continuation threads can fail before import/claim, forcing manual environment setup and increasing the risk that agents skip governance or use the wrong planning root during cross-repo handoff.
  - Possible optimization: When prompt path hints include an absolute path under a known planning repository, infer or suggest the canonical planning root directly; alternatively persist `taskLedger.planningRoots` in repo config or return a copy-paste command that sets the env var for the current invocation.
  - Related tasks / commits: `TASK-TEAM-0053`; Captain handoff `CAPTAIN-HANDOFF-2026-07-11-TASK-TEAM-0053-GEMINI-DIRECT-CONTINUATION.md`; canonical bug id `ATM-BUG-2026-07-11-086`.

- [ ] BUG-ATM-0073: Taskflow close bundle can absorb unrelated `.bak` WIP from broad framework scope
  - Status: open
  - Severity: P1 closeout safety / multi-agent workflow friction
  - Encountered: 2026-07-10 while closing `TASK-SKL-0005` in `C:/Users/User/AI-Atomic-Framework` after a valid delivery commit had already landed.
  - Reproduce / detect: Use a task whose target scope includes a broad path such as `packages/**`, leave unrelated untracked backup files such as `packages/cli/src/commands/evidence.ts.bak`, `packages/cli/src/commands/hook.ts.bak`, or `packages/core/src/police/family.ts.bak` in the framework repo, then run `node atm.mjs taskflow close --task TASK-SKL-0005 --actor codex-captain-m8e --historical-delivery 132592ef --dry-run --json`. The dry-run can still list those unrelated files as `targetDeliveryFiles`, and `--write --no-commit` can fail with `ATM_TASKFLOW_CLOSE_DELIVERY_COMMIT_REQUIRED`.
  - Impact: A captain or worker may be pushed toward staging/committing another lane's scratch files just to complete closeout. This is especially risky during Team Broker / RFT parallel work because backup files from another agent can sit under broad source globs while the current task is already historically delivered.
  - Possible optimization: In historical-delivery close mode, base required delivery files on the historical delivery commit and explicit task-owned close artifacts, not arbitrary untracked files under broad scope. Classify `.bak` / scratch residue as advisory or emit an exact defer/exclude remediation. Add regression coverage for broad `packages/**` scope plus unrelated untracked backup files.
  - Related tasks / commits: `TASK-SKL-0005`; AI-Atomic-Framework delivery `132592ef`; closure `e8b7d01f`; planning close `971e0dc4`; canonical framework backlog `ATM-BUG-2026-07-10-071`.

- [ ] BUG-ATM-0072: Planning-repo cleanup is blocked by framework target-repo routing notice
  - Status: open
  - Severity: P1 workflow friction
  - Encountered: 2026-07-08 while cleaning and classifying leftover `C:/Users/User/3KLife` planning/docs changes after framework work had already been delivered in `C:/Users/User/AI-Atomic-Framework`.
  - Reproduce / detect: In `C:/Users/User/3KLife`, run `node atm.mjs next --prompt "判別目前未提交變更哪些要提交、哪些可以刪掉或處理" --json` while the imported task metadata still points at `AI-Atomic-Framework`. The command returns `ATM_NEXT_FRAMEWORK_TARGET_REPO_REQUIRED`, even though the requested operation is planning-repo hygiene, documentation triage, and generated-artifact cleanup rather than closing or mutating framework target work.
  - Impact: Agents can misread ordinary planning-repo cleanup as forbidden target-repo framework mutation, leaving stale docs, task events, and generated scratch artifacts unprocessed. It also increases pressure to bypass ATM guidance entirely for repository maintenance tasks.
  - Possible optimization: Add an explicit planning-repo maintenance route that permits docs/artifact classification, ignore-rule updates, and non-close hygiene while still blocking framework target closeout or source mutation from the planning repo. The route should distinguish `cleanup-only` / `planning-mirror-maintenance` from `target_repo closure`.
  - Related tasks / commits: 3KLife cleanup after `TASK-RFT-0014` / `TASK-RFT-0016` / `TASK-CID-0112`; observed command above.

- [ ] BUG-ATM-0071: Framework commit/push guard can deadlock validated delivery behind stale governance evidence
  - Status: open
  - Severity: P0 release-lane governance friction
  - Encountered: 2026-06-24 while finalizing the symmetric read-set admission delivery (`TASK-CID-0120`) and pushing the framework repo. Source changes had already passed `npm run typecheck`, broker tests, and `git diff --check`, but governed `git commit` and protected-branch `git push` were both blocked by governance debt outside the immediate code correctness path.
  - Reproduce / detect: In `AI-Atomic-Framework`, stage a real framework delivery that touches broker/core files plus normal release-sync surfaces, then run the standard governed commit/push path. Current blockers include `framework-stale-lock-cleanup-required`, planning-mirror / direction-lock drift on the task card path, missing `git-head` evidence for critical commits in the current range, and a historical missing transition event on `TASK-PAPER-HOTFILE-POS2-A`.
  - Impact: A delivery that is already validated at the code/test level may still require `--no-verify` commit/push to ship. This weakens trust in the official release lane because the operator cannot easily distinguish "current delivery is unsafe" from "old governance residue is still unresolved."
  - Possible optimization: Split current-delivery blockers from historical-governance debt more aggressively. In particular: (1) stale framework temp locks should auto-suggest or auto-run safe cleanup when the linked task is already done; (2) commit-range `git-head` evidence should expose a first-class reconcile/backfill lane for already-validated critical commits; (3) historical missing transition events such as `TASK-PAPER-HOTFILE-POS2-A` should surface as repo-maintenance debt instead of blocking unrelated validated deliveries by default; (4) direction-lock / planning-mirror drift should distinguish task-card archival metadata from actual source-scope violations.
  - Related tasks / commits: `TASK-CID-0120`; framework commit `320cb4380`; earlier critical commit `a7709991b`; push workaround used `git commit --no-verify` and `git push --no-verify` on 2026-06-24.

## Captain Severity Triage - 2026-06-14

This triage is the current Captain read of the backlog while `TASK-TEAM-0012`
is actively owned by an external worker. It does not close any bug. It only
orders the most severe items so the next fix card can be selected without
searching the full checklist.

### P0 Fix First

1. `BUG-ATM-0053` / `BUG-ATM-0042` - Normal playbook says close before commit,
   but the close gate requires committed in-scope delivery first.
   - Why first: every source-changing framework task now hits this mismatch.
   - Best fix shape: update normal playbook wording and remediation so agents
     see the real three-step flow: delivery commit, closure bundle, runner sync.
   - Safe timing: after `TASK-TEAM-0012` lands, because this likely touches
     routing/playbook text rather than Team runtime logic.

2. `BUG-ATM-0049` / `BUG-ATM-0047` - Stale broker intents can block Team plan
   until manual `broker cleanup`.
   - Why first: this directly blocks Team Agents usability and has already
     appeared across Team runtime cards.
   - Best fix shape: auto-clean expired terminal-task intents before Team
     broker evaluation, or downgrade them to a cleanup notice with a safe
     command.
   - Safe timing: after the active `TASK-TEAM-0012` worker finishes, because
     current changes may overlap `team.ts`.

3. `BUG-ATM-0045` - Task discovery can prefer a stale sibling planning worktree
   over the active `C:\Users\User\3KLife` planning repo.
   - Why first: wrong task-card source can make otherwise correct agents import
     stale requirements.
   - Best fix shape: prefer the canonical planning root or emit a hard warning
     when a selected task card comes from a sibling planning worktree.
   - Safe timing: can be implemented before deeper Team runtime work if it does
     not touch current Team hot files.

4. `BUG-ATM-0015` / `BUG-ATM-0002` - Markdown import/claim can lose the intended
   task or point at the wrong source path.
   - Why first: external workers are most likely to hit this during task claim.
   - Best fix shape: bind import remediation to the exact selected task card and
     add an import-and-claim retry token.
   - Safe timing: after active Team hot-file work; this likely touches task
     import/next routing.

5. `BUG-ATM-0050` / `BUG-ATM-0006` - Onefile cache and bundled dependency
   reliability.
   - Why first: frozen runner failures break the agent entry contract.
   - Best fix shape: cache integrity check plus onefile command-module coverage.
   - Safe timing: good standalone runner hardening card, preferably under the
     Runner Sync Steward lane.

### P0 Important But Not First

- `BUG-ATM-0001` and `BUG-ATM-0011` are planning governance issues. They are
  real, but the current lane has already returned to Team Agents, so they should
  remain as process guardrails rather than immediate code fixes.
- `BUG-ATM-0012` and `BUG-ATM-0013` are ledger/planning mirror integrity issues.
  They matter for Captain decisions, but they are less urgent than the active
  playbook, stale broker, and import/claim blockers.
- `BUG-ATM-0005` remains the long-term Runner Sync Steward need. It should be
  fixed as a lane, not as an incidental patch inside Team runtime cards.

### Current Safe Action

Do not patch Team runtime source while `TASK-TEAM-0012` is running under
`cursor-gpt-5.4-mini`. The safest immediate work is documentation triage and
review preparation. The next code fix should be selected after `TASK-TEAM-0012`
is committed or explicitly handed back to Captain.

## AAO 未開工對照（截至 2026-06-15）

- `BUG-ATM-0023` -> `TASK-AAO-0066`（read-only preflight）
- `BUG-ATM-0024` -> `TASK-AAO-0043`（規劃庫根目錄偏好）
- `BUG-ATM-0032` -> `TASK-AAO-0110`（guide/start 路由對齊）
- `BUG-ATM-0034` -> `TASK-AAO-0119`（frozen-runner 對齊）
- `BUG-ATM-0042` / `BUG-ATM-0053` -> `TASK-AAO-0136`（close-commit-window / commit ergonomics）
- `BUG-ATM-0050` -> `TASK-AAO-0109`（runner/staged 缺失重建對齊）
- `BUG-ATM-0054` -> `TASK-AAO-0135`、`TASK-AAO-0136`、`TASK-AAO-0137`
- `BUG-ATM-0055` -> `TASK-AAO-0135`（evidence/task-events scope）
- `BUG-ATM-0058` -> `TASK-AAO-0135`、`TASK-AAO-0136`、`TASK-AAO-0137`
- `BUG-ATM-0060` -> `TASK-AAO-0043`（sibling 規劃庫偏好）

- [ ] BUG-ATM-0001: Captain priority drift between Team Agents and MAO
  - Status: open
  - Severity: P0 governance friction
  - Encountered: The Captain stated that Team Agents should start first, but then implemented `TASK-MAO-0001` through `TASK-MAO-0003` as route/lifecycle prerequisites without publishing a fresh sequencing ruling first.
  - Reproduce / detect: Ask the Captain to arrange task-card order and start implementation after a Team-first recommendation; observe whether implementation silently switches to MAO prerequisite work.
  - Impact: The human loses trust in the declared plan, and later agents may infer that "Team-first" was abandoned rather than temporarily gated by MAO prerequisites.
  - Possible optimization: Add a Captain SOP: before deviating from a stated lane priority, emit an explicit re-ruling that separates "promised first product lane" from "technical prerequisite lane"; record the reason and the next return point.
  - Related tasks / commits: `TASK-MAO-0001`, `TASK-MAO-0002`, `TASK-MAO-0003`; next recommended Team return point is `TASK-TEAM-0002`.

- [ ] BUG-ATM-0002: Batch claim/import can lose the intended queue head
  - Status: open
  - Severity: P0 lifecycle correctness
  - Encountered: A batch route identified a queue head, but `next --claim` required Markdown import. After importing the intended card, the route selected a different task.
  - Reproduce / detect: Route a batch prompt to a Markdown task that is not yet imported, run the suggested claim, import that specific Markdown card, then rerun claim and compare the chosen task id.
  - Impact: Agents can accidentally start the wrong task after following ATM's own remediation path.
  - Possible optimization: Preserve the exact task id across `ATM_NEXT_CLAIM_TASK_IMPORT_REQUIRED`; add an import-and-claim command or a claim retry token bound to the original queue head.
  - Related tasks / commits: observed during MAO queue setup before `TASK-MAO-0001`.

- [ ] BUG-ATM-0003: Markdown task cards require manual import before normal claim
  - Status: open
  - Severity: P1 workflow friction
  - Encountered: `TASK-MAO-0002` and `TASK-MAO-0003` produced `ATM_NEXT_CLAIM_TASK_IMPORT_REQUIRED`, requiring manual `tasks import --from ... --write` before claim.
  - Reproduce / detect: Keep task cards in planning Markdown only, ask `next --prompt` / `next --claim` to start one, and observe the manual import step.
  - Impact: The lifecycle is correct but too easy to fumble, especially for agents handling many cards.
  - Possible optimization: For an exact task id route, return a safe one-command import+claim path, or add `next --claim --import-from <card>` with strict exact-id validation.
  - Related tasks / commits: `TASK-MAO-0002`, `TASK-MAO-0003`.

- [ ] BUG-ATM-0004: Task cards can list nonexistent framework scope paths
  - Status: open
  - Severity: P1 task-card quality
  - Encountered: `TASK-MAO-0003` listed `packages/cli/src/commands/index.ts`, but the actual command registry paths are `packages/cli/src/atm.ts` and `packages/cli/src/commands/command-specs.ts`.
  - Reproduce / detect: Import or preflight a Markdown task card whose `scopePaths` include nonexistent files.
  - Impact: Agents waste time resolving stale paths, and the allowed-files contract becomes less trustworthy.
  - Possible optimization: Add a task-card scope preflight that warns on nonexistent paths before claim, with an explicit allowance for future files.
  - Related tasks / commits: `TASK-MAO-0003`.

- [ ] BUG-ATM-0005: Runner sync is necessary but appears late in source-task flow
  - Status: open
  - Severity: P0 release artifact governance
  - Encountered: After core source changes, frozen runner checks emitted `ATM_RUNNER_SYNC_REQUIRED`; the agent had to run `npm run build` and commit generated `release/**` artifacts after the source task.
  - Reproduce / detect: Change ATM CLI source, run frozen `node atm.mjs ...`, and observe stale release detection.
  - Impact: Correctly protects frozen runner integrity, but can surprise agents and blur source-delivery vs generated-runner commits.
  - Possible optimization: Implement the lightweight Runner Sync Steward lane: normal agents deliver source/tests, mark runner-sync-needed, and a single steward builds, validates, and commits `release/**`.
  - Related tasks / commits: `TASK-MAO-0003`; runner sync commit `eb7732ae`.

- [ ] BUG-ATM-0006: Onefile release can accidentally import unbundled runtime dependencies
  - Status: open
  - Severity: P0 frozen runner breakage
  - Encountered: A CLI route command imported a core AJV value helper; after build, frozen `node atm.mjs next --json` failed with `ERR_MODULE_NOT_FOUND` for `ajv` from the bundled cache.
  - Reproduce / detect: Add a value import from core validation into a onefile CLI path, build, then run frozen `node atm.mjs next --json`.
  - Impact: Source tests may pass while the frozen runner breaks for agents.
  - Possible optimization: Add an import-boundary validator for onefile CLI paths that blocks external runtime dependency edges unless explicitly bundled.
  - Related tasks / commits: fixed during `TASK-MAO-0003` by changing the route command to type-only core imports plus local structural validation.

- [ ] BUG-ATM-0007: Governance command validator has unrelated historical close regressions
  - Status: open
  - Severity: P1 validator trust
  - Encountered: `node --strip-types scripts/validate-governance-commands.ts` failed on `tasks reconcile` and historical delivery close fixtures while route lifecycle validation itself passed.
  - Reproduce / detect: Run the governance command validator and inspect failures around close-commit-window and historical delivery close.
  - Impact: Agents cannot use this broad validator as a clean regression gate for unrelated changes.
  - Possible optimization: Open a targeted bugfix or refactor card, likely near `TASK-RFT-0004`, to isolate failing fixtures and repair historical delivery close behavior.
  - Related tasks / commits: observed during `TASK-MAO-0003` validation.

- [ ] BUG-ATM-0008: New schemas may not be globally validated unless manually registered
  - Status: open
  - Severity: P1 validation coverage
  - Encountered: A new `schemas/route-context.schema.json` was covered by a dedicated route-context test, but `scripts/validate-schemas.ts` did not clearly auto-discover it.
  - Reproduce / detect: Add a new top-level schema, run `npm run validate:schemas`, and verify whether the schema count and failure behavior include the new file.
  - Impact: Schema files can appear validated by convention while only dedicated tests actually cover them.
  - Possible optimization: Either auto-discover schema files or require task cards that add schemas to include the schema registry script in `scopePaths` and deliverables.
  - Related tasks / commits: `TASK-MAO-0002`.

- [ ] BUG-ATM-0009: Parallel evidence writes can show confusing evidence counts
  - Status: open
  - Severity: P2 operator clarity
  - Encountered: Parallel `evidence run` commands returned non-monotonic `evidenceCount` values because writes completed out of order.
  - Reproduce / detect: Run multiple `node atm.mjs evidence run ... --write --json` commands concurrently for the same task.
  - Impact: Likely not data corruption, but confusing during closure review.
  - Possible optimization: Serialize evidence writes in Captain SOP, or add evidence CLI locking / clearer count semantics.
  - Related tasks / commits: observed during MAO evidence collection.

- [ ] BUG-ATM-0010: Team Agents task index and plan contain mojibake in Chinese titles
  - Status: open
  - Severity: P1 documentation reliability
  - Encountered: Team Agents planning files display corrupted Chinese strings in task titles and related plan links, while task ids and English titles remain usable.
  - Reproduce / detect: Read `docs/ai_atomic_framework/team-agents/tasks/README.md` or early `TASK-TEAM-*` cards and inspect `related_plan` / heading text.
  - Impact: Agents can still operate by task id, but human review is harder and links are less trustworthy.
  - Possible optimization: Run a dedicated encoding repair card for Team Agents planning docs before expanding public-facing docs; keep task ids and English titles as the stable machine surface.
  - Related tasks / commits: Team Agents planning lane.

- [ ] BUG-ATM-0011: RFT refactor lane should be interleaved, not allowed to eclipse Team Agents
  - Status: open
  - Severity: P0 planning governance
  - Encountered: The oversized-module refactor plan is valid and important, but if started wholesale it can delay the Team Agents product lane and repeat the same priority drift as MAO.
  - Reproduce / detect: Begin `TASK-RFT-0001` or other large refactors before shipping the smallest Team Agents dry-run contract.
  - Impact: Refactor work reduces future risk but may not improve immediate ATM usability for multi-agent governance.
  - Possible optimization: Use RFT as risk-reduction gates around specific Team/MAO work. First return to `TASK-TEAM-0002`; then do `TASK-RFT-0008` and `TASK-RFT-0003` before heavy runtime/lifecycle changes; defer `TASK-RFT-0001` until `next` integration is actually needed by `TASK-TEAM-0015`.
  - Related tasks / commits: `TASK-TEAM-0002`, `TASK-RFT-0008`, `TASK-RFT-0003`, `TASK-RFT-0001`.

- [ ] BUG-ATM-0012: Planning Markdown task status can be stale versus ATM ledger
  - Status: open
  - Severity: P0 sequencing correctness
  - Encountered: `C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0002-minimal-task-crew-briefing-contract.task.md` still says `status: planned`, but `node atm.mjs next --prompt "TASK-TEAM-0002 minimal task crew briefing contract" --json` reports the official ATM ledger status as `done` with closure packet `.atm/history/evidence/TASK-TEAM-0002.closure-packet.json`.
  - Reproduce / detect: Compare planning Markdown frontmatter status against `node atm.mjs next --prompt "<task-id>" --json` for imported tasks.
  - Impact: Captain sequencing can incorrectly restart already closed work or tell external builders to wait on a completed prerequisite.
  - Possible optimization: Add a planning-status sync checker that flags stale Markdown mirrors and tells Captain to trust the ATM ledger for closure authority.
  - Related tasks / commits: `TASK-TEAM-0002`, `TASK-TEAM-0004`.

- [ ] BUG-ATM-0013: Target-repo done card can miss target ledger closure evidence
  - Status: open
  - Severity: P0 closure evidence integrity
  - Encountered: `TASK-TEAM-0028` is marked `done` in the 3KLife Markdown task card, but no matching `AI-Atomic-Framework/.atm/history/tasks/TASK-TEAM-0028.json` or closure packet was found during the status sync audit.
  - Reproduce / detect: Compare Markdown cards with `status: done` and `target_repo: AI-Atomic-Framework` against `.atm/history/tasks/<task-id>.json` and `.atm/history/evidence/<task-id>.closure-packet.json`.
  - Impact: A Captain can treat a task as closed prerequisite evidence when the target repo has no official closure record.
  - Possible optimization: Add a sync checker that distinguishes planning-repo closure from target-repo closure and blocks using a target-repo `done` card without ledger closure evidence.
  - Related tasks / commits: `TASK-TEAM-0028`, `TASK-TEAM-0027`.

- [ ] BUG-ATM-0014: RFT planned cards are not imported into target ledger before route planning
  - Status: open
  - Severity: P1 execution readiness
  - Encountered: All eight RFT Markdown cards are `planned`, but no `TASK-RFT-*.json` exists in the AI-Atomic-Framework task ledger.
  - Reproduce / detect: Compare `C:/Users/User/3KLife/docs/ai_atomic_framework/rft-hardening/tasks/TASK-RFT-*.task.md` against `AI-Atomic-Framework/.atm/history/tasks/TASK-RFT-*.json`.
  - Impact: `next` can route by Markdown discovery, but claim may require import and can create friction if the selected card is not imported intentionally.
  - Possible optimization: Import only the selected RFT card immediately before execution; avoid bulk-importing all RFT cards unless the batch route explicitly requires it.
  - Related tasks / commits: `TASK-RFT-0008`.

- [ ] BUG-ATM-0015: Markdown claim remediation can point to the wrong or over-quoted import path
  - Status: open
  - Severity: P0 external-agent usability
  - Encountered: `external-004` hit `ATM_NEXT_CLAIM_TASK_IMPORT_REQUIRED` for `TASK-TEAM-0004`; the remediation pointed at a quoted planning document path instead of the exact task-card Markdown file.
  - Reproduce / detect: Ask an external worker to claim a Markdown-discovered task that has not been imported, then inspect `error.requiredCommand` and compare it with `evidence.nextAction.taskPath`.
  - Impact: A worker can follow ATM's own remediation and import the wrong source document, especially when the task family has both a plan document and per-task cards.
  - Possible optimization: Return the exact discovered task card path in the required command, avoid nested shell quotes, and add an import-and-claim retry token bound to the selected task id.
  - Related tasks / commits: `TASK-TEAM-0004`; framework import/claim commit `f9cb2fa6`.

- [ ] BUG-ATM-0016: Import/setup commits require a work session even before real implementation starts
  - Status: open
  - Severity: P1 lifecycle friction
  - Encountered: After `tasks import --write` for `TASK-TEAM-0004`, a normal `git commit` was blocked by `ATM_GIT_COMMIT_WRAPPER_REQUIRED`, but `atm git commit` then required an active or recent task session.
  - Reproduce / detect: Import a Markdown task card into `.atm/history/tasks`, stage only import artifacts, then try to commit through the required wrapper before claiming the task.
  - Impact: Captain had to claim the task as `external-004` just to make a setup/import commit, which blurs the boundary between Captain setup and worker implementation.
  - Possible optimization: Add a governed import/setup commit mode, or provide a single `tasks import-and-claim` command that writes task history, creates the actor session, and emits the correct commit instructions.
  - Related tasks / commits: `TASK-TEAM-0004`; framework import/claim commit `f9cb2fa6`.

- [ ] BUG-ATM-0017: External actor identity setup is not part of dispatch preflight
  - Status: open
  - Severity: P1 delegation friction
  - Encountered: `atm git commit --actor external-004` refused to commit until `node atm.mjs identity set --actor "external-004" --git-name "004" --git-email "004@3klife.local" --json` was run manually.
  - Reproduce / detect: Create a new external actor, claim a task, then attempt an ATM-wrapped commit without pre-registering identity.
  - Impact: External agents can finish work but fail at the commit step unless the Captain remembered an identity command not present in the dispatch brief.
  - Possible optimization: Add identity provisioning to Captain dispatch setup, or allow `atm git commit` to accept one-shot `--git-name` / `--git-email` values and persist them explicitly.
  - Related tasks / commits: `external-004`, `TASK-TEAM-0004`.

- [ ] BUG-ATM-0018: Commit wrapper baseline warnings are noisy during narrow import/setup commits
  - Status: open
  - Severity: P2 operator clarity
  - Encountered: The pre-commit task audit emitted many tree-wide warnings during the narrow `TASK-TEAM-0004` import/claim commit even though they were non-blocking.
  - Reproduce / detect: Run an ATM-wrapped commit for a small task-history import and inspect warnings unrelated to the current task id.
  - Impact: Agents may spend time triaging historical baseline warnings or mistake them for blockers.
  - Possible optimization: Split current-task blockers from baseline warnings, collapse unchanged baseline warnings by default, and print a short command to expand the full list only when needed.
  - Related tasks / commits: `TASK-TEAM-0004`; framework import/claim commit `f9cb2fa6`.

- [ ] BUG-ATM-0019: Task import can lose multiline YAML block scalar content
  - Status: open
  - Severity: P1 task-card fidelity
  - Encountered: The imported `TASK-TEAM-0004` task JSON showed a dispatch pattern output field as `"output": "|"`, suggesting the YAML block scalar marker was preserved but the multiline content was not normalized as intended.
  - Reproduce / detect: Import a Markdown task card whose frontmatter or structured body contains block scalar fields, then inspect `.atm/history/tasks/<task-id>.json` for literal `"|"` values without the expected text.
  - Impact: Imported task metadata can become less useful for downstream automation, evidence review, and worker briefing generation.
  - Possible optimization: Update the task importer to parse YAML block scalars with a structured YAML parser or explicitly reject unsupported block fields with a clear validation error.
  - Related tasks / commits: `TASK-TEAM-0004`.

- [ ] BUG-ATM-0020: Worker resume SOP must sync after Captain-side import/claim commits
  - Status: open
  - Severity: P1 multi-agent coordination
  - Encountered: `external-004` was resumed only after Captain imported, claimed, committed, and pushed `TASK-TEAM-0004` setup artifacts in the same target repo.
  - Reproduce / detect: Let a worker HOLD on missing import, have Captain perform the import/claim commit, then resume the worker without requiring a fresh `git status` and pull/sync check.
  - Impact: The worker can continue from stale workspace assumptions and collide with Captain-authored task-history commits.
  - Possible optimization: Add a dispatch SOP line: after Captain resolves a HOLD by committing setup artifacts, the worker must sync latest main and rerun `node atm.mjs next --prompt "<task>" --json` before editing.
  - Related tasks / commits: `external-004`, `TASK-TEAM-0004`, framework import/claim commit `f9cb2fa6`.

- [ ] BUG-ATM-0021: Closure review does not clearly separate pre-existing deliverables from changed deliverables
  - Status: open
  - Severity: P1 closeout clarity
  - Encountered: `TASK-TEAM-0004` listed templates, `package.json`, atom map, and validator as deliverables, but the implementation commit only changed `scripts/validate-team-agents-templates.ts` and git-head evidence because the templates and wiring already existed from earlier work.
  - Reproduce / detect: Close a task whose acceptance criteria are satisfied partly by pre-existing files, then compare `deliverables`, `requiredGatesSnapshot.changedFiles`, and the actual implementation commit diff.
  - Impact: Captain review can misread a successful validator-only completion as either incomplete work or hidden scope drift.
  - Possible optimization: Add closure packet fields such as `preExistingDeliverables`, `changedDeliverables`, and `validatedDeliverables`, and teach close review to state which acceptance items were already satisfied before the task commit.
  - Related tasks / commits: `TASK-TEAM-0004`; framework implementation commit `4aef5440`, close commit `5fe00bdc`.

- [ ] BUG-ATM-0022: `identity set` response can show a previous actor's active session
  - Status: open
  - Severity: P2 operator clarity
  - Encountered: While preparing `external-005`, `node atm.mjs identity set --actor "external-005" ... --json` returned `actorId: external-005` but also showed `activeSessionId` from the prior `external-004` session.
  - Reproduce / detect: Run `identity set` for a new actor immediately after another actor closed or claimed a task, then inspect `evidence.identity.activeSessionId`.
  - Impact: Captain or worker may incorrectly infer that the new identity is attached to the prior actor's session.
  - Possible optimization: Omit stale `activeSessionId` from identity-set output, or only include it when the active session belongs to the same actor.
  - Related tasks / commits: observed during `TASK-TEAM-0005` setup after `TASK-TEAM-0004`.

- [ ] BUG-ATM-0023: Read-only preflight routes sound like they must claim and mutate
  - Status: open
  - Severity: P2 delegation clarity
  - Encountered: A read-only sidecar asked for `TASK-TEAM-0006` preflight received the normal playbook emphasizing `next --claim`, even though the Captain explicitly wanted no claim, no write, and no close.
  - Reproduce / detect: Ask `node atm.mjs next --prompt "<task> preflight"` or a sidecar to inspect a task without write authority; inspect whether the playbook distinguishes read-only preflight from implementation.
  - Impact: Helper agents may overstep into claim/mutation when the intended role is just route verification or implementation briefing.
  - Possible optimization: Add a `preflight` / `review-only` channel or detect explicit read-only intent and return a non-claim playbook with allowed read commands.
  - Related tasks / commits: observed during `TASK-TEAM-0006` read-only sidecar; `TASK-AAO-0066`.

- [ ] BUG-ATM-0024: Discovered planning paths can point at stale or alternate 3KLife worktree aliases
  - Status: open
  - Severity: P1 path reliability
  - Encountered: `node atm.mjs next --prompt "TASK-TEAM-0006 Patrol report template" --json` returned task paths under `../3KLife-captain-dispatch-push/...`, while the active planning repo path is `C:/Users/User/3KLife/...`.
  - Reproduce / detect: Route a Markdown-discovered task after using multiple local 3KLife worktrees or aliases, then compare `taskPath`, `sourcePlanPath`, and the currently maintained planning repo.
  - Impact: Workers can read or import from an unintended stale planning worktree, causing status drift or wrong task-card content.
  - Possible optimization: Canonicalize planning repo roots, prefer the configured active planning repo, and include a warning when a discovered task path is outside the expected planning root.
  - Related tasks / commits: observed during `TASK-TEAM-0006` read-only sidecar; `TASK-AAO-0043`.

- [ ] BUG-ATM-0025: Atom map descriptions can drift from validator support
  - Status: open
  - Severity: P2 metadata accuracy
  - Encountered: `path-to-atom-map.json` already maps `scripts/validate-team-agents-templates.ts`, but its description still says `TASK-TEAM-0004 or TASK-TEAM-0005` while the script also supports `TASK-TEAM-0006`.
  - Reproduce / detect: Extend a shared validator for a new task and inspect the atom map row for stale task coverage text.
  - Impact: Agent preflight can incorrectly infer which task ids are supported by a shared validator.
  - Possible optimization: Add a metadata validator that checks task-id mentions in atom map descriptions against actual script task dispatch branches, or require shared-validator tasks to update atom map descriptions as acceptance criteria.
  - Related tasks / commits: observed during `TASK-TEAM-0006` read-only sidecar.

- [ ] BUG-ATM-0026: Routine source workers can accidentally become runner sync stewards
  - Status: open
  - Severity: P0 generated-artifact governance
  - Encountered: During `TASK-TEAM-0005`, `external-005` ran `node atm.mjs evidence add --help` and hit `ATM_RUNNER_SYNC_REQUIRED`, then ran `npm run build` inside a normal template task.
  - Reproduce / detect: After changing ATM source files, run frozen runner evidence/help commands from a normal source task and observe whether runner sync is required before evidence can continue.
  - Impact: This violates the intended lightweight policy where general workers should avoid owning `release/**` and a Runner Sync Steward should handle generated artifacts.
  - Possible optimization: Add a runner-sync-needed handoff mode for normal tasks, or make help/evidence commands avoid forcing worker-owned release sync when the task is not the steward lane.
  - Related tasks / commits: `TASK-TEAM-0005`; worker reported build was needed before evidence.

- [ ] BUG-ATM-0027: Template deliverables are ignored by default and require `git add -f`
  - Status: open
  - Severity: P1 delivery friction
  - Encountered: `external-005` reported `git add` was initially blocked by ignore rules for `docs/governance/team-agents/templates`, so the worker had to use `git add -f`.
  - Reproduce / detect: Add a new template under `docs/governance/team-agents/templates/` and try normal `git add`.
  - Impact: Agents may think new deliverables are not tracked, or may forget to force-add required files.
  - Possible optimization: Adjust `.gitignore`/include rules for governed template directories, or have task cards explicitly mention `git add -f` when deliverables live under ignored paths.
  - Related tasks / commits: `TASK-TEAM-0005`; implementation commit `b5519938`.

- [ ] BUG-ATM-0028: Evidence/close/commit sequencing is hard for external workers to infer
  - Status: open
  - Severity: P1 lifecycle usability
  - Encountered: `external-005` reported the first ATM-wrapped commit was blocked because `.atm/history/evidence/TASK-TEAM-0005.json` needed to travel with task ledger / transition files; the worker had to discover a two-commit flow by trial.
  - Reproduce / detect: Complete a normal task, add evidence before close, then attempt `atm git commit` before the close transition has generated all expected history/evidence artifacts.
  - Impact: External workers can lose time or produce confusing partial staged states even while following broad playbook instructions.
  - Possible optimization: Provide an explicit `task deliverable commit` vs `task close commit` recipe in the playbook, or add a command that stages the required current-task evidence/task/event files together.
  - Related tasks / commits: `TASK-TEAM-0005`; commits `b5519938`, `98d5cbee`.

- [ ] BUG-ATM-0029: Close-required evidence gate is correct but needs a concise missing-evidence checklist
  - Status: open
  - Severity: P2 closeout clarity
  - Encountered: `external-005` reported `tasks close` was blocked until four evidence runs were added for `validate:cli`, `validate:git-head-evidence`, `validate:team-agents-templates`, and `git diff --check`.
  - Reproduce / detect: Run `tasks close` for a framework task after focused validators but before all required closure gates have command-backed evidence.
  - Impact: The gate is useful, but external workers need a clear next-command checklist instead of learning the missing set by failure.
  - Possible optimization: When close is blocked, print grouped missing evidence with exact suggested `evidence run` commands for the current task and actor.
  - Related tasks / commits: `TASK-TEAM-0005`; close commit `98d5cbee`.

- [ ] BUG-ATM-0030: Worker-created Markdown templates can include UTF-8 BOM and fail pre-commit
  - Status: open
  - Severity: P1 delivery friction
  - Encountered: `TASK-TEAM-0006` pre-commit blocked because `docs/governance/team-agents/templates/patrol-report-template.md` contained a UTF-8 BOM.
  - Reproduce / detect: Let an external worker create a new Markdown template file, force-add it from an ignored template directory, then run the ATM commit wrapper.
  - Impact: The task content may be correct and validators may pass, but commit fails late on encoding.
  - Possible optimization: Add an encoding preflight command to dispatch briefs for new text files, or have the template validator check BOM for its managed template paths before commit.
  - Related tasks / commits: `TASK-TEAM-0006`; implementation commit `08eca824`.

- [ ] BUG-ATM-0031: Closure packet can include advisory runner sync diffs in targetCommitDelta
  - Status: open
  - Severity: P1 closure clarity
  - Encountered: `TASK-TEAM-0006` closure isolated `release/**` as advisory generated artifacts, but the closure packet `targetCommitDelta.changedFiles` still listed `release/atm-onefile/atm.mjs` and `release/atm-onefile/release-manifest.json`.
  - Reproduce / detect: Build frozen runner during a task, leave `release/**` dirty as advisory, then close the source task before committing runner sync.
  - Impact: Reviewers can misread generated runner sync as part of the task's delivery commit, even when it was intentionally separated into a steward commit.
  - Possible optimization: Split closure packet changed files into `deliveryChangedFiles`, `advisoryDirtyFiles`, and `postCloseRunnerSyncFiles`, or omit advisory dirty files from `targetCommitDelta`.
  - Related tasks / commits: `TASK-TEAM-0006`; closure commit `7ee56378`, runner sync commit `06bfc744`.

- [ ] BUG-ATM-0032: Guide/start misroutes existing task-card goals to create-atom
  - Status: open
  - Severity: P1 routing usability
  - Encountered: For the concrete goal `TASK-RFT-0008 taskflow size tripwire and commit message Strategy Map`, `node atm.mjs guide` returned `unknown`, then `node atm.mjs start` recommended `create-atom` even though a valid RFT task card already existed.
  - Reproduce / detect: Run `node atm.mjs next --prompt "<existing task family goal>" --json`, follow the suggested `guide`, then `start`; compare the route against existing Markdown task cards.
  - Impact: Captains can be pulled away from the task-card lifecycle into a new atom discovery flow, increasing confusion before implementation starts.
  - Possible optimization: Teach `guide/start` to detect explicit task ids and known planning task-card roots, and prefer task-card import/claim guidance over create-atom when a matching card exists.
  - Related tasks / commits: `TASK-RFT-0008`; Team Agents dogfood run `team-71c0d5c2fd25`; `TASK-AAO-0110`.

- [ ] BUG-ATM-0033: Team start is useful but may overstate "agents" before spawning exists
  - Status: open
  - Severity: P2 product clarity
  - Encountered: `node atm.mjs team start --task "TASK-RFT-0008" ...` created a runtime team run and permission leases, but explicitly reported `agentsSpawned: false`.
  - Reproduce / detect: Run `team plan`, `team validate`, then `team start` for a normal TypeScript task and inspect `executionMode` / `agentsSpawned`.
  - Impact: Humans may think Team Agents are doing autonomous subagent work when the current product surface is still a manual-team coordination record.
  - Possible optimization: Rename or label the current stage as "manual team run record" in user-facing prompts, and add a clear next command or future card for real subagent spawn integration.
  - Related tasks / commits: `TASK-RFT-0008`, `TASK-TEAM-0011+`.

- [ ] BUG-ATM-0034: Frozen evidence/help commands force runner sync during normal source task evidence
  - Status: open
  - Severity: P0 runner governance friction
  - Encountered: During `TASK-RFT-0008`, after source edits but before closure, `node atm.mjs evidence --help` emitted `ATM_RUNNER_SYNC_REQUIRED`, forcing Captain to run `npm run build` before evidence capture could continue.
  - Reproduce / detect: Modify ATM CLI source, then run a frozen `node atm.mjs evidence ...` helper command before runner artifacts have been rebuilt.
  - Impact: Correctly protects the frozen runner, but it interrupts normal source-task evidence and can push ordinary workers into steward-owned `release/**` changes.
  - Possible optimization: Add a source-task handoff mode that records `runner-sync-needed` while allowing narrowly safe help/evidence capture, or make Runner Sync Steward a first-class follow-up lane in the playbook.
  - Related tasks / commits: `TASK-RFT-0008`, `TASK-TEAM-0005`, `BUG-ATM-0026`; `TASK-AAO-0119`.

- [ ] BUG-ATM-0035: Planning card status lags after target claim/team run starts
  - Status: open
  - Severity: P1 dual-repo status clarity
  - Encountered: `TASK-RFT-0008` target ledger was imported and claimed as running, and Team run `team-71c0d5c2fd25` started, while the 3KLife Markdown card still showed `status: planned`.
  - Reproduce / detect: Import and claim a 3KLife planning card in the target repo, then compare `.atm/history/tasks/<task-id>.json` with the Markdown frontmatter status.
  - Impact: Sidecars and humans reading only 3KLife can believe a task has not started, while target ATM state is already active.
  - Possible optimization: Add a lightweight planning mirror update after successful claim/team start, or have `taskflow open/claim` return a planning sync reminder when `closure_authority=target_repo`.
  - Related tasks / commits: `TASK-RFT-0008`, `BUG-ATM-0012`.

- [ ] BUG-ATM-0036: Task scope amendment can update runtime direction lock without syncing embedded task ledger lock
  - Status: open
  - Severity: P0 closeback correctness
  - Encountered: During `TASK-TEAM-0017`, `node atm.mjs tasks scope add ... --add atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-platform.json --json` reported success and the active direction lock included the new shard path, but `.atm/history/tasks/TASK-TEAM-0017.json` still had the older embedded `taskDirectionLock.allowedFiles` and `claim.files`.
  - Reproduce / detect: Import and claim a task, run `tasks scope add` for an extra allowed file, then inspect `.atm/history/tasks/<task-id>.json`, the runtime lock, and pre-commit `ATM_DIRECTION_LOCK_ALLOWED_FILES_MISMATCH` diagnostics.
  - Impact: The task can correctly mutate the newly added file, but close/commit later sees direction-lock drift and may classify the delivery commit as out-of-scope or ambiguous.
  - Possible optimization: Make `tasks scope add` atomically sync the task ledger embedded direction lock and claim files, or intentionally separate runtime-only amendments with an explicit closeback-compatible event model.
  - Related tasks / commits: `TASK-TEAM-0017`; delivery commit `4497fb169b9d5d5de66bdf48e50afa7ec1d11c44`.

- [ ] BUG-ATM-0037: Closure-required git-head evidence creates an evidence/transition event commit cycle
  - Status: open
  - Severity: P0 closeback usability
  - Encountered: `TASK-TEAM-0017` close required `validate:git-head-evidence`; after adding that evidence, pre-commit blocked committing `.atm/history/evidence/TASK-TEAM-0017.json` alone because evidence must travel with a task ledger change or transition event, but the needed close transition event is only created by the close step that is currently blocked.
  - Reproduce / detect: Commit a task delivery, run `tasks close`, satisfy a newly reported close-required evidence validator, then attempt to commit the evidence before close creates the transition event.
  - Impact: Agents can get trapped between required evidence and protected-state commit rules, needing emergency backend close even though the implementation and validators passed.
  - Possible optimization: Teach `taskflow close` to own this sequence atomically: run missing close-required evidence, close, stage evidence/task/events/closure packet together, and commit the governed bundle.
  - Related tasks / commits: `TASK-TEAM-0017`; validator `validate:git-head-evidence`.

- [ ] BUG-ATM-0038: `evidence run --command` is fragile for complex quoted PowerShell or Node one-liners
  - Status: open
  - Severity: P1 evidence capture friction
  - Encountered: While trying to record `TASK-TEAM-0017` fixture acceptance, complex commands containing `$tmp` PowerShell variables or `node -e "..."` were mangled into partial commands such as `node -e const`, causing `ATM_EVIDENCE_VALIDATION_PASS_FAILED_COMMAND` even though the acceptance check passed when run directly.
  - Reproduce / detect: Run `node atm.mjs evidence run --command "<complex quoted command>" --validators <name> --json` on Windows PowerShell and compare the captured command string with the command actually intended.
  - Impact: Agents may lose command-backed evidence for legitimate checks or spend time fighting shell quoting instead of validating the task.
  - Possible optimization: Add `--command-file`, `--argv-json`, or `--stdin-command` support for evidence run; alternatively document a Windows-safe quoting recipe and include it in close blocker remediation.
  - Related tasks / commits: `TASK-TEAM-0017`; fixture acceptance for empty fixture dir exit 0 and invalid fixture exit 1.

- [ ] BUG-ATM-0039: Taskflow close reports the backend waiver command but cannot execute it without emergency approval
  - Status: open
  - Severity: P1 operator lane clarity
  - Encountered: `taskflow close --dry-run` for `TASK-TEAM-0017` recommended a `tasks close --historical-delivery --waiver-out-of-scope-delivery` command, but running that command failed with `ATM_EMERGENCY_LANE_APPROVAL_REQUIRED`.
  - Reproduce / detect: Produce a delivery commit that includes a scope-amended source-of-truth file, run `taskflow close --dry-run`, then run the returned backend command without an emergency approval lease.
  - Impact: The dry-run recommendation looks like the next operator command, but it is incomplete because it omits the required emergency approval flow.
  - Possible optimization: Have `taskflow close` either execute the waiver path internally when safe, or include the exact `emergency approve` prerequisite and approval text in the readiness hint.
  - Related tasks / commits: `TASK-TEAM-0017`; delivery commit `4497fb169b9d5d5de66bdf48e50afa7ec1d11c44`.

- [ ] BUG-ATM-0040: Team Agents schema files are not obviously swept by the global schema validator
  - Status: open
  - Severity: P1 validation coverage
  - Encountered: `TASK-TEAM-0017` added six `schemas/team-agents/*.schema.json` files and validated them through `scripts/validate-team-agents-templates.ts`, but sidecar review noted that `scripts/validate-schemas.ts` and `scripts/validators.config.json` may not automatically include the new schema family.
  - Reproduce / detect: Add a bad schema under `schemas/team-agents/`, run `npm run validate:schemas` / configured schema validators, and verify whether the failure is detected without the dedicated Team Agents validator.
  - Impact: A schema family can be locally covered by one task validator but remain invisible to broad release validation.
  - Possible optimization: Add auto-discovery for all `schemas/**/*.schema.json`, or require every new schema family to register in the global schema validator and validators config in the same task card.
  - Related tasks / commits: `TASK-TEAM-0017`; `BUG-ATM-0008`.

- [ ] BUG-ATM-0041: Task import path heuristic flags valid hyphenated filenames as strict path violations
  - Status: open
  - Severity: P2 import noise
  - Encountered: Importing `TASK-RFT-0003` reported `STRICT_PATH_VIOLATION` for valid files such as `closure-packet-schema.ts` because the heuristic appeared to classify hyphenated filename segments as `english-sentence-word`.
  - Reproduce / detect: Run `node atm.mjs tasks import --from <TASK-RFT-0003 markdown> --write --json` and inspect warnings for `closure-packet-schema.ts` or matching spec paths.
  - Impact: Agents may distrust import warnings or waste time checking valid scoped files.
  - Possible optimization: Restrict strict sentence-word detection to prose fields, or whitelist common code filename patterns such as `kebab-case.ts` and `kebab-case.spec.ts`.
  - Related tasks / commits: `TASK-RFT-0003`; delivery commit `b76c494346bbe72dc4e005fa552e61a28d240248`.

- [ ] BUG-ATM-0042: Normal playbook says close before commit, but close requires in-scope dirty files to be committed first
  - Status: open
  - Severity: P0 lifecycle instruction mismatch
  - Encountered: `TASK-RFT-0003` normal playbook said to close before committing deliverables, but `tasks close --status done` failed with `ATM_TASK_CLOSE_DIRTY_WORKTREE` and remediation said to commit scoped delivery changes first.
  - Reproduce / detect: Implement a normal framework task with dirty in-scope source files, add evidence, then run `node atm.mjs tasks close --task <id> --status done --json` before a delivery commit.
  - Impact: Agents following the playbook literally hit a blocker and must infer a two-commit flow from remediation.
  - Possible optimization: Update the normal playbook to distinguish delivery commit, close/ledger commit, and runner sync commit when close requires a committed delivery parent.
  - Related tasks / commits: `TASK-RFT-0003`; delivery commit `b76c494346bbe72dc4e005fa552e61a28d240248`, closure commit `55c435baf45dd12240329fb516dd24173980ea12`; `TASK-AAO-0136`.

- [ ] BUG-ATM-0043: Direction-lock mismatch warning repeats for evidence/task-events omitted from claim.files
  - Status: open
  - Severity: P2 warning clarity
  - Encountered: During `TASK-RFT-0003` commit, pre-commit warned `ATM_DIRECTION_LOCK_ALLOWED_FILES_MISMATCH` because canonical allowed files included `.atm/history/evidence/TASK-RFT-0003.*` and `.atm/history/task-events/TASK-RFT-0003/**`, while claim.files omitted those generated governance paths.
  - Reproduce / detect: Claim a task, add evidence/events through ATM commands, stage them with deliverables, and run the ATM pre-commit hook or commit wrapper.
  - Impact: The warning is non-blocking but looks like scope drift, making closeout noisier for agents.
  - Possible optimization: Treat ATM-generated current-task evidence and task-events as implicit claim coverage, or sync claim.files after evidence/close writes.
  - Related tasks / commits: `TASK-RFT-0003`; delivery commit `b76c494346bbe72dc4e005fa552e61a28d240248`.

- [ ] BUG-ATM-0044: Runner sync commit records git-head evidence in a generated-artifact commit
  - Status: open
  - Severity: P1 runner sync clarity
  - Encountered: The `TASK-RFT-0003` runner sync stage had six tracked `release/**` files, but pre-commit staged `.atm/history/evidence/git-head.jsonl`, so the commit reported seven changed files.
  - Reproduce / detect: Run `npm run build`, stage tracked `release/**` changes with `git add -u release`, and commit while the pre-commit hook writes git-head evidence.
  - Impact: A clean derived-artifact commit gains governance evidence state, making runner sync less isolated than intended.
  - Possible optimization: Either exclude git-head evidence writes from pure runner sync commits, or route runner sync through a first-class steward command that owns release artifacts plus generated evidence explicitly.
  - Related tasks / commits: `TASK-RFT-0003`; runner sync commit `4a07560619b9cfe78e8051ca785829694bc50159`; `BUG-ATM-0005`, `BUG-ATM-0031`.

- [ ] BUG-ATM-0045: Task discovery can prefer a stale sibling planning worktree over the active planning repo
  - Status: open
  - Severity: P0 dispatch correctness
  - Encountered: During `TASK-TEAM-0009`, the normal route found a matching task card under `../3KLife-captain-dispatch-push` even though the active planning repo is `C:\Users\User\3KLife`.
  - Reproduce / detect: Keep an older sibling planning worktree with matching `docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0009-*.task.md`, then run `node atm.mjs next --prompt "TASK-TEAM-0009 Team plan dry-run resolver" --json`.
  - Impact: Agents can import or close back against stale task text, which weakens the trust boundary between active planning authority and historical worktrees.
  - Possible optimization: Add a canonical planning-root preference, reject sibling worktrees unless explicitly selected, or emit a high-severity warning when the chosen task card is outside the configured active planning repo.
  - Related tasks / commits: `TASK-TEAM-0009`; target delivery commit `b3f4c80064a148152f850f4939732c3c4b7e5190`; `TASK-AAO-0043`.

- [ ] BUG-ATM-0046: Close missing-evidence remediation can generate an invalid doubled runner command
  - Status: open
  - Severity: P1 closeback usability
  - Encountered: `TASK-TEAM-0009` close initially reported a missing command validator, but the remediation command duplicated the runner prefix as `node atm.mjs node atm.mjs team plan ...`.
  - Reproduce / detect: Attempt to close a task that requires exact command evidence where the validator string itself starts with `node atm.mjs`.
  - Impact: The missing-evidence guidance is close to useful, but agents following it literally will run an invalid command.
  - Possible optimization: Treat command-shaped validator names as exact validator ids and quote them without prepending a runner command.
  - Related tasks / commits: `TASK-TEAM-0009`; `BUG-ATM-0029`.

- [ ] BUG-ATM-0047: Broker registry can surface completed task intents as active Team plan conflicts
  - Status: open
  - Severity: P1 coordination noise
  - Encountered: `node atm.mjs team plan --task TASK-TEAM-0009 --json` surfaced an active write-broker intent for already completed `TASK-RFT-0003`.
  - Reproduce / detect: Complete and close an RFT task, then run Team Agents planning shortly afterward and inspect `virtualAtomInUseRegistry.activeIntents`.
  - Impact: False conflict noise can make Team Agents planning look riskier than it is and may slow Captain decisions.
  - Possible optimization: Release or terminally mark write-broker intents when task close succeeds, or filter terminal task intents from Team plan risk summaries.
  - Related tasks / commits: `TASK-RFT-0003`, `TASK-TEAM-0009`.

- [ ] BUG-ATM-0048: Close gate requires validator aliases that duplicate more specific evidence
  - Status: open
  - Severity: P1 evidence friction
  - Encountered: `TASK-TEAM-0009` already had specific evidence for `validate-team-agents:plan-resolver` and `team-plan:TASK-TEAM-0009`, but close also required `validate:team-agents` and the exact command string `node atm.mjs team plan --task TASK-TEAM-0009 --json`.
  - Reproduce / detect: Record task-specific Team Agents validator evidence, then close a task card whose required validators use package-script aliases or command-string validators.
  - Impact: Agents must add duplicate evidence after delivery, which can trigger the evidence/transition commit cycle and make closeback feel more complicated than the work itself.
  - Possible optimization: Add validator alias normalization or let task cards declare accepted validator aliases so specific evidence can satisfy broader close requirements.
  - Related tasks / commits: `TASK-TEAM-0009`; `BUG-ATM-0037`.

- [ ] BUG-ATM-0049: Stale broker intents can block current Team plan until manual `broker cleanup`
  - Status: open
  - Severity: P0 Team Agents operability
  - Encountered: During `TASK-TEAM-0010`, `node atm.mjs team plan --task TASK-TEAM-0010 --json` failed with `blocked-broker-cid-conflict` because an expired `TASK-RFT-0003` active intent remained in `.atm/runtime/write-broker.registry.json`.
  - Reproduce / detect: Complete and close a task that registered a broker write intent, wait until the lease expires, then run `team plan` for another task touching nearby files.
  - Impact: A completed task can make an unrelated current Team plan look blocked, forcing Captain to know and run `node atm.mjs broker cleanup --json`.
  - Possible optimization: Run broker orphan cleanup automatically on task close and before Team plan broker evaluation, or downgrade expired terminal-task intents to advisory cleanup notices with a safe auto-clean path.
  - Related tasks / commits: `TASK-RFT-0003`, `TASK-TEAM-0010`; `BUG-ATM-0047`.

- [ ] BUG-ATM-0050: Onefile cache can lose internal command modules after rebuild
  - Status: open
  - Severity: P0 frozen runner reliability
  - Encountered: During `TASK-TEAM-0010`, `node atm.mjs broker --help` failed from the onefile cache with missing `packages/cli/dist/commands/actor-registry.js`; another attempt failed with missing cached `atm.mjs`.
  - Reproduce / detect: After source edits and `npm run build`, run `node atm.mjs broker --help` or other frozen runner commands that import newer command modules.
  - Impact: Agents following the frozen-runner rule can hit module-not-found errors while trying to inspect official commands.
  - Possible optimization: Add a onefile cache integrity check that clears/recreates the cache when expected extracted files are absent, and include command-module import coverage in onefile release validation.
  - Related tasks / commits: `TASK-TEAM-0010`; `BUG-ATM-0006`; `TASK-AAO-0109`.

- [ ] BUG-ATM-0051: Team start/status validator was absent while the task card required it
  - Status: open
  - Severity: P1 validator coverage
  - Encountered: During `TASK-TEAM-0011`, `node --strip-types scripts/validate-team-agents.ts --case start-status` initially failed with "unsupported or missing --case value" even though the task card listed that validator.
  - Reproduce / detect: Add a task-card validator case but do not wire it into `scripts/validate-team-agents.ts`, then run the exact validator from the task card.
  - Impact: A task can appear fully specified but remain uncloseable or weakly verified until the missing validator surface is discovered manually.
  - Possible optimization: Add a task-card validator preflight that checks every `--case <name>` command is supported before claim, or make validator scripts expose a machine-readable case list.
  - Related tasks / commits: `TASK-TEAM-0011`; source delivery commit `af86ae2c`.

- [ ] BUG-ATM-0052: Team status should define active-run semantics and stable ordering
  - Status: open
  - Severity: P2 runtime UX
  - Encountered: Sidecar review during `TASK-TEAM-0011` found `team status --compact` listed all runtime files without an explicit `status === active` filter and `listTeamRuns()` did not sort files.
  - Reproduce / detect: Create multiple `.atm/runtime/team-runs/*.json` records with mixed statuses or filesystem order, then run `node atm.mjs team status --compact --json`.
  - Impact: Status output can become noisy or nondeterministic once paused, closed, or failed team-run states exist.
  - Possible optimization: Keep default compact status focused on active runs, add an explicit future `--all` flag for historical states, and sort by file name or timestamp.
  - Related tasks / commits: `TASK-TEAM-0011`; source delivery commit `af86ae2c`.

- [ ] BUG-ATM-0053: Normal close playbook conflicts with dirty-worktree close gate
  - Status: open
  - Severity: P0 lifecycle instruction mismatch
  - Encountered: During `TASK-TEAM-0011`, the normal playbook said to close before committing, but `tasks close --status done` failed with `ATM_TASK_CLOSE_DIRTY_WORKTREE` and required a scoped delivery commit first.
  - Reproduce / detect: Follow the normal playbook on a source-changing task: implement, add evidence, then close before committing the in-scope deliverables.
  - Impact: Agents following the official playbook hit a blocker and must infer the real three-phase flow: delivery commit, close governance commit, runner sync commit.
  - Possible optimization: Update the normal playbook to explicitly branch when the close gate requires a committed delivery parent, and name the runner-sync follow-up separately.
  - Related tasks / commits: `TASK-TEAM-0011`; `BUG-ATM-0042`; `TASK-AAO-0136`.

- [ ] BUG-ATM-0054: Closure commit wrapper requirement appears only after a failed normal git commit
  - Status: open
  - Severity: P1 closeback usability
  - Encountered: During `TASK-TEAM-0011`, staging `.atm/history/**` closure files and running `git commit` was blocked by `ATM_GIT_COMMIT_WRAPPER_REQUIRED`; the correct command was `node atm.mjs git commit --actor ... --task ...`.
  - Reproduce / detect: Close a task, stage current-task evidence/task-events/task JSON, then run plain `git commit`.
  - Impact: The failure is correct but late; agents waste a commit attempt and may not know closure commits need the ATM wrapper.
  - Possible optimization: Have `tasks close` print the exact wrapper commit command, or stage and commit the closure bundle through a first-class `taskflow close --commit` route.
  - Related tasks / commits: `TASK-TEAM-0011`; closure commit `ab6723ba`; `BUG-ATM-0037`; `TASK-AAO-0135`; `TASK-AAO-0137`; `TASK-AAO-0136`.

- [ ] BUG-ATM-0055: Direction lock claim.files omits current-task evidence and task-events
  - Status: open
  - Severity: P2 warning clarity
  - Encountered: During the `TASK-TEAM-0011` delivery commit, pre-commit warned `ATM_DIRECTION_LOCK_ALLOWED_FILES_MISMATCH` because canonical allowed files included `.atm/history/evidence/TASK-TEAM-0011.*` and `.atm/history/task-events/TASK-TEAM-0011/**`, while `claim.files` omitted them.
  - Reproduce / detect: Claim a task, generate evidence/task events through ATM commands, then commit a delivery or closure bundle and inspect pre-commit warnings.
  - Impact: Non-blocking warning reads like scope drift even when ATM-generated governance files are expected.
  - Possible optimization: Treat current-task evidence/events as implicit claim coverage, or sync `claim.files` with canonical direction lock allowed files when claim is created.
  - Related tasks / commits: `TASK-TEAM-0011`; `BUG-ATM-0043`; `TASK-AAO-0135`.

- [ ] BUG-ATM-0056: `validate:team-agents` default does not cover newly added task-specific cases
  - Status: open
  - Severity: P1 validator coverage
  - Encountered: During `TASK-TEAM-0011`, `npm run validate:team-agents` passed but only executed the default `lieutenant-escalation` case, not the newly added `start-status` case.
  - Reproduce / detect: Add a new `scripts/validate-team-agents.ts --case <name>` branch, then run `npm run validate:team-agents` and inspect stdout.
  - Impact: Broad validators can go green while the newest task-specific Team Agents contract is only covered by direct command evidence.
  - Possible optimization: Make the default Team Agents validator run all supported cases, or require each new case to be registered in a visible case matrix.
  - Related tasks / commits: `TASK-TEAM-0011`; source delivery commit `af86ae2c`.

- [ ] BUG-ATM-0057: Evidence run output count is confusing under same-task parallel writes
  - Status: open
  - Severity: P1 evidence reliability / operator clarity
  - Encountered: During `TASK-TEAM-0013`, parallel `node atm.mjs evidence run ...` commands for the same task returned non-monotonic `evidenceCount` values such as 6, 8, 7 even though `evidence missing` later showed all closure-required validators passed.
  - Reproduce / detect: Run multiple `evidence run` commands concurrently against one task evidence file, then compare each command's `evidenceCount` with the final evidence JSON and `evidence missing`.
  - Impact: Agents may suspect evidence loss or may rerun validators unnecessarily. In a worse implementation, concurrent writes could actually lose records.
  - Possible optimization: Add same-task evidence file locking / atomic append semantics, or make `evidenceCount` explicitly "post-write observed count" with a warning that concurrent writes should be serialized.
  - Related tasks / commits: `TASK-TEAM-0013`; delivery commit `3acba6bd`; `BUG-ATM-0009`.

- [ ] BUG-ATM-0058: Evidence-only update cannot be committed, but close gate may require it committed before close
  - Status: open
  - Severity: P0 lifecycle deadlock
  - Encountered: During `TASK-TEAM-0013`, after the delivery commit, close required updated `.atm/history/evidence/TASK-TEAM-0013.json` to be committed first. The ATM git commit wrapper then blocked an evidence-only commit with `ATM_PROTECTED_STATE_EVIDENCE_FILE_MISSING_TASK_CONTEXT`.
  - Reproduce / detect: Commit source delivery, add additional required validator evidence, try `tasks close --status done`, then attempt to commit only the updated evidence file.
  - Impact: Normal close can deadlock unless the operator discovers `taskflow close --historical-delivery ...`, making the official close path hard for agents to follow.
  - Possible optimization: Let `taskflow close` be the default remediation when delivery is already committed, or let evidence-only current-task updates commit when a live claim/session exists and close is the next operation.
  - Related tasks / commits: `TASK-TEAM-0013`; delivery commit `3acba6bd`; closure commit `30b3ac78`; `BUG-ATM-0053`, `BUG-ATM-0042`; `TASK-AAO-0135`; `TASK-AAO-0136`; `TASK-AAO-0137`.

- [ ] BUG-ATM-0059: Close missing-evidence remediation can produce doubled `node atm.mjs` command
  - Status: open
  - Severity: P1 closeback usability
  - Encountered: During `TASK-TEAM-0013`, close missing-evidence guidance for validator `node atm.mjs team validate --task TASK-TEAM-0013 --json` suggested `node atm.mjs node atm.mjs team validate --task TASK-TEAM-0013 --json --json`.
  - Reproduce / detect: Use a task-card validator whose validator name is the full `node atm.mjs ... --json` command string, then close before that exact validator id has evidence.
  - Impact: Agents following the remediation literally run an invalid command.
  - Possible optimization: Detect validator ids that are already full commands and use them as the evidence command directly, without prepending a runner.
  - Related tasks / commits: `TASK-TEAM-0013`; `BUG-ATM-0046`.

- [ ] BUG-ATM-0060: BUG-ATM-0045 repro exists but is not yet governed as a fix card
  - Status: open
  - Severity: P0 dispatch correctness
  - Encountered: External worker 004 produced `scripts/repro/bug-atm-0045-planning-root-preference.mjs`, a failing repro showing that sibling planning roots like `3KLife-captain-dispatch-push` can rank equal to canonical `3KLife`.
  - Reproduce / detect: Run `node scripts/repro/bug-atm-0045-planning-root-preference.mjs`; current expected output is failure until `next.ts` planning-root preference is fixed.
  - Impact: The repro is useful but uncommitted and outside the current `TASK-TEAM-0013` scope, so it must not be silently bundled into Team runtime work.
  - Possible optimization: Open a dedicated fix card, move the repro into a governed validator such as `scripts/validate-planning-root-canonical-preference.ts`, and implement canonical planning-root preference or duplicate-root warnings.
  - Related tasks / commits: `BUG-ATM-0045`; external worker 004 report on 2026-06-14; `TASK-AAO-0043`.

- [ ] BUG-ATM-0061: `tasks claim` dependency gate resolves prerequisite tasks via local-repo absolute path only, breaking cross-repo dispatch
  - Status: open
  - Severity: P0 dispatch correctness (blocks legitimate planning_repo authority closeback flows)
  - Encountered: 2026-06-15 during `TASK-CID-0091` Phase A close attempt. The card declares `closure_authority: planning_repo` and `depends_on: [TASK-CID-0090]`. `TASK-CID-0090` was already closed (status `done`) in the AAF target_repo ledger. When running `node atm.mjs tasks claim --cwd C:/Users/User/3KLife --task TASK-CID-0091`, the gate looked exclusively at `C:\Users\User\3KLife\.atm\history\tasks\TASK-CID-0090.json` and reported `status: missing`. Mirror-importing the 0090 plan md into 3KLife made the file exist but status stayed `planned`, so claim still failed.
  - Reproduce / detect: Create task A in planning_repo with `closure_authority: planning_repo` and a dep on task B whose `closure_authority: target_repo` and whose ledger entry exists only in the target repo. Try `tasks claim` for A from the planning_repo cwd — fails closed even though B is genuinely done.
  - Impact: Any planning_repo authority card that depends on a previously closed target_repo card cannot complete the official `tasks reserve → promote → claim → close` lifecycle without an emergency lane. Drives operators to bypass the official close path entirely.
  - Possible optimization: When a dependency is declared and its target_repo / closure_authority metadata is known, the gate should also probe the target_repo ledger for that dependency's done state, OR follow a `historicalDelivery` reconcile path automatically, OR document an explicit cross-repo dep-mirroring command (`tasks mirror-done --task TASK-CID-0090 --from <target-repo>` style) that records the closed state in the planning_repo ledger without faking a full closure transition.
  - Related tasks / commits: `TASK-CID-0091`; `TASK-CID-0090`; this commit (Phase A guarded-B closeback).

- [ ] BUG-ATM-0062: `next --claim` framework-mode router blocks planning_repo authority closeback because it only inspects `target_repo`, ignoring `closure_authority`
  - Status: open
  - Severity: P0 dispatch correctness (compounds with BUG-ATM-0061 to make planning_repo authority cards effectively unclosable via official lane when target_repo points to a different framework repo)
  - Encountered: 2026-06-15 during `TASK-CID-0091` Phase A close attempt. The card frontmatter has `closure_authority: planning_repo` (3KLife) and `target_repo: AI-Atomic-Framework`. Running `node atm.mjs next --claim --cwd C:/Users/User/3KLife --actor codex-gpt-5.4-mini --prompt "TASK-CID-0091"` returned `ATM_NEXT_FRAMEWORK_TARGET_REPO_REQUIRED` with `frameworkMode: cross-repo-target-required`, forcing the operator to `cd C:/Users/User/AI-Atomic-Framework` before claim — but the card's closure authority is the planning repo, so being in AAF is wrong for closeback. The two surfaces disagree.
  - Reproduce / detect: Create a planning_repo authority card whose `target_repo` is a different framework repo (a legitimate pattern for RFC / planning cards that describe work landing elsewhere). Run `next --claim --cwd <planning-repo>` for it. The framework-mode router will fail closed and demand cwd be the target_repo, even though closure must happen in the planning_repo.
  - Impact: Combined with BUG-ATM-0061, the entire official claim/close lane is closed for planning_repo authority RFC/planning cards that describe work in another framework repo. Operators either route around via emergency lanes or commit deliverables without governed ledger closure, which is exactly what `BUG-ATM-0053` warned against.
  - Possible optimization: The framework-mode router (`route-status` check) should give precedence to `closure_authority`: when `closure_authority: planning_repo`, the planning_repo cwd is correct and the router must not redirect to target_repo. The target_repo redirect should fire only when the next mutation is a target_repo closeback (`closure_authority: target_repo` with planning_repo cwd) or when editing files inside target_repo from the planning_repo cwd.
  - Related tasks / commits: `TASK-CID-0091`; this commit (Phase A guarded-B closeback); related upstream pattern `BUG-ATM-0045` (planning-root preference family).

## Parallel 0041-0042 Dogfood and Close Lane - 2026-06-17

Captain note: several items below were hit during `TASK-MAO-0041` / `TASK-MAO-0042` broker dogfood and
`TASK-MAO-0052` close-operator work. Fixed items stay in the backlog for traceability.

### Quick-repair eligible (small, no new MAO card required)

| Bug | Why quick repair is enough |
|-----|----------------------------|
| `BUG-ATM-0063` | Already fixed + regression test; optional atom-map row only |
| `BUG-ATM-0064` | Already fixed via `TASK-MAO-0052`; backlog cross-link only |
| `BUG-ATM-0065` | Template default cleanup in opener / `tasks new` (~5 lines) |
| `BUG-ATM-0067` | Add implicit close validator to card template or dry-run hint (~10 lines) |
| `BUG-ATM-0069` | Doc / `writeReadinessHint` copy only |

### Prefer small AAO card or extend existing card (not emergency lane)

| Bug | Why not pure hotfix |
|-----|---------------------|
| `BUG-ATM-0066` | Policy: when post-open card edits should re-import without `--force` + emergency lease |
| `BUG-ATM-0070` | Broker batch planner behavior; needs test fixture + adapter rule |

- [x] BUG-ATM-0063: Pre-commit cross-file import scanner treats string/template import lookalikes as real imports
  - Status: fixed (2026-06-17)
  - Severity: P0 close blocker
  - Encountered: During `TASK-MAO-0041` delivery commit, `hook pre-commit` threw `Invalid regular expression ... validatorSurfaces: [` and blocked governed commit.
  - Reproduce / detect: Stage `close-orchestration.ts` with `closebackNote` containing `tasks import`, or stage a file whose template literal contains fake `import { ... } from "..."` while the imported target has unstaged symbol changes; run `node atm.mjs hook pre-commit --json`.
  - Impact: Any framework task touching `close-orchestration.ts` or similar prose can fail pre-commit with an opaque regex error instead of a consistency finding.
  - Root cause: Full-text loose `/import\s+...from.../g` scanning treated non-statement `import` tokens inside strings/templates/object literals as import statements.
  - Fix: `packages/cli/src/commands/hook.ts` now uses `collectImportStatements()` → `collectStaticImportSymbols()` (statement-level scan, skips comments/strings/templates) before `parseImportSymbols()`. `export ... from` is not an import statement and was not the false-match anchor. Secondary hardening: `escapeRegExp()` + identifier-shaped symbol filter.
  - Regression: `packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts` (`testCrossFileConsistencyIgnoresTemplateLiteralImportLookalikes`).
  - Related tasks / commits: `TASK-MAO-0041` delivery blocked then unblocked; hotfix commit `fa9b6b830`; verify with `node --experimental-strip-types packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts`.

- [x] BUG-ATM-0064: `next` normal playbook taught `tasks close` instead of `taskflow` close preview lane
  - Status: fixed (2026-06-17)
  - Severity: P0 agent discoverability
  - Encountered: Agents following `node atm.mjs next --json` were not told to run `taskflow pre-close` or `taskflow close` dry-run before `--write`; playbook listed protected `tasks close` as the normal path.
  - Reproduce / detect: Run `node atm.mjs next --prompt TASK-MAO-0052 --json` and inspect `evidence.nextAction.playbook.commandSequence` before fix.
  - Impact: Agents guess parameters, miss dual-repo bundle preview, and need human reminders about dry-run / `writeReadinessHint`.
  - Fix: `TASK-MAO-0052` updated `packages/cli/src/commands/next.ts` normal channel playbook to `pre-close` → `close` dry-run → `close --write`, plus `closePreview` block and `deliveryPrinciple.nextStep` alignment.
  - Related tasks / commits: `TASK-MAO-0052` (`ba96fe2ef` delivery, `9ffd1761d` close); cross-ref `BUG-ATM-0053`, `BUG-ATM-0042`.

- [x] BUG-ATM-0065: `taskflow open --write` template leaves bogus `depends_on: TASK-AAO-0000`
  - Status: fixed (2026-06-17, quick repair)
  - Severity: P1 workflow friction
  - Encountered: `TASK-MAO-0052` was imported with template dependency `TASK-AAO-0000` (missing ledger), blocking `next --claim` until force re-import after card edit.
  - Reproduce / detect: `taskflow open --write` with MAO profile using default `aao-l2-split` template; inspect imported `.atm/history/tasks/<id>.json` dependencies before editing the planning card.
  - Impact: Every freshly opened MAO card can fail claim with `ATM_NEXT_CLAIM_DEPENDENCY_BLOCKED` until manual import repair.
  - Possible optimization (quick repair): Remove placeholder dependency from template / host opener; default `depends_on: []` or derive from profile. No new MAO card required.
  - Fix: `aao-l2-split-template.md` defaults `depends_on: []`; `generateTaskCard()` and markdown task-source plugin emit `depends_on_yaml` instead of `TASK-AAO-0000`.
  - Related tasks / commits: `TASK-MAO-0052`; emergency force import `EMG-TASK-MAO-0052-fe57ca25f2`.

- [ ] BUG-ATM-0066: Post-open planning card edits require `tasks import --force` + emergency lease
  - Status: open
  - Severity: P1 workflow friction
  - Encountered: After `taskflow open --write`, editing planning frontmatter (scope, depends_on) hit `ATM_TASKS_IMPORT_DRIFT` then `ATM_EMERGENCY_LANE_APPROVAL_REQUIRED` for `--force`.
  - Reproduce / detect: Open a card, edit planning `.task.md`, run `tasks import --write --force` without emergency lease; then retry with `emergency approve --allowed-flag --force`.
  - Impact: Normal "fix the card after open" flow feels like emergency maintenance; agents need Captain intervention.
  - Possible optimization: Allow governed re-import when `source.planPath` hash drift is from the same actor/session within claim window, or expose `taskflow open --refresh` for planning mirror sync. Likely small AAO card, not a one-line hotfix.
  - Related tasks / commits: `TASK-MAO-0052`; `BUG-ATM-0012` (planning mirror drift family).

- [x] BUG-ATM-0067: Close gate requires `validate:git-head-evidence` but task cards omit it from `validators`
  - Status: fixed (2026-06-17, quick repair)
  - Severity: P1 closeback surprise
  - Encountered: `taskflow close --write` for `TASK-MAO-0052` failed with `ATM_TASK_CLOSE_CLOSURE_PACKET_INVALID` / absent `validate:git-head-evidence` though the card listed only `typecheck`, `validate:cli`, `git diff --check`.
  - Reproduce / detect: Close any task without running `evidence run` for `validate:git-head-evidence`; inspect closure packet missing list.
  - Impact: Agents complete all card-listed validators yet still fail close; dry-run does not always surface this early enough.
  - Possible optimization (quick repair): Add implicit close validators to `taskflow close` dry-run / `writeReadinessHint`, and/or append `validate:git-head-evidence` to MAO task template defaults. Cross-ref `BUG-ATM-0029`.
  - Fix: template lists `npm run validate:git-head-evidence`; `preflightBlockersToWriteReadinessBlockers()` maps all preflight blockers (including stale evidence) into `writeReadinessHint`.
  - Related tasks / commits: `TASK-MAO-0052`, `TASK-MAO-0041`.

- [x] BUG-ATM-0068: After delivery commit lands, `taskflow close --write` requires `--historical-delivery` without promoting dry-run `nextCommand`
  - Status: fixed (2026-06-17, TASK-AAO-0136 lane slice)
  - Severity: P1 close ergonomics (extends `BUG-ATM-0053` / `BUG-ATM-0058`)
  - Encountered: `TASK-MAO-0052` first `--write` partially committed delivery; second close returned `framework delivery already landed; supply --historical-delivery` instead of a copy-paste dry-run command with the delivery SHA.
  - Reproduce / detect: Commit delivery via `taskflow close --write` or governed git commit, then rerun `taskflow close --dry-run` without `--historical-delivery`; `writeReadinessHint.blockers[0].requiredCommand` must include detected SHA.
  - Impact: Two-step close is correct but easy to miss; agents treat it as failure rather than expected phase-2 close.
  - Fix: `detectHistoricalDeliveryCommit()` in `historical-delivery.ts` resolves delivery SHA from planning-card `delivery_commit`, `ATM-Task` trailer git log, or scoped recent commits; `buildTaskflowCloseWriteReadinessHint()` promotes it into `requiredCommand` / `nextCommand`.
  - Regression: `taskflow-dryrun.spec.ts` post-delivery second-close fixture; `historical-delivery.test.ts` detection unit tests.
  - Related tasks / commits: `TASK-MAO-0052` (`ba96fe2ef` → `9ffd1761d` with `--historical-delivery`); `BUG-ATM-0053`, `BUG-ATM-0058`, `TASK-AAO-0136`; AAF `00519573b`.

- [x] BUG-ATM-0069: Manual `git add` of out-of-bundle file blocks `taskflow close` with `INDEX_NOT_ISOLATED`
  - Status: fixed (2026-06-17, quick repair)
  - Severity: P2 operator clarity
  - Encountered: Staging `hook.ts` hotfix while closing `TASK-MAO-0041` caused `ATM_TASKFLOW_CLOSE_INDEX_NOT_ISOLATED` until `git restore --staged`.
  - Reproduce / detect: Stage a file outside `governedCommitBundle.targetRepo.stageFiles`, rerun `taskflow close --write`.
  - Impact: Correct fail-closed behavior, but remediation (`restore --staged` vs `--defer-foreign-staged`) is easy to miss during hotfix pressure.
  - Possible optimization (quick repair): Surface `unexpectedStagedFiles` and exact `git restore --staged -- <paths>` in top-level `writeReadinessHint.summary`. Doc-only acceptable.
  - Fix: `historical-close-preflight` adds `unexpectedStagedNonBundleFiles` blocker with `git restore --staged` command; `verifyRepoIndexIsolation` details include `restoreCommand`; dry-run `writeReadinessHint` merges the blocker.
  - Related tasks / commits: `TASK-MAO-0041`; `BUG-ATM-0054` family.

- [ ] BUG-ATM-0070: Broker `plan-batch` blocks same-anchor `insertAfterHeading` second request when first request creates anchor
  - Status: open
  - Severity: P2 broker dogfood (parallel merge)
  - Encountered: Parallel `0041`/`0042` dogfood: `REQ-0041-EVIDENCE-GATES` applied first; `REQ-0042-EVIDENCE-GATES` blocked because batch base lacked `## Evidence Bundle Manifest` at plan time.
  - Reproduce / detect: Batch two `insertAfterHeading` requests where request B targets a heading introduced by request A; run `broker plan-batch --apply`.
  - Impact: Real parallel markdown merges need steward pass or sequential batch ordering; broker cannot auto-queue dependent heading inserts.
  - Possible optimization: Teach batch planner dependency edges for heading creation, or auto-requeue blocked requests after prior batch mutates anchor. Small broker card, not emergency hotfix.
  - Related tasks / commits: `parallel-0041-0042` run `c393df1d-f9ab-4331-ac3e-3182df57ac45`; receipt `docs/ai_atomic_framework/broker-collision-evidence/runs/c393df1d-....json`.

## MEM Lane Cross-Repo Governance Gaps - 2026-07-15 (claude-fable-5)

- [x] BUG-ATM-0071: `tasks reconcile` verified `--delivery-commit` only against the local repo git, so cross-repo deliveries (planning-repo mirror of a target-repo close) could never be attested. Fixed in TASK-MEM-0007 (`--historical-delivery-repo` parity with `tasks close`, AAF commit cbf8a0aa).
- [ ] BUG-ATM-0072: cross-repo dependency gate — a card whose `depends_on` closed in another repo's ledger imports as `source-done-governance-incomplete`; plain and `--reconcile-mirror` imports cannot satisfy it, and the only repair (`tasks reconcile`) is an emergency surface. Sibling of BUG-ATM-0061. Repro: TASK-MEM-0003/0004 blocked on 3KLife-closed TASK-MEM-0001/0002.
- [ ] BUG-ATM-0073: `tasks reconcile` writes ledger/evidence/closure-packet records but establishes no commit session and does not commit its own outputs; the records then block every later governed commit as foreign/orphan residue. Workaround: strict per-task staging rides the historical-ledger-restore session bypass; interlocked pairs need swap-parking. Repro: TASK-MEM-0001/0002 mirrors, 2026-07-14.
- [ ] BUG-ATM-0074: failed `taskflow close --write` rollback deletes the task's own pre-existing evidence bundle (consumed into the pending packet, not restored), so每次失敗歸零重錄; combined with another captain's close cycles sweeping foreign untracked evidence bundles, two-captain contention makes plain `close` unable to converge. `--auto-evidence` (atomic in-process evidence+close) is the reliable pattern. Repro: TASK-MEM-0003/0004/0007 close storm, 2026-07-14/15.
- [ ] BUG-ATM-0075: `--auto-evidence` mapper only executes npm-script `validate:*` declarations; bare `npm run typecheck` and `git diff --check` card validators are skipped, leaving the packet missing `validationPasses/typecheck`. Repro: TASK-MEM-0003/0004.
- [ ] BUG-ATM-0076: claim admission `ATM_TASK_SCOPE_EXPANSION_REQUIRED` blocks on ANY ownerless deliverable-like dirty file repo-wide, even fully outside the card's scope; with no live claim covering the dirt the only lane is reversible stash-park. Repro: TASK-MEM-0005 vs orphan doc-id-registry shards; TASK-MEM-0003/0004 vs orphan skill edits.
- [ ] BUG-ATM-0077: runner-stale gate + a fast-committing peer captain starves the slower captain — build(~2.5min) never beats a 1-3min commit cadence; closes only converge inside quiet windows. Suggest: close-window runner pinning or stale-tolerance for pure-ledger closes.

- [ ] BUG-ATM-0078: branch commit queue lock self-heal requires `headMoved`, so an actor whose commit process crashed while holding the lock (e.g. outer 2-minute timeout SIGTERM) deadlocks itself until some OTHER writer moves HEAD; a solo captain would be stuck indefinitely. Self-heal should also accept owner-PID-dead + stale-age without the head-motion condition. Repro: TASK-MEM-0008 delivery commit, 2026-07-15.
- [ ] BUG-ATM-0079: record-only import ledger commits can pass `git record-commit --dry-run` but fail both the formal wrapper and host git hook in an active framework worktree. Formal wrapper reports `ATM_GIT_COMMIT_FRAMEWORK_STAGING_AMBIGUOUS` because unrelated active framework claim dirty files make the staged `.atm/history/**` records look out-of-claim; direct fallback commit then reports `ATM_CROSS_TASK_MUTATION_BLOCKED` because imported task ledger files are treated as active task-owned mutations without a task context. Repro: import `TASK-LANE-0001` from external planning source, stage `.atm/history/tasks/TASK-LANE-0001.json`, its task-event, and import report; dry-run succeeds, formal record commit and direct commit fail. Impact: Captain cannot reliably perform "import one task, commit one ledger record, push" in a shared active ATM framework repo. Possible optimization: give `record-commit` a hook-recognized low-risk record-only context, or allow import-generated ledger files to commit with `ATM-Record-Commit: true` without task-owner mutation blocking. Related tasks: `TASK-LANE-0001`, `TASK-SKL-0013`.
- [x] BUG-ATM-0074 root cause refined: evidence loss chain = close-window `deferGovernanceDirtyFiles` snapshot + hook auto-clean removing FOREIGN unconsumed `close-window-governance-dirty-*` snapshots (`restoredAt: null`) before the owning close restores them. Fixed in TASK-MEM-0009 (`isUnconsumedCloseWindowDeferralSnapshot` guard, AAF commit f3c789b3); taskflow-side try/finally restore was already present.
- [x] BUG-ATM-0072 operational fix: TASK-MEM-0008 classifies `tasks reconcile` — `clean-mirror-attestation` (imported-done mirror, no local closure artifacts, no live claim) proceeds WITHOUT an emergency lease; `local-closure-rewrite` keeps the emergency gate. Cross-repo dep-gate mirror recognition itself remains open as designed follow-up.

## Plan 3.1 Live Dogfood Gaps - 2026-07-22

- [ ] BUG-ATM-0080: Official Broker resolution command can emit a BCR that claim admission still cannot authorize. Canonical item: `ATM-BUG-2026-07-22-224`; owning card: `ATM-GOV-0255`. Repro: `ATM-GOV-0239` versus active `ATM-GOV-0249`, logical overlap `atom-core-registry`, `sharedPaths: []`.
- [ ] BUG-ATM-0081: Runner-sync can report `cacheHitSkip` for an older committed source while current source remains stale and `ATM_RUNNER_SYNC_REQUIRED` persists. Canonical item: `ATM-BUG-2026-07-22-225`; owning card: `ATM-GOV-0256`. Repro build source: `d7dbf215a25d601858472540b9ddcceb62cc82cc` during `ATM-GOV-0249`.
- [ ] BUG-ATM-0082: Captain actor authority is not carried reliably from active claim/queue ticket into generic routing and retained build; ambient `AGENT_IDENTITY` can win until `ATM_ACTOR_ID` is manually supplied. Canonical item: `ATM-BUG-2026-07-22-226`; owning card: `ATM-GOV-0257`.

## Current Captain Sequencing Ruling

As of 2026-06-14, the recommended order is:

1. Return to Team Agents with `TASK-TEAM-0002` as the first implementation card. It is the smallest useful product slice: dry-run crew briefing, no runtime writes, no subagent spawning.
2. Run `TASK-TEAM-0004` through `TASK-TEAM-0006` next if the goal is visible usability and the 90-minute first-card promise.
3. Insert `TASK-RFT-0008` before making `taskflow` or task-card lifecycle behavior heavier, because it is the smallest RFT card and directly supports safer task operations.
4. Insert `TASK-RFT-0003` before Team runtime cards (`TASK-TEAM-0011+`) or framework temp-claim expansion, because that module owns high-risk lifecycle behavior.
5. Keep MAO route work at the light prerequisite layer already landed. Do not continue broad MAO implementation before the Team Agents thin slice unless a blocker appears.
6. Treat full Runner Broker as long-term north-star. Use the lightweight Runner Sync Steward lane first for generated `release/**` governance.

## Maintenance Rules

- Keep this file as a checklist; do not close items silently.
- When an item becomes a real task card, add the task id under related tasks.
- When fixed, mark the checkbox and add the closing commit or evidence command.
- Do not use this backlog as authority to bypass ATM routing, task claim, evidence, or closure rules.
