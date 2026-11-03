// @spec-source → AI武將強度系統.md (doc_data_0002) §E-9 Phase 1~3：他國逐將季推進重算（PROG-2-1713）
/**
 * RivalOfficerSeason — 他國名冊的每季重算（純邏輯，不依賴 cc）
 *
 * - Phase 1：年齡 +0.25；精力回復「待命」比例，上限 100 × 難度縮放。
 * - Phase 2：1~3★ 虎符每季累積經驗自動升星；依適性重新分配虎符，一將一符。
 * - Phase 3：屬性依難度／章節／年齡縮放，算特殊兵種戰力與總戰力，加總為國家軍力。
 *
 * 暫定（可逆）：
 * - 規格未給 AI_TALLY_EXP_PER_TURN，暫取 50（R 卡約 9 季升滿 3★）。
 * - 4~5★ 精華突破略過（他國尚無精華存量）。
 * - 名冊沒有運勢，LUK 以 0 計；沒有戰法與轉生，總戰力不含這兩項。
 * - 換裝排序：適性高者優先，同適性比屬性修正，再同則留給原持有者、最後依名冊順序。
 *
 * Unity 對照：像回合結束時 AI 陣營的 System 批次更新所有 Unit 的 Stats Component。
 */
import { aiAgeStageOf, aiStatOf, aiVitalityOf } from './AiStatScaling';
import { aiGeneralStatBonus, aiSpecialTroopPower, evaluateAiPower, type AiGeneralStats } from './AiPowerEvaluation';
import { BATTLE_POWER_CONSTANTS, type AptitudeGrade } from './BattlePowerRating';
import { VITALITY_RECOVER_STANDBY } from './BattleRoster';
import { BATTLE_GROWTH_STAR_LIMIT, QUALITY_STAR_CAP, TALLY_STAR_EXP } from './TigerTallyStar';
import type { AiTroopCode } from './AiProfiles';
import type { RivalNationRoster, RivalOfficer, RivalTally } from './RivalOfficers';

/** 每季年齡增量（規格 1a） */
export const RIVAL_AGE_PER_SEASON = 0.25;
/** 每季虎符經驗（規格 AI_TALLY_EXP_PER_TURN 未定值，暫定） */
export const AI_TALLY_EXP_PER_TURN = 50;

/** 名冊兵種字串 → AI 兵種代碼 */
export const RIVAL_TROOP_CODE: Readonly<Record<string, AiTroopCode>> = Object.freeze({
    cavalry: 'CAVALRY',
    infantry: 'INFANTRY',
    shield: 'SHIELD',
    pikeman: 'PIKE',
    archer: 'ARCHER',
    siege: 'SIEGE',
    navy: 'NAVY',
});

const APTITUDE_RANK: Readonly<Record<AptitudeGrade, number>> = { S: 4, A: 3, B: 2, C: 1, D: 0 };
const DEFAULT_APTITUDE: AptitudeGrade = 'B';

export interface RivalSeasonContext {
    readonly difficulty: { readonly statScale: number };
    readonly chapter: number;
    /** 武將對兵種的適性；缺值視為 B */
    readonly aptitudeOf?: (generalId: string, troopType: string) => AptitudeGrade | null | undefined;
}

export interface RivalPowerContext extends RivalSeasonContext {
    /** 兵種基礎攻防（troops.json）；查不到時該虎符不計特殊兵種戰力 */
    readonly troopStatsOf: (troopType: string) => { readonly attack: number; readonly defense: number } | null | undefined;
}

export interface RivalOfficerPower {
    readonly generalId: string;
    readonly tallyId: string | null;
    readonly totalPower: number;
}

export interface RivalNationPower {
    readonly officers: readonly RivalOfficerPower[];
    readonly militaryIndex: number;
}

/** Phase 1 年齡＋精力 */
export function advanceRivalOfficer(officer: RivalOfficer, ctx: RivalSeasonContext): RivalOfficer {
    const cap = aiVitalityOf(ctx.difficulty);
    const recovered = officer.vitality + Math.floor(cap * VITALITY_RECOVER_STANDBY);
    return {
        ...officer,
        age: officer.age + RIVAL_AGE_PER_SEASON,
        vitality: Math.min(cap, recovered),
    };
}

/** Phase 2a：1~3★ 累積經驗升星；已達品質上限或 3★ 以上不動 */
export function advanceRivalTallyStar(tally: RivalTally): RivalTally {
    const cap = Math.min(QUALITY_STAR_CAP[tally.quality] ?? BATTLE_GROWTH_STAR_LIMIT, BATTLE_GROWTH_STAR_LIMIT);
    if (tally.star >= cap) return tally;
    const exp = tally.starExp + AI_TALLY_EXP_PER_TURN;
    const need = TALLY_STAR_EXP[tally.star + 1];
    if (need !== undefined && exp >= need) return { ...tally, star: tally.star + 1, starExp: 0 };
    return { ...tally, starExp: exp };
}

/** 屬性依難度／章節／年齡縮放 */
export function rivalScaledStats(officer: RivalOfficer, ctx: RivalSeasonContext): AiGeneralStats {
    const stage = aiAgeStageOf(officer.age);
    const s = officer.baseStats;
    const scale = (v: number) => aiStatOf(v, ctx.difficulty, ctx.chapter, stage);
    return { STR: scale(s.str), INT: scale(s.int), LEA: scale(s.lea), POL: scale(s.pol), CHA: scale(s.cha), LUK: 0 };
}

function aptitudeFor(ctx: RivalSeasonContext, generalId: string, troopType: string): AptitudeGrade {
    return ctx.aptitudeOf?.(generalId, troopType) ?? DEFAULT_APTITUDE;
}

function troopCodeOf(troopType: string): AiTroopCode {
    return RIVAL_TROOP_CODE[troopType] ?? 'INFANTRY';
}

/** Phase 2b：依適性重新分配虎符（高品質、高星先挑），一將最多一符 */
export function reassignRivalTallies(
    officers: readonly RivalOfficer[],
    tallies: readonly RivalTally[],
    ctx: RivalSeasonContext,
): RivalTally[] {
    const order = tallies
        .map((t, i) => ({ t, i }))
        .sort((a, b) =>
            BATTLE_POWER_CONSTANTS.TALLY_QUALITY_MOD[b.t.quality] - BATTLE_POWER_CONSTANTS.TALLY_QUALITY_MOD[a.t.quality]
            || b.t.star - a.t.star
            || a.i - b.i);
    const stats = new Map(officers.map((o) => [o.generalId, rivalScaledStats(o, ctx)]));
    const used = new Set<string>();
    const result: RivalTally[] = tallies.slice();
    for (const { t, i } of order) {
        const code = troopCodeOf(t.troopType);
        let best: RivalOfficer | null = null;
        let bestKey: [number, number, number] | null = null;
        for (const o of officers) {
            if (used.has(o.generalId)) continue;
            const key: [number, number, number] = [
                APTITUDE_RANK[aptitudeFor(ctx, o.generalId, t.troopType)],
                aiGeneralStatBonus(stats.get(o.generalId)!, code),
                o.generalId === t.equippedGeneralId ? 1 : 0,
            ];
            if (!bestKey || key[0] > bestKey[0]
                || (key[0] === bestKey[0] && (key[1] > bestKey[1] || (key[1] === bestKey[1] && key[2] > bestKey[2])))) {
                best = o;
                bestKey = key;
            }
        }
        if (best) used.add(best.generalId);
        const nextId = best ? best.generalId : null;
        result[i] = nextId === t.equippedGeneralId ? t : { ...t, equippedGeneralId: nextId };
    }
    return result;
}

/** Phase 1 + 2：推進一季 */
export function advanceRivalRoster(roster: RivalNationRoster, ctx: RivalSeasonContext): RivalNationRoster {
    const officers = roster.officers.map((o) => advanceRivalOfficer(o, ctx));
    const starred = roster.tallies.map(advanceRivalTallyStar);
    return { officers, tallies: reassignRivalTallies(officers, starred, ctx) };
}

/** Phase 3 + 4：逐將總戰力與國家軍力 */
export function evaluateRivalRoster(roster: RivalNationRoster, ctx: RivalPowerContext): RivalNationPower {
    const tallyOf = new Map<string, RivalTally>();
    for (const t of roster.tallies) if (t.equippedGeneralId) tallyOf.set(t.equippedGeneralId, t);
    const officers = roster.officers.map((o): RivalOfficerPower => {
        const stats = rivalScaledStats(o, ctx);
        const tally = tallyOf.get(o.generalId) ?? null;
        const troop = tally ? ctx.troopStatsOf(tally.troopType) : null;
        const specialTroop = tally && troop
            ? aiSpecialTroopPower({
                stats,
                baseType: troopCodeOf(tally.troopType),
                aptitude: aptitudeFor(ctx, o.generalId, tally.troopType),
                troopAttack: troop.attack,
                troopDefense: troop.defense,
                quality: tally.quality,
                star: tally.star,
                resonance: false,
            })
            : null;
        const totalPower = evaluateAiPower({
            stats,
            specialTroop,
            tacticTpCosts: [],
            reincarnation: 0,
            agePhase: aiAgeStageOf(o.age),
        });
        return { generalId: o.generalId, tallyId: tally ? tally.id : null, totalPower };
    });
    return { officers, militaryIndex: officers.reduce((sum, o) => sum + o.totalPower, 0) };
}
