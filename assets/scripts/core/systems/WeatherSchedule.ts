// @spec-source → 戰場適性系統.md §J 戰場環境（BattlefieldEnv.Weather_Schedule：Turn_Start / Turn_End / Weather）；PROG-2-0346（WBS APT-06）
/**
 * WeatherSchedule — 戰場天氣排程（純邏輯，不依賴 cc）
 *
 * 規則：
 *   - 排程條目以回合區間表示，Turn_Start 與 Turn_End 都包含在內（1 起算）。
 *   - 條目不可重疊、不可倒序；回合數必須是正整數。
 *   - 排程沒有涵蓋的回合使用預設天氣（晴）。
 *   - 天氣型別沿用 CommonEnums 的 Weather；規格天氣名與程式 enum 的對應待 PM 裁定。
 *
 * Unity 對照：像 ScriptableObject 的時間表，每回合查一次目前區段，
 * 不去改場景，只回傳「現在是什麼天氣」與「是否剛切換」。
 */
import { Weather } from '../../shared/CommonEnums';

export interface WeatherScheduleEntry {
    /** 起始回合（含） */
    turnStart: number;
    /** 結束回合（含） */
    turnEnd: number;
    weather: Weather;
}

export const DEFAULT_WEATHER = Weather.Clear;

/** 驗證並依回合排序；不合法時拋錯，避免壞資料默默改變戰況 */
export function validateWeatherSchedule(entries: readonly WeatherScheduleEntry[]): WeatherScheduleEntry[] {
    for (const entry of entries) {
        if (!Number.isInteger(entry.turnStart) || !Number.isInteger(entry.turnEnd)) {
            throw new Error('[WeatherSchedule] 回合數必須是整數');
        }
        if (entry.turnStart < 1 || entry.turnEnd < entry.turnStart) {
            throw new Error(`[WeatherSchedule] 回合區間不合法：${entry.turnStart}~${entry.turnEnd}`);
        }
    }
    const sorted = [...entries].sort((a, b) => a.turnStart - b.turnStart);
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].turnStart <= sorted[i - 1].turnEnd) {
            throw new Error(`[WeatherSchedule] 回合區間重疊：${sorted[i - 1].turnStart}~${sorted[i - 1].turnEnd} 與 ${sorted[i].turnStart}~${sorted[i].turnEnd}`);
        }
    }
    return sorted;
}

/** 指定回合的天氣；排程沒有涵蓋時回傳預設天氣 */
export function weatherForTurn(schedule: readonly WeatherScheduleEntry[], turn: number): Weather {
    const hit = schedule.find((entry) => turn >= entry.turnStart && turn <= entry.turnEnd);
    return hit ? hit.weather : DEFAULT_WEATHER;
}

export interface WeatherForecastItem {
    turn: number;
    weather: Weather;
}

/** 從 fromTurn 起往後 count 回合的預報（含 fromTurn）；count 小於 1 時回傳空陣列 */
export function weatherForecast(schedule: readonly WeatherScheduleEntry[], fromTurn: number, count: number): WeatherForecastItem[] {
    const result: WeatherForecastItem[] = [];
    for (let i = 0; i < Math.max(0, Math.floor(count)); i++) {
        const turn = fromTurn + i;
        result.push({ turn, weather: weatherForTurn(schedule, turn) });
    }
    return result;
}

export interface WeatherTransition {
    /** 這一回合的天氣是否與上一回合不同 */
    changed: boolean;
    previous: Weather;
    current: Weather;
}

/**
 * 回合切換判定。第 1 回合沒有上一回合，視為上一回合為預設天氣；
 * 因此排程第 1 回合就是預設天氣時 changed 為 false。
 */
export function detectWeatherTransition(schedule: readonly WeatherScheduleEntry[], turn: number): WeatherTransition {
    const previous = turn <= 1 ? DEFAULT_WEATHER : weatherForTurn(schedule, turn - 1);
    const current = weatherForTurn(schedule, turn);
    return { changed: previous !== current, previous, current };
}
