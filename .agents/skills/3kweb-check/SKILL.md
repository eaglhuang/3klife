---
doc_id: doc_agentskill_0101
name: 3kweb-check
description: Deterministic external-evidence web validation workflow for Sanguo ETL/RAG. USE FOR: 外部證據網站檢查、來源健康度、allowlist 驗證、來源 seed 覆蓋、3kweb-check、external evidence source health、fetch/parse/hash first、LLM reviewer second。
argument-hint: --fetch-live --approved-only --fetch-backend auto --scoreboard-json --max-gap-generals --run-id
---

# 3kweb-check

這個 skill 專門處理「外部證據網站能不能穩定進 ETL」。
核心原則是 deterministic first：先抓網站、解碼、抽純文字、算 hash、看來源有沒有基本相關性；LLM 只做 reviewer，不直接當證據來源。

Unity 對照：
這很像把外部資料站接成 `AssetPostprocessor + Import Validator`。先確定素材進得來、格式穩、能留下 citation，再交給後面的 Inspector 審查與 Build gate。

## 何時用

- 要檢查 `external-evidence-sources.json` 裡的來源是否可連、是否需要補 seed
- 要驗證某個網站是不是適合成為三國人物外部證據來源
- 要把外部網站查詢封裝成可重跑、低 token 的 repo-local CLI
- 要排查 `WinError 10061`、壞 proxy、live fetch 不通這類環境問題

## 與 `agent-cli-factory` 的分工

- 既有來源健康檢查、allowlist 驗證、live smoke：直接用本 skill。
- 遇到新的 source family、新的 HTML 結構、或想把網站查詢再封成更穩定的 repo-local CLI：先進 `agent-cli-factory`，再回來接 `3kweb-check`。
- 不要在這裡臨時加 Browser/Playwright 手動查站步驟；先把高頻查詢收斂成 CLI，再讓 LLM 只讀 compact JSON。

## 後端策略

1. 先跑 agent-native CLI  
   `tools_node/agent-clis/3klife-source-health.js`

2. CLI 會主動清掉壞掉的 proxy 環境變數  
   `HTTP_PROXY / HTTPS_PROXY / ALL_PROXY / http_proxy / https_proxy / all_proxy`

3. `run_3kweb_check.py` 的 `--fetch-backend auto` 會優先走 Node CLI  
   如果 CLI 不可用或回傳網路阻塞，再 fallback 到 Python urllib。

4. 若新的來源模式讓現有 CLI 不足，先用 `agent-cli-factory` 更新 wrapper，避免在 Python reviewer 流程裡散落 ad-hoc fetch 邏輯。

## 最小 smoke

```bash
node tools_node/agent-clis/3klife-source-health.js --self-test --json
```

## 單站 live 檢查

```bash
node tools_node/agent-clis/3klife-source-health.js \
  --source-id shuzi-sanguo-character-database \
  --url https://www.cne3online.com/biography/ \
  --json \
  --compact
```

## 全量來源檢查

```bash
python3 server/npc-brain/pipelines/sanguo-rag/run_3kweb_check.py \
  --run-id 3kweb-check-live-r3 \
  --output-root local/codex-smoke/knowledge-growth \
  --sources-config server/npc-brain/pipelines/sanguo-rag/config/external-evidence-sources.json \
  --scoreboard-json artifacts/data-pipeline/sanguo-rag/extracted/full-roster-scoreboard/full-roster-scoreboard.json \
  --approved-only \
  --fetch-live \
  --fetch-backend auto \
  --timeout-seconds 12 \
  --max-gap-generals 60 \
  --overwrite
```

## 輸出

- `3kweb-check-summary.json`
- `3kweb-check-summary.zh-TW.md`
- CLI cache：`local/agent-cli-cache/3klife-source-health/*.json`

## 你該怎麼解讀

- `liveStatus=ok`：來源可連，已成功抓回內容
- `liveStatus=pending-url`：只是 placeholder，先補精確 URL
- `liveStatus=manual-only`：這是人工整理來源，不走 live fetch
- `relevanceLevel=likely-relevant`：頁面至少有基本三國文本線索，可進下一步 seed/claim 評估
- `manualEvidenceCount=0`：代表網站可連，但還沒替這來源建立種子證據

## 安全規則

- deterministic fetch/parse/hash first，LLM second
- 單一網站不得直接升成 `A-history`
- 所有輸出都保持 `canonicalWrites=false`
- 正式 promotion 仍要走人工 gate，不由這個 skill 直接寫 canonical
