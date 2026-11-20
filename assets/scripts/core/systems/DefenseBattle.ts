// @spec-source → 關卡設計系統 shard-a §C-3（年終守城，裁決 86–88）；PROG-2-9425 守城戰場模式
/**
 * DefenseBattle — 守城戰（玩家是守方）的設定與判定（純資料與純函式，不依賴 cc，可直接單元測試）。
 *
 * 使用者 11/20 裁決（年終守城十一題全採建議 A）：
 *   - 撐滿回合上限（預設 12）即勝；城寨失守為敗；失守且我方武將全滅為大敗。
 *   - 沿用攻城戰場鏡像：城牆區、護城河、城牆加成改給守方（玩家）；衝車、投石機、雲梯給攻方（敵軍）。
 *   - 不丟城：敗只扣民心（applyDefenseDefeat），大敗再扣人口。
 *   - 勝利照一般勝利給戰利品，另加民心（預設 +2）。
 *   - 守城是獨立的 defense 類別，不扣壽命。
 * 數值放 data/defense-battle.json，調數值不用動程式。
 *
 * Unity 對照：一種 GameMode 的 ScriptableObject 設定＋判定規則。
 */

import { Faction } from '../../shared/CommonEnums';

export interface DefenseBattleConfig {
    /** 撐滿幾回合即勝 */
    turnLimit: number;
    /** 守城勝利額外民心 */
    moraleOnVictory: number;
}

export const DEFAULT_DEFENSE_BATTLE: Readonly<DefenseBattleConfig> = Object.freeze({
    turnLimit: 12,
    moraleOnVictory: 2,
});

function positiveInt(value: unknown): number | null {
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function nonNegativeInt(value: unknown): number | null {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

/** 解析設定檔；缺欄位或不合法的欄位用預設 */
export function parseDefenseBattleConfig(raw: unknown): DefenseBattleConfig {
    const src = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
    return {
        turnLimit: positiveInt(src.turnLimit) ?? DEFAULT_DEFENSE_BATTLE.turnLimit,
        moraleOnVictory: nonNegativeInt(src.moraleOnVictory) ?? DEFAULT_DEFENSE_BATTLE.moraleOnVictory,
    };
}

/** 遭遇設定的戰場類別是不是守城 */
export function isDefenseBattleKind(kind: string | null | undefined): boolean {
    return kind === 'defense';
}

/** 攻城戰法的守方陣營：守城戰是玩家守，其餘（一般攻城）是敵方守 */
export function siegeDefenderOf(kind: string | null | undefined): Faction {
    return isDefenseBattleKind(kind) ? Faction.Player : Faction.Enemy;
}

/**
 * 守城戰的回合上限與時限判定：遭遇自己有設定就用遭遇的，否則用設定檔；時限到一律判守方（玩家）勝。
 * 不是守城戰回傳遭遇原本的設定。
 */
export function resolveDefenseTurnLimit(
    encounter: { battleKind?: string; turnLimit?: number; timeUpRule?: 'by-damage' | 'enemy-win' | 'player-win' } | null | undefined,
    config: Readonly<DefenseBattleConfig>,
): { turnLimit: number | undefined; timeUpRule: 'by-damage' | 'enemy-win' | 'player-win' | undefined } {
    if (!isDefenseBattleKind(encounter?.battleKind)) return { turnLimit: encounter?.turnLimit, timeUpRule: encounter?.timeUpRule };
    return { turnLimit: encounter?.turnLimit ?? config.turnLimit, timeUpRule: 'player-win' };
}

export type DefenseOutcome = 'victory' | 'draw' | 'defeat' | 'rout';

/**
 * 守城結果分級：失敗時我方武將全滅（目前戰場我方只有一位主將，主將倒下即全滅）判大敗。
 * 戰場分出勝負時只會有一方被打垮，所以「失守且全滅」以「失敗且主將倒下」判定。
 */
export function defenseOutcomeOf(result: string, playerGeneralsDown: boolean): DefenseOutcome | null {
    if (result === 'player-win') return 'victory';
    if (result === 'draw') return 'draw';
    if (result === 'enemy-win') return playerGeneralsDown ? 'rout' : 'defeat';
    return null;
}
