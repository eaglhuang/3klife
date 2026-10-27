// @spec-source → 正式版劇本文案.md §5 紅顏趕路正式版、§6 商業化提示正式版（0.99／29.99／倒數）；WBS COPY-04；PROG-2-0450
/**
 * RedFaceCopy — 紅顏趕路與商業化提示的文案表（純邏輯，不依賴 cc）。
 *
 * - 四段文案（travel、price099、price2999、countdown）由配置表 red-face-copy.json 讀取，不寫死在程式或 Prefab 裡。
 * - 每段是一個或多個段落，依序顯示；空白段落與缺段視為無效配置，整份拒收，不補預設字。
 * - 文案內容與彈窗一致；改字只改配置表，不改程式。
 *
 * Unity 對照：像一個 ScriptableObject 文案表，Prefab 只綁定欄位名，內容從資料來。
 */

export const RED_FACE_COPY_SEGMENTS = ['travel', 'price099', 'price2999', 'countdown'] as const;

export type RedFaceCopySegment = (typeof RED_FACE_COPY_SEGMENTS)[number];

export type RedFaceCopyParseResult =
    | { ok: true; table: Readonly<Record<RedFaceCopySegment, readonly string[]>> }
    | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 解析配置表；缺段、段落不是字串陣列、或有空白段落都回傳 ok:false 並說明原因。 */
export function parseRedFaceCopy(json: unknown): RedFaceCopyParseResult {
    if (!isRecord(json) || !isRecord(json.segments)) {
        return { ok: false, reason: '缺少 segments 欄位' };
    }
    const segments = json.segments;
    const table: Partial<Record<RedFaceCopySegment, readonly string[]>> = {};
    for (const key of RED_FACE_COPY_SEGMENTS) {
        const entry = segments[key];
        if (!isRecord(entry) || !Array.isArray(entry.lines)) {
            return { ok: false, reason: `段落 ${key} 缺少 lines 陣列` };
        }
        const lines = entry.lines;
        if (lines.length === 0) {
            return { ok: false, reason: `段落 ${key} 沒有任何文字` };
        }
        for (const line of lines) {
            if (typeof line !== 'string' || line.trim().length === 0) {
                return { ok: false, reason: `段落 ${key} 含有空白或非文字的項目` };
            }
        }
        table[key] = (lines as string[]).slice();
    }
    return { ok: true, table: table as Record<RedFaceCopySegment, readonly string[]> };
}

/** 取得某段的段落文字；回傳新陣列，避免外部改到表內資料。 */
export function redFaceCopyLines(table: Readonly<Record<RedFaceCopySegment, readonly string[]>>, segment: RedFaceCopySegment): string[] {
    return [...table[segment]];
}
