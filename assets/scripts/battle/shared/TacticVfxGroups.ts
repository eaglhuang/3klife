// @spec-source → 戰法系統 §H 美術特效配合（戰法施放特效依效果分組，PROG-2-10138）
/**
 * TacticVfxGroups — 戰法特效分組與預算（純邏輯，不依賴 cc，單元測試可直接跑）
 *
 * 背景：戰場上所有「戰法」（非奧義）施放以前都共用同一個 battle_skill_seed 光效，玩家分不出火計、回復、加速。
 * 這裡把戰法依效果分成 7 組，每組一套「前搖 → 命中 → 餘韻」的程式繪製特效（畫法在 views/TacticVfxPlayer.ts）：
 *   fire 火（紅橘）／water 水（青藍）／wind 風（淡綠白）／heal 回復（綠＋白十字）／
 *   haste 加速（黃，朝前的箭頭與速度線）／morale 鼓舞（金，上升星芒）／stun 控制（紫，繞頭星星）。
 * 顏色與輪廓都不同，一眼可分。沒歸類的戰法（衝鋒、貫穿等純傷害）維持原本的通用光效。
 *
 * 預算（手機優先）：全場同時特效數、同時粒子數、單次施放最多命中幾格都有上限；超過就縮減或略過，不排隊、不新增節點。
 * 前搖放在既有的 0.4 秒蓄力時間內（不增加總時長）；命中＋餘韻合計不超過 1.0 秒，不蓋住戰場。
 *
 * Unity 對照：像一張「戰法效果類型 → ParticleSystem 預設」對照表，加上全域 MaxParticles 限制。
 */
import { StatusEffect } from '../../core/config/Constants';
import { resolveBattleSkillProfile } from '../skills/BattleSkillProfiles';
import { tacticElementOfSkill } from './TacticVfxHooks';
import {
    EXTRA_TACTIC_VFX_RECIPES, TACTIC_VFX_EXTRA_GROUPS, TACTIC_VFX_SKILL_GROUP,
    type TacticVfxExtraGroup, type TacticVfxExtraRecipe,
} from './TacticVfxExtraGroups';

/** 第一批 7 組（程式內建專屬畫法）；第二批 13 組（PROG-2-10236）與第三批 7 組（PROG-2-10240）見 TacticVfxExtraGroups，資料表＋通用動機 */
export type TacticVfxBaseGroup = 'fire' | 'water' | 'wind' | 'heal' | 'haste' | 'morale' | 'stun';
export type TacticVfxGroup = TacticVfxBaseGroup | TacticVfxExtraGroup;

/** 第一批 7 組。第二批用 TACTIC_VFX_EXTRA_GROUPS，兩批合併用 TACTIC_VFX_ALL_GROUPS。 */
export const TACTIC_VFX_GROUPS: readonly TacticVfxBaseGroup[] = Object.freeze(['fire', 'water', 'wind', 'heal', 'haste', 'morale', 'stun']);
export { TACTIC_VFX_EXTRA_GROUPS };
export const TACTIC_VFX_ALL_GROUPS: readonly TacticVfxGroup[] = Object.freeze([...TACTIC_VFX_GROUPS, ...TACTIC_VFX_EXTRA_GROUPS]);

/** 是否為第二批分組（View 層用動機畫法，而不是第一批的專屬畫法） */
export function isExtraTacticGroup(group: TacticVfxGroup): group is TacticVfxExtraGroup {
    return Object.prototype.hasOwnProperty.call(EXTRA_TACTIC_VFX_RECIPES, group);
}

/** 風系戰法：諸葛風暴。戰法資料沒有 element 欄位，依 battleSkillId 對應（與水計同做法）。 */
export const WIND_TACTIC_IDS: readonly string[] = Object.freeze(['zhuge-liang-storm']);

/** 戰法 id → 特效分組；沒歸類（純傷害、位移、連鎖等）回 null，呼叫端沿用通用光效。 */
export function tacticVfxGroupOf(battleSkillId: string): TacticVfxGroup | null {
    const profile = resolveBattleSkillProfile(battleSkillId);
    if (!profile) return null;
    // 資料表優先（PROG-2-10240）：表內招式（第二、三批）以表為準，可把近似的第一批歸類改成專屬組；表外才走第一批規則
    const tabled = TACTIC_VFX_SKILL_GROUP[battleSkillId];
    if (tabled) return tabled;
    if (tacticElementOfSkill(battleSkillId, profile.tags) === 'fire' || profile.burnOnHit || profile.effectKind === 'push-fire') return 'fire';
    if (tacticElementOfSkill(battleSkillId, profile.tags) === 'water') return 'water';
    if (WIND_TACTIC_IDS.includes(battleSkillId)) return 'wind';
    if (profile.effectKind === 'heal' || profile.effectKind === 'revive' || profile.effectKind === 'vitality') return 'heal';
    if (profile.statusEffect === StatusEffect.Haste) return 'haste';
    if (profile.effectKind === 'morale' || profile.effectKind === 'tile-buff') return 'morale';
    if (profile.statusEffect === StatusEffect.Stun || profile.effectKind === 'root') return 'stun';
    return null; // 沒歸類：沿用通用光效
}

export type Rgb = readonly [number, number, number];

export interface TacticVfxRecipe {
    /** 主色（粒子本體）、暈色（外層大光暈）、核心色（近白中心） */
    main: Rgb;
    glow: Rgb;
    core: Rgb;
    /** 命中格每格的粒子數（會被預算縮減） */
    particlesPerCell: number;
    /** 前搖粒子數（施放者身上） */
    windupParticles: number;
    /** 命中爆發秒數（最亮的那一段）、餘韻秒數（逐漸淡出） */
    hitSec: number;
    tailSec: number;
}

/** 7 組配色與粒子量。數值是視覺設計，由總 PM 授權自訂；之後可整表搬成 JSON。 */
const BASE_TACTIC_VFX_RECIPES: Readonly<Record<TacticVfxBaseGroup, TacticVfxRecipe>> = Object.freeze({
    fire:   { main: [255, 110, 40],  glow: [255, 60, 20],   core: [255, 235, 160], particlesPerCell: 16, windupParticles: 10, hitSec: 0.3,  tailSec: 0.6 },
    water:  { main: [70, 170, 255],  glow: [30, 110, 230],  core: [220, 245, 255], particlesPerCell: 14, windupParticles: 8,  hitSec: 0.3,  tailSec: 0.6 },
    wind:   { main: [170, 255, 200], glow: [90, 220, 150],  core: [245, 255, 250], particlesPerCell: 14, windupParticles: 8,  hitSec: 0.3,  tailSec: 0.5 },
    heal:   { main: [90, 235, 130],  glow: [40, 200, 100],  core: [235, 255, 240], particlesPerCell: 12, windupParticles: 8,  hitSec: 0.35, tailSec: 0.6 },
    haste:  { main: [255, 225, 70],  glow: [255, 170, 30],  core: [255, 250, 210], particlesPerCell: 10, windupParticles: 6,  hitSec: 0.3,  tailSec: 0.5 },
    morale: { main: [255, 200, 60],  glow: [235, 90, 40],   core: [255, 245, 200], particlesPerCell: 14, windupParticles: 10, hitSec: 0.3,  tailSec: 0.6 },
    stun:   { main: [190, 120, 255], glow: [120, 60, 220],  core: [255, 245, 150], particlesPerCell: 8,  windupParticles: 6,  hitSec: 0.35, tailSec: 0.6 },
});

/** 27 組總配方（第一批 7 組＋第二批 13 組＋第三批 7 組）；第二批的配方另帶 windup／hit 動機 */
export const TACTIC_VFX_RECIPES: Readonly<Record<TacticVfxGroup, TacticVfxRecipe>> = Object.freeze({
    ...BASE_TACTIC_VFX_RECIPES,
    ...EXTRA_TACTIC_VFX_RECIPES,
});

/** 取第二批配方（含動機）；第一批回 null */
export function extraTacticRecipeOf(group: TacticVfxGroup): TacticVfxExtraRecipe | null {
    return isExtraTacticGroup(group) ? EXTRA_TACTIC_VFX_RECIPES[group] : null;
}

/** 全場預算：同時特效記錄數、同時粒子數、單次施放最多播幾格、命中＋餘韻最長秒數 */
export const TACTIC_VFX_BUDGET = Object.freeze({
    maxFx: 14,
    maxParticles: 140,
    maxHitCellsPerCast: 5,
    maxTotalSec: 1.0,
    /** 預算內剩餘粒子低於此數就整個略過（再縮也看不出來） */
    minParticlesPerFx: 4,
});

/** 命中格去重並截到上限；保持輸入順序。純函式。 */
export function capHitCells<T extends { lane: number; depth: number }>(cells: readonly T[], max = TACTIC_VFX_BUDGET.maxHitCellsPerCast): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const cell of cells) {
        const key = `${cell.lane}:${cell.depth}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(cell);
        if (out.length >= max) break;
    }
    return out;
}

/**
 * 預算核可：想放 want 顆粒子，目前已有 activeFx 筆特效、activeParticles 顆粒子。
 * 回傳實際可放的粒子數（0 = 略過）。特效記錄滿了、剩餘粒子不到 minParticlesPerFx 都回 0；否則取 min(want, 剩餘)。
 */
export function grantTacticParticles(want: number, activeFx: number, activeParticles: number): number {
    if (activeFx >= TACTIC_VFX_BUDGET.maxFx) return 0;
    const room = TACTIC_VFX_BUDGET.maxParticles - activeParticles;
    if (room < TACTIC_VFX_BUDGET.minParticlesPerFx) return 0;
    return Math.max(0, Math.min(want, room));
}

/** 命中＋餘韻總秒數（夾在 maxTotalSec 以內） */
export function tacticHitTotalSec(group: TacticVfxGroup): number {
    const r = TACTIC_VFX_RECIPES[group];
    return Math.min(TACTIC_VFX_BUDGET.maxTotalSec, r.hitSec + r.tailSec);
}

/** 量測用（單元測試、QA 探針讀 globalThis.__TACTIC_VFX_STATS__） */
export interface TacticVfxStats {
    /** 各組累計播放次數（前搖＋命中各算一次） */
    played: Record<TacticVfxGroup, number>;
    /** 因預算被略過的次數 */
    skipped: number;
    /** 因預算被縮減粒子的次數 */
    trimmed: number;
    activeFx: number;
    activeParticles: number;
    peakFx: number;
    peakParticles: number;
    /** 目前節點數（固定 1 個 Graphics，不隨特效增加） */
    nodes: number;
}

export function createTacticVfxStats(): TacticVfxStats {
    const played = {} as Record<TacticVfxGroup, number>;
    for (const group of TACTIC_VFX_ALL_GROUPS) played[group] = 0;
    return { played, skipped: 0, trimmed: 0, activeFx: 0, activeParticles: 0, peakFx: 0, peakParticles: 0, nodes: 0 };
}

export const tacticVfxStats: TacticVfxStats = createTacticVfxStats();

/**
 * 一次戰法施放的命中格暫存：BattleSkillExecutor 套用成功後送出受影響的格子，
 * 等蓄力結束（GeneralSkillUsed 呈現）時由畫面層取走。只留最新一筆，沒人取就被下一次覆蓋，不會累積。
 */
export interface PendingTacticHit {
    skillId: string;
    group: TacticVfxGroup;
    cells: { lane: number; depth: number }[];
}

let pendingHit: PendingTacticHit | null = null;

export function setPendingTacticHit(hit: PendingTacticHit | null): void { pendingHit = hit; }

/** 取走與 skillId 相符的暫存命中；不符或沒有回 null。取走後清空。 */
export function takePendingTacticHit(skillId: string): PendingTacticHit | null {
    const hit = pendingHit;
    if (!hit || hit.skillId !== skillId) return null;
    pendingHit = null;
    return hit;
}
