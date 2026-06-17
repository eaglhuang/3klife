# MAO Multi-Agent Orchestration

MAO is the ATM planning stream for multi-agent logical parallelism.

It is separate from AAO:

- AAO improves agent operability and CLI ergonomics.
- MAO designs and implements multi-agent route contexts, broker admission, freeze/resume, patch envelopes, and steward arbitration.
- M7 closeback and operator recovery hardens the real-world close path exposed by MAO 0009/0010 dogfood: result contracts, protected override audit, pre-close blockers, atomic close rollback, foreign staged restore, scoped commit bundles, close-window locking, evidence bundles, validator scope, claim repair, task-view, and closeback runbooks.
- M7 also adds a normal audited `tasks scope add` lane and keeps `tasks scope repair` as the protected maintenance lane so linked docs, tests, help snapshots, and generated artifacts can be handled without misusing emergency approval.
- M8 runtime integration and replay validation connects freeze and patch-envelope contracts to runtime paths, then extends the MAO benchmark with deterministic event replay from task history.

Active worker handoff (2026-06-17):

- [HANDOFF-2026-06-17-M7-M8-MAO-CONTINUATION.md](./HANDOFF-2026-06-17-M7-M8-MAO-CONTINUATION.md) — 0036/0038 已關；新對話請 `@` 此檔或貼檔內 Opening Prompt

Primary plan:

- [MAO多AI並行治理計畫書.md](./MAO多AI並行治理計畫書.md)

Task roster:

- [tasks/README.md](./tasks/README.md)

Current closeback hardening wave:

- [TASK-MAO-0043 through TASK-MAO-0045](./tasks/README.md#m7-closeback-and-operator-recovery-wave)

Current runtime integration wave:

- [TASK-MAO-0046 through TASK-MAO-0048](./tasks/README.md#m8-runtime-integration-and-replay-validation-wave)
