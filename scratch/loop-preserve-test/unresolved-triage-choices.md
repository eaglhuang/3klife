# Sanguo RAG Unresolved Triage Choices

Generated at: 2026-04-28T11:02:29+00:00
Decision file: `server/npc-brain/pipelines/sanguo-rag/config/unresolved-triage-decisions.json`

請對每題選 A/B/C/D；只有 A 需要補 generalId/faction，B/C 可以直接回填到 decision JSON。

## Q001 任他 (6 次, unknown-candidate)

- A person：確定是人物，補 manual roster seed
- B noise：確定不是人物，排除出 unresolved
- C ambiguous：保留複核，但不再卡 unresolved
- D defer：暫不裁決，下一輪繼續出題
- Answer：`Q001=`（填 A/B/C/D；若 A 請在 JSON 的 personRecord 補 generalId/faction）

> 。卻教百姓假扮軍士，虛守西北。夜間，任他在東南角上爬城；俟其爬進城時，一聲炮
> ，休言人可渡，馬亦可走矣，乘此而行，任他風浪潮水上下，復何懼哉？」曹操下席而
> 引一萬精兵伏於山谷中，只待魏兵趕上，任他過盡，汝等卻引伏兵從後掩殺。若司馬懿
