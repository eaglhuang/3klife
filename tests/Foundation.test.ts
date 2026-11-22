/**
 * Foundation.test.ts — 共通底層工具層 FND-M（PROG-2-9202；總綱 doc_spec_1182 第 11、12 章）
 *
 * 涵蓋：確定性亂數會話、加權表、條件評估、季時鐘。全部是純函式，不碰引擎與 UI。
 */
import { assert, TestSuite } from './TestRunner';
import { DeterministicRngSession, createPreviewRng, deriveRngSeed, isValidSeedHex, type RandomSource } from '../assets/scripts/shared/foundation/DeterministicRng';
import { weightedPick, weightedPickMany, weightedProbabilities, weightedTotal } from '../assets/scripts/shared/foundation/WeightedTable';
import { ConditionError, ConditionEvaluator, compareValues, createConditionEvaluator, type Condition, type ConditionFacts } from '../assets/scripts/shared/foundation/Condition';
import {
    addSeasons, createCountdown, fromSeasonIndex, isCountdownExpired, nextGrantIndex, periodsDue, seasonsBetween, tickCountdown, toSeasonIndex,
} from '../assets/scripts/shared/foundation/GameClock';
import { hmacSha256Hex, sha256, toHex, utf8Encode } from '../assets/scripts/shared/foundation/Sha256';
import { AcademyRng } from '../assets/scripts/core/systems/nurture/AcademyDeterministicRng';

const SEED = '0'.repeat(63) + '1';

/** 固定回傳序列的假隨機源，驗證加權表邏輯時不依賴雜湊 */
function fixedRng(values: number[]): RandomSource {
    let i = 0;
    return { nextInt: (max: number) => { const v = values[i++ % values.length]; return v % max; } };
}

const facts: ConditionFacts = {
    getNumber: (fact) => ({ gold: 500, level: 7 } as Record<string, number>)[fact],
    getFlag: (key) => key === 'intro.done',
    countItem: (id) => (id === 'token.academy' ? 2 : 0),
    getRank: () => 3,
};

export function createFoundationSuite(): TestSuite {
    const suite = new TestSuite('Foundation（共通底層工具層）');

    // ---------- Sha256 ----------
    suite.test('Sha256：標準測試向量（abc）與 HMAC', () => {
        assert.equals('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', toHex(sha256(utf8Encode('abc'))));
        assert.equals(64, hmacSha256Hex('m', 'k').length);
    });

    // ---------- DeterministicRng ----------
    suite.test('Rng：同 (seedHex, stepIndex) 同結果；與舊 AcademyRng 逐位元相同（金標準）', () => {
        const r = new DeterministicRngSession(SEED);
        assert.equals(96695123, r.nextUint32('a'));
        assert.equals(19, r.nextInt(100, 'b'));
        assert.equals(0, r.pickWeighted([5, 0, 3, 2], 'c'));
        assert.isFalse(r.chance(1, 3, 'd'));
        assert.equals('93124d6f8bade582fff9a27a8d94cd3950b59a5b7f1a411a792d5ecb100caeba', r.seedHex);
        assert.equals(4, r.stepIndex);
        const academy = new AcademyRng(SEED);
        assert.equals(96695123, academy.nextUint32('a'));
    });

    suite.test('Rng：snapshot／restore 後續序列與原會話一致（存檔讀回重播）', () => {
        const a = new DeterministicRngSession(SEED);
        a.nextInt(10, 's'); a.nextInt(10, 's');
        const b = DeterministicRngSession.restore(JSON.parse(JSON.stringify(a.snapshot())));
        for (let i = 0; i < 5; i++) assert.equals(a.nextInt(1000, 'x'), b.nextInt(1000, 'x'));
        assert.equals(a.stepIndex, b.stepIndex);
    });

    suite.test('Rng：clone 取樣不推進本體（預覽）；不同 salt 結果不同', () => {
        const a = new DeterministicRngSession(SEED);
        const preview = a.clone();
        preview.nextUint32('p'); preview.nextUint32('p');
        assert.equals(0, a.stepIndex);
        const x = new DeterministicRngSession(SEED).nextUint32('one');
        const y = new DeterministicRngSession(SEED).nextUint32('two');
        assert.isTrue(x !== y);
    });

    suite.test('Rng：nextInt 範圍正確、分布不偏（1000 次落在 [0,6)，每面都出現）', () => {
        const r = new DeterministicRngSession(SEED);
        const seen = new Set<number>();
        for (let i = 0; i < 1000; i++) {
            const v = r.nextInt(6, 'd6');
            assert.inRange(v, 0, 5);
            seen.add(v);
        }
        assert.equals(6, seen.size);
    });

    suite.test('Rng：非法輸入丟錯（壞種子、壞步數、上限非正整數、負權重、權重全 0）', () => {
        assert.throws(() => new DeterministicRngSession('zz'));
        assert.throws(() => new DeterministicRngSession(SEED, -1));
        assert.throws(() => new DeterministicRngSession(SEED, 1.5));
        const r = new DeterministicRngSession(SEED);
        assert.throws(() => r.nextInt(0, 's'));
        assert.throws(() => r.nextInt(1.5, 's'));
        assert.throws(() => r.pickWeighted([1, -1], 's'));
        assert.throws(() => r.pickWeighted([0, 0], 's'));
        assert.isFalse(isValidSeedHex('ABC'));
    });

    suite.test('Rng：chance 邊界（0 必不中、滿必中）與 deriveRngSeed／預覽亂數', () => {
        const r = new DeterministicRngSession(SEED);
        assert.isFalse(r.chance(0, 5, 's'));
        assert.isTrue(r.chance(5, 5, 's'));
        assert.equals(0, r.stepIndex);
        assert.equals(deriveRngSeed('w', 'a', 1), deriveRngSeed('w', 'a', 1));
        assert.isTrue(deriveRngSeed('w', 'a', 1) !== deriveRngSeed('w', 'a', 2));
        assert.isTrue(isValidSeedHex(createPreviewRng('t').seedHex));
    });

    // ---------- WeightedTable ----------
    suite.test('WeightedTable：依權重落點抽取、權重 0 不會被抽到', () => {
        const table = [{ id: 'a', weight: 5 }, { id: 'b', weight: 0 }, { id: 'c', weight: 3 }];
        assert.equals('a', weightedPick(table, fixedRng([0]), 's').id);
        assert.equals('a', weightedPick(table, fixedRng([4]), 's').id);
        assert.equals('c', weightedPick(table, fixedRng([5]), 's').id);
        assert.equals('c', weightedPick(table, fixedRng([7]), 's').id);
    });

    suite.test('WeightedTable：與 pickWeighted 同種子同結果（可替換舊實作）', () => {
        const table = [{ id: 'a', weight: 5 }, { id: 'b', weight: 0 }, { id: 'c', weight: 3 }, { id: 'd', weight: 2 }];
        const weights = table.map((e) => e.weight);
        for (let i = 0; i < 50; i++) {
            const seed = deriveRngSeed('w', i);
            const viaTable = weightedPick(table, new DeterministicRngSession(seed), 'x').id;
            const viaIndex = table[new DeterministicRngSession(seed).pickWeighted(weights, 'x')].id;
            assert.equals(viaIndex, viaTable);
        }
    });

    suite.test('WeightedTable：exclude 去重；全部排除丟錯；重複 id、負權重、小數權重丟錯', () => {
        const table = [{ id: 'a', weight: 5 }, { id: 'b', weight: 3 }];
        assert.equals('b', weightedPick(table, fixedRng([0]), 's', { exclude: ['a'] }).id);
        assert.throws(() => weightedPick(table, fixedRng([0]), 's', { exclude: new Set(['a', 'b']) }));
        assert.throws(() => weightedTotal([{ id: 'a', weight: 1 }, { id: 'a', weight: 1 }]));
        assert.throws(() => weightedTotal([{ id: 'a', weight: -1 }]));
        assert.throws(() => weightedTotal([{ id: 'a', weight: 0.5 }]));
    });

    suite.test('WeightedTable：weightedPickMany 不放回、不足時提早結束；放回可重複', () => {
        const table = [{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }, { id: 'c', weight: 1 }];
        const rng = new DeterministicRngSession(SEED);
        const uniq = weightedPickMany(table, rng, 's', 5, { unique: true });
        assert.equals(3, uniq.length);
        assert.equals(3, new Set(uniq.map((e) => e.id)).size);
        const again = weightedPickMany(table, new DeterministicRngSession(SEED), 's', 5, { unique: true });
        assert.equals(uniq.map((e) => e.id).join(','), again.map((e) => e.id).join(','));
        assert.equals(5, weightedPickMany(table, new DeterministicRngSession(SEED), 's', 5).length);
        assert.equals(0, weightedPickMany(table, rng, 's', 0).length);
    });

    suite.test('WeightedTable：weightedProbabilities 機率加總為 1，排除後重新正規化', () => {
        const table = [{ id: 'a', weight: 1 }, { id: 'b', weight: 3 }];
        const p = weightedProbabilities(table);
        assert.equals(0.25, p[0].probability);
        assert.equals(0.75, p[1].probability);
        const q = weightedProbabilities(table, { exclude: ['a'] });
        assert.equals(1, q.length);
        assert.equals(1, q[0].probability);
    });

    // ---------- Condition ----------
    suite.test('Condition：compare／hasItem／flag／rank／const 內建種類', () => {
        const ev = createConditionEvaluator();
        assert.isTrue(ev.evaluate({ kind: 'compare', fact: 'gold', op: '>=', value: 500 }, facts));
        assert.isFalse(ev.evaluate({ kind: 'compare', fact: 'gold', op: '>', value: 500 }, facts));
        assert.isTrue(ev.evaluate({ kind: 'compare', fact: 'unknown', op: '==', value: 0 }, facts));
        assert.isTrue(ev.evaluate({ kind: 'hasItem', itemId: 'token.academy' }, facts));
        assert.isTrue(ev.evaluate({ kind: 'hasItem', itemId: 'token.academy', count: 2 }, facts));
        assert.isFalse(ev.evaluate({ kind: 'hasItem', itemId: 'token.academy', count: 3 }, facts));
        assert.isTrue(ev.evaluate({ kind: 'flag', key: 'intro.done' }, facts));
        assert.isTrue(ev.evaluate({ kind: 'flag', key: 'other', value: false }, facts));
        assert.isTrue(ev.evaluate({ kind: 'rank', op: '>=', value: 3 }, facts));
        assert.isFalse(ev.evaluate({ kind: 'rank', op: '<', value: 3 }, facts));
        assert.isTrue(ev.evaluate({ kind: 'const', value: true }, facts));
    });

    suite.test('Condition：all／any／not 組合與空集合慣例；事實提供者缺省不當機', () => {
        const ev = createConditionEvaluator();
        const rich: Condition = { kind: 'compare', fact: 'gold', op: '>=', value: 100 };
        const poor: Condition = { kind: 'compare', fact: 'gold', op: '<', value: 100 };
        assert.isTrue(ev.evaluate({ all: [rich, { not: poor }] }, facts));
        assert.isTrue(ev.evaluate({ any: [poor, rich] }, facts));
        assert.isFalse(ev.evaluate({ all: [rich, poor] }, facts));
        assert.isTrue(ev.evaluate({ all: [] }, facts));
        assert.isFalse(ev.evaluate({ any: [] }, facts));
        assert.isFalse(ev.evaluate({ kind: 'hasItem', itemId: 'x' }, {}));
    });

    suite.test('Condition：explain 只列造成失敗的葉節點（any 通過不算缺項）', () => {
        const ev = createConditionEvaluator();
        const cond: Condition = {
            all: [
                { kind: 'compare', fact: 'gold', op: '>=', value: 9999 },
                { any: [{ kind: 'rank', op: '>=', value: 1 }, { kind: 'flag', key: 'nope' }] },
                { kind: 'hasItem', itemId: 'ghost' },
            ],
        };
        const res = ev.explain(cond, facts);
        assert.isFalse(res.ok);
        assert.equals(2, res.failed.length);
        assert.equals('compare', (res.failed[0] as { kind: string }).kind);
        assert.equals('hasItem', (res.failed[1] as { kind: string }).kind);
        assert.isTrue(ev.explain({ kind: 'const', value: true }, facts).ok);
    });

    suite.test('Condition：擴充註冊自訂種類；保留字不可註冊；未註冊／格式錯誤丟 ConditionError', () => {
        const ev = new ConditionEvaluator<{ troop: string }>();
        ev.register('troopType', (c, ctx) => (c.allowed as string[]).includes(ctx.troop));
        assert.isTrue(ev.evaluate({ kind: 'troopType', allowed: ['cavalry'] }, { troop: 'cavalry' }));
        assert.isFalse(ev.evaluate({ kind: 'troopType', allowed: ['cavalry'] }, { troop: 'infantry' }));
        assert.throws(() => ev.register('all', () => true));
        assert.throws(() => ev.evaluate({ kind: 'nope' }, { troop: 'x' }));
        const std = createConditionEvaluator();
        let err: unknown;
        try { std.evaluate({ kind: 'compare', fact: 'gold', op: '=~', value: 1 }, facts); } catch (e) { err = e; }
        assert.isTrue(err instanceof ConditionError);
        assert.throws(() => std.evaluate({ all: 'x' } as unknown as Condition, facts));
        assert.throws(() => compareValues(1, '~' as never, 1));
    });

    suite.test('Condition：validate 靜態檢查回報路徑；過深巢狀被擋', () => {
        const ev = createConditionEvaluator();
        assert.equals(0, ev.validate({ all: [{ kind: 'flag', key: 'a' }, { not: { kind: 'const', value: false } }] }).length);
        const errs = ev.validate({ all: [{ kind: 'flag', key: 'a' }, { kind: 'bogus' }, 5] });
        assert.equals(2, errs.length);
        assert.contains(errs[0], '$.all[1]');
        let deep: Condition = { kind: 'const', value: true };
        for (let i = 0; i < 40; i++) deep = { not: deep };
        assert.isTrue(ev.validate(deep).length > 0);
        assert.throws(() => ev.evaluate(deep, facts));
    });

    // ---------- GameClock ----------
    suite.test('Clock：季序與年季互轉、加減季、跨年', () => {
        assert.equals(4 * 3 + 1, toSeasonIndex({ year: 3, season: 2 }));
        const s = fromSeasonIndex(toSeasonIndex({ year: 5, season: 4 }) + 1);
        assert.equals(6, s.year);
        assert.equals(1, s.season);
        assert.equals(2, addSeasons({ year: 1, season: 4 }, 2).season);
        assert.equals(2, addSeasons({ year: 1, season: 4 }, 2).year);
        assert.equals(4, addSeasons({ year: 2, season: 1 }, -1).season);
        assert.equals(1, addSeasons({ year: 2, season: 1 }, -1).year);
        assert.equals(5, seasonsBetween({ year: 1, season: 1 }, { year: 2, season: 2 }));
        assert.throws(() => toSeasonIndex({ year: 1, season: 5 }));
        assert.throws(() => fromSeasonIndex(1.5));
    });

    suite.test('Clock：遞減計數器不低於 0、不改原物件、到期判斷', () => {
        const c = createCountdown(3);
        const t = tickCountdown(c);
        assert.equals(3, c.remaining);
        assert.equals(2, t.remaining);
        assert.isFalse(isCountdownExpired(t));
        assert.isTrue(isCountdownExpired(tickCountdown(c, 9)));
        assert.equals(0, tickCountdown(c, 9).remaining);
        assert.throws(() => createCountdown(-1));
        assert.throws(() => tickCountdown(c, -1));
    });

    suite.test('Clock：定期發放（入學令季發）— 首次立即、逐季一期、離線補多期、保留餘數', () => {
        assert.equals(1, periodsDue(null, 10, 1));
        assert.equals(0, periodsDue(10, 10, 1));
        assert.equals(1, periodsDue(10, 11, 1));
        assert.equals(4, periodsDue(10, 14, 1));
        assert.equals(0, periodsDue(10, 11, 2));
        assert.equals(1, periodsDue(10, 13, 2));
        assert.equals(12, nextGrantIndex(10, 13, 2, 1));
        assert.equals(13, nextGrantIndex(null, 13, 2, 1));
        assert.equals(0, periodsDue(10, 5, 1));
        assert.throws(() => periodsDue(0, 1, 0));
    });

    return suite;
}
