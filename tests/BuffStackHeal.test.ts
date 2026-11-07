/**
 * BuffStackHeal — 堆疊、治療、持續傷害（doc_spec_0359；PROG-2-2045）
 */
import { assert, TestSuite } from './TestRunner';
import { StatusStackBook, burnTickDamage, computeHealAmount, poisonTickDamage } from '../assets/scripts/battle/shared/BuffStackHeal';

export function createBuffStackHealSuite(): TestSuite {
    const suite = new TestSuite('BuffStackHeal (堆疊與治療 doc_spec_0359 PROG-2-2045)');

    suite.test('§5-1 連施 5 次封頂 3 層，回合取最大不相加', () => {
        const book = new StatusStackBook();
        [2, 4, 3, 1, 2].forEach((d) => book.apply('ATK_UP', d));
        const s = book.get('ATK_UP')!;
        assert.equals(3, s.stacks);
        assert.equals(4, s.remainingTurns);
        for (let i = 0; i < 4; i++) book.tick();
        assert.equals(null, book.get('ATK_UP'));
    });

    suite.test('§5-2／§5-3 已損 25% 回補且不溢出', () => {
        assert.equals(200 + 250, computeHealAmount({ baseHeal: 200, currentHp: 1000, maxHp: 2000 }));
        assert.equals(0, computeHealAmount({ baseHeal: 200, currentHp: 2000, maxHp: 2000 }));
        assert.equals(100, computeHealAmount({ baseHeal: 400, currentHp: 1900, maxHp: 2000 }));
    });

    suite.test('§3 燃燒與中毒', () => {
        assert.equals(80, burnTickDamage(1000, false));
        assert.equals(160, burnTickDamage(1000, true));
        const p = poisonTickDamage(2000);
        assert.equals(100, p.damage);
        assert.equals(1, p.movePenalty);
    });

    return suite;
}
