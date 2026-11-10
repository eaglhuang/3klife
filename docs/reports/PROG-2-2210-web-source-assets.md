# PROG-2-2210 網頁來源資產量測

本報告僅來源資產位元組，非 Creator 產物、網路下載量或實測載入耗時。建置仍須 Windows。

## 本次裁減

- 測試影片 18,259,673 bytes（17.41 MiB）移出 assets 並解除 BattleScene 靜態引用；檔案與 meta 保留在測試目錄。

## assets/resources

來源總量：379,454,108 bytes（361.88 MiB），1589 檔。

| 分組 | MiB |
|---|---:|
| sprites | 303.94 |
| units | 23.57 |
| icons | 8.25 |
| textures | 6.51 |
| ui-spec | 6.34 |
| data | 4.66 |
| ui | 4.47 |
| fonts | 3.85 |
| i18n | 0.15 |
| fx | 0.05 |
| dmgFont | 0.04 |
| effects | 0.03 |

| 最大資產 | MiB |
|---|---:|
| assets/resources/units/troops/heroes/pink-brown-general/hero.glb | 8.31 |
| assets/resources/units/troops/heroes/guanyu/hero.glb | 7.79 |
| assets/resources/units/troops/heroes/blonde-general/hero.glb | 3.84 |
| assets/resources/sprites/generals/meng_huo_portrait.png | 2.64 |
| assets/resources/sprites/generals/dong_zhuo_portrait.png | 2.56 |
| assets/resources/sprites/generals/pang_de_portrait.png | 2.36 |
| assets/resources/sprites/generals/sun_jian_portrait.png | 2.36 |
| assets/resources/sprites/generals/huang_gai_portrait.png | 2.32 |
| assets/resources/sprites/generals/taishi_ci_portrait.png | 2.31 |
| assets/resources/sprites/generals/yan_liang_portrait.png | 2.29 |

## assets/bundles

來源總量：8,800,087 bytes（8.39 MiB），294 檔。

| 分組 | MiB |
|---|---:|
| assets/bundles/vfx_core | 8.02 |
| assets/bundles/audio | 0.37 |
| assets/bundles/vfx_skills | 0.00 |

| 最大資產 | MiB |
|---|---:|
| assets/bundles/vfx_core/textures/rings/tex_ring_addatk.png | 0.55 |
| assets/bundles/vfx_core/textures/rings/mep_ring_magic_circle2.png | 0.50 |
| assets/bundles/vfx_core/prefabs/bossAnger/angerLight03.png | 0.32 |
| assets/bundles/vfx_core/textures/rings/tex_ring_addlife.png | 0.29 |
| assets/bundles/vfx_core/textures/rings/mep_ring_magic_circle.png | 0.27 |
| assets/bundles/vfx_core/textures/glow/mep_glow_flash_free3.png | 0.19 |
| assets/bundles/vfx_core/textures/cfxr/cfxr_bubble_2.png | 0.18 |
| assets/bundles/vfx_core/textures/rings/mep_ring_tech_circle2.png | 0.16 |
| assets/bundles/vfx_core/textures/shapes/mep_shape_mask.png | 0.14 |
| assets/bundles/vfx_core/textures/smoke/mep_smoke_puff.png | 0.14 |

## 兩段黑屏的來源候選（非耗時歸因）

- 標題：LoginScene 靜態審計 0 個資產參照，但新標題是執行期載入，不在這個數字內。UIScreenPreviewHost.showScreen 依序取 layout/skin、i18n、tokens，再建構、片段、互動 sidecar 與內容；title-screen skin 用孫權與劉備完整立繪，另需字型。應先量測這段多次往返及字型／立繪下載，而不是把整個 resources 當作標題預載。
- Login→Lobby：LoadingScene 的 preloadScene 與進大廳後 LobbyScene.start 是兩段；LobbyScene.start 逐一 await 數十個面板 mount（包含季報、招募、名鏡、人物頁等），同一 UIScreenPreviewHost 管線會帶入多張 spec、皮膚與內容。這是明確的序列初始化熱點，但沒有瀏覽器 trace，無法分配 25–40 秒各佔幾秒。
- 體積最大候選：resources 的完整武將立繪與 troop hero.glb，以及字型；bundles 僅占較小部分。被移出的影片原先會入包且是 BattleScene 靜態依賴，但不是 LoginScene 直接依賴，不得說它單獨造成兩段黑屏。

## 建議下一輪（按風險與收益排序）

1. 大廳僅掛主畫面與新手必要面板，其他功能第一次開啟再掛載；先加入每個 mount 的耗時 trace，再選範圍，不直接並行全部掛載以免破壞順序。
2. 標題改用既有縮圖／預覽尺寸立繪，字型限定必要字重與語系；先量測再裁減，不直接壓縮或替換正式美術。
3. 大型 3D GLB 與完整武將立繪依使用場景拆 bundle／延遲載入；resources 入包不等於啟動全下載，需 Creator 產物依賴與 HAR 驗證。
4. 現有 #2070 已加入真實 preload 進度；本 PR 不重複修改 LoadingScene，維持可獨立合併。

## 重現與啟動審計

`node tools_node/audit-web-source-assets.js`；排除 .meta，保留非執行資產（如 README）在來源統計，故不是精確入包清單。
`node tools_node/check-start-scene-refs.js --json`：ok=true，LoginScene.scene refCount=0。此工具只看已設定啟動場景的直接 UUID，不涵蓋 script 執行期引用、間接依賴或錯誤的建置場景設定。

未使用 Linux 估造建置成功；Windows 應確認影片不出現在 web-desktop，並保留 Creator Preview 測試播放。
