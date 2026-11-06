/**
 * UnitHpBar — 單位頭頂血條的顯示判斷（主戰場UI規格書 §3.1，PROG-2-1874）
 *
 * 規格：血條位於單位頭頂，我方藍、敵方紅；只在受傷時顯示，避免畫面雜亂。
 * 純邏輯，不碰 cc，UnitRenderer 依結果畫 Graphics。
 *
 * Unity 對照：WorldSpace HP Bar 的 Image.fillAmount + gameObject.SetActive(hp < maxHp)。
 */

export type UnitHpBarTone = 'player' | 'enemy';

export interface UnitHpBarState {
    visible: boolean;
    /** 0～1 的剩餘血量比例 */
    ratio: number;
    tone: UnitHpBarTone;
}

export function unitHpBarState(currentHp: number, maxHp: number, isPlayer: boolean): UnitHpBarState {
    const tone: UnitHpBarTone = isPlayer ? 'player' : 'enemy';
    if (!Number.isFinite(maxHp) || maxHp <= 0 || !Number.isFinite(currentHp)) {
        return { visible: false, ratio: 0, tone };
    }
    const ratio = Math.min(1, Math.max(0, currentHp / maxHp));
    return { visible: ratio < 1 && currentHp > 0, ratio, tone };
}
