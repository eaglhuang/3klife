<!-- doc_id: doc_cid_index_0001 -->

# CID Hardening Lane

> ATM CID 安全強化治理 lane。與 `atomic-police-family/`（APF）、`team-agents/`（TEAM）並列為獨立治理任務族。
> 規劃真相來源：[CID 硬化計畫書](./CID硬化計畫書.md)
> 任務卡索引：[tasks/README.md](./tasks/README.md)
> 事實基線：[00-verified-facts.md](./00-verified-facts.md)

## 定位

- **CID Hardening** 管「原子身分指紋（CID）的安全等級如何分維度、分階段演進」。
- 與 APF 互補：APF 是巡邏警察（看結構衰敗）；CID Hardening 是身分系統（確定誰是誰、誰可替換誰）。
- 與 TEAM 互補：TEAM 是並發與分工協定；CID Hardening 的 E2/E3 直接對齊 `TASK-TEAM-0018`/`0019`。

## 鐵律

- 本 lane 是 **planning source of truth**。所有設計卡先在 `3KLife` 收口，定稿後才拆 AAF（`AI-Atomic-Framework`）實作卡。
- 凡新增能力一律標「提案（未實作）」，不得寫成現況已支援。
- 不得手改 `.atm/runtime/**` 或 `.atm/history/**`。
- 維持 `directApplyAllowed:false`、走 `ReviewAdvisory + HumanReviewDecision`、不開第二審核器。

## 開卡順序

1. **E0 最小閉環（先收口）**：`TASK-CID-0001` → `0002` → `0003`
2. **P0 核心能力**（CID-first parallel conflict advisor + brokered write governance）：`TASK-CID-0005`、`0009`、`0010`、`0011`
3. **E1 / E3 / E5 設計**（可平行排）：`TASK-CID-0004`、`0006`、`0007`

詳見 [tasks/README.md](./tasks/README.md)。

## 治理流程

1. `node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-XXXX-*.task.md" --json`
2. `node atm.mjs next --prompt "<intent>" --json` → 走 ATM 路由
3. claim → 依卡 deliverables 與 validators 收口
4. `node atm.mjs tasks close --json`（planning 卡走 planning_repo authority）

## Cross-References

- 規劃真相：[CID 硬化計畫書](./CID硬化計畫書.md)
- APF 控制面：[../atomic-police-family/原子警察家族計畫書.md](../atomic-police-family/原子警察家族計畫書.md)
- TEAM 控制面：[../team-agents/團隊自動化代理分工計畫.md](../team-agents/團隊自動化代理分工計畫.md)
- 上游核准 roadmap：`C:/Users/User/.claude/plans/ticklish-bouncing-lagoon.md`（v3.1）
