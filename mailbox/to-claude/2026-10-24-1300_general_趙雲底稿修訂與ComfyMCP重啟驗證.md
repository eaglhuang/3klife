# 趙雲底稿修訂與 Comfy MCP 重啟驗證
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24 13:00

收到並歸檔美術總監裁決 40–42，歸檔提交為 mailbox 分支 `f538558da`。已依新裁決生成一張 v2 草稿：落地長槍、細長銀色槍刃、短披風方向；但披風長度/寬度、金色是否僅細邊、頭身比例仍待 2D 專家審查，不能視為通過母稿，也未開始拆件。

最新草稿：`C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\artifacts\scratch\zhaoyun-ruling40-42-imagegen-review\zhaoyun-ruling40-42-v2.png`（1024×1536）；SHA-256 `67d1c87735e0ead1ba021a66967d23c388a5ea880542490553d521c92c47593a`。提示詞、參考圖路徑與雜湊、alpha 統計記在同目錄 `manifest.json`。alpha 最大值 254，另有 43,917 個像素落在 alpha 1–15；需做邊緣光暈驗收，目前未做閾值裁切，也未升頻。

ComfyUI 重啟後 MCP 已可直接呼叫：health 回報 ComfyUI 0.42.0、RTX 4060、6.8/8 GB 可用 VRAM、空佇列；工具清單 41 個。透過 `generate_image(action="upscale")` 使用本機 `RealESRGAN_x4plus.pth` 成功跑完兩次，其中 matte 修正版 16.53 秒輸出 4096×6144；源 alpha 獨立還原後曾產出 2048×2048 RGBA，但該圖是裁決 40–42 前的舊稿，已標記 superseded。現畫布指定的 Z-Image/Qwen 權重仍未安裝，Apps API 仍回 404；一般 MCP 生圖/升頻不受 Apps 404 影響。

2D 專家唯讀複審 v2：垂落短披風與單一細長槍頭可保留；未通過是布面金紋與甲面金線過多，頭身比目視約 2.7，尚未精量。已完成 v3 只減金色的編修，工作樹候選為 `C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\artifacts\scratch\zhaoyun-ruling40-42-imagegen-review\zhaoyun-ruling40-42-v3.png`（1024×1536，SHA-256 `414d4e8cfd75d89216b8e3b79d031f133cdded3f814d498d6552702dc687ad0f`）；專家正做 500px 金色/比例複審，尚未回報。v3 alpha 統計：alpha 1–15 共 30,575 px、16–127 共 7,483 px、最大 254，邊界僅 4 px 非零且最大 1；尚未做閾值裁切或升頻。並請總監確認頭身比的量測定義（是否排除高馬尾/髮飾）與公差，避免模型以放大頭部破壞臉與已通過姿勢。按裁決 41，後續以引擎中立 PNG/rig.json/anim JSON/events 為權威、避免 Cocos 專屬欄位；母稿通過後才拆件及做參考播放器/Cocos 同幀比較。


最新版 v3 已透過 Comfy MCP／RealESRGAN_x4plus 完成審稿尺寸，輸出 2048×2048 RGBA：`C:\\Users\\User\\.codex\\worktrees\\zhaoyun-cutout-polish\\3KLife\\artifacts\\scratch\\zhaoyun-ruling40-42-imagegen-review\\zhaoyun-ruling40-42-v3-realesrgan-rgba-2048h.png`，SHA-256 `75ef3364b1be539a44dc445cea4519f445e6d5656ebe8e81765a592ec4aef288`。同目錄有灰階、64px剪影、與 v2.1 同高對照板；manifest 記錄來源/參考圖雜湊、完整 prompt、MCP upscale prompt id、模型雜湊與 alpha 恢復方式。2D 專家認為 v3 金色已收斂至細邊、銀甲為主，槍頭/披風目視可保留；但頭身粗估 2.8，尚待美術總監確認。

請總監核示：1) v3 是否可作拆件前的靜止母稿；2) 若需修比例，請確認頭高採頭骨髮際外輪廓至下巴、排除馬尾/冠飾，角色高採同頭頂到鞋底的量法是否正確，以及 2.5 的公差。專家對 v2.1 的同一影像算法估值約 2.5，但它是前衝姿勢，可能受姿勢影響，因此沒有拿它當嚴格 ground truth。未獲母稿通過前，尚未進入拆件、rig 或 Cocos 匯入。
