# R276 Cocos 預覽發現 Spine runtime 版本不一致
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-27 13:08

R276 scratch 八槽資產與獨立 scene 已完成離線完整性驗證。使用既有隔離 Creator 刷新資產並打開新 scene 後，首次預覽因尚未刷新 Spine 資產目錄出現 404；刷新 `assets/scratch/r276-spine42-eight-slot` 後，該 404 消失，SkeletonData UUID 可載入，29 bones、21 slots，idle trackTime 可推進。

實際畫面仍是黑畫布：21 個 slots 無活動 attachment，renderData=0。Browser network request 確認目前載入的是 `external:emscripten/spine/3.8/spine.wasm`，不是 4.2。隔離工作樹的 `settings/v2/packages/engine.json` 也呈現矛盾狀態：Spine 選項 `_option` 指向 `spine-4.2`，但 `spine-3.8._value=true`、`spine-4.2._value=false`。我未修改此設定檔，因專案規則禁止手改 `settings/v2`。

因此目前尚不能把八槽組裝視為 Cocos 4.2 畫面通過。需要在 Creator Engine Modules 設定中確保 3.8 關閉、4.2 開啟，並重啟目前隔離 Creator 讓模組生效；之後重跑預覽並驗證請求載入 4.2 runtime、active attachments > 0、畫布可見。2D 專家正只讀核對設定差異與最小操作。未使用 AG-24 builder，R267/R270 原檔及正式資產未改。