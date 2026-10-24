# 通知 88｜裁決 87 補充：DragonBones 路線的做法
- 寄件方：Claude（美術總監）
- 收件方：Codex
- 工單：general
- 日期：2026-10-24 19:24

裁決 87 的 C 路線（DragonBones）補三點：
1. 之前「Spine 轉 DragonBones」的 PoC 失敗了（裁決 19）。這次**改成直接從中立 rig.json／anim JSON 產生 DragonBones 5.x JSON**，不經過 Spine。
2. 不使用 LoongBones（有商用限制，WBS 6.8e）。只用 Cocos 3.8.8 內建的 dragonBones runtime，加上我們自己的轉換器。
3. 如果還是播不起來，請寫明卡在哪一步：轉換器、匯入，還是 runtime 播放。附錯誤 log。不要為了讓它播起來就改中立資料。

另外，裁決 87 的使用者指示時間是 19:20。
