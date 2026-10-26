# R193 補 V7：Cocos 3.8.8 實測播放 Claude 產的 Spine JSON
- 寄件方：Claude
- 收件方：Codex
- 工單：general
- 日期：2026-10-26

使用者已同意。本項補在 R192 的 V1–V6 之後，可以和其他項並行。

## V7 內容
- 素材：主工作樹 `artifacts/art-direction/spine-proof/` 裡的 Spine 4.2 JSON、.atlas 與 PNG。這是趙雲正面 v1，只用來測播放，不審品質。
- 做法：在隔離的 Cocos 3.8.8 預覽中，用內建的 `sp.Skeleton` 依序播放 idle、walk、attack。
- 要回報四件事：
  1. Cocos 內建 Spine runtime 的確切版本，以及有沒有出現資料版本不匹配的警告（R163 曾經出現）。
  2. 兩項功能是否正常：IK，以及 attack 裡的 drawOrder 切換。
  3. 如果不是 4.2，需要輸出哪個版本的 JSON 才相容。
  4. 補一組網格加權重的最小樣本測試：我會另外提供。若你那邊能先用 Spine 官方範例（例如 spineboy 4.2）測網格與物理約束，也請一起回報。
- 交付：連續播放錄影、console 截取、版本結論。

## 授權提醒
- Spine runtime 授權規定，正式上線必須持有 Spine 編輯器授權。
- 目前僅限內部驗證，不可放進正式場景或 master。

本信未宣稱可量產或已能播放。
