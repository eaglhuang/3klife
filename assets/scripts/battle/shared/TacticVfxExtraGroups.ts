// @spec-source → 戰法系統 §H 美術特效配合（第二批戰法特效分組，PROG-2-10236）
/**
 * TacticVfxExtraGroups — 戰法特效第二批分組的「資料表」（純資料，不依賴 cc，單元測試可直接跑）。
 *
 * 背景：第一批只有火／水／風／回復／加速／鼓舞／控制 7 組，斬擊、突刺、衝鋒、箭雨、雷、冰、毒、暗、防禦、連環、文擊、再動、震地
 * 這些常見招式都落到通用光效。這裡新增 13 組：每組只是「配色＋粒子量＋前搖動機＋命中動機」，
 * 動機（motif）是 TacticVfxPlayer 內建的一套通用畫法（程式繪製、零貼圖、同一個加色 Graphics），
 * 所以之後再新增一組特效只要：
 *   1. 在 EXTRA_TACTIC_VFX_RECIPES 加一筆配方（挑 windup／hit 動機＋顏色）；
 *   2. 在 TACTIC_VFX_SKILL_GROUP 把招式 id 對到這一組；
 *   3. 在 battle-audio-layers.json 的 tactic 區塊加同名組的 clip 與音量（沿用既有音檔，不增發聲池上限）。
 * 不用改 View 程式。
 *
 * Unity 對照：像「招式 id → ParticleSystem 預設」的 ScriptableObject 對照表；motif 是少數幾種共用的粒子行為。
 */
import type { Rgb, TacticVfxRecipe } from './TacticVfxGroups';

/** 前搖動機（施放者身上，蓄力 0.4 秒內） */
export type TacticWindupMotif = 'converge' | 'ring' | 'streak' | 'orbit' | 'glint' | 'rise' | 'shout';

/** 命中動機（受影響格） */
export type TacticHitMotif =
    | 'bolts' | 'shards' | 'bubbles' | 'slashes' | 'thrust' | 'rain' | 'dash'
    | 'mist' | 'dome' | 'chain' | 'runes' | 'cycle' | 'quake'
    // 第三批（PROG-2-10240）：減益／光聖／號令
    | 'droop' | 'swirl' | 'halo' | 'cleanse' | 'judgement' | 'banner' | 'soundwave';

export type TacticVfxExtraGroup =
    | 'thunder' | 'ice' | 'poison' | 'slash' | 'pierce' | 'charge' | 'volley'
    | 'shadow' | 'guard' | 'chain' | 'arcane' | 'renew' | 'quake'
    // 第三批（PROG-2-10240）：減益（虛弱／恐懼、混亂／魅惑）、光聖（祝福、淨化、神罰）、號令（鼓舞號令、戰吼）
    | 'weaken' | 'confuse' | 'bless' | 'purify' | 'smite' | 'rally' | 'warcry';

export interface TacticVfxExtraRecipe extends TacticVfxRecipe {
    windup: TacticWindupMotif;
    hit: TacticHitMotif;
}

export const TACTIC_VFX_EXTRA_GROUPS: readonly TacticVfxExtraGroup[] = Object.freeze([
    'thunder', 'ice', 'poison', 'slash', 'pierce', 'charge', 'volley', 'shadow', 'guard', 'chain', 'arcane', 'renew', 'quake',
    'weaken', 'confuse', 'bless', 'purify', 'smite', 'rally', 'warcry',
]);

/** 第三批 7 組（PROG-2-10240）；單測用來確認這 7 組每組都有招式或狀態掛點 */
export const TACTIC_VFX_BATCH3_GROUPS: readonly TacticVfxExtraGroup[] = Object.freeze([
    'weaken', 'confuse', 'bless', 'purify', 'smite', 'rally', 'warcry',
]);

const rgb = (r: number, g: number, b: number): Rgb => [r, g, b];

/** 13 組配方。數值是視覺設計（總 PM 授權自訂）；命中＋餘韻皆 ≤ 0.9 秒，單格粒子 ≤ 14。 */
export const EXTRA_TACTIC_VFX_RECIPES: Readonly<Record<TacticVfxExtraGroup, TacticVfxExtraRecipe>> = Object.freeze({
    // 雷：藍白閃電從天劈下＋地面電環
    thunder: { main: rgb(130, 160, 255), glow: rgb(60, 90, 255), core: rgb(255, 255, 255), particlesPerCell: 14, windupParticles: 8, hitSec: 0.3, tailSec: 0.5, windup: 'ring', hit: 'bolts' },
    // 冰：放射冰晶碎片＋霜環
    ice: { main: rgb(170, 235, 255), glow: rgb(90, 190, 235), core: rgb(255, 255, 255), particlesPerCell: 12, windupParticles: 8, hitSec: 0.3, tailSec: 0.6, windup: 'converge', hit: 'shards' },
    // 毒：綠色毒霧與上浮毒泡
    poison: { main: rgb(150, 230, 60), glow: rgb(80, 160, 30), core: rgb(235, 255, 170), particlesPerCell: 12, windupParticles: 6, hitSec: 0.3, tailSec: 0.6, windup: 'converge', hit: 'bubbles' },
    // 斬擊：銀白交錯斬線
    slash: { main: rgb(235, 240, 255), glow: rgb(130, 150, 220), core: rgb(255, 255, 255), particlesPerCell: 10, windupParticles: 6, hitSec: 0.3, tailSec: 0.45, windup: 'glint', hit: 'slashes' },
    // 突刺：金橘槍影直線穿出
    pierce: { main: rgb(255, 205, 130), glow: rgb(230, 130, 40), core: rgb(255, 250, 225), particlesPerCell: 10, windupParticles: 6, hitSec: 0.3, tailSec: 0.45, windup: 'glint', hit: 'thrust' },
    // 衝鋒：土黃速度帶與揚塵
    charge: { main: rgb(225, 165, 85), glow: rgb(160, 100, 40), core: rgb(255, 235, 190), particlesPerCell: 12, windupParticles: 8, hitSec: 0.3, tailSec: 0.5, windup: 'streak', hit: 'dash' },
    // 箭雨：紅羽箭斜落插地
    volley: { main: rgb(255, 95, 95), glow: rgb(200, 40, 50), core: rgb(255, 225, 210), particlesPerCell: 12, windupParticles: 6, hitSec: 0.3, tailSec: 0.5, windup: 'orbit', hit: 'rain' },
    // 暗：紫黑霧氣與雙眼
    shadow: { main: rgb(160, 90, 210), glow: rgb(90, 40, 150), core: rgb(230, 190, 255), particlesPerCell: 12, windupParticles: 8, hitSec: 0.3, tailSec: 0.6, windup: 'ring', hit: 'mist' },
    // 防禦：鋼藍護盾穹頂
    guard: { main: rgb(175, 200, 225), glow: rgb(100, 130, 175), core: rgb(245, 250, 255), particlesPerCell: 8, windupParticles: 6, hitSec: 0.35, tailSec: 0.5, windup: 'ring', hit: 'dome' },
    // 連環：粉紅鐵環鎖鏈
    chain: { main: rgb(255, 150, 210), glow: rgb(210, 70, 160), core: rgb(255, 235, 245), particlesPerCell: 10, windupParticles: 6, hitSec: 0.3, tailSec: 0.5, windup: 'orbit', hit: 'chain' },
    // 文擊／奇策：青白符文陣
    arcane: { main: rgb(120, 255, 235), glow: rgb(40, 190, 190), core: rgb(240, 255, 252), particlesPerCell: 10, windupParticles: 8, hitSec: 0.3, tailSec: 0.6, windup: 'ring', hit: 'runes' },
    // 再動：橘金循環箭頭
    renew: { main: rgb(255, 170, 70), glow: rgb(220, 100, 30), core: rgb(255, 240, 200), particlesPerCell: 10, windupParticles: 8, hitSec: 0.3, tailSec: 0.6, windup: 'converge', hit: 'cycle' },
    // 震地：褐色裂痕、碎石與塵
    quake: { main: rgb(190, 140, 95), glow: rgb(120, 80, 45), core: rgb(255, 225, 175), particlesPerCell: 14, windupParticles: 8, hitSec: 0.3, tailSec: 0.55, windup: 'ring', hit: 'quake' },
    // ───── 第三批（PROG-2-10240）─────
    // 虛弱／恐懼：灰紫下沉箭頭＋冷汗滴落（上身後的減益）
    weaken: { main: rgb(195, 150, 240), glow: rgb(115, 80, 190), core: rgb(235, 220, 250), particlesPerCell: 8, windupParticles: 6, hitSec: 0.3, tailSec: 0.6, windup: 'converge', hit: 'droop' },
    // 混亂／魅惑／離間：玫紅旋轉星點繞頭
    confuse: { main: rgb(240, 90, 150), glow: rgb(170, 40, 110), core: rgb(255, 225, 240), particlesPerCell: 8, windupParticles: 6, hitSec: 0.3, tailSec: 0.6, windup: 'orbit', hit: 'swirl' },
    // 祝福：金白光環降下＋光柱＋上浮光點
    bless: { main: rgb(255, 245, 190), glow: rgb(255, 205, 90), core: rgb(255, 255, 255), particlesPerCell: 10, windupParticles: 8, hitSec: 0.35, tailSec: 0.6, windup: 'rise', hit: 'halo' },
    // 淨化：淡紫白漣漪由腳向頭掃過
    purify: { main: rgb(225, 235, 255), glow: rgb(150, 170, 255), core: rgb(255, 255, 255), particlesPerCell: 10, windupParticles: 8, hitSec: 0.35, tailSec: 0.6, windup: 'rise', hit: 'cleanse' },
    // 神罰：天降金白光柱＋十字衝擊
    smite: { main: rgb(255, 240, 170), glow: rgb(255, 120, 90), core: rgb(255, 255, 255), particlesPerCell: 12, windupParticles: 8, hitSec: 0.3, tailSec: 0.5, windup: 'ring', hit: 'judgement' },
    // 號令／鼓舞：橘紅戰旗升起飄揚
    rally: { main: rgb(255, 130, 50), glow: rgb(200, 50, 30), core: rgb(255, 235, 190), particlesPerCell: 10, windupParticles: 6, hitSec: 0.3, tailSec: 0.6, windup: 'rise', hit: 'banner' },
    // 戰吼：向前擴散的聲波環與放射短線
    warcry: { main: rgb(255, 240, 200), glow: rgb(255, 150, 60), core: rgb(255, 255, 255), particlesPerCell: 10, windupParticles: 6, hitSec: 0.3, tailSec: 0.5, windup: 'shout', hit: 'soundwave' },
});

/**
 * 招式 id → 第二批分組。只放「第一批 7 組沒歸類」的招式（第一批的歸類規則優先，見 tacticVfxGroupOf）。
 * 殼 profile（pendingEffect，TRP-15）不可施放，不列。
 */
export const TACTIC_VFX_SKILL_GROUP: Readonly<Record<string, TacticVfxExtraGroup>> = Object.freeze({
    // 斬擊
    'guan-yu-slash': 'slash', 'insp-combo-attack': 'slash', 'insp-sworn-fury': 'slash', 'sun-ce-conqueror': 'slash',
    // 突刺
    'zhao-yun-pierce': 'pierce', 'insp-lance-thrust': 'pierce', 'insp-dragon-gall': 'pierce', 'tally-defense-pierce': 'pierce',
    // 衝鋒
    'generic-all-out-charge': 'charge', 'tally-charge': 'charge', 'wei-yan-ziwu-raid': 'charge',
    // 箭雨／毒
    'tally-hundred-steps': 'volley', 'tally-poison-arrow': 'poison',
    // 雷
    'cao-cao-tactics': 'thunder', 'tally-wei-zhen-hua-xia': 'smite',
    // 冰（緩速）
    'mentor-slow': 'ice',
    // 暗（奇襲、離間、挾令、司馬懿）
    'insp-night-raid': 'shadow', 'sima-yi-shadow': 'weaken', 'sow-discord': 'confuse', 'cao-cao-ult-control': 'confuse',
    // 防禦（護盾、無敵、反擊）
    'insp-shield': 'guard', 'zhao-yun-immortal': 'bless', 'you-qi-counter': 'guard', 'tally-counter-weak': 'guard',
    // 連環
    'lian-huan-chain': 'chain', 'tally-link': 'chain',
    // 文擊／奇策
    'cao-zhi-verse': 'arcane', 'guo-jia-foresight': 'arcane',
    // 再動／重置
    'liu-bei-reset': 'renew', 'wei-zhen-reset': 'renew', 'zhang-he-adaptive-camp': 'renew',
    // 震地（強制位移、橫掃爆發）
    'lu-bu-rampage': 'quake', 'empty-fort': 'quake', 'tally-changban-push': 'quake', 'tally-wushuang': 'quake',
    // ───── 第三批（PROG-2-10240）：表優先於第一批歸類，把原本落在第一批／第二批近似組的招式改歸專屬組 ─────
    // 混亂／魅惑
    'diao-chan-charm': 'confuse',
    // 祝福（復活）／淨化（醫療）
    'cao-cao-ult-revive': 'bless', 'medical-aid': 'purify',
    // 號令／鼓舞
    'mentor-morale': 'rally', 'liu-bei-rally': 'rally', 'cao-cao-revelry': 'rally',
    // 戰吼
    'zhang-fei-roar': 'warcry', 'insp-taunt': 'warcry',
});

/** 第二批各組的音效：沿用既有音檔（不新增檔案、不改發聲池上限），音量範圍同第一批。與 battle-audio-layers.json 的 tactic 區塊一致。 */
export const EXTRA_TACTIC_SFX_CLIPS: Readonly<Record<TacticVfxExtraGroup, readonly string[]>> = Object.freeze({
    thunder: ['thunder'],
    ice: ['tactic_water'],
    poison: ['biteskill'],
    slash: ['sfx_hit_blade', 'weapon'],
    pierce: ['sfx_hit_pierce'],
    charge: ['sfx_atk_charge'],
    volley: ['sfx_atk_arrow_whoosh', 'sfx_hit_arrow'],
    shadow: ['teleport'],
    guard: ['shield'],
    chain: ['sfx_hit_clash'],
    arcane: ['skill1'],
    renew: ['buff'],
    quake: ['boom'],
    weaken: ['hurt'],
    confuse: ['wave'],
    bless: ['light'],
    purify: ['tactic_heal_sparkle'],
    smite: ['laser'],
    rally: ['tactic_morale'],
    warcry: ['skill3'],
});

/**
 * 狀態上身（BuffApplied）→ 分組：減益上身時在目標格補一段命中特效（減益施加表現）。
 * 中毒走 playPoisonHit 的既有紫綠光罩，不在此表；控制（暈眩／定身）沿用第一批 stun，不在此表。
 */
export const STATUS_DEBUFF_VFX_GROUP: Readonly<Record<string, TacticVfxExtraGroup>> = Object.freeze({
    weak: 'weaken',
    'no-shoot': 'weaken',
    slow: 'ice',
});
