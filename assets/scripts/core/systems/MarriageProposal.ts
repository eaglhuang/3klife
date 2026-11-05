// @spec-source → 血統傳承G4百年門閥_開宗立派與天下郡望規格書.md §E #4（天下求親市場）；PROG-2-1811
/**
 * MarriageProposal — 名門上門提親（純邏輯，不依賴 cc）
 *
 * 門第達郡望以上時，每年一筆提親：對方家族、對象、聘禮都在擲出時定好並寫進存檔，
 * 讀檔後再看到的是同一筆。玩家應允時對象才進名冊。
 * 暫定（可逆）：規格沒給家族名單、對象能力與聘禮，這裡都是暫定值。
 *
 * Unity 對照：像一筆排程好的 ScriptableObject 事件資料，UI 只讀，回覆後清掉。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import { BREEDING_MIN_AGE, epRatingLabel, isFemale, type BreedingGeneral } from './BreedingSystem';
import type { ClanTier } from './ClanTier';
import { matchRumorLine, sameSurnameNote } from './MatchRumor';
import { isYuedanCandidate } from './YuedanReview';

export const MARRIAGE_MARKET_MIN_TIER: ClanTier = 2;

/** [郡望, 姓] */
const PROPOSAL_FAMILIES: ReadonlyArray<readonly [string, string]> = Object.freeze([
    ['太原', '王'], ['清河', '崔'], ['范陽', '盧'], ['滎陽', '鄭'],
    ['弘農', '楊'], ['潁川', '荀'], ['河東', '裴'], ['吳郡', '陸'],
]);
const GIVEN_NAMES: Readonly<Record<'男' | '女', readonly string[]>> = Object.freeze({
    男: Object.freeze(['彥', '衡', '昭', '霖', '謙', '朗']),
    女: Object.freeze(['蘭', '婉', '瑤', '芷', '嫻', '容']),
});

interface SuitorProfile {
    giftGold: number;
    min: number;
    max: number;
    ep: number;
}

const PROFILE_BY_TIER: Readonly<Record<number, SuitorProfile>> = Object.freeze({
    2: { giftGold: 500, min: 50, max: 75, ep: 60 },
    3: { giftGold: 1000, min: 60, max: 85, ep: 70 },
});

const SUITOR_MAX_EXTRA_AGE = 6;
const SUITOR_HP = 1000;

export interface MarriageSuitor {
    name: string;
    gender: '男' | '女';
    age: number;
    str: number;
    int: number;
    lea: number;
    pol: number;
    cha: number;
    luk: number;
    ep: number;
}

export interface MarriageProposal {
    id: string;
    targetId: string;
    targetName: string;
    /** 例如「太原王」，句子裡接「氏」 */
    family: string;
    giftGold: number;
    suitor: MarriageSuitor;
}

/** 提親對象：族中適齡未婚的子嗣，EP 高者優先 */
export function marriageTargetOf(roster: readonly GeneralConfig[]): GeneralConfig | null {
    const pool = (roster as readonly BreedingGeneral[]).filter((g) => isYuedanCandidate(g) && (!!g.fatherId || !!g.motherId));
    pool.sort((a, b) => (b.ep ?? 0) - (a.ep ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return pool[0] ?? null;
}

/** 門第不足或族中沒有適齡子嗣時回傳 null */
export function rollMarriageProposal(roster: readonly GeneralConfig[], tier: ClanTier, id: string, random: () => number): MarriageProposal | null {
    if (tier < MARRIAGE_MARKET_MIN_TIER) return null;
    const target = marriageTargetOf(roster);
    if (!target) return null;
    const profile = PROFILE_BY_TIER[tier];
    const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
    const roll = (min: number, max: number): number => min + Math.floor(random() * (max - min + 1));
    const stat = (): number => roll(profile.min, profile.max);
    const [commandery, surname] = pick(PROPOSAL_FAMILIES);
    const gender: '男' | '女' = isFemale(target) ? '男' : '女';
    return {
        id,
        targetId: target.id,
        targetName: target.name,
        family: `${commandery}${surname}`,
        giftGold: profile.giftGold,
        suitor: {
            name: `${surname}${pick(GIVEN_NAMES[gender])}`,
            gender,
            age: roll(BREEDING_MIN_AGE, BREEDING_MIN_AGE + SUITOR_MAX_EXTRA_AGE),
            str: stat(), int: stat(), lea: stat(), pol: stat(), cha: stat(), luk: stat(),
            ep: profile.ep,
        },
    };
}

/** 應允後進名冊的武將；因子還沒給，見任務卡 */
export function buildSuitorGeneral(proposal: MarriageProposal): GeneralConfig {
    const { name, gender, age, ep, ...stats } = proposal.suitor;
    return {
        id: proposal.id,
        name,
        familyUid: proposal.family,
        faction: 'player',
        gender,
        age,
        status: 'Active',
        role: 'Combat',
        hp: SUITOR_HP,
        currentHp: SUITOR_HP,
        ...stats,
        stats,
        ep,
        epRating: epRatingLabel(ep),
        rarityTier: 'rare',
        genes: [],
        hiddenFlags: [],
    } as unknown as GeneralConfig;
}

export function marriageProposalLine(proposal: MarriageProposal): string {
    return `${proposal.family}氏遣媒人攜重禮上門，願以${proposal.suitor.name}與${proposal.targetName}結親。`;
}

/** 只用鄉評公開的資訊（G4 §F-2 Layer 1） */
export function marriageSuitorLine(proposal: MarriageProposal): string {
    const { suitor, targetName } = proposal;
    const surname = sameSurnameNote(suitor.name, targetName);
    return [`${suitor.name}，${suitor.age} 歲`, matchRumorLine(suitor), ...(surname ? [surname] : [])].join('｜');
}

/** 女方嫁入、男方入贅 */
export function marriageAcceptLabel(proposal: MarriageProposal): string {
    return `應允：${proposal.suitor.name}${proposal.suitor.gender === '女' ? '嫁入' : '入贅'}我門`;
}

const isStat = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** 舊檔沒有此欄位；欄位不齊的提親視同沒有 */
export function normalizeMarriageProposal(raw: unknown): MarriageProposal | null {
    const value = raw as Partial<MarriageProposal> | null | undefined;
    const suitor = value?.suitor;
    if (!value || !suitor || typeof value.id !== 'string' || typeof value.targetId !== 'string') return null;
    if (typeof value.targetName !== 'string' || typeof value.family !== 'string' || !isStat(value.giftGold)) return null;
    if (typeof suitor.name !== 'string' || (suitor.gender !== '男' && suitor.gender !== '女')) return null;
    const numbers = [suitor.age, suitor.str, suitor.int, suitor.lea, suitor.pol, suitor.cha, suitor.luk, suitor.ep];
    if (!numbers.every(isStat)) return null;
    return { id: value.id, targetId: value.targetId, targetName: value.targetName, family: value.family, giftGold: value.giftGold, suitor: { ...suitor } };
}
