import { sys } from 'cc';
import type { GeneralConfig, GeneralDetailRarityTier } from '../models/GeneralUnit';
import { Faction } from '../config/Constants';
import { services } from '../managers/ServiceLoader';
import { SyncActionType } from '../systems/SyncManager';
import { checkWalletBalance, formatInsufficientMessage, STARTER_GACHA_WALLET } from './GachaWalletRules';
import { drawGeneralOnce, normalizeGachaPity, resolveGachaPityBook, type GachaPityBook, type GachaPool } from '../systems/GachaDraw';
import { ActionLogStore, type GachaActionType, type GachaCurrencyKey, type GachaHistoryRecord } from './ActionLogStore';

export interface LocalGachaRollOptions {
    factionFilter?: 'all' | 'player' | 'enemy';
    /** Up 武將 id 名單（規格：SSR 70% / SR 80% 從 Up 抽）；沒有 Up 時所有桶都走常設 */
    upGeneralIds?: readonly string[];
    /** 測試用隨機來源；沒指定時用建構時的預設亂數源 */
    rng?: () => number;
}

export interface LocalGachaResultEntry {
    general: GeneralConfig;
    rarityTier: GeneralDetailRarityTier;
    drawIndex: number;
    displayText: string;
    poolId: string;
    actionType: GachaActionType;
    currencyKey: GachaCurrencyKey;
}

export interface LocalGachaWalletSnapshot {
    gems: number;
    gold: number;
    tickets: number;
    /** 銅錢符（免費貨幣，僅常設池）；PROG-2-0339 新增，舊檔補 0 */
    bronze: number;
    /** 求籤令（定向道具，不是池幣）；PROG-2-0339 新增，舊檔補 0 */
    oracle: number;
}

interface PerformGachaRequest {
    actionType: GachaActionType;
    poolId: string;
    drawCount: number;
    cost: number;
    currencyKey: GachaCurrencyKey;
    generals: GeneralConfig[];
    options?: LocalGachaRollOptions;
}

const SINGLE_PLAYER_MODE_KEY = 'ucuf.gacha.single-player-mode';
const DEV_AUTO_TOPUP_KEY = 'ucuf.gacha.dev-auto-topup';
const WALLET_STORAGE_KEY = 'ucuf.gacha.wallet.v1';
const PITY_STORAGE_KEY = 'ucuf.gacha.pity.v1';
const DEFAULT_WALLET: LocalGachaWalletSnapshot = { ...STARTER_GACHA_WALLET };

function cloneGeneral(general: GeneralConfig): GeneralConfig {
    try {
        return JSON.parse(JSON.stringify(general)) as GeneralConfig;
    } catch {
        return { ...general };
    }
}

function normalizeCount(value: number): number {
    return Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
}

function normalizeCost(value: number): number {
    const resolved = Math.floor(Number.isFinite(value) ? value : 0);
    return Math.max(0, resolved);
}

function normalizeWalletValue(value: unknown, fallback: number): number {
    const resolved = Math.floor(Number(value));
    if (!Number.isFinite(resolved)) {
        return fallback;
    }
    return Math.max(0, resolved);
}

/** 錢包欄位缺漏或壞掉時用預設值補齊 */
function normalizeWalletSnapshot(value: Partial<LocalGachaWalletSnapshot>): LocalGachaWalletSnapshot {
    return {
        gems: normalizeWalletValue(value.gems, DEFAULT_WALLET.gems),
        gold: normalizeWalletValue(value.gold, DEFAULT_WALLET.gold),
        tickets: normalizeWalletValue(value.tickets, DEFAULT_WALLET.tickets),
        bronze: normalizeWalletValue(value.bronze, DEFAULT_WALLET.bronze),
        oracle: normalizeWalletValue(value.oracle, DEFAULT_WALLET.oracle),
    };
}

function inferRarityTier(general: GeneralConfig): GeneralDetailRarityTier {
    const explicit = general.rarityTier;
    if (explicit) {
        return explicit;
    }

    switch (general.characterCategory) {
        case 'mythical':
            return 'mythic';
        case 'titled':
            return 'legendary';
        case 'famed':
            return 'epic';
        case 'general':
            return 'rare';
        case 'civilian':
        default:
            return 'common';
    }
}

/** 候選武將分桶：legendary／mythic 為 SSR，epic 為 SR，其餘為 R；Up 名單命中者進 Up 桶 */
function buildGachaPool(candidates: GeneralConfig[], upGeneralIds: readonly string[]): GachaPool<GeneralConfig> {
    const up = new Set(upGeneralIds);
    const ssrUp: GeneralConfig[] = [];
    const ssrOther: GeneralConfig[] = [];
    const srUp: GeneralConfig[] = [];
    const srOther: GeneralConfig[] = [];
    const rOther: GeneralConfig[] = [];
    for (const general of candidates) {
        const tier = inferRarityTier(general);
        const isUp = up.has(general.id);
        if (tier === 'legendary' || tier === 'mythic') (isUp ? ssrUp : ssrOther).push(general);
        else if (tier === 'epic') (isUp ? srUp : srOther).push(general);
        else rOther.push(general);
    }
    return { ssrUp, ssrOther, srUp, srOther, rOther };
}

function formatDrawResultText(index: number, general: GeneralConfig, rarityTier: GeneralDetailRarityTier): string {
    return `#${index + 1} [${rarityTier}] ${general.name}`;
}


/**
 * 轉蛋的存放處（保底表與錢包，由呼叫端接到存檔）；沒有時只存在記憶體中，例如載入畫面的預覽服務。
 * read* 回傳 null 代表存檔裡沒有這筆資料（舊檔），會改讀舊 localStorage 做一次性遷移。
 */
export interface GachaSaveStore {
    readPity(): GachaPityBook | null;
    writePity(book: GachaPityBook): void;
    readWallet(): Partial<LocalGachaWalletSnapshot> | null;
    writeWallet(wallet: LocalGachaWalletSnapshot): void;
    /** 選填：存檔端的轉蛋資料版本號。外部改動（讀檔、新遊戲、成就入帳）會讓它改變，服務據此丟掉過期快取 */
    revision?(): number;
    /** 選填：抽卡結果同步入冊（不存檔）。扣款與保底寫入前呼叫，與扣款落在同一次存檔 */
    enroll?(results: readonly LocalGachaResultEntry[]): void;
    /** 選填：把 fn 內的寫入併成一次存檔（扣款、保底、入冊要嘛全寫、要嘛全不寫）；沒有時逐筆寫入 */
    batch?<T>(fn: () => T): T;
}

export class LocalGachaService {
    private readonly _actionLogStore = ActionLogStore.getInstance();
    private _singlePlayerModeEnabled = this._loadSinglePlayerModeEnabled();
    /** 錢包（第一次用到才讀取，避免建構時就碰存檔） */
    private _walletCache: LocalGachaWalletSnapshot | null = null;
    /** 各池保底計數（poolId → 狀態）；各池獨立計數（轉蛋系統 §保底計算）；第一次用到才讀取，避免建構時就碰存檔 */
    private _pityBookCache: GachaPityBook | null = null;
    /** 快取對應的存檔版本號；和存檔端現在的版本不同就代表快取過期 */
    private _syncedRevision: number | undefined;

    /** defaultRng：沒指定 options.rng 時用的亂數源；正式環境傳存檔亂數源（Q25），讀檔不能重抽 */
    constructor(
        private readonly _saveStore: GachaSaveStore | null = null,
        private readonly _defaultRng: () => number = Math.random,
    ) {}

    public isSinglePlayerModeEnabled(): boolean {
        return this._singlePlayerModeEnabled;
    }

    public toggleSinglePlayerModeEnabled(): boolean {
        this._singlePlayerModeEnabled = !this._singlePlayerModeEnabled;
        this._persistSinglePlayerModeEnabled();
        return this._singlePlayerModeEnabled;
    }

    public setSinglePlayerModeEnabled(enabled: boolean): void {
        this._singlePlayerModeEnabled = !!enabled;
        this._persistSinglePlayerModeEnabled();
    }

    /** 開發開關：餘額不足時自動補款。正式流程預設關閉。 */
    public isDevAutoTopUpEnabled(): boolean {
        return sys.localStorage.getItem(DEV_AUTO_TOPUP_KEY) === 'true';
    }

    public setDevAutoTopUpEnabled(enabled: boolean): void {
        sys.localStorage.setItem(DEV_AUTO_TOPUP_KEY, enabled ? 'true' : 'false');
    }

    public getWalletSnapshot(): LocalGachaWalletSnapshot {
        return { ...this._walletOf() };
    }

    public getCurrencyAmount(currencyKey: GachaCurrencyKey): number {
        return this._walletOf()[currencyKey];
    }

    public grantCurrency(currencyKey: GachaCurrencyKey, amount: number): number {
        const resolvedAmount = Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0));
        if (resolvedAmount <= 0) {
            return this._walletOf()[currencyKey];
        }

        this._walletOf()[currencyKey] = Math.max(0, this._walletOf()[currencyKey] + resolvedAmount);
        this._persistWalletSnapshot();
        return this._walletOf()[currencyKey];
    }

    /** 非抽卡用途的扣款（例如招募俘虜，PROG-2-0082）；餘額不足時不扣、回傳 false */
    public spendCurrency(currencyKey: GachaCurrencyKey, amount: number): boolean {
        const cost = Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0));
        if (cost <= 0) {
            return true;
        }
        if (this._walletOf()[currencyKey] < cost) {
            return false;
        }
        this._spendCurrency(currencyKey, cost);
        return true;
    }

    public async getRecentPullHistory(limit: number): Promise<{ total: number; records: GachaHistoryRecord[] }> {
        return this._actionLogStore.getRecentGachaHistory(limit);
    }

    public async performLocalGacha(
        poolId: string,
        drawCount: number,
        cost: number,
        generals: GeneralConfig[],
        options: LocalGachaRollOptions = {},
    ): Promise<LocalGachaResultEntry[]> {
        return this._performGacha({
            actionType: 'LOCAL_GACHA_PULL',
            poolId,
            drawCount,
            cost,
            currencyKey: 'gems',
            generals,
            options,
        });
    }

    public async performGoldSummon(
        drawCount: number,
        generals: GeneralConfig[],
        options: LocalGachaRollOptions = {},
    ): Promise<LocalGachaResultEntry[]> {
        const resolvedCount = normalizeCount(drawCount);
        return this._performGacha({
            actionType: 'LOCAL_GOLD_SUMMON',
            poolId: 'GENERAL_STANDARD_01',
            drawCount: resolvedCount,
            cost: 500 * resolvedCount,
            currencyKey: 'gold',
            generals,
            options,
        });
    }

    public async performTicketSummon(
        drawCount: number,
        generals: GeneralConfig[],
        options: LocalGachaRollOptions = {},
    ): Promise<LocalGachaResultEntry[]> {
        const resolvedCount = normalizeCount(drawCount);
        return this._performGacha({
            actionType: 'LOCAL_TICKET_SUMMON',
            poolId: 'GENERAL_STANDARD_01',
            drawCount: resolvedCount,
            cost: resolvedCount,
            currencyKey: 'tickets',
            generals,
            options,
        });
    }

    private async _performGacha(request: PerformGachaRequest): Promise<LocalGachaResultEntry[]> {
        const drawCount = normalizeCount(request.drawCount);
        const cost = normalizeCost(request.cost);
        const candidates = this._filterCandidates(request.generals, request.options?.factionFilter);

        if (candidates.length === 0) {
            throw new Error('[LocalGachaService] 沒有可用的武將資料。');
        }

        this._assertSufficientCurrency(request.currencyKey, cost);

        const pool = buildGachaPool(candidates, request.options?.upGeneralIds ?? []);
        const rng = request.options?.rng ?? this._defaultRng;
        let pity = normalizeGachaPity(this._pityBookOf()[request.poolId]);

        const results: LocalGachaResultEntry[] = [];
        for (let index = 0; index < drawCount; index++) {
            const drawn = drawGeneralOnce(pool, pity, rng);
            pity = drawn.nextPity;
            const picked = drawn.item;
            const clonedGeneral = cloneGeneral(picked);
            const rarityTier = inferRarityTier(clonedGeneral);

            results.push({
                general: clonedGeneral,
                rarityTier,
                drawIndex: index + 1,
                displayText: formatDrawResultText(index, clonedGeneral, rarityTier),
                poolId: request.poolId,
                actionType: request.actionType,
                currencyKey: request.currencyKey,
            });
        }

        const logged = services().sync.pushAction(
            request.actionType,
            {
                poolId: request.poolId,
                drawCount,
                cost,
                currencyKey: request.currencyKey,
                localOnly: true,
                results: results.map((entry) => ({
                    id: entry.general.id,
                    name: entry.general.name,
                    rarityTier: entry.rarityTier,
                    displayText: entry.displayText,
                })),
            },
            SyncActionType.DEFERRABLE,
        );

        if (!logged) {
            throw new Error(`[LocalGachaService] ${request.currencyKey} 召喚紀錄寫入失敗。`);
        }

        // 紀錄寫入成功才算這批抽數：失敗時不扣款，保底計數也不能前進
        // 入冊、保底、扣款同一批寫入：若中途強關，存檔裡不會出現「已扣款未入冊」
        const commit = (): void => {
            this._saveStore?.enroll?.(results);
            this._pityBookCache = { ...this._pityBookOf(), [request.poolId]: pity };
            this._persistPityBook();
            this._spendCurrency(request.currencyKey, cost);
        };
        if (this._saveStore?.batch) {
            this._saveStore.batch(commit);
        } else {
            commit();
        }

        return results;
    }

    private _filterCandidates(generals: GeneralConfig[], factionFilter: 'all' | 'player' | 'enemy' = 'all'): GeneralConfig[] {
        const list = Array.isArray(generals) ? generals.filter((general): general is GeneralConfig => !!general) : [];

        switch (factionFilter) {
            case 'player':
                return list.filter((general) => general.faction === Faction.Player);
            case 'enemy':
                return list.filter((general) => general.faction === Faction.Enemy);
            case 'all':
            default:
                return list;
        }
    }

    private _loadSinglePlayerModeEnabled(): boolean {
        const stored = sys.localStorage.getItem(SINGLE_PLAYER_MODE_KEY);
        if (stored === 'false') {
            return false;
        }
        if (stored === 'true') {
            return true;
        }
        return true;
    }

    private _persistSinglePlayerModeEnabled(): void {
        sys.localStorage.setItem(SINGLE_PLAYER_MODE_KEY, this._singlePlayerModeEnabled ? 'true' : 'false');
    }

    private _assertSufficientCurrency(currencyKey: GachaCurrencyKey, cost: number): void {
        if (cost <= 0) {
            return;
        }

        const check = checkWalletBalance(
            this._walletOf()[currencyKey],
            cost,
            this.isDevAutoTopUpEnabled(),
            DEFAULT_WALLET[currencyKey],
        );
        if (!check.ok) {
            throw new Error(formatInsufficientMessage(currencyKey, check.shortfall));
        }
        if (check.toppedUpBalance !== undefined) {
            this._walletOf()[currencyKey] = check.toppedUpBalance;
            this._persistWalletSnapshot();
        }
    }

    private _spendCurrency(currencyKey: GachaCurrencyKey, cost: number): void {
        if (cost <= 0) {
            return;
        }

        this._walletOf()[currencyKey] = Math.max(0, this._walletOf()[currencyKey] - cost);
        this._persistWalletSnapshot();
    }

    /** 存檔端版本變了（讀檔、新遊戲、世代成就入帳）就丟掉快取，下次用到時重讀 */
    private _dropStaleCaches(): void {
        const revision = this._saveStore?.revision?.();
        if (revision !== undefined && revision !== this._syncedRevision) {
            this._walletCache = null;
            this._pityBookCache = null;
            this._syncedRevision = revision;
        }
    }

    private _pityBookOf(): GachaPityBook {
        this._dropStaleCaches();
        if (this._pityBookCache === null) {
            this._pityBookCache = this._loadPityBook();
            // 讀取時的遷移寫入是自己寫的，不算外部改動
            this._syncedRevision = this._saveStore?.revision?.();
        }
        return this._pityBookCache;
    }

    /** 讀取保底表：存檔優先；存檔沒有、舊 localStorage 有時一次性遷移進存檔（PROG-2-0337） */
    private _loadPityBook(): GachaPityBook {
        if (!this._saveStore) return {};
        const { book, migrateLegacy } = resolveGachaPityBook(this._saveStore.readPity(), this._readLegacyPityBook());
        if (migrateLegacy) {
            this._saveStore.writePity(book);
            this._clearLegacyPityBook();
        }
        return book;
    }

    /** 舊版把保底存在 localStorage；只用於一次性遷移 */
    private _readLegacyPityBook(): unknown {
        try {
            const stored = sys.localStorage.getItem(PITY_STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    }

    private _clearLegacyPityBook(): void {
        try {
            sys.localStorage.removeItem(PITY_STORAGE_KEY);
        } catch {
            // 清不掉也無妨：下次讀取時存檔已有資料，不會再遷移
        }
    }

    private _persistPityBook(): void {
        this._saveStore?.writePity(this._pityBookOf());
        this._syncedRevision = this._saveStore?.revision?.();
    }

    private _walletOf(): LocalGachaWalletSnapshot {
        this._dropStaleCaches();
        if (this._walletCache === null) {
            this._walletCache = this._loadWalletSnapshot();
            this._syncedRevision = this._saveStore?.revision?.();
        }
        return this._walletCache;
    }

    /** 讀取錢包：存檔優先；存檔沒有、舊 localStorage 有時一次性遷移（PROG-2-0338） */
    private _loadWalletSnapshot(): LocalGachaWalletSnapshot {
        if (!this._saveStore) return { ...DEFAULT_WALLET };
        const saved = this._saveStore.readWallet();
        if (saved) return normalizeWalletSnapshot(saved);
        const legacy = this._readLegacyWallet();
        if (legacy) {
            const migrated = normalizeWalletSnapshot(legacy);
            this._saveStore.writeWallet(migrated);
            this._clearLegacyWallet();
            return migrated;
        }
        return { ...DEFAULT_WALLET };
    }

    /** 舊版把錢包存在 localStorage；只用於一次性遷移 */
    private _readLegacyWallet(): Partial<LocalGachaWalletSnapshot> | null {
        try {
            const stored = sys.localStorage.getItem(WALLET_STORAGE_KEY);
            return stored ? JSON.parse(stored) as Partial<LocalGachaWalletSnapshot> : null;
        } catch {
            return null;
        }
    }

    private _clearLegacyWallet(): void {
        try {
            sys.localStorage.removeItem(WALLET_STORAGE_KEY);
        } catch {
            // 清不掉也無妨：下次讀取時存檔已有錢包，不會再遷移
        }
    }

    private _persistWalletSnapshot(): void {
        this._saveStore?.writeWallet({ ...this._walletOf() });
        this._syncedRevision = this._saveStore?.revision?.();
    }
}