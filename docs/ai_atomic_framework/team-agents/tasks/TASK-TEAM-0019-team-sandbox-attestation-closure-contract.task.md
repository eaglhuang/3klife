---
doc_id: doc_team_0019
task_id: TASK-TEAM-0019
title: "Team sandbox attestation and closure contract"
status: draft
owner: atm-core
priority: P0
milestone: M6H
depends_on:
  - "TASK-TEAM-0016"
  - "TASK-TEAM-0018"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "schemas/governance/closure-packet.schema.json"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-team-agents.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "schemas/governance/closure-packet.schema.json"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-team-agents.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case sandbox-attestation"
  - "node --strip-types scripts/validate-task-ledger-governance.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert attestation schema/validator additions and atom map entries. Do not remove legacy commandRuns hash fields."
atomizationImpact:
  ownerAtomOrMap: "atm.task-closure-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Closure packet and Team Agents summary changes belong under task closure and team runtime maps."
outOfScope:
  - "Replacing command-backed evidence with team summaries"
  - "Removing stdoutSha256/stderrSha256 from commandRuns"
  - "Declaring node:vm or isolated-vm as a secure sandbox"
  - "Introducing Docker or Deno runtime adoption without a separate runtime decision card"
  - "Auto-closing tasks from Team Agents reports"
nonGoals:
  - "Do not create a second closure packet format"
  - "Do not make sandbox attestation mandatory for local draft Team runs"
  - "Do not change task close semantics"
---
# TASK-TEAM-0019 — Team sandbox attestation and closure contract

## Goal

把 CID Hardening v2 的 E3 sandbox/attestation guidance 接進 Team Agents closure：team run 可以保存 runtime/sandbox attestation，但它只能支援 closure review，不能取代 ATM 原本的 command-backed evidence。

## Why

現況 closure packet 已有 `commandRuns`、exit code、stdout/stderr hash 與 framework `runnerVersion`，但 `runnerVersion` 不是 sandbox/OS/runtime attestation。CID Hardening v2 建議新增 `runnerKind`、`runtimeVersion`、`sandboxPolicyHash`、`attestationSigner`；Team Agents 需要先把這些欄位放進 team summary / closure packet 的相容模型，避免後續多代理 runtime 直接把「誰回報了什麼」誤當成「證據已通過」。

## Implementation Contract

1. 在 closure packet 或 team summary 中新增 optional `teamAttestation` 區塊。
2. `teamAttestation` 可包含：
   - `teamRunId`
   - `runnerKind`
   - `runtimeVersion`
   - `sandboxPolicyHash`
   - `attestationSigner`
   - `attestedAt`
3. `teamAttestation` 不可讓 failed validator 變成 pass，不可滿足 missing command-backed evidence。
4. 保留 legacy commandRuns hash 欄位；若要改成 result-envelope hash，另開 migration card。
5. Validator 必須覆蓋有/無 attestation 兩種 closure packet，以及 attestation 存在但 validator fail 的負例。

## Acceptance Criteria

- Closure packet with valid teamAttestation passes governance validation.
- Closure packet without teamAttestation still passes when existing evidence is valid.
- Failed validator + valid teamAttestation still fails close/evidence validation.
- Missing command-backed evidence + valid teamAttestation still fails.
- Schema/docs explicitly state `node:vm` / `isolated-vm` are not secure sandbox boundaries for untrusted code.

## Validators

```
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-team-agents.ts --case sandbox-attestation
node --strip-types scripts/validate-task-ledger-governance.ts
git diff --check
```

## Stop Conditions

- 若實作需要採用 Deno、Docker、microVM、CI-signed attestation 或 git-server signer，先開獨立 runtime/security decision card。
- 若 closure-packet schema 與 current validator drift 過大，先補 schema/validator alignment，不要在本卡同時遷移 result-envelope。
