/**
 * DamageFloatType — 小兵受擊飄字樣式選擇（主戰場UI規格書 §3.2，PROG-2-1875）
 *
 * 規格：傷害紅字、暴擊橘金粗體放大、治療綠字。主將受擊早已依 isCrit 切暴擊樣式，
 * 小兵這裡補齊同一套規則。純邏輯，字串對應 FloatTextSystem 的 FloatTextType。
 *
 * Unity 對照：DamagePopup.Create(type) 前的樣式選擇函式。
 */

export type UnitValueFloatType = 'heal' | 'dmg_crit' | 'dmg_heavy' | 'dmg_player' | 'dmg_enemy';

/** heavy：PROG-2-9412 重擊（依 isHeavyHit 判定）用橘色中大字；爆擊仍優先。 */
export function unitValueFloatType(kind: 'damage' | 'heal', isPlayerUnit: boolean, isCrit = false, heavy = false): UnitValueFloatType {
    if (kind === 'heal') return 'heal';
    if (isCrit) return 'dmg_crit';
    if (heavy) return 'dmg_heavy';
    return isPlayerUnit ? 'dmg_player' : 'dmg_enemy';
}
