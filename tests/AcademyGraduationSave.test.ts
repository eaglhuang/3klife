/**
 * AcademyGraduationSave — 學府結業寫回名冊並存檔（PROG-2-1909）
 *
 * Unity 對照：EditMode Test 驗證存檔往返。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { AcademyStateSnapshot } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import { applyAcademyGraduation } from '../assets/scripts/core/systems/nurture/AcademyGraduation';

const CHILD = { id: 'child-a', name: '少主', str: 30, lea: 30, int: 30, pol: 30, cha: 30, learnedTraits: ['TRT_OLD'] } as unknown as GeneralConfig;

function snapshot(overrides: Partial<AcademyStateSnapshot> = {}): AcademyStateSnapshot {
    return {
        graduated: true, childId: 'child-a',
        stats: { str: 210, lea: 180, int: 150, pol: 120, cha: 140 },
        learnedTactics: ['TAC_LIAODI_JIXIAN'], learnedTraits: ['TRT_GANGYI_GUOGAN', 'TRT_OLD', 'TRT_GANGYI_GUOGAN'],
        ...overrides,
    } as unknown as AcademyStateSnapshot;
}

function makeSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([{ ...CHILD }]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.4);
    return session;
}

export function createAcademyGraduationSaveSuite(): TestSuite {
    const suite = new TestSuite('AcademyGraduationSave (結業特質落存檔 PROG-2-1909)');

    suite.test('結業特質寫進 learnedTraits，重複與既有的不再加', () => {
        const result = applyAcademyGraduation(CHILD, snapshot());
        assert.equals('TRT_GANGYI_GUOGAN', result.traits.join(','));
        assert.equals('TRT_OLD,TRT_GANGYI_GUOGAN', result.general.learnedTraits!.join(','));
        assert.equals('TRT_OLD', CHILD.learnedTraits!.join(','));
    });

    suite.test('GameSession 結業後自動存檔，讀檔仍保有五維、戰法、特質', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = makeSession(adapter);
        const result = await first.graduateFromAcademy('child-a', snapshot());
        assert.isTrue(result !== null);
        const second = makeSession(new MemoryStorageAdapter());
        second.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await second.load());
        const g = second.roster.find((x) => x.id === 'child-a')!;
        assert.equals(210, g.str);
        assert.isTrue((g.learnedTactics ?? []).indexOf('TAC_LIAODI_JIXIAN') >= 0);
        assert.equals('TRT_OLD,TRT_GANGYI_GUOGAN', (g.learnedTraits ?? []).join(','));
    });

    suite.test('查無武將回傳 null；未結業拋錯且名冊不變', async () => {
        const session = makeSession(new MemoryStorageAdapter());
        assert.equals(null, await session.graduateFromAcademy('nobody', snapshot()));
        let threw = false;
        try { await session.graduateFromAcademy('child-a', snapshot({ graduated: false })); } catch { threw = true; }
        assert.isTrue(threw);
        assert.equals(30, session.roster.find((x) => x.id === 'child-a')!.str);
    });

    return suite;
}
