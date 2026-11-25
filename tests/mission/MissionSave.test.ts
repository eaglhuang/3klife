// @spec-source → 通用任務存檔 v2 與 v0/v1 遷移（PROG-2-9148）：進行中任務不得遺失
import { TestSuite, assert } from '../TestRunner';
import { createEmptyMissionSave, migrateLegacyHallMissions, normalizeMissionSave } from '../../assets/scripts/core/mission/MissionSave';
import { OfflineMissionService } from '../../assets/scripts/core/mission/service/OfflineMissionService';
import { LEGACY_FLAT_BRANCH_ID } from '../../assets/scripts/core/mission/MissionTypes';
import { FakeMissionHost, mkGeneral, realBundle } from './missionTestKit';

function legacyState(templateIds: string[]) {
    const [t0, t1] = templateIds;
    return {
        seed: 4242, serial: 9,
        boards: {
            Military: [
                { id: 'HM-0001', templateId: t0, wall: 'Military', difficulty: 'EASY', title: '舊制巡防', status: 'OPEN', intel: 40, waited: true, createdSeason: 2, expireSeason: 5 },
                {
                    id: 'HM-0002', templateId: t1, wall: 'Military', difficulty: 'NORMAL', title: '舊制進行中', status: 'ACTIVE', intel: 100, createdSeason: 2, expireSeason: 6,
                    generalId: 'G1', generalName: '甲將', successRate: 0.9, returnSeason: 7, delegated: true, perfect: true,
                    rewards: { grain: 200, silver: 100, generalExp: 80 },
                },
                { id: 'HM-0003', templateId: 'NO_SUCH_TEMPLATE', wall: 'Military', difficulty: 'EASY', title: '對不上', status: 'OPEN', intel: 0, createdSeason: 2, expireSeason: 5 },
            ],
            Domestic: [],
            Expedition: [],
        },
        records: [{ missionId: 'HM-0000', title: '舊紀錄', wall: 'Military', generalId: 'G2', generalName: '乙將', successRate: 0.5, success: true, perfect: false, season: 1 }],
    };
}

export function createMissionSaveSuite(): TestSuite {
    const suite = new TestSuite('MissionSave (存檔 v2 與 v0/v1 遷移，PROG-2-9148)');
    const bundle = realBundle();
    const templateIds = Array.from(bundle.legacyIndex.keys());

    suite.test('資料裡至少有兩個可對應舊模板的新任務（遷移測試前提）', () => {
        assert.isTrue(templateIds.length >= 2, `legacyTemplateId 數量 ${templateIds.length}`);
    });

    suite.test('v2 正規化：壞項目丟棄、缺欄位補預設、不是 v2 回 null', () => {
        assert.equals(null, normalizeMissionSave(undefined));
        assert.equals(null, normalizeMissionSave({ version: 1 }));
        const n = normalizeMissionSave({ version: 2, revision: 3, rng: { seed: 5, serial: 1 }, season: 4, missions: [null, { id: 'bad' }], history: 'x', flags: { a: true, b: 'no' } });
        assert.isTrue(n !== null);
        if (!n) return;
        assert.equals(0, n.missions.length);
        assert.equals(3, n.revision);
        assert.equals(true, n.flags.a);
        assert.equals(undefined, n.flags.b);
        const empty = createEmptyMissionSave(9, 1);
        assert.equals(2, empty.version);
    });

    suite.test('v2 存檔經 JSON 來回後完全一致', () => {
        const host = new FakeMissionHost();
        host.roster = [mkGeneral({ id: 'G1' })];
        const svc = new OfflineMissionService(bundle, host, null, 31);
        svc.ensureBoards();
        const snap = svc.getSnapshot();
        const again = normalizeMissionSave(JSON.parse(JSON.stringify(snap)));
        assert.equals(JSON.stringify(snap), JSON.stringify(again));
    });

    suite.test('v1 → v2：進行中任務不遺失（武將、成功率、回報季、固定獎勵含完美加成都保留）', () => {
        const r = migrateLegacyHallMissions({
            hallMissions: legacyState(templateIds), hallIntel: { 'HM-0001': 70 }, hallWaitSeasons: {}, season: 4, fallbackSeed: 1,
            legacyIndex: bundle.legacyIndex, defs: bundle.defs,
        });
        assert.equals(1, r.keptActive);
        assert.equals(1, r.rebuiltOpen);
        assert.equals(1, r.droppedOpen, '對不上新定義的未接取任務只能丟，且有計數');
        const active = r.save.missions.find(m => m.id === 'HM-0002')!;
        assert.equals('ACTIVE', active.status);
        assert.equals('G1', active.dispatch!.generalIds[0]);
        assert.equals(7, active.dispatch!.returnSeason);
        assert.equals(LEGACY_FLAT_BRANCH_ID, active.dispatch!.branchId);
        assert.equals(true, active.dispatch!.delegated);
        assert.equals(250, active.legacy!.rewards.grain, '200 × 1.25（完美加成已算進去）');
        assert.equals(125, active.legacy!.rewards.gold, "舊制 silver 欄位原本就是入金庫的金，遷移後記為 gold（完美加成 ×1.25）");
        assert.equals(0, active.legacy!.rewards.silver, "舊制不含家族銀兩");
        const open = r.save.missions.find(m => m.id === 'HM-0001')!;
        assert.equals(70, open.intel, '情報取舊任務與 hallIntel 較大者');
        assert.equals(true, open.waited);
        assert.equals(4242, r.save.rng.seed, '種子沿用舊檔');
        assert.equals(1, r.save.history.length);
    });

    suite.test('遷移後的服務：進行中舊任務如期結算、發固定獎勵、武將先前被視為任務中', async () => {
        const mig = migrateLegacyHallMissions({
            hallMissions: legacyState(templateIds), hallIntel: {}, hallWaitSeasons: {}, season: 4, fallbackSeed: 1,
            legacyIndex: bundle.legacyIndex, defs: bundle.defs,
        });
        const host = new FakeMissionHost();
        host.seasonNow = 4;
        host.roster = [mkGeneral({ id: 'G1', name: '甲將' }), mkGeneral({ id: 'G2', name: '乙將' })];
        const svc = new OfflineMissionService(bundle, host, mig.save, 1);
        assert.equals(JSON.stringify(['G1']), JSON.stringify(svc.busyGeneralIds()), '進行中任務的武將仍在忙');
        const b = svc.getBoard();
        if (!b.ok) throw new Error('board');
        const card = b.value.missions.find(m => m.id === 'HM-0002')!;
        assert.equals('舊制進行中', card.title);
        assert.equals('甲將', card.executorName);
        host.seasonNow = 6;
        const early = await svc.advanceSeason({ requestId: 'e1' });
        assert.isTrue(early.ok);
        if (early.ok) assert.equals(0, early.value.settled.length, '回報季未到不結算');
        host.seasonNow = 7;
        const s = await svc.advanceSeason({ requestId: 'e2' });
        assert.isTrue(s.ok);
        if (!s.ok) return;
        assert.equals(1, s.value.settled.length);
        assert.equals('HM-0002', s.value.settled[0].missionId);
        assert.equals(LEGACY_FLAT_BRANCH_ID, s.value.settled[0].branchId);
        if (s.value.settled[0].tier === 'success') {
            assert.equals(250, s.value.settled[0].gains.grain);
        } else {
            assert.equals(undefined, s.value.settled[0].gains.grain);
        }
        assert.equals(0, svc.busyGeneralIds().length);
    });

    suite.test('v0（沒有任務欄位的舊檔）→ 空 v2 存檔，之後補板即可', () => {
        const r = migrateLegacyHallMissions({
            hallMissions: undefined, hallIntel: undefined, hallWaitSeasons: undefined, season: 3, fallbackSeed: 77,
            legacyIndex: bundle.legacyIndex, defs: bundle.defs,
        });
        assert.equals(0, r.save.missions.length);
        assert.equals(77, r.save.rng.seed);
        assert.equals(0, r.keptActive);
        const host = new FakeMissionHost();
        host.roster = [mkGeneral({ id: 'G1' })];
        const svc = new OfflineMissionService(bundle, host, r.save, 77);
        assert.isTrue(svc.ensureBoards());
        const b = svc.getBoard();
        if (b.ok) assert.equals(12, b.value.missions.length);
    });

    suite.test('壞掉的舊檔（hallMissions 不是物件、欄位亂填）不拋例外', () => {
        const r = migrateLegacyHallMissions({
            hallMissions: { boards: { Military: [null, 7, { id: 5 }] }, records: 'x' }, hallIntel: 'bad', hallWaitSeasons: [], season: 1, fallbackSeed: 5,
            legacyIndex: bundle.legacyIndex, defs: bundle.defs,
        });
        assert.equals(0, r.save.missions.length);
        const r2 = migrateLegacyHallMissions({ hallMissions: 123, hallIntel: null, hallWaitSeasons: null, season: 1, fallbackSeed: 5, legacyIndex: bundle.legacyIndex, defs: bundle.defs });
        assert.equals(0, r2.save.missions.length);
    });

    suite.test('連鎖段數（chainDepth）存檔往返：正常保留、小於 2 或非數字丟棄，待生成佇列同理（PROG-2-9966）', () => {
        const inst = (id: string, depth: unknown) => ({
            id, defId: 'd', theme: 't', variant: 'v', spawnSeason: 1, expireSeason: 5, intel: 10, status: 'OPEN', chainFrom: 'M0', chainDepth: depth,
        });
        const n = normalizeMissionSave({
            version: 2, revision: 1, rng: { seed: 1, serial: 1 }, season: 2,
            missions: [inst('M1', 3.7), inst('M2', 1), inst('M3', 'x')],
            pending: [{ defId: 'd', atSeason: 4, chainFrom: 'M1', chainDepth: 4 }, { defId: 'd', atSeason: 4, chainDepth: 0 }],
        });
        assert.isTrue(n !== null);
        if (!n) return;
        assert.equals(3, n.missions[0].chainDepth);
        assert.equals(undefined, n.missions[1].chainDepth);
        assert.equals(undefined, n.missions[2].chainDepth);
        assert.equals(4, n.pending?.[0].chainDepth);
        assert.equals(undefined, n.pending?.[1].chainDepth);
    });

    return suite;
}
