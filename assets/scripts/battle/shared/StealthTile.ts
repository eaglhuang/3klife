// @spec-source → 戰場格子系統.md §B(4) Stealth（onEnterHide(boolean)，進入後隱蔽防遠程）；GRD-04（PROG-2-0578）
/**
 * StealthTile — 掩體格的隱蔽判定（純邏輯，不依賴 cc）
 *
 * 站在掩體格（ambush-field）上的單位處於隱蔽：遠程攻擊無法鎖定，近戰不受影響。
 * 隱蔽只看「現在站的格子」，離開掩體格就失效。
 *
 * Unity 對照：像 Physics 的 Layer 過濾，掩體格上的目標對遠程射線設為不可見，近身碰撞照常。
 */
import type { TileEffectState } from '../models/BattleState';

/** 目前站的格子是否為掩體（隱蔽）格 */
export function isHiddenOnTile(tileState: TileEffectState | null | undefined): boolean {
    return tileState === 'ambush-field';
}

/** 遠程攻擊的判定：攻擊射程大於 1 視為遠程 */
export function isRangedAttack(attackRange: number): boolean {
    return attackRange > 1;
}

/**
 * 攻擊者能否鎖定目標：
 * - 遠程攻擊不能鎖定隱蔽目標；
 * - 近戰攻擊不受隱蔽影響。
 */
export function canTargetUnderStealth(attackRange: number, targetHidden: boolean): boolean {
    if (!targetHidden) return true;
    return !isRangedAttack(attackRange);
}
