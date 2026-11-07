/**
 * BloodlineTreeAvatarBudget — 血統樹頭像貼圖預算（BUI-07；PROG-2-2079）
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { countTreeAvatars, TREE_AVATAR_BUDGET, treeAvatarSource } from '../assets/scripts/core/systems/BloodlineTreeAvatarBudget';

const real = (uid: string) => ({ uid, is_virtual: false });

export function createBloodlineTreeAvatarBudgetSuite(): TestSuite {
    const suite = new TestSuite('BloodlineTreeAvatarBudget (血統樹頭像預算 BUI-07 PROG-2-2079)');

    suite.test('父母排掛真頭像，1、2 代用共用圖示，虛擬與空位不掛', () => {
        assert.equals('REAL', treeAvatarSource(3, real('liu-bei')));
        assert.equals('SHARED_ICON', treeAvatarSource(2, real('liu-hong')));
        assert.equals('SHARED_ICON', treeAvatarSource(1, real('liu-sheng')));
        assert.equals('NONE', treeAvatarSource(1, { uid: 'v1', is_virtual: true }));
        assert.equals('NONE', treeAvatarSource(3, null));
    });

    suite.test('滿 14 人的樹：真頭像不超過預算', () => {
        const cells = [
            ...[0, 1].map((i) => ({ row: 3, person: real(`p${i}`) })),
            ...[0, 1, 2, 3].map((i) => ({ row: 2, person: real(`g${i}`) })),
            ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ row: 1, person: real(`gg${i}`) })),
        ];
        const count = countTreeAvatars(cells);
        assert.equals(2, count.real);
        assert.isTrue(count.real <= TREE_AVATAR_BUDGET.realMax);
        assert.equals(12, count.sharedIcon);
        assert.equals(0, count.none);
    });

    suite.test('面板接線：依排決定頭像來源，共用圖示走載入器', () => {
        const panel = readFileSync(join(__dirname, '../assets/scripts/ui/panels/BloodlineTreePanel.ts'), 'utf8');
        assert.isTrue(panel.includes('treeAvatarSource(row, person)'));
        assert.isTrue(panel.includes('loadSharedAncestorIcon('));
        const loader = readFileSync(join(__dirname, '../assets/scripts/ui/core/GeneralAvatarLoader.ts'), 'utf8');
        assert.isTrue(loader.includes('export async function loadSharedAncestorIcon('));
    });

    return suite;
}
