<!-- doc_id: doc_server_pipeline_0015 -->
# NPC-brain / Sanguo-RAG 第四階段重構計畫書：P1 Rule 外部化與 JSONL 正規化

## Summary

第四階段延續第三階段的 P1 governance 外部化，但重點從 `Policy_*` 轉向 `Rule_*`。本階段目標是把 EvidenceSeed extractor 裡的大型 keyword cue 與後續可治理規則搬出 Python，讓 Python 保留演算法、I/O 與流程控制，規則資料則由 `server/npc-brain/data/sanguo/rules/` 管理。

此階段仍不改 pipeline 結果、不導入 PostgreSQL、不改 canonical write 行為。所有搬移都以目前 Python 常數為唯一來源，先原樣搬出，不順手修正資料內容。

## Completed Slice 1：EvidenceSeed Keyword Cue Rules

已新增：

- `server/npc-brain/data/sanguo/rules/rule-evidence-seed-keyword-cues.jsonl`

已接上：

- `extract_harvested_page_evidence_seeds.py`
- `extract_generic_passage_evidence_seeds.py`
- `sanguo_governance_loader.py`
- `validate_sanguo_governance.py`

搬移內容：

- `RELATIONSHIP_KEYWORDS`
- `TITLE_KEYWORDS`
- `TRAIT_KEYWORDS`
- `EVENT_KEYWORDS`
- `ROLE_KEYWORDS`
- `LOCATION_KEYWORDS`
- `HABIT_KEYWORDS`
- `ACTIVITY_KEYWORDS`
- `DIALOGUE_KEYWORDS`
- `SOURCE_CONFLICT_KEYWORDS`
- `WORLDBUILDING_KEYWORDS`
- `IDENTITY_KEYWORDS`，限 generic passage extractor。

設計：

- JSONL 每列是一個 extractor 的一組 cue rule。
- 欄位包含 `id`、`extractor`、`constantName`、`angleType`、`keywords`。
- loader 保留列順序，validator 檢查 extractor、constantName、空 keyword、重複 keyword。
- extractor 新增可選參數 `--keyword-cue-rules`，舊命令不需要修改。

## Next Slices

1. `Rule_RelationshipDirectionDenoise_P1`

   外部化 generic passage extractor 的 relationship direction denoise 規則，例如 direction hints、ambiguous anchors、strict kinship labels、anchor distance、dense window limit。這片會影響 relationship preview hint，風險高於 keyword cue，需單獨 regression。

2. `Rule_TextNormalizationReplacement_P1`

   外部化 English template / phrase / name / token replacement 與 simplified/traditional hint table。這片最容易改變輸出文字，必須獨立做 baseline diff。

3. `Rule_PageTextCleanup_P1`

   外部化 body noise markers、tail trim markers、site-specific cleanup markers 的治理介面。這片可能改變 page text candidate，因此需和 extractor regression 綁在一起。

## Acceptance Criteria

- 不重新命名既有 pipeline scripts。
- 不改既有 CLI 的必填參數。
- 新增 governance 檔案必須可由 `validate_sanguo_governance.py` 掃到。
- 大量 row 類 rule 使用 JSONL。
- Python 裡不再保留已外部化的大型 keyword tuple，只保留空殼與載入邏輯。
- 若 governance rule 缺失，extractor 必須 fail-fast，不做靜默 fallback。

## Deferred

- PostgreSQL state store。
- Vector DB schema 調整。
- relationship claim graph 演算法修正。
- EvidenceSeed 資料內容修正。
