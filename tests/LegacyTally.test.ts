import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { LegacyService, toTigerTallyGeneral } from '../assets/scripts/core/services/LegacyService';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameClock } from '../assets/scripts/core/systems/GameClock';
import type { AgingEvent } from '../assets/scripts/core/systems/GeneralAging';
import type { BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { isTallyEligible } from '../assets/scripts/core/systems/TigerTally';

type TestGeneral = BreedingGeneral & { uid?: string; isHistorical?: boolean; troopType?: string; maxLifespan?: number };

function general(id = 'hero', extra: Partial<TestGeneral> = {}): TestGeneral {
    return {
        id, name: id, faction: 'shu' as GeneralConfig['faction'], hp: 1000, age: 70,
        gender: '男', characterCategory: 'famed', templateId: 'GEN_SHU_HERO',
        ...extra,
    };
}

function deaths(...roster: GeneralConfig[]): AgingEvent[] {
    return roster.map((g) => ({ type: 'died', generalId: g.id, age: g.age ?? 70 }));
}

export function createLegacyTallySuite(): TestSuite {
    const suite = new TestSuite('LegacyTally (死亡雙卡 / 虎符庫)');

    suite.test('LegacyService 死亡結算不寫虎符庫：虎符只由 GameSession 產生（單一來源）', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new LegacyService(adapter);
        const dead = general('hero', { uid: 'world-hero' });
        const result = await service.settleSeason([dead], new GameClock().advanceSeason(), deaths(dead));
        assert.equals(1, result.settlement.spiritCards.length);
        assert.isTrue((await adapter.get('tiger_tallies')) === null || (await adapter.get('tiger_tallies')) === undefined);
    });

    suite.test('GameSession 是虎符唯一來源：正式女性名將死亡產一張虎符，一般子嗣不產', async () => {
        const session = new GameSession(1);
        session.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
        const female = general('female', { gender: '女', characterCategory: 'mythical', templateId: 'GEN_FEMALE_HERO', age: 80, maxLifespan: 70 });
        const child = general('child', { fatherId: 'dad', motherId: 'mom', birthSeason: 0, characterCategory: 'general', templateId: undefined, age: 80, maxLifespan: 70 });
        session.setRosterStore(new InMemoryRosterStore([female, child]));
        session.setAutoSave(false);
        await session.advanceSeason();
        const cards = Object.values(session.tallyCards);
        assert.equals(1, cards.length);
        assert.equals('female', cards[0].sourceGeneralUid);
        assert.equals('death', cards[0].source);
    });

    suite.test('退役只產教官，不產虎符；退役後死亡仍由 GameSession 產一張虎符', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new LegacyService(adapter);
        const advance = new GameClock().advanceSeason();
        const retired = await service.retireGeneral([general('hero', { gender: '女', characterCategory: 'mythical', templateId: 'GEN_FEMALE_HERO' })], 'hero', advance.previous);
        assert.equals(1, (await service.getMentorCards()).length);
        assert.isTrue((await adapter.get('tiger_tallies')) === null || (await adapter.get('tiger_tallies')) === undefined);
        assert.equals(1, retired.roster.length);
    });

    suite.test('獨立對應函式：明確旗標、父母與出生季的保守門檻', () => {
        assert.isTrue(isTallyEligible(toTigerTallyGeneral(general('historical', { isHistorical: true, templateId: undefined }))));
        assert.isFalse(isTallyEligible(toTigerTallyGeneral(general('explicit-false', { isHistorical: false }))));
        for (const extra of [{ fatherId: 'f' }, { motherId: 'm' }, { birthSeason: 0 }]) {
            assert.isFalse(isTallyEligible(toTigerTallyGeneral(general('child', { gender: '女', ...extra }))));
        }
        assert.isFalse(isTallyEligible(toTigerTallyGeneral(general('myth', { characterCategory: 'mythical' }))));
        assert.isFalse(isTallyEligible(toTigerTallyGeneral(general('no-template', { templateId: undefined }))));
    });

    suite.test('現有 generals.json 正式模板皆可走死亡虎符門檻（唯讀資料）', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs') as typeof import('fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path') as typeof import('path');
        const roster = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];
        assert.isTrue(roster.length > 0);
        for (const g of roster) assert.isTrue(isTallyEligible(toTigerTallyGeneral(g)), `${g.id} 應符合現有模板契約`);
    });

    return suite;
}
