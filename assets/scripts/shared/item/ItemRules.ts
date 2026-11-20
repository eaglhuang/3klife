// @spec-source → 物品庫存系統 Base 框架規格書 (doc_spec_1184) §4 規則 1～3、§3.3 綁定；共用框架總綱 (doc_spec_1182) §12 ITM-M；PROG-2-9203
/**
 * ItemRules — 物品庫存的純規則（零依賴）：發放預檢（堆疊上限、溢出折金、綁定、容器接受類型）、扣除預檢、
 * 紀錄與持久化中繼資料的正規化。不碰任何存放位置，所以家庭倉庫、武將背包、公庫共用同一份判斷。
 *
 * Unity 對照：像 Inventory.CanAdd／CanRemove 的純函式版，傳入「目前數量」回「會變成多少」，由呼叫端決定要不要寫入。
 */
import {
    HOLDER_KINDS, legacyItemDef,
    type ContainerRuleV1, type HolderRef, type HolderRuleV1, type ItemConfigV1, type ItemDefV1, type PeriodicGrantV1,
} from './ItemConfig';

/** 取得來源；SEASON＝定期發放、REFUND＝退還（不受堆疊上限限制，因為只是把剛扣掉的還回去） */
export const ITEM_GRANT_SOURCES = ['SHOP', 'TASK', 'DROP', 'EVENT', 'DECOMPOSE', 'REWARD', 'STORY', 'SYSTEM', 'SEASON', 'REFUND'] as const;
export type ItemGrantSource = (typeof ITEM_GRANT_SOURCES)[number];

export type ItemRuleFailure = 'HOLDER_UNKNOWN' | 'ITEM_NOT_ACCEPTED' | 'ITEM_BOUND' | 'ITEM_FULL' | 'ITEM_INSUFFICIENT';

export interface GrantPlan {
    ok: true;
    /** 實際入庫數量 */
    added: number;
    /** 溢出個數與折算後的貨幣；沒有溢出時為 null */
    overflow: { units: number; currency: string; amount: number } | null;
}

export type GrantCheck = GrantPlan | { ok: false; reason: ItemRuleFailure };

export function holderKey(holder: HolderRef): string {
    return `${holder.kind}:${holder.id}`;
}

export function parseHolder(raw: unknown): HolderRef | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.kind !== 'string' || (HOLDER_KINDS as readonly string[]).indexOf(r.kind) < 0) return null;
    if (typeof r.id !== 'string' || r.id.length === 0) return null;
    return { kind: r.kind as HolderRef['kind'], id: r.id };
}

export function findItemDef(config: ItemConfigV1, itemId: string): ItemDefV1 {
    return config.items.find((d) => d.id === itemId) ?? legacyItemDef(itemId);
}

export function findHolderRule(config: ItemConfigV1, holder: HolderRef): HolderRuleV1 | null {
    return config.holders.find((h) => h.kind === holder.kind) ?? null;
}

export function findContainerRule(config: ItemConfigV1, holder: HolderRef, container: string): ContainerRuleV1 | null {
    return findHolderRule(config, holder)?.containers.find((c) => c.id === container) ?? null;
}

export function findPeriodicGrant(config: ItemConfigV1, ruleId: string): PeriodicGrantV1 | null {
    return config.periodicGrants.find((g) => g.id === ruleId) ?? null;
}

/** 綁定檢查：general 只能放武將、household 只能放家；其餘不限 */
export function bindAllows(def: ItemDefV1, holder: HolderRef): boolean {
    if (def.bind === 'general') return holder.kind === 'general';
    if (def.bind === 'household') return holder.kind === 'household';
    return true;
}

/**
 * 發放預檢（不改任何東西）。
 * - 容器不接受該類型、綁定不符：整筆拒絕。
 * - 容器種類數上限：新種類且已滿，整筆拒絕。
 * - 超過堆疊上限：有溢出設定就收滿、多的折貨幣；沒有就整筆拒絕（原子，不收一半）。
 * - refund：退還剛扣掉的，不受堆疊上限限制。
 */
export function planGrant(
    config: ItemConfigV1, holder: HolderRef, container: string, itemId: string, qty: number,
    have: number, distinctKinds: number, refund = false,
): GrantCheck {
    const rule = findContainerRule(config, holder, container);
    if (!rule) return { ok: false, reason: 'HOLDER_UNKNOWN' };
    const def = findItemDef(config, itemId);
    if (rule.accepts.indexOf(def.kind) < 0) return { ok: false, reason: 'ITEM_NOT_ACCEPTED' };
    if (!bindAllows(def, holder)) return { ok: false, reason: 'ITEM_BOUND' };
    if (rule.capacity !== null && have <= 0 && distinctKinds >= rule.capacity) return { ok: false, reason: 'ITEM_FULL' };
    if (refund || def.stack.max === null) return { ok: true, added: qty, overflow: null };
    const space = Math.max(0, def.stack.max - have);
    if (qty <= space) return { ok: true, added: qty, overflow: null };
    if (!def.overflow) return { ok: false, reason: 'ITEM_FULL' };
    const units = qty - space;
    return { ok: true, added: space, overflow: { units, currency: def.overflow.toCurrency, amount: units * def.overflow.amount } };
}

/** 扣除預檢：數量不足整筆拒絕 */
export function planConsume(have: number, qty: number): { ok: true } | { ok: false; reason: 'ITEM_INSUFFICIENT' } {
    return have >= qty ? { ok: true } : { ok: false, reason: 'ITEM_INSUFFICIENT' };
}

/** 帳本一筆：取得（delta > 0）或消耗（delta < 0） */
export interface ItemLedgerRecord {
    itemId: string;
    holder: HolderRef;
    delta: number;
    /** 取得來源或消耗去向（USE／ENROLL…） */
    reason: string;
    /** 溢出折算的貨幣，沒有為 0 */
    overflowAmount: number;
    /** 權威端單調遞增序號（不用時鐘，重播結果一致） */
    seq: number;
}

export const ITEM_LEDGER_LIMIT = 100;

/** 持久化中繼資料（存檔欄位 itemMeta，選填、舊檔缺值讀回為空；自帶版號） */
export interface ItemMeta {
    v: 1;
    /** 定期發放高水位：ruleId → 上次發放的季序 */
    periodic: Record<string, number>;
    ledger: ItemLedgerRecord[];
    seq: number;
}

export function emptyItemMeta(): ItemMeta {
    return { v: 1, periodic: {}, ledger: [], seq: 0 };
}

export function normalizeItemMeta(raw: unknown): ItemMeta {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyItemMeta();
    const src = raw as Record<string, unknown>;
    const periodic: Record<string, number> = {};
    if (src.periodic && typeof src.periodic === 'object' && !Array.isArray(src.periodic)) {
        for (const [k, v] of Object.entries(src.periodic as Record<string, unknown>)) {
            if (typeof v === 'number' && Number.isInteger(v) && v >= 0) periodic[k] = v;
        }
    }
    const ledger: ItemLedgerRecord[] = [];
    for (const e of Array.isArray(src.ledger) ? src.ledger : []) {
        const r = e as Record<string, unknown> | null;
        const holder = r ? parseHolder(r.holder) : null;
        if (!r || !holder || typeof r.itemId !== 'string' || typeof r.delta !== 'number' || !Number.isInteger(r.delta) || r.delta === 0) continue;
        ledger.push({
            itemId: r.itemId, holder, delta: r.delta, reason: typeof r.reason === 'string' ? r.reason : 'UNKNOWN',
            overflowAmount: typeof r.overflowAmount === 'number' && r.overflowAmount > 0 ? Math.floor(r.overflowAmount) : 0,
            seq: typeof r.seq === 'number' && Number.isInteger(r.seq) ? r.seq : 0,
        });
    }
    const seq = typeof src.seq === 'number' && Number.isInteger(src.seq) && src.seq >= 0 ? src.seq : ledger.length;
    return { v: 1, periodic, ledger: ledger.slice(-ITEM_LEDGER_LIMIT), seq };
}

/** 附加一筆帳本，超過上限丟最舊的；回傳新中繼資料，不改原物件 */
export function appendLedger(meta: ItemMeta, rec: Omit<ItemLedgerRecord, 'seq'>): ItemMeta {
    const seq = meta.seq + 1;
    return { ...meta, seq, ledger: [...meta.ledger, { ...rec, seq }].slice(-ITEM_LEDGER_LIMIT) };
}
