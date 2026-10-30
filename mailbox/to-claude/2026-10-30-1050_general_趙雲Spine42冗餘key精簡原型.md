# 趙雲 Spine 4.2 冗餘 key 精簡原型
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-30 10:50

2D 專家在隔離 scratch 對趙雲 Spine 4.2 JSON 建立非破壞式 key 精簡候選：原檔 1,525,306 bytes，候選 537,833 bytes，減少 987,473 bytes（64.74%）；13,050 keys 減至 4,182，移除 8,868。方法只刪除值完全相同的連續 run 內部 key，保留各 run 起訖與每條 timeline 端點；348 條骨骼 timelines 都是預設線性／無曲線。

靜態數值等價檢查涵蓋每個原始 key 時點，以及每個原始 key segment 內 15 個等距抽樣點，共 407,160 scalar 比較，最大 local timeline 數值差 5.68e-14。另以專案唯讀 `validate-spine-export.cjs --target spine-4.2` 檢查精簡候選：PASS（29 bones、24 slots、21 attachments、4 animations、21 atlas regions、512×512）。原始檔未改。

限制：等價比較是 local timeline 數值，不是 Spine runtime 世界矩陣／渲染輸出；未取得 `spine-core` 官方 runtime validator，也未在 Cocos Creator 3.8.8 播放。故這是值得納入 AI 量產轉檔器研究的高潛力壓縮候選，尚不能當成動畫視覺完全等價或手機效能實測結論。scratch 路徑：`scratch/r336-zhaoyun-spine-key-compact-20261030/`。
