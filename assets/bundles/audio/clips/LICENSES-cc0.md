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

## 2026-11-26 追加（PROG-2-10081，奧義 C 組）

三檔皆為 Freesound CC0（Creative Commons 0），可商用、不強制署名；下載前已逐頁複核授權為 CC0 1.0，下載日期 2026-11-26。Freesound 上傳者可事後改授權，來源頁網址留作日後查核。原檔 SHA256 見筆記夾 audio-downloads-1126\manifest.md。加工一律：立體聲左右平均轉單聲道、裁短、尾端淡出、正規化後降到指定峰值、編碼為 OGG Vorbis 單聲道 44100Hz。

| 檔名 | 用途 | 來源（素材頁） | 作者 | 授權 | 下載日期 | 規格與加工 |
|------|------|----------------|------|------|----------|------------|
| ult_c_charge.ogg | 奧義蓄力（cutin 音效鍵 whoosh） | https://freesound.org/people/florianreichelt/sounds/683096/ （Woosh，原檔 683096__florianreichelt__woosh.mp3） | florianreichelt | CC0 1.0 | 2026-11-26 | 取 0～1.6 秒（原 1.73 秒），尾 80ms 淡出，峰值 0.5；16049 bytes |
| ult_c_burst.ogg | 奧義爆發號角（cutin 音效鍵 roar） | https://freesound.org/people/adharca/sounds/539956/ （war horn，原檔 539956__adharca__war-horn.wav） | adharca | CC0 1.0 | 2026-11-26 | 取 0～2.4 秒（原 4.36 秒），尾 500ms 淡出，峰值 0.85；25749 bytes |
| ult_c_tail.ogg | 奧義收尾深沉號角（cutin 音效鍵 ult_c_tail） | https://freesound.org/people/anderson91santos/sounds/714562/ （War Horn Dark Cinematic Sound Effect，原檔 .m4a） | anderson91santos | CC0 1.0 | 2026-11-26 | 取 0～3.2 秒（原 12.45 秒，AAC 以 Chrome Web Audio 解碼），尾 1 秒淡出，峰值 0.7；23849 bytes |

## 2026-11-27 追加（PROG-2-10134，戰場音訊：小兵出手／受擊分兵種、戰場 BGM）

全部為 Freesound CC0 1.0（Creative Commons 0），可商用、不強制署名；下載前已逐頁複核授權為 CC0（2026-11-26，見筆記夾 audio-downloads-1126\manifest.md，含原檔 SHA256）。Freesound 上傳者可事後改授權，來源頁網址留作日後查核。**沒有任何 CC-BY 素材，因此不需要署名頁。**
加工一律用 `tools_node/gen-battle-audio-clips.py` 重現：立體聲左右平均轉單聲道、重取樣 44100Hz、取需要的段落、頭 3ms 淡入、尾端淡出、正規化到指定峰值（Vorbis 過衝超過 0.95 自動縮小）、編碼 OGG Vorbis。BGM 為多個 CC0 素材混成，混成方式見下表。

| 檔名 | 用途 | 來源（素材頁） | 作者 | 授權 | 規格與加工 |
|------|------|----------------|------|------|------------|
| sfx_atk_blade.ogg | 步兵／工兵／醫護／水軍劈砍出手 | https://freesound.org/people/ethanchase7744/sounds/441666/ （sword slash.wav） | ethanchase7744 | CC0 1.0 | 取起音後 0.42 秒，峰值 0.8 |
| sfx_atk_thrust.ogg | 槍兵突刺出手 | https://freesound.org/people/Breviceps/sounds/464839/ （Anime Sound Effect - Piercing impact / Stabbing） | Breviceps | CC0 1.0 | 取起音後 0.4 秒，峰值 0.8 |
| sfx_atk_bow.ogg | 弓兵放箭出手 | https://freesound.org/people/saturdaysoundguy/sounds/394178/ （Longbow Release 1.wav） | saturdaysoundguy | CC0 1.0 | 取 0.05～0.53 秒，峰值 0.8 |
| sfx_atk_arrow_whoosh.ogg | 弓兵放箭出手（與 sfx_atk_bow 輪播） | https://freesound.org/people/Ali_6868/sounds/384908/ （Arrow Whoosh 1） | Ali_6868 | CC0 1.0 | 取 0～0.5 秒，尾 150ms 淡出，峰值 0.6 |
| sfx_atk_shield.ogg | 盾兵盾擊出手 | https://freesound.org/people/PixelsphereStudios/sounds/182112/ （Shield / sword hits.wav） | PixelsphereStudios | CC0 1.0 | 取第一下起音後 0.4 秒，峰值 0.8 |
| sfx_atk_charge.ogg | 騎兵衝鋒出手（低頻鼓＋單拍馬蹄） | https://freesound.org/people/Terry93D/sounds/328009/ （Epic Drum.wav）＋本資料夾 cc0_hoof_single.ogg | Terry93D／Joseph Sardin | CC0 1.0 | 鼓取 0～0.55 秒與馬蹄單拍相加，峰值 0.85 |
| sfx_hit_blade.ogg | 被刀劈打中 | https://freesound.org/people/qubodup/sounds/442769/ （Sword Hit） | qubodup | CC0 1.0 | 取 0～0.4 秒，峰值 0.8 |
| sfx_hit_pierce.ogg | 被槍刺打中 | https://freesound.org/people/Twisted_Euphoria/sounds/205938/ （Arrow Impact） | Twisted_Euphoria | CC0 1.0 | 取 0.04～0.39 秒，峰值 0.8 |
| sfx_hit_arrow.ogg | 被箭射中 | https://freesound.org/people/Ali_6868/sounds/384914/ （Arrow Impact 1） | Ali_6868 | CC0 1.0 | 取 0.06～0.36 秒，峰值 0.8 |
| sfx_hit_clash.ogg | 擋下／盾兵受擊的金屬碰撞 | https://freesound.org/people/loudernoises/sounds/334169/ （Sword Clash） | loudernoises | CC0 1.0 | 取 0.02～0.47 秒，峰值 0.8 |
| sfx_hit_wood.ogg | 盾兵受擊木盾悶響 | https://freesound.org/people/Breviceps/sounds/449955/ （Wooden Thud (Mono)） | Breviceps | CC0 1.0 | 原檔 16kHz 重取樣至 44.1kHz，取 0～0.4 秒，峰值 0.8 |
| sfx_hit_body_a.ogg／sfx_hit_body_b.ogg | 重擊／騎兵衝撞受擊（肉體悶擊兩種） | https://freesound.org/people/Kinoton/sounds/503277/ （Face Punch, Body Impact, 4x） | Kinoton | CC0 1.0 | 以起音偵測取前兩下各 0.45 秒，峰值 0.85 |
| bgm_battle_start.ogg | 戰場 BGM 開戰段（號角＋戰鼓前奏，9 秒，不循環） | https://freesound.org/people/kirmm/sounds/392180/ （Battle_horn_1.wav）＋ https://freesound.org/people/Sclolex/sounds/209546/ （warriordrums.wav） | kirmm／Sclolex | CC0 1.0 | 號角 0.06～4.66 秒（延後 0.5 秒進場）與戰鼓前 9 秒相加，尾 1 秒淡出，峰值 0.8 |
| bgm_battle_tense.ogg | 戰場 BGM 緊張段（戰鼓循環，7.3 秒，循環播放） | https://freesound.org/people/PearceWilsonKing/sounds/274223/ （War Drum Loop） | PearceWilsonKing | CC0 1.0 | 全長，尾端與開頭 80ms 等功率交疊使循環接縫無爆音，峰值 0.65 |
| bgm_battle_victory.ogg | 戰場 BGM 勝利段（小號凱旋，4.4 秒，不循環） | https://freesound.org/people/FunWithSound/sounds/456966/ （Success Fanfare Trumpets.mp3） | FunWithSound | CC0 1.0 | 取 0～4.4 秒，尾 0.8 秒淡出，峰值 0.8 |
| bgm_battle_defeat.ogg | 戰場 BGM 敗北段（喪氣長號，3.6 秒，不循環） | https://freesound.org/people/kirbydx/sounds/175409/ （wah wah sad trombone.wav） | kirbydx | CC0 1.0 | 取 0.2～3.8 秒，尾 0.6 秒淡出，峰值 0.7 |

## 2026-11-27 追加（PROG-2-10190，戰法分組音效）

七檔皆來自 BigSoundBank（Joseph Sardin 錄製與整理），頁面標示授權為 CC0（公眾領域，可商用、不強制署名；https://bigsoundbank.com/licenses.html ），下載前已逐頁複核，下載日期 2026-11-27，原檔為站上 OGG 預覽版（未註冊、未登入）。加工一律：立體聲左右平均轉單聲道、重取樣 44100Hz、裁切、淡入淡出、（火／風／水）高通去低頻轟隆、火與加速做動態壓縮、正規化到目標響度（RMS 0.09～0.14，峰值不超過 0.9，與現有 sfx 的 RMS 0.06～0.22 相近）、編碼 OGG Vorbis 單聲道 44100Hz。

| 檔名 | 用途 | 來源（素材頁） | 授權 | 規格與加工 |
|------|------|----------------|------|------------|
| tactic_fire.ogg | 火系戰法（火燒、火計）：點燃爆燃＋燃燒劈啪 | https://bigsoundbank.com/gasoline-fire-2-s1341.html （Gasoline fire #2） | CC0 | 取 0～2.0 秒，高通 80Hz、動態壓縮（冪次 0.55）讓尾段劈啪聽得到，尾 0.45 秒淡出；RMS 0.14 |
| tactic_water.ogg | 水系戰法（水淹、江潮）：急流奔騰 | https://bigsoundbank.com/small-waterfall-2-s0219.html （Small waterfall #2） | CC0 | 取最響的 2.2 秒（原檔第 24.3 秒起），高通 150Hz，頭 0.12 秒淡入、尾 0.5 秒淡出；RMS 0.14 |
| tactic_wind.ogg | 風系戰法（諸葛風暴）：強風呼嘯 | https://bigsoundbank.com/strong-wind-2-s0152.html （Strong wind #2） | CC0 | 取最響的 2.0 秒（原檔第 22.1 秒起），高通 120Hz，頭 0.45 秒漸強、尾 0.6 秒淡出；RMS 0.12 |
| tactic_heal.ogg | 回復戰法：柔和風鈴上行 | https://bigsoundbank.com/chimes-dream-5-s2083.html （Chimes dream #5） | CC0 | 取 0～1.6 秒，尾 0.35 秒淡出；RMS 0.09（柔和，刻意比其他組小） |
| tactic_haste.ogg | 加速戰法：咻 | https://bigsoundbank.com/whoosh-4-s1796.html （Whoosh #4） | CC0 | 取 0.1～0.9 秒，動態壓縮（冪次 0.7），尾 0.2 秒淡出；RMS 0.12 |
| tactic_morale.ogg | 鼓舞戰法：三擊戰鼓（漸重） | https://bigsoundbank.com/bass-tom-1-s2338.html 、https://bigsoundbank.com/medium-tom-1-s2333.html 、https://bigsoundbank.com/bass-tom-2-s2339.html （Bass tom #1、Medium tom #1、Bass tom #2） | CC0 | 三個鼓聲依 0／0.32／0.64 秒疊接（第三擊加重 1.3 倍），總長 2.0 秒、尾 0.4 秒淡出；RMS 0.14 |
| tactic_stun.ogg | 控制戰法：悶響＋鐵鍊＋落鎖 | https://bigsoundbank.com/bass-tom-1-s2338.html 、https://bigsoundbank.com/small-chain-3-s0357.html 、https://bigsoundbank.com/barn-lock-locking-s1540.html （Bass tom #1 低通 400Hz、Small chain #3、Barn lock locking） | CC0 | 悶響 0 秒、鐵鍊 0.12 秒、落鎖 0.62 秒疊接，總長 1.6 秒、尾 0.35 秒淡出；RMS 0.12 |
