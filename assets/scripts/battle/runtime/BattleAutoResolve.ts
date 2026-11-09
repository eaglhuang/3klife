// @spec-source → 使用者裁定 2026-10-25（戰鬥先用自動模擬數值結果直接跳結算）；PROG-2-1091；doc_spec_1170 §二（PROG-2-2202，LOOP-02）
/**
 * BattleAutoResolve — 戰鬥「自動」鈕的數值結算（純 TS，不依賴 cc）。
 *
 * 雙方戰力 = 主將（武·統·智·魅加權 × 剩餘血量比例）+ 存活部隊（血量與攻擊）+ 城寨血量，
 * 各乘 0.85~1.15 的浮動後比大小：高者勝，差距在 3% 內算平手。
 * 結果交給既有 BattleEnded 流程，結算彈窗、戰績、通關紀錄都不另寫。
 *
 * 極速決戰（doc_spec_1170 §二，PROG-2-2202）另外加上：
 * - 兵種互克：以雙方存活部隊最多的兵種比較，騎剋步、步剋弓、弓剋騎；克制方戰力 ×1.15、被克制方 ×0.9。
 * - 主將個性特寫：武力 ≥ 90 有 40% 陣前斬將（戰力 ×1.25）；智力 ≥ 90 有 40% 誘敵深入（戰力 ×1.2）；
 *   魅力 ≥ 85 有 25% 義旗高揚（只寫戰報）。
 * - 三幕戰報：前哨戰 → 中盤激戰（插特寫）→ 終局定勢。
 *
 * 暫定（可逆，自動結算沒有戰損與地形資料）：「勝率 +25%／+20%」以戰力倍率表示；敵戰損 +30%、我方戰損 −50%、
 * 地形適性、義旗高揚的戰俘與民心 +10 都不結算，只寫在戰報。主將魅力缺值時用武·統·智平均。
 */
import type { BattleResult } from './BattleRuntimeContract';

export interface AutoResolveGeneral {
    readonly str: number;
    readonly int: number;
    readonly lea: number;
    readonly currentHp: number;
    readonly maxHp: number;
    readonly cha?: number;
    readonly name?: string;
}

export interface AutoResolveTroop {
    readonly currentHp: number;
    readonly attack: number;
    readonly type?: string;
}

export interface AutoResolveSide {
    readonly general: AutoResolveGeneral | null;
    readonly troops: readonly AutoResolveTroop[];
    readonly fortressHp: number;
}

export interface AutoResolveOutcome {
    readonly result: Exclude<BattleResult, 'ongoing'>;
    readonly playerPower: number;
    readonly enemyPower: number;
}

export const AUTO_RESOLVE_DRAW_MARGIN = 0.03;

export function sidePower(side: AutoResolveSide): number {
    const g = side.general;
    const generalPart = g && g.maxHp > 0
        ? (g.str * 0.35 + g.lea * 0.35 + g.int * 0.2 + (g.cha ?? (g.str + g.lea + g.int) / 3) * 0.1) * 10 * Math.max(0, g.currentHp) / g.maxHp
        : 0;
    const troopPart = side.troops.reduce((sum, t) => sum + Math.max(0, t.currentHp) / 10 + t.attack / 2, 0);
    return Math.round(generalPart + troopPart + Math.max(0, side.fortressHp) / 5);
}

export function autoResolveOutcome(player: AutoResolveSide, enemy: AutoResolveSide, random: () => number): AutoResolveOutcome {
    return resolveByPower(sidePower(player), sidePower(enemy), random);
}

/** 給定雙方基礎戰力，各乘 0.85~1.15 浮動後判勝負（差距 3% 內平手） */
export function resolveByPower(playerBase: number, enemyBase: number, random: () => number): AutoResolveOutcome {
    const playerPower = Math.round(playerBase * (0.85 + random() * 0.3));
    const enemyPower = Math.round(enemyBase * (0.85 + random() * 0.3));
    const top = Math.max(playerPower, enemyPower, 1);
    const result = Math.abs(playerPower - enemyPower) / top <= AUTO_RESOLVE_DRAW_MARGIN
        ? 'draw'
        : playerPower > enemyPower ? 'player-win' : 'enemy-win';
    return { result, playerPower, enemyPower };
}

/** 新手首戰保證勝（使用者裁定 2026-10-26，PROG-2-1127）：尚未首勝時敗、和都改判玩家勝，戰力數字照實顯示 */
export function applyOpeningWinGuarantee(outcome: AutoResolveOutcome, firstBattleCleared: boolean): AutoResolveOutcome {
    return firstBattleCleared ? outcome : { ...outcome, result: 'player-win' };
}

export const QUICK_RESOLVE_TUNING = Object.freeze({
    counterBonus: 1.15,
    counteredPenalty: 0.9,
});

/** 兵種互克：key 剋 value */
export const TROOP_COUNTERS: Readonly<Record<string, string>> = Object.freeze({
    cavalry: 'infantry',
    infantry: 'archer',
    archer: 'cavalry',
});

export type QuickSpotlightId = 'DUEL' | 'AMBUSH' | 'RALLY';

interface SpotlightDef {
    id: QuickSpotlightId;
    stat: 'str' | 'int' | 'cha';
    threshold: number;
    chance: number;
    powerMultiplier: number;
    line: string;
}

export const QUICK_SPOTLIGHTS: readonly SpotlightDef[] = Object.freeze([
    { id: 'DUEL', stat: 'str', threshold: 90, chance: 0.4, powerMultiplier: 1.25, line: '【陣前斬將】{Name}策馬躍出，手起刀落將敵先鋒挑落馬下！敵軍震恐潰退！' },
    { id: 'AMBUSH', stat: 'int', threshold: 90, chance: 0.4, powerMultiplier: 1.2, line: '【誘敵深入】{Name}預伏火雷伏兵，敵軍追入狹道頓遭火海包圍！' },
    { id: 'RALLY', stat: 'cha', threshold: 85, chance: 0.25, powerMultiplier: 1, line: '【義旗高揚】{Name}親撫士卒，鄉民義勇倒戈助陣！' },
]);

export interface QuickResolveOutcome extends AutoResolveOutcome {
    readonly spotlights: readonly QuickSpotlightId[];
    /** 三幕戰報，依序顯示 */
    readonly reportLines: readonly string[];
}

/** 存活部隊最多的兵種；沒有部隊或沒有兵種資料回傳 null（同數取先出現者） */
export function dominantTroopType(troops: readonly AutoResolveTroop[]): string | null {
    const counts = new Map<string, number>();
    for (const t of troops) {
        if (!t.type || t.currentHp <= 0) continue;
        counts.set(t.type, (counts.get(t.type) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    counts.forEach((count, type) => {
        if (count > bestCount) {
            best = type;
            bestCount = count;
        }
    });
    return best;
}

/** 己方對敵方的兵種互克倍率 */
export function troopCounterMultiplier(own: readonly AutoResolveTroop[], enemy: readonly AutoResolveTroop[]): number {
    const mine = dominantTroopType(own);
    const theirs = dominantTroopType(enemy);
    if (!mine || !theirs) return 1;
    if (TROOP_COUNTERS[mine] === theirs) return QUICK_RESOLVE_TUNING.counterBonus;
    if (TROOP_COUNTERS[theirs] === mine) return QUICK_RESOLVE_TUNING.counteredPenalty;
    return 1;
}

/** 主將個性特寫：每種各擲一次；主將陣亡或沒有主將時不觸發 */
export function rollQuickSpotlights(general: AutoResolveGeneral | null, random: () => number): QuickSpotlightId[] {
    if (!general || general.currentHp <= 0) return [];
    const statOf = (stat: SpotlightDef['stat']): number => (stat === 'cha' ? general.cha ?? 0 : general[stat]);
    return QUICK_SPOTLIGHTS
        .filter((def) => statOf(def.stat) >= def.threshold && random() < def.chance)
        .map((def) => def.id);
}

/**
 * 極速決戰：兵種互克與主將特寫加乘後再走 autoResolveOutcome 的浮動與勝負判定，並組三幕戰報。
 * 亂數依序消耗：我方特寫 → 雙方浮動。
 */
export function quickResolveOutcome(player: AutoResolveSide, enemy: AutoResolveSide, random: () => number): QuickResolveOutcome {
    const spotlights = rollQuickSpotlights(player.general, random);
    const spotlightMultiplier = spotlights.reduce((total, id) => total * (QUICK_SPOTLIGHTS.find((d) => d.id === id)?.powerMultiplier ?? 1), 1);
    const playerMultiplier = troopCounterMultiplier(player.troops, enemy.troops) * spotlightMultiplier;
    const enemyMultiplier = troopCounterMultiplier(enemy.troops, player.troops);
    const base = resolveByPower(sidePower(player) * playerMultiplier, sidePower(enemy) * enemyMultiplier, random);
    const name = player.general?.name ?? '我方主將';
    const lines = [`前哨戰：兩軍對壘，我方戰力 ${base.playerPower}，敵方戰力 ${base.enemyPower}。`];
    const counter = playerMultiplier / spotlightMultiplier;
    lines.push(counter > 1 ? '中盤激戰：我軍兵種剋制敵陣，攻勢如潮！' : counter < 1 ? '中盤激戰：敵軍兵種剋制我陣，我軍苦戰。' : '中盤激戰：雙方短兵相接，殺聲震天。');
    for (const id of spotlights) {
        const def = QUICK_SPOTLIGHTS.find((d) => d.id === id);
        if (def) lines.push(def.line.split('{Name}').join(name));
    }
    lines.push(base.result === 'player-win' ? '終局定勢：敵軍潰散，我軍大獲全勝！' : base.result === 'enemy-win' ? '終局定勢：我軍不支，只得收兵撤退。' : '終局定勢：日暮鳴金，雙方各自收兵。');
    return { ...base, spotlights, reportLines: lines };
}
