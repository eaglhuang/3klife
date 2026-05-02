# Sanguo Progress Advance Workflow（sanguo-progress-advance）

此 workflow 用於在使用者要求「整體推進三國 RAG / 武將資料完成度」時，依照 ABAB…C 節奏執行 staged / sidecar 層的資料補全。

## Trigger Phrase

當使用者說：

- `來推進整體的進度吧`
- `推進三國 RAG 完成度`
- `Start implementation` 且上下文指向 ABAB…C 補全方案
- `跑 ABAB 補全流程`
- `把所有武將資料往前推進`

代理應進入此 workflow。

## 使用時機

使用於：

- 推進三國 RAG completion percent。
- 批次補武將資料缺口。
- 消化 repair backlog。
- 用 agent reviewer 預審事件候選。
- 把多輪殘留問題整理成人工審核文件。

## 禁忌

不得：

- 無人工 gate 直接寫 canonical。
- 無限制輪巡。
- 忽略 repeated residuals。
- 把 `agent-reviewer` 的結果視為正式史實。
- 因 staged completion 上升就宣稱 canonical 完成。

## 進入前必讀

1. `docs/sanguo-rag-abab-progress-workflow-plan.md`
2. `.agents/skills/sanguo-knowledge-growth-loop/SKILL.md`
3. `.agents/skills/sanguo-event-review-loop/SKILL.md`
4. `.agents/skills/sanguo-rag-resolution-loop/SKILL.md`

## Default Policy

```json
{
  "aMaxRounds": 3,
  "abMaxCycles": 3,
  "topFocusGenerals": 5,
  "topPerGeneral": 5,
  "reviewBatchSize": 3,
  "noImprovementThreshold": 0.05,
  "noImprovementPatience": 2,
  "canonicalWrites": false
}
```

流程：

```text
A 最多 3 輪
  -> 若 pending review 太多，切 B
  -> B 完再回 A
  -> AB 最多 3 cycle
  -> 仍卡住就 C
```

## Step 0. Preflight

確認：

- repo root: `/mnt/c/Users/User/3KLife`
- server cwd: `/mnt/c/Users/User/3KLife/server/npc-brain`
- graph: `sanguo_etl_repair_graph`
- campaign script: `server/npc-brain/pipelines/sanguo-rag/run_repair_review_campaign.py`
- controller script: `server/npc-brain/pipelines/sanguo-rag/run_progress_advancement_loop.py`

讀目前 summary：

- completion summary
- campaign summary
- ETL pilot report
- review queue

## Step A. Auto Draft Round

### Studio State

```json
{
  "runLabel": "progress-a-r1",
  "focusStatus": "needs-etl-evidence",
  "topFocusGenerals": 5,
  "reviewTop": 20,
  "requireHumanReviewInterrupt": false,
  "reviewInterruptBatchSize": 3,
  "runContextEnrichment": true,
  "fillReviewAnswers": true,
  "runRepairCampaign": true,
  "runApiReadinessRefresh": false,
  "reviewerPreset": "agent",
  "reviewerProvider": "agent-reviewer",
  "stepTimeoutSeconds": 30,
  "overwriteOutputs": true
}
```

### CLI fallback

```bash
cd /mnt/c/Users/User/3KLife

$HOME/.venv/3klife-etl/bin/python \
  server/npc-brain/pipelines/sanguo-rag/run_repair_review_campaign.py \
  --round-id progress-a-r1 \
  --top-generals 5 \
  --top-per-general 5 \
  --reviewer-preset agent \
  --reviewer-provider agent-reviewer \
  --step-timeout-seconds 30 \
  --overwrite
```

### Controller MVP

若要讓外層 stop rules 與 residual dossier 自動化，使用：

```bash
cd /mnt/c/Users/User/3KLife

$HOME/.venv/3klife-etl/bin/python \
  server/npc-brain/pipelines/sanguo-rag/run_progress_advancement_loop.py \
  --run-id progress-abab-r1 \
  --max-rounds 3 \
  --top-generals 5 \
  --top-per-general 5 \
  --reviewer-preset agent \
  --reviewer-provider agent-reviewer \
  --step-timeout-seconds 30 \
  --overwrite
```

## A Stop / Check Decision Table

| Condition | Action |
|---|---|
| `deltaOverallPercent >= 0.05` and pending low | Continue A |
| `deltaOverallPercent < 0.05` once | Continue but mark weak improvement |
| `deltaOverallPercent < 0.05` twice | Stop A, route B or C |
| pending review > 15 | Route B |
| same residual repeats >= 2 | Route C |
| command failure rate > 20% | Stop and report |
| max A rounds reached | Route B or C |

## Step B. Review Gate

若 A 後出現 pending review，進 B。

### Studio interrupt state

```json
{
  "runLabel": "progress-b-review-r1",
  "focusStatus": "needs-etl-evidence",
  "topFocusGenerals": 3,
  "reviewTop": 10,
  "requireHumanReviewInterrupt": true,
  "reviewInterruptBatchSize": 3,
  "runContextEnrichment": true,
  "fillReviewAnswers": false,
  "runRepairCampaign": false,
  "runApiReadinessRefresh": false,
  "overwriteOutputs": true
}
```

### Review decision format

```json
{
  "decisions": [
    {
      "candidateId": "candidate-id",
      "answer": "B",
      "notes": "接受但需要補 location 與 relationshipEdges。",
      "edits": {
        "location": "長坂坡",
        "relationshipEdges": []
      }
    }
  ]
}
```

B 階段可由 human 或 skill agent 執行。若需要一次只審小批量，維持 `reviewInterruptBatchSize=3`。

## Step C. Residual Dossier

當 AB 已無法推進，產生 residual dossier。

內容至少包含：

- run id
- A rounds
- AB cycles
- selected generals
- baseline overall
- final overall
- delta
- canonicalWrites=false
- repeated residuals
- root cause groups
- suggested human actions

Root cause groups：

- identity ambiguity
- location gap
- relationship edge/type gap
- event boundary problem
- missing source evidence
- schema/tool gap
- external source needed

建議輸出：

```text
artifacts/data-pipeline/sanguo-rag/extracted/progress-advancement/<run-id>/residual-review.md
```

## 收工輸出格式

每次執行完 workflow，必須回報：

```md
## Progress Advance Summary

- A rounds executed:
- AB cycles executed:
- Selected generals:
- Baseline overall:
- Final overall:
- Delta overall:
- Pending review questions:
- Residual dossier:
- canonicalWrites:
- Next recommended action:
```

## 目前限制

現階段沒有系統層自動 invoke 機制能真的「聽到自然語句就自動跑」。本 workflow 是 agent routing 文件；後續代理看到 trigger phrase 應遵循它。若要完全自動化，需要再新增：

- Python controller；目前 MVP 為 `run_progress_advancement_loop.py`。
- 或 LangGraph `sanguo_progress_advancement_graph`。
- 或 agent command router。
