/**
 * HallStageFeed.test.ts — 幕府大廳在場武將資料餵送（UI-2-0138，UI-2-0123 子項）
 */
import { assert, TestSuite } from './TestRunner';
import { buildHallStageFeed, HallStageProfile } from '../assets/scripts/core/systems/HallStageFeed';
import { VOLUNTEER_EAGER_MOOD, VOLUNTEER_SHOWN_FLAG } from '../assets/scripts/core/systems/HallVolunteer';

const PROFILES: Record<string, HallStageProfile> = {
    'guan-yu': { name: '關羽', title: '前將軍', roleTags: ['war'], mood: VOLUNTEER_EAGER_MOOD },
    'zhang-fei': { name: '張飛', roleTags: ['war'], mood: 'CALM' },
    'zhuge-liang': { name: '諸葛亮', title: '軍師', roleTags: ['admin'], mood: VOLUNTEER_EAGER_MOOD },
};
const profileOf = (id: string): HallStageProfile | null => PROFILES[id] ?? null;
const row = (id: string, assigned = false) => ({ id, favorite: false, assigned });

export function createHallStageFeedSuite(): TestSuite {
    const suite = new TestSuite('HallStageFeed');

    suite.test('依點位順序帶出姓名與官職，無官職不帶 title', () => {
        const feed = buildHallStageFeed([row('guan-yu'), row('zhang-fei')], profileOf, []);
        assert.lengthEquals(2, feed.generals, '人數');
        assert.equals(feed.generals[0].title, '前將軍', '關羽官職');
        assert.equals('title' in feed.generals[1], false, '張飛無官職');
    });

    suite.test('查不到檔案的武將略過', () => {
        const feed = buildHallStageFeed([row('nobody'), row('guan-yu')], profileOf, []);
        assert.lengthEquals(1, feed.generals, '只剩關羽');
        assert.equals(feed.generals[0].id, 'guan-yu', 'id');
    });

    suite.test('標籤吻合且情緒 EAGER 才掛任務標記', () => {
        const feed = buildHallStageFeed(
            [row('guan-yu'), row('zhang-fei'), row('zhuge-liang')],
            profileOf,
            [{ id: 't1', tags: ['war'], flags: [] }],
        );
        assert.equals([...feed.taskMarkIds].join(','), 'guan-yu', '只有關羽');
    });

    suite.test('已派任務或任務已演過自告奮勇則不掛', () => {
        const assigned = buildHallStageFeed([row('guan-yu', true)], profileOf, [{ id: 't1', tags: ['war'], flags: [] }]);
        assert.equals(assigned.taskMarkIds.size, 0, '已派任務');
        const shown = buildHallStageFeed([row('guan-yu')], profileOf, [{ id: 't1', tags: ['war'], flags: [VOLUNTEER_SHOWN_FLAG] }]);
        assert.equals(shown.taskMarkIds.size, 0, '已演過');
    });

    return suite;
}
