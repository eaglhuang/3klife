// @spec-source → 領地治理系統.md (doc_spec_0037) 2026-04-26 裁定第 2 點（戰後戰損回扣城市兵源）；PROG-2-9149 戰後獎懲（使用者裁決 2026-11-18，數值暫定）
/**
 * BattleAftermath — 戰後獎懲帳（純邏輯，不依賴 cc）
 *
 * 戰鬥結束回大廳時，依勝敗算出：糧草、黃金、出戰武將經驗、戰利品、民心變動，以及極速決戰的戰損推估。
 * 所有數值都放在 BATTLE_AFTERMATH_TUNING，流程只讀表，之後調數值不用動 GameSession。
 * 戰中名聲已由戰場端帶進戰後結算，這裡不算名聲，避免重複。
 *
 * Unity 對照：像 ScriptableObject 的獎勵表加一支純函式，戰鬥結束時呼叫一次，回傳要入帳的帳本。
 */
import { ITEM_STONE, ITEM_TREASURE, ITEM_WOOD } from './ItemDef';
import { ITEM_DISPLAY_NAMES } from './PlayerInventory';

export type AftermathOutcome = 'win' | 'draw' | 'loss';

export interface AftermathReward {
    food: number;
    gold: number;
    /** 出戰武將經驗；折成 EP 的比率見 generalExpPerEp */
    generalExp: number;
}

export interface LootEntry {
    itemId: string;
    /** 掉落機率 0～1 */
    chance: number;
    min: number;
    max: number;
}

/** 戰後獎懲暫定值（PROG-2-9149，使用者要求先用暫定值、全放表內） */
export const BATTLE_AFTERMATH_TUNING = Object.freeze({
    /** 各結果的獎勵：勝利給糧草＋黃金＋武將經驗；平手給一小份；失敗只有一點經驗 */
    rewards: Object.freeze({
        win: Object.freeze({ food: 120, gold: 150, generalExp: 40 }),
        draw: Object.freeze({ food: 30, gold: 30, generalExp: 15 }),
        loss: Object.freeze({ food: 0, gold: 0, generalExp: 10 }),
    } as Record<AftermathOutcome, Readonly<AftermathReward>>),
    /** 失敗扣民心（使用者裁決：3） */
    moraleOnLoss: -3,
    /** 武將經驗折 EP 的比率（與大廳任務一致：每 40 點折 1 點 EP） */
    generalExpPerEp: 40,
    /** 戰利品只在勝利時擲；每一項各擲一次 */
    loot: Object.freeze([
        Object.freeze({ itemId: ITEM_WOOD, chance: 0.35, min: 1, max: 3 }),
        Object.freeze({ itemId: ITEM_STONE, chance: 0.25, min: 1, max: 2 }),
        Object.freeze({ itemId: ITEM_TREASURE, chance: 0.05, min: 1, max: 1 }),
    ] as readonly Readonly<LootEntry>[]),
    /** 極速決戰不進戰場，戰損與糧耗由此表推估（戰損＝城市兵源 × 比率，至少 minLostTroops） */
    quickSortie: Object.freeze({
        lostTroopsRate: Object.freeze({ win: 0.03, draw: 0.05, loss: 0.08 } as Record<AftermathOutcome, number>),
        minLostTroops: 10,
        foodSpent: 20,
    }),
});

export interface AftermathContext {
    /** 目前糧草與上限（入帳後不超過上限） */
    food: number;
    foodCap: number;
    /** 目前黃金與上限（黃金在錢包；沒有錢包時 goldRoom 給 0） */
    gold: number;
    goldCap: number;
    /** 亂數 0～1，用於戰利品 */
    random: () => number;
}

export interface LootDrop {
    itemId: string;
    quantity: number;
}

/** 戰後獎懲帳：數字都是「實際入帳」，被上限截掉的另列 */
export interface BattleAftermathLedger {
    outcome: AftermathOutcome;
    food: number;
    foodTruncated: number;
    gold: number;
    goldTruncated: number;
    generalExp: number;
    /** 折成 EP 的點數（每位出戰武將各得這個數） */
    epPerGeneral: number;
    /** 民心變動（負數為扣） */
    morale: number;
    loot: LootDrop[];
    /** 本場戰損已從城市兵源扣除的兵數（由呼叫端填入，供結算畫面顯示） */
    lostTroops: number;
    /** 守城大敗流失的人口（PROG-2-9425，由呼叫端填入）；沒有時不顯示 */
    populationLost?: number;
}

/** 戰場結果換成帳本用的勝敗；ongoing 回 null（不結算） */
export function aftermathOutcomeOf(result: string): AftermathOutcome | null {
    if (result === 'player-win') return 'win';
    if (result === 'enemy-win') return 'loss';
    if (result === 'draw') return 'draw';
    return null;
}

function clampInt(value: number): number {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** 算出戰後獎懲帳（不改任何狀態）；lostTroops 由呼叫端之後填入 */
export function planBattleAftermath(outcome: AftermathOutcome, ctx: Readonly<AftermathContext>): BattleAftermathLedger {
    const reward = BATTLE_AFTERMATH_TUNING.rewards[outcome];
    const foodRoom = Math.max(0, clampInt(ctx.foodCap) - clampInt(ctx.food));
    const goldRoom = Math.max(0, clampInt(ctx.goldCap) - clampInt(ctx.gold));
    const food = Math.min(reward.food, foodRoom);
    const gold = Math.min(reward.gold, goldRoom);
    const loot: LootDrop[] = [];
    if (outcome === 'win') {
        for (const entry of BATTLE_AFTERMATH_TUNING.loot) {
            if (ctx.random() >= entry.chance) continue;
            const span = Math.max(0, entry.max - entry.min);
            loot.push({ itemId: entry.itemId, quantity: entry.min + Math.floor(ctx.random() * (span + 1)) });
        }
    }
    return {
        outcome,
        food,
        foodTruncated: reward.food - food,
        gold,
        goldTruncated: reward.gold - gold,
        generalExp: reward.generalExp,
        epPerGeneral: Math.floor(reward.generalExp / BATTLE_AFTERMATH_TUNING.generalExpPerEp),
        morale: outcome === 'loss' ? BATTLE_AFTERMATH_TUNING.moraleOnLoss : 0,
        loot,
        lostTroops: 0,
    };
}

/** 極速決戰的戰損與糧耗推估（對齊 SortieSummary 的欄位，直接交給 applySortieResult） */
export function quickSortieCost(outcome: AftermathOutcome, cityTroops: number): { lostTroops: number; foodSpent: number } {
    const { lostTroopsRate, minLostTroops, foodSpent } = BATTLE_AFTERMATH_TUNING.quickSortie;
    const raw = Math.floor(clampInt(cityTroops) * lostTroopsRate[outcome]);
    return { lostTroops: Math.min(clampInt(cityTroops), Math.max(minLostTroops, raw)), foodSpent };
}

const OUTCOME_HEAD: Readonly<Record<AftermathOutcome, string>> = Object.freeze({ win: '戰後獎賞', draw: '戰後犒賞', loss: '戰敗代價' });

/** 結算畫面與戰報用的文字列：獎賞、戰損回扣、戰利品、民心 */
export function formatAftermathLines(ledger: Readonly<BattleAftermathLedger>): string[] {
    const lines: string[] = [];
    const gains: string[] = [];
    if (ledger.food > 0) gains.push(`糧草 +${ledger.food}`);
    if (ledger.gold > 0) gains.push(`黃金 +${ledger.gold}`);
    if (ledger.generalExp > 0) gains.push(`武將經驗 +${ledger.generalExp}`);
    if (gains.length > 0) lines.push(`${OUTCOME_HEAD[ledger.outcome]}：${gains.join('、')}`);
    const truncated: string[] = [];
    if (ledger.foodTruncated > 0) truncated.push(`糧草 ${ledger.foodTruncated}`);
    if (ledger.goldTruncated > 0) truncated.push(`黃金 ${ledger.goldTruncated}`);
    if (truncated.length > 0) lines.push(`（倉庫已滿，截掉 ${truncated.join('、')}）`);
    if (ledger.lostTroops > 0) lines.push(`兵源回扣：城市兵源 -${ledger.lostTroops}（戰損）`);
    if (ledger.loot.length > 0) {
        lines.push(`戰利品：${ledger.loot.map((d) => `${ITEM_DISPLAY_NAMES[d.itemId] ?? d.itemId} ×${d.quantity}`).join('、')}`);
    }
    if (ledger.morale !== 0) lines.push(`民心 ${ledger.morale > 0 ? '+' : ''}${ledger.morale}`);
    if ((ledger.populationLost ?? 0) > 0) lines.push(`人口 -${ledger.populationLost}（守城大敗，百姓流離）`);
    return lines;
}
