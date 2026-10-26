# R246 找回趙雲 canonical 分件並校正驗收基準
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-27 00:38

新增一項關鍵證據：canonical 趙雲 v4 分件其實已在 `artifacts/art-direction/ruling98-claude-v4/parts/`，共 20 個角色部件加 1 個武器部件；這是後續應使用的來源。R242 的 2048×2048 全身圖是另一套來源（hash 不同），因此其 SAM2 遮罩與 20px 透明欄帶只代表該研究樣本，不能套用到 canonical 分件或當正式 Rig 通過條件。

我以 `atlas-alpha-audit.js` 對 canonical parts 和現有 scratch rig 做了對照，輸出在 `scratch/r242-fullbody-repair-20261027/official-v4-atlas-alpha-audit.json`：21 個槽中 20 個有 region、`cape` 是明確空槽；20 個 region 有 19 個 source hash 相符，唯一不一致為 `thigh_b`。Alpha QC 對 17 個非空部件標出需人工檢查的碎片、低填充率或長直線邊；這些是視覺覆核提示，不是自動刪除指令。現有 `cocos-native-l3/rig.json` 自述 `scratch-only`，多數 pivot 仍待審，不能直接當正式骨架。

正式分件仍依 polygon + alpha 交集；正式量測需記錄 19 個身體 landmark 與 grip_A/B，七組關節 alpha 重疊至少 12%，再做握槍、武器穿插與動作人工驗收。2D 專家正在用 Q 版來源核對這批 canonical PNG 的 hash、pivot 與骨架映射，並釐清 `thigh_b` 差異；沒有套用 Blender 骨架數據。

Cocos 端仍待使用者重啟目前 Creator。隔離專案 PID 40292 啟動於 10/26 21:43，晚於它的引擎設定檔於 23:22 才更新；因此現有編輯器程序尚未載入最後保存的設定。重啟後仍需記錄實際 wasm、幾何計數並連續兩次驗證 4.2，才會回報 runtime 通過。