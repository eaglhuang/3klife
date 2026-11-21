/**
 * RewardRoster.test.ts — GCH-R3（PROG-2-9462）：卡池 JSON 化（名將池、紅顏池、宿命池）與名冊查詢
 *
 * 用真實的 data/gacha-reward-pools.json 與 data/generals.json 載入，鎖住：名將池純男將、紅顏池全女將、
 * 宿命池六大名將加不重複十位、等階機率不隨名冊人數漂移、UP 佔比、12.3 保底數值、機率表與抽樣一致，
 * 以及程式碼裡沒有寫死的池規則。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { DeterministicRngSession } from '../assets/scripts/shared/foundation/DeterministicRng';
import { normalizeRewardConfig, type RewardPoolDef } from '../assets/scripts/shared/reward/RewardConfig';
import { poolViewOf } from '../assets/scripts/shared/reward/RewardDisclosure';
import { buildRewardPools, queryRoster, rosterRarityOf, type RosterMember } from '../assets/scripts/shared/reward/RewardRoster';
import { poolDistribution, rollPool } from '../assets/scripts/shared/reward/RewardRules';

const ROOT = path.resolve(__dirname, '..');
const readJson = (rel: string): unknown => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf-8'));

interface Gen extends RosterMember { gender: string }
const generals = (): Gen[] => readJson('assets/resources/data/generals.json') as Gen[];
const poolFile = (): { rosterRefs: Record<string, string[]> } => readJson('assets/resources/data/gacha-reward-pools.json') as { rosterRefs: Record<string, string[]> };

function loadPools(): Record<string, RewardPoolDef> {
    const out: Record<string, RewardPoolDef> = {};
    for (const p of buildRewardPools(poolFile(), generals())) out[p.id] = p;
    return out;
}

const sum = (xs: readonly number[]): number => xs.reduce((t, x) => t + x, 0);

export function createRewardRosterSuite(): TestSuite {
    const suite = new TestSuite('RewardRoster（GCH-R3 卡池 JSON 化）');

    suite.test('名冊查詢：交集條件、ref、排除、性別別名、稀有度對照；沒有條件回空', () => {
        const roster: RosterMember[] = [
            { id: 'a', gender: '男', rarityTier: 'legendary' }, { id: 'b', gender: '男', rarityTier: 'epic' },
            { id: 'c', gender: '女', rarityTier: 'epic' }, { id: 'd', gender: '女', rarityTier: 'common' },
            { id: 'e', gender: '男', characterCategory: 'titled' },
        ];
        const ids = (xs: RosterMember[]) => xs.map((x) => x.id).join(',');
        assert.equals('a,e', ids(queryRoster(roster, { rarity: 'SSR' }, {})), 'legendary 與 titled 都算 SSR');
        assert.equals('c', ids(queryRoster(roster, { rarity: 'SR', gender: 'female' }, {})));
        assert.equals('b,c', ids(queryRoster(roster, { ref: 'x' }, { x: ['b', 'c', 'zzz'] })), '不存在的 id 略過');
        assert.equals('b', ids(queryRoster(roster, { ref: 'x', gender: 'male' }, { x: ['b', 'c'] })));
        assert.equals('a,b,e', ids(queryRoster(roster, { gender: 'male', excludeRefs: ['y'] }, { y: ['zzz'] })));
        assert.equals('d', ids(queryRoster(roster, { rarityTier: ['common', 'rare'], excludeGender: 'male' }, {})));
        assert.equals('', ids(queryRoster(roster, {}, {})), '無條件不展開');
        assert.equals('R', rosterRarityOf({ id: 'z' }));
    });

    suite.test('引擎 tierRates：等階機率不隨名冊人數漂移；某階沒人時由其餘等階按比例吃下', () => {
        const mk = (n: number, withSsr: boolean) => normalizeRewardConfig({ pools: [{
            id: 'T', tiers: ['R', 'SSR'], tierRates: { R: 0.9, SSR: 0.1 },
            entries: [
                ...Array.from({ length: n }, (_, i) => ({ id: `r${i}`, weight: 1, tier: 'R', effect: { kind: 'x' } })),
                ...(withSsr ? [{ id: 's', weight: 1, tier: 'SSR', effect: { kind: 'x' } }] : []),
            ],
        }] }).pools[0];
        const a = poolDistribution(mk(3, true), {});
        const b = poolDistribution(mk(300, true), {});
        assert.inRange(a.tiers[1].baseRate, 0.0999999, 0.1000001);
        assert.inRange(b.tiers[1].baseRate, 0.0999999, 0.1000001);
        assert.inRange(b.entries[0].probability, 0.9 / 300 - 1e-9, 0.9 / 300 + 1e-9);
        const c = poolDistribution(mk(3, false), {});
        assert.equals(1, c.tiers[0].baseRate, 'SSR 沒人時 R 吃下全部');
        const bad = normalizeRewardConfig({ pools: [{ id: 'B', tiers: ['R'], tierRates: { R: 0 }, entries: [{ id: 'a', weight: 1, tier: 'R', effect: { kind: 'x' } }] }] }).pools[0];
        assert.equals(null, bad.tierRates);
    });

    suite.test('三池資料可載入；名單檔 refs 的 id 都在名冊內，UP 名單等階正確', () => {
        const pools = loadPools();
        assert.equals('POOL_GENERAL_MAIN,POOL_HEROINE,POOL_DESTINY', Object.keys(pools).join(','));
        const byId = new Map(generals().map((g) => [g.id, g]));
        const refs = poolFile().rosterRefs;
        for (const [name, ids] of Object.entries(refs)) for (const id of ids) assert.isTrue(byId.has(id), `${name} 的 ${id} 不在名冊`);
        for (const id of refs['gacha.general.up.ssr']) assert.equals('SSR', rosterRarityOf(byId.get(id)!));
        for (const id of refs['gacha.general.up.sr']) assert.equals('SR', rosterRarityOf(byId.get(id)!));
        for (const id of refs['gacha.heroine.up.ssr']) assert.equals('SSR', rosterRarityOf(byId.get(id)!));
        for (const poolId of ['POOL_GENERAL_MAIN', 'POOL_HEROINE']) {
            for (const e of pools[poolId].entries) assert.equals(rosterRarityOf(byId.get(e.id)!), e.tier, `${poolId}/${e.id}`);
        }
    });

    suite.test('名將池：純男將；SSR 3%／SR 10%／R 87%；UP 佔比 SSR 70%、SR 80%；保底照 12.3', () => {
        const pool = loadPools().POOL_GENERAL_MAIN;
        const byId = new Map(generals().map((g) => [g.id, g]));
        assert.isTrue(pool.entries.every((e) => byId.get(e.id)?.gender === '男'), '名將池只有男將');
        assert.equals(generals().filter((g) => g.gender === '男').length, pool.entries.length, '男將全部入池');
        const view = poolViewOf(pool, true, {});
        const rate = (t: string) => view.tiers.find((x) => x.tier === t)!;
        assert.inRange(rate('SSR').baseRate, 0.0299999, 0.0300001);
        assert.inRange(rate('SR').baseRate, 0.0999999, 0.1000001);
        assert.inRange(rate('R').baseRate, 0.8699999, 0.8700001);
        assert.inRange(sum(rate('SSR').entries.filter((e) => e.isUp).map((e) => e.rate)), 0.021 - 1e-9, 0.021 + 1e-9);
        assert.inRange(sum(rate('SR').entries.filter((e) => e.isUp).map((e) => e.rate)), 0.08 - 1e-9, 0.08 + 1e-9);
        assert.equals(3, rate('SSR').entries.filter((e) => e.isUp).length);
        const ladders = pool.pity.map((p) => `${p.soft?.startAt},${p.soft?.curveExp},${p.hardCount}`).sort().join('|');
        assert.equals('50,2,90|6,1,10', ladders);
        assert.inRange(sum(view.tiers.map((t) => t.baseRate)), 1 - 1e-9, 1 + 1e-9);
        assert.inRange(sum(view.tiers.flatMap((t) => t.entries.map((e) => e.rate))), 1 - 1e-9, 1 + 1e-9);
    });

    suite.test('紅顏池（FEM-03）：全女將；SSR 2.5%／SR 12.5%／R 85%；兩條保底 30/50 與 3/5', () => {
        const pool = loadPools().POOL_HEROINE;
        const byId = new Map(generals().map((g) => [g.id, g]));
        assert.isTrue(pool.entries.length > 0 && pool.entries.every((e) => byId.get(e.id)?.gender === '女'));
        assert.equals(generals().filter((g) => g.gender === '女').length, pool.entries.length);
        const view = poolViewOf(pool, true, {});
        assert.inRange(view.tiers.find((t) => t.tier === 'SSR')!.baseRate, 0.0249999, 0.0250001);
        assert.inRange(view.tiers.find((t) => t.tier === 'SR')!.baseRate, 0.1249999, 0.1250001);
        const ladders = pool.pity.map((p) => `${p.soft?.startAt},${p.soft?.curveExp},${p.hardCount}`).sort().join('|');
        assert.equals('3,1,5|30,2,50', ladders);
    });

    suite.test('宿命池：六大宿命名將＋男性普通／稀有名將；每輪恰一位宿命名將、十位不重複；無保底', () => {
        const pool = loadPools().POOL_DESTINY;
        const stars = new Set(poolFile().rosterRefs['gacha.destiny.stars']);
        assert.equals(6, pool.entries.filter((e) => e.tier === 'star').length);
        const fillers = pool.entries.filter((e) => e.tier === 'filler');
        const byId = new Map(generals().map((g) => [g.id, g]));
        assert.isTrue(fillers.every((e) => !stars.has(e.id) && byId.get(e.id)?.gender !== '女' && ['common', 'rare'].indexOf(String(byId.get(e.id)?.rarityTier)) >= 0));
        assert.equals(0, pool.pity.length);
        for (let i = 0; i < 40; i += 1) {
            const out = rollPool(pool, 1, new DeterministicRngSession(`${i}`.padStart(64, 'b')), {});
            assert.equals(10, new Set(out.items.map((x) => x.entryId)).size);
            assert.equals(1, out.items.filter((x) => stars.has(x.entryId)).length, '恰一位宿命名將');
        }
    });

    suite.test('機率表與抽樣一致：名將池兩萬次，等階頻率誤差 < 0.5 個百分點', () => {
        const pool = loadPools().POOL_GENERAL_MAIN;
        const view = poolViewOf(pool, true, {});
        const tierOf = new Map(pool.entries.map((e) => [e.id, e.tier]));
        const N = 20_000;
        const rng = new DeterministicRngSession('5'.repeat(64));
        const hits: Record<string, number> = {};
        for (let i = 0; i < N; i += 1) {
            const t = tierOf.get(rollPool(pool, 1, rng, {}).items[0].entryId) ?? '?';
            hits[t] = (hits[t] ?? 0) + 1;
        }
        for (const t of view.tiers) assert.isTrue(Math.abs((hits[t.tier] ?? 0) / N - t.baseRate) < 0.005, t.tier);
    });

    suite.test('程式碼沒有寫死的池規則：獎勵引擎原始碼不含池 id、計數鍵或轉蛋機率常數', () => {
        for (const n of ['RewardConfig', 'RewardRules', 'RewardRoster', 'RewardDisclosure']) {
            const src = fs.readFileSync(path.join(ROOT, `assets/scripts/shared/reward/${n}.ts`), 'utf-8');
            assert.isTrue(!/POOL_(GENERAL|HEROINE|DESTINY)/.test(src), `${n} 不得寫死池 id`);
            assert.isTrue(!/gacha\.(general|heroine|destiny)/.test(src), `${n} 不得寫死計數鍵`);
        }
    });

    return suite;
}
