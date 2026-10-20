import type { Faction } from '../../core/config/Constants';

/**
 * 士氣持續回合（PROG-2-0770，暫定值，記在待辦檔）。
 * 以施放者所屬陣營的回合計：施放當回合算第 1 回合，之後的回合頭 tick 兩次，第 3 回合結束前有效。
 */
export const MORALE_DURATION_TURNS = 3;

/** 可被鼓舞的單位最小介面，方便純函式測試 */
export interface MoraleCarrier {
  readonly faction: Faction;
  morale: number;
  moraleTurns: number;
}

/**
 * 施放鼓舞：未生效時套用 bonus 並開始計時；仍生效時不再加士氣，只刷新回合數（不疊加）。
 */
export function castMorale(unit: MoraleCarrier, bonus: number): void {
  if (unit.moraleTurns > 0) {
    unit.moraleTurns = MORALE_DURATION_TURNS;
    return;
  }
  unit.morale = bonus;
  unit.moraleTurns = MORALE_DURATION_TURNS;
}

/** 單位回合頭遞減；歸零時士氣清為 0。回傳遞減後是否仍有效。 */
export function advanceMorale(unit: MoraleCarrier): boolean {
  if (unit.moraleTurns <= 0) {
    return false;
  }
  unit.moraleTurns -= 1;
  if (unit.moraleTurns === 0) {
    unit.morale = 0;
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
