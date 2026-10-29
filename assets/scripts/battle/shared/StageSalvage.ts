// @spec-source → 關卡設計系統.md (doc_spec_0049) §I 互動物件回收與戰後摘要；戰法場景規格書.md (doc_spec_0039) B-3 火燒偷襲戰掠奪（PROG-2-1462）
/**
 * StageSalvage — 關卡級回收累計（純邏輯，不依賴 cc）
 *
 * 互動物件的石材／木材／補給／情報收益先寫進本場 Stage_Salvage，戰鬥結束一次結算，
 * 戰中不改帳號經濟（§I-2）。
 *
 * 火燒偷襲戰：我方佔領火攻格 = 掠奪成功，規格「糧草 +200~500」記為補給（Stage_Salvage 沒有糧草類，補給即糧草）。
 * 規格另列的武器材料 +10、教官經驗 +20 依使用者裁定（2026-10-29）加為 Stage_Salvage 新類別（PROG-2-1509）。
 */
import type { SalvageTotals } from '../../core/systems/StrategistHud';

export const FIRE_RAID_PLUNDER_SUPPLY_MIN = 200;
export const FIRE_RAID_PLUNDER_SUPPLY_MAX = 500;
export const FIRE_RAID_PLUNDER_WEAPON_MATERIAL = 10;
export const FIRE_RAID_PLUNDER_INSTRUCTOR_EXP = 20;
/** 火攻場景開局鋪的火格標記（BattleTacticBehavior.applyFireAttackTerrain） */
export const FIRE_RAID_TILE_NOTE = 'scene-gambit:fire-attack';

/** 峽谷落石擊破掉落（戰法場景規格書 SCENE_CANYON_ROCK，PROG-2-1583 暫定）：石材或木材 100~300 */
export const ROCK_BREAK_MATERIAL_MIN = 100;
export const ROCK_BREAK_MATERIAL_MAX = 300;
/** 規格「隨機防具材料 +5」：背包尚無防具材料，暫記入武器材料 */
export const ROCK_BREAK_ARMOR_MATERIAL = 5;
/** 規格「武將經驗 +50」：結算尚無武將經驗欄位，暫記入教官經驗 */
export const ROCK_BREAK_GENERAL_EXP = 50;
export const ROCK_SLIDE_TILE_NOTE = 'scene-gambit:rock-slide';

export function emptyStageSalvage(): SalvageTotals {
    return { stone: 0, wood: 0, supply: 0, intel: 0, weaponMaterial: 0, instructorExp: 0 };
}

export function addStageSalvage(total: SalvageTotals, gain: Partial<SalvageTotals>): void {
    total.stone += gain.stone ?? 0;
    total.wood += gain.wood ?? 0;
    total.supply += gain.supply ?? 0;
    total.intel += gain.intel ?? 0;
    total.weaponMaterial += gain.weaponMaterial ?? 0;
    total.instructorExp += gain.instructorExp ?? 0;
}

/** 掠奪一格火攻格的全部收益：補給擲骰＋固定武器材料與教官經驗 */
export function rollFirePlunderGain(random: () => number): Partial<SalvageTotals> {
    return {
        supply: rollFirePlunderSupply(random),
        weaponMaterial: FIRE_RAID_PLUNDER_WEAPON_MATERIAL,
        instructorExp: FIRE_RAID_PLUNDER_INSTRUCTOR_EXP,
    };
}

/** 擊破一塊落石的掉落：石材／木材二選一 100~300，加防具材料（暫記武器材料）與武將經驗（暫記教官經驗） */
export function rollRockBreakGain(random: () => number): Partial<SalvageTotals> {
    const span = ROCK_BREAK_MATERIAL_MAX - ROCK_BREAK_MATERIAL_MIN + 1;
    const amount = ROCK_BREAK_MATERIAL_MIN + Math.min(span - 1, Math.floor(random() * span));
    const material = random() < 0.5 ? { stone: amount } : { wood: amount };
    return {
        ...material,
        weaponMaterial: ROCK_BREAK_ARMOR_MATERIAL,
        instructorExp: ROCK_BREAK_GENERAL_EXP,
    };
}

/** 掠奪一格火攻格的補給：200~500 均勻整數 */
export function rollFirePlunderSupply(random: () => number): number {
    const span = FIRE_RAID_PLUNDER_SUPPLY_MAX - FIRE_RAID_PLUNDER_SUPPLY_MIN + 1;
    return FIRE_RAID_PLUNDER_SUPPLY_MIN + Math.min(span - 1, Math.floor(random() * span));
}
