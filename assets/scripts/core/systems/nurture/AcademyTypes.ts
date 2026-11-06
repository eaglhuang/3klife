// @spec-source → ACAD_CORE_學府培育總控與防SL確定性引擎規格書.md (doc_spec_0302) §1、§3、§4；C2_R5 待補數據表 (doc_spec_0289) 表 5-6（PROG-2-1902）
/**
 * AcademyTypes — 學府培育共用型別與常數（純邏輯，不依賴 cc）。
 *
 * - 36 回合修業：1~12 建基期、13~24 造詣期、25~36 大成期。
 * - 第 12 回合期中考評、第 24 回合弱冠禮、第 36 回合結業，都在該回合開始前打斷。
 * - 五維單項上限 500、總量上限 2000；終生最多 3 戰法 + 2 門風特質。
 *
 * Unity 對照：像一組 ScriptableObject 定義檔 + enum，Engine 與各學府 Gimmick 共用。
 */

export enum AcademyId {
    YINGCHUAN = 'ACAD_YINGCHUAN',
    YOUZHOU = 'ACAD_YOUZHOU',
    JIANGDONG = 'ACAD_JIANGDONG',
    LUOYANG = 'ACAD_LUOYANG',
    LONGZHONG = 'ACAD_LONGZHONG',
}

export enum AcademyControlMode {
    MANUAL = 'MANUAL',
    SEMI_AUTO = 'SEMI_AUTO',
    AUTO = 'AUTO',
}

export type AcademyStatKey = 'str' | 'lea' | 'int' | 'pol' | 'cha';
export const ACADEMY_STAT_KEYS: readonly AcademyStatKey[] = ['str', 'lea', 'int', 'pol', 'cha'];
export type AcademyStats = Record<AcademyStatKey, number>;

export const ACADEMY_TOTAL_TURNS = 36;
export const ACADEMY_STAT_CAP = 500;
export const ACADEMY_STAT_TOTAL_CAP = 2000;
export const ACADEMY_ENERGY_MAX = 100;
export const ACADEMY_TACTIC_SLOTS = 3;
export const ACADEMY_TRAIT_SLOTS = 2;

/** 三態代管效率（百分比整數，避免浮點誤差） */
export const ACADEMY_CONTROL_EFFICIENCY_PCT: Record<AcademyControlMode, number> = {
    [AcademyControlMode.MANUAL]: 100,
    [AcademyControlMode.SEMI_AUTO]: 95,
    [AcademyControlMode.AUTO]: 70,
};

/** 學府五維特化（表 5-6，百分比；未列出的屬性為 0） */
export const ACADEMY_STAT_BIAS_PCT: Record<AcademyId, Partial<AcademyStats>> = {
    [AcademyId.YINGCHUAN]: { int: 30, pol: 25, lea: 10 },
    [AcademyId.YOUZHOU]: { str: 35, lea: 25, cha: -10 },
    [AcademyId.JIANGDONG]: { lea: 30, int: 20, str: 15 },
    [AcademyId.LUOYANG]: { cha: 35, pol: 30, str: -15 },
    [AcademyId.LONGZHONG]: { str: 15, lea: 15, int: 15, pol: 15, cha: 15 },
};

export type AcademyPhase = 'FOUNDATION' | 'MASTERY' | 'CULMINATION';

export type AcademyInterruptKind = 'MIDTERM' | 'COMING_OF_AGE' | 'RESONANCE' | 'GRADUATION';

/** 期中考評三選一方針（§3.2） */
export type AcademyMidtermPolicy = 'STRENGTH' | 'BALANCE' | 'NOURISH';

export interface AcademyChronicle {
    turn: number;
    title: string;
    description: string;
    highlightScore: number;
}

/** 學府修業即時快照（落盤存檔結構，§4；pendingInterrupt 之後為引擎擴充欄位） */
export interface AcademyStateSnapshot {
    schemaVersion: 1;
    clanUuid: string;
    childId: string;
    academyId: AcademyId;
    currentTurn: number;
    energy: number;
    controlMode: AcademyControlMode;
    prngSeedHex: string;
    stepIndex: number;
    sessionCrashCounter: number;
    stats: AcademyStats;
    learnedTactics: string[];
    learnedTraits: string[];
    gimmickStatePayload: Record<string, unknown>;
    chronicles: AcademyChronicle[];
    /** 等待玩家處理的打斷點；有值時只接受 RESOLVE_INTERRUPT */
    pendingInterrupt: AcademyInterruptKind | null;
    /** 打斷點提供的選項 id（弱冠禮戰法三選一等） */
    interruptOptions: string[];
    midtermPolicy: AcademyMidtermPolicy | null;
    /** 惡意中斷懲罰：剩餘幾回合不得觸發彩圈／專屬連鎖 */
    resonanceLockTurns: number;
    graduated: boolean;
    /** 先祖傳奇教官的傳承支援（PROG-2-1908）；舊快照沒有此欄位 */
    legacySupport?: AcademyLegacySupport;
}

/** 先祖教官傳承支援：訓練加成與弱冠禮特質種子（doc_spec_0310 §2.1） */
export interface AcademyLegacySupport {
    /** 各屬性訓練加成（%） */
    statBonusPct: Partial<Record<AcademyStatKey, number>>;
    /** 門風特質種子：弱冠禮時各自擲機率列入候選 */
    traitSeeds: string[];
}

export type AcademyActionType = 'TRAIN' | 'REST' | 'GIMMICK_INTERACT' | 'RESOLVE_INTERRUPT';

export interface AcademyActionPayload {
    actionType: AcademyActionType;
    targetStat?: AcademyStatKey;
    selectedOptionId?: string;
}

/** 確定性亂數：只能以整數取樣，呼叫端不得使用 Math.random() */
export interface IDeterministicRng {
    readonly seedHex: string;
    readonly stepIndex: number;
    nextUint32(salt: string): number;
    nextInt(maxExclusive: number, salt: string): number;
    chance(numerator: number, denominator: number, salt: string): boolean;
    pickWeighted(weights: readonly number[], salt: string): number;
}

export interface AcademyTrainResult {
    /** 彩圈倍率（百分比整數，100 = 無加成；≥180 視為重大共鳴） */
    statBonusPct: number;
    extraEnergyCost: number;
    gimmickLogs: string[];
}

/** 學府專屬機制外掛介面（§4；倍率改用百分比整數） */
export interface IAcademyGimmickHandler {
    readonly academyId: AcademyId;
    initGimmickState(seedHex: string): Record<string, unknown>;
    onTurnStart(state: AcademyStateSnapshot, rng: IDeterministicRng): void;
    onTrain(state: AcademyStateSnapshot, targetStat: AcademyStatKey, rng: IDeterministicRng): AcademyTrainResult;
    onTurnEnd(state: AcademyStateSnapshot, rng: IDeterministicRng): void;
    /** 弱冠禮三選一的候選戰法（未提供則用通用候選） */
    comingOfAgeOptions?(state: AcademyStateSnapshot, rng: IDeterministicRng): string[];
    /** 專屬互動（GIMMICK_INTERACT，不消耗回合；未提供則不接受此動作） */
    onInteract?(state: AcademyStateSnapshot, optionId: string | undefined, rng: IDeterministicRng): void;
    /** 回傳非 null 時，玩家必須先完成該專屬互動才能訓練或休息（如潁川清談大會） */
    blockingInteraction?(state: AcademyStateSnapshot): string | null;
    /** AUTO 模式代選的專屬互動 optionId */
    autoInteraction?(state: AcademyStateSnapshot): string;
    /** 結業確認時發放學府專屬戰法／特質 */
    onGraduate?(state: AcademyStateSnapshot): void;
}

export function academyPhaseOf(turn: number): AcademyPhase {
    if (turn <= 12) return 'FOUNDATION';
    if (turn <= 24) return 'MASTERY';
    return 'CULMINATION';
}

/** 該回合開始前要觸發的固定打斷點 */
export function scheduledInterruptAt(turn: number): AcademyInterruptKind | null {
    if (turn === 12) return 'MIDTERM';
    if (turn === 24) return 'COMING_OF_AGE';
    return null;
}
