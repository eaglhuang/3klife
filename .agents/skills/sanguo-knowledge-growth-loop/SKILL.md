---
doc_id: doc_agentskill_0043
name: sanguo-knowledge-growth-loop
description: 'Sanguo knowledge growth loop. Use for: 三國知識增長、武將關鍵字、武將內容、事件型態擴充、deterministic extractor 擴充、批次 enrichment、relationshipEdges、人際關係、情感故事、專長、職業權重、活動任務、士農工商、當官、當賊、當兵、貧民、乞討、黃巾賊、暴民、裝備事件、外交、內政治理、決策權重、生活化素材、每輪覆蓋率成長報告。'
argument-hint: '可指定 round id、目標武將範圍、要新增的事件 taxonomy、是否批次 enrichment、是否重建 keyword/persona/api readiness。'
---

# Sanguo Knowledge Growth Loop

這個 skill 用來把三國文本從「少量 ready events + review-only candidates」逐輪擴充成可支撐武將生活化、君主決策權重、NPC 台詞、關係網與人物偏好的知識層。

Unity 對照：這不是單次資料匯入，而是一條會反覆重跑的 AssetPostprocessor pipeline。每一輪都會重新 import 同一份 raw text，但 extractor 會新增規則、taxonomy 與 validation gate；舊武將也會被重跑，讓 coverage 隨規則演進而增加。

## When to Use

- 使用者提到「武將更多關鍵字」、「更多內容」、「生活化來源」、「決策權重」、「人物會喜歡做哪些事」。
- 使用者想擴充 deterministic extractor，而不是一直用 DeepSeek 直接生成。
- 使用者想把人際關係、情感故事、專長、裝備、外交、內政治理等事件型態逐步拆出來。
- 使用者想把當官、從軍、作賊、士農工商、貧民、乞討、暴民、黃巾賊等社會角色轉成行為選擇權重與任務設計素材。
- 使用者想跑 4 到 6 個大流程輪次，每輪都覆蓋重跑上次武將，並量測 coverage delta。

## Core Principle

1. Deterministic-first：先用規則抽 evidence 與候選，不讓 LLM 直接寫 canonical 內容。
2. Re-run old targets：每輪重跑前一輪已處理過的武將，不只新增一批武將。
3. Taxonomy grows, data regenerates：新增的是 extractor 條件與事件型態；keyword/persona/api readiness 由 accepted events 重建。
4. DeepSeek is reviewer, not author：DeepSeek 只能做 context enrichment、補欄位 proposal、風險提示；不能直接 publish canonical events。
5. Quantify every round：每輪都要回報 ready event count、generic candidate count、accepted count、keyword/persona delta、covered generals delta。
6. Moral-neutral choice weights：所有職業、生計、專長與社會角色都只是「選擇權重」，不是善惡評分。當官、當賊、當兵、乞討、經商、耕作、加入暴民或黃巾賊都要能被 evidence 收集，未來再由任務系統和世界狀態決定它們如何成為活動、風險或劇情。
7. Reviewer adaptor first：LLM reviewer 不可寫死 DeepSeek。日常品質迭代先用 `hints-only` 或 `agent` reviewer preset；`agent` 是專案內本地小 reviewer，從 candidateHints 補 summary/location/relationshipEdges proposal，再交 strict gate；`fast` 只產 proposal 並保守留 B，避免快模型 relationship hallucination 直接升 A。等 deterministic gate 與 review pack 穩定後，再用 `quality/deepseek` 複核高價值候選。
8. 文言 preview first：文言文多輪優化先跑 `agent-reviewer` preview，不用 qwen 判斷；每個 generate/enrich step 預設 30 秒 timeout。preview 只用毛本文言 sourceRef、expandedContext 與 candidateHints 做快篩，產出 A/B/風險供人工或 quality reviewer 複核，不 publish canonical。
9. Live candidate cohort：文言 preview cohort 必須優先從目前的 `generic-battle-candidates.jsonl` 或 `female-interaction-candidates.jsonl` 選人，不要依賴舊 `etl-quality-pilot-report.json`。女性互動輪要用女性本人 `--general-id` 指定重跑，避免男性參與者把 focus edge gate 稀釋成 B。
10. Focus relevance ranking：`generate_event_review_choices.py --general-id` 會先排 sourceQuote 直接命中該武將正式 name/alias、且有 direct battle cue 的候選；任官、薦舉、招募、傳記段落降權。單字 alias 只能走白名單（例如 `卓/布/飛`），不可自動用姓名最後一字，避免 `除堅`、`紹問` 這類 false focus。
11. Progress estimate every round：每輪 preview 或 extractor 調整後，先跑 `extract_relationship_evidence.py --overwrite` 重建 source-grounded relationship evidence，再跑 `build_event_question_seed_bank.py --overwrite` 壓出人物 × 題目角度 seeds，接著跑 `build_source_event_packets.py --overwrite` 聚合 sourceRef 事件包，最後跑 `estimate_knowledge_completion.py --round-id current --overwrite`。這個百分比是保守 pipeline 完成度估算，不是內容品質宣告；人物/mention foundation 不能蓋過 source-grounded event slots、relationship graph 與 taxonomy maturity。

## External Source Queue Policy

- 只要白話 sidecar、地方誌、百科、外部女性互動素材或網站 manifest 會被多輪重複查，就先評估 `agent-cli-factory`，把來源 intake 收斂成 repo-local CLI。
- CLI 應只輸出 compact manifest、quote/snippet、sourceRef 線索、hash 與 quality flags；不要把整站 HTML 或全文小說塞進 repo。
- `3kweb-check` 負責站點健康與 relevance smoke；`agent-cli-factory` 負責把高頻來源查詢做成可重跑 CLI；本 skill 只消費 compact 輸出與 review artifact。
- 若來源授權不清楚，停在 manifest / source candidate 層，不自動抓全文。

## Progress Estimate Formula

每輪完成度用固定權重重算，輸出到 `artifacts/data-pipeline/sanguo-rag/extracted/knowledge-growth-progress/`。

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/extract_relationship_evidence.py \
  --overwrite

$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/build_event_question_seed_bank.py \
  --overwrite

$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/build_source_event_packets.py \
  --overwrite

$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/estimate_knowledge_completion.py \
  --round-id current \
  --overwrite

$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/estimate_core_person_completion.py \
  --round-id current \
  --overwrite
```

公式：`overall = sum(componentScore * componentWeight)`，權重總和 100。預設權重為 sourceResolution 6、personFoundation 12、relationshipGraph 22、eventQuestionCoverage 32、taxonomyAngles 13、reviewValidation 6、femalePriority 5、pipelineReliability 4。

判讀規則：如果 mention / 人物基礎很高，但 eventQuestionCoverage 或 relationshipGraph 仍低，總進度仍應停在低到中段；只有當 source-grounded 題目與關係邊大量變成可接受資料，百分比才會穩定上升。`relationship-evidence`、`event-question-seeds` 與 `source-event-packets` 都是 review artifact，不直接寫 canonical；完成度公式依 confidence / slot strength / packet strength 分層折算，避免把寬鬆 pattern 灌成滿分。`event-question-seeds` 應覆蓋 11 個 angle families；`female_interaction` 必須命中 female priority generalId 才能建 slot，避免只靠泛稱誤判。

核心人物進度：`estimate_core_person_completion.py` 預設用 observed mentions、event-question seeds、source-event packets、relationship evidence 與 preview rounds 的綜合 coreScore 選出前 10 人，輸出 `core-person-progress/current.md` 與 `current-core10-boost-queue.jsonl`。boost queue 是 review-only source packet candidates，可接 `generate_event_review_choices.py --candidates <queue> --general-id <id>` 與 `enrich_event_review_context.py --reviewer-provider agent-reviewer --step-timeout-seconds 30`。

Review A staging：核心人物 boost round 跑完後，用 `stage_reviewed_a_ready_events.py --review-root <round-review-root> --round-id <round-id> --core-general-id <id>... --overwrite` 將 enriched A 題整理成 staged ready event candidates，並同步輸出 staged relationship evidence。這仍是 `canonicalWrites=false`，B 題只進 edit backlog；若要估算本輪拉升幅度，可把輸出的 `*-staged-ready-events.jsonl` 與 `*-staged-relationship-evidence.jsonl` 傳給 `estimate_core_person_completion.py --ready-events ... --relationship-evidence ...`。

Max progress boost：若使用者問「一次增加最多的方法」，優先聚合既有 enriched A review，而不是立刻再請 LLM 產新資料。用 `stage_reviewed_a_ready_events.py --review-root artifacts/data-pipeline/sanguo-rag/extracted/knowledge-growth-rounds --review-root artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot --round-id <round-id> --overwrite` 先產全域 staged ready events / relationship evidence；接著用該 relationship evidence 重跑 `build_event_question_seed_bank.py` 與 `build_source_event_packets.py` 到 round-specific output root；最後用 `estimate_knowledge_completion.py --ready-events <round-staged-ready-events> --relationship-evidence <round-staged-relationship-evidence> --event-question-seeds <round-seeds> --source-event-packets <round-packets> --round-json <batch...> --round-id <round-id> --overwrite` 估算增益。這條路線只消化已審 A 題，仍維持 `canonicalWrites=false`；estimator 的 ready event count 必須採實際 ready-events 檔案筆數與 events-summary 的較大值，避免 staged run 被舊 summary 低估。

B backlog repair loop：每次 Review A staging 後，立刻跑 `build_backlog_repair_tasks.py --edit-backlog <round-reviewed-b-edit-backlog.jsonl> --round-id <round-id> --overwrite`，把 B 題轉成 repair task queue。任務會依 `missingFields`、sourceRefs、generalIds、summary boundary 與 relationshipEdges 產生 `fill_location`、`repair_relationship_edges`、`narrow_event_boundary`、`sanitize_summary_boundary` 等 action；這些 task 仍是 `canonicalWrites=false`，下一輪 enrichment/review 應優先消化 high priority task，才能實際提升 `reviewValidation`。

`build_backlog_repair_tasks.py` 也會同時輸出 `*-repair-review-candidates.jsonl`，可直接餵給 `run_knowledge_growth_round.py --candidates ...` 或 `generate_event_review_choices.py --candidates ...`，讓 repair queue 變成下一輪 review cohort。若要最大化單輪增益，優先挑 `repairActionCounts` 裡 `repair_relationship_edges` 與 `fill_location` 最高的 generals，再把 repair-review 結果疊回目前 baseline 做 merge 後估算。

Relationship graph refinement：`commands` 不可長期留在 relationshipGraph。規則抽取與 reviewed-A staging 都要經過 `relationship_type_refinement.py`，把粗類型拆成 `ruler_subject`、`patron_client`、`mentor_student`、`betrayal_surrender`、`enemy_rival`、`alliance_oath`；runtime export 若看到這些已細分 graph types 必須保留，不再覆蓋回舊展示分類。每輪驗證至少確認 staged relationship evidence 與 core runtime profiles 的 `commandsCount=0`。

## Stable Knowledge Bootstrap

在擴充事件抽取前，先跑一輪穩定知識層 bootstrap。這層只收「版本差異不太會改變」的事實，用來幫後續 reviewer 降低猜測。

1. Alias baseline：先跑 `build_alias_dict.py -> collect_observed_mentions.py -> build_alias_dict.py`，確認全體人物 alias、collision、top unresolved。反向剔除寫入 `general-alias-overrides.json.entries[].remove` 或 `globalExcludedAliases`；只有時段/陣營才能判斷的字號，不可硬升全局 high-confidence，改放 `timeScopedAliasHints` sidecar。
2. Roster gap closure：若穩定關係或大事件需要的人物沒有 `generalId`，先補 `server/npc-brain/pipelines/sanguo-rag/config/manual-roster-seeds.json`，再重跑 bootstrap。不要用未解析姓名硬塞 relationshipEdges；缺 ID 時寧可留 missingCoverage。
3. Identity baseline：每輪 bootstrap 要從 `generals.json` + `manual-roster-seeds.json` 產出全人物 `identitySeeds`，包含 `generalId/name/aliases/baseFaction/sourceLayer`。這是 prompt grounding，不是 canonical evidence，不能單獨升 A。
4. Structured plain-data extraction：可從既有白話式欄位（例如 `parentsSummary`、`historicalAnecdote`、`storyStripCells`、`role/stats/title/source`）自動抽穩定事實；父子雙方都有 `generalId` 時可產 `parent_child`，但 sourceLayer 必須標成欄位來源（例如 `generals-parent-summary`），避免混成毛本文言證據。角色/職能只能產 `autoSocialRoleSeeds` 或 `plainFactProposals`，並維持 review-only。
5. Plain-field heuristic guard：自動角色推斷要偏保守，避免用「武將」這類泛詞直接推出 `general_commander`；Support 角色也不能無條件變成 `strategist_advisor`，需有高智/高政或明確謀略、治理、文學、器械等詞。任何 plain-field hint 都不能單獨升 A。
6. Hard relationships：優先抽 `parent_child`、`spouse`、`sibling`、`sworn_sibling`。義父子可進 `parent_child`，但若關係隨章回轉折，必須帶 `validFromChapter` / `validToChapter`。朋友、收留、薦舉可先入 sidecar；君臣必須帶 `validFrom/validTo`、`chapterRange`、`battleTag` 或 `eventTag`，不可當永久硬關係。
7. Faction timeline：`generals.json.faction` 只當 base faction；事件判斷要看 `factionTimeline`。投降、反叛、短暫同盟、受命、降將都要建立 interval，避免同陣營/敵陣營 gate 誤判。
8. Event-location seed：大事件與地點關係先獨立成穩定索引，例如桃園結義、虎牢關、官渡、赤壁、長坂坡、取西川、夷陵、五丈原、三國歸晉。每筆要有 `chapterRange`、`locationIds`、`participantIds`、`factionIds`、`eventTags`。
9. 白話 sidecar 不直接 canonical：繁體白話或簡體白話轉繁都只能產 `plainFactProposal` / `plainTextInterpretation`。升 A/ready 前必須回到毛本文言 sourceRef，以原文 gate 找到對應證據。
10. 簡體來源可用 OpenCC 類工具先轉繁，但必須保留 `originalSimplifiedTextHash`、`convertedTraditionalText`、`conversionProfile` 與 `qualityFlags`。簡轉繁結果可幫助語意理解，不能取代原文證據。
11. 8book / 無限小說來源先走 manifest，不抓全文：`artifacts/data-pipeline/sanguo-rag/extracted/plaintext-source-candidates/8book-baihua-sanguo-source-manifest.json` 只保存 catalog、chapter id range、URL pattern 與風險註記。若會多輪重複維護這類來源，先用 `agent-cli-factory` 產 manifest/query CLI；若未取得授權或本地文本，管線只能用它做 source candidate 與交叉校驗計畫；不可把 120 回正文寫入 repo。
   現成 manifest CLI：
   ```bash
   node tools_node/agent-clis/3klife-plaintext-source-manifest.js \
     --preset 8book-baihua-sanguo-120 \
     --compact

   node tools_node/agent-clis/3klife-plaintext-source-manifest.js \
     --input-file artifacts/data-pipeline/sanguo-rag/extracted/plaintext-source-candidates/8book-baihua-sanguo-source-manifest.json \
     --json
   ```
12. 8book 讀取 guard：若未來建立 authorized loader，必須從 `https://www.8book.com/read/412204/?{chapterId}` 入口驗證正文 marker；不可直接信任 `sport.thepaperbooks.com` 直連，因為直連可能落到無關 SEO 頁。抓到的頁面必須檢查章題、小說正文關鍵字、下一章/章節列表 marker，並清除 `8book` 浮水印後才進 sidecar。這類 loader 也應優先走 CLI wrapper，而不是把 HTML 直接餵給 LLM。
13. Stable bootstrap artifact：每輪文言文 enrichment 前可先跑 `build_stable_knowledge_bootstrap.py --overwrite`，產出 `artifacts/data-pipeline/sanguo-rag/extracted/stable-knowledge-bootstrap/stable-knowledge-bootstrap.json`。這份資料目前包含 identity seeds、basic profile seeds、ready hard relationship edges、plain relationship proposals、event-location seeds、time-scoped alias hints、review-only faction timelines、social role seeds、auto social role seeds 與 plain fact proposals。
14. 白話推理 sidecar：`basicProfileSeeds` 必須覆蓋全人物，從 generals/manual roster/observed mentions 推出身份、出場章回、角色、能力傾向、情緒、個性、活動種子與選擇權重；`plainRelationshipProposals` 只能從結構欄位或白話欄位抓人名共現、父母/子女/配偶/君臣/仇敵等候選，標成 `plain-*-proposal-only`。兩者都是讓文言 extractor 回查更準的索引，不是 canonical。
15. A 升級規則：若候選題的 `generalIds`、chapter/sourceRef、location 與 stable bootstrap 的 `relationshipEdges` / `eventLocationSeeds` / `timeScopedAliasHints` 同時匹配，可作為從 B 升 A 的 deterministic evidence boost；但仍必須有毛本文言 sourceRef gate。若只命中 identity seeds、basic profile seeds、白話 sidecar、plain relationship proposals、欄位 sidecar、auto social roles、plain fact proposals、陣營 timeline、君臣推測或社會角色 tag，最多只能 B/review-only。

## Female Priority Profiles

女性角色在遊戲互動價值上優先級高於同覆蓋度的男性角色。每輪 knowledge growth 都要特別檢查可對上 `generalId` 的女性、疑似女性、或史料欄位 gender 錯置但已知為女性的人物，例如王異。不要先改 canonical 人物資料；先用 sidecar 標出 `genderCorrection=female-priority-sidecar`，等人工確認後再開資料修正任務。

1. Bootstrap 必須產出 `femalePriorityProfiles`，至少包含 `generalId/name/aliases/baseFaction/archetype/affectTags/personalityTags/interactionPriorities/relationshipFocusIds/eventHooks/sourceLayer/reviewStatus/contentGapPolicy`。
2. 每個已映射女性都要個案處理；不能只套「女性角色」泛型。貂蟬、孫尚香、蔡琰、黃月英、大小喬、甄姬、王異、張春華、辛憲英、祝融夫人、徐氏、孫魯班/孫魯育等高互動角色要有明確情緒、個性、愛恨傾向與互動事件 hook。
3. `femalePriorityProfiles` 是互動與 prompt grounding，不是 canonical evidence。它可以提醒 reviewer 優先保留婚盟、家族、宮廷、復仇、流離、武事、母子、姊妹、妯娌、主僕等互動線，但不能單獨把題目升 A；仍必須有毛本文言 sourceRef。
4. 若 generic candidates 對女性角色產題數為 0，這不是通過，而是 coverage gap。下一輪應新增女性別名與事件 pattern，例如 `孫夫人/夫人/主母/嫂嫂`、`貂蟬/閉月`、`蔡文姬/文姬`、`祝融/夫人`，並優先補 `relationshipEdges` 與 `affectTags`。
5. 白話文、民間故事、地方誌或網路來源可以補女性性格與互動素材，但必須先進 `plainFactProposal` / `femalePriorityProfiles` / external source queue，保留來源與授權資訊；未通過毛本文言或正式來源 gate 前，不得寫 canonical event。
6. 女性互動 profile 應覆蓋基本資料、情緒、個性、愛恨傾向、情感事件、互動事件、關係焦點與可玩活動鉤子。缺資料時標 `externalSourceNeeded` 或 `low-source-personal_scene`，而不是憑空補滿。
7. `extract_event_candidates.py` 必須同步輸出 `female-interaction-candidates.jsonl` 與 review md。這條 queue 專收婚盟、家族、宮廷/家內政治、武事家眷、流離、復仇、拒絕、母子/姊妹/主僕等女性高互動段落；它與 `generic-battle-candidates.jsonl` 分流，避免 battle gate 把女性事件吃掉。
8. 女性互動候選即使 location / relationshipEdges 已補齊，也只建議 `B accept-with-edits`，不自動建議 A。升 A 必須由人工或 quality reviewer 確認毛本文言 sourceRef、情緒分類、關係 edge 與互動邊界。

女性候選產題範例：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/extract_event_candidates.py \
  --overwrite \
  --max-female-interaction-candidates 80

$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/generate_event_review_choices.py \
  --candidates artifacts/data-pipeline/sanguo-rag/extracted/events/female-interaction-candidates.jsonl \
  --general-id sun-shang-xiang \
  --output-root artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/event-review-female-sun-shang-xiang \
  --top 8 \
  --overwrite
```

## Knowledge Taxonomy

Extractor 與 review schema 要逐步收斂到下列 taxonomy。新增子類時先放到 `reviewStatus=needs-review`，通過人工或 schema gate 後再進 canonical events。

### 1. 人際關係 Relationship

- `ruler_subject`：君臣、主公/臣屬、效命、諫言、受命。
- `parent_child`：父子、母子、養父子、義父子。
- `spouse`：夫婦、婚配、政治聯姻。
- `sibling`：兄弟、姊妹、族兄弟。
- `sworn_sibling`：結義兄弟、盟誓、桃園式同生死關係。
- `friend`：朋友、知己、故人、同鄉。
- `lover`：情侶、愛慕、婚約未成。
- `enemy_rival`：仇人、宿敵、政敵、戰場對手。
- `mentor_student`：師徒、教導、薦舉成才。
- `patron_client`：舉薦、收留、賞賜、投奔。
- `betrayal_surrender`：投降、背叛、反叛、改投陣營。

Relationship event 必須產生 `relationshipEdges`，至少包含 `fromId`、`toId`、`type`、`evidenceRefs`、`edgeConfidence`。若是雙向關係，可以產雙 edge，但要避免只因同句出現就濫造關係。

### 2. 情感故事 Affect Story

- `family_affection`：親情、孝道、護親、喪親。
- `friendship_loyalty`：友情、義氣、忠誠、報恩。
- `romance_love`：愛情、婚姻情感、思慕。
- `grief_regret`：悲傷、悔恨、痛失同伴。
- `anger_revenge`：憤怒、復仇、羞辱後反擊。
- `mercy_compassion`：仁慈、放過敵人、體恤百姓。
- `ambition_pride`：野心、自負、功名欲。
- `fear_shame`：恐懼、羞愧、怯戰、避禍。

這類事件會投影到 NPC 的 `moodTags`、speechContextMode 的語氣，以及未來人物偏好模型。

### 3. 專長與才藝 Aptitude / Talent

- `martial_weapon`：武藝、槍、矛、刀、戟、弓、馬戰。
- `command_strategy`：統兵、陣法、奇襲、守城、後勤。
- `civil_governance`：治民、法令、稅糧、地方治理。
- `diplomacy_speech`：辯才、使節、說降、聯盟談判。
- `literary_art`：詩詞、文章、音樂、書法、禮法。
- `craft_engineering`：器械、發明、造船、攻城工具。
- `commerce_logistics`：商業、補給、運輸、倉儲。
- `medicine_ritual`：醫術、占卜、祭祀、方術。

Talent event 必須能轉成 `aptitudeTags`、`roleActivityTags` 或 `decisionWeightHints`，例如某武將更偏好出征、治理、外交、創作、技術工作、商業活動或地下行動。

### 4. 職業、生計與社會角色 Work / Livelihood / Social Role

這一層是未來「所有可以被設計成活動或任務內容」的骨架。它不做善惡裁判，只記錄角色在文本中展現過或被迫進入的生計、身份、組織與行為傾向。

- `official_bureaucrat`：當官、任職、治理、朝廷職位、地方官吏。
- `warlord_ruler`：君主、諸侯、割據、建國、掌軍政。
- `soldier_guard`：當兵、宿衛、守關、軍卒、親兵、部曲。
- `general_commander`：將領、統軍、督戰、分兵、鎮守。
- `strategist_advisor`：謀士、軍師、諫臣、參議。
- `scholar_literati`：士、儒生、文人、讀書、講學。
- `farmer_peasant`：農民、耕作、屯田、田戶、農桑。
- `artisan_worker`：工匠、鑄造、造船、修築、器械工事。
- `merchant_trader`：商人、買賣、市集、運輸、財貨流通。
- `laborer_servant`：僕役、雜役、役夫、僕從、苦力。
- `poor_commoner`：貧民、饑民、流民、逃難百姓。
- `beggar_vagrant`：乞討、乞丐、無業遊民、路倒求食。
- `bandit_thief`：盜賊、山賊、劫掠、偷竊、攔路搶奪。
- `rebel_mob`：暴民、起事群眾、民變、亂民。
- `yellow_turban_rebel`：黃巾賊、太平道、黃巾餘黨。
- `outlaw_mercenary`：亡命、傭兵、私兵、被招安者。
- `prisoner_exile`：囚徒、流放、俘虜、被押解。
- `religious_ritualist`：道士、方士、巫祝、祭祀角色。
- `household_family_role`：家族職責、家僕、家主、宗族管理。

Work role event 必須產生 `roleActivityTags`，並盡量補 `activitySeedHints`。例如 `bandit_thief` 可以推導出劫掠、躲避官兵、招安、分贓、山寨經營；`official_bureaucrat` 可以推導出任官、審案、徵稅、修築、賑濟；`beggar_vagrant` 可以推導出求食、避難、乞討、被收留或轉投亂軍。

### 5. 活動與任務種子 Activity / Quest Seed

這一層把 evidence 從「這個人會什麼」往前推到「遊戲可以設計什麼活動」。每個 activity seed 必須能回追 sourceRefs，不能憑空發明。

- `appoint_office`：授官、升遷、罷免、封賞。
- `serve_army`：從軍、守備、巡邏、練兵、徵兵。
- `raid_plunder`：劫掠、奪糧、截道、搶馬、山寨襲擾。
- `beg_for_food`：乞食、求援、被收留、救濟任務。
- `farm_grain`：耕作、屯田、收糧、保護農村。
- `craft_build`：鍛造、修築、造船、器械製作。
- `trade_transport`：買賣、護送商隊、運糧、採購。
- `incite_revolt`：煽動、起事、黃巾集結、暴民事件。
- `suppress_unrest`：平亂、剿賊、安民、招撫。
- `negotiate_surrender`：勸降、招安、收編盜賊或降將。
- `perform_ritual`：祭祀、卜卦、祈福、方術事件。
- `teach_train`：教學、訓練、傳授、門生培養。
- `host_banquet`：宴席、招待、結交、密談。
- `family_duty`：護親、婚配、宗族責任、家族衝突。

Activity seed 不等於立即可玩任務；它是任務設計候選。正式任務化時再依地點、時代、身份、資源、敵友關係與世界狀態決定是否啟用。

### 6. 裝備與物件 Equipment / Item

- `weapon`：兵器、名刀、長槍、方天畫戟、弓弩。
- `armor`：鎧甲、冠服、防具。
- `horse_mount`：戰馬、赤兔、坐騎交換、騎術證據。
- `siege_engine`：攻城器械、樓船、衝車、連弩。
- `invention_tool`：器物發明、工藝工具。
- `book_seal_tally`：兵書、印綬、虎符、詔書、令牌。
- `treasure_gift`：金珠、玉帶、禮物、賞賜。

Item event 不能只做 keyword；要保留 `itemRefs`、持有/贈與/使用關係，未來可投影到人物頁 `寶 / GEAR` 或事件回憶。

### 7. 外交與國際 Diplomacy / External Affairs

- `han_court`：漢帝、朝廷、詔令、廢立、官職任免。
- `lord_lord`：諸侯之間、君主對君主的盟約與衝突。
- `alliance_oath`：結盟、歃血、會盟、共同討伐。
- `tribute_hostage`：進貢、人質、朝貢、封賞交換。
- `marriage_alliance`：聯姻、和親、政治婚配。
- `expedition_frontier`：遠征、邊疆、異域壓力。
- `non_han_relations`：蠻夷、羌胡、南蠻、外族勢力。
- `envoy_negotiation`：使者、談判、說客。

外交事件會影響君主 AI 對聯盟、遠征、朝廷秩序、外部勢力的決策權重。

### 8. 內政治理 Governance / Economy

- `appointment_title`：任官、封賞、升遷、罷免。
- `law_order`：刑罰、軍紀、治安、清剿。
- `agriculture_grain`：農業、糧草、屯田、倉儲。
- `industry_craft`：工業、鑄造、修築、器械製造。
- `commerce_tax`：商業、市場、賦稅、財政。
- `construction_infrastructure`：築城、道路、橋梁、宮殿、營寨。
- `relief_disaster`：災害、賑濟、民生危機。
- `administration_policy`：朝廷治理、地方行政、制度設計。

治理事件會投影到城池治理、君主 AI、離線派遣與生活化任務偏好。

### 9. 軍事與戰略 Military / Battle

- `battle_duel`：單挑、對陣、斬將。
- `deployment`：戰前部署、分兵、守關、紮寨。
- `scouting_intel`：探馬、密報、情報、偵察。
- `ambush_raid`：伏兵、夜襲、奇襲。
- `siege_defense`：攻城、守城、關隘防禦。
- `retreat_pursuit`：敗退、追擊、突圍。
- `logistics_supply`：糧草、補給、軍需。
- `aftermath_report`：戰後評語、報捷、論功、哀悼。

這類事件是現有 `generic-battle-candidates` 的延伸；不可只用「有殺/戰字」就接受，必須補齊 location 與 relationshipEdges。

### 10. 生活與社交 Life / Social

- `banquet_meeting`：宴席、會議、群臣商議。
- `daily_dialogue`：生活聊天、寒暄、酒席言談。
- `reputation_rumor`：名聲、傳聞、他人評價。
- `recruitment_visit`：拜訪、招募、投奔、延攬。
- `education_growth`：學習、教導、成長經歷。
- `household_travel`：家庭生活、出行、旅途。
- `speech_statement`：會議發言、遭遇發言、內心獨白可用素材。

這類事件最適合投影到 `life_chat`、`meeting_statement`、`inner_monologue` 等 speechContextMode。

## Canonical Event Shape Additions

每一輪新增 extractor 時，優先往下列欄位收斂；缺欄位就維持 review-only，不直接 publish。

```json
{
  "eventKey": "string",
  "eventType": "relationship|affect|talent|work|activity|item|diplomacy|governance|military|life",
  "subtype": "string",
  "chapterNo": 0,
  "sourceRefs": ["003#p13"],
  "generalIds": ["lu-bu", "dong-zhuo"],
  "summary": "string",
  "sourceQuote": "string",
  "location": "string|null",
  "relationshipEdges": [],
  "affectTags": [],
  "aptitudeTags": [],
  "roleActivityTags": [],
  "activitySeedHints": [],
  "itemRefs": [],
  "decisionWeightHints": [],
  "choiceWeightHints": [],
  "confidence": 0.0,
  "reviewStatus": "ready|needs-review"
}
```

`decisionWeightHints` 建議使用穩定字串，例如：`prefers_battle`、`prefers_governance`、`prefers_diplomacy`、`values_loyalty`、`seeks_revenge`、`protects_family`、`likes_gifts`、`avoids_risk`。

`choiceWeightHints` 用來承接道德中立的工作與生活選擇，例如：`can_serve_as_official`、`can_join_army`、`can_become_bandit`、`can_trade_goods`、`can_farm_grain`、`can_beg_for_food`、`can_join_rebel_mob`、`can_join_yellow_turban`、`can_suppress_unrest`、`can_negotiate_surrender`。這些不是「角色應該做什麼」，而是「在證據與世界條件成立時，系統可以讓他傾向選擇什麼」。

## Round Plan: 4 To 6 Large Rounds

### Round 0. Baseline Snapshot

目標是凍結可比較基準，不改 extractor。

1. 讀 `docs/keep.summary.md`。
2. 跑目前 extractor / pilot / readiness。
3. 記錄 baseline：ready events、generic candidates、covered generals、keyword pack 數、persona card 數、每位武將 keywordTotal / evidenceRefCount。
4. 列出 top uncovered important generals 與 top generic candidate generals。

### Round 1. Relationship And Identity

優先抽人際關係，因為它最直接影響 NPC 稱呼、忠誠、敵意與君主決策。

新增或強化 extractor：君臣、父子、夫婦、義父子、結義兄弟、朋友、仇敵、投降/背叛、薦舉/投奔。

輸出 gate：每個 accepted relationship event 必須有合法 relationshipEdges，不可只靠同段共現。

### Round 2. Military, Deployment, Equipment

擴充現有 battle candidates，讓戰鬥不只是一句「某人戰某人」。

新增或強化 extractor：戰前部署、守關紮寨、情報偵察、追擊撤退、戰後報捷、武器、戰馬、器械、賞賜裝備。

輸出 gate：battle/deployment event 必須補 location；equipment event 必須有 itemRefs 或明確 item keyword。

### Round 3. Governance And Diplomacy

把武將與君主從戰場拉進國家運作。

新增或強化 extractor：任官封賞、朝廷詔令、廢立、會盟、外交談判、進貢聯姻、遠征邊疆、農工商建設、稅糧治理。

輸出 gate：governance/diplomacy event 必須能投影至少一個 decisionWeightHint。

### Round 4. Affect, Life, Talent, Work Activity

補足生活化、人物語氣、內在偏好，以及可轉成活動/任務的工作與社會角色權重。

新增或強化 extractor：親情、友情、愛情、悔恨、仁慈、野心、詩詞才藝、辯才、技術、會議發言、日常對話、名聲評語、當官、從軍、士農工商、貧民、乞討、作賊、暴民、黃巾賊、流亡、招安。

輸出 gate：affect/life event 必須有 affectTags 或 speechContextMode 用途；talent event 必須有 aptitudeTags；work/activity event 必須有 roleActivityTags、activitySeedHints 或 choiceWeightHints。

### Round 5. Coverage Hardening

不急著新增 taxonomy，改做補洞與降噪。

1. 對 uncovered generals 產生缺口報告。
2. 批次跑 context enrichment。
3. 把高信心 review-only candidates 轉成人類 MCQ。
4. 套用 accepted answers。
5. 重建 downstream，並比較 Round 0 到 Round 5 coverage delta。

## Standard Procedure Per Round

### 1. Pre-flight

1. 讀 `docs/keep.summary.md`。
2. 若會修改 `.md / .json / .py`，讀 `encoding-touched-guard`。
3. 確認工作樹中 unrelated 變更，不回退使用者改動。

### 2. Snapshot Current Coverage

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/extract_event_candidates.py --overwrite
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/run_etl_quality_pilot.py --top 24 --include-cold 4 --overwrite
```

必須回報：

- total generals
- generalsWithReadyEvents
- generalsWithGenericCandidates
- canonical ready events
- generic candidates
- pilot statusCounts
- top uncovered generals

### 3. Evolve Extractor Rules

每輪只新增一組 taxonomy family，避免一次改太多無法知道成效。

建議產物：

- extractor rule notes：本輪新增哪些 phrase / pattern / source cues。
- schema mapping：新 subtype 如何映射 eventType、affectTags、aptitudeTags、decisionWeightHints。
- activity mapping：新 subtype 如何映射 roleActivityTags、activitySeedHints、choiceWeightHints，以及未來可設計的活動/任務候選。
- false positive policy：哪些詞只進 review，不自動 ready。

### 4. Re-run Extractor And Generate Review Packs

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/extract_event_candidates.py --overwrite
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/generate_event_review_choices.py --top 50 --overwrite
```

若要針對特定武將：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/generate_event_review_choices.py \
  --general-id lu-bu \
  --output-root artifacts/data-pipeline/sanguo-rag/extracted/etl-quality-pilot/event-review-lu-bu \
  --overwrite
```

### 5. Batch Context Enrichment

對 `genericCandidateCount > 0` 的武將，批次跑 context enrichment。若尚未有批次 wrapper，先用 shell loop 或建立正式 runner；每位武將輸出獨立 `event-review-answers.<generalId>.enriched.todo.json`。

Reviewer preset 建議分層：

- `hints-only`：最快，不打 LLM，只測 deterministic candidateHints 與 gate，適合大批掃 coverage。
- `agent` / `agent-reviewer`：不打 LLM，使用專案內 reviewer logic 產 proposal；只有 strict gate 完整通過才可升 A，且同陣營 co-mention 不可因句中有「戰」字被誤判成 confronts。
- `agent` 強邊 gate 必須保守處理假陽性：任官 / 推薦句（如 `薦爲`、`表陳`、`縣令`）不可誤升為 commands；戰前宣言或事後回述（如 `活拿`、`斬了`）不可當成當場 confronts；`棄了 X，便戰 Y` 只能產生轉戰後的對手 edge，不可把 X 誤配到 Y。
- `agent` 自動優化心得：battle enrichment 的 context window 下限用 `2/2`；`1/1` 會漏掉有效近鄰 edge，`3/3`、`4/4` 在目前 cohort 沒增加 A。location 先偏好非 generic 地點，避免 `寨` 壓過 `汜水關 / 虎牢關 / 陽城`；但必須先套用共同行動 / 提議 / 身份介紹 / 意圖句 gate（如 `各選精兵`、`斬關入內`、`使一弓手出戰`、`平原令`、`呼玄德出`、`便欲殺之`）。`玄德使張飛擊之` 這類句型應產 directed `commands`，不是雙向 `confronts`。華雄相關戰鬥若候選地點含 `汜水關`，優先選 `汜水關`。
- `agent` alias / command 優化心得：既有 early generalId 的 fallback aliases（如 `劉焉`、`皇甫嵩`、`張寶`、`張角`、`張梁`、`朱雋/朱儁`）能顯著提高可審 A，但必須搭配 gate。`劉焉令...同玄德`、`雋令玄德`、`雋遣玄德` 可產 directed `commands`；`將玄德功勞` 不是 command。`近聞/欲往助之`、`遣副將高升`、`攻城西南角`、`率三軍掩殺`、`一齊趕上` 是轉述、委派或同盟分工，不可產雙向 `confronts`。phrase gate 比對前要去空白，避免 `compact_text` 把 `攻城西南角` 切成 `攻城西 南角` 後漏判。
- `agent` 字號 alias 來源：先跑 `build_romance_courtesy_aliases.py --overwrite` 生成 `artifacts/data-pipeline/sanguo-rag/extracted/alias-dictionary/romance-courtesy-aliases.json`，再讓 enrichment 合併 `GENERAL_ALIASES`、`person-registry.json/persons[]`、`manual-roster-seeds.json` 與該 artifact。維基《三國演義角色列表》的「字」欄可補 `玄德`、`益德/翼德`、`文遠`、`儁乂`、`君郎`、`義真`、`公偉` 等稱呼；但 alias 擴充後會暴露更多人物邊，需要 gate，例如 `遣兵追襲張讓` 不可誤判為 `曹操 commands 張讓`。
- `agent` 字號上游化心得：字號 alias 不能只放在 enrichment，還要讓 `build_alias_dict.py` 合併 `romance-courtesy-aliases.json` 產生 `formal-mention-map.json`，再重跑 `collect_observed_mentions.py -> extract_event_candidates.py -> run_etl_quality_pilot.py`。若要多跑不同批武將，使用 `run_knowledge_growth_round.py --cohort-offset <n>`，否則只會反覆跑最高 `genericCandidateCount` 的同一批。上游化後須特別 gate 同陣營部署/列隊句：`領夏侯惇...星夜來趕董卓`、`爲左軍/右軍/合後`、`操先令許褚、曹仁、典韋領三百鐵騎`、`引軍刺斜殺來` 不能產 peer commands/confronts；但 `X 與 Y 交鋒/廝殺` 要補回雙向 `confronts`，避免 command false-positive gate 擋掉真單挑。
- `agent` top-per-general audit 心得：把 `--top-per-general` 從 10 放大到 20 時，新增 A 先視為 precision audit，不要直接當 coverage 成長。已驗證的 review-only gate 包含投奔/任官/解和/罷兵/約會/召副將/前來保駕不可自動升 `commands`；馬匹搶奪指控、轉述死亡、部隊劫掠不可自動升 `confronts`；`救出曹操` 是友軍救援，不是曹操/典韋互相 confront；`殺入曹兵寨邊` 中劉備/張飛是同側行動，不可產 peer confront；若 summary 本身含 `送還馬匹`、`兩相罷兵`、`解和`，即使附近 edge 完整也只留 B 給人工 review。
- `agent` depth audit 心得：`--cohort-offset 15` 若回傳空 cohort，代表目前 generic-candidate pool 已沒有下一批可跑；不要反覆加 offset，應改重建 upstream candidate source 或新增非 battle taxonomy。`--top-per-general 30` 可用來挖後段假陽性，但若 `30` 與 `40` 產生相同 question count，視為本批深度平台並停止加深。已驗證的後段 gate 包含 `前奔許都 / 特來相投 / 來相投` 屬投奔或求援上下文，不自動升 battle A；`遣人至 / 喚入問之` 屬使者到訪，不自動產 commands A；`不見了曹操 / 復殺入城來 / 特來求救 / 來救援` 屬尋主、求援或友軍救援，不可把救援方與被救援方互判為 `confronts`，但仍可保留救援方對敵方的真戰鬥 edge。
- `agent` 語意理解分層心得：battle auto-A 不應只靠 LLM 猜古文；先用正向表列要求 `confronts` 至少命中明確戰鬥 cue（如 `交鋒 / 廝殺 / 交戰 / 大戰 / 搦戰 / 迎戰 / 截住 / 追襲 / 殺敗 / 攻打 / 刺 / 斬`），再用負向表列排除救援、投奔、使者、任官、停戰、同側行動。白話文對照版可作為 `sourceRef -> plainText` sidecar 加進 expandedContext，但必須能精準對齊原文 sourceRef，且不得單獨寫 canonical；沒有對照版時，疑難 B/D 題可請 LLM 先翻成繁體白話，輸出 `plainTextInterpretation` 與 `roleInteractionGuess` 作 reviewer trace，但只有原文 gate 也通過時才可升 A。同陣營人物預設不產 `confronts`，除非原文有明確反叛/內訌/倒戈 cue 或成對直接戰鬥句；叛亂比例低，應獨立 taxonomy / exception table 處理。
- `runner` 防卡死規則：避免用一長串 shell + `set -e` 直接跑完整輪。`run_knowledge_growth_round.py` 必須保留 per-general error isolation、`--step-timeout-seconds`、snapshot error capture；單一武將 generate/enrich/snapshot 失敗時寫入 batch JSON 的 `generate/enrich stderr` 或 `paths.*SnapshotError`，整輪仍繼續。WSL `/mnt/c` snapshot 用 `shutil.copyfile()`，不要用會複製 metadata 的 `copy2()`，避免 Windows 權限造成 `PermissionError`。
- `fast`：預設日常 reviewer，使用較快模型如 `qwen2.5:7b`；只填 proposal，保守留 B。
- `quality` / `deepseek`：慢但較適合最後複核；只有通過 strict gate 的題目才允許升 A。

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/enrich_event_review_context.py \
  --answers <event-review-answers.todo.json> \
  --reviewer-preset fast \
  --api-url <ollama-api-url> \
  --window-before 2 \
  --window-after 2 \
  --fill-answers \
  --overwrite
```

批次 runner 優先使用 adaptor preset：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/run_knowledge_growth_round.py \
  --round-id round-001-fast-review \
  --reviewer-preset fast \
  --max-generals 5 \
  --top-per-general 1 \
  --window-before 1 \
  --window-after 1 \
  --overwrite
```

Batch enrichment 必須保留：

- canonicalWrites=false
- model/apiUrl/requestMode
- per-question raw error
- candidateHints
- A/B/C/D counts

### 6. Human Review And Apply

人類只審 enriched todo 的 A/B/C/D 與 edits，不再逐題猜上下文。

套用時只接受 schema gate 通過的題目：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/apply_event_review_answers.py
```

若 apply script 尚未支援 per-general enriched todo，先擴充 apply script，不要手改 canonical events。

### 7. Rebuild Downstream

accepted events publish 後立刻重建：

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/build_keyword_options.py --general-id zhang-fei --overwrite
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/build_persona_cards.py --overwrite
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/build_api_readiness_index.py --general-id zhang-fei --overwrite
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/run_etl_quality_pilot.py --top 24 --include-cold 4 --overwrite
```

未來應補一支 round summary runner，將 downstream delta 彙整成：

- accepted events increased by N
- covered generals increased by N
- keywordTotal increased by category
- personaEvidenceRefCount increased by N
- decisionWeightHints coverage increased by N

### 8. Record New Discoveries For Next Round

每輪要把新發現沉澱成下一輪 extractor 工作項，而不是只留在對話中。

紀錄格式建議：

```json
{
  "roundId": "knowledge-growth-r2",
  "newExtractorFamilies": ["deployment", "equipment"],
  "newPositivePatterns": [],
  "falsePositivePatterns": [],
  "newSubtypes": [],
  "nextRoundFocus": ["governance", "diplomacy"],
  "coverageDelta": {}
}
```

## Evidence Seed v3 Preview Role

當流程提到 `EvidenceSeed`、外部採證 seed、seed ranking、GraphRAG claim graph 或 seed -> card promotion 時，這個 skill 的定位是「補證與互證 reviewer」，不是 canonical author。

優先順序：
- 先用 deterministic / CLI / strict parser 產生低成本 seed。
- seed 分數高但缺 quote / locator / hash 時，skill preview 負責補找可引用原文、定位與互證來源。
- skill preview 可以把 seed 推薦成 `candidate-card`、`preview`、`human-review` 或 `seed-only`，但不得直接判定 canonical promotion。
- 玩家整理、百科、遊戲 wiki、二創資料只能作為 seed 或 worldbuilding hint；必須被三國演義原文、三國志、後漢書、資治通鑑、可靠研究或多 sourceFamily 互證後，才可提高等級。
- 女性人物可提高 worldbuilding 補全優先序與可用分數，但不可提高 historicalTrustScore，也不可把演義/傳說誤標為正史。
- 所有 v3 preview 輸出都要保留 `canonicalWrites=false`，正式套用仍由人工 gate 或專門 apply step 決定。

Preview 回覆至少要包含：
- 人物與 matchedName。
- angleType。
- 原 seedText 與補到的 quote / locator / sourceUrl。
- 是否跨 sourceFamily 互證。
- 推薦下一步：`seed-only`、`preview`、`candidate-card`、`human-review`。
- 不能升級的具體原因，例如 single-source、缺 locator、來源層級太低、疑似同書跨站轉載、claim boundary 不穩。

## Review Semantics

- `A accept`：欄位完整、sourceRefs 可追溯、schema gate 通過，可進 accepted events。
- `B accept-with-edits`：事件可用但欄位仍需人工修 summary / location / relationshipEdges / tags。
- `C reject`：切詞誤判、關係臆測、事件邊界錯誤。
- `D defer`：值得保留，但需要更多上下文、alias 修正或下一輪 taxonomy 才能判斷。

## Quality Gates

- 不得把 LLM output 直接寫入 canonical events。
- 沒有 sourceRefs 的事件不能 accepted。
- relationship event 沒有 relationshipEdges 不能 accepted。
- battle/deployment event 沒有 location 不能 accepted。
- affect/life/talent event 沒有 tags 或用途不能 accepted。
- work/activity event 沒有 roleActivityTags、activitySeedHints 或 choiceWeightHints 不能 accepted。
- item event 沒有 itemRefs 或明確物件名不能 accepted。
- diplomacy/governance event 沒有 decisionWeightHints 時只進 review。
- 每輪都要保留 `canonicalWrites=false` 的 sidecar artifacts，直到 apply step。

## Metrics To Report Every Round

每輪結束必須回報：

- `readyEventCount`
- `genericCandidateCount`
- `acceptedThisRound`
- `rejectedThisRound`
- `deferredThisRound`
- `coveredGeneralCount`
- `newlyCoveredGeneralCount`
- `keywordPackCount`
- `personaCardCount`
- `keywordTotalDelta`
- `personaEvidenceRefDelta`
- `relationshipEdgeDelta`
- `decisionWeightHintDelta`
- `choiceWeightHintDelta`
- `roleActivityTagDelta`
- `activitySeedHintDelta`
- top 10 still-uncovered important generals

## Stop Condition

一輪 knowledge growth 可以在下列任一狀態停止：

- 新 extractor family 已加入、重跑完成、產出 review pack 與 coverage delta。
- 批次 enrichment 已完成，並產出 enriched todo 與 A/B/C/D 統計。
- 人工 answers 已套用，downstream 已重建，並輸出 round summary。
- 遇到真 blocker，且已記錄是哪個 script、哪個 schema gate 或哪個資料缺口阻擋。

停止時不可只說「已規劃」。必須明確回報本輪新增了哪些 extractor 條件、哪些武將 coverage 增加、哪些題目仍需人工審。
