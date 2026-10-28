/**
 * ItemAcquisitionFlowE2E.test.ts — 道具取得來源紀錄跨長流程對帳（QA，PROG-2-1452）
 * 登入發令、季結求籤令、退役竹簡、里程碑多次入庫後，紀錄加總要與背包增量完全對得上；
 * 跨存讀檔保留；超過上限只留最後 200 筆但查詢仍正確。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { ITEM_ACQUISITION_LOG_LIMIT } from '../assets/scripts/core/systems/ItemAcquisitionLog';
import { ITEM_ADMISSION_TOKEN, ITEM_BAMBOO_SLIP, ITEM_ORACLE_TOKEN, STARTER_INVENTORY } from '../assets/scripts/core/systems/PlayerInventory';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { person } from './MvpMainFlowE2E.test';
import { sys } from 'cc';

const DAY0 = Date.UTC(2026, 2, 1, 4, 0);
const DAY_MS = 24 * 3600 * 1000;

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[] = []): GameSession {
    const s = new GameSession(13);
    s.setRosterStore(new InMemoryRosterStore(roster));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

/** 紀錄加總（全來源）與背包增量逐項對帳；這段流程沒有任何扣除 */
function assertLedgerMatches(session: GameSession, label: string): void {
    const logged: Record<string, number> = {};
    for (const r of session.itemAcquisitionLog) logged[r.itemId] = (logged[r.itemId] ?? 0) + r.amount;
    const inv = session.inventory;
    for (const id of new Set([...Object.keys(inv), ...Object.keys(logged)])) {
        const gained = (inv[id] ?? 0) - (STARTER_INVENTORY[id] ?? 0);
        assert.equals(gained, logged[id] ?? 0, `${label}：${id} 背包增量 ${gained} 應等於紀錄加總 ${logged[id] ?? 0}`);
    }
}

export function createItemAcquisitionFlowE2ESuite(): TestSuite {
    const suite = new TestSuite('ItemAcquisitionFlowE2E (道具來源紀錄對帳 PROG-2-1452)');

    suite.test('登入、季結、退役多次入庫：紀錄加總與背包增量對得上，來源分類正確，存讀檔後仍對得上', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [person('elder', '男', 64, { careerClass: 'Scholar' }), person('lead', '男', 30)]);
        a.startNewGame(21);
        for (let d = 0; d < 5; d++) a.recordLoginAt(DAY0 + d * DAY_MS);
        for (let i = 0; i < 6; i++) await a.advanceSeason();
        while (((a.getDeployableGenerals().find((g) => g.id === 'elder')?.age) ?? 99) < 65 && a.gameTime.totalSeasonsElapsed < 40) await a.advanceSeason();
        await a.retireGeneral('elder');
        assertLedgerMatches(a, '長流程後');

        const enroll = a.queryItemAcquisitions({ itemId: ITEM_ADMISSION_TOKEN });
        assert.isTrue(enroll.length >= 5 && enroll.every((r) => r.source === 'TASK'), '入學令都記為 TASK，每個登入日一筆');
        const slips = a.queryItemAcquisitions({ itemId: ITEM_BAMBOO_SLIP });
        assert.isTrue(slips.length >= 1 && slips.every((r) => r.source === 'DROP'), '退役竹簡記為 DROP');
        const oracle = a.queryItemAcquisitions({ itemId: ITEM_ORACLE_TOKEN });
        assert.isTrue(oracle.every((r) => r.source === 'EVENT'), '求籤令記為 EVENT');
        assert.equals(0, a.queryItemAcquisitions({ source: 'UNKNOWN' }).length, '沒有漏標來源');

        await a.save();
        const b = build(adapter, []);
        assert.isTrue(await b.load());
        assertLedgerMatches(b, '讀檔後');
        assert.equals(a.itemAcquisitionLog.length, b.itemAcquisitionLog.length, '紀錄筆數一致');
        b.recordLoginAt(DAY0 + 5 * DAY_MS);
        assertLedgerMatches(b, '讀檔後續登入');
    });

    suite.test('登入超過 200 天：紀錄只留最後 200 筆，存讀檔後內容完全一致', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter);
        a.startNewGame(22);
        for (let d = 0; d < ITEM_ACQUISITION_LOG_LIMIT + 30; d++) a.recordLoginAt(DAY0 + d * DAY_MS);
        const log = a.itemAcquisitionLog;
        assert.equals(ITEM_ACQUISITION_LOG_LIMIT, log.length, '只留上限筆數');
        assert.isTrue(log.every((r) => r.source === 'TASK' || r.source === 'EVENT' || r.source === 'DROP' || r.source === 'SHOP'), '保留的都有來源');
        await a.save();
        const b = build(adapter);
        assert.isTrue(await b.load());
        assert.equals(ITEM_ACQUISITION_LOG_LIMIT, b.itemAcquisitionLog.length);
        assert.equals(JSON.stringify(log), JSON.stringify(b.itemAcquisitionLog), '讀檔後內容完全一致');
    });

    return suite;
}
