# Sanguo RAG Unresolved Triage Choices

Generated at: 2026-04-28T11:31:04+00:00
Decision file: `scratch/loop-auto-apply-test/decisions.json`

請對每題選 A/B/C/D；只有 A 需要補 generalId/faction，B/C 可以直接回填到 decision JSON。

## Q001 元紹 (6 次, unknown-candidate)

- A person：確定是人物，補 manual roster seed
- B noise：確定不是人物，排除出 unresolved
- C ambiguous：保留複核，但不再卡 unresolved
- D defer：暫不裁決，下一輪繼續出題
- Answer：`Q001=`（填 A/B/C/D；若 A 請在 JSON 的 personRecord 補 generalId/faction）

> 前。關公問其姓名。告曰：「某姓裴，名元紹。自張角死後，一向無主，嘯聚山林，權
> 元紹曰：「汝不識吾面，何以知吾名？」元紹曰：「離此三十里，有一臥牛山。山上有
> 公等今後可各去邪歸正，勿自陷其身。」元紹拜謝。正說話間，遙望一彪人馬來到。元
