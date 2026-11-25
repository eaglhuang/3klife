/**
 * MissionLoader — 把資料檔（JSON）組成服務用的資料包（引擎中立：不 import 'cc'，檔案讀取由呼叫端注入）
 *
 * 資料包 = 數值表（mission-balance.json，結構與 MissionBalance 相同）＋ 主題登錄 ＋ 任務板規則 ＋ 全部任務定義。
 * 任何一份定義解析失敗都會回報全部問題，不會悄悄丟掉，也不會讓壞資料進流程。
 */
import { DEFAULT_MISSION_BALANCE, MISSION_DIFFICULTIES, MissionBalance, MissionDifficulty } from './MissionBalance';
import { parseMissionDefinition } from './MissionDefinitionParser';
import type { MissionBoardsConfig, MissionCatalogEntry } from './MissionBoardRules';
import type { MissionDefinition } from './MissionTypes';

export interface MissionDataIssue { file: string; message: string }

export interface MissionThemeInfo { id: string; wall: string; label: string }

export interface MissionDataBundle {
    balance: MissionBalance;
    defs: Map<string, MissionDefinition>;
    catalog: MissionCatalogEntry[];
    themes: Map<string, MissionThemeInfo>;
    boards: MissionBoardsConfig;
    /** 舊模板代號 → 新定義 id（舊存檔遷移用） */
    legacyIndex: Map<string, string>;
}

export interface MissionRawData {
    balance: unknown;
    themes: unknown;
    boards: unknown;
    index: unknown;
    /** 以 index.defs[].path 為鍵的定義原始資料 */
    defsByPath: Record<string, unknown>;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** 把資料檔的數字欄位疊到預設值上：只接受預設值裡已有的鍵，型別不符的欄位回報問題並沿用預設 */
function mergeKnown<T>(base: T, raw: unknown, path: string, issues: MissionDataIssue[]): T {
    if (Array.isArray(base)) {
        if (!Array.isArray(raw) || raw.some(v => typeof v !== typeof (base as unknown[])[0])) {
            if (raw !== undefined) issues.push({ file: 'mission-balance.json', message: `${path} 型別不符，沿用預設` });
            return base;
        }
        return raw.slice() as unknown as T;
    }
    if (isObj(base)) {
        const out: Obj = {};
        const src = isObj(raw) ? raw : {};
        for (const k of Object.keys(base)) out[k] = mergeKnown((base as Obj)[k], src[k], `${path}.${k}`, issues);
        return out as T;
    }
    if (typeof base === 'number') {
        if (typeof raw === 'number' && Number.isFinite(raw)) return raw as unknown as T;
        if (raw !== undefined) issues.push({ file: 'mission-balance.json', message: `${path} 必須是數字，沿用預設` });
        return base;
    }
    if (typeof base === 'string') return (typeof raw === 'string' ? raw : base) as T;
    return base;
}

/** 解析數值表；缺欄位沿用預設並回報問題 */
export function parseMissionBalance(raw: unknown): { balance: MissionBalance; issues: MissionDataIssue[] } {
    const issues: MissionDataIssue[] = [];
    if (!isObj(raw)) return { balance: DEFAULT_MISSION_BALANCE, issues: [{ file: 'mission-balance.json', message: '必須是物件' }] };
    const balance = mergeKnown(DEFAULT_MISSION_BALANCE, raw, 'balance', issues);
    return { balance, issues };
}

function parseBoards(raw: unknown, issues: MissionDataIssue[]): MissionBoardsConfig | null {
    if (!isObj(raw) || !isObj(raw.walls) || !isObj(raw.difficultyWeights) || !isObj(raw.themeWeights) || !isObj(raw.rankRelativeWeights)) {
        issues.push({ file: 'mission-boards.json', message: '缺少 walls／difficultyWeights／themeWeights／rankRelativeWeights' });
        return null;
    }
    const walls: MissionBoardsConfig['walls'] = {};
    for (const [wall, w] of Object.entries(raw.walls)) {
        if (!isObj(w) || typeof w.targetCount !== 'number' || !Array.isArray(w.themes)) { issues.push({ file: 'mission-boards.json', message: `牆 ${wall} 格式不符` }); continue; }
        walls[wall] = { targetCount: w.targetCount, themes: w.themes.filter((t): t is string => typeof t === 'string') };
    }
    const overrides = Array.isArray(raw.overrides) ? raw.overrides.filter(isObj).map(o => ({
        defId: String(o.defId), weight: typeof o.weight === 'number' ? o.weight : undefined,
        chainOnly: o.chainOnly === true,
        requiresFlags: Array.isArray(o.requiresFlags) ? o.requiresFlags.filter((f): f is string => typeof f === 'string') : undefined,
        minFame: typeof o.minFame === 'number' ? o.minFame : undefined,
    })) : [];
    return {
        walls,
        rankRelativeWeights: raw.rankRelativeWeights as MissionBoardsConfig['rankRelativeWeights'],
        difficultyWeights: raw.difficultyWeights as Record<MissionDifficulty, number>,
        themeWeights: raw.themeWeights as Record<string, number>,
        yearOneCommerceGuaranteed: parseYearOneGuarantee(raw.yearOneCommerceGuaranteed),
        overrides,
    };
}

/** 第一年商業保底（缺省＝不啟用）；欄位逐一取出，否則解析時會被丟掉、保底靜默失效 */
function parseYearOneGuarantee(raw: unknown): MissionBoardsConfig['yearOneCommerceGuaranteed'] {
    if (!isObj(raw)) return undefined;
    return {
        maxSeason: typeof raw.maxSeason === 'number' ? raw.maxSeason : undefined,
        targetWall: typeof raw.targetWall === 'string' ? raw.targetWall : undefined,
        minCount: typeof raw.minCount === 'number' ? raw.minCount : undefined,
        commerceDefIds: Array.isArray(raw.commerceDefIds) ? raw.commerceDefIds.filter((x): x is string => typeof x === 'string') : undefined,
    };
}

/** 組資料包；回傳全部問題（ok=false 時不可使用） */
export function buildMissionDataBundle(raw: MissionRawData): { ok: true; bundle: MissionDataBundle; issues: MissionDataIssue[] } | { ok: false; issues: MissionDataIssue[] } {
    const issues: MissionDataIssue[] = [];
    const { balance, issues: balanceIssues } = parseMissionBalance(raw.balance);
    issues.push(...balanceIssues);

    const themes = new Map<string, MissionThemeInfo>();
    const themeList = isObj(raw.themes) && Array.isArray(raw.themes.themes) ? raw.themes.themes : [];
    for (const t of themeList) {
        if (isObj(t) && typeof t.id === 'string' && typeof t.wall === 'string') themes.set(t.id, { id: t.id, wall: t.wall, label: typeof t.label === 'string' ? t.label : t.id });
    }
    if (themes.size === 0) issues.push({ file: 'mission-themes.json', message: '沒有任何主題' });

    const boards = parseBoards(raw.boards, issues);

    const defs = new Map<string, MissionDefinition>();
    const catalog: MissionCatalogEntry[] = [];
    const legacyIndex = new Map<string, string>();
    const entries = isObj(raw.index) && Array.isArray(raw.index.defs) ? raw.index.defs : [];
    if (entries.length === 0) issues.push({ file: 'mission-index.json', message: '沒有任何任務定義' });
    for (const e of entries) {
        if (!isObj(e) || typeof e.path !== 'string' || typeof e.id !== 'string') { issues.push({ file: 'mission-index.json', message: '索引項目缺 id／path' }); continue; }
        const parsed = parseMissionDefinition(raw.defsByPath[e.path]);
        if (!parsed.ok) {
            for (const i of parsed.issues) issues.push({ file: e.path, message: `${i.path}：${i.message}` });
            continue;
        }
        const def = parsed.def;
        if (def.id !== e.id) { issues.push({ file: e.path, message: `定義 id ${def.id} 與索引 ${e.id} 不符` }); continue; }
        if (!(MISSION_DIFFICULTIES as readonly string[]).includes(def.difficulty)) continue;
        const theme = themes.get(def.theme);
        if (!theme) { issues.push({ file: e.path, message: `主題 ${def.theme} 未登錄` }); continue; }
        defs.set(def.id, def);
        catalog.push({ id: def.id, theme: def.theme, difficulty: def.difficulty, wall: theme.wall });
        if (def.legacyTemplateId) legacyIndex.set(def.legacyTemplateId, def.id);
    }
    if (issues.some(i => i.file !== 'mission-balance.json') || !boards) return { ok: false, issues };
    return { ok: true, bundle: { balance, defs, catalog, themes, boards, legacyIndex }, issues };
}

/**
 * 以注入的讀檔函式載入全部資料（路徑相對 resources/data，不含副檔名）。
 * Cocos 端傳入 resource.loadJson；測試端傳入 fs 讀檔。
 */
export async function loadMissionDataBundle(loadJson: (path: string) => Promise<unknown>) {
    const [balance, themes, boards, index] = await Promise.all([
        loadJson('data/mission-balance'), loadJson('data/mission-themes'), loadJson('data/mission-boards'), loadJson('data/mission-index'),
    ]);
    const entries = isObj(index) && Array.isArray(index.defs) ? index.defs : [];
    const paths = entries.filter(isObj).map(e => String(e.path));
    const loaded = await Promise.all(paths.map(p => loadJson(`data/${p.replace(/\.json$/, '')}`).catch(() => null)));
    const defsByPath: Record<string, unknown> = {};
    paths.forEach((p, i) => { defsByPath[p] = loaded[i]; });
    return buildMissionDataBundle({ balance, themes, boards, index, defsByPath });
}
