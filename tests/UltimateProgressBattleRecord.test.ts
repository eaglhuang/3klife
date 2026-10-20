/**
 * UltimateProgressBattleRecord.test.ts — 五階奧義名聲與事蹟由戰績推算（PROG-2-0741）headless 測試
 *
 * 鎖住：名聲取勝場、事蹟取里程碑數、史詩事蹟只數指定三個里程碑；
 * GameSession 覺醒時改用戰績推算的進度，沒有戰績的武將仍被擋。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { ultimateProgressFromBattleRecord } from '../assets/scripts/core/systems/UltimateProgress';
import type { BattleRecordLike } from '../assets/scripts/core/systems/BattleRecordStats';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function record(extra: Partial<BattleRecordLike> = {}): BattleRecordLike {
    return { wins: 0, losses: 0, ...extra };
}

export function createUltimateProgressBattleRecordSuite(): TestSuite {
    const suite = new TestSuite('UltimateProgressBattleRecord (戰績推算名聲與事蹟 PROG-2-0741)');

    suite.test('名聲取勝場，事蹟取里程碑數', () => {
        const progress = ultimateProgressFromBattleRecord(record({ wins: 120, milestones: ['KILL_100', 'UNDEFEATED_50'] }));
        assert.equals(120, progress.fame);
        assert.equals(2, progress.incidents);
        assert.equals(0, progress.epicIncidents);
    });

    suite.test('史詩事蹟只計萬人斬、修羅、守護之壁', () => {
        const progress = ultimateProgressFromBattleRecord(record({ milestones: ['KILL_10000', 'ASURA', 'GUARDIAN_WALL', 'KILL_100'] }));
        assert.equals(4, progress.incidents);
        assert.equals(3, progress.epicIncidents);
    });

    suite.test('沒有戰績時全部為 0', () => {
        const progress = ultimateProgressFromBattleRecord(undefined);
        assert.equals(0, progress.fame);
        assert.equals(0, progress.incidents);
        assert.equals(0, progress.epicIncidents);
    });

    suite.test('GameSession 覺醒改用戰績推算的名聲與事蹟', async () => {
        const general = {
            id: 'gen_rec',
            name: '武將',
            genes: [],
            bloodlineUltimate: { stageCap: 3, stageCurrent: 1 },
            battleRecord: record({ wins: 100, milestones: ['KILL_100'] }),
        } as unknown as GeneralConfig;
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([general]));
        const result = await session.awakenBloodlineUltimate('gen_rec');
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(2, result.awakenedStage);
    });

    suite.test('GameSession 覺醒：戰績沒有事蹟時仍被 INCIDENT_SHORT 擋下', async () => {
        const general = {
            id: 'gen_none',
            name: '武將',
            genes: [],
            bloodlineUltimate: { stageCap: 3, stageCurrent: 1 },
            battleRecord: record({ wins: 500 }),
        } as unknown as GeneralConfig;
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([general]));
        const result = await session.awakenBloodlineUltimate('gen_none');
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('INCIDENT_SHORT', result.reason);
    });

    return suite;
}
