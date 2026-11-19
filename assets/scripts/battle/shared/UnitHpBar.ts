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

/**
 * 掉血殘影條（PROG-2-9412）：血條先瞬間掉到新值，舊血量的位置留一段淺色殘影，
 * 停 HP_CHIP_HOLD_SEC 秒後再追上去，玩家才看得出「這一下打掉多少」。補血不留殘影。
 */
export interface HpChipState {
    /** 殘影目前的右端（0～1 血量比例） */
    lag: number;
    /** 還要停多久才開始追（秒） */
    hold: number;
}

export const HP_CHIP_HOLD_SEC = 0.3;
/** 追趕速度：每秒追上剩餘差距的倍數（越大越快），另有最低速度避免尾巴拖太久。 */
const HP_CHIP_CATCHUP_RATE = 5;
const HP_CHIP_MIN_SPEED = 0.25;

/** 血量比例變化時更新殘影：掉血就（延長）殘影，連續挨打時殘影保留最早的位置；補血清掉。 */
export function hpChipOnChange(chip: HpChipState | null, prevRatio: number, nextRatio: number): HpChipState | null {
    if (!(nextRatio < prevRatio)) return nextRatio > prevRatio ? null : chip;
    return { lag: Math.max(chip?.lag ?? prevRatio, prevRatio), hold: HP_CHIP_HOLD_SEC };
}

/** 每幀推進殘影；追上目前血量就回 null（不用再畫）。 */
export function stepHpChip(chip: HpChipState | null, ratio: number, dt: number): HpChipState | null {
    if (!chip || !(dt >= 0)) return chip;
    if (chip.hold > 0) {
        const hold = chip.hold - dt;
        if (hold > 0) return { lag: chip.lag, hold };
        dt = -hold;
    }
    const lag = chip.lag - Math.max(HP_CHIP_MIN_SPEED, (chip.lag - ratio) * HP_CHIP_CATCHUP_RATE) * dt;
    return lag <= ratio ? null : { lag, hold: 0 };
}
