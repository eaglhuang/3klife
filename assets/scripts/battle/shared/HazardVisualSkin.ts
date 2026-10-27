// @spec-source → 戰場格子系統 §C 美術視覺與特效（同一 Hazard 邏輯可表現為毒沼或火海）（PROG-2-1307，GRD-05）
/**
 * HazardVisualSkin — Hazard 格子的 Decal 與 VFX 換皮掛點（純邏輯，不依賴 cc）
 *
 * 格子的傷害規則由 tileStateRuleOf 決定，與換皮無關；這裡只回答「這個 Hazard 格該掛哪一套 Decal 與 VFX」。
 * 同一個 hazard 格換成 fire 或 poison 皮，回合結束扣血的判定完全相同。
 * 資源檔命名為暫定，待美術定稿。
 *
 * Unity 對照：像同一個 Damage Zone 腳本，換一個 Material 與 ParticleSystem Prefab 就能變成毒沼或火海，
 * 腳本的 OnTriggerStay 不用改。
 */
import type { TileEffect } from '../models/BattleState';
import { tileStateKindOf } from './TileStateRules';

export const HAZARD_SKIN_IDS = ['fire', 'poison'] as const;
export type HazardSkinId = (typeof HAZARD_SKIN_IDS)[number];

export const HAZARD_VISUAL_ROOT = 'assets/fx/hazard/';

export interface HazardVisualPlan {
    skin: HazardSkinId;
    decalPath: string;
    vfxPath: string;
}

/** 依換皮 ID 組出 Decal 與 VFX 路徑；換皮 ID 為封閉列舉，不需另外驗證字串。 */
export function hazardVisualPlan(effect: TileEffect | null | undefined, skin: HazardSkinId): HazardVisualPlan | null {
    if (tileStateKindOf(effect) !== 'hazard') return null;
    return {
        skin,
        decalPath: `${HAZARD_VISUAL_ROOT}${skin}-decal.prefab`,
        vfxPath: `${HAZARD_VISUAL_ROOT}${skin}-vfx.prefab`,
    };
}
