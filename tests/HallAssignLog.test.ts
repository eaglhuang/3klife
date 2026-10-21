/**
 * HallAssignLog.test.ts — 大廳任務 AI 委任與回看紀錄的存讀（HALL-05 第二段，PROG-2-1006）
 *
 * Unity 對照：像 PlayMode 測試把委任服務接到存檔：派 AI 去接任務、存檔、換新 Session 讀檔，
 * 看紀錄還在、結算能接上，且沒存檔就強關時紀錄不會憑空出現。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { sys } from 'cc';

function general(id: string, rarityTier: string): GeneralConfig {
    return {
        id, name: id, faction: 'player', gender: '男', age: 25, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 70, int: 60, lea: 60, pol: 50, cha: 50, luk: 40, careerClass: 'Warrior', role: 'Combat', rarityTier,
    } as unknown as GeneralConfig;
}

function newSession(adapter: MemoryStorageAdapter, autoSave = false): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(autoSave);
    session.startNewGame(7);
    return session;
}

const OPEN_TASK = { taskId: 'HALL-T1', AI_Assign_Enabled: true };

export function createHallAssignLogSuite(): TestSuite {
    const suite = new TestSuite('HallAssignLog (大廳委任紀錄存讀)');

    suite.test('未開啟委任：拒絕，不寫紀錄', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const session = newSession(new MemoryStorageAdapter());
        await session.addGenerals([general('g-a', 'epic')]);
        const result = await session.autoAssignHallMission({ taskId: 'HALL-T1', AI_Assign_Enabled: false }, '第1年春');
        assert.isFalse(result.ok);
        assert.equals(0, session.listHallAssignRecords().length);
    });

    suite.test('沒有可選武將：拒絕，不寫紀錄', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const session = newSession(new MemoryStorageAdapter());
        const result = await session.autoAssignHallMission(OPEN_TASK, '第1年春');
        assert.isFalse(result.ok);
        assert.equals(0, session.listHallAssignRecords().length);
    });

    suite.test('委任後存檔、換新 Session 讀檔：紀錄還在，結算接得上', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter);
        await a.addGenerals([general('g-a', 'epic'), general('g-b', 'rare')]);
        const result = await a.autoAssignHallMission(OPEN_TASK, '第1年春');
        assert.isTrue(result.ok);
        await a.save();

        const b = newSession(adapter);
        assert.isTrue(await b.load());
        const records = b.listHallAssignRecords('HALL-T1');
        assert.equals(1, records.length);
        assert.equals('第1年春', records[0].assignedAt);
        assert.isTrue(records[0].generalId === 'g-a' || records[0].generalId === 'g-b');
        assert.equals(undefined, records[0].outcome);

        assert.isTrue(await b.settleHallAssign('HALL-T1', 'success', '第1年夏'));
        await b.save();
        const c = newSession(adapter);
        assert.isTrue(await c.load());
        assert.equals('success', c.listHallAssignRecords('HALL-T1')[0].outcome);
        assert.equals(false, await c.settleHallAssign('HALL-T1', 'failure', '第2年春'), '已結算的紀錄不能再結算');
    });

    suite.test('委任後強關（未存檔）：讀回沒有紀錄；開啟自動存檔時委任即存檔', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter);
        await a.addGenerals([general('g-a', 'epic')]);
        await a.save();
        await a.autoAssignHallMission(OPEN_TASK, '第1年春');
        const crashed = newSession(adapter);
        assert.isTrue(await crashed.load());
        assert.equals(0, crashed.listHallAssignRecords().length);

        const auto = newSession(adapter, true);
        assert.isTrue(await auto.load());
        await auto.autoAssignHallMission(OPEN_TASK, '第1年夏');
        const reloaded = newSession(adapter);
        assert.isTrue(await reloaded.load());
        assert.equals(1, reloaded.listHallAssignRecords().length);
    });

    return suite;
}
