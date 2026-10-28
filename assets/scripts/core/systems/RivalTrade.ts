// @spec-source → 治理模式他國AI系統.md (doc_spec_0020)；PROG-2-1429 依建檔紀錄補標出處
import { nationDef, type NationState, type RivalWorld } from './RivalNations';

/** 可交易的資源（黃金在錢包，其餘在軍備與名聲） */
export type TradeResource = 'food' | 'gold' | 'troops' | 'fame';

export interface TradeRoute {
    readonly give: TradeResource;
    readonly get: TradeResource;
    /** 每收到 1 單位要付出幾單位 */
    readonly rate: number;
    /** 邦交門檻（含） */
    readonly minRelation: number;
}

/** 治理模式他國 AI 系統 E-6：糧草↔黃金 2:1（邦交 ≥ 0）、糧草↔兵力 3:1（≥ 20）、黃金↔名聲 5:1（≥ 40）；反向同比率 */
export const TRADE_ROUTES: Readonly<Record<string, TradeRoute>> = {
    foodToGold: { give: 'food', get: 'gold', rate: 2, minRelation: 0 },
    goldToFood: { give: 'gold', get: 'food', rate: 1 / 2, minRelation: 0 },
    foodToTroops: { give: 'food', get: 'troops', rate: 3, minRelation: 20 },
    troopsToFood: { give: 'troops', get: 'food', rate: 1 / 3, minRelation: 20 },
    goldToFame: { give: 'gold', get: 'fame', rate: 5, minRelation: 40 },
    fameToGold: { give: 'fame', get: 'gold', rate: 1 / 5, minRelation: 40 },
};

/** 結盟國付出打 8 折 */
export const ALLY_TRADE_DISCOUNT = 0.8;
/** 每季同一國最多交易次數 */
export const TRADES_PER_SEASON = 2;

export const TRADE_RESOURCE_NAMES: Readonly<Record<TradeResource, string>> = {
    food: '糧草', gold: '黃金', troops: '兵力', fame: '名聲',
};

export type TradeStock = Readonly<Record<TradeResource, number>>;

export interface TradeResult {
    readonly ok: boolean;
    readonly world: RivalWorld;
    readonly message: string;
    readonly give?: { readonly resource: TradeResource; readonly amount: number };
    readonly get?: { readonly resource: TradeResource; readonly amount: number };
}

/** 本季已和該國交易幾次（記錄的季不是本季時視為 0） */
export function tradesUsed(nation: NationState, season: number): number {
    return nation.tradeSeason === season ? nation.tradeCount ?? 0 : 0;
}

/** 收到 amount 單位要付出多少：無條件進位、最少 1；結盟國打 8 折 */
export function tradeCost(route: TradeRoute, amount: number, allied: boolean): number {
    const raw = amount * route.rate * (allied ? ALLY_TRADE_DISCOUNT : 1);
    return Math.max(1, Math.ceil(raw - 1e-9));
}

/** 與他國交易一次；檢查邦交、交戰、季上限與我方存量。成功時回傳更新過交易計數的世界 */
export function tradeWithRival(world: RivalWorld, nationId: string, routeId: string, amount: number, stock: TradeStock, season: number): TradeResult {
    const nation = world.nations.find((n) => n.id === nationId);
    const route = TRADE_ROUTES[routeId];
    if (!nation) return { ok: false, world, message: `找不到勢力 ${nationId}` };
    if (!route) return { ok: false, world, message: `沒有這種交易 ${routeId}` };
    const name = nationDef(nationId)?.name ?? nationId;
    const qty = Math.floor(amount);
    if (!Number.isFinite(amount) || qty < 1) return { ok: false, world, message: '交易數量至少 1' };
    if (nation.atWar) return { ok: false, world, message: `與 ${name} 交戰中，無法交易` };
    if (nation.relation < route.minRelation) return { ok: false, world, message: `與 ${name} 的邦交需達 ${route.minRelation} 才能交易` };
    const used = tradesUsed(nation, season);
    if (used >= TRADES_PER_SEASON) return { ok: false, world, message: `本季已與 ${name} 交易 ${TRADES_PER_SEASON} 次` };
    const cost = tradeCost(route, qty, nation.allied);
    if (stock[route.give] < cost) return { ok: false, world, message: `${TRADE_RESOURCE_NAMES[route.give]}不足，需要 ${cost}` };
    const next: RivalWorld = {
        nations: world.nations.map((n) => (n.id === nationId ? { ...n, tradeSeason: season, tradeCount: used + 1 } : n)),
    };
    return {
        ok: true,
        world: next,
        give: { resource: route.give, amount: cost },
        get: { resource: route.get, amount: qty },
        message: `與 ${name} 交易：付出${TRADE_RESOURCE_NAMES[route.give]} ${cost}，換得${TRADE_RESOURCE_NAMES[route.get]} ${qty}`,
    };
}
