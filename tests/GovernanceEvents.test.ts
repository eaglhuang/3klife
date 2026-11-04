/**
 * GovernanceEvents.test.ts — 治理事件與季度治理報告（領地治理 §G，PROG-2-1773）
 *
 * Unity 對照：EditMode Test，驗事件擲骰、產出減半、存讀檔與報告句，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { buildDomesticRows } from '../assets/scripts/core/systems/DomesticPresenter';
import { EMPTY_DOMESTIC_LOG, domesticOutputFor, normalizeDomesticLog } from '../assets/scripts/core/systems/DomesticTasks';
import {
    governanceEventLine,
    governanceOutputMultiplier,
    governanceReportLine,
    normalizeGovernanceEvent,
    rollGovernanceEvent,
} from '../assets/scripts/core/systems/GovernanceEvents';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function setup(adapter = new MemoryStorageAdapter()): GameSession {
    const session = new GameSession();
    const roster = [{ id: 'a', name: 'a', faction: 'shu', gender: '男', age: 20, hp: 1000, maxLifespan: 70 } as unknown as GeneralConfig];
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    return session;
}

export function createGovernanceEventsSuite(): TestSuite {
    const suite = new TestSuite('GovernanceEvents');

    suite.test('擲骰：低於機率發生、高於機率不發生', () => {
        assert.equals('locust', rollGovernanceEvent(5, () => 0)?.id);
        assert.equals(5, rollGovernanceEvent(5, () => 0)?.season);
        assert.isTrue(rollGovernanceEvent(5, () => 0.99) === null);
    });

    suite.test('事件只影響發生那一季的對應任務', () => {
        const event = { id: 'locust', season: 3 };
        assert.equals(0.5, governanceOutputMultiplier(event, 'farming', 3));
        assert.equals(1, governanceOutputMultiplier(event, 'commerce', 3));
        assert.equals(1, governanceOutputMultiplier(event, 'farming', 4));
        assert.equals(1, governanceOutputMultiplier(null, 'farming', 3));
    });

    suite.test('倍率套到產出與面板列', () => {
        assert.equals(60, domesticOutputFor('farming', null, 0, 0.5).amount);
        const rows = buildDomesticRows(EMPTY_DOMESTIC_LOG, 1, () => null, 0, (task) => (task === 'farming' ? 0.5 : 1));
        assert.equals('糧草 +60', rows.find((row) => row.taskId === 'farming')?.outputText);
        assert.equals('黃金 +100', rows.find((row) => row.taskId === 'commerce')?.outputText);
    });

    suite.test('文案照規格；報告略過掛零資源', () => {
        assert.equals('郡城 發生蝗災！農耕產出本季 -50%', governanceEventLine({ id: 'locust', season: 1 }));
        assert.equals('本季治理成果：糧草 +120，黃金 +30', governanceReportLine({ gold: 30, food: 120, fame: 0 }));
        assert.isTrue(governanceReportLine({ food: 0 }) === null);
    });

    suite.test('存檔正規化：壞資料與舊檔都視為沒有事件', () => {
        assert.isTrue(normalizeGovernanceEvent(undefined) === null);
        assert.isTrue(normalizeGovernanceEvent({ id: 'nope', season: 1 }) === null);
        assert.isTrue(normalizeGovernanceEvent({ id: 'locust', season: 1.5 }) === null);
        assert.equals('locust', normalizeGovernanceEvent({ id: 'locust', season: 2 })?.id);
        assert.isTrue(normalizeDomesticLog({ lastSeason: 1, lastTask: 'farming', lastGrant: { resource: 'x', amount: 5 } }).lastGrant === undefined);
    });

    suite.test('換季發生蝗災：農耕減半、提示進 payload，下一季恢復', async () => {
        const session = setup();
        session.setGovernanceEventRandom(() => 0);
        const payload = await session.advanceSeason();
        assert.equals('郡城 發生蝗災！農耕產出本季 -50%', payload.governanceEventLine);
        const food = session.military.food;
        const cap = session.military.foodCap;
        const result = await session.chooseDomesticTask('farming');
        assert.equals(60, result.output?.amount);
        assert.equals(Math.min(cap, food + 60), session.military.food);
        session.setGovernanceEventRandom(() => 0.99);
        const next = await session.advanceSeason();
        assert.isTrue(next.governanceEventLine === undefined);
        assert.isTrue(session.activeGovernanceEvent === null);
    });

    suite.test('季度報告包含上一季內政產出', async () => {
        const session = setup();
        session.setGovernanceEventRandom(() => 0.99);
        let gold = 0;
        await session.chooseDomesticTask('commerce', (amount) => { gold += amount; });
        const payload = await session.advanceSeason();
        assert.isTrue((payload.governanceReport ?? '').includes(`黃金 +${gold}`));
        assert.isTrue(gold > 0);
        const quiet = await session.advanceSeason();
        assert.isFalse((quiet.governanceReport ?? '').includes('黃金'));
    });

    suite.test('事件存讀檔後仍有效', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = setup(adapter);
        session.setGovernanceEventRandom(() => 0);
        await session.advanceSeason();
        await session.save();
        const reloaded = setup(adapter);
        await reloaded.load();
        assert.equals('locust', reloaded.activeGovernanceEvent?.id);
        assert.equals(60, (await reloaded.chooseDomesticTask('farming')).output?.amount);
    });

    return suite;
}
