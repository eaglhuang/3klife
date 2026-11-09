/**
 * HallSceneGambit — 軍事任務接取後，下一場戰鬥自動判定場景戰法（SCN-04，PROG-2-2103）。
 */
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { BattleTactic } from '../assets/scripts/core/config/Constants';
import { normalizePendingSceneGambit, pendingSceneGambitOfTask, resolveSceneGambit } from '../assets/scripts/core/systems/HallSceneGambit';
import { validateLobbyHub } from '../assets/scripts/core/systems/LobbyHubSchema';
import { sceneGambitNotice, sceneGambitPendingNotice } from '../assets/scripts/ui/core/HallSceneGambitText';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { sys } from 'cc';

const NIGHT_TASK = { Task_ID: 'M-NIGHT', Difficulty: 'EASY', Required_Rank: 1, Intel_Reveal_Percent: 100, Is_Accepted: false, AI_Assign_Enabled: true, Scene_Gambit: BattleTactic.NightRaid };
const PLAIN_TASK = { ...NIGHT_TASK, Task_ID: 'M-PLAIN', Scene_Gambit: undefined };

function general(id: string, int: number): GeneralConfig {
    return { id, name: id, faction: 'player', gender: '男', age: 25, hp: 1000, vitality: 100, maxVitality: 100, str: 70, int, lea: 60, pol: 50, cha: 50, luk: 40, careerClass: 'Warrior', role: 'Combat', rarityTier: 'epic' } as unknown as GeneralConfig;
}

async function newSession(adapter: MemoryStorageAdapter, int = 80): Promise<GameSession> {
    services().initialize();
    sys.localStorage.removeItem('CLIENT_DEVICE_ID');
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(true);
    session.startNewGame(7);
    await session.addGenerals([general('g-a', int)]);
    return session;
}

const PLAYER = { rankTier: 1, worldStage: 1, intel: 0 };

export function createHallSceneGambitSuite(): TestSuite {
    const suite = new TestSuite('HallSceneGambit');

    suite.test('任務資料：有效戰法才算；一般戰鬥與無效值不算', () => {
        assert.equals(BattleTactic.NightRaid, pendingSceneGambitOfTask({ Task_ID: 'x', Scene_Gambit: 'night-raid' })?.tactic);
        assert.equals(null, pendingSceneGambitOfTask({ Task_ID: 'x' }));
        assert.equals(null, pendingSceneGambitOfTask({ Task_ID: 'x', Scene_Gambit: BattleTactic.Normal }));
        assert.equals(null, pendingSceneGambitOfTask({ Task_ID: 'x', Scene_Gambit: 'nope' }));
    });

    suite.test('存檔還原：壞資料視為沒有', () => {
        assert.equals(null, normalizePendingSceneGambit(undefined));
        assert.equals(null, normalizePendingSceneGambit({ taskId: '', tactic: 'night-raid' }));
        assert.equals(null, normalizePendingSceneGambit({ taskId: 'x', tactic: 'nope' }));
        assert.equals('x', normalizePendingSceneGambit({ taskId: 'x', tactic: 'night-raid' })?.taskId);
    });

    suite.test('判定：智力未達先擋，再看情報', () => {
        const low = resolveSceneGambit(BattleTactic.NightRaid, 69, 0, 0);
        assert.equals('blocked', low.kind);
        assert.equals('int', low.kind === 'blocked' ? low.reason : '');
        const noIntel = resolveSceneGambit(BattleTactic.NightRaid, 70, 39, 0);
        assert.equals('intel', noIntel.kind === 'blocked' ? noIntel.reason : '');
    });

    suite.test('判定：達門檻依公式擲骰，邊界不含', () => {
        // 夜襲門檻 70：INT 70 成功率 50%
        assert.equals('triggered', resolveSceneGambit(BattleTactic.NightRaid, 70, 40, 0.49).kind);
        assert.equals('failed', resolveSceneGambit(BattleTactic.NightRaid, 70, 40, 0.5).kind);
    });

    suite.test('文案：三種結果都帶戰法名稱，未達門檻說明缺什麼', () => {
        assert.equals(true, sceneGambitPendingNotice(BattleTactic.NightRaid).includes('夜襲'));
        assert.equals(true, sceneGambitNotice({ kind: 'triggered', tactic: BattleTactic.NightRaid, rate: 1 }).includes('夜襲'));
        assert.equals(true, sceneGambitNotice({ kind: 'failed', tactic: BattleTactic.NightRaid, rate: 0 }).includes('失敗'));
        const blocked = sceneGambitNotice({ kind: 'blocked', tactic: BattleTactic.NightRaid, reason: 'intel', current: 3, required: 40 });
        assert.equals(true, blocked.includes('情報 3') && blocked.includes('40'));
    });

    suite.test('流程：派遣成功才記一筆，一般任務不記', async () => {
        const session = await newSession(new MemoryStorageAdapter());
        await session.dispatchHallTask(PLAIN_TASK as never, 'Military', PLAYER, 'g-a', 999);
        assert.equals(null, session.pendingSceneGambit);
        await session.dispatchHallTask(NIGHT_TASK as never, 'Military', PLAYER, 'g-a', 999);
        assert.equals(BattleTactic.NightRaid, session.pendingSceneGambit?.tactic);
    });

    suite.test('流程：沒有待發動回傳 null；未達門檻保留到下一場', async () => {
        const session = await newSession(new MemoryStorageAdapter(), 10);
        assert.equals(null, await session.resolvePendingSceneGambit('g-a', () => 0));
        await session.dispatchHallTask(NIGHT_TASK as never, 'Military', PLAYER, 'g-a', 999);
        const outcome = await session.resolvePendingSceneGambit('g-a', () => 0);
        assert.equals('blocked', outcome?.kind);
        assert.equals(BattleTactic.NightRaid, session.pendingSceneGambit?.tactic);
    });

    suite.test('流程：取消勾選不判定也不用掉，勾回後照常判定，新任務自動恢復勾選', async () => {
        const session = await newSession(new MemoryStorageAdapter());
        await session.dispatchHallTask(NIGHT_TASK as never, 'Military', PLAYER, 'g-a', 999);
        assert.isTrue(await session.setPendingSceneGambitArmed(false));
        assert.equals(null, await session.resolvePendingSceneGambit('g-a', () => 0));
        assert.equals(BattleTactic.NightRaid, session.pendingSceneGambit?.tactic);
        await session.dispatchHallTask(NIGHT_TASK as never, 'Military', PLAYER, 'g-a', 999);
        assert.equals(undefined, session.pendingSceneGambit?.disarmed);
        await session.setPendingSceneGambitArmed(false);
        await session.setPendingSceneGambitArmed(true);
        assert.equals('blocked', (await session.resolvePendingSceneGambit('g-a', () => 0))?.kind, '勾回後照常判定（測試情報為 0，未達門檻）');
        const empty = await newSession(new MemoryStorageAdapter());
        assert.isFalse(await empty.setPendingSceneGambitArmed(false), '沒有待發動時不能勾選');
    });

    suite.test('流程：存檔還原後仍在，查不到武將視為智力不足', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await newSession(adapter);
        await session.dispatchHallTask(NIGHT_TASK as never, 'Military', PLAYER, 'g-a', 999);
        await session.save();
        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore([]));
        restored.setSaveService(new PlayerSaveService(adapter));
        await restored.load();
        assert.equals('M-NIGHT', restored.pendingSceneGambit?.taskId);
        const outcome = await restored.resolvePendingSceneGambit('nobody', () => 0);
        assert.equals('int', outcome?.kind === 'blocked' ? outcome.reason : '');
    });

    suite.test('資料：夜襲敵營帶夜襲，且通過大廳資料驗證', () => {
        const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets/resources/data/lobby-hub.json'), 'utf8'));
        assert.equals(true, validateLobbyHub(raw).ok);
        const task = raw.Lobby_Hub.Mission_Boards.Military.Tasks.find((t: { Task_ID: string }) => t.Task_ID === 'M-ELITE-01');
        assert.equals(BattleTactic.NightRaid, task?.Scene_Gambit);
    });

    return suite;
}
