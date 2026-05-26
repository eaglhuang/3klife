---
doc_id: doc_index_aao_root
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
public_tracking: false
last_updated: 2026-05-26
---

# ATM Agent-First 可操作性優化（AAO）

這個目錄是 AAO 的唯一規劃真相來源。

AAO 的目標很直接：讓 AI 在使用 ATM 時少猜、少繞路、少被錯誤訊息卡住；同時不放鬆治理門檻。

## 文件

- 主計畫：[`ATM Agent-First 可操作性優化計畫書.md`](./ATM Agent-First 可操作性優化計畫書.md)
- 任務索引：[tasks/README.md](./tasks/README.md)
- 任務卡：`tasks/TASK-AAO-*.task.md`

## 開卡規範

新增或修改 AAO 任務卡時，先讀 ATM repo 的 `atm-task-card-authoring` skill。每張卡都必須有：

- `scopePaths`
- `deliverables`
- `validators`
- `evidence.required: command-backed`
- `rollback`
- `atomizationImpact`

新增 script / CLI / validator / report / artifact 的卡，必須同卡更新 atomization ownership map。

## Import check

```shell
node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md" --dry-run --json
```

如果 import 找不到 AAO 任務，或 fallback 到 unrelated task，代表 resolver / task surface 還有問題，不應讓 AI 繼續實作。
