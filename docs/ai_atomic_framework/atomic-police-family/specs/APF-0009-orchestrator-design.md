<!-- doc_id: doc_other_0264 -->
# APF-0009 — Police Orchestrator Design

## 1. 模組對應

| 構件 | 上游現況 |
|---|---|
| `runPoliceChecks` | 既有 4 check 註冊器 |
| `runLifecyclePolice` | 既有獨立 entry |
| `validate-police.ts` | 7 test suite |
| validator profiles | `validate:quick / standard / full` 既有 |

## 2. Family registry

```ts
const policeFamilyRegistry: Record<PoliceFamilyName, FamilyEntry> = {
  schema:               { mode:'fast', profile:'quick',    blocker:true  },
  'dependency-graph':   { mode:'fast', profile:'quick',    blocker:true  },
  boundary:             { mode:'fast', profile:'quick',    blocker:true  },
  lifecycle:            { mode:'fast', profile:'quick',    blocker:true  },
  'registry-consistency':{ mode:'fast', profile:'standard',blocker:true },
  quality:              { mode:'fast', profile:'standard', blocker:true  },
  'map-integration':    { mode:'slow', profile:'standard', blocker:true  },
  dedup:                { mode:'slow', profile:'standard', blocker:false }, // advisory
  demand:               { mode:'slow', profile:'standard', blocker:false }, // advisory
  atomization:          { mode:'slow', profile:'full',     blocker:true  },
  orchestrator:         { mode:'fast', profile:'full',     blocker:false }, // self
};
```

## 3. CLI 提案

```bash
# 既有 entry 不變
npm run validate:police       # 仍跑 runPoliceChecks 4 check
npm run validate:quick        # quick profile
npm run validate:standard     # APF 目標 standard profile（advisory-first）
npm run validate:full         # full profile（全部 11 family）

# 新增（advisory）
npm run police:report -- --family <name>   # 單一 family scan & report
npm run police:report -- --family all      # 全 family scan
```

## 4. Promotion 條件

advisory → blocker 的升級條件，由 APF-0010 backwrite 規格定義：
- 必須有 **正反 fixture 各兩組** 通過。
- 連續 **兩個 release** 在 `validate:standard` 為 advisory 無誤報。
- ReviewAdvisory queue 內 false-positive 比例 < 5%。
- 滿足條件後，governance bundle 將該 family `blocker:false → true`。

## 5. 不變項

- 不建立第二套 approval workflow；統一接 ReviewAdvisory.machine-finding。
- standard profile 初期只 advisory，避免 CI 過早 fail。
- full profile 為 opt-in，由 release branch CI 啟動。
- orchestrator finding 自身可 advisory（family 健康度 telemetry）。
## 6. Current vs target profile 修訂

目前 upstream `validators.config.json` 中，`validate:police` 位於 `full` profile；`validate:map-curator` 與 `validate:regression-compare` 已在 `standard` profile。上方 family registry 是 APF 目標設計，不是 upstream 現況。實作時必須先以 advisory report 進場，等 APF-0010 promotion 條件滿足後才可升 blocker。
