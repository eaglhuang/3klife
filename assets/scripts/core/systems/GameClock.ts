// @spec-source → 遊戲時間系統.md (doc_spec_0034) §A / §E / §F / §I
/**
 * GameClock — 季度制遊戲時鐘（純邏輯，不依賴 cc）
 *
 * 規格重點：
 * - 1 季 = 遊戲最小時間單位，4 季 = 1 年
 * - 三大模式以季為單位輪轉：治理 → 作戰 → 培育
 * - 每次推進回傳結算結果，由上層（GameSession）決定要觸發哪些系統
 *
 * Unity 對照：像一個不繼承 MonoBehaviour 的 TimeManager，
 * 由常駐的 GameManager 呼叫 AdvanceSeason()，再把 OnSeasonChanged 廣播出去。
 */

export const SEASONS_PER_YEAR = 4;

/** 季節序號：1 春、2 夏、3 秋、4 冬 */
export type SeasonIndex = 1 | 2 | 3 | 4;

/** 季度輪轉模式（對應規格 Current_Mode） */
export enum GameTimeMode {
    Governance = 'Governance',
    Battle = 'Battle',
    Nurture = 'Nurture',
}

const MODE_ROTATION: readonly GameTimeMode[] = [
    GameTimeMode.Governance,
    GameTimeMode.Battle,
    GameTimeMode.Nurture,
];

/** 可存檔的時鐘狀態（欄位對應規格 §I Game_Time） */
export interface GameTimeState {
    currentYear: number;
    currentSeason: SeasonIndex;
    totalSeasonsElapsed: number;
    currentMode: GameTimeMode;
}

/** 單次推進的結算結果 */
export interface SeasonAdvanceResult {
    previous: GameTimeState;
    current: GameTimeState;
    /** 本次推進是否跨過年末（冬 → 春） */
    yearEnded: boolean;
}

export function createInitialGameTimeState(): GameTimeState {
    return {
        currentYear: 1,
        currentSeason: 1,
        totalSeasonsElapsed: 0,
        currentMode: GameTimeMode.Governance,
    };
}

function isSeasonIndex(value: unknown): value is SeasonIndex {
    return value === 1 || value === 2 || value === 3 || value === 4;
}

function isGameTimeMode(value: unknown): value is GameTimeMode {
    return MODE_ROTATION.includes(value as GameTimeMode);
}

export class GameClock {
    private _state: GameTimeState;

    constructor(initial?: GameTimeState) {
        this._state = initial ? GameClock.normalize(initial) : createInitialGameTimeState();
    }

    /** 取得目前狀態的複本（避免外部直接改寫內部狀態） */
    public get state(): GameTimeState {
        return { ...this._state };
    }

    /**
     * 推進 1 季。
     * 季節 1→2→3→4→1（跨年時年份 +1），模式依 治理→作戰→培育 輪轉。
     */
    public advanceSeason(): SeasonAdvanceResult {
        const previous = this.state;
        const yearEnded = previous.currentSeason === SEASONS_PER_YEAR;
        const nextSeason = (yearEnded ? 1 : previous.currentSeason + 1) as SeasonIndex;
        const modeIndex = MODE_ROTATION.indexOf(previous.currentMode);

        this._state = {
            currentYear: yearEnded ? previous.currentYear + 1 : previous.currentYear,
            currentSeason: nextSeason,
            totalSeasonsElapsed: previous.totalSeasonsElapsed + 1,
            currentMode: MODE_ROTATION[(modeIndex + 1) % MODE_ROTATION.length],
        };

        return { previous, current: this.state, yearEnded };
    }

    /** 從存檔還原；欄位不合法時拋錯（fail-fast，避免壞檔默默覆蓋進度） */
    public restore(state: GameTimeState): void {
        this._state = GameClock.normalize(state);
    }

    public static normalize(state: GameTimeState): GameTimeState {
        if (!state || typeof state !== 'object') {
            throw new Error('[GameClock] 無效的時鐘狀態');
        }
        const { currentYear, currentSeason, totalSeasonsElapsed, currentMode } = state;
        if (!Number.isInteger(currentYear) || currentYear < 1) {
            throw new Error(`[GameClock] currentYear 不合法: ${currentYear}`);
        }
        if (!isSeasonIndex(currentSeason)) {
            throw new Error(`[GameClock] currentSeason 不合法: ${currentSeason}`);
        }
        if (!Number.isInteger(totalSeasonsElapsed) || totalSeasonsElapsed < 0) {
            throw new Error(`[GameClock] totalSeasonsElapsed 不合法: ${totalSeasonsElapsed}`);
        }
        if (!isGameTimeMode(currentMode)) {
            throw new Error(`[GameClock] currentMode 不合法: ${currentMode}`);
        }
        return { currentYear, currentSeason, totalSeasonsElapsed, currentMode };
    }
}
