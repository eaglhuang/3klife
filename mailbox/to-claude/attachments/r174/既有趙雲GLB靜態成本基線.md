# 既有趙雲 GLB 靜態成本基線（唯讀盤點）

檔案：`artifacts/scratch/blender-spear-only-v1/zhaoyun-spear-only.glb`

- GLB 2.0，10,672,656 bytes（10.18 MiB）
- 4 meshes、44 nodes、21,555 vertices、7,432 triangles、1 animation
- 3 張內嵌貼圖：2048² JPEG 264,249 B；4096² JPEG 4,310,661 B；2048² PNG 4,881,049 B
- 三張貼圖若按 RGBA8 完整解碼，約 96 MiB（尚未計 mipmaps、GPU staging 與引擎開銷）

這是既有檔案的靜態結構和解碼量估算；未開啟 Blender、未重做動畫、未進 Cocos 手機原生執行，也未套 ASTC/ETC 壓縮。不可將此值當成已驗收的手機常駐記憶體；它只指出 3D 路線每位武將的大型貼圖需要先控尺寸並實測平台壓縮。
