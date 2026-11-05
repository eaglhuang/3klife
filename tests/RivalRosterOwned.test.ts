/**
 * RivalRosterOwned.test.ts — 玩家永久擁有的武將從他國名冊移除（PROG-2-1849）
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { createRivalWorld, dropOwnedRivalOfficers, normalizeRivalWorld, type NationState, type RivalWorld } from '../assets/scripts/core/systems/RivalNations';
import type { RivalNationRoster, RivalOfficer } from '../assets/scripts/core/systems/RivalOfficers';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const officer = (generalId: string): RivalOfficer => ({
    generalId, age: 30, vitality: 100, baseStats: { str: 50, int: 50, lea: 50, pol: 50, cha: 50 },
});

const SHU: RivalNationRoster = {
    officers: [officer('liu-bei'), officer('guan-yu'), officer('zhao-yun')],
    tallies: [{ id: 't1', quality: 'R', troopType: 'infantry', star: 1, starExp: 0, equippedGeneralId: 'guan-yu' }],
};

function worldWith(id: string, patch: Partial<NationState>): RivalWorld {
    const world = createRivalWorld();
    return { nations: world.nations.map((n) => (n.id === id ? { ...n, ...patch } : n)) };
}

const shu = (world: RivalWorld): NationState => world.nations.find((n) => n.id === 'shu') as NationState;
const ids = (world: RivalWorld): string => (shu(world).officerRoster?.officers ?? []).map((o) => o.generalId).join(',');

function sessionWith(roster: GeneralConfig[]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    (session as unknown as { _rivals: RivalWorld })._rivals = worldWith('shu', { officerRoster: SHU });
    return session;
}

const tick = (session: GameSession): void => {
    (session as unknown as { _tickRivals(): unknown })._tickRivals();
};

export function createRivalRosterOwnedSuite(): TestSuite {
    const suite = new TestSuite('RivalRosterOwned');

    suite.test('移除擁有的武將並卸下虎符', () => {
        const next = dropOwnedRivalOfficers(worldWith('shu', { officerRoster: SHU }), new Set(['guan-yu']));
        assert.equals('liu-bei,zhao-yun', ids(next));
        assert.isTrue(shu(next).officerRoster?.tallies[0].equippedGeneralId === null);
    });

    suite.test('沒有要移除時維持原物件', () => {
        const world = worldWith('shu', { officerRoster: SHU });
        assert.isTrue(shu(dropOwnedRivalOfficers(world, new Set(['cao-cao']))) === shu(world));
    });

    suite.test('沒有名冊的舊存檔勢力不受影響', () => {
        const world = createRivalWorld();
        assert.isTrue(shu(dropOwnedRivalOfficers(world, new Set(['guan-yu']))).officerRoster === undefined);
    });

    suite.test('移除後的名冊可存讀檔', () => {
        const next = dropOwnedRivalOfficers(worldWith('shu', { officerRoster: SHU }), new Set(['guan-yu']));
        assert.equals('liu-bei,zhao-yun', ids(normalizeRivalWorld(JSON.parse(JSON.stringify(next)))));
    });

    suite.test('Session：換季時移除名冊內的武將（比對 id 與模板 id）', () => {
        const session = sessionWith([
            { id: 'guan-yu', name: '關羽' } as unknown as GeneralConfig,
            { id: 'uid-9', templateId: 'zhao-yun', name: '趙雲' } as unknown as GeneralConfig,
        ]);
        tick(session);
        assert.equals('liu-bei', ids(session.rivals));
    });

    suite.test('Session：已結義傭兵移除，試用中不移除', () => {
        const session = sessionWith([]);
        (session as unknown as { _mercenaries: unknown })._mercenaries = {
            ...session.mercenaries,
            mercenaries: [{ uid: 'm1', generalId: 'guan-yu', status: 'Bonded' }, { uid: 'm2', generalId: 'zhao-yun', status: 'Trial' }],
        };
        tick(session);
        assert.equals('liu-bei,zhao-yun', ids(session.rivals));
    });

    return suite;
}
