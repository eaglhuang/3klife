import { TestSuite, assert } from './TestRunner';
import { loadFirstAvailableArtCandidate } from '../assets/scripts/core/systems/GeneralArtPaths';

export function createBattleArtControllerSuite(): TestSuite {
    const suite = new TestSuite('BattleArtController');

    suite.test('優先採用第一個成功載入的戰鬥立繪', async () => {
        const tried: string[] = [];
        const result = await loadFirstAvailableArtCandidate(['battle/a', 'battle/b', 'standing/a'], async (path) => {
            tried.push(path);
            return path === 'battle/b' ? 'battle-frame' : null;
        });
        assert.equals('battle-frame', result);
        assert.equals('battle/a,battle/b', tried.join(','));
    });

    suite.test('戰鬥立繪不可用時可由呼叫端接續載入站姿', async () => {
        const tried: string[] = [];
        const result = await loadFirstAvailableArtCandidate(['battle/a', 'standing/a'], async (path) => {
            tried.push(path);
            if (path === 'battle/a') throw new Error('missing');
            return 'standing-frame';
        });
        assert.equals('standing-frame', result);
        assert.equals('battle/a,standing/a', tried.join(','));
    });

    suite.test('所有候選都不存在時回傳 null', async () => {
        const result = await loadFirstAvailableArtCandidate(['battle/a', 'standing/a'], async () => null);
        assert.equals(null, result);
    });

    return suite;
}
