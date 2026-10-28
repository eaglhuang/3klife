// @spec-source → AI武將強度系統.md (doc_data_0002) E-4 路線選擇（PROG-2-1463）
/**
 * AiLaneStrategy — AI 部署依 Profile 路線策略挑線（純邏輯，不依賴 cc）
 *
 * 規格 E-4 挑線細則（使用者確認 2026-10-28，記錄於 PROG-2-1464）：
 * - FOCUS_2_3：集中中央 3 路，路內挑己方最少的線
 * - SPREAD_5／ALL_5：挑己方部隊最少的線（分散到全部 5 路）
 * - SCOUT_WEAK：挑玩家部隊最少的線（偵測薄弱路線）
 * - CAVALRY_CHARGE_1：挑己方部隊最多的線（開局為中央），該線滿了挑最近的空線
 * - EMPTIEST_1_2：挑雙方部隊總數最少的線
 * - null（規格未定義的 Profile）：隨機
 * 同分時隨機。
 *
 * Unity 對照：像 AI 的 Lane Selector 策略物件，Spawner 只問「下一支放哪條線」。
 */
import type { AiLaneStrategy } from './AiProfiles';

/** FOCUS_2_3 的集中路線（5 路中的中央 3 路） */
export const AI_FOCUS_LANES: readonly number[] = [1, 2, 3];
/** CAVALRY_CHARGE_1 開局的衝鋒線 */
export const AI_CHARGE_DEFAULT_LANE = 2;

/** 各線部隊數：own = AI 己方，opponent = 玩家 */
export interface LaneOccupancy {
    own: readonly number[];
    opponent: readonly number[];
}

function pickRandom(lanes: readonly number[], random: () => number): number {
    return lanes[Math.min(lanes.length - 1, Math.floor(random() * lanes.length))];
}

function pickLowest(lanes: readonly number[], score: (lane: number) => number, random: () => number): number {
    const best = Math.min(...lanes.map(score));
    return pickRandom(lanes.filter((lane) => score(lane) === best), random);
}

/** 從可部署的空線挑一條；沒有空線回傳 null */
export function pickDeployLane(
    strategy: AiLaneStrategy | null,
    freeLanes: readonly number[],
    occupancy: LaneOccupancy,
    random: () => number,
): number | null {
    if (freeLanes.length === 0) return null;
    const own = (lane: number) => occupancy.own[lane] ?? 0;
    const opponent = (lane: number) => occupancy.opponent[lane] ?? 0;
    switch (strategy) {
        case 'FOCUS_2_3': {
            const focus = freeLanes.filter((lane) => AI_FOCUS_LANES.includes(lane));
            return pickLowest(focus.length > 0 ? focus : freeLanes, own, random);
        }
        case 'SPREAD_5':
        case 'ALL_5':
            return pickLowest(freeLanes, own, random);
        case 'SCOUT_WEAK':
            return pickLowest(freeLanes, opponent, random);
        case 'CAVALRY_CHARGE_1': {
            const lanes = occupancy.own.map((_, lane) => lane);
            const most = lanes.length > 0 ? Math.max(...lanes.map(own)) : 0;
            const target = most > 0 ? lanes.find((lane) => own(lane) === most)! : AI_CHARGE_DEFAULT_LANE;
            return pickLowest(freeLanes, (lane) => Math.abs(lane - target), random);
        }
        case 'EMPTIEST_1_2':
            return pickLowest(freeLanes, (lane) => own(lane) + opponent(lane), random);
        default:
            return pickRandom(freeLanes, random);
    }
}
