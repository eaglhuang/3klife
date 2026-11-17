/**
 * HallMissionLoop — 派出、再探、等待、換季結算、紀錄（PROG-2-9130，doc_spec_1178 §6、§7.3、§9）
 */
import { assert, TestSuite } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
    emptyHallMissionState, parseHallMissionBalance, type HallMission, type HallMissionBalance, type HallMissionState,
} from '../assets/scripts/core/systems/HallMissionData';
import type { HallGeneralFacts } from '../assets/scripts/core/systems/HallMissionRules';
import {
    activeHallMissions, appendHallRecords, dispatchHallMission, findHallMission, hallBusyGeneralIds, hallSettleLine,
    listHallRecords, reconHallMission, recordOfSettlement, settleDueHallMissions, waitHallMission,
} from '../assets/scripts/core/systems/HallMissionLoop';

function balanceOf(): HallMissionBalance {
    const raw = JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data/hall-mission-balance.json'), 'utf8'));
    const parsed = parseHallMissionBalance(raw);
    if (parsed.ok === false) throw new Error('數值表驗證失敗');
    return parsed.value;
}

function missionOf(id: string, over: Partial<HallMission> = {}): HallMission {
    return {
        id, templateId: `T-${id}`, wall: 'Military', difficulty: 'NORMAL', title: `任務${id}`, brief: 'b', detail: 'd', keyStat: 'str',
        enemyHint: '敵', durationSeasons: 1, powerRequired: 200, rewards: { grain: 200, silver: 0, generalExp: 70 },
        costs: { grain: 60, troops: 80, silver: 0 }, energyCost: 20, intel: 50, createdSeason: 0, expireSeason: 2, waited: false, status: 'OPEN',
        ...over,
    };
}

function stateOf(...missions: HallMission[]): HallMissionState {
    const s = emptyHallMissionState(11);
    for (const m of missions) s.boards[m.wall].push(m);
    return s;
}

const general = (id = 'zhang', over: Partial<HallGeneralFacts> = {}): HallGeneralFacts =>
    ({ id, name: '張飛', power: 300, vitality: 100, stats: { str: 90 }, block: null, ...over });
const STOCK = { grain: 500, silver: 500, troops: 500 };

export function createHallMissionLoopSuite(): TestSuite {
    const suite = new TestSuite('HallMissionLoop (派出／再探／等待／換季結算，PROG-2-9130)');
    const balance = balanceOf();

    suite.test('派出：轉為進行中、記回報季與成功率，回傳要扣的耗費與精力，原狀態不被改動', () => {
        const state = stateOf(missionOf('A', { durationSeasons: 2 }));
        const r = dispatchHallMission(state, { missionId: 'A', general: general(), delegated: false, season: 3, stock: STOCK }, balance);
        assert.isTrue(r.ok);
        if (r.ok === false) return;
        assert.equals('ACTIVE', r.mission.status);
        assert.equals(5, r.mission.returnSeason);
        assert.equals('zhang', r.mission.generalId);
        assert.equals(60, r.spent.grain); assert.equals(80, r.spent.troops); assert.equals(20, r.energy);
        assert.isTrue((r.mission.successRate as number) > 0.5);
        assert.equals('OPEN', findHallMission(state, 'A')!.status);
        assert.equals(1, activeHallMissions(r.state).length);
        assert.isTrue(hallBusyGeneralIds(r.state).has('zhang'));
    });

    suite.test('派出被擋：任務不存在、已派出、武將忙碌／精力不足、資源不足（要列出缺什麼）', () => {
        const state = stateOf(missionOf('A'));
        const run = (id: string, g: HallGeneralFacts, stock = STOCK) => dispatchHallMission(state, { missionId: id, general: g, delegated: false, season: 0, stock }, balance);
        assert.equals('no-mission', (run('Z', general()) as { reason: string }).reason);
        assert.equals('blocked', (run('A', general('z', { block: 'on-mission' })) as { reason: string }).reason);
        assert.equals('blocked', (run('A', general('z', { vitality: 5 })) as { reason: string }).reason);
        const short = run('A', general(), { grain: 10, silver: 500, troops: 0 });
        assert.equals('short', (short as { reason: string }).reason);
        assert.isTrue((short as { text: string }).text.includes('糧草'));
        assert.isTrue((short as { text: string }).text.includes('城市兵源'));
        const twice = dispatchHallMission((run('A', general()) as { state: HallMissionState }).state, { missionId: 'A', general: general('q'), delegated: false, season: 0, stock: STOCK }, balance);
        assert.equals('not-open', (twice as { reason: string }).reason);
    });

    suite.test('武將佔用：已有進行中任務的武將再派一律拒絕（即使呼叫端沒標忙碌），別的武將照常可派', () => {
        const first = dispatchHallMission(stateOf(missionOf('A'), missionOf('B')), { missionId: 'A', general: general('zhang'), delegated: false, season: 0, stock: STOCK }, balance);
        assert.isTrue(first.ok);
        if (first.ok === false) return;
        const again = dispatchHallMission(first.state, { missionId: 'B', general: general('zhang', { block: null }), delegated: true, season: 0, stock: STOCK }, balance);
        assert.isFalse(again.ok);
        assert.equals('busy', (again as { reason: string }).reason);
        assert.isTrue((again as { text: string }).text.includes('出任務中'));
        assert.equals('OPEN', findHallMission(first.state, 'B')!.status);
        const other = dispatchHallMission(first.state, { missionId: 'B', general: general('guan'), delegated: false, season: 0, stock: STOCK }, balance);
        assert.isTrue(other.ok);
    });

    suite.test('再探：扣糧草 50、情報到 100；已完整或糧草不足都不動', () => {
        const state = stateOf(missionOf('A'));
        const ok = reconHallMission(state, 'A', 100, balance);
        assert.isTrue(ok.ok);
        if (ok.ok === false) return;
        assert.equals(50, ok.costGrain);
        assert.equals(100, findHallMission(ok.state, 'A')!.intel);
        assert.equals('full', (reconHallMission(ok.state, 'A', 999, balance) as { reason: string }).reason);
        assert.equals('short', (reconHallMission(state, 'A', 49, balance) as { reason: string }).reason);
        assert.equals(50, findHallMission(state, 'A')!.intel);
    });

    suite.test('等待：期限 +1、情報 +25（上限 100），每筆只能一次', () => {
        const state = stateOf(missionOf('A', { intel: 90 }));
        const r = waitHallMission(state, 'A', balance);
        assert.isTrue(r.ok);
        if (r.ok === false) return;
        assert.equals(3, r.expireSeason);
        assert.equals(100, r.intel);
        assert.equals('already', (waitHallMission(r.state, 'A', balance) as { reason: string }).reason);
    });

    const activeOf = (id: string, rate: number, over: Partial<HallMission> = {}): HallMission =>
        missionOf(id, { status: 'ACTIVE', generalId: `g${id}`, generalName: `將${id}`, successRate: rate, returnSeason: 4, ...over });

    suite.test('結算：成功率 1 一定成功並入帳、成功率 0 一定失敗且無獎勵；回報季未到不結算', () => {
        const state = stateOf(activeOf('W', 1), activeOf('L', 0), activeOf('F', 1, { returnSeason: 9 }));
        const early = settleDueHallMissions(state, 3, STOCK, balance);
        assert.equals(0, early.entries.length);
        const r = settleDueHallMissions(state, 4, STOCK, balance);
        assert.equals(2, r.entries.length);
        const win = r.entries.find((e) => e.mission.id === 'W')!;
        const lose = r.entries.find((e) => e.mission.id === 'L')!;
        assert.isTrue(win.success); assert.equals(200, win.gains.grain);
        assert.isFalse(lose.success); assert.equals(0, lose.gains.grain);
        assert.equals(700, r.stock.grain);
        assert.isTrue(findHallMission(r.state, 'W') === undefined, '結算後移出牆面');
        assert.isTrue(findHallMission(r.state, 'F') !== undefined, '未到期的留著');
    });

    suite.test('結算：完美條件成立加 50%；超過資源上限的部分截斷並記錄', () => {
        const perfect = settleDueHallMissions(stateOf(activeOf('P', 1, { perfect: true })), 4, STOCK, balance);
        assert.equals(300, perfect.entries[0].gains.grain);
        assert.isTrue(perfect.entries[0].perfectApplied);
        const capped = settleDueHallMissions(stateOf(activeOf('C', 1)), 4, { grain: 9950, silver: 0, troops: 0 }, balance);
        assert.equals(50, capped.entries[0].gains.grain);
        assert.equals(150, capped.entries[0].truncated.grain);
        assert.isTrue(hallSettleLine(capped.entries[0]).includes('截掉 糧草 150'));
    });

    suite.test('結算：同一種子結果固定，順序為回報季、牆別、代號', () => {
        const state = stateOf(activeOf('B', 0.5, { wall: 'Domestic' }), activeOf('A', 0.5), activeOf('C', 0.5, { returnSeason: 3 }));
        const a = settleDueHallMissions(state, 4, STOCK, balance);
        const b = settleDueHallMissions(state, 4, STOCK, balance);
        assert.equals('C,A,B', a.entries.map((e) => e.mission.id).join(','));
        assert.equals(JSON.stringify(a.entries.map((e) => e.success)), JSON.stringify(b.entries.map((e) => e.success)));
    });

    suite.test('回報文字與紀錄：失敗寫無獎勵；紀錄新到舊並只留最近 N 筆', () => {
        const r = settleDueHallMissions(stateOf(activeOf('W', 1), activeOf('L', 0)), 4, STOCK, balance);
        const lose = r.entries.find((e) => !e.success)!;
        assert.equals('任務L（將L）失敗，無獎勵', hallSettleLine(lose));
        const win = r.entries.find((e) => e.success)!;
        assert.isTrue(hallSettleLine(win).includes('糧草 +200'));
        assert.isTrue(hallSettleLine(win).includes('武將經驗 +70'));
        let s = r.state;
        for (let i = 0; i < 25; i += 1) s = appendHallRecords(s, [recordOfSettlement(win, i)], 20);
        const list = listHallRecords(s);
        assert.equals(20, list.length);
        assert.equals(24, list[0].season);
        assert.equals(5, list[19].season);
    });

    return suite;
}
