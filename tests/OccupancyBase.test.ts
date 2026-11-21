/**
 * OccupancyBase.test.ts — 人員占用精簡版（PROG-2-9207 OCC-M 中立版；總綱 doc_spec_1182 §12）
 *
 * 涵蓋：登記表 acquire／release 冪等、互斥（含與六處轉接器互斥）、occupancy.* 命令與 E33x 錯誤碼、
 * 修業中武將從任務牆、派遣、傭兵候選清單排除、存檔往返與舊存檔相容。
 */
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { PersistedAcademyRecord } from '../assets/scripts/core/services/GameAcademySaveStore';
import { isApiFail } from '../assets/scripts/shared/api/ApiProtocol';
import { OccupancyService } from '../assets/scripts/shared/occupancy/OccupancyService';
import { OccupancyError, type OccupancyRecord } from '../assets/scripts/shared/occupancy/OccupancyTypes';

function hero(id: string, name: string): GeneralConfig {
    return { id, name, faction: 'shu', hp: 1000, str: 60, int: 60, lea: 60, pol: 60, cha: 60, careerClass: 'Warrior' } as unknown as GeneralConfig;
}

function academyRecord(s: GameSession, childId: string, graduated = false): PersistedAcademyRecord {
    return {
        committed: {
            schemaVersion: 1, childId, graduated, clanUuid: 'clan', academyId: 'ac', prngSeedHex: '00', currentTurn: 1, energy: 100, stepIndex: 0,
            stats: { str: 1, lea: 1, int: 1, pol: 1, cha: 1 }, learnedTactics: [], learnedTraits: [], chronicles: [], interruptOptions: [],
            gimmickStatePayload: {},
        } as unknown as PersistedAcademyRecord['committed'],
        before: null, action: null, acknowledged: true,
        frozenGameTime: s.gameTime,
    } as PersistedAcademyRecord;
}

function rec(personId: string, refId = 'r'): OccupancyRecord {
    return { personId, kind: 'governance', refId, since: 0, until: null };
}

function expectCode(run: () => unknown, code: string): void {
    try {
        run();
    } catch (error) {
        assert.isTrue(error instanceof OccupancyError && error.code === code, `預期 ${code}，實際 ${(error as Error).message}`);
        return;
    }
    assert.isTrue(false, `預期丟 ${code}，但沒有丟`);
}

export function createOccupancyBaseSuite(): TestSuite {
    const suite = new TestSuite('OccupancyBase (人員占用精簡版 PROG-2-9207)');

    suite.test('acquire／release 冪等：同一筆重送不重複；release 已不存在回 false', () => {
        const svc = new OccupancyService();
        const first = svc.acquire({ personId: 'p1', kind: 'academy', refId: 'a1', since: 4 });
        assert.isTrue(first.acquired);
        const again = svc.acquire({ personId: 'p1', kind: 'academy', refId: 'a1', since: 9 });
        assert.isFalse(again.acquired);
        assert.equals(4, again.record.since);
        assert.equals(1, svc.snapshot().length);
        assert.isTrue(svc.release({ personId: 'p1', kind: 'academy', refId: 'a1' }));
        assert.isFalse(svc.release({ personId: 'p1', kind: 'academy', refId: 'a1' }));
        assert.equals(0, svc.snapshot().length);
    });

    suite.test('互斥矩陣：academy 與 mentorAssign 不可同時占同一人；同種換 refId 也衝突；衝突不改登記表', () => {
        const svc = new OccupancyService();
        svc.acquire({ personId: 'p1', kind: 'academy', refId: 'a1' });
        expectCode(() => svc.acquire({ personId: 'p1', kind: 'mentorAssign', refId: 'm1' }), 'CONFLICT');
        expectCode(() => svc.acquire({ personId: 'p1', kind: 'academy', refId: 'a2' }), 'CONFLICT');
        assert.equals(1, svc.snapshot().length);
        // 別人不受影響
        assert.isTrue(svc.acquire({ personId: 'p2', kind: 'mentorAssign', refId: 'm1' }).acquired);
        // 放掉之後可以換占用
        svc.release({ personId: 'p1', kind: 'academy', refId: 'a1' });
        assert.isTrue(svc.acquire({ personId: 'p1', kind: 'mentorAssign', refId: 'm2' }).acquired);
    });

    suite.test('六處轉接器唯讀：被轉接器占用的人不能登記，反過來登記表占用的人也出現在查詢；release 別人的 refId 丟 REF_MISMATCH', () => {
        let busy: OccupancyRecord[] = [rec('p1', 'task-1')];
        const svc = new OccupancyService({ readers: { hallMission: () => busy } });
        expectCode(() => svc.acquire({ personId: 'p1', kind: 'academy', refId: 'a1' }), 'CONFLICT');
        const q = svc.query('p1');
        assert.equals(1, q.length);
        assert.equals('hallMission', q[0].kind);
        busy = [];
        svc.acquire({ personId: 'p1', kind: 'academy', refId: 'a1' });
        assert.equals('academy', svc.query('p1')[0].kind);
        expectCode(() => svc.release({ personId: 'p1', kind: 'academy', refId: 'other' }), 'REF_MISMATCH');
        assert.equals(1, svc.snapshot().length);
        expectCode(() => svc.acquire({ personId: 'p3', kind: 'dispatch', refId: 'x' }), 'READONLY_KIND');
        expectCode(() => svc.acquire({ personId: 'p3', kind: 'nope', refId: 'x' }), 'KIND_UNKNOWN');
        expectCode(() => svc.acquire({ personId: '', kind: 'academy', refId: 'x' }), 'INVALID');
    });

    suite.test('filterFree 保序排除任何來源的占用；快照往返與壞資料過濾', () => {
        const svc = new OccupancyService({ readers: { dispatch: () => [rec('b')] } });
        svc.acquire({ personId: 'c', kind: 'academy', refId: 'a1' });
        assert.equals('a,d', svc.filterFree(['a', 'b', 'c', 'd']).join(','));
        const copy = new OccupancyService();
        copy.restore([...svc.snapshot(), { personId: '', kind: 'academy', refId: 'x' }, { personId: 'z', kind: 'governance', refId: 'y' }, null]);
        assert.equals(1, copy.snapshot().length);
        assert.equals('c', copy.snapshot()[0].personId);
    });

    suite.test('occupancy.* 命令：acquire／release 冪等、同 idemKey 回放、E330～E334 錯誤碼', async () => {
        const s = new GameSession(7);
        s.enrollGenerals([hero('g1', '甲'), hero('g2', '乙')]);
        const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
        bundle.setOccupancyHost(s.occupancyHost);
        const api = bundle.api;
        const args = { personId: 'g1', kind: 'academy', refId: 'academy:g1', since: 2 };
        const first = await api.cmd<{ acquired: boolean }>('occupancy.acquire', args, { idemKey: 'occ:1' });
        assert.isTrue(!isApiFail(first) && first.result.acquired);
        const replay = await api.cmd<{ acquired: boolean }>('occupancy.acquire', args, { idemKey: 'occ:1' });
        assert.isTrue(!isApiFail(replay) && replay.result.acquired, '同 idemKey 回放同一結果');
        const second = await api.cmd<{ acquired: boolean }>('occupancy.acquire', args, { idemKey: 'occ:2' });
        assert.isTrue(!isApiFail(second) && !second.result.acquired, '新 idemKey 重送同一筆＝冪等略過');
        const conflict = await api.cmd('occupancy.acquire', { personId: 'g1', kind: 'mentorAssign', refId: 'm1' }, { idemKey: 'occ:3' });
        assert.isTrue(isApiFail(conflict) && conflict.errorCode === 'E330');
        const unknown = await api.cmd('occupancy.acquire', { personId: 'g2', kind: 'ghost', refId: 'x' }, { idemKey: 'occ:4' });
        assert.isTrue(isApiFail(unknown) && unknown.errorCode === 'E331');
        const mismatch = await api.cmd('occupancy.release', { personId: 'g1', kind: 'academy', refId: 'other' }, { idemKey: 'occ:5' });
        assert.isTrue(isApiFail(mismatch) && mismatch.errorCode === 'E332');
        const readonly = await api.cmd('occupancy.acquire', { personId: 'g2', kind: 'dispatch', refId: 'x' }, { idemKey: 'occ:6' });
        assert.isTrue(isApiFail(readonly) && readonly.errorCode === 'E333');
        const q = await api.query<{ records: Array<{ kind: string }>; occupiedIds: string[] }>('occupancy.query', { personId: 'g1' });
        assert.isTrue(!isApiFail(q) && q.result.records.length === 1 && q.result.occupiedIds.join(',') === 'g1');
        const released = await api.cmd<{ released: boolean }>('occupancy.release', { personId: 'g1', kind: 'academy', refId: 'academy:g1' }, { idemKey: 'occ:7' });
        assert.isTrue(!isApiFail(released) && released.result.released);
        const releasedAgain = await api.cmd<{ released: boolean }>('occupancy.release', { personId: 'g1', kind: 'academy', refId: 'academy:g1' }, { idemKey: 'occ:8' });
        assert.isTrue(!isApiFail(releasedAgain) && !releasedAgain.result.released);
        bundle.setOccupancyHost(null);
        const down = await api.query('occupancy.query', {});
        assert.isTrue(isApiFail(down) && down.errorCode === 'E334');
    });

    suite.test('修業中的武將：任務牆、派遣、傭兵候選清單都排除；結業後恢復', () => {
        const s = new GameSession(8);
        s.enrollGenerals([hero('kid', '少年'), hero('zhao', '趙雲')]);
        assert.equals(2, s.dispatchIdleGenerals(0).length);
        assert.isTrue(s.trialHirePoolIds(['kid', 'x1']).indexOf('x1') >= 0);
        s.setAcademyRecord(academyRecord(s, 'kid'));
        assert.isTrue(s.isAcademyActive);
        assert.equals('academy', s.occupancyHost.service.query('kid')[0].kind);
        // 派遣
        assert.equals('zhao', s.dispatchIdleGenerals(0).map((g) => g.id).join(','));
        assert.equals(null, s.startDispatchJob({ id: 'PATROL' } as never, 'kid', 0));
        // 任務牆：事實列帶 occupied 封鎖
        const facts = s.missionGeneralFacts();
        assert.isTrue(facts.find((f) => f.id === 'kid')!.block.indexOf('occupied') >= 0);
        assert.equals(0, facts.find((f) => f.id === 'zhao')!.block.length);
        // 傭兵候選：占用者即使在候選池也被排除
        assert.isFalse(s.trialHirePoolIds(['kid', 'x1']).indexOf('kid') >= 0);
        assert.isTrue(s.trialHirePoolIds(['kid', 'x1']).indexOf('x1') >= 0);
        // 結業（紀錄清掉）後恢復
        s.setAcademyRecord(null);
        assert.equals(2, s.dispatchIdleGenerals(0).length);
        assert.equals(0, s.occupancyHost.service.snapshot().length);
    });

    suite.test('六處轉接器接到真實狀態：派遣中的武將在 occupancy 查詢出現 dispatch，且不能再登記學府', () => {
        const s = new GameSession(9);
        s.enrollGenerals([hero('zhao', '趙雲')]);
        const out = s.dispatchJobById('PATROL', 0, 'zhao');
        assert.isTrue(out.ok);
        const kinds = s.occupancyHost.service.query('zhao').map((r) => r.kind);
        assert.equals('dispatch', kinds.join(','));
        expectCode(() => s.occupancyHost.service.acquire({ personId: 'zhao', kind: 'academy', refId: 'academy:zhao' }), 'CONFLICT');
    });

    suite.test('存檔往返：登記表隨存檔保存；舊存檔缺值為空；進行中的學府讀檔後重建占用', async () => {
        const storage = new MemoryStorageAdapter();
        const s = new GameSession(10);
        s.setSaveService(new PlayerSaveService(storage));
        s.enrollGenerals([hero('kid', '少年'), hero('m1', '教官')]);
        s.occupancyHost.service.acquire({ personId: 'm1', kind: 'mentorAssign', refId: 'mentor-card-1', since: 3 });
        s.setAcademyRecord(academyRecord(s, 'kid'));
        await s.save();
        const loaded = new GameSession(10);
        loaded.setSaveService(new PlayerSaveService(storage));
        assert.isTrue(await loaded.load());
        const kinds = loaded.occupancyHost.service.snapshot().map((r) => `${r.personId}:${r.kind}`).sort().join(',');
        assert.equals('kid:academy,m1:mentorAssign', kinds);

        const legacy = new GameSession(11);
        legacy.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        legacy.enrollGenerals([hero('a', '甲')]);
        await legacy.save();
        const reloaded = new GameSession(11);
        reloaded.setSaveService((legacy as unknown as { _save: PlayerSaveService })._save);
        assert.isTrue(await reloaded.load());
        assert.equals(0, reloaded.occupancyHost.service.snapshot().length);
    });

    return suite;
}
