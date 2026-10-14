// @spec-source → 數值系統.md (doc_spec_0016) 精力經濟、武將系統.md (doc_spec_0025) §E #6、培育系統.md (doc_spec_0026) §F-8、MVP遊戲驗證規格書.md (doc_spec_0045) §E
/**
 * BattleRoster — 名冊武將出戰、戰後結算（純邏輯，不依賴 cc）
 *
 * 三段：
 *   1. 資格：checkDeployable()。死亡、退役教官、尚未畢業的子嗣、精力不足、培育中都不能出戰
 *   2. 轉換：buildBattleConfig()。把名冊武將（實力層、因子、戰法）換成戰場用的 GeneralConfig
 *   3. 結算：settleBattle()。精力 -30、戰績與功勳寫回；recoverVitalityOneSeason() 每季回補
 *
 * 全部是純函式，不改傳入物件；GameSession 負責把結果寫回名冊與存檔。
 *
 * Unity 對照：像把玩家的 SaveData 裡的 HeroInstance，轉成戰鬥場景用的 BattleUnitData，
 * 戰鬥結束再用 BattleReport 把結果寫回 HeroInstance（等同 ScriptableObject → Runtime Instance 的來回）。
 */
import { tacticLoadoutCapacity } from './TacticLoadout';
import type { GeneralConfig, GeneralGeneConfig, GeneralStatsConfig, GeneralTacticSlotConfig } from '../models/GeneralUnit';
import { CHILD_STATUS_MYSTERY } from './BreedingSystem';
import { GENERAL_STATUS_DEAD } from './GeneralAging';
import { baseVitalityMaxOf } from './VitalityCap';
import type { NurtureRating } from './NurtureSystem';
import { guardianPowerOf, newlyReachedMilestones, type BattlePerformance } from './BattleRecordStats';
import { isTrialMercenary } from './PrisonerOfWar';

// ── 常數（規格有的標出處；沒有的標「暫定」）────────────────────────────────

/** 戰鬥消耗精力：數值系統「戰鬥 -30」 */
export const BATTLE_VITALITY_COST = 30;
/** 出戰最低精力：至少要付得起戰鬥消耗（暫定，規格未寫門檻） */
export const BATTLE_MIN_VITALITY = BATTLE_VITALITY_COST;
/** 每季自然回補（占精力上限比例）：數值系統「出征 +25%、待命 +50%」 */
/** Q17 採數值系統 Q45 裁決：自然／出征回補 10%、待命 30%，取代舊表 25%／50%。 */
export const VITALITY_RECOVER_DEPLOYED = 0.1;
export const VITALITY_RECOVER_STANDBY = 0.3;

/** 戰場數值 = 實力層 ÷ 2，與畢業評級（PROWESS_PER_RATING_POINT）同一把尺（暫定）：實力層 180 ≈ 戰場 90 */
export const PROWESS_PER_BATTLE_STAT = 2;
/** 戰場血量 = 400 + 武力×3 + 統率×4，讓武力 90 / 統率 85 約等於內建張飛的 1000（暫定） */
export const BATTLE_HP_BASE = 400;
export const BATTLE_HP_PER_STR = 3;
export const BATTLE_HP_PER_LEA = 4;
/** 疲勞：精力比例低於一半時血量打折，最低 ×0.7（暫定） */
export const FATIGUE_THRESHOLD = 0.5;
export const FATIGUE_MIN_HP_FACTOR = 0.7;
/** 每顆已解鎖因子星等 +1% 攻擊加成、上限 +25%；每個負面因子 -2%（暫定） */
export const FACTOR_ATTACK_BONUS_PER_STAR = 0.01;
export const FACTOR_ATTACK_BONUS_CAP = 0.25;
export const NEGATIVE_FACTOR_ATTACK_PENALTY = 0.02;
/** 畢業評級加成：S/A/B/C 對應額外攻擊加成（暫定） */
export const RATING_ATTACK_BONUS: Record<NurtureRating, number> = { S: 0.1, A: 0.06, B: 0.03, C: 0 };
/** 戰場最多帶幾個天賦戰法槽 */
export const BATTLE_TACTIC_SLOT_LIMIT = 4;
/** 功勳：勝 10 / 平 5 / 敗 3（暫定） */
export const BATTLE_MERIT: Record<'win' | 'draw' | 'loss', number> = { win: 10, draw: 5, loss: 3 };

// ── 型別 ───────────────────────────────────────────────────────────────────

/** 戰場結果；與 battle/BattleTypes 的 BattleResult 同形（core 不得 import battle，所以這裡獨立宣告） */
export type BattleResult = 'player-win' | 'enemy-win' | 'draw' | 'ongoing';

export interface BattleRecord {
    wins: number;
    losses: number;
    draws: number;
    /** 累計功勳 */
    merit: number;
    lastBattleSeason?: number;
    /** 以下為武將戰績系統欄位（PROG-2-0072）；舊存檔沒有，讀到時當 0 */
    kills?: number;
    totalDamage?: number;
    /** 守護力 = 承受傷害 + 治療量 */
    guardianPower?: number;
    /** 已達成的里程碑 id（百人斬、不敗神話……） */
    milestones?: string[];
}

/** 戰場整合會讀寫的名冊欄位；比照 BreedingGeneral 以延伸型別承載 */
export type BattleRosterGeneral = GeneralConfig & {
    isMentorCard?: boolean;
    fate?: unknown;
    graduationRating?: NurtureRating;
    prowess?: Partial<Record<'str' | 'int' | 'lea' | 'pol' | 'cha', number>>;
    negativeFactors?: string[];
    battleRecord?: BattleRecord;
    /** 最後一次出戰的季度，供每季回補分辨「出征 / 待命」 */
    lastDeployedSeason?: number;
};

export type DeployBlockReason =
    | 'dead'
    | 'retired-mentor'
    | 'not-graduated'
    | 'low-vitality'
    | 'in-nurture';

export interface DeployCheck {
    eligible: boolean;
    reasons: DeployBlockReason[];
}

export interface DeployOptions {
    /** 正在培育中的子嗣 id（培育期間不能出戰） */
    nurturingIds?: readonly string[];
}

// ── 資格 ───────────────────────────────────────────────────────────────────

function vitalityOf(general: BattleRosterGeneral): number {
    return general.vitality ?? general.maxVitality ?? baseVitalityMaxOf(general.gender);
}

function maxVitalityOf(general: BattleRosterGeneral): number {
    return general.maxVitality ?? general.vitality ?? baseVitalityMaxOf(general.gender);
}

/** 子嗣（有開獎 / 宿命痕跡）必須畢業才能出戰；抽卡來的成年武將沒有這些痕跡，直接可用 */
function isUngraduatedOffspring(general: BattleRosterGeneral): boolean {
    if (general.graduationRating) return false;
    return Boolean(general.fate) || general.status === CHILD_STATUS_MYSTERY || (general.hiddenFlags ?? []).includes('mystery-phase');
}

export function checkDeployable(general: GeneralConfig, options: DeployOptions = {}): DeployCheck {
    const g = general as BattleRosterGeneral;
    const reasons: DeployBlockReason[] = [];
    if (g.status === GENERAL_STATUS_DEAD) reasons.push('dead');
    if (g.isMentorCard) reasons.push('retired-mentor');
    if (isUngraduatedOffspring(g)) reasons.push('not-graduated');
    if (vitalityOf(g) < BATTLE_MIN_VITALITY) reasons.push('low-vitality');
    if (options.nurturingIds?.includes(g.id)) reasons.push('in-nurture');
    return { eligible: reasons.length === 0, reasons };
}

export function listDeployable(roster: readonly GeneralConfig[], options: DeployOptions = {}): GeneralConfig[] {
    return roster.filter((general) => checkDeployable(general, options).eligible);
}

// ── 名冊 → 戰場 ────────────────────────────────────────────────────────────

const BATTLE_STAT_KEYS = ['str', 'int', 'lea', 'pol', 'cha'] as const;

function battleStat(general: BattleRosterGeneral, key: (typeof BATTLE_STAT_KEYS)[number]): number {
    const prowess = general.prowess?.[key];
    if (typeof prowess === 'number') {
        return Math.round(prowess / PROWESS_PER_BATTLE_STAT);
    }
    // 沒有實力層（抽卡來的成年武將）直接用卡面數值
    const direct = general[key] ?? general.stats?.[key as keyof GeneralStatsConfig];
    return typeof direct === 'number' ? direct : 0;
}

function unlockedFactors(general: BattleRosterGeneral): GeneralGeneConfig[] {
    return (general.genes ?? []).filter((gene) => gene.isLocked !== true);
}

/** 因子星等合計 → 攻擊加成；加上畢業評級加成，扣負面因子 */
export function computeAttackBonus(general: GeneralConfig): number {
    const g = general as BattleRosterGeneral;
    const stars = unlockedFactors(g).reduce((sum, gene) => sum + Math.max(0, gene.level ?? 0), 0);
    const factorBonus = Math.min(FACTOR_ATTACK_BONUS_CAP, stars * FACTOR_ATTACK_BONUS_PER_STAR);
    const ratingBonus = g.graduationRating ? RATING_ATTACK_BONUS[g.graduationRating] : 0;
    const penalty = (g.negativeFactors?.length ?? 0) * NEGATIVE_FACTOR_ATTACK_PENALTY;
    const total = (g.attackBonus ?? 0) + factorBonus + ratingBonus - penalty;
    return Math.round(Math.max(0, total) * 1000) / 1000;
}

function buildTacticSlots(general: BattleRosterGeneral): GeneralTacticSlotConfig[] {
    // 槽位上限依智力（規格 §F-7），並不超過全域上限
    const capacity = Math.min(tacticLoadoutCapacity(general.int ?? 0), BATTLE_TACTIC_SLOT_LIMIT);
    if (general.tacticSlots && general.tacticSlots.length > 0) {
        return general.tacticSlots.slice(0, capacity).map((slot) => ({ ...slot }));
    }
    const learned = Array.from(new Set(general.learnedTactics ?? [])).slice(0, capacity);
    return learned.map((tacticId, index) => ({ slotId: `slot-${index + 1}`, tacticId, source: 'learned' as GeneralTacticSlotConfig['source'] }));
}

function fatigueHpFactor(general: BattleRosterGeneral): number {
    const ratio = vitalityOf(general) / Math.max(1, maxVitalityOf(general));
    if (ratio >= FATIGUE_THRESHOLD) return 1;
    return Math.max(FATIGUE_MIN_HP_FACTOR, FATIGUE_MIN_HP_FACTOR + (1 - FATIGUE_MIN_HP_FACTOR) * (ratio / FATIGUE_THRESHOLD));
}

/**
 * 名冊武將 → 戰場用 GeneralConfig。
 * 不檢查資格（由呼叫端先 checkDeployable）；戰場數值取實力層，血量由武力 / 統率推算並受疲勞影響。
 */
export function buildBattleConfig(general: GeneralConfig, faction: GeneralConfig['faction']): GeneralConfig {
    const g = general as BattleRosterGeneral;
    const str = battleStat(g, 'str');
    const intel = battleStat(g, 'int');
    const lea = battleStat(g, 'lea');
    const pol = battleStat(g, 'pol');
    const cha = battleStat(g, 'cha');
    const luk = g.luk ?? g.stats?.luk ?? 0;
    const hp = Math.round((BATTLE_HP_BASE + str * BATTLE_HP_PER_STR + lea * BATTLE_HP_PER_LEA) * fatigueHpFactor(g));
    return {
        ...g,
        faction,
        // 有實力層就用推算血量；沒有（抽卡來的成年武將）沿用卡面血量，同樣吃疲勞折扣
        hp: g.prowess || !(g.hp > 0) ? hp : Math.round(g.hp * fatigueHpFactor(g)),
        str, int: intel, lea, pol, cha, luk,
        attackBonus: computeAttackBonus(g),
        tacticSlots: buildTacticSlots(g),
        // 名冊沒存精力欄位時用性別預設（男 120／女 100）；戰場端不能自己猜 100，否則閘門與戰後結算基準會偏離名冊
        vitality: vitalityOf(g),
        maxVitality: maxVitalityOf(g),
    };
}

// ── 結算 ───────────────────────────────────────────────────────────────────

export type BattleOutcome = 'win' | 'loss' | 'draw';

/** 戰場結果換成出戰方視角；ongoing 不結算 */
export function outcomeOf(result: BattleResult): BattleOutcome | null {
    if (result === 'player-win') return 'win';
    if (result === 'enemy-win') return 'loss';
    if (result === 'draw') return 'draw';
    return null;
}

export interface BattleSettlementEntry {
    generalId: string;
    outcome: BattleOutcome;
    vitalityBefore: number;
    vitalityAfter: number;
    meritGained: number;
    record: BattleRecord;
    /** 本場表現（沒有提供時為 undefined） */
    performance?: BattlePerformance;
    /** 本場新達成的里程碑 id */
    newMilestones: string[];
}

export interface BattleSettlement {
    roster: GeneralConfig[];
    entries: BattleSettlementEntry[];
    /** 要求結算但名冊裡找不到（例如內建 demo 武將）的 id，不報錯、單純略過 */
    skippedIds: string[];
}

export interface SettleBattleRequest {
    deployedIds: readonly string[];
    result: BattleResult;
    season?: number;
    /** 各出戰武將本場表現（擊殺 / 傷害 / 承傷 / 治療）；沒有的武將只記勝敗 */
    performance?: Readonly<Record<string, BattlePerformance>>;
    /** 戰鬥結束時各武將的精力（已扣奧義成本）；有提供時以此為基準再扣 BATTLE_VITALITY_COST，沒有則用名冊值 */
    vitalityAfterBattle?: Readonly<Record<string, number>>;
}

/** 戰後結算：出戰武將扣精力、記戰績與功勳；result 為 ongoing 時原樣回傳 */
export function settleBattle(roster: readonly GeneralConfig[], request: SettleBattleRequest): BattleSettlement {
    const outcome = outcomeOf(request.result);
    if (!outcome) {
        return { roster: roster.map((general) => ({ ...general })), entries: [], skippedIds: [] };
    }
    const ids = new Set(request.deployedIds);
    const found = new Set<string>();
    const entries: BattleSettlementEntry[] = [];
    const next = roster.map((general) => {
        if (!ids.has(general.id)) return { ...general };
        found.add(general.id);
        // 試用傭兵（MERC-06）：出戰不計精力、戰績、功勳，名冊原樣保留
        if (isTrialMercenary(general)) return { ...general };
        const g = general as BattleRosterGeneral;
        const before = request.vitalityAfterBattle?.[g.id] ?? vitalityOf(g);
        const after = Math.max(0, before - BATTLE_VITALITY_COST);
        const previous = g.battleRecord ?? { wins: 0, losses: 0, draws: 0, merit: 0 };
        const merit = BATTLE_MERIT[outcome];
        const performance = request.performance?.[g.id];
        const record: BattleRecord = {
            ...previous,
            wins: previous.wins + (outcome === 'win' ? 1 : 0),
            losses: previous.losses + (outcome === 'loss' ? 1 : 0),
            draws: previous.draws + (outcome === 'draw' ? 1 : 0),
            merit: previous.merit + merit,
            lastBattleSeason: request.season ?? previous.lastBattleSeason,
            kills: (previous.kills ?? 0) + (performance?.kills ?? 0),
            totalDamage: (previous.totalDamage ?? 0) + (performance?.damageDealt ?? 0),
            guardianPower: (previous.guardianPower ?? 0) + (performance ? guardianPowerOf(performance) : 0),
            milestones: [...(previous.milestones ?? [])],
        };
        const newMilestones = newlyReachedMilestones(record);
        record.milestones = [...(record.milestones ?? []), ...newMilestones];
        entries.push({ generalId: g.id, outcome, vitalityBefore: before, vitalityAfter: after, meritGained: merit, record, performance, newMilestones });
        const updated: BattleRosterGeneral = {
            ...g,
            vitality: after,
            maxVitality: maxVitalityOf(g),
            battleRecord: record,
            lastDeployedSeason: request.season ?? g.lastDeployedSeason,
        };
        return updated;
    });
    return { roster: next, entries, skippedIds: [...ids].filter((id) => !found.has(id)) };
}

// ── 每季精力回補 ───────────────────────────────────────────────────────────

/**
 * 每季自然回補：本季出過戰的 +10%、其餘（待命）+30%（皆為精力上限的比例），不超過上限。
 * 死亡武將不回補。endedSeason 是「剛結束的那一季」的累計序號（與 recordBattle 記下的季度同一把尺）。
 */
export function recoverVitalityOneSeason(roster: readonly GeneralConfig[], endedSeason: number): GeneralConfig[] {
    return roster.map((general) => {
        const g = general as BattleRosterGeneral;
        if (g.status === GENERAL_STATUS_DEAD) return { ...g };
        const max = maxVitalityOf(g);
        const current = vitalityOf(g);
        if (current >= max) return { ...g };
        const deployed = g.lastDeployedSeason !== undefined && g.lastDeployedSeason >= endedSeason;
        const rate = deployed ? VITALITY_RECOVER_DEPLOYED : VITALITY_RECOVER_STANDBY;
        return { ...g, vitality: Math.min(max, Math.round(current + max * rate)), maxVitality: max };
    });
}
