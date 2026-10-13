// @spec-source → 遊戲時間系統.md (doc_spec_0034) §I、Data Schema文件（本機端與Server端）.md (doc_tech_0013)
/**
 * PlayerSaveService — 玩家長局存檔快照（純邏輯，不依賴 cc）
 *
 * 只負責「快照長什麼樣子」與「存 / 讀 / 驗證」，實際儲存後端由 DataStorageAdapter 注入：
 * Web 用 IndexedDbAdapter、原生用 SqliteAdapter、測試用 MemoryStorageAdapter。
 *
 * Unity 對照：像一個 SaveSystem，把 [Serializable] 的 SaveData 交給
 * 可替換的儲存後端（PlayerPrefs / 檔案 / 雲端），而不是自己去碰檔案路徑。
 */
import { normalizeInventory, PlayerInventory } from '../systems/PlayerInventory';
import { normalizeMilitaryReserve, MilitaryReserve } from '../systems/MilitaryReserve';
import { normalizePrisonState, type PrisonState } from '../systems/PrisonerOfWar';
import type { GeneralConfig } from '../models/GeneralUnit';
import type { DataStorageAdapter } from '../storage/DataStorageAdapter';
import { GameClock, GameTimeState } from '../systems/GameClock';
import type { NurtureState } from './NurtureService';
import { normalizeDeck } from './PlayerDeckRules';
import { RandomState, validateRandomState } from '../systems/SeededRandom';
import { createTallyLoyaltyState, type TallyLoyaltyState } from '../systems/TigerTallyLoyalty';

export const PLAYER_SAVE_KEY = 'player.save';
/** deck 為後加的選填欄位（讀舊檔補 []），所以版本維持 1，不讓既有存檔失效 */
export const PLAYER_SAVE_SCHEMA_VERSION = 1;

export interface PlayerSaveSnapshot {
    schemaVersion: number;
    /** 選填以相容舊檔；保存目前游標，而非只有起始種子。 */
    randomState?: RandomState;
    /** ISO 時間字串，供 UI 顯示「最後存檔時間」 */
    savedAt: string;
    gameTime: GameTimeState;
    roster: GeneralConfig[];
    /** 進行中的培育會話；舊存檔沒有這個欄位（視為沒有進行中的培育） */
    nurture?: NurtureState;
    /** 玩家出戰卡組：虎符卡片 ID（tacticId）有序清單，進戰場時成為 selectedCardIds */
    deck: string[];
    /** 玩家指定的出戰主將 id；沒有（或已不能出戰）時戰場用遭遇戰預設主將。後加的選填欄位，舊檔讀回為 undefined */
    leadGeneralId?: string;
    /** 因子覺醒用的玩家層級；後加的選填欄位，舊檔讀回補 1 */
    discoveryLevel: number;
    /** 目前等級內的覺醒經驗（PROG-2-0044）；後加的選填欄位，舊檔讀回補 0 */
    discoveryExp?: number;
    /** 道具庫存（PROG-2-0053，目前只有求籤令）；後加的選填欄位，舊檔讀回補起始庫存 */
    inventory?: Record<string, number>;
    /** 累計名士占卜次數（PROG-2-0065，決定名士解鎖）；後加的選填欄位，舊檔讀回補 0 */
    oracleCount?: number;
    /** 城市兵源與糧草儲備（PROG-2-0072）；後加的選填欄位，舊檔讀回補起始值 */
    military?: MilitaryReserve;
    /** 待處置俘虜與監獄（PROG-2-0073）；後加的選填欄位，舊檔讀回為空監獄 */
    prison?: PrisonState<GeneralConfig>;
    /** 已通關的關卡 id（連環破用）；後加的選填欄位，舊檔讀回補空陣列（沒有任何通關紀錄） */
    clearedStageIds?: string[];
    /** 武將 id → 虎符忠誠度狀態（TRP-09）；後加的選填欄位，舊檔讀回補空物件 */
    tallyLoyalty?: Record<string, TallyLoyaltyState>;
}

/** 忠誠度表：只保留格式正確的條目；非物件視為沒有紀錄，壞掉的單筆條目丟棄 */
export function normalizeTallyLoyaltyMap(value: unknown): Record<string, TallyLoyaltyState> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out: Record<string, TallyLoyaltyState> = {};
    for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
        const s = raw as Partial<TallyLoyaltyState> | null;
        if (!s || typeof s !== 'object') continue;
        if (typeof s.loyalty !== 'number' || !Number.isFinite(s.loyalty)) continue;
        const base = createTallyLoyaltyState(s.loyalty, s.isGachaHero === true);
        out[id] = {
            ...base,
            lastChangeSeason: typeof s.lastChangeSeason === 'number' ? s.lastChangeSeason : null,
            consecutiveSeasons: typeof s.consecutiveSeasons === 'number' && s.consecutiveSeasons >= 0 ? Math.floor(s.consecutiveSeasons) : 0,
        };
    }
    return out;
}

/** 通關紀錄：只留非空字串、去重、保留第一次出現的順序；非陣列視為沒有紀錄 */
export function normalizeClearedStageIds(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    for (const id of value) {
        if (typeof id === 'string' && id.length > 0) seen.add(id);
    }
    return [...seen];
}

function normalizeDiscoveryLevel(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

function normalizeDiscoveryExp(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export function createPlayerSaveSnapshot(
    gameTime: GameTimeState,
    roster: readonly GeneralConfig[],
    now: Date = new Date(),
    nurture?: NurtureState,
    deck: readonly string[] = [],
    leadGeneralId?: string | null,
    discoveryLevel = 1,
    randomState?: RandomState,
    discoveryExp = 0,
    inventory?: PlayerInventory,
    oracleCount = 0,
    clearedStageIds: readonly string[] = [],
    tallyLoyalty: Readonly<Record<string, TallyLoyaltyState>> = {},
): PlayerSaveSnapshot {
    return {
        schemaVersion: PLAYER_SAVE_SCHEMA_VERSION,
        ...(randomState !== undefined ? { randomState: validateRandomState(randomState) } : {}),
        savedAt: now.toISOString(),
        gameTime: GameClock.normalize(gameTime),
        roster: roster.map((general) => ({ ...general })),
        ...(nurture ? { nurture } : {}),
        deck: normalizeDeck(deck),
        ...(leadGeneralId ? { leadGeneralId } : {}),
        discoveryLevel: normalizeDiscoveryLevel(discoveryLevel),
        discoveryExp: normalizeDiscoveryExp(discoveryExp),
        inventory: { ...normalizeInventory(inventory) },
        oracleCount: normalizeDiscoveryExp(oracleCount),
        clearedStageIds: normalizeClearedStageIds(clearedStageIds),
        tallyLoyalty: normalizeTallyLoyaltyMap(tallyLoyalty),
    };
}

/** 驗證讀回的資料；格式不符時拋錯，避免壞檔被當成新遊戲默默覆蓋 */
export function validatePlayerSaveSnapshot(raw: unknown): PlayerSaveSnapshot {
    if (!raw || typeof raw !== 'object') {
        throw new Error('[PlayerSaveService] 存檔格式錯誤：不是物件');
    }
    const snapshot = raw as Partial<PlayerSaveSnapshot>;
    if (snapshot.schemaVersion !== PLAYER_SAVE_SCHEMA_VERSION) {
        throw new Error(`[PlayerSaveService] 不支援的存檔版本: ${String(snapshot.schemaVersion)}`);
    }
    if (typeof snapshot.savedAt !== 'string') {
        throw new Error('[PlayerSaveService] 存檔缺少 savedAt');
    }
    if (!Array.isArray(snapshot.roster)) {
        throw new Error('[PlayerSaveService] 存檔缺少 roster');
    }
    const invalid = snapshot.roster.find((general) => !general || typeof general.id !== 'string');
    if (invalid !== undefined) {
        throw new Error('[PlayerSaveService] roster 內有缺少 id 的武將');
    }
    if (snapshot.nurture !== undefined && (!snapshot.nurture || !Array.isArray(snapshot.nurture.sessions))) {
        throw new Error('[PlayerSaveService] nurture 欄位格式錯誤');
    }
    if (snapshot.deck !== undefined && !Array.isArray(snapshot.deck)) {
        throw new Error('[PlayerSaveService] 存檔 deck 不是陣列');
    }
    if (snapshot.leadGeneralId !== undefined && typeof snapshot.leadGeneralId !== 'string') {
        throw new Error('[PlayerSaveService] 存檔 leadGeneralId 不是字串');
    }
    if (snapshot.clearedStageIds !== undefined && !Array.isArray(snapshot.clearedStageIds)) {
        throw new Error('[PlayerSaveService] 存檔 clearedStageIds 不是陣列');
    }
    if (snapshot.tallyLoyalty !== undefined && (!snapshot.tallyLoyalty || typeof snapshot.tallyLoyalty !== 'object' || Array.isArray(snapshot.tallyLoyalty))) {
        throw new Error('[PlayerSaveService] 存檔 tallyLoyalty 不是物件');
    }
    return {
        schemaVersion: snapshot.schemaVersion,
        ...(snapshot.randomState !== undefined ? { randomState: validateRandomState(snapshot.randomState) } : {}),
        savedAt: snapshot.savedAt,
        gameTime: GameClock.normalize(snapshot.gameTime as GameTimeState),
        roster: snapshot.roster,
        ...(snapshot.nurture ? { nurture: snapshot.nurture } : {}),
        deck: normalizeDeck(snapshot.deck),
        ...(snapshot.leadGeneralId ? { leadGeneralId: snapshot.leadGeneralId } : {}),
        discoveryLevel: normalizeDiscoveryLevel(snapshot.discoveryLevel),
        discoveryExp: normalizeDiscoveryExp(snapshot.discoveryExp),
        inventory: { ...normalizeInventory(snapshot.inventory) },
        oracleCount: normalizeDiscoveryExp(snapshot.oracleCount),
        ...(snapshot.military !== undefined ? { military: normalizeMilitaryReserve(snapshot.military) } : {}),
        ...(snapshot.prison !== undefined ? { prison: normalizePrisonState<GeneralConfig>(snapshot.prison) } : {}),
        clearedStageIds: normalizeClearedStageIds(snapshot.clearedStageIds),
        tallyLoyalty: normalizeTallyLoyaltyMap(snapshot.tallyLoyalty),
    };
}

export class PlayerSaveService {
    private _ready: Promise<void> | null = null;

    constructor(private readonly _adapter: DataStorageAdapter, private readonly _key: string = PLAYER_SAVE_KEY) {}

    public get adapterName(): string {
        return this._adapter.adapterName;
    }

    public async save(snapshot: PlayerSaveSnapshot): Promise<void> {
        await this._ensureReady();
        await this._adapter.set(this._key, validatePlayerSaveSnapshot(snapshot));
    }

    /** 沒有存檔時回傳 null；有存檔但格式錯誤時拋錯 */
    public async load(): Promise<PlayerSaveSnapshot | null> {
        await this._ensureReady();
        const raw = await this._adapter.get<unknown>(this._key);
        return raw === null ? null : validatePlayerSaveSnapshot(raw);
    }

    public async clear(): Promise<void> {
        await this._ensureReady();
        await this._adapter.delete(this._key);
    }

    /** 第一次存取時才初始化後端（例如開啟 IndexedDB），之後重用同一個 Promise */
    private _ensureReady(): Promise<void> {
        if (!this._ready) {
            this._ready = this._adapter.init().catch((error) => {
                this._ready = null;
                throw error;
            });
        }
        return this._ready;
    }
}
