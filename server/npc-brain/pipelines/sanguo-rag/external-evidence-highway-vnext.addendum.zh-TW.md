<!-- doc_id: doc_server_pipeline_0010 -->
# 外部網站採證高速公路 vNext 增補

## 本次新增來源

### 1. 數字三國《三國人物大全》
- Source ID: `shuzi-sanguo-culture-character-compendium`
- 網址：[https://www.cne3online.com/culture/view/11071872/11087895605124.shtml](https://www.cne3online.com/culture/view/11071872/11087895605124.shtml)
- 站型：`community-worldbuilding-site`
- 用途：高密度人物索引頁，適合快速補 `relationship / title / worldbuilding_note / event / location`
- 最新 benchmark：`1 page / 666 seeds / 666 candidate cards / canonicalPeople 338`

### 2. Kongming's Archives Encyclopedia
- Source ID: `kongming-archives-encyclopedia`
- 網址：[https://kongming.net/encyclopedia/](https://kongming.net/encyclopedia/)
- 站型：`community-worldbuilding-site`
- 用途：英文人物百科頁，適合補 `identity / relationship / location / event / source_conflict / worldbuilding_note`
- 重要調整：
  - `harvestPolicy.linkInclude` 改為只抓 `/encyclopedia/officers/*`
  - 避免把字母索引頁、目錄頁混進正文抽取
- 最新 benchmark：`20 pages / 188 seeds / 139 candidate cards / preview 41`

### 3. ProcessOn《三國演義主要人物關係圖》
- Source ID: `processon-sanguo-main-relationship-map`
- 網址：[https://www.processon.com/view/6080f53fe401fd53c7b4e9b4](https://www.processon.com/view/6080f53fe401fd53c7b4e9b4)
- 站型：`community-worldbuilding-site`
- 用途：關係圖文字化後，補 `relationship` seeds
- 重要調整：
  - `extractorPolicy.passageMode = token-window`
  - `bodyStartMarkers / bodyEndMarkers` 只保留「大綱/內容」區塊
  - `disableTitleIdentity = true`，避免把整張圖的標題誤當人物
- 最新 benchmark：`1 page / 89 relationship seeds / 89 candidate cards / canonicalPeople 50`
- 風險說明：
  - 這類來源目前適合當 `B / worldbuilding` 旁證
  - 不可單站升 `A-history`
  - 關係方向仍需後續 cross-site 或 preview skill 再驗

## 本次流程修正

### 1. benchmark 改成單來源隔離
- 修正 [benchmark_external_source.py](/C:/Users/User/3KLife/server/npc-brain/pipelines/sanguo-rag/benchmark_external_source.py:942)
- 問題：舊版 Stage 3 會把其他 approved/manual source 的 strict cards 一起吃進去，導致 benchmark ROI 被灌水
- 修正方式：
  - [harvest_external_evidence_seeds.py](/C:/Users/User/3KLife/server/npc-brain/pipelines/sanguo-rag/harvest_external_evidence_seeds.py:205) 新增 `--no-default-external-evidence-cards`
  - benchmark 內部固定傳入這個參數，只計算該來源自己的 seeds

### 2. community-worldbuilding-site 新增正文硬門檻
- 修正 [benchmark_external_source.py](/C:/Users/User/3KLife/server/npc-brain/pipelines/sanguo-rag/benchmark_external_source.py:1063)
- 新規則：
  - `pageTextSeedCount == 0` 不可通過 Stage 3
  - `claimBearingPassageCount == 0` 不可通過 Stage 3
- 目的：避免只靠 title/snippet 假過關，必須真的從正文抽出 seed

### 3. generic extractor 補六個角度主力抽取
- 修正 [extract_generic_passage_evidence_seeds.py](/C:/Users/User/3KLife/server/npc-brain/pipelines/sanguo-rag/extract_generic_passage_evidence_seeds.py:759)
- 已納入主力抽取：
  - `habit`
  - `activity`
  - `role`
  - `dialogue_seed`
  - `source_conflict`
  - `location`

### 4. 英文頁補繁中審核提示
- 修正：
  - [extract_harvested_page_evidence_seeds.py](/C:/Users/User/3KLife/server/npc-brain/pipelines/sanguo-rag/extract_harvested_page_evidence_seeds.py:566)
  - [extract_generic_passage_evidence_seeds.py](/C:/Users/User/3KLife/server/npc-brain/pipelines/sanguo-rag/extract_generic_passage_evidence_seeds.py:836)
- 新欄位：
  - `translatedTraditionalText`
  - `translationProfile`
  - `sourceLanguage`
- 說明：
  - 目前是 rule-based 審核提示，不是完整人工級翻譯
  - 保留原始 `quote`，避免翻譯把證據意義洗掉

## 新增 extractorPolicy 欄位

- `passageMode`
  - `line-window`
  - `token-window`
- `lineWindowSize`
- `tokenWindowSize`
- `tokenWindowStep`
- `disableTitleIdentity`
- `bodyStartMarkers`
- `bodyEndMarkers`

Schema 已同步更新：
- [source-policy.schema.json](/C:/Users/User/3KLife/server/npc-brain/pipelines/sanguo-rag/config/source-policy.schema.json:210)

## 建議解讀

- `數字三國`：目前是三個新來源裡 ROI 最高的單頁高密度入口，最適合快速堆大量 seed/card 母體。
- `Kongming`：價值在英文百科正文，可補人物細節、世界觀與女性角色，但翻譯目前還是審核提示層，不是正式中文定稿。
- `ProcessOn`：已經能把圖頁轉成關係 seeds，但精度不如人物頁或原典頁，適合當關係提示源，不適合單站定論。
