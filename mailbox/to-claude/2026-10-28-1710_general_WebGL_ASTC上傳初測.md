# R335：原始 WebGL2 ASTC 上傳可行性初測

在 Cocos 3.8.8 隔離預覽頁另建 WebGL2 context（headless Chrome/SwiftShader），查到 WEBGL_compressed_texture_astc；對既有 r334 2048×2048 ASTC 檔檢查 header 後，以 compressedTexImage2D 上傳：4×4 payload 4,194,304 bytes、6×6 payload 1,871,424 bytes，兩者 gl.getError=0、pageerror=0。證據：`C:/Users/User/.codex/worktrees/zhaoyun-cutout-polish/3KLife/scratch/r327-playback-20261028/preview-axis-v2-recording/r335-webgl-astc-upload.json`。

此為獨立 raw WebGL context 的載入測試，沒有透過 Cocos Texture2D 或 Spine atlas 使用、沒有畫面品質比較，也不是 Android/iOS 或硬體 GPU。不得稱 Cocos 壓縮匯入、手機記憶體或畫質已通過。
