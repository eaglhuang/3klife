// @spec-source → 戰場適性系統.md §L 季節天氣機率、§M 劇情關固定天氣；PROG-2-9735
/**
 * BattleWeatherRoll — 戰場天氣抽取（純邏輯，不依賴 cc）
 *
 * 規則（使用者 19 點裁決）：
 *   1. 關卡（encounter）的 weather 欄位有值就固定使用（劇情關照劇本，例：赤壁東風 WINDY）；
 *      有 weatherSchedule 的關卡也視為劇本指定，不抽。
 *   2. 沒有值才依「季節權重表」抽一種；NIGHT 不進隨機池（randomExcluded），只能由劇本指定。
 *   3. 沒有季節資料（表缺、季節不在表內、權重全 0）時回晴天。
 *   4. 整場天氣固定，抽完不再中途切換；只有天氣道具能覆寫 3 回合（WeatherItem.ts）。
 *
 * 亂數可注入（rng 回傳 [0,1)），測試與取證用固定種子；正式流程用「年-季-關卡」當種子，
 * 讓戰前顯示與開戰讀到同一個結果，不必另外暫存。
 *
 * 季節來源：core/systems/GameClock.ts 的 GameTimeState.currentSeason（1~4）。
 * Unity 對照：像 ScriptableObject 權重表加一個 WeightedRandom.Pick(rng)。
 */
import { Weather, normalizeWeather } from '../../shared/CommonEnums';
import { DEFAULT_WEATHER, type WeatherScheduleEntry } from './WeatherSchedule';

/** battle-weather-season.json 的形狀 */
export interface BattleWeatherSeasonTable {
    version: number;
    defaultWeather?: string;
    /** 不進隨機池的天氣代碼（預設只有 NIGHT） */
    randomExcluded?: readonly string[];
    seasons: Readonly<Record<string, { label?: string; weights: Readonly<Record<string, number>> }>>;
}

/** 抽取時只看關卡的這兩個欄位 */
export interface WeatherRollEncounter {
    weather?: Weather | string | null;
    weatherSchedule?: readonly WeatherScheduleEntry[] | null;
}

/** 結果來源：fixed＝關卡指定；season＝依季節抽；default＝沒季節資料退回晴天 */
export type BattleWeatherSource = 'fixed' | 'season' | 'default';

export interface BattleWeatherRollResult {
    weather: Weather;
    source: BattleWeatherSource;
}

export interface BattleWeatherRollInput {
    /** 季（1~4），來自 GameClock.currentSeason；沒有時視為沒有季節資料 */
    season: number | null | undefined;
    encounter?: WeatherRollEncounter | null;
    table?: BattleWeatherSeasonTable | null;
    /** 回傳 [0,1) 的亂數；沒給時用 Math.random */
    rng?: () => number;
}

const VALID_CODES: readonly string[] = Object.values(Weather);
const FALLBACK_EXCLUDED: readonly string[] = [Weather.Night];

/** 驗證權重表；資料壞掉就拋錯，不默默改變抽取結果（與 validateWeatherSchedule 同風格） */
export function validateBattleWeatherSeasonTable(table: BattleWeatherSeasonTable): BattleWeatherSeasonTable {
    const excluded = table.randomExcluded ?? FALLBACK_EXCLUDED;
    for (const code of excluded) {
        if (!VALID_CODES.includes(code)) throw new Error(`[BattleWeatherRoll] randomExcluded 含不認得的天氣代碼：${code}`);
    }
    if (!excluded.includes(Weather.Night)) throw new Error('[BattleWeatherRoll] NIGHT 必須在 randomExcluded（只能由劇本指定）');
    for (const [season, entry] of Object.entries(table.seasons ?? {})) {
        if (!/^[1-4]$/.test(season)) throw new Error(`[BattleWeatherRoll] 季節鍵必須是 1~4：${season}`);
        let total = 0;
        for (const [code, weight] of Object.entries(entry.weights ?? {})) {
            if (!VALID_CODES.includes(code)) throw new Error(`[BattleWeatherRoll] 季 ${season} 含不認得的天氣代碼：${code}`);
            if (excluded.includes(code)) throw new Error(`[BattleWeatherRoll] 季 ${season} 的 ${code} 不可進隨機池`);
            if (!Number.isFinite(weight) || weight < 0) throw new Error(`[BattleWeatherRoll] 季 ${season} 的 ${code} 權重不合法：${weight}`);
            total += weight;
        }
        if (total <= 0) throw new Error(`[BattleWeatherRoll] 季 ${season} 權重總和必須大於 0`);
    }
    return table;
}

/** 關卡是否由劇本指定天氣（weather 欄位認得、或有排程） */
export function isScriptedWeather(encounter: WeatherRollEncounter | null | undefined): boolean {
    if (!encounter) return false;
    if (encounter.weatherSchedule && encounter.weatherSchedule.length > 0) return true;
    return normalizeWeather(encounter.weather) !== null;
}

function defaultOf(table: BattleWeatherSeasonTable | null | undefined): Weather {
    return normalizeWeather(table?.defaultWeather) ?? DEFAULT_WEATHER;
}

/** 依權重表抽天氣；候選依 Weather enum 順序排列，結果只取決於權重與亂數 */
function pickWeighted(weights: Readonly<Record<string, number>>, excluded: readonly string[], roll: number): Weather | null {
    const candidates = VALID_CODES.filter((code) => !excluded.includes(code) && (weights[code] ?? 0) > 0);
    const total = candidates.reduce((sum, code) => sum + weights[code], 0);
    if (total <= 0) return null;
    let cursor = Math.min(Math.max(roll, 0), 0.999999999) * total;
    for (const code of candidates) {
        cursor -= weights[code];
        if (cursor < 0) return code as Weather;
    }
    return candidates[candidates.length - 1] as Weather;
}

/** 抽出本場天氣：劇情固定優先，其次季節權重，最後晴天 */
export function rollBattleWeather(input: BattleWeatherRollInput): BattleWeatherRollResult {
    const { encounter, table } = input;
    if (isScriptedWeather(encounter)) {
        return { weather: normalizeWeather(encounter?.weather) ?? defaultOf(table), source: 'fixed' };
    }
    const entry = table && input.season != null ? table.seasons[String(input.season)] : undefined;
    if (!table || !entry) return { weather: defaultOf(table), source: 'default' };
    const rng = input.rng ?? Math.random;
    const picked = pickWeighted(entry.weights, table.randomExcluded ?? FALLBACK_EXCLUDED, rng());
    return picked ? { weather: picked, source: 'season' } : { weather: defaultOf(table), source: 'default' };
}

/** 字串轉 32 位元種子（FNV-1a） */
export function hashWeatherSeed(text: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/** 固定種子亂數（mulberry32），回傳 [0,1)；供正式流程的「年-季-關卡」種子與取證抽樣 */
export function createSeededRng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** 正式流程用：同一年同一季同一關永遠抽到同一種，戰前顯示與開戰一致 */
export function seasonWeatherSeed(year: number, season: number, encounterId: string): number {
    return hashWeatherSeed(`${year}-${season}-${encounterId}`);
}
