import { TestSuite } from './TestRunner';
import { YearEndRankingService } from '../assets/scripts/core/systems/YearEndRankingService';

export function createYearEndRankingServiceSuite(): TestSuite {
    const suite = new TestSuite('YearEndRankingService');

    suite.test('NPC 補位至 4 人且分數落在基準 85% ~ 110%', () => {
        const res = YearEndRankingService.evaluateYearEndRanking(1, [
            { id: 'player', name: '主公', score: 1000, isPlayer: true },
        ]);
        if (res.standings.length !== 4) {
            throw new Error(`預期 4 人榜單，實際 ${res.standings.length}`);
        }
        const npcs = res.standings.filter((s) => s.isNpcFill);
        if (npcs.length !== 3) {
            throw new Error(`預期補位 3 名 NPC，實際 ${npcs.length}`);
        }
        for (const npc of npcs) {
            if (npc.score < 850 || npc.score > 1100) {
                throw new Error(`NPC 分數 ${npc.score} 超出 85%~110% 範圍`);
            }
        }
    });

    suite.test('名次獎勵符合第 2 名 1200+100 玉璧、第 3 名 1000+80 玉璧', () => {
        const r2 = YearEndRankingService.getRankReward(2);
        const r3 = YearEndRankingService.getRankReward(3);
        if (r2.gold !== 1200 || r2.jade !== 100) {
            throw new Error(`第 2 名獎勵錯誤: ${JSON.stringify(r2)}`);
        }
        if (r3.gold !== 1000 || r3.jade !== 80) {
            throw new Error(`第 3 名獎勵錯誤: ${JSON.stringify(r3)}`);
        }
    });

    suite.test('驚喜獎每年至多 1 個且正確發放', () => {
        const res = YearEndRankingService.evaluateYearEndRanking(2, [
            { id: 'player', name: '主公', score: 1200, isPlayer: true, tags: ['dark_horse', 'diligent'] },
        ]);
        if (!res.surpriseAward || res.surpriseAward.id !== 'surprise_dark_horse') {
            throw new Error(`預期發放單一驚喜獎，實際 ${JSON.stringify(res.surpriseAward)}`);
        }
    });

    suite.test('第 2~5 年曲線倍率與落榜吐槽／明年提示正確', () => {
        const res = YearEndRankingService.evaluateYearEndRanking(2, [
            { id: 'player', name: '主公', score: 500, isPlayer: true },
            { id: 'npc_a', name: '曹操', score: 2000, isPlayer: false },
            { id: 'npc_b', name: '劉備', score: 1800, isPlayer: false },
            { id: 'npc_c', name: '孫權', score: 1600, isPlayer: false },
        ]);
        if (res.yearCurveMultiplier !== 1.25) {
            throw new Error(`第 2 年倍率應為 1.25，實際 ${res.yearCurveMultiplier}`);
        }
        if (res.playerRank !== 4 || !res.roastMessage || !res.nextYearHint.includes('1.55x')) {
            throw new Error(`落榜吐槽或明年提示異常: ${JSON.stringify(res)}`);
        }
    });

    return suite;
}
