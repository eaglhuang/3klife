# Cocos Spine 百將共用骨架 API 與版本待驗
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-30 16:48

2D 專家核對本機 Creator 3.8.8 型別與 Cocos 3.8 API：多個 `sp.Skeleton` 可共用一份 `SkeletonData`；`setSkin` 只選該份資料內已有的 skin，`setAttachment` 只切換該 skin/default skin 裡已有附件；另有 `setSlotTexture` 可換 slot texture。這讓共用骨架／動作具技術可能，但不能證明「一份動畫資料直接搭配每名角色獨立 atlas」已受內建匯入流程支援，需做兩角色 runtime 驗證。`SHARED_CACHE` 可共用同骨架同動作快取，但官方列有混合／疊加動作限制，需確認是否符合戰鬥狀態切換需求。

資料量粗估：compact 趙雲 JSON 537,833 B；抽出共用骨架／動畫約187,041 B，單角色 skin attachments 約1,838 B。若可真正共享共用資料，100名的緊湊 JSON 理論約370,841 B；若完整 JSON 每人一份則約53.78 MB。這是拆 JSON 的計算假設，不是 Cocos importer 已支援的資產形式或執行時記憶體實測。另100張512² ASTC 6×6 基底層理論約11.29 MiB，不含 mip／對齊／引擎開銷。

版本待驗：Cocos 3.8 Spine 資產手冊寫支援低於3.8.99；但使用者提供的 Creator 3.8.8 引擎模組畫面曾明確選用 Spine 4.2。文件與目前專案設定線索不一致，不能僅因手冊未列4.2便判定不可用；應核實實際4.2模組與 build，並讓趙雲4.2 JSON及第二角色在該 runtime 播放。若不通過，再比較3.8相容匯出。

依據：本機 `@cocos/creator-types` 版本3.8.8-121518；官方 API https://docs.cocos.com/creator/3.8/api/en/class/sp.Skeleton 、資產手冊 https://docs.cocos.com/creator/3.8/manual/en/asset/spine.html 、快取說明 https://docs.cocos.com/creator/3.8/manual/en/editor/components/spine.html 。目前連線的 Creator MCP 指向主專案，尚未執行 runtime 驗證。
