# Paper Hotfile BLOCK - Claude Ops

你負責 `TASK-PAPER-HOTFILE-BLOCK-B`。

## 固定參數

- task: `TASK-PAPER-HOTFILE-BLOCK-B`
- actor: `bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-B:claude-opus47`
- target file: `packages/cli/src/commands/broker.ts`
- owner atom: `atm.broker.classify-explicit-mutation-request`
- bounded region: lines `841-878`
- 只允許改 `classifyExplicitMutationRequest`
- 不可碰 `parseBrokerArgs`
- 不可碰 `release/atm-root-drop/**`

## 開跑前

先確認:

1. 你所在 repo 是 `C:\Users\User\AI-Atomic-Framework`
2. worktree 是乾淨的
3. A 側已經先完成 register

## 執行順序

1. import task

```powershell
node atm.dev.mjs tasks import --from C:\Users\User\3KLife\docs\ai_atomic_framework\arxiv-paper-v1\TASK-PAPER-HOTFILE-BLOCK-B.task.md --write --cwd . --json
```

2. claim / validate / start

```powershell
node atm.dev.mjs next --claim --task TASK-PAPER-HOTFILE-BLOCK-B --actor bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-B:claude-opus47 --json
node atm.dev.mjs team validate --task TASK-PAPER-HOTFILE-BLOCK-B --actor bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-B:claude-opus47 --recipe atm.default.normal.typescript --json
node atm.dev.mjs team start --task TASK-PAPER-HOTFILE-BLOCK-B --actor bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-B:claude-opus47 --recipe atm.default.normal.typescript --json
```

3. 產生乾淨的 BLOCK-B intent file

```powershell
$base = (git rev-parse HEAD).Trim()
@"
{
  "schemaId": "atm.writeIntent.v1",
  "specVersion": "0.1.0",
  "migration": {
    "strategy": "none",
    "fromVersion": null,
    "notes": "paper hotfile BLOCK-B live evidence"
  },
  "taskId": "TASK-PAPER-HOTFILE-BLOCK-B",
  "actorId": "bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-B:claude-opus47",
  "baseCommit": "$base",
  "targetFiles": [
    "packages/cli/src/commands/broker.ts"
  ],
  "atomRefs": [
    {
      "atomId": "atm.broker.classify-explicit-mutation-request",
      "atomCid": "atm-broker-classify-explicit-mutation-request-broker-841-878",
      "operation": "modify",
      "sourceRange": {
        "filePath": "packages/cli/src/commands/broker.ts",
        "lineStart": 841,
        "lineEnd": 878
      }
    }
  ],
  "sharedSurfaces": {
    "generators": [],
    "projections": [],
    "registries": [],
    "validators": [],
    "artifacts": []
  },
  "requestedLane": "auto",
  "proposalAdmission": {
    "trigger": "same-file-overlap-risk",
    "summarySubmitted": true,
    "hotFiles": [
      "packages/cli/src/commands/broker.ts"
    ],
    "boundedRegions": [
      {
        "filePath": "packages/cli/src/commands/broker.ts",
        "lineStart": 841,
        "lineEnd": 878
      }
    ],
    "notes": "BLOCK-B same-owner overlapping bounded region for blocked-before-write evidence."
  }
}
"@ | Set-Content -Path .atm/runtime/bench-paper-hotfile-block-b-intent.json -Encoding utf8
```

4. 用乾淨的 BLOCK-B intent file register

```powershell
node atm.dev.mjs broker register --task TASK-PAPER-HOTFILE-BLOCK-B --actor bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-B:claude-opus47 --intent-file .atm/runtime/bench-paper-hotfile-block-b-intent.json --cwd . --json
```

5. register 後立即回報，不要 apply

```powershell
node atm.dev.mjs broker status --cwd . --json
```

## 預期結果

- 第二寫手應被 broker 擋在 `blocked-before-write`
- verdict 預期是 `blocked-cid-conflict` 或等價 blocked lane
- 若有 `decompositionRequest.suggestedAtoms`，要一併回報

## 回報欄位

- task
- actor
- team run id
- json path
- lane
- verdict
- decision / intent id
- shared file
- 是否帶出 split suggestion

## 禁止事項

- 不 apply
- 不 commit
- 不 release A 側 intent
- 不改 bounded region 外的任何行
