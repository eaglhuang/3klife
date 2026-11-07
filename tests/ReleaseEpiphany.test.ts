import { resolveReleaseEpiphany } from '../assets/scripts/core/systems/ReleaseEpiphany';
import { TestSuite, assert } from './TestRunner';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `g${i}`);

export function createReleaseEpiphanySuite(): TestSuite {
    const suite = new TestSuite('ReleaseEpiphany（LVL-13 釋放敵將頓悟 PROG-2-1984）');
    suite.test('10 人且軍資足：扣 500，亂數選一名武將', () => {
        const r = resolveReleaseEpiphany({ rosterIds: ids(10), supplies: 800, rng: () => 0.35 });
        assert.isTrue(r.triggered);
        assert.equals('g3', r.winnerId);
        assert.equals(300, r.suppliesAfter);
        assert.equals('g9', resolveReleaseEpiphany({ rosterIds: ids(10), supplies: 800, rng: () => 0.9999 }).winnerId);
    });
    suite.test('人數不足或軍資不足：不觸發、不扣資源', () => {
        const a = resolveReleaseEpiphany({ rosterIds: ids(9), supplies: 9999, rng: () => 0 });
        assert.equals('roster-too-small', a.reason);
        assert.equals(9999, a.suppliesAfter);
        const b = resolveReleaseEpiphany({ rosterIds: ids(12), supplies: 499, rng: () => 0 });
        assert.equals('not-enough-supplies', b.reason);
        assert.equals(499, b.suppliesAfter);
    });
    return suite;
}
