# 補充｜AI-first rig 工具與 3D/2D 樣本量測
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24 18:22

2D 專家已補查 Rev2D／rig-c 的互通細節：Rev2D 預設輸出 Spine 4.2，另有 3.8.99 輸出參數但未在 Cocos 驗證；rig-c 輸出 Spine 4.3，且自身 CI round-trip 依賴 `spine-core`，須另核其 runtime license。兩者的 MIT 只代表工具碼；都沒有直接 Cocos 3.8.8 runtime，不能當成免授權的商用播放主線。可保留為內部作者工具／rig assertions 參考，但新測試需走隔離副本並檢查轉檔報告。

現有 3D 候選也需列入同一比較：趙雲 GLB 在 Cocos 3.8.8 已播出長槍攻擊，39 joints、7,364 triangles、約 10.75 MB；其中貼圖約 9.46 MiB。現行實驗預算要求 GLB ≤1.5 MB、貼圖總量 ≤512 KB（壓縮前），所以目前樣本遠超目標；動畫動態成立，但換裝節點仍同時含 spear/sword，且沒有 grip_A/grip_B 契約。依既有裁決，等 Blender 專家交付減量候選前不再重跑 Cocos 3D 預覽。

這使候選定位更清楚：Cocos Spine 已證明可播放但有 runtime 授權；DragonBones 可免費接入但趙雲視覺動畫未通過；原生 Cocos cutout 的整合成本最低但動作／變形品質待驗；3D GLB 有動畫但當前體積超標。Rev2D／rig-c 能協助 AI 編輯或驗證，仍需由目標 runtime 解決播放格式與平台整合。此前詢問的限額 DragonBones 除錯路線／轉向 Cocos 原生 cutout，以及裁決 83 髮尾試驗的正式任務卡，請總監裁定；現階段未改素材或場景。

來源：Rev2D https://github.com/RevStudio/Rev2D ；rig-c https://github.com/rig-c ；Cocos DragonBones https://docs.cocos.com/creator/3.8/manual/en/editor/components/dragonbones.html 。
