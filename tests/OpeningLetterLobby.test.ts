/**
 * OpeningLetterLobby.test.ts — 開場信件大廳掛載流程 headless 測試（PROG-2-1305）
 *
 * 鎖住：未讀且就緒時開啟並帶入標題與本文、關閉後隱藏並記為已讀、已讀後不再自動開。
 * 不開 Cocos：用假的 host 與 mountHost，只驗證 LobbyOpeningPanels 的顯示決策與存檔。
 *
 * Unity 對照：EditMode Test 驗證 Presenter 的顯示條件，不實例化 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { LobbyOpeningPanels, LobbyOpeningPanelPorts, LobbyOpeningPanelHost } from '../assets/scripts/ui/core/LobbyOpeningPanels';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';

interface FakeHost {
    node: { active: boolean };
    texts: Record<string, string>;
    bindings: { buttonId: string; handler: () => void }[];
}

async function makeSession(adapter: MemoryStorageAdapter): Promise<GameSession> {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

async function fixture(session: GameSession, isNewPlayer: boolean) {
    const hosts = new Map<string, FakeHost>();
    const ports = {
        session: () => session,
        generals: () => [],
        isNewPlayer: () => isNewPlayer,
        loadGachaConfig: async () => [],
        mountHost: async (name: string, _screen: string, bindings: { buttonId: string; handler: () => void }[]) => {
            const host: FakeHost = { node: { active: false }, texts: {}, bindings };
            hosts.set(name, host);
            return {
                node: host.node,
                binder: { setTexts: (texts: Record<string, string>) => { host.texts = texts; } },
            } as unknown as LobbyOpeningPanelHost;
        },
        bringToFront: () => undefined,
        refreshSeasonHud: () => undefined,
        notifyBeauty: () => undefined,
        advanceOpening: () => undefined,
        openingLetterText: () => ({ title: '標題', body: '第一段\n\n第二段' }),
        warn: () => undefined,
    } as unknown as LobbyOpeningPanelPorts;
    const panels = new LobbyOpeningPanels(ports);
    await panels.mountOpeningLetter();
    return { panels, hosts };
}

export function createOpeningLetterLobbySuite(): TestSuite {
    const suite = new TestSuite('OpeningLetterLobby (開場信件大廳掛載 PROG-2-1305)');

    suite.test('返回玩家未讀時開啟，並帶入標題與本文', async () => {
        const session = await makeSession(new MemoryStorageAdapter());
        const { hosts } = await fixture(session, false);
        const host = hosts.get('OpeningLetterHost')!;
        assert.isTrue(host.node.active);
        assert.equals('標題', host.texts.openingLetterTitle);
        assert.equals('第一段\n\n第二段', host.texts.openingLetterBody);
    });

    suite.test('新局在宿命開局開始前不開啟', async () => {
        const session = await makeSession(new MemoryStorageAdapter());
        const { hosts } = await fixture(session, true);
        assert.isFalse(hosts.get('OpeningLetterHost')!.node.active);
    });

    suite.test('關閉後隱藏並記為已讀；已讀的存檔讀回不再自動開', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await makeSession(adapter);
        const { panels, hosts } = await fixture(session, false);
        const host = hosts.get('OpeningLetterHost')!;
        await panels.closeOpeningLetter();
        assert.isFalse(host.node.active);
        assert.isTrue(session.openingLetter.seen);

        const restored = await makeSession(adapter);
        assert.isTrue(await restored.load());
        const again = await fixture(restored, false);
        assert.isFalse(again.hosts.get('OpeningLetterHost')!.node.active);
    });

    suite.test('已讀的 session 掛載時不自動開', async () => {
        const session = await makeSession(new MemoryStorageAdapter());
        await session.markOpeningLetterSeen();
        const { hosts } = await fixture(session, false);
        assert.isFalse(hosts.get('OpeningLetterHost')!.node.active);
    });

    return suite;
}
