# ATM Bug and Optimization Backlog — Plan 3.1 Live Dogfood Gaps - 2026-07-22

> 這是 `ATM_BUG_OPTIMIZATION_BACKLOG.md` 的「Plan 3.1 Live Dogfood Gaps - 2026-07-22」分片。完整索引見 `docs/ai_atomic_framework/ATM_BUG_OPTIMIZATION_BACKLOG.md`。

## Plan 3.1 Live Dogfood Gaps - 2026-07-22

- [ ] BUG-ATM-0080: Official Broker resolution command can emit a BCR that claim admission still cannot authorize. Canonical item: `ATM-BUG-2026-07-22-224`; owning card: `ATM-GOV-0255`. Repro: `ATM-GOV-0239` versus active `ATM-GOV-0249`, logical overlap `atom-core-registry`, `sharedPaths: []`.
- [ ] BUG-ATM-0081: Runner-sync can report `cacheHitSkip` for an older committed source while current source remains stale and `ATM_RUNNER_SYNC_REQUIRED` persists. Canonical item: `ATM-BUG-2026-07-22-225`; owning card: `ATM-GOV-0256`. Repro build source: `d7dbf215a25d601858472540b9ddcceb62cc82cc` during `ATM-GOV-0249`.
- [ ] BUG-ATM-0082: Captain actor authority is not carried reliably from active claim/queue ticket into generic routing and retained build; ambient `AGENT_IDENTITY` can win until `ATM_ACTOR_ID` is manually supplied. Canonical item: `ATM-BUG-2026-07-22-226`; owning card: `ATM-GOV-0257`.
