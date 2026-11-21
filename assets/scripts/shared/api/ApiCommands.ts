// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.3 命令路由、§5.5 權威原則、§5.7 存檔即 API；PROG-2-9201
/**
 * ApiCommands — 共通命令表與各命令的 args／result 型別（零依賴）。
 *
 * 命令分兩種：cmd（會改狀態，必帶 idemKey）與 query（唯讀）。
 * 各框架卡在此處追加自己的命令；命令名稱＝網路路徑名稱（POST /api/v1/cmd、GET /api/v1/q/<name>）。
 */

import type { QuestInstanceView } from '../quest/QuestTypes';

/** 命令種類 */
export type ApiCommandKind = 'cmd' | 'query';

export interface ApiCommandMeta {
    kind: ApiCommandKind;
    /** 是否做 saveRev 衝突檢查（落後即 E102）；意圖型命令由權威端驗證，不檢查 */
    revGuard: boolean;
}

/** 共通命令表 */
export const API_COMMANDS = Object.freeze({
    'wallet.spend': { kind: 'cmd', revGuard: false },
    'wallet.balance': { kind: 'query', revGuard: false },
    'item.grant': { kind: 'cmd', revGuard: false },
    'item.consume': { kind: 'cmd', revGuard: false },
    'item.settlePeriodic': { kind: 'cmd', revGuard: false },
    'item.use': { kind: 'cmd', revGuard: false },
    'item.breakthrough': { kind: 'cmd', revGuard: false },
    'item.instance': { kind: 'query', revGuard: false },
    'item.count': { kind: 'query', revGuard: false },
    'item.list': { kind: 'query', revGuard: false },
    'item.ledger': { kind: 'query', revGuard: false },
    'reward.roll': { kind: 'cmd', revGuard: false },
    'reward.claim': { kind: 'cmd', revGuard: false },
    'reward.pools': { kind: 'query', revGuard: false },
    'reward.pity': { kind: 'query', revGuard: false },
    'reward.pity.redeem': { kind: 'cmd', revGuard: false },
    // 劇情（劇情演出 Base 規格 §11；STY-M 最小版）
    'story.trigger': { kind: 'cmd', revGuard: false },
    'story.choose': { kind: 'cmd', revGuard: false },
    'story.available': { kind: 'query', revGuard: false },
    'story.pending': { kind: 'query', revGuard: false },
    'story.seen': { kind: 'query', revGuard: false },
    'story.flags': { kind: 'query', revGuard: false },
    'save.load': { kind: 'query', revGuard: false },
    'save.rev': { kind: 'query', revGuard: false },
    'save.commit': { kind: 'cmd', revGuard: true },
    'save.full': { kind: 'cmd', revGuard: false },
    // 分域存檔（學府修業 domain=academy；A0 PROG-2-9215）：寫入由權威端驗證結構、補入學時鐘後落盤
    'save.read': { kind: 'query', revGuard: false },
    'save.write': { kind: 'cmd', revGuard: false },
    // 亂數種子簽發（客戶端不得自行生成；A0 PROG-2-9215）
    'rng.issueSeed': { kind: 'query', revGuard: false },
    // 技能（技能 Base 規格 §11；SKL-M 最小版）
    'skill.list': { kind: 'query', revGuard: false },
    'skill.canLearn': { kind: 'query', revGuard: false },
    'skill.learn': { kind: 'cmd', revGuard: false },
    'skill.grant': { kind: 'cmd', revGuard: false },
    'skill.upgrade': { kind: 'cmd', revGuard: false },
    'skill.applyModifier': { kind: 'cmd', revGuard: false },
    'skill.removeModifier': { kind: 'cmd', revGuard: false },
    // 人員占用（共用框架總綱 §10／§12 OCC-M 中立版）
    'occupancy.query': { kind: 'query', revGuard: false },
    'occupancy.acquire': { kind: 'cmd', revGuard: false },
    'occupancy.release': { kind: 'cmd', revGuard: false },
    // 家族（配偶納入名冊；只送意圖，名冊與上限由權威端判定；PROG-2-9582）
    'family.enrollSpouse': { kind: 'cmd', revGuard: false },
    // 偵錯（只有本機 adapter 掛處理器；網路 adapter 一律回 COMMAND_UNKNOWN，避免變成外掛入口）
    'debug.fastForward': { kind: 'cmd', revGuard: false },
    // 任務（任務 Base 規格 §11；QST-M 最小版，只有 taskKind=academy）
    'task.query': { kind: 'query', revGuard: false },
    'task.accept': { kind: 'cmd', revGuard: false },
    'task.advance': { kind: 'cmd', revGuard: false },
    'task.clearGate': { kind: 'cmd', revGuard: false },
    'task.pause': { kind: 'cmd', revGuard: false },
    'task.resume': { kind: 'cmd', revGuard: false },
    'task.settle': { kind: 'cmd', revGuard: false },
    'task.abandon': { kind: 'cmd', revGuard: false },
    'task.tick': { kind: 'cmd', revGuard: false },
} satisfies Record<string, ApiCommandMeta>);

export type ApiCommandName = keyof typeof API_COMMANDS;

/**
 * 客戶端不得在命令中夾帶的權威欄位（價格、結果、獎勵內容、時間）→ E103。
 * 各命令自己的「意圖欄位」白名單由處理器宣告，這裡只列通用的權威欄位名。
 */
export const FORBIDDEN_AUTHORITY_FIELDS: readonly string[] = Object.freeze([
    'balance', 'newBalance', 'result', 'reward', 'rewards', 'grant', 'serverTime', 'price', 'unitPrice',
    'discount', 'roll', 'seed', 'pity', 'saveRev',
]);

/** 錢包幣別：沿用 GachaWalletRules 的 WalletCurrencyKey */
export const WALLET_CURRENCIES: readonly string[] = Object.freeze([
    'gems', 'gold', 'tickets', 'bronze', 'oracle', 'mentorTickets', 'scorePoints',
]);

/** wallet.spend：扣款意圖。amount 為正整數；餘額不足回 E301 且不扣 */
export interface WalletSpendArgs {
    currency: string;
    amount: number;
    /** 用途標籤（記帳與稽核用），例如 JOB_CHANGE_ORDER */
    reason: string;
}

export interface WalletSpendResult {
    currency: string;
    spent: number;
    balance: number;
}

export interface WalletBalanceArgs {
    currency?: string;
}

export type WalletBalanceResult = Record<string, number>;

/** 物品庫存命令的 args／result（規格 doc_spec_1184 §11）。holder 缺省＝家庭倉庫 household/home，container 缺省 main */
export interface ItemHolderArgs {
    holder?: { kind: string; id: string };
    container?: string;
}

/** item.grant：發放。source 必填且不得是 REFUND 以外的自創值；數量上限與溢出由權威端依物品定義判定 */
export interface ItemGrantArgs extends ItemHolderArgs {
    itemId: string;
    qty: number;
    source: string;
    sourceRef?: string;
}

export interface ItemGrantResult {
    itemId: string;
    granted: number;
    count: number;
    /** 超過堆疊上限折算的貨幣；沒有溢出為 null */
    overflow: { units: number; currency: string; amount: number } | null;
}

/** item.consume：扣除。sink 為消耗去向（USE／ENROLL…）；不足回 INSUFFICIENT 且不扣 */
export interface ItemConsumeArgs extends ItemHolderArgs {
    itemId: string;
    qty: number;
    sink: string;
}

/**
 * item.use：使用材料（doc_spec_1264 §5.2）。目前只有 supportExp 效果：把 qty 個材料的經驗加到 target 這張支援卡實例。
 * 等級由權威端依 expToNext 推得；只扣升到上限需要的個數（到上限後多的不消耗，result.consumed 為實際扣的數量）；
 * 目標已在上限回 E318（請先傳承）、不扣材料。
 */
export interface ItemUseArgs extends ItemHolderArgs {
    itemId: string;
    qty: number;
    target: { itemId: string };
}

export interface ItemUseResult {
    itemId: string;
    target: string;
    consumed: number;
    /** 材料剩餘數量 */
    count: number;
    expGained: number;
    levelsGained: number;
    level: number;
    exp: number;
    atCap: boolean;
}

/**
 * item.breakthrough：傳承（doc_spec_1264 §5.3）。把一張已持有的可成長物品的傳承次數 +1（等級上限隨之 +capPerBreak）；
 * 已達 maxBreak 回 E318，未持有回 E317。rollback:true 是反向撤銷用（獎勵 settle 失敗時把 +1 減回去），不走一般玩法。
 */
export interface ItemBreakthroughArgs extends ItemHolderArgs {
    itemId: string;
    rollback?: boolean;
}

export interface ItemInstanceView {
    itemId: string;
    level: number;
    exp: number;
    limitBreak: number;
    /** 目前等級上限（初始上限＋傳承次數×每次增加） */
    levelCap: number;
    maxBreak: number;
}

/** item.instance：查一個實例的成長狀態；未持有或沒有實例回 E317 */
export interface ItemInstanceArgs extends ItemHolderArgs {
    itemId: string;
}

export interface ItemConsumeResult {
    itemId: string;
    consumed: number;
    count: number;
}

/** item.settlePeriodic：定期發放結算。數量、對象由設定規則決定；以持久化的高水位冪等 */
export interface ItemSettlePeriodicArgs {
    ruleId: string;
    /** 目前季序（GameTimeState.totalSeasonsElapsed） */
    nowIndex: number;
}

export interface ItemSettlePeriodicResult {
    ruleId: string;
    periods: number;
    granted: number;
    count: number;
    overflow: { units: number; currency: string; amount: number } | null;
}

export interface ItemRowView {
    itemId: string;
    quantity: number;
    kind: string;
    stackMax: number | null;
    /** 物品類別（例：supportCard）；沒有類別不帶 */
    category?: string;
    /** unique 物品的實例狀態（支援卡的等級、經驗、傳承次數）；沒有不帶 */
    instance?: { level: number; exp: number; limitBreak: number };
}

export interface ItemListResult {
    holder: { kind: string; id: string };
    container: string;
    aliasKey: string;
    rows: ItemRowView[];
}

/**
 * 獎勵命令（規格 doc_spec_1186 §11；規格的 reward.draw 在此命名為 reward.roll）。
 * 結果由權威端擲骰、結算、入帳；客戶端只送「抽哪個池／領哪個套件、憑什麼」，不得帶結果欄位。
 * grantKey 是呼叫端的業務去重鍵（例如 `quest:EXTREME_LU_BU:2026Q1`）：同鍵重送回原結果、不再推進亂數與保底。
 */
export interface RewardRollArgs {
    poolId: string;
    count?: number;
    grantKey: string;
    source: { kind: string; ref?: string };
}

export interface RewardClaimArgs {
    bundleId: string;
    grantKey: string;
    source: { kind: string; ref?: string };
}

export interface RewardPlanLine {
    entryId: string;
    tier: string;
    effect: Record<string, unknown>;
    /** 實際入帳的效果（懲罰截斷、倍率縮放後）；與 effect 相同代表沒有調整 */
    applied: Record<string, unknown>;
    trace: string[];
}

/** 累計計數進度（天命商店）：count 已抽幾次、spent 已兌換幾次、credits 目前可兌換、toNext 距離下一次資格還差幾抽 */
export interface RewardTallyView {
    counterKey: string;
    spentKey: string;
    count: number;
    creditEvery: number;
    spent: number;
    credits: number;
    toNext: number;
}

export interface RewardGrantResult {
    grantId: string;
    grantKey: string;
    kind: 'pool' | 'bundle';
    refId: string;
    plan: RewardPlanLine[];
    settled: true;
    overflow: Array<{ itemId: string; units: number; currency: string; amount: number }>;
    presentation: { type: string; args: Record<string, unknown>; skippable: boolean };
    pity: { counterKey: string; count: number; hardAt: number } | null;
    /** 全部保底階梯（由高階往低階）；pity 是其中第一條的簡版，保留給舊呼叫端 */
    pities?: RewardPityView[];
    /** 同 grantKey 重送回的是原結果 */
    replayed: boolean;
}

/** 一條保底階梯的進度與下一抽機率（規格 doc_spec_1186 §12.4）；count／counter 同值（已連續未出幾抽） */
export interface RewardPityView {
    tier: string;
    counterKey: string;
    counter: number;
    count: number;
    /** 軟保底起點（第幾抽起機率漸升）；null＝只有硬保底 */
    softStartAt: number | null;
    curveExp: number | null;
    hardAt: number;
    /** 距離硬保底還要幾抽（含下一抽）；下一抽就是硬保底時為 1 */
    remaining: number;
    zone: 'base' | 'soft' | 'hard';
    /** 該階以上的基礎機率 */
    baseRate: number;
    /** 下一抽出該階以上的機率（含軟保底漸升；硬保底區為 1） */
    nextPullRate: number;
}

export interface RewardPoolEntryView {
    entryId: string;
    nameKey: string | null;
    /** 不計保底的機率（同等階各項相加等於該等階 baseRate） */
    rate: number;
    /** 下一抽的機率（計入保底漸升） */
    effectiveRate: number;
    isUp: boolean;
    group: string | null;
}

export interface RewardPoolTierView {
    tier: string;
    /** 等於 baseRate，保留給舊呼叫端 */
    probability: number;
    baseRate: number;
    /** 下一抽的等階機率（計入保底漸升） */
    effectiveRate: number;
    /** 逐項機率；disclosure.public=false 的獎池不列 */
    entries: RewardPoolEntryView[];
}

export interface RewardPoolSlotView {
    count: number;
    tier: string | null;
    group: string | null;
    /** 該名額單次抽取時各項的機率 */
    entries: Array<{ entryId: string; rate: number }>;
}

export interface RewardPoolView {
    poolId: string;
    open: boolean;
    nameKey: string | null;
    disclosureVersion: string | null;
    /** 是否公開完整機率表（disclosure.public，預設 true）；false 時 tiers 不含逐項機率 */
    public: boolean;
    currency: string[];
    tiers: RewardPoolTierView[];
    /** 第一條保底階梯的簡版，保留給舊呼叫端 */
    pity: { counterKey: string; count: number; hardAt: number } | null;
    pities: RewardPityView[];
    /** draw.slots 固定名額（宿命池）；沒有名額時為空陣列 */
    slots: RewardPoolSlotView[];
    /** 適用規則代碼：pity.hard、pity.soft、up.share，加上設定檔自填的 rules */
    rules: string[];
}

export interface RewardPoolsResult {
    pools: RewardPoolView[];
}

/**
 * 劇情命令（規格 doc_spec_1188 §11；STY-M 最小版：trigger 合併了規格的 start，章節完成隨最後一次 choose／無選項劇本隨 trigger 結算）。
 * 後果（獎勵、旗標）由權威端依劇本計算並先結算；客戶端只送「觸發哪份劇本、選了哪個選項」，不得帶 effects／flags／next。
 * refId 是呼叫端的實例去重鍵（例如學府第 12 回合打斷＝`academy:Y1:12`）：同實例重送回原狀態、不再重算。
 */
export interface StoryTriggerArgs {
    storyId: string;
    refId?: string;
    /** 宿主自訂選項 id（劇本的 choice 節點標 hostOptions 時用，例如弱冠禮的三選一戰法） */
    options?: string[];
}

export interface StoryChooseArgs {
    storyId: string;
    refId?: string;
    choiceId: string;
    optionId: string;
}

export interface StoryCueView {
    cue: string;
    [field: string]: unknown;
}

export interface StoryOptionView {
    id: string;
    textKey: string | null;
}

/** 目前這一段要播的內容：cues 播完若 choice 非 null 就要玩家選 */
export interface StoryStepView {
    storyId: string;
    instanceId: string;
    cues: StoryCueView[];
    choice: { choiceId: string; options: StoryOptionView[] } | null;
    skippable: boolean;
}

export interface StoryTriggerResult extends StoryStepView {
    /** completed＝無需選擇，已一次走完；active＝佇列第一個、可直接作答；queued＝排在更優先的劇本後面 */
    status: 'completed' | 'active' | 'queued';
    queuePosition: number;
    /** 同實例重送回的是原狀態 */
    replayed: boolean;
}

export interface StoryEffectResult {
    kind: string;
    nodeId: string;
    detail: Record<string, unknown>;
}

export interface StoryChooseResult {
    storyId: string;
    instanceId: string;
    choiceId: string;
    /** 就是玩家送的 optionId */
    selectedOptionId: string;
    completed: boolean;
    /** 還有下一段選擇時回下一段；completed 時為 null */
    next: StoryStepView | null;
    effects: StoryEffectResult[];
    replayed: boolean;
}

export interface StoryAvailableEntry {
    storyId: string;
    kind: string;
    priority: number;
    interrupt: boolean;
}

export interface StoryPendingResult {
    /** 依優先序排好；第 0 個是目前該處理的 */
    queue: Array<StoryStepView & { priority: number; interrupt: boolean }>;
}

export interface StorySeenResult {
    storyId: string;
    seen: boolean;
    count: number;
    lastChoice: string | null;
    at: number;
}

/** save.load：回完整快照；快照型別沿用 PlayerSaveSnapshot，契約層不依賴它所以為 unknown */
export interface SaveLoadResult {
    /** null 代表沒有存檔 */
    snapshot: unknown | null;
    hash: string | null;
    recoveredFromBackup: boolean;
}

export interface SaveRevResult {
    saveRev: number;
    hash: string | null;
}

/** save.commit：玩家端非權威欄位的增量補丁（RFC 6902 子集，路徑白名單） */
export interface SaveCommitArgs {
    baseHash: string;
    patch: Array<{ op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }>;
}

export interface SaveCommitResult {
    hash: string;
    applied: number;
}

/** save.full：全量上傳（換機、首次連線、E011 fallback、單機階段 0 的存檔寫入） */
export interface SaveFullArgs {
    snapshot: unknown;
}

export interface SaveFullResult {
    /** 單機階段 0 為省效能不計算（null）；需要對帳用 save.rev */
    hash: string | null;
}

/** 存檔補丁白名單（總綱 §5.7）：clientOwned 可寫，其餘一律 E002。擴充清單要經總 PM 審核 */
export const SAVE_CLIENT_OWNED_ROOTS: readonly string[] = Object.freeze([
    'favoriteGeneralIds', 'sortiePresets', 'leadGeneralId', 'deck',
]);

/** 技能命令的持有者參照（MVP 只有武將） */
export interface SkillHolderArg {
    kind: 'general';
    id: string;
}

export interface SkillListArgs {
    holder: SkillHolderArg;
    domain?: string;
}

export interface SkillRecordResult {
    skillId: string;
    level: number;
    xp: number;
    learnedFrom: string;
    learnedAt: number;
}

export interface SkillModifierResult {
    id: string;
    source: string;
    until: 'graduation' | 'manual';
    appliedAt: number;
}

export interface SkillListResult {
    holder: SkillHolderArg;
    skills: SkillRecordResult[];
    modifiers: SkillModifierResult[];
}

export interface SkillCanLearnArgs {
    holder: SkillHolderArg;
    skillId: string;
}

export interface SkillCanLearnResult {
    ok: boolean;
    /** 不可學時的 reason（對應 E6xx） */
    blocked?: string;
    tpThreshold?: number;
    tpCost?: number;
}

/** skill.learn：只送意圖；level／spent／result 一律 E103（權威端自己算） */
export interface SkillLearnArgs {
    holder: SkillHolderArg;
    skillId: string;
    source: string;
    /** 三選一類候選清單（弱冠禮）；skillId 必須在其中 */
    choiceOf?: string[];
}

export interface SkillLearnResult {
    learned: boolean;
    skill: SkillRecordResult;
    spent: { tp: number };
}

/** skill.grant：結業、獎勵等已由上游判定的授予；已持有者略過（冪等） */
export interface SkillGrantArgs {
    holder: SkillHolderArg;
    skillIds: string[];
    source: string;
}

export interface SkillGrantResult {
    granted: string[];
    skipped: string[];
    unknown: string[];
}

export interface SkillUpgradeArgs {
    holder: SkillHolderArg;
    skillId: string;
}

export interface SkillUpgradeResult {
    skill: SkillRecordResult;
}

export interface SkillApplyModifierArgs {
    holder: SkillHolderArg;
    modifierId: string;
    source: string;
    until: 'graduation' | 'manual';
}

export interface SkillRemoveModifierArgs {
    holder: SkillHolderArg;
    modifierId: string;
}

export interface SkillModifierChangeResult {
    changed: boolean;
    modifiers: SkillModifierResult[];
}

/** 占用紀錄（人員占用登記，OCC-M） */
export interface OccupancyRecordResult {
    personId: string;
    kind: string;
    refId: string;
    since: number;
    until: number | null;
}

/** occupancy.query：personId 省略＝全部（登記表加六處唯讀轉接器）。帶 activity（須同時帶 personId）時另回該活動能否指派（PROG-2-9442） */
export interface OccupancyQueryArgs {
    personId?: string;
    /** 要檢查的活動名稱（occupancy-matrix.json 的 activities，例 sortie／gov／mercenary） */
    activity?: string;
}

export interface OccupancyQueryResult {
    records: OccupancyRecordResult[];
    /** 有任何占用的人員 id（去重） */
    occupiedIds: string[];
    /** 只有查詢帶 activity 時才有：該人現在能不能被指派該活動；被擋時附擋下的占用 */
    assign?: { activity: string; allowed: boolean; blockedBy?: OccupancyRecordResult };
}

/** occupancy.acquire：只送意圖；kind 只能是 academy／mentorAssign／nursing，其餘由原系統管理（E333）。同一筆重送冪等 */
export interface OccupancyAcquireArgs {
    personId: string;
    kind: 'academy' | 'mentorAssign' | 'nursing';
    refId: string;
    since?: number;
    until?: number | null;
}

export interface OccupancyAcquireResult {
    /** false＝這筆早已登記（冪等重送） */
    acquired: boolean;
    record: OccupancyRecordResult;
}

export interface OccupancyReleaseArgs {
    personId: string;
    kind: 'academy' | 'mentorAssign' | 'nursing';
    refId: string;
}

export interface OccupancyReleaseResult {
    /** false＝本來就沒有（冪等重送） */
    released: boolean;
}

// ── 家族（family.*）──

/** 配偶來源：first-child＝首子流程的系統配偶（固定 slot）；其餘來源由 PROG-2-9583 接上 */
export type FamilySpouseSource = 'first-child';

/** family.enrollSpouse：只送來源，不得帶武將數值（E103）；同來源重送冪等（created=false） */
export interface FamilyEnrollSpouseArgs {
    source: FamilySpouseSource;
}

export interface FamilyEnrollSpouseResult {
    generalId: string;
    /** false＝這位配偶早已在名冊（冪等重送） */
    created: boolean;
}

// ── 偵錯（debug.fastForward；只有本機 adapter 提供）──

/** debug.fastForward 的回應：只表示已啟動（命令佇列串行，不能等快進跑完；結果由宿主公布） */
export interface DebugFastForwardAck {
    accepted: true;
    turns: number;
}

/** 學府快進停下時的狀態（宿主公布用） */
export interface DebugFastForwardResult {
    completedTurns: number;
    steps: number;
    stoppedBy: string;
}

/**
 * 任務命令（任務 Base 規格 doc_spec_1185 §11；QST-M 最小版）。
 * 任務實例、進度、成敗等級、獎勵內容一律由權威端決定；客戶端只送意圖（接哪個定義、推進到哪一步、清哪個閘門），
 * 不得帶 tier／progress／result（E103 或多餘欄位）。結算時獎勵走 reward.claim，執行者忙碌走 occupancy.*。
 */
export type TaskInstanceView = QuestInstanceView;

export interface TaskQueryArgs {
    qid?: string;
    actor?: string;
    state?: string;
    taskKind?: string;
}

export interface TaskQueryResult {
    tasks: TaskInstanceView[];
}

/** task.accept：acceptKey 是呼叫端去重鍵，同鍵重送回同一張（created=false） */
export interface TaskAcceptArgs {
    defId: string;
    actors: string[];
    acceptKey: string;
}

export interface TaskAcceptResult {
    created: boolean;
    task: TaskInstanceView;
}

/** task.advance：fromStep＝呼叫端以為的目前步數；已超過的重送回 advanced=false（冪等） */
export interface TaskAdvanceArgs {
    qid: string;
    fromStep: number;
    steps?: number;
}

export interface TaskAdvanceResult {
    advanced: boolean;
    stepsDone: number;
    gateReached: string | null;
    task: TaskInstanceView;
}

export interface TaskClearGateArgs {
    qid: string;
    gateId: string;
}

export interface TaskPauseArgs {
    qid: string;
    reason?: string;
}

export interface TaskQidArgs {
    qid: string;
}

/** clearGate／pause／resume／abandon 共用：changed=false＝早已是目標狀態（冪等重送） */
export interface TaskChangeResult {
    changed: boolean;
    task: TaskInstanceView;
}

/** task.settle：重送回原結果（replayed=true），不重複呼叫獎勵 */
export interface TaskSettleResult {
    tier: string;
    bundleId: string | null;
    grantId: string | null;
    replayed: boolean;
    task: TaskInstanceView;
}

export interface TaskTickArgs {
    /** 目前季序（GameTimeState.totalSeasonsElapsed）；高水位冪等 */
    nowIndex: number;
}

export interface TaskTickResult {
    delta: number;
    expired: string[];
}

/** save.read／save.write 的分域；目前只有學府修業紀錄 */
export type SaveDomain = 'academy';

export interface SaveReadArgs {
    domain: SaveDomain;
}

/** save.read：回該分域目前的紀錄；null＝沒有進行中的紀錄。紀錄型別由學府模組定義，契約層不依賴所以為 unknown */
export interface SaveReadResult {
    domain: SaveDomain;
    record: unknown | null;
}

export interface SaveWriteArgs {
    domain: SaveDomain;
    /** 要寫入的紀錄；null＝清除。寫入失敗必回錯誤（不得靜默），權威端維持寫入前的狀態 */
    record: unknown | null;
}

export interface SaveWriteResult {
    domain: SaveDomain;
    saved: boolean;
}

/** rng.issueSeed：依範圍簽發種子字串（同一存檔同範圍固定，供確定性重播） */
export interface RngIssueSeedArgs {
    scope: string;
}

export interface RngIssueSeedResult {
    scope: string;
    seed: string;
}
