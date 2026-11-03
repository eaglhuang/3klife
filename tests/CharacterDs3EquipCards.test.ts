/**
 * CharacterDs3EquipCards.test.ts — 寶分頁六張裝備卡依格位資料產生（PROG-2-1694）
 */
import { assert, TestSuite } from './TestRunner';
import { buildDs3EquipCards } from '../assets/scripts/ui/components/character-ds3/EquipBindPathPolicy';
import type { GearSlotView } from '../assets/scripts/core/systems/GearPageSlots';

export function createCharacterDs3EquipCardsSuite(): TestSuite {
    const suite = new TestSuite('CharacterDs3EquipCards (寶分頁裝備卡)');

    suite.test('已裝備顯示裝備名，空格與未解鎖各自標示', () => {
        const cards = buildDs3EquipCards([
            { slot: 'WEAPON', row: 0, col: 0, state: 'EQUIPPED', equippedUid: 'u1', equippedName: '青釭劍' },
            { slot: 'ARMOR', row: 0, col: 1, state: 'EMPTY' },
            { slot: 'MOUNT', row: 1, col: 0, state: 'LOCKED' },
        ] as unknown as GearSlotView[]);
        assert.equals('武|青釭劍,防|空,名|未解鎖', cards.map((c) => `${c.glyph}|${c.name}`).join(','));
    });

    suite.test('缺資料回傳空陣列，超過六格截斷', () => {
        assert.equals(0, buildDs3EquipCards(null).length);
        const many = Array.from({ length: 8 }, () => ({ slot: 'WEAPON', row: 0, col: 0, state: 'EMPTY' }));
        assert.equals(6, buildDs3EquipCards(many as unknown as GearSlotView[]).length);
    });

    return suite;
}
