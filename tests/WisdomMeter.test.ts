import { TestSuite, assert } from './TestRunner';
import { advanceWisdomMeter } from '../assets/scripts/battle/shared/WisdomMeter';

export function createWisdomMeterSuite(): TestSuite {
    const suite = new TestSuite('WisdomMeter (軍師智謀能量 SCN-10)');

    suite.test('每回合累積 INT × 0.5', () => {
        const step = advanceWisdomMeter(0, 60);
        assert.equals(30, step.meter);
        assert.isFalse(step.triggered);
    });

    suite.test('達到 100 觸發一次並歸零', () => {
        const step = advanceWisdomMeter(80, 40);
        assert.isTrue(step.triggered);
        assert.equals(0, step.meter);
    });

    suite.test('INT 為 0 時能量不增加', () => {
        const step = advanceWisdomMeter(50, 0);
        assert.equals(50, step.meter);
        assert.isFalse(step.triggered);
    });

    return suite;
}
