import { assert, TestSuite } from './TestRunner';
import { Faction } from '../assets/scripts/shared/CommonEnums';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { SpiritCard } from '../assets/scripts/core/models/SpiritCard';
import type { BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { GeneralArchiver } from '../assets/scripts/core/services/GeneralArchiver';
import { PendingDeleteStore } from '../assets/scripts/core/services/PendingDeleteStore';
import { BranchCompactor } from '../assets/scripts/core/services/BranchCompactor';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameClock } from '../assets/scripts/core/systems/GameClock';
import type { AgingEvent, AgingGeneral } from '../assets/scripts/core/systems/GeneralAging';
import { GameSession, InMemoryRosterStore, GAME_SESSION_EVENTS } from '../assets/scripts/core/managers/GameSession';

type TestGeneral = BreedingGeneral & AgingGeneral;

function general(id: string, extra: Partial<TestGeneral> = {}): TestGeneral {
    return { id, name: id, faction: Faction.Player, hp: 1000, age: 80, gender: '男',
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
        maxLifespan: 70, vitality: 100, maxVitality: 100,
        characterCategory: 'famed', templateId: 'GEN_SHU_HERO', ...extra };
}
function death(...roster: GeneralConfig[]): AgingEvent[] {
    return roster.map(g => ({ type: 'died', generalId: g.id, age: g.age ?? 80 }));
}

export function createSpiritRelicSuite(): TestSuite {
    const suite = new TestSuite('SpiritRelic (英靈資格與快照分流)');
    suite.test('名將與正式女性名將死亡：快照標記、正式英靈與虎符', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new LegacyService(adapter);
        const roster = [general('hero'), general('female', { gender: '女', characterCategory: 'mythical' })];
        const result = await service.settleSeason(roster, new GameClock().advanceSeason(), death(...roster));
        assert.equals(2, result.settlement.spiritCards.length);
        assert.equals(2, result.settlement.archivedSnapshots!.length);
        assert.equals(2, result.settlement.tigerTallies!.length);
        const stored = (await adapter.get<SpiritCard[]>('spirit_cards'))!;
        assert.isTrue(stored.every(card => card.isSpiritRelic === true));
        assert.isTrue(result.settlement.spiritCards.every(card => card.isSpiritRelic === true));
    });
    suite.test('一般子嗣即使殘留名將模板：保留庫內快照，不發雙卡', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new LegacyService(adapter);
        const child = general('child', { fatherId: 'dad', motherId: 'mom', birthSeason: 0 });
        const result = await service.settleSeason([child], new GameClock().advanceSeason(), death(child));
        assert.equals(0, result.settlement.spiritCards.length);
        assert.equals(0, result.settlement.tigerTallies!.length);
        assert.equals(1, result.settlement.archivedSnapshots!.length);
        assert.isFalse(result.settlement.archivedSnapshots![0].isSpiritRelic === true);
        assert.equals('child', (await adapter.get<SpiritCard[]>('spirit_cards'))![0].uid);
        assert.isTrue(await service.getArchiver().getArchivedGeneral('child') !== null);
    });
    suite.test('GameSession 混合死亡：只廣播名將英靈卡，兩人皆歸檔', async () => {
        const session = new GameSession(1);
        const service = new LegacyService(new MemoryStorageAdapter());
        const cards: SpiritCard[] = [];
        session.setLifecycle(service);
        session.setRosterStore(new InMemoryRosterStore([general('hero'), general('child', { fatherId: 'dad' })]));
        session.setEventEmitter({ emit: (name, payload) => {
            if (name === GAME_SESSION_EVENTS.SpiritCardCreated) cards.push(payload as SpiritCard);
        } });
        session.setAutoSave(false);
        const result = await session.advanceSeason();
        assert.equals(2, result.lifecycle!.archivedSnapshots!.length);
        assert.equals(1, cards.length);
        assert.equals('hero', cards[0].uid);
        assert.isTrue(cards[0].isSpiritRelic === true);
    });
    suite.test('退役只產教官；退役名將死亡仍發雙卡', async () => {
        const service = new LegacyService(new MemoryStorageAdapter());
        const advance = new GameClock().advanceSeason();
        const retired = await service.retireGeneral([general('hero')], 'hero', advance.previous);
        assert.equals(0, (await service.getArchiver().getAllSpiritCards()).length);
        assert.equals(0, (await service.getTigerTallies()).length);
        const result = await service.settleSeason(retired.roster, advance, death(...retired.roster));
        assert.equals(1, result.settlement.spiritCards.length);
        assert.equals(1, result.settlement.tigerTallies!.length);
        assert.equals(1, (await service.getMentorCards()).length);
    });
    suite.test('archive 預設仍只建快照；舊資料不自動變成正式卡', async () => {
        const adapter = new MemoryStorageAdapter();
        const archiver = new GeneralArchiver(adapter, new PendingDeleteStore(adapter));
        const card = await archiver.archive({ id: 'old', name: 'old', faction: 'player', isHistorical: true },
            { battleId: '', cause: 'age', season: 1, year: 1 });
        assert.equals(undefined, card.isSpiritRelic);
        assert.isTrue(await archiver.getArchivedGeneral('old') !== null);
        const read = await new LegacyService(adapter).getArchiver().getSpiritCard('old');
        assert.equals(undefined, read!.isSpiritRelic);
    });
    suite.test('BranchCompactor 仍使用一般角色快照的基因與稀有度', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new LegacyService(adapter);
        const root = general('root', { templateId: undefined, characterCategory: 'civilian',
            genes: [{ id: 'gene-proof' }], rarityTier: 'epic' });
        await service.settleSeason([root], new GameClock().advanceSeason(), death(root));
        const summary = await new BranchCompactor(adapter).compactBranch('root');
        assert.equals('gene-proof', summary.geneHighlights[0]);
        assert.equals('epic', summary.lineageNodes[0].rarityTier);
        assert.equals('root', (await service.getArchiver().getSpiritCard('root'))!.uid);
    });
    suite.test('同季重跑不重複且已決定的 true / false 不翻轉', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new LegacyService(adapter);
        const advance = new GameClock().advanceSeason();
        const roster = [general('hero'), general('child', { fatherId: 'dad' })];
        await service.settleSeason(roster, advance, death(...roster));
        const retry = await service.settleSeason(roster, advance, death(...roster, roster[0]));
        assert.equals(2, retry.settlement.archivedSnapshots!.length);
        assert.equals(1, retry.settlement.spiritCards.length);
        assert.equals(2, (await service.getArchiver().getAllSpiritCards()).length);
        // 重跑輸入若缺失／新增身份資料，既有標記仍須保留。
        await service.settleSeason([general('hero', { fatherId: 'new-parent' }), general('child')],
            advance, death(...roster));
        assert.equals(true, (await service.getArchiver().getSpiritCard('hero'))!.isSpiritRelic);
        assert.equals(false, (await service.getArchiver().getSpiritCard('child'))!.isSpiritRelic);
    });
    return suite;
}
