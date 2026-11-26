import { TestSuite, assert } from './TestRunner';
import { FriendshipService } from '../assets/scripts/core/services/FriendshipService';
import { AnnualRankingCongratulation, CongratulationDialogues } from '../assets/scripts/core/systems/annual_ranking/AnnualRankingCongratulation';
import { AnnualRankingHistoryViewer, CeremonyArchiveYearDto } from '../assets/scripts/core/systems/annual_ranking/AnnualRankingHistoryViewer';
import type { BoardRankResult } from '../assets/scripts/core/systems/annual_ranking/AnnualRankingTypes';

const MOCK_DIALOGUES: CongratulationDialogues = {
    categories: {
        fierce: {
            desc: '豪放',
            templates: ['豪爽回話：明年某定再下一城！']
        },
        scholar: {
            desc: '儒雅',
            templates: ['儒雅回話：足下過譽，瑜深感榮幸。']
        },
        commander: {
            desc: '嚴謹',
            templates: ['嚴謹回話：軍令在身，恪守本職而已。']
        },
        cunning: {
            desc: '詼諧',
            templates: ['詼諧回話：被你發現我偷拿大獎了？']
        },
        default: {
            desc: '通用',
            templates: ['通用回話：多謝賀喜！']
        }
    }
};

export function createAnnualRankingHistorySuite(): TestSuite {
    const suite = new TestSuite('AnnualRankingHistory (PROG-2-9601 PR3：祝賀互動與歷年史冊)');

    suite.test('AI 武將祝賀正常增加友誼 5 點並回傳性格台詞', () => {
        FriendshipService.resetInstance();
        const controller = new AnnualRankingCongratulation(MOCK_DIALOGUES, 5);

        const res = controller.congratulate(1, 'general_zhang_fei', 'fierce', ['general_zhang_fei']);
        assert.isTrue(res.success, '祝賀應成功');
        assert.equals(res.newFriendship, 5, '友誼應增加為 5');
        assert.equals(res.friendshipDelta, 5, '增量為 5');
        assert.equals(res.barkText, '豪爽回話：明年某定再下一城！', '應匹配豪爽台詞');
    });

    suite.test('同一年度對同一武將重複祝賀應被拒絕（每屆每位限 1 次）', () => {
        FriendshipService.resetInstance();
        const controller = new AnnualRankingCongratulation(MOCK_DIALOGUES, 5);

        const res1 = controller.congratulate(1, 'general_zhou_yu', 'scholar');
        assert.isTrue(res1.success);

        const res2 = controller.congratulate(1, 'general_zhou_yu', 'scholar');
        assert.isFalse(res2.success, '同年度第 2 次應失敗');
        assert.equals(res2.reason, 'ALREADY_CONGRATULATED');

        // 次年應可再次祝賀
        const res3 = controller.congratulate(2, 'general_zhou_yu', 'scholar');
        assert.isTrue(res3.success, '次年祝賀應成功');
        assert.equals(res3.newFriendship, 10, '跨年累加至 10');
    });

    suite.test('非入圍/非獲獎名單武將祝賀檢驗', () => {
        const controller = new AnnualRankingCongratulation(MOCK_DIALOGUES, 5);
        const res = controller.congratulate(1, 'unranked_villager', 'default', ['general_guan_yu', 'general_zhang_fei']);
        assert.isFalse(res.success, '未入圍應失敗');
        assert.equals(res.reason, 'NOT_ELIGIBLE');
    });

    suite.test('祝賀紀錄快照導出與還原', () => {
        const controller = new AnnualRankingCongratulation(MOCK_DIALOGUES, 5);
        controller.congratulate(1, 'gen_a', 'fierce');
        controller.congratulate(2, 'gen_b', 'scholar');

        const snapshot = controller.exportSnapshot();
        assert.isTrue(snapshot[1]?.includes('gen_a'));
        assert.isTrue(snapshot[2]?.includes('gen_b'));

        const newCtrl = new AnnualRankingCongratulation(MOCK_DIALOGUES, 5);
        newCtrl.loadSnapshot(snapshot);
        assert.isTrue(newCtrl.hasCongratulated(1, 'gen_a'));
        assert.isTrue(newCtrl.hasCongratulated(2, 'gen_b'));
        assert.isFalse(newCtrl.hasCongratulated(1, 'gen_b'));
    });

    suite.test('歷年風雲史冊存檔歸檔與多年度查詢', () => {
        const viewer = new AnnualRankingHistoryViewer();

        const year1Archive: CeremonyArchiveYearDto = {
            year: 1,
            ceremonyPhotoBackdrop: {
                year: 1,
                layoutPattern: 'TRAPEZOID_TWO_LAYER',
                hosts: ['npc_shi_xiaojing', 'sima_hui'],
                champions: { kills: 'general_zhao_yun' },
                frontRowGenerals: ['general_zhao_yun'],
                backRowGenerals: [],
                createdAtTick: 1000
            },
            results: {
                kills: {
                    boardId: 'kills',
                    year: 1,
                    quarter: 4,
                    isYearEndFinal: true,
                    candidates: [
                        { generalId: 'general_zhao_yun', score: 3200, rank: 1, trend: 'NEW', evidence: { summary: '', highlightKey: '', highlightValue: 0 } },
                        { generalId: 'general_guan_yu', score: 2800, rank: 2, trend: 'NEW', evidence: { summary: '', highlightKey: '', highlightValue: 0 } }
                    ]
                }
            },
            hosts: ['npc_shi_xiaojing', 'sima_hui']
        };

        const year2Archive: CeremonyArchiveYearDto = {
            year: 2,
            ceremonyPhotoBackdrop: {
                year: 2,
                layoutPattern: 'TRAPEZOID_TWO_LAYER',
                hosts: ['diao_chan', 'general_sun_ce'],
                champions: { kills: 'general_guan_yu' },
                frontRowGenerals: ['general_guan_yu'],
                backRowGenerals: [],
                createdAtTick: 2000
            },
            results: {
                kills: {
                    boardId: 'kills',
                    year: 2,
                    quarter: 4,
                    isYearEndFinal: true,
                    candidates: [
                        { generalId: 'general_guan_yu', score: 3400, rank: 1, trend: 'UP', evidence: { summary: '', highlightKey: '', highlightValue: 0 } },
                        { generalId: 'general_zhao_yun', score: 2900, rank: 3, trend: 'DOWN', evidence: { summary: '', highlightKey: '', highlightValue: 0 } }
                    ]
                }
            },
            hosts: ['diao_chan', 'general_sun_ce']
        };

        viewer.archiveCeremony(year1Archive);
        viewer.archiveCeremony(year2Archive);

        const years = viewer.getAvailableYears();
        assert.equals(years.length, 2);
        assert.equals(years[0], 2, '新年度應排在前方');
        assert.equals(years[1], 1);

        const rec1 = viewer.getYearRecord(1);
        assert.isTrue(rec1 !== null);
        assert.equals(rec1?.hosts[0], 'npc_shi_xiaojing');
    });

    suite.test('武將生涯名人堂統計（生涯奪冠次數與入圍統計）', () => {
        const viewer = new AnnualRankingHistoryViewer();
        
        // 註冊第 1 年與第 2 年資料
        viewer.archiveCeremony({
            year: 1,
            ceremonyPhotoBackdrop: {} as any,
            hosts: ['a', 'b'],
            results: {
                kills: {
                    boardId: 'kills', year: 1, quarter: 4, isYearEndFinal: true,
                    candidates: [
                        { generalId: 'general_zhao_yun', score: 3000, rank: 1, trend: 'NEW', evidence: {} as any }
                    ]
                }
            }
        });

        viewer.archiveCeremony({
            year: 2,
            ceremonyPhotoBackdrop: {} as any,
            hosts: ['a', 'b'],
            results: {
                kills: {
                    boardId: 'kills', year: 2, quarter: 4, isYearEndFinal: true,
                    candidates: [
                        { generalId: 'general_zhao_yun', score: 2500, rank: 2, trend: 'DOWN', evidence: {} as any }
                    ]
                },
                rookie: {
                    boardId: 'rookie', year: 2, quarter: 4, isYearEndFinal: true,
                    candidates: [
                        { generalId: 'general_zhao_yun', score: 1800, rank: 1, trend: 'NEW', evidence: {} as any }
                    ]
                }
            }
        });

        const stats = viewer.getGeneralHallOfFameStats('general_zhao_yun');
        assert.equals(stats.totalTitles, 2, '生涯奪冠應為 2 次（第1年殺敵榜 + 第2年新人王）');
        assert.equals(stats.top10Count, 3, '生涯入圍前十應為 3 次');
        assert.equals(stats.honors.length, 3);
        assert.isTrue(stats.honors[0].isChampion);
        assert.isFalse(stats.honors[1].isChampion);
        assert.isTrue(stats.honors[2].isChampion);
    });

    suite.test('祝賀回話的 {self} 依性別／年齡代入；資料檔不寫死「某」', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs') as typeof import('fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path') as typeof import('path');
        const real = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'resources', 'data', 'annual-ranking-congratulation.json'), 'utf-8')) as CongratulationDialogues;
        for (const cat of Object.values(real.categories)) for (const t of cat.templates) assert.isTrue(!t.includes('某'), `寫死某：${t}`);
        const ids = Object.keys(real.categories).flatMap((c) => real.categories[c].templates.map((_, i) => `${c}-${i}`));
        assert.isTrue(ids.length > 0);
        let sawFemale = false;
        for (let y = 1; y <= 30; y++) {
            FriendshipService.resetInstance();
            const c = new AnnualRankingCongratulation(real, 5);
            const f = c.congratulate(y, 'g_f', 'fierce', undefined, { gender: '女', type: 'Brave' });
            assert.isTrue(!/\{\w+\}/.test(f.barkText ?? ''), f.barkText);
            assert.isTrue(!(f.barkText ?? '').includes('某'), f.barkText);
            if ((f.barkText ?? '').includes('本姑娘')) sawFemale = true;
            const m = new AnnualRankingCongratulation(real, 5).congratulate(y, 'g_m', 'fierce', undefined, { gender: '男', type: 'Brave' });
            assert.isTrue(!/\{\w+\}/.test(m.barkText ?? ''), m.barkText);
        }
        assert.isTrue(sawFemale, '女將豪放回話應出現本姑娘');
    });

    return suite;
}
