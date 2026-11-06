/**
 * StatBonusText — 單位頭頂數值帶出 Buff 增減量（主戰場UI規格書 §3.1「35 (+10)」，PROG-2-1870）
 *
 * Unity 對照：頭頂 HUD 的 TMP 字串格式化 helper，與顏色分級分開以便測試。
 */

export type StatBonusTone = 'normal' | 'up' | 'down';

/** 例：statWithBonusText(35, 10) → "35 (+10)"；增減為 0 只顯示數值；prefix 用於將軍化身「攻 」「命 」 */
export function statWithBonusText(value: number, bonus: number, prefix = ''): string {
  const delta = Math.round(bonus);
  if (delta === 0) return `${prefix}${value}`;
  return `${prefix}${value} (${delta > 0 ? '+' : ''}${delta})`;
}

/** 增益綠、減益紅、無變化白 */
export function statBonusTone(bonus: number): StatBonusTone {
  const delta = Math.round(bonus);
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'normal';
}
