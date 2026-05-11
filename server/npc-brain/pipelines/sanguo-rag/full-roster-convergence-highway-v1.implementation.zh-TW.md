<!-- doc_id: doc_server_pipeline_0007 -->
# Full Roster Convergence Highway v1 實作說明

## 1) 目標
這條 v1 高速公路的重點是把已存在能力「串成一條可連跑的總控」，每輪都重算全人物缺口，而不是只跑零散 batch。  
核心目標：

- 降低人工介入頻率（未滿門檻就繼續自動）
- 提升資料清洗吞吐（先廣掃，再精修）
- 保持可追溯與安全（`canonicalWrites=false`）

## 2) 已實作範圍

### 新增總控
- `server/npc-brain/pipelines/sanguo-rag/run_full_roster_convergence_loop.py`

已串接流程：
1. external source benchmark（只吃 `approved/manual_quote`）
2. 外部 cards 匯總（含 `external-source-roi.zh-TW.md`）
3. full pilot（`run_etl_quality_pilot.py`）
4. full roster scorecard（`build_full_roster_scoreboard.py`）
5. stable knowledge bootstrap
6. relationship evidence / event-question seeds / source-event packets
7. knowledge/core completion estimate
8. precision lane（`run_progress_advancement_loop.py`，只吃高價值缺口）
9. runtime readiness gate
10. human threshold batch / rumination downgrade ledger / baseline manifest

### 新增 scorecard builder
- `server/npc-brain/pipelines/sanguo-rag/build_full_roster_scoreboard.py`

主要輸出：
- `full-roster-scoreboard.json`
- `full-roster-scoreboard.zh-TW.md`
- `full-roster-scorecard.json`（別名）
- `full-roster-scorecard.zh-TW.md`（別名）
- `shadow-roster-index.json`

每位人物欄位包含：
- `seedCount`
- `cardCount`
- `crossFamilyClaimCount`
- `historicalTrustScore`
- `worldbuildingUsabilityScore`
- `completenessScore`
- `missingFields`
- `missingAngles`
- `nextLane`

## 3) CLI 介面

### 總控
```bash
python server/npc-brain/pipelines/sanguo-rag/run_full_roster_convergence_loop.py \
  --run-id full-roster-convergence-v1 \
  --output-root local/codex-smoke/knowledge-growth \
  --top 500 \
  --max-rounds 3 \
  --human-pending-threshold 20 \
  --profile all \
  --lane-policy-config server/npc-brain/pipelines/sanguo-rag/config/full-roster-lane-policy.json \
  --source-config server/npc-brain/pipelines/sanguo-rag/config/external-evidence-sources.json \
  --overwrite
```

### Scorecard
```bash
python server/npc-brain/pipelines/sanguo-rag/build_full_roster_scoreboard.py \
  --output-root local/codex-smoke/knowledge-growth/full-roster-scoreboard-smoke \
  --profile female-priority \
  --lane-policy-config server/npc-brain/pipelines/sanguo-rag/config/full-roster-lane-policy.json \
  --overwrite
```

## 4) 每輪輸出重點

- `full-roster-scorecard.zh-TW.md`：哪些人物變完整、哪些還卡欄位/角度
- `external-source-roi.zh-TW.md`：來源產能與有效度
- `human-review-batch.zh-TW.md`：達門檻才產生，題目包含原文線索、中文摘要、A/B/C/D 說明
- `rumination-downgrade-ledger.jsonl`：A 級反芻降級紀錄
- `baseline-manifest.output.json`：可續跑基準點

## 5) 里程碑與 Checklist

### M1 總控骨架
- [x] 新增 `run_full_roster_convergence_loop.py`
- [x] 支援 `--run-id --top --max-rounds --human-pending-threshold --profile --source-config --dry-run --overwrite`
- [x] 每輪產生 summary + baseline manifest

### M2 全人物 scorecard
- [x] 新增 `build_full_roster_scoreboard.py`
- [x] 輸出雙分數（history/worldbuilding）
- [x] 加入 `missingAngles` 與 `nextLane`
- [x] 支援 `all/female-priority/history-romance`

### M3 既有能力串接
- [x] 接 benchmark / pilot / stable bootstrap / estimate
- [x] 接 relationship evidence / event-question seeds / source-event packets
- [x] 接 runtime readiness gate
- [x] 接 precision lane（高價值缺口）

### M4 人工與反芻策略
- [x] 人工門檻（`human-pending-threshold`）達標才停
- [x] 產生中文 human-review batch
- [x] 產生 rumination downgrade ledger
- [x] human-review 題目先做 cluster 去重（`sourceRefs + location + participants + summary hash`）

### M5 收斂補強（已完成）
- [x] precision lane 的 `selectedGeneralIds` 改為 lane + cluster 配額挑選（避免全部擠在同質候選）
- [x] profile 對 lane 閾值與 precision 配額改為配置檔（`config/full-roster-lane-policy.json`）
- [x] `run_full_roster_convergence_loop.py` 會把 lane policy 傳進 `build_full_roster_scoreboard.py`，並回寫 summary inputs
- [x] human-review batch 顯示 cluster 規模、參與者、地點與摘要指紋，方便人工快速判讀去重結果

## 6) 驗收指令

### A. 語法驗證
```bash
python -m py_compile \
  server/npc-brain/pipelines/sanguo-rag/build_full_roster_scoreboard.py \
  server/npc-brain/pipelines/sanguo-rag/run_full_roster_convergence_loop.py
```

### B. 總控 dry-run
```bash
python server/npc-brain/pipelines/sanguo-rag/run_full_roster_convergence_loop.py \
  --run-id full-roster-convergence-v1-dryrun \
  --output-root local/codex-smoke/knowledge-growth \
  --top 500 \
  --max-rounds 2 \
  --human-pending-threshold 20 \
  --profile all \
  --dry-run \
  --overwrite
```

### C. Scorecard smoke
```bash
python server/npc-brain/pipelines/sanguo-rag/build_full_roster_scoreboard.py \
  --output-root local/codex-smoke/knowledge-growth/full-roster-scoreboard-smoke \
  --profile female-priority \
  --overwrite
```

## 7) 安全邊界

- 所有輸出預設 `canonicalWrites=false`
- promotion 仍需人工 gate，不由本總控直接 canonical 寫入
- 外部來源僅使用官方來源設定（`approved/manual_quote`）
