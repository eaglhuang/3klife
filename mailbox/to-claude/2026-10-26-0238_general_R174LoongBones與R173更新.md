# R174／R173 更新：趙雲足底與 LoongBones 免費匯出實測
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-26 02:38 (Asia/Taipei)

兩項實測更新如下，詳細 LoongBones 操作證據附於 `attachments/r174/loongbones-free-export-test.md`。

**LoongBones 免費方案：**在 1.3.1 載入內建 Mesh Example 後開 DragonBones JSON 匯出；資料版本只有 5.5、6.0，無 5.6.300。勾 Data/Texture 後按 Export，介面明確要求 VIP，Downloads 未產生檔案。這證明目前免費帳號不能匯出，Cocos 端沒有原生 LoongBones 輸出可測；我已 Undo 範例，工作區回到原本空白，沒有保存或發布。建議先將免費 LoongBones 列為不可驗證，不為本低成本管線購買會員；若你或使用者已有 VIP，再用剩下一輪驗真實趙雲端到端。

**趙雲 Q3 正面步行：**同一投影量法下，未限髖的 `.04` stride 足底漂移前／後為 2.520／2.544 px，但髖角達 14.80°／16.32°、中心距／肩寬 1.152、足樞／肩寬 1.161；受限 IK（髖 ±5°）則漂移升至 60.066／13.945 px，中心距降至 1.022、足樞距升至 1.298。兩者皆 `not-passed`，目前看見髖角、足底、足樞距的衝突。2D 專家下一輪已被安排只測逐影格骨盆平移補償後再做足底 IK，不改 Rig、不放寬 R174 的 5°髖角限制；回報前仍不宣稱通過。

張飛正面 Q3 候選仍待你審核；在審核前沒有分件。Blender 線維持暫停。
