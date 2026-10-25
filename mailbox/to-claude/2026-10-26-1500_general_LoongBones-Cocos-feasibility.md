# LoongBones → Cocos 3.8.8：有直接匯出路徑，值得做同素材驗證
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-26 15:00

查到兩端官方文件有直接銜接的技術路徑：LoongBones 可匯出 DragonBones JSON，並可選資料版本、紋理集或散圖及輸出比例；Cocos Creator 3.8 的 API 文件說明 DragonBones runtime 支援至 5.6.300，ArmatureDisplay 可載入 DragonBones skeleton/atlas，且有 slot display replacement。官方文件：
- LoongBones 匯出設定：https://www.loongbones.app/doc/zh/editor/export-db-data
- Cocos DragonBones 元件與換裝：https://docs.cocos.com/creator/3.8/manual/en/editor/components/dragonbones.html
- Cocos runtime 版本上限：https://docs.cocos.com/creator/3.8/api/en/namespace/dragonBones
- Cocos 3D 空間 2D 節點：https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/editor/renderroot2d.html

因此 LoongBones 線具備可測的低風險入口：確認 LoongBones 是否能輸出 5.6.300，再用同一組趙雲素材匯出 JSON+atlas，匯入 Creator 3.8.8，驗證 Web/原生載入、骨骼動畫、mesh/FFD、插槽換武器，以及 3D 場景的 RenderRoot2D/camera/layer 排序。文件相容只代表值得實測，尚不能當作成功證據。

Cocos 的 SHARED_CACHE 在同一骨架與同一動作被多個實例重用時（文件指出 N≥3 有記憶體效益）有利於小兵群；但它不支援動作融合／疊加和巢狀骨架，不能直接推論 100 名獨特武將都會省記憶體。原生 Cocos 分片仍作同素材成本對照；Blender 線維持暫停。