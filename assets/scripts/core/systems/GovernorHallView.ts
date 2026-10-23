// @spec-source → 領地治理系統.md 頂部「2026-04-26 覆寫裁定：人口、城市兵源與補兵 UI」§3~4（人口核心儀表盤、產出卡拆分、城市兵源卡）；WBS v16.2 GOV-07（PROG-2-0973）
/**
 * GovernorHallView — 太守府治理頁的文字與數值（純邏輯，不依賴 cc）。
 *
 * - 中央儀表盤顯示人口與民心，四條流向：金錢、糧草、城市兵源上限、補兵速度。
 * - 產出卡拆成 基礎值 / 人口紅利 / 政策修正 / 總計；城市兵源卡顯示 目前 / 上限、每回合補兵、距離回滿。
 * - 數值由呼叫端傳入，本模組不計算產出公式（公式屬於治理結算，另行實作）。
 *
 * Unity 對照：像 Presenter，把 Model 的數字轉成 Label 的 text 與進度條的 fillAmount，畫面層不自己算。
 */

export interface OutputBreakdown {
    base: number;
    populationBonus: number;
    policyModifier: number;
}

export interface GovernorSnapshot {
    population: number;
    morale: number;
    gold: OutputBreakdown;
    food: OutputBreakdown;
    cityTroops: {
        current: number;
        cap: number;
        recruitPerTurn: number;
    };
}

export interface OutputCardView {
    title: string;
    baseText: string;
    populationBonusText: string;
    policyModifierText: string;
    totalText: string;
}

export interface CityTroopCardView {
    stockText: string;
    recruitText: string;
    recoverText: string;
}

export interface GovernorFlowView {
    key: 'gold' | 'food' | 'cityTroopCap' | 'recruitRegen';
    label: string;
    valueText: string;
}

export interface GovernorHallView {
    populationText: string;
    moraleText: string;
    flows: GovernorFlowView[];
    goldCard: OutputCardView;
    foodCard: OutputCardView;
    cityTroopCard: CityTroopCardView;
}

function signed(value: number): string {
    if (value === 0) return '+0';
    return value > 0 ? `+${value}` : `${value}`;
}

function outputCard(title: string, breakdown: OutputBreakdown): OutputCardView {
    const total = breakdown.base + breakdown.populationBonus + breakdown.policyModifier;
    return {
        title,
        baseText: `基礎值 ${breakdown.base}`,
        populationBonusText: `人口紅利 ${signed(breakdown.populationBonus)}`,
        policyModifierText: `政策修正 ${signed(breakdown.policyModifier)}`,
        totalText: `總計 ${total}`,
    };
}

/** 距離回滿的回合數；已滿回 0，補兵速度為 0 時無法回滿，回傳 null。 */
export function turnsToFullTroops(current: number, cap: number, recruitPerTurn: number): number | null {
    if (current >= cap) return 0;
    if (recruitPerTurn <= 0) return null;
    return Math.ceil((cap - current) / recruitPerTurn);
}

function cityTroopCard(troops: GovernorSnapshot['cityTroops']): CityTroopCardView {
    const turns = turnsToFullTroops(troops.current, troops.cap, troops.recruitPerTurn);
    let recoverText: string;
    if (turns === 0) recoverText = '距離回滿 已回滿';
    else if (turns === null) recoverText = '距離回滿 無法回滿（補兵為 0）';
    else recoverText = `距離回滿 ${turns} 回合`;
    return {
        stockText: `目前兵源 ${troops.current} / ${troops.cap}`,
        recruitText: `每回合補兵 +${troops.recruitPerTurn}`,
        recoverText,
    };
}

/** 把治理快照轉成太守府的文字與數值；不改輸入。 */
export function buildGovernorHallView(snapshot: Readonly<GovernorSnapshot>): GovernorHallView {
    const gold = snapshot.gold;
    const food = snapshot.food;
    const goldTotal = gold.base + gold.populationBonus + gold.policyModifier;
    const foodTotal = food.base + food.populationBonus + food.policyModifier;
    return {
        populationText: `人口 ${snapshot.population}`,
        moraleText: `民心 ${snapshot.morale}`,
        flows: [
            { key: 'gold', label: '金錢', valueText: `${goldTotal}` },
            { key: 'food', label: '糧草', valueText: `${foodTotal}` },
            { key: 'cityTroopCap', label: '城市兵源上限', valueText: `${snapshot.cityTroops.cap}` },
            { key: 'recruitRegen', label: '補兵速度', valueText: `${snapshot.cityTroops.recruitPerTurn}` },
        ],
        goldCard: outputCard('金錢', gold),
        foodCard: outputCard('糧草', food),
        cityTroopCard: cityTroopCard(snapshot.cityTroops),
    };
}
