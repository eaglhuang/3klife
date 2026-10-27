// @spec-source → WBS v16.3 OPEN-13（英靈夢回開場教學戰的傳說英靈）；新手開場規格書 §2.1；PM 暫定（2026-10-27）
/**
 * TeachingSpiritProvisional — 教學戰使用的傳說英靈（PM 暫定，純邏輯，不依賴 cc）。
 *
 * - 規格只寫「傳說級英靈」，身分未定；暫定取 generals.json 中稀有度最高的武將（同級依 id 排序取第一位）。
 * - 基因取該武將未鎖定的因子；虎符上限仍由 TEACHING_STARTING_GENE_LIMIT 決定。
 * - 企劃定案後替換 assets/resources/data/teaching-spirit.provisional.json，並同步此處常數（測試會比對兩者）。
 *
 * Unity 對照：像開發期用的 placeholder ScriptableObject，正式資料出來後換檔即可。
 */
import type { TeachingSpiritInput } from './TeachingSpiritTalisman';

const PROVISIONAL_TEACHING_SPIRIT: Readonly<TeachingSpiritInput> = Object.freeze({
    spiritId: 'cao-cao',
    spiritName: '曹操',
    geneIds: ['gene_strategy', 'gene_command', 'gene_politics'],
});

/** 回傳一份新的教學英靈輸入，改動不會回寫到常數。 */
export function provisionalTeachingSpirit(): TeachingSpiritInput {
    return { ...PROVISIONAL_TEACHING_SPIRIT, geneIds: [...PROVISIONAL_TEACHING_SPIRIT.geneIds] };
}
