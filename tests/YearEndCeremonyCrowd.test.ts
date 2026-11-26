import { TestSuite } from './TestRunner';
import crowdConfig from '../assets/resources/data/master/ceremony-crowd-lines.json';

export function createYearEndCeremonyCrowdSuite(): TestSuite {
    const suite = new TestSuite('YearEndCeremonyCrowd');

    suite.test('典禮觀禮武將至少 4 位且具熱鬧台詞鍵', () => {
        if (crowdConfig.crowdGenerals.length < 4) {
            throw new Error(`觀禮武將應至少 4 位，實際 ${crowdConfig.crowdGenerals.length}`);
        }
        if (crowdConfig.cheerKeys.length < 4) {
            throw new Error(`熱鬧台詞鍵應至少 4 句，實際 ${crowdConfig.cheerKeys.length}`);
        }
    });

    return suite;
}
