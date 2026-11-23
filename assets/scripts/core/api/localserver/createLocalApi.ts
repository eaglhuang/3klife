// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.8 啟動時綁定 adapter；PROG-2-9201、PROG-2-9203
/**
 * createLocalApi — 組裝單機的本機伺服器 adapter：掛上存檔命令、錢包命令、物品庫存命令與獎勵命令。
 *
 * 錢包權威由場景在 LocalGachaService 建好後以 setWallet 綁定（命令處理器每次呼叫才取，所以可後綁、可換）。
 * 物品庫存的存放位置（家庭倉庫＝GameSession 的玩家庫存表）由 setItemAuthority 綁定；設定由 setItemConfig 換入。
 * 劇情（PROG-2-9208）的狀態存放由 setStoryAuthority 綁定、劇本設定由 setStoryConfig 換入。
 * 獎勵（PROG-2-9205）的狀態存放由 setRewardAuthority 綁定、設定由 setRewardConfig 換入；
 * 宿主自訂效果種類（技能習得等）用 registerRewardEffect 掛 handler，條件評估與倍率由 setRewardHooks 提供。
 * 任務（PROG-2-9209）的狀態存放由 setQuestAuthority 綁定、定義由 setQuestConfig 換入；
 * 任務種類 adapter（academy…）用 registerQuestKind 掛，條件評估與時鐘由 setQuestHooks 提供。
 */
import { DEFAULT_ITEM_CONFIG, type ItemConfigV1 } from '../../../shared/item/ItemConfig';
import { DEFAULT_REWARD_CONFIG, type RewardConfigV1 } from '../../../shared/reward/RewardConfig';
import { DEFAULT_STORY_CONFIG, type StoryConfigV1 } from '../../../shared/story/StoryConfig';
import { registerFamilyCommands, type FamilyHost } from './FamilyCommands';
import { registerDebugCommands, type DebugHost } from './DebugCommands';
import { registerItemCommands, type ItemAuthority } from './ItemCommands';
import { registerStoryCommands, type StoryAuthority, type StoryEffectHandler, type StoryPorts } from './StoryCommands';
import { registerRewardCommands, type RewardAuthority, type RewardEffectHandler, type RewardPorts } from './RewardCommands';
import { LocalApiAdapter, type LocalApiAdapterOptions } from './LocalApiAdapter';
import { registerOccupancyCommands, type OccupancyHost } from './OccupancyCommands';
import { DEFAULT_QUEST_CONFIG } from '../../../shared/quest/QuestConfig';
import type { QuestKindAdapter } from '../../../shared/quest/QuestService';
import type { QuestConfigV1 } from '../../../shared/quest/QuestTypes';
import { registerQuestCommands, type QuestAuthority, type QuestPorts } from './QuestCommands';
import { registerSkillCommands, type SkillHost } from './SkillCommands';
import { registerAcademyHostCommands, type AcademyHost } from './AcademyHostCommands';
import { registerSaveCommands, type LocalSaveStore } from './SaveCommands';
import { registerWalletCommands, type WalletAuthority } from './WalletCommands';

export interface LocalApiBundle {
    api: LocalApiAdapter;
    setWallet(wallet: WalletAuthority | null): void;
    /** 綁定技能宿主（單機＝GameSession）；命令處理器每次呼叫才取，可後綁、可換 */
    setSkillHost(host: SkillHost | null): void;
    /** 綁定人員占用宿主（單機＝GameSession）；命令處理器每次呼叫才取 */
    setOccupancyHost(host: OccupancyHost | null): void;
    /** 綁定偵錯宿主（大廳場景在網址帶 qa 參數時才綁）；沒綁定時 debug.fastForward 回 E107 */
    setDebugHost(host: DebugHost | null): void;
    /** 綁定家族宿主（配偶納入名冊；PROG-2-9582） */
    setFamilyHost(host: FamilyHost | null): void;
    /** 綁定學府宿主（單機＝GameSession）：save.read／save.write（domain=academy）與 rng.issueSeed */
    setAcademyHost(host: AcademyHost | null): void;
    setItemAuthority(authority: ItemAuthority | null): void;
    setItemConfig(config: ItemConfigV1): void;
    setRewardAuthority(authority: RewardAuthority | null): void;
    setRewardConfig(config: RewardConfigV1): void;
    /** 任務（QST-M）：狀態存放綁定與定義換入 */
    setQuestAuthority(authority: QuestAuthority | null): void;
    setQuestConfig(config: QuestConfigV1): void;
    /** 掛上任務種類 adapter（決定成敗等級）；同種類以後者為準 */
    registerQuestKind(adapter: QuestKindAdapter): void;
    /** 任務條件評估與季序時鐘（宿主以權威存檔提供） */
    setQuestHooks(hooks: Pick<QuestPorts, 'evaluate' | 'nowIndex'>): void;
    /** 掛上宿主自訂的獎勵效果種類（例如 tacticLearn）；同名以後者為準 */
    registerRewardEffect(kind: string, handler: RewardEffectHandler): void;
    /** 條件評估、倍率、熵來源（測試固定種子用） */
    setRewardHooks(hooks: Pick<RewardPorts, 'evaluate' | 'modifiers' | 'entropy'>): void;
    setStoryAuthority(authority: StoryAuthority | null): void;
    setStoryConfig(config: StoryConfigV1): void;
    /** 掛上宿主自訂的劇情效果種類（例如任務生成）；同名以後者為準 */
    registerStoryEffect(kind: string, handler: StoryEffectHandler): void;
    /** 條件事實（數值、持有物、官職階位） */
    setStoryHooks(hooks: Pick<StoryPorts, 'facts'>): void;
}

export function createLocalApi(store: LocalSaveStore, opts: LocalApiAdapterOptions = {}): LocalApiBundle {
    const api = new LocalApiAdapter(opts);
    let wallet: WalletAuthority | null = null;
    let authority: ItemAuthority | null = null;
    let config: ItemConfigV1 = DEFAULT_ITEM_CONFIG;
    let skillHost: SkillHost | null = null;
    let occupancyHost: OccupancyHost | null = null;
    let debugHost: DebugHost | null = null;
    let familyHost: FamilyHost | null = null;
    let academyHost: AcademyHost | null = null;
    let rewardAuthority: RewardAuthority | null = null;
    let rewardConfig: RewardConfigV1 = DEFAULT_REWARD_CONFIG;
    let rewardHooks: Pick<RewardPorts, 'evaluate' | 'modifiers' | 'entropy'> = {};
    const rewardHandlers: Record<string, RewardEffectHandler> = {};
    let questAuthority: QuestAuthority | null = null;
    let questConfig: QuestConfigV1 = DEFAULT_QUEST_CONFIG;
    let questHooks: Pick<QuestPorts, 'evaluate' | 'nowIndex'> = {};
    const questKinds: Record<string, QuestKindAdapter> = {};
    let storyAuthority: StoryAuthority | null = null;
    let storyConfig: StoryConfigV1 = DEFAULT_STORY_CONFIG;
    let storyHooks: Pick<StoryPorts, 'facts'> = {};
    const storyHandlers: Record<string, StoryEffectHandler> = {};
    registerSaveCommands(api, store);
    registerWalletCommands(api, () => wallet);
    registerItemCommands(api, () => ({ authority, wallet, config }));
    registerRewardCommands(api, () => ({ authority: rewardAuthority, wallet, config: rewardConfig, handlers: rewardHandlers, ...rewardHooks }));
    registerSkillCommands(api, () => skillHost);
    registerStoryCommands(api, () => ({ authority: storyAuthority, config: storyConfig, handlers: storyHandlers, ...storyHooks }));
    registerOccupancyCommands(api, () => occupancyHost);
    registerFamilyCommands(api, () => familyHost);
    registerDebugCommands(api, () => debugHost, () => wallet);
    registerAcademyHostCommands(api, () => academyHost);
    registerQuestCommands(api, () => ({ authority: questAuthority, config: questConfig, kinds: questKinds, ...questHooks }));
    return {
        api,
        setWallet: (next) => { wallet = next; },
        setDebugHost: (next) => { debugHost = next; },
        setFamilyHost: (next) => { familyHost = next; },
        setItemAuthority: (next) => { authority = next; },
        setItemConfig: (next) => { config = next; },
        setRewardAuthority: (next) => { rewardAuthority = next; },
        setRewardConfig: (next) => { rewardConfig = next; },
        registerRewardEffect: (kind, handler) => { rewardHandlers[kind] = handler; },
        setRewardHooks: (hooks) => { rewardHooks = hooks; },
        setStoryAuthority: (next) => { storyAuthority = next; },
        setStoryConfig: (next) => { storyConfig = next; },
        registerStoryEffect: (kind, handler) => { storyHandlers[kind] = handler; },
        setStoryHooks: (hooks) => { storyHooks = hooks; },
        setSkillHost: (next) => { skillHost = next; },
        setOccupancyHost: (next) => { occupancyHost = next; },
        setAcademyHost: (next) => { academyHost = next; },
        setQuestAuthority: (next) => { questAuthority = next; },
        setQuestConfig: (next) => { questConfig = next; },
        registerQuestKind: (adapterDef) => { questKinds[adapterDef.taskKind] = adapterDef; },
        setQuestHooks: (hooks) => { questHooks = hooks; },
    };
}
