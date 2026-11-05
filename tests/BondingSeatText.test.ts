import { TestSuite, assert } from './TestRunner';
import { bondingSeatText } from '../assets/scripts/core/systems/BloodlineTreeSlots';

export function createBondingSeatTextSuite(): TestSuite {
    const suite = new TestSuite('BondingSeatText');
    const person = { name: '趙伯', ep: 87.6 };

    suite.test('父母一行、祖輩兩行、曾祖只留姓名', () => {
        assert.equals('趙伯 EP 88', bondingSeatText(1, person));
        assert.equals('趙伯\nEP 88', bondingSeatText(2, person));
        assert.equals('趙伯\nEP 88', bondingSeatText(5, person));
        assert.equals('趙伯', bondingSeatText(6, person));
        assert.equals('趙氏長輩', bondingSeatText(6, { name: '冀州 趙氏長輩', ep: 50 }));
    });

    suite.test('缺的祖位標成佚名，不留空', () => {
        assert.equals('先祖佚名', bondingSeatText(0, null));
        assert.equals('先祖佚名', bondingSeatText(5, null));
        assert.equals('佚名', bondingSeatText(13, null));
    });

    return suite;
}
