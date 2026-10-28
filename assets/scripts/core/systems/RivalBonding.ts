// @spec-source → 治理模式他國AI系統.md (doc_spec_0020) E-7 AI 武將經營（招募與結緣）（PROG-2-1507，RAI-08 最小切片）
/**
 * RivalBonding — 他國武將的待命池（roster）與結緣配對（純邏輯，不依賴 cc）
 *
 * 規格（E-7）：每次招募產生一名武將；糧 > 2000 且有可配對武將時自動結緣。
 *
 * 暫定（可逆）：
 * - 配對依品質（S > A > B > C），同品質取先招募者；因子互補延後（AI 武將尚無因子資料）。
 * - 結緣不扣糧（規格未寫成本）；每季最多配一對。
 * - roster 與 bonds 無上限。
 *
 * Unity 對照：像一個 Pool 加一個 Pairing System，每幀從池子取兩個配成一組，組合存進紀錄。
 */
import type { RecruitQuality } from './RivalGovernance';

/** E-7 結緣門檻：糧草大於此值才會結緣 */
export const BOND_FOOD_GATE = 2000;

export interface AiGeneral {
    readonly id: string;
    readonly quality: RecruitQuality;
    readonly recruitedSeason: number;
}

export interface BondPair {
    readonly first: string;
    readonly second: string;
    readonly season: number;
}

const QUALITY_RANK: Readonly<Record<RecruitQuality, number>> = Object.freeze({ S: 3, A: 2, B: 1, C: 0 });

/** 配對順序：品質高者先，同品質取先招募者，再依 id 固定順序 */
function bondOrder(a: AiGeneral, b: AiGeneral): number {
    return QUALITY_RANK[b.quality] - QUALITY_RANK[a.quality]
        || a.recruitedSeason - b.recruitedSeason
        || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** 從待命池選出最適合的一對；人數不足兩人回傳 null */
export function pickBondPair(roster: readonly AiGeneral[]): readonly [AiGeneral, AiGeneral] | null {
    if (roster.length < 2) return null;
    const [first, second] = roster.slice().sort(bondOrder);
    return [first, second];
}

/** 季推進結緣步驟：糧不足或人數不足時原樣回傳；成功則兩人離開待命池、記入 bonds。不改輸入。 */
export function bondStep(
    roster: readonly AiGeneral[],
    bonds: readonly BondPair[],
    food: number,
    season: number,
): { readonly roster: readonly AiGeneral[]; readonly bonds: readonly BondPair[] } {
    const pair = food > BOND_FOOD_GATE ? pickBondPair(roster) : null;
    if (!pair) return { roster, bonds };
    const [a, b] = pair;
    return {
        roster: roster.filter((g) => g.id !== a.id && g.id !== b.id),
        bonds: [...bonds, { first: a.id, second: b.id, season }],
    };
}
