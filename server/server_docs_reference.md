<!-- doc_id: doc_server_ops_0003 -->
# Server 文件索引總覽

> 本檔為 server 文件索引入口，doc_id 以 `doc_server_<subtype>_<NNNN>` 為主鍵。
> 子類型定義：`service` / `pipeline` / `data` / `ops` / `other`。

## 使用方式

1. 先看 doc_id，再跳對應路徑。
2. 若要反查文件，使用：`node tools_node/resolve-doc-id.js <doc_id>`。
3. 若要列出 server 類文件，使用：`node tools_node/resolve-doc-id.js --list server`。
4. 若要重建本檔，使用：`node tools_node/doc-id-registry.js`。

## Server 文件索引

| doc_id | 子類型 | 路徑 | 標題 |
|--------|--------|------|------|
| `doc_server_data_0001` | data | docs/RAG_ETL_管線應用分析.md | RAG ETL 管線應用分析 |
| `doc_server_data_0002` | data | server/npc-brain/data/sanguo/rules/README.md | Rules |
| `doc_server_data_0003` | data | server/npc-brain/data/sanguo/policies/README.md | Policies |
| `doc_server_data_0004` | data | server/npc-brain/data/sanguo/schemas/README.md | Schemas |
| `doc_server_data_0005` | data | server/npc-brain/data/sanguo/catalogs/README.md | Catalogs |
| `doc_server_ops_0002` | ops | server/npc-brain/文件/archive/說明文件拆分規劃.md | NPC Brain README 拆分規劃 |
| `doc_server_ops_0003` | ops | server/server_docs_reference.md | Server 文件索引總覽 |
| `doc_server_other_0001` | other | server/npc-brain/文件/人物資料生產線簡報圖.md | 人物資料生產線簡報圖 |
| `doc_server_other_0008` | other | server/npc-brain/文件/NPC行為決策流程.md | NPC 最終行為決策流程圖 |
| `doc_server_other_0010` | other | server/README.dev.md | Server Dev Workflow |
| `doc_server_other_0547` | other | server/npc-brain/data/sanguo/README.md | Sanguo Data Governance |
| `doc_server_pipeline_0001` | pipeline | server/npc-brain/pipelines/sanguo-rag/人名事件解析.md | 人名事件解析 |
| `doc_server_pipeline_0002` | pipeline | server/npc-brain/pipelines/sanguo-rag/README.md | Sanguo RAG Pipelines |
| `doc_server_pipeline_0004` | pipeline | server/npc-brain/pipelines/sanguo-rag/postgres-fast-etl-integration.zh-TW.md | Sanguo RAG PostgreSQL 接入說明（給高速 ETL 開發者） |
| `doc_server_pipeline_0005` | pipeline | server/npc-brain/pipelines/sanguo-rag/full-roster-confidence-rag-highway.zh-TW.md | v3 補充：Evidence Seed + Strict Evidence Card 雙軌 |
| `doc_server_pipeline_0006` | pipeline | server/npc-brain/pipelines/sanguo-rag/external-evidence-highway-vnext.zh-TW.md | 外部網站採證高速公路 vNext 規劃 |
| `doc_server_pipeline_0007` | pipeline | server/npc-brain/pipelines/sanguo-rag/full-roster-convergence-highway-v1.implementation.zh-TW.md | Full Roster Convergence Highway v1 實作說明 |
| `doc_server_pipeline_0008` | pipeline | server/npc-brain/pipelines/sanguo-rag/external-evidence-site-playbook.zh-TW.md | 外部網站採證模板（Evidence Seed / Evidence Card） |
| `doc_server_pipeline_0009` | pipeline | server/npc-brain/pipelines/sanguo-rag/precheck-hardcode-audit.zh-TW.md | 主要管線寫死邏輯盤點（precheck / harvest） |
| `doc_server_pipeline_0010` | pipeline | server/npc-brain/pipelines/sanguo-rag/external-evidence-highway-vnext.addendum.zh-TW.md | 外部網站採證高速公路 vNext 增補 |
| `doc_server_pipeline_0011` | pipeline | server/npc-brain/pipelines/sanguo-rag/full-roster-bottleneck-priority-fixes.zh-TW.md | 全量收斂瓶頸拆解與優先修復清單（ROI 版） |
| `doc_server_pipeline_0012` | pipeline | server/npc-brain/pipelines/sanguo-rag/runtime-fail-ref-blitz-r3a2.report.zh-TW.md | Runtime Fail Evidence-Ref Blitz（r3a2）執行報告 |
| `doc_server_pipeline_0013` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase1-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第一階段重構計畫書 |
| `doc_server_pipeline_0014` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase3-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第三階段重構計畫書：P1 Claim / Runtime Policy 外部化 |
| `doc_server_pipeline_0015` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase4-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第四階段重構計畫書：P1 Rule 外部化與 JSONL 正規化 |
| `doc_server_pipeline_0016` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase6-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第六階段重構計畫：Completion Scoring Policy 外部化 |
| `doc_server_pipeline_0017` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase7-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第七階段重構計畫：Event Candidate / Question Seed Governance 外部化 |
| `doc_server_pipeline_0018` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase8-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第八階段功能計畫書：Review Context 與 External Source Governance 外部化 |
| `doc_server_pipeline_0019` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase9-plan.zh-TW.md | NPC-brain / Sanguo-RAG Phase 9 Runtime General Profile Governance |
| `doc_server_pipeline_0020` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase11-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第十一階段功能計畫書：Runtime Readiness Matrix Governance 外部化 |
| `doc_server_pipeline_0021` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase12-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第十二階段功能計畫書：Dialogue Mention Resolution Governance 外部化 |
| `doc_server_pipeline_0023` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase13-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第十三階段功能計畫書：Resolution Loop Runner Governance 外部化 |
| `doc_server_pipeline_0024` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase14-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第十四階段功能計畫書：Three-Lane Progress Scheduler Governance 外部化 |
| `doc_server_pipeline_0025` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase15-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第十五階段功能計畫書：Repair Review Campaign Governance 外部化 |
| `doc_server_pipeline_0026` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase16-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第十六階段功能計畫書：Knowledge Growth Round Runner Governance 外部化 |
| `doc_server_pipeline_0027` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase17-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第十七階段功能計畫書：3KWeb Check Runner Governance 外部化 |
| `doc_server_pipeline_0028` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase18-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第十八階段功能計畫書：DeepSeek Reasoning Trial Governance 外部化 |
| `doc_server_pipeline_0029` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase19-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第十九階段重構計畫：Full Roster Scoreboard Governance 外部化 |
| `doc_server_pipeline_0030` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase20-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第二十階段重構計畫：Full Roster Scoreboard Scoring Governance 外部化 |
| `doc_server_pipeline_0031` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase21-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第二十一階段重構計畫：Relationship Extraction Governance 外部化 |
| `doc_server_pipeline_0032` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase22-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第二十二階段重構計畫：Alias / Mention Intake Governance 外部化 |
| `doc_server_pipeline_0033` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase23-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第二十三階段重構計畫：External Evidence Scoring Governance 外部化 |
| `doc_server_pipeline_0034` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase24-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第二十四階段重構計畫：Source Browser / Vector Readiness Governance |
| `doc_server_pipeline_0035` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase25-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第二十五階段重構計畫：Runtime Batch / Keyword Governance |
| `doc_server_pipeline_0036` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase26-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第二十六階段重構計畫：Convergence Loop State Governance |
| `doc_server_pipeline_0037` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase27-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第二十七階段重構計畫：Governance Regression Harness |
| `doc_server_pipeline_0038` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase28-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第二十八階段重構計畫：PostgreSQL State Store Evaluation |
| `doc_server_pipeline_0039` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase29-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第二十九階段重構計畫：Production Vector Ingestion Hardening |
| `doc_server_pipeline_0040` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase10-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第十階段功能計畫書：NPC Dialogue Runtime Service Governance 外部化 |
| `doc_server_pipeline_0041` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase31-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第三十一階段重構計畫：Regression Fixture Consolidation |
| `doc_server_pipeline_0042` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase32-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第三十二階段重構計畫：Governance Handoff Index |
| `doc_server_pipeline_0043` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase33-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第三十三階段重構計畫：Governance Release Readiness Gate |
| `doc_server_pipeline_0044` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase34-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第三十四階段重構計畫：Governance Drift Detection |
| `doc_server_pipeline_0045` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase35-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第三十五階段重構計畫：Governance Operator Summary |
| `doc_server_pipeline_0046` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase36-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第三十六階段功能計畫書：Governance Failure Triage |
| `doc_server_pipeline_0047` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase37-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第三十七階段功能計畫書：Governance Completion Ledger |
| `doc_server_pipeline_0048` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase38-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第三十八階段功能計畫書：Governance Run Profile Presets |
| `doc_server_pipeline_0049` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase39-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第三十九階段功能計畫書：Governance Report Bundle Manifest |
| `doc_server_pipeline_0050` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase30-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第三十階段重構計畫：Governance Validation Stabilization |
| `doc_server_pipeline_0051` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase41-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第四十一階段功能計畫書：Governance Schema Registry |
| `doc_server_pipeline_0052` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase42-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第四十二階段功能計畫書：Harness Golden Snapshot Diff |
| `doc_server_pipeline_0053` | pipeline | server/npc-brain/pipelines/sanguo-rag/refactor-phase40-plan.zh-TW.md | NPC-brain / Sanguo-RAG 第四十階段功能計畫書：Governance Plan Encoding Repair |
| `doc_server_service_0001` | service | server/npc-brain/README.md | NPC Brain Service |
| `doc_server_service_0002` | service | server/npc-brain/文件/三國人物資料推進流程.md | 三國人物資料推進流程 |
| `doc_server_service_0003` | service | server/npc-brain/文件/對話服務與模型回退.md | 對話服務與模型回退 |
| `doc_server_service_0004` | service | server/npc-brain/文件/向量檢索與資料入庫.md | 向量檢索與資料入庫 |
| `doc_server_service_0005` | service | server/npc-brain/文件/LangGraph Studio 與部署.md | LangGraph Studio 與部署 |
| `doc_server_service_0006` | service | server/npc-brain/文件/開發啟動與煙霧測試.md | 開發啟動與煙霧測試 |
| `doc_server_service_0007` | service | server/npc-brain/文件/資料契約與 Cocos 串接.md | 資料契約與 Cocos 串接 |
| `doc_server_service_0008` | service | server/npc-brain/文件/武將基本資料從0到1的誕生.md | 武將基本資料從0到1的誕生 |
| `doc_server_service_0009` | service | server/npc-brain/文件/archive/npc-brain-獨立-repo-拆分實作清單.zh-TW.md | npc-brain 獨立 Repo 拆分實作清單（含工時） |
