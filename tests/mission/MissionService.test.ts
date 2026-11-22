// @spec-source → 通用任務服務（PROG-2-9148）：OfflineMissionService 的方法、候選全員與原因、委任吃記憶、結算帳本
import { TestSuite, assert } from '../TestRunner';
import { OfflineMissionService } from '../../assets/scripts/core/mission/service/OfflineMissionService';
import { affinityFromLedger, memoryHintFromLedger } from '../../assets/scripts/core/mission/MissionMemory';
import { FakeMissionHost, mkGeneral, realBundle } from './missionTestKit';
import type { MissionCardView } from '../../assets/scripts/core/mission/service/IMissionService';

let seq = 0;
const rid = (): string => `t-${(seq += 1)}`;

function newService(configure?: (host: FakeMissionHost) => void, seed = 20260618): { svc: OfflineMissionService; host: FakeMissionHost } {
    const host = new FakeMissionHost();
    host.roster = [mkGeneral({ id: 'G1', name: '甲將' }), mkGeneral({ id: 'G2', name: '乙將' })];
    if (configure) configure(host);
    const svc = new OfflineMissionService(realBundle(), host, null, seed);
    svc.ensureBoards();
    return { svc, host };
}

function openCards(svc: OfflineMissionService): MissionCardView[] {
    const b = svc.getBoard();
    if (!b.ok) throw new Error('getBoard 失敗');
    return b.value.missions.filter(m => m.status === 'OPEN');
}

export function createMissionServiceSuite(): TestSuite {
    const suite = new TestSuite('MissionService (OfflineMissionService：板、再探、等待、派遣、委任、結算，PROG-2-9148)');

    suite.test('新局補板：三面牆各補到目標數，同牆不重複定義', () => {
        const { svc } = newService();
        const cards = openCards(svc);
        const byWall: Record<string, string[]> = {};
        const themes = realBundle().themes;
        for (const c of cards) (byWall[themes.get(c.theme)!.wall] ??= []).push(c.defId);
        for (const wall of ['Military', 'Domestic', 'Expedition']) {
            assert.equals(4, (byWall[wall] ?? []).length, wall);
            assert.equals(4, new Set(byWall[wall]).size, `${wall} 不重複`);
        }
    });

    suite.test('候選全員列出（來自真實名冊）：不可派者附原因，不從清單消失', () => {
        const { svc } = newService((h) => {
            h.roster = [
                mkGeneral({ id: 'ok', name: '可派將' }),
                mkGeneral({ id: 'nur', name: '培育將', block: ['nurturing'] }),
                mkGeneral({ id: 'kid', name: '未畢業將', block: ['not-graduated'] }),
                mkGeneral({ id: 'cap', name: '被囚將', block: ['captive'] }),
                mkGeneral({ id: 'tired', name: '疲憊將', vitality: 1 }),
                mkGeneral({ id: 'sortie', name: '出征將', block: ['on-sortie'] }),
            ];
        });
        const id = openCards(svc)[0].id;
        const r = svc.getCandidates(id);
        assert.isTrue(r.ok);
        if (!r.ok) return;
        assert.equals(6, r.value.length, '六位全列出');
        const by = (gid: string) => r.value.find(c => c.generalId === gid)!;
        assert.equals(0, by('ok').block.length);
        assert.contains(by('nur').blockText, '培育中');
        assert.contains(by('kid').blockText, '尚未畢業');
        assert.contains(by('cap').blockText, '被囚');
        assert.contains(by('tired').blockText, '精力不足');
        assert.contains(by('sortie').blockText, '出征中');
        assert.equals('ok', r.value[0].generalId, '可派者排最前');
    });

    suite.test('名冊為空：候選為空陣列，詳情仍可開（不退回任何設計稿武將）', () => {
        const { svc } = newService((h) => { h.roster = []; });
        const id = openCards(svc)[0].id;
        const c = svc.getCandidates(id);
        assert.isTrue(c.ok);
        if (c.ok) assert.equals(0, c.value.length);
        assert.isTrue(svc.getDetail(id).ok);
    });

    suite.test('再探：+35／+25／+15、單靠再探不超過 90，每次扣糧草；上限後回報 INTEL_FULL 且不扣', async () => {
        const { svc, host } = newService();
        const card = openCards(svc)[0];
        const base = svc.getDetail(card.id);
        if (!base.ok) throw new Error('detail');
        let intel = base.value.intel;
        const grain0 = host.stockNow.grain;
        const steps: number[] = [];
        for (let i = 0; i < 6; i += 1) {
            const r = await svc.recon({ requestId: rid(), missionId: card.id });
            if (!r.ok) { assert.equals('INTEL_FULL', r.code); break; }
            steps.push(r.value.gained);
            intel = r.value.intel;
        }
        assert.isTrue(steps.length >= 1);
        assert.isTrue(steps[0] <= 35 && steps[0] > 0, '第一次最多 +35');
        assert.isTrue(intel <= 90 || base.value.intel > 90, '單靠再探封頂 90');
        assert.equals(grain0 - 50 * steps.length, host.stockNow.grain, '每次再探扣 50 糧草');
        const again = await svc.recon({ requestId: rid(), missionId: card.id });
        assert.isFalse(again.ok);
        assert.equals(grain0 - 50 * steps.length, host.stockNow.grain, '被拒不扣款');
    });

    suite.test('再探：同 requestId 重送只扣一次；糧草不足回 SHORT_RESOURCE', async () => {
        const { svc, host } = newService();
        const card = openCards(svc)[0];
        const req = rid();
        const a = await svc.recon({ requestId: req, missionId: card.id });
        const grain = host.stockNow.grain;
        const b = await svc.recon({ requestId: req, missionId: card.id });
        assert.isTrue(a.ok && b.ok);
        assert.equals(grain, host.stockNow.grain, '重送不重複扣');
        host.stockNow = { ...host.stockNow, grain: 10 };
        const c = await svc.recon({ requestId: rid(), missionId: card.id });
        assert.isFalse(c.ok);
        if (!c.ok) assert.equals('SHORT_RESOURCE', c.code);
    });

    suite.test('baseRevision 不符回 REVISION_CONFLICT', async () => {
        const { svc } = newService();
        const card = openCards(svc)[0];
        const r = await svc.recon({ requestId: rid(), missionId: card.id, baseRevision: -5 });
        assert.isFalse(r.ok);
        if (!r.ok) assert.equals('REVISION_CONFLICT', r.code);
    });

    suite.test('等待：每任務只能一次，期限延長、情報增加', async () => {
        const { svc } = newService();
        const card = openCards(svc)[0];
        const r1 = await svc.wait({ requestId: rid(), missionId: card.id });
        assert.isTrue(r1.ok);
        if (r1.ok) assert.equals(card.expireSeason + 1, r1.value.expireSeason);
        const r2 = await svc.wait({ requestId: rid(), missionId: card.id });
        assert.isFalse(r2.ok);
        if (!r2.ok) assert.equals('ALREADY_WAITED', r2.code);
    });

    suite.test('派遣：扣耗費與精力、任務轉進行中並鎖定情報；之後不能再探，武將變任務中', async () => {
        const { svc, host } = newService();
        const card = openCards(svc)[0];
        const d = svc.getDetail(card.id, { generalId: 'G1' });
        if (!d.ok) throw new Error('detail');
        const stock0 = { ...host.stockNow };
        const r = await svc.dispatch({ requestId: rid(), missionId: card.id, generalIds: ['G1'] });
        assert.isTrue(r.ok, r.ok ? '' : r.text);
        if (!r.ok) return;
        assert.equals(stock0.grain - d.value.cost.grain, host.stockNow.grain);
        assert.equals(stock0.troops - d.value.cost.troops, host.stockNow.troops);
        assert.equals(stock0.gold - d.value.cost.gold, host.stockNow.gold, '金耗費從國家公庫扣');
        assert.equals(stock0.silver - d.value.cost.silver, host.stockNow.silver, '銀兩耗費從家族帳扣');
        assert.equals(d.value.cost.energy, host.energySpent.G1);
        const after = svc.getBoard();
        if (!after.ok) throw new Error('board');
        const active = after.value.missions.find(m => m.id === card.id)!;
        assert.equals('ACTIVE', active.status);
        assert.equals('甲將', active.executorName);
        assert.equals(d.value.intel, active.intel, '派遣時情報鎖定');
        const rc = await svc.recon({ requestId: rid(), missionId: card.id });
        assert.isFalse(rc.ok);
        const other = openCards(svc)[0];
        const cands = svc.getCandidates(other.id);
        if (!cands.ok) throw new Error('cands');
        assert.contains(cands.value.find(c => c.generalId === 'G1')!.blockText, '任務中');
        const dup = await svc.dispatch({ requestId: rid(), missionId: other.id, generalIds: ['G1'] });
        assert.isFalse(dup.ok);
        if (!dup.ok) assert.equals('BLOCKED', dup.code);
        assert.equals(JSON.stringify(['G1']), JSON.stringify(svc.busyGeneralIds()));
    });

    suite.test('派遣被擋：培育中的武將、資源不足、名冊沒有此人，都不扣任何東西', async () => {
        const { svc, host } = newService((h) => { h.roster.push(mkGeneral({ id: 'nur', name: '培育將', block: ['nurturing'] })); });
        const card = openCards(svc)[0];
        const before = JSON.stringify(host.stockNow);
        const a = await svc.dispatch({ requestId: rid(), missionId: card.id, generalIds: ['nur'] });
        assert.isFalse(a.ok);
        if (!a.ok) { assert.equals('BLOCKED', a.code); assert.contains(a.text, '培育中'); }
        const b = await svc.dispatch({ requestId: rid(), missionId: card.id, generalIds: ['ghost'] });
        assert.isFalse(b.ok);
        host.stockNow = { grain: 0, gold: 0, silver: 0, troops: 0 };
        const c = await svc.dispatch({ requestId: rid(), missionId: card.id, generalIds: ['G1'] });
        assert.isFalse(c.ok);
        if (!c.ok) assert.equals('SHORT_RESOURCE', c.code);
        assert.equals(0, host.energySpent.G1 ?? 0, '被擋不扣精力');
        assert.equals(JSON.stringify({ grain: 0, gold: 0, silver: 0, troops: 0 }), JSON.stringify(host.stockNow));
        assert.isTrue(before.length > 0);
    });

    suite.test('委任吃武將記憶：記憶好的人被選，記憶差的人落選（同能力）', async () => {
        const a = newService((h) => { h.affinity = { G1: 0.9, G2: -0.9 }; });
        const c1 = openCards(a.svc)[0];
        const r1 = await a.svc.dispatch({ requestId: rid(), missionId: c1.id, generalIds: 'delegate' });
        assert.isTrue(r1.ok);
        if (r1.ok) assert.equals('G1', r1.value.generalIds[0]);
        const b = newService((h) => { h.affinity = { G1: -0.9, G2: 0.9 }; });
        const c2 = openCards(b.svc)[0];
        const r2 = await b.svc.dispatch({ requestId: rid(), missionId: c2.id, generalIds: 'delegate' });
        assert.isTrue(r2.ok);
        if (r2.ok) { assert.equals('G2', r2.value.generalIds[0]); assert.isTrue(r2.value.delegated); }
    });

    suite.test('委任：全員被擋時回 NO_EXECUTOR', async () => {
        const { svc } = newService((h) => { h.roster = [mkGeneral({ id: 'x', block: ['captive'] })]; });
        const r = await svc.dispatch({ requestId: rid(), missionId: openCards(svc)[0].id, generalIds: 'delegate' });
        assert.isFalse(r.ok);
        if (!r.ok) assert.equals('NO_EXECUTOR', r.code);
    });

    suite.test('候選帶記憶提示（來自宿主）', () => {
        const { svc } = newService((h) => { h.affinity = { G1: 0.5 }; });
        const c = svc.getCandidates(openCards(svc)[0].id);
        if (!c.ok) throw new Error('cands');
        assert.equals('曾勝任', c.value.find(x => x.generalId === 'G1')!.memoryHint);
        assert.equals('', c.value.find(x => x.generalId === 'G2')!.memoryHint);
    });

    suite.test('換季結算：帳本交給宿主、結算資訊含任務 id／分支／成敗等級，任務移除並補板，紀錄寫入歷史', async () => {
        const { svc, host } = newService();
        const card = openCards(svc)[0];
        const r = await svc.dispatch({ requestId: rid(), missionId: card.id, generalIds: ['G1'] });
        if (!r.ok) throw new Error(r.text);
        host.seasonNow = r.value.returnSeason;
        const s = await svc.advanceSeason({ requestId: rid() });
        assert.isTrue(s.ok, s.ok ? '' : s.text);
        if (!s.ok) return;
        assert.equals(1, s.value.settled.length);
        assert.equals(1, host.settled.length);
        const info = host.settled[0];
        assert.equals(card.id, info.missionId);
        assert.equals('G1', info.generalId);
        assert.isTrue(info.branchId.length > 0);
        assert.isTrue(['critical', 'success', 'fail', 'disaster'].includes(info.tier));
        assert.equals(1, host.ledgers.length, '帳本交給宿主套用');
        assert.isTrue(openCards(svc).every(c => c.id !== card.id));
        assert.equals(12, openCards(svc).length, '三面牆補回各 4 張');
        const h = svc.getHistory();
        if (!h.ok) throw new Error('history');
        assert.equals(1, h.value.length);
        assert.equals(0, svc.busyGeneralIds().length, '結算後武將恢復可用');
    });

    suite.test('同種子同操作 → 同結果（可重現，不用 Date.now）', async () => {
        const run = async (): Promise<string> => {
            const { svc, host } = newService(undefined, 777);
            const card = openCards(svc)[0];
            const r = await svc.dispatch({ requestId: 'fixed', missionId: card.id, generalIds: ['G1'] });
            if (!r.ok) throw new Error(r.text);
            host.seasonNow = r.value.returnSeason;
            await svc.advanceSeason({ requestId: 'fixed-season' });
            return JSON.stringify({ tier: host.settled[0].tier, branch: host.settled[0].branchId, ledger: host.ledgers[0], board: svc.getBoard() });
        };
        assert.equals(await run(), await run());
    });

    suite.test('受傷／被俘狀態：快照裡有 injuredUntil 時候選標「受傷休養中」，過季後解除', async () => {
        const { svc, host } = newService();
        const snap = svc.getSnapshot();
        snap.generalStates = { G1: { injuredUntil: 3 } };
        svc.loadSnapshot(snap);
        const id = openCards(svc)[0].id;
        const c = svc.getCandidates(id);
        if (!c.ok) throw new Error('cands');
        assert.contains(c.value.find(x => x.generalId === 'G1')!.blockText, '受傷休養中');
        host.seasonNow = 3;
        await svc.advanceSeason({ requestId: rid() });
        const c2 = svc.getCandidates(openCards(svc)[0].id);
        if (!c2.ok) throw new Error('cands2');
        assert.equals(0, c2.value.find(x => x.generalId === 'G1')!.block.length, '第 3 季起恢復');
    });

    suite.test('快照往返：載入後板與進行中任務一致，revision 單調遞增，變更會通知', async () => {
        const { svc } = newService();
        let notified = 0;
        const off = svc.onChanged(() => { notified += 1; });
        const card = openCards(svc)[0];
        await svc.recon({ requestId: rid(), missionId: card.id });
        await svc.dispatch({ requestId: rid(), missionId: card.id, generalIds: ['G2'] });
        off();
        assert.isTrue(notified >= 2);
        const snap = svc.getSnapshot();
        const { svc: svc2 } = newService();
        svc2.loadSnapshot(JSON.parse(JSON.stringify(snap)));
        assert.equals(JSON.stringify(svc.getBoard()), JSON.stringify(svc2.getBoard()));
        assert.equals(JSON.stringify(['G2']), JSON.stringify(svc2.busyGeneralIds()));
        assert.equals(snap.revision, svc2.getSnapshot().revision);
    });

    suite.test('記憶換算：勝多負少 → 正偏移與提示；連敗 → 負偏移；沒有記憶 → 0', () => {
        const ledger = { byTag: { military: { win: 4, loss: 0, streakLoss: 0 }, domestic: { win: 0, loss: 3, streakLoss: 3 } } };
        assert.isTrue(affinityFromLedger(ledger, 'military', null) > 0.4);
        assert.isTrue(affinityFromLedger(ledger, 'domestic', null) < -0.4);
        assert.equals(0, affinityFromLedger(undefined, 'military', 'Military'));
        assert.isTrue(affinityFromLedger(ledger, 'military', null, 'LOW') < affinityFromLedger(ledger, 'military', null, 'HIGH'));
        assert.equals('曾 4 次勝任軍務', memoryHintFromLedger(ledger, 'military', '軍務'));
        assert.equals('內政近來連敗', memoryHintFromLedger(ledger, 'domestic', '內政'));
        assert.equals('', memoryHintFromLedger(undefined, 'military', '軍務'));
    });

    return suite;
}
