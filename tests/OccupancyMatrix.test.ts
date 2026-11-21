/**
 * OccupancyMatrix.test.ts — OCC 擴充 nursing／mentorAssign 與互斥矩陣契約（PROG-2-9442 F2；doc_spec_1241 第 3.5 節，TC-FAM-02、03）
 *
 * 矩陣規則在 data/occupancy-matrix.json；這裡把 JSON 讀進來逐格驗證「規格要求的放行與擋下」，
 * 規則一改而規格沒改，契約測試就會紅。另涵蓋 fail-fast、占用並存（acquire）與 occupancy.* 命令的 activity 查詢。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { isApiFail } from '../assets/scripts/shared/api/ApiProtocol';
import {
    OccupancyMatrixError, kindsCompatible, parseOccupancyMatrix, type OccupancyMatrixV1,
} from '../assets/scripts/shared/occupancy/OccupancyMatrix';
import { OccupancyService } from '../assets/scripts/shared/occupancy/OccupancyService';
import { OccupancyError, type OccupancyRecord } from '../assets/scripts/shared/occupancy/OccupancyTypes';

const rawMatrix = (): Record<string, unknown> => JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data/occupancy-matrix.json'), 'utf8')) as Record<string, unknown>;
const matrix = (): OccupancyMatrixV1 => parseOccupancyMatrix(rawMatrix());

function hero(id: string): GeneralConfig {
    return { id, name: id, faction: 'shu', hp: 1000, str: 60, int: 60, lea: 60, pol: 60, cha: 60, careerClass: 'Warrior' } as unknown as GeneralConfig;
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

function allowed(svc: OccupancyService, personId: string, activity: string): boolean {
    return svc.checkAssign(personId, activity).allowed;
}

export function createOccupancyMatrixSuite(): TestSuite {
    const suite = new TestSuite('OccupancyMatrix (OCC 擴充 nursing／mentorAssign 與互斥矩陣 PROG-2-9442)');

    suite.test('occupancy-matrix.json 完整可載入；可寫入登記表的種類含 nursing、mentorAssign', () => {
        const m = matrix();
        assert.isTrue(!!m.rules.nursing && !!m.rules.mentorAssign && !!m.rules.academy);
        assert.equals('sortie', m.activities[0]);
    });

    suite.test('矩陣缺欄位／規則不一致 fail-fast，並一次列出全部問題', () => {
        const base = rawMatrix();
        const noRules = { ...base };
        delete noRules.rules;
        try { parseOccupancyMatrix(noRules); assert.isTrue(false, '缺 rules 應丟錯'); } catch (e) { assert.isTrue(e instanceof OccupancyMatrixError); }
        const noKindActivity = { ...base };
        delete noKindActivity.kindActivity;
        try { parseOccupancyMatrix(noKindActivity); assert.isTrue(false, '缺 kindActivity 應丟錯'); } catch (e) { assert.isTrue(e instanceof OccupancyMatrixError); }
        const noNursing = { ...base, rules: { ...(base.rules as Record<string, unknown>) } };
        delete (noNursing.rules as Record<string, unknown>).nursing;
        try { parseOccupancyMatrix(noNursing); assert.isTrue(false, '可寫入種類缺規則應丟錯'); } catch (e) { assert.isTrue((e as OccupancyMatrixError).issues.join('|').indexOf('nursing') >= 0); }
        const bad = {
            ...base,
            rules: { ...(base.rules as Record<string, unknown>), nursing: { blocks: ['sortie', 'ghost'], allows: ['sortie'] }, ghost: { blocks: [], allows: [] } },
        };
        try {
            parseOccupancyMatrix(bad);
            assert.isTrue(false, '應丟錯');
        } catch (e) {
            const issues = (e as OccupancyMatrixError).issues.join('|');
            assert.isTrue(issues.indexOf('ghost') >= 0 && issues.indexOf('同時在 blocks 與 allows') >= 0, issues);
        }
        try { parseOccupancyMatrix(null); assert.isTrue(false, 'null 應丟錯'); } catch (e) { assert.isTrue(e instanceof OccupancyMatrixError); }
    });

    suite.test('契約：nursing 擋出征、傭兵、貿易、派遣；放行太守、不離城的大廳任務、低風險家業、教官指派、守城（規格 3.5 節；PM 11/21）', () => {
        const svc = new OccupancyService({ matrix: matrix() });
        svc.acquire({ personId: 'mom', kind: 'nursing', refId: 'nurse:baby1', since: 4, until: 8 });
        for (const blockedActivity of ['sortie', 'mercenary', 'trade', 'hallDispatch']) assert.isFalse(allowed(svc, 'mom', blockedActivity), `nursing 應擋 ${blockedActivity}`);
        for (const okActivity of ['gov', 'hallMission', 'estateLowRisk', 'mentorAssign', 'defend']) assert.isTrue(allowed(svc, 'mom', okActivity), `nursing 應放行 ${okActivity}`);
        const out = svc.checkAssign('mom', 'sortie');
        assert.equals('nursing', out.blockedBy!.kind);
        expectCode(() => svc.assertAssignable('mom', 'sortie'), 'CONFLICT');
        svc.assertAssignable('mom', 'gov');
    });

    suite.test('契約：mentorAssign 擋出征、太守、大廳任務、歷練；榮養位（estate）放行；教官期間不能出征', () => {
        const svc = new OccupancyService({ matrix: matrix() });
        svc.acquire({ personId: 'coach', kind: 'mentorAssign', refId: 'mentor:1' });
        for (const blockedActivity of ['sortie', 'gov', 'hallMission', 'adventure']) assert.isFalse(allowed(svc, 'coach', blockedActivity), `mentorAssign 應擋 ${blockedActivity}`);
        assert.isTrue(allowed(svc, 'coach', 'estate'));
        assert.isFalse(allowed(svc, 'coach', 'mercenary'), '沒明列放行的活動一律擋');
    });

    suite.test('TC-FAM-02：待產（medical 轉接器）可任家業、不可任傭兵團、不可出征；哺乳母親出征在指派當下被擋、太守通過', () => {
        const pregnant: OccupancyRecord[] = [{ personId: 'mom', kind: 'medical', refId: 'pregnancy', since: 0, until: null }];
        const svc = new OccupancyService({ matrix: matrix(), readers: { medical: () => pregnant } });
        assert.isTrue(allowed(svc, 'mom', 'estate'));
        assert.isFalse(allowed(svc, 'mom', 'mercenary'));
        assert.isFalse(allowed(svc, 'mom', 'sortie'));
        assert.isTrue(allowed(svc, 'mom', 'gov'), '待產可任太守／內政（PM 11/21）');
        assert.isTrue(allowed(svc, 'mom', 'hallMission'), '待產可接不離城的大廳任務（PM 11/21）');
        assert.isFalse(allowed(svc, 'mom', 'hallDispatch'));
        // 出生後母乳方式：登記 nursing（待產轉接器已清掉）
        const born = new OccupancyService({ matrix: matrix() });
        born.acquire({ personId: 'mom', kind: 'nursing', refId: 'nurse:baby1', since: 2 });
        expectCode(() => born.assertAssignable('mom', 'sortie'), 'CONFLICT');
        born.assertAssignable('mom', 'gov');
    });

    suite.test('TC-FAM-03：非母乳方式 1 季後解除（until 到期由宿主釋放後恢復出征）；乳母方式不登記 nursing', () => {
        const svc = new OccupancyService({ matrix: matrix() });
        svc.acquire({ personId: 'mom', kind: 'nursing', refId: 'nurse:baby1', since: 2, until: 3 });
        assert.isFalse(allowed(svc, 'mom', 'sortie'));
        assert.isTrue(svc.release({ personId: 'mom', kind: 'nursing', refId: 'nurse:baby1' }));
        assert.isTrue(allowed(svc, 'mom', 'sortie'));
        // 乳母方式：沒有登記任何占用，母親照常可出征
        assert.equals(0, svc.query('mom').length);
        assert.isTrue(allowed(svc, 'mom', 'sortie'));
        // 換哺育方式＝釋放再重寫，until 改寫
        svc.acquire({ personId: 'mom', kind: 'nursing', refId: 'nurse:baby1', since: 4, until: 8 });
        svc.release({ personId: 'mom', kind: 'nursing', refId: 'nurse:baby1' });
        const again = svc.acquire({ personId: 'mom', kind: 'nursing', refId: 'nurse:baby1', since: 4, until: 5 });
        assert.equals(5, again.record.until);
    });

    suite.test('占用並存契約：nursing 可與太守、教官指派並存；其餘（傭兵、派遣）互斥；教官指派與太守互斥；學府全互斥（維持 9207 行為）', () => {
        const m = matrix();
        const withReaders = (kind: 'governance' | 'mercenary' | 'dispatch'): OccupancyService => new OccupancyService({ matrix: m, readers: { [kind]: () => [rec('p')] } });
        const gov = withReaders('governance');
        assert.isTrue(gov.acquire({ personId: 'p', kind: 'nursing', refId: 'n' }).acquired, '哺乳可兼太守');
        expectCode(() => withReaders('mercenary').acquire({ personId: 'p', kind: 'nursing', refId: 'n' }), 'CONFLICT');
        expectCode(() => withReaders('dispatch').acquire({ personId: 'p', kind: 'nursing', refId: 'n' }), 'CONFLICT');
        expectCode(() => withReaders('governance').acquire({ personId: 'p', kind: 'mentorAssign', refId: 'm' }), 'CONFLICT');
        expectCode(() => withReaders('governance').acquire({ personId: 'p', kind: 'academy', refId: 'a' }), 'CONFLICT');
        const both = new OccupancyService({ matrix: m });
        both.acquire({ personId: 'q', kind: 'nursing', refId: 'n' });
        assert.isTrue(both.acquire({ personId: 'q', kind: 'mentorAssign', refId: 'm' }).acquired, '哺乳可同時當教官');
        expectCode(() => both.acquire({ personId: 'q', kind: 'academy', refId: 'a' }), 'CONFLICT');
    });

    suite.test('kindsCompatible 對稱：兩個方向問答案一致', () => {
        const m = matrix();
        const kinds = ['academy', 'mentorAssign', 'nursing', 'governance', 'hallMission', 'dispatch', 'mercenary', 'expedition', 'medical'] as const;
        for (const a of kinds) for (const b of kinds) assert.equals(kindsCompatible(m, a, b), kindsCompatible(m, b, a), `${a}/${b} 不對稱`);
    });

    suite.test('沒載入矩陣時維持 MVP 全互斥；checkAssign 任何占用都擋；活動名稱不在表內丟 INVALID', () => {
        const plain = new OccupancyService({ readers: { governance: () => [rec('g')] } });
        assert.isFalse(plain.checkAssign('g', 'anything').allowed);
        assert.isTrue(plain.checkAssign('free', 'anything').allowed);
        const withMatrix = new OccupancyService({ matrix: matrix() });
        expectCode(() => withMatrix.checkAssign('x', 'flying'), 'INVALID');
        withMatrix.setMatrix(null);
        assert.isTrue(withMatrix.checkAssign('x', 'flying').allowed);
    });

    suite.test('設定與程式分離：改 JSON 就改結果（把 nursing 的 sortie 改成放行，出征立刻放行）', () => {
        const raw = rawMatrix() as { rules: { nursing: { blocks: string[]; allows: string[] } } };
        raw.rules.nursing.blocks = raw.rules.nursing.blocks.filter((a) => a !== 'sortie');
        raw.rules.nursing.allows = [...raw.rules.nursing.allows, 'sortie'];
        const svc = new OccupancyService({ matrix: parseOccupancyMatrix(raw) });
        svc.acquire({ personId: 'mom', kind: 'nursing', refId: 'n' });
        assert.isTrue(allowed(svc, 'mom', 'sortie'));
    });

    suite.test('命令層：occupancy.acquire 接受 nursing、衝突回 E330；occupancy.query 帶 activity 回能否指派與擋下的占用', async () => {
        const s = new GameSession(7);
        s.enrollGenerals([hero('mom'), hero('coach')]);
        s.configureOccupancyMatrix(rawMatrix());
        const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
        bundle.setOccupancyHost(s.occupancyHost);
        const api = bundle.api;
        const acquired = await api.cmd<{ acquired: boolean }>('occupancy.acquire', { personId: 'mom', kind: 'nursing', refId: 'nurse:b1', since: 2, until: 4 }, { idemKey: 'm:1' });
        assert.isTrue(!isApiFail(acquired) && acquired.result.acquired);
        const sortie = await api.query<{ assign?: { allowed: boolean; blockedBy?: { kind: string } } }>('occupancy.query', { personId: 'mom', activity: 'sortie' });
        assert.isTrue(!isApiFail(sortie) && sortie.result.assign!.allowed === false && sortie.result.assign!.blockedBy!.kind === 'nursing');
        const gov = await api.query<{ assign?: { allowed: boolean } }>('occupancy.query', { personId: 'mom', activity: 'gov' });
        assert.isTrue(!isApiFail(gov) && gov.result.assign!.allowed === true);
        const noActivity = await api.query<{ assign?: unknown }>('occupancy.query', { personId: 'mom' });
        assert.isTrue(!isApiFail(noActivity) && noActivity.result.assign === undefined);
        const onlyActivity = await api.query('occupancy.query', { activity: 'sortie' });
        assert.isTrue(isApiFail(onlyActivity));
        const unknown = await api.query('occupancy.query', { personId: 'mom', activity: 'flying' });
        assert.isTrue(isApiFail(unknown));
        const academy = await api.cmd('occupancy.acquire', { personId: 'mom', kind: 'academy', refId: 'academy:mom' }, { idemKey: 'm:2' });
        assert.isTrue(isApiFail(academy) && academy.errorCode === 'E330');
        const coach = await api.cmd<{ acquired: boolean }>('occupancy.acquire', { personId: 'coach', kind: 'mentorAssign', refId: 'mentor:1' }, { idemKey: 'm:3' });
        assert.isTrue(!isApiFail(coach) && coach.result.acquired);
        const mentorSortie = await api.query<{ assign?: { allowed: boolean } }>('occupancy.query', { personId: 'coach', activity: 'sortie' });
        assert.isTrue(!isApiFail(mentorSortie) && mentorSortie.result.assign!.allowed === false);
    });

    suite.test('存檔往返：nursing 登記隨存檔保存', async () => {
        const storage = new MemoryStorageAdapter();
        const s = new GameSession(8);
        s.setSaveService(new PlayerSaveService(storage));
        s.enrollGenerals([hero('mom')]);
        s.configureOccupancyMatrix(rawMatrix());
        s.occupancyHost.service.acquire({ personId: 'mom', kind: 'nursing', refId: 'nurse:b1', since: 1, until: 3 });
        await s.save();
        const loaded = new GameSession(8);
        loaded.setSaveService(new PlayerSaveService(storage));
        assert.isTrue(await loaded.load());
        const snap = loaded.occupancyHost.service.snapshot();
        assert.equals('mom:nursing:3', snap.map((r) => `${r.personId}:${r.kind}:${r.until}`).join(','));
    });

    return suite;
}
