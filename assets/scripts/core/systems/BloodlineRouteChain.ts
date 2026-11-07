// @spec-source → 血脈英靈虎符資料跳轉鏈與命鏡加載文案規格書.md（doc_spec_0351）；PROG-2-2037
/**
 * BloodlineRouteChain — 血脈四階跳轉堆疊、重複卡血脈灌注、命鏡加載文案（純邏輯，不依賴 cc）
 *
 * - §1 命頁 → 英靈卡 → 虎符 → 特種軍勢，只能往下一階；每階帶同一組憑證，返回時原樣彈出。
 * - §2 重複卡灌注：精華 +100～500，共鳴契合 +5%；達上限的部分轉成結義點數。
 * - §3 命鏡文案只存 i18n 鍵，字串在 resources/i18n/*.json。
 * 灌注精華量與上限規格只給區間，未定的值由呼叫端傳入（見 BLOODLINE_INFUSION_TUNING）。
 */

export const BLOODLINE_ROUTE_ORDER = ['GeneralDetail', 'SpiritTallyDetail', 'TigerTallyDetail', 'EliteTroopCodex'] as const;
export type BloodlineRoute = (typeof BLOODLINE_ROUTE_ORDER)[number];

export interface BloodlineRouteCredentials {
    templateId: string;
    bloodlineId: string;
    sigilPatternId: string;
}

export interface BloodlineRouteFrame {
    route: BloodlineRoute;
    credentials: BloodlineRouteCredentials;
}

/** 跳轉堆疊；不可變，每次操作回傳新陣列 */
export type BloodlineRouteStack = readonly BloodlineRouteFrame[];

export function openBloodlineChain(credentials: BloodlineRouteCredentials): BloodlineRouteStack {
    return [{ route: 'GeneralDetail', credentials: { ...credentials } }];
}

/** 往下一階；憑證沿用堆疊頂端，順序不對或已到底時回 null */
export function pushBloodlineRoute(stack: BloodlineRouteStack, route: BloodlineRoute): BloodlineRouteStack | null {
    const top = stack[stack.length - 1];
    if (!top) return null;
    if (BLOODLINE_ROUTE_ORDER.indexOf(route) !== BLOODLINE_ROUTE_ORDER.indexOf(top.route) + 1) return null;
    return [...stack, { route, credentials: { ...top.credentials } }];
}

/** 返回：彈出頂端，下層原樣保留；已在命頁時回 null（交給上一層畫面處理） */
export function popBloodlineRoute(stack: BloodlineRouteStack): BloodlineRouteStack | null {
    return stack.length > 1 ? stack.slice(0, -1) : null;
}

export const BLOODLINE_INFUSION_TUNING = {
    essenceMin: 100,
    essenceMax: 500,
    resonanceStep: 0.05,
};

export interface BloodlineInfusionInput {
    /** 本次灌注的精華量（會夾在 100～500） */
    essence: number;
    currentEssence: number;
    essenceCap: number;
    currentResonance: number;
    resonanceCap: number;
}

export interface BloodlineInfusionResult {
    essence: number;
    resonance: number;
    oathPoints: number;
}

/** §2 灌注：精華與共鳴各自補到上限，溢出的精華全數轉結義點數（1:1） */
export function infuseBloodline(input: BloodlineInfusionInput): BloodlineInfusionResult {
    const t = BLOODLINE_INFUSION_TUNING;
    const gain = Math.min(t.essenceMax, Math.max(t.essenceMin, Math.floor(input.essence)));
    const room = Math.max(0, input.essenceCap - input.currentEssence);
    const applied = Math.min(gain, room);
    const resonance = Math.min(input.resonanceCap, Math.round((input.currentResonance + t.resonanceStep) * 1e6) / 1e6);
    return { essence: input.currentEssence + applied, resonance: Math.max(input.currentResonance, resonance), oathPoints: gain - applied };
}

/** §3 命鏡加載文案鍵 */
export const DESTINY_MIRROR_QUOTE_KEYS: readonly string[] = Array.from({ length: 8 }, (_, i) => `LOADING_MIRROR_0${i + 1}`);

/** 隨機取一句；rng 回傳 [0,1) */
export function pickDestinyMirrorQuoteKey(rng: () => number): string {
    const index = Math.min(DESTINY_MIRROR_QUOTE_KEYS.length - 1, Math.floor(Math.max(0, rng()) * DESTINY_MIRROR_QUOTE_KEYS.length));
    return DESTINY_MIRROR_QUOTE_KEYS[index];
}
