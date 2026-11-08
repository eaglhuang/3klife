// @spec-source → 子嗣開獎天象與職能宿命分流規格書 (doc_spec_0312) §2~§6（GEN-14，PROG-2-1939）
/**
 * ChildUnveiling — 神祕期天象、5 歲開獎大器晚成、職能宿命四向分流、告別絕筆（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 天象依門檻判定，優先序 紫氣（EP≥85 或帶金因子）> 長星（EP≥75）> 白虎（武或統≥80）> 鹿草（大器晚成胚子）。
 * - 大器晚成：開獎五維最高項 ≤ 30 或宿命選逆天抗命才有資格，再擲骰（基礎 10%，帶天象 35%）；
 *   幼年期成長 ×0.8，滿 25 歲起全五維成長 ×1.5。
 * - 職能四向：出將入相／治國經緯／宗族執事／遊歷隱士，依屬性傾向推薦，福祉照表。
 * - 告別信：榮退（FinalRank ≥ 3）、戰歿、宗祠入祀三種原文。
 *
 * 與既有 SageRemarks 的天象（依季節與種子抽選的演出用）並存；本檔是依資質門檻判定的正式提示。
 * 暫定：開獎典禮 UI、宿命選擇彈窗與福祉實際套用另卡。
 * 暫定（PROG-2-2106）：規格只寫「立春換季時播報」，每年重報同一句會洗版，先定為出生後第一個立春報一次。
 * Unity 對照：像一組 static 規則表 + 查表函式，輸入子嗣資料、輸出顯示用結果。
 */
import { CHILD_STATUS_MYSTERY } from './BreedingSystem';
import type { FactorDictionary } from './FactorInheritance';

export type ChildOmenId = 'OMEN_PURPLE_QI' | 'OMEN_METEOR_DREAM' | 'OMEN_TIGER_ROAR' | 'OMEN_DEER_HERB';
export type CareerFateType = 'Warrior' | 'Scholar' | 'ClanKeeper' | 'Hermit';
export type EpitaphType = 'Retirement' | 'BattleDeath' | 'ClanShrine';

export interface ChildStats {
    str: number;
    int: number;
    lea: number;
    pol: number;
    cha: number;
    luk: number;
}

export const OMEN_PURPLE_QI_MIN_EP = 85;
export const OMEN_METEOR_MIN_EP = 75;
export const OMEN_TIGER_MIN_STAT = 80;
export const LATE_BLOOMER_MAX_TOP_STAT = 30;
export const LATE_BLOOMER_BASE_CHANCE = 0.1;
export const LATE_BLOOMER_OMEN_CHANCE = 0.35;
export const LATE_BLOOMER_CHILD_GROWTH = 0.8;
export const LATE_BLOOMER_ADULT_GROWTH = 1.5;
export const LATE_BLOOMER_ADULT_AGE = 25;
export const RETIREMENT_EPITAPH_MIN_RANK = 3;

export const OMEN_TEXT: Readonly<Record<ChildOmenId, string>> = {
    OMEN_PURPLE_QI: '府邸隱見紫氣東來，名士讚曰：『此麒麟兒也！』',
    OMEN_METEOR_DREAM: '夜有長星墜入中庭，幼子啼聲宏亮如鐘。',
    OMEN_TIGER_ROAR: '幼子周歲獨取佩劍，風嘯庭除有白虎隱現。',
    OMEN_DEER_HERB: '名士撫鬚良久：『雖然眼下頑鈍，然眼中似有異光…』',
};

export interface CareerFateBuff {
    label: string;
    /** 出征名聲加成比例 */
    expeditionFame?: number;
    /** 開局自帶戰法階數 */
    startingTechniqueTier?: number;
    /** 領地商業農業效益加成比例 */
    domesticYield?: number;
    /** 家族聲望累積加成比例 */
    clanFame?: number;
    /** 結緣受孕率加成比例 */
    conceptionRate?: number;
    /** 精力上限加值 */
    vitalityCap?: number;
    /** 大器晚成機率倍率 */
    lateBloomerChanceMultiplier?: number;
}

export const CAREER_FATE_BUFFS: Readonly<Record<CareerFateType, CareerFateBuff>> = {
    Warrior: { label: '出將入相', expeditionFame: 0.2, startingTechniqueTier: 1 },
    Scholar: { label: '治國經緯', domesticYield: 0.2 },
    ClanKeeper: { label: '宗族執事', clanFame: 0.15, conceptionRate: 0.1 },
    Hermit: { label: '遊歷隱士', vitalityCap: 15, lateBloomerChanceMultiplier: 2 },
};

export const EPITAPH_TEXT: Readonly<Record<EpitaphType, string>> = {
    Retirement: '主公明鑑：老夫披甲四十年，幸不辱命。殘軀漸老，花甲自退，當歸故里教導宗族子嗣。先祖之威名，必由後生續寫。伏維主公保重千金之軀，老夫拜謝！',
    BattleDeath: '主公！陣前死戰，男兒本色。恨不能隨主公廓清寰宇！末將先去九泉為我軍開道，家族子嗣，懇請主公好生看顧…來世，誓再為主公執韁策馬！',
    ClanShrine: '形骸雖逝，魂魄依舊護佑宗門。凡我血胤子弟，入學受業、登壇拜將之時，老夫必化身靈感戰法，於九天之上長相守望！',
};

function topFiveStat(s: Readonly<ChildStats>): number {
    return Math.max(s.str, s.int, s.lea, s.pol, s.cha);
}

/** 是否具大器晚成資格（尚未擲骰）。 */
export function isLateBloomerCandidate(stats: Readonly<ChildStats>, choseDefiance: boolean): boolean {
    return choseDefiance || topFiveStat(stats) <= LATE_BLOOMER_MAX_TOP_STAT;
}

/** 神祕期天象：依門檻與優先序挑一個；都不符回 null。 */
export function pickChildOmen(
    potentialEp: number, hasGoldFactor: boolean, stats: Readonly<ChildStats>, lateBloomerCandidate: boolean,
): ChildOmenId | null {
    if (potentialEp >= OMEN_PURPLE_QI_MIN_EP || hasGoldFactor) return 'OMEN_PURPLE_QI';
    if (potentialEp >= OMEN_METEOR_MIN_EP) return 'OMEN_METEOR_DREAM';
    if (stats.str >= OMEN_TIGER_MIN_STAT || stats.lea >= OMEN_TIGER_MIN_STAT) return 'OMEN_TIGER_ROAR';
    if (lateBloomerCandidate) return 'OMEN_DEER_HERB';
    return null;
}

/** 只報一次：出生到滿 1 歲之間一定會碰到一次立春 */
export const OMEN_REPORT_MAX_AGE = 1;

export interface OmenChild extends Partial<ChildStats> {
    id: string;
    name?: string;
    age?: number;
    status?: string;
    ep?: number;
    stats?: Partial<ChildStats>;
    genes?: readonly { id?: string }[];
}

export interface ChildOmenNotice {
    readonly childId: string;
    readonly omenId: ChildOmenId;
    readonly line: string;
}

function omenStats(child: OmenChild): ChildStats {
    const read = (key: keyof ChildStats) => child[key] ?? child.stats?.[key] ?? 0;
    return { str: read('str'), int: read('int'), lea: read('lea'), pol: read('pol'), cha: read('cha'), luk: read('luk') };
}

/** 立春時要播報天象的子嗣：神祕期、未滿 OMEN_REPORT_MAX_AGE 歲、且有符合門檻的天象。 */
export function dueChildOmens(roster: readonly OmenChild[], dictionary?: FactorDictionary | null): ChildOmenNotice[] {
    const notices: ChildOmenNotice[] = [];
    for (const child of roster) {
        if (child.status !== CHILD_STATUS_MYSTERY || (child.age ?? Infinity) > OMEN_REPORT_MAX_AGE) continue;
        const stats = omenStats(child);
        const hasGold = (child.genes ?? []).some((gene) => gene.id !== undefined && dictionary?.get(gene.id)?.color === 'gold');
        const omenId = pickChildOmen(child.ep ?? 0, hasGold, stats, isLateBloomerCandidate(stats, false));
        if (omenId) notices.push({ childId: child.id, omenId, line: `${child.name ?? child.id}：${OMEN_TEXT[omenId]}` });
    }
    return notices;
}

/** 大器晚成擲骰：需有資格；帶天象 35%、否則 10%，可再乘宿命倍率。random 回傳 [0,1)。 */
export function rollLateBloomer(
    candidate: boolean, hasOmen: boolean, random: () => number, chanceMultiplier = 1,
): boolean {
    if (!candidate) return false;
    const chance = (hasOmen ? LATE_BLOOMER_OMEN_CHANCE : LATE_BLOOMER_BASE_CHANCE) * Math.max(0, chanceMultiplier);
    const r = random();
    return Number.isFinite(r) && r < Math.min(1, chance);
}

/** 大器晚成成長倍率：未滿 25 歲 ×0.8，滿 25 歲起 ×1.5；非大器晚成 ×1。 */
export function lateBloomerGrowthMultiplier(isLateBloomer: boolean, age: number): number {
    if (!isLateBloomer) return 1;
    return age >= LATE_BLOOMER_ADULT_AGE ? LATE_BLOOMER_ADULT_GROWTH : LATE_BLOOMER_CHILD_GROWTH;
}

/** 依屬性傾向推薦職能宿命；抗命或大器晚成者推薦隱士。 */
export function recommendCareerFate(stats: Readonly<ChildStats>, isLateBloomer: boolean): CareerFateType {
    if (isLateBloomer) return 'Hermit';
    const martial = Math.max(stats.str, stats.lea);
    const civil = Math.max(stats.pol, stats.int);
    const clan = Math.max(stats.cha, stats.luk);
    const best = Math.max(martial, civil, clan);
    if (best <= LATE_BLOOMER_MAX_TOP_STAT) return 'Hermit';
    if (best === martial) return 'Warrior';
    if (best === civil) return 'Scholar';
    return 'ClanKeeper';
}

/** 告別信類型：戰歿 > 老死入祀 > 榮退（FinalRank ≥ 3）；不符回 null。 */
export function epitaphTypeFor(cause: 'retire' | 'battle' | 'natural', finalRank: number): EpitaphType | null {
    if (cause === 'battle') return 'BattleDeath';
    if (cause === 'natural') return 'ClanShrine';
    return finalRank >= RETIREMENT_EPITAPH_MIN_RANK ? 'Retirement' : null;
}
