// @spec-source → 出征極速決戰推演演算法與武將個性單挑演出規格書.md (doc_spec_1170) §四；PROG-2-9709（使用者 2026-11-22 裁決）
/**
 * QuickResolveGate — 極速決戰（瞬間結算、不載入棋盤）的可用條件與每日次數（純邏輯，不依賴 cc）。
 *
 * 規則（數值全在 data/quick-resolve-config.json，關卡條件在 encounters.json 的 allowQuickResolve）：
 * - 關卡 allowQuickResolve：'after-clear'（預設，沒標就是它：沒打贏過不可用）／'always'（true 也算）／'never'。
 *   守城戰（battleKind defense）與單挑（battleKind duel，或戰場內單挑進行中）永遠不可用，不看關卡資料。
 * - 每日免費 dailyFreeUses 次；用完後每次耗 writCostPerUse 張軍令狀；兩者皆不足不可用。
 * - 換日沿用登入日高水位（同 DailyFreeEnroll）：今天嚴格晚於紀錄日才歸零，時鐘回撥不會重置次數。
 *
 * Unity 對照：像一個 ScriptableObject 設定＋純函式判斷器，UI 只負責顯示結果與原因文字。
 */

import { ITEM_QUICK_RESOLVE_WRIT } from './ItemDef';
import { UNIT_TROOP_COST } from './SortieDeploy';

export const QUICK_RESOLVE_CONFIG_JSON = 'data/quick-resolve-config';
/** 軍令狀道具 id（極速決戰免費次數用完後每次耗 1 張；第一版不販售，只從任務／獎勵取得）；定義在 ItemDef */
export { ITEM_QUICK_RESOLVE_WRIT };

export interface QuickResolveConfig {
    /** 每日免費次數 */
    dailyFreeUses: number;
    /** 免費次數用完後耗用的道具 id */
    writItemId: string;
    /** 每次耗用張數 */
    writCostPerUse: number;
    /** 未部署（預備）兵力折成戰力的係數：每 1 兵 → 戰力（約等於一隊 500 兵步兵的部隊戰力 ÷ 500，暫定） */
    reservePowerPerTroop: number;
    /**
     * 敵方預設預備兵力（敵方沒有可查的出征帳本）：關卡沒填 enemyReserve 時用它。
     * JSON 欄位名 defaultEnemyReserve；舊欄位 enemyReserveTroops 向下相容（兩者都填以 defaultEnemyReserve 為準）。
     */
    defaultEnemyReserve: number;
}

export const DEFAULT_QUICK_RESOLVE_CONFIG: Readonly<QuickResolveConfig> = Object.freeze({
    dailyFreeUses: 3,
    writItemId: ITEM_QUICK_RESOLVE_WRIT,
    writCostPerUse: 1,
    reservePowerPerTroop: 0.06,
    defaultEnemyReserve: 3000,
});

let _config: Readonly<QuickResolveConfig> = DEFAULT_QUICK_RESOLVE_CONFIG;

function nonNegInt(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function nonNegNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** 套用 JSON 設定；缺欄位或型別不對的欄位退回預設（壞設定不能讓遊戲開不起來）。 */
export function configureQuickResolve(raw: unknown): void {
    const src = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
    _config = Object.freeze({
        dailyFreeUses: nonNegInt(src.dailyFreeUses, DEFAULT_QUICK_RESOLVE_CONFIG.dailyFreeUses),
        writItemId: typeof src.writItemId === 'string' && src.writItemId.length > 0 ? src.writItemId : DEFAULT_QUICK_RESOLVE_CONFIG.writItemId,
        writCostPerUse: nonNegInt(src.writCostPerUse, DEFAULT_QUICK_RESOLVE_CONFIG.writCostPerUse),
        reservePowerPerTroop: nonNegNumber(src.reservePowerPerTroop, DEFAULT_QUICK_RESOLVE_CONFIG.reservePowerPerTroop),
        defaultEnemyReserve: nonNegInt(src.defaultEnemyReserve, nonNegInt(src.enemyReserveTroops, DEFAULT_QUICK_RESOLVE_CONFIG.defaultEnemyReserve)),
    });
}

export function quickResolveConfig(): Readonly<QuickResolveConfig> {
    return _config;
}

/** 測試用：還原預設 */
export function resetQuickResolveConfig(): void {
    _config = DEFAULT_QUICK_RESOLVE_CONFIG;
}

// ── 關卡條件 ───────────────────────────────────────────────────────────────

export type QuickResolveStageMode = 'always' | 'after-clear' | 'never';

/**
 * 不可用原因：first-clear 首次挑戰須親自指揮；defense 守城；duel 單挑；
 * stage-never 關卡資料標記不可用；no-uses 次數用完且沒有軍令狀。
 */
export type QuickResolveBlock = 'first-clear' | 'defense' | 'duel' | 'stage-never' | 'no-uses';

export const QUICK_RESOLVE_BLOCK_TEXT: Readonly<Record<QuickResolveBlock, string>> = Object.freeze({
    'first-clear': '首次挑戰須親自指揮',
    defense: '守城戰無法極速決戰',
    duel: '單挑無法極速決戰',
    'stage-never': '此關無法極速決戰',
    'no-uses': '今日免費次數已用完，且沒有軍令狀',
});

export interface QuickResolveStage {
    readonly id?: string | null;
    readonly battleKind?: string | null;
    /** encounters.json 的 allowQuickResolve：'always'／'after-clear'／'never'；true＝always、false＝never；缺省 after-clear */
    readonly allowQuickResolve?: unknown;
    /** encounters.json 的 enemyReserve：敵方預備兵數（兵），缺省用設定的 defaultEnemyReserve */
    readonly enemyReserve?: unknown;
}

/** 關卡資料的極速決戰模式（守城與單挑的強制不可用由 checkQuickResolve 處理） */
export function quickResolveStageMode(stage: QuickResolveStage | null | undefined): QuickResolveStageMode {
    const raw = stage?.allowQuickResolve;
    if (raw === false || raw === 'never') return 'never';
    if (raw === true || raw === 'always') return 'always';
    return 'after-clear';
}

/**
 * 敵方預備兵力（兵）：關卡 enemyReserve（沒填或壞值用 config.defaultEnemyReserve）扣掉敵方已上場兵數，下限 0。
 * 上場的兵已算在場上單位戰力裡，預備只算還沒上場的部分，避免重複計算。
 */
export function resolveEnemyReserve(
    stage: QuickResolveStage | null | undefined,
    deployedEnemyTroops: number,
    config: Readonly<QuickResolveConfig> = _config,
): number {
    const raw = stage?.enemyReserve;
    const total = typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : config.defaultEnemyReserve;
    const deployed = Number.isFinite(deployedEnemyTroops) ? Math.max(0, deployedEnemyTroops) : 0;
    return Math.max(0, total - deployed);
}

/** 場上單位兵種 → 一隊的兵數（對照出征帳本 UNIT_TROOP_COST；對不到的兵種用步兵 500） */
const TROOP_TYPE_TO_COST_CODE: Readonly<Record<string, string>> = Object.freeze({
    cavalry: 'CAVALRY', infantry: 'INFANTRY', shield: 'SHIELD', archer: 'ARCHER',
    pikeman: 'PIKE', engineer: 'SIEGE', medic: 'MEDIC', navy: 'NAVY',
});

/** 場上存活單位折成兵數的總和（給 resolveEnemyReserve 的 deployedEnemyTroops） */
export function deployedTroopsOf(unitTypes: readonly (string | null | undefined)[]): number {
    return unitTypes.reduce<number>((sum, type) => sum + (UNIT_TROOP_COST[TROOP_TYPE_TO_COST_CODE[type ?? ''] ?? 'INFANTRY'] ?? 500), 0);
}

// ── 每日次數 ───────────────────────────────────────────────────────────────

export interface QuickResolveDaily {
    /** 已計次的最大登入日（YYYY-MM-DD 高水位）；從未使用為 null */
    readonly day: string | null;
    /** 該日已用的次數（含耗軍令狀的次數） */
    readonly used: number;
}

export const EMPTY_QUICK_RESOLVE_DAILY: QuickResolveDaily = Object.freeze({ day: null, used: 0 });

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 換日歸零：今天嚴格晚於紀錄日（或從未記過）才歸零；時鐘回撥維持原狀 */
export function rollQuickResolveDaily(daily: QuickResolveDaily, today: string): QuickResolveDaily {
    if (daily.day === null || today > daily.day) return { day: today, used: 0 };
    return daily;
}

/** 今日剩餘免費次數 */
export function quickResolveFreeLeft(daily: QuickResolveDaily, today: string, config: Readonly<QuickResolveConfig> = _config): number {
    return Math.max(0, config.dailyFreeUses - rollQuickResolveDaily(daily, today).used);
}

export interface QuickResolveCheckInput {
    readonly stage: QuickResolveStage | null | undefined;
    /** 已打贏過的關卡 id（含天下征鋒 Boss 關的勝利紀錄） */
    readonly clearedStageIds: readonly string[];
    readonly daily: QuickResolveDaily;
    /** 今天的登入日 YYYY-MM-DD */
    readonly today: string;
    /** 持有的軍令狀張數 */
    readonly writCount: number;
    /** 戰場內單挑進行中 */
    readonly duelActive?: boolean;
}

export interface QuickResolveCheck {
    readonly allowed: boolean;
    readonly block: QuickResolveBlock | null;
    /** 不可用時的原因文字；可用時為空字串 */
    readonly reason: string;
    /** 這次會耗軍令狀（免費次數已用完） */
    readonly usesWrit: boolean;
    readonly freeLeft: number;
    readonly writCost: number;
    /** 按鈕旁的次數說明（可用與否都有） */
    readonly usageText: string;
}

/** 極速決戰是否可用（關卡條件先於次數；兩者都要過） */
export function checkQuickResolve(input: QuickResolveCheckInput, config: Readonly<QuickResolveConfig> = _config): QuickResolveCheck {
    const freeLeft = quickResolveFreeLeft(input.daily, input.today, config);
    const writCost = config.writCostPerUse;
    const usageText = freeLeft > 0
        ? `今日免費 ${freeLeft}/${config.dailyFreeUses} 次`
        : `免費次數用完，耗軍令狀 ×${writCost}（持有 ${input.writCount}）`;
    const blocked = (block: QuickResolveBlock): QuickResolveCheck =>
        ({ allowed: false, block, reason: QUICK_RESOLVE_BLOCK_TEXT[block], usesWrit: false, freeLeft, writCost, usageText });
    const stage = input.stage;
    if (stage?.battleKind === 'defense') return blocked('defense');
    if (stage?.battleKind === 'duel' || input.duelActive === true) return blocked('duel');
    const mode = quickResolveStageMode(stage);
    if (mode === 'never') return blocked('stage-never');
    if (mode === 'after-clear' && !(stage?.id && input.clearedStageIds.includes(stage.id))) return blocked('first-clear');
    if (freeLeft <= 0 && input.writCount < writCost) return blocked('no-uses');
    return { allowed: true, block: null, reason: '', usesWrit: freeLeft <= 0, freeLeft, writCost, usageText };
}

export interface QuickResolveSpend {
    readonly daily: QuickResolveDaily;
    /** 這次要從背包扣的軍令狀張數（用免費次數時為 0） */
    readonly writSpent: number;
}

/** 計一次使用：先用免費次數，用完才耗軍令狀；呼叫端須先確認 checkQuickResolve 為 allowed */
export function spendQuickResolve(daily: QuickResolveDaily, today: string, config: Readonly<QuickResolveConfig> = _config): QuickResolveSpend {
    const rolled = rollQuickResolveDaily(daily, today);
    const free = rolled.used < config.dailyFreeUses;
    return { daily: { day: rolled.day, used: rolled.used + 1 }, writSpent: free ? 0 : config.writCostPerUse };
}

// ── 存檔 ───────────────────────────────────────────────────────────────────

/** 存檔欄位（PlayerSaveSnapshot.quickResolve）：每日次數＋天下征鋒 Boss 關勝利紀錄（Boss 關不進 clearedStageIds） */
export interface QuickResolveSave {
    day?: string;
    used?: number;
    bossCleared?: string[];
}

export interface QuickResolveState {
    daily: QuickResolveDaily;
    bossCleared: readonly string[];
}

export function emptyQuickResolveState(): QuickResolveState {
    return { daily: EMPTY_QUICK_RESOLVE_DAILY, bossCleared: [] };
}

/** 讀檔正規化；壞值視為沒有紀錄 */
export function normalizeQuickResolveSave(raw: unknown): QuickResolveState {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyQuickResolveState();
    const src = raw as Record<string, unknown>;
    const day = typeof src.day === 'string' && DAY_PATTERN.test(src.day) ? src.day : null;
    const used = day !== null && typeof src.used === 'number' && Number.isFinite(src.used) && src.used > 0 ? Math.floor(src.used) : 0;
    const boss = Array.isArray(src.bossCleared)
        ? Array.from(new Set(src.bossCleared.filter((id): id is string => typeof id === 'string' && id.length > 0)))
        : [];
    return { daily: { day, used }, bossCleared: boss };
}

/** 全新狀態不寫入存檔 */
export function isDefaultQuickResolveState(state: QuickResolveState): boolean {
    return state.daily.day === null && state.daily.used === 0 && state.bossCleared.length === 0;
}

export function quickResolveSaveOf(state: QuickResolveState): QuickResolveSave {
    const save: QuickResolveSave = {};
    if (state.daily.day !== null) { save.day = state.daily.day; save.used = state.daily.used; }
    if (state.bossCleared.length > 0) save.bossCleared = [...state.bossCleared];
    return save;
}
