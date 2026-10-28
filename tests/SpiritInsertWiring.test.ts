/**
 * SpiritInsertWiring.test.ts — 插卡事件與存讀檔（TRP-18，暫定紋樣 id = 虎符 templateId）
 *
 * 重點：
 * - 插卡成功才發 TallySpiritInserted，帶 cardUid、generalId、sigilPatternId。
 * - 查無武將的插卡失敗，不發事件。
 * - 插卡後存檔、讀回，持有關係仍在（插卡演出不會因為重新載入而遺失）。
 *
 * Unity 對照：像 Equip() 成功後 Dispatch 一個 OnEquipped 事件，UI 監聽事件播動畫；失敗就不發。
 */
import { TestSuite, assert } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { EVENT_NAMES } from '../assets/scripts/core/config/Constants';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';

function general(id: string): GeneralConfig {
    return { id, name: id, status: 'alive' } as unknown as GeneralConfig;
}

function card(uid: string): TigerTallyCard {
    return { uid, templateId: 'tpl-' + uid, sourceGeneralUid: 'src', quality: 'R', score: 0, source: 'death', producedSeason: 1 };
}

function createSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([general('liu-bei')]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createSpiritInsertWiringSuite(): TestSuite {
    const suite = new TestSuite('SpiritInsertWiring (插卡事件與存讀檔 TRP-18)');

    suite.test('插卡成功發 TallySpiritInserted，sigilPatternId 為虎符 templateId', async () => {
        services().initialize();
        const session = createSession(new MemoryStorageAdapter());
        await session.registerTallyCards([card('t1')]);
        const payloads: Array<{ cardUid: string; generalId: string; sigilPatternId: string }> = [];
        const off = services().event.on(EVENT_NAMES.TallySpiritInserted, (data?: unknown) => {
            payloads.push(data as { cardUid: string; generalId: string; sigilPatternId: string });
        });
        try {
            const result = await session.equipTally('t1', 'liu-bei');
            assert.isTrue(result?.ok === true);
        } finally {
            off();
        }
        assert.equals(1, payloads.length);
        assert.equals('t1', payloads[0].cardUid);
        assert.equals('liu-bei', payloads[0].generalId);
        assert.equals('tpl-t1', payloads[0].sigilPatternId);
    });

    suite.test('查無武將的插卡失敗，不發事件', async () => {
        services().initialize();
        const session = createSession(new MemoryStorageAdapter());
        await session.registerTallyCards([card('t2')]);
        let fired = 0;
        const off = services().event.on(EVENT_NAMES.TallySpiritInserted, () => { fired++; });
        try {
            await session.equipTally('t2', 'no-such-general');
        } finally {
            off();
        }
        assert.equals(0, fired);
    });

    suite.test('插卡後存檔讀回，持有關係仍在', async () => {
        services().initialize();
        const adapter = new MemoryStorageAdapter();
        const session = createSession(adapter);
        await session.registerTallyCards([card('t3')]);
        await session.equipTally('t3', 'liu-bei');
        await session.save();

        const reloaded = createSession(adapter);
        assert.isTrue(await reloaded.load());
        assert.equals('t3', reloaded.tallyOf('liu-bei') ?? '');
    });

    return suite;
}
