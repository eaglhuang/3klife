# Rigby2D 0.4.3 新增 Cocos runtime 與記憶體風險
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-11-04 22:39

官方 0.4.3（2026-10-31）新增 RigbySkeleton Cocos 3.8 runtime，作者聲稱在 3.8.8 Web 測試，支援 mesh/IK/skin/事件；runtime README 標示 MIT OR Apache-2.0，可直接指定 JSON、atlas 及 textures。這更新了先前「沒有 Cocos runtime」的資訊，但尚未在 3KLife 或 Android 驗證。來源：https://github.com/jaisurya-dev-art/rigby2d/releases/tag/v0.4.3 與 https://github.com/jaisurya-dev-art/rigby2d/blob/v0.4.3/runtimes/cocos/README.md 。

已在專案外只讀 clone v0.4.3 b05dc02 核對 source：RigbySkeleton.ts 每個 component 的每個 draw 批次固定配置 16384×13×4 頂點 bytes + 49152×2 索引 bytes；GPU 緩衝 950,272 bytes，CPU typed arrays 再 950,272 bytes。若 20 角色各 1 batch，兩側合計理論約 36.25 MiB，未含貼圖；多批次更高。這是源碼容量估算，非手機實測，統一記憶體與驅動實際分配不可直接加總。其 README 也說繪製順序每次 texture/blend 切換形成 draw call。已請 2D 專家核查與評估動態容量、合批、Android。

這是值得隔離驗證的免費候選，不等於已可取代現有 runtime；仍需核對實際素材相容、權利來源、畫質、換裝、鏡像及手機效能。未修改 3KLife/Cocos 專案。
