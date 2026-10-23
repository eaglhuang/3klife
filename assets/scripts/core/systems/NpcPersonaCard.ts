// @spec-source → NPC人性化規格書 I-1（Persona Card）、F-3（性格漂移限制）；PROG-2-0461
/**
 * NpcPersonaCard — 武將 Persona Card 的資料結構與結構驗證（純邏輯，不依賴 cc）。
 *
 * - 欄位名稱沿用規格 I-1 的 Snake_Case，與 lobby-hub.json 的風格一致。
 * - validateNpcPersonaCards 不改輸入，回傳所有問題的路徑與原因，不在第一個錯誤就停。
 * - 台詞內容目前是暫定佔位，正式文案待企劃與 NPC 人性化規格確認後替換；結構本身與內容無關。
 *
 * Unity 對照：像一個 ScriptableObject 的 OnValidate，把壞掉的角色人格資料擋在進場景之前。
 */

/** 台詞字數上限（規格 F-3 的 maxLineChars 預設值，暫定）。 */
export const NPC_LINE_MAX_CHARS = 60;

export interface NpcRelationshipAnchor {
    Target_General_ID: string;
    Relation: string;
    Tone: string;
}

export interface NpcPersonaCard {
    General_ID: string;
    Display_Name: string;
    Core_Traits: string[];
    Voice_Style: string;
    Required_Tone_Tags: string[];
    Forbidden_Claims: string[];
    Relationship_Anchors: NpcRelationshipAnchor[];
    Safe_Fallback_Line: string;
    Golden_Lines: string[];
    /** 選填：內容狀態，佔位資料標示 PLACEHOLDER。 */
    Content_Status?: string;
}

export interface NpcPersonaIssue {
    path: string;
    message: string;
}

export type NpcPersonaValidation =
    | { ok: true; cards: Record<string, NpcPersonaCard>; issues: [] }
    | { ok: false; cards: null; issues: NpcPersonaIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function checkCard(issues: NpcPersonaIssue[], path: string, key: string, value: unknown): NpcPersonaCard | null {
    if (!isRecord(value)) {
        issues.push({ path, message: '必須為物件' });
        return null;
    }
    const before = issues.length;
    if (value.General_ID !== key) issues.push({ path: `${path}.General_ID`, message: '必須與表內的 key 相同' });
    if (!isNonEmptyString(value.Display_Name)) issues.push({ path: `${path}.Display_Name`, message: '必須為非空字串' });
    if (!isStringArray(value.Core_Traits) || value.Core_Traits.length === 0) {
        issues.push({ path: `${path}.Core_Traits`, message: '必須為至少一個字串的陣列' });
    }
    if (!isNonEmptyString(value.Voice_Style)) issues.push({ path: `${path}.Voice_Style`, message: '必須為非空字串' });
    if (!isStringArray(value.Required_Tone_Tags)) issues.push({ path: `${path}.Required_Tone_Tags`, message: '必須為字串陣列' });
    if (!isStringArray(value.Forbidden_Claims)) issues.push({ path: `${path}.Forbidden_Claims`, message: '必須為字串陣列' });
    if (!Array.isArray(value.Relationship_Anchors)) {
        issues.push({ path: `${path}.Relationship_Anchors`, message: '必須為陣列' });
    } else {
        value.Relationship_Anchors.forEach((anchor, index) => {
            const anchorPath = `${path}.Relationship_Anchors[${index}]`;
            if (!isRecord(anchor)) {
                issues.push({ path: anchorPath, message: '必須為物件' });
                return;
            }
            for (const field of ['Target_General_ID', 'Relation', 'Tone'] as const) {
                if (!isNonEmptyString(anchor[field])) issues.push({ path: `${anchorPath}.${field}`, message: '必須為非空字串' });
            }
        });
    }
    if (!isNonEmptyString(value.Safe_Fallback_Line)) {
        issues.push({ path: `${path}.Safe_Fallback_Line`, message: '必須為非空字串' });
    } else if (Array.from(value.Safe_Fallback_Line).length > NPC_LINE_MAX_CHARS) {
        issues.push({ path: `${path}.Safe_Fallback_Line`, message: `不可超過 ${NPC_LINE_MAX_CHARS} 字` });
    }
    if (!isStringArray(value.Golden_Lines)) issues.push({ path: `${path}.Golden_Lines`, message: '必須為字串陣列' });
    if (value.Content_Status !== undefined && typeof value.Content_Status !== 'string') {
        issues.push({ path: `${path}.Content_Status`, message: '必須為字串' });
    }
    if (issues.length !== before) return null;
    return value as unknown as NpcPersonaCard;
}

/** 驗證 Npc_Persona_Cards 表；通過時回傳新物件（不改輸入）。 */
export function validateNpcPersonaCards(raw: unknown): NpcPersonaValidation {
    const issues: NpcPersonaIssue[] = [];
    if (!isRecord(raw) || !isRecord(raw.Npc_Persona_Cards)) {
        return { ok: false, cards: null, issues: [{ path: 'Npc_Persona_Cards', message: '缺少 Npc_Persona_Cards 物件' }] };
    }
    const table = raw.Npc_Persona_Cards;
    const cards: Record<string, NpcPersonaCard> = {};
    for (const key of Object.keys(table)) {
        const card = checkCard(issues, `Npc_Persona_Cards.${key}`, key, table[key]);
        if (card) cards[key] = card;
    }
    if (Object.keys(table).length === 0) issues.push({ path: 'Npc_Persona_Cards', message: '至少需要一張 Persona Card' });
    return issues.length === 0 ? { ok: true, cards, issues: [] } : { ok: false, cards: null, issues };
}
