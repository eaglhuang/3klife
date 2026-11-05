// @spec-source → 關卡設計系統.md (doc_spec_0049) §I-2/I-3 Stage_Salvage 戰後一次結算；Data Schema 文件 #25；PROG-2-1571
/**
 * StageSalvageSettlement — 戰場撿拾戰後入帳（純邏輯，不依賴 cc）
 *
 * 換算（暫定，PROG-2-1571）：
 * - 補給 → 糧草 1:1，不超過糧倉上限
 * - 石材／木材／情報／武器材料／教官經驗 → 背包同名材料 1:1（教官經驗存為「教官心得」）
 * 戰敗不入帳（掠奪成果帶不回來）；平手照常入帳。
 */
import { salvageGainItems, type SalvageTotals } from './StrategistHud';
import { addItem, PlayerInventory } from './PlayerInventory';
import { ITEM_INSTRUCTOR_EXP, ITEM_INTEL, ITEM_STONE, ITEM_WEAPON_MATERIAL, ITEM_WOOD } from './ItemDef';

export const SALVAGE_ITEM_IDS: Readonly<Record<Exclude<keyof SalvageTotals, 'supply'>, string>> = Object.freeze({
    stone: ITEM_STONE,
    wood: ITEM_WOOD,
    intel: ITEM_INTEL,
    weaponMaterial: ITEM_WEAPON_MATERIAL,
    instructorExp: ITEM_INSTRUCTOR_EXP,
});

export interface SalvageSettlement {
    food: number;
    inventory: PlayerInventory;
    /** 實際入帳的糧草（扣掉糧倉上限截掉的部分） */
    foodGained: number;
}

export function settleStageSalvage(
    salvage: Readonly<SalvageTotals>,
    won: boolean,
    food: number,
    foodCap: number,
    inventory: PlayerInventory,
): SalvageSettlement {
    if (!won) return { food, inventory, foodGained: 0 };
    const nextFood = Math.min(foodCap, food + Math.max(0, Math.floor(salvage.supply)));
    let next = inventory;
    for (const key of Object.keys(SALVAGE_ITEM_IDS) as (keyof typeof SALVAGE_ITEM_IDS)[]) {
        const amount = Math.max(0, Math.floor(salvage[key] ?? 0));
        if (amount > 0) next = addItem(next, SALVAGE_ITEM_IDS[key], amount);
    }
    return { food: Math.max(food, nextFood), inventory: next, foodGained: Math.max(0, nextFood - food) };
}

/** 戰敗時有回收物的提示（PROG-2-1857） */
export const SALVAGE_LOST_LINE = '戰敗，關卡回收物未能帶回';

/**
 * 戰後結算視窗的關卡回收摘要（PROG-2-1857）。
 * 勝或平：列出帶回的資源，有補給時補一行換算說明；戰敗：有回收物才提示帶不回；沒有回收物不列。
 */
export function salvageSummaryLines(salvage: Readonly<SalvageTotals> | undefined, won: boolean): string[] {
    if (!salvage) return [];
    const items = salvageGainItems(salvage);
    if (items.length === 0) return [];
    if (!won) return [SALVAGE_LOST_LINE];
    const lines = [`關卡回收：${items.map((item) => `${item.name} ${item.amount}`).join('、')}`];
    if (salvage.supply > 0) lines.push('補給已轉為糧草入庫（糧倉滿則截斷）');
    return lines;
}
