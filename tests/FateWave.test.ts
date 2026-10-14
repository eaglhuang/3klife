/**
 * FateWave.test.ts — 天命波動接入 EP（PROG-2-0511 / LUK-02，headless）
 *
 * Unity 對照：EditMode Test 注入固定亂數序列，直接驗證 EP 公式與配種入口，不開場景。
 */
import { TestSuite, assert } from './TestRunner';
import {
    applyFateWave,
    computeEpMvp,
    epRatingLabel,
    rollFateWave,
    BreedingGeneral,
} from '../assets/scripts/core/systems/BreedingSystem';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';

function near(expected: number, actual: number): boolean {
    return Math.abs(expected - actual) < 1e-9;
}

function parent(id: string, sex: '男' | '女', luk: number): BreedingGeneral {
    return {
        id, name: id, faction: 'shu', gender: sex, age: 30, hp: 1000, vitality: 200, maxVitality: 200,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk,
    } as unknown as BreedingGeneral;
}

function graphFor(ids: string[]): BloodlineGraph {
    const graph = new BloodlineGraph();
    const person = (uid: string) => ({ uid, template_id: null, name: uid, gene_refs: [] as string[], ep_base: 50, faction: 'shu', is_virtual: false });
    graph.loadFromData({ version: 't', updatedAt: 't', persons: ids.map(person), links: [] });
    return graph;
}

export function createFateWaveSuite(): TestSuite {
    const suite = new TestSuite('FateWave (天命波動接入 EP PROG-2-0511)');

    suite.test('高 LUK（> 80）：亂數 0 → +5，接近 1 → +15', () => {
        assert.isTrue(near(5, rollFateWave(90, () => 0)));
        assert.isTrue(near(15, rollFateWave(90, () => 1)));
        assert.isTrue(near(5, rollFateWave(80.5, () => 0)));
    });

    suite.test('低 LUK（< 40）：亂數 0 → -10，接近 1 → -5', () => {
        assert.isTrue(near(-10, rollFateWave(30, () => 0)));
        assert.isTrue(near(-5, rollFateWave(39.5, () => 1)));
    });

    suite.test('中段（40～80 含邊界）波動為 0 且不擲骰', () => {
        const noDraw = () => { throw new Error('should not draw'); };
        for (const luk of [40, 60, 80]) {
            assert.equals(0, rollFateWave(luk, noDraw));
        }
    });

    suite.test('LUK 為 0、缺省、負數、非有限值視為無資料：波動 0 且不擲骰', () => {
        const noDraw = () => { throw new Error('should not draw'); };
        for (const luk of [0, -30, NaN, Infinity]) {
            assert.equals(0, rollFateWave(luk, noDraw));
        }
    });

    suite.test('注入相同隨機序列，波動可重現', () => {
        const first = rollFateWave(90, () => 0.2);
        const second = rollFateWave(90, () => 0.2);
        assert.isTrue(near(first, 5 + 0.2 * 10));
        assert.isTrue(near(first, second));
    });

    suite.test('套用波動：整數四捨五入、總分與評級重算、不改輸入', () => {
        const base = computeEpMvp({} as never, new Map(), false);
        const frozen = Object.freeze({ ...base, ep: 50, fate: 0, rating: '中規中矩' });
        const applied = applyFateWave(frozen, 40.4);
        assert.equals(90, applied.ep);
        assert.equals(40, applied.fate);
        assert.equals('天命之子', applied.rating);
        assert.equals(50, frozen.ep, '輸入不變');
    });

    suite.test('重複套用不疊加：以 fate 扣回舊值', () => {
        const base = { ...computeEpMvp({} as never, new Map(), false), ep: 50, fate: 0 };
        const once = applyFateWave(base, 10);
        const twice = applyFateWave(once, 10);
        assert.equals(60, once.ep);
        assert.equals(60, twice.ep);
    });

    suite.test('評級邊界沿用 epRatingLabel', () => {
        assert.equals('命途多舛', epRatingLabel(applyFateWave({ ...computeEpMvp({} as never, new Map(), false), ep: 50, fate: 0 }, -10).ep));
    });

    suite.test('配種入口：父母 LUK 為 0 時子嗣 fate 為 0；LUK 高時 fate 非 0', () => {
        const runWith = (luk: number) => {
            const ids = ['dad', 'mom'];
            const store = new InMemoryRosterStore([parent('dad', '男', luk), parent('mom', '女', luk)]);
            // 第一次擲骰給受孕判定（0 必定通過），之後的擲骰固定為 0.75
            let calls = 0;
            const service = new BreedingService(store, graphFor(ids), { random: () => (calls++ === 0 ? 0 : 0.75) });
            return service.breed('dad', 'mom');
        };
        const none = runWith(0);
        assert.equals('conceived', none.outcome);
        assert.equals(0, none.ep?.fate ?? -1);

        const high = runWith(90);
        assert.equals('conceived', high.outcome);
        assert.isTrue((high.ep?.fate ?? 0) !== 0, '高 LUK 父母的子嗣有天命波動');
        const ep = high.ep!;
        assert.equals(50 + ep.resonance + ep.outcross + ep.affinity + ep.fate, ep.ep, '總分 = 基礎 + 波動');
    });

    return suite;
}
