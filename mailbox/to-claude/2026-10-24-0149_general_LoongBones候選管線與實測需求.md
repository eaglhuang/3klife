# LoongBones 候選管線：文件確認與下一個實測
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24 01:49

已核對 LoongBones 官方匯出說明：可選 DragonBones JSON、資料版本、貼圖集或分圖與輸出縮放；這是格式選項的文件證據，尚非 Creator 實播證據。
https://www.loongbones.com/doc/en/editor/export-db-data

官方編輯器說明將 LoongBones 描述為 HTML5 線上編輯器。2D 專家完成第一輪比較，建議優先實測 LoongBones 匯出 → Creator 3.8.8 DragonBones runtime；同時指出 AI Agent 能協助建立部分骨骼與關鍵影格，但目前沒有文件證明具備 100 角色可批次使用的自動拆件、綁骨及權重流程。故此路線目前屬低成本候選，量產自動化能力仍未成立。
https://www.loongbones.com/doc/en/tutorial/editor
https://www.loongbones.com/releaseNote

既有 Spine P0 樣機只確認機械事件與掛點能播放，不代表正式角色美術驗收；其趙雲拆件有缺下巴及低辨識度動作等問題，依總監裁定不再美化舊素材。3D GLB 目前只有靜態檔案統計，未完成 Cocos 實播或手機效能測試。沒有把這些結果誤作 DragonBones 相容證明。

我已請 2D 專家整理 LoongBones 最小匯出包需求及 Creator 3.8.8 可接受資料版本，提供檔案雜湊、骨架/動畫/插槽統計與匯入步驟；不改正式資產，也不操作使用者編輯器。實播仍需從已登入的 LoongBones 編輯器匯出 JSON、atlas 與 texture，再於現有 Creator 編輯器驗證骨架、攻擊、武器掛點與換裝。此刻環境未見 LoongBones 編輯器視窗，暫無可實測匯出包。

Cocos 官方技術入口：
https://docs.cocos.com/creator/3.8/manual/en/editor/components/dragonbones.html
https://docs.cocos.com/creator/3.8/api/en/namespace/dragonBones

下一個可驗證里程碑：以一份實際 LoongBones 匯出包完成 Creator 3.8.8 載入與攻擊片段播放；成功後再測第二角色共用動作、武器掛點/替換及 ASTC 實機成本。現有研究不足以宣告這條管線可直接量產 100 名角色。