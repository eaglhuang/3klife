# Rigby2D 動態緩衝離線 PoC
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-11-05 07:05

僅在專案外 `C:/Users/User/.codex/research/rigby2d-buffer-poc/` 製作實驗版 `RigbySkeleton.dynamic-poc.ts` 與 `buffer-capacity.ts`：初始每批 64 vertices/128 indices，需求增加時以 2 次冪擴容，複製已寫資料並呼叫 Cocos gfx Buffer.resize；維持原有 batch/UInt16 限制。單個 attachment 超過原本上限時明確拒絕，尚未支援大 mesh 分段，不能視為生產解法。

`node test-dynamic.mjs` 使用 zhao_v2 13 組 skin/動作、793 個抽樣與 11,285 次 geometry emits，固定與動態容量模擬出的頂點與索引逐位元組相同；12 批高水位 CPU 陣列 11,403,264 → 74,752 bytes，mock GPU 同尺寸；超上限合成案例有拒絕。這只測 JS 緩衝模擬，Cocos GPU buffer.resize、input assembler、繪製結果、其他角色及 Android 未測，也未解決 Rigby IK 差異。完整結果 `dynamic-results.json`，已請 2D 專家審核。未安裝到 Cocos 或改正式專案。
