// @spec-source → 血統傳承G4百年門閥_開宗立派與天下郡望規格書.md §F-2 Layer 3、血統傳承G3三代深淵_外戚純化與世交合譜規格書.md §C；PROG-2-1832
/**
 * PedigreeProbe — 譜牒密考（純邏輯，不依賴 cc）
 *
 * 花 1 張查券（求籤令）看透一對夫妻：精確多樣性 D、共同祖先、可純化因子、雙親血脈疲勞。
 * 同一對只收一次，結果每次依目前資料重算。
 * 另花 2 券查隱藏血脈（PROG-2-1833）：雙親還看不到或未覺醒的家傳金因子，以及這對所生子嗣會帶的隔代種子。
 * 另花 1 券查單維細箱（PROG-2-1834）：指定人選的指定一維落在哪個細箱。
 * 暫定（可逆）：健康底子 m1、m2 尚無資料；隔代種子看的是子嗣，雙親自己的種子只在他們培育時有用。
 * 規格的細箱寬 50 是 0～2000 的刻度，現有五維約 0～100，換算 2.5 不好讀，這裡用寬 5。
 * 規格同列的單維星數與上限 m 沒做：藍因子目前沒有對應哪一維的資料。
 *
 * Unity 對照：像花一次性道具解鎖某組配對的詳細資料，解鎖清單存進存檔。
 */
import type { AncestralPeak, GeneralGeneConfig } from '../models/GeneralUnit';
import { CUSTOM_GOLD_ID_PREFIX } from './CustomGoldFactor';
import { factorMaskView } from './FactorMask';
import type { KinPurificationTarget } from './KinPurification';
import { rumorRouteName, type RumorStatKey, type RumorStats } from './MatchRumor';

export const PEDIGREE_PROBE_COST = 1;
export const HIDDEN_LINEAGE_COST = 2;
export const STAT_PROBE_COST = 1;
const STAT_BOX_WIDTH = 5;
/** 雙重表親可達十幾位，全列會把後面的可純化因子擠掉 */
const MAX_LISTED_ANCESTORS = 6;

export interface PedigreeProbeReport {
    diversity: number;
    ancestorNames: string[];
    targets: KinPurificationTarget[];
    fatherFatigue: number;
    motherFatigue: number;
}

export function pedigreeProbeKey(fatherId: string, motherId: string): string {
    return `${fatherId}__${motherId}`;
}

export function pedigreeProbeLine(report: PedigreeProbeReport): string {
    const names = report.ancestorNames;
    const ancestors = names.length === 0 ? '無' : names.slice(0, MAX_LISTED_ANCESTORS).join('、') + (names.length > MAX_LISTED_ANCESTORS ? ` 等 ${names.length} 位` : '');
    const targets = report.targets.map((target) => `${target.gene.displayName ?? target.gene.id}（${target.ancestorName}）`).join('、') || '無';
    return `譜牒密考：多樣性 ${report.diversity.toFixed(2)}｜共祖 ${ancestors}｜可純化 ${targets}｜血脈疲勞 父 ${report.fatherFatigue}／母 ${report.motherFatigue}`;
}

export interface HiddenLineageReport {
    fatherGolds: GeneralGeneConfig[];
    motherGolds: GeneralGeneConfig[];
    /** 這對所生子嗣出生時會帶的隔代種子 */
    childSeeds: AncestralPeak[];
}

/** 家傳金因子裡，玩家等級還看不到、或還沒覺醒的 */
export function hiddenGoldsOf(genes: readonly GeneralGeneConfig[] | undefined, playerLevel: number): GeneralGeneConfig[] {
    return (genes ?? []).filter((gene) => {
        if (!(gene.id ?? '').startsWith(CUSTOM_GOLD_ID_PREFIX) && gene.type !== 'gold') return false;
        return !factorMaskView(gene, playerLevel).revealed || gene.isLocked === true;
    });
}

export function hiddenLineageLine(report: HiddenLineageReport): string {
    const golds = (genes: GeneralGeneConfig[]): string => genes.map((gene) => gene.displayName ?? gene.id).join('、') || '無';
    const seeds = report.childSeeds.map((seed) => `${seed.gene.displayName ?? seed.gene.id} ${seed.gene.level ?? 0}★（${seed.ancestorName}）`).join('、') || '無';
    return `隱藏血脈：金因子 父 ${golds(report.fatherGolds)}／母 ${golds(report.motherGolds)}｜子嗣隔代種子 ${seeds}`;
}

export function statProbeKey(generalId: string, stat: RumorStatKey): string {
    return `${generalId}__${stat}`;
}

export function statBoxLabel(value: number): string {
    const low = Math.floor(value / STAT_BOX_WIDTH) * STAT_BOX_WIDTH;
    return `${low}–${low + STAT_BOX_WIDTH - 1}`;
}

export interface StatProbeSide {
    name: string;
    stats: RumorStats;
    probed: boolean;
}

export function statProbeLine(stat: RumorStatKey, ...sides: readonly StatProbeSide[]): string {
    const parts = sides.map((side) => `${side.name} ${side.probed ? statBoxLabel(side.stats[stat] ?? 0) : '未查'}`);
    return `${rumorRouteName(stat)}細箱：${parts.join('｜')}`;
}

/** 舊檔沒有此欄位；非字串略過 */
export function normalizePedigreeProbes(raw: unknown): string[] {
    return Array.isArray(raw) ? raw.filter((key): key is string => typeof key === 'string') : [];
}
