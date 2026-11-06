// @spec-source → AI武將強度系統 §E-3 AI Profile、§E-6 模板示例、§I AIGeneralTemplate（AIS-04，PROG-2-1926）
/**
 * AIGeneralTemplate — AI 武將模板資料型別與驗證（純邏輯，不依賴 cc）。
 *
 * 資料在 assets/resources/data/ai-general-templates.json；數值由 General_ID 讀武將表，不重複存。
 * 驗證只檢查資料自洽：Profile 合法、武將與戰法 id 已登錄、難度修正為正數、Template_ID 不重複。
 *
 * 暫定：專屬兵種尚無正式 Troop_ID，先存規格名稱（Exclusive_Troop_Names）；ChapterAIConfig 章節池另卡。
 * Unity 對照：像一份 ScriptableObject 清單，載入時先做 OnValidate 式檢查。
 */

export const AI_PROFILE_IDS = ['AGGRESSIVE', 'BALANCED', 'DEFENSIVE', 'STRATEGIC', 'CAVALRY_RUSH', 'ELITE_FEW', 'SWARM'] as const;
export type AIProfileId = typeof AI_PROFILE_IDS[number];

export interface AIGeneralTemplate {
    Template_ID: string;
    Name: string;
    General_ID: string;
    Profile_ID: AIProfileId;
    Exclusive_Tactics: string[];
    Exclusive_Troop_Names: string[];
    Custom_Difficulty_Mod: number;
    Dialogue: { Appear?: string; Duel_Accept?: string; Duel_Refuse?: string; Defeat?: string };
}

/** 回傳錯誤訊息清單；空陣列代表通過。 */
export function validateAIGeneralTemplates(
    templates: readonly AIGeneralTemplate[], knownGeneralIds: ReadonlySet<string>, knownTacticIds: ReadonlySet<string>,
): string[] {
    const errors: string[] = [];
    const seen = new Set<string>();
    for (const t of templates) {
        const at = t.Template_ID || '(無 Template_ID)';
        if (!t.Template_ID) errors.push(`${at}：缺 Template_ID`);
        else if (seen.has(t.Template_ID)) errors.push(`${at}：Template_ID 重複`);
        seen.add(t.Template_ID);
        if (!(AI_PROFILE_IDS as readonly string[]).includes(t.Profile_ID)) errors.push(`${at}：未知 Profile_ID ${t.Profile_ID}`);
        if (!knownGeneralIds.has(t.General_ID)) errors.push(`${at}：武將 ${t.General_ID} 不在武將表`);
        for (const tac of t.Exclusive_Tactics ?? []) {
            if (!knownTacticIds.has(tac)) errors.push(`${at}：戰法 ${tac} 未登錄`);
        }
        if (!(typeof t.Custom_Difficulty_Mod === 'number' && t.Custom_Difficulty_Mod > 0)) errors.push(`${at}：Custom_Difficulty_Mod 須為正數`);
    }
    return errors;
}

export function findAIGeneralTemplate(templates: readonly AIGeneralTemplate[], templateId: string): AIGeneralTemplate | null {
    return templates.find((t) => t.Template_ID === templateId) ?? null;
}
