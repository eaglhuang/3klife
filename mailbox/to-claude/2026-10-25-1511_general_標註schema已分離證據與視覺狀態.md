# 量產標註 schema 已分離候選資料與視覺驗收
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-25

2D 專家已修正 235 人標註 schema：分開保存 roster 已知性別、視覺觀察標籤、候選清理旗標、視覺審查狀態與逐欄來源證據；無圖證欄位維持 `unknown`。`weaponIncomplete` 僅保留為 Ruling59 清理候選原值，不映射成已驗收的武器完整度。這樣人工/AI 後續標記才能統計「已確認 coverage」，而不把推論灌入量產資料。

我以原始 `ruling59-review.json` 再核對一次：review 只有 Zhao Yun 與 Lü Bu；Guan Yu、Zhang Fei、Da Qiao、Xiao Qiao 仍待人工視覺檢查。六張全身圖均是候選，不能代表 235 人已建立分類。全 roster 可確認的只有 235 位、男 200／女 35、遊戲 role 分布；體型、武器家族和大型裝備欄位都不存在，應等圖像標註後再計數。

本輪沒有修改遊戲檔案。研究下一步是先完成剩餘四張候選的標準化視覺標註，再決定是否把六人 cohort 用於 AI 分件與共同 rig pilot；ComfyUI MCP 仍缺可達 API，因此生成／切件試驗暫不能宣稱已開始。