/**
 * AcademyHostCommands — save.read／save.write（domain=academy）與 rng.issueSeed（PROG-2-9215）
 *
 * 鎖住：寫入驗結構與補入學時鐘、落盤失敗還原並回 E190、種子與改接前字串一致、多帶欄位與不支援的範圍被擋。
 */
import { assert, TestSuite } from './TestRunner';
import { standaloneAcademyRig } from './AcademyApiRig';
import type { AcademyRecordPort, PersistedAcademyRecord } from '../assets/scripts/core/services/GameAcademySaveStore';
import { GameClock } from '../assets/scripts/core/systems/GameClock';
import { createAcademySnapshot } from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';
import { AcademyId } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import { YINGCHUAN_GIMMICK } from '../assets/scripts/core/systems/nurture/YingchuanAcademy';
import type { AcademySaveRecord } from '../assets/scripts/core/systems/nurture/AcademyAntiSLManager';
import { isApiFail, type ApiResult } from '../assets/scripts/shared/api/ApiProtocol';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import { ApiSaveGateway } from '../assets/scripts/core/api/localserver/ApiSaveGateway';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';

class FakePort implements AcademyRecordPort {
    record: PersistedAcademyRecord | null = null;
    readonly gameTime = new GameClock().state;
    getAcademyRecord(): PersistedAcademyRecord | null { return this.record; }
    setAcademyRecord(record: PersistedAcademyRecord | null): void { this.record = record; }
}

function fresh(): AcademySaveRecord {
    const committed = createAcademySnapshot({
        worldSeed: 'w', clanUuid: 'clan', childId: 'kid', academyId: AcademyId.YINGCHUAN, admissionTurn: 0,
        initialStats: { str: 30, lea: 30, int: 30, pol: 30, cha: 30 },
    }, YINGCHUAN_GIMMICK);
    return { committed, before: null, action: null, acknowledged: true };
}

const codeOf = (res: ApiResult<unknown>): string => (isApiFail(res) ? res.errorCode : 'OK');

export function createAcademyHostCommandsSuite(): TestSuite {
    const suite = new TestSuite('AcademyHostCommands (學府 save／rng 命令 PROG-2-9215)');

    suite.test('save.write 寫入後 save.read 讀得回，入學當下時鐘由權威端補上', async () => {
        const port = new FakePort();
        const rig = standaloneAcademyRig(port);
        assert.equals(null, await rig.api.loadRecord());
        await rig.api.saveRecord(fresh());
        const back = (await rig.api.loadRecord()) as PersistedAcademyRecord;
        assert.equals('kid', back.committed.childId);
        assert.isTrue(!!back.frozenGameTime, '時鐘凍結點由權威端補');
        assert.equals(1, rig.saves.count);
        await rig.api.saveRecord(null);
        assert.equals(null, port.record, 'null 代表清除');
    });

    suite.test('結構不合格或落盤失敗：回 E190，權威端維持寫入前的紀錄', async () => {
        const port = new FakePort();
        const rig = standaloneAcademyRig(port);
        await rig.api.saveRecord(fresh());
        const before = JSON.stringify(port.record);
        let threw = false;
        try { await rig.api.saveRecord({ committed: { schemaVersion: 9 } } as unknown as AcademySaveRecord); } catch { threw = true; }
        assert.isTrue(threw, '壞結構必拋');
        assert.equals(before, JSON.stringify(port.record));
        rig.fail.on = true;
        const next = fresh();
        next.committed.currentTurn = 2;
        threw = false;
        try { await rig.api.saveRecord(next); } catch { threw = true; }
        assert.isTrue(threw, '落盤失敗必拋');
        assert.equals(before, JSON.stringify(port.record), '落盤失敗後紀錄還原');
        assert.equals('E190', codeOf(await rig.bundle.api.cmd('save.write', { domain: 'academy', record: next }, { idemKey: 'k1' })));
    });

    suite.test('真 GameSession 以 ApiSaveGateway 存檔時，save.write 落盤不會把串行佇列卡死（PROG-2-9226）', async () => {
        // 正式接法（ServiceLoader）：GameSession 的存檔服務是 ApiSaveGateway；若 persist 在處理器內用 api.cmd 排隊存檔，
        // save.full 要等 save.write 結束、save.write 又在等它，之後所有命令都永遠等不到。這裡用逾時賽跑抓死結。
        const adapter = new MemoryStorageAdapter();
        const bundle = createLocalApi(new PlayerSaveService(adapter), { now: () => 1_000 });
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(new ApiSaveGateway(bundle.api));
        bundle.setAcademyHost(session.academyHost);
        const within = async <T>(work: Promise<T>): Promise<T | 'DEADLOCK'> => {
            let timer: ReturnType<typeof setTimeout> | undefined;
            const guard = new Promise<'DEADLOCK'>((resolve) => { timer = setTimeout(() => resolve('DEADLOCK'), 3000); });
            try { return await Promise.race([work, guard]); } finally { if (timer) clearTimeout(timer); }
        };
        const written = await within(bundle.api.cmd('save.write', { domain: 'academy', record: fresh() }, { idemKey: 'dl-1' }));
        assert.isTrue(written !== 'DEADLOCK', 'save.write 在 3 秒內必須回來（死結＝永遠不回）');
        assert.equals('OK', codeOf(written as ApiResult<unknown>));
        assert.isTrue((await within(bundle.api.query('save.read', { domain: 'academy' }))) !== 'DEADLOCK', '之後的命令也要排得進佇列');
        // 落盤真的寫進後端：用另一個 session 讀回來，學府紀錄在
        const reload = new GameSession();
        reload.setRosterStore(new InMemoryRosterStore([]));
        reload.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await reload.load());
        assert.equals('kid', (reload.academyHost.port.getAcademyRecord() as PersistedAcademyRecord).committed.childId);
    });

    suite.test('rng.issueSeed：回與改接前相同的世界種子字串；不支援的範圍與多帶欄位被擋', async () => {
        const rig = standaloneAcademyRig(new FakePort(), 'clan-x');
        assert.equals('3klife-world|clan-x', await rig.api.issueSeed());
        assert.equals('E001', codeOf(await rig.bundle.api.query('rng.issueSeed', { scope: 'other' })));
        assert.equals('E103', codeOf(await rig.bundle.api.query('rng.issueSeed', { scope: 'academy.world', extra: 1 })));
        assert.equals('E001', codeOf(await rig.bundle.api.query('save.read', { domain: 'nurture' })));
    });

    return suite;
}
