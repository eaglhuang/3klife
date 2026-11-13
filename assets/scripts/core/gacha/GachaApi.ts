// @spec-source → 轉蛋系統.md (doc_spec_0042)；PROG-2-9024（轉蛋標準 API：本機實作，日後換伺服器實作）
/**
 * 轉蛋標準 API（純型別與純函式，不依賴 cc）。
 *
 * 畫面只透過 GachaApi 取池清單、錢包、抽卡與紀錄；所有往來資料都是可直接 JSON 序列化的 DTO，
 * 所以把本機實作（LocalGachaApi）換成走網路的伺服器實作時，畫面不用改。
 *
 * 伺服器對應（建議路由）：
 *   GET  /gacha/pools          → listPools()
 *   GET  /gacha/wallet         → getWallet()
 *   POST /gacha/pull           → pull(GachaPullRequestDto)
 *   GET  /gacha/history?limit= → getHistory(limit)
 *
 * Unity 對照：IGachaService 介面＋LocalGachaService / RemoteGachaService 兩個實作，以 DI 切換。
 */

export const GACHA_API_VERSION = 1;

export type GachaCurrencyId = 'gems' | 'gold' | 'tickets' | 'bronze' | 'oracle' | 'mentorTickets' | 'scorePoints';
export type GachaPoolThemeId = 'wood' | 'black-gold' | 'sakura' | 'jade';
export type GachaRarityId = 'SSR' | 'SR' | 'R';

/** 錯誤碼：伺服器實作必須回傳同一組代碼，畫面依代碼顯示訊息 */
export type GachaApiErrorCode =
    | 'POOL_NOT_FOUND'
    | 'POOL_CLOSED'
    | 'CURRENCY_NOT_ALLOWED'
    | 'INSUFFICIENT_CURRENCY'
    | 'INVALID_COUNT'
    | 'NO_CANDIDATES'
    | 'INTERNAL';

export interface GachaRateDto {
    rarity: GachaRarityId | 'UP';
    /** 百分比，例如 3 代表 3% */
    percent: number;
}

export interface GachaPityDto {
    label: string;
    /** 距離下次 SSR 保底的累計抽數 */
    current: number;
    max: number;
    /** 天命值：累計抽數與 200 抽兌換上限 */
    destinyCurrent: number;
    destinyMax: number;
}

export interface GachaPoolDto {
    key: string;
    poolId: string;
    theme: GachaPoolThemeId;
    name: string;
    sub: string;
    badge: string;
    series: string;
    brief: string;
    /** 橫幅展示的武將（限定池為本期焦點武將） */
    showcaseGeneralId: string | null;
    /** 限定池：本期焦點武將與下架時刻；常設池為空 */
    featuredGeneralIds: string[];
    endsAtMs: number | null;
    /** 可用貨幣，依扣款優先順序 */
    currencies: GachaCurrencyId[];
    singleCost: number;
    tenCost: number;
    rates: GachaRateDto[];
    pity: GachaPityDto;
}

export type GachaWalletDto = Record<GachaCurrencyId, number>;

export interface GachaPullRequestDto {
    poolId: string;
    /** 1 或 10 */
    count: number;
    /** 指定貨幣；不給時依池的 currencies 順序挑第一個夠付的 */
    currency?: GachaCurrencyId;
    /** 客戶端產生的唯一碼，伺服器用來防重送（本機實作只回傳不檢查） */
    requestId?: string;
}

export interface GachaPullItemDto {
    generalId: string;
    name: string;
    rarity: GachaRarityId;
    /** 是否為本期焦點武將 */
    isFeatured: boolean;
}

export type GachaPullResponseDto =
    | { ok: true; requestId?: string; poolId: string; currency: GachaCurrencyId; spent: number; items: GachaPullItemDto[]; wallet: GachaWalletDto; pity: GachaPityDto }
    | { ok: false; requestId?: string; poolId: string; error: GachaApiErrorCode; message: string; shortfall?: number };

export interface GachaHistoryEntryDto {
    timestampMs: number;
    poolId: string;
    generalId: string;
    name: string;
    rarity: GachaRarityId;
}

export interface GachaApi {
    listPools(nowMs?: number): Promise<GachaPoolDto[]>;
    getWallet(): Promise<GachaWalletDto>;
    pull(request: GachaPullRequestDto): Promise<GachaPullResponseDto>;
    getHistory(limit: number): Promise<{ total: number; entries: GachaHistoryEntryDto[] }>;
}

/** 主畫面池清單設定（data/gacha-main-pools.json 的一筆） */
export interface GachaMainPoolConfig {
    key: string;
    poolId: string;
    theme: GachaPoolThemeId;
    name: string;
    sub: string;
    badge: string;
    series: string;
    brief: string;
    showcaseGeneralId?: string;
    currencies: GachaCurrencyId[];
    singleCost: number;
    tenCost: number;
    pityLabel: string;
}

const THEMES: readonly GachaPoolThemeId[] = ['wood', 'black-gold', 'sakura', 'jade'];
const CURRENCIES: readonly GachaCurrencyId[] = ['gems', 'gold', 'tickets', 'bronze', 'oracle', 'mentorTickets', 'scorePoints'];

/** 解析主畫面池清單；格式不對的項目略過。 */
export function parseGachaMainPools(raw: unknown): GachaMainPoolConfig[] {
    const list = (raw as { pools?: unknown } | null | undefined)?.pools;
    if (!Array.isArray(list)) return [];
    const result: GachaMainPoolConfig[] = [];
    for (const item of list) {
        const e = item as Record<string, unknown> | null;
        if (!e || typeof e !== 'object') continue;
        const str = (k: string): string => (typeof e[k] === 'string' ? (e[k] as string) : '');
        const currencies = Array.isArray(e.currencies) ? (e.currencies as unknown[]).filter((c): c is GachaCurrencyId => CURRENCIES.includes(c as GachaCurrencyId)) : [];
        const theme = THEMES.includes(e.theme as GachaPoolThemeId) ? (e.theme as GachaPoolThemeId) : 'wood';
        const single = Number(e.singleCost), ten = Number(e.tenCost);
        if (!str('key') || !str('poolId') || currencies.length === 0 || !(single > 0) || !(ten > 0)) continue;
        result.push({
            key: str('key'), poolId: str('poolId'), theme, name: str('name'), sub: str('sub'), badge: str('badge'),
            series: str('series'), brief: str('brief'), showcaseGeneralId: str('showcaseGeneralId') || undefined,
            currencies, singleCost: single, tenCost: ten, pityLabel: str('pityLabel') || 'SSR 保底進度',
        });
    }
    return result;
}

/** 單抽／十連的費用 */
export function gachaCostOf(pool: Pick<GachaMainPoolConfig, 'singleCost' | 'tenCost'>, count: number): number {
    return count === 10 ? pool.tenCost : pool.singleCost * count;
}

/** 依池的貨幣順序挑第一個夠付的；指定貨幣時只檢查該貨幣 */
export function pickPullCurrency(
    pool: Pick<GachaMainPoolConfig, 'currencies' | 'singleCost' | 'tenCost'>,
    count: number,
    wallet: Readonly<Partial<GachaWalletDto>>,
    preferred?: GachaCurrencyId,
): { ok: true; currency: GachaCurrencyId; cost: number } | { ok: false; error: 'CURRENCY_NOT_ALLOWED' | 'INSUFFICIENT_CURRENCY'; shortfall: number } {
    const cost = gachaCostOf(pool, count);
    if (preferred && !pool.currencies.includes(preferred)) return { ok: false, error: 'CURRENCY_NOT_ALLOWED', shortfall: 0 };
    const order = preferred ? [preferred] : pool.currencies;
    for (const c of order) if ((wallet[c] ?? 0) >= cost) return { ok: true, currency: c, cost };
    const best = Math.max(0, ...order.map((c) => wallet[c] ?? 0));
    return { ok: false, error: 'INSUFFICIENT_CURRENCY', shortfall: cost - best };
}

/** 機率（百分比）；限定池把 SSR 依 UP 占比拆成 UP 與一般 SSR */
export function gachaRatesOf(rates: Readonly<Record<GachaRarityId, number>>, upShareSsr: number, hasFeatured: boolean): GachaRateDto[] {
    const pct = (v: number): number => Math.round(v * 10000) / 100;
    if (!hasFeatured) return [{ rarity: 'SSR', percent: pct(rates.SSR) }, { rarity: 'SR', percent: pct(rates.SR) }, { rarity: 'R', percent: pct(rates.R) }];
    return [
        { rarity: 'UP', percent: pct(rates.SSR * upShareSsr) },
        { rarity: 'SSR', percent: pct(rates.SSR * (1 - upShareSsr)) },
        { rarity: 'SR', percent: pct(rates.SR) },
        { rarity: 'R', percent: pct(rates.R) },
    ];
}

/** 保底：距下次小保底（每 smallInterval 抽必出 SSR）與天命值（largeCount 抽可兌換） */
export function gachaPityOf(label: string, pullCount: number, lastSsrPull: number, smallInterval: number, largeCount: number): GachaPityDto {
    const sinceSsr = Math.max(0, pullCount - lastSsrPull);
    return {
        label,
        current: Math.min(smallInterval, sinceSsr % smallInterval),
        max: smallInterval,
        destinyCurrent: pullCount % largeCount,
        destinyMax: largeCount,
    };
}
