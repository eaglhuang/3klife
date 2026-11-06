/**
 * OfflinePersonalityBehavior — 四性格對應離線行為與晨報日誌（HUM-03；PROG-2-1932）
 */
import { assert, TestSuite } from './TestRunner';
import {
    OFFLINE_BEHAVIORS, offlineBehaviorLog, pickOfflineBehavior,
} from '../assets/scripts/core/systems/OfflinePersonalityBehavior';

export function createOfflinePersonalityBehaviorSuite(): TestSuite {
    const suite = new TestSuite('OfflinePersonalityBehavior (性格離線行為 HUM-03 PROG-2-1932)');

    suite.test('四性格各挑自己的行為池，亂數邊界不越界', () => {
        assert.equals('SEEK_RECRUIT', pickOfflineBehavior('Loyal', () => 0));
        assert.equals('SPAR', pickOfflineBehavior('Brave', () => 0.99));
        assert.equals('TUTOR_CHILD', pickOfflineBehavior('Wise', () => 0.5));
        assert.equals('SERENDIPITY', pickOfflineBehavior('Playful', () => 1));
        assert.equals('WANDER_LOOT', pickOfflineBehavior('Playful', () => Number.NaN));
        for (const pool of Object.values(OFFLINE_BEHAVIORS)) assert.equals(3, pool.length);
    });

    suite.test('晨報日誌帶名字、時間與行為', () => {
        const log = offlineBehaviorLog('Brave', 'DRINK_TRAINING', '張飛', '昨晚');
        assert.equals('昨晚', log.timestamp);
        assert.isTrue(log.narrative.startsWith('張飛 找人痛飲'));
        assert.equals('DRINK_TRAINING', log.impact);
        assert.isTrue(offlineBehaviorLog('Wise', 'SPAR', '諸葛亮', 't').narrative.includes('平靜'));
    });

    return suite;
}
