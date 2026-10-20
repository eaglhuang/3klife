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
