---
doc_id: doc_index_1008
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-07-14T00:00:00+08:00
created_by_agent: Codex-GPT-5.5
last_updated: 2026-07-15T18:25:00+08:00
---

# ATM 治理流程與 Team Agents 加速優化 Task Cards

本目錄是中文主計畫的可執行任務卡來源。卡片在 3KLife 規劃，透過 ATM `tasks import` 進入 `AI-Atomic-Framework` 正式 ledger；實作、證據、close 與 commit 仍由 target repository 管理。

## 任務索引

| Task ID | 任務 | 優先級 | 狀態 | 依賴 |
|---|---|---:|---|---|
| [ATM-GOV-0124](./ATM-GOV-0124-charter-authority-bundle.task.md) | Charter 與第一性原理 authority bundle | P0 | done | 無 |
| [ATM-GOV-0125](./ATM-GOV-0125-captain-quick-wins.task.md) | Captain quick wins / provider preflight | P1 | done | 無 |
| [ATM-GOV-0143](./ATM-GOV-0143-provider-billing-cost-accounting.task.md) | Provider usage、標準定價表與真實成本核算 | P0 | done | 無 |
| [ATM-GOV-0144](./ATM-GOV-0144-official-pricing-catalog-refresh.task.md) | 官方定價 refresh crawler | P1 | done | 0143 |
| [ATM-GOV-0126](./ATM-GOV-0126-paired-cost-baseline.task.md) | ATM/Team 配對真實成本與時間基線 | P0 | done | 0143 |
| [ATM-GOV-0127](./ATM-GOV-0127-release-steward-safety.task.md) | Release steward 安全 lane | P0 | done | 無 |
| [ATM-GOV-0128](./ATM-GOV-0128-multi-captain-index-isolation.task.md) | Serialization / index 收斂 | P0 | done | 無 |
| [ATM-GOV-0132](./ATM-GOV-0132-framework-taskflow-opener.task.md) | Framework taskflow opener | P0 | done | 0124 |
| [ATM-GOV-0133](./ATM-GOV-0133-planning-source-seal.task.md) | Planning-source seal | P0 | done | 無 |
| [ATM-GOV-0134](./ATM-GOV-0134-governance-hotfile-sharding.task.md) | Governance hotfile sharding | P0 | done | 無 |
| [TASK-RFT-0026](./TASK-RFT-0026-central-atomization-line-bound.task.md) | 中央原子化行數上限 | P1 | done | 0124 |
| [ATM-GOV-0129](./ATM-GOV-0129-seal-and-commit.task.md) | Seal-and-commit 交易 | P0 | done | 0127、0128、0133 |
| [ATM-GOV-0130](./ATM-GOV-0130-close-crash-residue-recovery.task.md) | Close crash 與 residue 復原 | P0 | done | 0129 |
| [ATM-GOV-0131](./ATM-GOV-0131-validation-receipt-reuse.task.md) | Validation receipt 重用 | P1 | done | 0129 |
| [ATM-GOV-0135](./ATM-GOV-0135-shadow-first-team-scheduler.task.md) | Shadow-first Team scheduler | P1 | done | 0126、0129、0130、0131、0134 |
| [ATM-GOV-0136](./ATM-GOV-0136-contribution-composer.task.md) | Contribution composer | P1 | done | 0135 |
| [ATM-GOV-0137](./ATM-GOV-0137-team-admission-projection.task.md) | Team admission projection | P1 | done | 0126、0135 |
| [ATM-GOV-0138](./ATM-GOV-0138-broker-registry-transaction.task.md) | Broker registry transaction | P2 | done | 0137 |
| [ATM-GOV-0139](./ATM-GOV-0139-obligation-map-canary.task.md) | Obligation map / canary | P1 | done | 0131 |
| [ATM-GOV-0140](./ATM-GOV-0140-team-efficiency-controller.task.md) | Team efficiency controller | P1 | done | 0126、0137 |
| [ATM-GOV-0141](./ATM-GOV-0141-batch-mode-integration.task.md) | Batch integration | P2 | done | 0129、0140 |
| [ATM-GOV-0142](./ATM-GOV-0142-release-publication-steward.task.md) | Release publication steward | P2 | done | 0127、0129 |
| [TASK-RFT-0027](./TASK-RFT-0027-atomization-large-module-map-rollout.task.md) | 大型 module 原子化 rollout | P2 | done | TASK-RFT-0026 |
| [TASK-RFT-0028](./TASK-RFT-0028-team-agent-governance-dogfood.task.md) | Team governance dogfood | P2 | done | 0136、0140 |

## 維護規則

- 正式匯入必須先跑 `tasks import --dry-run`，不得手改 `.atm/history/**`。
- 任務卡的 target repo 與 closure authority 固定為 `AI-Atomic-Framework`。
- Acceptance、validator、scope、rollback 與 atomization impact 必須保留在單卡。
- 新 atom、map、script 與支援模組預設不超過 600 行，實際值由中央設定解析。
- Canonical 標準定價 JSON 只能以新版本發布；官方價格 crawler 只產生候選 diff，通過來源與 schema 驗證後才可升版。
- Token 數保留為容量與異常診斷；跨廠商、模型與方案的經濟比較以可追溯的 actual/fully-loaded monetary cost 為主。
- 已 fixed 的 backlog row 只作 regression，不得重複實作。
- Foundation Gate 未通過前，外部 Team write 保持關閉。
