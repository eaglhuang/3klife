/**
 * HallMissionSession — 大廳任務接進 GameSession：產生、派出、換季結算、存讀檔與舊檔相容（PROG-2-9130，doc_spec_1178 §9、§10）
 */
import { assert, TestSuite } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';
import { sys } from 'cc';
import { GameSession, InMemoryRosterStore, type HallMissionWallet } from '../assets/scripts/core/managers/GameSession';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { HALL_MISSION_WALLS, parseHallMissionBalance, parseHallMissionTemplates } from '../assets/scripts/core/systems/HallMissionData';

const readData = (name: string): unknown => JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data', name), 'utf8'));

function templatesAndBalance() {
    const t = parseHallMissionTemplates(readData('hall-mission-templates.json'));
    const b = parseHallMissionBalance(readData('hall-mission-balance.json'));
    if (t.ok === false || b.ok === false) throw new Error('資料檔驗證失敗');
    return { templates: t.value, balance: b.value };
}

function wallet(initial = 1000): HallMissionWallet & { amount: () => number } {
    let gold = initial;
    return {
        gold: () => gold,
        spend: (n: number) => { if (gold < n) return false; gold -= n; return true; },
        grant: (n: number) => { gold += n; },
        amount: () => gold,
    };
}

function general(id: string, str = 90): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100,
        str, int: 50, lea: 85, pol: 40, cha: 50, luk: 40,
    } as unknown as GeneralConfig;
}

async function newSession(adapter = new MemoryStorageAdapter()): Promise<GameSession> {
    services().initialize();
    sys.localStorage.removeItem('CLIENT_DEVICE_ID');
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(true);
    session.startNewGame(7);
    session.addGenerals([general('zhang'), general('guan', 80)]);
    return session;
}

async function reload(adapter: MemoryStorageAdapter): Promise<GameSession> {
    const restored = new GameSession();
    restored.setRosterStore(new InMemoryRosterStore([]));
    restored.setSaveService(new PlayerSaveService(adapter));
    await restored.load();
    return restored;
}

export function createHallMissionSessionSuite(): TestSuite {
    const suite = new TestSuite('HallMissionSession (GameSession 整合：產生／派出／換季／存讀檔，PROG-2-9130)');
    const { templates, balance } = templatesAndBalance();

    suite.test('新局綁定後立即產生：三面牆各 4 筆，只產生一次', async () => {
        const session = await newSession();
        assert.isFalse(session.hallMissionsReady);
        assert.isTrue(session.bindHallMissions(templates, balance, wallet()));
        assert.isTrue(session.hallMissionsReady);
        for (const w of HALL_MISSION_WALLS) assert.equals(4, session.hallMissionState!.boards[w].length, w);
        const first = JSON.stringify(session.hallMissionState);
        assert.isFalse(session.bindHallMissions(templates, balance, wallet()), '第二次綁定不重新產生');
        assert.equals(first, JSON.stringify(session.hallMissionState));
    });

    suite.test('派出（執行）：扣糧草、兵源、精力，武將變成出任務中，出征編隊不可選', async () => {
        const session = await newSession();
        session.bindHallMissions(templates, balance, wallet());
        const mission = session.hallMissionState!.boards.Military[0];
        const food = session.hallMissionStock().grain;
        const troops = session.hallMissionStock().troops;
        const r = await session.dispatchHallMission(mission.id, 'zhang');
        assert.isTrue(r.ok, r.ok ? '' : r.text);
        assert.equals(food - mission.costs.grain, session.hallMissionStock().grain);
        assert.equals(troops - mission.costs.troops, session.hallMissionStock().troops);
        assert.equals(100 - mission.energyCost, (session.roster.find((g) => g.id === 'zhang') as { vitality: number }).vitality);
        assert.equals('ACTIVE', session.hallMissionState!.boards.Military.find((m) => m.id === mission.id)!.status);
        assert.isTrue(session.hallBusyGeneralIds().includes('zhang'));
        assert.isTrue(session.checkDeployable('zhang').reasons.includes('on-hall-mission'));
        assert.isFalse(session.getDeployableGenerals().some((g) => g.id === 'zhang'));
        assert.isTrue(session.getDeployableGenerals().some((g) => g.id === 'guan'));
        const again = await session.dispatchHallMission(session.hallMissionState!.boards.Military[1].id, 'zhang');
        assert.isFalse(again.ok, '同一位武將不能同時出兩個任務');
    });

    suite.test('武將佔用四條路：執行、委任、AI 委任都不會挑到忙碌武將，候選標出任務中，全員忙碌時回報原因', async () => {
        const session = await newSession();
        session.bindHallMissions(templates, balance, wallet());
        const mil = session.hallMissionState!.boards.Military;
        assert.isTrue((await session.dispatchHallMission(mil[0].id, 'zhang')).ok);
        // 候選：zhang 出任務中、不可選
        const cands = session.hallMissionCandidates(mil[1].id);
        assert.equals('on-mission', cands.find((c) => c.id === 'zhang')!.block);
        assert.equals(null, cands.find((c) => c.id === 'guan')!.block);
        // 執行同一位：拒絕且資源不動
        const food = session.hallMissionStock().grain;
        const exec = await session.dispatchHallMission(mil[1].id, 'zhang');
        assert.isFalse(exec.ok);
        assert.equals(food, session.hallMissionStock().grain);
        // 委任：只會挑 guan
        const del = await session.dispatchHallMission(mil[1].id, null);
        assert.isTrue(del.ok, del.ok ? '' : del.text);
        if (del.ok) assert.equals('guan', del.mission.generalId);
        // 兩位都忙：委任回報沒有可派武將，執行也被拒
        const third = await session.dispatchHallMission(mil[2].id, null);
        assert.isFalse(third.ok);
        assert.isFalse((await session.dispatchHallMission(mil[2].id, 'guan')).ok);
        // 兩筆進行中都還在任務板上（不會被當成重複而吃掉）
        assert.equals(2, session.hallMissionState!.boards.Military.filter((m) => m.status === 'ACTIVE').length);
    });

    suite.test('派出（委任）：系統自己選將並標記委任；內政任務扣黃金走錢包', async () => {
        const session = await newSession();
        const w = wallet(1000);
        session.bindHallMissions(templates, balance, w);
        const dom = session.hallMissionState!.boards.Domestic[0];
        const r = await session.dispatchHallMission(dom.id, null);
        assert.isTrue(r.ok, r.ok ? '' : r.text);
        if (r.ok === false) return;
        assert.isTrue(r.mission.delegated === true);
        assert.isTrue(['zhang', 'guan'].includes(r.mission.generalId as string));
        assert.equals(1000 - dom.costs.silver, w.amount());
    });

    suite.test('黃金不足：整筆不動，沒有扣任何資源也沒有佔用武將', async () => {
        const session = await newSession();
        session.bindHallMissions(templates, balance, wallet(0));
        const dom = session.hallMissionState!.boards.Domestic[0];
        const food = session.hallMissionStock().grain;
        const r = await session.dispatchHallMission(dom.id, 'zhang');
        assert.isFalse(r.ok);
        assert.equals(food, session.hallMissionStock().grain);
        assert.equals(0, session.hallBusyGeneralIds().length);
    });

    suite.test('再探與等待走 GameSession：扣糧草、情報到 100；期限與情報變動且只能等一次', async () => {
        const session = await newSession();
        session.bindHallMissions(templates, balance, wallet());
        const [a, b] = session.hallMissionState!.boards.Military;
        const food = session.hallMissionStock().grain;
        const recon = await session.reconHallMission(a.id);
        assert.isTrue(recon.ok);
        assert.equals(food - 50, session.hallMissionStock().grain);
        assert.equals(100, session.hallMissionState!.boards.Military[0].intel);
        const wait = await session.waitHallMission(b.id);
        assert.isTrue(wait.ok);
        assert.equals(b.expireSeason + 1, session.hallMissionState!.boards.Military[1].expireSeason);
        assert.isFalse((await session.waitHallMission(b.id)).ok);
    });

    suite.test('換季：到期任務結算並回報，武將恢復可用；未派的過期任務被換新，三面牆仍有 4 筆未接取', async () => {
        const session = await newSession();
        const w = wallet(1000);
        session.bindHallMissions(templates, balance, w);
        const mission = session.hallMissionState!.boards.Military[0];
        await session.dispatchHallMission(mission.id, 'zhang');
        const active = session.hallMissionState!.boards.Military.find((m) => m.id === mission.id)!;
        const payload = await session.advanceSeason();
        const report = payload.hallMissionReport;
        if (active.returnSeason === 1) {
            assert.isTrue(report !== undefined, '到期當季一定要有回報');
            assert.equals(1, report!.settled);
            assert.equals(1, report!.lines.length);
            assert.isTrue(report!.lines[0].includes(mission.title));
            assert.isFalse(session.hallBusyGeneralIds().includes('zhang'));
            assert.isTrue(session.getDeployableGenerals().some((g) => g.id === 'zhang'));
        }
        for (const wall of HALL_MISSION_WALLS) {
            assert.equals(4, session.hallMissionState!.boards[wall].filter((m) => m.status === 'OPEN').length, wall);
        }
    });

    suite.test('存讀檔：任務、進行中狀態與種子完整還原；讀檔後不洗牌也不重新產生', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await newSession(adapter);
        session.bindHallMissions(templates, balance, wallet());
        const mission = session.hallMissionState!.boards.Military[0];
        await session.dispatchHallMission(mission.id, 'zhang');
        const before = JSON.stringify(session.hallMissionState);
        const restored = await reload(adapter);
        assert.isFalse(restored.bindHallMissions(templates, balance, wallet()), '有存檔就不重新產生');
        assert.equals(before, JSON.stringify(restored.hallMissionState));
        assert.isTrue(restored.hallBusyGeneralIds().includes('zhang'));
    });

    suite.test('舊存檔（沒有任務欄位）：讀得進來，綁定時才第一次產生任務，不留下殘留的已派任務', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await newSession(adapter);
        await session.save();
        const restored = await reload(adapter);
        assert.isFalse(restored.hallMissionsReady);
        assert.equals(0, restored.hallBusyGeneralIds().length);
        assert.isTrue(restored.bindHallMissions(templates, balance, wallet()));
        assert.equals(4, restored.hallMissionState!.boards.Domestic.length);
    });

    suite.test('資料綁定後才開新局（開場流程）：任務立刻重新產生，牆不會變空', async () => {
        const session = await newSession();
        session.bindHallMissions(templates, balance, wallet());
        session.startNewGame(99);
        assert.isTrue(session.hallMissionsReady);
        for (const w of HALL_MISSION_WALLS) assert.equals(4, session.hallMissionState!.boards[w].length, w);
    });

    suite.test('讀到沒有任務欄位的舊檔、資料已綁定：讀檔後立刻產生', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await newSession(adapter);
        await session.save();
        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore([]));
        restored.setSaveService(new PlayerSaveService(adapter));
        restored.bindHallMissions(templates, balance, wallet());
        await restored.load();
        assert.isTrue(restored.hallMissionsReady);
        assert.equals(4, restored.hallMissionState!.boards.Military.length);
    });

    return suite;
}
