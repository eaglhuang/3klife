// @spec-source → 見 docs/cross-reference-index.md
import { _decorator, Button, Color, Component, instantiate, JsonAsset, Label, Node, Sprite, UITransform, Widget, resources } from 'cc';
import { UIID, LayerType } from '../../core/config/UIConfig';
import type { GeneralConfig, GeneralDetailDefaultTab } from '../../core/models/GeneralUnit';
import { services } from '../../core/managers/ServiceLoader';
import type { UIManagedController } from '../../core/managers/UIManager';
import { SceneName } from '../../core/config/Constants';
import { IBattleEntryParams, DEFAULT_BATTLE_ENTRY_PARAMS, EncounterConfig, isTutorialBattle } from '../../shared/BattleEntryParams';
import { normalizeWeather } from '../../shared/CommonEnums';
import { BattleTactic } from '../../core/config/Constants';
import { GeneralListComposite } from '../components/GeneralListComposite';
import { GeneralDetailComposite } from '../components/GeneralDetailComposite';
import { EliteTroopCodexComposite, type EliteTroopCodexOpenPayload } from '../components/EliteTroopCodexComposite';
import { LobbyMissionDetailDialogComposite, type LobbyMissionDetailDialogOpenPayload, type MissionGeneralOption } from '../components/LobbyMissionDetailDialogComposite';
import { LocalGachaService, type LocalGachaResultEntry } from '../../core/services/LocalGachaService';
import { PlayerRosterService } from '../../core/services/PlayerRosterService';
import { GAME_SESSION_EVENTS } from '../../core/managers/GameSession';
import { formatModeLabel } from '../../core/systems/GameClock';
import { buildSageRemarks, remarkRandomOf } from '../../core/systems/SageRemarks';
import { SAGES } from '../../core/systems/SageDivination';
import { seasonDisplayText } from '../core/SeasonTexts';
import { buildYearReportTexts, withYearReportFallback, type YearReport } from '../../core/systems/YearReport';
import { isStageUnlocked } from '../../core/systems/StageChainProgress';
import { buildBattlefieldReconForEncounter } from '../../core/systems/BattlefieldRecon';
import { buildEnvScoutLines } from '../core/EnvScoutPresenter';
import { lifespanCommandForBattleKind } from '../../core/systems/LifespanWiring';
import type { UnveilingEvent } from '../../core/systems/Unveiling';
import type { AgingEvent } from '../../core/systems/GeneralAging';
import type { NurtureAction } from '../../core/systems/NurtureSystem';
import { TRAINING_KINDS } from '../../core/systems/NurtureSystem';
import { attachSupportToCards, parseSupportCatalog, SupportCatalog } from '../../core/systems/MentorSupportCatalog';
import { NurtureFlowController } from '../core/NurtureFlowController';
import { VitalityPillController } from '../core/VitalityPillController';
import { MentorCardDetailController } from '../core/MentorCardDetailController';
import { GeneralVersionGalleryController } from '../core/GeneralVersionGalleryController';
import type { GeneralVersionRecord } from '../../core/models/GeneralVersion';
import { GALLERY_GROUP_SLOTS } from '../../core/systems/GeneralVersionGallery';
import { galleryInputsFromGenerals } from '../../core/systems/ProvisionalGeneralVersions';
import { beastForGeneral, formatBeastSummary } from '../../core/systems/BloodlineBeast';
import { buildFactorHexView, factorHexInputsFromGenes, newlyLitFactorColors, type FactorHexInput } from '../../core/systems/FactorHexPanel';
import { FactorHexGraphic } from '../components/FactorHexGraphic';
import type { MentorCardData, MentorCardTab } from '../../core/systems/MentorCardTabs';
import { applyFlowView, applyNurtureFlowView } from '../core/NurtureFlowViewApplier';
import { buildCountdownIconFlowView } from '../../core/systems/CountdownIconView';
import { BondingSetupController } from '../core/BondingSetupController';
import { withBreedFallback, type BreedTextLookup } from '../core/BreedingTexts';
import { BloodlineTreePanel } from '../panels/BloodlineTreePanel';
import { JobChangeController } from '../core/JobChangeController';
import { DomesticPanelController } from '../core/DomesticPanelController';
import { HallBoardPanelController, HALL_BOARD_MAX_ROWS } from '../core/HallBoardPanelController';
import { hallPlayerOf } from '../../core/systems/OfficerSnapshot';
import { loadLobbyHub } from '../../core/systems/HallMissionBoardPresenter';
import { officerDisplayOf } from '../../core/systems/OfficerDisplay';
import { installOfficerTierTable } from '../../core/systems/OfficerTierTable';
import { officerPromotionNoticeOf } from '../../core/systems/HallMissionSettlement';
import { estimateSortiePower } from '../../core/systems/SortiePrediction';
import type { LobbyHub } from '../../core/systems/LobbyHubSchema';
import type { HallBoardKey } from '../../core/systems/HallMissionBoard';
import { MercenaryPanelController, MERC_PANEL_MAX_ROWS } from '../core/MercenaryPanelController';
import { EXPEDITION_TRAVEL_TURNS } from '../../core/systems/TravelCountdown';
import { RedFaceShowcaseController, RED_FACE_SHOW_MAX_ROWS } from '../core/RedFaceShowcaseController';
import { DestinyOpeningController, DESTINY_OPENING_MAX_ROWS } from '../core/DestinyOpeningController';
import { OpeningIntroController } from '../core/OpeningIntroController';
import { createNewPlayerOpeningFlow, OPENING_INTRO_DONE } from '../../core/systems/NewPlayerOpening';
import { destinyLockedEvent } from '../../core/systems/DestinyOpening';
import type { OpeningFlowController } from '../../core/systems/OpeningFlowController';
import type { GachaConfig } from '../../core/models/GachaConfig';
import type { RedFaceCardLike } from '../../core/systems/RedFaceShowcase';
import type { DomesticTaskId } from '../../core/systems/DomesticTasks';
import { OnboardingFlowController } from '../core/OnboardingFlowController';
import { ITEM_JOB_CHANGE_ORDER } from '../../core/systems/PlayerInventory';
import { JOB_CHANGE_ORDER_OFFER } from '../../core/systems/ItemShopPricing';
import { PrisonerPopupController } from '../core/PrisonerPopupController';
import { SortieSetupController, type SortieRole } from '../core/SortieSetupController';
import type { PowDecision } from '../../core/systems/PrisonerOfWar';
import { OracleCouple, SageOracleController } from '../core/SageOracleController';
import { buildRetireReviewTexts, RETIRE_REVIEW_OPEN_EVENT, withRetireReviewFallback, type RetireReviewOpenPayload } from '../core/RetireReviewController';
import { formatDeathNotice } from '../core/LifeVitalityPresenter';
import { buildSpiritCodexTexts, withSpiritCodexFallback } from '../core/SpiritCodexController';
import { lifeScriptCopy, type LifeScriptEvent } from '../../core/systems/LifeScriptCopy';
import { getTallyCardSummaries } from '../../core/config/TallyCardCatalog';
import { PLAYER_DECK_MAX_SIZE } from '../../core/services/PlayerDeckRules';
import { buildLeadSelectView, LEAD_SELECT_PAGE_SIZE, nextLeadId } from '../../core/services/LeadGeneralSelectRules';
import { UIScreenPreviewHost } from '../components/UIScreenPreviewHost';
import { SolidBackground } from '../components/SolidBackground';
import { ToastMessage } from '../components/ToastMessage';
import { applyUIPreviewBinderState } from '../core/UIPreviewStateApplicator';
import { buildSpiritFamilyOverviewDisplayModel, type SpiritFamilyOverviewOpenPayload } from '../core/SpiritFamilyOverviewRoute';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
import { warnGeneralSchemaOnLoad } from '../../core/models/GeneralSchema';
import { GachaFlowCoordinator, GACHA_SCREEN_ID } from '../core/GachaFlowCoordinator';
import { buildGachaPoolGuideLines } from '../core/GachaPoolGuidePresenter';
import { bindGachaActions } from '../core/GachaActionBindings';
import { formatGeneralDisplayName } from '../../core/models/GeneralTitle';
import { attachCurrencyCheatPanel, detachCurrencyCheatPanel, detachRosterClearButton, ensureGlobalDevOverlay, refreshCurrencyDisplay } from '../dev/GachaDevOverlay';

const { ccclass } = _decorator;

/** 命紋靈獸摘要的暫定位置（PROVISIONAL：畫面沒有預留節點，程式掛在 CharacterDs3Host 下，待 Codex 實機微調） */
const BEAST_SUMMARY_NODE_NAME = 'BeastSummaryLabel';
const BEAST_SUMMARY_POSITION = { x: -240, y: -280 };
/** 六角圖暫定位置與半徑：畫面沒有預留節點，由程式掛在 CharacterDs3Host 下（PROVISIONAL，座標待 Codex 實機微調） */
const FACTOR_HEX_NODE_NAME = 'FactorHexGraphic';
const FACTOR_HEX_RADIUS = 120;
const FACTOR_HEX_POSITION = { x: -240, y: -160 };

/** 圖鑑入口的暫定位置（PROVISIONAL：畫面沒有預留節點，程式掛在 CharacterDs3Host 下，待 Codex 實機微調） */
const GALLERY_ENTRY_NODE_NAME = 'GeneralVersionGalleryEntry';
const GALLERY_ENTRY_POSITION = { x: 240, y: -280 };

type GeneralDetailRuntimeTab = 'Overview' | 'Stats' | 'Tactics' | 'Bloodline' | 'Equip' | 'Aptitude';
type GeneralDetailEntrySmokeSource = 'ucuf-nav';

const CHARACTER_DS3_PREVIEW_TAB_BUTTONS: Record<GeneralDetailRuntimeTab, string> = {
    Overview: 'CharacterDs3Main_button_4',
    Stats: 'CharacterDs3Main_button_5',
    Tactics: 'CharacterDs3Main_button_6',
    Bloodline: 'CharacterDs3Main_button_7',
    Equip: 'CharacterDs3Main_button_8',
    Aptitude: 'CharacterDs3Main_button_9',
};

const CHARACTER_DS3_PREVIEW_TAB_FRAGMENTS: Record<GeneralDetailRuntimeTab, string> = {
    Overview: 'fragments/layouts/character-ds3-overview-content',
    Stats: 'fragments/layouts/character-ds3-stats-content',
    Tactics: 'fragments/layouts/character-ds3-tactics-content',
    Bloodline: 'fragments/layouts/character-ds3-bloodline-content',
    Equip: 'fragments/layouts/character-ds3-equip-content',
    Aptitude: 'fragments/layouts/character-ds3-aptitude-content',
};

const CHARACTER_DS3_PREVIEW_TAB_ORDER: GeneralDetailRuntimeTab[] = [
    'Overview',
    'Stats',
    'Tactics',
    'Bloodline',
    'Equip',
    'Aptitude',
];

const CHARACTER_DS3_PREVIEW_SLOT_CANDIDATES = [
    'CharacterDs3Main_div_8',
] as const;

interface GeneralListOpenPayload {
    generals: GeneralConfig[];
    onSelectGeneral: (config: GeneralConfig) => void | Promise<void>;
    options?: {
        factionFilter?: 'all' | 'player' | 'enemy';
        npcDialogueDevControls?: boolean;
        npcDialogueSaveId?: string;
    };
}

/** 選卡畫面的卡片按鈕數（對應 lobby-deck-select-main.json 的 btnDeckCard0..3，目前卡片目錄只有 4 張） */
const DECK_SELECT_SLOTS = 4;

/** 結緣與開獎文案：走 i18n，語系表未載入時退回 zh-TW 預設（PROG-2-0526 / 0527） */
function breedText(): BreedTextLookup {
    return withBreedFallback((key, ...args) => services().i18n.t(key, ...args));
}

/** 結緣：選中待產的母方時顯示劇本提示（PROG-2-0732） */
function toastPregnantMother(bonding: { pregnantMotherHint(): string | null }): void {
    const hint = bonding.pregnantMotherHint();
    if (hint) services().event.emit('SHOW_TOAST', { message: hint, duration: 2 });
}

/** 季節字串：走 i18n（ui.season.display），語系表未載入時退回 zh-TW 預設（PROG-2-0730） */
function seasonText(state: Parameters<typeof seasonDisplayText>[1]): string {
    return seasonDisplayText((key, ...args) => services().i18n.t(key, ...args), state);
}

interface ScreenButtonBinding {
    buttonId: string;
    handler: () => void;
}

interface GachaPoolConfigLike {
    poolType: string;
    candidateIds?: string[];
}

@ccclass('LobbyScene')
export class LobbyScene extends Component {

    private _generals: GeneralConfig[] = [];
    private _encounters: EncounterConfig[] = [];
    private _listPanel: GeneralListComposite | null = null;
    private _detailPanel: GeneralDetailComposite | null = null;
    private _lobbyMainHost: UIScreenPreviewHost | null = null;
    private _shopMainHost: UIScreenPreviewHost | null = null;
    private _gachaHost: UIScreenPreviewHost | null = null;
    private _seasonHudHost: UIScreenPreviewHost | null = null;
    private _officerHudHost: UIScreenPreviewHost | null = null;
    /** 趕路倒數（時間單位為毫秒）；目前尚無趕路來源接入，為 null 時圖示隱藏（PROG-2-0469） */
    private _nurtureFlowHost: UIScreenPreviewHost | null = null;
    private _nurtureFlow: NurtureFlowController | null = null;
    /** 教官卡詳情（MENT-13）：頁籤與目前卡的狀態 */
    private _mentorCardHost: UIScreenPreviewHost | null = null;
    private readonly _mentorCardDetail = new MentorCardDetailController();
    private _generalGalleryHost: UIScreenPreviewHost | null = null;
    private readonly _generalGallery = new GeneralVersionGalleryController();
    private _supportCatalog: SupportCatalog | null = null;
    private _bondingHost: UIScreenPreviewHost | null = null;
    private _bonding: BondingSetupController | null = null;
    private _fatherTree: BloodlineTreePanel | null = null;
    private _motherTree: BloodlineTreePanel | null = null;
    private _jobChangeHost: UIScreenPreviewHost | null = null;
    private _domesticHost: UIScreenPreviewHost | null = null;
    private _hallBoardHost: UIScreenPreviewHost | null = null;
    private _hallBoard: HallBoardPanelController | null = null;
    private _mercPanelHost: UIScreenPreviewHost | null = null;
    private _mercPanel: MercenaryPanelController | null = null;
    private _redFaceHost: UIScreenPreviewHost | null = null;
    private _redFace: RedFaceShowcaseController | null = null;
    private _destinyHost: UIScreenPreviewHost | null = null;
    private _destiny: DestinyOpeningController | null = null;
    /** 開場沒有讀到存檔＝新玩家，需要先走宿命轉蛋 */
    private _isNewPlayer = false;
    private _introHost: UIScreenPreviewHost | null = null;
    private _intro: OpeningIntroController | null = null;
    private _openingFlow: OpeningFlowController | null = null;
    private _jobChange: JobChangeController | null = null;
    private _domestic: DomesticPanelController | null = null;
    private _lobbyHub: LobbyHub | null = null;
    private _onboardingHost: UIScreenPreviewHost | null = null;
    private _onboarding: OnboardingFlowController | null = null;
    private _oracleHost: UIScreenPreviewHost | null = null;
    private _retireReviewHost: UIScreenPreviewHost | null = null;
    private _spiritCodexHost: UIScreenPreviewHost | null = null;
    private _oracle: SageOracleController | null = null;
    private _prisonerHost: UIScreenPreviewHost | null = null;
    private _yearReportHost: UIScreenPreviewHost | null = null;
    private _prisoner: PrisonerPopupController | null = null;
    private _sortieHost: UIScreenPreviewHost | null = null;
    private _sortie: SortieSetupController | null = null;
    private _deckSelectHost: UIScreenPreviewHost | null = null;
    private _leadSelectHost: UIScreenPreviewHost | null = null;
    private _leadSelectPage = 0;
    private readonly _sessionEventUnsubscribers: Array<() => void> = [];
    private _spiritFamilyOverviewHost: UIScreenPreviewHost | null = null;
    private _bloodlineMirrorLoadingHost: UIScreenPreviewHost | null = null;
    private _bloodlineMirrorAwakeningHost: UIScreenPreviewHost | null = null;
    private _characterDs3Host: UIScreenPreviewHost | null = null;
    /** 每位武將上次顯示的因子狀態，用來判斷這次新亮起的顏色（只在同一武將的二次檢視才播解鎖特效） */
    private readonly _factorHexInputsByGeneral = new Map<string, FactorHexInput[]>();
    private _eliteTroopCodexPanel: EliteTroopCodexComposite | null = null;
    private _missionDetailDialogPanel: LobbyMissionDetailDialogComposite | null = null;
    private _characterDs3ActiveTab: GeneralDetailRuntimeTab = 'Overview';
    private _isCharacterDs3TabSwitching = false;
    private _gachaPoolIndex = 0;
    private _characterDs3TabBindRetryCount = 0;
    private readonly _singlePlayerModeToggleHandles: Array<{ root: Node; label: Label }> = [];
    private readonly _localGachaService = new LocalGachaService({
        // 保底與錢包存進存檔（PROG-2-0337 / 0338）；寫入後順手存檔，失敗不影響抽卡
        readPity: () => services().session.gachaPityBook,
        writePity: (book) => {
            services().session.setGachaPityBook(book);
            this._saveGachaState();
        },
        readWallet: () => services().session.gachaWalletSave,
        writeWallet: (wallet) => {
            services().session.setGachaWalletSave(wallet);
            this._saveGachaState();
        },
        revision: () => services().session.gachaRevision,
    }, () => services().session.randomSource());

    private _saveGachaState(): void {
        void services().session.save().catch(() => undefined);
    }
    private _gachaFlowCoordinator: GachaFlowCoordinator | null = null;
    private _gachaPullPending = false;
    private _ready = false;

    /** 等待 LobbyScene 資料初始化完成（供 headless smoke route 使用） */
    public async waitForReady(timeoutMs = 8000): Promise<boolean> {
        const start = Date.now();
        while (!this._ready && Date.now() - start < timeoutMs) {
            await new Promise<void>((r) => setTimeout(r, 80));
        }
        return this._ready;
    }

    async start() {
        // 為 LobbyScene 大背板生成穩定的組件背景
        const bgNode = this.node.getChildByName('Background');
        if (bgNode) {
            const bg = bgNode.getComponent(SolidBackground) || bgNode.addComponent(SolidBackground);
            bg.color = new Color(15, 20, 25, 255);
        }

        // 初始化子系統（列表與彈窗）
        const listNode = this.node.getChildByName('GeneralListPanel');
        this._listPanel = listNode?.getComponent(GeneralListComposite) || listNode?.addComponent(GeneralListComposite) || null;

        this._ensureWidget(listNode);

        const detailNode = this.node.getChildByName('GeneralDetailComposite');
        this._detailPanel = detailNode?.getComponent(GeneralDetailComposite) || detailNode?.addComponent(GeneralDetailComposite) || null;
        this._ensureWidget(detailNode);

        this._isNewPlayer = !(await this._loadPlayerSave());
        await this._mountLobbyMainHub();
        await this._mountSecondaryMainHubs();
        await this._mountSeasonHud();
        await this._mountOfficerHud();
        await this._mountNurtureFlow();
        await this._mountMentorCardDetail();
        await this._mountGeneralVersionGallery();
        await this._mountBondingSetup();
        await this._mountJobChange();
        await this._mountDomestic();
        await this._mountHallBoard();
        await this._mountMercenaryPanel();
        await this._mountRedFaceShowcase();
        await this._mountDestinyOpening();
        await this._mountOpeningIntro();
        await this._mountOnboardingTutorial();
        await this._mountSageOracle();
        await this._mountRetireReview();
        await this._mountSpiritCodex();
        await this._mountPrisonerPopup();
        await this._mountYearReport();
        await this._mountDeckSelect();
        await this._mountLeadSelect();
        await this._mountSortieSetup();
        await this._mountCharacterDs3Host();
        await this._mountEliteTroopCodexPanel();
        await this._mountLobbyMissionDetailDialogPanel();
        this._registerUIControllers();
        await services().ui.open(UIID.LobbyMain);
        this._openPrisonerPopupIfPending();

        // 動態注入輕提示系統 (Toast)
        const toastNode = new Node('ToastContainer');
        toastNode.layer = this.node.layer;
        toastNode.parent = this.node;
        this._ensureWidget(toastNode);
        toastNode.addComponent(ToastMessage);

        // 載入武將、技能與特效資料
        try {
            await Promise.all([
                services().loadSkills(),
                services().loadVfxEffects(),
                services().loadSeasonModifiers()
            ]);
            
            this._generals = await services().resource.loadJson<GeneralConfig[]>(
                'data/generals', { tags: ['LobbyScene'] }
            );
            // 武將資料格式檢查（MVP-01）：只警告，不中斷大廳載入
            warnGeneralSchemaOnLoad(this._generals, 'LobbyScene data/generals');
            const encounterEnvelope = await services().resource.loadJson<{ encounters: EncounterConfig[] }>(
                'data/encounters', { tags: ['LobbyScene'] }
            );
            this._encounters = encounterEnvelope.encounters ?? [];
        } catch (error) {
            UCUFLogger.error(LogCategory.DATA, '[LobbyScene] 載入資料失敗:', error);
        }

        // 測試 Toast
        this.scheduleOnce(() => {
            services().event.emit('SHOW_TOAST', { message: '系統：水墨金屬 UI 已啟動 (v2.2)' });
        }, 1);

        this._ready = true;
        ensureGlobalDevOverlay(this._localGachaService, undefined, () => { PlayerRosterService.clear(); }, () => {
            this._refreshWalletPreviewState();
        });
    }

    protected onDestroy(): void {
        for (const unsubscribe of this._sessionEventUnsubscribers) {
            unsubscribe();
        }
        this._sessionEventUnsubscribers.length = 0;
        void services().ui.closeAll();
        detachCurrencyCheatPanel();
        detachRosterClearButton();
    }

    /** 開場讀檔：沒有存檔就維持新局；壞檔只警告，不覆蓋也不中斷大廳啟動 */
    private async _loadPlayerSave(): Promise<boolean> {
        try {
            const loaded = await services().session.load();
            UCUFLogger.info(LogCategory.DATA, loaded ? '[LobbyScene] 已讀取玩家存檔' : '[LobbyScene] 沒有玩家存檔，從新局開始');
            return loaded;
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 讀取玩家存檔失敗，從新局開始', error);
            return false;
        }
    }

    /** 官職區塊（OFC-08 顯示段）：以 UCUF JSON（lobby-officer-hud-screen）顯示階位與經驗，資料來自 officerDisplayOf */
    private async _mountOfficerHud(): Promise<void> {
        this._officerHudHost = await this._mountPreviewScreenHost('OfficerHudHost', 'lobby-officer-hud-screen', []);
        this._refreshOfficerHud();
        const refresh = (): void => { this._refreshOfficerHud(); };
        this._sessionEventUnsubscribers.push(
            services().event.on(GAME_SESSION_EVENTS.Loaded, refresh),
            services().event.on(GAME_SESSION_EVENTS.OfficerPromoted, (payload: { tiers: number[] }) => {
                refresh();
                for (const message of officerPromotionNoticeOf(payload.tiers)) {
                    services().event.emit('SHOW_TOAST', { message, duration: 2 });
                }
            }),
        );
    }

    private _refreshOfficerHud(): void {
        const display = officerDisplayOf(services().session.officerState);
        this._officerHudHost?.binder?.setTexts({
            officerTitle: display.sectionTitle,
            officerRank: display.rankName,
            officerExp: display.expLabel,
        });
    }

    /** 季度 HUD：以 UCUF JSON（lobby-season-hud-screen）執行期組裝，顯示「第 N 年 M 季」與推進入口 */
    private async _mountSeasonHud(): Promise<void> {
        this._seasonHudHost = await this._mountPreviewScreenHost('SeasonHudHost', 'lobby-season-hud-screen', [
            { buttonId: 'btnAdvanceSeason', handler: () => { void this._onClickAdvanceSeason(); } },
            { buttonId: 'btnOpenNurture', handler: () => { this._openNurtureFlow(); } },
            { buttonId: 'btnOpenSpiritCodex', handler: () => { void this._openSpiritCodex(); } },
            { buttonId: 'btnOpenBonding', handler: () => { void this._openBondingSetup(); } },
            { buttonId: 'btnOpenJobChange', handler: () => { this._openJobChange(); } },
            { buttonId: 'btnOpenDomestic', handler: () => { this._openDomestic(); } },
            { buttonId: 'btnOpenHallBoard', handler: () => { this._openHallBoard(); } },
            { buttonId: 'btnOpenSandtable', handler: () => { this._onClickOpenSandtable(); } },
        ]);
        this._refreshSeasonHud();

        const refresh = (): void => { this._refreshSeasonHud(); };
        const event = services().event;
        this._sessionEventUnsubscribers.push(
            event.on(GAME_SESSION_EVENTS.SeasonAdvanced, refresh),
            event.on(GAME_SESSION_EVENTS.CountdownChanged, refresh),
            event.on(GAME_SESSION_EVENTS.Loaded, refresh),
        );
    }

    private _refreshSeasonHud(): void {
        const time = services().session.gameTime;
        this._seasonHudHost?.binder?.setTexts({
            seasonLabel: seasonText(time),
            modeLabel: formatModeLabel(time.currentMode),
        });
        const countdownIcon = buildCountdownIconFlowView(services().session.countdown, Date.now());
        this._seasonHudHost?.binder?.setTexts(countdownIcon.texts);
        this._seasonHudHost?.binder?.setActives(countdownIcon.actives);
    }

    /** 教官支援卡目錄（mentor-support-cards.json）：只讀一次；讀取失敗視為空目錄，不擋培育 */
    private async _loadSupportCatalog(): Promise<SupportCatalog> {
        if (this._supportCatalog) return this._supportCatalog;
        const raw = await new Promise<unknown>((resolve) => {
            resources.load<JsonAsset>('data/mentor-support-cards', JsonAsset, (err, asset) => {
                resolve(err || !asset ? null : asset.json);
            });
        });
        this._supportCatalog = parseSupportCatalog(raw ?? []);
        return this._supportCatalog;
    }

    /**
     * 開獎與培育畫面：以 UCUF JSON（nurture-flow-screen）執行期組裝。
     * 規則全在 NurtureFlowController（純邏輯），這裡只綁按鈕、套 FlowView。
     */
    private async _mountNurtureFlow(): Promise<void> {
        const flow = new NurtureFlowController({
            roster: { getAll: () => services().session.roster },
            unveiling: services().unveiling,
            nurture: services().nurture,
            loadMentorCards: async () => attachSupportToCards((await services().legacy?.getMentorCards()) ?? [], await this._loadSupportCatalog()),
            text: breedText(),
            persist: async () => {
                if (services().session.hasSaveService) {
                    await services().session.save();
                }
            },
            spendLifespan: (generalId, command) => services().session.spendLifespan(generalId, command),
            autoNurture: (childId) => services().session.runAutoNurture(childId),
            performLegendaryMentoring: (generalId, childId, exclusiveSkillId) => services().session.performLegendaryMentoringFor(generalId, childId, exclusiveSkillId),
            showToast: (message) => { services().event.emit('SHOW_TOAST', { message, duration: 2 }); },
        });
        this._nurtureFlow = flow;

        const act = (task: () => Promise<unknown>): (() => void) => () => {
            void task()
                .catch((error) => {
                    UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 開獎 / 培育動作失敗', error);
                    services().event.emit('SHOW_TOAST', { message: error instanceof Error ? error.message : '操作失敗', duration: 2.5 });
                })
                .finally(() => { this._refreshNurtureFlow(); });
        };
        const trainBindings = TRAINING_KINDS.map((kind) => ({
            buttonId: `btnTrain_${kind}`,
            handler: act(() => flow.train(kind as NurtureAction)),
        }));
        this._nurtureFlowHost = await this._mountPreviewScreenHost('NurtureFlowHost', 'nurture-flow-screen', [
            { buttonId: 'btnCloseFlow', handler: () => { this._closeNurtureFlow(); } },
            { buttonId: 'btnPrevChild', handler: () => { flow.selectNext(-1); this._refreshNurtureFlow(); } },
            { buttonId: 'btnNextChild', handler: () => { flow.selectNext(1); this._refreshNurtureFlow(); } },
            { buttonId: 'btnFateAccept', handler: act(() => flow.chooseFate('accept')) },
            { buttonId: 'btnFateDefy', handler: act(() => flow.chooseFate('defy')) },
            { buttonId: 'btnStartNurture', handler: act(() => flow.startNurture()) },
            { buttonId: 'btnAutoNurture', handler: act(() => flow.autoNurture()) },
            { buttonId: 'btnMentorDetail', handler: () => {
                const detail = flow.mentorDetail();
                if (detail) { this.openMentorCardDetail(detail.card, detail.title); }
            } },
            ...trainBindings,
            { buttonId: 'btnLegendaryCard', handler: act(() => flow.cycleLegendaryCard()) },
            { buttonId: 'btnLegendaryMentor', handler: act(() => flow.legendaryMentor()) },
            { buttonId: 'btnRest', handler: act(() => flow.train('rest')) },
            { buttonId: 'btnUsePill', handler: () => { void this._usePillOnNurtureChild(flow); } },
            { buttonId: 'btnAbandon', handler: act(() => flow.abandon()) },
            { buttonId: 'btnGraduate', handler: act(() => flow.graduate()) },
            { buttonId: 'btnKeepReport', handler: act(() => flow.keepReport()) },
            { buttonId: 'btnRetake', handler: act(() => flow.retake()) },
            { buttonId: 'btnCommitReport', handler: act(() => flow.commitReport()) },
            { buttonId: 'btnDismissReport', handler: () => { flow.dismissReport(); this._refreshNurtureFlow(); } },
        ]);

        const event = services().event;
        this._sessionEventUnsubscribers.push(
            event.on(GAME_SESSION_EVENTS.GeneralUnveiled, (payload?: unknown) => {
                const unveiled = payload as UnveilingEvent | undefined;
                const unveiledGeneral = services().session.roster.find((g) => g.id === unveiled?.generalId);
                const name = unveiledGeneral ? formatGeneralDisplayName(unveiledGeneral.name, unveiledGeneral.title) : '子嗣';
                services().event.emit('SHOW_TOAST', { message: `${name} 滿 5 歲開獎！請到「開獎・培育」選擇宿命`, duration: 3 });
                this._refreshNurtureFlow();
            }),
            event.on(GAME_SESSION_EVENTS.SeasonAdvanced, () => { this._refreshNurtureFlow(); }),
            event.on(GAME_SESSION_EVENTS.Loaded, () => { this._refreshNurtureFlow(); }),
            // 壽命 UI（PROG-2-0074）：武將辭世時提示 UI_DEATH_NOTIFY
            event.on(GAME_SESSION_EVENTS.GeneralDied, (payload?: unknown) => {
                const died = payload as AgingEvent | undefined;
                if (!died) return;
                const diedGeneral = services().session.roster.find((g) => g.id === died.generalId);
                const name = diedGeneral ? formatGeneralDisplayName(diedGeneral.name, diedGeneral.title) : died.generalId;
                // 死亡通知與劇本句合併成一則 toast，避免兩則重疊（PM 裁示，PROG-2-0800）
                const script = this._lifeScriptText('death', name, died.age);
                services().event.emit('SHOW_TOAST', { message: `${formatDeathNotice(name, died.age)}\n${script}`, duration: 4 });
            }),
            // 成長階段劇本句（LIFE-13，PROG-2-0800）：少年、壯年、老年跨入時顯示
            event.on(GAME_SESSION_EVENTS.GeneralGrowthStage, (payload?: unknown) => {
                const grown = payload as AgingEvent | undefined;
                if (!grown?.stage) return;
                const grownGeneral = services().session.roster.find((g) => g.id === grown.generalId);
                const name = grownGeneral ? formatGeneralDisplayName(grownGeneral.name, grownGeneral.title) : grown.generalId;
                this._showLifeScriptToast(grown.stage, name);
            }),
            // 退役劇本句（LIFE-13，PROG-2-0800）：玩家確認退役後顯示
            event.on(GAME_SESSION_EVENTS.GeneralRetired, (payload?: unknown) => {
                const card = payload as { name?: string } | undefined;
                if (!card?.name) return;
                this._showLifeScriptToast('retire', card.name);
            }),
        );
    }

    /** 壽命劇本句：Key 與參數由 LifeScriptCopy 決定，這裡只經 i18n 查字串（PROG-2-0800） */
    private _lifeScriptText(event: LifeScriptEvent, name: string, age?: number): string {
        const copy = lifeScriptCopy(event, name, age);
        return services().i18n.t(copy.key, ...copy.args);
    }

    private _showLifeScriptToast(event: LifeScriptEvent, name: string, age?: number, duration = 3): void {
        services().event.emit('SHOW_TOAST', { message: this._lifeScriptText(event, name, age), duration });
    }

    /**
     * 教官卡詳情畫面（MENT-13 cc 接線）：以 UCUF JSON（mentor-card-detail-screen）組裝，
     * 狀態在 MentorCardDetailController，這裡只綁按鈕與套 view。
     */
    private async _mountMentorCardDetail(): Promise<void> {
        const select = (tab: MentorCardTab): (() => void) => () => {
            this._mentorCardDetail.selectTab(tab);
            this._refreshMentorCardDetail();
        };
        this._mentorCardHost = await this._mountPreviewScreenHost('MentorCardDetailHost', 'mentor-card-detail-screen', [
            { buttonId: 'btnCloseMentorCard', handler: () => { this._closeMentorCardDetail(); } },
            { buttonId: 'btnTabEffects', handler: select('effects') },
            { buttonId: 'btnTabEvents', handler: select('events') },
            { buttonId: 'btnTabStory', handler: select('story') },
        ]);
    }

    /** 開啟某張教官卡的詳情（入口由名冊 / 教官列表接，之後的卡） */
    public openMentorCardDetail(card: MentorCardData, title: string): void {
        const host = this._mentorCardHost;
        if (!host) {
            return;
        }
        this._mentorCardDetail.open(card, title);
        host.node.active = true;
        this._bringNodeToFront(host.node);
        this._refreshMentorCardDetail();
    }

    /**
     * 同名武將版本圖鑑（PROG-2-0708 cc 接線）：以 general-version-gallery-screen 組裝，
     * 狀態在 GeneralVersionGalleryController，這裡只綁按鈕與套 view。
     */
    private async _mountGeneralVersionGallery(): Promise<void> {
        const bindings = [{ buttonId: 'btnCloseGallery', handler: () => { this._closeGeneralVersionGallery(); } }];
        for (let i = 0; i < GALLERY_GROUP_SLOTS; i++) {
            bindings.push({ buttonId: `btnGroup_${i}`, handler: () => this._selectGalleryGroup(i) });
        }
        this._generalGalleryHost = await this._mountPreviewScreenHost('GeneralVersionGalleryHost', 'general-version-gallery-screen', bindings);
        if (this._generalGalleryHost) {
            this._generalGalleryHost.node.active = false;
        }
    }

    /** 開啟圖鑑。版本表與已擁有集合由呼叫端傳入（正式版本資料由企劃提供後接來源）。 */
    public openGeneralVersionGallery(table: GeneralVersionRecord[], owned: ReadonlySet<string>): void {
        const host = this._generalGalleryHost;
        if (!host) {
            return;
        }
        this._generalGallery.open(table, owned);
        host.node.active = true;
        this._bringNodeToFront(host.node);
        this._refreshGeneralVersionGallery();
    }

    private _selectGalleryGroup(index: number): void {
        const bloodlineId = this._generalGallery.getBloodlineIdAt(index);
        if (bloodlineId) {
            this._generalGallery.selectBloodline(bloodlineId);
            this._refreshGeneralVersionGallery();
        }
    }

    private _closeGeneralVersionGallery(): void {
        this._generalGallery.close();
        if (this._generalGalleryHost) {
            this._generalGalleryHost.node.active = false;
        }
    }

    private _refreshGeneralVersionGallery(): void {
        const binder = this._generalGalleryHost?.binder;
        if (!binder) {
            return;
        }
        const view = this._generalGallery.getView();
        applyFlowView(binder, { texts: view.texts, actives: view.actives, enabled: {} });
    }

    private _closeMentorCardDetail(): void {
        this._mentorCardDetail.close();
        if (this._mentorCardHost) {
            this._mentorCardHost.node.active = false;
        }
    }

    private _refreshMentorCardDetail(): void {
        const binder = this._mentorCardHost?.binder;
        if (!binder) {
            return;
        }
        const view = this._mentorCardDetail.getView();
        applyFlowView(binder, { texts: view.texts, actives: view.actives, enabled: {} });
    }

    private _openNurtureFlow(): void {
        const host = this._nurtureFlowHost;
        if (!host) {
            return;
        }
        host.node.active = true;
        this._bringNodeToFront(host.node);
        this._refreshNurtureFlow();
    }

    private _closeNurtureFlow(): void {
        if (this._nurtureFlowHost) {
            this._nurtureFlowHost.node.active = false;
        }
    }

    /** 培育畫面的補元散鈕：對目前選中的子嗣使用一顆補元散，結果以劇本 toast 顯示（PROG-2-0733） */
    private async _usePillOnNurtureChild(flow: NurtureFlowController): Promise<void> {
        const childId = flow.selectedId;
        if (!childId) return;
        const name = services().session.roster.find((g) => g.id === childId)?.name ?? '';
        const pill = new VitalityPillController({ session: services().session, text: breedText() });
        const message = await pill.use(childId, 'vitalityPill', name);
        services().event.emit('SHOW_TOAST', { message, duration: 2 });
        this._refreshNurtureFlow();
    }

    private _refreshNurtureFlow(): void {
        const binder = this._nurtureFlowHost?.binder;
        if (!binder || !this._nurtureFlow) {
            return;
        }
        applyNurtureFlowView(binder, this._nurtureFlow.getView());
    }

    /**
     * 結緣配置畫面：以 UCUF JSON（bonding-setup-screen）執行期組裝。
     * 挑父母、資格、受孕率、EP 預估都在 BondingSetupController（純邏輯），這裡只綁按鈕、套 view。
     */
    private async _mountBondingSetup(): Promise<void> {
        const bonding = new BondingSetupController({
            roster: { getAll: () => services().session.roster },
            breeding: services().breeding,
            prepare: () => services().prepareBreeding(),
            persist: async () => {
                if (services().session.hasSaveService) {
                    await services().session.save();
                }
            },
            spendLifespan: (generalId, command) => services().session.spendLifespan(generalId, command),
            playerDiscoveryLevel: () => services().session.discoveryLevel,
            omenSeed: () => services().session.omenSeed(),
            recordBreeding: (record) => services().session.recordBreedingBirth(record),
            sageRemarks: (fatherId, motherId) => {
                const pool = services().breeding.previewFactorPool(fatherId, motherId);
                const unlocked = Object.keys(SAGES).filter((id) => services().session.isSageUnlocked(id));
                return buildSageRemarks(pool, unlocked, remarkRandomOf(`${fatherId}|${motherId}`));
            },
            text: breedText(),
        });
        this._bonding = bonding;

        this._bondingHost = await this._mountPreviewScreenHost('BondingSetupHost', 'bonding-setup-screen', [
            { buttonId: 'btnCloseBond', handler: () => { this._closeBondingSetup(); } },
            { buttonId: 'btnPrevFather', handler: () => { bonding.cycleFather(-1); this._refreshBondingSetup(); } },
            { buttonId: 'btnNextFather', handler: () => { bonding.cycleFather(1); this._refreshBondingSetup(); } },
            { buttonId: 'btnPrevMother', handler: () => { bonding.cycleMother(-1); this._refreshBondingSetup(); toastPregnantMother(bonding); } },
            { buttonId: 'btnNextMother', handler: () => { bonding.cycleMother(1); this._refreshBondingSetup(); toastPregnantMother(bonding); } },
            { buttonId: 'btnConfirmBond', handler: () => { void this._onClickConfirmBond(); } },
            {
                buttonId: 'btnOpenOracle',
                handler: () => {
                    const couple = bonding.fatherId && bonding.motherId
                        ? { fatherId: bonding.fatherId, motherId: bonding.motherId }
                        : null;
                    this._openSageOracle(bonding.fatherId, couple);
                },
            },
        ]);

        // 父方在左、母方在右，各掛一棵 3 代祖先樹（版面節點 FatherTree / MotherTree）
        this._fatherTree = this._mountTreePanel(this._bondingHost.node, 'FatherTree');
        this._motherTree = this._mountTreePanel(this._bondingHost.node, 'MotherTree');

        const refresh = (): void => { this._refreshBondingSetup(); };
        const event = services().event;
        this._sessionEventUnsubscribers.push(
            event.on(GAME_SESSION_EVENTS.SeasonAdvanced, refresh),
            event.on(GAME_SESSION_EVENTS.Loaded, refresh),
            event.on(GAME_SESSION_EVENTS.RosterChanged, refresh),
        );
    }

    /**
     * 成人禮轉職畫面：以 UCUF JSON（job-change-screen）執行期組裝。
     * 名單、副職選項、資格都在 JobChangeController（純邏輯），這裡只綁按鈕、套 view。
     */
    private async _mountJobChange(): Promise<void> {
        const jobChange = new JobChangeController({
            roster: { getAll: () => services().session.roster },
            ordersOwned: () => services().session.itemCount(ITEM_JOB_CHANGE_ORDER),
            changeJob: (generalId, subClass) => services().session.changeJob(generalId, subClass),
            gems: () => this._localGachaService.getCurrencyAmount('gems'),
            buyOrder: async () => {
                const gacha = this._localGachaService;
                if (!gacha.spendCurrency('gems', JOB_CHANGE_ORDER_OFFER.price)) return false;
                await services().session.addItem(ITEM_JOB_CHANGE_ORDER, 1);
                return true;
            },
        });
        this._jobChange = jobChange;
        this._jobChangeHost = await this._mountPreviewScreenHost('JobChangeHost', 'job-change-screen', [
            { buttonId: 'btnCloseJob', handler: () => { this._closeJobChange(); } },
            { buttonId: 'btnBuyOrder', handler: () => { void this._onClickBuyJobOrder(jobChange); } },
            { buttonId: 'btnPrevGeneral', handler: () => { jobChange.cycleGeneral(-1); this._refreshJobChange(); } },
            { buttonId: 'btnNextGeneral', handler: () => { jobChange.cycleGeneral(1); this._refreshJobChange(); } },
            { buttonId: 'btnSubWarrior', handler: () => { jobChange.selectSubClass('Warrior'); this._refreshJobChange(); } },
            { buttonId: 'btnSubScholar', handler: () => { jobChange.selectSubClass('Scholar'); this._refreshJobChange(); } },
            { buttonId: 'btnConfirmJob', handler: () => { void this._onClickConfirmJob(); } },
        ]);
        this._jobChangeHost.node.active = false;
    }

    /**
     * 大廳內政畫面：以 UCUF JSON（domestic-screen）執行期組裝。
     * 5 大任務的規則與同季鎖定在 DomesticTasks / GameSession，這裡只綁按鈕、套 view。
     */
    private async _mountDomestic(): Promise<void> {
        const gacha = this._localGachaService;
        const domestic = new DomesticPanelController({
            log: () => services().session.domesticLog,
            season: () => services().session.gameTime.totalSeasonsElapsed,
            choose: (taskId: DomesticTaskId) => services().session.chooseDomesticTask(taskId, (amount) => { gacha.grantCurrency('gold', amount); }),
        });
        this._domestic = domestic;
        this._domesticHost = await this._mountPreviewScreenHost('DomesticHost', 'domestic-screen', [
            { buttonId: 'btnClose', handler: () => { this._closeDomestic(); } },
            { buttonId: 'btnFarming', handler: () => { void this._onClickDomesticTask(domestic, 'farming'); } },
            { buttonId: 'btnCommerce', handler: () => { void this._onClickDomesticTask(domestic, 'commerce'); } },
            { buttonId: 'btnDiplomacy', handler: () => { void this._onClickDomesticTask(domestic, 'diplomacy'); } },
            { buttonId: 'btnArms', handler: () => { void this._onClickDomesticTask(domestic, 'arms'); } },
            { buttonId: 'btnScouting', handler: () => { void this._onClickDomesticTask(domestic, 'scouting'); } },
        ]);
        this._domesticHost.node.active = false;
    }

    /**
     * 新手 3 段式引導：首次進大廳且未看完時顯示（PROG-2-0229）。
     * 進度存在 GameSession，每段確認後自動存檔。開場流程本身不在這裡（OPEN-01）。
     */
    private async _mountOnboardingTutorial(): Promise<void> {
        const onboarding = new OnboardingFlowController({
            state: () => services().session.onboarding,
            acknowledge: (segmentId) => services().session.acknowledgeOnboarding(segmentId),
        });
        this._onboarding = onboarding;
        this._onboardingHost = await this._mountPreviewScreenHost('OnboardingTutorialHost', 'onboarding-tutorial-screen', [
            { buttonId: 'btnNextTutorial', handler: () => { void this._onClickNextTutorial(); } },
        ]);
        this._refreshOnboardingTutorial();
    }

    private _refreshOnboardingTutorial(): void {
        const host = this._onboardingHost;
        const onboarding = this._onboarding;
        if (!host || !onboarding) {
            return;
        }
        host.node.active = onboarding.shouldShow();
        if (!host.node.active) {
            return;
        }
        this._bringNodeToFront(host.node);
        applyFlowView(host.binder, onboarding.getFlowView());
    }

    private async _onClickNextTutorial(): Promise<void> {
        if (!this._onboarding) {
            return;
        }
        try {
            await this._onboarding.next();
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 新手引導存檔失敗', error);
        } finally {
            this._refreshOnboardingTutorial();
        }
    }

    /**
     * 大廳任務牆（HALL-03）與武將點位（HALL-07）：以 UCUF JSON（hall-board-screen）執行期組裝。
     * 任務資料載入或驗證失敗時不掛載，HUD 入口保留但開不起來（會在 log 留下原因）。
     */
    private async _mountHallBoard(): Promise<void> {
        await this._loadOfficerTiers();
        const hub = await this._loadLobbyHub();
        if (!hub) {
            return;
        }
        this._lobbyHub = hub;
        this._hallBoard = new HallBoardPanelController({
            hub: () => hub,
            player: () => hallPlayerOf(services().session.officerUnlocks),
            assignments: () => services().session.hallAssignments,
            leadGeneralId: () => services().session.leadGeneralId,
            assign: (taskId, generalId) => this._dispatchHallTask(taskId, generalId),
            refreshSpots: () => services().session.refreshHallSpots(Date.now() / 1000, Math.random),
            displayName: (generalId) => services().session.roster.find((g) => g.id === generalId)?.name ?? generalId,
        });
        const rowBindings = Array.from({ length: HALL_BOARD_MAX_ROWS }, (_, i) => ({
            buttonId: `btnHallRow${i}`,
            handler: () => { void this._onClickHallAccept(i); },
        }));
        this._hallBoardHost = await this._mountPreviewScreenHost('HallBoardHost', 'hall-board-screen', [
            { buttonId: 'btnClose', handler: () => { this._closeHallBoard(); } },
            { buttonId: 'btnHallBoardMilitary', handler: () => { this._switchHallBoard('Military'); } },
            { buttonId: 'btnHallBoardDomestic', handler: () => { this._switchHallBoard('Domestic'); } },
            { buttonId: 'btnHallBoardExpedition', handler: () => { this._switchHallBoard('Expedition'); } },
            ...rowBindings,
        ]);
        this._hallBoardHost.node.active = false;
    }

    /** 傭兵面板（MERC-07）：隱藏掛載，入口待 PM 指定，對外提供 openMercenaryPanel()。 */
    private async _mountMercenaryPanel(): Promise<void> {
        this._mercPanel = new MercenaryPanelController({
            mercenaries: () => services().session.mercenaries.mercenaries,
            info: (state) => {
                const general = this._generals.find(g => g.id === state.generalId);
                return {
                    // 原主與稀有度尚無正式來源（暫定），待企劃定後替換
                    originalOwnerName: '原主未定',
                    generalName: general?.name ?? state.generalId ?? '未知武將',
                    rarity: 'R',
                };
            },
            bondPoints: () => services().session.bondPoints,
            bond: async (uid) => {
                const state = services().session.mercenaries.mercenaries.find(m => m.uid === uid);
                const template = this._generals.find(g => g.id === state?.generalId);
                if (!template) return false;
                const result = await services().session.bondMercenaryToRoster(uid, template);
                return result.ok;
            },
        });
        const rowBindings = Array.from({ length: MERC_PANEL_MAX_ROWS }, (_, i) => ({
            buttonId: `btnMercRow${i}`,
            handler: () => { this._selectMercenary(i); },
        }));
        this._mercPanelHost = await this._mountPreviewScreenHost('MercenaryPanelHost', 'mercenary-panel-screen', [
            { buttonId: 'btnClose', handler: () => { this._closeMercenaryPanel(); } },
            { buttonId: 'btnMercBond', handler: () => { void this._onClickMercenaryBond(); } },
            ...rowBindings,
        ]);
        this._mercPanelHost.node.active = false;
    }

    public openMercenaryPanel(): void {
        const host = this._mercPanelHost;
        if (!host) {
            return;
        }
        host.node.active = true;
        this._bringNodeToFront(host.node);
        this._refreshMercenaryPanel();
    }

    /** 傭兵名牌點擊：先依 uid 選取，再開面板；uid 不在名單時不開。名牌位置由 cc 端決定（PROG-2-0476）。 */
    public openMercenaryPanelFromNameplate(uid: string): void {
        if (!this._mercPanel?.selectUid(uid)) {
            return;
        }
        this.openMercenaryPanel();
    }

    private _closeMercenaryPanel(): void {
        if (this._mercPanelHost) {
            this._mercPanelHost.node.active = false;
        }
    }

    private _selectMercenary(index: number): void {
        this._mercPanel?.select(index);
        this._refreshMercenaryPanel();
    }

    private async _onClickMercenaryBond(): Promise<void> {
        if (!this._mercPanel) {
            return;
        }
        try {
            const ok = await this._mercPanel.bondSelected();
            if (!ok) {
                services().event.emit('SHOW_TOAST', { message: '無法結義此傭兵', duration: 2.5 });
            }
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 傭兵結義失敗', error);
        } finally {
            this._refreshMercenaryPanel();
        }
    }

    private _refreshMercenaryPanel(): void {
        const binder = this._mercPanelHost?.binder;
        if (!binder || !this._mercPanel) {
            return;
        }
        applyFlowView(binder, this._mercPanel.getFlowView());
    }

    /** 紅顏展示（OPEN-10）：隱藏掛載，入口位置待定，對外提供 openRedFaceShowcase()。 */
    private async _mountRedFaceShowcase(): Promise<void> {
        const gachaConfig = await this._loadDataJson<GachaPoolConfigLike[]>('data/gacha-config');
        const supportCards = await this._loadDataJson<RedFaceCardLike[]>('data/support-cards');
        const pools = Array.isArray(gachaConfig) ? gachaConfig : [];
        const supportPool = pools.find(pool => pool.poolType === 'support') ?? null;
        const heroPoolIds = pools
            .filter(pool => pool.poolType === 'hero')
            .flatMap(pool => pool.candidateIds ?? []);
        this._redFace = new RedFaceShowcaseController({
            pool: () => (supportPool ? { candidateIds: supportPool.candidateIds ?? [] } : null),
            cards: () => supportCards ?? [],
            generalPoolIds: () => heroPoolIds,
        });
        const rowBindings = Array.from({ length: RED_FACE_SHOW_MAX_ROWS }, (_, i) => ({
            buttonId: `btnRedFaceRow${i}`,
            handler: () => { this._selectRedFace(i); },
        }));
        this._redFaceHost = await this._mountPreviewScreenHost('RedFaceShowcaseHost', 'red-face-showcase-screen', [
            { buttonId: 'btnClose', handler: () => { this._closeRedFaceShowcase(); } },
            ...rowBindings,
        ]);
        this._redFaceHost.node.active = false;
        // 新手開場第四幕：首戰通過後第一次回大廳自動展示紅顏；展示時就記下，不重複彈
        if (services().session.shouldShowOpeningRedFace) {
            this.openRedFaceShowcase();
            void services().session.markOpeningRedFaceShown();
        }
    }

    public openRedFaceShowcase(): void {
        const host = this._redFaceHost;
        if (!host) {
            return;
        }
        host.node.active = true;
        this._bringNodeToFront(host.node);
        this._refreshRedFaceShowcase();
    }

    private _closeRedFaceShowcase(): void {
        if (this._redFaceHost) {
            this._redFaceHost.node.active = false;
        }
    }

    private _selectRedFace(index: number): void {
        this._redFace?.select(index);
        this._refreshRedFaceShowcase();
    }

    private _refreshRedFaceShowcase(): void {
        const binder = this._redFaceHost?.binder;
        if (!binder || !this._redFace) {
            return;
        }
        applyFlowView(binder, this._redFace.getFlowView());
    }

    /**
     * 新局宿命轉蛋（OPEN-05）：新玩家（沒有存檔）進大廳時先開，鎖定後開新局並存檔。
     * 規則全在 DestinyOpeningController（純邏輯），這裡只綁按鈕、套 FlowView。
     */
    private async _mountDestinyOpening(): Promise<void> {
        const gachaConfig = await this._loadDataJson<GachaConfig[]>('data/gacha-config');
        const heroPool = (Array.isArray(gachaConfig) ? gachaConfig : []).find(pool => pool.poolId === 'hero-pool');
        if (!heroPool) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 找不到 hero-pool 轉蛋設定，略過宿命轉蛋');
            return;
        }
        const session = services().session;
        this._destiny = new DestinyOpeningController({
            config: () => heroPool,
            generals: () => this._generals,
            session,
            random: session.randomSource,
            seed: () => Math.floor(session.randomSource() * 4294967296),
            onStarted: async () => {
                if (session.hasSaveService) {
                    await session.save();
                }
                this._refreshSeasonHud();
            },
        });
        const act = (task: () => Promise<unknown> | unknown): (() => void) => () => {
            void Promise.resolve(task()).then(() => { this._afterDestinyAction(); });
        };
        const rowBindings = Array.from({ length: DESTINY_OPENING_MAX_ROWS }, (_, i) => ({
            buttonId: `btnDestinyRow${i}`,
            handler: act(() => this._destiny?.select(i)),
        }));
        this._destinyHost = await this._mountPreviewScreenHost('DestinyOpeningHost', 'destiny-opening-screen', [
            { buttonId: 'btnDestinyRoll', handler: act(() => this._destiny?.roll()) },
            { buttonId: 'btnDestinyReset', handler: act(() => this._destiny?.reset()) },
            { buttonId: 'btnDestinyConfirm', handler: act(() => this._destiny?.confirm()) },
            ...rowBindings,
        ]);
    }

    public openDestinyOpening(): void {
        const host = this._destinyHost;
        if (!host) {
            return;
        }
        host.node.active = true;
        this._bringNodeToFront(host.node);
        this._refreshDestinyOpening();
    }

    private _afterDestinyAction(): void {
        if (this._destiny?.started && this._destinyHost) {
            this._destinyHost.node.active = false;
            if (destinyLockedEvent(this._destiny.state)) {
                this._openingFlow?.advance(destinyLockedEvent(this._destiny.state)!);
            }
            return;
        }
        this._refreshDestinyOpening();
    }

    private _refreshDestinyOpening(): void {
        const binder = this._destinyHost?.binder;
        if (!binder || !this._destiny) {
            return;
        }
        applyFlowView(binder, this._destiny.getFlowView());
    }

    /**
     * 新玩家開場第一幕（情懷定錨）：沒有存檔時先走 intro 逐頁，翻完才開宿命轉蛋。
     * 幕序在 NewPlayerOpening，這裡只綁按鈕、套 FlowView，並依目前幕開關兩個面板。
     */
    private async _mountOpeningIntro(): Promise<void> {
        this._intro = new OpeningIntroController();
        this._openingFlow = createNewPlayerOpeningFlow();
        this._introHost = await this._mountPreviewScreenHost('OpeningIntroHost', 'opening-intro-screen', [
            { buttonId: 'btnIntroNext', handler: () => { this._onClickIntroNext(); } },
        ]);
        if (this._isNewPlayer) {
            this._openingFlow.start();
            this._showIntro();
        }
    }

    private _showIntro(): void {
        const host = this._introHost;
        if (!host) {
            return;
        }
        host.node.active = true;
        this._bringNodeToFront(host.node);
        this._refreshIntro();
    }

    private _onClickIntroNext(): void {
        if (!this._intro?.next()) {
            this._refreshIntro();
            return;
        }
        // 第一幕結束：離開 intro，進入宿命轉蛋
        this._openingFlow?.advance({ type: OPENING_INTRO_DONE });
        if (this._introHost) {
            this._introHost.node.active = false;
        }
        this.openDestinyOpening();
    }

    private _refreshIntro(): void {
        const binder = this._introHost?.binder;
        if (!binder || !this._intro) {
            return;
        }
        applyFlowView(binder, this._intro.getFlowView());
    }

    private _loadDataJson<T>(path: string): Promise<T | null> {
        return new Promise((resolve) => {
            resources.load<JsonAsset>(path, JsonAsset, (err, asset) => {
                if (err || !asset) {
                    UCUFLogger.warn(LogCategory.DATA, `[LobbyScene] 資料載入失敗：${path}`, err);
                    resolve(null);
                    return;
                }
                resolve(asset.json as T);
            });
        });
    }

    /** 官職階位資料檔（OFC-01）：驗證通過才覆寫晉升門檻；失敗保留內建備援並記 log。 */
    private _loadOfficerTiers(): Promise<void> {
        return new Promise((resolve) => {
            resources.load<JsonAsset>('data/officer-tiers', JsonAsset, (err, asset) => {
                if (err || !asset) {
                    UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 官職階位資料載入失敗，沿用內建門檻', err);
                    resolve();
                    return;
                }
                const result = installOfficerTierTable(asset.json);
                if (!result.ok) {
                    UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 官職階位資料驗證失敗，沿用內建門檻', (result as { ok: false; issues: string[] }).issues);
                }
                resolve();
            });
        });
    }

    private _loadLobbyHub(): Promise<LobbyHub | null> {
        return new Promise((resolve) => {
            resources.load<JsonAsset>('data/lobby-hub', JsonAsset, (err, asset) => {
                if (err || !asset) {
                    UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 大廳任務資料載入失敗', err);
                    resolve(null);
                    return;
                }
                const result = loadLobbyHub(asset.json);
                if (!result.ok) {
                    UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 大廳任務資料驗證失敗', result.issues);
                    resolve(null);
                    return;
                }
                resolve(result.hub);
            });
        });
    }

    /** 開啟任務牆；傳入 board 時直接切到該牆（天下沙盤入口走 Expedition）。 */
    private _openHallBoard(board?: HallBoardKey): void {
        const host = this._hallBoardHost;
        if (!host) {
            return;
        }
        if (board) {
            this._hallBoard?.switchBoard(board);
        }
        host.node.active = true;
        this._bringNodeToFront(host.node);
        this._refreshHallBoard();
    }

    /** 天下沙盤入口：官職未達沙盤階段（S1 起於階位 3）時只提示，不開牆 */
    private _onClickOpenSandtable(): void {
        if (!services().session.officerUnlocks.sandtableStage) {
            services().event.emit('SHOW_TOAST', { message: '官職尚未達沙盤階段，暫時無法進入天下沙盤', duration: 2.5 });
            return;
        }
        this._openHallBoard('Expedition');
    }

    private _closeHallBoard(): void {
        if (this._hallBoardHost) {
            this._hallBoardHost.node.active = false;
        }
    }

    private _switchHallBoard(board: HallBoardKey): void {
        this._hallBoard?.switchBoard(board);
        this._refreshHallBoard();
    }

    private _refreshHallBoard(): void {
        const binder = this._hallBoardHost?.binder;
        if (!binder || !this._hallBoard) {
            return;
        }
        applyFlowView(binder, this._hallBoard.getFlowView());
    }

    /** 大廳任務派遣：找出目前牆面的任務，交給 GameSession 判定並結算。 */
    private async _dispatchHallTask(taskId: string, generalId: string): Promise<boolean> {
        const board = this._hallBoard?.board;
        const hub = this._lobbyHub;
        if (!board || !hub) {
            return false;
        }
        const task = hub.Mission_Boards[board as keyof typeof hub.Mission_Boards]?.Tasks.find((t) => t.Task_ID === taskId);
        if (!task) {
            return false;
        }
        const session = services().session;
        const general = session.roster.find((g) => g.id === generalId);
        const power = general ? estimateSortiePower(general) : 0;
        const result = await session.dispatchHallTask(task, board, hallPlayerOf(session.officerUnlocks), generalId, power);
        if (!result.ok) {
            return false;
        }
        services().event.emit('SHOW_TOAST', { message: result.outcome.success ? '任務成功' : '任務失敗', duration: 2.5 });
        return true;
    }

    private async _onClickHallAccept(index: number): Promise<void> {
        if (!this._hallBoard) {
            return;
        }
        try {
            const onExpedition = this._hallBoard.board === 'Expedition';
            const ok = await this._hallBoard.accept(index);
            const leadId = services().session.leadGeneralId;
            if (ok && onExpedition && leadId) {
                services().session.startTravel(leadId, EXPEDITION_TRAVEL_TURNS);
            }
            if (!ok) {
                services().event.emit('SHOW_TOAST', { message: '無法接取此任務', duration: 2.5 });
            }
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 接取大廳任務失敗', error);
        } finally {
            this._refreshHallBoard();
        }
    }

    private async _onClickBuyJobOrder(jobChange: JobChangeController): Promise<void> {
        try {
            await jobChange.buyOrder();
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 購買轉職令失敗', error);
        } finally {
            this._refreshJobChange();
        }
    }

    private _openJobChange(): void {
        const host = this._jobChangeHost;
        if (!host) {
            return;
        }
        host.node.active = true;
        this._bringNodeToFront(host.node);
        this._refreshJobChange();
    }

    private _openDomestic(): void {
        const host = this._domesticHost;
        if (!host) {
            return;
        }
        host.node.active = true;
        this._bringNodeToFront(host.node);
        this._refreshDomestic();
    }

    private _closeDomestic(): void {
        if (this._domesticHost) {
            this._domesticHost.node.active = false;
        }
    }

    private _refreshDomestic(): void {
        const binder = this._domesticHost?.binder;
        if (!binder || !this._domestic) {
            return;
        }
        applyFlowView(binder, this._domestic.getFlowView());
    }

    private async _onClickDomesticTask(domestic: DomesticPanelController, taskId: DomesticTaskId): Promise<void> {
        try {
            await domestic.choose(taskId);
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 內政任務失敗', error);
            services().event.emit('SHOW_TOAST', { message: error instanceof Error ? error.message : '內政任務失敗', duration: 2.5 });
        } finally {
            this._refreshDomestic();
        }
    }

    private _closeJobChange(): void {
        if (this._jobChangeHost) {
            this._jobChangeHost.node.active = false;
        }
    }

    private _refreshJobChange(): void {
        const binder = this._jobChangeHost?.binder;
        if (!binder || !this._jobChange) {
            return;
        }
        applyFlowView(binder, this._jobChange.getFlowView());
    }

    private async _onClickConfirmJob(): Promise<void> {
        if (!this._jobChange) {
            return;
        }
        try {
            await this._jobChange.confirm();
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 轉職失敗', error);
            services().event.emit('SHOW_TOAST', { message: error instanceof Error ? error.message : '轉職失敗', duration: 2.5 });
        } finally {
            this._refreshJobChange();
        }
    }

    private async _openBondingSetup(): Promise<void> {
        const host = this._bondingHost;
        if (!host || !this._bonding) {
            return;
        }
        host.node.active = true;
        this._bringNodeToFront(host.node);
        this._refreshBondingSetup();
        await this._bonding.open();
        this._refreshBondingSetup();
    }

    private _closeBondingSetup(): void {
        if (this._bondingHost) {
            this._bondingHost.node.active = false;
        }
    }

    private _refreshBondingSetup(): void {
        const binder = this._bondingHost?.binder;
        if (!binder || !this._bonding) {
            return;
        }
        const view = this._bonding.getView();
        applyFlowView(binder, view);
        this._syncTreePanel(this._fatherTree, view.fatherId);
        this._syncTreePanel(this._motherTree, view.motherId);
    }

    /** 在版面節點上掛 BloodlineTreePanel，並把 Gen1~3 容器接上；找不到節點時回傳 null（不擋畫面） */
    private _mountTreePanel(root: Node, nodeName: string): BloodlineTreePanel | null {
        const treeRoot = this._findChildByName(root, nodeName);
        if (!treeRoot) return null;
        let panel = treeRoot.getComponent(BloodlineTreePanel);
        if (!panel) panel = treeRoot.addComponent(BloodlineTreePanel);
        panel.gen3Container = this._findChildByName(treeRoot, 'Gen3Container');
        panel.gen2Container = this._findChildByName(treeRoot, 'Gen2Container');
        panel.gen1Container = this._findChildByName(treeRoot, 'Gen1Container');
        panel.clear();
        return panel;
    }

    private _syncTreePanel(panel: BloodlineTreePanel | null, uid: string | null): void {
        if (!panel) return;
        if (uid) {
            void panel.loadForGeneral(uid);
        } else {
            panel.clear();
        }
    }

    private _findChildByName(root: Node, name: string): Node | null {
        for (const child of root.children) {
            if (child.name === name) return child;
            const found = this._findChildByName(child, name);
            if (found) return found;
        }
        return null;
    }

    private async _onClickConfirmBond(): Promise<void> {
        if (!this._bonding) {
            return;
        }
        try {
            const result = await this._bonding.confirm();
            if (result.outcome === 'conceived' && result.child) {
                // 結緣的動態關係（夫妻、親子）：KIN-06，有新增才自動存檔
                await services().session.recordBreedingRelations(result.father.id, result.mother.id, result.child.id);
                // 子嗣加入名冊：出戰清單與培育畫面跟著刷新
                this._refreshLeadSelect();
                this._refreshNurtureFlow();
            }
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 結緣失敗', error);
            services().event.emit('SHOW_TOAST', { message: error instanceof Error ? error.message : '結緣失敗', duration: 2.5 });
        } finally {
            this._refreshBondingSetup();
        }
    }

    /**
     * 名士占卜畫面：以 UCUF JSON（sage-oracle-screen）執行期組裝，從結緣畫面開啟並預選父方。
     * 挑對象、換名士、求籤令檢查都在 SageOracleController（純邏輯），這裡只綁按鈕、套 view。
     */
    private async _mountSageOracle(): Promise<void> {
        const oracle = new SageOracleController({
            roster: { getAll: () => services().session.roster },
            session: services().session,
            breeding: services().breeding,
        });
        this._oracle = oracle;

        this._oracleHost = await this._mountPreviewScreenHost('SageOracleHost', 'sage-oracle-screen', [
            { buttonId: 'btnCloseOracle', handler: () => { this._closeSageOracle(); } },
            { buttonId: 'btnPrevTarget', handler: () => { oracle.cycleTarget(-1); this._refreshSageOracle(); } },
            { buttonId: 'btnNextTarget', handler: () => { oracle.cycleTarget(1); this._refreshSageOracle(); } },
            { buttonId: 'btnPrevSage', handler: () => { oracle.cycleSage(-1); this._refreshSageOracle(); } },
            { buttonId: 'btnNextSage', handler: () => { oracle.cycleSage(1); this._refreshSageOracle(); } },
            { buttonId: 'btnDivine', handler: () => { void this._onClickDivine(); } },
            { buttonId: 'btnPredict', handler: () => { void this._onClickPredict(); } },
        ]);

        const refresh = (): void => { this._refreshSageOracle(); };
        const event = services().event;
        this._sessionEventUnsubscribers.push(
            event.on(GAME_SESSION_EVENTS.SeasonAdvanced, refresh),
            event.on(GAME_SESSION_EVENTS.Loaded, refresh),
            event.on(GAME_SESSION_EVENTS.RosterChanged, refresh),
            event.on(GAME_SESSION_EVENTS.InventoryChanged, refresh),
        );
    }

    /**
     * 俘虜四選一彈窗（PROG-2-0082）：戰勝帶回的俘虜在回到大廳時跳出處置；「稍後」關掉，下次進大廳再問。
     * 選項能否按、扣黃金都在 PrisonerPopupController（純邏輯），這裡只綁按鈕、套 view。
     */
    private async _mountPrisonerPopup(): Promise<void> {
        const gacha = this._localGachaService;
        const prisoner = new PrisonerPopupController({
            session: services().session,
            wallet: {
                gold: () => gacha.getCurrencyAmount('gold'),
                spendGold: (amount) => gacha.spendCurrency('gold', amount),
            },
        });
        this._prisoner = prisoner;

        const decide = (decision: PowDecision): void => { void this._onClickPrisonerDecision(decision); };
        this._prisonerHost = await this._mountPreviewScreenHost('PrisonerPopupHost', 'prisoner-popup-screen', [
            { buttonId: 'btnClosePow', handler: () => { this._closePrisonerPopup(); } },
            { buttonId: 'btnPrevPow', handler: () => { prisoner.cycle(-1); this._refreshPrisonerPopup(); } },
            { buttonId: 'btnNextPow', handler: () => { prisoner.cycle(1); this._refreshPrisonerPopup(); } },
            { buttonId: 'btnPersuade', handler: () => { decide('persuade'); } },
            { buttonId: 'btnRecruit', handler: () => { decide('recruit'); } },
            { buttonId: 'btnImprison', handler: () => { decide('imprison'); } },
            { buttonId: 'btnRelease', handler: () => { decide('release'); } },
        ]);
    }

    private _openPrisonerPopupIfPending(): void {
        const host = this._prisonerHost;
        if (!host || !this._prisoner?.hasPending()) {
            return;
        }
        this._prisoner.open();
        host.node.active = true;
        this._bringNodeToFront(host.node);
        this._refreshPrisonerPopup();
    }

    private _closePrisonerPopup(): void {
        if (this._prisonerHost) {
            this._prisonerHost.node.active = false;
        }
    }

    /** 年報畫面（UI_YEAR_REPORT，TIME-07）：年末 YearEnded 時彈出，文字走 zh-TW 預設退回 */
    private async _mountYearReport(): Promise<void> {
        this._yearReportHost = await this._mountPreviewScreenHost('YearReportHost', 'year-report-screen', [
            { buttonId: 'btnCloseYearReport', handler: () => { this._closeYearReport(); } },
        ]);
        this._sessionEventUnsubscribers.push(
            services().event.on(GAME_SESSION_EVENTS.YearEnded, (payload?: unknown) => {
                this._openYearReport(payload as YearReport | undefined);
            }),
        );
    }

    private _openYearReport(report: YearReport | undefined): void {
        const host = this._yearReportHost;
        if (!host || !report) {
            return;
        }
        const lookup = withYearReportFallback((key, ...args) => services().i18n.t(key, ...args));
        host.binder.setTexts(buildYearReportTexts(report, lookup));
        host.node.active = true;
        this._bringNodeToFront(host.node);
    }

    private _closeYearReport(): void {
        if (this._yearReportHost) {
            this._yearReportHost.node.active = false;
        }
    }

    private _refreshPrisonerPopup(): void {
        const binder = this._prisonerHost?.binder;
        if (!binder || !this._prisoner) {
            return;
        }
        applyFlowView(binder, this._prisoner.getView());
    }

    private async _onClickPrisonerDecision(decision: PowDecision): Promise<void> {
        if (!this._prisoner) {
            return;
        }
        try {
            await this._prisoner.decide(decision);
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 俘虜處置失敗', error);
            services().event.emit('SHOW_TOAST', { message: error instanceof Error ? error.message : '俘虜處置失敗', duration: 2.5 });
        } finally {
            this._refreshPrisonerPopup();
        }
    }

    /**
     * 退役回顧面板：以 UCUF JSON（retire-review-screen）執行期組裝。退役成功後名冊發出開啟事件，
     * 這裡用退役前的武將快照組文字；文字組句在 RetireReviewController（純邏輯），這裡只綁按鈕、套 view。
     */
    private async _mountRetireReview(): Promise<void> {
        this._retireReviewHost = await this._mountPreviewScreenHost('RetireReviewHost', 'retire-review-screen', [
            { buttonId: 'btnCloseRetire', handler: () => { this._closeRetireReview(); } },
        ]);
        this._sessionEventUnsubscribers.push(
            services().event.on(RETIRE_REVIEW_OPEN_EVENT, (payload?: unknown) => {
                const general = (payload as RetireReviewOpenPayload | undefined)?.general;
                if (general) {
                    this._openRetireReview(general);
                }
            }),
        );
    }

    private _openRetireReview(general: GeneralConfig): void {
        const host = this._retireReviewHost;
        const binder = host?.binder;
        if (!host || !binder) {
            return;
        }
        const lookup = withRetireReviewFallback((key, ...args) => services().i18n.t(key, ...args));
        applyFlowView(binder, { texts: buildRetireReviewTexts(general, lookup), actives: {}, enabled: {} });
        host.node.active = true;
        this._bringNodeToFront(host.node);
    }

    /**
     * 英靈圖鑑（PROG-2-0803）：以 UCUF JSON（spirit-codex-screen）組裝，從季度 HUD 的「英靈」鈕開啟。
     * 英靈卡從歸檔層讀取（異步），列表文字在 SpiritCodexController（純邏輯）。
     */
    private async _mountSpiritCodex(): Promise<void> {
        this._spiritCodexHost = await this._mountPreviewScreenHost('SpiritCodexHost', 'spirit-codex-screen', [
            { buttonId: 'btnCloseSpiritCodex', handler: () => { this._closeSpiritCodex(); } },
        ]);
    }

    private async _openSpiritCodex(): Promise<void> {
        const host = this._spiritCodexHost;
        const binder = host?.binder;
        if (!host || !binder) {
            return;
        }
        const cards = (await services().legacy?.getArchiver().getAllSpiritCards()) ?? [];
        const lookup = withSpiritCodexFallback((key, ...args) => services().i18n.t(key, ...args));
        applyFlowView(binder, { texts: buildSpiritCodexTexts(cards, lookup), actives: {}, enabled: {} });
        host.node.active = true;
        this._bringNodeToFront(host.node);
    }

    private _closeSpiritCodex(): void {
        if (this._spiritCodexHost) {
            this._spiritCodexHost.node.active = false;
        }
    }

    private _closeRetireReview(): void {
        if (this._retireReviewHost) {
            this._retireReviewHost.node.active = false;
        }
    }

    private _openSageOracle(preferredTargetId: string | null, couple: OracleCouple | null = null): void {
        const host = this._oracleHost;
        if (!host || !this._oracle) {
            return;
        }
        this._oracle.open(preferredTargetId, couple);
        host.node.active = true;
        this._bringNodeToFront(host.node);
        this._refreshSageOracle();
    }

    private _closeSageOracle(): void {
        if (this._oracleHost) {
            this._oracleHost.node.active = false;
        }
    }

    private _refreshSageOracle(): void {
        const binder = this._oracleHost?.binder;
        if (!binder || !this._oracle) {
            return;
        }
        applyFlowView(binder, this._oracle.getView());
    }

    private async _onClickDivine(): Promise<void> {
        if (!this._oracle) {
            return;
        }
        try {
            await this._oracle.divine();
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 名士占卜失敗', error);
            services().event.emit('SHOW_TOAST', { message: error instanceof Error ? error.message : '名士占卜失敗', duration: 2.5 });
        } finally {
            this._refreshSageOracle();
        }
    }

    private async _onClickPredict(): Promise<void> {
        if (!this._oracle) {
            return;
        }
        try {
            await this._oracle.predict();
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 預言子嗣失敗', error);
            services().event.emit('SHOW_TOAST', { message: error instanceof Error ? error.message : '預言子嗣失敗', duration: 2.5 });
        } finally {
            this._refreshSageOracle();
        }
    }

    /** 最小選卡 UI：以 UCUF JSON（lobby-deck-select-screen）執行期組裝，點卡加入 / 移除出戰卡組 */
    private async _mountDeckSelect(): Promise<void> {
        const bindings: ScreenButtonBinding[] = Array.from({ length: DECK_SELECT_SLOTS }, (_, slot) => ({
            buttonId: `btnDeckCard${slot}`,
            handler: () => { void this._onClickDeckCard(slot); },
        }));
        this._deckSelectHost = await this._mountPreviewScreenHost('DeckSelectHost', 'lobby-deck-select-screen', bindings);
        this._refreshDeckSelect();
        const refresh = (): void => { this._refreshDeckSelect(); };
        const event = services().event;
        this._sessionEventUnsubscribers.push(
            event.on(GAME_SESSION_EVENTS.DeckChanged, refresh),
            event.on(GAME_SESSION_EVENTS.Loaded, refresh),
        );
    }

    private _refreshDeckSelect(): void {
        const binder = this._deckSelectHost?.binder;
        if (!binder) {
            return;
        }
        const deck = services().session.deck;
        const cards = getTallyCardSummaries();
        const texts: Record<string, string> = {
            deckTitleLabel: `出戰卡組 ${deck.length}/${PLAYER_DECK_MAX_SIZE}`,
        };
        const actives: Record<string, boolean> = {};
        for (let slot = 0; slot < DECK_SELECT_SLOTS; slot++) {
            const card = cards[slot];
            texts[`deckCardLabel${slot}`] = card ? `${deck.includes(card.id) ? '✓' : '　'} ${card.name}（${card.sub}）` : '－';
            actives[`btnDeckCard${slot}`] = card !== undefined;
        }
        binder.setTexts(texts);
        binder.setActives(actives);
    }

    private async _onClickDeckCard(slot: number): Promise<void> {
        const cards = getTallyCardSummaries();
        const card = cards[slot];
        if (!card) {
            return;
        }
        try {
            const outcome = await services().session.toggleDeckCard(card.id, cards.map((entry) => entry.id));
            if (outcome === 'full') {
                services().event.emit('SHOW_TOAST', { message: `卡組已滿（上限 ${PLAYER_DECK_MAX_SIZE} 張）`, duration: 1.8 });
            }
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 卡組存檔失敗', error);
            services().event.emit('SHOW_TOAST', { message: '卡組存檔失敗，請稍後再試', duration: 2 });
        }
    }

    /** 選主將 UI：以 UCUF JSON（lobby-lead-select-screen）執行期組裝，列出可出戰武將，點選指定 / 再點取消 */
    private async _mountLeadSelect(): Promise<void> {
        const bindings: ScreenButtonBinding[] = [
            ...Array.from({ length: LEAD_SELECT_PAGE_SIZE }, (_, slot) => ({
                buttonId: `btnLeadGeneral${slot}`,
                handler: () => { void this._onClickLeadGeneral(slot); },
            })),
            { buttonId: 'btnLeadPage', handler: () => { this._leadSelectPage += 1; this._refreshLeadSelect(); } },
            { buttonId: 'btnOpenSortie', handler: () => { this._openSortieSetup(); } },
        ];
        this._leadSelectHost = await this._mountPreviewScreenHost('LeadSelectHost', 'lobby-lead-select-screen', bindings);
        this._refreshLeadSelect();
        const refresh = (): void => { this._refreshLeadSelect(); };
        const event = services().event;
        this._sessionEventUnsubscribers.push(
            event.on(GAME_SESSION_EVENTS.LeadGeneralChanged, refresh),
            event.on(GAME_SESSION_EVENTS.BattleSettled, refresh),
            event.on(GAME_SESSION_EVENTS.SeasonAdvanced, refresh),
            event.on(GAME_SESSION_EVENTS.RosterChanged, refresh),
            event.on(GAME_SESSION_EVENTS.Loaded, refresh),
        );
    }

    /**
     * 出征編制畫面（PROG-2-0083）：從選主將卡片開啟，挑參謀官 / 後勤官。
     * 候選與加成都在 SortieSetupController（純邏輯），這裡只綁按鈕、套 view。
     */
    private async _mountSortieSetup(): Promise<void> {
        // 守方 = 大廳開戰用的當前關卡敵將（與開戰時取的 _currentEncounter() 同一來源）
        const sortie = new SortieSetupController({
            session: services().session,
            getEnemyGeneral: () => {
                const enemyId = this._currentEncounter()?.enemyGeneralId;
                return enemyId ? this._generals.find((g) => g.id === enemyId) ?? null : null;
            },
            // 編制預設（DEP-14）：寫入 GameSession，隨存檔保存
            presets: {
                get: () => services().session.sortiePresets,
                set: (store) => { void services().session.setSortiePresets(store); },
            },
        });
        this._sortie = sortie;
        const step = (role: SortieRole, delta: number): void => { sortie.cycle(role, delta); this._refreshSortieSetup(); };
        this._sortieHost = await this._mountPreviewScreenHost('SortieSetupHost', 'sortie-setup-screen', [
            { buttonId: 'btnCloseSortie', handler: () => { this._closeSortieSetup(); } },
            { buttonId: 'btnPrevStrategist', handler: () => { step('strategist', -1); } },
            { buttonId: 'btnNextStrategist', handler: () => { step('strategist', 1); } },
            { buttonId: 'btnClearStrategist', handler: () => { sortie.clear('strategist'); this._refreshSortieSetup(); } },
            { buttonId: 'btnPrevDeputy', handler: () => { step('deputy', -1); } },
            { buttonId: 'btnNextDeputy', handler: () => { step('deputy', 1); } },
            { buttonId: 'btnClearDeputy', handler: () => { sortie.clear('deputy'); this._refreshSortieSetup(); } },
            { buttonId: 'btnSavePreset', handler: () => { sortie.savePreset(); this._refreshSortieSetup(); } },
            { buttonId: 'btnApplyPreset', handler: () => { sortie.applyPreset(); this._refreshSortieSetup(); } },
        ]);
        const refresh = (): void => { this._refreshSortieSetup(); };
        const event = services().event;
        this._sessionEventUnsubscribers.push(
            event.on(GAME_SESSION_EVENTS.LeadGeneralChanged, refresh),
            event.on(GAME_SESSION_EVENTS.RosterChanged, refresh),
            event.on(GAME_SESSION_EVENTS.BattleSettled, refresh),
            event.on(GAME_SESSION_EVENTS.Loaded, refresh),
        );
    }

    private _openSortieSetup(): void {
        const host = this._sortieHost;
        if (!host || !this._sortie) {
            return;
        }
        this._sortie.open();
        host.node.active = true;
        this._bringNodeToFront(host.node);
        this._refreshSortieSetup();
    }

    private _closeSortieSetup(): void {
        if (this._sortieHost) {
            this._sortieHost.node.active = false;
        }
    }

    private _refreshSortieSetup(): void {
        const binder = this._sortieHost?.binder;
        if (!binder || !this._sortie || !this._sortieHost?.node.active) {
            return;
        }
        applyFlowView(binder, this._sortie.getView());
    }

    private _currentLeadView(): ReturnType<typeof buildLeadSelectView> {
        const session = services().session;
        return buildLeadSelectView(session.getDeployableGenerals(), session.leadGeneralId, this._leadSelectPage);
    }

    private _refreshLeadSelect(): void {
        const binder = this._leadSelectHost?.binder;
        if (!binder) {
            return;
        }
        let view = this._currentLeadView();
        this._leadSelectPage = view.page;
        const lead = services().session.leadGeneralId;
        const leadName = view.rows.find((row) => row.id === lead)?.label;
        const texts: Record<string, string> = {
            leadTitleLabel: `出戰主將：${leadName ?? (lead ? '（不可出戰）' : '預設')}`,
            leadPageLabel: `換頁 ▶ ${view.page + 1}/${view.pageCount}`,
        };
        const actives: Record<string, boolean> = { btnLeadPage: view.pageCount > 1 };
        for (let slot = 0; slot < LEAD_SELECT_PAGE_SIZE; slot++) {
            const row = view.rows[slot];
            texts[`leadGeneralLabel${slot}`] = row ? `${row.selected ? '✓' : '　'} ${row.label}` : '－';
            actives[`btnLeadGeneral${slot}`] = row !== undefined;
        }
        binder.setTexts(texts);
        binder.setActives(actives);
    }

    private async _onClickLeadGeneral(slot: number): Promise<void> {
        const row = this._currentLeadView().rows[slot];
        if (!row) {
            return;
        }
        try {
            await services().session.setLeadGeneral(nextLeadId(services().session.leadGeneralId, row.id));
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 主將存檔失敗', error);
            services().event.emit('SHOW_TOAST', { message: '主將存檔失敗，請稍後再試', duration: 2 });
        }
    }

    private async _onClickAdvanceSeason(): Promise<void> {
        try {
            const { advance, agingEvents } = await services().session.advanceSeason();
            const died = agingEvents.filter((event) => event.type === 'died').length;
            const suffix = died > 0 ? `（${died} 位武將離世）` : '';
            services().event.emit('SHOW_TOAST', {
                message: `進入${seasonText(advance.current)}${suffix}`,
                duration: 2,
            });
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 推進季度失敗', error);
            services().event.emit('SHOW_TOAST', { message: '推進季度失敗', duration: 2 });
        }
    }

    /** 抽卡成功：新武將寫進名冊並存檔，重複的只提示不重複加入 */
    private async _onGachaPullSuccess(results: LocalGachaResultEntry[]): Promise<void> {
        try {
            // 只有支援卡池抽到的支援卡武將才產生 Gacha 教官卡（PROG-2-0506，PM 裁定）
            const catalog = await this._loadSupportCatalog();
            await services().legacy?.addGachaMentors(
                results.map((entry) => entry.general),
                catalog,
                services().session.gameTime,
                results[0]?.poolId,
            );
            const { added, duplicates, rebirths } = await services().session.addGenerals(results.map((entry) => entry.general), { rebirthOnDuplicate: true });
            const parts: string[] = [];
            if (added.length > 0) {
                parts.push(`新增 ${added.length} 位武將入名冊`);
            }
            if (rebirths.length > 0) {
                const overflow = rebirths.filter((entry) => entry.overflow).length;
                parts.push(`${rebirths.length - overflow} 位轉生`);
                if (overflow > 0) parts.push(`${overflow} 位滿轉溢出`);
            } else if (duplicates.length > 0) {
                parts.push(`${duplicates.length} 位已持有`);
            }
            if (parts.length > 0) {
                services().event.emit('SHOW_TOAST', { message: parts.join('，'), duration: 2.2 });
            }
        } catch (error) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] 抽卡結果寫入名冊 / 存檔失敗', error);
            services().event.emit('SHOW_TOAST', { message: '武將存檔失敗，請稍後再試', duration: 2.5 });
        }
    }

    private async _mountLobbyMainHub(): Promise<void> {
        const hostNode = this.node.getChildByName('LobbyMainHost') ?? new Node('LobbyMainHost');
        hostNode.active = false; // 先隱藏，避免 showScreen 期間閃屏
        hostNode.layer = this.node.layer;
        if (!hostNode.parent) {
            hostNode.parent = this.node;
        }

        this._ensureWidget(hostNode);
        const backgroundIndex = this.node.getChildByName('Background')?.getSiblingIndex() ?? -1;
        hostNode.setSiblingIndex(Math.max(backgroundIndex + 1, 0));

        this._lobbyMainHost = hostNode.getComponent(UIScreenPreviewHost) ?? hostNode.addComponent(UIScreenPreviewHost);
        await this._lobbyMainHost.showScreen('lobby-main-screen');

        this._configureLobbyMainHub(this._lobbyMainHost.binder);
        hostNode.active = false;
    }

    private _configureLobbyMainHub(binder: UITemplateBinder | null): void {
        const generalsButton = binder?.getButton('btnGenerals');
        const battleButton = binder?.getButton('btnBattle');
        const shopButton = binder?.getButton('btnShop');
        const gachaButton = binder?.getButton('btnGacha');
        const supportCardButton = binder?.getButton('btnSupportCard');
        const floodBattleButton = binder?.getButton('btnFloodBattle');
        const spiritFamilyOverviewButton = binder?.getButton('DispatchBoardActionButton');

        if (!binder || !generalsButton || !battleButton || !shopButton || !gachaButton || !supportCardButton || !floodBattleButton) {
            UCUFLogger.error(LogCategory.LIFECYCLE, '[LobbyScene] lobby-main-screen 缺少 btnGenerals / btnBattle / btnShop / btnGacha / btnSupportCard / btnFloodBattle 綁定');
            return;
        }

        generalsButton.node.off(Button.EventType.CLICK, this.onClickGeneralList, this);
        generalsButton.node.on(Button.EventType.CLICK, this.onClickGeneralList, this);

        battleButton.node.off(Button.EventType.CLICK, this.onClickEnterBattle, this);
        battleButton.node.on(Button.EventType.CLICK, this.onClickEnterBattle, this);

        shopButton.node.off(Button.EventType.CLICK, this.onClickShopMain, this);
        shopButton.node.on(Button.EventType.CLICK, this.onClickShopMain, this);

        gachaButton.node.off(Button.EventType.CLICK, this.onClickGachaMain, this);
        gachaButton.node.on(Button.EventType.CLICK, this.onClickGachaMain, this);

        supportCardButton.node.off(Button.EventType.CLICK, this.onClickSupportCard, this);
        supportCardButton.node.on(Button.EventType.CLICK, this.onClickSupportCard, this);

        floodBattleButton.node.off(Button.EventType.CLICK, this.onClickFloodBattle, this);
        floodBattleButton.node.on(Button.EventType.CLICK, this.onClickFloodBattle, this);

        if (spiritFamilyOverviewButton) {
            spiritFamilyOverviewButton.node.off(Button.EventType.CLICK, this.onClickSpiritFamilyOverview, this);
            spiritFamilyOverviewButton.node.on(Button.EventType.CLICK, this.onClickSpiritFamilyOverview, this);
        }

        binder.setTexts({
            HeroWallTitle: '世家巡檢',
            DailyTitle: '今日世家總覽',
            DailyBody: '從君主層統覽麾下所有世家、主卡狀態與家族深度，再決定要進入哪一支。',
            DispatchBoardTitle: '世家總覽入口',
            DispatchBoardBody: '先看總覽，再進各家的英靈陳列室；武將命頁只在已形成分支時提供捷徑。',
            DispatchBoardActionLabel: '前往世家總覽',
        });
    }

    private async _mountSecondaryMainHubs(): Promise<void> {
        this._shopMainHost = await this._mountPreviewScreenHost('ShopMainHost', 'shop-main-screen', [
            { buttonId: 'btnClose', handler: () => { void services().ui.goBack(); } },
        ]);

        this._gachaHost = await this._mountPreviewScreenHost('GachaHost', GACHA_SCREEN_ID, []);
        attachCurrencyCheatPanel(this._localGachaService, undefined, () => { PlayerRosterService.clear(); }, () => {
            this._refreshWalletPreviewState();
        });
        this._refreshWalletPreviewState();

        this._spiritFamilyOverviewHost = await this._mountPreviewScreenHost('SpiritFamilyOverviewHost', 'bloodline-mirror-loading-screen', [
            { buttonId: 'PrimaryActionButton', handler: () => { void services().ui.goBack(); } },
        ]);

        this._bloodlineMirrorLoadingHost = await this._mountPreviewScreenHost('BloodlineMirrorLoadingHost', 'bloodline-mirror-loading-screen', [
            { buttonId: 'PrimaryActionButton', handler: () => { void services().ui.goBack(); } },
        ]);

        this._bloodlineMirrorAwakeningHost = await this._mountPreviewScreenHost('BloodlineMirrorAwakeningHost', 'bloodline-mirror-awakening-screen', [
            { buttonId: 'PrimaryActionButton', handler: () => { void services().ui.goBack(); } },
        ]);
    }

    private async _mountEliteTroopCodexPanel(): Promise<void> {
        const panelNode = this.node.getChildByName('EliteTroopCodexComposite') ?? new Node('EliteTroopCodexComposite');
        panelNode.layer = this.node.layer;
        if (!panelNode.parent) {
            panelNode.parent = this.node;
        }

        this._ensureWidget(panelNode);
        const backgroundIndex = this.node.getChildByName('Background')?.getSiblingIndex() ?? -1;
        panelNode.setSiblingIndex(Math.max(backgroundIndex + 1, panelNode.getSiblingIndex()));

        this._eliteTroopCodexPanel = panelNode.getComponent(EliteTroopCodexComposite) ?? panelNode.addComponent(EliteTroopCodexComposite);
        panelNode.active = false;
    }

    private async _mountLobbyMissionDetailDialogPanel(): Promise<void> {
        const panelNode = this.node.getChildByName('LobbyMissionDetailDialogComposite') ?? new Node('LobbyMissionDetailDialogComposite');
        panelNode.layer = this.node.layer;
        if (!panelNode.parent) {
            panelNode.parent = this.node;
        }

        this._ensureWidget(panelNode);
        const backgroundIndex = this.node.getChildByName('Background')?.getSiblingIndex() ?? -1;
        panelNode.setSiblingIndex(Math.max(backgroundIndex + 1, panelNode.getSiblingIndex()));

        this._missionDetailDialogPanel = panelNode.getComponent(LobbyMissionDetailDialogComposite) ?? panelNode.addComponent(LobbyMissionDetailDialogComposite);
        panelNode.active = false;
    }

    private async _mountPreviewScreenHost(
        hostName: string,
        screenId: string,
        bindings: ScreenButtonBinding[] = [],
    ): Promise<UIScreenPreviewHost> {
        const hostNode = this.node.getChildByName(hostName) ?? new Node(hostName);
        hostNode.active = false; // 先隱藏，避免 showScreen 期間閃屏
        hostNode.layer = this.node.layer;
        if (!hostNode.parent) {
            hostNode.parent = this.node;
        }

        this._ensureWidget(hostNode);
        const backgroundIndex = this.node.getChildByName('Background')?.getSiblingIndex() ?? -1;
        hostNode.setSiblingIndex(Math.max(backgroundIndex + 1, hostNode.getSiblingIndex()));

        const host = hostNode.getComponent(UIScreenPreviewHost) ?? hostNode.addComponent(UIScreenPreviewHost);
        await host.showScreen(screenId);
        this._bindScreenButtons(host, bindings);
        hostNode.active = false;
        return host;
    }

    private async _mountCharacterDs3Host(): Promise<void> {
        this._characterDs3Host = await this._mountPreviewScreenHost('CharacterDs3Host', 'character-ds3-main');
        this._bindCharacterDs3PreviewTabRouting();
    }

    private _bindCharacterDs3PreviewTabRouting(): void {
        const host = this._characterDs3Host;
        const binder = host?.binder;
        if (!host) {
            return;
        }

        if (!binder) {
            if (this._characterDs3TabBindRetryCount < 8) {
                this._characterDs3TabBindRetryCount += 1;
                this.scheduleOnce(() => {
                    this._bindCharacterDs3PreviewTabRouting();
                }, 0.12);
            }
            return;
        }

        let boundCount = 0;

        const bindTab = (tab: GeneralDetailRuntimeTab): void => {
            const button = binder.getButton(CHARACTER_DS3_PREVIEW_TAB_BUTTONS[tab]);
            if (!button) {
                UCUFLogger.warn(LogCategory.LIFECYCLE, '[LobbyScene] Character DS3 tab button missing', {
                    tab,
                    buttonNode: CHARACTER_DS3_PREVIEW_TAB_BUTTONS[tab],
                });
                return;
            }

            boundCount += 1;

            const onTabInput = (): void => {
                void this._handleCharacterDs3PreviewTabClick(tab);
            };

            button.node.off(Button.EventType.CLICK, undefined, this);
            button.node.off(Node.EventType.TOUCH_END, undefined, this);
            button.node.on(Button.EventType.CLICK, onTabInput, this);
            button.node.on(Node.EventType.TOUCH_END, onTabInput, this);
        };

        bindTab('Overview');
        bindTab('Stats');
        bindTab('Tactics');
        bindTab('Bloodline');
        bindTab('Equip');
        bindTab('Aptitude');

        UCUFLogger.info(LogCategory.LIFECYCLE, '[LobbyScene] Character DS3 tab routing bound', {
            boundCount,
            expectedCount: CHARACTER_DS3_PREVIEW_TAB_ORDER.length,
            retryCount: this._characterDs3TabBindRetryCount,
        });

        if (boundCount < CHARACTER_DS3_PREVIEW_TAB_ORDER.length && this._characterDs3TabBindRetryCount < 8) {
            this._characterDs3TabBindRetryCount += 1;
            this.scheduleOnce(() => {
                this._bindCharacterDs3PreviewTabRouting();
            }, 0.12);
            return;
        }

        this._characterDs3TabBindRetryCount = 0;

        this._syncCharacterDs3PreviewTabVisualState();
    }

    private async _handleCharacterDs3PreviewTabClick(tab: GeneralDetailRuntimeTab): Promise<void> {
        const host = this._characterDs3Host;
        if (!host || this._isCharacterDs3TabSwitching) {
            return;
        }

        this._isCharacterDs3TabSwitching = true;

        try {
            const switchedSlotId = await this._switchCharacterDs3SlotFragment(host, CHARACTER_DS3_PREVIEW_TAB_FRAGMENTS[tab]);
            if (!switchedSlotId) {
                UCUFLogger.warn(LogCategory.LIFECYCLE, '[LobbyScene] Character DS3 tab switch failed', {
                    tab,
                    slotCandidates: [...CHARACTER_DS3_PREVIEW_SLOT_CANDIDATES],
                    fragment: CHARACTER_DS3_PREVIEW_TAB_FRAGMENTS[tab],
                });
                return;
            }

            this._characterDs3ActiveTab = tab;
            this._syncCharacterDs3PreviewTabVisualState();

            UCUFLogger.info(LogCategory.LIFECYCLE, '[LobbyScene] Character DS3 tab switched', {
                tab,
                slotId: switchedSlotId,
                fragment: CHARACTER_DS3_PREVIEW_TAB_FRAGMENTS[tab],
            });
        } finally {
            this._isCharacterDs3TabSwitching = false;
        }
    }

    private async _switchCharacterDs3SlotFragment(host: UIScreenPreviewHost, fragmentId: string): Promise<string | null> {
        for (const slotId of CHARACTER_DS3_PREVIEW_SLOT_CANDIDATES) {
            const switched = await host.switchLazySlot(slotId, fragmentId);
            if (switched) {
                return slotId;
            }
        }
        return null;
    }

    private _syncCharacterDs3PreviewTabVisualState(): void {
        const binder = this._characterDs3Host?.binder;
        if (!binder) {
            return;
        }

        for (const tab of CHARACTER_DS3_PREVIEW_TAB_ORDER) {
            const button = binder.getButton(CHARACTER_DS3_PREVIEW_TAB_BUTTONS[tab]);
            if (!button) {
                continue;
            }

            const sprite = button.node.getComponent(Sprite);
            const stateMap = (button as Button & {
                _buttonSkinStateMap?: Record<string, unknown>;
            })._buttonSkinStateMap ?? (button.node as Node & {
                _buttonSkinStateMap?: Record<string, unknown>;
            })._buttonSkinStateMap;
            if (!sprite || !stateMap) {
                continue;
            }

            const targetState = tab === this._characterDs3ActiveTab ? 'selected' : 'normal';
            const frame = stateMap[targetState] ?? stateMap.normal;
            if (frame) {
                sprite.spriteFrame = frame as Sprite['spriteFrame'];
            }
        }
    }

    private _bindScreenButtons(host: UIScreenPreviewHost, bindings: ScreenButtonBinding[]): void {
        const binder = host.binder;
        if (!binder) {
            throw new Error(`[LobbyScene] ${host.node.name} 尚未建立 binder，無法綁定按鈕`);
        }

        for (const { buttonId, handler } of bindings) {
            const button = binder.getButton(buttonId);
            if (!button) {
                throw new Error(`[LobbyScene] ${host.node.name} 缺少 ${buttonId} 綁定`);
            }

            button.node.off(Button.EventType.CLICK, handler, this);
            button.node.on(Button.EventType.CLICK, handler, this);
        }
    }

    private _registerUIControllers(): void {
        services().ui.setupLayers({
            [LayerType.UI]: this.node,
            [LayerType.PopUp]: this.node,
            [LayerType.Dialog]: this.node,
        });

        const lobbyMainController = this._createLobbyMainController();
        const generalListController = this._createGeneralListController();
        const generalDetailController = this._createGeneralDetailController();
        const shopMainController = this._createPreviewScreenController(this._shopMainHost, 'shop-main-screen');
        const gachaController = this._createPreviewScreenController(this._gachaHost, GACHA_SCREEN_ID, () => {
            this._applyGachaFlowPresentation(this._gachaHost, true);
            this._refreshWalletPreviewState();
        });
        const spiritFamilyOverviewController = this._createSpiritFamilyOverviewController();
        const bloodlineMirrorLoadingController = this._createPreviewScreenController(this._bloodlineMirrorLoadingHost, 'bloodline-mirror-loading-screen');
        const bloodlineMirrorAwakeningController = this._createPreviewScreenController(this._bloodlineMirrorAwakeningHost, 'bloodline-mirror-awakening-screen');
        const eliteTroopCodexController = this._createEliteTroopCodexController();
        const missionDetailDialogController = this._createLobbyMissionDetailDialogController();

        services().ui.register(UIID.LobbyMain, lobbyMainController);
        services().ui.register(UIID.GeneralList, generalListController);
        services().ui.register(UIID.GeneralDetail, generalDetailController);
        services().ui.register(UIID.ShopMain, shopMainController);
        services().ui.register(UIID.GachaMain, gachaController);
        services().ui.register(UIID.Gacha, gachaController);
        services().ui.register(UIID.SpiritFamilyOverview, spiritFamilyOverviewController);
        services().ui.register(UIID.BloodlineMirrorLoading, bloodlineMirrorLoadingController);
        services().ui.register(UIID.BloodlineMirrorAwakening, bloodlineMirrorAwakeningController);
        services().ui.register(UIID.EliteTroopCodex, eliteTroopCodexController);
        services().ui.register(UIID.LobbyMissionDetailDialog, missionDetailDialogController);
    }

    private _createEliteTroopCodexController(): UIManagedController {
        if (!this._eliteTroopCodexPanel) {
            throw new Error('[LobbyScene] EliteTroopCodexComposite 尚未初始化，無法註冊至 UIManager');
        }

        return {
            node: this._eliteTroopCodexPanel.node,
            show: async (payload?: unknown) => {
                await this._eliteTroopCodexPanel!.show(payload as EliteTroopCodexOpenPayload | undefined);
            },
            hide: () => {
                this._eliteTroopCodexPanel!.hide();
            },
        };
    }

    private _createLobbyMissionDetailDialogController(): UIManagedController {
        if (!this._missionDetailDialogPanel) {
            throw new Error('[LobbyScene] LobbyMissionDetailDialogComposite cannot be registered before mount');
        }

        return {
            node: this._missionDetailDialogPanel.node,
            show: async (payload?: unknown) => {
                const dialogPayload = payload as LobbyMissionDetailDialogOpenPayload | undefined;
                const availableGenerals = dialogPayload?.availableGenerals?.length
                    ? dialogPayload.availableGenerals
                    : this._buildMissionDetailGeneralOptions();
                const resolvedGeneral = this._resolveMissionDetailSmokeGeneral(
                    dialogPayload?.previewVariant ?? '',
                    availableGenerals,
                    dialogPayload,
                );

                await this._missionDetailDialogPanel!.show({
                    ...dialogPayload,
                    availableGenerals,
                    selectedGeneralId: dialogPayload?.selectedGeneralId ?? resolvedGeneral?.id,
                    selectedGeneralLabel: dialogPayload?.selectedGeneralLabel ?? resolvedGeneral?.label,
                    selectedGeneralVolunteer: dialogPayload?.selectedGeneralVolunteer ?? resolvedGeneral?.volunteer,
                });
            },
            hide: () => {
                this._missionDetailDialogPanel!.hide();
            },
        };
    }

    private _createGeneralDetailController(): UIManagedController {
        if (!this._detailPanel) {
            throw new Error('[LobbyScene] GeneralDetailComposite 尚未初始化，無法註冊至 UIManager');
        }

        return {
            node: this._detailPanel.node,
            show: async (payload?: unknown) => {
                const config = payload as GeneralConfig | undefined;
                if (!config) {
                    throw new Error('[LobbyScene] GeneralDetail 開啟時缺少 GeneralConfig payload');
                }
                this._detailPanel!.onRequestClose = null;
                await this._detailPanel!.show(config);
            },
            hide: () => {
                this._detailPanel!.hide();
            },
        };
    }

    private _createPreviewScreenController(
        host: UIScreenPreviewHost | null,
        screenId: string,
        onShown?: () => void,
    ): UIManagedController {
        if (!host) {
            throw new Error(`[LobbyScene] ${screenId} host 尚未初始化，無法註冊至 UIManager`);
        }

        return {
            node: host.node,
            show: async () => {
                host.node.active = true;
                this._bringNodeToFront(host.node);
                await host.showScreen(screenId);
                onShown?.();
            },
            hide: () => {
                host.node.active = false;
            },
        };
    }

    private _createSpiritFamilyOverviewController(): UIManagedController {
        if (!this._spiritFamilyOverviewHost) {
            throw new Error('[LobbyScene] SpiritFamilyOverviewHost 尚未初始化，無法註冊至 UIManager');
        }

        return {
            node: this._spiritFamilyOverviewHost.node,
            show: async (payload?: unknown) => {
                const host = this._spiritFamilyOverviewHost!;
                host.node.active = true;
                this._bringNodeToFront(host.node);
                await host.showScreen('bloodline-mirror-loading-screen');
                this._applySpiritFamilyOverviewState(host.binder, payload as SpiritFamilyOverviewOpenPayload | undefined);
            },
            hide: () => {
                this._spiritFamilyOverviewHost!.node.active = false;
            },
        };
    }

    private _applyGachaFlowPresentation(host: UIScreenPreviewHost | null, _flowMode: boolean): void {
        if (!host?.binder) {
            return;
        }
        // gacha-ds3 uses BannerSlide nodes; legacy node names (PoolTabBar etc.) no longer exist
        this._setupGachaPoolCarousel(host);
        this._ensureGachaReturnButton(host);
        this._ensureMercenaryEntry(host);
    }

    /** PROG-2-0115：只讀入口；沿用返回按鈕的平面樣式，不新增 spec 或存檔資料。 */
    private _ensureMercenaryEntry(host: UIScreenPreviewHost): void {
        const template = host.node.getChildByName('GachaReturnToLobby');
        if (!template) throw new Error('Mercenary entry requires the gacha return button');
        let entry = host.node.getChildByName('GachaMercenaryEntry');
        if (!entry) {
            entry = instantiate(template);
            entry.name = 'GachaMercenaryEntry';
            entry.parent = host.node;
            entry.getComponent(Widget)!.left = 220;
            entry.getChildByName('Label')!.getComponent(Label)!.string = '傭兵';
        }
        entry.off(Button.EventType.CLICK, undefined, this);
        entry.on(Button.EventType.CLICK, () => {
            let panel = host.node.getChildByName('MercenaryPoolPanel');
            if (!panel) {
                panel = instantiate(template);
                panel.name = 'MercenaryPoolPanel';
                panel.parent = host.node;
                panel.getComponent(Button)!.destroy();
                panel.getComponent(UITransform)!.setContentSize(620, 480);
                const widget = panel.getComponent(Widget)!;
                widget.left = 24;
                widget.top = 90;
                const body = panel.getChildByName('Label')!;
                body.name = 'MercenaryPoolText';
                body.getComponent(UITransform)!.setContentSize(560, 350);
                body.setPosition(0, -20, 0);
                const label = body.getComponent(Label)!;
                label.fontSize = 22;
                label.lineHeight = 32;
                label.horizontalAlign = Label.HorizontalAlign.LEFT;
                label.verticalAlign = Label.VerticalAlign.TOP;
                label.overflow = Label.Overflow.SHRINK;
                const back = instantiate(template);
                back.name = 'MercenaryPoolBack';
                back.parent = panel;
                const backWidget = back.getComponent(Widget)!;
                backWidget.isAlignLeft = false;
                backWidget.isAlignRight = true;
                backWidget.right = 20;
                backWidget.top = 16;
                back.getChildByName('Label')!.getComponent(Label)!.string = '返回轉蛋';
                back.on(Button.EventType.CLICK, () => { panel!.active = false; }, this);
            }
            const rows = services().session.mercenaryPoolRows();
            const label = panel.getChildByName('MercenaryPoolText')!.getComponent(Label)!;
            label.string = rows.length === 0 ? '傭兵池\n\n目前沒有傭兵' : '傭兵池\n\n' + rows.map(row =>
                `${row.uid}　${row.statusText}\n${row.daysLeftText}　結義進度 ${Math.round(row.bondProgress * 100)}%`).join('\n');
            panel.active = true;
            panel.setSiblingIndex(host.node.children.length - 1);
        }, this);
        entry.setSiblingIndex(host.node.children.length - 1);
    }

    /** Unity 對照：執行期補 Button，返回仍由既有 UI navigation stack 管理。 */
    private _ensureGachaReturnButton(host: UIScreenPreviewHost): void {
        const node = host.node.getChildByName('GachaReturnToLobby') ?? new Node('GachaReturnToLobby');
        node.layer = host.node.layer;
        if (!node.parent) node.parent = host.node;
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.setContentSize(180, 52);
        const widget = node.getComponent(Widget) ?? node.addComponent(Widget);
        widget.isAlignLeft = true;
        widget.isAlignTop = true;
        widget.left = 24;
        widget.top = 24;
        widget.alignMode = Widget.AlignMode.ALWAYS;
        const background = node.getComponent(SolidBackground) ?? node.addComponent(SolidBackground);
        background.color = new Color(36, 44, 62, 235);
        const button = node.getComponent(Button) ?? node.addComponent(Button);
        button.transition = Button.Transition.NONE;
        node.off(Button.EventType.CLICK, undefined, this);
        node.on(Button.EventType.CLICK, () => { void this._goBackToLobby(); }, this);
        const labelNode = node.getChildByName('Label') ?? new Node('Label');
        labelNode.layer = node.layer;
        if (!labelNode.parent) labelNode.parent = node;
        const labelTransform = labelNode.getComponent(UITransform) ?? labelNode.addComponent(UITransform);
        labelTransform.setContentSize(180, 52);
        const label = labelNode.getComponent(Label) ?? labelNode.addComponent(Label);
        label.string = '‹ 返回大廳';
        label.fontSize = 22;
        label.color = Color.WHITE;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        node.setSiblingIndex(host.node.children.length - 1);
    }

    private _setupGachaPoolCarousel(host: UIScreenPreviewHost | null): void {
        if (!host?.binder) {
            return;
        }
        const pools = ['general', 'legendary', 'support'] as const;
        this._gachaPoolIndex = 0;

        const showPool = (idx: number): void => {
            const actives: Record<string, boolean> = {};
            for (let i = 0; i < pools.length; i++) {
                actives[`BannerSlide_${pools[i]}`] = (i === idx);
            }
            host.binder!.setActives(actives);
        };

        showPool(this._gachaPoolIndex);

        bindGachaActions((name) => host.binder!.getNode(name), (node) => {
            const button = node.getComponent(Button) ?? node.addComponent(Button);
            button.interactable = true;
        }, {
            previous: () => {
                this._gachaPoolIndex = (this._gachaPoolIndex - 1 + pools.length) % pools.length;
                showPool(this._gachaPoolIndex);
            },
            next: () => {
                this._gachaPoolIndex = (this._gachaPoolIndex + 1) % pools.length;
                showPool(this._gachaPoolIndex);
            },
            history: () => { void this._showGachaHistory(); },
            single: () => { void this._runGachaAction(() => this._runLocalGacha(1)); },
            ten: () => { void this._runGachaAction(() => this._runLocalGacha(10)); },
            gold: () => { void this._runGachaAction(() => this._runGoldSummon()); },
            ticket: () => { void this._runGachaAction(() => this._runTicketSummon()); },
        }, this, Button.EventType.CLICK);
        const guideLines = buildGachaPoolGuideLines();
        host.binder.setTexts({
            GachaDs3_div_8: guideLines.generalSeries,
            GachaDs3_div_28: guideLines.supportSeries,
            GachaDs3_div_44: '單 抽 ×1', GachaDs3_div_47: '100',
            GachaDs3_div_49: '十 連 ×10', GachaDs3_div_53: '1000',
            GachaDs3_div_55: '金幣召喚（500）', GachaDs3_div_56: '使用召喚券（1）',
        });
    }

    private async _runGachaAction(action: () => Promise<void>): Promise<void> {
        if (this._gachaPullPending) return;
        // 現有 LocalGachaService 只有一般武將池，避免把支援池抽成武將。
        if (this._gachaPoolIndex !== 0) {
            services().event.emit('SHOW_TOAST', { message: '此卡池尚未開放召喚，請切回名將召喚。', duration: 2.5 });
            return;
        }
        this._gachaPullPending = true;
        try { await action(); } finally { this._gachaPullPending = false; }
    }

    private _openUIOnNextTick(uiId: UIID): void {
        this.scheduleOnce(() => {
            void services().ui.open(uiId);
        }, 0);
    }

    private async _goBackToLobby(): Promise<void> {
        const wentBack = await services().ui.goBack();
        if (!wentBack) {
            await services().ui.open(UIID.LobbyMain);
        }
    }

    private _applySpiritFamilyOverviewState(
        binder: UITemplateBinder | null,
        payload?: SpiritFamilyOverviewOpenPayload,
    ): void {
        if (!binder) {
            return;
        }

        const displayModel = buildSpiritFamilyOverviewDisplayModel(payload);
        applyUIPreviewBinderState(binder, {
            texts: displayModel.texts,
            actives: {
                UnownedVeil: false,
                PublicHero: true,
                SpiritHero: true,
            },
        });

        const storyPathMap = {
            origin: 'StoryStrip/StoryCellOrigin',
            bloodline: 'StoryStrip/StoryCellBloodline',
            trial: 'StoryStrip/StoryCellTrial',
            awakening: 'StoryStrip/StoryCellAwakening',
            future: 'StoryStrip/StoryCellFuture',
        } as const;

        for (const [key, basePath] of Object.entries(storyPathMap) as Array<[keyof typeof storyPathMap, string]>) {
            const storyCell = displayModel.storyCells[key];
            binder.setTextsByPath({
                [`${basePath}/StoryTitle`]: storyCell.title,
                [`${basePath}/StoryBody`]: storyCell.body,
            });
        }
    }

    private _bringNodeToFront(node: Node): void {
        const parent = node.parent;
        if (!parent) {
            return;
        }
        node.setSiblingIndex(parent.children.length - 1);
    }

    private _refreshWalletPreviewState(): void {
        const wallet = this._localGachaService.getWalletSnapshot();
        const gemText = `玉 ${wallet.gems.toLocaleString('zh-TW')}`;
        const goldText = `金 ${wallet.gold.toLocaleString('zh-TW')}`;
        const gachaBalanceText = `◈ ${wallet.gems.toLocaleString('zh-TW')}`;

        this._lobbyMainHost?.binder?.setTexts({
            ResourceGold: goldText,
            ResourceGem: gemText,
        });

        this._gachaHost?.binder?.setTexts({
            CostBalanceValue: gachaBalanceText,
            GachaDs3TabGeneral_div_48: gachaBalanceText,
        });
    }

    private _createLobbyMainController(): UIManagedController {
        if (!this._lobbyMainHost) {
            throw new Error('[LobbyScene] LobbyMainHost 尚未初始化，無法註冊至 UIManager');
        }

        return {
            node: this._lobbyMainHost.node,
            show: async () => {
                this._lobbyMainHost!.node.active = true;
                this._bringNodeToFront(this._lobbyMainHost!.node);
                await this._lobbyMainHost!.showScreen('lobby-main-screen');
                this._configureLobbyMainHub(this._lobbyMainHost!.binder);
                this._refreshWalletPreviewState();
                if (this._seasonHudHost) {
                    this._seasonHudHost.node.active = true;
                    this._bringNodeToFront(this._seasonHudHost.node);
                    this._refreshSeasonHud();
                }
                if (this._deckSelectHost) {
                    this._deckSelectHost.node.active = true;
                    this._bringNodeToFront(this._deckSelectHost.node);
                    this._refreshDeckSelect();
                }
                if (this._leadSelectHost) {
                    this._leadSelectHost.node.active = true;
                    this._bringNodeToFront(this._leadSelectHost.node);
                    this._refreshLeadSelect();
                }
            },
            hide: () => {
                this._lobbyMainHost!.node.active = false;
                if (this._seasonHudHost) {
                    this._seasonHudHost.node.active = false;
                }
                this._closeNurtureFlow();
                this._closeBondingSetup();
                this._closeSageOracle();
                this._closeRetireReview();
                this._closeSortieSetup();
                if (this._deckSelectHost) {
                    this._deckSelectHost.node.active = false;
                }
                if (this._leadSelectHost) {
                    this._leadSelectHost.node.active = false;
                }
            },
        };
    }

    private _createGeneralListController(): UIManagedController {
        if (!this._listPanel) {
            throw new Error('[LobbyScene] GeneralListComposite 尚未初始化，無法註冊至 UIManager');
        }

        let lastPayload: GeneralListOpenPayload | null = null;
        this._listPanel.onRequestClose = () => {
            void services().ui.closeCurrentUI();
        };

        return {
            node: this._listPanel.node,
            show: async (payload?: unknown) => {
                const nextPayload = payload as GeneralListOpenPayload | undefined;
                if (nextPayload) {
                    lastPayload = nextPayload;
                }

                const activePayload = lastPayload ?? {
                    generals: this._generals,
                    onSelectGeneral: (config: GeneralConfig) => this._openGeneralDetailDirect(config),
                    options: { factionFilter: 'all' },
                };

                this._listPanel!.onSelectGeneral = activePayload.onSelectGeneral;
                this._bringNodeToFront(this._listPanel!.node);
                await this._listPanel!.show(activePayload.generals, activePayload.options?.factionFilter ?? 'all', {
                    npcDialogueDevControls: activePayload.options?.npcDialogueDevControls,
                    npcDialogueSaveId: activePayload.options?.npcDialogueSaveId ?? services().sync.getMemorySaveId(),
                });
            },
            hide: () => {
                this._listPanel!.node.active = false;
            },
        };
    }

    private _ensureWidget(node: Node | null | undefined) {
        if (!node) return;
        node.layer = this.node.layer;
        const ut = node.getComponent(UITransform) || node.addComponent(UITransform);
        ut.setContentSize(1920, 1080);
        const widget = node.getComponent(Widget) || node.addComponent(Widget);
        widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
        widget.top = widget.bottom = widget.left = widget.right = 0;
    }

    // ──────────────────────────────────────────
    // Button Click Event 回呼（由 scene-flow-builder 或 Inspector 綁定）
    // ──────────────────────────────────────────

    private async _showGeneralListWithHandler(
        onSelectGeneral: (config: GeneralConfig) => void | Promise<void>,
        options: { factionFilter?: 'all' | 'player' | 'enemy'; npcDialogueDevControls?: boolean } = { factionFilter: 'all' },
    ): Promise<void> {
        await services().ui.open(UIID.GeneralList, {
            generals: this._generals,
            onSelectGeneral,
            options,
        } satisfies GeneralListOpenPayload);
    }

    /**
     * 正式產品入口：Lobby -> GeneralList -> 點武將，一律進 DS3 人物頁。
     * Unity 對照：等同把 roster item click 統一路由到新版 Character Detail scene/prefab host。
     */
    private async _openGeneralDetailDirect(config: GeneralConfig): Promise<void> {
        await this._openCharacterDs3FromListSelection(config);
    }

    /**
     * 舊版 GeneralDetailComposite 保留為備援 smoke/debug 路徑，避免直接刪除造成測試斷鏈。
     */
    private async _openGeneralDetailLegacy(config: GeneralConfig): Promise<void> {
        if (!this._detailPanel) {
            throw new Error('[LobbyScene] GeneralDetailComposite 尚未初始化，無法直接開啟武將詳情');
        }
        this._detailPanel.onRequestClose = () => {
            this._detailPanel?.hide();
        };
        await this._detailPanel.show(config);
    }

    private async _openCharacterDs3FromListSelection(config: GeneralConfig): Promise<void> {
        if (!this._characterDs3Host) {
            throw new Error('[LobbyScene] CharacterDs3Host 尚未初始化，無法開啟 DS3 人物頁');
        }

        if (services().ui.isOpen(UIID.GeneralList)) {
            await services().ui.closeCurrentUI();
        } else {
            this._listPanel?.hide();
        }

        this._characterDs3Host.node.active = true;
        this._bringNodeToFront(this._characterDs3Host.node);
        await this._characterDs3Host.showScreen('character-ds3-main');
        this._bindCharacterDs3PreviewTabRouting();

        // 診斷鉤子：在 host 層直接綁定 tab 點擊，繞開 LobbyScene 事件路徑
        let hookCount = 0;
        for (const slotId of CHARACTER_DS3_PREVIEW_SLOT_CANDIDATES) {
            hookCount += this._characterDs3Host.installTabSwitchHook(
                slotId,
                {
                    CharacterDs3Main_button_4: CHARACTER_DS3_PREVIEW_TAB_FRAGMENTS.Overview,
                    CharacterDs3Main_button_5: CHARACTER_DS3_PREVIEW_TAB_FRAGMENTS.Stats,
                    CharacterDs3Main_button_6: CHARACTER_DS3_PREVIEW_TAB_FRAGMENTS.Tactics,
                    CharacterDs3Main_button_7: CHARACTER_DS3_PREVIEW_TAB_FRAGMENTS.Bloodline,
                    CharacterDs3Main_button_8: CHARACTER_DS3_PREVIEW_TAB_FRAGMENTS.Equip,
                    CharacterDs3Main_button_9: CHARACTER_DS3_PREVIEW_TAB_FRAGMENTS.Aptitude,
                },
            );
        }

        this._refreshBeastSummary(config);
        this._refreshGalleryEntry();
        this._refreshFactorHex(config);

        UCUFLogger.info(LogCategory.LIFECYCLE, '[LobbyScene] CharacterDs3 smoke selection opened screen host', {
            generalId: config.id,
            generalName: config.name,
            screenId: 'character-ds3-main',
            diagHookCount: hookCount,
        });

        // 每次由正式入口打開人物頁都回到 Overview，避免沿用前一次停留 tab。
        const resetSlotId = await this._switchCharacterDs3SlotFragment(
            this._characterDs3Host,
            CHARACTER_DS3_PREVIEW_TAB_FRAGMENTS.Overview,
        );
        if (resetSlotId) {
            this._characterDs3ActiveTab = 'Overview';
            this._syncCharacterDs3PreviewTabVisualState();
        } else {
            UCUFLogger.warn(LogCategory.LIFECYCLE, '[LobbyScene] Character DS3 default tab reset failed', {
                tab: 'Overview',
                slotCandidates: [...CHARACTER_DS3_PREVIEW_SLOT_CANDIDATES],
                fragment: CHARACTER_DS3_PREVIEW_TAB_FRAGMENTS.Overview,
            });
        }
    }

    /**
     * 命紋靈獸摘要（GDUI-09 cc 接線）：依暫定綁定取得靈獸，以一段文字掛在 CharacterDs3Host 下。
     * 靈獸清單與綁定規則都是暫定，見 BloodlineBeast.PROVISIONAL_BEAST_CATALOG。
     */
    private _refreshBeastSummary(config: GeneralConfig): void {
        const hostNode = this._characterDs3Host?.node;
        if (!hostNode) {
            return;
        }
        let labelNode = hostNode.getChildByName(BEAST_SUMMARY_NODE_NAME);
        if (!labelNode) {
            labelNode = new Node(BEAST_SUMMARY_NODE_NAME);
            labelNode.layer = hostNode.layer;
            labelNode.parent = hostNode;
            labelNode.setPosition(BEAST_SUMMARY_POSITION.x, BEAST_SUMMARY_POSITION.y, 0);
            labelNode.addComponent(UITransform);
        }
        const label = labelNode.getComponent(Label) ?? labelNode.addComponent(Label);
        label.fontSize = 20;
        label.lineHeight = 26;
        label.string = formatBeastSummary(beastForGeneral(config.id));
    }

    /**
     * 六色因子六角圖（OPEN-08 cc 接線）：依武將基因算出六個頂點，掛在 CharacterDs3Host 下重畫。
     * 同一武將在本次執行中第二次以後檢視時，新亮起的顏色會播一次解鎖特效。
     */
    private _refreshFactorHex(config: GeneralConfig): void {
        const hostNode = this._characterDs3Host?.node;
        if (!hostNode) {
            return;
        }
        let hexNode = hostNode.getChildByName(FACTOR_HEX_NODE_NAME);
        if (!hexNode) {
            hexNode = new Node(FACTOR_HEX_NODE_NAME);
            hexNode.layer = hostNode.layer;
            hexNode.parent = hostNode;
            hexNode.setPosition(FACTOR_HEX_POSITION.x, FACTOR_HEX_POSITION.y, 0);
        }
        const graphic = hexNode.getComponent(FactorHexGraphic) ?? hexNode.addComponent(FactorHexGraphic);
        graphic.setup(FACTOR_HEX_RADIUS);

        const inputs = factorHexInputsFromGenes(config.genes ?? []);
        const before = this._factorHexInputsByGeneral.get(config.id);
        const freshColors = before ? newlyLitFactorColors(before, inputs) : [];
        const visibleColors = services().session.visibleFactorColors();
        graphic.render(buildFactorHexView(inputs), visibleColors);
        graphic.playUnlockFlash(freshColors.filter((color) => visibleColors.includes(color)));
        this._factorHexInputsByGeneral.set(config.id, inputs);
    }

    /**
     * 版本圖鑑入口（GDUI-07 cc 接線）：在武將詳情頁掛一個文字按鈕，點擊後開啟圖鑑。
     * 版本表與已擁有集合的來源見 galleryInputsFromGenerals（暫定）。
     */
    private _refreshGalleryEntry(): void {
        const hostNode = this._characterDs3Host?.node;
        if (!hostNode) {
            return;
        }
        let entryNode = hostNode.getChildByName(GALLERY_ENTRY_NODE_NAME);
        if (!entryNode) {
            entryNode = new Node(GALLERY_ENTRY_NODE_NAME);
            entryNode.layer = hostNode.layer;
            entryNode.parent = hostNode;
            entryNode.setPosition(GALLERY_ENTRY_POSITION.x, GALLERY_ENTRY_POSITION.y, 0);
            entryNode.addComponent(UITransform);
            const label = entryNode.addComponent(Label);
            label.fontSize = 22;
            label.string = '版本圖鑑';
            entryNode.on(Node.EventType.TOUCH_END, () => this._openGalleryFromDetail(), this);
        }
    }

    private _openGalleryFromDetail(): void {
        const { table, owned } = galleryInputsFromGenerals(this._generals, PlayerRosterService.getAll());
        this.openGeneralVersionGallery(table, owned);
    }

    /** 「武將列表」按鈕：顯示玄家已取得武將（源自轉蛋 / PlayerRosterService） */
    public onClickGeneralList() {
        const roster = PlayerRosterService.getAll();
        const displayList = roster.length > 0 ? roster : this._generals;
        void services().ui.open(UIID.GeneralList, {
            generals: displayList,
            onSelectGeneral: (config: GeneralConfig) => this._openGeneralDetailDirect(config),
            options: {
                factionFilter: 'all',
                npcDialogueSaveId: services().sync.getMemorySaveId(),
            },
        } satisfies GeneralListOpenPayload);
    }

    /** 供 LoadingScene / headless preview 使用的武將列表 smoke route。 */
    public async previewGeneralListSmoke(): Promise<void> {
        await this._showGeneralListWithHandler((config: GeneralConfig) => this._openGeneralDetailDirect(config), {
            factionFilter: 'all',
            npcDialogueSaveId: services().sync.getMemorySaveId(),
        });
    }

    public async previewGeneralListNpcDialogueSmoke(previewGeneralId = 'zhang-fei'): Promise<void> {
        await this._showGeneralListWithHandler((config: GeneralConfig) => this._openGeneralDetailDirect(config), {
            factionFilter: 'all',
            npcDialogueDevControls: true,
            npcDialogueSaveId: services().sync.getMemorySaveId(),
        });

        if (!this._listPanel) {
            throw new Error('[LobbyScene] GeneralListComposite 尚未初始化，無法執行 NPC dialogue smoke route');
        }

        await this._listPanel.previewNpcDialogueDevSmoke(previewGeneralId || 'zhang-fei', true);
    }

    public async previewGeneralDetailEntrySmoke(source: GeneralDetailEntrySmokeSource, previewVariant = ''): Promise<void> {
        if (!this._listPanel) {
            throw new Error('[LobbyScene] GeneralListComposite 尚未初始化，無法執行正式入口 smoke route');
        }

        const smokeGeneral = this._resolveGeneralDetailSmokeGeneral(previewVariant || 'zhang-fei');
        if (!smokeGeneral) {
            throw new Error(`[LobbyScene] 正式入口 smoke route 找不到目標武將 variant=${previewVariant || '(default)'}`);
        }

        this._ensureSmokeGeneralInPlayerRoster(smokeGeneral);
        this._openGeneralListFromSmokeEntry(source);

        const opened = await this._waitForManagedUIOpen(UIID.GeneralList, this._listPanel.node);
        if (!opened) {
            throw new Error(`[LobbyScene] 正式入口 smoke route 未能從 ${source} 開啟 GeneralList`);
        }

        const selected = await this._selectRenderedGeneralById(smokeGeneral.id);
        if (!selected) {
            throw new Error(`[LobbyScene] 正式入口 smoke route failed to click general row: ${smokeGeneral.id}`);
        }

        UCUFLogger.info(LogCategory.LIFECYCLE, '[LobbyScene] formal general detail entry smoke selected general', {
            source,
            generalId: smokeGeneral.id,
            generalName: smokeGeneral.name,
        });
    }

    private _ensureSmokeGeneralInPlayerRoster(config: GeneralConfig): void {
        const roster = PlayerRosterService.getAll();
        if (roster.some((item) => item.id === config.id)) {
            return;
        }

        PlayerRosterService.replaceAll([
            config,
            ...roster.filter((item) => item.id !== config.id),
        ]);
        UCUFLogger.info(LogCategory.DATA, '[LobbyScene] formal general detail smoke seeded target general into preview roster', {
            generalId: config.id,
            generalName: config.name,
        });
    }

    private async _selectRenderedGeneralById(generalId: string, timeoutMs = 3000): Promise<boolean> {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
            if (this._listPanel?.hasRenderedGeneralById(generalId)) {
                return this._listPanel.selectGeneralById(generalId);
            }
            await new Promise<void>((resolve) => setTimeout(resolve, 80));
        }
        return false;
    }

    private _openGeneralListFromSmokeEntry(_source: GeneralDetailEntrySmokeSource): void {
        const host = this._lobbyMainHost;
        const button = host?.binder?.getButton('btnGenerals') ?? null;
        if (!host || !button) {
            throw new Error('[LobbyScene] 正式入口 smoke route 找不到 lobby-main btnGenerals');
        }

        host.node.active = true;
        this._bringNodeToFront(host.node);
        this._configureLobbyMainHub(host.binder);
        button.node.emit(Button.EventType.CLICK, button);
    }

    public async previewCharacterDs3Smoke(previewVariant = ''): Promise<void> {
        const smokeGeneral = this._resolveCharacterDs3SmokeGeneral(previewVariant);
        if (!smokeGeneral) {
            throw new Error(`[LobbyScene] CharacterDs3 smoke route 找不到目標武將 variant=${previewVariant || '(default)'}`);
        }

        this._ensureSmokeGeneralInPlayerRoster(smokeGeneral);
        await this._openCharacterDs3FromListSelection(smokeGeneral);

        await this._waitForCharacterDs3HostVisualReady(smokeGeneral);
    }

    /**
     * 正式入口 smoke route 專用：外部呼叫後等待 DS3 人物頁視覺元素到齊。
     */
    public async waitForCharacterDs3VisualReady(previewVariant = '', timeoutMs = 4000): Promise<void> {
        const smokeGeneral = this._resolveCharacterDs3SmokeGeneral(previewVariant || 'zhang-fei');
        if (!smokeGeneral) {
            throw new Error(`[LobbyScene] CharacterDs3 visual-ready wait 找不到目標武將 variant=${previewVariant || '(default)'}`);
        }
        await this._waitForCharacterDs3HostVisualReady(smokeGeneral, timeoutMs);
    }

    /** 供 LoadingScene / headless preview 使用的大廳轉蛋 smoke route。 */
    public async previewGachaMainSmoke(): Promise<void> {
        this.onClickGachaMain();
        const opened = await this._waitForManagedUIOpen(UIID.GachaMain, this._gachaHost?.node ?? null);
        if (!opened) {
            throw new Error('[LobbyScene] GachaMain smoke route did not open UIID.GachaMain within timeout');
        }
    }

    public async previewMissionDetailSmoke(previewVariant = ''): Promise<void> {
        if (!this._missionDetailDialogPanel) {
            throw new Error('[LobbyScene] LobbyMissionDetailDialogComposite 尚未初始化，無法直接開啟大廳任務詳情');
        }

        const availableGenerals = this._buildMissionDetailGeneralOptions();
        const selectedGeneral = this._resolveMissionDetailSmokeGeneral(previewVariant, availableGenerals);
        // 環境偵察面板（PROG-2-0405）：用大廳目前關卡的真實地形與天氣
        const encounter = this._currentEncounter();
        const scout = encounter ? buildEnvScoutLines(buildBattlefieldReconForEncounter(encounter)) : null;

        await services().ui.open(UIID.LobbyMissionDetailDialog, {
            previewVariant,
            state: scout ? { envScoutTerrainLine: scout.terrainLine, envScoutWeatherLine: scout.weatherLine } : undefined,
            availableGenerals,
            selectedGeneralId: selectedGeneral?.id,
            selectedGeneralLabel: selectedGeneral?.label,
            selectedGeneralVolunteer: selectedGeneral?.volunteer,
        } satisfies LobbyMissionDetailDialogOpenPayload);
    }

    /** 「商城」按鈕 */
    public onClickShopMain() {
        this._openUIOnNextTick(UIID.ShopMain);
    }

    /** 「轉蛋」按鈕 */
    public onClickGachaMain() {
        this._openUIOnNextTick(UIID.GachaMain);
    }

    private async _waitForManagedUIOpen(uiId: UIID, hostNode: Node | null, timeoutMs = 2000): Promise<boolean> {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
            if (services().ui.isOpen(uiId) && (!hostNode || hostNode.active)) {
                return true;
            }
            await new Promise<void>((resolve) => setTimeout(resolve, 80));
        }
        return false;
    }

    private async _waitForCharacterDs3HostVisualReady(config: GeneralConfig, timeoutMs = 4000): Promise<void> {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
            if (this._isCharacterDs3HostVisualReady(config)) {
                return;
            }
            await new Promise<void>((resolve) => setTimeout(resolve, 80));
        }

        throw new Error(`[LobbyScene] CharacterDs3 smoke route timed out waiting for visual ready: ${config.id}`);
    }

    private _isCharacterDs3HostVisualReady(config: GeneralConfig): boolean {
        const hostNode = this._characterDs3Host?.node ?? null;
        if (!hostNode?.activeInHierarchy) {
            return false;
        }

        return this._hasDescendantLabelText(hostNode, config.name)
            && this._hasDescendantLabelText(hostNode, 'BIOGRAPHY')
            && this._hasDescendantLabelText(hostNode, '燕人武聖');
    }

    private _hasDescendantLabelText(root: Node, expectedText: string): boolean {
        const expected = expectedText.trim();
        if (!expected) {
            return false;
        }

        const label = root.getComponent(Label);
        if (label?.string.includes(expected)) {
            return true;
        }

        for (const child of root.children) {
            if (this._hasDescendantLabelText(child, expected)) {
                return true;
            }
        }

        return false;
    }

    private _mountSinglePlayerModeToggle(host: UIScreenPreviewHost | null): void {
        if (!host) {
            return;
        }

        const rootName = 'SinglePlayerModeToggle';
        const root = host.node.getChildByName(rootName) ?? new Node(rootName);
        root.layer = host.node.layer;
        if (!root.parent) {
            root.parent = host.node;
        }

        const transform = root.getComponent(UITransform) ?? root.addComponent(UITransform);
        transform.setContentSize(280, 56);
        const widget = root.getComponent(Widget) ?? root.addComponent(Widget);
        widget.isAlignTop = true;
        widget.top = 140;
        widget.isAlignRight = true;
        widget.right = 24;
        widget.isAlignLeft = false;
        widget.isAlignBottom = false;

        const background = root.getComponent(SolidBackground) ?? root.addComponent(SolidBackground);
        const button = root.getComponent(Button) ?? root.addComponent(Button);
        button.transition = Button.Transition.NONE;
        button.node.off(Button.EventType.CLICK, this.onClickSinglePlayerModeToggle, this);
        button.node.on(Button.EventType.CLICK, this.onClickSinglePlayerModeToggle, this);

        const labelNode = root.getChildByName('Label') ?? new Node('Label');
        labelNode.layer = host.node.layer;
        if (!labelNode.parent) {
            labelNode.parent = root;
        }
        const labelTransform = labelNode.getComponent(UITransform) ?? labelNode.addComponent(UITransform);
        labelTransform.setContentSize(260, 36);
        const labelWidget = labelNode.getComponent(Widget) ?? labelNode.addComponent(Widget);
        labelWidget.isAlignHorizontalCenter = true;
        labelWidget.horizontalCenter = 0;
        labelWidget.isAlignVerticalCenter = true;
        labelWidget.verticalCenter = 0;
        const label = labelNode.getComponent(Label) ?? labelNode.addComponent(Label);
        label.fontSize = 22;
        label.lineHeight = 28;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;

        this._singlePlayerModeToggleHandles.push({ root, label });
        this._syncSinglePlayerModeToggleVisual(root, label, background);
    }

    private _syncSinglePlayerModeToggleVisual(root: Node, label: Label, background: SolidBackground): void {
        const enabled = this._localGachaService.isSinglePlayerModeEnabled();
        label.string = enabled ? '單機模式：ON' : '單機模式：OFF';
        label.color = enabled ? new Color(240, 255, 240, 255) : new Color(255, 230, 220, 255);
        background.color = enabled ? new Color(52, 92, 58, 220) : new Color(96, 60, 54, 220);
        root.active = true;
    }

    private _refreshSinglePlayerModeToggleVisuals(): void {
        for (const handle of this._singlePlayerModeToggleHandles) {
            const background = handle.root.getComponent(SolidBackground);
            if (!background) continue;
            this._syncSinglePlayerModeToggleVisual(handle.root, handle.label, background);
        }
    }

    public onClickSinglePlayerModeToggle(): void {
        const enabled = this._localGachaService.toggleSinglePlayerModeEnabled();
        this._refreshSinglePlayerModeToggleVisuals();
        services().event.emit('SHOW_TOAST', {
            message: enabled ? '單機模式已開啟' : '單機模式已關閉',
            duration: 1.6,
        });
    }

    private async _showGachaHistory(): Promise<void> {
        await this._getGachaFlowCoordinator().showHistory(30);
    }

    private async _runGoldSummon(): Promise<void> {
        await this._getGachaFlowCoordinator().runGoldSummon();
    }

    private async _runTicketSummon(): Promise<void> {
        await this._getGachaFlowCoordinator().runTicketSummon();
    }

    private async _runLocalGacha(drawCount: number): Promise<void> {
        await this._getGachaFlowCoordinator().runLocalGacha(drawCount);
    }

    private _getGachaFlowCoordinator(): GachaFlowCoordinator {
        if (this._gachaFlowCoordinator) {
            return this._gachaFlowCoordinator;
        }

        this._gachaFlowCoordinator = new GachaFlowCoordinator({
            gachaService: this._localGachaService,
            getHost: () => this._gachaHost,
            getGenerals: () => this._generals,
            // 模板的 faction 是魏／蜀／吳等歷史陣營，不是名冊的持有狀態。
            factionFilter: 'all',
            tenPullHeaderText: '本地轉蛋結果 · 十連抽',
            onAfterPullSuccess: (results) => { void this._onGachaPullSuccess(results); },
            onWalletChanged: () => {
                this._refreshSinglePlayerModeToggleVisuals();
                this._refreshWalletPreviewState();
                refreshCurrencyDisplay();
            },
            onShowError: (message) => {
                services().event.emit('SHOW_TOAST', { message, duration: 2.5 });
            },
            onBackToGacha: async () => {
                await this._gachaHost?.showScreen(GACHA_SCREEN_ID);
                this._applyGachaFlowPresentation(this._gachaHost, true);
                this._refreshWalletPreviewState();
            },
            onRepullTen: () => this._runLocalGacha(10),
        });

        return this._gachaFlowCoordinator;
    }

    /** 「支援卡」按鈕 */
    public onClickSupportCard() {
        this.scheduleOnce(() => {
            void services().ui.openAsync(UIID.SupportCard);
        }, 0);
    }

    public onClickSpiritFamilyOverview() {
        this.scheduleOnce(() => {
            void services().ui.open(UIID.SpiritFamilyOverview, {
                origin: 'lobby',
            } satisfies SpiritFamilyOverviewOpenPayload);
        }, 0);
    }

    /** 「虎符圖鑑」按鈕 / 入口 */
    public onClickEliteTroopCodex() {
        void this._openEliteTroopCodex();
    }

    /** 「進入戰鬥」按鈕 */
    /** 最小 smoke route：走既有武將列表 callback 鏈，驗證 General Detail 指定 tab。 */
    public async onClickGeneralDetailOverviewSmoke(previewVariant = '') {
        await this._openGeneralDetailSmoke('Overview', previewVariant);
    }

    public async onClickGeneralDetailStatsSmoke(previewVariant = '') {
        await this._openGeneralDetailSmoke('Stats', previewVariant);
    }

    public async onClickGeneralDetailSkillsSmoke(previewVariant = '') {
        await this._openGeneralDetailSmoke('Skills', previewVariant);
    }

    public async onClickGeneralDetailBloodlineSmoke(previewVariant = '') {
        await this._openGeneralDetailSmoke('Bloodline', previewVariant);
    }

    public async onClickGeneralDetailBasicsSmoke(previewVariant = '') {
        await this._openGeneralDetailSmoke('Basics', previewVariant);
    }

    public async onClickGeneralDetailAptitudeSmoke(previewVariant = '') {
        await this._openGeneralDetailSmoke('Aptitude', previewVariant);
    }

    /** 供 LoadingScene / headless preview 使用的虎符圖鑑 smoke route。 */
    public async onClickEliteTroopCodexSmoke(previewVariant = ''): Promise<void> {
        await this._openEliteTroopCodex(this._resolveEliteTroopCodexSmokeIndex(previewVariant));
    }

    private async _openEliteTroopCodex(selectedIndex?: number): Promise<void> {
        const payload = typeof selectedIndex === 'number'
            ? { selectedIndex }
            : undefined;
        await services().ui.open(UIID.EliteTroopCodex, payload);
    }

    private _resolveEliteTroopCodexSmokeIndex(previewVariant: string): number | undefined {
        const trimmed = previewVariant.trim();
        if (!trimmed) {
            return undefined;
        }

        if (/^\d+$/.test(trimmed)) {
            const selectedIndex = Math.max(0, parseInt(trimmed, 10) - 1);
            return selectedIndex;
        }

        return undefined;
    }

    private _buildMissionDetailGeneralOptions(): MissionGeneralOption[] {
        return this._generals.map((config) => ({
            id: config.id,
            label: formatGeneralDisplayName(config.name, config.title),
            volunteer: this._isMissionDetailVolunteerGeneral(config),
        }));
    }

    private _resolveMissionDetailSmokeGeneral(
        previewVariant: string,
        options: MissionGeneralOption[],
        payload?: LobbyMissionDetailDialogOpenPayload,
    ): MissionGeneralOption | null {
        const requestedId = payload?.selectedGeneralId?.trim() ?? '';
        const requestedLabel = payload?.selectedGeneralLabel?.trim() ?? '';
        const matchedById = requestedId ? options.find((item) => item.id === requestedId) ?? null : null;
        const matchedByLabel = requestedLabel ? options.find((item) => item.label === requestedLabel) ?? null : null;
        const matchedByVariant = this._matchMissionDetailGeneralByVariant(previewVariant, options);

        return matchedById
            ?? matchedByLabel
            ?? matchedByVariant
            ?? options[0]
            ?? null;
    }

    private _matchMissionDetailGeneralByVariant(
        previewVariant: string,
        options: MissionGeneralOption[],
    ): MissionGeneralOption | null {
        const requested = previewVariant.trim().toLowerCase();
        if (!requested) {
            return null;
        }

        const normalized = requested.replace(/[\s_-]/g, '');
        const preferredTokens: string[] = [];

        if (requested === 'guan-yu' || normalized === 'guanyu' || requested === 'smoke-guan-yu' || requested === '關羽') {
            preferredTokens.push('guan-yu', 'guanyu', '關羽');
        } else if (requested === 'zhao-yun' || normalized === 'zhaoyun') {
            preferredTokens.push('zhao-yun', 'zhaoyun', '趙雲');
        } else if (requested === 'zhang-fei' || normalized === 'zhangfei') {
            preferredTokens.push('zhang-fei', 'zhangfei', '張飛');
        } else if (requested !== 'default' && requested !== 'military' && requested !== 'domestic' && requested !== 'partial' && requested !== 'revealed' && requested !== 'full' && requested !== '50' && requested !== '50%' && requested !== '100' && requested !== '100%') {
            preferredTokens.push(requested, normalized);
        }

        if (preferredTokens.length === 0) {
            return null;
        }

        return options.find((option) => {
            const optionText = `${option.id} ${option.label}`.toLowerCase();
            return preferredTokens.some((token) => token && optionText.includes(token.toLowerCase()));
        }) ?? null;
    }

    private _isMissionDetailVolunteerGeneral(config: GeneralConfig): boolean {
        const text = [config.id, config.name, ...(config.alias ?? [])].join(' ').toLowerCase();
        return text.includes('guan-yu') || text.includes('guanyu') || text.includes('關羽');
    }

    private async _openGeneralDetailSmoke(defaultTab: GeneralDetailDefaultTab, previewVariant = '') {
        if (!this._detailPanel) {
            UCUFLogger.warn(LogCategory.LIFECYCLE, '[LobbyScene] GeneralDetailOverview smoke 失敗：detail panel 未就緒');
            return;
        }
        if (this._generals.length === 0) {
            UCUFLogger.warn(LogCategory.DATA, '[LobbyScene] GeneralDetailOverview smoke 失敗：尚未載入武將資料');
            return;
        }

        const smokeGeneral = this._resolveGeneralDetailSmokeGeneral(previewVariant);
        if (!smokeGeneral) {
            UCUFLogger.warn(LogCategory.DATA, `[LobbyScene] GeneralDetailOverview smoke 失敗：找不到對應武將 variant=${previewVariant || '(default)'}`);
            return;
        }

        await this._openGeneralDetailLegacy({
            ...smokeGeneral,
            profilePresentation: {
                ...smokeGeneral.profilePresentation,
                defaultTab,
            },
        });

        await this._detailPanel.switchTab(this._resolveGeneralDetailRuntimeTab(defaultTab));
    }

    private _resolveGeneralDetailRuntimeTab(defaultTab: GeneralDetailDefaultTab): GeneralDetailRuntimeTab {
        switch (defaultTab) {
        case 'Overview':
        case 'Stats':
        case 'Bloodline':
        case 'Aptitude':
            return defaultTab;
        case 'Basics':
            return 'Equip';
        case 'Skills':
            return 'Tactics';
        case 'Extended':
            return 'Aptitude';
        default:
            return 'Overview';
        }
    }

    private _resolveGeneralDetailSmokeGeneral(previewVariant: string): GeneralConfig | null {
        const requested = previewVariant.trim().toLowerCase();
        let preferredId: string | null = null;

        if (requested === 'zhen-ji' || requested === 'zhenji' || requested === 'smoke-zhen-ji') {
            preferredId = 'zhen-ji';
        } else if (requested === 'zhao-yun' || requested === 'zhaoyun') {
            preferredId = 'zhao-yun';
        } else if (requested === 'zhang-fei' || requested === 'zhangfei' || requested === 'smoke-zhang-fei') {
            preferredId = 'zhang-fei';
        } else if (requested && requested !== 'default' && requested !== 'zhang-fei' && requested !== 'zhangfei' && requested !== 'smoke-zhang-fei') {
            preferredId = requested;
        }

        return (preferredId ? this._generals.find((item) => item.id === preferredId) : null)
            ?? this._generals[0]
            ?? null;
    }

    private _resolveCharacterDs3SmokeGeneral(previewVariant: string): GeneralConfig | null {
        const requested = previewVariant.trim().toLowerCase();
        if (requested && requested !== 'default' && requested !== 'ds3' && requested !== 'zhang-fei' && requested !== 'zhangfei' && requested !== 'smoke-zhang-fei') {
            UCUFLogger.warn(LogCategory.LIFECYCLE, '[LobbyScene] CharacterDs3 smoke route currently renders the DS3 Zhang Fei capture target only; fallback to zhang-fei', {
                previewVariant,
            });
        }

        return this._resolveGeneralDetailSmokeGeneral('zhang-fei');
    }

    public onClickEnterBattle() {
        void this._enterBattle();
    }

    public onClickFloodBattle() {
        void this._enterBattle(BattleTactic.FloodAttack);
    }

    /** 開戰：攻城戰先扣主將的攻城壽命（存檔後才切場景），其餘直接切場景 */
    private async _enterBattle(battleTactic?: BattleTactic): Promise<void> {
        const params = this._buildBattleEntryParams(battleTactic);
        const siege = lifespanCommandForBattleKind(this._currentEncounter()?.battleKind);
        if (siege && params.playerGeneralId) {
            await services().session.spendSiegeLifespan(params.playerGeneralId);
        }
        services().scene.switchScene(SceneName.Battle, params);
    }

    /**
     * 大廳目前的開戰關卡（連環破，PROG-2-0215）：取主鏈上第一個已解鎖且未通關的關卡；
     * 全部通關或沒有可用關卡時回到清單第一關。獨立關卡（沒有 chainId）永遠視為已解鎖。
     */
    private _currentEncounter(): EncounterConfig | undefined {
        const cleared = new Set(services().session.clearedStageIds);
        const pending = this._encounters.find((e) => !cleared.has(e.id) && isStageUnlocked(e.id, this._encounters, cleared));
        return pending ?? this._encounters[0];
    }

    private _buildBattleEntryParams(battleTactic?: BattleTactic): IBattleEntryParams {
        const encounter = this._currentEncounter();
        if (!encounter) {
            return {
                ...DEFAULT_BATTLE_ENTRY_PARAMS,
                entrySource: 'lobby',
                selectedCardIds: services().session.deck,
                battleTactic: battleTactic ?? DEFAULT_BATTLE_ENTRY_PARAMS.battleTactic,
            };
        }

        return {
            entrySource: 'lobby',
            encounterId: encounter.id,
            playerGeneralId: services().session.resolveLeadGeneralId(encounter.playerGeneralId),
            enemyGeneralId: encounter.enemyGeneralId,
            playerEquipment: [...(encounter.playerEquipment ?? [])],
            enemyEquipment: [...(encounter.enemyEquipment ?? [])],
            selectedCardIds: services().session.deck,
            weather: normalizeWeather(encounter.weather) ?? DEFAULT_BATTLE_ENTRY_PARAMS.weather,
            battleTactic: battleTactic ?? encounter.battleTactic ?? DEFAULT_BATTLE_ENTRY_PARAMS.battleTactic,
            backgroundId: battleTactic === BattleTactic.FloodAttack ? undefined : encounter.backgroundId,
            tutorial: isTutorialBattle(services().session.clearedStageIds),
        };
    }
}
