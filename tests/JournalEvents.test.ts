/**
 * PROG-2-1175：武將日誌寫入點（戰鬥、出生、退役）與事件模板
 */

import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { buildJournalEvent, JOURNAL_EVENT_RULES, JOURNAL_UNKNOWN_NAME } from '../assets/scripts/core/systems/JournalEvents';
import type { BreedingBirthRecord } from '../assets/scripts/core/systems/BreedingBirthRecord';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function person(id: string, name: string, age = 30): GeneralConfig {
    return {
        id, name, faction: 'shu', gender: '男', age, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, careerClass: 'Warrior', role: 'Combat', status: 'alive',
    } as unknown as GeneralConfig;
}

async function build(roster: GeneralConfig[]): Promise<GameSession> {
    const adapter = new MemoryStorageAdapter();
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(new LegacyService(adapter));
    session.setRandomSource(() => 0.99);
    await session.load();
    return session;
}

function birth(father: string, mother: string): BreedingBirthRecord {
    return {
        session: { Father_UID: father, Mother_UID: mother, Breeding_Mode: 'Peace_Lineage', EP_Estimate: 80, Oracle_Hints: [] },
        child: { UID: 'child-1', Father_ID: father, Mother_ID: mother, Age: 0, Status: 'Mystery', EP_Actual: 80, Is_Daqi: false, Omen_Type: 'none' },
    } as unknown as BreedingBirthRecord;
}

export function createJournalEventsSuite(): TestSuite {
    const suite = new TestSuite('JournalEvents (PROG-2-1175 日誌寫入點)');

    suite.test('buildJournalEvent：套用類別、重要度與模板，名字以頓號串接', () => {
        const input = buildJournalEvent('BATTLE_WIN', [{ uid: 'a', name: '張飛' }, { uid: 'b', name: '關羽' }], 3, '0190-01-01T00:00:00')!;
        assert.equals('BATTLE_WIN-3', input.entryId);
        assert.equals('BATTLE', input.category);
        assert.equals(JOURNAL_EVENT_RULES.BATTLE_WIN.priority, input.priority);
        assert.equals('張飛、關羽出戰告捷。', input.summary);
        assert.equals('a,b', input.relatedGeneralUids.join(','));
    });

    suite.test('buildJournalEvent：沒有武將不寫入，空名用無名將', () => {
        assert.isTrue(buildJournalEvent('DISPATCH_FAIL', [], 1, '0190-01-01T00:00:00') === null);
        assert.equals(`${JOURNAL_UNKNOWN_NAME}完成大廳任務。`, buildJournalEvent('DISPATCH_SUCCESS', [{ uid: 'x', name: ' ' }], 1, '0190-01-01T00:00:00')!.summary);
    });

    suite.test('recordBattle：勝敗寫入 BATTLE 日誌，名冊外的武將略過，和局不寫', async () => {
        const session = await build([person('zhang', '張飛'), person('guan', '關羽')]);
        await session.recordBattle(['zhang', 'demo-x'], 'player-win');
        await session.recordBattle(['guan'], 'enemy-win');
        await session.recordBattle(['guan'], 'draw');
        const battle = session.queryJournal({ category: 'BATTLE' });
        assert.equals(2, battle.length);
        assert.equals('張飛出戰告捷。|關羽出戰失利，敗退而歸。', battle.map((e) => e.summary).sort((a, b) => (a.startsWith('張') ? -1 : b.startsWith('張') ? 1 : 0)).join('|'));
        assert.equals(JSON.stringify(['zhang']), JSON.stringify(battle.find((e) => e.summary.startsWith('張飛'))!.relatedGeneralUids));
    });

    suite.test('recordBreedingBirth：寫入 GROWTH 日誌，相關武將為父母', async () => {
        const session = await build([person('liu', '劉備'), person('sun', '孫尚香')]);
        session.recordBreedingBirth(birth('liu', 'sun'));
        const growth = session.queryJournal({ category: 'GROWTH' });
        assert.equals(1, growth.length);
        assert.equals('劉備、孫尚香喜得子嗣。', growth[0].summary);
    });

    suite.test('retireGeneral：退役後仍以原名寫入 GROWTH 日誌', async () => {
        const session = await build([person('old', '黃忠', 66), person('kid', '黃敘', 3)]);
        await session.retireGeneral('old');
        const growth = session.queryJournal({ category: 'GROWTH', generalUid: 'old' });
        assert.equals(1, growth.length);
        assert.equals('黃忠解甲歸田，轉任教官。', growth[0].summary);
    });

    return suite;
}
