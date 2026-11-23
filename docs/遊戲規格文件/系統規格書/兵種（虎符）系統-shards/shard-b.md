<!-- doc_id: doc_spec_1296 -->
# 兵種（虎符）系統（分片索引） — F 公式相關

> 這是 `兵種（虎符）系統.md` 的「F 公式相關」分片。完整索引見 `docs/遊戲規格文件/系統規格書/兵種（虎符）系統.md`。

## F. 公式相關

### 基礎兵種定義

| 兵種 | 代碼 | 攻擊力 | 防禦力 | 移動力 | 射程 | 特性 |
|---|---|---|---|---|---|---|
| 騎兵 | CAVALRY | 高 | 中 | 2 | 1（近戰） | 衝鋒加成、平原加速 |
| 步兵 | INFANTRY | 中 | 高 | 1 | 1（近戰） | 山地防禦、持久戰 |
| 弓兵 | ARCHER | 中 | 低 | 1 | 2（遠程） | 林地隱蔽、集中射擊 |
| 盾兵 | SHIELD | 低 | 高 | 1 | 1（近戰） | 防禦堅固、吸收傷害 |
| 長槍兵 | PIKE | 中 | 中 | 1 | 1（近戰） | 槍陣反騎、防線固守 |
| 水軍 | NAVY | 中 | 中 | 2（水域）/1（陸地） | 1（近戰） | 水域專精、船艦支援、陸地弱化 |
| 機械 | SIEGE | 極高 | 極低 | 1 | 6（超遠程） | 攻城特化、移動最慢 |

### 兵種剋制關係

```

// 五角剋制 + 機械/智將獨立
// 正向剋制（攻方 → 守方）×1.3
if (attacker.type == CAVALRY && defender.type == SHIELD):   damage × 1.3  // 騎剋盾
if (attacker.type == SHIELD  && defender.type == ARCHER):   damage × 1.3  // 盾剋弓
if (attacker.type == ARCHER  && defender.type == INFANTRY):  damage × 1.3  // 弓剋步
if (attacker.type == INFANTRY && defender.type == PIKE):     damage × 1.3  // 步剋槍
if (attacker.type == PIKE    && defender.type == CAVALRY):   damage × 1.3  // 槍剋騎

// 機械被近戰剋制
if (attacker.type in [CAVALRY, INFANTRY, PIKE, SHIELD] && defender.type == SIEGE): damage × 1.5

// 反向被剋制（被剋方攻擊剋制方）×0.8
if (attacker.type == SHIELD   && defender.type == CAVALRY):  damage × 0.8  // 盾被騎剋
if (attacker.type == ARCHER   && defender.type == SHIELD):   damage × 0.8  // 弓被盾剋
if (attacker.type == INFANTRY && defender.type == ARCHER):   damage × 0.8  // 步被弓剋
if (attacker.type == PIKE     && defender.type == INFANTRY):  damage × 0.8  // 槍被步剋
if (attacker.type == CAVALRY  && defender.type == PIKE):     damage × 0.8  // 騎被槍剋

```

### 特殊兵種列表

> **裝備規則**：虎符必須裝備在武將身上，該武將才能指揮對應的特殊兵種。同一枚虎符同時只能裝備一位武將。
> **來源說明**：下表的來源人物一律解讀為「該名將死亡結算時生成對應虎符卡」，不再使用舊版退役產物語意。
> **Q63=B 補充**：虎符部隊擁有**特殊戰法**（下表「特殊戰法（兵種專屬）」欄即為戰法名稱 + 效果公式）與地形/家族適性，不發出「招牌技能」。各虎符部隊的糧草消耗由「虎符糧草消耗表」按品質×星級查表計算。

#### 死亡傳承虎符（通用型）

| 基礎兵種 | 虎符名稱 | 兵種名稱 | 來源 | 品質 | 特殊戰法（兵種專屬）|
|---|---|---|---|---|---|
| 騎兵 | 虎符：白馬 | 白馬義從 | 公孫瓚死亡結算 | SSR | 騎射合一：騎兵移動 + 弓兵射程 |
| 步兵 | 虎符：陷陣 | 陷陣營 | 高順死亡結算 | SSR | 無視防禦：攻擊穿透 50% 防禦 |
| 騎兵 | 虎符：虎豹 | 曹魏虎豹騎 | 曹操 / 曹仁死亡結算 | SSR | 精銳突擊：衝鋒傷害 ×2 |
| 步兵 | 虎符：丹陽 | 丹陽精兵 | 孫策 / 太史慈死亡結算 | SR | 山地特化：山地移動 +2、攻擊 +20% |
| 騎兵 | 虎符：鐵騎 | 西涼鐵騎 | 馬超 / 馬騰死亡結算 | SSR | 恐懼衝鋒：衝鋒時周圍敵軍士氣 -20 |
| 弓兵 | 虎符：無當 | 無當飛軍 | 王平死亡結算 | SR | 毒箭：攻擊附帶持續中毒 |
| 騎兵 | 虎符：常山女 | 常山女騎 | 趙雲系女性名將死亡結算 | SR | 迴避 +30%、治療友軍能力 |
| 步兵 | 虎符：藤甲 | 藤甲兵 | 孟獲死亡結算 | R | 物理減傷 50%，但火攻 ×3 |
| 弓兵 | 虎符：先登 | 先登死士 | 袁紹 / 麴義死亡結算 | SR | 攻城傷害 ×2、免疫恐懼 |
| 步兵 | 虎符：解煩 | 解煩軍 | 孫權死亡結算 | SR | 突擊步兵：移動 +2、攻擊 +20% |
| 弓兵 | 虎符：大喬 | 大喬親衛 | 大喬死亡結算 | R | 全隊魅力 +20、士氣不降 |
| 水軍 | 虎符：吳國 | 吳國水師 | 周泰 / 韓當死亡結算 | SSR | 水域特化：水域移動 +2、攻擊 +20% |
| 弓兵 | 虎符：都督 | 都督禁衛 | 周瑜死亡結算 | SSR | 火計連環：弩箭附帶「標記」，命中後引燃周圍草叢對鄰近敵軍造成額外傷害 |
| 步兵 | 虎符：錦帆 | 錦帆游擊兵 | 甘寧死亡結算 | SSR | 恐懼光環：周圍 1 格敵軍攻擊力下降；水上移動力與傷害不減反增 |
| 盾兵 | 虎符：白耳 | 白耳兵 | 陳到死亡結算 | SR | 精銳護衛：剋制弓兵，替主將承傷，斷後時防禦 ×2 |
| 弓兵 | 虎符：元戎 | 元戎弩兵 | 諸葛亮死亡結算 | SSR | 連弩齊射：範圍傷害＋連擊，壓制步兵效率極高 |
| 騎兵 | 虎符：南蠻 | 南蠻象兵 | 木鹿大王 / 孟獲死亡結算 | SR | 巨型踐踏：無視輕型步兵阻擋，攻擊附帶濺射傷害 |

#### 名將專屬虎符（個人裝備型）

> 以下虎符為特定名將死亡結算時產出的專屬裝備。裝備在任何武將身上均可使用，但若裝備者與原名將有「血脈共鳴」或「史實羈絆」，則額外獲得 10% 能力加成。

| 基礎兵種 | 虎符名稱 | 兵種名稱 | 原名將 | 品質 | 特殊戰法（兵種專屬）|
|---|---|---|---|---|---|
| 騎兵 | 龍膽符 | 常山龍騎 | 趙雲死亡結算 | SSR | 七進七出：移動無視阻擋穿透障礙物，閃避後反擊 |
| 弓兵 | 都督符 | 都督精弩 | 周瑜死亡結算 | SSR | 火燒連營：普攻引燃目標及周圍 1 格 |
| 步兵 | 忠義符 | 忠義鐵衛 | 關羽死亡結算 | SSR | 威震華夏：首擊傷害 ×2，擊殺後回滿行動 |
| 騎兵 | 當陽符 | 雷霆暴隊 | 張飛死亡結算 | SSR | 長坂雄咆：周圍敵軍恐懼並後退 1 格 |
| 弓兵 | 烈弓符 | 神射帥營 | 黃忠死亡結算 | SSR | 百步穿楊：射程 +2，遠距目標爆擊 +50% |
| 騎兵 | 神威符 | 虎威神騎 | 馬超死亡結算 | SSR | 強擊突刺：衝鋒每格增加傷害，無視地形 |
| 長槍兵 | 麒麟符 | 天算禁軍 | 姜維死亡結算 | SSR | 幼麒天算：反擊傷害加倍，附帶虛弱效果 |
| 步兵 | 虎痴符 | 虎衛禁軍 | 許褚死亡結算 | SSR | 裸衣決鬥：防禦減半，攻擊力翻倍 |
| 步兵 | 惡來符 | 鐵戟死士 | 典韋死亡結算 | SSR | 捨命護主：替周圍友軍承傷，血低防高 |
| 騎兵 | 止啼符 | 逍遙精騎 | 張遼死亡結算 | SSR | 突襲止啼：對敵方後排兩列傷害 +50% |
| 騎兵 | 無雙符 | 并州狼騎 | 呂布死亡結算 | UR | 無雙亂舞：範圍攻擊周圍 8 格並擊退 |
| 弓兵 | 連環符 | 鳳雛軍 | 龐統死亡結算 | SSR | 連環計：多個敵方單位受到的傷害同步 |
| 弓兵 | 奉孝符 | 鬼謀營 | 郭嘉死亡結算 | SSR | 遺計定遼：陣亡時引發全場敵軍混亂 |
| 弓兵 | 狼顧符 | 冥影衛 | 司馬懿死亡結算 | SSR | 鷹視狼顧：每回合隨機使一名敵軍叛變 |
| 弓兵 | 梟姬符 | 巾幗軍 | 孫尚香死亡結算 | SR | 結姻連射：與男性相鄰時攻擊次數 +1 |
| 騎兵 | 火神符 | 烈火騎 | 祝融死亡結算 | SR | 火神狩獵：騎乘巨獸，附帶火傷與擊退 |
| 機械 | 工甲符 | 機關營 | 黃月英死亡結算 | SR | 工甲連弩：連擊時傷害提升，可穿透防禦 |

### 虎符部隊卡圖量產規格（troops_XXX.png）

> **目的**：把虎符部隊的卡圖從單張 `troops.png` 擴充成可批次生圖的圖像家族。以下表格是之後 Nano Banana / 其他生圖工具的正式畫圖指令來源。
>
> **現況說明**：戰場 demo 目前先使用 4 種主卡圖（cavalry / infantry / shield / archer），但規格表同時預留 8 個 `TroopType`，之後可直接補圖，不必再重寫規格。

#### 共通輸出規格

- **目標尺寸**：`287x142 px`
- **比例基準**：約 `2.02:1`，需與現有 `troops.png` 一致
- **構圖**：橫向長幅、主體置中偏滿、單一兵種群像；卡圖縮到 125px 仍要能一眼辨識兵種
- **清晰度**：不可做成黑剪影、武器飄浮、零碎拼貼或過多背景雜訊
- **背景**：允許低干擾戰場氛圍、霧氣、塵土、天光；禁止 UI 外框、文字、浮水印、logo
- **產出路徑**：`assets/resources/ui/tiger-tally/card-art/troops_*.png`
- **Cocos 路徑**：`ui/tiger-tally/card-art/troops_*`
- **fallback**：若找不到專圖，仍退回 `ui/tiger-tally/card-art/troops`（`troops.png`）

#### 通用 prompt 模板

```text
Use case: stylized-concept
Asset type: Tiger Tally troop card art
Primary request: <troop-specific instruction>
Composition/framing: wide horizontal banner, same ratio as 287x142, centered formation, dense readable unit cluster
Style/medium: game illustration, painterly but crisp, readable at card size
Lighting/mood: heroic battlefield, mid-contrast, high readability at small size
Constraints: no text, no border, no watermark, no UI, no weapon-only silhouette, no cropped limbs
```

#### 逐兵種量產指令

| TroopType | 輸出檔名 | 畫圖指令 |
|---|---|---|
| `Cavalry` | `troops_cavalry.png` | 重騎兵衝鋒群像。3~5 名騎兵與戰馬同時前衝，盔甲、皮革、披風與塵土要明確，斜向動勢強，形成一眼可辨識的騎兵突擊群。 |
| `Infantry` | `troops_infantry.png` | 重步兵盾槍方陣。4~6 名步兵緊密排列，盾牆在前、長槍在後，主體呈現穩固推進與防線錨定感。 |
| `Shield` | `troops_shield.png` | 重盾防線。3~5 名重裝盾兵將大盾前推，形成拒止火力的防守核心，視覺重點是厚實、壓迫、穩定。 |
| `Archer` | `troops_archer.png` | 遠程弓弩群像。4~6 名弓兵或弩兵同時拉弓、架弩或準備齊射，箭矢與拉弦動作要清晰可讀。 |
| `Pikeman` | `troops_pikeman.png` | 長槍兵槍林。密集槍尖向前伸出，形成對騎兵的阻擋感，主體要像一片整齊的長槍森林。 |
| `Engineer` | `troops_engineer.png` | 攻城工兵 / 機械營。可加入木車、工具、攻城器械、修補器具與協作姿勢，重點是「支援建制」而不是戰鬥英雄單人照。 |
| `Medic` | `troops_medic.png` | 戰地醫護 / 救護兵。可有藥箱、繃帶、擔架、治療旗幟或醫療器具，畫面語意是支援、救治、回復。 |
| `Navy` | `troops_navy.png` | 水軍艦隊 / 船戰兵。艨艟、船槳、水花、索具與旗幟一起形成水域作戰群像，帶出河川 / 江海軍勢。 |

#### 已交付資產

| 檔名 | 狀態 | 尺寸 |
|---|---|---|
| `troops_cavalry.png` | 已完成 | `287x142` |
| `troops_infantry.png` | 已完成 | `287x142` |
| `troops_shield.png` | 已完成 | `287x142` |
| `troops_archer.png` | 已完成 | `287x142` |
| `troops_pikeman.png` | 已完成 | `287x142` |
| `troops_engineer.png` | 已完成 | `287x142` |
| `troops_medic.png` | 已完成 | `287x142` |
| `troops_navy.png` | 已完成 | `287x142` |

> **交付結論**：目前 8 張 `troops_*.png` 均已完成並回寫到 `assets/resources/ui/tiger-tally/card-art/`，Battle 端可直接依 `TroopType` 套用；若未來新增兵種，仍沿用同一命名與 fallback 規則。

> **補圖原則**：若未來新增特殊兵種，檔名一律跟著 `TroopType` 走，維持 `troops_<troopType>.png` 命名；只要規格維持這個格式，BattleSceneLoader 就可以直接接入。

### 虎符名錄正式區（EliteTroopCodex）

> **正式入口**：`EliteTroopCodex` / `elite-troop-codex-screen.json`
>
> **接線狀態**：34 筆虎符名錄已全部接入正式區，卡片詳情會在 UI 內顯示；未來要逐張替換時，只要換對應的單張資產即可。
>
> **尺寸規格**：名錄卡圖統一維持 `287x142`，與既有虎符卡面比例一致。
>
> **國際化規則**：虎符部隊圖內不得寫字、不得放標語、不得放數字或水印；名稱與描述一律留在 UI label，未來推國際版時只需換圖。
>
> **占位策略**：目前 `03 / 08 / 27 / 31 / 32 / 33 / 34` 先以 `troops.png` 占位，其餘已接正式圖。


### 虎符產出條件

```
// 來源一：死亡結算時判定
if (general.has_formal_hero_template):     // 史實名將或正式女性名將
  produce_tiger_tally(general.template_id, quality=resolve_tally_quality(general.death_legacy_score))
else:
    // 不產出虎符

// 來源二：招降移交（Q61=C 補充）
// 招降成功後，該武將於隔季結算時將隨身虎符交入玩家虎符庫
if (general.was_recruited_from_enemy && current_season >= general.recruited_season + 1):
  transfer_tiger_tally_to_player(general.uid)

// 來源三：封賞結算（Q61=C 補充）
// 戰勝沒有退路的方伯/君主時，勝方公開封賞對方旗下最高品質虎符
if (enemy_lord.has_no_retreat == true && victory == true):
  award_top_tally_to_winner(enemy_lord.highest_quality_tally)
```

### 虎符品質主分數（TigerTallyScore）

> **拍板依據**：`整併疑問書.md Q30 = B`。虎符品質由單一 `TigerTallyScore` 映射，並以死亡戰績為主、傳承品質為次要加權；不再拆成多套互相競爭的品質權威。

```typescript
// === 虎符品質主分數 ===
const TALLY_SCORE_WEIGHTS = {
  death_battle_score: 0.7,   // 死亡前戰績 / 戰場貢獻
  legacy_quality_score: 0.3, // 傳承完整度 / 家族共鳴 / 退役敘事品質
};

function getTigerTallyScore(deathBattleScore: number, legacyQualityScore: number): number {
  return Math.round(
    deathBattleScore * TALLY_SCORE_WEIGHTS.death_battle_score +
    legacyQualityScore * TALLY_SCORE_WEIGHTS.legacy_quality_score
  );
}

function resolve_tally_quality(deathBattleScore: number, legacyQualityScore: number): 'R' | 'SR' | 'SSR' | 'UR' {
  const tigerTallyScore = getTigerTallyScore(deathBattleScore, legacyQualityScore);
  if (tigerTallyScore >= 85) return 'UR';
  if (tigerTallyScore >= 65) return 'SSR';
  if (tigerTallyScore >= 40) return 'SR';
  return 'R';
}
```

| 指標 | 權重 | 內容 |
|---|---|---|
| `Death_Battle_Score` | 70% | 最終戰役輸出 / 承傷 / 擊破目標 / 主將擊殺 / 任務完成度 |
| `Legacy_Quality_Score` | 30% | 退役聲望、家族 / 血脈敘事完整度、是否留下高價值傳承摘要 |

- `TigerTallyScore` 是虎符品質的唯一正式分數來源，前端外框、掉落稀有度與 AI 保留策略都應讀同一個分數映射結果。
- 若名將死亡時有高戰場表現，但傳承敘事較弱，仍可能拿到高品質虎符；反之只靠劇情地位、不靠戰績，品質不應虛高。

### 兵種適性加成

```
// 武將指揮兵種時的效率
efficiency = APTITUDE_MOD[general.troop_aptitude[troop_type]]
// S=1.2, A=1.1, B=1.0, C=0.9, D=0.8
troop_attack = base_troop_attack × efficiency
troop_defense = base_troop_defense × efficiency
```

### 虎符星級養成系統

> **Unity 對照**：類似裝備進階系統（Equipment Ascension）。1~3★ 靠戰鬥經驗自然解鎖（等同 Unity Auto-Upgrade），4~5★ 需突破材料（等同 Ascension Material），兼顧免費/課金雙軌。

```typescript
// === 虎符星級系統（1★ ~ 5★） ===
// 每★提升特殊兵種攻防 +8%
const STAR_STAT_MOD = (star: number) => 1 + star * 0.08;
// 1★ = 1.08, 2★ = 1.16, 3★ = 1.24, 4★ = 1.32, 5★ = 1.40

// === 養成路線 ===
// ──── 1★ → 3★：戰鬥經驗養成（免費玩家友好） ────
// 虎符初始為 1★，透過裝備虎符上場戰鬥累積「虎符經驗」
// 達到門檻自動升星
const TALLY_STAR_EXP: Record<number, number> = {
    2: 100,    // 約 5~8 場戰鬥
    3: 350,    // 約 15~20 場戰鬥
};
// 每場戰鬥獲得經驗 = TALLY_BATTLE_EXP_BASE × 勝率修正 × 品質修正
const TALLY_BATTLE_EXP_BASE = 15;  // 勝利 +15, 敗北 +8, 平手 +10
const TALLY_EXP_WIN_MOD  = 1.0;
const TALLY_EXP_LOSE_MOD = 0.53;
const TALLY_EXP_DRAW_MOD = 0.67;

// ──── 4★ → 5★：虎符精華突破（課長空間） ────
// 需消耗「虎符精華」+ 黃金，有成功率
const TALLY_BREAKTHROUGH_COST: Record<number, { gold: number; essence: number }> = {
    4: { gold: 3000,  essence: 50 },   // 4★ 突破
    5: { gold: 10000, essence: 200 },  // 5★ 突破
};

// === 突破成功率 ===
// 4★ 突破：80%（失敗不損失虎符，材料消耗 50%）
// 5★ 突破：50%（失敗不損失虎符，材料全消耗；可用「保底符」100% 成功）
const BREAKTHROUGH_SUCCESS_RATE: Record<number, number> = {
    4: 0.8,
    5: 0.5,
};

// === 品質封頂星級 ===
// R 虎符：最高 3★
// SR 虎符：最高 4★
// SSR 虎符：最高 5★
// UR 虎符：最高 5★（突破成功率 +10% 額外加成）
const QUALITY_STAR_CAP: Record<string, number> = {
    R: 3, SR: 4, SSR: 5, UR: 5
};
```

### 虎符糧草消耗表（Q62=A）

> **決策依據**：整併疑問書 Q62 = A。虎符部隊上場的糧草消耗高於組合普通小兵，強迫玩家在「維持戰線」與「瞬間爆發」之間取捨。未設指派虎符部隊的回合，該兵種就不會出現在戰場上。
>
> **文字更正**：將官不再區分「英靈精銳」與「轉蛋精銳」，一律稱「虎符部隊」。

```typescript
// === 虎符糧草消耗表（按品質×星級）===
// 每回合開始時選擇「派遣虎符部隊」即扣除對應糧草消耗
const TALLY_GRAIN_COST: Record<string, Record<number, number>> = {
    R:   { 1: 20,  2: 22,  3: 25 },          // R 虎符 1★~3★
    SR:  { 1: 40,  2: 45,  3: 52,  4: 60 },   // SR 虎符 1★~4★
    SSR: { 1: 70,  2: 80,  3: 92,  4: 106, 5: 122 },  // SSR 1★~5★
    UR:  { 1: 110, 2: 125, 3: 142, 4: 162, 5: 185 },  // UR 1★~5★
};

function getTallyGrainCost(quality: string, star: number): number {
    return TALLY_GRAIN_COST[quality]?.[star] ?? 20;
}

// 糧草不足折扣機制：季結算剩餘糧草若少於 50，下一場戰鬥虎符糧耗打 8 折（不累算）
const TALLY_GRAIN_SHORTAGE_DISCOUNT = 0.8;
```

### 虎符陣容 Set 羈絆加成（Q64=A）

> **決策依據**：整併疑問書 Q64 = A。同一場戰中，只要相同 Set 的虎符部隊同時在場（主力出戰武將 / 可上場副位武將 / 好友武將均可共同計算），即觸發陣容 Set 加成。由於 Q61 已裁定不採虎符專屬冷卻，因此 Set 加成正式表現為虎符部隊的攻防加成，而非冷卻縮減。
> **名詞防撞補充**：本節的「副位武將 / 副將」若出現，指的是可上場作戰的第二戰鬥位，不包含出征前提供糧草支援的 `副將（補給支援）`。後者不在場，不計入 Set 判定。

```typescript
// === Set 羈絆定義（SetBonusDef）===
interface SetBonusDef {
    setId:        string;          // e.g. 'SET_FIVE_TIGERS'
    name:         string;          // e.g. '五虎將'
    memberTroopIds: string[];      // 能算入計的特殊兵種 ID
  requiredCount: number;         // 需要同時在場的最低數量
  bonus:         { atkMod: number; defMod: number }; // +10% = 1.10
}

const SET_BONUS_DEFS: SetBonusDef[] = [
    {
        setId: 'SET_FIVE_TIGERS',
        name: '五虎將',
        memberTroopIds: ['TROOP_CHANGSHAN_DRAGON', 'TROOP_LOYAL_IRON_GUARD', 'TROOP_THUNDER_SQUAD', 'TROOP_GOD_SNIPER', 'TROOP_DIVINE_CAVALRY'],
        requiredCount: 3,
        bonus: { atkMod: 1.10, defMod: 1.10 }
    },
    {
        setId: 'SET_JIANGDONG_TIGERS',
        name: '江東十二虎臣',
        memberTroopIds: ['TROOP_WU_NAVY', 'TROOP_BROCADE_RAIDERS', 'TROOP_FEARLESS_GUARD', 'TROOP_JIANGDONG_GUARD'],
        requiredCount: 3,
        bonus: { atkMod: 1.10, defMod: 1.05 }
    },
    {
        setId: 'SET_FIVE_ADVISORS',
        name: '曹魏五謀',
        memberTroopIds: ['TROOP_GHOST_STRATEGISTS', 'TROOP_SHADOW_GUARD', 'TROOP_SWIFT_CAVALRY', 'TROOP_CROSSBOW_VOLLEY', 'TROOP_PHANTOM_CAMP'],
        requiredCount: 3,
        bonus: { atkMod: 1.08, defMod: 1.08 }
    },
];

// === Set 判定（BattleController 調用）===
function getActiveSets(
    activeTallyTroopIds: string[]  // 當前場上所有武將（包含好友）的虎符部隊 ID
): SetBonusDef[] {
    return SET_BONUS_DEFS.filter(def => {
        const matched = def.memberTroopIds.filter(id => activeTallyTroopIds.includes(id));
        return matched.length >= def.requiredCount;
    });
}

// Set 加成只發生一次，即便同名虎符出現多張也不疊加
// 跨武將判定：所有「實際在場」的作戰武將與好友武將皆可加入計算
// 出征前的參謀 / 補給副將不屬於在場戰鬥單位，不參與 Set 計算
```

### Set 羈絆表（現定義）

| Set ID | Set 名稱 | 成員兵種（示意） | 最小在場數 | 攻勢加成 | 防勢加成 |
|---|---|---|---|---|---|
| SET_FIVE_TIGERS | 五虎將 | 常山龍騎 / 忠義鐵衛 / 雷霆暴隊 / 神射帥營 / 虎威神騎 | 3/5 | +10% | +10% |
| SET_JIANGDONG_TIGERS | 江東十二虎臣 | 吳國水師 / 錦帆游擊兵 / 不屈死士 / 江東護衛 | 3/4 | +10% | +5% |
| SET_FIVE_ADVISORS | 曹魏五謀 | 鬼謀營 / 冥影衛 / 逍遙精騎 / 連弩齊射 / 幻影營 | 3/5 | +8% | +8% |

> **容錯設計**：分屬好友武將的虎符亦算在內；相同 Set 的虎符由不同玩家武將持有亦可計算；純支援位角色不算。

### 虎符部隊委任出展策略（Q65=D）

> **決策依據**：整併疑問書 Q65 = D。實際出展、糧草判定、戰法致動的相關邏輯將在【戰場委任系統】（doc_spec_0040）內定義，不屬於本規格書範疇。本節僅列出原則性約束。

- 委任模式下，系統會依照武將的【五大屬性】（武力 / 智力 / 統率 / 政務 / 魅力）決定出展時機。
- 戰場糧草較高時，高智力武將才會在評估權衡後才選擇出展虎符部隊，不會在糧草不足時浪費。
- 策略細節請參考 doc_spec_0040。

### 虎符適性系統

> **Unity 對照**：類似 RPG 武器的「屬性親和」（Elemental Affinity），不同虎符在地形/家族/性別上各有偏好，影響實際戰力乘數。
> **設計理念**：增加配隊深度——玩家不只看虎符品質，還要考慮「這枚虎符適合在哪個地形、哪個家族的武將、哪個性別的武將使用」。

```typescript
// === 地形適性（Terrain Affinity） ===
// 每枚虎符對 6 種地形各有 S/A/B/C/D 適性
// 影響該虎符的特殊兵種在對應地形上的攻防乘數
type TerrainType = 'PLAIN' | 'MOUNTAIN' | 'FOREST' | 'RIVER' | 'CITY' | 'DESERT';
const TERRAIN_AFFINITY_MOD: Record<string, number> = {
    S: 1.20,  // 專精地形
    A: 1.10,  // 擅長
    B: 1.00,  // 普通
    C: 0.90,  // 不擅長
    D: 0.80,  // 劣勢
};
// 範例：「白馬義從」→ PLAIN=S, DESERT=A, MOUNTAIN=D（騎兵不利山地）
// 範例：「藤甲兵」→ FOREST=S, MOUNTAIN=A, DESERT=C

// === 家族共鳴（Clan Resonance） ===
// 虎符標記所屬家族（如 曹/劉/孫/公孫/袁/馬/司馬/孟 等）
// 裝備者與虎符同家族 → 額外 +8% 攻防
// 裝備者與虎符有「史實羈絆」→ 額外 +5%（與血脈共鳴可疊加）
const CLAN_RESONANCE_MOD = 1.08;      // 同家族
const CLAN_BOND_MOD = 1.05;           // 史實羈絆（如 張遼裝「止啼符」雖同名，但呂布裝「止啼符」有羈絆加成）
// 家族 ID 列表
type ClanID = 'CAO' | 'LIU' | 'SUN' | 'GONGSUN' | 'YUAN' | 'MA' | 'SIMA'
    | 'MENG' | 'ZHUGE' | 'LV' | 'DONG' | 'OTHER';

// === 性別偏好（Gender Preference） ===
// 部分虎符有性別偏好——非限制，而是「加成」
// NONE = 無偏好 | MALE = 男性加成 | FEMALE = 女性加成
type GenderPref = 'NONE' | 'MALE' | 'FEMALE';
const GENDER_MATCH_MOD = 1.06;   // 性別匹配 → +6%
const GENDER_MISMATCH_MOD = 1.0; // 不匹配 → 不懲罰（只有正向加成）
// 範例：「常山女騎」虎符 → FEMALE 偏好，女性武將裝備 +6%
// 範例：「虎痴符」→ MALE 偏好，男性武將裝備 +6%
// 範例：「白馬義從」→ NONE，無性別偏好

// === 綜合虎符適性乘數 ===
function getTallyAffinityMod(
    tally: TigerTally,
    general: General,
    terrain: TerrainType
): number {
    // 地形適性
    const terrainMod = TERRAIN_AFFINITY_MOD[tally.terrainAffinity[terrain]];

    // 家族共鳴
    let clanMod = 1.0;
    if (general.clanID === tally.clanID) clanMod = CLAN_RESONANCE_MOD;
    if (hasClanBond(general, tally)) clanMod *= CLAN_BOND_MOD;

    // 性別偏好
    const genderMod = (tally.genderPref !== 'NONE'
        && tally.genderPref === general.gender) ? GENDER_MATCH_MOD : GENDER_MISMATCH_MOD;

    return terrainMod * clanMod * genderMod;
}
```

### 虎符拔除與忠誠度

> **設計理念**：虎符是武將的榮譽象徵，拔除虎符等於剛奪武將的指揮權，因此降低忠誠度。換上更好的虎符提升較少，避免玩家利用「拔插循環」洗忠誠度。

```typescript
// === 拔除虎符 → 忠誠度下降 ===
const TALLY_REMOVE_LOYALTY_PENALTY: Record<string, number> = {
    UR:  -25,   // 拔掉 UR 虎符：忠誠度 -25
    SSR: -20,   // 拔掉 SSR 虎符：忠誠度 -20
    SR:  -12,   // 拔掉 SR 虎符：忠誠度 -12
    R:   -5,    // 拔掉 R 虎符：忠誠度 -5
};

// === 換上虎符 → 忠誠度上升（較少） ===
const TALLY_EQUIP_LOYALTY_BONUS: Record<string, number> = {
    UR:  +8,
    SSR: +5,
    SR:  +3,
    R:   +1,
};

// === 反洗忠誠度機制 ===
// 王定：同一武將每季只能執行 1 次虎符裝備變更（含拔除、裝上、轉交）
// 王定：連續 2 季對同一武將執行虎符變更，第 2 次降低量加倍（×1.5）
// 王定：轉蛋名將忠誠度鎖定 100，不受虎符拔除影響
function applyTallyLoyaltyChange(
    general: General,
    action: 'equip' | 'unequip',
    tallyQuality: string
): void {
    // 轉蛋名將忠誠度鎖定，不變動
    if (general.isGachaHero) return;

    // 檢查本季是否已執行過虎符變更
    const consecutiveSeasons = general.tallyChangeHistory.getConsecutiveSeasons();
    const penaltyMultiplier = consecutiveSeasons >= 2 ? 1.5 : 1.0;

    if (action === 'unequip') {
        const basePenalty = TALLY_REMOVE_LOYALTY_PENALTY[tallyQuality];
        general.loyalty += Math.floor(basePenalty * penaltyMultiplier);
    } else {
        const baseBonus = TALLY_EQUIP_LOYALTY_BONUS[tallyQuality];
        general.loyalty += baseBonus;  // 裝上不受懲罰倍率影響
    }

    general.loyalty = clamp(general.loyalty, 0, 100);
    general.tallyChangeHistory.recordThisSeason();
}

// === 忠誠度過低後果 ===
// 忠誠度 < 30：戰場上有機率拒絕執行命令（25% / 回合）
// 忠誠度 < 10：有機率叛變或攼帶虎符出走（5% / 季）
```

### 血脈卡與英靈插卡演出

- 插卡順序建議：
  1. 虎符 / 血脈卡上的祖紋命篆亮起
  2. 命紋靈獸虛影在武將上方或虎符後方短暫顯現
  3. 名將的 `血脈面 / 英靈面` 以半虛影、雙面形象或魂紋疊影方式出場
  4. 專屬特種軍隊或軍勢 buff 接續進場
- 英靈演出不走科技召喚，不走恐怖屍靈，而是古老、莊嚴、帶命紋餘響的祖靈軍勢

### 特種軍隊血脈紋樣原則

- 特種軍隊的旗幟、盾紋、甲片、馬飾、車紋需對應所屬名將的命紋靈獸
- 同一名將的：
  - 角色立繪血脈符號
  - 虎符卡面
  - 英靈面
  - 特種軍隊圖騰
  應維持同一套家徽 / 血脈印記 / 祖紋命篆

---
