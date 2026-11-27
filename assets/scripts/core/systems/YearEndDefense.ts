// @spec-source → 關卡設計系統 shard-a §C-3（年終守城，裁決 86–88）；PROG-2-9426 年終守城流程
/**
 * YearEndDefense — 年終守城的觸發、選檔與來犯敵將（純資料與純函式，不依賴 cc，可直接單元測試）。
 *
 * 使用者 11/20 裁決（年終守城十一題全採建議 A）：
 *   - 玩家按「結束第 4 季」時強制開打；第 4 季那關沒打也照樣守城。
 *   - 敵軍固定三檔，依年度切換（起始年度放 data/year-end-defense.json，暫定第 1／3／5 年）。
 *   - 最強鄰國的主將來攻。
 *   - 不可重打；勝敗都照樣換年。
 *
 * Unity 對照：像一張 ScriptableObject 的年度難度表，加上一個「年末事件是否已處理」的存檔旗標。
 */

import { nationDef, type RivalWorld } from './RivalNations';
import { nationPowerScore } from './RivalRiseFall';

export interface YearEndDefenseTier {
    /** 守城遭遇 id（encounters.json，battleKind 必須是 defense） */
    encounterId: string;
    /** 從第幾年起使用這一檔 */
    fromYear: number;
}

export interface YearEndDefenseConfig {
    /** 依 fromYear 由小到大排序 */
    tiers: readonly YearEndDefenseTier[];
}

export const DEFAULT_YEAR_END_DEFENSE: Readonly<YearEndDefenseConfig> = Object.freeze({
    tiers: Object.freeze([
        Object.freeze({ encounterId: 'defense-tier-1', fromYear: 1 }),
        Object.freeze({ encounterId: 'defense-tier-2', fromYear: 3 }),
        Object.freeze({ encounterId: 'defense-tier-3', fromYear: 5 }),
    ]),
});

/** 年終守城在第幾季結束時觸發 */
export const YEAR_END_DEFENSE_SEASON = 4;

/** 解析設定檔；檔案不合法時整份用預設，不合法的單一檔位略過 */
export function parseYearEndDefenseConfig(raw: unknown): YearEndDefenseConfig {
    const src = (raw && typeof raw === 'object') ? raw as { tiers?: unknown } : {};
    if (!Array.isArray(src.tiers)) return DEFAULT_YEAR_END_DEFENSE;
    const tiers = src.tiers
        .filter((t): t is { encounterId: string; fromYear: number } => !!t && typeof t === 'object'
            && typeof (t as { encounterId?: unknown }).encounterId === 'string' && (t as { encounterId: string }).encounterId.length > 0
            && Number.isInteger((t as { fromYear?: unknown }).fromYear) && (t as { fromYear: number }).fromYear >= 1)
        .map((t) => ({ encounterId: t.encounterId, fromYear: t.fromYear }))
        .sort((a, b) => a.fromYear - b.fromYear);
    return tiers.length > 0 ? { tiers } : DEFAULT_YEAR_END_DEFENSE;
}

/** 這一年用哪一檔（取 fromYear 不超過今年的最後一檔；比第一檔還早時用第一檔） */
export function yearEndDefenseTierFor(year: number, config: Readonly<YearEndDefenseConfig>): YearEndDefenseTier {
    let picked = config.tiers[0];
    for (const tier of config.tiers) {
        if (tier.fromYear <= year) picked = tier;
    }
    return picked;
}

/**
 * 這次按「結束本季」要不要先打年終守城：第 4 季、而且今年還沒守過城。
 * foughtYear 是最近一次打完年終守城的年份（沒打過為 0）。
 */
export function isYearEndDefenseDue(time: { currentYear: number; currentSeason: number }, foughtYear: number): boolean {
    return time.currentSeason === YEAR_END_DEFENSE_SEASON && foughtYear !== time.currentYear;
}

/** 今年的年終守城已經打完、但還停在第 4 季（打完回到大廳要自動換年） */
export function isYearEndRolloverPending(time: { currentYear: number; currentSeason: number }, foughtYear: number): boolean {
    return time.currentSeason === YEAR_END_DEFENSE_SEASON && foughtYear === time.currentYear;
}

/**
 * 守城打完回大廳要自動換年時，必須先補建的背景面板（PROG-2-10163）：
 * 換年會開季報、事件、血統、吃醋、孩子成長與年末典禮，這些沒掛好會被略過；其餘約 60 個面板不必等。
 * id 對應 LobbyScene 背景掛載清單（_deferredMounts）。
 */
export const YEAR_END_RESUME_MOUNT_IDS: readonly string[] = Object.freeze([
    'SeasonReport', 'SeasonEventPopup', 'LineagePopup', 'JealousyPopup', 'ChildGrowthPopup', 'YearEndCeremony', 'YearReport',
]);

export interface YearEndInvader {
    nationId: string;
    nationName: string;
    /** 來犯主將（君主）武將 id */
    generalId: string;
}

/**
 * 最強鄰國與來犯主將：排除已滅亡的勢力；有非同盟勢力時不挑同盟。
 * 國力用他國勢力興衰同一條公式（兵力＋武將數×200＋領地×500）。主將取該國現任君主（rulerIds），沒有就用開局君主。
 * 找不到任何勢力時回傳 null（呼叫端改用遭遇預設的敵將）。
 */
export function strongestInvader(world: RivalWorld, rulerIds: Readonly<Record<string, string>> = {}): YearEndInvader | null {
    const alive = world.nations.filter((n) => !n.fallen);
    const hostile = alive.filter((n) => !n.allied);
    const pool = hostile.length > 0 ? hostile : alive;
    let best: { id: string; score: number } | null = null;
    for (const n of pool) {
        const score = nationPowerScore({
            troops: n.troops,
            generalCount: n.officerRoster?.officers.length ?? 0,
            territories: n.territories,
            fame: 0,
        });
        if (!best || score > best.score) best = { id: n.id, score };
    }
    if (!best) return null;
    const def = nationDef(best.id);
    const generalId = rulerIds[best.id] ?? def?.leaderId;
    if (!generalId) return null;
    return { nationId: best.id, nationName: def?.name ?? best.id, generalId };
}
