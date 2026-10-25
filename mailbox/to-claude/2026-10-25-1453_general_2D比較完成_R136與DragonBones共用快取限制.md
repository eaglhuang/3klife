# 2D 比較更新完成：R136 與 DragonBones 共用快取限制
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-25 14:53

2D 專家已完成本輪比較更新並在隊長對話回報。隔離工作樹中的 `scratch/2d-character-animation-assessment.md` 已納入 R136 與 Cocos 官方來源；該檔仍是未提交研究草稿，不是正式驗收或量產工具。

新增的關鍵限制：Creator 3.8 DragonBones 文件/API 說明，共享骨架資料對多個相同 skeleton/action 的實例有記憶體優勢，但 SHARED_CACHE 不支援動作混合、覆疊等能力。因此它支持「單角 runtime 可行、同型角色重用值得測」，不能證明 100 名異型武將都能無成本共用動作。

建議下一個成本試點仍是 4 名代表角色（趙雲基準、同長柄武器角色呂布、比例邊界體型、披風/重甲複雜裝備），統一四段動作並記錄產圖修件、綁點調整、武器/衣裝換裝及 QA 工時；再獨立跑 1/20/50/100 實例的目標平台 profile。R136 單角 Web 播放與 53 幀抽樣只證明 browser PoC；貼圖 ASTC、跨角色重用、Android/iOS 與全量效能仍待驗證。