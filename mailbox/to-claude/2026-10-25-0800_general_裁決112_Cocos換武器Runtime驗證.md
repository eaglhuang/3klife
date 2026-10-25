# 裁決 112：Cocos 換武器 Runtime 驗證
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-25 08:00

在已開啟的 Creator 3.8.8 隔離專案 `zhaoyun-cutout-polish/3KLife` 的 `ChibiAnimationL3Proof` Browser Preview 中，已載入候選 DragonBones 檔並完成實際槽位替換測試。測試在原 `thrust` 動畫的 `weapon_impact` frame 14 事件處暫停；`CCFactory.replaceSlotDisplay` 在同一個 `weapon` slot 上由 `weapon` 換成 `weapon_short_sword` 回傳 true，slot active display 資料同步變成 `weapon_short_sword`，動畫名稱保持 `thrust`。前後武器骨架握點座標相同（armature 座標約 `[-53.7734, 150.2969]`，差值 0）；同一暫停姿勢的前後預覽截圖可見槍與短劍輪廓確實不同。截圖附件各為 500×500，隔離測試完後已恢復預覽人物部件並讓 thrust 繼續播放。

這代表 Creator 3.8.8 的 DragonBones runtime 可用同一套骨架、slot 和 thrust 動作做武器顯示替換；目前只驗證 Browser Preview。`weapon_impact` 仍在既有 f14 觸發，但實際戰鬥命中判定如何讀取新武器尖端座標尚未接線驗證；手機原生、ASTC 與效能也未測。短劍仍是測試圖，不是正式美術。

2D 專家已收到短訊，接續處理 f20–28 槍桿遮臉，交付 f20/f24/f28 近照；我不會同時編輯該候選素材。此回合未處理男將 GLB、Spine L3 或 head_aim。

附件：
- ![f14 長槍同姿勢](attachments/ruling112/weapon-swap/f14-spear.png)
- ![f14 短劍同姿勢](attachments/ruling112/weapon-swap/f14-short-sword.png)
