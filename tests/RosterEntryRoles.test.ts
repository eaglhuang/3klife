/**
 * RosterEntryRoles — 武將入名冊時套用職能正規化 headless 測試（PROG-2-0557）
 */
import { assert, TestSuite } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function makeGeneral(id: string, role: string): GeneralConfig {
    return { id, name: id, faction: 'player', age: 20, role } as unknown as GeneralConfig;
}

export function createRosterEntryRolesSuite(): TestSuite {
    const suite = new TestSuite('RosterEntryRoles (入名冊職能正規化 GEN-06 補強)');

    suite.test('抽卡/招募入名冊：舊職能值變成 Combat / Mentor', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        session.setRandomSource(() => 0.99);
        await session.addGenerals([makeGeneral('adv', 'Advisor'), makeGeneral('sup', 'Support')]);
        const roster = session.roster;
        const byId = new Map(roster.map((g) => [g.id, g]));
        assert.equals('Combat', byId.get('adv')?.role as string);
        assert.equals('Mentor', byId.get('sup')?.role as string);
    });

    return suite;
}
