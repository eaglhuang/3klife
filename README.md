<!-- doc_id: doc_index_0019 -->
# AI Atomic Framework Tracking Workspace

這個 repo 用來追蹤 ATM（AI Atomic Framework）在 3KLife 的里程碑、任務卡與 deterministic 驗證證據。

## Quick Start（Tracking Repo）

```bash
npm ci
npm run validate:atm-milestone
npm run validate:rule-guard-read-only
npm run validate:registry-backfill-sweep
npm run validate:usage-evidence-shadow
npm run validate:h2u-evolution-pilot
```

以上流程可在不安裝 LangGraph、pgvector、Deno sandbox 或 observability stack 的情況下直接重放 M1/M2 關鍵證據。

## Quick Start（Upstream Standalone）

若你在上游 `AI-Atomic-Framework` repo，hello-world 最小流程如下：

```bash
npm ci
npm run validate:bootstrap
npm run validate:self-hosting-alpha
atm init --adopt
atm test --atom hello-world
```

## 文件入口

- `docs/QUICK_START.md`
- `docs/API.md`
- `docs/SPEC_GUIDE.md`
