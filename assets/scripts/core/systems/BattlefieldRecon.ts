// @spec-source → 戰場適性系統.md §J 名詞定義「環境偵察」、§J BattlefieldEnv（Terrain_Grid / Weather_Schedule）；PROG-2-0402（WBS APT-12）
/**
 * BattlefieldRecon — 出戰前環境偵察（純邏輯，不依賴 cc）
 *
 * 規則：
 *   - 地形沒有資料時視為整片平原，與 BattleState.reset 的預設一致。
 *   - 天氣預報從第 1 回合起算，沿用 WeatherSchedule 的 weatherForecast。
 *   - 預報回合數預設 RECON_FORECAST_TURNS（暫定 5，規格未定）。
 *
 * Unity 對照：像出征前的沙盤 ScriptableObject，只整理資料給面板讀，不改戰場狀態。
 */
import { GAME_CONFIG } from '../config/Constants';
import { normalizeWeather, TerrainType, Weather, type TerrainGrid } from '../../shared/CommonEnums';
import { weatherForecast, type WeatherForecastItem, type WeatherScheduleEntry } from './WeatherSchedule';

/** 預報回合數（暫定，規格未定） */
export const RECON_FORECAST_TURNS = 5;

export interface BattlefieldReconTerrain {
    lanes: number;
    depth: number;
    /** 地形格，依 [lane][depth] 排列；複本，不與來源共用 */
    grid: TerrainType[][];
    /** 每種地形的格數；所有地形型別都會有鍵，沒出現的為 0 */
    counts: Record<TerrainType, number>;
}

export interface BattlefieldReconWeather {
    /** 第 1 回合起的預報（長度 = forecastTurns） */
    forecast: WeatherForecastItem[];
    /** 預報中天氣改變的回合（不含第 1 回合本身） */
    changes: WeatherForecastItem[];
}

export interface BattlefieldRecon {
    terrain: BattlefieldReconTerrain;
    weather: BattlefieldReconWeather;
}

export interface BuildBattlefieldReconOptions {
    /** 地形格；沒有就視為整片平原 */
    terrain?: TerrainGrid;
    /** 天氣排程；沒有就整場晴天 */
    schedule?: readonly WeatherScheduleEntry[];
    /** 預報回合數，預設 RECON_FORECAST_TURNS */
    forecastTurns?: number;
}

function emptyCounts(): Record<TerrainType, number> {
    const counts = {} as Record<TerrainType, number>;
    for (const type of Object.values(TerrainType)) counts[type] = 0;
    return counts;
}

function buildTerrain(terrain: TerrainGrid | undefined): BattlefieldReconTerrain {
    const lanes = terrain?.length ?? GAME_CONFIG.GRID_LANES;
    const depth = terrain?.[0]?.length ?? GAME_CONFIG.GRID_DEPTH;
    const grid: TerrainType[][] = [];
    const counts = emptyCounts();
    for (let lane = 0; lane < lanes; lane++) {
        const row: TerrainType[] = [];
        for (let d = 0; d < depth; d++) {
            const type = terrain?.[lane]?.[d] ?? TerrainType.Plain;
            row.push(type);
            counts[type] += 1;
        }
        grid.push(row);
    }
    return { lanes, depth, grid, counts };
}

function buildWeather(schedule: readonly WeatherScheduleEntry[], forecastTurns: number): BattlefieldReconWeather {
    const forecast = weatherForecast(schedule, 1, forecastTurns);
    const changes: WeatherForecastItem[] = [];
    for (let i = 1; i < forecast.length; i++) {
        if (forecast[i].weather !== forecast[i - 1].weather) changes.push(forecast[i]);
    }
    return { forecast, changes };
}

/** 組出出戰前環境偵察資料；純函式，不改來源陣列 */
export function buildBattlefieldRecon(options: BuildBattlefieldReconOptions = {}): BattlefieldRecon {
    const forecastTurns = Math.max(0, Math.floor(options.forecastTurns ?? RECON_FORECAST_TURNS));
    return {
        terrain: buildTerrain(options.terrain),
        weather: buildWeather(options.schedule ?? [], forecastTurns),
    };
}

/** 關卡資料的最小形狀（EncounterConfig 的子集），讓偵察不依賴 UI 或載入流程 */
export interface BattlefieldReconEncounter {
    terrain?: TerrainGrid;
    /** 固定天氣（encounters.json 的 weather）；沒有排程時整段使用這個天氣 */
    weather?: string;
    /** 天氣排程；有值時優先於固定天氣 */
    weatherSchedule?: readonly WeatherScheduleEntry[];
}

/**
 * 依關卡資料組出偵察結果（PROG-2-0405）。
 * 沒有排程時，預報範圍內整段使用關卡的固定天氣，與戰場開戰時的行為一致（BattleController.initBattle 套用 weather）。
 */
export function buildBattlefieldReconForEncounter(
    encounter: BattlefieldReconEncounter,
    forecastTurns: number = RECON_FORECAST_TURNS,
): BattlefieldRecon {
    const turns = Math.max(0, Math.floor(forecastTurns));
    const fixedWeather = normalizeWeather(encounter.weather) ?? Weather.Clear;
    const schedule = encounter.weatherSchedule
        ?? (turns > 0 ? [{ turnStart: 1, turnEnd: turns, weather: fixedWeather }] : []);
    return buildBattlefieldRecon({ terrain: encounter.terrain, schedule, forecastTurns: turns });
}
