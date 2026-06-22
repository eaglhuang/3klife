# Paper Hotfile BLOCK - Codex Ops

我方負責 `TASK-PAPER-HOTFILE-BLOCK-A`。

## 固定參數

- task: `TASK-PAPER-HOTFILE-BLOCK-A`
- actor: `bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-A:codex-gpt5`
- target file: `packages/cli/src/commands/broker.ts`
- owner atom: `atm.broker.classify-explicit-mutation-request`
- bounded region: lines `841-878`
- 只允許改 `classifyExplicitMutationRequest`
- 不可碰 `parseBrokerArgs`
- 不可碰 `release/atm-root-drop/**`

## 執行順序

1. import task

```powershell
node atm.dev.mjs tasks import --from C:\Users\User\3KLife\docs\ai_atomic_framework\arxiv-paper-v1\TASK-PAPER-HOTFILE-BLOCK-A.task.md --write --cwd . --json
```

2. claim / validate / start

```powershell
node atm.dev.mjs next --claim --task TASK-PAPER-HOTFILE-BLOCK-A --actor bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-A:codex-gpt5 --json
node atm.dev.mjs team validate --task TASK-PAPER-HOTFILE-BLOCK-A --actor bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-A:codex-gpt5 --recipe atm.default.normal.typescript --json
node atm.dev.mjs team start --task TASK-PAPER-HOTFILE-BLOCK-A --actor bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-A:codex-gpt5 --recipe atm.default.normal.typescript --json
```

3. 產生 BLOCK-A intent file

```powershell
$base = (git rev-parse HEAD).Trim()
@"
{
  "schemaId": "atm.writeIntent.v1",
  "specVersion": "0.1.0",
  "migration": {
    "strategy": "none",
    "fromVersion": null,
    "notes": "paper hotfile BLOCK-A live evidence"
  },
  "taskId": "TASK-PAPER-HOTFILE-BLOCK-A",
  "actorId": "bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-A:codex-gpt5",
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
    "notes": "BLOCK-A same-owner overlapping bounded region for blocked-before-write evidence."
  }
}
"@ | Set-Content -Path .atm/runtime/bench-paper-hotfile-block-a-intent.json -Encoding utf8
```

4. register，然後通知 B 側進場

```powershell
node atm.dev.mjs broker register --task TASK-PAPER-HOTFILE-BLOCK-A --actor bench:PAPER-HOTFILE-BLOCK:TASK-PAPER-HOTFILE-BLOCK-A:codex-gpt5 --intent-file .atm/runtime/bench-paper-hotfile-block-a-intent.json --cwd . --json
node atm.dev.mjs broker status --cwd . --json
```

5. 不 apply，等 B 側 register 後觀察 blocked 與 split suggestion

## 預期結果

- A 側通常先拿到 provisional / active intent
- B 側進場時被 broker 擋下
- broker 應留下 same-owner split suggestion，供後續 curator review evidence 使用
