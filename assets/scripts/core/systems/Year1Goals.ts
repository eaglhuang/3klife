// @spec-source → Antigravity 首年目標清單規格（PM 11/26 採納）；PROG-2-10062
/**
 * Year1Goals — 首年目標清單（純邏輯，不依賴 cc）
 *
 * 職責：載入並驗證 year1-goals.json、記錄「哪些目標已完成、哪些已領獎」、
 * 依事件（戰鬥勝利、招募、內政、親子談話或替代互動、配偶數、年末榜單）判定完成，
 * 整理大廳進度條要用的 view，並提供存檔欄位 normalize（舊存檔缺欄位視為全空）。
 * 不負責：銀兩入帳（走 reward.claim → SilverRoutedWallet，見 Year1GoalsReward）與畫面。
 *
 * 判定只在「第 1 年」有效（資料 year 欄）；第 2 年起的事件一律忽略，已完成的紀錄保留。
 * 年末榜單目標特別：以典禮傳入的年份與名次判定，典禮當下遊戲時鐘可能已經翻到第 2 年。
 */
import goalsData from '../../../resources/data/master/year1-goals.json';

export const YEAR1_GOALS_SCHEMA_VERSION = 1;

/** 目標觸發型別；每種型別對應一類事件 */
export const YEAR1_TRIGGER_TYPES = ['battle-win', 'recruit', 'domestic', 'child-talk', 'spouse', 'year-end-rank'] as const;
export type Year1TriggerType = typeof YEAR1_TRIGGER_TYPES[number];

/** 替代判定可接受的事件（親子談話按鈕尚未到位時，府內送禮或培育互動算一次） */
export const YEAR1_FALLBACK_EVENTS = ['home-gift', 'nurture'] as const;
export type Year1FallbackEvent = typeof YEAR1_FALLBACK_EVENTS[number];

export interface Year1GoalTrigger {
    type: Year1TriggerType;
    /** 計數門檻（child-talk 的互動次數、spouse 的配偶數）；省略視為 1 */
    min?: number;
    /** child-talk 的計數欄位名稱（資料記錄用，實際計數存在 state.counters） */
    counter?: string;
    /** child-talk 的替代判定；enabled=false 代表親子談話按鈕已到位，只認真正的談話 */
    fallback?: { enabled: boolean; counter: string; events: Year1FallbackEvent[] };
    /** year-end-rank 的名次門檻（含） */
    maxRank?: number;
}

export interface Year1GoalReward {
    /** 家族銀兩（不是國家的金） */
    silver: number;
    /** 親子好感加成（記在存檔，等親子好感系統接上時結算） */
    childFavor?: number;
    /** 稱號 id（對應資料的 titles） */
    titleId?: string;
    /** reward-config.json 的套件 id；金額由單元測試與 silver 對齊 */
    bundleId: string;
}

export interface Year1GoalDef {
    id: string;
    order: number;
    /** 建議季節 1～4（春夏秋冬）；只作顯示與引導，不限制完成時機 */
    season: number;
    trigger: Year1GoalTrigger;
    reward: Year1GoalReward;
    /** 參與但未達標的安慰獎（目前只有年末榜單目標有） */
    consolation?: { silver: number; bundleId: string };
    nameKey: string;
    actionKey: string;
    toastKey: string;
    consolationToastKey?: string;
    /** 「下一步」按鈕導向的大廳功能（LobbyActionId）；省略代表只顯示提示 */
    nextAction?: string;
}

export interface Year1TitleDef {
    id: string;
    nameKey: string;
}

export interface Year1GoalTable {
    schemaVersion: number;
    year: number;
    totalSilver: number;
    /** 完成幾項以上算「新手滿貫」（典禮第 3 幕加賀詞） */
    grandSlamMin: number;
    titles: readonly Year1TitleDef[];
    goals: readonly Year1GoalDef[];
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

function isPositiveInt(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/** 驗證資料：回傳錯誤清單，空陣列代表合格。不丟例外，方便測試逐條對照。 */
export function validateYear1Goals(raw: unknown): string[] {
    const errors: string[] = [];
    if (!raw || typeof raw !== 'object') return ['根節點必須是物件'];
    const root = raw as Record<string, unknown>;
    if (root.schemaVersion !== YEAR1_GOALS_SCHEMA_VERSION) errors.push(`schemaVersion 必須是 ${YEAR1_GOALS_SCHEMA_VERSION}`);
    if (!isPositiveInt(root.year)) errors.push('year 必須是正整數');
    if (!isPositiveInt(root.totalSilver)) errors.push('totalSilver 必須是正整數');

    const titleIds = new Set<string>();
    if (!Array.isArray(root.titles)) errors.push('titles 必須是陣列');
    else root.titles.forEach((entry, index) => {
        const at = `titles[${index}]`;
        const t = (entry ?? {}) as Record<string, unknown>;
        if (!isNonEmptyString(t.id)) errors.push(`${at}.id 必須是非空字串`);
        else if (titleIds.has(t.id)) errors.push(`${at}.id 重複：${t.id}`);
        else titleIds.add(t.id);
        if (!isNonEmptyString(t.nameKey)) errors.push(`${at}.nameKey 必須是非空字串`);
    });

    if (!Array.isArray(root.goals) || root.goals.length === 0) return [...errors, 'goals 必須是非空陣列'];
    if (!isPositiveInt(root.grandSlamMin) || root.grandSlamMin > root.goals.length) errors.push(`grandSlamMin 必須是 1～${root.goals.length} 的整數`);

    const ids = new Set<string>();
    const orders = new Set<number>();
    const bundles = new Set<string>();
    let silverSum = 0;
    root.goals.forEach((entry, index) => {
        const at = `goals[${index}]`;
        if (!entry || typeof entry !== 'object') { errors.push(`${at} 必須是物件`); return; }
        const g = entry as Record<string, unknown>;
        if (!isNonEmptyString(g.id)) errors.push(`${at}.id 必須是非空字串`);
        else if (ids.has(g.id)) errors.push(`${at}.id 重複：${g.id}`);
        else ids.add(g.id);
        if (!isPositiveInt(g.order)) errors.push(`${at}.order 必須是正整數`);
        else if (orders.has(g.order)) errors.push(`${at}.order 重複：${g.order}`);
        else orders.add(g.order);
        if (typeof g.season !== 'number' || !Number.isInteger(g.season) || g.season < 1 || g.season > 4) errors.push(`${at}.season 必須是 1～4`);
        for (const key of ['nameKey', 'actionKey', 'toastKey'] as const) {
            if (!isNonEmptyString(g[key])) errors.push(`${at}.${key} 必須是非空字串`);
        }
        if (g.nextAction !== undefined && !isNonEmptyString(g.nextAction)) errors.push(`${at}.nextAction 必須是非空字串`);
        validateTrigger(g.trigger, at, errors);

        const reward = (g.reward ?? {}) as Record<string, unknown>;
        if (!isPositiveInt(reward.silver)) errors.push(`${at}.reward.silver 必須是正整數（家族銀兩）`);
        else silverSum += reward.silver;
        if ('gold' in reward) errors.push(`${at}.reward.gold 不合法：家族資金請用 silver，金是國家資金`);
        if (reward.childFavor !== undefined && !isPositiveInt(reward.childFavor)) errors.push(`${at}.reward.childFavor 必須是正整數`);
        if (reward.titleId !== undefined && (!isNonEmptyString(reward.titleId) || !titleIds.has(reward.titleId))) errors.push(`${at}.reward.titleId 找不到對應稱號：${String(reward.titleId)}`);
        checkBundle(reward.bundleId, `${at}.reward.bundleId`, bundles, errors);

        const trigger = (g.trigger ?? {}) as Record<string, unknown>;
        if (g.consolation !== undefined) {
            const c = g.consolation as Record<string, unknown>;
            if (trigger.type !== 'year-end-rank') errors.push(`${at}.consolation 只有 year-end-rank 目標可以有`);
            if (!isPositiveInt(c?.silver)) errors.push(`${at}.consolation.silver 必須是正整數`);
            checkBundle(c?.bundleId, `${at}.consolation.bundleId`, bundles, errors);
            if (!isNonEmptyString(g.consolationToastKey)) errors.push(`${at}.consolationToastKey 必須是非空字串`);
        }
    });
    if (isPositiveInt(root.totalSilver) && silverSum !== root.totalSilver) errors.push(`totalSilver ${String(root.totalSilver)} 與各目標 reward.silver 合計 ${silverSum} 不符`);
    return errors;
}

function checkBundle(value: unknown, at: string, seen: Set<string>, errors: string[]): void {
    if (!isNonEmptyString(value)) errors.push(`${at} 必須是非空字串`);
    else if (seen.has(value)) errors.push(`${at} 重複：${value}`);
    else seen.add(value);
}

function validateTrigger(raw: unknown, at: string, errors: string[]): void {
    if (!raw || typeof raw !== 'object') { errors.push(`${at}.trigger 必須是物件`); return; }
    const t = raw as Record<string, unknown>;
    const where = `${at}.trigger`;
    if (typeof t.type !== 'string' || !(YEAR1_TRIGGER_TYPES as readonly string[]).includes(t.type)) {
        errors.push(`${where}.type 必須是 ${YEAR1_TRIGGER_TYPES.join('/')} 其中之一`);
        return;
    }
    if (t.min !== undefined && !isPositiveInt(t.min)) errors.push(`${where}.min 必須是正整數`);
    if (t.type === 'year-end-rank' && !isPositiveInt(t.maxRank)) errors.push(`${where}.maxRank 必須是正整數`);
    if (t.type === 'child-talk') {
        if (!isNonEmptyString(t.counter)) errors.push(`${where}.counter 必須是非空字串`);
        if (t.fallback !== undefined) {
            const f = t.fallback as Record<string, unknown>;
            if (typeof f?.enabled !== 'boolean') errors.push(`${where}.fallback.enabled 必須是布林`);
            if (!isNonEmptyString(f?.counter)) errors.push(`${where}.fallback.counter 必須是非空字串`);
            const events = f?.events;
            if (!Array.isArray(events) || events.length === 0 || events.some((e) => !(YEAR1_FALLBACK_EVENTS as readonly string[]).includes(e as string))) {
                errors.push(`${where}.fallback.events 必須是非空陣列，且只能是 ${YEAR1_FALLBACK_EVENTS.join('/')}`);
            }
        }
    }
}

let cachedTable: Year1GoalTable | null = null;

/** 取得首年目標表；資料不合格直接丟錯（fail-fast），錯誤清單寫在訊息裡 */
export function getYear1GoalTable(): Year1GoalTable {
    if (cachedTable) return cachedTable;
    const errors = validateYear1Goals(goalsData);
    if (errors.length > 0) throw new Error(`[Year1Goals] year1-goals.json 驗證失敗：${errors.join('；')}`);
    const raw = goalsData as unknown as Year1GoalTable;
    cachedTable = { ...raw, goals: [...raw.goals].sort((a, b) => a.order - b.order) };
    return cachedTable;
}

// ─── 存檔狀態 ───

/** 兩類互動計數；年度計數只在第 1 年累計 */
export interface Year1GoalCounters {
    /** 真正的親子談話次數（childInteractionCountThisYear；談話按鈕上線後由它累計） */
    childInteractionCountThisYear: number;
    /** 替代判定：府內送禮與培育互動合計次數 */
    homeGiftOrNurtureCount: number;
}

export interface Year1GoalsState {
    /** 已完成的目標 id（依完成順序） */
    completed: string[];
    /** 已領獎的目標 id */
    claimed: string[];
    /** 已獲得的稱號 id */
    titles: string[];
    /** 累計親子好感加成（等親子好感系統接上時結算） */
    childFavorBonus: number;
    counters: Year1GoalCounters;
    /** 第 1 年榜單衝刺的結算名次；尚未結算為 null */
    sprintRank: number | null;
}

export function createEmptyYear1GoalsState(): Year1GoalsState {
    return { completed: [], claimed: [], titles: [], childFavorBonus: 0, counters: { childInteractionCountThisYear: 0, homeGiftOrNurtureCount: 0 }, sprintRank: null };
}

export function copyYear1GoalsState(state: Year1GoalsState): Year1GoalsState {
    return { ...state, completed: [...state.completed], claimed: [...state.claimed], titles: [...state.titles], counters: { ...state.counters } };
}

function nonNegativeInt(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function idList(raw: unknown, known: ReadonlySet<string> | null): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (const item of raw) {
        if (typeof item === 'string' && item.length > 0 && !out.includes(item) && (!known || known.has(item))) out.push(item);
    }
    return out;
}

/**
 * 讀存檔欄位的防呆：舊存檔沒有這個欄位（undefined）或格式壞掉都視為全空；
 * 不認得的目標／稱號 id 丟掉（資料改版刪目標時不會卡死），已領獎但未完成的紀錄視為未完成。
 */
export function normalizeYear1GoalsState(raw: unknown, table: Year1GoalTable = getYear1GoalTable()): Year1GoalsState {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return createEmptyYear1GoalsState();
    const value = raw as Record<string, unknown>;
    const goalIds = new Set(table.goals.map((g) => g.id));
    const completed = idList(value.completed, goalIds);
    const claimedAll = idList(value.claimed, goalIds);
    const counters = (typeof value.counters === 'object' && value.counters !== null ? value.counters : {}) as Record<string, unknown>;
    const rank = value.sprintRank;
    return {
        completed,
        claimed: claimedAll.filter((id) => completed.includes(id) || id === sprintGoalId(table)),
        titles: idList(value.titles, new Set(table.titles.map((t) => t.id))),
        childFavorBonus: nonNegativeInt(value.childFavorBonus),
        counters: {
            childInteractionCountThisYear: nonNegativeInt(counters.childInteractionCountThisYear),
            homeGiftOrNurtureCount: nonNegativeInt(counters.homeGiftOrNurtureCount),
        },
        sprintRank: typeof rank === 'number' && Number.isInteger(rank) && rank >= 1 ? rank : null,
    };
}

/** 年末榜單衝刺目標的 id（資料裡 type 為 year-end-rank 的那一項） */
export function sprintGoalId(table: Year1GoalTable): string | null {
    return table.goals.find((g) => g.trigger.type === 'year-end-rank')?.id ?? null;
}

// ─── 事件與完成判定 ───

export type Year1GoalEvent =
    | { type: 'battle-win' }
    | { type: 'recruit' }
    | { type: 'domestic' }
    /** 真正的親子談話（按鈕上線後由它呼叫） */
    | { type: 'child-talk' }
    /** 替代判定用：府內送禮、培育互動 */
    | { type: 'home-gift' }
    | { type: 'nurture' }
    /** 目前在本家的配偶數；每次配偶變動或對帳時帶入 */
    | { type: 'spouse-count'; count: number }
    /** 年末榜單：典禮結算出的名次與年份 */
    | { type: 'year-end-rank'; year: number; rank: number };

export interface Year1ApplyResult {
    state: Year1GoalsState;
    /** 本次新完成的目標（依資料順序） */
    newlyCompleted: Year1GoalDef[];
    /** 本次新結算的衝刺結果；年末榜單事件才有 */
    sprint?: { rank: number; reachedTop: boolean };
}

function talkReached(goal: Year1GoalDef, counters: Year1GoalCounters): boolean {
    const min = goal.trigger.min ?? 1;
    if (counters.childInteractionCountThisYear >= min) return true;
    const fallback = goal.trigger.fallback;
    return !!fallback?.enabled && counters.homeGiftOrNurtureCount >= min;
}

function triggerReached(goal: Year1GoalDef, state: Year1GoalsState, event: Year1GoalEvent): boolean {
    const t = goal.trigger;
    switch (t.type) {
        case 'battle-win': return event.type === 'battle-win';
        case 'recruit': return event.type === 'recruit';
        case 'domestic': return event.type === 'domestic';
        case 'child-talk': return talkReached(goal, state.counters);
        case 'spouse': return event.type === 'spouse-count' && event.count >= (t.min ?? 1);
        case 'year-end-rank': return event.type === 'year-end-rank' && event.rank <= (t.maxRank ?? 3);
        default: return false;
    }
}

/**
 * 套用一個事件，回傳新狀態與本次新完成的目標。純函式：不改輸入、不用亂數、不存檔。
 * currentYear＝遊戲目前的年份（年末榜單事件改看事件自帶的 year）。
 * 稱號與親子好感加成在完成當下記進狀態；銀兩由呼叫端另走 reward.claim 領取（claimed 才算領過）。
 */
export function applyYear1GoalEvent(
    table: Year1GoalTable,
    source: Year1GoalsState,
    event: Year1GoalEvent,
    currentYear: number,
): Year1ApplyResult {
    const state = copyYear1GoalsState(source);
    const eventYear = event.type === 'year-end-rank' ? event.year : currentYear;
    if (eventYear !== table.year) return { state, newlyCompleted: [] };

    if (event.type === 'child-talk') state.counters.childInteractionCountThisYear += 1;
    else if (event.type === 'home-gift' || event.type === 'nurture') state.counters.homeGiftOrNurtureCount += 1;

    let sprint: Year1ApplyResult['sprint'];
    if (event.type === 'year-end-rank') {
        // 榜單一年只結算一次；已結算過（含讀檔重播）不再改名次
        if (state.sprintRank === null && Number.isInteger(event.rank) && event.rank >= 1) {
            state.sprintRank = event.rank;
            const goal = table.goals.find((g) => g.trigger.type === 'year-end-rank');
            sprint = { rank: event.rank, reachedTop: !!goal && event.rank <= (goal.trigger.maxRank ?? 3) };
        } else {
            return { state, newlyCompleted: [] };
        }
    }

    const newlyCompleted: Year1GoalDef[] = [];
    for (const goal of table.goals) {
        if (state.completed.includes(goal.id)) continue;
        if (!triggerReached(goal, state, event)) continue;
        state.completed.push(goal.id);
        if (goal.reward.titleId && !state.titles.includes(goal.reward.titleId)) state.titles.push(goal.reward.titleId);
        state.childFavorBonus += goal.reward.childFavor ?? 0;
        newlyCompleted.push(goal);
    }
    return { state, newlyCompleted, ...(sprint ? { sprint } : {}) };
}

/** 已完成但尚未領獎的目標（依資料順序）；衝刺目標在「未進前三」時不算完成，另由 pendingConsolation 處理 */
export function pendingYear1Rewards(table: Year1GoalTable, state: Year1GoalsState): Year1GoalDef[] {
    return table.goals.filter((g) => state.completed.includes(g.id) && !state.claimed.includes(g.id));
}

/** 衝刺已結算、沒進前三、安慰獎還沒領的目標；沒有則回 null */
export function pendingYear1Consolation(table: Year1GoalTable, state: Year1GoalsState): Year1GoalDef | null {
    const goal = table.goals.find((g) => g.trigger.type === 'year-end-rank');
    if (!goal?.consolation || state.sprintRank === null) return null;
    if (state.completed.includes(goal.id) || state.claimed.includes(goal.id)) return null;
    return goal;
}

/** 標記已領獎（回傳新狀態；重複標記不變） */
export function markYear1GoalClaimed(source: Year1GoalsState, goalId: string): Year1GoalsState {
    const state = copyYear1GoalsState(source);
    if (!state.claimed.includes(goalId)) state.claimed.push(goalId);
    return state;
}

// ─── 大廳進度條 view ───

export interface Year1GoalsView {
    /** 第 1 年才顯示 */
    visible: boolean;
    completedCount: number;
    total: number;
    /** 0～1，進度條填滿比例 */
    ratio: number;
    /** 下一個未完成的目標；全部完成為 null */
    next: Year1GoalDef | null;
    /** 達新手滿貫門檻（典禮賀詞用） */
    grandSlam: boolean;
    /** 各目標是否完成，依資料順序 */
    goals: ReadonlyArray<{ id: string; done: boolean }>;
}

export function buildYear1GoalsView(table: Year1GoalTable, state: Year1GoalsState, currentYear: number): Year1GoalsView {
    const total = table.goals.length;
    const done = table.goals.filter((g) => state.completed.includes(g.id)).length;
    // 衝刺已結算但沒進前三：這項不會再變成完成，不能再當「下一步」
    const next = table.goals.find((g) => !state.completed.includes(g.id) && !(g.trigger.type === 'year-end-rank' && state.sprintRank !== null)) ?? null;
    return {
        visible: currentYear === table.year,
        completedCount: done,
        total,
        ratio: total > 0 ? done / total : 0,
        next,
        grandSlam: done >= table.grandSlamMin,
        goals: table.goals.map((g) => ({ id: g.id, done: state.completed.includes(g.id) })),
    };
}
