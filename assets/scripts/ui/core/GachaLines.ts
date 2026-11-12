// @spec-source → 見 docs/cross-reference-index.md
// PROG-2-2244：轉蛋抽到武將時講一句台詞；台詞放資料檔，所有池的結果畫面共用
import { services } from '../../core/managers/ServiceLoader';

export const GACHA_LINES_PATH = 'data/general-gacha-lines';

export type GachaLineTable = Record<string, string>;
type JsonLoader = (path: string) => Promise<unknown>;

let _table: Promise<GachaLineTable> | null = null;

/** 從原始 JSON 取出 { 武將 id: 台詞 }；格式不對就回空表 */
export function parseGachaLines(raw: unknown): GachaLineTable {
    const lines = (raw as { lines?: unknown } | null)?.lines;
    if (!lines || typeof lines !== 'object') return {};
    const table: GachaLineTable = {};
    for (const [id, text] of Object.entries(lines as Record<string, unknown>)) {
        if (typeof text === 'string' && text.trim()) table[id] = text.trim();
    }
    return table;
}

/** 讀台詞表（只讀一次）；讀不到就回空表，畫面退回原本描述 */
export function loadGachaLines(loader?: JsonLoader): Promise<GachaLineTable> {
    if (!_table) {
        const load = loader ?? ((path: string) => services().resource.loadJson(path));
        _table = load(GACHA_LINES_PATH).then(parseGachaLines).catch(() => ({}));
    }
    return _table;
}

/** 測試用：清掉快取 */
export function resetGachaLinesCache(): void { _table = null; }

/** 武將台詞加上引號；沒有台詞回 null */
export function formatGachaLine(table: GachaLineTable, generalId: string): string | null {
    const text = table[generalId];
    return text ? `「${text}」` : null;
}
