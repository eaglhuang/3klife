// @spec-source → 血統傳承G4百年門閥_開宗立派與天下郡望規格書.md §E #3、§F-2 Layer 2、§G、§H UI_G4_YUEDAN_BANNER；PROG-2-1803
/**
 * YuedanReview — 年度月旦評：從適齡未婚者選出前 20%，揭露顯性因子與粗略健康（純邏輯，不依賴 cc）
 *
 * 規格的母體是天下 4,000 名 NPC；婚配池還沒做，暫時傳入名冊，換池時呼叫端改傳來源即可。
 *
 * Unity 對照：像每年跑一次的排行榜 Query，只讀資料、不寫存檔，同樣的名冊一定算出同一張榜。
 */
import type { GeneralConfig, GeneralGeneConfig } from '../models/GeneralUnit';
import { BREEDING_MIN_AGE, statOf } from './BreedingSystem';
import { resolveFactorColor, type FactorDictionary } from './FactorInheritance';
import { GENERAL_STATUS_DEAD } from './GeneralAging';
import { rumorTopTrait } from './MatchRumor';

export const YUEDAN_REVEAL_RATIO = 0.2;
export const YUEDAN_MIN_STAR = 3;
export const YUEDAN_MAX_FACTORS = 2;
const YUEDAN_BANNER_NAMES = 2;
const YUEDAN_REVEAL_COLORS = ['blue', 'red'];

type YuedanGeneral = GeneralConfig & { breedingCount?: number; isMentorCard?: boolean };

/** 粗略健康檔位，只看目前精力占上限的比例 */
const HEALTH_TIERS: ReadonlyArray<readonly [number, string]> = Object.freeze([[0.7, '康健'], [0.4, '尋常']]);
const HEALTH_LOWEST = '孱弱';

/** 適齡未婚：還活著、不是教官卡、滿結緣年齡、還沒有親傳紀錄 */
export function isYuedanCandidate(general: YuedanGeneral): boolean {
    return (general.status ?? '').toLowerCase() !== GENERAL_STATUS_DEAD
        && !general.isMentorCard
        && (general.age ?? 0) >= BREEDING_MIN_AGE
        && (general.breedingCount ?? 0) === 0;
}

/** 當代前 20%（至少 1 位），EP 高者在前；同分比 id，結果不受名冊順序影響 */
export function yuedanList<T extends YuedanGeneral>(generals: readonly T[]): T[] {
    const pool = generals.filter(isYuedanCandidate);
    if (pool.length === 0) return [];
    return pool
        .sort((a, b) => (b.ep ?? 0) - (a.ep ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .slice(0, Math.ceil(pool.length * YUEDAN_REVEAL_RATIO));
}

function factorNameOf(gene: GeneralGeneConfig, dictionary?: FactorDictionary): string | null {
    return gene.displayName ?? (gene.id ? dictionary?.get(gene.id)?.displayName : undefined) ?? null;
}

/** 1～2 項 3★ 以上的藍／紅因子，星高者在前 */
export function yuedanFactors(general: GeneralConfig, dictionary?: FactorDictionary): string[] {
    return (general.genes ?? [])
        .filter((gene) => (gene.level ?? 0) >= YUEDAN_MIN_STAR
            && !!gene.id
            && YUEDAN_REVEAL_COLORS.indexOf(resolveFactorColor(gene.id, dictionary, gene) ?? '') >= 0
            && !!factorNameOf(gene, dictionary))
        .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))
        .slice(0, YUEDAN_MAX_FACTORS)
        .map((gene) => `${factorNameOf(gene, dictionary)} ${gene.level}★`);
}

export function yuedanHealthTier(general: GeneralConfig): string {
    const max = general.maxVitality ?? general.vitality ?? 0;
    const ratio = max > 0 ? (general.vitality ?? max) / max : 0;
    return HEALTH_TIERS.find(([min]) => ratio >= min)?.[1] ?? HEALTH_LOWEST;
}

/** 結緣畫面上榜者的揭露行；榜上沒有 3★ 以上因子時不編造內容 */
export function yuedanRevealLine(general: GeneralConfig, dictionary?: FactorDictionary): string {
    const factors = yuedanFactors(general, dictionary);
    return `月旦評：${factors.length > 0 ? factors.join('、') : '榜上有名'}｜${yuedanHealthTier(general)}`;
}

/** §G 放榜句＋§H UI_G4_YUEDAN_BANNER；說親名冊篩選還沒做，句尾改成查看；榜上沒人時不放榜 */
export function yuedanBannerLines(generals: readonly GeneralConfig[]): string[] {
    const list = yuedanList(generals);
    if (list.length === 0) return [];
    const names = list.slice(0, YUEDAN_BANNER_NAMES).map((general) => `${general.name}【${rumorTopTrait({
        str: statOf(general, 'str'),
        int: statOf(general, 'int'),
        lea: statOf(general, 'lea'),
        pol: statOf(general, 'pol'),
        cha: statOf(general, 'cha'),
    })}】`);
    return [
        `滾滾長江東逝水，且看今歲【月旦評】天下俊彥榜！${names.join('、')}，皆一時之選也！`,
        `【今歲月旦評】名士品評已揭曉當代 ${list.length} 位青年才俊之顯性天賦，可於結緣畫面查看！`,
    ];
}
