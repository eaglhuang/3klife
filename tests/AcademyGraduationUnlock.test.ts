/**
 * AcademyGraduationUnlock — 學府結業接線與不軟鎖（PROG-2-9211）
 *
 * 用真的 GameSession + AcademyFlowController 走 入學 → 36 回合 → 結業，驗證：
 * 結業後學府紀錄清除、外界時間可推一季、結果寫回武將（可出戰、不再出現在入學名單）、
 * 舊存檔（紀錄已 graduated 卻未結算）進大廳補結業、結業時查無武將不留孤兒紀錄。
 *
 * Unity 對照：PlayMode 整合測試，跑完整的「修業 → 結算 → 回主城」。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import { sessionAcademyRig, type AcademyApiRig } from './AcademyApiRig';
import { completedTurnsOf } from '../assets/scripts/ui/core/AcademyApi';
import type { OccupancyQueryResult, TaskQueryResult } from '../assets/scripts/shared/api/ApiCommands';
import type { ApiResult } from '../assets/scripts/shared/api/ApiProtocol';
import { AcademyFlowController, type AcademyFlowDeps } from '../assets/scripts/ui/core/AcademyFlowController';
import { checkDeployable } from '../assets/scripts/core/systems/BattleRoster';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { AcademyStateSnapshot } from '../assets/scripts/core/systems/nurture/AcademyTypes';

interface FakeHost { node: { active: boolean } }

const CHILD = { id: 'kid', name: '少主', age: 15, gender: 'M', fate: { choice: 'accept' }, str: 30, lea: 30, int: 30, pol: 30, cha: 30, vitality: 100, maxVitality: 100 } as unknown as GeneralConfig;

function makeSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([{ ...CHILD }]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.4);
    return session;
}

interface Rig { ctrl: AcademyFlowController<FakeHost>; session: GameSession; graduated: AcademyStateSnapshot[]; academy: AcademyApiRig }

/** autoGraduate=false 重現舊版：沒人接 onGraduated */
async function rig(session: GameSession, autoGraduate = true): Promise<Rig> {
    const graduated: AcademyStateSnapshot[] = [];
    let tokens = 1;
    const academy = sessionAcademyRig(session, createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 }));
    const deps: AcademyFlowDeps<FakeHost> = {
        mountEnrollHost: async () => ({ node: { active: true } }),
        mountSessionHost: async () => ({ node: { active: true } }),
        apply: () => undefined,
        bringToFront: () => undefined,
        lookup: () => (key: string) => key,
        toast: () => undefined,
        roster: () => session.roster as never,
        nurtureBlockReasons: () => [],
        loadMentorCards: async () => [],
        lockedMentorIds: () => [],
        tokensLeft: () => tokens,
        consumeToken: () => { if (tokens <= 0) return false; tokens -= 1; return true; },
        refundToken: () => { tokens += 1; },
        clanUuid: () => session.clanUuid,
        clanPrestigeTier: () => 0,
        admissionTurn: () => session.gameTime.totalSeasonsElapsed,
        api: academy.api,
        isActive: () => session.isAcademyActive,
        ...(autoGraduate ? {
            // 與 LobbyScene 相同的接法：結業交給 session.graduateFromAcademy（寫回武將並清紀錄）
            onGraduated: (snap: Readonly<AcademyStateSnapshot>) => {
                graduated.push(snap);
                void session.graduateFromAcademy(snap.childId, snap);
            },
        } : {}),
    };
    const ctrl = new AcademyFlowController<FakeHost>(deps);
    await ctrl.mount();
    return { ctrl, session, graduated, academy };
}

/** 一路修業到結業（含清談事件、打斷點） */
async function playToGraduation(r: Rig, afterTurn?: () => Promise<void>): Promise<void> {
    for (let guard = 0; guard < 400 && r.ctrl.mode !== 'graduated'; guard++) {
        if (r.ctrl.mode === 'interrupt') { await r.ctrl.resolveInterrupt(); continue; }
        const g = r.session.academyRecord!.committed.gimmickStatePayload as { debatePending?: boolean; eventPending?: string | null; handCards?: unknown[] };
        if (g.eventPending) { await r.ctrl.act({ actionType: 'GIMMICK_INTERACT', selectedOptionId: 'EVENT:A' }); continue; }
        if (g.debatePending) {
            const hand = (g.handCards ?? []).length;
            await r.ctrl.act({ actionType: 'GIMMICK_INTERACT', selectedOptionId: hand === 0 ? 'SKIP' : `DEBATE:${Array.from({ length: Math.min(3, hand) }, (_, k) => k).join(',')}` });
            continue;
        }
        await r.ctrl.act({ actionType: 'TRAIN', targetStat: 'int' });
        await r.ctrl.confirm();
        if (afterTurn) await afterTurn();
    }
}

async function academyTasks(r: Rig): Promise<TaskQueryResult['tasks']> {
    const res = await r.academy.bundle.api.query<TaskQueryResult>('task.query', { taskKind: 'academy' });
    return (res as Extract<ApiResult<TaskQueryResult>, { ok: true }>).result.tasks;
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export function createAcademyGraduationUnlockSuite(): TestSuite {
    const suite = new TestSuite('AcademyGraduationUnlock (結業接線不軟鎖 PROG-2-9211)');

    suite.test('入學到結業：onGraduated 被呼叫，紀錄清除，外界時間解凍可推一季', async () => {
        const session = makeSession(new MemoryStorageAdapter());
        const r = await rig(session);
        await r.ctrl.openEnroll();
        assert.isTrue(await r.ctrl.enroll());
        assert.isTrue(session.isAcademyActive);
        let frozen = false;
        try { await session.advanceSeason(); } catch { frozen = true; }
        assert.isTrue(frozen, '修業中凍結外界時間');
        await playToGraduation(r);
        await settle();
        assert.equals(1, r.graduated.length, 'onGraduated 恰好呼叫一次');
        assert.equals(null, session.academyRecord, '結業後修業紀錄清除');
        assert.isFalse(session.isAcademyActive);
        const before = session.gameTime.totalSeasonsElapsed;
        await session.advanceSeason();
        assert.equals(before + 1, session.gameTime.totalSeasonsElapsed, '結業後推進一季成功');
    });

    suite.test('結業結果寫回武將：五維、評級、可出戰；不再出現在入學名單', async () => {
        const session = makeSession(new MemoryStorageAdapter());
        const r = await rig(session);
        assert.isFalse(checkDeployable(session.roster[0]).eligible, '結業前有宿命的子嗣不能出戰');
        await r.ctrl.openEnroll();
        await r.ctrl.enroll();
        await playToGraduation(r);
        await settle();
        const kid = session.roster.find((g) => g.id === 'kid') as GeneralConfig & { graduationRating?: string };
        assert.isTrue((kid.int ?? 0) > 30, '訓練的智力寫回');
        assert.isTrue(['S', 'A', 'B', 'C'].indexOf(kid.graduationRating ?? '') >= 0, '評級寫回');
        assert.isTrue(checkDeployable(kid).eligible, '結業後可出戰');
        assert.equals(0, r.ctrl.enrollChildren().length, '結業的武將不再可入學');
    });

    suite.test('結業寫回與清紀錄同一次存檔：重新讀檔沒有殘留紀錄、評級仍在', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = makeSession(adapter);
        const r = await rig(session);
        await r.ctrl.openEnroll();
        await r.ctrl.enroll();
        await playToGraduation(r);
        await settle();
        const loaded = makeSession(new MemoryStorageAdapter());
        loaded.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await loaded.load());
        assert.equals(null, loaded.academyRecord);
        assert.isTrue(((loaded.roster[0] as GeneralConfig & { graduationRating?: string }).graduationRating ?? '').length > 0);
    });

    suite.test('舊存檔：紀錄已 graduated 但沒結算，進大廳補結業後寫回並解鎖', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = makeSession(adapter);
        const r1 = await rig(first, false);
        await r1.ctrl.openEnroll();
        await r1.ctrl.enroll();
        await playToGraduation(r1); // 沒人接 onGraduated：重現舊版行為，紀錄停在 graduated
        await settle();
        assert.isTrue(!!first.academyRecord?.committed.graduated);
        await first.save();
        // 重新讀檔（等同玩家重開遊戲）
        const second = makeSession(new MemoryStorageAdapter());
        second.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await second.load());
        assert.isTrue(!!second.academyRecord?.committed.graduated, '讀檔後仍是未結算');
        const r2 = await rig(second);
        assert.isTrue(r2.ctrl.settlePendingGraduation(), '大廳掛載後補結業');
        await settle();
        assert.equals(null, second.academyRecord);
        assert.isTrue(checkDeployable(second.roster[0]).eligible);
        await second.advanceSeason();
    });

    suite.test('結業時查無武將：只清掉孤兒紀錄，回傳 null，不卡住', async () => {
        const session = makeSession(new MemoryStorageAdapter());
        const r = await rig(session, false);
        await r.ctrl.openEnroll();
        await r.ctrl.enroll();
        await playToGraduation(r);
        const snap = session.academyRecord!.committed;
        session.setRosterStore(new InMemoryRosterStore([]));
        assert.equals(null, await session.graduateFromAcademy('kid', snap));
        assert.equals(null, session.academyRecord);
    });

    suite.test('沒有 graduated 紀錄時 settlePendingGraduation 不動作', async () => {
        const session = makeSession(new MemoryStorageAdapter());
        const r = await rig(session);
        assert.isFalse(r.ctrl.settlePendingGraduation());
        await r.ctrl.openEnroll();
        await r.ctrl.enroll();
        assert.isFalse(r.ctrl.settlePendingGraduation(), '修業進行中不補結業');
        assert.isTrue(session.isAcademyActive);
    });

    suite.test('A0 改走共通 API：任務步數＝已完成回合、占用 refId 與任務共用、結業後占用釋放（PROG-2-9215）', async () => {
        const session = makeSession(new MemoryStorageAdapter());
        const r = await rig(session);
        await r.ctrl.openEnroll();
        assert.isTrue(await r.ctrl.enroll());
        const [task] = await academyTasks(r);
        assert.equals('ACTIVE', task.state);
        assert.equals(0, task.step);
        const held = (await r.academy.bundle.api.query<OccupancyQueryResult>('occupancy.query', { personId: 'kid' }) as { result: OccupancyQueryResult }).result.records;
        assert.equals(1, held.length, '同一個孩子只有一筆學府占用（OCC 與 QST 不各登記一筆）');
        assert.equals(`quest:${task.qid}`, held[0].refId);
        let turns = 0;
        await playToGraduation(r, async () => {
            turns += 1;
            const [now] = await academyTasks(r);
            const record = session.academyRecord;
            if (record) assert.equals(completedTurnsOf(record.committed), now.step, `第 ${turns} 回合後任務步數對齊`);
        });
        await settle();
        const [done] = await academyTasks(r);
        assert.equals(36, done.step);
        assert.equals('GRADUATE', done.pendingGate, '結業閘門留給 9191 清除與 settle');
        assert.equals(0, (await r.academy.bundle.api.query<OccupancyQueryResult>('occupancy.query', { personId: 'kid' }) as { result: OccupancyQueryResult }).result.records.length, '結業清紀錄後占用釋放');
    });

    suite.test('舊存檔（沒有任務、占用是 academy:<id>）進修業畫面時補開任務並對齊步數（PROG-2-9215）', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = makeSession(adapter);
        const r1 = await rig(first);
        await r1.ctrl.openEnroll();
        await r1.ctrl.enroll();
        for (let i = 0; i < 3; i++) { await r1.ctrl.act({ actionType: 'TRAIN', targetStat: 'int' }); await r1.ctrl.confirm(); }
        // 模擬 9189 時期存檔：抹掉任務狀態，占用改回舊 refId
        const saved = JSON.parse(JSON.stringify(first.academyRecord)) as NonNullable<typeof first.academyRecord>;
        const second = makeSession(new MemoryStorageAdapter());
        second.setAcademyRecord(saved);
        const r2 = await rig(second);
        await r2.ctrl.openFromMenu();
        const tasks = await academyTasks(r2);
        assert.equals(1, tasks.length);
        assert.equals(completedTurnsOf(saved.committed), tasks[0].step);
        assert.equals('ACTIVE', tasks[0].state);
    });

    return suite;
}
