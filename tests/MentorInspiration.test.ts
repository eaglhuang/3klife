/**
 * MentorInspiration.test.ts — 戰法靈感事件觸發引擎 headless 測試（PROG-2-0280 / MENT-04）
 *
 * Unity 對照：等同 EditMode Test，用固定亂數序列驗證 EventRoller 的閘門與機率，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { inspireBlockReasons, inspireChance, InspireContext, InspireEvent, rollInspireRound } from '../assets/scripts/core/systems/MentorInspiration';

const zhaoSpear: InspireEvent = {
    eventId: 'EVT_ZHAO_06',
    tacticId: 'TAC_ZHAO_SPEAR',
    triggerWindow: [1, 36],
    baseRate: 0.1,
    minStar: 5,
    bloodlineRequired: 'ZHAO',
};
const lanceThrust: InspireEvent = { eventId: 'EVT_ZHAO_01', tacticId: 'TAC_LANCE_THRUST', triggerWindow: [1, 12], baseRate: 0.25, minStar: 0 };

function ctx(overrides: Partial<InspireContext> = {}): InspireContext {
    return { mentorStar: 5, friendshipBonus: 0, childLuk: 0, childBloodlines: ['ZHAO'], ...overrides };
}

export function createMentorInspirationSuite(): TestSuite {
    const suite = new TestSuite('MentorInspiration (MENT-04 戰法靈感觸發)');

    suite.test('機率公式：Base × (1+友情) × (1+LUK/200)', () => {
        const chance = inspireChance(lanceThrust, ctx({ friendshipBonus: 0.2, childLuk: 100 }));
        assert.inRange(chance, 0.4499, 0.4501);
    });

    suite.test('機率封頂 1，LUK 為負或非有限數視為 0', () => {
        const high = { ...lanceThrust, baseRate: 0.9 };
        assert.equals(1, inspireChance(high, ctx({ friendshipBonus: 1, childLuk: 200 })));
        assert.equals(0.25, inspireChance(lanceThrust, ctx({ childLuk: -50 })));
        assert.equals(0.25, inspireChance(lanceThrust, ctx({ childLuk: Number.NaN })));
    });

    suite.test('閘門：回合超出區間、星等不足、血統不符各有對應理由', () => {
        assert.equals(JSON.stringify(['out-of-window']), JSON.stringify(inspireBlockReasons(lanceThrust, 13, ctx())));
        assert.equals(JSON.stringify(['star-too-low']), JSON.stringify(inspireBlockReasons(zhaoSpear, 10, ctx({ mentorStar: 4 }))));
        assert.equals(JSON.stringify(['bloodline-missing']), JSON.stringify(inspireBlockReasons(zhaoSpear, 10, ctx({ childBloodlines: ['LU'] }))));
    });

    suite.test('區間端點含在內：第 1 與第 12 回合可觸發', () => {
        assert.equals(0, inspireBlockReasons(lanceThrust, 1, ctx()).length);
        assert.equals(0, inspireBlockReasons(lanceThrust, 12, ctx()).length);
    });

    suite.test('擲骰：亂數小於機率才觸發；閘門不過的事件不消耗亂數', () => {
        let draws = 0;
        const sequence = [0.1, 0.9];
        const random = () => { draws++; return sequence[draws - 1]; };
        const triggered = rollInspireRound([lanceThrust, zhaoSpear], 3, ctx({ mentorStar: 0, childBloodlines: [] }), new Set(), random);
        assert.equals(1, draws, '只有 lanceThrust 合格，只擲一次');
        assert.equals(JSON.stringify(['EVT_ZHAO_01']), JSON.stringify(triggered));
    });

    suite.test('已確認的事件不再擲骰', () => {
        let draws = 0;
        const random = () => { draws++; return 0; };
        const triggered = rollInspireRound([lanceThrust], 3, ctx(), new Set(['EVT_ZHAO_01']), random);
        assert.equals(0, draws);
        assert.equals(0, triggered.length);
    });

    suite.test('基礎觸發率非法時拋 RangeError', () => {
        assert.throws(() => inspireChance({ ...lanceThrust, baseRate: 1.5 }, ctx()));
        assert.throws(() => inspireChance({ ...lanceThrust, baseRate: Number.NaN }, ctx()));
    });

    return suite;
}
