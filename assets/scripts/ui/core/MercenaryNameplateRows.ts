// @spec-source → 傭兵系統（試用）文案表；WBS MERC-07；PROG-2-0476
/**
 * MercenaryNameplateRows — 傭兵名牌列的純資料（不依賴 cc）。
 *
 * 職責：把傭兵清單轉成名牌列（武將名、狀態文字），點名牌時由呼叫端帶 uid 進 MercenaryPanelController.selectUid()。
 * 名牌的實際位置與排版由 cc 端決定，本檔只產資料。
 *
 * Unity 對照：ViewModel。名牌 Prefab 只吃 nameText / statusText，點擊時送出 uid。
 */
import type { MercenaryState } from '../../core/systems/MercenaryBond';
import { MERC_PANEL_MAX_ROWS, MercenaryDisplayInfo } from './MercenaryPanelController';

export interface MercenaryNameplateRow {
    uid: string;
    nameText: string;
    statusText: string;
}

/** 狀態文字：試用中顯示剩餘天數，已結義與其他狀態各自一句。 */
export function mercenaryNameplateStatusText(state: Readonly<MercenaryState>): string {
    if (state.status === 'Trial') return `試用中・剩 ${state.daysLeft} 日`;
    if (state.status === 'Bonded') return '已結義';
    return '已離隊';
}

/** 名牌列（最多 MERC_PANEL_MAX_ROWS 格，與傭兵面板列數一致）。 */
export function buildMercenaryNameplateRows(
    mercenaries: readonly MercenaryState[],
    info: (state: Readonly<MercenaryState>) => MercenaryDisplayInfo,
): MercenaryNameplateRow[] {
    return mercenaries.slice(0, MERC_PANEL_MAX_ROWS).map(state => ({
        uid: state.uid,
        nameText: info(state).generalName,
        statusText: mercenaryNameplateStatusText(state),
    }));
}
