// @spec-source → 戰法系統.md (doc_spec_0038)；PROG-2-1429 依建檔紀錄補標出處
import type { Faction } from '../../core/config/Constants';

/**
 * 士氣持續回合（PROG-2-0770，暫定值，記在待辦檔）。
 * 以施放者所屬陣營的回合計：施放當回合算第 1 回合，之後的回合頭 tick 兩次，第 3 回合結束前有效。
 */
export const MORALE_DURATION_TURNS = 3;

/** 士氣上限（PM 裁定 2026-10-28）：全體士氣最大化時套用的值 */
export const MORALE_MAX = 100;

/** 可被鼓舞的單位最小介面，方便純函式測試 */
export interface MoraleCarrier {
  readonly faction: Faction;
  morale: number;
  moraleTurns: number;
  /** 士氣下限（義兄弟同陣整場常駐，PROG-2-10204 後續）：計時結束時回到此值而非 0；未設視為 0 */
  moraleFloor?: number;
}

/**
 * 士氣拉滿（白馬銀槍·不滅）：不看目前是否生效，直接設為士氣上限並重新計時。
 */
export function maximizeMorale(unit: MoraleCarrier): void {
  unit.morale = MORALE_MAX;
  unit.moraleTurns = MORALE_DURATION_TURNS;
}

/**
 * 施放鼓舞：未生效時套用 bonus 並開始計時；仍生效時不再加士氣，只刷新回合數（不疊加）。
 */
export function castMorale(unit: MoraleCarrier, bonus: number): void {
  if (unit.moraleTurns > 0) {
    unit.moraleTurns = MORALE_DURATION_TURNS;
    return;
  }
  unit.morale = Math.max(bonus, unit.moraleFloor ?? 0);
  unit.moraleTurns = MORALE_DURATION_TURNS;
}

/**
 * 士氣增減（戰中升階「敵全體士氣 −15」，PROG-2-9394）：在目前士氣上加減，夾在正負士氣上限之間，並重新計時。
 */
export function shiftMorale(unit: MoraleCarrier, delta: number): void {
  unit.morale = Math.max(-MORALE_MAX, Math.min(MORALE_MAX, unit.morale + delta));
  unit.moraleTurns = MORALE_DURATION_TURNS;
}

/** 單位回合頭遞減；歸零時士氣清為 0。回傳遞減後是否仍有效。 */
export function advanceMorale(unit: MoraleCarrier): boolean {
  if (unit.moraleTurns <= 0) {
    return false;
  }
  unit.moraleTurns -= 1;
  if (unit.moraleTurns === 0) {
    unit.morale = unit.moraleFloor ?? 0;
    return false;
  }
  return true;
}

/** 單位退場（陣亡或移出戰場）時清除士氣與計時（PROG-2-0770 PM 裁決 05:16） */
export function clearMorale(unit: MoraleCarrier): void {
  unit.morale = 0;
  unit.moraleTurns = 0;
}

/** 行動陣營回合頭：只遞減該陣營單位的士氣計時（與防禦區同一時機） */
export function advanceMoraleOf(units: Iterable<MoraleCarrier>, faction: Faction): void {
  for (const unit of units) {
    if (unit.faction === faction) {
      advanceMorale(unit);
    }
  }
}

/**
 * 士氣保底（義兄弟同陣，動態關係規格 §3.1）：士氣至少為 floor，且整場常駐——
 * 不開始計時、其他鼓舞到期後回到 floor 而非 0；已經比 floor 高就不降、不疊加（PROG-2-10204）。
 * 陣亡或移出戰場仍走 clearMorale，與其他士氣一致。
 */
export function applyMoraleFloor(unit: MoraleCarrier, floor: number): void {
  unit.moraleFloor = Math.max(unit.moraleFloor ?? 0, floor);
  unit.morale = Math.max(unit.morale, unit.moraleFloor);
}
