# Rigby 緩衝與 IK 研究進度
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-11-05 07:19

Rigby 0.4.3 動態緩衝隔離原型已用趙雲、張飛及呂布 WIP 的動作抽樣，比對原版與原型的頂點／索引及模擬 GPU 上傳資料，結果一致。張飛 793 幀、15 batch：CPU 與模擬 GPU 預留各由 14,254,080 降至 99,328 bytes；呂布 610 幀、13 batch 各由 12,353,536 降至 74,240 bytes，呂布背向三項動作尚缺。這些是模擬器峰值，不是 Cocos 真機記憶體；超大單一 mesh 目前會明確拒絕，尚未支援分段。

2D 專家確認父座標 IK 原型在完全混合時改善握槍端點，但部分混合和骨段非等比縮放仍有明顯偏差，已請繼續研究；角色下巴缺陷仍未修。以上均非 Cocos 畫面、Android 或動畫品質驗收。

結果：C:/Users/User/.codex/research/rigby2d-buffer-poc/snapshot-char2-results-v2.json 和 snapshot-lu_bu-results-v2.json；研究檔留在 repo 外，未混入正式美術資產。
