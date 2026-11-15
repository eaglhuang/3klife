// @spec-source → 大廳系統規格書 doc_spec_0002 E-3／E-5（自告奮勇、在場武將輪替）；Issue #2135；PROG-2-2251
/**
 * HallWalkerPlan — 幕府大廳「誰在場走動」的決策，純 TS，不依賴 cc。
 *
 * 三條規則（使用者裁定 2026-11-15）：
 *   1. 原本固定站位的小人不再出現。
 *   2. 有任務可以毛遂自薦的武將（volunteers）才會在場走來走去，並彈視窗讓玩家決定要不要派這個任務。
 *   3. 其餘在場的是「我方擁有的武將」隨機抽 2~3 位輪流出來走動（walkers），可以點他聊天；每 60 秒輪替一批。
 *
 * 這裡只決定名單：volunteers 全上（上限 MAX_VOLUNTEERS），walkers 補到 2~3 位。
 * 亂數與時間由呼叫端注入，方便 headless 測試；狀態以不可變物件進出（像 HallCharacterRoll 的風格）。
 * Unity 對照：像一個每 60 秒重新洗牌的「當班名單」，自薦者永遠先排進去。
 */
import { HALL_REFRESH_SECONDS, HALL_FAVORITE_WEIGHT, HALL_ASSIGNED_WEIGHT } from './HallCharacterRoll';

export const WALKER_RANGE = Object.freeze({ min: 2, max: 3 });
/** 同時毛遂自薦的上限（暫定）：太多人同時來擠畫面，也讓玩家一次只看得完 */
export const MAX_VOLUNTEERS = 3;

export interface WalkerCandidate {
    id: string;
    favorite: boolean;
    /** 已經被派了任務（忙著）：權重照 HallCharacterRoll 的 assigned，不排除 */
    assigned: boolean;
    /** 有 Spine 骨架能真的走動；沒有的只能站著，輪替時優先挑會走的 */
    walkable: boolean;
}

export interface WalkerPlanState {
    /** 目前當班的輪替武將（不含自薦者） */
    walkerIds: string[];
    /** 上一次輪替的時間（秒）；從沒輪替過為 null */
    rotatedAtSec: number | null;
}

export interface WalkerPlanInput {
    state: Readonly<WalkerPlanState>;
    nowSec: number;
    /** 我方擁有的武將（名冊）；不在名冊的 id 不會被排進來 */
    owned: readonly WalkerCandidate[];
    /** 目前有任務可以毛遂自薦的武將 id（已通過「擁有」與「未被派任務」檢查，由呼叫端決定） */
    volunteerIds: readonly string[];
    random: () => number;
    /** 目標輪替人數（2~3），預設 3 */
    walkerCount?: number;
    rotateSec?: number;
}

export interface WalkerPlan {
    /** 在場名單：自薦者在前、輪替者在後 */
    ids: string[];
    volunteerIds: string[];
    walkerIds: string[];
    state: WalkerPlanState;
    /** 這次是否重抽了輪替名單 */
    rotated: boolean;
}

export const INITIAL_WALKER_STATE: Readonly<WalkerPlanState> = Object.freeze({ walkerIds: [], rotatedAtSec: null });

function clampWalkerCount(value: number | undefined): number {
    const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : WALKER_RANGE.max;
    return Math.min(WALKER_RANGE.max, Math.max(WALKER_RANGE.min, n));
}

/** 抽樣權重：收藏 ×2、已派任務 ×1.2（同 HallCharacterRoll）；會走的再 ×4，讓沒骨架的武將不容易搶走名額 */
function walkerWeight(c: Readonly<WalkerCandidate>): number {
    return (c.favorite ? HALL_FAVORITE_WEIGHT : 1) * (c.assigned ? HALL_ASSIGNED_WEIGHT : 1) * (c.walkable ? 4 : 1);
}

function weightedPick(pool: WalkerCandidate[], count: number, random: () => number): string[] {
    const remaining = pool.slice();
    const picked: string[] = [];
    while (picked.length < count && remaining.length > 0) {
        const weights = remaining.map(walkerWeight);
        const total = weights.reduce((sum, w) => sum + w, 0);
        const roll = random() * total;
        let cumulative = 0;
        let index = remaining.length - 1;
        for (let i = 0; i < remaining.length; i++) {
            cumulative += weights[i];
            if (roll < cumulative) { index = i; break; }
        }
        picked.push(remaining[index].id);
        remaining.splice(index, 1);
    }
    return picked;
}

/**
 * 算出此刻的在場名單。
 *  - 自薦者：取 volunteerIds 中確實在名冊的，最多 MAX_VOLUNTEERS 位，保持傳入順序。
 *  - 輪替者：不含自薦者；沒到 60 秒就沿用上一批（仍在名冊、未變成自薦者的人），不足才補；
 *    到期則重抽，並盡量避開上一批（候選夠多時一個都不重複，不夠才允許重複）。
 *  - 任何時候輪替者都補到目標人數（名冊不夠就有多少放多少）。
 */
export function planHallWalkers(input: Readonly<WalkerPlanInput>): WalkerPlan {
    const ownedById = new Map(input.owned.map(c => [c.id, c] as const));
    const volunteerIds: string[] = [];
    for (const id of input.volunteerIds) {
        if (volunteerIds.length >= MAX_VOLUNTEERS) break;
        if (ownedById.has(id) && !volunteerIds.includes(id)) volunteerIds.push(id);
    }
    const taken = new Set(volunteerIds);
    const target = clampWalkerCount(input.walkerCount);
    const rotateSec = input.rotateSec ?? HALL_REFRESH_SECONDS;
    const due = input.state.rotatedAtSec === null || input.nowSec - input.state.rotatedAtSec >= rotateSec;

    let walkerIds: string[] = [];
    let rotatedAtSec = input.state.rotatedAtSec;
    let rotated = false;

    if (!due) {
        // 沿用上一批：還在名冊、沒變成自薦者的留下
        walkerIds = input.state.walkerIds.filter(id => ownedById.has(id) && !taken.has(id)).slice(0, target);
    }
    if (walkerIds.length < target) {
        const keep = new Set(walkerIds);
        const previous = new Set(input.state.walkerIds);
        const free = input.owned.filter(c => !taken.has(c.id) && !keep.has(c.id));
        // 到期重抽：先從「上一批以外」的人挑；人不夠才回頭用上一批的人
        const fresh = due ? free.filter(c => !previous.has(c.id)) : free;
        const need = target - walkerIds.length;
        const first = weightedPick(fresh, need, input.random);
        const used = new Set(first);
        const fallback = first.length < need
            ? weightedPick(free.filter(c => !used.has(c.id)), need - first.length, input.random)
            : [];
        walkerIds = walkerIds.concat(first, fallback);
        if (due) {
            rotated = true;
            rotatedAtSec = input.nowSec;
        }
    }

    return {
        ids: volunteerIds.concat(walkerIds),
        volunteerIds,
        walkerIds,
        state: { walkerIds: walkerIds.slice(), rotatedAtSec },
        rotated,
    };
}
