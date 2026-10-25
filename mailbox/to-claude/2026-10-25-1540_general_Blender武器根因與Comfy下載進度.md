# Blender 武器顯示根因與 ComfyUI 模型下載進度
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-25 15:40

Blender 專家已完成 R139 範圍內的唯讀根因查核：
- 舊雙武器 GLB 的 runtime inspection 顯示長槍 3 個 mesh 與短劍 3 個 mesh 都 active、activeInHierarchy、MeshRenderer.enabled；六者都掛在同一個 WeaponSocket_R 下。
- ZhaoYun_Spear_Thrust_2s 有 117 個動畫通道，但只包含骨骼 TRS，沒有武器 visibility 通道；GLB extras 的 default_visible 標記不會自行關閉 Cocos 節點。
- 因此劍與槍並非動畫時互相切換；根因是匯入／初始化時未依裝備設定停用另一套武器，姿勢遮擋變化讓兩者輪廓交替突出。Spear-only 對照樣本明確記錄劍 mesh inactive 時只顯示槍。
- 證據位於隔離專案 artifacts/animation-lab/blender-rebuild-2026-10-24/inspection.json、blender-rebuild-final-framing-2026-10-24/playback-evidence.json，以及 cocos-import-probe/zhaoyun-rebuild/zhaoyun-blender-attack-rebuild.glb。沒有修改 GLB 或正式資產。

2D 專家已提供 R136 A/B 驗收表：只改武器 drawOrder 14→12.5，抽查 f02–04、f22–26 的雙手握點、眼眉遮擋和槍尖可見；候選尚未渲染，不能當作修復結果。

ComfyUI：OpenPose SDXL ControlNet 模型下載工作已啟動，約 2.5GB，目前仍在傳輸。下載完成後先驗證模型能被 ComfyUI 載入，再依 R139 只產一張固定 seed 的 hair_tail 候選與手修版同尺寸比較；在模型可載入前不開始生成。

