/**
 * MissionTextKeys — 任務內容資料（標題、簡介、事實標籤、事實內容、目標、提示）的語系鍵命名（PROG-2-10166）
 *
 * 任務定義 JSON 的 text／facts／branches 仍只寫繁中原文（內容資料的真相來源）；
 * 各語系譯文放 resources/i18n/{locale}.json，鍵由 defId＋欄位組出，投影層把鍵附在回傳結構上。
 * 鍵只含 [A-Za-z0-9_.-]。tools_node/gen-mission-text-i18n.js 用同一套命名產生語系表；
 * 單測會逐任務檢查四語鍵齊全，新增任務沒補譯文會被擋下。
 */
import type { MissionI18nRef } from './MissionTypes';

const base = (defId: string): string => `mission.def.${defId}`;

/** FNV-1a 32 位元（逐 UTF-16 碼元），輸出 8 碼十六進位；tools_node/gen-mission-text-i18n.js 用同一演算法 */
export function textHash(text: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

export const missionTextKey = {
    title: (defId: string): string => `${base(defId)}.title`,
    brief: (defId: string): string => `${base(defId)}.brief`,
    factLabel: (defId: string, factKey: string): string => `${base(defId)}.fact.${factKey}.label`,
    /**
     * 事實內容、目標、提示：鍵取原文雜湊，不含分支／變體／是否誤導資訊——
     * 鍵名會隨回傳結構送出，若帶分支 id 或 decoy 字樣就洩漏真相（同一句原文在不同分支共用同一把鍵）。
     */
    text: (defId: string, zh: string): string => `${base(defId)}.s.${textHash(zh)}`,
};

/** 內容資料的語系參照：fb 放繁中原文，查不到鍵時保底 */
export const contentRef = (key: string, fb: string): MissionI18nRef => ({ key, fb });
