/**
 * MissionTypes — 通用任務核心的型別（唯一型別來源，PROG-2-9144）
 * 引擎中立：不 import 'cc'。定義可由 JSON 描述（schema: mission-def.v1）。
 */
import type { MissionDifficulty } from './MissionBalance';

export type MissionStatKey = 'str' | 'int' | 'lea' | 'pol' | 'cha';
export const MISSION_STAT_KEYS: readonly MissionStatKey[] = ['str', 'int', 'lea', 'pol', 'cha'];

/** 成敗四級 */
export type MissionTier = 'critical' | 'success' | 'fail' | 'disaster';
export const MISSION_TIERS: readonly MissionTier[] = ['critical', 'success', 'fail', 'disaster'];

/** 情報分層：blind <30、vague 30–59、clear 60–89、full ≥90（門檻在 MissionBalance） */
export type MissionIntelBand = 'blind' | 'vague' | 'clear' | 'full';

// ───────────────────────── 效果（帳本） ─────────────────────────

/**
 * 數量：純數字＝自動縮放（正數乘 rewardMul、負數乘 riskMul）；
 * 物件可指定 mulKey（none＝不縮放）。
 */
export type MissionAmount = number | { base: number; mulKey: 'reward' | 'risk' | 'none' };

export type MissionResourceKey = 'grain' | 'troops' | 'silver';
export type MissionGeneralStateKind = 'injured' | 'captured' | 'exhausted';

/** 效果種類（parser 驗證用；新增種類才需要寫宿主 handler） */
export const MISSION_EFFECT_KINDS = [
    'resource', 'generalExp', 'fame', 'officerExp', 'relation', 'generalState', 'trait',
    'flag', 'spawn', 'intel', 'unlock', 'sceneGambit', 'morale', 'memoryNote',
] as const;
export type MissionEffectKind = (typeof MISSION_EFFECT_KINDS)[number];

export type MissionEffectOf<A> =
    | { kind: 'resource'; res: MissionResourceKey; amount: A }
    | { kind: 'generalExp'; amount: A }
    | { kind: 'fame'; amount: A }
    | { kind: 'officerExp'; amount: A }
    | { kind: 'relation'; target: string; delta: number }
    | { kind: 'generalState'; state: MissionGeneralStateKind; seasons: number }
    | { kind: 'trait'; add?: string; remove?: string }
    | { kind: 'flag'; set?: string; inc?: string; value?: number | boolean }
    | { kind: 'spawn'; defId: string; intel?: number; afterSeasons?: number; expireSeasons?: number }
    | { kind: 'intel'; target: { defId?: string; tag?: string; nextSpawn?: boolean }; delta: number }
    | { kind: 'unlock'; id: string }
    | { kind: 'sceneGambit'; id: string }
    | { kind: 'morale'; delta: A }
    | { kind: 'memoryNote'; tag: string; text: string };

/** 定義中的效果（數量可為 MissionAmount） */
export type MissionEffect = MissionEffectOf<MissionAmount>;
/** 結算後的效果（數量已縮放取整） */
export type MissionResolvedEffect = MissionEffectOf<number>;

/** 帳本項目：宿主逐項套用；引擎只輸出「想給多少」，資源上限截斷在宿主 */
export type MissionLedgerEntry = MissionResolvedEffect & {
    missionId: string;
    generalId: string | null;
    tier: MissionTier;
    /** 被懲罰上限規則改寫時的註記（被丟棄的不會進帳本，只進 trace） */
    note?: string;
};

// ───────────────────────── 結果樹 ─────────────────────────

export interface MissionNodeBase { narrative?: string }

export interface MissionRollNode extends MissionNodeBase {
    kind: 'roll';
    /** 缺省＝自動成功率（適合度＋分支修正＋情報曲線） */
    p?: number;
    critRatio: number;
    disasterRatio: number;
    tiers: Record<MissionTier, MissionNode>;
}
export interface MissionChanceNode extends MissionNodeBase { kind: 'chance'; p: number; hit: MissionNode; miss: MissionNode }
export interface MissionSwitchCase {
    /** 與 on 的值比對（字串／布林／數字）；on=generalTag 時為特質名 */
    when?: string | boolean | number;
    /** when 的同義寫法（資料檔裡兩種都有，以 when 為準） */
    eq?: string | boolean | number;
    /** 數值比較：on 的值 >= gte */
    gte?: number;
    then: MissionNode;
}
export interface MissionSwitchNode extends MissionNodeBase {
    kind: 'switch';
    /** "variant"｜"intel"｜"generalTag"｜"flag:<k>"｜"fact:<key>"｜"stat:<s>"｜"stat:<s>>=<n>"（>、<=、< 亦可） */
    on: string;
    cases: MissionSwitchCase[];
    else?: MissionNode;
}
export interface MissionEffectsNode extends MissionNodeBase { kind: 'effects'; effects: MissionEffect[] }
export interface MissionSeqNode extends MissionNodeBase { kind: 'seq'; nodes: MissionNode[] }
export type MissionNode = MissionRollNode | MissionChanceNode | MissionSwitchNode | MissionEffectsNode | MissionSeqNode;

// ───────────────────────── 定義 ─────────────────────────

export interface MissionFactLevel { minIntel: number; text: string }
export interface MissionFactDef {
    key: string;
    label: string;
    levels: MissionFactLevel[];
    /** 低情報時可能顯示的誤導說法（只影響定性文字） */
    decoy?: string;
}

export interface MissionBranchWhen {
    variant?: string[];
    minIntel: number;
    maxIntel?: number;
    flagsAll?: string[];
    generalTagsAny?: string[];
}
export interface MissionBranchModifiers {
    successDelta: number;
    rewardMul: number;
    riskMul: number;
    costMul?: number;
    durationDelta?: number;
}
export interface MissionBranch {
    id: string;
    when: MissionBranchWhen;
    objective: { id: string; text: string; keyStats?: Partial<Record<MissionStatKey, number>> };
    /** 玩家在該情報度下被允許看到的樣子（可與真相不同） */
    presented: { objectiveText?: string; hints?: string[] };
    modifiers: MissionBranchModifiers;
    outcome: MissionNode;
}

export interface MissionDefinition {
    schema: 'mission-def.v1';
    id: string;
    version: number;
    legacyTemplateId?: string;
    theme: string;
    difficulty: MissionDifficulty;
    tags: string[];
    text: { title: string; brief: string; detail?: string };
    /** 任務成功後等下一場戰鬥判定的場景戰法（SCN-04），沿用舊任務欄位 */
    sceneGambit?: string;
    facts?: MissionFactDef[];
    requirement: {
        /** 首版固定 1；格式預留多人隊伍 */
        slots: number;
        keyStats: Partial<Record<MissionStatKey, number>>;
        preferTags?: string[];
        avoidTags?: string[];
        roleAnyOf?: string[];
    };
    timing: { durationSeasons: number; expireSeasons: number };
    cost?: { grain?: number; troops?: number; silver?: number };
    energy?: number;
    variants: { id: string; weight: number }[];
    intel: {
        initial: number;
        jitter: number;
        sources?: { recon?: { base?: number }; wait?: { delta?: number }; passive?: { delta?: number } };
    };
    branches: MissionBranch[];
}

// ───────────────────────── 執行者 ─────────────────────────

export const MISSION_BLOCKS = [
    'dead', 'retired', 'not-graduated', 'nurturing', 'captive', 'injured',
    'on-sortie', 'traveling', 'on-mission', 'offline-dispatch', 'low-energy',
] as const;
export type MissionBlock = (typeof MISSION_BLOCKS)[number];

/** 成敗等級的顯示文字 */
export const MISSION_TIER_TEXT: Record<MissionTier, string> = { critical: '大成功', success: '成功', fail: '失敗', disaster: '大失敗' };

export const MISSION_BLOCK_TEXT: Record<MissionBlock, string> = {
    dead: '已亡故', retired: '已退役', 'not-graduated': '尚未畢業', nurturing: '培育中', captive: '被囚',
    injured: '受傷休養中', 'on-sortie': '出征中', traveling: '遠行中', 'on-mission': '任務中',
    'offline-dispatch': '離線派遣中', 'low-energy': '精力不足',
};

/** 引擎看到的武將事實（宿主依真實名冊組出，引擎不讀名冊） */
export interface MissionGeneralFacts {
    id: string;
    name: string;
    stats: Partial<Record<MissionStatKey, number>>;
    power: number;
    vitality: number;
    tags: string[];
    block: MissionBlock[];
    volunteer?: boolean;
}

// ───────────────────────── 實例與存檔 ─────────────────────────

export interface MissionDispatchLock {
    generalIds: string[];
    delegated: boolean;
    /** 派遣當下鎖定的情報度與分支，之後不再變 */
    intelAtDispatch: number;
    branchId: string;
    /** 派出當下定死的實際成功率（真相，不進 UI） */
    rate: number;
    returnSeason: number;
}

export interface MissionInstance {
    id: string;
    defId: string;
    defVersion: number;
    theme: string;
    /** 隱藏真相，不進 UI */
    variant: string;
    spawnSeason: number;
    expireSeason: number;
    intel: number;
    reconCount: number;
    waited: boolean;
    status: 'OPEN' | 'ACTIVE';
    dispatch?: MissionDispatchLock;
    chainFrom?: string;
    /** 舊存檔（v1）進行中任務遷移而來：結算走「依舊成功率、舊固定獎勵」的相容分支，不重擲新結果樹 */
    legacy?: MissionLegacyFlat;
}

/** v1 進行中任務的固定結算資料（branchId 為 LEGACY_FLAT_BRANCH_ID） */
export interface MissionLegacyFlat {
    title: string;
    wall: string;
    difficulty: MissionDifficulty;
    rewards: { grain: number; silver: number; generalExp: number };
    fame: number;
}
export const LEGACY_FLAT_BRANCH_ID = 'legacy-flat';

/** 延後產生的連鎖任務（spawn.afterSeasons） */
export interface MissionPendingSpawn {
    defId: string;
    atSeason: number;
    intel?: number;
    expireSeasons?: number;
    chainFrom?: string;
}

/** 武將被任務結果影響的狀態：到該季之前不可派 */
export interface MissionGeneralState {
    injuredUntil?: number;
    capturedUntil?: number;
}

/** 全量同步快照（server 為權威、client 快取；UI 暫態不在內） */
export interface MissionSyncSnapshot {
    version: 2;
    revision: number;
    rng: { seed: number; serial: number };
    season: number;
    missions: MissionInstance[];
    history: MissionRecord[];
    flags: Record<string, number | boolean>;
    /** 延後的連鎖任務 */
    pending?: MissionPendingSpawn[];
    /** 武將受傷／被俘狀態（generalId → 結束季） */
    generalStates?: Record<string, MissionGeneralState>;
    /** 已解鎖的機緣 id（unlock 效果） */
    unlocks?: string[];
}
/** 存檔 v2 格式＝同步快照（server 為權威時 client 只快取同一份） */
export type MissionSaveV2 = MissionSyncSnapshot;

// ───────────────────────── 結算輸出 ─────────────────────────

export interface MissionTraceStep {
    path: string;
    kind: MissionNode['kind'] | 'capped';
    /** 擲出的 [0,1) 值 */
    u?: number;
    p?: number;
    tier?: MissionTier;
    matched?: string;
    note?: string;
}

export interface MissionMemoryEvent {
    generalId: string;
    season: number;
    missionId: string;
    defId: string;
    theme: string;
    branchId: string;
    objectiveId: string;
    intelAtDispatch: number;
    delegated: boolean;
    tier: MissionTier;
    gains: Record<string, number>;
    stateChanges: string[];
    narrativeTags: string[];
    text: string;
}

/** 武將任務記憶摘要（宿主提供；此卡只定義型別，不實作記憶） */
export interface MissionMemorySummary {
    done: number; win: number; lose: number; crit: number; disaster: number;
    recent: string[];
    /** 0–100 */
    confidence: number;
}

export interface MissionRecord {
    missionId: string;
    defId: string;
    title: string;
    season: number;
    generalId: string;
    branchId: string;
    tier: MissionTier;
    intelAtDispatch: number;
    narratives: string[];
}

// ───────────────────────── 玩家視圖（已投影） ─────────────────────────

/** 可揭露量：UI 只照 text 顯示 */
export interface Revealable {
    state: 'hidden' | 'hint' | 'range' | 'exact';
    text: string;
    value?: number;
    lo?: number;
    hi?: number;
}

export interface MissionFactView { key: string; label: string; text: string; state: 'hidden' | 'hint' | 'exact' }

export interface MissionDetailView {
    id: string;
    defId: string;
    title: string;
    brief: string;
    theme: string;
    difficulty: MissionDifficulty;
    intel: number;
    intelBand: MissionIntelBand;
    facts: MissionFactView[];
    objective: Revealable;
    hints: string[];
    rate: Revealable;
    risk: Revealable;
    /** 風險標籤（情報夠高才有內容） */
    riskTags: string[];
    reward: Revealable;
    /** 隱藏獎勵／額外分支：只在最高情報度顯示 */
    hiddenRewards: string[];
    /** 耗費、精力、時限一律明牌 */
    cost: { grain: number; troops: number; silver: number; energy: number };
    durationSeasons: number;
    expireSeason: number;
    status: 'OPEN' | 'ACTIVE';
    canRecon: boolean;
    canWait: boolean;
}
