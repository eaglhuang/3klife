import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { LobbyOpeningPanels, type LobbyOpeningPanelPorts, type LobbyOpeningPanelHost } from '../assets/scripts/ui/core/LobbyOpeningPanels';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService, PLAYER_SAVE_KEY } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GachaConfig } from '../assets/scripts/core/models/GachaConfig';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function fixture(hasPool = true, isNewPlayer = true, loadedSession?: GameSession) {
    const session = loadedSession ?? new GameSession();
    if (!loadedSession) {
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    }
    session.setRandomSource(() => 0.3);
    const read = <T>(file: string): T => JSON.parse(readFileSync(join(__dirname, '../assets/resources/data', file), 'utf8'));
    const hosts = new Map<string, { node: { active: boolean }; texts: Record<string, string>; bindings: { buttonId: string; handler: () => void }[] }>();
    const events: string[] = [];
    const ports: LobbyOpeningPanelPorts = {
        session: () => session,
        generals: () => read<GeneralConfig[]>('generals.json'),
        isNewPlayer: () => isNewPlayer,
        loadGachaConfig: async () => hasPool ? read<GachaConfig[]>('gacha-config.json') : [],
        mountHost: async (name, screen, bindings) => {
            events.push(`mount:${name}:${screen}`);
            const host = { node: { active: false }, texts: {}, bindings };
            hosts.set(name, host);
            return { node: host.node, binder: {
                setTexts: (texts: Record<string, string>) => { host.texts = texts; },
                setActives: () => undefined,
                getButton: () => null,
            } } as unknown as LobbyOpeningPanelHost;
        },
        bringToFront: () => { events.push('front'); },
        notifyBeauty: name => { events.push(`beauty:${name}`); },
        refreshSeasonHud: () => { events.push('hud'); },
        advanceOpening: event => { events.push(event.type); },
        warn: message => { events.push(message); },
    };
    const panels = new LobbyOpeningPanels(ports);
    const click = (host: string, id: string) => {
        const binding = hosts.get(host)?.bindings.find(b => b.buttonId === id);
        if (!binding) throw new Error(`Missing binding ${id}`);
        binding.handler();
    };
    return { panels, ports, session, hosts, events, click };
}

const flush = () => new Promise<void>(resolve => setImmediate(resolve));

export function createLobbyOpeningPanelsSuite(): TestSuite {
    const suite = new TestSuite('LobbyOpeningPanels extraction contracts');
    suite.test('沒有掛載的入口為 no-op；缺 hero-pool 保留警告且不建立面板', async () => {
        const f = fixture(false);
        f.panels.openDestiny();
        f.panels.refreshOnboarding();
        await f.panels.nextTutorial();
        await f.panels.mountDestiny();
        assert.equals(0, f.hosts.size);
        assert.isTrue(f.events[0].includes('找不到 hero-pool'));
    });
    suite.test('保留 host/screen 與六列按鈕契約；開啟與重置刷新畫面', async () => {
        const f = fixture();
        await f.panels.mountDestiny();
        const host = f.hosts.get('DestinyOpeningHost')!;
        assert.equals(9, host.bindings.length);
        assert.equals('mount:DestinyOpeningHost:destiny-opening-screen', f.events[0]);
        assert.isFalse(host.node.active);
        f.panels.openDestiny();
        assert.isTrue(host.node.active);
        f.click('DestinyOpeningHost', 'btnDestinyRoll');
        await flush();
        assert.isTrue(!!host.texts.destinyRow0Name);
        f.click('DestinyOpeningHost', 'btnDestinyReset');
        await flush();
        assert.equals('重置 1 次', host.texts.destinyResetCount);
    });
    suite.test('舊玩家維持教學顯示；下一步失敗仍警告並刷新', async () => {
        const f = fixture(true, false);
        await f.panels.mountOnboarding();
        const host = f.hosts.get('OnboardingTutorialHost')!;
        assert.isTrue(host.node.active);
        assert.equals('1 / 3', host.texts.tutorialStep);
        await f.panels.nextTutorial();
        assert.equals('2 / 3', host.texts.tutorialStep);
        f.session.acknowledgeOnboarding = async () => { throw new Error('save failed'); };
        await f.panels.nextTutorial();
        assert.equals('2 / 3', host.texts.tutorialStep);
        assert.isTrue(f.events.some(e => e.includes('新手引導存檔失敗')));
    });
    suite.test('latest master beauty roster and success notification remain after both saves', async () => {
        const f = fixture();
        await f.panels.mountDestiny();
        f.panels.openDestiny();
        f.click('DestinyOpeningHost', 'btnDestinyRoll');
        await flush();
        f.click('DestinyOpeningHost', 'btnDestinyRow0');
        await flush();
        assert.equals(7, f.session.roster.length);
        assert.equals(1, f.events.filter(e => e.startsWith('beauty:')).length);
        assert.isTrue(f.events.findIndex(e => e.startsWith('beauty:')) < f.events.indexOf('hud'));
        assert.isTrue(f.events.indexOf('hud') < f.events.indexOf('destiny-locked'));
        assert.isFalse(f.hosts.get('DestinyOpeningHost')!.node.active);
    });
    return suite;
}
