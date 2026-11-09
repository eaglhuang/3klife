// @spec-source → 大廳系統.md §E-9 任務詳情彈窗與派遣流程（行動人物下拉選單、自薦者優先提示）；PROG-2-2112
/**
 * MissionGeneralOptions — 任務詳情「派遣武將」下拉的選項組成（純邏輯，不依賴 cc）
 *
 * 下拉只列玩家名冊中「可派遣」的武將（沿用可出戰規則：排除死亡、退役教官、未畢業子嗣、精力不足、培育中），
 * 不再列整本武將圖鑑（約 240 位，下拉內容高度過大）。自薦（毛遂自薦／自告奮勇）者排在最前，其餘維持名冊順序。
 *
 * 暫定（規格沒寫「可派遣」的明確條件，可逆）：
 * - 「可派遣」與可出戰同一份名單（GameSession.getDeployableGenerals），精力不足者暫不列。
 *
 * Unity 對照：像 Dropdown 的資料來源只綁玩家背包，不綁整個道具資料表。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import { formatGeneralDisplayName } from '../models/GeneralTitle';

export interface MissionGeneralOptionRow {
    id: string;
    label: string;
    volunteer: boolean;
}

/**
 * 把可派遣名冊轉成下拉選項：label 為「名稱・稱號」，自薦者排前（穩定排序）。
 * 同 id 只留第一筆；沒有可派遣武將時回傳空陣列（由彈窗顯示預設占位，不回頭列整本圖鑑）。
 */
export function buildMissionGeneralOptions(
    deployable: readonly GeneralConfig[],
    isVolunteer: (general: GeneralConfig) => boolean = () => false,
): MissionGeneralOptionRow[] {
    const seen = new Set<string>();
    const rows: MissionGeneralOptionRow[] = [];
    for (const general of deployable) {
        if (!general || seen.has(general.id)) continue;
        seen.add(general.id);
        rows.push({
            id: general.id,
            label: formatGeneralDisplayName(general.name, general.title),
            volunteer: isVolunteer(general),
        });
    }
    return [...rows.filter((row) => row.volunteer), ...rows.filter((row) => !row.volunteer)];
}
