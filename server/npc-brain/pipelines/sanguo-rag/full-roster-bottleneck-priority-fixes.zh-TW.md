# 全量收斂瓶頸拆解與優先修復清單（ROI 版）

## 1) 目前卡點快照（基線）

- 全域收斂基線：`overallPercent = 70.12`
- 你剛跑完的 precision/blitz 基線：`58.72 -> 59.25`（+0.53）
- 目前分數缺口最大兩項：
  - `eventQuestionCoverage`（權重 32）
  - `relationshipGraph`（權重 22）

換句話說，現在不是「證據量不夠」，而是「證據進不到高權重計分主幹」。

## 2) 估算方式（用於預估提升區間）

`overallPercent = Σ(componentRawScore * weight)`

敏感度（raw score 每提升 0.01，overall 大約增加）：

- `eventQuestionCoverage`: +0.32
- `relationshipGraph`: +0.22
- `taxonomyAngles`: +0.13
- `personFoundation`: +0.12
- `reviewValidation`: +0.06

因此「最值得投資」是優先拉升 event 與 relationship 兩個主軸。

## 3) 優先修復清單（依投入/回報排序）

| 優先 | 項目 | 為什麼卡 | 實作重點 | 預估 overall 提升 | 成本 |
|---|---|---|---|---|---|
| P0 | **Scoreboard 缺欄位直通 Repair Feed** | `deterministic-repair(197)` 與實際 `editBacklog` 脫鉤，導致跑 140/57 但命中率低 | 新增 bridge：把 scoreboard 的 `missing location / missing relationshipEdges` 直接轉成 repair candidates，先併入 editBacklog 再跑 campaign | **+0.8 ~ +2.0** / 1-2 輪 | 中 |
| P1 | **Global Candidate Cards 增量注入主幹** | 外部卡片多，但進分數主幹比例低 | 把 `global candidate cards -> relationship evidence / event question seeds` 做嚴格增量注入（內外互證、quote+locator+hash 才升權重） | **+2.0 ~ +4.5** | 中高 |
| P2 | **Relationship 轉換率提升（claimType 重解析）** | `claimType-not-relationship` 擋掉大量卡片 | 針對 event/title/trait 句型做關係抽取器，補主客體方向與合法關係組合檢查，先進 sidecar 再 gate | **+1.0 ~ +2.8** | 中 |
| P3 | **同輪二次檢查強化（Repair -> Preview）** | 補欄位後未立即把 B 壓到 A，reviewValidation 漲幅慢 | 補欄位成功即 rerun preview；未滿人工門檻時持續自動回圈，並加 B-cluster 去重 | **+0.5 ~ +1.3** | 低中 |
| P4 | **角度補強（habit/activity/role/dialogue/location）** | 種子很多但角度集中，taxonomy 上限吃不滿 | 對高產站新增 deterministic 角度抽取規則，優先補缺角人物 | **+0.6 ~ +1.8** | 中 |
| P5 | **Shadow 與 Canonical 雙 KPI 分離** | shadow roster 拉大分母，造成「進步感被稀釋」 | 新增雙指標：`canonical-progress` 與 `expansion-progress`，不改安全 gate 只改觀測層 | **可見進度 +8 ~ +20（觀測修正）**；品質實增接近 0 | 低 |
| P6 | **人工待審去重與聚類裁決** | 重複題拖慢 throughput | `sourceRefs + location + participants + summary hash` 聚類，cluster 級決策回寫 | **+0.2 ~ +0.8**（但人工效率可 +2x~3x） | 低 |
| P7 | **來源 ROI 自動退場與權重修正** | 低效來源稀釋 pipeline | 低產/高衝突來源降權或退場；高質來源提高採樣優先 | **+0.3 ~ +1.0** | 低中 |

## 4) 建議執行順序（最大化近期進度）

### P0 已落地（2026-05-11）

`run_progress_advancement_loop.py` 已新增 Scoreboard->Repair Feed bridge 介面：

- `--scoreboard-repair-bridge`
- `--scoreboard-json <path>`（可選；未帶時會從 base-progress 祖先路徑推斷 scoreboard）
- `--bridge-fields location,relationshipEdges`
- `--bridge-max-generals <N>`
- `--bridge-max-per-general <N>`
- `--bridge-include-shadow`（預設只吃 canonical）

每輪 summary 會額外輸出 `scoreboardBridgeRounds`，可直接看到：

- target generals 數
- matched generals 數
- missing candidates 數
- added rows 數
- bridged backlog 總量

### P1 + P2 已落地（2026-05-11）

本輪已完成：

- `build_external_observed_overlay.py`
  - 外部 row 新增 `trustSignals / overlayTrustPassed / hasQuoteLocatorHash / crossSiteSourceFamilyCount`。
- `build_event_question_seed_bank.py`
  - 新增「外部 claim 映射角度」增量注入（`claimType/angleType -> angleFamily`）。
  - 外部 row 必須通過 trust gate 才可注入主幹。
- `build_source_event_packets.py`
  - 同步導入 trust gate + claim 映射角度，直接提升 packet 主幹吞吐。
- `build_external_relationship_overlay.py`
  - 開放 `event/title/trait/...` 類型做 relationship 重解析（需關係語義 cue 才放行）。

Smoke 指標（`full-roster-max-progress-r2-r1` 基線比對）：

- relationship overlay edges：`1722 -> 2222`（`+500`）
- `claimType-not-relationship` gate reject：`19130 -> 3851`（顯著下降）
- event-question seed units：`959.4 -> 1003.1`（`+43.7`）
- source-event packet units：`2799.66 -> 3745.76`（`+946.1`）
- seed+packet total units：`3759.06 -> 4748.86`（`+989.8`）
- `estimate_knowledge_completion`（同基線重算）：
  - baseline：`70.12%`
  - 套用 P1（主幹注入）：`75.79%`（`+5.67`）
  - 套用 P1+P2（再含 relationship 重解析合併）：`79.04%`（`+8.92`）

### P3 已落地（2026-05-11）

`run_progress_advancement_loop.py` 已新增同輪自動 rerun 機制：

- `--same-round-rerun / --no-same-round-rerun`（預設啟用）
- `--same-round-rerun-max-passes`（預設 `1`，代表每輪最多再跑一次）
- `--same-round-rerun-min-repair-actions`（預設 `1`）

觸發條件：

- 本輪 pass repair 成功
- 補欄位訊號（location/relationship/boundary）達門檻
- pending review `>0` 且 `< pending-review-limit`

Smoke（`p3-same-round-smoke-r1`）：

- 第一個 pass：`repairSignals=96`、pending=`6`，觸發 rerun
- 第二個 pass：同輪 `-rerun1` 完成，rerun 停止
- summary 可直接看到 `sameRoundPasses` 與 `sameRoundRerunPassCount=1`

### Sprint A（先把「卡住」打通，2~3 天）

- [x] P0 Scoreboard->Repair Feed bridge
- [x] P3 同輪 repair->preview 強化
- [ ] P6 human-review cluster 去重

目標：

- `deterministic-repair` 命中率從目前低命中提升到 `>= 80%`
- 每輪 pending review 題量下降 `>= 30%`
- 單輪 overall 目標：`+1.0 ~ +2.5`

### Sprint B（把大量外證導入高權重分數，3~5 天）

- [x] P1 global candidate cards 增量注入 relationship/event 主幹
- [x] P2 relationship claimType 重解析與方向降噪

目標：

- `relationshipGraph` raw 提升 `+0.05 ~ +0.12`
- `eventQuestionCoverage` raw 提升 `+0.04 ~ +0.10`
- 單輪 overall 目標：`+2.5 ~ +5.5`

### Sprint C（擴張與觀測修正，2~3 天）

- [ ] P4 角度抽取規則擴充
- [ ] P5 canonical / shadow 雙 KPI
- [ ] P7 來源 ROI 退場與權重修正

目標：

- taxonomy/coverage 維持成長且噪音受控
- 報表可同時回答「品質真進步」與「母體擴張進度」

## 5) 驗收指標（避免只看總分）

- [ ] `deterministic-repair` 的待修 canonical 人數：連續兩輪下降
- [ ] `location` 缺欄位：`217 -> <120 -> <60`
- [ ] `location+relationshipEdges`：`57 -> <25 -> <10`
- [ ] `eventQuestionCoverage` raw：每輪至少 +0.02（成熟後 +0.03~0.05）
- [ ] `relationshipGraph` raw：每輪至少 +0.02（成熟後 +0.04~0.06）
- [ ] 人工待審題：重複 cluster 佔比下降到 <20%
- [ ] 全程維持 `canonicalWrites=false`

## 6) 關鍵提醒（避免誤判）

- `P5` 的雙 KPI 主要是「觀測修正」，不是品質魔法拉分。
- 真正能把資料品質推上去的，還是 `P0 + P1 + P2 + P3` 這四件事。
- 你現在的策略方向是對的：先把 B 級大量轉成可決策 A/B，再讓人工只處理高價值衝突點。
