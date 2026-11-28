# 戰場三招新Profile郭嘉遺計大喬國色曹仁穩固欄位草案規格書

<!-- doc_id: doc_spec_1360 -->

> **已裁決（2026-11-28，使用者／總 PM）；待決問題全部定案，見 §7。** 來源卡：PROG-2-10248（承 PROG-2-10240「武將技能資料補齊方案」）。
> 責任邊界：只擬 3 個新 `BattleSkillProfile` 的欄位草案與掛特效／音效的方式；不寫入 `BattleSkillProfiles.ts`、不改 `skills.json`、不動武將資料。**數值一律寫「建議範圍」，由企劃定案。** 不改五路對撞等戰場核心規則。

## 1. 目標

「前 30 位建議表」中有 3 個招式現有 78 個 profile 沒有對應者，需要企劃另開 profile；其餘皆用既有 profile。本檔把這 3 招的類型、範圍、效果、特效群組、音效群組擬成可直接進資料的草案，並列出待決問題。

### 1.1 三招出處與依據（已查證）
`general-skill-vfx-1128/skill-data-plan.md` §5 結尾「僅 3 招需新 profile（郭嘉遺計、大喬國色、曹仁穩固，皆減益／祝福／控制，特效群組已備好）」，對應表列：
- #7 郭嘉：建議戰法 2「遺計：虛弱（新，掛 weaken）」
- #26 大喬：建議戰法 1「國色：祝福（新，掛 bless）」
- #30 曹仁：建議戰法 2「改 stun 新」（招式名「穩固」見該方案統計句）

查 `BattleSkillProfiles.ts`（78 個 profile）：不存在 `guo-jia-legacy`／`da-qiao-beauty`／`cao-ren-steadfast` 類 id；現有近似者為 `sima-yi-shadow`（傷害型、掛 weaken 特效但不上虛弱狀態）、`insp-shield`（Fortified）、`insp-taunt`（單體暈眩）、`zhao-yun-immortal`（掛 bless 的奧義），皆不符合上述三招的設定，故判定即此三招。曹仁「穩固」的效果文字方案只寫「stun 新」，招式名與具體效果為本檔推定，列於問 3 請 PM 確認。

## 2. 規則與欄位草案

欄位名稱沿用 `BattleSkillProfile` 現有欄位，不新增程式欄位（降低風險）。`battleSkillId` 命名沿用既有「人名拼音-意象」格式。

### 2.1 郭嘉．遺計 `guo-jia-legacy`（減益）
| 欄位 | 草案 | 說明 |
|---|---|---|
| 類型 | 戰法（非奧義） | 武將 `guo-jia` 戰法槽 2（取代現有「箭雨」天生戰法的位置，由補齊方案決定） |
| targetMode／autoAimMode | `enemy-all`／`all-enemies`（建議）或 `enemy-single`／`frontmost-enemy` | 見問 1 |
| 範圍 | 全體時 `maxTargets` 建議範圍 3～5，依距離 `linear-step` 衰減 | 單體則 1 |
| effectKind／statusEffect | `control`／`StatusEffect.Weak` | 對目標上虛弱：攻擊力 ×`WEAK_ATTACK_MULTIPLIER`（現值 0.7，不改） |
| statusTurns | 建議範圍 2～3 回合 | 同名減益刷新不疊層（`doc_spec_0359` §1，上限 3 層） |
| coefficient／scalingStat | `0`（純減益）或小傷害，`int` | 見問 2 |
| 特效群組 | `weaken`（虛弱／恐懼）；`TACTIC_VFX_SKILL_GROUP` 加一行 `'guo-jia-legacy': 'weaken'` | 另有 `STATUS_DEBUFF_VFX_GROUP.weak → weaken` 上身段特效，兩段不重疊（施放段 vs. 上身段，上身段延遲 ≤ 0.35 秒） |
| 音效群組 | `weaken` → `hurt`（既有 clip，不新增） | |
| battleLogKey | `skill.guo_jia_legacy.hit` | 四語系 i18n |

### 2.2 大喬．國色 `da-qiao-beauty`（祝福）
| 欄位 | 草案 | 說明 |
|---|---|---|
| 類型 | 戰法 | 武將 `da-qiao` 戰法槽 1 |
| targetMode／autoAimMode | `ally-all`／`all-allies`（建議）或 `ally-single` | 見問 2 |
| effectKind | `morale`（建議） | 沿用既有鼓舞結算，士氣加成寫 `moraleBonus` |
| moraleBonus | 建議範圍 +10～+20（鼓舞現值 +20 為上界參考） | |
| statusEffect／statusTurns | 建議附 `Fortified` 1 回合（堅盾，防禦 ×1.2）；或不附 | 見問 2；不新增 StatusEffect |
| 特效群組 | `bless`；`'da-qiao-beauty': 'bless'` | 表優先於第一批歸類規則（`effectKind: morale` 原會落到 `morale` 組，故必須寫表） |
| 音效群組 | `bless` → `light` | |
| battleLogKey | `skill.da_qiao_beauty.buff` | |

### 2.3 曹仁．穩固 `cao-ren-steadfast`（控制）
| 欄位 | 草案 | 說明 |
|---|---|---|
| 類型 | 戰法 | 武將 `cao-ren` 戰法槽 2 |
| targetMode／autoAimMode | `enemy-single`／`frontmost-enemy`（建議） | 守將以「釘住正面敵軍」為意象，與五路對撞同路正面一致 |
| effectKind／statusEffect | `control`／`StatusEffect.Rooted`（建議）或 `Stun` | 見問 3 |
| statusTurns | 建議範圍 1 回合 | 同現有 `rootTurns` 規格值 1；控制免疫與遞減沿用現有控制規則 |
| coefficient | `0` | |
| 特效群組 | `stun`（第一批「控制」組，繞頭星星）；`tacticVfxGroupOf` 對 Stun／Rooted 已自動歸 stun，不需寫表 | |
| 音效群組 | `stun`（`tactic` 池既有） | |
| battleLogKey | `skill.cao_ren_steadfast.hit` | |

## 3. 資料格式（示意，數值為建議範圍內任一值，非定案）

```json
{
  "battleSkillId": "guo-jia-legacy",
  "targetMode": "enemy-all",
  "manualTargeting": false,
  "autoAimMode": "all-enemies",
  "effectKind": "control",
  "coefficient": 0,
  "maxTargets": 4,
  "falloffRule": "linear-step",
  "statusEffect": "weak",
  "statusTurns": 2,
  "battleLogKey": "skill.guo_jia_legacy.hit"
}
```
另兩招依 §2.2、§2.3 欄位同形。武將端以 `general-skill-overrides.json` 的 `overrides`（補齊方案 §2.2）指派，不改 `generals-base.json` 結構。

## 4. 與現有系統介面
- `BattleSkillProfiles.ts`：`PROFILE_BY_SKILL_ID` 加 3 筆；`resolveBattleSkillProfile` 自動可查。
- `TacticVfxExtraGroups.ts`：`TACTIC_VFX_SKILL_GROUP` 加 2 行（遺計、國色）；曹仁不需。
- `battle-audio-layers.json`：不改（三組音效 clip 皆已存在）。
- i18n：三招名稱、戰報、說明走四語系鍵，不寫死。
- 狀態圖示：Weak／Rooted 已有 `弱`／`定` 圖示（`STATUS_ICON_DEFS`），Fortified 已有；不新增圖示。
- `StatusApplyFeedback` 極性：Weak 為 debuff、Rooted 為 control、Fortified 為 buff，已涵蓋。

## 5. 效能預算
三招皆用既有特效群組與既有狀態，沿用 `TACTIC_VFX_BUDGET`（同時 fx ≤ 14、粒子 ≤ 140、命中格 ≤ 5、總秒 ≤ 1.0）。遺計若為全體，命中格以 `capHitCells` 截斷至 5；PROG-2-10240 實測 weaken／bless 單組峰值 fx 3、粒子 ≤ 36、節點 1，本草稿不預期超出。

## 6. 驗收項
1. 單測：3 個 profile 皆可 `resolveBattleSkillProfile` 取得、`effectKind`／`statusEffect` 與本檔一致。
2. `GeneralSkillVfxCoverage` 類測試：可施放 profile 100% 有特效分組與音效 clip（含新 3 招）。
3. 單測：遺計上身後目標傷害 ×0.7、同名刷新不疊層；穩固目標下回合不可行動；國色士氣加成不超過上限。
4. 實跑 web-desktop：三招各施放一次，逐招定格截圖（前搖／命中／上身段），出現次數與預期一致；頭頂圖示正確。
5. tsc 0 錯、run-cli 全過、compute-gate quick。

## 7. 已裁決問題（2026-11-28，使用者／總 PM）

裁決依據：使用者／總 PM 11/28 指示——**曹仁「穩固」＝定身**；其餘待決題一律採本檔「建議」選項。實作卡：PROG-2-10253。

| 問 | 裁決 | 內容 |
|---|---|---|
| 1 遺計範圍 | A（建議） | 敵方全體，最多 4 目標、依距離 `linear-step` 衰減；上虛弱 2 回合 |
| 2 國色效果與範圍 | A（建議） | 友軍全體士氣 +15（建議範圍 10～20），不附狀態 |
| 3 曹仁穩固控制種類 | **A（使用者裁決）** | 敵方單體「定身（Rooted）」1 回合，貼合守將釘住正面的意象 |
| 4 招式名稱與武將歸屬 | A（建議） | 照方案：遺計（郭嘉）／國色（大喬）／穩固（曹仁） |
| 5 祝融性別資料誤植 | A（建議） | 另開資料查證卡，不併入本次 |

補充：§2.3 特效群組備註更正——`tacticVfxGroupOf` 原本只把 `Stun` 與 `root` 歸 stun 組，`control`＋`Rooted` 不會自動歸組；實作時把判斷擴成 Stun 或 Rooted。
