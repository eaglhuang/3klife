<!-- doc_id: doc_server_service_0009 -->
# npc-brain 獨立 Repo 拆分實作清單（含工時）

## 目標
- 把 `server/npc-brain/` 拆成可獨立運作的 repo（Demo/正式都可）。
- 保持 `3KLife` 仍可像現在一樣透過 `/v1/npc/*` API 使用。
- ETL / RAG / 向量檢索 / PostgreSQL 流程都可在獨立 repo 內完成。

## 非目標
- 本階段不直接改動 Cocos 遊戲邏輯。
- 本階段不做 canonical writes 自動升版。

## 拆分後目標架構
- Repo A（新）：`3klife-npc-brain`
  - `app/`（FastAPI runtime）
  - `langgraph_app/`
  - `pipelines/sanguo-rag/`
  - `config/`、`docker-compose`（含 postgres/qdrant）
- Repo B（現有）：`3KLife`
  - 只保留 API client 與遊戲端整合
  - 透過 `NpcDialogueService` 的 `baseUrl` 指向 Repo A

## 里程碑與 Checklist

## M1 路徑去硬耦合（第一優先，2-3 天）
- [x] 新增共用 layout helper（monorepo / standalone 自動辨識）
- [x] `run_full_roster_convergence_loop.py` 改用可攜 root/config 解析
- [x] `build_full_roster_scoreboard.py` 改用可攜 root/config 解析
- [x] `benchmark_external_source.py` 改用可攜 pipeline/script 解析
- [x] `universal_source_crawler.py` 改用可攜 pipeline/schema 解析
- [x] `run_3kweb_check.py` 改用可攜 source config 解析
- [x] `NpcDialogueService` 增加路徑 env override
- [x] `interaction_memory` memory root 改為可辨識 `NPC_BRAIN_ROOT`
- [x] 其餘 `pipelines/sanguo-rag/*.py` 同步套用 helper（第二批）

檔案級改造清單（M1）：
- `server/npc-brain/pipelines/sanguo-rag/repo_layout.py`（新增）
- `server/npc-brain/pipelines/sanguo-rag/run_full_roster_convergence_loop.py`
- `server/npc-brain/pipelines/sanguo-rag/build_full_roster_scoreboard.py`
- `server/npc-brain/pipelines/sanguo-rag/benchmark_external_source.py`
- `server/npc-brain/pipelines/sanguo-rag/universal_source_crawler.py`
- `server/npc-brain/pipelines/sanguo-rag/run_3kweb_check.py`
- `server/npc-brain/app/npc_dialogue_service.py`
- `server/npc-brain/app/interaction_memory.py`

工時估算：
- 已完成第一批：6-10 小時
- 已完成第二批（其餘 pipeline 脫鉤）：8-14 小時

## M2 資料契約外部化（1-2 天）
- [ ] 定義 runtime artifact contract（events/persona/keywords/readiness）
- [ ] 補 `NPC_ARTIFACT_ROOT / NPC_EVENT_ROOT / NPC_PERSONA_ROOT / NPC_RUNTIME_PROFILE_ROOT` 文件與預設值
- [ ] 提供 demo fixture（小樣本）

工時估算：6-12 小時

## M3 部署與環境封裝（1-2 天）
- [ ] 新 repo `docker-compose` 一鍵起 `fastapi + postgres + qdrant`
- [ ] `.env.example` 補齊獨立部署環境參數
- [ ] 加 smoke scripts（health / keyword / dialogue / memory）

工時估算：6-10 小時

## M4 3KLife 端引用切換（0.5-1 天）
- [ ] `NpcDialogueService` baseUrl 由環境切換（local / dev / prod）
- [ ] 導入 fallback endpoint（避免單點故障）
- [ ] 更新 server/dev 文件啟動流程

工時估算：3-6 小時

## M5 CI/CD 與版本治理（1-2 天）
- [ ] 新 repo CI：lint + smoke + pipeline dry-run
- [ ] 標準 release tag（例如 `npc-brain-v0.x`）
- [ ] 3KLife 端相容版本矩陣（API schema 版本）

工時估算：6-12 小時

## 第一、二批改造結果（本次）
- 已建立 `repo_layout.py`，支援：
  - `NPC_REPO_ROOT` 強制指定 repo root
  - `NPC_BRAIN_ROOT` 強制指定 npc-brain root
  - monorepo / standalone 自動偵測
- 已讓關鍵總控腳本不再依賴硬寫死 `server/npc-brain/...` 路徑。
- 已讓 `pipelines/sanguo-rag/*.py` 的 `server/npc-brain/...` 與 `parents[4]` 路徑寫死清理完成（僅保留 `repo_layout.py` 內偵測邏輯）。
- 已讓 runtime service 可用 env 指定 artifact/event/persona/runtime-profile 來源路徑。
- 已讓 memory 預設落點可同時支援 monorepo 與 standalone。

## 風險與注意
- 仍有部分 pipeline 腳本使用舊路徑規則，需第二批一次清理。
- 若要把資料也完全獨立，需同步準備 demo fixture 與資料掛載策略（volume 或 object storage）。
- 拆分後要固定 API schema 版本，避免 3KLife 與 npc-brain 漂移。
