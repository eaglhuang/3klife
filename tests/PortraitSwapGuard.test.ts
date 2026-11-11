import { assert, TestSuite } from './TestRunner';
import { PortraitSwapGuard } from '../assets/scripts/ui/core/PortraitSwapGuard';

export function createPortraitSwapGuardSuite(): TestSuite {
    const suite = new TestSuite('PortraitSwapGuard 立繪換人守衛（PROG-2-2236）');
    suite.test('換成另一位要先藏；同一位重刷不藏；清掉後要重新判斷', () => {
        const guard = new PortraitSwapGuard();
        assert.isTrue(guard.begin('lead:0', 'sun_ce'));
        guard.shown('lead:0', 'sun_ce');
        assert.isFalse(guard.begin('lead:0', 'sun_ce'));
        assert.isTrue(guard.begin('lead:0', 'gan_ning'));
        assert.isTrue(guard.begin('lead:1', 'sun_ce'), '各框分開記');
        guard.clear('lead:0');
        assert.isTrue(guard.begin('lead:0', 'sun_ce'));
    });
    return suite;
}
