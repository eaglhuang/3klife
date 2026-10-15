// @spec-source → 新手開場規格書.md §6、§7.2、§8
import type { GeneralConfig } from '../models/GeneralUnit';

export const STARTER_GENERAL_IDS = ['zhang-fei', 'wei-yan', 'xiahou-dun', 'zhang-he', 'sun-ce', 'gan-ning'] as const;
export type StarterGeneralId = typeof STARTER_GENERAL_IDS[number];
/** 預設核心（沒指定時）：張飛是真實資料中六人唯一 legendary(SSR)，保留原數值與因子。 */
export const STARTER_CORE_GENERAL_ID: StarterGeneralId = 'zhang-fei';
export interface StarterRosterOptions { coreGeneralId?: StarterGeneralId }

function copyValue<T>(value: T): T {
    if (Array.isArray(value)) return value.map(item => copyValue(item)) as T;
    if (value !== null && typeof value === 'object') {
        const copy: Record<string, unknown> = {};
        for (const key of Object.keys(value)) copy[key] = copyValue((value as Record<string, unknown>)[key]);
        return copy as T;
    }
    return value;
}

/** 只選資料表既有角色並深複製；缺角色／必要欄位時報錯，不補數字、因子或祖先。 */
export function buildStarterRoster(generals: readonly GeneralConfig[], options: StarterRosterOptions = {}): GeneralConfig[] {
    const coreId = options.coreGeneralId ?? STARTER_CORE_GENERAL_ID;
    if (!STARTER_GENERAL_IDS.some(id => id === coreId)) throw new Error('[StarterRoster] 核心主將不在六位初始名將內');
    const roster = STARTER_GENERAL_IDS.map(id => {
        const matches = generals.filter(general => general.id === id);
        if (matches.length !== 1) throw new Error(`[StarterRoster] ${id} 必須有唯一資料，實際 ${matches.length} 筆`);
        const general = matches[0];
        for (const key of ['ep', 'str', 'int', 'lea', 'pol', 'cha'] as const) {
            if (typeof general[key] !== 'number' || !Number.isFinite(general[key])) throw new Error(`[StarterRoster] ${id} 缺有效 ${key}`);
        }
        if (!general.rarityTier || !general.characterCategory || !Array.isArray(general.genes)) throw new Error(`[StarterRoster] ${id} 缺 rarityTier／characterCategory／genes`);
        return copyValue(general);
    });
    const core = roster.find(general => general.id === coreId)!;
    // 規格（新手開場 §6）：宿命轉蛋從這六位挑，玩家選誰誰就是核心（SSR 或等級等效的「初始優勢」由開場給，不看資料表分級）。
    // 原本要求 core 必須 legendary/mythic，結果六人只有張飛能當核心，其他五位鎖定後開新局報錯；2026-10-15 放寬。
    return roster;
}
