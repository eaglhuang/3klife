// @spec-source → 見 docs/cross-reference-index.md
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
import { GameSession } from "./GameSession";
import type { RosterStore } from "./GameSession";
import { PlayerSaveService } from "../services/PlayerSaveService";
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
import { UCUFLogger, LogCategory } from "../utils/UCUFLogger";
import { normalizeVfxEffectTable } from "../config/VfxEffectConfig";
import { normalizeSeasonModifiers, seasonModifiersOf, setActiveSeasonModifiers } from "../systems/SeasonModifiers";

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
        getAll: () => PlayerRosterService.getAll(),
        replaceAll: (generals) => PlayerRosterService.replaceAll(generals),
    };
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
        onGraduated: () => { void this.session.gainDiscoveryExp('nurture-graduate'); },
        // 子嗣奧義覺醒（ULT-15）：奧義母表在 prepareBreeding() 載入
        childUltimate: { definitions: () => this.ultimateDefinitions },
    });
    /** loadUltimateDefinitions() 載入後的奧義母表（只留 id 與繼承基因）；子嗣奧義覺醒用 */
    private ultimateDefinitions: ChildUltimateDefinition[] = [];
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
    });
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
        if (this.initialized) return;

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
        const storageAdapter = this.createSaveStorageAdapter();
        this.session.setSaveService(new PlayerSaveService(storageAdapter));
        // 退役 / 死亡歸檔 / 季結排程與存檔共用同一個儲存後端（key 不同，不會互蓋）
        this.legacy = new LegacyService(storageAdapter);
        this.session.setLifecycle(this.legacy);

        // 血統圖本身不依賴 cc，person-registry.json 由 ResourceManager 讀取
        BloodlineGraph.getInstance().setRegistryLoader(
            () => this.resource.loadJson<PersonRegistryData>('data/person-registry'),
        );

        this.initialized = true;
    }

    /**
     * 選擇玩家存檔後端：瀏覽器用 IndexedDB；原生 SQLite 尚未接線前先用記憶體並警告。
     */
    private createSaveStorageAdapter(): DataStorageAdapter {
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
    public async loadUltimateDefinitions(): Promise<void> {
        try {
            const raw = await this.resource.loadJson<{ data?: Array<{ id?: unknown; inheritanceGeneId?: unknown }> }>('data/master/ultimate-definitions');
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

    /**
     * 結緣畫面開啟前呼叫：載入因子字典與 person-registry.json，再把名冊裡已出生的子嗣補回血統圖。
     * 讀檔後名冊可能多出前幾輪生下的子嗣，所以每次開啟都同步一次（重複呼叫不會重複登記）。
     */
    public async prepareBreeding(): Promise<void> {
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
    /** 載入四季特色修正表（TIME-08）；失敗時退回程式內建預設，遊戲照常進行 */
    public async loadSeasonModifiers(): Promise<void> {
        try {
            const raw = await this.resource.loadJson<unknown>('data/season-modifiers');
            setActiveSeasonModifiers(normalizeSeasonModifiers(raw));
        } catch (e) {
            UCUFLogger.warn(LogCategory.DATA, '[ServiceLoader] season-modifiers.json 載入失敗，使用預設四季修正:', e);
        }
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
