/**
 * DamageFloatType — 小兵受擊飄字樣式選擇（主戰場UI規格書 §3.2，PROG-2-1875）
 *
 * 規格：傷害紅字、暴擊橘金粗體放大、治療綠字。主將受擊早已依 isCrit 切暴擊樣式，
 * 小兵這裡補齊同一套規則。純邏輯，字串對應 FloatTextSystem 的 FloatTextType。
 *
 * Unity 對照：DamagePopup.Create(type) 前的樣式選擇函式。
 */

export type UnitValueFloatType = 'heal' | 'dmg_crit' | 'dmg_player' | 'dmg_enemy';

export function unitValueFloatType(kind: 'damage' | 'heal', isPlayerUnit: boolean, isCrit = false): UnitValueFloatType {
    if (kind === 'heal') return 'heal';
    if (isCrit) return 'dmg_crit';
    return isPlayerUnit ? 'dmg_player' : 'dmg_enemy';
}
