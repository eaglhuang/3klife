// @spec-source → 轉蛋系統.md (doc_spec_0042)；PROG-2-9024（轉蛋標準 API 的本機實作）
/**
 * 本機轉蛋 API：把 GachaSystem（各池規則）與 LocalGachaService（錢包、保底、存檔、紀錄）包成 GachaApi。
 * 日後接伺服器時，另寫 ServerGachaApi 實作同一介面（fetch 對應路由），畫面不用改。
 *
 * Unity 對照：LocalGachaService : IGachaService。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import type { GachaSystem } from '../systems/GachaSystem';
import type { LocalGachaResultEntry, LocalGachaService } from '../services/LocalGachaService';
import { GACHA_MENTOR_RARITY_RATES, GACHA_RARITY_RATES } from '../systems/GachaDraw';
import {
    gachaPityOf, gachaRatesOf, pickPullCurrency,
    type GachaApi, type GachaApiErrorCode, type GachaCurrencyId, type GachaHistoryEntryDto, type GachaMainPoolConfig,
    type GachaPoolDto, type GachaPullItemDto, type GachaPullRequestDto, type GachaPullResponseDto, type GachaRarityId, type GachaWalletDto,
} from './GachaApi';
import type { RewardGachaPort } from './RewardGachaPull';

/** 小保底間隔與天命值上限（轉蛋系統 §保底） */
export const GACHA_SMALL_PITY = 50;
export const GACHA_DESTINY_MAX = 200;
/** 限定池 SSR 中焦點武將占比（規格：SSR 70% 從 Up 抽） */
export const GACHA_UP_SHARE_SSR = 0.7;

export interface LocalGachaApiDeps {
    system: GachaSystem;
    service: LocalGachaService;
    pools: () => readonly GachaMainPoolConfig[];
    /** 依池回傳候選武將（紅顏池只給女將、支援卡池只給支援卡目錄） */
    candidates: (poolId: string) => GeneralConfig[];
    /** 抽卡成功後通知（入名冊、教官卡入庫等由呼叫端處理） */
    onPulled?: (poolId: string, results: readonly LocalGachaResultEntry[]) => void;
    now?: () => number;
    /**
     * 抽取改走共通 API 的轉接（旗標 gachaReward 開啟且該池有對應獎池時才回傳）；回 null 就走舊路徑（LocalGachaService）。
     * 每次呼叫才取，所以旗標、獎池載入與釋放（離開轉蛋畫面）都不用重建本物件。
     */
    reward?: () => RewardGachaPort | null;
    /** 獎池 UP 項目（例如支援卡 id）→ 橫幅展示的武將 id；沒有對應回 null */
    showcaseOfUp?: (entryId: string) => string | null;
}

/** 武將稀有度階 → 轉蛋稀有度（mythic/legendary=SSR、epic=SR、其餘=R） */
const RARITY: Record<string, GachaRarityId> = { mythic: 'SSR', legendary: 'SSR', epic: 'SR', rare: 'R', common: 'R', SSR: 'SSR', SR: 'SR', R: 'R' };

export class LocalGachaApi implements GachaApi {
    constructor(private readonly _deps: LocalGachaApiDeps) {}

    /** 目前開放的池（限定池只在有開放時間窗時出現） */
    public async listPools(nowMs: number = this._now()): Promise<GachaPoolDto[]> {
        const result: GachaPoolDto[] = [];
        for (const pool of this._deps.pools()) {
            const window = pool.theme === 'black-gold' || this._isLimited(pool.poolId) ? this._deps.service.getOpenLimitedWindow(pool.poolId, nowMs) : null;
            if (this._isLimited(pool.poolId) && !window) continue;
            const featured = window ? [...window.featuredGeneralIds] : [];
            const pity = this._deps.service.getPoolPityState(pool.poolId);
            const rates = pool.poolId === 'mentor-pool' || pool.key === 'support' ? GACHA_MENTOR_RARITY_RATES : GACHA_RARITY_RATES;
            const rewardView = await this._rewardPort(pool.poolId)?.view(pool.poolId) ?? null;
            const upShowcase = rewardView?.upEntryIds.map((id) => this._deps.showcaseOfUp?.(id) ?? null).find((id) => !!id) ?? null;
            const legacyPity = gachaPityOf(pool.pityLabel, pity.pullCount, pity.lastSsrPull, GACHA_SMALL_PITY, GACHA_DESTINY_MAX);
            result.push({
                key: pool.key, poolId: pool.poolId, theme: pool.theme, name: pool.name, sub: pool.sub, badge: pool.badge,
                series: pool.series, brief: pool.brief,
                // 展示主角：限定池焦點 > 獎池 UP 項目（預設進池先看 UP 卡）> 池設定的展示武將
                showcaseGeneralId: featured[0] ?? upShowcase ?? pool.showcaseGeneralId ?? null,
                featuredGeneralIds: featured,
                endsAtMs: window ? window.endMs : null,
                currencies: [...pool.currencies], singleCost: pool.singleCost, tenCost: pool.tenCost,
                // 走共通 API 的池：機率與保底進度取自獎池（與抽樣同一份資料）；天命值仍由舊服務提供
                rates: rewardView ? rewardView.rates : gachaRatesOf(rates as Record<GachaRarityId, number>, GACHA_UP_SHARE_SSR, featured.length > 0),
                pities: rewardView?.pities,
                showcaseIsUp: !featured[0] && !!upShowcase,
                pity: rewardView?.pity ? { ...legacyPity, current: rewardView.pity.current, max: rewardView.pity.max } : legacyPity,
            });
        }
        return result;
    }

    public async getWallet(): Promise<GachaWalletDto> {
        return { ...this._deps.service.getWalletSnapshot() };
    }

    public async pull(request: GachaPullRequestDto): Promise<GachaPullResponseDto> {
        const { poolId, count, requestId } = request;
        const fail = (error: GachaApiErrorCode, message: string, shortfall?: number): GachaPullResponseDto =>
            ({ ok: false, requestId, poolId, error, message, ...(shortfall !== undefined ? { shortfall } : {}) });
        const pool = this._deps.pools().find((p) => p.poolId === poolId);
        if (!pool) return fail('POOL_NOT_FOUND', '找不到這個卡池');
        if (count !== 1 && count !== 10) return fail('INVALID_COUNT', '只能單抽或十連');
        const nowMs = this._now();
        const window = this._deps.service.getOpenLimitedWindow(poolId, nowMs);
        if (this._isLimited(poolId) && !window) return fail('POOL_CLOSED', '限定池目前未開放');
        const port = this._rewardPort(poolId);
        const generals = port ? [] : this._deps.candidates(poolId);
        if (!port && generals.length === 0) return fail('NO_CANDIDATES', '這個卡池目前沒有可抽的武將');

        const before = await this.getWallet();
        const pick = pickPullCurrency(pool, count, before, request.currency);
        if (pick.ok === false) {
            const miss = pick as { error: string; shortfall: number };
            return miss.error === 'CURRENCY_NOT_ALLOWED'
                ? fail('CURRENCY_NOT_ALLOWED', '這個卡池不收這種貨幣')
                : fail('INSUFFICIENT_CURRENCY', `餘額不足，還差 ${miss.shortfall}`, miss.shortfall);
        }

        if (port) {
            try {
                const out = await port.pull({ poolId, count, currency: pick.currency, cost: pick.cost, requestId });
                this._deps.onPulled?.(poolId, out.results);
                const wallet = await this.getWallet();
                const featuredIds = new Set(window?.featuredGeneralIds ?? []);
                const view = await port.view(poolId);
                const state = this._deps.service.getPoolPityState(poolId);
                const legacy = gachaPityOf(pool.pityLabel, state.pullCount, state.lastSsrPull, GACHA_SMALL_PITY, GACHA_DESTINY_MAX);
                return {
                    ok: true, requestId, poolId, currency: out.currency, spent: out.spent, wallet,
                    items: out.results.map((r) => ({ generalId: r.general.id, name: r.general.name, rarity: RARITY[r.rarityTier] ?? 'R', isFeatured: featuredIds.has(r.general.id) })),
                    pity: view?.pity ? { ...legacy, current: view.pity.current, max: view.pity.max } : legacy,
                };
            } catch (error) {
                const text = error instanceof Error ? error.message : String(error);
                return fail(text.startsWith('餘額不足') ? 'INSUFFICIENT_CURRENCY' : 'INTERNAL', text);
            }
        }

        let results: LocalGachaResultEntry[];
        try {
            const outcome = await this._deps.system.pull({ poolId, drawCount: count, generals });
            results = outcome.results;
        } catch (error) {
            return fail('INTERNAL', error instanceof Error ? error.message : String(error));
        }
        this._deps.onPulled?.(poolId, results);

        const wallet = await this.getWallet();
        const spentEntry = (Object.keys(before) as GachaCurrencyId[])
            .map((c) => ({ c, d: before[c] - wallet[c] }))
            .filter((e) => e.d > 0)
            .sort((a, b) => b.d - a.d)[0];
        const featured = new Set(window?.featuredGeneralIds ?? []);
        const items: GachaPullItemDto[] = results.map((r) => ({
            generalId: r.general.id, name: r.general.name, rarity: RARITY[r.rarityTier] ?? 'R', isFeatured: featured.has(r.general.id),
        }));
        const pity = this._deps.service.getPoolPityState(poolId);
        return {
            ok: true, requestId, poolId,
            currency: spentEntry?.c ?? (results[0]?.currencyKey as GachaCurrencyId) ?? pick.currency,
            spent: spentEntry?.d ?? 0,
            items, wallet,
            pity: gachaPityOf(pool.pityLabel, pity.pullCount, pity.lastSsrPull, GACHA_SMALL_PITY, GACHA_DESTINY_MAX),
        };
    }

    public async getHistory(limit: number): Promise<{ total: number; entries: GachaHistoryEntryDto[] }> {
        const data = await this._deps.service.getRecentPullHistory(limit);
        const entries: GachaHistoryEntryDto[] = [];
        for (const record of data.records) {
            for (const r of record.results) {
                entries.push({ timestampMs: record.timestamp, poolId: record.poolId, generalId: r.id, name: r.name, rarity: RARITY[r.rarityTier] ?? 'R' });
            }
        }
        return { total: data.total, entries };
    }

    /** 這個池此刻是否走共通 API（旗標開啟且獎池已載入）；否則 null */
    private _rewardPort(poolId: string): RewardGachaPort | null {
        const port = this._deps.reward?.() ?? null;
        return port && port.handles(poolId) ? port : null;
    }

    private _isLimited(poolId: string): boolean {
        return this._deps.system.pool(poolId)?.poolType === 'limited';
    }

    private _now(): number {
        return this._deps.now ? this._deps.now() : Date.now();
    }
}
