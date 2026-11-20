// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.3 命令路由、§5.5 權威原則、§5.7 存檔即 API；PROG-2-9201
/**
 * ApiCommands — 共通命令表與各命令的 args／result 型別（零依賴）。
 *
 * 命令分兩種：cmd（會改狀態，必帶 idemKey）與 query（唯讀）。
 * 各框架卡在此處追加自己的命令；命令名稱＝網路路徑名稱（POST /api/v1/cmd、GET /api/v1/q/<name>）。
 */

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
    'item.count': { kind: 'query', revGuard: false },
    'item.list': { kind: 'query', revGuard: false },
    'item.ledger': { kind: 'query', revGuard: false },
    'reward.roll': { kind: 'cmd', revGuard: false },
    'reward.claim': { kind: 'cmd', revGuard: false },
    'reward.pools': { kind: 'query', revGuard: false },
    'reward.pity': { kind: 'query', revGuard: false },
    'save.load': { kind: 'query', revGuard: false },
    'save.rev': { kind: 'query', revGuard: false },
    'save.commit': { kind: 'cmd', revGuard: true },
    'save.full': { kind: 'cmd', revGuard: false },
    // 技能（技能 Base 規格 §11；SKL-M 最小版）
    'skill.list': { kind: 'query', revGuard: false },
    'skill.canLearn': { kind: 'query', revGuard: false },
    'skill.learn': { kind: 'cmd', revGuard: false },
    'skill.grant': { kind: 'cmd', revGuard: false },
    'skill.upgrade': { kind: 'cmd', revGuard: false },
    'skill.applyModifier': { kind: 'cmd', revGuard: false },
    'skill.removeModifier': { kind: 'cmd', revGuard: false },
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
    /** 同 grantKey 重送回的是原結果 */
    replayed: boolean;
}

export interface RewardPoolView {
    poolId: string;
    open: boolean;
    tiers: Array<{ tier: string; probability: number }>;
    pity: { counterKey: string; count: number; hardAt: number } | null;
}

export interface RewardPoolsResult {
    pools: RewardPoolView[];
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
