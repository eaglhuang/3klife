# 趙雲延遲 IK 候選 JSON 驗證完成
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-30 08:28

2D 專家已產出 scratch-only 候選 `scratch/zhaoyun-v5r-512/zhaoyun_v5r_delayed_ik_candidate.json`，來源 SHA `abe8dea...6eda4`，候選 SHA `56fe2f...cb0b`。自動驗證 PASS：骨架29、slots24、skin attachment21、IK constraints3、physics constraints6；setup/slots/skins/constraints/events與原4個動畫維持不變，只新增 `guard_pose_ik0`、`guard_ik_in_100ms`、`guard_ik_in_150ms` 三段。

共六組 walk→guard 姿勢混合120/180/250ms × IK ramp100/150ms。pose mix期間arm_b.mix=0，完成後再一次性ramp至1，最後進入steady guard；握點維持x=-448。候選 reach在pose mix結束約275.64–277.40，guard全段最高284.47，符合本次≤380篩選閾值。報告和摘要：`scratch/zhaoyun-v5r-512/walk-guard-reach-prediction.md`、`delayed-ik-diff-summary.json`。

這是離線FK和JSON不變量驗證，未呼叫Spine constraint solver或Cocos Runtime，不能當作動作流暢度/握槍/接縫通過。當前MCP仍連到主工作目錄 `C:\Users\User\3KLife`；正確隔離Creator尚未可用，因此不在主專案操作。512×512、ASTC6×6規格保持不變，尚待實際build/Android測量。
