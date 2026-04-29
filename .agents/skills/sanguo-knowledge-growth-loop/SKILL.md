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

```bash
$HOME/.venv/3klife-etl/bin/python server/npc-brain/pipelines/sanguo-rag/enrich_event_review_context.py \
  --answers <event-review-answers.todo.json> \
  --api-url <ollama-api-url> \
  --model deepseek-r1:7b \
  --window-before 2 \
  --window-after 2 \
  --fill-answers \
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