<!-- doc_id: doc_server_pipeline_0048 -->
# NPC-brain / Sanguo-RAG Phase 48：Primary Canon Relationship Backbone

## Summary

Phase 48 的目標是把「正史 + 三國演義」的 A 級關係證據先整理成可重算的主幹骨架，讓後續外部資料不再各自為政，而是能快速跟 `A-history / A-romance / A-canon` 對照。

本階段第一片不重跑外網、不改既有 claim graph、不改 canonical write 行為，只讀現有 `relationship-claim-graph` 產物，輸出：

- `primary-canon-relationship-backbone.jsonl`
- `primary-canon-external-alignment.jsonl`
- `primary-canon-gap-queue.jsonl`
- `primary-canon-relationship-backbone-summary.json`
- `primary-canon-relationship-backbone-report.md`

## Why This Matters

大白話：先有一張可信的「人物關係骨架圖」，後面所有外部資料就不用每筆從零判斷真假，只要問：

- 是否跟 A-canon 完全一致？
- 是否同一對人物但關係類型衝突？
- 是否 A-canon 還沒有覆蓋，需要回頭補正史/演義原文？

這會把後續資料吸收從「開放式查證」變成「封閉式比對」，速度會快很多。

## Scope

- 使用 `Policy_PrimaryCanonRelationshipBackbone_P1`。
- 預設 primary source family：
  - `sanguozhi`
  - `houhanshu`
  - `zizhitongjian`
  - `sanguoyanyi`
  - `romance-mao-hant`
- 預設 primary canon grade：
  - `A-history`
  - `A-history-cross-source`
  - `A-romance`

## Non-goals

- 不把所有正史/演義重新抓網頁。
- 不在本階段修改 relationship extraction cue。
- 不把 B 級或 external proposal 自動升 A。
- 不改 runtime profile、scoreboard 或 stable bootstrap schema。
- 不導入 PostgreSQL。

## Next Slice

下一片應該接 `Primary Canon Corpus Extraction Queue`：

- 讀 `primary-canon-gap-queue.jsonl`。
- 對高優先 general/pair 回頭跑 primary-text source。
- 只接受有 `quote / locator / textHash / directPairSignal` 的結果進 A-canon。
- 把新產物併回 relationship claim graph，再重算 completion。

## R1 Execution Notes: primary-canon top-20 extraction

本輪依 `primary-canon-gap-queue.jsonl` 前 20 名人物，使用本機已收集的 Wikisource primary-text sample 執行 extraction，來源優先序涵蓋 `三國志 / 後漢書 / 資治通鑑 / 三國演義`。

- Extracted seeds: `1413` rows across four primary source families.
- Candidate evidence cards after scoring/promote: `396` rows.
- Relationship overlay edges: `145` rows, all with quote / locator / textHash coverage from the extractor output.
- Merged relationship evidence rows: `213` rows after base + new primary-text overlay dedupe.
- Knowledge completion: `51.50% -> 52.23%` (`+0.73pp`).
- Core person completion average: `59.42% -> 66.73%` (`+7.31pp`).
- Relationship claim graph: total claims `2228 -> 2349`, but A-canon `357 -> 334` in the isolated after graph.

Interpretation: this run proves primary-text extraction can push downstream completion immediately, but A-canon did not rise yet because the newly merged overlay edges are still typed as generic `relationship_external`. The next improvement should refine primary-text relationship types before claim graph grading, so source-backed edges can align with A-history / A-romance / A-canon promotion rules instead of remaining broad external relationship evidence.
