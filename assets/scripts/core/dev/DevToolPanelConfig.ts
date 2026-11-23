// @spec-source → 測試工具 2.0（使用者 2026-11-23 定案）；PROG-2-9855
/**
 * DevToolPanelConfig — 測試工具面板的資料定義與驗證（純 TS，不依賴 cc）。
 *
 * 面板的分頁、群組、按鈕、預設存檔步驟全部寫在 assets/resources/data/dev-tools/dev-tool-panels.json，
 * 新增項目只改 JSON，不改程式。文字走 i18n key（labelKey），JSON 內的 label 是 zh-TW 備援。
 *
 * 動作種類：
 * - api：呼叫共通 API 命令（debug.*、wallet.*…），args 原樣送出。
 * - preset：依序執行預設存檔的步驟（每步等背景工作跑完再下一步）。
 * - local：面板自己的動作（複製紀錄、匯出匯入存檔…），由 overlay 提供實作。
 * - todo：骨架按鈕，尚未接線，畫面上顯示為灰色。
 */
import { API_COMMANDS, DEBUG_GRANT_RESOURCES } from '../../shared/api/ApiCommands';

export type DevToolAction =
    | { readonly kind: 'api'; readonly cmd: string; readonly args: Readonly<Record<string, unknown>> }
    | { readonly kind: 'preset'; readonly preset: string }
    | { readonly kind: 'local'; readonly id: string }
    | { readonly kind: 'todo'; readonly note?: string };

export type DevToolItem =
    | { readonly type: 'button'; readonly labelKey: string; readonly label: string; readonly action: DevToolAction }
    /** 資源列：資源名＋每個 step 一顆 +N 鈕＋直接輸入框（輸入可為負數） */
    | { readonly type: 'resourceRow'; readonly resource: string; readonly labelKey: string; readonly label: string; readonly steps: readonly number[] }
    /** 輸入框＋套用鈕：數值送進 args[argKey] */
    | { readonly type: 'numberInput'; readonly labelKey: string; readonly label: string; readonly cmd: string; readonly argKey: string; readonly args: Readonly<Record<string, unknown>>; readonly defaultValue: number }
    /** 多行文字框＋套用鈕（存檔匯入）：文字送進 args[argKey] */
    | { readonly type: 'textBox'; readonly labelKey: string; readonly label: string; readonly cmd: string; readonly argKey: string; readonly args: Readonly<Record<string, unknown>> };

export interface DevToolGroup {
    readonly titleKey: string;
    readonly title: string;
    readonly items: readonly DevToolItem[];
}

export interface DevToolTab {
    readonly id: string;
    readonly labelKey: string;
    readonly label: string;
    /** 骨架分頁：按鈕清單已有、功能還沒全部接線 */
    readonly skeleton: boolean;
    readonly groups: readonly DevToolGroup[];
}

export interface DevToolPresetStep {
    readonly cmd: string;
    readonly args: Readonly<Record<string, unknown>>;
}

export interface DevToolPreset {
    readonly labelKey: string;
    readonly label: string;
    readonly steps: readonly DevToolPresetStep[];
}

export interface DevToolPanelConfig {
    readonly version: number;
    /** 建置旗標：正式版建置把它改成 false，面板就不會掛上（與全域 __3K_DEVTOOL_DISABLED__ 擇一或並用） */
    readonly buildEnabled: boolean;
    readonly tabs: readonly DevToolTab[];
    readonly presets: Readonly<Record<string, DevToolPreset>>;
}

export interface DevToolConfigParseResult {
    readonly config: DevToolPanelConfig;
    readonly errors: string[];
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

function knownCommand(cmd: unknown): cmd is string {
    return typeof cmd === 'string' && Object.prototype.hasOwnProperty.call(API_COMMANDS, cmd);
}

function parseAction(raw: unknown, where: string, errors: string[], presetIds: ReadonlySet<string>): DevToolAction | null {
    if (!isObj(raw)) { errors.push(`${where}: action 不是物件`); return null; }
    switch (raw.kind) {
        case 'api':
            if (!knownCommand(raw.cmd)) { errors.push(`${where}: 未知命令 ${String(raw.cmd)}`); return null; }
            return { kind: 'api', cmd: raw.cmd, args: isObj(raw.args) ? raw.args : {} };
        case 'preset':
            if (typeof raw.preset !== 'string' || !presetIds.has(raw.preset)) { errors.push(`${where}: 未知預設存檔 ${String(raw.preset)}`); return null; }
            return { kind: 'preset', preset: raw.preset };
        case 'local':
            if (typeof raw.id !== 'string' || raw.id.length === 0) { errors.push(`${where}: local 缺 id`); return null; }
            return { kind: 'local', id: raw.id };
        case 'todo':
            return { kind: 'todo', note: typeof raw.note === 'string' ? raw.note : undefined };
        default:
            errors.push(`${where}: 未知 action.kind ${String(raw.kind)}`);
            return null;
    }
}

function parseItem(raw: unknown, where: string, errors: string[], presetIds: ReadonlySet<string>): DevToolItem | null {
    if (!isObj(raw)) { errors.push(`${where}: 項目不是物件`); return null; }
    const labelKey = str(raw.labelKey);
    const label = str(raw.label, labelKey);
    if (raw.type === 'button') {
        const action = parseAction(raw.action, `${where}.action`, errors, presetIds);
        return action ? { type: 'button', labelKey, label, action } : null;
    }
    if (raw.type === 'resourceRow') {
        if (typeof raw.resource !== 'string' || !Object.prototype.hasOwnProperty.call(DEBUG_GRANT_RESOURCES, raw.resource)) {
            errors.push(`${where}: 未知資源 ${String(raw.resource)}`);
            return null;
        }
        const steps = Array.isArray(raw.steps) ? raw.steps.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0) : [];
        if (steps.length === 0) { errors.push(`${where}: steps 需至少一個正整數`); return null; }
        return { type: 'resourceRow', resource: raw.resource, labelKey, label, steps };
    }
    if (raw.type === 'numberInput' || raw.type === 'textBox') {
        if (!knownCommand(raw.cmd)) { errors.push(`${where}: 未知命令 ${String(raw.cmd)}`); return null; }
        if (typeof raw.argKey !== 'string' || raw.argKey.length === 0) { errors.push(`${where}: 缺 argKey`); return null; }
        const args = isObj(raw.args) ? raw.args : {};
        if (raw.type === 'textBox') return { type: 'textBox', labelKey, label, cmd: raw.cmd, argKey: raw.argKey, args };
        const defaultValue = typeof raw.defaultValue === 'number' ? raw.defaultValue : 1;
        return { type: 'numberInput', labelKey, label, cmd: raw.cmd, argKey: raw.argKey, args, defaultValue };
    }
    errors.push(`${where}: 未知 type ${String(raw.type)}`);
    return null;
}

/** 解析並驗證；壞掉的項目略過並記錯誤，不讓整個面板掛掉 */
export function parseDevToolPanelConfig(raw: unknown): DevToolConfigParseResult {
    const errors: string[] = [];
    const empty: DevToolPanelConfig = { version: 1, buildEnabled: false, tabs: [], presets: {} };
    if (!isObj(raw)) return { config: empty, errors: ['設定檔不是物件'] };

    const presets: Record<string, DevToolPreset> = {};
    const rawPresets = isObj(raw.presets) ? raw.presets : {};
    for (const id of Object.keys(rawPresets)) {
        const p = rawPresets[id];
        if (!isObj(p) || !Array.isArray(p.steps)) { errors.push(`presets.${id}: 格式錯誤`); continue; }
        const steps: DevToolPresetStep[] = [];
        p.steps.forEach((s, i) => {
            if (!isObj(s) || !knownCommand(s.cmd)) { errors.push(`presets.${id}.steps[${i}]: 未知命令`); return; }
            steps.push({ cmd: s.cmd, args: isObj(s.args) ? s.args : {} });
        });
        presets[id] = { labelKey: str(p.labelKey), label: str(p.label, id), steps };
    }
    const presetIds = new Set(Object.keys(presets));

    const tabs: DevToolTab[] = [];
    const seen = new Set<string>();
    (Array.isArray(raw.tabs) ? raw.tabs : []).forEach((t, ti) => {
        if (!isObj(t) || typeof t.id !== 'string' || t.id.length === 0) { errors.push(`tabs[${ti}]: 缺 id`); return; }
        if (seen.has(t.id)) { errors.push(`tabs[${ti}]: id 重複 ${t.id}`); return; }
        seen.add(t.id);
        const groups: DevToolGroup[] = [];
        (Array.isArray(t.groups) ? t.groups : []).forEach((g, gi) => {
            if (!isObj(g)) { errors.push(`tabs[${ti}].groups[${gi}]: 不是物件`); return; }
            const items: DevToolItem[] = [];
            (Array.isArray(g.items) ? g.items : []).forEach((it, ii) => {
                const item = parseItem(it, `tabs[${ti}].groups[${gi}].items[${ii}]`, errors, presetIds);
                if (item) items.push(item);
            });
            groups.push({ titleKey: str(g.titleKey), title: str(g.title), items });
        });
        tabs.push({ id: t.id, labelKey: str(t.labelKey), label: str(t.label, t.id), skeleton: t.skeleton === true, groups });
    });

    return {
        config: { version: typeof raw.version === 'number' ? raw.version : 1, buildEnabled: raw.buildEnabled !== false, tabs, presets },
        errors,
    };
}
