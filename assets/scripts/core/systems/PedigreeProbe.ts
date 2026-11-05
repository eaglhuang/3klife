// @spec-source → 血統傳承G4百年門閥_開宗立派與天下郡望規格書.md §F-2 Layer 3、血統傳承G3三代深淵_外戚純化與世交合譜規格書.md §C；PROG-2-1832
/**
 * PedigreeProbe — 譜牒密考（純邏輯，不依賴 cc）
 *
 * 花 1 張查券（求籤令）看透一對夫妻：精確多樣性 D、共同祖先、可純化因子、雙親血脈疲勞。
 * 同一對只收一次，結果每次依目前資料重算。
 * 暫定（可逆）：只做 Layer 3 的第二項；50 細箱與隱藏金因子未做，健康底子 m1、m2 尚無資料。
 *
 * Unity 對照：像花一次性道具解鎖某組配對的詳細資料，解鎖清單存進存檔。
 */
import type { KinPurificationTarget } from './KinPurification';

export const PEDIGREE_PROBE_COST = 1;
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

/** 舊檔沒有此欄位；非字串略過 */
export function normalizePedigreeProbes(raw: unknown): string[] {
    return Array.isArray(raw) ? raw.filter((key): key is string => typeof key === 'string') : [];
}
