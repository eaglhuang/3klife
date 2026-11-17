// @spec-source → doc_spec_1178 §3（任務產生）、§9（過期與補新）；doc_spec_0453 §2.1（難度可見性）；PROG-2-9130
/**
 * HallMissionGenerator — 大廳任務的產生、過期與補新（純邏輯，不依賴 cc）。
 *
 * - 每面牆「未接取」任務補到目標數（預設 4）；進行中的任務不佔名額。
 * - 難度只從玩家官階看得到的難度抽，權重：最高難度 3、低一級 4、低兩級以上 2。
 * - 同一面牆不出現兩筆相同模板（含進行中的）。
 * - 亂數全部走存檔種子；輸入不被修改，回傳新狀態。
 *
 * Unity 對照：像一個 Spawner，輸入模板表與玩家階級，輸出下一批任務；種子存檔，所以讀檔不會洗牌。
 */
import { HALL_DIFFICULTY_MIN_RANK, type HallBoardKey } from './HallMissionBoard';
import {
    HALL_MISSION_DIFFICULTIES, HALL_MISSION_WALLS, cloneHallMissionState, nextHallRandom,
    type HallMission, type HallMissionBalance, type HallMissionDifficulty, type HallMissionState, type HallMissionTemplate,
} from './HallMissionData';

/** 官階看得到的難度（由低到高）；至少含 EASY */
export function visibleHallDifficulties(rankTier: number): HallMissionDifficulty[] {
    const visible = HALL_MISSION_DIFFICULTIES.filter((d) => rankTier >= HALL_DIFFICULTY_MIN_RANK[d]);
    return visible.length > 0 ? visible : [HALL_MISSION_DIFFICULTIES[0]];
}

/** 抽難度用的權重：與可見最高難度的差距 0→top、1→minusOne、≥2→minusTwoOrLower */
export function hallDifficultyWeight(visible: readonly HallMissionDifficulty[], difficulty: HallMissionDifficulty, balance: HallMissionBalance): number {
    const gap = visible.length - 1 - visible.indexOf(difficulty);
    if (gap === 0) return balance.weights.top;
    if (gap === 1) return balance.weights.minusOne;
    return balance.weights.minusTwoOrLower;
}

/** 依模板與數值表建立一筆任務實例（獎勵與耗費在此定下） */
export function createHallMission(template: Readonly<HallMissionTemplate>, balance: Readonly<HallMissionBalance>, id: string, season: number): HallMission {
    const d = balance.difficulties[template.difficulty];
    const reward = balance.wallRewards[template.wall];
    const cost = balance.wallCosts[template.wall];
    return {
        id,
        templateId: template.templateId,
        wall: template.wall,
        difficulty: template.difficulty,
        title: template.title,
        brief: template.brief,
        detail: template.detail,
        keyStat: template.keyStat,
        enemyHint: template.enemyHint,
        ...(template.sceneGambit ? { sceneGambit: template.sceneGambit } : {}),
        durationSeasons: d.durationSeasons,
        powerRequired: d.powerRequired,
        rewards: {
            grain: Math.round(d.rewardGrain * reward.grain),
            silver: Math.round(d.rewardSilver * reward.silver),
            generalExp: Math.round(d.generalExp * reward.generalExp),
        },
        costs: {
            grain: Math.round(d.costGrain * cost.grain),
            troops: Math.round(d.costTroops * cost.troops),
            silver: Math.round(d.costSilver * cost.silver),
        },
        energyCost: balance.energyCost[template.wall],
        intel: balance.initialIntel,
        createdSeason: season,
        expireSeason: season + balance.expireSeasons,
        waited: false,
        status: 'OPEN',
    };
}

/** 未接取任務數 */
export function openHallMissionCount(state: Readonly<HallMissionState>, wall: HallBoardKey): number {
    return state.boards[wall].filter((m) => m.status === 'OPEN').length;
}

/** 加權抽一個難度；回傳新種子 */
function pickDifficulty(pool: readonly HallMissionDifficulty[], visible: readonly HallMissionDifficulty[], balance: HallMissionBalance, seed: number): { difficulty: HallMissionDifficulty; seed: number } {
    const weights = pool.map((d) => hallDifficultyWeight(visible, d, balance));
    const total = weights.reduce((a, b) => a + b, 0);
    const roll = nextHallRandom(seed);
    let acc = roll.value * total;
    for (let i = 0; i < pool.length; i += 1) {
        acc -= weights[i];
        if (acc < 0) return { difficulty: pool[i], seed: roll.seed };
    }
    return { difficulty: pool[pool.length - 1], seed: roll.seed };
}

/** 單面牆補任務到目標數；沒有可用模板時有幾筆補幾筆 */
export function refillHallWall(state: Readonly<HallMissionState>, wall: HallBoardKey, templates: readonly HallMissionTemplate[], balance: Readonly<HallMissionBalance>, season: number, rankTier: number): HallMissionState {
    const next = cloneHallMissionState(state);
    const visible = visibleHallDifficulties(rankTier);
    const wallTemplates = templates.filter((t) => t.wall === wall && visible.includes(t.difficulty));
    while (openHallMissionCount(next, wall) < balance.wallTargetCount) {
        // 只避開仍掛在牆上的未接取任務；進行中的不佔名額，也就不佔模板，新手只有簡單模板時牆才補得滿
        const used = new Set(next.boards[wall].filter((m) => m.status === 'OPEN').map((m) => m.templateId));
        const free = wallTemplates.filter((t) => !used.has(t.templateId));
        const pool = visible.filter((d) => free.some((t) => t.difficulty === d));
        if (pool.length === 0) break;
        const picked = pickDifficulty(pool, visible, balance, next.seed);
        const candidates = free.filter((t) => t.difficulty === picked.difficulty);
        const roll = nextHallRandom(picked.seed);
        const template = candidates[Math.min(candidates.length - 1, Math.floor(roll.value * candidates.length))];
        next.seed = roll.seed;
        next.serial += 1;
        next.boards[wall].push(createHallMission(template, balance, `HM-${wall.charAt(0)}${String(next.serial).padStart(4, '0')}`, season));
    }
    return next;
}

/** 三面牆都補到目標數 */
export function refillHallBoards(state: Readonly<HallMissionState>, templates: readonly HallMissionTemplate[], balance: Readonly<HallMissionBalance>, season: number, rankTier: number): HallMissionState {
    let next = cloneHallMissionState(state);
    for (const wall of HALL_MISSION_WALLS) next = refillHallWall(next, wall, templates, balance, season, rankTier);
    return next;
}

/** 過期：移除未接取且到期季早於新季的任務；進行中的不動（規格 §9 步驟 2） */
export function expireHallMissions(state: Readonly<HallMissionState>, season: number): HallMissionState {
    const next = cloneHallMissionState(state);
    for (const wall of HALL_MISSION_WALLS) next.boards[wall] = next.boards[wall].filter((m) => m.status === 'ACTIVE' || m.expireSeason >= season);
    return next;
}
