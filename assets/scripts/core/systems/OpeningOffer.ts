// @spec-source → 新手開場規格書 §5.4、§10.2、§10.3；OPEN-12；PROG-2-2141
/**
 * OpeningOffer — 開場商業序列（OPEN-12）的設定驗證與狀態機（純邏輯，不依賴 cc，不接支付）。
 *
 * - 所有入口都讀同一份 data/opening-offers.json；彈哪一個商品由表決定，不寫在流程裡。
 * - 表中每個商品只有一種出現條件：trigger（遊戲事件達成）或 after（前一個商品被拒絕）。
 * - 教學正在前景時一律不出商品；買過或拒絕過的商品不再出現。
 * - 這裡只記錄結果。實際收款與發貨由未來的支付接口負責。
 *
 * Unity 對照：像一個讀 ScriptableObject 的 Offer Manager，只回答「現在該出哪個 Offer」，不碰 IAP SDK。
 */

export type OpeningOfferTrigger = 'lead-selected';
export type OpeningOfferOutcome = 'declined' | 'purchased';

export interface OpeningOffer {
    id: string;
    /** 表內定價，幣別與各平台價位由支付接入時決定 */
    price: number;
    quote: string;
    trigger?: OpeningOfferTrigger;
    /** 這個 id 的商品被拒絕後才出現 */
    after?: string;
}

export interface OpeningOfferTable {
    offers: OpeningOffer[];
}

export type ParseOpeningOfferResult =
    | { ok: true; table: OpeningOfferTable }
    | { ok: false; issues: string[] };

export interface OpeningOfferState {
    declined: string[];
    purchased: string[];
    /** 序列最後一個商品被拒絕後，這個時間（epoch ms）之前不主動再彈（裁決 11/09 第 11 題） */
    snoozeUntil?: number;
}

/** 裁決 11/09 第 11 題：最後一個商品再被拒絕後 24 小時不主動彈 */
export const OPENING_OFFER_SNOOZE_MS = 24 * 60 * 60 * 1000;

export interface OpeningOfferContext {
    leadSelected: boolean;
    /** 核心教學正在前景（呼叫端判斷） */
    tutorialBlocking: boolean;
    /** 目前時間（epoch ms）；未提供時不重新推薦已拒絕的最後一個商品 */
    now?: number;
}

export type OpeningOfferResolveResult =
    | { ok: true; state: OpeningOfferState }
    | { ok: false };

export const FRESH_OPENING_OFFER_STATE: Readonly<OpeningOfferState> = Object.freeze({ declined: [], purchased: [] });

const TRIGGERS: readonly OpeningOfferTrigger[] = ['lead-selected'];
const MAX_RECORDED_IDS = 16;
const MAX_ID_LENGTH = 48;

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

function parseOffer(raw: unknown, index: number, earlierIds: ReadonlySet<string>, issues: string[]): OpeningOffer | null {
    const row = (raw ?? {}) as Record<string, unknown>;
    const label = `offers[${index}]`;
    const before = issues.length;
    if (!isNonEmptyString(row.id) || row.id.length > MAX_ID_LENGTH) issues.push(`${label}.id 必須是 1～${MAX_ID_LENGTH} 字的字串`);
    else if (earlierIds.has(row.id)) issues.push(`${label}.id 重複：${row.id}`);
    if (typeof row.price !== 'number' || !Number.isFinite(row.price) || row.price <= 0) issues.push(`${label}.price 必須是正數`);
    if (!isNonEmptyString(row.quote)) issues.push(`${label}.quote 不可為空`);
    const hasTrigger = row.trigger !== undefined;
    const hasAfter = row.after !== undefined;
    if (hasTrigger === hasAfter) issues.push(`${label} 必須剛好有 trigger 或 after 其中之一`);
    if (hasTrigger && !TRIGGERS.includes(row.trigger as OpeningOfferTrigger)) issues.push(`${label}.trigger 不認得：${String(row.trigger)}`);
    if (hasAfter && !earlierIds.has(row.after as string)) issues.push(`${label}.after 必須指向排在前面的商品`);
    if (issues.length > before) return null;
    return {
        id: row.id as string,
        price: row.price as number,
        quote: row.quote as string,
        ...(hasTrigger ? { trigger: row.trigger as OpeningOfferTrigger } : { after: row.after as string }),
    };
}

/** 驗證 data/opening-offers.json；有任何問題就整份不採用 */
export function parseOpeningOfferTable(raw: unknown): ParseOpeningOfferResult {
    const rows = (raw as { offers?: unknown } | null)?.offers;
    if (!Array.isArray(rows) || rows.length === 0) return { ok: false, issues: ['offers 必須是非空陣列'] };
    const issues: string[] = [];
    const seen = new Set<string>();
    const offers: OpeningOffer[] = [];
    rows.forEach((row, index) => {
        const offer = parseOffer(row, index, seen, issues);
        if (!offer) return;
        seen.add(offer.id);
        offers.push(offer);
    });
    return issues.length === 0 ? { ok: true, table: { offers } } : { ok: false, issues };
}

/** 序列最後一個商品：沒有其他商品以它為 after */
function tailOffer(table: Readonly<OpeningOfferTable>): OpeningOffer | null {
    const tail = table.offers.filter((offer) => offer.after !== undefined && !table.offers.some((o) => o.after === offer.id));
    return tail.length === 1 ? tail[0] : null;
}

/** 都沒買、最後一個商品已拒絕且冷卻已過：可以再推薦一次最後一個商品 */
function isReofferable(table: Readonly<OpeningOfferTable>, offer: OpeningOffer, state: Readonly<OpeningOfferState>, now: number | undefined): boolean {
    if (now === undefined || state.purchased.length > 0 || tailOffer(table)?.id !== offer.id) return false;
    return state.declined.includes(offer.id) && now >= (state.snoozeUntil ?? 0);
}

function isEligible(offer: OpeningOffer, state: Readonly<OpeningOfferState>, leadSelected: boolean): boolean {
    if (state.declined.includes(offer.id) || state.purchased.includes(offer.id)) return false;
    if (offer.after !== undefined) return state.declined.includes(offer.after);
    return offer.trigger === 'lead-selected' && leadSelected;
}

/** 現在該出的商品；沒有或教學在前景時回傳 null。關遊戲重進時，未回應的商品會再出現一次。 */
export function nextOpeningOffer(
    table: Readonly<OpeningOfferTable>,
    state: Readonly<OpeningOfferState>,
    context: Readonly<OpeningOfferContext>,
): OpeningOffer | null {
    if (context.tutorialBlocking) return null;
    const fresh = table.offers.find((offer) => isEligible(offer, state, context.leadSelected));
    if (fresh) return fresh;
    const tail = tailOffer(table);
    return context.leadSelected && tail && isReofferable(table, tail, state, context.now) ? tail : null;
}

/** 記下玩家對商品的回應；只接受目前可回應的商品，避免跳過序列或重複記錄 */
export function resolveOpeningOffer(
    table: Readonly<OpeningOfferTable>,
    state: Readonly<OpeningOfferState>,
    offerId: string,
    outcome: OpeningOfferOutcome,
    leadSelected: boolean,
    now?: number,
): OpeningOfferResolveResult {
    const offer = table.offers.find((row) => row.id === offerId);
    if (!offer || !leadSelected) return { ok: false };
    const reoffer = isReofferable(table, offer, state, now);
    if (!reoffer && !isEligible(offer, state, leadSelected)) return { ok: false };
    const declined = state.declined.filter((id) => !(outcome === 'purchased' && id === offerId));
    if (outcome === 'declined' && !declined.includes(offerId)) declined.push(offerId);
    const next: OpeningOfferState = {
        declined,
        purchased: outcome === 'purchased' ? [...state.purchased, offerId] : [...state.purchased],
    };
    // 最後一個商品被拒絕（含冷卻後再拒絕）：重新計 24 小時
    if (outcome === 'declined' && now !== undefined && tailOffer(table)?.id === offerId) next.snoozeUntil = now + OPENING_OFFER_SNOOZE_MS;
    else if (outcome === 'declined' && state.snoozeUntil !== undefined) next.snoozeUntil = state.snoozeUntil;
    return { ok: true, state: next };
}

function normalizeIds(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const valid = raw.filter((id): id is string => isNonEmptyString(id) && id.length <= MAX_ID_LENGTH);
    return valid.filter((id, index) => valid.indexOf(id) === index).slice(0, MAX_RECORDED_IDS);
}

/** 讀回存檔：壞資料視為沒有紀錄；同時出現在兩邊的 id 以已購買為準 */
export function normalizeOpeningOfferState(raw: unknown): OpeningOfferState {
    const value = (raw ?? {}) as { declined?: unknown; purchased?: unknown };
    const purchased = normalizeIds(value.purchased);
    const state: OpeningOfferState = { declined: normalizeIds(value.declined).filter((id) => !purchased.includes(id)), purchased };
    const snooze = (raw as { snoozeUntil?: unknown } | null)?.snoozeUntil;
    if (typeof snooze === 'number' && Number.isFinite(snooze) && snooze > 0) state.snoozeUntil = Math.floor(snooze);
    return state;
}
