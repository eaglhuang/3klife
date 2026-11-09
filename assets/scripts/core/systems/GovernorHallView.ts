// @spec-source → 領地治理系統.md 頂部「2026-04-26 覆寫裁定：人口、城市兵源與補兵 UI」§3~4（人口核心儀表盤、產出卡拆分、城市兵源卡）；WBS v16.2 GOV-07（PROG-2-0973）
/**
 * GovernorHallView — 太守府治理頁的文字與數值（純邏輯，不依賴 cc）。
 *
 * - 中央儀表盤顯示人口與民心，四條流向：金錢、糧草、城市兵源上限、補兵速度。
 * - 產出卡拆成 基礎值 / 人口紅利 / 政策修正 / 總計；城市兵源卡顯示 目前 / 上限、每回合補兵、距離回滿。
 * - 數值由呼叫端傳入，本模組不計算產出公式（公式屬於治理結算，另行實作）。
 * - 人口、民心與金錢季產出還沒有資料來源，以 null 表示並顯示「—」，不用 0 假裝有值。
 *
 * Unity 對照：像 Presenter，把 Model 的數字轉成 Label 的 text 與進度條的 fillAmount，畫面層不自己算。
 */
import { FOOD_PER_SEASON, type MilitaryReserve } from './MilitaryReserve';

export interface OutputBreakdown {
    base: number;
    populationBonus: number;
    policyModifier: number;
}

export interface GovernorSnapshot {
    population: number | null;
    morale: number | null;
    gold: OutputBreakdown | null;
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

/** 沒有資料來源時顯示的文字 */
const NO_DATA = '—';

function textOrNoData(value: number | null): string {
    return value === null ? NO_DATA : `${value}`;
}

function outputTotal(breakdown: OutputBreakdown | null): number | null {
    return breakdown === null ? null : breakdown.base + breakdown.populationBonus + breakdown.policyModifier;
}

function outputCard(title: string, breakdown: OutputBreakdown | null): OutputCardView {
    if (breakdown === null) {
        return {
            title,
            baseText: `基礎值 ${NO_DATA}`,
            populationBonusText: `人口紅利 ${NO_DATA}`,
            policyModifierText: `政策修正 ${NO_DATA}`,
            totalText: `總計 ${NO_DATA}`,
        };
    }
    const total = outputTotal(breakdown);
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

/**
 * 由玩家儲備組出治理快照：兵源與補兵是實際值；糧草基礎值是本季結算會入帳的固定補給（含季節倍率）。
 * 人口、民心、金錢季產出沒有來源，回 null；金錢目前只來自內政任務與事件，沒有固定季產出。
 */
export function buildGovernorSnapshot(military: Readonly<MilitaryReserve>, foodMultiplier = 1): GovernorSnapshot {
    return {
        population: null,
        morale: null,
        gold: null,
        food: { base: Math.floor(FOOD_PER_SEASON * Math.max(0, foodMultiplier)), populationBonus: 0, policyModifier: 0 },
        cityTroops: { current: military.cityTroops, cap: military.cityTroopsCap, recruitPerTurn: military.recruitRegen },
    };
}

/** 把治理快照轉成太守府的文字與數值；不改輸入。 */
export function buildGovernorHallView(snapshot: Readonly<GovernorSnapshot>): GovernorHallView {
    const gold = snapshot.gold;
    const food = snapshot.food;
    return {
        populationText: `人口 ${textOrNoData(snapshot.population)}`,
        moraleText: `民心 ${textOrNoData(snapshot.morale)}`,
        flows: [
            { key: 'gold', label: '金錢', valueText: textOrNoData(outputTotal(gold)) },
            { key: 'food', label: '糧草', valueText: textOrNoData(outputTotal(food)) },
            { key: 'cityTroopCap', label: '城市兵源上限', valueText: `${snapshot.cityTroops.cap}` },
            { key: 'recruitRegen', label: '補兵速度', valueText: `${snapshot.cityTroops.recruitPerTurn}` },
        ],
        goldCard: outputCard('金錢', gold),
        foodCard: outputCard('糧草', food),
        cityTroopCard: cityTroopCard(snapshot.cityTroops),
    };
}
