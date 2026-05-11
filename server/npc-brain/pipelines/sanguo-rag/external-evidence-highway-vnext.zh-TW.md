<!-- doc_id: doc_server_pipeline_0006 -->
# 外部網站採證高速公路 vNext 規劃

## 摘要
vNext 的目標是把外部網站採證變成一條真正可重跑、可淘汰、可擴充的高速公路，而不是一堆零散 script。

這一版的核心原則：
1. 官方來源清單只保留可跑來源。
2. 新網站一定先過 benchmark，不能先塞進 allowlist。
3. benchmark 不能只看 title/snippet，要能證明真的從正文抽到 `page-text` seed。
4. `high-yield-character-site`、`primary-text-site`、`community-worldbuilding-site` 都要走同一套三段 gate。
5. 單頁站也要能自動 benchmark，不應該因為沒有列表頁就變成人工特例。

本文件只描述 vNext 高速公路，不改既有 ABAB / three-lane / strict evidence card 正式管線。

## 目前狀態
這次實作後，三種站型都已有可運作模板：

- `high-yield-character-site`
  代表站：`lishirenwu-sanguorenwu`
- `primary-text-site`
  代表站：`wikisource-sanguozhi`
- `community-worldbuilding-site`
  代表站：`shuzi-sanguo-character-database`
  單頁模式代表站：`wikipedia-romance-character-list`

其中最重要的進展是：

- `extract_generic_passage_evidence_seeds.py` 已能從 `page-texts/*.txt` 抽正文句。
- `extract_generic_passage_evidence_seeds.py` 現在也能補 `habit / activity / role / dialogue_seed / source_conflict / location` 六種角度。
- 英文來源可保留原文 `quote`，另外補 `translatedTraditionalText` 當繁中審核摘要。
- `ProcessOn` 這類短行關係圖文字頁可用 `line-window` 模式合成關係 seed。
- `ProcessOn` 的 `token-window` 也可加掛 `relationshipDirectionDenoise`，先整理成「誰 -> 跟誰 -> 什麼關係」的中文 preview。
- `cne3 culture` 這類 API 分頁站，已可用 `api-json-list` 自動翻 `pageno=1...N` 再進每篇內文 harvest。
- `benchmark_external_source.py` 已支援：
  - 多頁 harvest (`harvestPolicy`)
  - 單頁 fallback (`singlePagePolicy`)
  - API 清單頁 harvest (`linkExtractionMode=api-json-list`)
- benchmark 報表已能列出真正的 `bodyTextExamples`，而不是只吃 source-health 摘要。

## 官方來源清單規則
官方 allowlist 在：

- `server/npc-brain/pipelines/sanguo-rag/config/external-evidence-sources.json`

允許保留在官方清單的只有兩種：

- `approved`
- `manual_quote`

不再保留：

- `suggested`
- 已知 403
- 需登入
- deterministic precheck 抓不到有效正文的站

每個來源至少要有：

- `sourceId`
- `status`
- `adapterType`
- `sourceClass`
- `sourceFamily`
- `sourceLayer`
- `trustTier`
- `baseUrl`
- `singleSourceMaxGrade`
- `claimScopes`
- `harvestPolicy` 或 `singlePagePolicy`

若來源需要額外抽取策略，也可加：

- `translationPolicy`
- `extractorPolicy`

若來源已通過 benchmark，還要補：

- `benchmarkBaseline.samplePageCount`
- `benchmarkBaseline.seedPerPage`
- `benchmarkBaseline.candidateCardPerPage`
- `benchmarkBaseline.lastApprovedAt`

### precheck 關鍵字一致性（新增）
為了避免 precheck 判準在不同工具漂移，`termHitKeywords` 現在統一採三層優先序：

1. CLI override：`--term-hit-keyword`（可重複）
2. 來源設定：`external-evidence-sources.json` 的 `termHitKeywords`
3. 系統預設關鍵字（`三國/曹操/劉備/孫權/關羽/諸葛亮/司馬懿` 的繁簡集合）

已同步實作於：

- `run_3kweb_check.py`
- `tools_node/agent-clis/3klife-source-health.js`
- `tools_node/agent-clis/3klife-web-page-harvester.js`

因此同一個來源在 Stage 1（健康檢查）和 Stage 2（內頁 harvest）會使用同一套 `termHitKeywords`，不再出現「前段判相關、後段判不相關」的口徑落差。

### vNext policy 配置化（新增）
原本寫死在腳本內的 gate 門檻已搬進 `external-evidence-sources.json`：

- `pipelinePolicies.precheckDefaults`
  - `likelyThreshold / possibleThreshold / minimumTermHitCount`
  - `hintKeywords`
  - `loginPatterns`
- `pipelinePolicies.sourceClassPrecheck`
  - 各站型的 precheck 門檻覆蓋
- `pipelinePolicies.stage2GateDefaults / stage2ClassGate`
  - harvest 成功率、相關頁率、錯誤率、重複率門檻
- `pipelinePolicies.stage3ClassGateDefaults`
  - 各站型 `seed/page`、`candidate-card/page`、`quote+locator+hash` 等門檻

來源也可在 source row 上加：

- `precheckPolicy`
- `stage2GatePolicy`
- `stage3GatePolicy`

但仍有全域 default，避免 benchmark 被隨意放寬。

## 站型模板
### 1. high-yield-character-site
適合：

- 人物列表頁很多
- 每個人物都有固定內頁
- 內頁有穩定人物正文

固定鏈：

1. `3klife-source-health.js`
2. `3klife-web-page-harvester.js`
3. `extract_harvested_page_evidence_seeds.py`
4. `harvest_external_evidence_seeds.py`
5. `score_external_evidence_seeds.py`
6. `promote_seed_to_evidence_card.py`

### 2. primary-text-site
適合：

- 正史、演義、傳記原文
- 一頁可能包含多個人物 section
- 需要 quote / locator / hash

固定鏈：

1. `3klife-source-health.js`
2. `3klife-web-page-harvester.js` 或 `singlePagePolicy`
3. `extract_generic_passage_evidence_seeds.py`
4. `harvest_external_evidence_seeds.py`
5. `score_external_evidence_seeds.py`
6. `promote_seed_to_evidence_card.py`

關鍵能力：

- 會從 `page-texts/*.txt` 讀正文，不只吃標題
- 會用 section heading（如 `董卓 [ 编辑 ]`）當人物 fallback
- 沒 canonical alias 時，也能先落 `candidatePersonId`
- 若來源是英文頁，可保留英文原句並補 `translatedTraditionalText`
- 若來源是關係圖短行頁，可切換成 `line-window` 抽取模式
- 若來源是 API 分頁站，可在 `harvestPolicy` 直接配置 `api-json-list`

### 3. community-worldbuilding-site
適合：

- 人物百科
- 女性角色整理
- 演義角色列表
- 可玩性補充資料站
- 英文百科人物頁
- 人物關係圖文字頁
- API 分頁文章站

固定鏈與 `primary-text-site` 相同，但分級上限不同：

- 可產 seed / candidate card
- 單站不得直接升 `A-history`

## 三段 Benchmark Gate
主控：

- `server/npc-brain/pipelines/sanguo-rag/benchmark_external_source.py`

### Stage 1 Precheck
必過條件：

- HTTP `200`
- 不需登入
- 可 deterministic 抓到正文或 title/snippet
- `termHitCount > 0`
- 非純 JS 空殼

### Stage 2 Harvest Sample
`high-yield-character-site`：

- sample 預設 30 頁
- `fetchSuccessRate >= 0.90`
- `relevantPageRate >= 0.70`
- `errorRate <= 0.10`
- `duplicateLinkRate <= 0.05`

`primary-text-site` / `community-worldbuilding-site`：

- 若有 `harvestPolicy`，走多頁 harvest
- 若只有 `singlePagePolicy`，走單頁 benchmark fallback
- 一樣要輸出 `pages.jsonl` 與 `page-texts/*.txt`

### Stage 3 Yield Gate
`high-yield-character-site`：

- `seed/page >= 1.0`
- `candidate-card/page >= 0.4`
- `canonical-match page rate >= 40%` 或 `shadowPeople >= 15`

`primary-text-site`：

- `quoteLocatorHashCoverage >= 0.90`
- `claimBearingPassageCount >= 20`

`community-worldbuilding-site`：

- `seed/page >= 0.8`
- `candidate-card/page >= 0.2`

最終 verdict 只有三種：

- `approve`
- `reject`
- `manual-only`

## 正文抽取規則
### Generic Passage Extractor
檔案：

- `server/npc-brain/pipelines/sanguo-rag/extract_generic_passage_evidence_seeds.py`

這支專門給：

- `primary-text-site`
- `community-worldbuilding-site`

它現在會做的事：

1. 讀 `pages.jsonl`
2. 讀對應 `page-texts/*.txt`
3. 清掉站內導覽噪音
4. 把正文切成 passage
5. 先找 canonical alias
6. 找不到時用頁面主題或 section heading 建 shadow person
7. 依句型推定 `title / relationship / event / trait / worldbuilding_note`
8. 產出標準 seed，保留 `quote / locator / textHash`

補充：

- 英文頁可產 `translatedTraditionalText`
- `line-window` 模式可處理 `父子 / 夫妻 / 宗親 / 義子` 這種短行關係圖
- 若 `extractorPolicy.relationshipDirectionDenoise=true`，會額外補 `relationshipSubjectHint / relationshipObjectHint / relationshipAnchorLabel / reviewPreviewTextZhTw`

### page-text 嚴格驗證原則
只要 benchmark 說「正文有抽到」，就一定要能回答：

- 這句原文是什麼？
- 抽到哪個人？
- 分到哪個 `angleType`？
- `locator` 是什麼？
- 這句是來自 title/snippet 還是 page-text？

所以 benchmark 一定要列：

- `pageTextSeedCount`
- `claimBearingPassageCount`
- `quoteLocatorHashCoverage`
- `bodyTextExamples`

## 已驗證結果
### 1. high-yield-character-site
`lishirenwu-sanguorenwu`

- 詳細頁：`334`
- seeds：`551`
- candidate cards：`319`
- canonical generals：`184`

### 2. primary-text-site
`wikisource-sanguozhi`

- run id：`wikisource-sanguozhi-benchmark-r5`
- sample pages：`5`
- seeds：`757`
- candidate cards：`757`
- `pageTextSeedCount`：`714`
- `claimBearingPassageCount`：`563`
- `quoteLocatorHashCoverage`：`1.0`
- verdict：`approve`

這表示它現在不是只有抓卷名，而是真的能從正文抓到像：

- `董卓字仲穎，隴西臨洮人也`
- `卓又使呂布殺執金吾丁原，并其衆`

同一套 primary-text 模板也已經複用到另外三個站：

- `wikisource-houhanshu`
  - run id：`wikisource-houhanshu-benchmark-r1`
  - sample pages：`5`
  - seeds：`66`
  - `pageTextSeedCount`：`23`
  - `claimBearingPassageCount`：`23`
  - verdict：`approve`
- `wikisource-zizhitongjian`
  - run id：`wikisource-zizhitongjian-benchmark-r1`
  - sample pages：`5`
  - seeds：`100`
  - `pageTextSeedCount`：`57`
  - `claimBearingPassageCount`：`54`
  - verdict：`approve`
- `wikisource-romance`
  - run id：`wikisource-romance-benchmark-r1`
  - sample pages：`5`
  - seeds：`430`
  - `pageTextSeedCount`：`387`
  - `claimBearingPassageCount`：`238`
  - verdict：`approve`

### 3. community-worldbuilding-site
`shuzi-sanguo-character-database`

- run id：`shuzi-benchmark-r4`
- sample pages：`6`
- seeds：`280`
- candidate cards：`278`
- `pageTextSeedCount`：`231`
- `claimBearingPassageCount`：`150`
- `quoteLocatorHashCoverage`：`1.0`
- verdict：`approve`

這表示它現在能真的從人物正文抓到像：

- `刘表身长八尺余，姿貌温厚伟壮`
- `曹操南征，刘琮举州以降，荆州遂没`
- `周瑜攻取皖城，迎娶小乔为妻`

### 4. community-worldbuilding-site 單頁模式
`wikipedia-romance-character-list`

- run id：`wikipedia-romance-character-list-benchmark-r1`
- sample pages：`1`
- seeds：`1108`
- candidate cards：`1108`
- `pageTextSeedCount`：`1064`
- `claimBearingPassageCount`：`623`
- `quoteLocatorHashCoverage`：`1.0`
- verdict：`approve`

這證明 `singlePagePolicy` 已打通，不再只能處理列表頁站。

## 報表規格
每次 benchmark 至少輸出：

- `benchmark-summary.json`
- `benchmark-summary.zh-TW.md`
- `harvest/pages.jsonl`
- `harvest/page-texts/*.txt`
- `extracted-seeds/manual-evidence-seeds-summary.json`
- `standard-pipeline/external-evidence-seed-ranking.json`

`benchmark-summary.json` 必須包含：

- `sourceId`
- `sourceClass`
- `samplePageCount`
- `fetchedPageCount`
- `seedCount`
- `candidateCardCount`
- `previewCount`
- `canonicalPeople`
- `shadowPeople`
- `angleCounts`
- `failureReasons`
- `finalVerdict`
- `bodyTextExamples`

## 里程碑
### M1. 清官方來源清單
- [x] 移除 `suggested`
- [x] 移除已知 403 / 需登入來源
- [x] `run_3kweb_check.py` 改為只吃官方 config

### M2. 建立 benchmark 總控
- [x] `benchmark_external_source.py`
- [x] `approve / reject / manual-only`
- [x] precheck / harvest / seed / score / promote 串接完成

### M3. 補正文 extractor
- [x] `extract_harvested_page_evidence_seeds.py` 支援人物站
- [x] `extract_generic_passage_evidence_seeds.py` 支援原文站與社群站
- [x] `contentSource=page-text` 寫回 seed

### M4. 站型模板等級統一
- [x] `high-yield-character-site` 多頁 harvest
- [x] `primary-text-site` 多頁 passage benchmark
- [x] `community-worldbuilding-site` 多頁 sample benchmark
- [x] `singlePagePolicy` 單頁 benchmark fallback

## Checklist
- [x] 官方 allowlist 只留可跑來源
- [x] 403 來源不再 browser rescue
- [x] benchmark 有真實 `bodyTextExamples`
- [x] `wikisource-sanguozhi` 通過正文 benchmark
- [x] `shuzi-sanguo-character-database` 通過正文 benchmark
- [x] `wikipedia-romance-character-list` 通過單頁 benchmark
- [x] 所有輸出維持 `canonicalWrites=false`

## 下一步
下一波最值得做的是：

1. 為 `generic extractor` 增加更精細的 `location` 與 `source_conflict` 偵測
2. 對 `資治通鑑` 這類長時代史料增加 alias 噪音過濾，避免 `子桓 / 子孝 / 王立` 這類泛稱誤掛
3. 讓 `bodyTextExamples` 再多一欄「建議人工判定」或「推薦 lane」
4. 用這條高速公路持續淘汰低 ROI 站，只保留真的能產 `page-text` seed 的來源
