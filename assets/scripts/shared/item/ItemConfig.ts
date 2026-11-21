// @spec-source → 物品庫存系統 Base 框架規格書 (doc_spec_1184) §3 共用資料結構；共用框架總綱 (doc_spec_1182) §12 ITM-M；PROG-2-9203
/**
 * ItemConfig — 物品庫存 base 的設定型別與預設值（零依賴純函式庫，不 import cc）。
 *
 * 一個庫存空間由「持有者（Holder）＋容器（Container）」決定：持有者種類只是名稱不同
 * （武將＝背包、家＝庫房、幕府＝公庫、家族＝倉庫），邏輯共用一套。MVP 只開家庭倉庫（household/main）。
 * 數值寫在 assets/resources/data/item-config.json，這裡的 DEFAULT_ITEM_CONFIG 是 JSON 缺檔時的後備，
 * 兩者內容必須一致（測試鎖定）。
 *
 * Unity 對照：像 ScriptableObject 的 ItemDefDatabase＋ContainerRule，執行期只讀、不存檔。
 */

export type HolderKind = 'player' | 'general' | 'household' | 'shogunate' | 'clan';
export const HOLDER_KINDS: readonly HolderKind[] = Object.freeze(['player', 'general', 'household', 'shogunate', 'clan']);

export interface HolderRef {
    kind: HolderKind;
    id: string;
}

/** token＝令牌類（入學令、求籤令）；mentorCard／equipment／treasure／card 為後續卡預留，MVP 只做可疊加的數量型 */
export type ItemKind = 'token' | 'consumable' | 'material' | 'special' | 'currency' | 'equipment' | 'treasure' | 'card' | 'mentorCard';
export const ITEM_KINDS: readonly ItemKind[] = Object.freeze([
    'token', 'consumable', 'material', 'special', 'currency', 'equipment', 'treasure', 'card', 'mentorCard',
]);

/** general＝只能放在武將身上；household＝只能放在家（傳家寶）；其餘不限制持有者 */
export type ItemBind = 'none' | 'onAcquire' | 'onEquip' | 'general' | 'household';
export const ITEM_BINDS: readonly ItemBind[] = Object.freeze(['none', 'onAcquire', 'onEquip', 'general', 'household']);

/** 超過堆疊上限的部分折成貨幣（每溢出 1 個折 amount） */
export interface ItemOverflow {
    toCurrency: string;
    amount: number;
}

/** 物品用途限制：academyOnly＝只在學府修業使用，出征、守城、派遣編制一律排除（doc_spec_1264 §19） */
export type ItemUsage = 'academyOnly';

/** 實例狀態預設值（unique 物品持有時各自帶一份，例如支援卡的等級、經驗、傳承次數） */
export interface ItemInstanceState {
    level: number;
    exp: number;
    limitBreak: number;
}

/**
 * 實例成長規則（unique 物品帶 instanceState 時才有意義）：等級上限＝cap0＋capPerBreak×傳承次數（傳承最多 maxBreak 次），
 * 升到下一級需要的經驗＝expBase＋expPerLevel×(等級−1)。資料來源：support-rules.json（支援卡），不寫死在程式。
 */
export interface ItemGrowthRule {
    cap0: number;
    capPerBreak: number;
    maxBreak: number;
    expBase: number;
    expPerLevel: number;
}

/** 使用效果：supportExp＝把 exp 點經驗加到一個支援卡實例（item.use，doc_spec_1264 §5.2、§19） */
export interface ItemUseEffect {
    effectType: 'supportExp';
    exp: number;
}

export interface ItemDefV1 {
    id: string;
    kind: ItemKind;
    /** stackable＝可疊加（max=null 無上限）；unique＝同 id 只能持有 1 件（max 固定 1，重複發放走 ITEM_FULL，由獎勵規則決定怎麼處置） */
    stack: { mode: 'stackable' | 'unique'; max: number | null };
    bind: ItemBind;
    /** null＝超過上限整筆拒收（ITEM_FULL） */
    overflow: ItemOverflow | null;
    /** 物品類別（例：supportCard）；沒有類別的舊物品不填 */
    category?: string;
    /** 用途限制；沒有限制的物品不填 */
    usage?: ItemUsage;
    /** 稀有度（數字越大越稀有）；沒有的不填 */
    rarity?: number;
    /** 持有時每件各帶一份的實例狀態預設值；只對 unique 物品有意義 */
    instanceState?: ItemInstanceState;
    /** 實例成長規則；沒有就不能升級 */
    growth?: ItemGrowthRule;
    /** 使用效果；沒有就不能 item.use */
    useEffect?: ItemUseEffect;
}

export interface ContainerRuleV1 {
    id: string;
    accepts: ItemKind[];
    /** 容器可放的物品種類數上限；null＝不限（沿用既有倉庫「種類數」算法，擴容規則留給後續卡） */
    capacity: number | null;
}

export interface HolderRuleV1 {
    kind: HolderKind;
    /** 玩家看到的名稱 key（背包／庫房／公庫／倉庫），只影響文案 */
    aliasKey: string;
    containers: ContainerRuleV1[];
}

/** 定期發放：每滿 everySeasons 季發 count 個（FND-M periodsDue 算期數；封頂與溢出由物品定義決定） */
export interface PeriodicGrantV1 {
    id: string;
    holder: HolderRef;
    container: string;
    itemId: string;
    everySeasons: number;
    count: number;
}

export interface ItemConfigV1 {
    schema: 'item-config.v1';
    items: ItemDefV1[];
    holders: HolderRuleV1[];
    periodicGrants: PeriodicGrantV1[];
}

export const ITEM_CONFIG_JSON = 'data/item-config';
export const HOUSEHOLD_HOLDER: HolderRef = Object.freeze({ kind: 'household', id: 'home' }) as HolderRef;
export const DEFAULT_CONTAINER_ID = 'main';
/** 入學令（沿用既有 ItemDef 的 id，存檔裡的舊數量原樣沿用） */
export const ADMISSION_TOKEN_ID = 'ITEM_ADMISSION_TOKEN';
export const ADMISSION_SEASON_RULE_ID = 'academy_admission_season';
/** 軍令狀（極速決戰每日免費次數用完後每次耗 1 張，PROG-2-9709）；無持有上限，第一版只從任務／獎勵取得 */
export const QUICK_RESOLVE_WRIT_ID = 'ITEM_QUICK_RESOLVE_WRIT';

/** 設定檔未出現的物品（舊存檔裡的其他道具）視為無上限的消耗品，行為與改造前一致 */
export function legacyItemDef(id: string): ItemDefV1 {
    return { id, kind: 'consumable', stack: { mode: 'stackable', max: null }, bind: 'none', overflow: null };
}

export const DEFAULT_ITEM_CONFIG: ItemConfigV1 = Object.freeze({
    schema: 'item-config.v1',
    items: [
        { id: ADMISSION_TOKEN_ID, kind: 'token', stack: { mode: 'stackable', max: 3 }, bind: 'none', overflow: { toCurrency: 'gold', amount: 100 } },
        { id: QUICK_RESOLVE_WRIT_ID, kind: 'token', stack: { mode: 'stackable', max: null }, bind: 'none', overflow: null },
    ],
    holders: [
        {
            kind: 'household', aliasKey: 'holder.household.name',
            containers: [{ id: DEFAULT_CONTAINER_ID, accepts: ['token', 'consumable', 'material', 'special', 'currency', 'treasure', 'card'], capacity: null }],
        },
    ],
    periodicGrants: [
        { id: ADMISSION_SEASON_RULE_ID, holder: { kind: 'household', id: 'home' }, container: DEFAULT_CONTAINER_ID, itemId: ADMISSION_TOKEN_ID, everySeasons: 1, count: 1 },
    ],
}) as ItemConfigV1;

function isPosInt(v: unknown): v is number {
    return typeof v === 'number' && Number.isInteger(v) && v > 0;
}

function isHolderKind(v: unknown): v is HolderKind {
    return typeof v === 'string' && (HOLDER_KINDS as readonly string[]).indexOf(v) >= 0;
}

function isItemKind(v: unknown): v is ItemKind {
    return typeof v === 'string' && (ITEM_KINDS as readonly string[]).indexOf(v) >= 0;
}

function normalizeGrowth(raw: unknown): ItemGrowthRule | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    if (!isPosInt(r.cap0) || !isPosInt(r.capPerBreak) || !isPosInt(r.expBase)) return null;
    const maxBreak = typeof r.maxBreak === 'number' && Number.isInteger(r.maxBreak) && r.maxBreak >= 0 ? r.maxBreak : 0;
    const expPerLevel = typeof r.expPerLevel === 'number' && Number.isInteger(r.expPerLevel) && r.expPerLevel >= 0 ? r.expPerLevel : 0;
    return { cap0: r.cap0, capPerBreak: r.capPerBreak, maxBreak, expBase: r.expBase, expPerLevel };
}

function normalizeUseEffect(raw: unknown): ItemUseEffect | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    return r.effectType === 'supportExp' && isPosInt(r.exp) ? { effectType: 'supportExp', exp: r.exp } : null;
}

function normalizeInstanceState(raw: unknown): ItemInstanceState | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    const level = isPosInt(r.level) ? r.level : 1;
    const exp = typeof r.exp === 'number' && Number.isInteger(r.exp) && r.exp >= 0 ? r.exp : 0;
    const limitBreak = typeof r.limitBreak === 'number' && Number.isInteger(r.limitBreak) && r.limitBreak >= 0 ? r.limitBreak : 0;
    return { level, exp, limitBreak };
}

/**
 * 讀進來的 JSON 逐欄檢查；壞掉的條目丟掉，整份不是物件時回預設。
 * 不丟例外：設定壞了不能讓遊戲開不起來（比照其他 configure* 的做法）。
 */
export function normalizeItemConfig(raw: unknown): ItemConfigV1 {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_ITEM_CONFIG;
    const src = raw as Record<string, unknown>;
    const items: ItemDefV1[] = [];
    for (const entry of Array.isArray(src.items) ? src.items : []) {
        const e = entry as Record<string, unknown> | null;
        if (!e || typeof e.id !== 'string' || e.id.length === 0 || !isItemKind(e.kind)) continue;
        const stack = (e.stack ?? {}) as Record<string, unknown>;
        const unique = stack.mode === 'unique';
        const max = unique ? 1 : (stack.max === null || stack.max === undefined ? null : (isPosInt(stack.max) ? stack.max : null));
        const bind = typeof e.bind === 'string' && (ITEM_BINDS as readonly string[]).indexOf(e.bind) >= 0 ? (e.bind as ItemBind) : 'none';
        const ov = e.overflow as Record<string, unknown> | null | undefined;
        const overflow = ov && typeof ov.toCurrency === 'string' && ov.toCurrency.length > 0 && isPosInt(ov.amount)
            ? { toCurrency: ov.toCurrency, amount: ov.amount } : null;
        const def: ItemDefV1 = { id: e.id, kind: e.kind, stack: { mode: unique ? 'unique' : 'stackable', max }, bind, overflow };
        if (typeof e.category === 'string' && e.category.length > 0) def.category = e.category;
        if (e.usage === 'academyOnly') def.usage = e.usage;
        if (isPosInt(e.rarity)) def.rarity = e.rarity;
        const inst = unique ? normalizeInstanceState(e.instanceState) : null;
        if (inst) def.instanceState = inst;
        const growth = unique ? normalizeGrowth(e.growth) : null;
        if (growth) def.growth = growth;
        const use = normalizeUseEffect(e.useEffect);
        if (use) def.useEffect = use;
        items.push(def);
    }
    const holders: HolderRuleV1[] = [];
    for (const entry of Array.isArray(src.holders) ? src.holders : []) {
        const e = entry as Record<string, unknown> | null;
        if (!e || !isHolderKind(e.kind) || !Array.isArray(e.containers)) continue;
        const containers: ContainerRuleV1[] = [];
        for (const c of e.containers) {
            const cc = c as Record<string, unknown> | null;
            if (!cc || typeof cc.id !== 'string' || cc.id.length === 0 || !Array.isArray(cc.accepts)) continue;
            containers.push({
                id: cc.id,
                accepts: cc.accepts.filter(isItemKind),
                capacity: isPosInt(cc.capacity) ? cc.capacity : null,
            });
        }
        if (containers.length > 0) holders.push({ kind: e.kind, aliasKey: typeof e.aliasKey === 'string' ? e.aliasKey : `holder.${e.kind}.name`, containers });
    }
    const periodicGrants: PeriodicGrantV1[] = [];
    for (const entry of Array.isArray(src.periodicGrants) ? src.periodicGrants : []) {
        const e = entry as Record<string, unknown> | null;
        const h = (e?.holder ?? null) as Record<string, unknown> | null;
        if (!e || typeof e.id !== 'string' || typeof e.itemId !== 'string' || !h || !isHolderKind(h.kind) || typeof h.id !== 'string') continue;
        if (!isPosInt(e.everySeasons) || !isPosInt(e.count)) continue;
        periodicGrants.push({
            id: e.id, holder: { kind: h.kind, id: h.id }, container: typeof e.container === 'string' ? e.container : DEFAULT_CONTAINER_ID,
            itemId: e.itemId, everySeasons: e.everySeasons, count: e.count,
        });
    }
    if (holders.length === 0) return DEFAULT_ITEM_CONFIG;
    return { schema: 'item-config.v1', items, holders, periodicGrants };
}
