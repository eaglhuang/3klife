# R204 執行進度：LoongBones 路徑與 R201 攻擊品質
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-26 14:42

已核對 C2 母圖檔 SHA-256 為 `6a85376f572083d090fc0483f52077fc709b2b34e1af02cd908bb8a81eb23fc8`，位於隔離工作樹 `scratch/r188-quarterview-candidates/master-candidates/zhaoyun-c2-master-realesrgan-alpha-direct-2x.png`。目前 LoongBones 線上編輯器可開啟，但還沒有匯入或上傳素材。

LoongScales 官方文件顯示單圖 AI 拆分會輸出最多 23 個語義圖層與分層 PSD，並可同步成 LoongBones slots；文件同時限定對卡通人像效果較佳，其他類型不推薦。AI 拆圖會消耗 LoongCoins，需在操作前確認費用；因此本輪尚未執行付費拆圖。即使拆出圖層，仍須驗證 20+1 命名、關節遮擋補繪、pivot/握點與重組差分，不能把 AI 拆分直接當成正式 rig。

R201 的 Cocos 3.8.8 Spine 3.8.99 runtime 冷載入與 idle→walk→attack→idle 播放已通過，但本次 live preview 的攻擊畫面可見手、武器及身體部件錯位，品質尚未通過。更正前一輪敘述：attack 不只有武器關鍵影格；JSON 還有 root、pelvis、雙腳 IK、torso、head、前臂、hair_tail、skirt 等 timeline。後側 arm/hand 沒有 attack timeline，後手跟不上武器仍是明確缺口。

握點量測也先更正：在 0.70 秒同一 Spine 空間取 `hand_b` 骨原點與 `grip_rear` 得 742.84 units（乘骨架 0.25 約 185.71 Cocos px），但 `hand_b` 骨原點不是手掌真正接觸點，故不能把 185.71 px 當成正式握持誤差。2D 專家確認須在手掌內標 `hand_b_grip`，再與槍上 `grip_rear` 於同座標系比距離；手掌 pivot 偏移不能合理解釋全部差量。R202 ≤1px 規則需在預備／出擊／收招用實際接觸點重測。

PMA 開關的前後截圖沒有固定在相同影格，本輪不據此判定橘邊；橘色線條看起來在髮片內，但仍須以固定影格做 true/false A/B。Atlas 邊界抽查有零 padding 區域，線性取樣有 bleed 風險，需以 2px padding/extrude 對照確認。

下一步按 R204：先取得 C2 的 20+1 同源分件候選並核對重組；接著把完全相同分件交給 Spine 3.8 與 LoongBones，輸出 DragonBones 5.5、各做 idle/walk/attack，再於 Cocos 3.8.8 同尺寸、同取樣時點比較冷載入、動作品質、握點、mesh/IK。R201 現有 Spine 檔不是已證明源自這個 C2 SHA，故在完成同源素材之前，不能稱兩路線已是同素材 A/B。

目前需要使用者處理的唯一外部步驟：LoongScales AI 拆圖若要測，先確認畫面顯示的 LoongCoins 費用並授權消耗；我未登入、未上傳或扣點。若不使用付費拆圖，改沿 R203 凍結的 polygon+alpha 20+1 管線準備同源 PSD。
