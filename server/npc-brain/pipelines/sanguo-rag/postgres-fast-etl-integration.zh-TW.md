<!-- doc_id: doc_server_pipeline_0004 -->
# Sanguo RAG PostgreSQL 接入說明（給高速 ETL 開發者）

這份文件用大白話講清楚三件事：

1. 我們現在怎麼把資料接進 PostgreSQL  
2. 資料怎麼從 DB 取出來給 resolution loop 用  
3. 另一條高速 ETL 要怎麼「不打架」地接進來

---

## 一句話總結

你可以把 `collect_observed_mentions.py` 想成「抽取器」：  
- `--sink json`：走舊路，寫 JSON 檔（相容模式）  
- `--sink postgres`：走新路，直接增量寫 PostgreSQL（高速模式）

接著 `run_resolution_loop.py` 可以選擇 unresolved top-N 來源：  
- `--top-source summary`：從 `observed-label-summary.json` 讀  
- `--top-source postgres`：直接 SQL 查 DB  
- `--top-source auto`：先查 DB，失敗再回 summary

---

## 你要接入時，最常用的指令

### 1) 高速模式（推薦）

```bash
python server/npc-brain/pipelines/sanguo-rag/run_resolution_loop.py \
  --collect-sink postgres \
  --top-source postgres \
  --pg-dsn "postgresql://sanguo_user:sanguo_pass@localhost:5432/sanguo_rag" \
  --top 30
```

### 2) 保守相容模式（舊流程）

```bash
python server/npc-brain/pipelines/sanguo-rag/run_resolution_loop.py \
  --collect-sink json \
  --top-source summary \
  --top 30
```

---

## 我們的 DB 接入架構（白話版）

### A. collect 階段：資料「進 DB」

`collect_observed_mentions.py --sink postgres` 會做這些事：

1. 掃描章節 markdown，抽 mentions（formal/address/unknown）
2. 每章都做「章節級增量更新」：
   - 先刪 `source_ref LIKE '<chapter>#p%'` 的舊資料
   - 再插入這一章新資料
3. triage 決策（noise/ambiguous/person）同步 upsert 到
   `sanguo_rag.triage_label_decisions`
4. 仍會輸出 `observed-label-summary.json`（給 fallback 或人工檢查）

重點：  
不再需要每輪都把完整 `observed-mentions.json` 當主資料來源反覆讀寫，I/O 會明顯下降。

### B. loop 階段：資料「出 DB」

`run_resolution_loop.py --top-source postgres` 會直接查：

- `sanguo_rag.observed_mentions`
- `sanguo_rag.triage_label_decisions`

查詢出 unresolved top-N（含 sample refs/snippets）來產生 MCQ。

---

## 資料表角色（你只要記這三張）

- `sanguo_rag.observed_mentions`  
  mention 明細主表（抽取結果）

- `sanguo_rag.triage_label_decisions`  
  人工裁決表（noise / ambiguous / person）

- `sanguo_rag.alias_map_entries`  
  alias map（目前主要由 alias pipeline/importer 維護）

Schema 在：  
`server/npc-brain/pipelines/sanguo-rag/sql/postgres_schema.sql`

---

## 新高速 ETL 要接進來時的建議（避免踩雷）

### 1) 先決定你是「取代抽取」還是「補充抽取」

- 取代抽取：你產生完整章節結果，沿用章節級 delete+insert  
- 補充抽取：你只補某些 mentionType，請先定義清楚 key，避免重複寫入

### 2) 請沿用 `source_ref = <chapter>#p<idx>` 這個格式

這是目前增量更新與去重邏輯的基礎。  
你改格式就等於改主鍵語意，會讓章節級更新失效。

### 3) triage 決策要同步

你若只寫 `observed_mentions`，不更新 `triage_label_decisions`，  
`top-source=postgres` 的 unresolved 結果會不準（noise 會混回來）。

### 4) 慢慢切，不要一口氣全改

建議 rollout：

1. 先 `--collect-sink postgres --top-source auto`  
2. 觀察穩定後再改成 `--top-source postgres`  
3. 最後再評估是否完全停用舊 JSON 主路徑

---

## 你可以把資料流想成這樣

```mermaid
flowchart LR
  A[chapters markdown] --> B[collect_observed_mentions]
  B -->|sink=json| C[observed-mentions.json]
  B -->|sink=postgres| D[(sanguo_rag.observed_mentions)]
  E[triage decisions json] --> B
  B --> F[(sanguo_rag.triage_label_decisions)]
  B --> G[observed-label-summary.json]
  D --> H[run_resolution_loop top-source=postgres]
  G --> I[run_resolution_loop top-source=summary/auto fallback]
```

---

## 最後給高速 ETL 開發者的接入契約（短版）

你只要遵守這 4 點，基本就能無痛接入：

1. 表結構不亂改（沿用 `postgres_schema.sql`）  
2. `source_ref` 格式不亂改（`chapter#pN`）  
3. triage 決策同步更新  
4. 先用 `auto` 灰度，再切全 `postgres`

