import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { SpiritCard } from '../assets/scripts/core/models/SpiritCard';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameClock } from '../assets/scripts/core/systems/GameClock';

function hero(id: string, templateId?: string): GeneralConfig & { isHistorical: boolean; genes: { id: string }[] } {
    return { id, name: id, faction: 'shu' as GeneralConfig['faction'], hp: 1000,
        age: 80, isHistorical: true, templateId, characterCategory: 'famed', genes: [] };
}

export function createSpiritRelicUniqueSuite(): TestSuite {
    const suite = new TestSuite('SpiritRelicUnique (模板唯一正式英靈卡)');
    const settle = (service: LegacyService, clock: GameClock, ...roster: GeneralConfig[]) =>
        service.settleSeason(roster, clock.advanceSeason(), roster.map(g =>
            ({ type: 'died' as const, generalId: g.id, age: 80 })));

    suite.test('同模板跨季死亡：第二位只留快照，（虎符由 GameSession 負責，本服務不產）', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new LegacyService(adapter);
        const clock = new GameClock();
        assert.equals(1, (await settle(service, clock, hero('first', 'GEN_A'))).settlement.spiritCards.length);
        const second = await settle(new LegacyService(adapter), clock, hero('second', 'GEN_A'));
        assert.equals(0, second.settlement.spiritCards.length);
        assert.equals(false, second.settlement.archivedSnapshots![0].isSpiritRelic);
        assert.equals(2, (await service.getArchiver().getAllSpiritCards()).length);
    });
    suite.test('不同模板同季各一張正式卡；同模板同季僅第一張', async () => {
        const service = new LegacyService(new MemoryStorageAdapter());
        const result = await settle(service, new GameClock(), hero('a', 'GEN_A'), hero('b', 'GEN_B'), hero('c', 'GEN_A'));
        assert.equals(2, result.settlement.spiritCards.length);
        assert.equals('a,b', result.settlement.spiritCards.map(c => c.uid).join(','));
        assert.equals(3, result.settlement.archivedSnapshots!.length);
    });
    suite.test('缺模板以 id 為鍵：不同 id 各自產卡，同 id 不追加', async () => {
        const service = new LegacyService(new MemoryStorageAdapter());
        const clock = new GameClock();
        const result = await settle(service, clock, hero('a'), hero('b', ''));
        assert.equals(2, result.settlement.spiritCards.length);
        await settle(service, clock, hero('a'));
        assert.equals(2, (await service.getArchiver().getAllSpiritCards()).length);
        assert.equals(true, (await service.getArchiver().getSpiritCard('a'))!.isSpiritRelic);
    });
    suite.test('同季重跑保留第一位 true 與第二位 false，不增加快照', async () => {
        const service = new LegacyService(new MemoryStorageAdapter());
        const roster = [hero('first', 'GEN_A'), hero('second', 'GEN_A')];
        const advance = new GameClock().advanceSeason();
        const events = roster.map(g => ({ type: 'died' as const, generalId: g.id, age: 80 }));
        await service.settleSeason(roster, advance, events);
        const replay = await service.settleSeason(roster.slice().reverse(), advance, events.slice().reverse());
        assert.equals(1, replay.settlement.spiritCards.length);
        assert.equals('first', replay.settlement.spiritCards[0].uid);
        assert.equals(false, (await service.getArchiver().getSpiritCard('second'))!.isSpiritRelic);
        assert.equals(2, (await service.getArchiver().getAllSpiritCards()).length);
    });
    suite.test('舊檔兩張重複正式卡保留；新死者被擋，舊死者重跑仍為 true', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new LegacyService(adapter);
        for (const id of ['old-a', 'old-b']) {
            await service.getArchiver().archive({ ...hero(id, 'GEN_A') }, { battleId: '', cause: 'age', season: 1, year: 1 });
            await service.getArchiver().markSpiritRelic(id, true);
        }
        const rebuilt = new LegacyService(adapter);
        assert.equals(2, (await rebuilt.getArchiver().getAllSpiritCards()).length);
        const result = await settle(rebuilt, new GameClock(), hero('new', 'GEN_A'), hero('old-b', 'GEN_A'));
        assert.equals('old-b', result.settlement.spiritCards[0].uid);
        const cards = (await adapter.get<SpiritCard[]>('spirit_cards'))!;
        assert.equals(3, cards.length);
        assert.equals(2, cards.filter(c => c.isSpiritRelic === true).length);
    });
    return suite;
}
