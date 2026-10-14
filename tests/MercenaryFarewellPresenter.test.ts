import { assert, TestSuite } from './TestRunner';
import { buildFarewellLetter } from '../assets/scripts/core/systems/MercenaryFarewellPresenter';

export function createMercenaryFarewellPresenterSuite(): TestSuite {
    const suite = new TestSuite('MercenaryFarewellPresenter (MERC-05 告別信文字)');

    suite.test('試用期滿離隊：標題帶武將名，內文為試用期滿版本', () => {
        const letter = buildFarewellLetter('貂蟬', 'trial-expired');
        assert.equals('貂蟬 的告別信', letter.title);
        assert.isTrue(letter.body.includes('六日試用期滿'));
    });

    suite.test('欠薪離隊：內文為欠薪版本，與試用期滿不同', () => {
        const unpaid = buildFarewellLetter('貂蟬', 'upkeep-unpaid');
        const expired = buildFarewellLetter('貂蟬', 'trial-expired');
        assert.isTrue(unpaid.body.includes('欠薪'));
        assert.isFalse(unpaid.body === expired.body);
    });

    return suite;
}
