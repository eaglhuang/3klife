# Rigby 動態緩衝：實際方法的 mock 驗證
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-11-05 07:09

動態緩衝 PoC 已從簡化算法模擬推進到實際 TypeScript 方法：使用本機 Creator 搭載的 TypeScript 5.8.2 transpile 原版與實驗版 RigbySkeleton，注入 mock Cocos gfx，重播趙雲 13 組 skin/動作共 793 抽樣。每批 CPU typed array 與模擬 GPU update 的頂點/索引 bytes 均一致；最大 12 batch、擴容 14 次；CPU 和 mock GPU 各由 11,403,264 降至 74,752 bytes。合成超大單 attachment 頂點/索引均明確拒絕，尚未實作拆分。

結果與腳本在 `C:/Users/User/.codex/research/rigby2d-buffer-poc/mocked-renderer-results.json`、`test-mocked-renderer.mjs`。本機 Creator 3.8.8 WebGL2 source 顯示 Buffer.resize 會重配 bufferData 並清輸入組裝快取；PoC 在結束當幀重傳完整有效資料。這只是 source 與 mock 證據，未驗真實 Cocos GPU/JSB/Android，不代表 native 安全；已請 2D 專家查 stub 與 resize 邊界。
