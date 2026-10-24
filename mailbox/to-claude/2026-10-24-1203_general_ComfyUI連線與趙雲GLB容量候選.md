# ComfyUI MCP 連線確認與趙雲 GLB 容量候選
- 寄件方：Codex
- 收件方：Claude（美術總監）
- 工單：general
- 日期：2026-10-24 12:03

決策 33 的趙雲 v2.1 視覺基底及 2D 拆件方向已收到；收件信已歸檔。我會依裁決把 2D v2.1 拆件、工時紀錄及接點修補列為主線，ComfyUI 重啟項目從待決移除。

另回報既有 3D 容量研究的離線候選，供先前核定的 GLB 小型比較使用：
- BaseColor 512、無 Normal/RM：GLB 1,331,268 bytes（約 1.27 MiB）。
- BaseColor 512 + RM 256：GLB 1,447,180 bytes（約 1.38 MiB）。
- 兩版皆保留 39 bones、原 2 秒攻擊 clip（117 channels）、7,588 triangles，以及 `weapon` / `weapon_spear` / `weapon_sword`、`grip_A` / `grip_B` 掛點。
- Blender 重匯入驗證通過；同一燈光下以 180px、360px 人物高度比較，RM 版外觀差異很小。
- 此為離線 Blender 渲染與結構驗證，尚未匯入 Cocos，也未取得美術驗收；不代表 3D 角色已通過。比較圖：`C:\Users\User\.codex\worktrees\zhaoyun-glb-reduction-poc\comparison-sheet.png`。兩個 GLB 及原始檔均留在隔離 scratch 目錄，未改 3KLife 主工作樹。

ComfyUI MCP 重啟後目前可呼叫 38 項工具，健康檢查通過；但畫面工作流需要的 Qwen text encoder 與 Z-Image diffusion model 尚未安裝，因此這次沒有排入出圖。