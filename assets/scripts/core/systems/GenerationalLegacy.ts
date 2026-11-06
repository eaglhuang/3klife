// @spec-source → 世代功業傳承與退役教官轉化功能規格書.md (doc_spec_0310) §2.1、§4、§5；PROG-2-1906
/**
 * GenerationalLegacy — 先祖教官傳承萃取與雙柱血脈共鳴（純邏輯，不依賴 cc）。
 *
 * - 退役教官卡（MentorCard）已由 LegacyService 產生；這裡只從卡上的武將快照萃取
 *   「傳奇教官」培育效果：固有靈感戰法、門風特質種子、五維支援加成、先祖起始羈絆。
 * - 雙柱血脈共鳴：父系、母系主因子組合命中表格，雙親親密度與天命 EP 達標時解鎖複合雙奧義。
 *
 * - 入學時以 attachLegacySupport 把先祖加成與特質種子掛到學府快照，總控訓練與弱冠禮會讀取（PROG-2-1908）。
 *
 * 門閥聲望／家族階層與現有 ClanTier 四階制不同，退役年齡也與壽命系統（65）不同，本卡不碰，待裁決。
 *
 * Unity 對照：像一個 Factory 從存檔快照組出 ScriptableObject 傳承卡，外加一張配方表查詢。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import type { MentorCard } from '../models/MentorCard';
import { EssayCardCategory, type YingchuanMentorDef } from './nurture/YingchuanAcademy';
import type { AcademyStateSnapshot } from './nurture/AcademyTypes';

export type LegacyStatKey = 'str' | 'int' | 'lea' | 'pol' | 'cha';
const LEGACY_STATS: readonly LegacyStatKey[] = ['str', 'int', 'lea', 'pol', 'cha'];

/** 規格 §2.1 與 §5 的數字 */
export const LEGACY_TUNING = {
    topStatBonusPct: 20,
    secondStatBonusPct: 15,
    ancestralBond: 50,
    traitSeedPct: 60,
    dualPillarAffinityMin: 80,
    dualPillarEpMin: 85,
} as const;

export interface ILegendaryMentorCard {
    mentorId: string;
    sourceGeneralUid: string;
    generalName: string;
    finalRank: number;
    /** 固有靈感戰法；羈絆滿 100 時 100% 領悟 */
    inherentTacticId: string | null;
    /** 門風特質種子；期中考評或弱冠禮 60% 列入候選 */
    inherentTraitId: string | null;
    /** 退役時最高兩項五維的訓練加成（%） */
    statBonusPct: Partial<Record<LegacyStatKey, number>>;
    /** 起始羈絆：嫡系血親 50，否則 0 */
    initialAffinity: number;
}

export interface LegacyExtractOptions {
    /** 子嗣是否為該武將的嫡系血親 */
    isBloodline: boolean;
    /** 指定傳授戰法（例如使用頻率最高者）；未給時取已學戰法第一個 */
    tacticId?: string;
    /** 指定門風特質；未給時取核心特質標籤 */
    traitId?: string;
}

function statOf(g: GeneralConfig, key: LegacyStatKey): number {
    const v = (g as unknown as Record<string, unknown>)[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** 五維最高兩項（同分依 str→int→lea→pol→cha 順序） */
export function topTwoLegacyStats(g: GeneralConfig): [LegacyStatKey, LegacyStatKey] {
    const sorted = LEGACY_STATS.map((k, i) => ({ k, i, v: statOf(g, k) })).sort((a, b) => b.v - a.v || a.i - b.i);
    return [sorted[0].k, sorted[1].k];
}

/** 從退役教官卡萃取傳奇教官效果（TC-LEGACY-01） */
export function extractLegendaryMentor(card: Readonly<MentorCard>, opts: LegacyExtractOptions): ILegendaryMentorCard {
    const g = card.generalSnapshot;
    const [first, second] = topTwoLegacyStats(g);
    const tactic = opts.tacticId ?? g.learnedTactics?.[0] ?? null;
    return {
        mentorId: `MENTOR_ANCESTOR_${card.sourceGeneralId}`,
        sourceGeneralUid: card.sourceGeneralId,
        generalName: `${card.name}（先祖）`,
        finalRank: g.generalRank ?? 0,
        inherentTacticId: tactic || null,
        inherentTraitId: opts.traitId ?? g.coreFactorTag ?? null,
        statBonusPct: { [first]: LEGACY_TUNING.topStatBonusPct, [second]: LEGACY_TUNING.secondStatBonusPct },
        initialAffinity: opts.isBloodline ? LEGACY_TUNING.ancestralBond : 0,
    };
}

/** 最高屬性對應的策論系別（暫定：智→天時、政→地利、魅→人和、武統→天時） */
const STAT_CATEGORY: Record<LegacyStatKey, EssayCardCategory> = {
    str: EssayCardCategory.SKY,
    int: EssayCardCategory.SKY,
    lea: EssayCardCategory.SKY,
    pol: EssayCardCategory.EARTH,
    cha: EssayCardCategory.PEOPLE,
};

/** 轉成潁川書院可指派的教官；沒有傳授戰法時回傳 null */
export function legendaryMentorToYingchuan(mentor: Readonly<ILegendaryMentorCard>): YingchuanMentorDef | null {
    if (!mentor.inherentTacticId) return null;
    const top = (Object.keys(mentor.statBonusPct) as LegacyStatKey[])
        .sort((a, b) => (mentor.statBonusPct[b] ?? 0) - (mentor.statBonusPct[a] ?? 0))[0] ?? 'int';
    return {
        generalId: mentor.mentorId,
        name: mentor.generalName,
        category: STAT_CATEGORY[top],
        signatureTactic: mentor.inherentTacticId,
        initialBond: mentor.initialAffinity,
    };
}

/** 學府訓練時的傳承加成：該屬性有加成就乘上去（四捨五入） */
export function applyLegacyTrainBonus(baseGain: number, stat: string, mentor: Readonly<ILegendaryMentorCard>): number {
    const pct = mentor.statBonusPct[stat as LegacyStatKey] ?? 0;
    return Math.round(baseGain * (100 + pct) / 100);
}

/** 雙柱共鳴配方（§4.1 表格）；因子不分父母順序 */
export interface DualPillarRecipe {
    factors: readonly [string, string];
    ultimateId: string;
    name: string;
}

export const DUAL_PILLAR_RECIPES: readonly DualPillarRecipe[] = [
    { factors: ['龍膽', '神算'], ultimateId: 'ULT_QIXING_LONGDAN_PO', name: '七星龍膽破' },
    { factors: ['武聖', '王佐'], ultimateId: 'ULT_QINGLONG_ZHENGUO_CE', name: '青龍鎮國策' },
    { factors: ['霸王', '周郎火攻'], ultimateId: 'ULT_CHIBI_BAWANG_LIEYAN', name: '赤壁霸王烈焰' },
];

export interface DualPillarInput {
    paternalFactor: string;
    maternalFactor: string;
    /** 父系、母系家族親密度 */
    paternalAffinity: number;
    maternalAffinity: number;
    ep: number;
}

/** 5 歲開獎時判定雙柱血脈共鳴（TC-LEGACY-03）；未觸發回傳 null */
export function resolveDualPillarResonance(input: Readonly<DualPillarInput>): DualPillarRecipe | null {
    const t = LEGACY_TUNING;
    if (input.paternalAffinity < t.dualPillarAffinityMin || input.maternalAffinity < t.dualPillarAffinityMin) return null;
    if (input.ep < t.dualPillarEpMin) return null;
    return DUAL_PILLAR_RECIPES.find((r) =>
        (r.factors[0] === input.paternalFactor && r.factors[1] === input.maternalFactor)
        || (r.factors[1] === input.paternalFactor && r.factors[0] === input.maternalFactor)) ?? null;
}

/** 入學第 1 回合行動前掛上先祖傳承支援；同屬性取最高加成，特質種子去重。輸入快照不會被改動 */
export function attachLegacySupport(state: AcademyStateSnapshot, mentors: readonly ILegendaryMentorCard[]): AcademyStateSnapshot {
    if (state.currentTurn !== 1 || state.stepIndex !== 0) throw new Error('先祖傳承只能在入學第 1 回合行動前掛上');
    const statBonusPct: Partial<Record<LegacyStatKey, number>> = {};
    const traitSeeds: string[] = [];
    for (const m of mentors) {
        for (const key of Object.keys(m.statBonusPct) as LegacyStatKey[]) {
            statBonusPct[key] = Math.max(statBonusPct[key] ?? 0, m.statBonusPct[key] ?? 0);
        }
        if (m.inherentTraitId && traitSeeds.indexOf(m.inherentTraitId) < 0) traitSeeds.push(m.inherentTraitId);
    }
    const next = JSON.parse(JSON.stringify(state)) as AcademyStateSnapshot;
    next.legacySupport = { statBonusPct, traitSeeds };
    return next;
}

/**
 * 祠堂軍功聲望（doc_spec_0310 §3；PROG-2-1910）。
 * 與 ClanTier（血統譜牒 0~3 階）雙軌並存，互不覆蓋：這裡只看歷代武將一生的功業。
 */
export const CLAN_PRESTIGE_GAIN = { perFinalRank: 500, perKill: 50, perWin: 100 } as const;
/** Lv.1 鄉野寒門 → Lv.5 百年門閥 的累積聲望門檻 */
export const CLAN_PRESTIGE_THRESHOLDS: readonly number[] = [0, 1500, 4500, 10000, 25000];
export const CLAN_PRESTIGE_TIER_NAMES: readonly string[] = ['鄉野寒門', '鄉梓郡望', '州郡望族', '名門世家', '百年門閥'];

export interface PrestigeCareer {
    finalRank: number;
    totalKills: number;
    totalWins: number;
}

function nonNegInt(v: number): number {
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/** 一位武將退役時帶回祠堂的聲望 */
export function calculatePrestigeGain(career: Readonly<PrestigeCareer>): number {
    return nonNegInt(career.finalRank) * CLAN_PRESTIGE_GAIN.perFinalRank
        + nonNegInt(career.totalKills) * CLAN_PRESTIGE_GAIN.perKill
        + nonNegInt(career.totalWins) * CLAN_PRESTIGE_GAIN.perWin;
}

/** 累積聲望對應的祠堂等級 1~5 */
export function clanPrestigeTierOf(prestige: number): number {
    let tier = 1;
    for (let i = 0; i < CLAN_PRESTIGE_THRESHOLDS.length; i++) {
        if (prestige >= CLAN_PRESTIGE_THRESHOLDS[i]) tier = i + 1;
    }
    return tier;
}
