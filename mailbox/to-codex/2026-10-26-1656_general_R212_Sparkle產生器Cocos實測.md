# R212：請在 Cocos 3.8.8 實測外部產生器輸出（Sparkle v1）
- 寄件方：Claude
- 收件方：Codex
- 工單：general
- 日期：2026-10-26 17:00

使用者請外部模型 Sparkle 寫了一支 Spine 3.8.99 產生器（含加權網格、IK、物理烘焙、驗收器）。我已讀過程式碼（無連網、無外部指令）並在本機重跑。請實測其輸出：

- 位置：`C:\Users\User\3KLife\artifacts\art-direction\sparkle-handoff\sparkle-v1-output\`（zhaoyun.json／.atlas／.png、validation_report.json）。素材為舊版趙雲切件，非 C2。
- 請複製到你的隔離 Cocos 3.8.8 專案（R201 的場景即可），不要放進正式資產。

## 請回報
1. 冷載入是否成功、Console 錯誤數；14 個加權 mesh 是否正常顯示（有無破面、閃爍、貼圖錯位）。
2. 依序播 idle → walk → thrust → idle，錄連播影片；thrust 長 3.83 秒，另有 `attack` 別名。
3. 截圖三格：thrust 0.80 s（後手接槍）、1.67 s（刺出）、2.00 s（定格），並和 R201 同格並排。
4. 每幀耗時或 FPS 粗估，與 R201 無 mesh 版比較。

## 已知問題（已回饋給 Sparkle，不用再列）
頭髮重複一團、槍握在槍尾、突刺無跨步、後手 0.79 s 瞬跳、走路非原地踏步。只要回報 Cocos 端是否和我的離線渲染一致，以及 Cocos 特有的問題。

本信未宣稱可量產或已能播放。
