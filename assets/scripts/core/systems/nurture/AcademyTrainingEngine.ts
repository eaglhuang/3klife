// @spec-source → ACAD_CORE_學府培育總控與防SL確定性引擎規格書.md (doc_spec_0302) §1.1 36 回合時鐘、§3 三態代管與高光打斷、§5 TC-CORE-03（PROG-2-1902）
/**
 * AcademyTrainingEngine — 學府 36 回合修業狀態機（純函式，不依賴 cc）。
 *
 * - resolveAcademyAction(快照, 動作) → 新快照；輸入快照不會被改動，同一輸入永遠得到同一輸出。
 * - 所有隨機都從快照內的種子鏈取樣，結果寫回 prngSeedHex / stepIndex。
 * - 打斷點：第 12、24 回合開始前（期中考評、弱冠禮）、彩圈倍率 ≥180% 的重大共鳴、第 36 回合後結業。
 *   打斷未處理前只接受 RESOLVE_INTERRUPT；學府 Gimmick 可另以 blockingInteraction 擋住訓練（PROG-2-1903）。
 *   AUTO 模式兩者都由引擎代選。
 * - 訓練基礎值、精力消耗等規格未給數字，先放在 ACADEMY_TUNING（暫定，PROG-2-1902）。
 *
 * Unity 對照：像一個純 C# 的 StateMachine.Step(state, input)，MonoBehaviour 只負責顯示。
 */
import { AcademyRng, deriveAcademyRootSeed } from './AcademyDeterministicRng';
import {
    ACADEMY_CONTROL_EFFICIENCY_PCT,
    ACADEMY_ENERGY_MAX,
    ACADEMY_STAT_BIAS_PCT,
    ACADEMY_STAT_CAP,
    ACADEMY_STAT_KEYS,
    ACADEMY_STAT_TOTAL_CAP,
    ACADEMY_TACTIC_SLOTS,
    ACADEMY_TOTAL_TURNS,
    AcademyActionPayload,
    AcademyControlMode,
    AcademyId,
    AcademyInterruptKind,
    AcademyMidtermPolicy,
    AcademyStateSnapshot,
    AcademyStatKey,
    AcademyStats,
    AcademyTrainResult,
    IAcademyGimmickHandler,
    IDeterministicRng,
    scheduledInterruptAt,
} from './AcademyTypes';

/** 暫定數值（規格未給，PROG-2-1902） */
export const ACADEMY_TUNING = {
    trainBaseGain: 12,
    trainVarianceRange: 5,
    trainEnergyCost: 15,
    restEnergyGain: 30,
    resonanceThresholdPct: 180,
    midtermStrengthPrimaryPct: 120,
    midtermStrengthOtherPct: 90,
    midtermBalanceLowestPct: 130,
    midtermBalanceExtraEnergy: 5,
    midtermNourishEnergyPerTurn: 10,
    abuseFloorGain: 5,
    abuseEnergyPenalty: 20,
    abuseResonanceLockTurns: 2,
} as const;

export const ACADEMY_MIDTERM_POLICIES: readonly AcademyMidtermPolicy[] = ['STRENGTH', 'BALANCE', 'NOURISH'];
export const ACADEMY_RESONANCE_WITNESS = 'WITNESS';
export const ACADEMY_GRADUATION_CONFIRM = 'CONFIRM';
/** 弱冠禮通用候選（學府 Gimmick 未提供時使用，暫定 id） */
export const ACADEMY_GENERIC_RITE_OPTIONS: readonly string[] = ['TACTIC_GENERIC_VALOR', 'TACTIC_GENERIC_STRATEGY', 'TACTIC_GENERIC_COMMAND'];

export class AcademyActionError extends Error {}

export interface AcademyAdmission {
    worldSeed: string;
    clanUuid: string;
    childId: string;
    academyId: AcademyId;
    admissionTurn: number;
    initialStats: AcademyStats;
    controlMode?: AcademyControlMode;
    initialEnergy?: number;
}

export function academyStatTotal(stats: AcademyStats): number {
    let total = 0;
    for (const key of ACADEMY_STAT_KEYS) total += stats[key];
    return total;
}

/** 五維硬天花板：單項 ≤500、總量 ≤2000（超出時從最後一項往前扣） */
export function clampAcademyStats(stats: AcademyStats): AcademyStats {
    const out = { ...stats };
    for (const key of ACADEMY_STAT_KEYS) out[key] = Math.max(0, Math.min(ACADEMY_STAT_CAP, Math.floor(out[key])));
    let excess = academyStatTotal(out) - ACADEMY_STAT_TOTAL_CAP;
    for (let i = ACADEMY_STAT_KEYS.length - 1; i >= 0 && excess > 0; i--) {
        const key = ACADEMY_STAT_KEYS[i];
        const cut = Math.min(out[key], excess);
        out[key] -= cut;
        excess -= cut;
    }
    return out;
}

/** 把成長加到單項上，受單項與總量上限約束；回傳實際加到的點數 */
export function addAcademyStatCapped(stats: AcademyStats, key: AcademyStatKey, delta: number): number {
    const room = Math.min(ACADEMY_STAT_CAP - stats[key], ACADEMY_STAT_TOTAL_CAP - academyStatTotal(stats));
    const applied = Math.max(0, Math.min(Math.floor(delta), room));
    stats[key] += applied;
    return applied;
}

export function createAcademySnapshot(admission: AcademyAdmission, gimmick?: IAcademyGimmickHandler): AcademyStateSnapshot {
    const seed = deriveAcademyRootSeed(admission.worldSeed, admission.clanUuid, admission.childId, admission.academyId, admission.admissionTurn);
    return {
        schemaVersion: 1,
        clanUuid: admission.clanUuid,
        childId: admission.childId,
        academyId: admission.academyId,
        currentTurn: 1,
        energy: clampEnergy(admission.initialEnergy ?? ACADEMY_ENERGY_MAX),
        controlMode: admission.controlMode ?? AcademyControlMode.MANUAL,
        prngSeedHex: seed,
        stepIndex: 0,
        sessionCrashCounter: 0,
        stats: clampAcademyStats(admission.initialStats),
        learnedTactics: [],
        learnedTraits: [],
        gimmickStatePayload: gimmick ? gimmick.initGimmickState(seed) : {},
        chronicles: [],
        pendingInterrupt: null,
        interruptOptions: [],
        midtermPolicy: null,
        resonanceLockTurns: 0,
        graduated: false,
    };
}

export function cloneAcademySnapshot(snapshot: AcademyStateSnapshot): AcademyStateSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as AcademyStateSnapshot;
}

/** 推進一步：回傳新快照，輸入不變 */
export function resolveAcademyAction(
    snapshot: AcademyStateSnapshot, action: AcademyActionPayload, gimmick?: IAcademyGimmickHandler,
): AcademyStateSnapshot {
    const state = cloneAcademySnapshot(snapshot);
    const rng = new AcademyRng(state.prngSeedHex, state.stepIndex);
    applyAction(state, action, rng, gimmick);
    if (state.controlMode === AcademyControlMode.AUTO) {
        for (let guard = 0; guard < 16 && !state.graduated; guard++) {
            if (state.pendingInterrupt) {
                applyAction(state, autoResolveChoice(state), rng, gimmick);
            } else if (gimmick?.blockingInteraction?.(state) && gimmick.autoInteraction) {
                applyAction(state, { actionType: 'GIMMICK_INTERACT', selectedOptionId: gimmick.autoInteraction(state) }, rng, gimmick);
            } else {
                break;
            }
        }
    }
    state.prngSeedHex = rng.seedHex;
    state.stepIndex = rng.stepIndex;
    return state;
}

function applyAction(state: AcademyStateSnapshot, action: AcademyActionPayload, rng: IDeterministicRng, gimmick?: IAcademyGimmickHandler): void {
    if (state.graduated) throw new AcademyActionError('已結業，不能再推進');
    if (action.actionType === 'RESOLVE_INTERRUPT') {
        resolveInterrupt(state, action.selectedOptionId, rng, gimmick);
        return;
    }
    if (state.pendingInterrupt) {
        throw new AcademyActionError(`尚有待處理的打斷點 ${state.pendingInterrupt}`);
    }
    if (action.actionType === 'GIMMICK_INTERACT') {
        if (!gimmick?.onInteract) throw new AcademyActionError('此學府沒有專屬互動');
        gimmick.onInteract(state, action.selectedOptionId, rng);
        return;
    }
    const blocking = gimmick?.blockingInteraction?.(state);
    if (blocking) {
        throw new AcademyActionError(`須先完成學府專屬互動 ${blocking}`);
    }
    gimmick?.onTurnStart(state, rng);
    let resonance = false;
    if (action.actionType === 'TRAIN') {
        if (!action.targetStat) throw new AcademyActionError('TRAIN 必須指定 targetStat');
        resonance = applyTrain(state, action.targetStat, rng, gimmick);
    } else {
        state.energy = clampEnergy(state.energy + ACADEMY_TUNING.restEnergyGain);
    }
    gimmick?.onTurnEnd(state, rng);
    endTurn(state, resonance, rng, gimmick);
}

function applyTrain(state: AcademyStateSnapshot, target: AcademyStatKey, rng: IDeterministicRng, gimmick?: IAcademyGimmickHandler): boolean {
    const result: AcademyTrainResult = gimmick ? gimmick.onTrain(state, target, rng) : { statBonusPct: 100, extraEnergyCost: 0, gimmickLogs: [] };
    const bonusPct = state.resonanceLockTurns > 0 ? Math.min(100, result.statBonusPct) : result.statBonusPct;
    const variance = rng.nextInt(ACADEMY_TUNING.trainVarianceRange, 'train-variance');
    const efficiency = ACADEMY_CONTROL_EFFICIENCY_PCT[state.controlMode];
    const bias = 100 + (ACADEMY_STAT_BIAS_PCT[state.academyId][target] ?? 0);
    const policy = midtermPolicyPct(state, target);
    const gain = Math.floor(((ACADEMY_TUNING.trainBaseGain + variance) * efficiency * bias * bonusPct * policy) / 100000000);
    addAcademyStatCapped(state.stats, target, gain);
    const policyEnergy = state.midtermPolicy === 'BALANCE' ? ACADEMY_TUNING.midtermBalanceExtraEnergy : 0;
    state.energy = clampEnergy(state.energy - ACADEMY_TUNING.trainEnergyCost - result.extraEnergyCost - policyEnergy);
    return state.resonanceLockTurns === 0 && bonusPct >= ACADEMY_TUNING.resonanceThresholdPct;
}

function midtermPolicyPct(state: AcademyStateSnapshot, target: AcademyStatKey): number {
    if (state.midtermPolicy === 'STRENGTH') {
        return target === extremeStat(state.stats, 1) ? ACADEMY_TUNING.midtermStrengthPrimaryPct : ACADEMY_TUNING.midtermStrengthOtherPct;
    }
    if (state.midtermPolicy === 'BALANCE') {
        return target === extremeStat(state.stats, -1) ? ACADEMY_TUNING.midtermBalanceLowestPct : 100;
    }
    return 100;
}

/** sign = 1 取最高、-1 取最低；同分取 ACADEMY_STAT_KEYS 順序較前者 */
function extremeStat(stats: AcademyStats, sign: 1 | -1): AcademyStatKey {
    let best = ACADEMY_STAT_KEYS[0];
    for (const key of ACADEMY_STAT_KEYS) {
        if ((stats[key] - stats[best]) * sign > 0) best = key;
    }
    return best;
}

function endTurn(state: AcademyStateSnapshot, resonance: boolean, rng: IDeterministicRng, gimmick?: IAcademyGimmickHandler): void {
    if (state.midtermPolicy === 'NOURISH') {
        state.energy = clampEnergy(state.energy + ACADEMY_TUNING.midtermNourishEnergyPerTurn);
    }
    if (state.resonanceLockTurns > 0) state.resonanceLockTurns -= 1;
    if (resonance) {
        state.chronicles.push({ turn: state.currentTurn, title: '重大共鳴', description: '名師與專屬機制達成大共鳴', highlightScore: 3 });
    }
    if (state.currentTurn >= ACADEMY_TOTAL_TURNS) {
        setInterrupt(state, 'GRADUATION', rng, gimmick);
        return;
    }
    state.currentTurn += 1;
    if (resonance) {
        setInterrupt(state, 'RESONANCE', rng, gimmick);
    } else {
        setScheduledInterrupt(state, rng, gimmick);
    }
}

function setScheduledInterrupt(state: AcademyStateSnapshot, rng: IDeterministicRng, gimmick?: IAcademyGimmickHandler): void {
    const kind = scheduledInterruptAt(state.currentTurn);
    if (kind) {
        setInterrupt(state, kind, rng, gimmick);
    } else {
        state.pendingInterrupt = null;
        state.interruptOptions = [];
    }
}

function setInterrupt(state: AcademyStateSnapshot, kind: AcademyInterruptKind, rng: IDeterministicRng, gimmick?: IAcademyGimmickHandler): void {
    state.pendingInterrupt = kind;
    if (kind === 'MIDTERM') {
        state.interruptOptions = [...ACADEMY_MIDTERM_POLICIES];
    } else if (kind === 'COMING_OF_AGE') {
        state.interruptOptions = gimmick?.comingOfAgeOptions ? gimmick.comingOfAgeOptions(state, rng) : [...ACADEMY_GENERIC_RITE_OPTIONS];
    } else if (kind === 'RESONANCE') {
        state.interruptOptions = [ACADEMY_RESONANCE_WITNESS];
    } else {
        state.interruptOptions = [ACADEMY_GRADUATION_CONFIRM];
    }
}

function resolveInterrupt(state: AcademyStateSnapshot, optionId: string | undefined, rng: IDeterministicRng, gimmick?: IAcademyGimmickHandler): void {
    const kind = state.pendingInterrupt;
    if (!kind) throw new AcademyActionError('目前沒有待處理的打斷點');
    if (!optionId || state.interruptOptions.indexOf(optionId) < 0) {
        throw new AcademyActionError(`選項 ${optionId} 不在 ${kind} 的候選中`);
    }
    if (kind === 'MIDTERM') {
        state.midtermPolicy = optionId as AcademyMidtermPolicy;
        state.chronicles.push({ turn: state.currentTurn, title: '期中考評', description: `選定方針 ${optionId}`, highlightScore: 1 });
    } else if (kind === 'COMING_OF_AGE') {
        if (state.learnedTactics.length < ACADEMY_TACTIC_SLOTS) state.learnedTactics.push(optionId);
        state.chronicles.push({ turn: state.currentTurn, title: '弱冠加冠禮', description: `領悟 ${optionId}`, highlightScore: 2 });
    } else if (kind === 'GRADUATION') {
        gimmick?.onGraduate?.(state);
        state.graduated = true;
        state.chronicles.push({ turn: state.currentTurn, title: '大考結業', description: '修業圓滿', highlightScore: 2 });
    }
    if (kind === 'RESONANCE') {
        setScheduledInterrupt(state, rng, gimmick);
    } else {
        state.pendingInterrupt = null;
        state.interruptOptions = [];
    }
}

/** AUTO 模式代選：一律取第一個候選 */
function autoResolveChoice(state: AcademyStateSnapshot): AcademyActionPayload {
    return { actionType: 'RESOLVE_INTERRUPT', selectedOptionId: state.interruptOptions[0] };
}

function clampEnergy(value: number): number {
    return Math.max(0, Math.min(ACADEMY_ENERGY_MAX, Math.floor(value)));
}
