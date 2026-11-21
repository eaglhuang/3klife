// @spec-source → 家族子嗣與血統總規格書 (doc_spec_1241) 第 3.1 節生成型配偶；PROG-2-9482
/**
 * GeneratedSpouse — 生成型配偶範本（首子系統配偶、媒人說親的民間女子）。
 *
 * 固定種子：同一個 slot 永遠生出同一個人（只看 slot 字串與 EP 範圍，不吃 Math.random、不吃會前進的存檔亂數），
 * 所以讀檔重進、重算都不會變。EP 取 family-config.json 的 generatedSpouseEp；屬性依 EP 比例推出，
 * 偏內政（政治、魅力）、戰力偏低，主要價值是內政與當太守（規格 3.1）。
 * 姓名、立繪等資料待企劃提供，先用暫定姓名池（OPEN：企劃確認）。
 */
import { Faction } from '../config/Constants';
import type { GeneralConfig, GeneralStatsConfig } from '../models/GeneralUnit';
import { deriveUnit } from '../mission/MissionRng';

/** 暫定姓名池：姓、名各取一（企劃待補；固定種子選取） */
const SURNAMES = ['陳', '林', '周', '吳', '蔡', '許', '楊', '趙'] as const;
const GIVEN_NAMES = ['婉', '蘭', '芷', '瑤', '蓮', '嫣', '蕙', '琳'] as const;

/** 生成型配偶的年齡（成年、可上場）；暫定 */
export const GENERATED_SPOUSE_AGE = 20;

/** 各屬性佔 EP 的比例：內政偏高、武力偏低（規格 3.1「戰力偏低，主要價值是內政與當太守」） */
const STAT_RATIO = { str: 0.3, int: 0.7, lea: 0.4, pol: 0.9, cha: 0.8 } as const;

function pick<T>(list: readonly T[], unit: number): T {
    return list[Math.min(list.length - 1, Math.floor(unit * list.length))];
}

export interface GeneratedSpouseInput {
    /** 固定種子來源，例如 'first-child'、'matchmaker:y3:1'；同 slot 永遠同一人 */
    slot: string;
    /** family-config.json 的 generatedSpouseEp（[下限, 上限]） */
    epRange: readonly [number, number];
}

/** 生成配偶武將；id 由 slot 推出，重複呼叫得到同一份資料 */
export function buildGeneratedSpouse(input: GeneratedSpouseInput): GeneralConfig {
    const [lo, hi] = input.epRange;
    const unit = (purpose: string): number => deriveUnit(0, input.slot, purpose);
    const ep = Math.round(lo + (hi - lo) * unit('ep'));
    const stat = (ratio: number): number => Math.max(1, Math.round(ep * ratio));
    const stats: GeneralStatsConfig = {
        str: stat(STAT_RATIO.str), int: stat(STAT_RATIO.int), lea: stat(STAT_RATIO.lea),
        pol: stat(STAT_RATIO.pol), cha: stat(STAT_RATIO.cha), luk: stat(0.5),
    };
    const hp = Math.max(1, Math.round(ep * 1.5));
    return {
        id: `spouse_gen_${input.slot.replace(/[^A-Za-z0-9_-]/g, '_')}`,
        name: `${pick(SURNAMES, unit('surname'))}${pick(GIVEN_NAMES, unit('given'))}`,
        faction: Faction.Player,
        gender: '女',
        age: GENERATED_SPOUSE_AGE,
        hp,
        currentHp: hp,
        ...stats,
        stats,
        ep,
        source: 'generated-spouse',
    };
}
