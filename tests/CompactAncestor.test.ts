import { TestSuite, assert } from './TestRunner';
import type { SpiritCard } from '../assets/scripts/core/models/SpiritCard';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GeneralArchiver } from '../assets/scripts/core/services/GeneralArchiver';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { clanMembersOf, clanStatsOf } from '../assets/scripts/core/systems/ClanTier';
import { compactAncestorOf, compactFootprint, farAncestorUids, isCardCompactable } from '../assets/scripts/core/systems/CompactAncestor';
import type { SeasonAdvanceResult } from '../assets/scripts/core/systems/GameClock';

const card = (uid: string, father = '', extra: Partial<SpiritCard> = {}) => ({
    uid,
    name: uid,
    faction: 'wei',
    characterCategory: 'other',
    rarityTier: 'common',
    gene_refs: ['g1', 'g2', 'g3'],
    ep_snapshot: 80,
    ageAtDeath: 60,
    deathContext: { battleId: '', cause: 'age', season: 1, year: 1 },
    archivedAt: 0,
    lifecycleClass: 'C',
    resurrectionEligible: false,
    parentUids: [father, ''],
    birthYear: 1,
    deathYear: 61,
    archiveSnapshot: { padding: 'x'.repeat(500) },
    ...extra,
} as unknown as SpiritCard);

/** a1 是活人父親，往上 a2…a6，a5 與 a6 在 4 代窗外 */
const chain = () => [card('a1', 'a2'), card('a2', 'a3'), card('a3', 'a4'), card('a4', 'a5'), card('a5', 'a6'), card('a6')];
const living = { id: 'kid', fatherId: 'a1' };

async function seeded(cards: SpiritCard[]): Promise<{ archiver: GeneralArchiver; adapter: MemoryStorageAdapter }> {
    const adapter = new MemoryStorageAdapter();
    await adapter.set('spirit_cards', cards);
    await adapter.set('generals_archive_l5', cards.map((c) => ({ id: c.uid, genes: [{ id: 'low', level: 1 }, { id: 'top', level: 5 }, { id: 'mid', level: 3 }] })));
    return { archiver: new GeneralArchiver(adapter), adapter };
}

export function createCompactAncestorSuite(): TestSuite {
    const suite = new TestSuite('CompactAncestor');

    suite.test('上溯超過 4 代才算遠祖；走得到窗內的不算', () => {
        assert.equals('a5,a6', farAncestorUids([living], chain()).sort().join(','));
        assert.equals('a6', farAncestorUids([living, { id: 'other', fatherId: 'a2' }], chain()).join(','));
        assert.equals(0, farAncestorUids([], chain()).length);
    });

    suite.test('沒有子孫的旁支與親子成環不會被壓縮或卡死', () => {
        assert.equals(0, farAncestorUids([living], [card('a1'), card('lonely')]).length);
        assert.equals(0, farAncestorUids([{ id: 'x', fatherId: 'y' }], [card('y', 'z'), card('z', 'y')]).length);
    });

    suite.test('史實、可復活、正式英靈卡、灌注過的卡不壓縮', () => {
        assert.isTrue(isCardCompactable(card('n')));
        assert.isFalse(isCardCompactable(card('n', '', { lifecycleClass: 'A' as SpiritCard['lifecycleClass'] })));
        assert.isFalse(isCardCompactable(card('n', '', { resurrectionEligible: true })));
        assert.isFalse(isCardCompactable(card('n', '', { isSpiritRelic: true })));
        assert.isFalse(isCardCompactable(card('n', '', { bloodlineLevel: 1 })));
    });

    suite.test('摘要只留展示欄位，因子挑最高 2 項；L5 沒有時退回快照', () => {
        const record = compactAncestorOf(card('a5', 'a6'), { genes: [{ id: 'low', level: 1 }, { id: 'top', level: 5 }, { id: 'mid', level: 3 }] });
        assert.equals('top,mid', record.factors.join(','));
        assert.equals('a6', record.parentUids[0]);
        assert.equals(80, record.ep);
        assert.equals('g1,g2', compactAncestorOf(card('a5')).factors.join(','));
        assert.isTrue(JSON.stringify(record).length < JSON.stringify(card('a5', 'a6')).length / 3);
    });

    suite.test('壓縮後快照與 L5 少了遠祖；重跑不重複，再滑出的人接得上', async () => {
        const { archiver, adapter } = await seeded(chain());
        const first = await archiver.compactFarAncestors([living]);
        assert.equals('a5,a6', first.compactedUids.sort().join(','));
        assert.equals(4, (await archiver.getAllSpiritCards()).length);
        assert.equals(4, ((await adapter.get<unknown[]>('generals_archive_l5')) ?? []).length);
        assert.equals(2, (await archiver.getCompactAncestors()).length);
        assert.equals('top,mid', (await archiver.getCompactAncestors())[0].factors.join(','));
        assert.equals(0, (await archiver.compactFarAncestors([living])).compactedUids.length);
        // kid 過世後窗往下移一代，a4 也滑出去
        await adapter.set('spirit_cards', [...(await archiver.getAllSpiritCards()), card('kid', 'a1')]);
        const later = await archiver.compactFarAncestors([{ id: 'kid2', fatherId: 'kid' }]);
        assert.equals('a4', later.compactedUids.join(','));
        const footprint = compactFootprint(await archiver.getCompactAncestors());
        assert.equals(3, footprint.count);
        assert.equals(footprint.bytes, later.bytes);
    });

    suite.test('正式英靈卡留在快照，不會被壓掉', async () => {
        const cards = chain();
        cards[4] = card('a5', 'a6', { isSpiritRelic: true });
        const { archiver } = await seeded(cards);
        assert.equals('a6', (await archiver.compactFarAncestors([living])).compactedUids.join(','));
        assert.isTrue(!!(await archiver.getSpiritCard('a5')));
    });

    suite.test('門閥統計的代數與人數不因壓縮減少', async () => {
        const { archiver } = await seeded(chain());
        const roster = [{ id: 'kid', name: 'kid', fatherId: 'a1', age: 20, ep: 80 } as unknown as GeneralConfig];
        const before = clanStatsOf(clanMembersOf(roster, await archiver.getAllSpiritCards()));
        await archiver.compactFarAncestors([living]);
        const after = clanStatsOf(clanMembersOf(roster, await archiver.getAllSpiritCards(), undefined, await archiver.getCompactAncestors()));
        assert.equals(before.generations, after.generations);
        assert.equals(before.ep75, after.ep75);
        assert.equals(before.adultDescendants, after.adultDescendants);
    });

    suite.test('只有跨年的季結才壓縮', async () => {
        const { adapter } = await seeded(chain());
        const service = new LegacyService(adapter);
        const roster = [{ id: 'kid', name: 'kid', fatherId: 'a1', age: 20 } as unknown as GeneralConfig];
        const advance = (yearEnded: boolean) => ({ previous: { currentSeason: 1, currentYear: 1 }, yearEnded } as unknown as SeasonAdvanceResult);
        assert.equals(undefined, (await service.settleSeason(roster, advance(false), [])).settlement.compactedAncestorUids);
        assert.equals(0, (await service.getArchiver().getCompactAncestors()).length);
        const settled = await service.settleSeason(roster, advance(true), []);
        assert.equals('a5,a6', (settled.settlement.compactedAncestorUids ?? []).sort().join(','));
    });

    return suite;
}
