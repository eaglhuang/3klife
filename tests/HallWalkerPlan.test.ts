// @spec-source → Issue #2135（大廳自薦者＋輪替走動）；PROG-2-2251
/**
 * HallWalkerPlan.test.ts — 誰在場：自薦者一定在、其餘輪替 2~3 位、60 秒換一批
 * Unity 對照：對「當班名單」演算法做固定亂數的單元測試。
 */
import { INITIAL_WALKER_STATE, MAX_VOLUNTEERS, WALKER_RANGE, planHallWalkers, type WalkerCandidate, type WalkerPlanState } from '../assets/scripts/core/systems/HallWalkerPlan';
import { TestSuite, assert } from './TestRunner';

function roster(n: number, walkable: (i: number) => boolean = () => true): WalkerCandidate[] {
    return Array.from({ length: n }, (_, i) => ({ id: `g${i}`, favorite: false, assigned: false, walkable: walkable(i) }));
}

/** 簡單可重現的亂數 */
function rng(seed = 1): () => number {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

export function createHallWalkerPlanSuite(): TestSuite {
    const suite = new TestSuite('HallWalkerPlan (大廳在場名單 Issue #2135)');

    suite.test('沒有自薦者：輪替補到 3 位，全是我方武將、不重複', () => {
        const plan = planHallWalkers({ state: INITIAL_WALKER_STATE, nowSec: 0, owned: roster(8), volunteerIds: [], random: rng() });
        assert.equals(3, plan.walkerIds.length);
        assert.equals(0, plan.volunteerIds.length);
        assert.equals(3, new Set(plan.ids).size);
        assert.isTrue(plan.rotated);
    });

    suite.test('人數區間 2~3：要求的人數被夾回；名冊不夠就有多少放多少', () => {
        const owned = roster(8);
        assert.equals(WALKER_RANGE.max, planHallWalkers({ state: INITIAL_WALKER_STATE, nowSec: 0, owned, volunteerIds: [], random: rng(), walkerCount: 9 }).walkerIds.length);
        assert.equals(WALKER_RANGE.min, planHallWalkers({ state: INITIAL_WALKER_STATE, nowSec: 0, owned, volunteerIds: [], random: rng(), walkerCount: 0 }).walkerIds.length);
        assert.equals(1, planHallWalkers({ state: INITIAL_WALKER_STATE, nowSec: 0, owned: roster(1), volunteerIds: [], random: rng() }).ids.length);
        assert.equals(0, planHallWalkers({ state: INITIAL_WALKER_STATE, nowSec: 0, owned: [], volunteerIds: [], random: rng() }).ids.length);
    });

    suite.test('自薦者一定在場、排在前面，且不會同時被選成輪替者；上限 3 位', () => {
        const plan = planHallWalkers({ state: INITIAL_WALKER_STATE, nowSec: 0, owned: roster(8), volunteerIds: ['g1', 'g2', 'g3', 'g4', 'g5'], random: rng() });
        assert.equals(MAX_VOLUNTEERS, plan.volunteerIds.length);
        assert.equals('g1', plan.ids[0]);
        assert.equals(plan.ids.length, new Set(plan.ids).size, '不重複');
        assert.isFalse(plan.walkerIds.some((id) => plan.volunteerIds.includes(id)));
    });

    suite.test('不在名冊的自薦者（沒擁有的武將）不會出現', () => {
        const plan = planHallWalkers({ state: INITIAL_WALKER_STATE, nowSec: 0, owned: roster(4), volunteerIds: ['ghost', 'g0'], random: rng() });
        assert.equals(1, plan.volunteerIds.length);
        assert.equals('g0', plan.volunteerIds[0]);
        assert.isFalse(plan.ids.includes('ghost'));
    });

    suite.test('60 秒內沿用同一批；滿 60 秒重抽並盡量換人', () => {
        const owned = roster(9);
        const first = planHallWalkers({ state: INITIAL_WALKER_STATE, nowSec: 100, owned, volunteerIds: [], random: rng(1) });
        const same = planHallWalkers({ state: first.state, nowSec: 159, owned, volunteerIds: [], random: rng(2) });
        assert.equals(first.walkerIds.join(','), same.walkerIds.join(','));
        assert.isFalse(same.rotated);
        const next = planHallWalkers({ state: first.state, nowSec: 160, owned, volunteerIds: [], random: rng(3) });
        assert.isTrue(next.rotated);
        assert.equals(3, next.walkerIds.length);
        assert.isFalse(next.walkerIds.some((id) => first.walkerIds.includes(id)), '候選夠多時整批換人');
    });

    suite.test('候選太少（不夠換）時允許重複上一批，不會缺人', () => {
        const owned = roster(3);
        const first = planHallWalkers({ state: INITIAL_WALKER_STATE, nowSec: 0, owned, volunteerIds: [], random: rng() });
        const next = planHallWalkers({ state: first.state, nowSec: 60, owned, volunteerIds: [], random: rng(9) });
        assert.equals(3, next.walkerIds.length);
    });

    suite.test('沿用期間有人變成自薦者：自薦者進場、輪替者補位，總人數不縮水', () => {
        const owned = roster(8);
        const first = planHallWalkers({ state: INITIAL_WALKER_STATE, nowSec: 0, owned, volunteerIds: [], random: rng() });
        const promoted = first.walkerIds[0];
        const next = planHallWalkers({ state: first.state, nowSec: 10, owned, volunteerIds: [promoted], random: rng(5) });
        assert.equals(1, next.volunteerIds.length);
        assert.equals(promoted, next.volunteerIds[0]);
        assert.equals(3, next.walkerIds.length);
        assert.isFalse(next.walkerIds.includes(promoted));
        // 原本留下的另外兩位沒被換掉
        assert.isTrue(first.walkerIds.slice(1).every((id) => next.walkerIds.includes(id)));
    });

    suite.test('偏好：會走的（有骨架）武將抽中機率遠高於只能站著的', () => {
        const owned = roster(8, (i) => i < 4);
        let walkableHits = 0;
        let total = 0;
        const random = rng(77);
        for (let round = 0; round < 200; round++) {
            const plan = planHallWalkers({ state: INITIAL_WALKER_STATE, nowSec: 0, owned, volunteerIds: [], random });
            plan.walkerIds.forEach((id) => { total++; if (owned.find((c) => c.id === id)!.walkable) walkableHits++; });
        }
        assert.isTrue(walkableHits / total > 0.7, `會走的只占 ${(walkableHits / total).toFixed(2)}`);
    });

    suite.test('固定亂數可重現，且不改輸入狀態', () => {
        const state: WalkerPlanState = { walkerIds: ['g0'], rotatedAtSec: 0 };
        const snapshot = JSON.stringify(state);
        const a = planHallWalkers({ state, nowSec: 120, owned: roster(8), volunteerIds: ['g1'], random: rng(4) });
        const b = planHallWalkers({ state, nowSec: 120, owned: roster(8), volunteerIds: ['g1'], random: rng(4) });
        assert.equals(a.ids.join(','), b.ids.join(','));
        assert.equals(snapshot, JSON.stringify(state));
    });

    return suite;
}
