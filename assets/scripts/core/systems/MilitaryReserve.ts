// @spec-source → 戰場部署系統.md (doc_spec_0040) §F-0 兵源鏈（戰後城市兵源回扣、補兵）；經濟系統.md 覆寫裁定（糧草為部署燃料）；數值系統.md E-15
/**
 * MilitaryReserve — 玩家城市兵源與糧草儲備（純邏輯，不依賴 cc）
 *
 * 出征前讀取：出征軍勢上限之一是城市兵源，本場糧草來自糧草儲備。
 * 戰後寫回：城市兵源扣掉戰損、糧草扣掉本場消耗。
 * 每季推進：城市兵源依補兵速度回補（不超過上限），糧草固定補給（暫定，等治理產出）。
 *
 * Unity 對照：像 SaveData 裡的 [Serializable] class Barracks { int troops; int food; }，
 * 戰鬥結束與每回合結束時各呼叫一次純函式更新。
 */
import { DEFAULT_CITY_TROOPS, DEFAULT_RECRUIT_REGEN, DEFAULT_SORTIE_FOOD, type SortieSummary } from './SortieDeploy';
import { BASE_RESOURCE_CAPS } from './ResourceCap';

export interface MilitaryReserve {
    cityTroops: number;
    cityTroopsCap: number;
    recruitRegen: number;
    food: number;
    foodCap: number;
}

/** 每季糧草補給與上限（暫定：治理產出尚未接入前的固定值） */
export const FOOD_PER_SEASON = 150;
/** 糧草與城市兵源上限統一由 ResourceCap 提供（經濟系統表，PROG-2-1010），不在這裡另存一份 */
export const DEFAULT_FOOD_CAP = BASE_RESOURCE_CAPS.food;
export const DEFAULT_CITY_TROOPS_CAP = BASE_RESOURCE_CAPS.troops;

export const STARTER_MILITARY: Readonly<MilitaryReserve> = {
    cityTroops: Math.min(DEFAULT_CITY_TROOPS, DEFAULT_CITY_TROOPS_CAP),
    cityTroopsCap: DEFAULT_CITY_TROOPS_CAP,
    recruitRegen: DEFAULT_RECRUIT_REGEN,
    food: DEFAULT_SORTIE_FOOD,
    foodCap: DEFAULT_FOOD_CAP,
};

function intOr(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

/** 舊存檔沒有這個欄位、或欄位壞掉時補起始值；目前值不超過上限 */
export function normalizeMilitaryReserve(raw: unknown): MilitaryReserve {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...STARTER_MILITARY };
    const r = raw as Partial<MilitaryReserve>;
    // 上限是規則不是存檔狀態：舊存檔的上限一律改用 ResourceCap 的值
    const cityTroopsCap = DEFAULT_CITY_TROOPS_CAP;
    const foodCap = DEFAULT_FOOD_CAP;
    return {
        cityTroopsCap,
        cityTroops: Math.min(cityTroopsCap, intOr(r.cityTroops, cityTroopsCap)),
        recruitRegen: intOr(r.recruitRegen, STARTER_MILITARY.recruitRegen),
        foodCap,
        food: Math.min(foodCap, intOr(r.food, STARTER_MILITARY.food)),
    };
}

/** 戰後寫回：城市兵源扣戰損、糧草扣本場消耗 */
export function applySortieResult(reserve: MilitaryReserve, summary: Pick<SortieSummary, 'lostTroops' | 'foodSpent'>): MilitaryReserve {
    return {
        ...reserve,
        cityTroops: Math.max(0, reserve.cityTroops - Math.max(0, Math.floor(summary.lostTroops))),
        food: Math.max(0, reserve.food - Math.max(0, Math.floor(summary.foodSpent))),
    };
}

/** 每季：城市兵源 + 補兵速度、糧草 + 固定補給（可乘季節倍率，TIME-08），皆不超過上限 */
export function regenMilitaryOneSeason(reserve: MilitaryReserve, seasons = 1, foodMultiplier = 1): MilitaryReserve {
    const n = Math.max(0, Math.floor(seasons));
    const food = Math.floor(FOOD_PER_SEASON * n * Math.max(0, foodMultiplier));
    return {
        ...reserve,
        cityTroops: Math.min(reserve.cityTroopsCap, reserve.cityTroops + reserve.recruitRegen * n),
        food: Math.min(reserve.foodCap, reserve.food + food),
    };
}
