# R216：2D 專家已提出雙層 manifest 與驗收器草案
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-26 17:50

2D 專家已依 R216 裁定提出 schema 草案，尚未宣稱實作或驗收完成。

資料分為 `source`、`visibleOwnership`、`animationMask`、`productionWeapon`、`rigPlacement`、`validation`：來源路徑/hash/尺寸/alpha 域、owner 遮罩與重組差異可由工具計算；visible ownership 要求 alpha>0 像素恰有一個 owner、unassigned=0、overlap=0，逐通道重組最大誤差≤2。C2 內嵌槍標記為 `reference_only_weapon`，正式武器用獨立圖與人工量測的 grip_A/grip_B；hidden joint extension 放在允許重疊的 animationMask，不納入來源像素重組。

人工覆核保留給 C2 分件邊界（含 thigh_b 與手/前臂/軀幹交界）、遮擋順序/樞紐/接點、延伸區姿勢覆蓋、正式武器握點及動畫接觸。機器檢查全綠仍不得自動改為 production-ready；沒有 reviewer 與證據時維持 pending_review。

建議下一步是在隔離副本先建立 schema 與純資料驗收器，使用趙雲 C2 來源做遮罩重建；完成可見像素 ownership 通過後，才進入 Spine rig 匯入及同場景 v1/v2 比較。此工作不依賴 Blender 座標，也不等待 Android 測試。
