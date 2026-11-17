/**
 * OwnedRosterSource — 武將名冊來源選擇（PROG-2-9147）
 */
import { assert, TestSuite } from './TestRunner';
import { ownedLivingGenerals } from '../assets/scripts/ui/core/OwnedRosterSource';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const g = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: id, age: 30, ...extra }) as unknown as GeneralConfig;

export function createOwnedRosterSourceSuite(): TestSuite {
    const suite = new TestSuite('OwnedRosterSource');

    suite.test('回傳 session 名冊內的武將，不混入其他來源', () => {
        const roster = [g('meng-huo'), g('lu-ling-qi')];
        assert.equals('meng-huo,lu-ling-qi', ownedLivingGenerals(roster).map((x) => x.id).join(','));
    });

    suite.test('名冊為空時回空陣列（呼叫端顯示空狀態，不退回圖鑑）', () => {
        assert.lengthEquals(0, ownedLivingGenerals([]));
    });

    suite.test('排除已故武將，規則與關係列表一致', () => {
        const dead = g('old', { status: 'dead' });
        assert.equals('a', ownedLivingGenerals([g('a'), dead]).map((x) => x.id).join(','));
    });

    return suite;
}
