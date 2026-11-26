# CC0 外部音效授權清單（PROG-2-9732）

三檔皆為 CC0（公眾領域貢獻），可商用、不強制署名。下載日期 2026-11-22，下載時未註冊、未登入。
變調代用版（hit_block／hit_heavy／footstep_hoof 等）仍保留，由 `data/battle-audio-layers.json` 的 `clipSource` 切換。

| 檔名 | 用途 | 來源（素材頁） | 作者 | 授權 | 下載日期 | 規格與加工 |
|------|------|----------------|------|------|----------|------------|
| cc0_hit_metal.ogg | 金屬擊打（刀劍打到盾或甲，取代 hit_block） | https://kenney.nl/assets/impact-sounds （Impact Sounds 1.0，原檔 impactMetal_medium_000.ogg） | Kenney（www.kenney.nl） | CC0 1.0（https://creativecommons.org/publicdomain/zero/1.0/） | 2026-11-22 | 立體聲轉單聲道（左右平均）後重新編碼；OGG 單聲道 44100Hz、0.272 秒、5395 bytes |
| cc0_hit_flesh.ogg | 肉體悶擊（取代 hit_heavy） | https://kenney.nl/assets/impact-sounds （Impact Sounds 1.0，原檔 impactPunch_medium_000.ogg） | Kenney（www.kenney.nl） | CC0 1.0 | 2026-11-22 | 立體聲轉單聲道（左右平均）後重新編碼；OGG 單聲道 44100Hz、0.431 秒、6731 bytes |
| cc0_hoof_single.ogg | 單拍馬蹄（取代 footstep_hoof） | https://bigsoundbank.com/detail-0496-horse-steps-on-concrete.html （Horse steps on concrete，原檔 0496.wav） | Joseph Sardin（BigSoundBank） | CC0（https://bigsoundbank.com/licenses.html） | 2026-11-22 | 取 1.957～2.377 秒一拍蹄聲，重取樣 22050Hz、單聲道 16-bit、頭 4ms 淡入、尾 40ms 淡出、正規化；已重新編碼為 OGG 單聲道 22050Hz、0.420 秒、5692 bytes（2026-11-22 追加轉檔，使用者同意下載 soundfile 工具） |

Kenney 原始 License.txt：Creative Commons Zero, CC0；個人、教育、商業專案皆可免費使用，署名非強制。

## 2026-11-26 追加（PROG-2-10077）

| 檔名 | 用途 | 來源（素材頁） | 作者 | 授權 | 下載日期 | 規格與加工 |
|------|------|----------------|------|------|----------|------------|
| cc0_block_metal_bright.ogg | 格擋音（hit_block，更亮的金屬碰撞；取代 cc0_hit_metal，後者保留未刪） | https://kenney.nl/assets/impact-sounds （Impact Sounds 1.0，原檔 impactMetal_light_001.ogg） | Kenney（www.kenney.nl） | CC0 1.0（https://creativecommons.org/publicdomain/zero/1.0/） | 2026-11-26 | 原檔直接使用、未加工（OGG 立體聲、6967 bytes）；light 級響度低於原 medium 級，音量沿用 block.volume [0.8,1.0] |
