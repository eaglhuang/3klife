// @spec-source → PROG-2-9159（玩家可見文字清理：內部 ID、TODO 佔位、血脈名、因子色系）
/**
 * PlayerFacingText — 把內部資料轉成「玩家看得到」的文字（純 TS，不依賴 cc）。
 *
 * 原則：內部 ID 一律經名稱表轉中文；查不到名稱就顯示通用佔位，不把 ID 或工程備註露給玩家。
 */

/** 查不到血脈名時的通用佔位 */
export const UNNAMED_BLOODLINE = '未定名血脈';
/** 查不到因子名時的通用佔位 */
export const UNNAMED_FACTOR = '未定名因子';
/** 查不到傭兵名時的通用佔位 */
export const UNNAMED_MERCENARY = '未定名傭兵';

/** 血脈 id 的國別／族系代號對照（BL_<國別>_<代號>…） */
const BLOODLINE_TOKEN_NAMES: Readonly<Record<string, string>> = {
    QUN: '群', SHU: '蜀', WEI: '魏', WU: '吳', HAN: '漢', YAN: '燕', LONG: '龍', HU: '虎', FENG: '鳳',
    FEIJIANG: '飛將', BAQUAN: '霸拳', QIN: '秦', CHU: '楚', ZHAO: '昭',
};

const bloodlineNames = new Map<string, string>();

/** 登記「血脈 id → 持有者姓名」；每個血脈 id 只記第一位，之後不覆寫。名冊載入後呼叫一次即可。 */
export function registerBloodlineNames(generals: ReadonlyArray<{ name?: string; bloodlineId?: string }>): void {
    for (const general of generals) {
        const id = general.bloodlineId;
        const name = general.name;
        if (!id || !name || bloodlineNames.has(id)) continue;
        bloodlineNames.set(id, name);
    }
}

/** 測試用：清掉登記的血脈名 */
export function clearBloodlineNames(): void {
    bloodlineNames.clear();
}

/** 看起來像內部 ID：純 ASCII，且含底線或連字號（BL_SHU_YAN、gene_destiny、merc-1794-ma-yun-lu） */
export function looksLikeInternalId(text: string | undefined | null): boolean {
    if (!text) return false;
    const trimmed = text.trim();
    return /^[A-Za-z0-9]+([_-][A-Za-z0-9]+)+$/.test(trimmed);
}

/** 工程備註用語：出現就代表這句是給開發者看的 */
const PLACEHOLDER_NOTE_PATTERNS: readonly RegExp[] = [/TODO/i, /仍待/, /待正式/, /待補/, /待校描/, /校描/, /佔位/, /暫定文案/];

/** 這段文字是不是開發用佔位／TODO 備註 */
export function isPlaceholderNote(text: string | undefined | null): boolean {
    if (!text) return false;
    return PLACEHOLDER_NOTE_PATTERNS.some((pattern) => pattern.test(text));
}

/** 玩家可見的說明文字：佔位備註與空字串回傳 fallback */
export function playerFacingNote(text: string | undefined | null, fallback = ''): string {
    if (!text || text.trim() === '' || isPlaceholderNote(text)) return fallback;
    return text;
}

/**
 * 血脈 id 的顯示名。
 * 中文名原樣回傳；英文代號先看每個族系代號是否都有中文，否則查登記的持有者姓名，都沒有就用通用佔位。
 */
export function bloodlineDisplayName(id: string | undefined | null, fallback: string = UNNAMED_BLOODLINE): string {
    if (!id || id.trim() === '') return fallback;
    if (!/[A-Za-z]/.test(id)) return id;
    const tokens = id.split(/[_-]+/).map((token) => token.trim().toUpperCase()).filter((token) => token !== '' && token !== 'BL');
    if (tokens.length === 0) return fallback;
    const meaningful = tokens.length > 1 ? tokens.slice(1) : tokens;
    const translated = meaningful.map((token) => BLOODLINE_TOKEN_NAMES[token]);
    if (translated.every((name) => typeof name === 'string')) {
        const joined = translated.join('');
        return joined.endsWith('血脈') ? joined : `${joined}血脈`;
    }
    const owner = bloodlineNames.get(id);
    return owner ? `${owner}血脈` : fallback;
}

/** 因子色系中文名 */
const GENE_COLOR_NAMES: Readonly<Record<string, string>> = {
    blue: '藍', pink: '粉', green: '綠', purple: '紫', white: '白', red: '紅', gold: '金', yellow: '黃', orange: '橙', black: '黑',
};

/** 因子色系顯示名（green → 綠）；已是中文原樣回傳，未知英文代號回傳空字串 */
export function geneColorName(color: string | undefined | null): string {
    if (!color) return '';
    const mapped = GENE_COLOR_NAMES[color.toLowerCase()];
    if (mapped) return mapped;
    return /[A-Za-z]/.test(color) ? '' : color;
}

/** 因子名稱：字典查得到用字典；查不到且 id 像內部代號就用佔位，本來就是中文則原樣 */
export function factorDisplayName(id: string | undefined | null, lookup?: (id: string) => string | null | undefined): string {
    if (!id) return UNNAMED_FACTOR;
    const named = lookup?.(id);
    if (named && named.trim() !== '' && !looksLikeInternalId(named)) return named;
    if (looksLikeInternalId(id) || /^[A-Za-z0-9_\-]+$/.test(id)) return UNNAMED_FACTOR;
    return id;
}

/** 結緣面板模式列：依實際擋下結緣的原因決定「仍具親傳資格」是否成立 */
export function bondingModeChipText(peaceLineage: boolean, blockReasons: readonly string[]): string {
    const capped: string[] = [];
    if (blockReasons.includes('father-breeding-cap')) capped.push('父方');
    if (blockReasons.includes('mother-breeding-cap')) capped.push('母方');
    if (capped.length > 0) {
        const who = capped.length === 2 ? '雙方' : capped[0];
        return `模式：${peaceLineage ? '和平血統線（保種）' : '一般結緣'} · ${who}已達一生親傳上限，無法再親傳`;
    }
    return peaceLineage
        ? '模式：和平血統線（保種）· 退役年齡仍可親傳，轉為教官後即失去資格'
        : '模式：一般結緣 · 雙方仍具親傳資格';
}
