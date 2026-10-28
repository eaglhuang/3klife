// @spec-source → 武將人物介面規格書.md §9 兵頁：Aptitude（兵種／地形／天氣適性、虎符槽、虎符摘要）；PROG-2-1449（TSK-05）
/**
 * AptitudeView — 人物頁「兵」頁的適性列（純邏輯，不依賴 cc）。
 *
 * - 兵種適性：只列武將資料裡有的兵種，順序沿用 AI_TROOP_CODES；等級非 S～D 的列顯示「—」。
 * - 效率倍率沿用 BATTLE_POWER_CONSTANTS.APTITUDE_EFFICIENCY，不另抄一份。
 * - 地形、天氣適性：武將資料目前沒有欄位，全部顯示「—」，等資料來源定案再接。
 * - 虎符槽：目前只給一行文字，預設「未裝備」；虎符資料接線另卡。
 * - 兵種與地形、天氣的中文名為暫定（規格只列了類別，未定字串 key）。
 *
 * Unity 對照：像 Aptitude 頁的 Presenter，把武將資料整理成各列的顯示欄位，資料缺就留空格。
 */
import { AI_TROOP_CODES } from './AiProfiles';
import { BATTLE_POWER_CONSTANTS, type AptitudeGrade } from './BattlePowerRating';

/** 暫定中文名，規格「騎 / 步 / 弓 / 機械 / 水軍」為準，盾與矛沿用兵種名 */
export const TROOP_APTITUDE_LABEL_ZH: Readonly<Record<string, string>> = {
    CAVALRY: '騎兵',
    INFANTRY: '步兵',
    SHIELD: '盾兵',
    PIKE: '長槍兵',
    ARCHER: '弓兵',
    SIEGE: '機械',
    NAVY: '水軍',
};

/** 規格 §9 列出的地形與天氣（暫定字串） */
export const TERRAIN_APTITUDE_LABELS_ZH: readonly string[] = ['平原', '山地', '水域', '林地', '沙漠', '城池'];
export const WEATHER_APTITUDE_LABELS_ZH: readonly string[] = ['晴', '雨', '霧', '風', '夜', '雷'];

/** 沒有資料時的占位文字 */
export const APTITUDE_EMPTY_TEXT = '—';
export const TALLY_UNEQUIPPED_TEXT = '未裝備';

export interface AptitudeRow {
    label: string;
    grade: AptitudeGrade | null;
    efficiencyText: string;
}

export interface AptitudeView {
    troopRows: AptitudeRow[];
    terrainRows: AptitudeRow[];
    weatherRows: AptitudeRow[];
    tallyLine: string;
}

const GRADES: readonly AptitudeGrade[] = ['S', 'A', 'B', 'C', 'D'];

/** 等級字串轉成合法等級；非 S～D 回傳 null */
export function aptitudeGradeOf(raw: unknown): AptitudeGrade | null {
    return typeof raw === 'string' && (GRADES as readonly string[]).includes(raw) ? raw as AptitudeGrade : null;
}

/** 等級的效率文字，例如 S → ×1.20；沒有等級為「—」 */
export function aptitudeEfficiencyText(grade: AptitudeGrade | null): string {
    if (!grade) return APTITUDE_EMPTY_TEXT;
    return `×${BATTLE_POWER_CONSTANTS.APTITUDE_EFFICIENCY[grade].toFixed(2)}`;
}

function emptyRow(label: string): AptitudeRow {
    return { label, grade: null, efficiencyText: APTITUDE_EMPTY_TEXT };
}

/**
 * 組出兵頁的顯示資料。troopAptitude 的 key 是大寫兵種代碼（如 CAVALRY），value 是等級字串。
 */
export function buildAptitudeView(troopAptitude: Readonly<Record<string, unknown>> | undefined, tallyLine = TALLY_UNEQUIPPED_TEXT): AptitudeView {
    const troopRows: AptitudeRow[] = [];
    for (const code of AI_TROOP_CODES) {
        if (!troopAptitude || !Object.prototype.hasOwnProperty.call(troopAptitude, code)) continue;
        const grade = aptitudeGradeOf(troopAptitude[code]);
        troopRows.push({
            label: TROOP_APTITUDE_LABEL_ZH[code] ?? code,
            grade,
            efficiencyText: aptitudeEfficiencyText(grade),
        });
    }
    return {
        troopRows,
        terrainRows: TERRAIN_APTITUDE_LABELS_ZH.map(emptyRow),
        weatherRows: WEATHER_APTITUDE_LABELS_ZH.map(emptyRow),
        tallyLine,
    };
}
