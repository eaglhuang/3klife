# ATM Bug and Optimization Backlog — Captain Severity Triage - 2026-06-14

> 這是 `ATM_BUG_OPTIMIZATION_BACKLOG.md` 的「Captain Severity Triage - 2026-06-14」分片。完整索引見 `docs/ai_atomic_framework/ATM_BUG_OPTIMIZATION_BACKLOG.md`。

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
