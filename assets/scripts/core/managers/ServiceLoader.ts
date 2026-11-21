// @spec-source → 見 docs/cross-reference-index.md
import { synergyTutorBonusOf } from '../systems/FamilySynergy';
import { Node, sys } from "cc";
import { AudioSystem } from "../systems/AudioSystem";
import { BuffSystem } from "../systems/BuffSystem";
import { MaterialSystem } from "../systems/MaterialSystem";
import { EffectSystem } from "../systems/EffectSystem";
import { EventSystem } from "../systems/EventSystem";
import { FloatTextSystem } from "../systems/FloatTextSystem";
import { FormulaSystem } from "../systems/FormulaSystem";
import { I18nSystem } from "../systems/I18nSystem";
import { MemoryManager } from "../systems/MemoryManager";
import { PoolSystem } from "../systems/PoolSystem";
import { ResourceManager } from "../systems/ResourceManager";
import { ActionSystem } from "../systems/ActionSystem";
import { NpcDialogueService } from "../services/NpcDialogueService";
import { BattleSystem } from "../systems/BattleSystem";
import { NetworkService } from "../systems/NetworkService";
import { SyncManager } from "../systems/SyncManager";
import { NpcMemoryAdapter } from "../dialogue/NpcMemoryAdapter";
import { SceneManager } from "./SceneManager";
import { GameManager } from "./GameManager";
import { GameSession, InMemoryRosterStore } from "./GameSession";
import type { RosterStore, HallMissionWallet } from "./GameSession";
import { loadMissionDataBundle } from "../mission/MissionLoader";
import type { IMissionService } from "../mission/service/IMissionService";
import { PlayerSaveService } from "../services/PlayerSaveService";
import { ApiSaveGateway } from "../api/localserver/ApiSaveGateway";
import { createLocalApi, type LocalApiBundle } from "../api/localserver/createLocalApi";
import { createSupportCardHandler, SUPPORT_CARD_EFFECT_KIND } from "../api/localserver/SupportCardEffect";
import { createGeneralGrantHandler, type GeneralGrantHost } from "../gacha/RewardGachaPull";
import type { DebugHost } from "../api/localserver/DebugCommands";
import type { WalletAuthority } from "../api/localserver/WalletCommands";
import type { IApiClient } from "../../shared/api/IApiClient";
import { LegacyService } from "../services/LegacyService";
import { PlayerRosterService } from "../services/PlayerRosterService";
import { BloodlineGraph } from "../services/BloodlineGraph";
import { HistoricalPairTable } from "../systems/HistoricalPairs";
import { NurtureService } from "../services/NurtureService";
import { BreedingService } from "../services/BreedingService";
import { UnveilingService } from "../services/UnveilingService";
import { buildFactorDictionary, FactorDictionary } from "../systems/FactorInheritance";
import type { ChildUltimateDefinition } from "../systems/ChildUltimateAwaken";
import { parseNpcFriendMentors } from "../systems/NpcFriendMentor";
import type { PersonRegistryData } from "../models/PersonRegistry";
import { DataStorageAdapter } from "../storage/DataStorageAdapter";
import { IndexedDbAdapter } from "../storage/IndexedDbAdapter";
import { MemoryStorageAdapter } from "../storage/MemoryStorageAdapter";
import { UIManager } from "./UIManager";
import { UISpecLoader } from "../../ui/core/UISpecLoader";
import { fertilityConceptionMod } from "../systems/FertilityBoost";
import { ITEM_FERTILITY_ARMED } from "../systems/PlayerInventory";
import { UCUFLogger, LogCategory } from "../utils/UCUFLogger";
import { normalizeVfxEffectTable } from "../config/VfxEffectConfig";
import { STARTER_YOUTH_CONFIG_JSON, configureStarterYouth, type StarterYouthConfig } from "../services/StarterYouthService";
import { normalizeSeasonModifiers, seasonModifiersOf, setActiveSeasonModifiers } from "../systems/SeasonModifiers";
import { CHILD_APTITUDE_RULES_JSON, configureChildAptitudeRules, type ChildAptitudeRulesConfig } from "../systems/ChildAptitudeInheritance";
import { configureFamilyCompatibilityRules, computeFamilyCompatibilityK, FAMILY_COMPATIBILITY_RULES_JSON, type FamilyCompatibilityRulesConfig } from "../systems/FamilyCompatibility";
import { configureMarriageVitalityRules, evaluateMarriageVitality, MARRIAGE_VITALITY_RULES_JSON, type MarriageVitalityRulesConfig } from "../systems/MarriageVitality";
import { BLOODLINE_RESONANCE_RULES_JSON, configureBloodlineResonanceRules, type BloodlineResonanceRulesConfig } from "../systems/BloodlineResonance";
import { configureFamilyMilestoneRules, FAMILY_MILESTONE_RULES_JSON, type FamilyMilestoneRulesConfig } from "../systems/FamilyMilestone";
import { familyPairKey } from "../systems/FamilySynergy";
import { configureWhiteFactorAchievements, WHITE_FACTOR_ACHIEVEMENTS_JSON, type WhiteFactorAchievementsConfig } from "../systems/WhiteFactorTraits";
import { configureMindMarriageRules, MIND_MARRIAGE_RULES_JSON, type MindMarriageRulesConfig } from "../mind/MindMarriage";
import { configureAcademyStories } from "../systems/nurture/AcademyStoryTexts";
import { ACADEMY_ENROLL_RULES_JSON, configureAcademyEnrollRules, type AcademyEnrollRulesConfig } from "../systems/nurture/AcademyEnrollRules";
import { createAcademyQuestAdapter } from "../../shared/quest/AcademyQuest";
import { DEFAULT_QUEST_CONFIG, normalizeQuestConfig } from "../../shared/quest/QuestConfig";
import { FAMILY_CONFIG_JSON } from "../../shared/family/FamilyConfig";
import { OCCUPANCY_MATRIX_JSON } from "../../shared/occupancy/OccupancyMatrix";
import { QUEST_CONFIG_JSON, type QuestConfigV1 } from "../../shared/quest/QuestTypes";
import { DEFAULT_REWARD_CONFIG, normalizeRewardConfig, REWARD_CONFIG_JSON, type RewardConfigV1, type RewardPoolDef } from "../../shared/reward/RewardConfig";
import { DEFAULT_STORY_CONFIG, normalizeStoryConfig, STORY_CONFIG_JSON, type StoryConfigV1 } from "../../shared/story/StoryConfig";
import { ITEM_CONFIG_JSON, normalizeItemConfig, DEFAULT_ITEM_CONFIG, type ItemConfigV1 } from "../../shared/item/ItemConfig";
import { DEFAULT_SUPPORT_CARDS_CONFIG, normalizeSupportCards, SUPPORT_CARDS_JSON, type SupportCardsConfigV1 } from "../../shared/support/SupportCardConfig";
import { DEFAULT_SUPPORT_RULES, normalizeSupportRules, SUPPORT_RULES_JSON, withSupportItems, type SupportRulesV1 } from "../../shared/support/SupportRules";
import { ACADEMY_INHERIT_MARKS_JSON, configureAcademyInheritMarks, type AcademyInheritMarksConfig } from "../systems/nurture/AcademyInheritAndMarks";

export class ServiceLoader {
    private static instance: ServiceLoader | null = null;

    public readonly event = new EventSystem();
    public readonly formula = new FormulaSystem(() => this.session.randomSource());
    public readonly pool = new PoolSystem();
    public readonly resource = new ResourceManager();
    /**
     * UI 三層規格載入器（Layout / Skin / Screen / Template / Widget / i18n）的共享單例。
     * 元件直接取用 services().specLoader，無需自行 new UISpecLoader()。
     * 所有快取共享：同一份 JSON 在整個 session 內只載入一次。
     * Unity 對照：AssetDatabase 共享快取層。
     */
    public readonly specLoader = new UISpecLoader(this.resource);
    public readonly effect = new EffectSystem();
    public readonly buff = new BuffSystem();
    public readonly battle = new BattleSystem();
    public readonly scene = new SceneManager();
    public readonly game = new GameManager();
    /** 長局主迴圈：季度推進、武將增齡、玩家存檔（PROG-2-0021） */
    public readonly session = new GameSession();
    /** 名冊後端：沿用 PlayerRosterService，供長局主迴圈與養成服務共用 */
    private readonly rosterStore: RosterStore = {
        getAll: () => (this.ephemeralStorage ? this.ephemeralRoster.getAll() : PlayerRosterService.getAll()),
        replaceAll: (generals) => (this.ephemeralStorage ? this.ephemeralRoster.replaceAll(generals) : PlayerRosterService.replaceAll(generals)),
        // 暫時模式用負數，切換模式時版本號一定不同，唯讀快照會重讀
        version: () => (this.ephemeralStorage ? -1 - this.ephemeralRoster.version() : PlayerRosterService.version()),
    };
    /** 暫時狀態模式（QA 直進戰場，PROG-2-9127）：true 時存檔與名冊都只放記憶體，不讀寫玩家真實存檔 */
    private ephemeralStorage = false;
    private readonly ephemeralRoster = new InMemoryRosterStore();
    /** 宿命選擇（5 歲開獎後順應或逆天，PROG-2-0028） */
    public readonly unveiling = new UnveilingService(this.rosterStore, this.session.randomSource);
    /** 36 回合培育與教官（PROG-2-0028）；季度與模式取自 session 時鐘 */
    public readonly nurture = new NurtureService(this.rosterStore, {
        random: this.session.randomSource,
        currentSeason: () => this.session.gameTime.totalSeasonsElapsed,
        currentMode: () => this.session.gameTime.currentMode,
        seasonTrainingVigorMod: () => seasonModifiersOf(this.session.gameTime.currentSeason).trainingStaminaMultiplier,
        // 因子覺醒（PROG-2-0044）：訓練回合擲培育窺探 / 教官覺醒；畢業給 discoveryLevel 經驗
        awakening: this.session.nurtureAwakeningHooks(),
        adultTemplateOf: (generalId) => this.session.adultTemplateOf(generalId),
        onGraduated: () => { void this.session.gainDiscoveryExp('nurture-graduate'); },
        // 子嗣奧義覺醒（ULT-15）：奧義母表在 prepareBreeding() 載入
        childUltimate: { definitions: () => this.ultimateDefinitions },
        clanTraditionKind: () => this.session.clanTradition?.kind,
        synergyTutorBonus: (mentors) => synergyTutorBonusOf(mentors, this.session.familySynergy),
        compatibilityBonusForChild: (child, roster) => {
            const father = child.fatherId ? roster.find((g) => g.id === child.fatherId) : undefined;
            const mother = child.motherId ? roster.find((g) => g.id === child.motherId) : undefined;
            if (!father || !mother) return 0;
            const fatherFamily = (father as { familyUid?: string }).familyUid;
            const motherFamily = (mother as { familyUid?: string }).familyUid;
            const pairKey = fatherFamily && motherFamily ? familyPairKey(fatherFamily, motherFamily) : undefined;
            const pairRecord = pairKey ? this.session.familySynergy.pairs[pairKey] : undefined;
            const epithetSynergyBonus = evaluateMarriageVitality({
                father,
                mother,
                hasCommonAncestor: false,
            }).synergyBonus;
            return computeFamilyCompatibilityK({
                fatherStats: father.stats,
                motherStats: mother.stats,
                pairRecord,
                epithetSynergyBonus,
            }).totalK;
        },
    });
    /** loadUltimateDefinitions() 載入後的奧義母表（只留 id 與繼承基因）；子嗣奧義覺醒用 */
    private ultimateDefinitions: ChildUltimateDefinition[] = [];
    /** 奧義 id → 顯示名（PROG-2-1780）；loadUltimateDefinitions() 載入，含沒有繼承基因的奧義 */
    private ultimateNames = new Map<string, string>();
    /** loadFactorDictionary() 載入後的因子字典；結緣產生子嗣時用來補因子名稱與顏色 */
    private factorDictionary: FactorDictionary | undefined;
    /** loadHistoricalPairs() 載入後的史實配對表（KIN-02）；結緣契合與宿敵受孕率讀它 */
    private historicalPairs: HistoricalPairTable | undefined;
    /** 結緣（PROG-2-0045）：名冊與血統圖接線，亂數與季度取自 session */
    public readonly breeding = new BreedingService(this.rosterStore, BloodlineGraph.getInstance(), {
        random: this.session.randomSource,
        currentSeason: () => this.session.gameTime.totalSeasonsElapsed,
        seasonConceptionMod: () => seasonModifiersOf(this.session.gameTime.currentSeason).conceptionMultiplier,
        getDictionary: () => this.factorDictionary,
        getFemaleSource: (uid) => this.session.femaleSources[uid] ?? null,
        getHistoricalPairs: () => this.historicalPairs,
        itemConceptionMod: () => fertilityConceptionMod(this.session.itemCount(ITEM_FERTILITY_ARMED) > 0),
        onBreedPerformed: () => this.session.clearFertilityArm(),
        clanPrestigeTier: () => this.session.clanPrestigeTier,
        relationLedger: this.session.relationEvents,
        getFamilySynergy: () => this.session.familySynergy,
        getParentMood: (id) => this.session.mind.moodOf(id),
        onMarriageConceived: (ctx) => this.session.onMarriageConceived(ctx),
    });
    private bloodlineRulesLoaded = false;
    /** 退役教官卡 / 英靈卡來源；init() 之後才有（共用存檔後端）。培育畫面用它挑教官 */
    public legacy: LegacyService | null = null;
    public readonly ui = new UIManager();
    public readonly network = new NetworkService();
    public readonly sync = new SyncManager();
    /** 三國大腦中台 API facade：Cocos UI 只透過此服務呼叫 NPC brain，不直接散落 HTTP。 */
    public readonly npcDialogue = new NpcDialogueService();
    /** 玩家-武將互動記憶回寫 adapter：訂閱全域事件後 fire-and-forget 寫回 npc-brain。 */
    public readonly npcMemory = new NpcMemoryAdapter();
    /** 音效系統：BGM、SFX、循環音效，含 50ms 防重複播放 */
    public readonly audio = new AudioSystem();
    /** 多國語系系統：t(key) 字串查詢 + 語系字型懶載入 / 卸載 */
    public readonly i18n = new I18nSystem();
    /**
     * 動態飄字系統：傷害數字、狀態效果、提示文字統一入口。
     * 需在 UnitRenderer.initialize() 後呼叫 setup(uiRoot, camera, canvas) 才能運作。
     */
    public readonly floatText = new FloatTextSystem();
    /**
     * 材質 / Shader 管理系統：per-unit Material 實例、Shader 預熱、服裝染色。
     * 需在 BattleScene.start() 中：
     *   1. registerShader() 登錄所有 Shader
     *   2. await material.warmupCritical(this.node) 預熱
     *   3. bindUnit() + applyOutfit() 為每個 unit 套用服裝
     */
    public readonly material = new MaterialSystem();
    /**
     * 記憶體管理器：追蹤所有經 ResourceManager 、VfxComposerTool 等入口載入的資源。
     * 目前為純追蹤空殼，預留完整擴充點（LRU弱引用、場景切換批次釋放、記憶體上限警示）。
     * Unity 對照：Addressables 的 AssetReference 追蹤 + Unity Profiler Memory Tracker。
     */
    public readonly memory = new MemoryManager();
    /**
     * 技能演出系統：從 skills.json 讀取時間軸定義，依序播放動畫、VFX、音效、傷害與 Buff。
     * 使用前需先呼叫 action.registerSkills(defs)（在 ResourceManager 載入 skills.json 後）。
     * Unity 對照：PlayableDirector + Timeline，技能 track 以 atTime 定義觸發時序。
     */
    public readonly action = new ActionSystem();

    private initialized = false;

    public static getInstance(): ServiceLoader {
        if (!this.instance) {
            this.instance = new ServiceLoader();
        }
        return this.instance;
    }

    /**
     * 初始化所有服務。
     *
     * @param hostNode 宿主節點（AudioSystem 的 AudioSource 必須掛在活躍節點上）
     *                 若不傳入則 AudioSystem 無法初始化（音效功能停用）。
     */
    public initialize(hostNode?: Node): void {
        if (this.initialized) {
            // 第一次初始化可能沒帶節點（或宿主已隨場景銷毀）；之後任何帶節點的呼叫都能把音源補掛回來
            if (hostNode && !this.audio.isReady()) this.audio.setup(hostNode);
            return;
        }

        this.battle.setEventSystem(this.event);
        this.game.setEventSystem(this.event);
        this.effect.setup(this.pool);
        // ResourceManager 連動 MemoryManager，使所有資源載入/釋放都通報記憶體管理器
        this.resource.bindMemoryManager(this.memory);
        // M8 P3: LRU 逐出時通知 ResourceManager 強制釋放快取，避免記憶體洩漏
        // Unity 對照：Addressables.Release(handle) 在 OnAssetUnloaded 回呼中執行
        this.memory.onAssetEvicted = (key: string) => {
            this.resource.forceRelease(key);
        };
        // AudioSystem 需要 Node 才能掛 AudioSource，僅在有宿主節點時初始化
        if (hostNode) {
            this.audio.setup(hostNode);
        } else {
            UCUFLogger.warn(LogCategory.LIFECYCLE, "[ServiceLoader] 未傳入 hostNode，AudioSystem 未初始化（音效功能停用）");
        }

        // 啟動跨平台網路偵測與自動離線佇列同步服務
        this.network.setup(this.event);
        this.sync.setup(this.event, this.network);
        this.npcMemory.setup(this.event, this.npcDialogue, this.sync);

        // 長局主迴圈：名冊沿用 PlayerRosterService，存檔後端依平台選擇
        this.session.setEventEmitter(this.event);
        this.session.setRosterStore(this.rosterStore);
        this.session.setNurtureStatePort(this.nurture);
        this.bindSaveStorage();

        // 血統圖本身不依賴 cc，person-registry.json 由 ResourceManager 讀取
        BloodlineGraph.getInstance().setRegistryLoader(
            () => this.resource.loadJson<PersonRegistryData>('data/person-registry'),
        );

        // 讀檔完成處統一補血統圖：先載 person-registry（只載一次），再把名冊子嗣補回圖
        this.session.setPostLoadHook(async () => {
            await BloodlineGraph.getInstance().loadRegistry();
            this.breeding.syncGraphFromRoster();
        });

        this.initialized = true;
    }

    /** 本機 API 組合（存檔命令＋錢包命令）；bindSaveStorage() 建立，暫時狀態模式切換時重建 */
    private localApi: LocalApiBundle | null = null;
    /** 物品庫存設定（item-config.json，PROG-2-9203）；載入前用內建預設，API 重建時沿用 */
    private itemConfig: ItemConfigV1 = DEFAULT_ITEM_CONFIG;
    /** 學府支援卡資料（academy-support-cards.json，PROG-2-9240）；卡片的物品定義由此推導併入 itemConfig，不在 item-config.json 重複列 */
    private supportCards: SupportCardsConfigV1 = DEFAULT_SUPPORT_CARDS_CONFIG;
    /** 支援卡成長規則與經驗材料（support-rules.json，PROG-2-9241）；卡的 growth 與材料物品由此推導 */
    private supportRules: SupportRulesV1 = DEFAULT_SUPPORT_RULES;
    /** 獎勵設定（reward-config.json，PROG-2-9205）；載入前用空設定，API 重建時沿用 */
    private rewardConfig: RewardConfigV1 = DEFAULT_REWARD_CONFIG;
    private questConfig: QuestConfigV1 = DEFAULT_QUEST_CONFIG;
    /** 劇情設定（story-config.json，PROG-2-9208）；載入前用空設定，API 重建時沿用 */
    private storyConfig: StoryConfigV1 = DEFAULT_STORY_CONFIG;
    /** 場景綁定的權威錢包；API 重建時沿用 */
    private walletAuthority: WalletAuthority | null = null;

    /** 共通 API 入口：玩法與 UI 只透過它改重要數值與存檔（單機＝本機伺服器 adapter，之後可換網路 adapter） */
    public get api(): IApiClient {
        if (!this.localApi) throw new Error('[ServiceLoader] API 尚未初始化（先 init()）');
        return this.localApi.api;
    }

    /** 轉蛋獎池（GCH-R4）：開啟轉蛋畫面時才展開名冊載入，離開即釋放；非 null 時疊在基礎設定上 */
    private gachaRewardPools: RewardPoolDef[] | null = null;
    /** 發武將的宿主入口（kind "general" handler 用）；API 重建時沿用 */
    private generalGrantHost: GeneralGrantHost | null = null;

    /** 物品設定＝item-config.json＋支援卡與材料推導的物品定義；任一份重載後都要重新換入 */
    private applyItemConfig(): void {
        this.localApi?.setItemConfig(withSupportItems(this.itemConfig, this.supportCards, this.supportRules));
    }

    private applyRewardConfig(): void {
        const extra = this.gachaRewardPools;
        const config = extra && extra.length > 0
            ? { ...this.rewardConfig, pools: [...this.rewardConfig.pools.filter((p) => !extra.some((e) => e.id === p.id)), ...extra] }
            : this.rewardConfig;
        this.localApi?.setRewardConfig(config);
    }

    /** 換入（或釋放，傳 null）轉蛋獎池；不改基礎設定檔 */
    public setGachaRewardPools(pools: RewardPoolDef[] | null): void {
        this.gachaRewardPools = pools;
        this.applyRewardConfig();
    }

    /** 綁定發武將入口（kind "general"）；傳 null 解除。經宿主的名冊入口入冊，不直接寫存檔 */
    public bindGeneralGrantHost(host: GeneralGrantHost | null): void {
        this.generalGrantHost = host;
        if (host) this.localApi?.registerRewardEffect('general', createGeneralGrantHandler(host));
    }

    /** 場景在建好錢包服務後綁定權威錢包；可重複呼叫（換場景時換成新的服務） */
    public bindWalletAuthority(wallet: WalletAuthority | null): void {
        this.walletAuthority = wallet;
        this.localApi?.setWallet(wallet);
    }

    /** 偵錯宿主（PROG-2-9192）：大廳場景只在網址帶 qa 參數時綁定；API 重建時沿用，沒綁定時 debug.fastForward 回 E107 */
    private debugHost: DebugHost | null = null;

    public bindDebugHost(host: DebugHost | null): void {
        this.debugHost = host;
        this.localApi?.setDebugHost(host);
    }

    /** 存檔與退役歸檔共用同一個儲存後端（key 不同，不會互蓋）；初始化與切換暫時狀態時呼叫 */
    private bindSaveStorage(): void {
        const storageAdapter = this.createSaveStorageAdapter();
        // 共通 API（PROG-2-9201）：存檔寫入與讀取都走本機伺服器 adapter 的 save.* 命令；GameSession 不直接碰存檔後端
        this.localApi = createLocalApi(new PlayerSaveService(storageAdapter));
        this.localApi.setWallet(this.walletAuthority);
        this.localApi.setDebugHost(this.debugHost);
        // 技能命令（PROG-2-9204）：持有與學習權威由 GameSession 提供，結業戰法經 skill.grant 寫入
        this.localApi.setSkillHost(this.session.skillHost);
        this.session.setSkillApi(this.localApi.api);
        // 人員占用（PROG-2-9207）：登記表（academy／mentorAssign）＋六處唯讀轉接器由 GameSession 提供，寫入走 occupancy.* 命令
        this.localApi.setOccupancyHost(this.session.occupancyHost);
        // 家族（PROG-2-9582）：配偶納入名冊走 family.enrollSpouse，上限與去重由 GameSession 判定
        this.localApi.setFamilyHost({
            // 家族設定是延遲載入（loadBloodlineRuleTables）；入口命令先等它載好，避免流程在設定前到達而誤判 FAMILY_NO_CONFIG
            enrollGeneratedSpouse: async (slot) => {
                await this.loadBloodlineRuleTables();
                return this.session.spouseHost.enrollGeneratedSpouse(slot);
            },
            enrollBond: async (generalId) => { await this.loadBloodlineRuleTables(); return this.session.spouseHost.enrollBond(generalId); },
            enrollDiplomatic: async (nationId) => { await this.loadBloodlineRuleTables(); return this.session.spouseHost.enrollDiplomatic(nationId); },
            matchmakerOffer: async () => { await this.loadBloodlineRuleTables(); return this.session.spouseHost.matchmakerOffer(); },
            enrollMatchmaker: async (pick) => { await this.loadBloodlineRuleTables(); return this.session.spouseHost.enrollMatchmaker(pick); },
        });
        // 學府修業（PROG-2-9215）：紀錄讀寫（save.read／save.write domain=academy）與種子簽發（rng.issueSeed）由 GameSession 提供
        this.localApi.setAcademyHost(this.session.academyHost);
        // 物品庫存（PROG-2-9203）：家庭倉庫＝玩家庫存表；季結的定期發放與入學／退還都走 item.* 命令
        this.applyItemConfig();
        this.localApi.setItemAuthority(this.session.itemAuthority());
        this.session.setItemApi(this.localApi.api);
        // 獎勵 base（PROG-2-9205）：獎池／套件設定、亂數會話與保底存在 GameSession，戰後里程碑獎勵走 reward.claim
        this.applyRewardConfig();
        // 支援卡發放（PROG-2-9242）：入學／傳承／傳承滿轉學分都走 item.* 命令；卡表與規則用 getter，設定重載後立即生效
        this.localApi.registerRewardEffect(SUPPORT_CARD_EFFECT_KIND, createSupportCardHandler(() => ({ cards: this.supportCards, rules: this.supportRules })));
        if (this.generalGrantHost) this.localApi.registerRewardEffect('general', createGeneralGrantHandler(this.generalGrantHost));
        this.localApi.setRewardAuthority(this.session.rewardAuthority());
        this.session.setRewardApi(this.localApi.api);
        // 任務 base（PROG-2-9209 QST-M）：定義與實例狀態；academy 種類 adapter 先掛預設（A0 接學府結業評級時再換），結算走 reward.claim、占用走 occupancy.*
        this.localApi.setQuestConfig(this.questConfig);
        this.localApi.setQuestAuthority(this.session.questAuthority());
        this.localApi.registerQuestKind(createAcademyQuestAdapter());
        // 劇情 base（PROG-2-9208）：劇本設定與旗標、已看、打斷佇列存在 GameSession
        this.localApi.setStoryConfig(this.storyConfig);
        this.localApi.setStoryAuthority(this.session.storyAuthority());
        this.session.setSaveService(new ApiSaveGateway(this.localApi.api));
        // 退役 / 死亡歸檔 / 季結排程與存檔共用同一個儲存後端（key 不同，不會互蓋）
        this.legacy = new LegacyService(storageAdapter);
        this.session.setLifecycle(this.legacy);
    }

    /**
     * 改用暫時狀態（PROG-2-9127）：存檔後端換成記憶體、名冊不讀寫 localStorage，離開頁面即消失。
     * 只給網頁 `?qaBattle=1` 直進戰場入口使用；初始化前後呼叫皆可，重複呼叫無副作用。
     */
    public useEphemeralStorage(): void {
        if (this.ephemeralStorage) return;
        this.ephemeralStorage = true;
        if (this.initialized) this.bindSaveStorage();
    }

    /**
     * 選擇玩家存檔後端：瀏覽器用 IndexedDB；原生 SQLite 尚未接線前先用記憶體並警告。
     * 暫時狀態模式一律用記憶體。
     */
    private createSaveStorageAdapter(): DataStorageAdapter {
        if (this.ephemeralStorage) return new MemoryStorageAdapter();
        if (!sys.isNative && typeof indexedDB !== "undefined") {
            return new IndexedDbAdapter();
        }
        UCUFLogger.warn(LogCategory.DATA, "[ServiceLoader] 目前平台沒有可用的持久化存檔後端，改用記憶體暫存（重開後不會保留）");
        return new MemoryStorageAdapter();
    }

    /**
     * 載入因子字典，讓 5 歲開獎的宿命建議能依因子分武 / 文。
     * 沒載入時宿命建議退回只看五維，不會中斷遊戲。
     */
    /** 載入暫定史實配對名單（KIN-02）；失敗時退回沒有配對，契合與宿敵效果不生效 */
    public async loadHistoricalPairs(): Promise<void> {
        try {
            const raw = await this.resource.loadJson<unknown>('data/historical-relations');
            this.historicalPairs = HistoricalPairTable.load(raw).table;
        } catch (e) {
            UCUFLogger.warn(LogCategory.DATA, '[ServiceLoader] historical-relations.json 載入失敗，史實配對暫不生效:', e);
        }
    }

    /** 已載入的史實配對表；未載入或失敗時為 null（戰場合攻讀它） */
    public historicalPairTable(): HistoricalPairTable | null {
        return this.historicalPairs ?? null;
    }

    /** NPC 好友教官清單（MENT-14 MVP）：資料表載入失敗時清單為空，借用入口不可用 */
    public async loadNpcFriendMentors(): Promise<void> {
        try {
            const raw = await this.resource.loadJson<{ data?: unknown[] }>('data/npc-friend-mentors');
            this.session.setNpcFriendMentors(parseNpcFriendMentors(raw));
        } catch (e) {
            UCUFLogger.warn(LogCategory.DATA, '[ServiceLoader] npc-friend-mentors.json 載入失敗，好友借用清單為空:', e);
        }
    }

    /** 載入奧義母表的 id 與 inheritanceGeneId；失敗時子嗣奧義覺醒不擲骰，其餘培育不受影響。 */
    public ultimateNameOf(ultimateId: string): string | undefined {
        return this.ultimateNames.get(ultimateId);
    }

    public async loadUltimateDefinitions(): Promise<void> {
        try {
            const raw = await this.resource.loadJson<{ data?: Array<{ id?: unknown; name?: unknown; inheritanceGeneId?: unknown }> }>('data/master/ultimate-definitions');
            this.ultimateNames = new Map((raw?.data ?? [])
                .filter((d) => typeof d.id === 'string' && typeof d.name === 'string')
                .map((d) => [d.id as string, d.name as string]));
            this.ultimateDefinitions = (raw?.data ?? [])
                .filter((d): d is { id: string; inheritanceGeneId: string } => typeof d.id === 'string' && typeof d.inheritanceGeneId === 'string')
                .map((d) => ({ ultimateId: d.id, inheritanceGeneId: d.inheritanceGeneId }));
        } catch (e) {
            UCUFLogger.warn(LogCategory.DATA, '[ServiceLoader] ultimate-definitions.json 載入失敗，子嗣奧義覺醒停用:', e);
        }
    }

    public async loadFactorDictionary(): Promise<void> {
        try {
            const raw = await this.resource.loadJson<{ data?: [] }>('data/master/gene-dictionary');
            this.factorDictionary = buildFactorDictionary(raw as Parameters<typeof buildFactorDictionary>[0]);
            this.session.setFactorDictionary(this.factorDictionary);
        } catch (e) {
            UCUFLogger.warn(LogCategory.DATA, '[ServiceLoader] gene-dictionary.json 載入失敗，宿命建議退回只看五維:', e);
        }
    }

    /** 載入血統規則資料表（適性繼承、門風契合 K、生平閱歷白因子，PROG-2-9168）；單表失敗時退回預設值 */
    public async loadBloodlineRuleTables(force = false): Promise<void> {
        if (this.bloodlineRulesLoaded && !force) return;
        const loadSafe = async <T>(path: string, apply: (raw: T) => void): Promise<void> => {
            try {
                const raw = await this.resource.loadJson<T>(path);
                if (raw) apply(raw);
            } catch (e) {
                UCUFLogger.warn(LogCategory.DATA, `[ServiceLoader] ${path}.json 載入失敗，退回內建預設:`, e);
            }
        };
        await Promise.all([
            loadSafe<Partial<ChildAptitudeRulesConfig>>(CHILD_APTITUDE_RULES_JSON, configureChildAptitudeRules),
            loadSafe<Partial<FamilyCompatibilityRulesConfig>>(FAMILY_COMPATIBILITY_RULES_JSON, configureFamilyCompatibilityRules),
            loadSafe<Partial<WhiteFactorAchievementsConfig>>(WHITE_FACTOR_ACHIEVEMENTS_JSON, configureWhiteFactorAchievements),
            loadSafe<Partial<BloodlineResonanceRulesConfig>>(BLOODLINE_RESONANCE_RULES_JSON, configureBloodlineResonanceRules),
            loadSafe<Partial<FamilyMilestoneRulesConfig>>(FAMILY_MILESTONE_RULES_JSON, configureFamilyMilestoneRules),
            loadSafe<Partial<MindMarriageRulesConfig>>(MIND_MARRIAGE_RULES_JSON, configureMindMarriageRules),
            loadSafe<Partial<AcademyInheritMarksConfig>>(ACADEMY_INHERIT_MARKS_JSON, configureAcademyInheritMarks),
            loadSafe<Partial<AcademyEnrollRulesConfig>>(ACADEMY_ENROLL_RULES_JSON, configureAcademyEnrollRules),
            loadSafe<unknown>(STORY_CONFIG_JSON, (raw) => { this.storyConfig = normalizeStoryConfig(raw); this.localApi?.setStoryConfig(this.storyConfig); configureAcademyStories(this.storyConfig); }),
            loadSafe<unknown>(REWARD_CONFIG_JSON, (raw) => { this.rewardConfig = normalizeRewardConfig(raw); this.applyRewardConfig(); }),
            loadSafe<unknown>(QUEST_CONFIG_JSON, (raw) => { this.questConfig = normalizeQuestConfig(raw); this.localApi?.setQuestConfig(this.questConfig); }),
            loadSafe<unknown>(ITEM_CONFIG_JSON, (raw) => { this.itemConfig = normalizeItemConfig(raw); this.applyItemConfig(); }),
            loadSafe<unknown>(SUPPORT_CARDS_JSON, (raw) => { this.supportCards = normalizeSupportCards(raw); this.applyItemConfig(); }),
            loadSafe<unknown>(SUPPORT_RULES_JSON, (raw) => { this.supportRules = normalizeSupportRules(raw); this.applyItemConfig(); }),
            loadSafe<Partial<MarriageVitalityRulesConfig>>(MARRIAGE_VITALITY_RULES_JSON, configureMarriageVitalityRules),
        ]);
        // 家族設定（PROG-2-9441 F1）：缺檔或缺欄位 fail-fast，不退回預設（與上面 loadSafe 的容錯刻意不同）
        this.session.configureFamily(await this.resource.loadJson<unknown>(FAMILY_CONFIG_JSON));
        // 人員占用互斥矩陣（PROG-2-9442）：同樣 fail-fast，規則只在 JSON
        this.session.configureOccupancyMatrix(await this.resource.loadJson<unknown>(OCCUPANCY_MATRIX_JSON));
        this.bloodlineRulesLoaded = true;
    }

    /**
     * 結緣畫面開啟前呼叫：載入因子字典與 person-registry.json，再把名冊裡已出生的子嗣補回血統圖。
     * 讀檔時已由 session 的讀檔後處理補過一次；這裡再同步是給新局（沒有讀檔）的初代武將補虛擬祖先，重複呼叫不會重複登記。
     */
    public async prepareBreeding(): Promise<void> {
        await this.loadBloodlineRuleTables();
        if (!this.factorDictionary) {
            await this.loadFactorDictionary();
        }
        if (this.ultimateDefinitions.length === 0) {
            await this.loadUltimateDefinitions();
        }
        await this.loadNpcFriendMentors();
        if (!this.historicalPairs) {
            await this.loadHistoricalPairs();
        }
        await BloodlineGraph.getInstance().loadRegistry();
        this.breeding.syncGraphFromRoster();
    }

    /**
     * 非同步載入 skills.json 並注冊至 ActionSystem。
     * 建議在 BattleScene.start() 中 await 此函式，確保技能在戰鬥開始前已就緒。
     */
    public async loadSkills(): Promise<void> {
        try {
            const defs = await this.resource.loadJson<import('../systems/ActionSystem').SkillDef[]>('data/skills');
            this.action.registerSkills(defs);
        } catch (e) {
            UCUFLogger.warn(LogCategory.DATA, '[ServiceLoader] skills.json 載入失敗，技能演出停用:', e);
        }
    }

    /**
     * 非同步載入 vfx-effects.json 並批量注冊至 EffectSystem。
     * 建議在 BattleScene.start() 中與 loadSkills() 一起 await。
     */
    /** 載入開局少年名將設定（PROG-2-9194）；失敗時退回內建預設 */
    public async loadStarterYouthConfig(): Promise<void> {
        try {
            const raw = await this.resource.loadJson<Partial<StarterYouthConfig>>(STARTER_YOUTH_CONFIG_JSON);
            configureStarterYouth(raw);
        } catch (e) {
            UCUFLogger.warn(LogCategory.DATA, '[ServiceLoader] starter-youth-config.json 載入失敗，使用內建預設:', e);
        }
    }

    /** 載入四季特色修正表（TIME-08）；失敗時退回程式內建預設，遊戲照常進行 */
    public async loadSeasonModifiers(): Promise<void> {
        try {
            const raw = await this.resource.loadJson<unknown>('data/season-modifiers');
            setActiveSeasonModifiers(normalizeSeasonModifiers(raw));
        } catch (e) {
            UCUFLogger.warn(LogCategory.DATA, '[ServiceLoader] season-modifiers.json 載入失敗，使用預設四季修正:', e);
        }
    }

    /**
     * 載入通用任務資料包並建立任務服務（PROG-2-9148）：資料包驗證失敗回傳 null（任務牆維持載入失敗字樣，不退回假資料）。
     * 服務由 GameSession 持有，UI 一律走 session.missionService。
     */
    public async bindMissionData(wallet: HallMissionWallet): Promise<IMissionService | null> {
        const loaded = await loadMissionDataBundle((path) => this.resource.loadJson<unknown>(path));
        if (!loaded.ok) {
            UCUFLogger.warn(LogCategory.DATA, '[ServiceLoader] 通用任務資料載入或驗證失敗:', loaded.issues);
            return null;
        }
        const generated = this.session.bindMissionData(loaded.bundle, wallet);
        if (generated) {
            this.session.save().catch((error: unknown) => UCUFLogger.warn(LogCategory.DATA, '[ServiceLoader] 任務初次產生後存檔失敗', error));
        }
        return this.session.missionService;
    }

    public async loadVfxEffects(): Promise<void> {
        try {
            const rawTable = await this.resource.loadJson<unknown>('data/vfx-effects');
            const table = normalizeVfxEffectTable(rawTable);
            this.effect.registerEffects(table.effects);
        } catch (e) {
            UCUFLogger.warn(LogCategory.DATA, '[ServiceLoader] vfx-effects.json 載入失敗，三位一體特效停用:', e);
        }
    }
}

export function services(): ServiceLoader {
    return ServiceLoader.getInstance();
}
