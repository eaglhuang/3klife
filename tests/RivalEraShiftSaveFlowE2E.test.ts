/**
 * RivalEraShiftSaveFlowE2E.test.ts — 天下大亂時代更迭的多季流程與存讀檔（QA，PROG-2-1485）
 * 他國魏國領土佔比 ≥ 0.9：第 1~3 季不重組，第 4 季（年度評估）AI 國家回到初始值；
 * 玩家名冊與領土不受影響；重組前存檔、換新 Session 讀檔再推，結果與不中斷連推完全一致。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { createRivalWorld, type RivalWorld } from '../assets/scripts/core/systems/RivalNations';
import { person } from './MvpMainFlowE2E.test';
import { sys } from 'cc';

function build(adapter: MemoryStorageAdapter, withRoster: boolean): GameSession {
    const s = new GameSession(17);
    s.setRosterStore(new InMemoryRosterStore(withRoster ? [person('lead', '男', 30)] : []));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    // 他國進攻擲骰固定不觸發，避免自動戰鬥干擾比對
    s.setRandomSource(() => 0.99);
    return s;
}

function dominantWei(): RivalWorld {
    const world = createRivalWorld();
    return { nations: world.nations.map((n) => (n.id === 'wei' ? { ...n, territories: 200 } : n)) };
}

function weiOf(s: GameSession) {
    return s.rivals.nations.find((n) => n.id === 'wei')!;
}

function snapshot(s: GameSession): string {
    return JSON.stringify(s.rivals.nations.map((n) => ({ id: n.id, t: n.territories, troops: n.troops, res: n.resources, gs: n.governedSeasons, rec: n.recruits, roster: n.roster, bonds: n.bonds })));
}

export function createRivalEraShiftSaveFlowE2ESuite(): TestSuite {
    const suite = new TestSuite('RivalEraShiftSaveFlowE2E (天下大亂多季存讀檔 PROG-2-1485)');

    suite.test('第 4 季才重組；玩家資產不動；第 3 季存讀檔再推與不中斷連推一致', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');

        // 對照組：不中斷連推 5 季
        const control = build(new MemoryStorageAdapter(), true);
        control.startNewGame(31);
        await control.setRivals(dominantWei());
        for (let i = 0; i < 5; i++) await control.advanceSeason();

        // 實驗組：推 3 季存檔 → 新 Session 讀檔 → 再推 2 季
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, true);
        a.startNewGame(31);
        await a.setRivals(dominantWei());
        const territoriesBefore = a.territories.length;
        for (let i = 0; i < 3; i++) {
            await a.advanceSeason();
            assert.equals(200, weiOf(a).territories, `第 ${i + 1} 季未到年度評估，不重組`);
        }
        await a.save();

        const b = build(adapter, false);
        assert.isTrue(await b.load(), '讀檔成功');
        assert.equals(200, weiOf(b).territories, '讀檔後魏國仍是重組前狀態');
        assert.equals(snapshot(a), snapshot(b), '讀檔後他國狀態一致');

        await b.advanceSeason(); // 第 4 季：年度評估
        assert.equals(5, weiOf(b).territories, '第 4 季年度評估，魏國回到初始領土');
        assert.equals(territoriesBefore, b.territories.length, '玩家領土不受重組影響');
        assert.equals(1, b.roster.filter((g) => g.id === 'lead').length, '玩家名冊不受影響');

        await b.advanceSeason();
        assert.isTrue(weiOf(b).territories <= 10, '重組後照常推進，不會再回到 200');
        assert.equals(snapshot(control), snapshot(b), '存讀檔後續推結果與不中斷連推一致');
    });

    suite.test('待命池與結緣：連推 10 季每國招募數＝待命池＋2×結緣對數，第 5 季存讀檔後續推與連推一致', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const control = build(new MemoryStorageAdapter(), true);
        control.startNewGame(31);
        for (let i = 0; i < 10; i++) await control.advanceSeason();

        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, true);
        a.startNewGame(31);
        for (let i = 0; i < 5; i++) await a.advanceSeason();
        await a.save();
        const b = build(adapter, false);
        assert.isTrue(await b.load());
        for (let i = 0; i < 5; i++) await b.advanceSeason();

        assert.equals(snapshot(control), snapshot(b), '待命池、結緣、招募紀錄與連推一致');
        for (const n of b.rivals.nations) {
            const r = n.recruits ?? { S: 0, A: 0, B: 0, C: 0 };
            const recruited = r.S + r.A + r.B + r.C;
            assert.equals(recruited, (n.roster ?? []).length + 2 * (n.bonds ?? []).length, `${n.id} 招募人數守恆`);
            assert.equals(5, recruited, `${n.id} 10 季共招募 5 名`);
        }
    });

    return suite;
}
