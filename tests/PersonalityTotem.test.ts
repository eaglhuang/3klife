/**
 * PersonalityTotem — 性格圖騰圓徽（HUM-02；PROG-2-2009）
 */
import { assert, TestSuite } from './TestRunner';
import { personalityTotemOf, personalityTotemTooltip } from '../assets/scripts/core/systems/PersonalityTotem';

export function createPersonalityTotemSuite(): TestSuite {
    const suite = new TestSuite('PersonalityTotem (性格圓徽 HUM-02 PROG-2-2009)');

    suite.test('四型圓徽；未知回 null', () => {
        assert.equals('義', personalityTotemOf('Loyal')!.glyph);
        assert.equals('#D9453B', personalityTotemOf('Brave')!.color);
        assert.equals('羽扇／奏摺', personalityTotemOf('Wise')!.motif);
        assert.equals('貪玩型', personalityTotemOf('Playful')!.name);
        assert.equals(null, personalityTotemOf('Evil'));
        assert.equals(null, personalityTotemOf(undefined));
        assert.equals(null, personalityTotemOf('toString'));
    });

    suite.test('提示文字', () => {
        assert.equals('義氣型：重情重義，人脈廣布', personalityTotemTooltip('Loyal'));
        assert.equals('', personalityTotemTooltip(null));
    });

    return suite;
}
