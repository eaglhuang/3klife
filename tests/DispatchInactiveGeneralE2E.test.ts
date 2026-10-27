/**
 * DispatchInactiveGeneralE2E.test.ts — 退役／老死武將不可被派遣（PROG-2-0686）
 *
 * Unity 對照：像已被刪除（或封存）的角色，不該還出現在「可派遣清單」裡。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { sys } from 'cc';

function gen(id: string, age: number): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age, hp: 900, str: 80, int: 60, lea: 70, pol: 50, cha: 50, luk: 40, ep: 70,
        maxLifespan: 70, vitality: 100, maxVitality: 100, careerClass: 'Warrior', role: 'Combat', rarityTier: 'epic', templateId: `${id}-1`,
    } as unknown as GeneralConfig;
}

function build(roster: GeneralConfig[]): GameSession {
    const s = new GameSession(5);
    s.setRosterStore(new InMemoryRosterStore(roster));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    s.setAutoSave(false);
    return s;
}

export function createDispatchInactiveGeneralE2ESuite(): TestSuite {
    const suite = new TestSuite('DispatchInactiveGeneralE2E (PROG-2-0686 離開的武將不可派遣)');

    suite.test('退役武將不在可派遣清單，點列派遣不會選到他', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const s = build([gen('cao', 66), gen('zhao', 28)]);
        s.startNewGame(3);
        await s.retireGeneral('cao');
        assert.isFalse(s.dispatchIdleGenerals(0).some((g) => g.id === 'cao'), '退役者不在清單');
        const r = s.dispatchJobById('PATROL', 0);
        assert.isTrue(r.ok);
        assert.equals('zhao', r.generalName ?? '');
    });

    suite.test('老死武將不在可派遣清單，也不能被指定派遣', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const s = build([gen('liu', 69.75), gen('zhao', 28)]);
        s.startNewGame(3);
        for (let i = 0; i < 4; i++) await s.advanceSeason();
        assert.isFalse(s.dispatchIdleGenerals(0).some((g) => g.id === 'liu'), '老死者不在清單');
        const direct = s.dispatchJobById('PATROL', 0, 'liu');
        assert.isFalse(direct.ok);
    });

    return suite;
}
