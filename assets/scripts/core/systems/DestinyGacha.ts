// @spec-source → WBS v5 OPEN-05（宿命轉蛋：無限重置十連抽、初始名將鎖定與確認）；GachaConfig.ts 的 resetEnabled / firstPickOnly / confirmRequired（暫定解讀）
/**
 * DestinyGacha — 宿命轉蛋的純狀態機，不依賴 cc。
 *
 * 流程：idle →（十連）→ rolled →（重置）→ idle，或 rolled →（選定＋確認）→ locked（終態）。
 * - 重置免費、次數不限，回到整池恢復的初始狀態。
 * - firstPickOnly 為 true 時，一次十連內 id 不重複；為 false 時允許重複（有放回）。暫定解讀。
 * - 隨機源由呼叫端注入；所有函式回傳新狀態，不改輸入。
 *
 * Unity 對照：像一個 ScriptableObject 的抽卡機，Roll() 產生 10 張，Reset() 把牌洗回整副，
 * Confirm() 把選中的那張寫進存檔後鎖住，之後 Roll() 與 Reset() 都會被拒絕。
 */
import type { GachaConfig } from '../models/GachaConfig';

export type DestinyGachaPhase = 'idle' | 'rolled' | 'locked';

export interface DestinyGachaState {
    phase: DestinyGachaPhase;
    /** 本輪十連抽到的 id（rolled 時有值）。 */
    rolled: string[];
    /** 已選定但尚未確認的 id（confirmRequired 時才會停在這裡）。 */
    selected: string | null;
    /** 確認鎖定的初始名將（locked 時有值）。 */
    locked: string | null;
    /** 已重置次數，只用來顯示與統計，不影響費用。 */
    resets: number;
}

export interface DestinyGachaOptions {
    resetEnabled: boolean;
    firstPickOnly: boolean;
    confirmRequired: boolean;
    pickCount: number;
}

export type DestinyGachaRejectReason =
    | 'locked'
    | 'reset-disabled'
    | 'already-rolled'
    | 'pool-too-small'
    | 'not-rolled'
    | 'not-in-roll'
    | 'not-selected';

export interface DestinyGachaResult {
    ok: boolean;
    reason?: DestinyGachaRejectReason;
    state: DestinyGachaState;
}

export function createDestinyGachaState(): DestinyGachaState {
    return { phase: 'idle', rolled: [], selected: null, locked: null, resets: 0 };
}

/** 從 GachaConfig 讀取轉蛋規則；candidateIds 由呼叫端另外傳入池子。 */
export function optionsFromGachaConfig(config: Readonly<GachaConfig>): DestinyGachaOptions {
    return {
        resetEnabled: config.resetEnabled,
        firstPickOnly: config.firstPickOnly,
        confirmRequired: config.confirmRequired,
        pickCount: config.pickCount,
    };
}

function reject(state: DestinyGachaState, reason: DestinyGachaRejectReason): DestinyGachaResult {
    return { ok: false, reason, state: { ...state, rolled: [...state.rolled] } };
}

/**
 * 十連抽：只能從 idle 開始。firstPickOnly 為 true 時 id 不重複，池子不足抽數則拒絕。
 * random 回傳 [0, 1)，與既有 SeededRandom 的介面相同。
 */
export function rollDestinyGacha(
    state: Readonly<DestinyGachaState>,
    pool: readonly string[],
    options: Readonly<DestinyGachaOptions>,
    random: () => number,
): DestinyGachaResult {
    if (state.phase === 'locked') return reject(state, 'locked');
    if (state.phase === 'rolled') return reject(state, 'already-rolled');
    const unique = Array.from(new Set(pool));
    if (options.firstPickOnly && unique.length < options.pickCount) return reject(state, 'pool-too-small');

    const remaining = [...unique];
    const rolled: string[] = [];
    for (let i = 0; i < options.pickCount; i++) {
        const source = options.firstPickOnly ? remaining : unique;
        const index = Math.min(source.length - 1, Math.floor(random() * source.length));
        const [id] = options.firstPickOnly ? remaining.splice(index, 1) : [source[index]];
        rolled.push(id);
    }
    return { ok: true, state: { ...state, phase: 'rolled', rolled, selected: null } };
}

/** 免費重置回初始狀態（整池恢復）；resetEnabled 為 false 時拒絕，確認鎖定後也拒絕。 */
export function resetDestinyGacha(state: Readonly<DestinyGachaState>, options: Readonly<DestinyGachaOptions>): DestinyGachaResult {
    if (state.phase === 'locked') return reject(state, 'locked');
    if (!options.resetEnabled) return reject(state, 'reset-disabled');
    return { ok: true, state: { ...createDestinyGachaState(), resets: state.resets + 1 } };
}

/**
 * 選定一位。confirmRequired 為 false 時直接鎖定，否則只停在 selected，等 confirmDestinyGacha。
 */
export function selectDestinyGacha(state: Readonly<DestinyGachaState>, id: string, options: Readonly<DestinyGachaOptions>): DestinyGachaResult {
    if (state.phase === 'locked') return reject(state, 'locked');
    if (state.phase !== 'rolled') return reject(state, 'not-rolled');
    if (!state.rolled.includes(id)) return reject(state, 'not-in-roll');
    if (!options.confirmRequired) {
        return { ok: true, state: { ...state, phase: 'locked', selected: id, locked: id, rolled: [...state.rolled] } };
    }
    return { ok: true, state: { ...state, selected: id, rolled: [...state.rolled] } };
}

/** 確認鎖定目前選定的那一位；沒有選定時拒絕。 */
export function confirmDestinyGacha(state: Readonly<DestinyGachaState>): DestinyGachaResult {
    if (state.phase === 'locked') return reject(state, 'locked');
    if (state.phase !== 'rolled' || state.selected === null) return reject(state, 'not-selected');
    return { ok: true, state: { ...state, phase: 'locked', locked: state.selected, rolled: [...state.rolled] } };
}
