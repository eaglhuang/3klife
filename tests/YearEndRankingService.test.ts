import { TestSuite } from './TestRunner';
import { YearEndRankingService } from '../assets/scripts/core/systems/YearEndRankingService';

export function createYearEndRankingServiceSuite(): TestSuite {
    const suite = new TestSuite('YearEndRankingService');

    suite.test('NPC 補位至 5 人（4 位名門＋玩家）且分數落在年度基準 85% ~ 110%', () => {
        const res = YearEndRankingService.evaluateYearEndRanking(1, [
            { id: 'player', name: '主公', score: 1000, isPlayer: true },
        ]);
        if (res.standings.length !== 5) {
            throw new Error(`預期 5 人榜單，實際 ${res.standings.length}`);
        }
        const npcs = res.standings.filter((s) => s.isNpcFill);
        if (npcs.length !== 4) {
            throw new Error(`預期補位 4 名 NPC，實際 ${npcs.length}`);
        }
        if (npcs.some((n) => !n.nameKey || !n.nameKey.startsWith('npc.house.'))) {
            throw new Error('NPC 名門必須帶 npc.house.* 的 i18n key');
        }
        for (const npc of npcs) {
            const base = YearEndRankingService.getNpcBaseScore(1);
            if (npc.score < Math.round(base * 0.85) || npc.score > Math.round(base * 1.1)) {
                throw new Error(`NPC 分數 ${npc.score} 超出 85%~110% 範圍`);
            }
        }
    });

    suite.test('名次獎勵對齊規格：第1名 2000+150、第2名 1200+100、第3名 1000+80、第4~10名 500 銀兩', () => {
        const r1 = YearEndRankingService.getRankReward(1, 1);
        const r2 = YearEndRankingService.getRankReward(2, 1);
        const r3 = YearEndRankingService.getRankReward(3, 1);
        const r4 = YearEndRankingService.getRankReward(4, 1);
        if (r1.gold !== 2000 || r1.jade !== 150) throw new Error(`第 1 名獎勵錯誤: ${JSON.stringify(r1)}`);
        if (r2.gold !== 1200 || r2.jade !== 100) throw new Error(`第 2 名獎勵錯誤: ${JSON.stringify(r2)}`);
        if (r3.gold !== 1000 || r3.jade !== 80) throw new Error(`第 3 名獎勵錯誤: ${JSON.stringify(r3)}`);
        if (r4.gold !== 500 || r4.jade !== 0) throw new Error(`第 4 名獎勵錯誤: ${JSON.stringify(r4)}`);
    });

    suite.test('第 2~5 年冠軍曲線對齊規格：2300/160, 2600/170, 2900/180, 3200/190', () => {
        const expected: Array<[number, number, number]> = [
            [2, 2300, 160],
            [3, 2600, 170],
            [4, 2900, 180],
            [5, 3200, 190],
        ];
        for (const [year, gold, jade] of expected) {
            const r = YearEndRankingService.getRankReward(1, year);
            if (r.gold !== gold || r.jade !== jade) {
                throw new Error(`第 ${year} 年冠軍獎勵錯誤: ${JSON.stringify(r)}`);
            }
        }
    });

    suite.test('驚喜獎每年至多 1 個且對齊「年度黑馬獎」「最會撒嬌獎」500 銀兩', () => {
        const resDarkHorse = YearEndRankingService.evaluateYearEndRanking(2, [
            { id: 'player', name: '主公', score: 1200, isPlayer: true, tags: ['dark_horse', 'spoiled'] },
        ]);
        if (!resDarkHorse.surpriseAward || resDarkHorse.surpriseAward.title !== '年度黑馬獎' || resDarkHorse.surpriseAward.bonusGold !== 500) {
            throw new Error(`年度黑馬獎異常: ${JSON.stringify(resDarkHorse.surpriseAward)}`);
        }

        const resSpoiled = YearEndRankingService.evaluateYearEndRanking(2, [
            { id: 'player', name: '主公', score: 1200, isPlayer: true, tags: ['spoiled'] },
        ]);
        if (!resSpoiled.surpriseAward || resSpoiled.surpriseAward.title !== '最會撒嬌獎' || resSpoiled.surpriseAward.bonusGold !== 500) {
            throw new Error(`最會撒嬌獎異常: ${JSON.stringify(resSpoiled.surpriseAward)}`);
        }
    });

    return suite;
}
