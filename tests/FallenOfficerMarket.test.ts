/**
 * FallenOfficerMarket.test.ts — 滅亡國殘餘武將流入傭兵市場（PROG-2-1848）
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { createRivalWorld, type NationState, type RivalWorld } from '../assets/scripts/core/systems/RivalNations';
import { fallenOfficerOrigins, rivalRulerIds } from '../assets/scripts/core/systems/FallenOfficerMarket';
import type { RivalOfficer } from '../assets/scripts/core/systems/RivalOfficers';
import { fallenOwnerLabel } from '../assets/scripts/ui/core/MercenaryPanelController';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const officer = (generalId: string): RivalOfficer => ({
    generalId, age: 30, vitality: 100, baseStats: { str: 50, int: 50, lea: 50, pol: 50, cha: 50 },
});

function worldWith(id: string, patch: Partial<NationState>): RivalWorld {
    const world = createRivalWorld();
    return { nations: world.nations.map((n) => (n.id === id ? { ...n, ...patch } : n)) };
}

const WEI = { officers: [officer('cao-cao'), officer('zhang-liao'), officer('xu-zhu')], tallies: [] };
const RULERS = { wei: 'cao-cao' };

function sessionWith(world: RivalWorld, roster: GeneralConfig[] = []): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    (session as unknown as { _rivals: RivalWorld })._rivals = world;
    (session as unknown as { _rivalRulerIds: Record<string, string> })._rivalRulerIds = RULERS;
    return session;
}

export function createFallenOfficerMarketSuite(): TestSuite {
    const suite = new TestSuite('FallenOfficerMarket');

    suite.test('名冊第一位視為君主', () => {
        const rulers = rivalRulerIds({ nations: { wei: { generals: ['cao-cao', 'xu-zhu'], tallies: [] }, empty: { generals: [], tallies: [] } } });
        assert.equals('cao-cao', rulers.wei);
        assert.isTrue(rulers.empty === undefined);
    });

    suite.test('滅亡國的殘部入市，君主不入市', () => {
        const origins = fallenOfficerOrigins(worldWith('wei', { fallen: true, officerRoster: WEI }).nations, RULERS);
        assert.equals(2, origins.size);
        assert.equals('wei', origins.get('zhang-liao'));
        assert.isFalse(origins.has('cao-cao'));
    });

    suite.test('未滅亡或復興的國家不入市', () => {
        assert.equals(0, fallenOfficerOrigins(worldWith('wei', { officerRoster: WEI }).nations, RULERS).size);
    });

    suite.test('君主不明時整國略過，不把君主放進市場', () => {
        assert.equals(0, fallenOfficerOrigins(worldWith('wei', { fallen: true, officerRoster: WEI }).nations, {}).size);
    });

    suite.test('舊存檔沒有名冊的滅亡國不入市', () => {
        const world = worldWith('wei', { fallen: true, officerRoster: undefined });
        assert.equals(0, fallenOfficerOrigins(world.nations, RULERS).size);
    });

    suite.test('Session：招募池合併名將池與殘部且不重複', () => {
        const session = sessionWith(worldWith('wei', { fallen: true, officerRoster: WEI }));
        const pool = session.trialHirePoolIds(['guan-yu', 'xu-zhu']);
        assert.equals('guan-yu,xu-zhu,zhang-liao', pool.join(','));
    });

    suite.test('Session：未滅亡時招募池等於名將池', () => {
        const session = sessionWith(worldWith('wei', { officerRoster: WEI }));
        assert.equals('guan-yu', session.trialHirePoolIds(['guan-yu']).join(','));
    });

    suite.test('Session：已擁有的武將與模板不入池', () => {
        const owned = { id: 'uid-1', templateId: 'zhang-liao', name: '張遼' } as unknown as GeneralConfig;
        const session = sessionWith(worldWith('wei', { fallen: true, officerRoster: WEI }), [owned]);
        assert.equals('xu-zhu', session.trialHirePoolIds([]).join(','));
    });

    suite.test('Session：已是傭兵與冷卻中的武將不入池', () => {
        const session = sessionWith(worldWith('wei', { fallen: true, officerRoster: WEI }));
        const bundle = session.mercenaries;
        (session as unknown as { _mercenaries: unknown })._mercenaries = {
            ...bundle,
            mercenaries: [{ uid: 'm1', generalId: 'zhang-liao' }],
            cooldowns: [{ uid: 'm2', generalId: 'xu-zhu', availableOnDay: 99 }],
        };
        assert.equals(0, session.trialHirePoolIds([]).length);
    });

    suite.test('原主欄：殘部顯示舊部，其餘維持暫定字', () => {
        const session = sessionWith(worldWith('wei', { fallen: true, officerRoster: WEI }));
        assert.equals('魏舊部', fallenOwnerLabel(session.fallenOfficerNationName('xu-zhu')));
        assert.equals('原主未定', fallenOwnerLabel(session.fallenOfficerNationName('guan-yu')));
        assert.equals('原主未定', fallenOwnerLabel(session.fallenOfficerNationName(undefined)));
    });

    return suite;
}
