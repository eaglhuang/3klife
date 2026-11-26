// @spec-source → 新手開場規格書.md §6、§7.2、§8
import type { GeneralConfig } from '../models/GeneralUnit';
import type { StarterYouthConfig } from './StarterYouthService';
import type { StarterSeedlingConfig } from './StarterSeedlingService';

export const STARTER_GENERAL_IDS = ['zhang-fei', 'wei-yan', 'xiahou-dun', 'zhang-he', 'sun-ce', 'gan-ning'] as const;
export type StarterGeneralId = typeof STARTER_GENERAL_IDS[number];
/** 預設核心（沒指定時）：張飛是真實資料中六人唯一 legendary(SSR)，保留原數值與因子。 */
export const STARTER_CORE_GENERAL_ID: StarterGeneralId = 'zhang-fei';

/**
 * 起始主將挑選（PROG-2-10008／10009）：優先 preferredId（目前主將，須在清單內），其次預設核心（張飛），
 * 最後統率最高者；清單為空回傳 null。清單請傳「可出戰」的武將，主將被派去任務時用來改選替補。
 */
export function pickStartingLead(candidates: readonly GeneralConfig[], preferredId: string | null = null): GeneralConfig | null {
    const preferred = preferredId ? candidates.find((g) => g.id === preferredId) : undefined;
    if (preferred) return preferred;
    const core = candidates.find((g) => g.id === STARTER_CORE_GENERAL_ID);
    if (core) return core;
    const leaOf = (g: GeneralConfig): number => g.lea ?? g.stats?.lea ?? 0;
    let best: GeneralConfig | null = null;
    for (const g of candidates) if (!best || leaOf(g) > leaOf(best)) best = g;
    return best;
}

export interface StarterRosterOptions {
    coreGeneralId?: StarterGeneralId;
    /** 開局紅顏（OpeningBeauty 抽出）：排在六位名將之後入名冊，讓第一次結緣有母方。 */
    beautyGeneralId?: string;
    /** 宿命轉蛋抽到的整包武將；沒給時沿用六位初始名將。必須包含核心主將 */
    rosterIds?: readonly string[];
    /** 開局投靠的 14 歲少年名將（成年版 id，三選一；沒給用設定預設人選；PROG-2-9194） */
    youthGeneralId?: string;
    /** 是否附贈少年名將（預設 true；僅新局流程使用，舊存檔不補送） */
    includeStarterYouth?: boolean;
    /** 覆寫少年名將設定（未提供時用 starter-youth-config.json） */
    starterYouthConfig?: StarterYouthConfig;
    /** 是否附贈 7 歲幼苗（預設 true；僅新局流程使用，舊存檔不補送；PROG-2-10058） */
    includeStarterSeedling?: boolean;
    /** 覆寫幼苗設定（未提供時用 starter-seedling-config.json） */
    starterSeedlingConfig?: StarterSeedlingConfig;
}

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
    const ids: string[] = [...(options.rosterIds ?? STARTER_GENERAL_IDS)];
    if (!ids.includes(coreId)) throw new Error('[StarterRoster] 核心主將不在這次的名冊內');
    if (options.beautyGeneralId && !ids.includes(options.beautyGeneralId)) ids.push(options.beautyGeneralId);
    const roster = ids.map(id => {
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
