/**
 * BondingAvatarSlots.test.ts — 結緣畫面父母的預設剪影（PROG-2-1831）
 */
import * as fs from 'fs';
import { TestSuite, assert } from './TestRunner';
import { avatarPlaceholderPath } from '../assets/scripts/core/systems/GeneralArtPaths';

const readJson = (path: string): any => JSON.parse(fs.readFileSync(path, 'utf8'));

function slotOf(node: any, id: string): string | undefined {
    if (!node || typeof node !== 'object') return undefined;
    if (node.id === id) return node.skinSlot;
    for (const key of Object.keys(node)) {
        const found = slotOf(node[key], id);
        if (found) return found;
    }
    return undefined;
}

export function createBondingAvatarSlotsSuite(): TestSuite {
    const suite = new TestSuite('BondingAvatarSlots');

    suite.test('換圖完成前，父方是男版、母方是女版剪影', () => {
        const layout = readJson('assets/resources/ui-spec/layouts/bonding-setup-main.json');
        const { slots } = readJson('assets/resources/ui-spec/skins/bonding-setup-screen.skin.json');
        assert.equals(avatarPlaceholderPath('男'), slots[slotOf(layout, 'fatherAvatar') as string].path);
        assert.equals(avatarPlaceholderPath('女'), slots[slotOf(layout, 'motherAvatar') as string].path);
    });

    return suite;
}
