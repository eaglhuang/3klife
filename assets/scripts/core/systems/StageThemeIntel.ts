// @spec-source → 戰場四大主題關卡機制與戰術物資結算規格書.md（doc_spec_0353）§1、§2.1；WBS LVL-10；PROG-2-2131
/**
 * StageThemeIntel — 四主題關卡在偵查面板標示的主要互動物件與可回收收益（純邏輯，不依賴 cc）
 * 只給物件種類與物資種類，不含座標與數量，不違反偵查防火牆。
 */
import { interactiveObjectLabel, type InteractiveObjectKind } from './StrategistHud';

export interface StageThemeIntel {
    keyObject: InteractiveObjectKind;
    salvage: readonly string[];
}

export const STAGE_THEME_INTEL: Readonly<Record<string, StageThemeIntel>> = {
    Canyon: { keyObject: 'Rockfall_Node', salvage: ['石材', '情報'] },
    Floodgate: { keyObject: 'Floodgate', salvage: ['木材', '情報'] },
    Night_Raid: { keyObject: 'Camp_Target', salvage: ['木材', '糧草', '情報'] },
    Ambush: { keyObject: 'Trap_Cluster', salvage: ['情報'] },
};

/** 偵查面板核心機制的補充文字；不是四主題的關卡回傳空陣列 */
export function stageThemeMechanicNotes(themeId: string | undefined): string[] {
    const intel = themeId ? STAGE_THEME_INTEL[themeId] : undefined;
    if (!intel) return [];
    return [`關鍵物件：${interactiveObjectLabel(intel.keyObject)}`, `可回收：${intel.salvage.join('／')}`];
}
