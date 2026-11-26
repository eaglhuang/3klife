/**
 * HallChildLines.test.ts — 孩童不進大廳、孩童講孩童台詞（PROG-2-10113）
 */
import { assert, TestSuite } from './TestRunner';
import { canWalkHall, HALL_MIN_AGE } from '../assets/scripts/core/systems/HallCharacterRoll';
import { isChildSpeaker, pickChildLine } from '../assets/scripts/core/systems/HallChildLines';

export function createHallChildLinesSuite(): TestSuite {
    const suite = new TestSuite('HallChildLines (孩童不進大廳、台詞走孩童版 PROG-2-10113)');

    suite.test('未滿 5 歲不進大廳；5 歲以上與年齡不明可以', () => {
        assert.isFalse(canWalkHall(0));
        assert.isFalse(canWalkHall(1));
        assert.isFalse(canWalkHall(HALL_MIN_AGE - 1));
        assert.isTrue(canWalkHall(HALL_MIN_AGE));
        assert.isTrue(canWalkHall(30));
        assert.isTrue(canWalkHall(undefined));
    });

    suite.test('未滿 16 歲算孩童發話者，年齡不明視為成年', () => {
        assert.isTrue(isChildSpeaker(1));
        assert.isTrue(isChildSpeaker(15));
        assert.isFalse(isChildSpeaker(16));
        assert.isFalse(isChildSpeaker(undefined));
    });

    suite.test('孩童台詞自稱「我」、不含成年自稱，同 seed 同句', () => {
        for (let seed = 0; seed < 12; seed++) {
            const line = pickChildLine(seed);
            assert.isTrue(line.includes('我'), line);
            assert.isFalse(/某|老夫|妾身|本姑娘/.test(line), line);
            assert.equals(line, pickChildLine(seed));
        }
    });

    return suite;
}
