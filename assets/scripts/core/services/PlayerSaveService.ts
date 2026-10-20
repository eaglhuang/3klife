import { normalizeTravelCountdown, type TravelCountdown } from '../systems/TravelCountdown';
import { readCardStarState } from '../systems/TigerTallyStar';
import { normalizeDomesticLog, type DomesticSeasonLog } from '../systems/DomesticTasks';
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
import { normalizeBondPoints } from '../systems/OverflowBond';
import { normalizeOnboardingState, OnboardingState } from '../systems/OnboardingTutorial';
import { normalizeMilitaryReserve, MilitaryReserve } from '../systems/MilitaryReserve';
import { normalizePrisonState, type PrisonState } from '../systems/PrisonerOfWar';
import { normalizeMercenaryBundle, type MercenarySaveBundle } from '../systems/MercenarySaveModel';
import type { GeneralConfig } from '../models/GeneralUnit';
import type { DataStorageAdapter } from '../storage/DataStorageAdapter';
import { GameClock, GameTimeState } from '../systems/GameClock';
import type { NurtureState } from './NurtureService';
import { normalizeDeck } from './PlayerDeckRules';
import { RandomState, validateRandomState } from '../systems/SeededRandom';
import { createTallyLoyaltyState, type TallyLoyaltyState } from '../systems/TigerTallyLoyalty';
import type { TallyHolder } from '../systems/TigerTallyHoldings';
import type { TigerTallyCard } from '../models/TigerTallyCard';
import { normalizeFemaleSourcesMap, type FemaleSource } from '../systems/FemaleSource';
import { normalizeDynamicRelations } from '../systems/KinDynamicRelations';
import { normalizeLegacyCount } from '../systems/LegacyAchievement';
import { initialOfficerState, normalizeOfficerState, type OfficerState } from '../systems/OfficerState';
import type { DynamicRelation } from '../systems/KinRelation';
import { normalizeFemaleSystemState, type FemaleSystemState } from '../systems/FemaleSystemState';
import { normalizeGachaPityBook, type GachaPityBook } from '../systems/GachaDraw';
import { SAVE_VERSION_LATEST, saveVersionOf } from '../storage/SaveVersion';
import { normalizeYearAgingEvents } from '../systems/YearReport';
import type { AgingEvent } from '../systems/GeneralAging';
import { mapSnapshotToSixTables } from './PlayerSaveTableRows';

export const PLAYER_SAVE_KEY = 'player.save';
/** deck 為後加的選填欄位（讀舊檔補 []），所以版本維持 1，不讓既有存檔失效 */
export const PLAYER_SAVE_SCHEMA_VERSION = 1;

/** 主動指令造成的死亡，等下一次季結併入英靈結算 */
export interface PendingLifespanDeath {
    generalId: string;
    age: number;
}

export interface PlayerSaveSnapshot {
    schemaVersion: number;
    /** 存檔 semver 版號（PROG-2-0334）；舊檔沒有此欄位，讀回時依 schemaVersion 補成 n.0.0 */
    saveVersion?: string;
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
    /** 收藏武將 id 清單（HALL-07 收藏權重）；後加的選填欄位，舊檔讀回補空陣列（PROG-2-0453） */
    favoriteGeneralIds?: string[];
    /** 大廳任務指派：任務 id → 指派武將 id（HALL-07 已派任務權重）；後加的選填欄位，舊檔讀回補空物件（PROG-2-0453） */
    hallAssignments?: Record<string, string>;
    /** 動態關係（KIN-06 / KIN-10）：親密度與關係清單；後加的選填欄位，舊檔讀回為空陣列 */
    dynamicRelations?: DynamicRelation[];
    /** Legacy_Count（跨世代成就次數，RET-07）；後加的選填欄位，舊檔讀回為 0 */
    legacyCount?: number;
    /** 已傳道過的名將 id（MENT-15 一生一次）；後加的選填欄位，舊檔讀回為空陣列 */
    legendaryMentoringUsedIds?: string[];
    /** 官職狀態（OFC-03）：階位、經驗、解鎖歷史；舊檔沒有此欄位時讀回為階位 1；版號不升（扁平欄位） */
    officerState?: OfficerState;
    /** 武將 id → 虎符忠誠度狀態（TRP-09）；後加的選填欄位，舊檔讀回補空物件 */
    tallyLoyalty?: Record<string, TallyLoyaltyState>;
    /** 虎符 uid → 持有者（null 為君主）（TRP-08）；後加的選填欄位，舊檔讀回補空物件 */
    tallyHoldings?: Record<string, TallyHolder>;
    /** 虎符卡資料（uid → 卡）；後加的選填欄位，舊檔讀回補空物件 */
    tallyCards?: Record<string, TigerTallyCard>;
    /** 女性武將來源（uid → 來源，FEM-01）；後加的選填欄位，舊檔讀回補空物件 */
    femaleSources?: Record<string, FemaleSource>;
    /** 主動指令（培育／結緣）造成、尚未進季結結算的武將死亡；後加的選填欄位，舊檔讀回為空陣列（PROG-2-0222） */
    pendingLifespanDeaths?: PendingLifespanDeath[];
    /** 本年（未滿 4 季）累積的老化事件，供年終年報計數；後加的選填欄位，舊檔讀回為空陣列（PROG-2-0815） */
    yearAgingEvents?: AgingEvent[];
    /** 轉蛋各池保底計數（poolId → 累計抽數）；後加的選填欄位，舊檔讀回為空（從 0 開始）（PROG-2-0337） */
    gachaPity?: GachaPityBook;
    /** 轉蛋錢包（玉／金幣／召喚券）；後加的選填欄位，舊檔讀回為 undefined（由轉蛋服務改讀舊 localStorage 一次）（PROG-2-0338） */
    gachaWallet?: GachaWalletSave;
    /** 名聲等非軍備資源（暫定）；後加的選填欄位，舊檔讀回補 0 */
    resources?: { fame: number; scorePoints?: number; autoNurtureTickets?: number; mainlineNurtureClearedOnce?: boolean; firstBattleCleared?: boolean; openingRedFaceShown?: boolean };
    /** 內政本季紀錄（同季只能選一項）；後加的選填欄位，舊檔讀回為空紀錄 */
    domestic?: DomesticSeasonLog;
    /** 傭兵存檔包（試用、薪水、冷卻）；後加的選填欄位，舊檔讀回為空包（MERC-01） */
    mercenaries?: MercenarySaveBundle;
    /** 女性來源系統狀態（傭兵池／救美刷新時間、送禮好感）；後加的選填欄位，舊檔讀回預設值（FEM 接線） */
    femaleSystem?: FemaleSystemState;
    /** 新手 3 段式引導進度；後加的選填欄位，舊檔讀回視為從頭開始（PROG-2-0229） */
    onboarding?: OnboardingState;
    /** 結義點數餘額；後加的選填欄位，舊檔讀回為 0（GCH-06） */
    bondPoints?: number;
    /** 趕路（回合制）；後加的選填欄位，舊檔讀回為沒有趕路（PROG-2-0475） */
    travelCountdown?: TravelCountdown;
    /** 編制預設（DEP-14）：主將 id → 參謀官 / 後勤官；舊檔沒有此欄位時視為空 */
    sortiePresets?: Readonly<Record<string, { strategistUid: string | null; deputyUid: string | null }>>;
}

/** 讀回編制預設：只保留格式正確的條目；缺欄位、非物件一律丟棄（舊存檔視為空） */
export function normalizeSortiePresets(raw: unknown): Record<string, { strategistUid: string | null; deputyUid: string | null }> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Record<string, { strategistUid: string | null; deputyUid: string | null }> = {};
    for (const [commanderId, value] of Object.entries(raw as Record<string, unknown>)) {
        if (!value || typeof value !== 'object') continue;
        const entry = value as { strategistUid?: unknown; deputyUid?: unknown };
        const strategistUid = typeof entry.strategistUid === 'string' ? entry.strategistUid : null;
        const deputyUid = typeof entry.deputyUid === 'string' ? entry.deputyUid : null;
        out[commanderId] = { strategistUid, deputyUid };
    }
    return out;
}

/** 虎符卡表：只保留 uid 與 templateId 為非空字串的卡；非物件視為沒有紀錄 */
export function normalizeTallyCardsMap(value: unknown): Record<string, TigerTallyCard> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out: Record<string, TigerTallyCard> = {};
    for (const [uid, raw] of Object.entries(value as Record<string, unknown>)) {
        const card = raw as Partial<TigerTallyCard> | null;
        if (!card || typeof card !== 'object') continue;
        if (typeof card.uid !== 'string' || card.uid !== uid || typeof card.templateId !== 'string' || card.templateId.length === 0) continue;
        // 星級欄位（TRP-10）缺欄位時補 1★ / 0 經驗
        const starState = readCardStarState(card as TigerTallyCard);
        out[uid] = { ...(card as TigerTallyCard), stars: starState.star, battleExp: starState.exp };
    }
    return out;
}

/** 虎符持有表：只保留字串或 null 的條目；非物件視為沒有紀錄 */
export function normalizeTallyHoldingsMap(value: unknown): Record<string, TallyHolder> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out: Record<string, TallyHolder> = {};
    for (const [uid, holder] of Object.entries(value as Record<string, unknown>)) {
        if (uid.length === 0) continue;
        if (holder === null) out[uid] = null;
        else if (typeof holder === 'string' && holder.length > 0) out[uid] = holder;
    }
    return out;
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

/** 收藏武將 id：去重、略過空字串與非字串；壞資料補空陣列（PROG-2-0453） */
/** 已傳道過的名將 id（MENT-15）：只保留字串，非陣列回傳空陣列 */
export function normalizeLegendaryMentoringUsedIds(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

export function normalizeFavoriteGeneralIds(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    for (const id of value) {
        if (typeof id === 'string' && id.length > 0) seen.add(id);
    }
    return [...seen];
}

/** 大廳任務指派：只保留任務 id 與武將 id 都是非空字串的項目（PROG-2-0453） */
export function normalizeHallAssignments(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out: Record<string, string> = {};
    for (const [taskId, generalId] of Object.entries(value as Record<string, unknown>)) {
        if (taskId.length > 0 && typeof generalId === 'string' && generalId.length > 0) out[taskId] = generalId;
    }
    return out;
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
    tallyHoldings: Readonly<Record<string, TallyHolder>> = {},
    tallyCards: Readonly<Record<string, TigerTallyCard>> = {},
    mercenaries?: MercenarySaveBundle,
    femaleSources: Readonly<Record<string, FemaleSource>> = {},
    gachaPity: Readonly<GachaPityBook> = {},
    gachaWallet?: Readonly<GachaWalletSave> | null,
    favoriteGeneralIds: readonly string[] = [],
    hallAssignments: Readonly<Record<string, string>> = {},
    dynamicRelations: readonly DynamicRelation[] = [],
    legacyCount = 0,
    officerState: Readonly<OfficerState> = initialOfficerState(),
): PlayerSaveSnapshot {
    return {
        schemaVersion: PLAYER_SAVE_SCHEMA_VERSION,
        saveVersion: SAVE_VERSION_LATEST,
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
        tallyHoldings: normalizeTallyHoldingsMap(tallyHoldings),
        tallyCards: normalizeTallyCardsMap(tallyCards),
        femaleSources: normalizeFemaleSourcesMap(femaleSources),
        ...(mercenaries !== undefined ? { mercenaries: normalizeMercenaryBundle(mercenaries) } : {}),
        ...(Object.keys(normalizeGachaPityBook(gachaPity)).length > 0 ? { gachaPity: normalizeGachaPityBook(gachaPity) } : {}),
        ...(gachaWallet ? { gachaWallet: normalizeGachaWalletSave(gachaWallet) } : {}),
        ...(normalizeFavoriteGeneralIds(favoriteGeneralIds).length > 0 ? { favoriteGeneralIds: normalizeFavoriteGeneralIds(favoriteGeneralIds) } : {}),
        ...(Object.keys(normalizeHallAssignments(hallAssignments)).length > 0 ? { hallAssignments: normalizeHallAssignments(hallAssignments) } : {}),
        ...(dynamicRelations.length > 0 ? { dynamicRelations: normalizeDynamicRelations(dynamicRelations) } : {}),
        ...(normalizeLegacyCount(legacyCount) > 0 ? { legacyCount: normalizeLegacyCount(legacyCount) } : {}),
        ...(officerState.currentTier > 1 || officerState.officerExp > 0 ? { officerState: normalizeOfficerState(officerState) } : {}),
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
        saveVersion: saveVersionOf(snapshot),
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
        tallyHoldings: normalizeTallyHoldingsMap(snapshot.tallyHoldings),
        tallyCards: normalizeTallyCardsMap(snapshot.tallyCards),
        femaleSources: normalizeFemaleSourcesMap(snapshot.femaleSources),
        pendingLifespanDeaths: normalizePendingLifespanDeaths(snapshot.pendingLifespanDeaths),
        yearAgingEvents: normalizeYearAgingEvents(snapshot.yearAgingEvents),
        ...(snapshot.resources !== undefined && snapshot.resources !== null ? { resources: { fame: normalizeFame((snapshot.resources as { fame?: unknown }).fame), scorePoints: normalizeScorePoints((snapshot.resources as { scorePoints?: unknown }).scorePoints), autoNurtureTickets: normalizeAutoNurtureTickets((snapshot.resources as { autoNurtureTickets?: unknown }).autoNurtureTickets), mainlineNurtureClearedOnce: normalizeFlag((snapshot.resources as { mainlineNurtureClearedOnce?: unknown }).mainlineNurtureClearedOnce), ...optionalFlag((snapshot.resources as { firstBattleCleared?: unknown }).firstBattleCleared, 'firstBattleCleared'), ...optionalFlag((snapshot.resources as { openingRedFaceShown?: unknown }).openingRedFaceShown, 'openingRedFaceShown') } } : {}),
        ...(snapshot.domestic !== undefined ? { domestic: normalizeDomesticLog(snapshot.domestic) } : {}),
        ...(snapshot.mercenaries !== undefined ? { mercenaries: normalizeMercenaryBundle(snapshot.mercenaries) } : {}),
        ...(snapshot.onboarding !== undefined ? { onboarding: normalizeOnboardingState(snapshot.onboarding) } : {}),
        ...(snapshot.bondPoints !== undefined ? { bondPoints: normalizeBondPoints(snapshot.bondPoints) } : {}),
        ...(normalizeTravelCountdown(snapshot.travelCountdown) ? { travelCountdown: normalizeTravelCountdown(snapshot.travelCountdown)! } : {}),
        ...(snapshot.gachaPity !== undefined ? { gachaPity: normalizeGachaPityBook(snapshot.gachaPity) } : {}),
        ...(snapshot.gachaWallet !== undefined ? { gachaWallet: normalizeGachaWalletSave(snapshot.gachaWallet) } : {}),
        ...(snapshot.femaleSystem !== undefined ? { femaleSystem: normalizeFemaleSystemState(snapshot.femaleSystem) } : {}),
        ...(snapshot.favoriteGeneralIds !== undefined ? { favoriteGeneralIds: normalizeFavoriteGeneralIds(snapshot.favoriteGeneralIds) } : {}),
        ...(snapshot.hallAssignments !== undefined ? { hallAssignments: normalizeHallAssignments(snapshot.hallAssignments) } : {}),
        ...(snapshot.dynamicRelations !== undefined ? { dynamicRelations: normalizeDynamicRelations(snapshot.dynamicRelations) } : {}),
        ...(snapshot.legacyCount !== undefined ? { legacyCount: normalizeLegacyCount(snapshot.legacyCount) } : {}),
        ...(snapshot.officerState !== undefined ? { officerState: normalizeOfficerState(snapshot.officerState) } : {}),
        // 編制預設（PROG-2-0791）：#538 漏掉這一欄，存檔時會被丟掉
        ...(snapshot.sortiePresets !== undefined ? { sortiePresets: normalizeSortiePresets(snapshot.sortiePresets) } : {}),
        ...(snapshot.legendaryMentoringUsedIds !== undefined ? { legendaryMentoringUsedIds: normalizeLegendaryMentoringUsedIds(snapshot.legendaryMentoringUsedIds) } : {}),
    };
}

/** 轉蛋錢包存檔形狀：三個欄位都是非負整數，壞掉的欄位補 0 */
export interface GachaWalletSave {
    gems: number;
    gold: number;
    tickets: number;
    /** 銅錢符；舊檔缺欄位補 0（PROG-2-0339） */
    bronze: number;
    /** 求籤令；舊檔缺欄位補 0（PROG-2-0339） */
    oracle: number;
}

export function normalizeGachaWalletSave(value: unknown): GachaWalletSave {
    const raw = (value && typeof value === 'object' ? value : {}) as Partial<Record<keyof GachaWalletSave, unknown>>;
    const pick = (key: keyof GachaWalletSave): number => {
        const n = Math.floor(Number(raw[key]));
        return Number.isFinite(n) && n >= 0 ? n : 0;
    };
    return { gems: pick('gems'), gold: pick('gold'), tickets: pick('tickets'), bronze: pick('bronze'), oracle: pick('oracle') };
}

/** 名聲：非負整數，壞掉視為 0 */
export function normalizeFame(value: unknown): number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

/** 點數（溢出轉化積分）：舊檔沒有欄位視為 0 */
export function normalizeScorePoints(value: unknown): number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

/** 自動培育券數：舊檔沒有欄位視為 0 */
export function normalizeAutoNurtureTickets(value: unknown): number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

/** 布林旗標：舊檔沒有欄位或型別不對視為 false */
/** 後加的旗標：舊檔沒有欄位時保持缺席（讀檔端據此推算），有值才保留 */
function optionalFlag<K extends string>(value: unknown, key: K): Partial<Record<K, boolean>> {
    return typeof value === 'boolean' ? { [key]: value } as Record<K, boolean> : {};
}

export function normalizeFlag(value: unknown): boolean {
    return value === true;
}

/** 舊檔沒有欄位視為空；壞掉的項目丟棄，不猜測 */
function normalizePendingLifespanDeaths(value: unknown): PendingLifespanDeath[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is PendingLifespanDeath =>
        !!item && typeof item.generalId === 'string' && typeof item.age === 'number' && Number.isFinite(item.age));
}

export class PlayerSaveService {
    private _ready: Promise<void> | null = null;
    private _lastSixTableErrors: readonly string[] = [];

    constructor(private readonly _adapter: DataStorageAdapter, private readonly _key: string = PLAYER_SAVE_KEY) {}

    public get adapterName(): string {
        return this._adapter.adapterName;
    }

    /** 最近一次存檔時六表列驗證的錯誤（MVP-12）；只回報，不阻擋存檔 */
    public lastSixTableErrors(): readonly string[] {
        return this._lastSixTableErrors;
    }

    public async save(snapshot: PlayerSaveSnapshot): Promise<void> {
        await this._ensureReady();
        const validated = validatePlayerSaveSnapshot(snapshot);
        this._lastSixTableErrors = mapSnapshotToSixTables(validated).errors;
        await this._adapter.set(this._key, validated);
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
