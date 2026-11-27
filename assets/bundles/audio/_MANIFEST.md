# Audio Bundle — 音效清單

> **規範版本**：2026-03-18
> 音效管理使用 `AudioSystem`（`services().audio`），見 `core/systems/AudioSystem.ts`。
> **每次新增或刪除音效時，必須同步更新本清單。**

---

## SFX — 單次音效（`AudioSystem.playSfx(key)`）

| 檔名 | AudioSystem key | 預估用途 | 使用狀態 | 呼叫位置 |
|------|----------------|---------|---------|---------|
| bat.mp3 | `"bat"` | 蝙蝠拍打 | 🚧 WIP | — |
| bite.mp3 | `"bite"` | 普通咬擊 | 🚧 WIP | — |
| biteskill.mp3 | `"biteskill"` | 咬擊技能 | 🚧 WIP | — |
| boom.mp3 | `"boom"` | 爆炸衝擊 | 🚧 WIP | — |
| buff.mp3 | `"buff"` | Buff 增益 | 🚧 WIP | — |
| die.mp3 | `"die"` | 單位死亡 | 🚧 WIP | — |
| feijian.mp3 | `"feijian"` | 飛劍 | 🚧 WIP | — |
| fireball.mp3 | `"fireball"` | 火球 | 🚧 WIP | — |
| footstep.mp3 | `"footstep"` | 腳步聲 | 🚧 WIP | — |
| hoof_gallop.wav | `"hoof_gallop"` | 騎兵攻擊馬蹄聲（22.05kHz 單聲道、約 0.58 秒；署名見文末「第三方音效授權」） | ✅ 使用中 | `BattleAudio.ts` `unitAttackPrimary`（PROG-2-9580） |
| hit_light.wav / hit_heavy.wav / hit_block.wav / hit_lethal.wav | `"hit_light"` 等 | 受擊分層變調版本（PROG-2-9729）：由 hurt／shield／bite 重取樣（22.05kHz 單聲道），規則見 `data/battle-audio-layers.json` | ✅ 使用中 | `BattleAudioLayers.ts`；產生腳本 `tools_node/gen-audio-variants.js` |
| footstep_light.wav / footstep_heavy.wav / footstep_hoof.wav | `"footstep_light"` 等 | 分兵種腳步變調版本（PROG-2-9729）：由 footstep／hoof_gallop 重取樣；馬蹄沿用 hoof_gallop 的 CC-BY 署名（見文末） | ✅ 使用中 | `BattleAudio.ts` `playBattleFootstep` |
| cc0_block_metal_bright.ogg | `"cc0_block_metal_bright"` | 格擋音（PROG-2-10077，Kenney impactMetal_light_001，CC0），`cc0Clips.hit_block` 指向它；cc0_hit_metal 保留 | ✅ 使用中 | `BattleAudioLayers.ts` |
| cc0_hit_metal.ogg / cc0_hit_flesh.ogg / cc0_hoof_single.wav | `"cc0_hit_metal"` 等 | CC0 外部素材（PROG-2-9732）：金屬擊打取代 hit_block、肉體悶擊取代 hit_heavy、單拍馬蹄取代 footstep_hoof；`battle-audio-layers.json` 的 `clipSource` 設 `cc0`（預設）使用，設 `pitched` 回到變調代用版。授權見 `clips/LICENSES-cc0.md` | ✅ 使用中 | `BattleAudioLayers.ts` `resolveClipName` |
| ult_c_charge.ogg / ult_c_burst.ogg / ult_c_tail.ogg | `"ult_c_charge"` 等 | 奧義 C 組（PROG-2-10081，使用者 11/26 試聽選定）：蓄力 Woosh、爆發 war horn、收尾 War Horn Dark Cinematic，皆 Freesound CC0，已裁短轉單聲道 ogg；授權見 `clips/LICENSES-cc0.md` | ✅ 使用中 | `cutinSupport.ts` `CUTIN_SFX_FALLBACK`（whoosh／roar）、`CUTIN_ULT_TAIL_CLIP`；`UltCutinDirector` 分鏡音效 |
| sfx_atk_blade／sfx_atk_thrust／sfx_atk_bow／sfx_atk_arrow_whoosh／sfx_atk_shield／sfx_atk_charge .ogg | `"sfx_atk_*"` | 小兵出手音，依兵種（劈砍／槍刺／箭／盾擊／騎兵衝鋒）分檔（PROG-2-10134）；Freesound CC0，授權見 `clips/LICENSES-cc0.md` | ✅ 使用中 | `BattleAudio.ts` `playBattleAudio`（`pickUnitAttackSfx`），設定 `data/battle-audio-layers.json` 的 `attack` |
| sfx_hit_blade／sfx_hit_pierce／sfx_hit_arrow／sfx_hit_clash／sfx_hit_wood／sfx_hit_body_a／sfx_hit_body_b .ogg | `"sfx_hit_*"` | 小兵受擊音，輕擊依攻擊方式分檔、重擊與擋下擴充（PROG-2-10134）；Freesound CC0 | ✅ 使用中 | `BattleUIBridge.ts` `_scheduleBattleUnitHitFeedback`（`pickHitSfx` 的 `byStyle`） |
| heal.mp3 | `"heal"` | 治療 | 🚧 WIP | — |
| hurt.mp3 | `"hurt"` | 受擊 | 🚧 WIP | — |
| laser.mp3 | `"laser"` | 雷射 | 🚧 WIP | — |
| light.mp3 | `"light"` | 光效出現 | 🚧 WIP | — |
| shield.mp3 | `"shield"` | 盾牌格擋 | 🚧 WIP | — |
| skill0.mp3 | `"skill0"` | 武將技能 0 | 🚧 WIP | — |
| skill1.mp3 | `"skill1"` | 武將技能 1 | 🚧 WIP | — |
| skill2.mp3 | `"skill2"` | 武將技能 2 | 🚧 WIP | — |
| skill3.mp3 | `"skill3"` | 武將技能 3 | 🚧 WIP | — |
| skill7.mp3 | `"skill7"` | 武將技能 7 | 🚧 WIP | — |
| start.mp3 | `"start"` | 戰鬥開場 | 🚧 WIP | — |
| teleport.mp3 | `"teleport"` | 瞬移 | 🚧 WIP | — |
| thunder.mp3 | `"thunder"` | 雷電 | 🚧 WIP | — |
| wave.mp3 | `"wave"` | 波紋衝擊 | 🚧 WIP | — |
| weapon.mp3 | `"weapon"` | 武器揮斬 | 🚧 WIP | — |

---

## BGM — 背景音樂（`AudioSystem.playBgm(clip)`）

| 檔名 | 使用場景 | 使用狀態 |
|------|---------|---------|
| bgm_battle_start.ogg | 戰場開戰段（號角＋戰鼓前奏，淡入，不循環）；PROG-2-10134，多個 Freesound CC0 素材混成，授權見 `clips/LICENSES-cc0.md` | ✅ 使用中（`BattleBgm.ts`，由 `BattleScene` 開戰呼叫） |
| bgm_battle_tense.ogg | 戰場緊張段（戰鼓循環，開戰段尾端交叉淡入） | ✅ 使用中 |
| bgm_battle_victory.ogg／bgm_battle_defeat.ogg | 戰場結束勝利號角／敗北短曲（交叉淡入，不循環）；平手淡出、離開戰場停止 | ✅ 使用中 |

---

## 清理規則

- MP3 是獨立檔案，**直接刪除無需考慮 Cocos meta 依賴**
- 刪除前確認 `AudioSystem.registerClip(key, clip)` 的呼叫已一併移除
- **禁止**：只刪 `.mp3` 但不更新本清單（讓清單失去參考意義）
- 不確定是否會用到的音效：保留 .mp3、狀態維持 🚧 WIP，下次 Review 時再決定

---

## 使用方式（程式碼範例）

```typescript
// 1. 載入 clip（通常在 BattleScene.start() 中）
const clip = await services().resource.loadAudioClip("audio/clips/hurt");
services().audio.registerClip("hurt", clip);

// 2. 播放
services().audio.playSfx("hurt");           // 50ms 防重複播放
services().audio.playSfxWithCooldown("footstep", 1.0, 300); // 300ms 冷卻
```

---

## 第三方音效授權（署名）

| 檔名 | 來源 | 作者 | 授權 | 備註 |
|------|------|------|------|------|
| hoof_gallop.wav | https://opengameart.org/node/132682 （Horse Gallop Loop，原檔 gallop_01.ogg，freesound.org/s/403026） | Alan McKinney (alanmcki)；OpenGameArt 上傳者 AntumDeluge | CC-BY 3.0（https://creativecommons.org/licenses/by/3.0/）需署名 | 已改編：取其中一段蹄聲循環、轉單聲道、重取樣 22050Hz、尾端 30ms 淡出 |
