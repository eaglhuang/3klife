/**
 * CharacterDs3TacticsRows.test.ts — 技分頁依武將產生戰法列（PROG-2-1690）
 */
import { assert, TestSuite } from './TestRunner';
import { buildDs3TacticRows } from '../assets/scripts/ui/components/character-ds3/CharacterDs3TacticsChild';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

export function createCharacterDs3TacticsRowsSuite(): TestSuite {
    const suite = new TestSuite('CharacterDs3TacticsRows (技分頁戰法列)');

    suite.test('依武將戰法產生已習得與未啟發列', () => {
        const rows = buildDs3TacticRows({
            learnedTactics: ['龍膽旋風', '孤軍救主', '百鳥朝鳳'],
            inspiredTactics: ['七進七出'],
            lockedTactics: ['🔒 龍魂覺醒'],
        } as unknown as GeneralConfig);
        assert.equals('龍膽旋風,孤軍救主,百鳥朝鳳', rows.learned.map((r) => r.name).join(','));
        assert.equals('龍', rows.learned[0].glyph);
        assert.equals('七進七出|未啟發,龍魂覺醒|🔒 待解鎖', rows.locked.map((r) => `${r.name}|${r.hint}`).join(','));
    });

    suite.test('超過槽位截斷、空資料回傳空列', () => {
        const rows = buildDs3TacticRows({ learnedTactics: ['甲', '乙', '丙', '丁', '戊'], inspiredTactics: ['一', '二', '三'] } as unknown as GeneralConfig);
        assert.equals(4, rows.learned.length);
        assert.equals(2, rows.locked.length);
        const empty = buildDs3TacticRows(null);
        assert.equals(0, empty.learned.length + empty.locked.length);
    });

    return suite;
}
