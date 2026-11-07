// @spec-source → 因子覺醒碎裂狀態機與條件判定規格書 (doc_spec_0328) §1~§3（GEN-08，PROG-2-2004）
/**
 * FactorShatterContract — 因子槽三態判定、合法轉換、戰功覺醒機率（新公式）與碎裂動效時間軸（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - LOCKED（isLocked、未窺探）→ PEEKED（isLocked、已窺探）→ AWAKENED（解鎖、已窺探）；LOCKED 也可直接覺醒；不可倒退。
 * - 只有 AWAKENED 生效；PEEKED 只揭示名稱。
 * - 戰功覺醒：15% + floor(LUK/10)×1%（LUK 80 → 23%）。
 * - 碎裂：0~0.20 秒震顫、0.20~0.35 秒炸成 6~8 片並播 sfx_crystal_shatter、0.35~0.65 秒光玉升起；24 顆星芒粒子；
 *   Toast「【因子覺醒！】獲得特技：[名稱]」。
 *
 * 暫定：既有 FactorAwakening 的特定動作機率為 0.15 ×（1 + LUK/300），與本規格加法公式不一致，
 * 本檔另立 specialBattleAwakenChance 不改既有結算，待裁決統一。LUK/10 解讀為無條件捨去；機率上限 1。
 * 碎片數以 seed 決定性選 6~8。實際動畫與 GameSession 接線另卡。
 * Unity 對照：像 Animator 狀態機的 transition 規則表，加上一份 Timeline 的時間點常數。
 */

export type GeneSlotState = 'LOCKED' | 'PEEKED' | 'AWAKENED';

export interface GeneSlotFlags {
    isLocked: boolean;
    isPeeked: boolean;
}

/** 由旗標判定狀態；解鎖即視為已覺醒。 */
export function geneSlotStateOf(flags: GeneSlotFlags): GeneSlotState {
    if (!flags.isLocked) return 'AWAKENED';
    return flags.isPeeked ? 'PEEKED' : 'LOCKED';
}

export function geneSlotFlagsOf(state: GeneSlotState): GeneSlotFlags {
    if (state === 'AWAKENED') return { isLocked: false, isPeeked: true };
    return { isLocked: true, isPeeked: state === 'PEEKED' };
}

const ORDER: Readonly<Record<GeneSlotState, number>> = { LOCKED: 0, PEEKED: 1, AWAKENED: 2 };

/** 只能往前走（含 LOCKED 直接覺醒）；同狀態不算轉換。 */
export function canTransitionGeneSlot(from: GeneSlotState, to: GeneSlotState): boolean {
    return ORDER[to] > ORDER[from];
}

/** 是否提供加成：只有 AWAKENED。 */
export function isGeneSlotEffective(state: GeneSlotState): boolean {
    return state === 'AWAKENED';
}

/** 是否可看因子名稱：PEEKED 與 AWAKENED。 */
export function isGeneSlotRevealed(state: GeneSlotState): boolean {
    return state !== 'LOCKED';
}

export const BASE_BATTLE_AWAKEN_RATE = 0.15;
export const BATTLE_AWAKEN_LUK_STEP = 10;
export const BATTLE_AWAKEN_LUK_RATE = 0.01;

/** 戰功覺醒機率（規格新公式）：15% + floor(LUK/10)×1%，上限 100%。 */
export function specialBattleAwakenChance(luk: number): number {
    const safe = Number.isFinite(luk) && luk > 0 ? luk : 0;
    const chance = BASE_BATTLE_AWAKEN_RATE + Math.floor(safe / BATTLE_AWAKEN_LUK_STEP) * BATTLE_AWAKEN_LUK_RATE;
    return Math.min(1, Math.round(chance * 1e6) / 1e6);
}

export type ShatterPhase = 'tremble' | 'burst' | 'rise' | 'done';

export const SHATTER_TREMBLE_END_SEC = 0.2;
export const SHATTER_BURST_END_SEC = 0.35;
export const SHATTER_RISE_END_SEC = 0.65;
export const SHATTER_SFX = 'sfx_crystal_shatter';
export const SHATTER_PARTICLE_COUNT = 24;
export const SHATTER_SHARD_MIN = 6;
export const SHATTER_SHARD_MAX = 8;

/** 動效時間 t 秒所在階段。 */
export function shatterPhaseAt(t: number): ShatterPhase {
    if (t < SHATTER_TREMBLE_END_SEC) return 'tremble';
    if (t < SHATTER_BURST_END_SEC) return 'burst';
    if (t < SHATTER_RISE_END_SEC) return 'rise';
    return 'done';
}

/** 碎片數 6~8，以整數 seed 決定性選擇。 */
export function shatterShardCount(seed: number): number {
    const span = SHATTER_SHARD_MAX - SHATTER_SHARD_MIN + 1;
    const s = Math.abs(Math.trunc(Number.isFinite(seed) ? seed : 0));
    return SHATTER_SHARD_MIN + (s % span);
}

/** 覺醒 Toast 文字。 */
export function factorAwakenToast(factorName: string): string {
    return `【因子覺醒！】獲得特技：${factorName}`;
}
