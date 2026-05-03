<!-- doc_id: doc_server_data_0001 -->
# RAG ETL 管線應用分析

## 摘要

目前這條三國知識管線，已經不是單純的「向量搜尋 + LLM 問答」，而是一套 **source-grounded、deterministic-first、LLM-reviewed、artifact-driven** 的 RAG / ETL 生產線。

它的核心目標不是讓模型直接生成答案，而是先把毛本文言文本、observed mentions、關係證據、事件候選、review 結果與 runtime profile 變成可追蹤、可回放、可重跑的資料工件，再把這些工件載入 NPC brain 與 Cocos UI。

---

## 一、RAG 架構層：我們用了哪些方法

### 1. Source-grounded retrieval

所有內容都要回到 sourceRef、sourceQuote、chapterNo。

這代表我們不是做「語意上像」的檢索，而是做「可回原文證據」的檢索。每個事件、關係、人物 context 都要能追到原始章回片段。

這一層的價值是：

- 降低幻覺
- 讓 reviewer 可驗證
- 讓 runtime 資料能被追溯

### 2. Entity / alias resolution

這是 RAG 的前置品質關卡。

目前用到的流程包括：

- `build_alias_dict.py`
- `collect_observed_mentions.py`
- `run_resolution_loop.py`
- `apply_triage_answers.py`
- `generate_term_research_brief.py`

它解決的是「同一個人可能有正式名、字、別稱、單字 alias」的問題，例如避免 `飛 / 布 / 卓` 這種高風險別名誤抓到錯的人。

這層本質上是 retrieval key normalization。

### 3. Observed mentions index

我們已經建立「文本中哪些片段提到哪些人物」的索引。

目前量化狀態：

- resolved mentions：`20718`
- unresolved mentions：`109`
- review pending：`642`

這是整個 RAG 的倒排檢索底座。

### 4. Focus relevance ranking

在 `generate_event_review_choices.py --general-id` 裡，不是隨機選事件，而是先做 relevance ranking。

優先順序會偏向：

- 正式 name / alias 直接命中
- direct battle cue
- 與目標人物強相關的 sourceQuote

降權的內容則包括任官、薦舉、傳記敘述等容易稀釋 focus 的片段。

### 5. Event question seed bank

`build_event_question_seed_bank.py` 會把「人物 × 題目角度」轉成 seed bank。

目前有 11 個 angle families：

- `battle`
- `relationship`
- `female_interaction`
- `affect_story`
- `aptitude_talent`
- `work_role`
- `activity_seed`
- `item_equipment`
- `decision_weight`
- `location_context`
- `faction_timeline`

最新數字：

- event-question seeds：`2631`
- seed units：`759.85`
- covered generals：`291`

這個結構的作用，是讓我們知道每個人物還缺哪些題材角度，而不是只看總字數或總 mention 數。

### 6. Source event packets

`build_source_event_packets.py` 會把同一個 sourceRef 的多種角度聚合成事件包。

最新數字：

- source event packets：`1601`
- packet units：`586.38`
- covered generals：`291`

這很像 RAG 的 chunk packing：不是只給模型一小段句子，而是把同一 sourceRef 下的人物、關係、角度與例句組成可審核 packet。

### 7. LLM reviewer，而不是 LLM author

目前 LLM 的角色是 reviewer / proposal generator，不是 canonical author。

它會用在：

- A / B 判斷
- summary / location / relationshipEdges proposal
- `<think>` 清洗
- context enrichment
- provider trace

但 canonical 資料仍維持 deterministic-first。

這樣做的好處是：

- 讓 LLM 的不穩定性留在 review 層
- 讓正式資料可回放
- 避免把幻覺直接寫進 runtime

### 8. Runtime retrieval for Cocos

NPC brain server 會優先讀：

`artifacts/data-pipeline/sanguo-rag/extracted/runtime-general-profiles/<generalId>/`

輸出的 runtime 內容包括：

- persona
- keywords
- relationships
- storyBeats

Cocos 端再透過：

- `/v1/npc/context-options`
- `/v1/npc/keyword-options`
- `/v1/npc/dialogue`

取得 runtime 資料。

這等於把 RAG 的結果變成可直接供 UI 消費的 lookup layer。

---

## 二、ETL 管線層：我們怎麼把資料做成可用資產

### Extract：抽取

這層的工作是把原始文本與觀察資料整理成結構化材料。

目前主要腳本：

- `clean_and_split.py`
- `build_alias_dict.py`
- `collect_observed_mentions.py`
- `build_romance_courtesy_aliases.py`
- `extract_event_candidates.py`
- `extract_relationship_evidence.py`

這些腳本把毛本文言 corpus 變成章回、mention、候選事件與關係證據。

#### 關係證據抽取

`extract_relationship_evidence.py` 目前已從粗類型進化為可細分的關係圖譜。

原本粗類型中最重要的是 `commands`，現在已細分為：

- `ruler_subject`
- `patron_client`
- `mentor_student`
- `betrayal_surrender`
- `enemy_rival`
- `alliance_oath`

這一步很重要，因為 `commands` 太粗，會讓 relationshipGraph 只剩「命令關係」，無法呈現真正的君臣、投靠、師徒、背叛、敵對或盟約語意。

### Transform：轉換

這層是最重的一層，負責把抽取結果變成可 review、可 staging、可 runtime export 的結構。

#### 1. Stable knowledge bootstrap

`build_stable_knowledge_bootstrap.py` 會產生：

- `identitySeeds`
- `basicProfileSeeds`
- `stable relationship seeds`
- `plain relationship proposals`
- `event-location seeds`
- `faction timelines`
- `female priority profiles`
- `social role seeds`

這層不是 canonical，而是 reviewer grounding。

#### 2. Review choice generation

`generate_event_review_choices.py` 會把候選事件轉成 review 問題，形成 human-in-the-loop / LLM-in-the-loop 的入口。

#### 3. Context enrichment

`enrich_event_review_context.py` 會補上：

- summary
- location
- relationshipEdges
- moodTags
- aptitudeTags
- activitySeedHints
- decisionWeightHints

#### 4. A/B review staging

`stage_reviewed_a_ready_events.py` 會把 enriched A 題轉成 staged ready events，B 題則進 edit backlog。

這裡是我們目前最有價值的增益來源之一，因為它把已審核過的資料轉成可進下一輪 pipeline 的工件。

#### 5. B backlog repair loop

目前 B backlog 已不只是清單，而是已經能轉成 repair task queue。

新增的 `build_backlog_repair_tasks.py` 會把 B 題轉成可排程修補任務，常見 action 包含：

- `fill_location`
- `repair_relationship_edges`
- `narrow_event_boundary`
- `rewrite_summary`
- `sanitize_summary_boundary`

這代表 review pipeline 已經開始形成閉環：

- A 題進 ready
- B 題進 repair queue
- 下一輪再消化 repair queue

#### 6. Runtime profile export

`export_general_runtime_profile.py` 會把 staging 後資料輸出成 runtime persona / keywords / relationships。

目前也已讓 relationship graph 的細分類型保留在 runtime 中，不再被舊展示型類別覆蓋回去。

### Load：載入

最後一層是把資料送進 runtime 與 UI。

#### Artifact load

所有中間結果都落在：

`artifacts/data-pipeline/sanguo-rag/extracted/`

其中包括：

- observed mentions
- event candidates
- relationship evidence
- event-question seeds
- source-event packets
- progress reports
- runtime-general-profiles
- backlog repair tasks

#### Runtime load

NPC brain server 會優先讀 runtime profiles，再供 Cocos 呼叫。

#### Cocos API load

現階段主要 API：

- `/healthz`
- `/v1/npc/context-options`
- `/v1/npc/keyword-options`
- `/v1/npc/dialogue`

---

## 三、目前資料狀態

截至目前的最新量化結果：

- 全域完成度：`57.96%`
- identity seeds：`601`
- resolved mentions：`20718`
- ready events：`171`
- source-grounded relationship evidence：`397`
- event-question seeds：`2631`
- source event packets：`1601`
- repair tasks：`1766`
- relationship graph `commandsCount`：`0`

### 現在已經解決的問題

1. 不再只是向量搜尋 + LLM，而是 source-grounded pipeline。
2. 不再讓 LLM 直接寫 canonical 資料。
3. `commands` 已拆成更貼近語意的關係類型。
4. B backlog 已可轉成 repair task queue。
5. core10 runtime profiles 已能給 Cocos UI 測試。

### 目前仍缺的部分

1. reviewValidation 還需要靠 repair queue 的下一輪實際消化來提升。
2. relationshipGraph 還可以進一步增加更精準的關係類型與更高信心 evidence。
3. runtime export 還可擴展到更多高完成度人物，不只 core10。
4. 未來可以加入向量檢索作為第二層，但不能取代 source gate。

---

## 四、這套系統本質上在解決什麼

如果用一句話講：

這套系統是在把三國文本從「可讀內容」轉成「可被遊戲 runtime 消費的知識資產」。

它同時處理：

- 檢索品質
- 來源可追溯性
- 人物 / 關係 / 事件的結構化
- review 與修補閉環
- runtime 載入

所以它不是單純的 RAG，也不是單純的 ETL，而是兩者疊在一起的知識製造線。

---

## 五、對應腳本一覽

### RAG 相關

- `build_alias_dict.py`
- `collect_observed_mentions.py`
- `run_resolution_loop.py`
- `generate_event_review_choices.py`
- `enrich_event_review_context.py`
- `extract_relationship_evidence.py`
- `build_event_question_seed_bank.py`
- `build_source_event_packets.py`
- `estimate_knowledge_completion.py`

### ETL / Review / Runtime 相關

- `clean_and_split.py`
- `extract_event_candidates.py`
- `build_stable_knowledge_bootstrap.py`
- `stage_reviewed_a_ready_events.py`
- `build_backlog_repair_tasks.py`
- `export_general_runtime_profile.py`
- `estimate_core_person_completion.py`
- `run_knowledge_growth_round.py`
- `run_etl_quality_pilot.py`

### Runtime / API 相關

- `server/npc-brain/app/main.py`
- `server/npc-brain/app/npc_dialogue_service.py`
- `server/npc-brain/app/http_smoke_test.py`

---

## 六、結論

目前這套流程已經具備幾個很成熟的特徵：

- deterministic-first
- source-grounded
- review-driven
- staged artifacts
- runtime export
- Cocos 可直接消費

而且它不是只做資料整理，而是已經能持續推高覆蓋率、人物完成度與 UI 測試可用性。

接下來最值得做的，不是再把模型叫得更兇，而是把 repair queue 消化掉，讓 B backlog 真的轉成 A 或可 publish 的準備資料，進一步把 reviewValidation 拉上來。
