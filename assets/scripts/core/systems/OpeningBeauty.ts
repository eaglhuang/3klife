// @spec-source → 新手開場規格書.md 第四幕「紅顏登場」、§8 紅顏與支援卡規格
/**
 * OpeningBeauty — 開局紅顏：從紅顏池（gacha-config 的 support-pool）抽 1 位，轉成可入名冊的武將 id。純 TS，不依賴 cc。
 *
 * 為什麼要有：六位初始名將全是男性，開局結緣沒有母方，新玩家卡住；規格本來就安排紅顏作為血統定錨。
 * 紅顏池的 candidateIds 是支援卡 id，有幾位和武將 id 拼法不同，這裡統一轉換。
 * 只收資料表裡存在、性別為女的武將；一個都找不到時回 null（開局照常，只是沒有紅顏）。
 *
 * Unity 對照：像開局時從另一個 ScriptableObject 池子抽一張「新手禮」，抽到後放進玩家的角色清單。
 */
import type { GachaConfig } from '../models/GachaConfig';
import type { GeneralConfig } from '../models/GeneralUnit';

export const OPENING_BEAUTY_POOL_ID = 'support-pool';

/** 支援卡 id → 武將 id（同名者不列） */
export const SUPPORT_CARD_GENERAL_IDS: Readonly<Record<string, string>> = {
    'zhen-mi': 'zhen-ji',
    'huang-yueying': 'huang-yue-ying',
    'cai-wenji': 'cai-yan',
};

const isFemale = (general: GeneralConfig): boolean => /^(女|female|f)$/i.test(String(general.gender ?? ''));

/** 紅顏池中能入名冊的武將 id（依池內順序、去重） */
export function openingBeautyCandidates(pool: Readonly<GachaConfig> | undefined, generals: readonly GeneralConfig[]): string[] {
    const ids = (pool?.candidateIds ?? []).map((id) => SUPPORT_CARD_GENERAL_IDS[id] ?? id);
    return Array.from(new Set(ids)).filter((id) => {
        const general = generals.find((g) => g.id === id);
        return !!general && isFemale(general);
    });
}

/** 從紅顏池抽 1 位；random 回傳 [0, 1)。沒有可用人選時回 null。 */
export function rollOpeningBeauty(
    pool: Readonly<GachaConfig> | undefined,
    generals: readonly GeneralConfig[],
    random: () => number,
): string | null {
    const candidates = openingBeautyCandidates(pool, generals);
    if (candidates.length === 0) return null;
    const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
    return candidates[index];
}
