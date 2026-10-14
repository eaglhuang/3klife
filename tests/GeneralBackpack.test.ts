import { assert, TestSuite } from './TestRunner';
import {
    createBackpack,
    normalizeBackpack,
    placeInBackpackSlot,
    unlockBackpackSlot,
} from '../assets/scripts/core/systems/GeneralBackpack';

export function createGeneralBackpackSuite(): TestSuite {
    const suite = new TestSuite('GeneralBackpack (BAG-01 武將背包六欄)');

    suite.test('新背包只解鎖三個基礎欄', () => {
        assert.equals('WEAPON,ARMOR,ACCESSORY', createBackpack().unlocked.join(','));
    });

    suite.test('進階欄未解鎖時放入被拒絕（slot-locked）', () => {
        const result = placeInBackpackSlot(createBackpack(), 'MOUNT', { uid: 'h1', kind: 'MOUNT' });
        assert.isFalse(result.ok);
        assert.equals('slot-locked', result.reason!);
    });

    suite.test('解鎖後同類型可放入', () => {
        const unlocked = unlockBackpackSlot(createBackpack(), 'MOUNT');
        const result = placeInBackpackSlot(unlocked, 'MOUNT', { uid: 'h1', kind: 'MOUNT' });
        assert.isTrue(result.ok);
        assert.equals('h1', result.backpack.equipped.MOUNT!);
    });

    suite.test('錯類型被拒絕（wrong-type），例如武器放進防具欄', () => {
        const result = placeInBackpackSlot(createBackpack(), 'ARMOR', { uid: 'w1', kind: 'WEAPON' });
        assert.isFalse(result.ok);
        assert.equals('wrong-type', result.reason!);
    });

    suite.test('欄位已佔用時被拒絕（occupied）', () => {
        const first = placeInBackpackSlot(createBackpack(), 'WEAPON', { uid: 'w1', kind: 'WEAPON' });
        const second = placeInBackpackSlot(first.backpack, 'WEAPON', { uid: 'w2', kind: 'WEAPON' });
        assert.isFalse(second.ok);
        assert.equals('occupied', second.reason!);
        assert.equals('w1', second.backpack.equipped.WEAPON!);
    });

    suite.test('放入與解鎖都不改輸入背包', () => {
        const source = createBackpack();
        placeInBackpackSlot(source, 'WEAPON', { uid: 'w1', kind: 'WEAPON' });
        unlockBackpackSlot(source, 'TOME');
        assert.equals(3, source.unlocked.length);
        assert.equals(undefined, source.equipped.WEAPON);
    });

    suite.test('讀檔校正：丟掉未知欄位，基礎欄一定補齊', () => {
        const normalized = normalizeBackpack({ unlocked: ['MOUNT', 'FLY'], equipped: { MOUNT: 'h1', WEAPON: 'w1' } });
        assert.equals('WEAPON,ARMOR,ACCESSORY,MOUNT', normalized.unlocked.join(','));
        assert.equals('h1', normalized.equipped.MOUNT!);
        assert.equals('w1', normalized.equipped.WEAPON!);
    });

    suite.test('讀檔校正：未解鎖欄位上的裝備被丟棄', () => {
        const normalized = normalizeBackpack({ unlocked: [], equipped: { TREASURE: 't1' } });
        assert.equals(undefined, normalized.equipped.TREASURE);
    });

    return suite;
}
