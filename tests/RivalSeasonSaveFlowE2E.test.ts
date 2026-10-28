/**
 * RivalSeasonSaveFlowE2E.test.ts — 他國多季成長與招募的存讀檔流程（QA，PROG-2-1481）
 * 透過 GameSession.advanceSeason 連推多季：資源成長、每 2 季招募一名；
 * 中途存讀檔後繼續推進，結果必須與不中斷連推一致。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { NationState } from '../assets/scripts/core/systems/RivalNations';
import { sys } from 'cc';

function build(adapter: MemoryStorageAdapter): GameSession {
    const s = new GameSession(17);
    s.setRosterStore(new InMemoryRosterStore([]));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    // 他國進攻擲骰固定不觸發，避免自動戰鬥干擾比對
    s.setRandomSource(() => 0.99);
    return s;
}

function recruitTotal(n: NationState): number {
    const r = n.recruits ?? { S: 0, A: 0, B: 0, C: 0 };
    return r.S + r.A + r.B + r.C;
}

function snapshot(s: GameSession): string {
    return JSON.stringify(s.rivals.nations.map((n) => ({ id: n.id, troops: n.troops, res: n.resources, gs: n.governedSeasons, rec: n.recruits })));
}

export function createRivalSeasonSaveFlowE2ESuite(): TestSuite {
    const suite = new TestSuite('RivalSeasonSaveFlowE2E (他國多季存讀檔 PROG-2-1481)');

    suite.test('連推 6 季每 2 季招募；第 3 季後存讀檔再推，與不中斷連推結果一致', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');

        // 對照組：不中斷連推 6 季
        const control = build(new MemoryStorageAdapter());
        control.startNewGame(31);
        for (let i = 0; i < 6; i++) await control.advanceSeason();

        // 實驗組：推 3 季存檔，換新 Session 讀檔再推 3 季
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter);
        a.startNewGame(31);
        for (let i = 0; i < 3; i++) await a.advanceSeason();
        for (const n of a.rivals.nations) {
            assert.equals(3, n.governedSeasons ?? 0, `${n.id} 已治理 3 季`);
            assert.equals(1, recruitTotal(n), `${n.id} 第 2 季招募一名`);
        }
        await a.save();
        const midSnapshot = snapshot(a);

        const b = build(adapter);
        assert.isTrue(await b.load(), '讀檔成功');
        assert.equals(midSnapshot, snapshot(b), '讀檔後他國資源、招募、治理季數一致');
        for (let i = 0; i < 3; i++) await b.advanceSeason();

        for (const n of b.rivals.nations) {
            assert.equals(6, n.governedSeasons ?? 0, `${n.id} 治理季數延續到 6`);
            assert.equals(3, recruitTotal(n), `${n.id} 共招募 3 名，不重複不歸零`);
        }
        assert.equals(snapshot(control), snapshot(b), '存讀檔後續推結果與不中斷連推一致');
    });

    return suite;
}
