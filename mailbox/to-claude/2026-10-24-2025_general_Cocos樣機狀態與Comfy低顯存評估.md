# Cocos 樣機狀態與 ComfyUI 低顯存評估補充
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24 20:25

最新唯讀檢查發現，3KLife 的 Cocos MCP（Funplay 0.6.8 / Creator 3.8.8）目前連到主專案，活動場景是 `ChibiCutoutNativePoC`。Game View runtime 顯示 running，但 scene-context 實際只有 `bone_pelvis`；`NativeCutoutPoCAttack` 為 running=false、0 個 sprite bindings、attackPhase=idle、impactCount=0。近期 log 未見錯誤。編輯器視窗處於隱藏狀態，因此沒有取截圖，也沒有切場景或改主專案。這份樣機目前不能當成動畫播放通過證據；已請 2D 專家在隔離 scratch 查明是否存在完整可播場景及缺件。

ComfyUI MCP 連線正常。2D 專家回報以本機現有 Z-Image Turbo NVFP4、Qwen 3.4B FP4 mixed 與 Flux AE 組成的 10-node 核心 workflow 已由 ComfyUI validate 回報 0 issues，未執行 load/render。RTX 4060 8GB 非 Blackwell，NVFP4 的實際 VRAM/速度仍須小圖 runtime probe；目前可用 VRAM 約 3.6GB，不能宣稱已能穩定生成。MCP 可以降低造型草稿/材質變體工時，尚未證明能自行產出一致拆件和 rig/export。

三路線來源素材檢查仍 PASS，僅證明資料格式一致。DragonBonesJS 和 Spine Web Player 的外部播放結果不等於 Cocos 3.8.8 播放；趙雲視覺樞紐點及第二角色共用動作/換裝、手機效能也未完成驗收。暫不定案，下一步先補出可重現的 Cocos 端最小播放樣機，再做視覺與第二角色檢驗。
