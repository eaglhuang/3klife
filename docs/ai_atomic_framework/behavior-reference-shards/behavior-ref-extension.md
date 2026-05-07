# 原子行為參考手冊 — 擴充指南與狀態機參考

> 這是 `原子行為參考手冊.md` 的「擴充指南與狀態機參考」分片。完整索引見 `docs/ai_atomic_framework/原子行為參考手冊.md`。

## 6. 擴充指南

新增第 11 個行為（例如 `behavior.snapshot` 快照原子）只需要 3 步：

### Step 1：實作 AtomBehavior interface

```typescript
import { AtomBehavior, AtomBehaviorInput, AtomBehaviorContext, AtomBehaviorOutput } from '@ai-atomic/plugin-sdk';

export const snapshotBehavior: AtomBehavior = {
  id: 'behavior.snapshot',
  version: '1.0.0',
  category: 'observation',
  produces: ['report'],

  async validate(input, ctx) { /* ... */ },
  async propose(input, ctx) { /* ... */ },
  async apply(output, ctx) { /* ... */ },
  async rollback(output, ctx) { /* ... */ },
};
```

### Step 2：在啟動時註冊

```typescript
import { behaviorRegistry } from '@ai-atomic/core';
import { snapshotBehavior } from './snapshot';

behaviorRegistry.register(snapshotBehavior);
```

### Step 3：在 config 中宣告

```jsonc
// behaviors.config.json
{
  "plugins": [
    { "path": "./plugins/snapshot", "behaviors": ["behavior.snapshot"] }
  ]
}
```

**完全不必動 core schema、不必動 registry、不必動 police core 規則。**

---

## 7. 狀態機快速參考

> 完整狀態機定義見 `關於進化版的原子提案.md` Part V §7。
> 視覺圖見 [atom-lifecycle-state-machine.svg](atom-lifecycle-state-machine.svg)。

### 7.1 合法 transition 矩陣（行為 → 狀態變化）

| 行為 | 起點 | 終點 |
|---|---|---|
| split | active | 2+ active |
| merge | active + active | 1 active + N deprecated |
| dedup-merge | active + active | 1 active + 1 deprecated |
| evolve | active@vN | active@vN+1 |
| sweep | active (0 callers) | deprecated |
| expire | deprecated (TTL) | expired |
| polymorphize | active | active (template) + N validated |
| compose | n active | same + 1 new map active |
| infect | target active | target unchanged |
| atomize | legacy | 1 draft → validated → active |

### 7.2 mutabilityPolicy 限制

| mutabilityPolicy | 允許的 behavior |
|---|---|
| `mutable` | 所有 |
| `frozen-after-release` | 僅 `evolve`（產新版），不允許 in-place 修改 |
| `immutable` | 僅 `sweep` / `expire`（退役），其餘全部拒絕 |

---

*本文件由 ATM-IDENTITY-BEHAVIOR-V1 chain 規劃產出 | 2026-05-07*
