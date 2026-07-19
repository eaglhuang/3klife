---
task_id: ATM-GOV-0203
title: First layer routing compact orientation and Windows safe command contracts
status: planned
owner: atm-governance
priority: P1
depends_on:
  - ATM-GOV-0196
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV governance-optimization plan with first-layer dogfood UX repair.
scopePaths:
  - packages/cli/src/commands/next/**
  - packages/cli/src/commands/guide.ts
  - packages/cli/src/commands/command-specs/guide.spec.ts
  - packages/core/src/guidance/**
  - integrations/**
  - templates/**
  - scripts/validate-guide.ts
  - scripts/validate-prompt-scoped-next/**
  - tests/cli/first-layer-command-contracts.test.ts
deliverables:
  - backlog/audit/optimization prompt routes
  - compact default orientation with explicit full mode
  - canonical skill/help command contracts
  - Windows-safe Node/rg examples and source projection
  - tests/cli/first-layer-command-contracts.test.ts
validators:
  - node --strip-types tests/cli/first-layer-command-contracts.test.ts
  - node --strip-types scripts/validate-guide.ts
  - node --strip-types scripts/validate-prompt-scoped-next.ts
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.guidance-command-contracts
  mapUpdates: []
  extractionCandidates:
    - atom: atm.first-layer-command-contracts
      pattern: First Layer Command Contracts
      source: packages/core/src/guidance/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m4-proof-and-ux
surfaceFamily: guidance-ux
---

# ATM-GOV-0203 First layer routing compact orientation and Windows safe command contracts

## Intent

把 dogfood 中反覆查 CLI help、錯誤 prompt routing、過長 orientation 與 Windows 文件讀取踩坑回修到 canonical skill/router/help 的第一層。正常用法應直接可見；CLI discovery 是 fallback，不是每位隊長都要重走的必經路。

## Evidence Baseline

- 明確 backlog/audit prompt 曾落入 unknown→create-atom。
- orientation 曾輸出完整 validator 清單，造成不必要 token/注意力成本。
- framework-mode `release` 只接受 actor、checkpoint stale task、PowerShell range 讀取等摩擦需回寫 source skill，而非只留聊天記憶。
- 對應 backlog：ATM-BUG-2026-07-19-042、043、037、041（及其去重後 canonical refs）。

## Producer / Consumer Contract

- Producer：next route telemetry、guide/help usage、backlog dogfood records、0196 observed route summary。
- Consumer：所有 editor adapters/canonical skill projections、Captain/worker first-touch flow。
- Window：讀 0196 route/usage signal；修復前後各量 prompt route、help fallback 次數與 orientation output size。
- Role：M4 UX treatment。
- Missing-data semantics：沒有 usage telemetry 時只能以 deterministic fixtures 證明契約，不能宣稱實際 token 節省。
- Raw-data policy：完整 prompt/command log 留 runtime；tracked 只放 fixture、契約與 aggregate output-size digest。

## Required Work

- backlog/audit/optimization prompt 明確路由既有 backlog/audit flow，不再 create-atom。
- orientation 預設只顯示 blocker、recommended action、validator 摘要；完整清單只在 `--full`/verbose。
- canonical skill/help 第一層列出常見 release/checkpoint/backlog/audit 語法與 framework/adopter 差異；projection 生成安裝副本，禁止直接手改副本。
- 文件範例以 Node UTF-8/`rg` 為 Windows-safe 預設，不推薦 PowerShell range/document parsing。

## Data-Driven Stop Rule

若 compact orientation 隱藏安全 blocker、router 規則與 create/bug intent 無法 deterministic 區分、或 canonical source 無法可靠投影到 adapters，停止並要求 owner 選擇資訊層級；不得只為少 token 犧牲可操作性。

## Acceptance

- [ ] backlog/audit/optimization prompts 路由正確，create intent 保持原行為。
- [ ] compact orientation 保留 blocker/action，full mode 可取得完整清單。
- [ ] release/checkpoint/backlog happy path 不需要先查 help。
- [ ] canonical source 與 Codex/Claude/Cursor/Copilot/Gemini projections parity。
- [ ] 修復前後 output size/help-fallback 有摘要；缺 live usage 時不誇大效果。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-19T15:31:12.227Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0203-first-layer-routing-compact-orientation-and-windows-safe-command-contracts.task.md","contentDigest":"sha256:18407473d05688b973c55c09ac1b11e02d81fb033a4e3827ce312ceb6ae7512e"} -->
