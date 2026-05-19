---
doc_id: doc_other_0270
task_id: TASK-ATS-0002
title: TASK-ATS-0002 npc-brain baseline report
owner: atm-core
status: completed
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0002 npc-brain baseline report

## Baseline summary

| Item | Value |
|---|---|
| Repo | `C:/Users/User/3klife-npc-brain` |
| Branch | `main` |
| Frozen baseline commit | `036d264e7fd56a969e9ef182d9ea3ac96df60fcb` |
| Baseline ref strategy | Commit-pinned clean checkout. No git tag was created in the npc-brain repo. |
| Local status at capture | Dirty working tree: `M pipelines/sanguo-rag/build_relationship_claim_graph.py` |
| Baseline interpretation | ATM tests should use the commit above as the clean baseline. The local dirty file is useful investigation context, but must not be treated as part of the frozen fixture baseline until reviewed. |

## Git transcript

```text
git -C C:\Users\User\3klife-npc-brain status --short
 M pipelines/sanguo-rag/build_relationship_claim_graph.py

git -C C:\Users\User\3klife-npc-brain rev-parse --abbrev-ref HEAD
main

git -C C:\Users\User\3klife-npc-brain rev-parse HEAD
036d264e7fd56a969e9ef182d9ea3ac96df60fcb
```

## Clean checkout replay recipe

Use this recipe when TASK-ATS-0003+ needs a reproducible starting point.

```powershell
git clone <npc-brain-remote> npc-brain-atm-baseline
cd npc-brain-atm-baseline
git checkout 036d264e7fd56a969e9ef182d9ea3ac96df60fcb
python -m pip install -r requirements.txt
```

Preferred runtime remains Docker, following `README.md`:

```powershell
docker compose -f docker-compose.dev.yml up -d --build
curl http://127.0.0.1:8765/healthz
```

## Baseline suitability

| Check | Result | Note |
|---|---|---|
| Repo is available locally | PASS | `C:/Users/User/3klife-npc-brain` exists and is a git repo |
| Branch and HEAD captured | PASS | `main@036d264e7fd56a969e9ef182d9ea3ac96df60fcb` |
| Dirty state captured | PASS with caveat | One modified ETL file exists and is excluded from clean baseline |
| Clean replay path defined | PASS | Commit-pinned checkout is enough to recreate baseline without local dirty changes |
| Candidate Python surface measured | PASS | 105 Python files parsed by AST inventory script |

## Constraint for downstream tasks

TASK-ATS-0003 to TASK-ATS-0007 should report whether they executed against:

- `baseline-clean`: clean checkout at `036d264e7fd56a969e9ef182d9ea3ac96df60fcb`
- `baseline-local-dirty`: current local repo with the modified `build_relationship_claim_graph.py`

The default should be `baseline-clean` unless the task explicitly validates the dirty ETL candidate.
