/**
 * GearSlotPickerLayout.test.ts — 寶頁選取面板節點與流程 key 對齊（PROG-2-1066）
 *
 * 不開 Cocos：確認 GearSlotPickController.getFlowView 吐出的每個 key 都對得到
 * gear-slot-picker-main.json 的節點名稱；寶頁六格的 EquipSlot_<槽> 文字節點也都存在於裝備分頁版型。
 *
 * Unity 對照：EditMode Test 檢查 Presenter 的綁定名稱與 Prefab 的 child 名稱一致。
 */
import { assert, TestSuite } from './TestRunner';
import { GearSlotPickController } from '../assets/scripts/ui/core/GearSlotPickController';
import { EQUIP_SLOTS } from '../assets/scripts/core/systems/GeneralBackpack';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

/** 版型檔的根節點：screen 版型放在 root 下，fragment 版型則直接是根節點。 */
function nodeNames(relPath: string): Set<string> {
    const json = JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8')) as { root?: unknown };
    const names = new Set<string>();
    const walk = (node: { name?: string; children?: unknown[] }): void => {
        if (node.name) names.add(node.name);
        for (const child of node.children ?? []) walk(child as { name?: string; children?: unknown[] });
    };
    walk((json.root ?? json) as { name?: string; children?: unknown[] });
    return names;
}

export function createGearSlotPickerLayoutSuite(): TestSuite {
    const suite = new TestSuite('GearSlotPickerLayout (寶頁選取面板節點對齊 PROG-2-1066)');

    suite.test('選取面板流程的每個 text／active key 都有對應節點', () => {
        const controller = new GearSlotPickController({
            records: () => [],
            generalUid: () => 'general-1',
            equip: () => ({ ok: false, reason: 'NOT_FOUND' }),
            unequip: () => ({ ok: false, reason: 'NOT_FOUND' }),
            setLocked: () => false,
            decompose: () => ({ ok: false, reason: 'NOT_FOUND' }),
        });
        controller.open(EQUIP_SLOTS[0]);
        const view = controller.getFlowView();
        const names = nodeNames('assets/resources/ui-spec/layouts/gear-slot-picker-main.json');
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives)]) {
            assert.isTrue(names.has(key), `版型缺少節點 ${key}`);
        }
    });

    suite.test('選取面板列數與控制器的 GEAR_PICK_ROW_SLOTS 一致（每列有 label 與 button）', () => {
        const names = nodeNames('assets/resources/ui-spec/layouts/gear-slot-picker-main.json');
        const rowSlots = 8;
        for (let i = 0; i < rowSlots; i++) {
            assert.isTrue(names.has(`btnGearPick${i}`));
            assert.isTrue(names.has(`gearPickLabel${i}`));
        }
        assert.isFalse(names.has(`btnGearPick${rowSlots}`));
    });

    suite.test('寶頁六格的 EquipSlot_<槽> 文字節點都存在於裝備分頁版型', () => {
        const names = nodeNames('assets/resources/ui-spec/fragments/layouts/character-ds3-equip-content.json');
        for (const slot of EQUIP_SLOTS) {
            assert.isTrue(names.has(`EquipSlot_${slot}`), `缺少 EquipSlot_${slot}`);
        }
    });

    return suite;
}
