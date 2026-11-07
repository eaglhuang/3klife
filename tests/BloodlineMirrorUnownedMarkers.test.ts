/**
 * BloodlineMirrorUnownedMarkers — 命鏡未持有角色三種標示與不劇透數值（血脈命鏡過場載入規格書 §8；BML-07；PROG-2-2067）
 *
 * 規格：未持有角色額外標示「未結識」「命格未開」「尚未得其英靈」，不直接劇透數值。
 * - 三個標示放在 UnownedLayer 內，跟鎖定層一起由 showLockBadge 切換。
 * - 未持有 state 的所有文案（含故事格）不出現數字。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';

const UI_SPEC_DIR = path.resolve(__dirname, '../assets/resources/ui-spec');
const MARKERS: Record<string, string> = {
    unownedMarkerMeet: '未結識',
    unownedMarkerFate: '命格未開',
    unownedMarkerSpirit: '尚未得其英靈',
};

interface LayoutNode {
    name: string;
    children?: LayoutNode[];
}

function readJson<T>(relative: string): T {
    return JSON.parse(fs.readFileSync(path.join(UI_SPEC_DIR, relative), 'utf8')) as T;
}

function findByPath(root: LayoutNode, bindPath: string): LayoutNode | null {
    let current: LayoutNode | null = root;
    for (const name of bindPath.split('/')) {
        current = current?.children?.find((child) => child.name === name) ?? null;
    }
    return current;
}

/** 內容來源 id 這類機器字串（如 bloodline-mirror-loading-tips-v1#unowned）不算顯示文案 */
const MACHINE_ID = /^[A-Za-z0-9-]+(#[A-Za-z0-9-]+)?$/;

/** 收集物件內所有顯示用字串值 */
function collectStrings(value: unknown, out: string[] = []): string[] {
    if (typeof value === 'string') { if (!MACHINE_ID.test(value)) out.push(value); }
    else if (value && typeof value === 'object') for (const v of Object.values(value)) collectStrings(v, out);
    return out;
}

export function createBloodlineMirrorUnownedMarkersSuite(): TestSuite {
    const suite = new TestSuite('BloodlineMirrorUnownedMarkers (命鏡未持有三種標示 BML-07 PROG-2-2067)');
    const layout = readJson<{ root: LayoutNode }>('layouts/bloodline-mirror-loading-main.json');
    const schema = readJson<{ fields: Record<string, { bindPath?: string }> }>('contracts/bloodline-mirror-state-content.schema.json');
    const states = readJson<{ states: Record<string, Record<string, unknown>> }>('content/bloodline-mirror-states-v1.json').states;

    suite.test('三個標示欄位都綁到 UnownedLayer 內的節點', () => {
        for (const field of Object.keys(MARKERS)) {
            const bindPath = schema.fields[field]?.bindPath ?? '';
            assert.isTrue(bindPath.startsWith('UnownedLayer/'), `${field} -> ${bindPath}`);
            assert.isTrue(!!findByPath(layout.root, bindPath), `${field} -> ${bindPath} 找不到節點`);
        }
    });

    suite.test('未持有 state 顯示三種標示，其餘 state 不帶標示', () => {
        for (const [id, state] of Object.entries(states)) {
            const unowned = state.tipProfile === 'unowned';
            for (const [field, text] of Object.entries(MARKERS)) {
                assert.equals(unowned ? text : undefined, state[field], `${id}.${field}`);
            }
        }
    });

    suite.test('未持有 state 的文案不出現數字（不劇透數值）', () => {
        for (const [id, state] of Object.entries(states)) {
            if (state.tipProfile !== 'unowned') continue;
            for (const text of collectStrings(state)) {
                assert.isTrue(!/[0-9０-９]/.test(text), `${id}: ${text}`);
            }
        }
    });

    return suite;
}
