/**
 * BloodlineMirrorUnownedLayer — 命鏡未持有鎖定徽章／未持有標籤／確認 CTA 接線（命鏡過場規格補遺 v3 元件 13~15；BMV3-07；PROG-2-2065）
 *
 * 規格元件：mirror-lock-badge、mirror-unowned-state-tag、mirror-confirm-cta。
 * - 鎖定徽章與未持有標籤放在 UnownedLayer 內，由 showLockBadge 一起切換。
 * - 確認 CTA 是 PrimaryActionButton，由 showPrimaryAction 切換、primaryActionLabel 給文字。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';

const UI_SPEC_DIR = path.resolve(__dirname, '../assets/resources/ui-spec');

interface LayoutNode {
    name: string;
    skinSlot?: string;
    styleSlot?: string;
    children?: LayoutNode[];
}

function readJson<T>(relative: string): T {
    return JSON.parse(fs.readFileSync(path.join(UI_SPEC_DIR, relative), 'utf8')) as T;
}

/** 依 bindPath（以 / 分隔的節點名，從根節點的子節點開始）找節點 */
function findByPath(root: LayoutNode, bindPath: string): LayoutNode | null {
    let current: LayoutNode | null = root;
    for (const name of bindPath.split('/')) {
        current = current?.children?.find((child) => child.name === name) ?? null;
    }
    return current;
}

export function createBloodlineMirrorUnownedLayerSuite(): TestSuite {
    const suite = new TestSuite('BloodlineMirrorUnownedLayer (命鏡未持有徽章與 CTA BMV3-07 PROG-2-2065)');
    const layout = readJson<{ root: LayoutNode }>('layouts/bloodline-mirror-loading-main.json');
    const skin = readJson<{ slots: Record<string, unknown> }>('skins/bloodline-mirror-loading-default.json');
    const schema = readJson<{ fields: Record<string, { bindPath?: string }> }>('contracts/bloodline-mirror-state-content.schema.json');
    const states = readJson<{ states: Record<string, Record<string, unknown>> }>('content/bloodline-mirror-states-v1.json').states;

    suite.test('三個元件的 bindPath 都指到 layout 內的節點，skin 槽位都存在', () => {
        for (const field of ['showLockBadge', 'unownedTagLabel', 'showPrimaryAction', 'primaryActionLabel']) {
            const bindPath = schema.fields[field]?.bindPath ?? '';
            assert.isTrue(!!findByPath(layout.root, bindPath), `${field} -> ${bindPath} 找不到節點`);
        }
        const layer = findByPath(layout.root, 'UnownedLayer')!;
        assert.equals('UnownedVeil,LockBadge,UnownedStateTag', (layer.children ?? []).map((c) => c.name).join(','));
        for (const child of layer.children ?? []) {
            const slot = child.skinSlot ?? child.styleSlot;
            assert.isTrue(!!slot && slot in skin.slots, `${child.name} 的槽位 ${String(slot)} 不在 skin`);
        }
    });

    suite.test('未持有 state 顯示鎖定層與標籤文字；其餘 state 不顯示鎖定層', () => {
        for (const [id, state] of Object.entries(states)) {
            const unowned = state.tipProfile === 'unowned';
            assert.equals(unowned, state.showLockBadge, id);
            if (unowned) assert.equals('未持有', state.unownedTagLabel, id);
        }
    });

    suite.test('確認 CTA：顯示的 state 都有按鈕文字', () => {
        for (const [id, state] of Object.entries(states)) {
            if (state.showPrimaryAction === true) assert.isTrue(String(state.primaryActionLabel ?? '').length > 0, id);
        }
    });

    return suite;
}
