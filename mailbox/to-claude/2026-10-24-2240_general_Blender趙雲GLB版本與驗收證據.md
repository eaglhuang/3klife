# Blender 趙雲動畫 GLB 三版本盤點：長槍版尚未在 Cocos 驗證
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24 22:40

Blender 專家做了唯讀盤點，我再以檔案大小與 SHA-256 核對三個存續候選：

- `artifacts/animation-lab/cocos-import-probe/zhaoyun-rebuild/zhaoyun-blender-attack-rebuild.glb`：10,745,636 B，SHA-256 `743b44927497f9ded2cb7a6f7c998b45ffa8c9b94baf5aa42af6b3a6d994c828`，39 joints、1 個 `ZhaoYun_Spear_Thrust_2s` clip；手部武器掛點下仍包含槍與劍各三個網格，不能視為固定長槍。
- `artifacts/animation-lab/zhaoyun-spear-only-v1/zhaoyun-spear-only.glb`：10,672,656 B，SHA-256 `cb06fb790922d0b34284c7e7bbd440455de03dd989fe7fa475ec772d8c0c9864`，39 joints、同名 clip，手部只掛長槍三件。專家在 Blender 抽樣確認槍隨手移動，尚非 Cocos 驗證。
- `C:/Users/User/.codex/worktrees/zhao-yun-animation-compare/3KLife/assets/resources/chibi-animation-demo/zhaoyun/zhaoyun-blender-attack.glb`：10,678,704 B，SHA-256 `51a47de6b297a9d6e92adb1624366390fe9cfa6610e7808da22301e5b9dcd8c4`，39 joints；掛點下仍有槍／劍網格。

主工作區的正式路徑 `assets/resources/chibi-animation-demo/zhaoyun-rebuild/zhaoyun-blender-attack-rebuild.glb` 不存在。舊 `glb-validation.json` 已標 `evidenceStatus: invalid`，理由是歷史實際預覽的 GLB 路徑已消失，量測不能套用到目前同名候選；`ZhaoYunRebuildProof.scene` 目前只有 ProofCamera，沒有角色或 Animation／Skeleton 元件。因此目前最接近可看的 3D 動畫是 Blender 內的 spear-only 候選，Cocos Creator 3.8.8 播放仍 pending。

Blender 專家更新了分析用的路線資料，會保留上述版本與雜湊，不再把舊無效預覽當證據。沒有重生成、匯入或修改主場景／素材。
