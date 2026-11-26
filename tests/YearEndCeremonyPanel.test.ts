import { TestSuite } from './TestRunner';
import { YearEndRankingService } from '../assets/scripts/core/systems/YearEndRankingService';

export function createYearEndCeremonyPanelSuite(): TestSuite {
    const suite = new TestSuite('YearEndCeremonyPanel');

    suite.test('年末頒獎典禮可產出 4 位名門名單、前 3 名獎勵與驚喜獎', () => {
        const res = YearEndRankingService.evaluateYearEndRanking(1, [
            { id: 'player', name: '主公', score: 1200, isPlayer: true, tags: ['dark_horse'] },
        ]);
        if (res.standings.length !== 4 || !res.surpriseAward) {
            throw new Error('典禮輸入資料異常');
        }
    });

    return suite;
}
