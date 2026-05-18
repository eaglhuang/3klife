<!-- doc_id: doc_other_0639 -->
# APF-0018 — ReviewAdvisory Bridge Fixtures

## 1. 目的

驗證 M7 gate 產出的 police finding 能進入既有 ReviewAdvisory / HumanReviewDecision 流程，而不是長出第二套審核或任務路由器。

## 2. Positive fixtures

| Fixture | 期待 |
|---|---|
| `positive/police-machine-finding` | `ReviewAdvisoryFinding.trigger='machine-finding'` 且 `metadata.policeFinding` 存在 |
| `positive/advisory-police-finding` | advisory finding 進 ReviewAdvisory，不造成 deterministic fail |
| `positive/blocking-police-finding` | blocker family finding 會標入 `blockingFindings[]`，並要求 human review context |
| `positive/evidence-refs-split` | official evidence type 與 police-local artifact/readModel ref 分層正確 |

## 3. Negative fixtures

| Fixture | 期待 |
|---|---|
| `negative/payload-as-current-contract` | reject 或 fail fixture；`payload` 只能是未來 additive proposal |
| `negative/non-lifecycle-quarantine` | 非 lifecycle police 不得發出 quarantine writer action |
| `negative/advisory-bypasses-human-review` | advisory finding 不得直接產生 approved decision |
| `negative/private-path-in-upstream-finding` | protected upstream fixture 不得含 3KLife / Cocos / private path |

## 4. Acceptance

- `validate:review-advisory` 能讀取 machine finding fixture。
- `metadata.policeFinding` 是預設 bridge path。
- Advisory finding 必須停在 review / monitor / follow-up draft，不可繞過 `HumanReviewDecision`。
