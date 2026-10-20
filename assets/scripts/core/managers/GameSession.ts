// @spec-source → 遊戲時間系統.md (doc_spec_0034)、武將壽命系統.md (doc_spec_0018)、MVP遊戲驗證規格書.md (doc_spec_0045) §E #13 #14
/**
 * GameSession — 長局主迴圈（季度推進 + 增齡 + 存檔），純邏輯，不依賴 cc
 *
 * 一次 advanceSeason() 依序做：
 *   1. GameClock 推進 1 季（含模式輪轉、跨年判斷）
 *   2. 名冊中所有存活武將增齡、判定退役候選與死亡
 *   3. 年滿 5 歲的子嗣自動開獎（揭曉五維與初始因子，產生宿命建議）
 *   3.5 武將精力回補（出征 +25%、待命 +50%）
 *   3.6 母方待產倒數 −1；待產中的母方精力不回補（Pregnancy_Lock）
   4. 透過注入的名冊來源寫回名冊
 *   5. 若有掛 SeasonLifecycle（LegacyService）：死亡武將歸檔成英靈卡並移出名冊，
 *      再跑季結 / 年底資料壓縮與清掃
 *   6. 若有掛存檔服務，自動存檔（含進行中的培育會話）
 *   7. 廣播事件給 UI / 其他系統
 *
 * 退役是玩家的決定，不會自動發生：UI 收到 GeneralReachedRetirementAge 後讓玩家選，
 * 再呼叫 retireGeneral()。
 *
 * 名冊來源與事件匯流排都用介面注入，因此可以在 headless 測試直接跑完整迴圈。
 *
 * Unity 對照：像一個 DontDestroyOnLoad 的 GameManager 持有 TimeManager 與 SaveSystem，
 * 每季呼叫一次 AdvanceSeason()，再用 C# event 通知 UI 更新「第 N 年 M 季」。
 */
import { battleIntelligenceOf } from '../systems/BattleRoster';
import { hasMatchingGreenFactor, learnTacticInto, type TacticLearnCheck } from '../systems/TacticLearning';
import { canStartAutoNurture, consumeAutoNurtureTicket, isAutoNurtureUnlocked, resolveAutoSchedule, runAutoNurtureSeason, type AutoNurtureBlockReason } from '../systems/AutoNurture';
import type { NurtureAction, NurtureRoundLog } from '../systems/NurtureSystem';
import { learnTpCost } from '../systems/FactorTacticLinkage';
import type { GeneralConfig } from '../models/GeneralUnit';
import { advanceDaughtersOneYear, assignDaughterRoute, type AssignDaughterResult, type DaughterRecord, type DaughterRoute } from '../systems/DaughterComingOfAge';
import { GameClock, GameTimeState, SeasonAdvanceResult, SEASONS_PER_YEAR } from '../systems/GameClock';
import { buildYearReport, normalizeYearAgingEvents, YearReport } from '../systems/YearReport';
import { backfillTallyTroopTypes, mainTroopTypeOf } from '../systems/TigerTally';
import type { CountdownState } from '../systems/CountdownManager';
import { createTravelCountdown, normalizeTravelCountdown, tickTravelCountdown, type TravelCountdown } from '../systems/TravelCountdown';
import { ageGeneralsOneSeason, AgingEvent, isGeneralDead, RandomSource } from '../systems/GeneralAging';
import { applyActiveLifespanToRoster, ActiveLifespanResult, preLifespanBaseline } from '../systems/LifespanWiring';
import { applyJobChangeToRoster, JobWiringGeneral } from '../systems/JobChangeWiring';
import type { JobChangeResult, JobClass } from '../systems/JobChange';
import type { LifespanCommand } from '../systems/LifespanCost';
import type { LifecycleSettlement, SeasonLifecycle } from '../services/LegacyService';
import type { MentorCard } from '../models/MentorCard';
import { normalizeDeck, toggleDeckCard, DeckToggleOutcome } from '../services/PlayerDeckRules';
import { SeededRandom, LEGACY_RANDOM_SEED } from '../systems/SeededRandom';
import { createEmptyMercenaryBundle, normalizeMercenaryBundle, serializeMercenaryBundle, type MercenarySaveBundle } from '../systems/MercenarySaveModel';
import { bondMercenaryToRoster, statsOfTemplate, type RosterBondResult } from '../systems/MercenaryRoster';
import { useTrialTicket, type TrialTicketRejectReason, type TrialTicketResult } from '../systems/MercenaryTrialTicket';
import { createUpkeepState } from '../systems/MercenaryUpkeep';
import { advanceTrialDay } from '../systems/MercenaryTrialDay';
import { settleTrialRollover, type DepartureEvent } from '../systems/MercenaryDeparture';
import { buildMercenaryPoolRows, filterPoolGeneralIds, type MercenaryPoolRow } from '../systems/MercenaryPoolPresenter';
import { acknowledgeOnboardingSegment, FRESH_ONBOARDING, normalizeOnboardingState, OnboardingResult, OnboardingState } from '../systems/OnboardingTutorial';
import { EMPTY_DOMESTIC_LOG, normalizeDomesticLog, runDomesticTask, type DomesticSeasonLog, type DomesticTaskResult } from '../systems/DomesticTasks';
import type { HallCandidate } from '../systems/HallCharacterRoll';
import { buildHallSpotRows, EMPTY_HALL_SPOT_STATE, HallSpotRow, HallSpotState, refreshHallCharacterSpots } from '../systems/HallCharacterPresenter';
import { createPlayerSaveSnapshot, normalizeSortiePresets, normalizeGachaWalletSave, type GachaWalletSave, normalizeClearedStageIds, normalizeFavoriteGeneralIds, normalizeHallAssignments, normalizeFame, normalizeScorePoints, normalizeAutoNurtureTickets, normalizeFlag, normalizeTallyCardsMap, normalizeTallyHoldingsMap, normalizeTallyLoyaltyMap, PlayerSaveService, PlayerSaveSnapshot } from '../services/PlayerSaveService';
import { settleDeathTallies } from '../systems/TallyDeathSettlement';
import type { TigerTallyCard } from '../models/TigerTallyCard';
import { applyBattleExpToCard, tallyBattleOutcome } from '../systems/TigerTallyStar';
import { confiscateFrom, createTallyHoldings, equipTally, onGeneralDeath, tallyOfGeneral, unequipTally, type TallyHoldingsResult, type TallyHoldings } from '../systems/TigerTallyHoldings';
import { applyTallyConfiscation, applyTallyLoyaltyChange, createTallyLoyaltyState, type TallyLoyaltyAction, type TallyLoyaltyResult, type TallyLoyaltyState } from '../systems/TigerTallyLoyalty';
import type { TigerTallyQuality } from '../models/TigerTallyCard';
import type { NurtureState } from '../services/NurtureService';
import {
    awakenFactor,
    AwakeningFailReason,
    AwakeningTrigger,
    FactorAwakenedEvent,
    rollBattleAwakening,
} from '../systems/FactorAwakening';
import {
    battleExpSource,
    DiscoveryExpSource,
    DiscoveryGain,
    gainDiscoveryExp,
    normalizeDiscoveryProgress,
} from '../systems/DiscoveryProgress';
import type { NurtureAwakeningHooks } from '../services/NurtureService';
import { buildStarterRoster, STARTER_CORE_GENERAL_ID, StarterRosterOptions } from '../services/StarterRosterService';
import { resolveFactorColor } from '../systems/FactorInheritance';
import type { FactorDictionary } from '../systems/FactorInheritance';
import { specialActionFactorTags } from '../systems/BattleSpecialActions';
import { applyDuplicatePull, RebirthPullResult } from '../systems/Rebirth';
import { normalizeBondPoints, overflowBondPoints, overflowRarityOf } from '../systems/OverflowBond';
import { divineFactor, getSage, isSageUnlocked, predictOffspring, ProphecyKeywordSource, ProphecyResult, SageDivinationResult } from '../systems/SageDivination';
import type { FactorPoolEntry } from '../systems/BreedingSystem';
import { planBloodlineMergeForGenerals, type BloodlineMergeRejectReason } from '../systems/BloodlineMerge';
import { addItem, consumeItem, grantSeasonalOracleTokens, ITEM_BAMBOO_SLIP, ITEM_JOB_CHANGE_ORDER, ITEM_ORACLE_TOKEN, ITEM_TRIAL_TICKET, itemCount, normalizeInventory, PlayerInventory, STARTER_INVENTORY } from '../systems/PlayerInventory';
import { useVitalityPill, type VitalityPillKind, type VitalityPillUseResult } from '../systems/VitalityPill';
import { baseVitalityMaxOf } from '../systems/VitalityCap';
import { Faction } from '../config/Constants';
import { applySortieResult, MilitaryReserve, normalizeMilitaryReserve, regenMilitaryOneSeason, STARTER_MILITARY } from '../systems/MilitaryReserve';
import { buildEraResetEvent } from '../systems/EraReset';
import { seasonModifiersOf } from '../systems/SeasonModifiers';
import { computeCommandCapacity, getDeputyFoodBonus, getStrategistBonus, getTacticTpCost, TALLY_SHORTAGE_FOOD_THRESHOLD, validateSortieLoadout, type CreateSortieInput, type DeputyFoodBonus, type SortieLoadoutCheck, type SortieMember, type StrategistBonus, type SortieSummary } from '../systems/SortieDeploy';
import type { BattlePerformance } from '../systems/BattleRecordStats';
import { grantTacticNotes, rewardsForMilestones } from '../systems/MilestoneRewards';
import { captiveFemaleSourceOf, createPowRecord, createPrisonState, normalizePrisonState, prisonYieldOneSeason, resolvePowDecision, type PowDecision, type PowRecord, type PowResolution, type PrisonState } from '../systems/PrisonerOfWar';
import { createFemaleSource, normalizeFemaleSource, normalizeFemaleSourcesMap, type FemaleSource } from '../systems/FemaleSource';
import { normalizeGachaPityBook, type GachaPityBook } from '../systems/GachaDraw';
import { drawFemalePool, isFemalePoolRefreshDue, type PoolCandidate } from '../systems/FemalePoolRefresh';
import { isRescueRefreshDue, rollDungeonRescue, type RescueOutcome } from '../systems/DungeonRescue';
import { giftToFemale, normalizeFemaleSystemState, type FemaleSystemState } from '../systems/FemaleSystemState';
import { unveilDueGenerals, UnveilingEvent, UnveilingGeneral } from '../systems/Unveiling';
import { advanceBreedingSeason, holdPregnancyVigor } from '../systems/BreedingSystem';
import { DynamicRelationBook, battleComradePairs, type DynamicRelationResult } from '../systems/KinDynamicRelations';
import { grantLegacyRewards, normalizeLegacyCount, type LegacyAchievement } from '../systems/LegacyAchievement';
import { STARTER_GACHA_WALLET } from '../services/GachaWalletRules';
import type { DynamicRelation } from '../systems/KinRelation';
import { normalizeRosterRoles } from '../systems/RosterRoleLoad';
import {
    BattleResult,
    BattleSettlement,
    buildBattleConfig,
    checkDeployable,
    DeployCheck,
    listDeployable,
    recoverVitalityOneSeason,
    settleBattle,
} from '../systems/BattleRoster';

export const GAME_SESSION_EVENTS = {
    /** payload: SeasonAdvancedPayload */
    SeasonAdvanced: 'game-session-season-advanced',
    /** payload: YearReport（第 4 季結束時發出；養成線 FEM-06 等年度掛點接在這裡） */
    YearEnded: 'game-session-year-ended',
    /** payload: AgingEvent（type = reached-retirement-age） */
    GeneralReachedRetirementAge: 'game-session-general-retirement-age',
    /** payload: AgingEvent（type = died） */
    GeneralDied: 'game-session-general-died',
    /** payload: AgingEvent（type = entered-growth-stage，stage 為 grow-up / prime / elder） */
    GeneralGrowthStage: 'game-session-general-growth-stage',
    /** payload: EraResetEvent（每 60 月一次；目前只發訊號，領土/外交/AI 重置待世界沙盤接入，TIME-10） */
    EraReset: 'game-session-era-reset',
    /** payload: UnveilingEvent（UI 在此播放血脈命鏡開獎演出，再讓玩家選宿命） */
    GeneralUnveiled: 'game-session-general-unveiled',
    /** payload: MentorCard */
    GeneralRetired: 'game-session-general-retired',
    /** payload: SpiritCard（每位死亡武將一張） */
    SpiritCardCreated: 'game-session-spirit-card-created',
    /** payload: BattleSettlement（戰後精力、戰績、功勳已寫回名冊） */
    BattleSettled: 'game-session-battle-settled',
    /** payload: string | null（出戰主將 id） */
    LeadGeneralChanged: 'game-session-lead-general-changed',
    /** payload: CountdownState | null（趕路倒數開始或清除；OPEN-11） */
    CountdownChanged: 'game-session-countdown-changed',
    /** payload: TravelCountdown | null（回合制趕路；存檔欄位 travelCountdown） */
    TravelChanged: 'game-session-travel-changed',
    /** payload: SortieSupport（參謀官 / 後勤官，PROG-2-0083） */
    SortieSupportChanged: 'game-session-sortie-support-changed',
    /** payload: PlayerSaveSnapshot */
    Saved: 'game-session-saved',
    /** payload: GeneralConfig[]（本次新加入名冊的武將） */
    RosterChanged: 'game-session-roster-changed',
    /** payload: undefined（第一次打贏戰鬥；新手開場第四幕紅顏的觸發點，只發一次） */
    FirstBattleCleared: 'game-session-first-battle-cleared',
    /** payload: PlayerSaveSnapshot */
    Loaded: 'game-session-loaded',
    /** payload: string[]（新的出戰卡組） */
    DeckChanged: 'game-session-deck-changed',
    /** payload: FactorAwakenedEvent */
    FactorAwakened: 'game-session-factor-awakened',
    /** payload: PlayerInventory（道具數量變動後的庫存） */
    InventoryChanged: 'game-session-inventory-changed',
    /** payload: DiscoveryGain（只在升級時廣播；phaseAfter > phaseBefore 時 UI 播放新色階解鎖提示） */
    DiscoveryLevelChanged: 'game-session-discovery-level-changed',
} as const;

/** 季度增齡事件的廣播頻道：死亡、成長階段、退役候選三種 */
function agingEventChannel(event: AgingEvent): string {
    if (event.type === 'died') return GAME_SESSION_EVENTS.GeneralDied;
    if (event.type === 'entered-growth-stage') return GAME_SESSION_EVENTS.GeneralGrowthStage;
    return GAME_SESSION_EVENTS.GeneralReachedRetirementAge;
}

/** 名冊來源；正式環境接 PlayerRosterService，測試接記憶體陣列 */
export interface RosterStore {
    getAll(): GeneralConfig[];
    replaceAll(generals: GeneralConfig[]): void;
}

/** 只需要 emit 的最小事件介面，正式環境傳入 EventSystem */
export interface SessionEventEmitter {
    emit(eventName: string, payload?: unknown): void;
}

export interface SeasonAdvancedPayload {
    advance: SeasonAdvanceResult;
    agingEvents: AgingEvent[];
    /** 本季新開獎的子嗣 */
    unveilings: UnveilingEvent[];
    /** 有掛 SeasonLifecycle 才有；包含本季新建的英靈卡與季結 / 年底排程結果 */
    lifecycle?: LifecycleSettlement;
    /** 本季免費發放的求籤令（已達免費上限時為 0） */
    oracleTokensGranted?: number;
    /** 本季是年末時才有：本年的年報（TIME-07） */
    yearReport?: YearReport;
}

/** 進行中的培育會話存取介面；正式環境為 NurtureService，讓存檔帶著培育進度 */
export interface NurtureStatePort {
    getState(): NurtureState;
    restoreState(state: NurtureState | null | undefined): void;
}

/** 戰後結算結果：名冊結算 + 覺醒經驗 + 本場覺醒的因子 */
export interface BattleRecordResult extends BattleSettlement {
    /** 有給經驗才有（ongoing 或名冊沒人出戰時省略） */
    discovery?: DiscoveryGain;
    awakenings: FactorAwakenedEvent[];
    /** 有出征帳本才有：寫回後的城市兵源與糧草（PROG-2-0072） */
    military?: MilitaryReserve;
}

export interface RecordBattleOptions {
    /** 在戰場完成「特定動作」的武將（覺醒機率 0.05 → 0.15，並視同滿足特殊條件），不指定是哪個動作 */
    specialActionIds?: readonly string[];
    /** 武將 id → 本場完成的特定動作（BattleSpecialActionId）；會用動作標籤優先挑相符的因子 */
    specialActions?: Readonly<Record<string, readonly string[]>>;
    /** 出征帳本結算（戰損回扣城市兵源、糧草消耗）；沒有時城市兵源與糧草不變 */
    sortie?: Pick<SortieSummary, 'lostTroops' | 'foodSpent'> | null;
    /** 武將 id → 本場表現（擊殺 / 傷害 / 承傷 / 治療），累加進戰績 */
    performance?: Readonly<Record<string, BattlePerformance>>;
    /** 本場的關卡 id；勝利時記入通關紀錄（連環破，PROG-2-0215） */
    stageId?: string;
    /** 本場出陣的虎符卡片 id；戰後各自累積戰鬥經驗並可能升星（PROG-2-0573） */
    deployedTallyIds?: readonly string[];
    /** 武將 id → 戰鬥結束時的精力（已扣奧義成本）；結算以此為基準再扣戰後精力 */
    vitalityAfterBattle?: Readonly<Record<string, number>>;
}

export interface AddGeneralsResult {
    added: GeneralConfig[];
    duplicates: GeneralConfig[];
    /** 重複抽到且啟用轉生時，每位被轉生的武將結果（GCH-05） */
    rebirths: Array<RebirthPullResult & { id: string }>;
    /** 滿轉溢出換得的結義點數（GCH-06） */
    bondPointsGained: number;
}

export interface AddGeneralsOptions {
    /** 轉蛋抽到重複同名武將時改為轉生（+1 轉）；預設關閉，俘虜招募等來源維持原行為 */
    rebirthOnDuplicate?: boolean;
}

export class InMemoryRosterStore implements RosterStore {
    private _generals: GeneralConfig[];

    constructor(initial: GeneralConfig[] = []) {
        this._generals = initial.map((general) => ({ ...general }));
    }

    getAll(): GeneralConfig[] {
        return this._generals.map((general) => ({ ...general }));
    }

    replaceAll(generals: GeneralConfig[]): void {
        this._generals = generals.map((general) => ({ ...general }));
    }
}

/** 出征支援：參謀官 / 後勤官（PROG-2-0083） */
export interface SortieSupport {
    strategistUid: string | null;
    deputyUid: string | null;
}

export interface SortieSupportSummary {
    strategist: GeneralConfig | null;
    deputy: GeneralConfig | null;
    strategistBonus: StrategistBonus;
    deputyBonus: DeputyFoodBonus;
}

function toSortieMember(g: GeneralConfig): SortieMember {
    return {
        id: g.id,
        int: g.int ?? g.stats?.int,
        pol: g.pol ?? g.stats?.pol,
        lea: g.lea ?? g.stats?.lea,
        ...(g.bloodlineId ? { bloodlineId: g.bloodlineId } : {}),
    };
}

/** 虎符忠誠度初始值（規格未定，暫定）；武將沒有紀錄時以此起算 */
const TALLY_LOYALTY_INITIAL = 50;

/** 試用券招募結果：沿用 TrialTicketResult，另加上 uid 重複的拒絕原因。 */
export type HireTrialResult = Omit<TrialTicketResult, 'reason'> & { reason?: TrialTicketRejectReason | 'uid-taken' };

/** 單一遊戲日的傭兵結算結果：日序與本日產生的離隊事件（告別信等）。 */
export interface MercenaryDayReport {
    day: number;
    events: DepartureEvent[];
}

export class GameSession {
    private _clock = new GameClock();
    /** 動態關係表（KIN-10）：目前只在記憶體中，存檔欄位另卡接線 */
    public readonly dynamicRelations = new DynamicRelationBook();
    private _roster: RosterStore = new InMemoryRosterStore();
    private _save: PlayerSaveService | null = null;
    private _events: SessionEventEmitter | null = null;
    private _lifecycle: SeasonLifecycle | null = null;
    private _seeded: SeededRandom;
    private _random: RandomSource = () => this._seeded.next();
    /** 主動指令造成的死亡事件；下一次季結時併入 aging 事件交給季結結算（不寫入存檔，見 PROG-2-0221） */
    private _pendingLifespanEvents: AgingEvent[] = [];
    /** 本年度累積的老化事件（年末產出年報後清空，不存檔；年中讀檔時從 0 起算） */
    private _yearAgingEvents: AgingEvent[] = [];
    /** 本季第一次主動扣壽命前的名冊；季結時當作陣亡虎符結算的「之前」基準，結算後清掉（不存檔） */
    private _preLifespanRoster: GeneralConfig[] | null = null;
    /** 共用入口保持同一函式身分，讀檔恢復游標後既有服務會立即使用新狀態。 */
    public readonly randomSource: RandomSource = () => this._random();

    private _autoSave = true;
    private _nurture: NurtureStatePort | null = null;
    private _factorDictionary: FactorDictionary | undefined;
    private _deck: string[] = [];
    private _leadGeneralId: string | null = null;
    /** 出征支援（參謀官 / 後勤官）；暫定只存在本次遊玩，不寫存檔 */
    private _sortieSupport: SortieSupport = { strategistUid: null, deputyUid: null };
    /** 編制預設（DEP-14）：主將 id → 參謀官 / 後勤官，會寫入存檔 */
    private _sortiePresets: Record<string, SortieSupport> = {};
    /** 趕路倒數（OPEN-11）；目前未存檔，讀檔後為 null。 */
    private _countdown: CountdownState | null = null;
    /** 回合制趕路（PROG-2-0475）：每季遞減，歸零即到達並清除；存檔欄位 travelCountdown。 */
    private _travel: TravelCountdown | null = null;
    private _discoveryLevel = 1;
    private _discoveryExp = 0;
    private _inventory: PlayerInventory = { ...STARTER_INVENTORY };
    private _oracleCount = 0;
    private _onboarding: OnboardingState = { ...FRESH_ONBOARDING };
    /** 結義點數（轉蛋滿轉溢出獲得，傭兵轉永久用）；存檔欄位 bondPoints */
    private _bondPoints = 0;
    /** 已通關的關卡 id（連環破，PROG-2-0215） */
    private _clearedStageIds: string[] = [];
    /** 收藏武將 id（HALL-07 收藏權重，PROG-2-0453） */
    private _favoriteGeneralIds: string[] = [];
    /** 大廳任務指派：任務 id → 指派武將 id（HALL-07 已派任務權重，PROG-2-0453） */
    private _hallAssignments: Record<string, string> = {};
    /** 大廳武將點位的目前狀態（HALL-07，不存檔：讀檔後重新抽） */
    private _hallSpotState: HallSpotState = EMPTY_HALL_SPOT_STATE;
    /** 武將 id → 虎符忠誠度狀態（TRP-09） */
    private _tallyLoyalty: Record<string, TallyLoyaltyState> = {};
    /** 虎符持有關係（TRP-08）：虎符 uid → 持有武將 id（null 為君主） */
    private _tallyHoldings: TallyHoldings = createTallyHoldings([]);
    /** 虎符卡資料（uid → 卡）；陣亡產出的卡會登記到這裡 */
    private _tallyCards: Record<string, TigerTallyCard> = {};
    /** 女性武將來源（uid → 來源，FEM-01）；戰俘女將歸入名冊時寫入（PROG-2-0245） */
    private _femaleSources: Record<string, FemaleSource> = {};
    /** 轉蛋各池保底計數（PROG-2-0337）；由轉蛋服務寫入，存檔時一併保存 */
    private _gachaPity: GachaPityBook = {};
    private _femaleSystem: FemaleSystemState = normalizeFemaleSystemState(undefined);
    /** 轉蛋錢包（PROG-2-0338）；null 代表存檔沒有，讀舊 localStorage 或用預設 */
    private _gachaWallet: GachaWalletSave | null = null;
    /** 轉蛋資料（保底、錢包）的版本號：每次被改動就加一；轉蛋服務靠它得知自己的快取過期（PROG-2-0608） */
    private _gachaRevision = 0;
    /** Legacy_Count（RET-07）：玩家層級的跨世代成就次數 */
    private _legacyCount = 0;
    private _military: MilitaryReserve = { ...STARTER_MILITARY };
    private _prison: PrisonState<GeneralConfig> = createPrisonState<GeneralConfig>();
    /** 名聲（暫定：存於 resources.fame） */
    private _fame = 0;
    /** 點數（溢出轉化積分，MENT-07）；存於 resources.scorePoints */
    private _scorePoints = 0;
    /** 自動培育券數（NUR-14）；存於 resources.autoNurtureTickets */
    private _autoNurtureTickets = 0;
    /** 主線第一次通過培育季後為 true（解鎖自動培育）；存於 resources.mainlineNurtureClearedOnce */
    private _mainlineNurtureClearedOnce = false;
    /** 第一次打贏戰鬥後為 true（新手開場第四幕觸發）；舊檔依既有通關紀錄推算，存於 resources.firstBattleCleared */
    private _firstBattleCleared = false;
    /** 新手開場第四幕（紅顏登場）已展示過；舊檔已有通關紀錄者視為看過，不補彈。存於 resources.openingRedFaceShown */
    private _openingRedFaceShown = false;
    /** 內政本季紀錄：同季只能選一項 */
    private _domesticLog: DomesticSeasonLog = { ...EMPTY_DOMESTIC_LOG };
    /** 季末糧不足標記（TRP-12）；只給下一場出征用，不進存檔 */
    private _tallyFoodDiscountArmed = false;
    /** 傭兵存檔包（試用、薪水、冷卻）；隨存檔保存（MERC-01 接線） */
    private _mercenaries: MercenarySaveBundle = createEmptyMercenaryBundle();

    constructor(seed: number = Math.floor(Math.random() * 4294967296)) {
        this._seeded = new SeededRandom(seed);
    }

    public get gameTime(): GameTimeState {
        return this._clock.state;
    }

    public get roster(): GeneralConfig[] {
        return this._roster.getAll();
    }

    /** 玩家出戰卡組（複本）；空陣列 = 尚未選卡，戰場端會退回預設卡組 */
    /** 玩家指定的出戰主將 id（可能已不能出戰，取用請走 resolveLeadGeneralId） */
    public get leadGeneralId(): string | null {
        return this._leadGeneralId;
    }

    public get deck(): string[] {
        return [...this._deck];
    }

    /** 因子覺醒用的玩家層級（決定能解鎖到哪個色階） */
    public get discoveryLevel(): number {
        return this._discoveryLevel;
    }

    /** 目前等級內累積的覺醒經驗 */
    public get discoveryExp(): number {
        return this._discoveryExp;
    }

    /** 道具庫存（唯讀副本） */
    /** 新手引導進度（只讀副本）；讀檔後由存檔還原 */
    /** 結義點數餘額（GCH-06） */
    public get bondPoints(): number {
        return this._bondPoints;
    }

    public get onboarding(): OnboardingState {
        return { ...this._onboarding };
    }

    /**
     * 確認一段新手引導已看過。依序確認，跳段或重複被拒（回傳 ok=false 且不存檔）。
     * 成功時自動存檔，讓關掉遊戲再開也不會重看。
     */
    public async acknowledgeOnboarding(segmentId: 'fate' | 'growth' | 'legacy'): Promise<OnboardingResult> {
        const result = acknowledgeOnboardingSegment(this._onboarding, segmentId);
        if (!result.ok) return result;
        this._onboarding = result.state;
        if (this._autoSave && this._save) await this.save();
        return result;
    }

    public get inventory(): PlayerInventory {
        return { ...this._inventory };
    }

    /** 累計名士占卜次數（覺醒占卜與子嗣預言都算，決定名士解鎖） */
    public get oracleCount(): number {
        return this._oracleCount;
    }

    /** 已通關的關卡 id（連環破，唯讀副本） */
    public get clearedStageIds(): readonly string[] {
        return [...this._clearedStageIds];
    }

    /** 虎符忠誠度狀態（唯讀副本）；沒有紀錄的武將不在表內 */
    public get tallyLoyalty(): Readonly<Record<string, TallyLoyaltyState>> {
        return { ...this._tallyLoyalty };
    }

    /** 虎符持有關係（唯讀副本）；uid → 持有武將 id，null 為君主 */
    public get tallyHoldings(): Readonly<Record<string, string | null>> {
        return { ...this._tallyHoldings.holders };
    }

    /** 虎符卡資料（唯讀副本）；uid → 卡 */
    /** 傭兵存檔包的副本；改動需透過 setMercenaries。 */
    public get mercenaries(): MercenarySaveBundle {
        return serializeMercenaryBundle(this._mercenaries);
    }

    /** 傭兵系統目前的遊戲日（從 0 起算）。 */
    public get mercenaryDay(): number {
        return this._mercenaries.day ?? 0;
    }

    /**
     * 推進一個遊戲日：試用中傭兵倒數 −1、好感 +10。
     * 倒數已在前一日歸零且仍未結義者，本日離隊、寫入告別事件並開始 30 天冷卻。
     * 遊戲日的觸發入口（時間軸）尚未定案，由呼叫端決定何時呼叫。
     */
    public async advanceMercenaryDay(): Promise<MercenaryDayReport> {
        const today = this.mercenaryDay + 1;
        const events: DepartureEvent[] = [];
        const departed = new Set<string>();
        let cooldowns = this._mercenaries.cooldowns;
        const mercenaries = this._mercenaries.mercenaries.map((merc) => {
            const settled = settleTrialRollover(merc, today, cooldowns);
            cooldowns = settled.cooldowns;
            if (settled.departed) {
                departed.add(merc.uid);
                events.push(...settled.events);
                return { ...merc, status: settled.record.status };
            }
            return advanceTrialDay(merc).state;
        });
        this._mercenaries = {
            ...this._mercenaries,
            mercenaries,
            upkeep: this._mercenaries.upkeep.filter((u) => !departed.has(u.uid)),
            cooldowns,
            day: today,
        };
        if (this._autoSave && this._save) {
            await this.save();
        }
        return { day: today, events };
    }

    /** 傭兵池可出現的武將：過濾掉 30 天冷卻中的武將 id，保留原順序。 */
    public availablePoolGeneralIds(generalIds: readonly string[]): string[] {
        return filterPoolGeneralIds(generalIds, this.mercenaryDay, this._mercenaries.cooldowns);
    }

    /** 傭兵列表的顯示列（倒數、結義進度、按鈕可否）；由目前存檔包推導，不改狀態。 */
    public mercenaryPoolRows(): MercenaryPoolRow[] {
        return buildMercenaryPoolRows(this._mercenaries);
    }

    /** 以校正後的副本取代傭兵存檔包；不寫存檔，由呼叫端決定何時 save。 */
    public setMercenaries(bundle: MercenarySaveBundle): void {
        this._mercenaries = normalizeMercenaryBundle(bundle);
    }

    /** 登記或覆寫一位武將的女性來源；格式不合法時回傳 false 且不變動。不寫存檔，由呼叫端決定何時 save。 */
    public setFemaleSource(generalId: string, source: FemaleSource): boolean {
        const normalized = normalizeFemaleSource(source);
        if (generalId.length === 0 || normalized === null) return false;
        this._femaleSources = { ...this._femaleSources, [generalId]: normalized };
        return true;
    }

    /**
     * 結義入名冊：傭兵結義轉永久（好感滿 60 為門檻，扣結義點數）、寫入武將名冊、進入 30 天冷卻、移除欠薪紀錄，並自動存檔。
     * 失敗時不改任何狀態。結義點數從 GCH-06 的餘額（bondPoints）扣除。
     */
    public async bondMercenaryToRoster(uid: string, template: GeneralConfig): Promise<RosterBondResult & { rosterAdded?: boolean }> {
        const mercenary = this._mercenaries.mercenaries.find((m) => m.uid === uid);
        if (!mercenary) {
            return { ok: false, reason: 'not-found', pointsSpent: 0 };
        }
        const result = bondMercenaryToRoster(mercenary, template, this._bondPoints, this._mercenaries.cooldowns, this.mercenaryDay);
        if (!result.ok || !result.mercenary || !result.general || !result.cooldowns) {
            return result;
        }
        this._mercenaries = {
            mercenaries: this._mercenaries.mercenaries.map((m) => (m.uid === uid ? result.mercenary! : m)),
            upkeep: this._mercenaries.upkeep.filter((u) => u.uid !== uid),
            cooldowns: result.cooldowns,
            day: this.mercenaryDay,
        };
        this._bondPoints -= result.pointsSpent;
        const { added } = await this.addGenerals([result.general]);
        if (added.length > 0) await this.recordMercenaryOath(result.general.id);
        return { ...result, rosterAdded: added.length > 0 };
    }

    /**
     * 對武將使用補元散（PROG-2-0444）：扣道具、回復精力、寫回名冊並存檔。
     * 精力已滿或沒有道具時整體拒絕，背包與名冊都不變；查無武將回傳 no-general。
     * 上限沿用名冊上的 maxVitality，缺值時用性別基礎值（與 VitalityCap 一致）。
     */
    public async usePillOnGeneral(generalId: string, kind: VitalityPillKind): Promise<VitalityPillUseResult | { readonly ok: false; readonly reason: 'no-general' }> {
        const general = this._roster.getAll().find((g) => g.id === generalId);
        if (!general) return { ok: false, reason: 'no-general' };
        const max = general.maxVitality ?? general.vitality ?? baseVitalityMaxOf(general.gender);
        const current = general.vitality ?? max;
        const result = useVitalityPill(this._inventory, current, max, kind);
        if (!result.ok) return result;
        this._inventory = result.inventory;
        this._roster.replaceAll(this._roster.getAll().map((g) => (g.id === generalId ? { ...g, vitality: result.vitality, maxVitality: max } : g)));
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        if (this._autoSave && this._save) {
            await this.save();
        }
        return result;
    }

    /**
     * 結義傭兵成功（KIN-06 / 事件 mercenary-oath）：與出戰主將記為義兄弟（DYNAMIC_SWORN）。
     * 暫定：規格未寫結義對象，先以出戰主將為對象；沒有主將或就是同一人時回傳 null。有新增才自動存檔。
     */
    public async recordMercenaryOath(generalUid: string): Promise<DynamicRelationResult | null> {
        const lead = this._leadGeneralId;
        if (!lead || lead === generalUid) return null;
        const result = this.dynamicRelations.record('mercenary-oath', generalUid, lead, this._clock.state.totalSeasonsElapsed);
        if (result.ok && result.created && this._autoSave && this._save) {
            await this.save();
        }
        return result;
    }

    /** 轉蛋各池保底計數（唯讀副本） */
    /** 子嗣女兒清單（唯讀副本，FEM-06） */
    public get daughters(): DaughterRecord[] {
        return [...this.femaleSystemState.daughters];
    }

    /** 新增一位子嗣女兒；id 重複回傳 false、不改狀態。 */
    public async addDaughter(record: DaughterRecord): Promise<boolean> {
        const current = this.femaleSystemState;
        if (current.daughters.some((d) => d.id === record.id)) return false;
        this._femaleSystem = { ...current, daughters: [...current.daughters, { ...record }] };
        if (this._autoSave && this._save) {
            await this.save();
        }
        return true;
    }

    /** 女兒滿 14 歲後選路線；成功才寫回並存檔，失敗回傳原因且不改狀態。 */
    public async assignDaughterRouteFor(daughterId: string, route: DaughterRoute): Promise<AssignDaughterResult | { ok: false; reason: 'NOT_FOUND' }> {
        const current = this.femaleSystemState;
        const target = current.daughters.find((d) => d.id === daughterId);
        if (!target) return { ok: false, reason: 'NOT_FOUND' };
        const result = assignDaughterRoute(target, route);
        if (!result.ok) return result;
        this._femaleSystem = {
            ...current,
            daughters: current.daughters.map((d) => (d.id === daughterId ? result.daughter : d)),
        };
        if (this._autoSave && this._save) {
            await this.save();
        }
        return result;
    }

    /**
     * 年度掛點（FEM-06）：女兒每年長一歲，回傳本年剛滿 14 歲的女兒（給 UI 排分流提示）。
     * 年末事件（YearEnded）接上後由它呼叫；本函式只改女兒年齡，不發事件。
     */
    public async onYearAdvanced(): Promise<DaughterRecord[]> {
        const current = this.femaleSystemState;
        const { daughters, newlyOfAge } = advanceDaughtersOneYear(current.daughters);
        if (daughters.length === 0) return newlyOfAge;
        this._femaleSystem = { ...current, daughters };
        if (this._autoSave && this._save) {
            await this.save();
        }
        return newlyOfAge;
    }

    /** 女性來源系統狀態的唯讀副本（傭兵池／救美刷新時間、送禮好感） */
    public get femaleSystemState(): FemaleSystemState {
        return normalizeFemaleSystemState(this._femaleSystem);
    }

    /** 送禮：回傳該武將更新後的好感（0~100） */
    public giftFemale(uid: string, giftValue: number): number {
        this._femaleSystem = giftToFemale(this._femaleSystem, uid, giftValue);
        return this._femaleSystem.giftAffection[uid] ?? 0;
    }

    /** 傭兵池到期才刷新：未到期回傳 null；到期則記下時間戳並抽出女性池 */
    public refreshFemalePoolIfDue(candidates: readonly PoolCandidate[], nowMs: number, random: () => number, size = 4): string[] | null {
        const last = this._femaleSystem.poolRefreshedAtMs;
        if (last !== null && !isFemalePoolRefreshDue(last, nowMs)) return null;
        this._femaleSystem = { ...this._femaleSystem, poolRefreshedAtMs: nowMs };
        return drawFemalePool(candidates, size, random);
    }

    /** 地下城救美：未到 8 小時回傳 null；到期則記下時間戳並擲出結果 */
    public rollDungeonRescueIfDue(nowMs: number, random: () => number): RescueOutcome | null {
        const last = this._femaleSystem.rescueRefreshedAtMs;
        if (last !== null && !isRescueRefreshDue(last, nowMs)) return null;
        this._femaleSystem = { ...this._femaleSystem, rescueRefreshedAtMs: nowMs };
        return rollDungeonRescue(random);
    }

    public get gachaPityBook(): Readonly<GachaPityBook> {
        return normalizeGachaPityBook(this._gachaPity);
    }

    /** 轉蛋資料版本號；任何寫入（含讀檔、新遊戲、世代成就入帳）都會讓它改變 */
    public get gachaRevision(): number {
        return this._gachaRevision;
    }

    /** 轉蛋錢包（唯讀副本）；null 代表存檔沒有 */
    public get gachaWalletSave(): Readonly<GachaWalletSave> | null {
        return this._gachaWallet ? { ...this._gachaWallet } : null;
    }

    /** 覆寫轉蛋錢包；不寫存檔，由呼叫端決定何時 save */
    public setGachaWalletSave(wallet: Readonly<GachaWalletSave>): void {
        this._gachaWallet = normalizeGachaWalletSave(wallet);
        this._gachaRevision += 1;
    }

    /** 覆寫轉蛋保底表；不寫存檔，由呼叫端決定何時 save */
    public setGachaPityBook(book: Readonly<GachaPityBook>): void {
        this._gachaPity = normalizeGachaPityBook(book);
        this._gachaRevision += 1;
    }

    /**
     * 試用券招募（MERC-02）：消耗背包 1 張試用券，產生 Trial 傭兵並建立薪水紀錄，自動存檔。
     * uid 已存在、無試用券或武將 id 為空時拒絕，失敗不改任何狀態。uid 由呼叫端提供。
     */
    public async hireTrialMercenary(uid: string, template: GeneralConfig): Promise<HireTrialResult> {
        const wallet = { trialTickets: this.itemCount(ITEM_TRIAL_TICKET) };
        if (this._mercenaries.mercenaries.some((m) => m.uid === uid)) {
            return { ok: false, reason: 'uid-taken', wallet };
        }
        const result = useTrialTicket(wallet, uid, statsOfTemplate(template), template.id);
        if (!result.ok || !result.mercenary) {
            return result;
        }
        const inventory = consumeItem(this._inventory, ITEM_TRIAL_TICKET);
        if (!inventory) {
            return { ok: false, reason: 'no-ticket', wallet };
        }
        this._inventory = inventory;
        this._mercenaries = {
            ...this._mercenaries,
            mercenaries: [...this._mercenaries.mercenaries, result.mercenary],
            upkeep: [...this._mercenaries.upkeep, createUpkeepState(uid)],
        };
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        return result;
    }

    public get femaleSources(): Readonly<Record<string, FemaleSource>> {
        return normalizeFemaleSourcesMap(this._femaleSources);
    }

    public get tallyCards(): Readonly<Record<string, TigerTallyCard>> {
        return { ...this._tallyCards };
    }

    /**
     * 戰後把戰鬥經驗寫回出陣的虎符卡片實例（PROG-2-0573）。
     * 只有有結果的戰鬥會結算（ongoing 不結算）；卡片不存在的 id 略過。回傳是否有卡片被改動。
     */
    private _settleTallyBattleExp(deployedTallyIds: readonly string[], result: string): boolean {
        const outcome = tallyBattleOutcome(result);
        if (!outcome) return false;
        let changed = false;
        const nextCards = { ...this._tallyCards };
        for (const uid of deployedTallyIds) {
            const card = nextCards[uid];
            if (!card) continue;
            nextCards[uid] = { ...card, ...applyBattleExpToCard(card, outcome) };
            changed = true;
        }
        if (changed) this._tallyCards = nextCards;
        return changed;
    }

    /** 登記君主持有的虎符卡（新取得的卡）；已登記的 uid 不會被覆蓋 */
    public async registerTallyCards(cards: readonly TigerTallyCard[]): Promise<void> {
        const holders = { ...this._tallyHoldings.holders };
        const stored = { ...this._tallyCards };
        for (const card of cards) {
            if (card.uid.length === 0 || card.uid in holders) continue;
            holders[card.uid] = null;
            stored[card.uid] = card;
        }
        this._tallyHoldings = { holders };
        this._tallyCards = stored;
        await this._autoSaveAfterTallyChange();
    }

    /** 把君主持有的虎符裝到武將身上；武將不在名冊、虎符不存在、已被持有或武將已有虎符時回傳失敗 */
    public async equipTally(cardUid: string, generalId: string): Promise<TallyHoldingsResult | null> {
        if (!this._roster.getAll().some((g) => g.id === generalId)) return null;
        const result = equipTally(this._tallyHoldings, cardUid, generalId);
        return this._commitTallyResult(result);
    }

    /**
     * 君主沒收武將身上的虎符（TRP-08 / PROG-2-0239）：忠誠大幅下降，虎符退回君主並存檔。
     * 武將未持有虎符時回傳 null；武將不在名冊時也回傳 null。
     */
    public async confiscateTally(generalId: string, isGachaHero = false): Promise<{ cardUid: string; loyalty: number } | null> {
        if (!this._roster.getAll().some((g) => g.id === generalId)) return null;
        const cardUid = tallyOfGeneral(this._tallyHoldings, generalId);
        if (cardUid === null) return null;
        const quality = this._tallyCards[cardUid]?.quality ?? 'R';
        const current = this._tallyLoyalty[generalId] ?? createTallyLoyaltyState(TALLY_LOYALTY_INITIAL, isGachaHero);
        const next = applyTallyConfiscation(current, quality);
        this._tallyLoyalty = { ...this._tallyLoyalty, [generalId]: next };
        this._tallyHoldings = confiscateFrom(this._tallyHoldings, generalId).state;
        await this._autoSaveAfterTallyChange();
        return { cardUid, loyalty: next.loyalty };
    }

    /** 把虎符從武將身上拔回君主 */
    public async unequipTally(cardUid: string): Promise<TallyHoldingsResult> {
        return this._commitTallyResult(unequipTally(this._tallyHoldings, cardUid));
    }

    /** 武將目前持有的虎符 uid（沒有則 null） */
    public tallyOf(generalId: string): string | null {
        return tallyOfGeneral(this._tallyHoldings, generalId);
    }

    private async _commitTallyResult(result: TallyHoldingsResult): Promise<TallyHoldingsResult> {
        if (result.ok) {
            this._tallyHoldings = result.state;
            await this._autoSaveAfterTallyChange();
        }
        return result;
    }

    private async _autoSaveAfterTallyChange(): Promise<void> {
        if (this._autoSave && this._save) await this.save();
    }

    /**
     * 陣亡事件的虎符結算（TRP-08 / PROG-2-0236）：只處理這次才變成陣亡的武將，
     * 手上的虎符退回君主，符合條件者產出一張陣亡虎符（君主持有）。只改記憶體狀態，由呼叫端的存檔一併寫入。
     */
    private _settleDeaths(before: readonly GeneralConfig[], after: readonly GeneralConfig[], season: number): void {
        // 死亡產卡的兵種：武將資料沒有 troopType 時，由適性推出主兵種（PROG-2-0582）
        const withTroop = (general: GeneralConfig) => ({ troopType: mainTroopTypeOf(general.troopAptitude), ...general });
        const result = settleDeathTallies({ holdings: this._tallyHoldings, cards: this._tallyCards }, before.map(withTroop), after.map(withTroop), season);
        this._tallyHoldings = result.holdings;
        this._tallyCards = { ...result.cards };
    }

    /**
     * 虎符拔除 / 裝上對武將忠誠度的影響（TRP-09）。季編碼用 totalSeasonsElapsed（每季 +1）。
     * 只改忠誠狀態並自動存檔；虎符本身的歸屬由呼叫端決定。武將不在名冊時回傳 null。
     * 初始忠誠規格未定，暫定 50（記入待辦暫定設計）。
     */
    public async changeTallyLoyalty(
        generalId: string,
        action: TallyLoyaltyAction,
        quality: TigerTallyQuality,
        isGachaHero = false,
    ): Promise<TallyLoyaltyResult | null> {
        if (!this._roster.getAll().some((g) => g.id === generalId)) return null;
        const current = this._tallyLoyalty[generalId] ?? createTallyLoyaltyState(TALLY_LOYALTY_INITIAL, isGachaHero);
        const result = applyTallyLoyaltyChange(current, action, quality, this._clock.state.totalSeasonsElapsed);
        if (result.ok) {
            this._tallyLoyalty = { ...this._tallyLoyalty, [generalId]: result.state };
            if (this._autoSave && this._save) {
                await this.save();
            }
        }
        return result;
    }

    public isSageUnlocked(sageId: string): boolean {
        return isSageUnlocked(sageId, this._oracleCount);
    }

    public itemCount(itemId: string): number {
        return itemCount(this._inventory, itemId);
    }

    /** 增加道具（商城購買、活動獎勵）並自動存檔 */
    public async addItem(itemId: string, amount: number): Promise<number> {
        this._inventory = addItem(this._inventory, itemId, amount);
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        return this.itemCount(itemId);
    }

    public get hasSaveService(): boolean {
        return this._save !== null;
    }

    public setRosterStore(store: RosterStore): void {
        this._roster = store;
    }

    public setEventEmitter(emitter: SessionEventEmitter | null): void {
        this._events = emitter;
    }

    public setLifecycle(lifecycle: SeasonLifecycle | null): void {
        this._lifecycle = lifecycle;
    }

    public setSaveService(service: PlayerSaveService | null): void {
        this._save = service;
    }

    /** 測試替身：外部 callback 的內部狀態不納入存檔。 */
    public setRandomSource(random: RandomSource): void {
        this._random = random;
    }

    public setAutoSave(enabled: boolean): void {
        this._autoSave = enabled;
    }

    public setNurtureStatePort(port: NurtureStatePort | null): void {
        this._nurture = port;
    }

    /** 開獎的宿命建議要靠因子字典分武 / 文；沒有字典時只看五維 */
    public setFactorDictionary(dictionary: FactorDictionary | undefined): void {
        this._factorDictionary = dictionary;
    }

        /** 開新局：時鐘與卡組歸零，名冊不動（由開場流程決定初始武將） */
    public startNewGame(seed: number = Math.floor(Math.random() * 4294967296)): void {
        this._seeded = new SeededRandom(seed);
        this._preLifespanRoster = null;
        this._clock = new GameClock();
        this._deck = [];
        this._leadGeneralId = null;
        this._sortieSupport = { strategistUid: null, deputyUid: null };
        this._sortiePresets = {};
        this._travel = null;
        this._countdown = null;
        this._discoveryLevel = 1;
        this._discoveryExp = 0;
        this._inventory = { ...STARTER_INVENTORY };
        this._oracleCount = 0;
        this._clearedStageIds = [];
        this._favoriteGeneralIds = [];
        this._hallAssignments = {};
        this.dynamicRelations.restore([]);
        this._tallyLoyalty = {};
        this._tallyHoldings = createTallyHoldings([]);
        this._tallyCards = {};
        this._femaleSources = {};
        this._gachaPity = {};
        this._femaleSystem = normalizeFemaleSystemState(undefined);
        this._hallSpotState = EMPTY_HALL_SPOT_STATE;
        this._gachaWallet = null;
        this._gachaRevision += 1;
        this._legacyCount = 0;
        this._military = { ...STARTER_MILITARY };
        this._yearAgingEvents = [];
        this._prison = createPrisonState<GeneralConfig>();
        this._fame = 0;
        this._scorePoints = 0;
        this._autoNurtureTickets = 0;
        this._mainlineNurtureClearedOnce = false;
        this._firstBattleCleared = false;
        this._openingRedFaceShown = false;
        this._domesticLog = { ...EMPTY_DOMESTIC_LOG };
        this._mercenaries = createEmptyMercenaryBundle();
    }

    /** 開場流程選用：先驗證資料，再開新局並以六位名將替換名冊；既有 startNewGame 不變。 */
    public async startNewGameWithStarters(seed: number, generals: readonly GeneralConfig[], options: StarterRosterOptions = {}): Promise<void> {
        const starters = buildStarterRoster(generals, options);
        const coreId = options.coreGeneralId ?? STARTER_CORE_GENERAL_ID;
        const core = starters.find(general => general.id === coreId)!;
        if (!checkDeployable(core, { nurturingIds: this._nurturingIds() }).eligible) throw new Error('[GameSession] 初始核心主將不可出戰');
        this.startNewGame(seed);
        this._roster.replaceAll(normalizeRosterRoles(starters));
        if (!await this.setLeadGeneral(coreId)) throw new Error('[GameSession] 無法設定初始核心主將');
        this._emit(GAME_SESSION_EVENTS.RosterChanged, this.roster);
    }

    /** 俘虜與監獄（PROG-2-0073）：待處置俘虜、關押中、名聲、情報 */
    public get prison(): PrisonState<GeneralConfig> {
        return {
            ...this._prison,
            pending: this._prison.pending.map((p) => ({ record: { ...p.record }, target: { ...p.target } })),
            prisoners: this._prison.prisoners.map((p) => ({ ...p })),
        };
    }

    /**
     * 戰勝後俘虜敗將：產生 POW_Record 放進待處置清單並存檔。
     * 試用傭兵豁免、已在名冊 / 已被俘 / 已關押的武將不重複俘虜，回傳 null。
     * 勸降率以出戰主將（沒有時用名冊第一位可出戰武將）的魅力與運氣計算。
     */
    public async capturePrisoner(target: GeneralConfig): Promise<PowRecord | null> {
        const taken = new Set([
            ...this._roster.getAll().map((g) => g.id),
            ...this._prison.pending.map((p) => p.record.targetUid),
            ...this._prison.prisoners.map((p) => p.targetUid),
        ]);
        if (taken.has(target.id)) return null;
        const persuaderId = this._leadGeneralId ?? this.getDeployableGenerals()[0]?.id ?? null;
        const persuader = persuaderId ? this._roster.getAll().find((g) => g.id === persuaderId) : undefined;
        const record = createPowRecord(
            { ...target, cha: target.cha ?? target.stats?.cha, luk: target.luk ?? target.stats?.luk, int: target.int ?? target.stats?.int, pol: target.pol ?? target.stats?.pol } as Parameters<typeof createPowRecord>[0],
            { cha: persuader?.cha ?? persuader?.stats?.cha ?? 0, luk: persuader?.luk ?? persuader?.stats?.luk ?? 0 },
        );
        if (!record) return null;
        this._prison = { ...this._prison, pending: [...this._prison.pending, { record, target: { ...target } }] };
        if (this._autoSave && this._save) {
            await this.save();
        }
        return record;
    }

    /**
     * 處置待處置俘虜（勸降 / 招募 / 無期徒刑 / 放走）。
     * 加入麾下 → 寫進名冊；招募扣城市兵源（黃金由呼叫端依 goldSpent 從錢包扣）；關押進監獄；放走加名聲。
     * 勸降失敗俘虜仍留在待處置清單（不能再勸降，可改關押或放走）；資源不足時什麼都不扣。
     */
    public async resolvePrisoner(targetUid: string, decision: PowDecision, options: { gold?: number } = {}): Promise<PowResolution | null> {
        const pending = this._prison.pending.find((p) => p.record.targetUid === targetUid);
        if (!pending) return null;
        const resolution = resolvePowDecision(pending.record, decision, {
            random: this._random,
            gold: options.gold ?? 0,
            cityTroops: this._military.cityTroops,
            prisonUsed: this._prison.prisoners.length,
            prisonSlots: this._prison.slots,
        });
        const others = this._prison.pending.filter((p) => p !== pending);
        const done = resolution.joined || resolution.imprisoned || resolution.released;
        this._prison = {
            ...this._prison,
            pending: done ? others : this._prison.pending.map((p) => (p === pending ? { ...p, record: resolution.record } : p)),
            prisoners: resolution.imprisoned
                ? [...this._prison.prisoners, {
                    targetUid,
                    targetName: pending.record.targetName,
                    imprisonedSeason: this._clock.state.totalSeasonsElapsed,
                    yieldPerSeason: { ...pending.record.options.prisonYield },
                }]
                : this._prison.prisoners,
            fame: this._prison.fame + resolution.fameGained,
        };
        if (resolution.cityTroopsSpent > 0) {
            this._military = { ...this._military, cityTroops: Math.max(0, this._military.cityTroops - resolution.cityTroopsSpent) };
        }
        if (resolution.joined) {
            // 女俘虜歸入名冊時記下 CAPTIVE 來源（FEM-05 / FEM-01）
            const captiveSource = captiveFemaleSourceOf({ ...pending.target }, this._clock.state.totalSeasonsElapsed);
            if (captiveSource) {
                this._femaleSources = { ...this._femaleSources, [pending.target.id]: createFemaleSource('CAPTIVE', captiveSource.Quality_Grade, captiveSource.Acquired_Season) };
            }
            // addGenerals 廣播 RosterChanged；監獄狀態另外存檔
            await this.addGenerals([{ ...pending.target }]);
        }
        if (this._autoSave && this._save) {
            await this.save();
        }
        return resolution;
    }

    /** 城市兵源與糧草儲備（PROG-2-0072） */
    public get fame(): number {
        return this._fame;
    }

    public get domesticLog(): Readonly<DomesticSeasonLog> {
        return { ...this._domesticLog };
    }

    /**
     * 選一項內政任務，依規格當下入帳：糧草、城市兵源寫進軍備，名聲寫進 fame，黃金交給 grantGold（沿用 LocalGachaService 錢包）。
     * 同季已選過則拒絕且不變動任何資源。成功時自動存檔（若有開啟）。
     */
    public async chooseDomesticTask(taskId: string, grantGold: (amount: number) => void = () => {}): Promise<DomesticTaskResult> {
        const season = this._clock.state.totalSeasonsElapsed;
        const result = runDomesticTask(
            { food: this._military.food, gold: 0, fame: this._fame, cityTroops: this._military.cityTroops },
            this._domesticLog,
            season,
            taskId,
            { food: this._military.foodCap, gold: Infinity, fame: Infinity, cityTroops: this._military.cityTroopsCap },
        );
        if (!result.ok) return result;
        this._military = { ...this._military, food: result.stock.food, cityTroops: result.stock.cityTroops };
        this._fame = result.stock.fame;
        this._domesticLog = result.log;
        if (result.output?.resource === 'gold' && result.granted > 0) grantGold(result.granted);
        if (this._autoSave && this._save) await this.save();
        return result;
    }

    /**
     * 取出並清除「季末糧不足，下一場虎符打 8 折」的標記（兵種（虎符）系統 TRP-12）。
     * 只在戰場真正開局時呼叫一次；預覽出征編制不呼叫，避免吃掉折扣。
     * 暫定：標記只存在記憶體，讀檔後不保留（規格未定，之後若要保留再進存檔）。
     */
    public consumeTallyFoodDiscount(): boolean {
        const armed = this._tallyFoodDiscountArmed;
        this._tallyFoodDiscountArmed = false;
        return armed;
    }

    public get military(): MilitaryReserve {
        return { ...this._military };
    }

    /**
     * 名冊武將出戰的出征帳本設定：帶兵上限由戰場統率推算，城市兵源與糧草取目前儲備。
     * 不在名冊或不能出戰時回傳 null（戰場維持舊版不扣軍勢）。
     */
    public getSortieInput(generalId: string, stageSortieCap?: number): CreateSortieInput | null {
        const config = this.getBattleConfig(generalId, Faction.Player);
        if (!config) return null;
        const support = this.getSortieSupportSummary(generalId);
        const foodBonus = support.deputyBonus.startingFoodBonus;
        const commander = this._roster.getAll().find((g) => g.id === generalId);
        return {
            commandCapacity: computeCommandCapacity({ lea: config.lea ?? config.stats?.lea ?? 0, generalRank: commander?.generalRank, fameBonus: commander?.generalFame }),
            cityTroops: this._military.cityTroops,
            ...(stageSortieCap !== undefined ? { stageSortieCap } : {}),
            food: this._military.food,
            ...(foodBonus > 0 ? { foodBonus } : {}),
            strategistBonus: support.strategistBonus,
            formationBloodlineIds: [commander?.bloodlineId, support.strategist?.bloodlineId, support.deputy?.bloodlineId],
        };
    }

    /** 指定出戰主將；必須是目前可出戰的名冊武將，否則回傳 false 且不變 */
    public async setLeadGeneral(generalId: string | null): Promise<boolean> {
        if (generalId !== null && !this.checkDeployable(generalId).eligible) {
            return false;
        }
        this._leadGeneralId = generalId;
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.LeadGeneralChanged, generalId);
        return true;
    }

    /** 收藏武將 id 清單（唯讀副本）。 */
    public get favoriteGeneralIds(): readonly string[] {
        return [...this._favoriteGeneralIds];
    }

    /** 大廳任務指派（唯讀副本）：任務 id → 指派武將 id。 */
    public get hallAssignments(): Readonly<Record<string, string>> {
        return { ...this._hallAssignments };
    }

    /**
     * 切換收藏。武將不在名冊時不變更，回傳 ok: false。
     * 回傳的 favorite 為切換後的狀態。
     */
    public async toggleFavorite(generalId: string): Promise<{ ok: boolean; favorite: boolean }> {
        if (!this._roster.getAll().some((g) => g.id === generalId)) {
            return { ok: false, favorite: this._favoriteGeneralIds.includes(generalId) };
        }
        const favorite = !this._favoriteGeneralIds.includes(generalId);
        this._favoriteGeneralIds = favorite
            ? normalizeFavoriteGeneralIds([...this._favoriteGeneralIds, generalId])
            : this._favoriteGeneralIds.filter((id) => id !== generalId);
        if (this._autoSave && this._save) {
            await this.save();
        }
        return { ok: true, favorite };
    }

    /**
     * 大廳任務接取：把任務指派給名冊內的武將（同一任務重派會覆蓋）。
     * 武將不在名冊或任務 id 為空時回傳 false，不變更。
     */
    public async assignHallTask(taskId: string, generalId: string): Promise<boolean> {
        if (taskId.length === 0 || !this._roster.getAll().some((g) => g.id === generalId)) return false;
        this._hallAssignments = { ...this._hallAssignments, [taskId]: generalId };
        if (this._autoSave && this._save) {
            await this.save();
        }
        return true;
    }

    /** 放棄或完成任務時解除指派；原本沒有指派時回傳 false。 */
    public async releaseHallTask(taskId: string): Promise<boolean> {
        if (!(taskId in this._hallAssignments)) return false;
        const next = { ...this._hallAssignments };
        delete next[taskId];
        this._hallAssignments = next;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return true;
    }

    /** 目前大廳點位的列資料；沒刷新過時為空陣列。 */
    public get hallSpotRows(): HallSpotRow[] {
        return buildHallSpotRows(this._hallSpotState.spotIds, this.hallCandidates());
    }

    /**
     * 大廳點位刷新：未滿 60 秒沿用舊點位，到期才依收藏與指派重抽（HALL-07）。
     * nowSec 由呼叫端傳入（秒），random 回傳 [0,1)。回傳最新列資料。
     */
    public refreshHallSpots(nowSec: number, random: () => number, count = 4): HallSpotRow[] {
        this._hallSpotState = refreshHallCharacterSpots(this._hallSpotState, nowSec, this.hallCandidates(), count, random);
        return this.hallSpotRows;
    }

    /**
     * HALL-07 點位候選清單：收藏與已派任務由 GameSession 既有狀態推導，不另存一份。
     * 只列名冊內的武將；指派給已離開名冊的武將不計入。
     */
    public hallCandidates(): HallCandidate[] {
        const favorites = new Set(this._favoriteGeneralIds);
        const assigned = new Set(Object.values(this._hallAssignments));
        return this._roster.getAll().map((g) => ({
            id: g.id,
            favorite: favorites.has(g.id),
            assigned: assigned.has(g.id),
        }));
    }

    /**
     * 培育學戰法（PM 2026-10-14 裁定）：TP 為武將培育中的個人 TP（NurtureSession.tp）。
     * 綠因子相符時成本 ×0.5 再 ceil；門檻 = 實際成本 ×2；通過後扣實際成本並寫入 learnedTactics。
     */
    public async learnTactic(generalId: string, tacticId: string): Promise<TacticLearnCheck> {
        const general = this._roster.getAll().find((g) => g.id === generalId);
        if (!general) return { ok: false, blocked: 'INVALID_TACTIC', learned: [] };
        const state = this._nurture?.getState();
        const session = state?.sessions.find((s) => s.childId === generalId);
        if (!state || !session) return { ok: false, blocked: 'NOT_NURTURING', learned: [...(general.learnedTactics ?? [])] };
        const green = hasMatchingGreenFactor(general.genes, tacticId);
        const tpCost = Math.ceil(learnTpCost(getTacticTpCost(tacticId), green));
        const check = learnTacticInto(general.learnedTactics ?? [], tacticId, battleIntelligenceOf(general), session.tp, tpCost);
        if (!check.ok) return check;
        this._nurture!.restoreState({
            ...state,
            sessions: state.sessions.map((s) => (s.childId === generalId ? { ...s, tp: s.tp - tpCost } : s)),
        });
        this._roster.replaceAll(this._roster.getAll().map((g) => (g.id === generalId ? { ...g, learnedTactics: check.learned } : g)));
        if (this._autoSave && this._save) {
            await this.save();
        }
        return check;
    }

    /** 目前的趕路倒數（複本）；沒有趕路中的角色時為 null。 */
    public get countdown(): CountdownState | null {
        return this._countdown ? { ...this._countdown } : null;
    }

    /** 目前的回合制趕路（複本）；沒有趕路中的角色時為 null。 */
    public get travel(): TravelCountdown | null {
        return this._travel ? { ...this._travel } : null;
    }

    /** 開始回合制趕路（接取天下沙盤遠征等事件呼叫）；會覆蓋目前的趕路。 */
    public startTravel(targetId: string, turns: number): void {
        this._travel = createTravelCountdown(targetId, turns + seasonModifiersOf(this._clock.state.currentSeason).travelTurnsDelta);
        this._emit(GAME_SESSION_EVENTS.TravelChanged, this.travel);
    }

    /** 推進一季：趕路回合減一，歸零即到達並清除。沒有趕路時不動作。 */
    private _tickTravel(): void {
        if (!this._travel) return;
        const next = tickTravelCountdown(this._travel);
        this._travel = next.remainingTurns > 0 ? next : null;
        this._emit(GAME_SESSION_EVENTS.TravelChanged, this.travel);
    }

    /** 開始趕路倒數（由行軍 / 招募事件呼叫）；會覆蓋目前的倒數。 */
    public startCountdown(state: Readonly<CountdownState>): void {
        this._countdown = { ...state };
        this._emit(GAME_SESSION_EVENTS.CountdownChanged, this.countdown);
    }

    /** 清除趕路倒數（角色已抵達並由畫面確認後呼叫）。 */
    public clearCountdown(): void {
        this._countdown = null;
        this._emit(GAME_SESSION_EVENTS.CountdownChanged, null);
    }

    public get sortieSupport(): SortieSupport {
        return { ...this._sortieSupport };
    }

    /** 編制預設（DEP-14）的目前內容；回傳副本 */
    public get sortiePresets(): Record<string, SortieSupport> {
        return { ...this._sortiePresets };
    }

    /** 整批寫入編制預設（DEP-14）；有存檔服務時立刻存檔，不等下一次存檔（PROG-2-0791） */
    public async setSortiePresets(store: Readonly<Record<string, SortieSupport>>): Promise<void> {
        this._sortiePresets = { ...store };
        if (this._autoSave && this._save) await this.save();
    }

    /**
     * 指定出征支援（參謀官 / 後勤官，null = 不派）。
     * 角色鎖、同名血統、可出戰檢查不通過時不變更並回傳問題清單（PROG-2-0083）。
     */
    public setSortieSupport(strategistUid: string | null, deputyUid: string | null, commanderUid: string | null = this._leadGeneralId): SortieLoadoutCheck {
        const check = this._checkSortieSupport(commanderUid, strategistUid, deputyUid);
        if (!check.ok) return check;
        this._sortieSupport = { strategistUid, deputyUid };
        this._emit(GAME_SESSION_EVENTS.SortieSupportChanged, this.sortieSupport);
        return check;
    }

    /** 某主將出征時實際生效的支援與加成；失效的支援（不能出戰、與主將撞角色或血統）視為不派 */
    public getSortieSupportSummary(commanderUid: string): SortieSupportSummary {
        const deployable = this.getDeployableGenerals();
        const members = deployable.map(toSortieMember);
        const byId = new Map(deployable.map((g) => [g.id, g]));
        const pick = (uid: string | null): GeneralConfig | null => (uid && uid !== commanderUid ? byId.get(uid) ?? null : null);
        const fits = (st: GeneralConfig | null, dp: GeneralConfig | null): boolean =>
            validateSortieLoadout({ commanderUid, strategistUid: st?.id ?? null, deputyUid: dp?.id ?? null }, members).ok;
        let strategist = pick(this._sortieSupport.strategistUid);
        if (strategist && !fits(strategist, null)) strategist = null;
        let deputy = pick(this._sortieSupport.deputyUid);
        if (deputy && !fits(strategist, deputy)) deputy = null;
        return {
            strategist,
            deputy,
            strategistBonus: getStrategistBonus(strategist ? toSortieMember(strategist) : null),
            deputyBonus: getDeputyFoodBonus(deputy ? toSortieMember(deputy) : null, this._military.food),
        };
    }

    private _checkSortieSupport(commanderUid: string | null, strategistUid: string | null, deputyUid: string | null): SortieLoadoutCheck {
        const members = this.getDeployableGenerals().map(toSortieMember);
        return validateSortieLoadout({ commanderUid: commanderUid ?? '', strategistUid, deputyUid }, members);
    }

    /** 進戰場的我軍主將：指定的主將還能出戰就用它，否則用 fallbackId（遭遇戰預設） */
    public resolveLeadGeneralId(fallbackId: string): string {
        const lead = this._leadGeneralId;
        return lead && this.checkDeployable(lead).eligible ? lead : fallbackId;
    }

    /** 戰場建立我軍主將時查詢：名冊內可出戰才回傳戰場用設定，否則 null（沿用內建 / JSON 武將） */
    public getBattleConfig(generalId: string, faction: GeneralConfig['faction']): GeneralConfig | null {
        const general = this._roster.getAll().find((g) => g.id === generalId);
        if (!general || !this.checkDeployable(generalId).eligible) {
            return null;
        }
        return buildBattleConfig(general, faction);
    }

    /** 直接指定等級（除錯 / 劇情獎勵）；等級內經驗歸零 */
    public async setDiscoveryLevel(level: number): Promise<void> {
        const progress = normalizeDiscoveryProgress(level, 0);
        this._discoveryLevel = progress.level;
        this._discoveryExp = progress.exp;
        if (this._autoSave && this._save) {
            await this.save();
        }
    }

    /** 加覺醒經驗（戰場結算、培育畢業）；升級時廣播 DiscoveryLevelChanged，並自動存檔 */
    public async gainDiscoveryExp(source: DiscoveryExpSource, amount?: number): Promise<DiscoveryGain> {
        const gain = this._applyDiscoveryExp(source, amount);
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emitDiscoveryGain(gain);
        return gain;
    }

    /**
     * 給 NurtureService 的覺醒掛鉤：讀目前 discoveryLevel，覺醒成功時廣播 FactorAwakened。
     * 名冊已由 NurtureService 寫回，存檔交給培育流程每回合的存檔。
     */
    public nurtureAwakeningHooks(): NurtureAwakeningHooks {
        return {
            discoveryLevel: () => this._discoveryLevel,
            onAwakened: (event) => this._emit(GAME_SESSION_EVENTS.FactorAwakened, event),
        };
    }

    /**
     * 血脈歸宗（BLT-11）：V1 取得 V2 的一個因子，V2 記為已歸宗。歸宗令先不扣（待辦）。
     * 失敗回傳原因、不改名冊；成功才改名冊、存檔。
     */
    public async mergeBloodlineFor(
        v1Id: string,
        v2Id: string,
    ): Promise<{ ok: true; transferredFactor: string } | { ok: false; reason: BloodlineMergeRejectReason | 'NOT_FOUND' }> {
        const roster = this._roster.getAll();
        const v1 = roster.find((g) => g.id === v1Id);
        const v2 = roster.find((g) => g.id === v2Id);
        if (!v1 || !v2) return { ok: false, reason: 'NOT_FOUND' };
        const plan = planBloodlineMergeForGenerals(v1, v2);
        if (!plan.ok) return plan;
        const v2Gene = (v2.genes ?? []).find((g) => g.id === plan.transferredFactor);
        const updated = roster.map((g) => {
            if (g.id === v1Id) return { ...g, genes: [...(g.genes ?? []), ...(v2Gene ? [{ ...v2Gene }] : [])] };
            if (g.id === v2Id) return { ...g, mergedOutFactors: plan.v2MergedOut };
            return g;
        });
        this._roster.replaceAll(updated);
        if (this._autoSave && this._save) {
            await this.save();
        }
        return { ok: true, transferredFactor: plan.transferredFactor };
    }

    /** 覺醒名冊中某位武將的鎖定因子；失敗回傳原因，成功才改名冊、存檔並廣播 */
    public async awakenFactor(
        generalId: string,
        factorId: string,
        trigger: AwakeningTrigger,
    ): Promise<{ ok: true; event: FactorAwakenedEvent } | { ok: false; reason: AwakeningFailReason }> {
        const roster = this._roster.getAll();
        const result = awakenFactor(roster.find((g) => g.id === generalId), factorId, trigger, this._discoveryLevel);
        if (!result.ok) {
            return result;
        }
        this._roster.replaceAll(roster.map((g) => (g.id === generalId ? result.general : g)));
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.FactorAwakened, result.event);
        return { ok: true, event: result.event };
    }

    /**
     * 名士占卜：依名士偏好與準確率覺醒名冊中某位武將的一個鎖定因子。
     * 沒有求籤令時不擲骰（outcome = no-token）；有擲骰（consumed）才扣 1 張求籤令並存檔，
     * 覺醒成功才改名冊並廣播 FactorAwakened。
     */
    public async divineFactor(generalId: string, sageId: string): Promise<SageDivinationResult> {
        if (!this.isSageUnlocked(sageId)) {
            return { sageId, outcome: getSage(sageId) ? 'sage-locked' : 'no-such-sage', hintColor: null, consumed: false };
        }
        if (this.itemCount(ITEM_ORACLE_TOKEN) < 1) {
            return { sageId, outcome: 'no-token', hintColor: null, consumed: false };
        }
        const roster = this._roster.getAll();
        const result = divineFactor(roster.find((g) => g.id === generalId), sageId, this._discoveryLevel, this._random);
        if (result.outcome === 'awakened' && result.general) {
            const general = result.general;
            this._roster.replaceAll(roster.map((g) => (g.id === generalId ? general : g)));
        }
        if (result.consumed) {
            await this._spendOracleToken();
        }
        if (result.event) {
            this._emit(GAME_SESSION_EVENTS.FactorAwakened, result.event);
        }
        return result;
    }

    /**
     * 名士預言：結緣前依父母祖譜的因子池（BreedingService.previewFactorPool）預測子嗣的色彩傾向與關鍵詞。
     * 名士未解鎖或沒有求籤令時不擲骰；有預言才扣 1 張求籤令、累計占卜次數並存檔。
     */
    public async predictOffspring(pool: readonly FactorPoolEntry[], sageId: string): Promise<ProphecyResult> {
        if (!this.isSageUnlocked(sageId)) {
            return { sageId, outcome: getSage(sageId) ? 'sage-locked' : 'no-such-sage', consumed: false };
        }
        if (this.itemCount(ITEM_ORACLE_TOKEN) < 1) {
            return { sageId, outcome: 'no-token', consumed: false };
        }
        const result = predictOffspring(pool, sageId, this._random, this._prophecyKeywordSources());
        if (result.consumed) {
            await this._spendOracleToken();
        }
        return result;
    }

    /** 扣 1 張求籤令、累計占卜次數、存檔並廣播庫存變動 */
    private async _spendOracleToken(): Promise<void> {
        this._inventory = consumeItem(this._inventory, ITEM_ORACLE_TOKEN) ?? this._inventory;
        this._oracleCount += 1;
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
    }

    /** 扭曲預言借用關鍵詞的因子：字典裡可判定色系的因子 */
    private _prophecyKeywordSources(): ProphecyKeywordSource[] {
        const out: ProphecyKeywordSource[] = [];
        for (const def of Array.from(this._factorDictionary?.values() ?? [])) {
            const color = resolveFactorColor(def.id, this._factorDictionary);
            if (color) out.push({ id: def.id, color, displayName: def.displayName });
        }
        return out;
    }

    /** 整組覆寫出戰卡組（以 catalogIds 過濾未知 ID、去重、截到上限）並自動存檔 */
    public async setDeck(ids: readonly string[], catalogIds?: readonly string[]): Promise<string[]> {
        this._deck = normalizeDeck(ids, catalogIds);
        await this._commitDeck();
        return this.deck;
    }

    /** 選卡 UI 點一張卡：在卡組內就移除，否則加入（滿了不變）；有變動才存檔並廣播 */
    public async toggleDeckCard(cardId: string, catalogIds: readonly string[]): Promise<DeckToggleOutcome> {
        const result = toggleDeckCard(this._deck, cardId, catalogIds);
        if (result.outcome === 'added' || result.outcome === 'removed') {
            this._deck = result.deck;
            await this._commitDeck();
        }
        return result.outcome;
    }

    /**
     * 主動指令（培育／攻城／結緣）的壽命消耗入口：更新名冊但不存檔，由呼叫端的 persist 一併存。
     * 死亡事件暫存到下一次季結。找不到武將回傳 null。
     */
    /**
     * 20 歲轉職：扣轉職令 ×1、設定副職並存檔（PROG-2-0226）。
     * 名冊找不到武將或沒有主職資料時回傳 null；條件不符時回傳 ok=false 且不扣轉職令。
     */
    public async changeJob(generalId: string, targetSubClass: JobClass): Promise<JobChangeResult | null> {
        const orders = itemCount(this._inventory, ITEM_JOB_CHANGE_ORDER);
        const applied = applyJobChangeToRoster(this._roster.getAll() as JobWiringGeneral[], generalId, targetSubClass, orders);
        if (!applied) return null;
        if (applied.result.ok) {
            this._roster.replaceAll(applied.roster);
            this._inventory = consumeItem(this._inventory, ITEM_JOB_CHANGE_ORDER) ?? this._inventory;
            this._emit(GAME_SESSION_EVENTS.InventoryChanged, this.inventory);
        }
        if (this._autoSave && this._save) {
            await this.save();
        }
        return applied.result;
    }

    public spendLifespan(generalId: string, command: LifespanCommand): ActiveLifespanResult | null {
        const current = this._roster.getAll();
        const applied = applyActiveLifespanToRoster(current, generalId, command, this._random);
        if (!applied) return null;
        this._preLifespanRoster ??= current;
        this._roster.replaceAll(applied.roster);
        for (const event of applied.result.events) {
            if (event.type === 'died') {
                this._pendingLifespanEvents.push({ type: 'died', generalId: event.generalId, age: event.age });
            }
        }
        return applied.result;
    }

    /** 動態關係互動（KIN-10）：回補親密度，有變動才自動存檔；沒有該對關係回傳空陣列 */
    public async interactDynamicRelation(uidA: string, uidB: string): Promise<DynamicRelation[]> {
        const updated = this.dynamicRelations.interact(uidA, uidB);
        if (updated.length > 0 && this._autoSave && this._save) {
            await this.save();
        }
        return updated;
    }

    /**
     * 結緣受孕後的動態關係（KIN-06 / KIN-10）：父母記為夫妻（bonding），父與母各與子嗣記為親子（parentage）。
     * 同一對同一型別只留第一筆；有新增才自動存檔。回傳三筆記錄結果（順序：夫妻、父子、母子）。
     */
    public async recordBreedingRelations(fatherUid: string, motherUid: string, childUid: string): Promise<DynamicRelationResult[]> {
        const season = this._clock.state.totalSeasonsElapsed;
        const results = [
            this.dynamicRelations.record('bonding', fatherUid, motherUid, season),
            this.dynamicRelations.record('parentage', fatherUid, childUid, season),
            this.dynamicRelations.record('parentage', motherUid, childUid, season),
        ];
        if (results.some((r) => r.ok && r.created) && this._autoSave && this._save) {
            await this.save();
        }
        return results;
    }

    /** Legacy_Count（RET-07）：跨世代成就次數，唯讀 */
    public get legacyCount(): number {
        return this._legacyCount;
    }

    /**
     * 世代成就入帳（RET-07）：獎勵加到轉蛋錢包的靈玉，次數累加，有成就才自動存檔。
     * 錢包為 null（存檔沒有）時以 STARTER_GACHA_WALLET 為基底，避免入帳後起始資源歸零。
     */
    public async applyLegacyAchievements(achievements: readonly LegacyAchievement[]): Promise<{ granted: number; legacyCount: number }> {
        if (achievements.length === 0) return { granted: 0, legacyCount: this._legacyCount };
        const { wallet, granted } = grantLegacyRewards(this._gachaWallet ?? STARTER_GACHA_WALLET, achievements);
        this._gachaWallet = normalizeGachaWalletSave(wallet);
        this._gachaRevision += 1;
        this._legacyCount += achievements.length;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return { granted, legacyCount: this._legacyCount };
    }

    /** 攻城戰開戰的壽命消耗（PROG-2-0237）：扣完即存檔；武將不在名冊時回傳 null */
    public async spendSiegeLifespan(generalId: string): Promise<ActiveLifespanResult | null> {
        const result = this.spendLifespan(generalId, 'siege');
        if (result && this._autoSave && this._save) {
            await this.save();
        }
        return result;
    }

    public async advanceSeason(): Promise<SeasonAdvancedPayload> {
        const advance = this._clock.advanceSeason();
        this._tickTravel();
        // 動態關係每季衰退（KIN-10）：親密度歸 0 只是加成歸零，關係保留
        this.dynamicRelations.decaySeason();
        const beforeRoster = this._roster.getAll();
        // 主動扣壽命致死的武將在 beforeRoster 已是陣亡；虎符結算要用扣壽命之前的名冊才認得出「這次才死」
        const deathBaseline = this._preLifespanRoster ?? beforeRoster;
        this._preLifespanRoster = null;
        const aging = ageGeneralsOneSeason(beforeRoster, this._random);
        const agingEvents = [...this._pendingLifespanEvents, ...aging.events];
        this._pendingLifespanEvents = [];
        const unveil = unveilDueGenerals(aging.roster as UnveilingGeneral[], {
            season: advance.current.totalSeasonsElapsed,
            dictionary: this._factorDictionary,
        });
        const recovered = recoverVitalityOneSeason(unveil.roster, advance.current.totalSeasonsElapsed - 1);
        let roster: GeneralConfig[] = advanceBreedingSeason(holdPregnancyVigor(unveil.roster, recovered)).generals;
        let lifecycle: LifecycleSettlement | undefined;
        // 季結會把死者從名冊移除，所以陣亡虎符要用移除前的名冊結算，否則真實 lifecycle 下一個都抓不到
        const rosterBeforeLifecycle = roster;
        if (this._lifecycle) {
            const settled = await this._lifecycle.settleSeason(roster, advance, agingEvents);
            roster = settled.roster;
            lifecycle = settled.settlement;
        }
        this._roster.replaceAll(roster);
        this._clearLeadIfGone();
        this._settleDeaths(deathBaseline, rosterBeforeLifecycle, advance.current.totalSeasonsElapsed);
        const tokens = grantSeasonalOracleTokens(this._inventory);
        this._inventory = tokens.inventory;
        this._tallyFoodDiscountArmed = this._military.food < TALLY_SHORTAGE_FOOD_THRESHOLD;
        this._military = regenMilitaryOneSeason(this._military, 1, seasonModifiersOf(advance.previous.currentSeason).foodMultiplier);
        // 監獄產出：情報累積；資源暫定折成糧草（不超過糧草上限）
        const prisonYield = prisonYieldOneSeason(this._prison.prisoners);
        this._prison = { ...this._prison, intel: this._prison.intel + prisonYield.intel };
        this._military = { ...this._military, food: Math.min(this._military.foodCap, this._military.food + prisonYield.resource) };

        this._yearAgingEvents.push(...agingEvents);
        let yearReport: YearReport | undefined;
        if (advance.yearEnded) {
            yearReport = buildYearReport(advance.previous.currentYear, this._yearAgingEvents);
            this._yearAgingEvents = [];
        }
        const payload: SeasonAdvancedPayload = { advance, agingEvents, unveilings: unveil.events, lifecycle, oracleTokensGranted: tokens.granted, yearReport };
        if (this._autoSave && this._save) {
            await this.save();
        }

        this._emit(GAME_SESSION_EVENTS.SeasonAdvanced, payload);
        const eraReset = buildEraResetEvent(advance.current.totalSeasonsElapsed);
        if (eraReset) {
            this._emit(GAME_SESSION_EVENTS.EraReset, eraReset);
        }
        for (const event of unveil.events) {
            this._emit(GAME_SESSION_EVENTS.GeneralUnveiled, event);
        }
        for (const event of aging.events) {
            this._emit(agingEventChannel(event), event);
        }
        for (const card of lifecycle?.spiritCards ?? []) {
            this._emit(GAME_SESSION_EVENTS.SpiritCardCreated, card);
        }
        if (yearReport) {
            this._emit(GAME_SESSION_EVENTS.YearEnded, yearReport);
        }
        return payload;
    }

    /**
     * 年度推進：一直推進季，直到本年年末（第 4 季結束）為止，回傳年報。
     * 從第 1 季開始會跑滿 4 季；從中間季開始則跑到該年年末。最多推進 SEASONS_PER_YEAR 季。
     */
    public async advanceYear(): Promise<YearReport> {
        for (let i = 0; i < SEASONS_PER_YEAR; i++) {
            const payload = await this.advanceSeason();
            if (payload.yearReport) return payload.yearReport;
        }
        // 季數與 GameClock 不一致時才會走到這裡；不靜默回傳假資料
        throw new Error('advanceYear：未在 4 季內遇到年末');
    }

    /**
     * 主將已退役（變教官卡）、陣亡或不在名冊時，清掉出戰主將指派，避免大廳／出征／大廳榜單繼續指向一個出不了戰的人。
     * 只處理「永久離場」；精力不足、培育中這類暫時不能出戰的不清，玩家回來還是原主將。
     */
    private _clearLeadIfGone(): boolean {
        const leadId = this._leadGeneralId;
        if (!leadId) return false;
        const lead = this._roster.getAll().find((g) => g.id === leadId) as (GeneralConfig & { isMentorCard?: boolean }) | undefined;
        if (lead && !lead.isMentorCard && !isGeneralDead(lead)) return false;
        this._leadGeneralId = null;
        this._emit(GAME_SESSION_EVENTS.LeadGeneralChanged, null);
        return true;
    }

    /** 玩家讓 65 歲以上的武將退役，轉成教官傳承資料並立即存檔 */
    public async retireGeneral(generalId: string): Promise<MentorCard> {
        if (!this._lifecycle) {
            throw new Error('[GameSession] 尚未設定 SeasonLifecycle（setLifecycle）');
        }
        const result = await this._lifecycle.retireGeneral(this._roster.getAll(), generalId, this._clock.state);
        this._roster.replaceAll(result.roster);
        this._clearLeadIfGone();
        const reason = result.card.mentorRoute?.reason;
        if (reason === 'SCHOLAR' || reason === 'DUAL_CLASS') {
            // 文職與雙職能退役發 1 份竹簡（PM 暫定）；虎符只在死亡結算發，退役不發
            this._inventory = addItem(this._inventory, ITEM_BAMBOO_SLIP, 1);
        }
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.GeneralRetired, result.card);
        return result.card;
    }

    /**
     * 抽卡 / 招募入口：把新武將寫進名冊（以 id 去重）並自動存檔。
     * 已持有的武將不會重複加入，回傳 duplicates 供 UI 提示（之後可換算成碎片）。
     */
    public async addGenerals(generals: GeneralConfig[], options: AddGeneralsOptions = {}): Promise<AddGeneralsResult> {
        const owned = new Set(this._roster.getAll().map((general) => general.id));
        const added: GeneralConfig[] = [];
        const duplicates: GeneralConfig[] = [];
        const rebirths: Array<RebirthPullResult & { id: string }> = [];
        let bondPointsGained = 0;
        for (const general of normalizeRosterRoles(generals)) {
            if (!general || typeof general.id !== 'string') {
                continue;
            }
            if (owned.has(general.id)) {
                duplicates.push(general);
                continue;
            }
            owned.add(general.id);
            added.push({ ...general });
        }

        if (options.rebirthOnDuplicate && duplicates.length > 0) {
            // 同一批可能抽到同名多次，逐筆依序累加轉數
            const roster = this._roster.getAll();
            const byId = new Map(roster.map((general) => [general.id, general]));
            for (const duplicate of duplicates) {
                const target = byId.get(duplicate.id);
                if (!target) continue;
                const pull = applyDuplicatePull(target.rebirthCount);
                byId.set(duplicate.id, { ...target, rebirthCount: pull.rebirthCount });
                rebirths.push({ id: duplicate.id, ...pull });
                if (pull.overflow) {
                    bondPointsGained += overflowBondPoints(overflowRarityOf(target));
                }
            }
            if (rebirths.length > 0) {
                this._roster.replaceAll(roster.map((general) => byId.get(general.id) ?? general));
            }
            this._bondPoints += bondPointsGained;
        }

        if (added.length > 0) {
            this._roster.replaceAll([...this._roster.getAll(), ...added]);
        }
        if (added.length > 0 || rebirths.length > 0) {
            if (this._autoSave && this._save) {
                await this.save();
            }
        }
        if (added.length > 0) {
            this._emit(GAME_SESSION_EVENTS.RosterChanged, added);
        }
        return { added, duplicates, rebirths, bondPointsGained };
    }

    /** 目前名冊中可以出戰的武將（排除死亡、退役教官、未畢業子嗣、精力不足、培育中） */
    public getDeployableGenerals(): GeneralConfig[] {
        return listDeployable(this._roster.getAll(), { nurturingIds: this._nurturingIds() });
    }

    public checkDeployable(generalId: string): DeployCheck {
        const general = this._roster.getAll().find((g) => g.id === generalId);
        if (!general) {
            return { eligible: false, reasons: [] };
        }
        return checkDeployable(general, { nurturingIds: this._nurturingIds() });
    }

    /**
     * 戰後結算：出戰武將扣精力、記戰績與功勳，給玩家覺醒經驗，再為每位出戰武將擲一次戰場覺醒；
     * 寫回名冊並存檔。名冊裡找不到的 id（例如內建 demo 武將）略過；ongoing 不結算。
     * 覺醒用的是加完經驗後的 discoveryLevel。
     */
    public async recordBattle(
        deployedIds: readonly string[],
        result: BattleResult,
        options: RecordBattleOptions = {},
    ): Promise<BattleRecordResult> {
        // 勝利才記通關；同一關重複通關不會重複記入
        const clearedBefore = this._clearedStageIds.length;
        const beforeRoster = this._roster.getAll();
        if (result === 'player-win' && options.stageId) {
            this._clearedStageIds = normalizeClearedStageIds([...this._clearedStageIds, options.stageId]);
        }
        const clearChanged = this._clearedStageIds.length !== clearedBefore;
        const firstClear = result === 'player-win' && !this._firstBattleCleared;
        if (firstClear) this._firstBattleCleared = true;
        const tallyChanged = this._settleTallyBattleExp(options.deployedTallyIds ?? [], result);
        const comradeChanged = this._recordBattleComrades(result, Boolean(options.sortie));
        const settlement = settleBattle(this._roster.getAll(), {
            deployedIds,
            result,
            season: this._clock.state.totalSeasonsElapsed,
            performance: options.performance,
            vitalityAfterBattle: options.vitalityAfterBattle,
        });
        // 新達成的里程碑發獎勵（千人斬等戰法筆記，GEN-13 / PROG-2-0817）；每個里程碑只在首次達成時發
        const milestoneRewards = settlement.entries.flatMap((entry) => rewardsForMilestones(entry.newMilestones));
        this._inventory = grantTacticNotes(this._inventory, milestoneRewards);
        if (settlement.entries.length === 0) {
            if ((clearChanged || firstClear || tallyChanged || comradeChanged) && this._autoSave && this._save) {
                await this.save();
            }
            if (firstClear) this._emit(GAME_SESSION_EVENTS.FirstBattleCleared, undefined);
            return { ...settlement, awakenings: [] };
        }
        if (options.sortie) {
            this._military = applySortieResult(this._military, options.sortie);
        }

        const source = battleExpSource(result);
        const discovery = source ? this._applyDiscoveryExp(source) : undefined;
        const special = new Set(options.specialActionIds ?? []);
        const dictionary = this._factorDictionary;
        const factorTags = dictionary ? (factorId: string) => dictionary.get(factorId)?.defaultTags : undefined;
        const awakenings: FactorAwakenedEvent[] = [];
        let roster = settlement.roster;
        for (const entry of settlement.entries) {
            const index = roster.findIndex((g) => g.id === entry.generalId);
            const actions = options.specialActions?.[entry.generalId] ?? [];
            const rolled = rollBattleAwakening(roster[index], {
                discoveryLevel: this._discoveryLevel,
                specialAction: special.has(entry.generalId) || actions.length > 0,
                actionTags: specialActionFactorTags(actions),
                factorTags,
                random: this._random,
            });
            if (rolled?.ok) {
                roster = roster.map((g, i) => (i === index ? rolled.general : g));
                awakenings.push(rolled.event);
            }
        }

        const record: BattleRecordResult = { ...settlement, roster, discovery, awakenings, ...(options.sortie ? { military: this.military } : {}) };
        this._roster.replaceAll(roster);
        this._clearLeadIfGone();
        this._settleDeaths(beforeRoster, roster, this._clock.state.totalSeasonsElapsed);
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.BattleSettled, record);
        if (firstClear) this._emit(GAME_SESSION_EVENTS.FirstBattleCleared, undefined);
        if (discovery) this._emitDiscoveryGain(discovery);
        for (const event of awakenings) {
            this._emit(GAME_SESSION_EVENTS.FactorAwakened, event);
        }
        return record;
    }

    /**
     * 共鬥（戰後）：本場有使用出征編制（options.sortie）時，出征主將與參謀官／後勤官各記一筆戰友（battle-comrade）。
     * 不等多武將出戰；未出征或 ongoing 不記。回傳是否新增了任何關係（呼叫端負責存檔）。
     */
    private _recordBattleComrades(result: BattleResult, usedSortie: boolean): boolean {
        const commander = this._leadGeneralId;
        if (!usedSortie || !commander || result === 'ongoing') return false;
        const support = this.getSortieSupportSummary(commander);
        const pairs = battleComradePairs(commander, [support.strategist?.id ?? null, support.deputy?.id ?? null]);
        const season = this._clock.state.totalSeasonsElapsed;
        let changed = false;
        for (const [a, b] of pairs) {
            const recorded = this.dynamicRelations.record('battle-comrade', a, b, season);
            if (recorded.ok && recorded.created) changed = true;
        }
        return changed;
    }

    /** 點數（溢出轉化積分）唯讀值 */
    public get scorePoints(): number {
        return this._scorePoints;
    }

    /** 自動培育券數唯讀值（NUR-14） */
    public get autoNurtureTickets(): number {
        return this._autoNurtureTickets;
    }

    /** 第一次打贏戰鬥後為 true，之後不會再變回 false */
    public get firstBattleCleared(): boolean {
        return this._firstBattleCleared;
    }

    /** 第四幕紅顏該不該彈：首戰已通過且還沒展示過 */
    public get shouldShowOpeningRedFace(): boolean {
        return this._firstBattleCleared && !this._openingRedFaceShown;
    }

    /** 第四幕紅顏已展示：記下並存檔，之後不再自動彈出 */
    public async markOpeningRedFaceShown(): Promise<void> {
        if (this._openingRedFaceShown) return;
        this._openingRedFaceShown = true;
        if (this._autoSave && this._save) {
            await this.save();
        }
    }

    /** 主線第一次通過培育季後為 true，之後不會再變回 false */
    public get mainlineNurtureClearedOnce(): boolean {
        return this._mainlineNurtureClearedOnce;
    }

    /**
     * 自動培育（NUR-14 接線）：解鎖 → 券 → 會話（須進行中）→ 解析排程 → 扣券 → 跑完整季 → 寫回培育狀態並自動存檔。
     * 畢業仍由玩家呼叫 graduate；自動會話的評級上限已在結算時套用。
     * manualSchedule 為上一次手動排程（缺值時平均分配到最低屬性）；random 預設走存檔亂數源（Q25）。
     */
    public async runAutoNurture(
        childId: string,
        manualSchedule?: readonly NurtureAction[],
        random: RandomSource = () => this._random(),
    ): Promise<{ ok: true; logs: NurtureRoundLog[] } | { ok: false; blocked: AutoNurtureBlockReason | 'NOT_NURTURING' | 'SESSION_ENDED' }> {
        const gate = canStartAutoNurture(isAutoNurtureUnlocked(this._mainlineNurtureClearedOnce), this._autoNurtureTickets);
        if (!gate.ok) return { ok: false, blocked: gate.blocked! };
        const state = this._nurture?.getState();
        const session = state?.sessions.find((s) => s.childId === childId);
        if (!state || !session) return { ok: false, blocked: 'NOT_NURTURING' };
        if (session.status !== 'active') return { ok: false, blocked: 'SESSION_ENDED' };
        const schedule = resolveAutoSchedule(session.prowess, manualSchedule);
        const run = runAutoNurtureSeason(session, schedule, random);
        const next = consumeAutoNurtureTicket(this._autoNurtureTickets);
        this._autoNurtureTickets = next ?? this._autoNurtureTickets;
        this._nurture!.restoreState({
            ...state,
            sessions: state.sessions.map((s) => (s.childId === childId ? run.session : s)),
        });
        if (this._autoSave && this._save) {
            await this.save();
        }
        return { ok: true, logs: run.logs };
    }

    /** 入帳自動培育券（只收正整數，自動存檔） */
    public async grantAutoNurtureTickets(amount: number): Promise<number> {
        if (!Number.isInteger(amount) || amount <= 0) return this._autoNurtureTickets;
        this._autoNurtureTickets += amount;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return this._autoNurtureTickets;
    }

    /** 扣一張自動培育券（NUR-14）；券不足回傳 false 且不扣。 */
    public async consumeAutoNurtureTicket(): Promise<boolean> {
        const next = consumeAutoNurtureTicket(this._autoNurtureTickets);
        if (next === null) return false;
        this._autoNurtureTickets = next;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return true;
    }

    /** 主線通過培育季（NUR-14 解鎖）；已解鎖時不重複存檔 */
    public async markMainlineNurtureSeasonCleared(): Promise<boolean> {
        if (this._mainlineNurtureClearedOnce) return true;
        this._mainlineNurtureClearedOnce = true;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return true;
    }

    /** 入帳點數（MENT-07 溢出轉化）；負數與非整數不入帳，自動存檔時寫回 */
    public async grantScorePoints(amount: number): Promise<number> {
        if (!Number.isInteger(amount) || amount <= 0) return this._scorePoints;
        this._scorePoints += amount;
        if (this._autoSave && this._save) {
            await this.save();
        }
        return this._scorePoints;
    }

    public createSnapshot(now?: Date): PlayerSaveSnapshot {
        const pending = this._pendingLifespanEvents.map((event) => ({ generalId: event.generalId, age: event.age }));
        return {
            ...this._createBaseSnapshot(now),
            military: this.military,
            yearAgingEvents: this._yearAgingEvents.map((event) => ({ ...event })),
            resources: {
                fame: this._fame,
                scorePoints: this._scorePoints,
                autoNurtureTickets: this._autoNurtureTickets,
                mainlineNurtureClearedOnce: this._mainlineNurtureClearedOnce,
                firstBattleCleared: this._firstBattleCleared,
                openingRedFaceShown: this._openingRedFaceShown,
            },
            domestic: { ...this._domesticLog },
            prison: this.prison,
            ...(pending.length > 0 ? { pendingLifespanDeaths: pending } : {}),
            onboarding: { ...this._onboarding },
            bondPoints: this._bondPoints,
            femaleSystem: this.femaleSystemState,
            ...(this._travel ? { travelCountdown: { ...this._travel } } : {}),
            sortiePresets: { ...this._sortiePresets },
        };
    }

    private _createBaseSnapshot(now?: Date): PlayerSaveSnapshot {
        return createPlayerSaveSnapshot(this._clock.state, this._roster.getAll(), now, this._nurture?.getState(), this._deck, this._leadGeneralId, this._discoveryLevel, this._seeded.snapshot(), this._discoveryExp, this._inventory, this._oracleCount, this._clearedStageIds, this._tallyLoyalty, this._tallyHoldings.holders, this._tallyCards, this._mercenaries, this._femaleSources, this._gachaPity, this._gachaWallet, this._favoriteGeneralIds, this._hallAssignments, this.dynamicRelations.snapshot(), this._legacyCount);
    }

    public async save(): Promise<PlayerSaveSnapshot> {
        const service = this._requireSave();
        const snapshot = this.createSnapshot();
        await service.save(snapshot);
        this._emit(GAME_SESSION_EVENTS.Saved, snapshot);
        return snapshot;
    }

    /** 讀取存檔並套用；沒有存檔時回傳 false，狀態維持不變 */
    public async load(): Promise<boolean> {
        const snapshot = await this._requireSave().load();
        if (!snapshot) {
            return false;
        }
        this._preLifespanRoster = null;
        this._clock.restore(snapshot.gameTime);
        this._seeded.restore(snapshot.randomState ?? { algorithm: 'mulberry32-v1', state: LEGACY_RANDOM_SEED });
        this._roster.replaceAll(normalizeRosterRoles(snapshot.roster));
        this._pendingLifespanEvents = (snapshot.pendingLifespanDeaths ?? []).map((death) => ({ type: 'died', generalId: death.generalId, age: death.age }));
        // 讀檔後沒有記憶體中的季結前名冊；待季結死亡者還原為非陣亡，虎符結算才認得出「這次才死」（PROG-2-0223）
        this._preLifespanRoster = preLifespanBaseline(snapshot.roster, (snapshot.pendingLifespanDeaths ?? []).map((death) => death.generalId));
        this._nurture?.restoreState(snapshot.nurture);
        this._onboarding = normalizeOnboardingState(snapshot.onboarding);
        this._bondPoints = normalizeBondPoints(snapshot.bondPoints);
        this._deck = [...snapshot.deck];
        this._leadGeneralId = snapshot.leadGeneralId ?? null;
        this._sortieSupport = { strategistUid: null, deputyUid: null };
        this._sortiePresets = normalizeSortiePresets(snapshot.sortiePresets);
        this._travel = normalizeTravelCountdown(snapshot.travelCountdown);
        this._countdown = null;
        const progress = normalizeDiscoveryProgress(snapshot.discoveryLevel, snapshot.discoveryExp);
        this._discoveryLevel = progress.level;
        this._discoveryExp = progress.exp;
        this._inventory = normalizeInventory(snapshot.inventory);
        this._oracleCount = snapshot.oracleCount ?? 0;
        this._clearedStageIds = normalizeClearedStageIds(snapshot.clearedStageIds);
        this._favoriteGeneralIds = normalizeFavoriteGeneralIds(snapshot.favoriteGeneralIds);
        this._hallAssignments = normalizeHallAssignments(snapshot.hallAssignments);
        this.dynamicRelations.restore(snapshot.dynamicRelations ?? []);
        this._legacyCount = normalizeLegacyCount(snapshot.legacyCount);
        this._hallSpotState = EMPTY_HALL_SPOT_STATE;
        this._tallyLoyalty = normalizeTallyLoyaltyMap(snapshot.tallyLoyalty);
        this._tallyHoldings = { holders: normalizeTallyHoldingsMap(snapshot.tallyHoldings) };
        // 讀檔回填：舊存檔的虎符卡可能缺 troopType，依名冊武將的主兵種補上（PROG-2-0582）
        this._tallyCards = backfillTallyTroopTypes(normalizeTallyCardsMap(snapshot.tallyCards), this._roster.getAll());
        this._femaleSources = normalizeFemaleSourcesMap(snapshot.femaleSources);
        this._gachaPity = normalizeGachaPityBook(snapshot.gachaPity);
        this._gachaRevision += 1;
        this._femaleSystem = normalizeFemaleSystemState(snapshot.femaleSystem);
        this._gachaWallet = snapshot.gachaWallet ? normalizeGachaWalletSave(snapshot.gachaWallet) : null;
        this._military = normalizeMilitaryReserve(snapshot.military);
        this._yearAgingEvents = normalizeYearAgingEvents(snapshot.yearAgingEvents);
        this._prison = normalizePrisonState<GeneralConfig>(snapshot.prison);
        this._fame = normalizeFame(snapshot.resources?.fame);
        this._scorePoints = normalizeScorePoints(snapshot.resources?.scorePoints);
        this._autoNurtureTickets = normalizeAutoNurtureTickets(snapshot.resources?.autoNurtureTickets);
        this._mainlineNurtureClearedOnce = normalizeFlag(snapshot.resources?.mainlineNurtureClearedOnce);
        // 舊檔沒有旗標：已有通關紀錄視為打過首戰，否則 false
        this._firstBattleCleared = normalizeFlag(snapshot.resources?.firstBattleCleared) || this._clearedStageIds.length > 0;
        this._openingRedFaceShown = normalizeFlag(snapshot.resources?.openingRedFaceShown)
            || (snapshot.resources?.firstBattleCleared === undefined && this._clearedStageIds.length > 0);
        this._domesticLog = normalizeDomesticLog(snapshot.domestic);
        this._mercenaries = normalizeMercenaryBundle(snapshot.mercenaries);
        this._emit(GAME_SESSION_EVENTS.Loaded, snapshot);
        return true;
    }

    private async _commitDeck(): Promise<void> {
        if (this._autoSave && this._save) {
            await this.save();
        }
        this._emit(GAME_SESSION_EVENTS.DeckChanged, this.deck);
    }

    private _applyDiscoveryExp(source: DiscoveryExpSource, amount?: number): DiscoveryGain {
        const gain = gainDiscoveryExp({ level: this._discoveryLevel, exp: this._discoveryExp }, source, amount);
        this._discoveryLevel = gain.after.level;
        this._discoveryExp = gain.after.exp;
        return gain;
    }

    private _emitDiscoveryGain(gain: DiscoveryGain): void {
        if (gain.levelsGained > 0) {
            this._emit(GAME_SESSION_EVENTS.DiscoveryLevelChanged, gain);
        }
    }

    private _nurturingIds(): string[] {
        return (this._nurture?.getState().sessions ?? []).map((session) => session.childId);
    }

    private _requireSave(): PlayerSaveService {
        if (!this._save) {
            throw new Error('[GameSession] 尚未設定存檔服務（setSaveService）');
        }
        return this._save;
    }

    private _emit(eventName: string, payload: unknown): void {
        this._events?.emit(eventName, payload);
    }
}
