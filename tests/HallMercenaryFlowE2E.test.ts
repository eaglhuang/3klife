/**
 * HallMercenaryFlowE2E.test.ts — 大廳委任（1006～1008）與傭兵插畫階段（MERC-08）的多步流程（QA，PROG-2-0661）
 *
 * Unity 對照：像在 PlayMode 裡連續委任多個任務、推進日與季、存讀檔、再開新局，
 * 看委任的互斥規則、插畫階段的單調性與存讀檔、開新局歸零有沒有一路守住。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { MercenarySaveBundle } from '../assets/scripts/core/systems/MercenarySaveModel';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { sys } from 'cc';

function general(id: string, str: number): GeneralConfig {
    return {
        id, name: id, faction: 'player', gender: '男', age: 25, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str, int: 60, lea: 60, pol: 50, cha: 50, luk: 40, careerClass: 'Warrior', role: 'Combat', rarityTier: 'epic',
    } as unknown as GeneralConfig;
}

function newSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    session.startNewGame(7);
    return session;
}

const task = (id: string) => ({ taskId: id, AI_Assign_Enabled: true });

const TRIAL: MercenarySaveBundle = {
    mercenaries: [{ uid: 'merc-1', daysLeft: 6, bond: 0, status: 'Trial', generalId: 'gen-1', affection: 0 }],
    upkeep: [{ uid: 'merc-1', status: 'Active', unpaidDays: 0, frozenDaysLeft: 0 }],
    cooldowns: [],
};

export function createHallMercenaryFlowE2ESuite(): TestSuite {
    const suite = new TestSuite('HallMercenaryFlowE2E (大廳委任×傭兵插畫 多步流程 PROG-2-0661)');

    suite.test('委任互斥：同任務不重複、同武將不同時接兩個任務、武將用完即拒；存讀檔後規則不變', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter);
        await a.addGenerals([general('g-a', 90), general('g-b', 60)]);

        const first = await a.autoAssignHallMission(task('T1'), 'y1');
        assert.isTrue(first.ok);
        const dup = await a.autoAssignHallMission(task('T1'), 'y1');
        assert.isFalse(dup.ok);
        const second = await a.autoAssignHallMission(task('T2'), 'y1');
        assert.isTrue(second.ok);
        if (first.ok === true && second.ok === true) assert.notEquals(first.record.generalId, second.record.generalId);
        const none = await a.autoAssignHallMission(task('T3'), 'y1');
        assert.isFalse(none.ok);

        await a.save();
        const b = newSession(adapter);
        assert.isTrue(await b.load());
        assert.equals(2, b.listHallAssignRecords().length);
        assert.isFalse((await b.autoAssignHallMission(task('T1'), 'y1')).ok, '讀檔後仍視為委任中');
        assert.isFalse((await b.autoAssignHallMission(task('T3'), 'y1')).ok, '讀檔後武將仍忙碌');
    });

    suite.test('結清委任後該任務與武將釋放；開新局清空委任紀錄', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const a = newSession(new MemoryStorageAdapter());
        await a.addGenerals([general('g-a', 90)]);
        assert.isTrue((await a.autoAssignHallMission(task('T1'), 'y1')).ok);
        assert.isFalse((await a.autoAssignHallMission(task('T2'), 'y1')).ok, '唯一武將忙碌中');
        assert.isTrue(await a.settleHallAssign('T1', 'success', 'y1'));
        assert.isTrue((await a.autoAssignHallMission(task('T2'), 'y1')).ok, '結清後武將可再委任');
        a.startNewGame(9);
        assert.equals(0, a.listHallAssignRecords().length);
    });

    suite.test('傭兵插畫階段：逐日推進只進不退、不超過 5，存讀檔保留，開新局歸零', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter);
        a.setMercenaries(TRIAL);
        let last = 1;
        for (let day = 0; day < 6; day++) {
            await a.advanceMercenaryDay();
            const stage = a.mercenaries.mercenaries[0].illustrationStage ?? 1;
            assert.isTrue(stage >= last && stage <= 5, `第 ${day + 1} 日階段 ${stage} 需單調且 ≤5`);
            last = stage;
        }
        assert.isTrue(last > 1, '好感 60 時插畫階段應已推進');
        await a.save();
        const b = newSession(adapter);
        assert.isTrue(await b.load());
        assert.equals(last, b.mercenaries.mercenaries[0].illustrationStage);
        b.startNewGame(9);
        assert.equals(0, b.mercenaries.mercenaries.length);
    });

    return suite;
}
