/**
 * LobbyHallReportLoopE2E.test.ts — 大廳循環：太守府、治理指派、日報與晨報（QA，PROG-2-1455）
 * 第 1 天登入生成日報、指派武將治理、下單太守府升級；季結後升級生效；隔天登入生成新日報與晨報；
 * 每個階段存讀檔，已讀狀態、指派、等級、同日重登不重生都要保留。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { person } from './MvpMainFlowE2E.test';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { sys } from 'cc';

const DAY0 = Date.UTC(2026, 2, 1, 4, 0);
const DAY_MS = 24 * 3600 * 1000;

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[] = []): GameSession {
    const s = new GameSession(19);
    s.setRosterStore(new InMemoryRosterStore(roster));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

export function createLobbyHallReportLoopE2ESuite(): TestSuite {
    const suite = new TestSuite('LobbyHallReportLoopE2E (大廳循環：太守府與日報 PROG-2-1455)');

    suite.test('日報、治理指派、太守府升級跨日跨季跨存讀檔：已讀、指派、等級、同日不重生都保留', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [person('lead', '男', 30), person('clerk', '男', 28, { pol: 90 })]);
        a.startNewGame(41);

        // 第 1 天：登入生成日報；指派治理；下單升級（糧草足夠、金幣扣得起）
        a.recordLoginAt(DAY0);
        const day0 = a.dailyNews.lastGeneratedDay;
        assert.isTrue(day0 !== null, '登入當天生成日報');
        a.recordLoginAt(DAY0 + 3600 * 1000);
        assert.equals(day0, a.dailyNews.lastGeneratedDay, '同日再登入不重生');
        a.markDailyNewsRead();

        const assign = a.assignGovernor('farming', 'clerk');
        assert.isTrue(assign.ok, '指派政治型武將到農務');
        assert.isFalse(a.assignGovernor('farming', 'ghost').ok, '名冊外的武將被拒');
        const lv0 = a.territoryLevel;
        const m = a.military;
        (a as unknown as { _military: unknown })._military = { ...m, food: m.foodCap };
        const spent: number[] = [];
        const plan = a.orderTerritoryUpgrade((g) => { spent.push(g); return true; });
        assert.isTrue(plan.ok, '下單升級成功');
        assert.equals(lv0, a.territoryLevel, '季結前等級不變');

        // 存讀檔：指派、已讀、待生效升級都在
        await a.save();
        const b = build(adapter, []);
        assert.isTrue(await b.load());
        assert.equals(1, b.governanceAssignments.filter((g) => g.generalUid === 'clerk').length, '治理指派保留');
        assert.equals(day0, b.dailyNews.lastGeneratedDay, '日報日期保留');
        assert.isTrue(b.dailyNews.news.every((n) => n.read), '已讀狀態保留');
        b.recordLoginAt(DAY0 + 2 * 3600 * 1000);
        assert.equals(day0, b.dailyNews.lastGeneratedDay, '讀檔後同日重登不重生日報');
        assert.equals(lv0, b.territoryLevel, '讀檔後季結前等級仍不變');

        // 季結：升級生效；任務可選且產出受治理武將影響
        await b.advanceSeason();
        assert.equals(lv0 + 1, b.territoryLevel, '季結後太守府升級');
        const food0 = b.military.food;
        const task = await b.chooseDomesticTask('farming');
        assert.isTrue(task.ok, '內政可選');
        assert.isTrue(b.military.food >= food0, '糧草不減');

        // 隔天登入：新日報與晨報
        b.recordLoginAt(DAY0 + DAY_MS);
        assert.isTrue(b.dailyNews.lastGeneratedDay !== day0, '隔天生成新日報');
        await b.save();
        const c = build(adapter, []);
        assert.isTrue(await c.load());
        assert.equals(b.dailyNews.lastGeneratedDay, c.dailyNews.lastGeneratedDay, '新日報日期保留');
        assert.equals(lv0 + 1, c.territoryLevel, '等級保留');
        assert.equals(JSON.stringify(b.morningReport), JSON.stringify(c.morningReport), '晨報保留');
        assert.equals(1, c.governanceAssignments.filter((g) => g.generalUid === 'clerk').length, '指派仍在');
    });

    return suite;
}
