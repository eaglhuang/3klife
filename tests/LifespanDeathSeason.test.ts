import { assert, TestSuite } from './TestRunner';
import { preLifespanBaseline } from '../assets/scripts/core/systems/LifespanWiring';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { AgingEvent } from '../assets/scripts/core/systems/GeneralAging';

function hero(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 69.75, hp: 1000, maxLifespan: 70, ...extra } as unknown as GeneralConfig;
}

export function createLifespanDeathSeasonSuite(): TestSuite {
    const suite = new TestSuite('LifespanDeathSeason (PROG-2-0223 讀檔後季結)');

    suite.test('季結前名冊基準：只還原指定的陣亡武將，不改輸入', () => {
        const roster = [hero('a', { status: 'dead' }), hero('b', { status: 'dead' }), hero('c')];
        const baseline = preLifespanBaseline(roster, ['a', 'c']);
        assert.isTrue(baseline !== null);
        assert.isTrue(baseline![0].status !== 'dead');
        assert.equals('dead', baseline![1].status!);
        assert.isTrue(baseline![2].status !== 'dead');
        assert.equals('dead', roster[0].status!);
    });

    suite.test('沒有待季結死亡時基準為 null', () => {
        assert.isTrue(preLifespanBaseline([hero('a')], []) === null);
    });

    suite.test('讀檔後主動指令死亡進入下一次季結的死亡事件', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([hero('liu')]));
        session.setSaveService(new PlayerSaveService(adapter));
        const spent = session.spendLifespan('liu', 'breeding');
        assert.isTrue(spent !== null && spent.events.some((event) => event.type === 'died'));
        await session.save();

        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore());
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());

        let seen: AgingEvent[] = [];
        restored.setLifecycle({
            settleSeason: async (roster: GeneralConfig[], _advance: unknown, events: AgingEvent[]) => {
                seen = events;
                return { roster: roster.filter((g) => g.status !== 'dead'), settlement: { spiritCards: [] } };
            },
            retireGeneral: async () => { throw new Error('not used'); },
        } as never);
        await restored.advanceSeason();
        assert.isTrue(seen.some((event) => event.type === 'died' && event.generalId === 'liu'));
    });

    return suite;
}
