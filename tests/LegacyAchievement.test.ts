import { TestSuite, assert } from './TestRunner';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import {
    grantLegacyRewards,
    legacyAchievementsOf,
    LEGACY_MIN_GENERATION_GAP,
    LEGACY_PREMIUM_REWARD,
    normalizeLegacyCount,
} from '../assets/scripts/core/systems/LegacyAchievement';

// 世代成就（PROG-2-0528 / RET-07）。規格：留存系統.md §世代成就。
// 祖譜：C（後代）→ 父 f → 祖 ff → 曾祖 fff（世代差 3）；母系 m → mm → mmm 同樣是世代差 3。

function person(uid: string) {
    return { uid, template_id: null, name: uid, gene_refs: [] as string[], ep_base: 50, faction: 'shu', is_virtual: false };
}

function graphWith(links: Array<{ child: string; parent: string; relation: 'F' | 'M' }>): BloodlineGraph {
    const uids = new Set<string>();
    for (const l of links) { uids.add(l.child); uids.add(l.parent); }
    const graph = new BloodlineGraph();
    graph.loadFromData({
        version: 't',
        updatedAt: 't',
        persons: [...uids].map(person),
        links: links.map((l) => ({ child_uid: l.child, parent_uid: l.parent, relation: l.relation })),
    } as never);
    return graph;
}

/** 父系三代 + 母系三代的祖譜 */
function fullLineage(): BloodlineGraph {
    return graphWith([
        { child: 'C', parent: 'f', relation: 'F' },
        { child: 'f', parent: 'ff', relation: 'F' },
        { child: 'ff', parent: 'fff', relation: 'F' },
        { child: 'C', parent: 'm', relation: 'M' },
        { child: 'm', parent: 'mm', relation: 'M' },
        { child: 'mm', parent: 'mmm', relation: 'M' },
    ]);
}

function genesFrom(table: Record<string, string[]>): (uid: string) => string[] {
    return (uid) => table[uid] ?? [];
}

export function createLegacyAchievementSuite(): TestSuite {
    const suite = new TestSuite('LegacyAchievement (RET-07 世代成就)');

    suite.test('門檻常數與規格一致：世代差 3、獎勵高級貨幣 100', () => {
        assert.equals(3, LEGACY_MIN_GENERATION_GAP);
        assert.equals(100, LEGACY_PREMIUM_REWARD);
    });

    suite.test('後代擁有曾祖（世代差 3）的因子 → 觸發一次，獎勵 100', () => {
        const graph = fullLineage();
        const result = legacyAchievementsOf(graph, 'C', genesFrom({ C: ['gene-red'], fff: ['gene-red'] }));
        assert.equals(1, result.length);
        assert.equals('fff', result[0].ancestorUid);
        assert.equals('gene-red', result[0].geneId);
        assert.equals(3, result[0].generationGap);
        assert.equals('premium', result[0].reward.currency);
        assert.equals(100, result[0].reward.amount);
    });

    suite.test('祖先只在世代差 2（祖父母）擁有因子 → 不觸發', () => {
        const graph = fullLineage();
        const result = legacyAchievementsOf(graph, 'C', genesFrom({ C: ['gene-red'], ff: ['gene-red'], f: ['gene-red'] }));
        assert.equals(0, result.length);
    });

    suite.test('後代沒有該因子 → 不觸發，即使曾祖擁有', () => {
        const graph = fullLineage();
        const result = legacyAchievementsOf(graph, 'C', genesFrom({ C: ['gene-blue'], fff: ['gene-red'] }));
        assert.equals(0, result.length);
    });

    suite.test('同一因子同時出現在父系與母系的曾祖 → 只計一次', () => {
        const graph = fullLineage();
        const result = legacyAchievementsOf(graph, 'C', genesFrom({ C: ['gene-red'], fff: ['gene-red'], mmm: ['gene-red'] }));
        assert.equals(1, result.length);
    });

    suite.test('不同因子各自觸發，每個因子一筆', () => {
        const graph = fullLineage();
        const result = legacyAchievementsOf(graph, 'C', genesFrom({
            C: ['gene-red', 'gene-green'],
            fff: ['gene-red'],
            mmm: ['gene-green'],
        }));
        assert.equals(2, result.length);
        assert.isTrue(result.some((r) => r.geneId === 'gene-red' && r.ancestorUid === 'fff'));
        assert.isTrue(result.some((r) => r.geneId === 'gene-green' && r.ancestorUid === 'mmm'));
    });

    suite.test('沒有祖譜或後代無因子 → 回傳空陣列', () => {
        const alone = graphWith([]);
        assert.equals(0, legacyAchievementsOf(alone, 'C', genesFrom({ C: ['gene-red'] })).length);
        assert.equals(0, legacyAchievementsOf(fullLineage(), 'C', genesFrom({ fff: ['gene-red'] })).length);
    });

    suite.test('grantLegacyRewards：只把 premium 獎勵加到靈玉，回傳新錢包且不改傳入物件', () => {
        const base = { gems: 3, gold: 9, tickets: 1, bronze: 0, oracle: 0 };
        const achievements = [
            { descendantUid: 'C', ancestorUid: 'fff', geneId: 'g', generationGap: 3, reward: { currency: 'premium' as const, amount: 100 } },
            { descendantUid: 'C', ancestorUid: 'mmm', geneId: 'h', generationGap: 3, reward: { currency: 'premium' as const, amount: 100 } },
        ];
        const { wallet, granted } = grantLegacyRewards(base, achievements);
        assert.equals(200, granted);
        assert.equals(203, wallet.gems);
        assert.equals(9, wallet.gold);
        assert.equals(3, base.gems, '傳入的錢包不被修改');
    });

    suite.test('normalizeLegacyCount：非負整數保留，其餘視為 0', () => {
        assert.equals(4, normalizeLegacyCount(4));
        assert.equals(0, normalizeLegacyCount(-1));
        assert.equals(0, normalizeLegacyCount(1.5));
        assert.equals(0, normalizeLegacyCount('3'));
        assert.equals(0, normalizeLegacyCount(undefined));
    });

    return suite;
}
