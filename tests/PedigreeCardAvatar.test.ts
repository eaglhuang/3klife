import { TestSuite, assert } from './TestRunner';
import { ancestorAvatarId, TREE_CARD_AVATAR } from '../assets/scripts/core/systems/BloodlineTreeSlots';

export function createPedigreeCardAvatarSuite(): TestSuite {
    const suite = new TestSuite('PedigreeCardAvatar');

    suite.test('真實祖先用 uid 載頭像', () => {
        assert.equals('zhao-yun', ancestorAvatarId({ uid: 'zhao-yun', is_virtual: false }) ?? '');
        assert.equals('zhao-yun', ancestorAvatarId({ uid: 'zhao-yun' }) ?? '');
    });

    suite.test('虛擬祖先與佚名祖位沒有畫像', () => {
        assert.equals(null, ancestorAvatarId({ uid: 'zhao-yun-anc-01', is_virtual: true }));
        assert.equals(null, ancestorAvatarId(null));
        assert.equals(null, ancestorAvatarId(undefined));
    });

    suite.test('96 高的卡片放得下頭像與三行文字', () => {
        const cardHalf = 48;
        const lineHeight = 18;
        const { size, y, textOffsetY } = TREE_CARD_AVATAR;
        const textTop = textOffsetY + (lineHeight * 3) / 2;
        const textBottom = textOffsetY - (lineHeight * 3) / 2;
        assert.isTrue(y + size / 2 <= cardHalf);
        assert.isTrue(y - size / 2 >= textTop);
        assert.isTrue(textBottom >= -cardHalf);
    });

    return suite;
}
