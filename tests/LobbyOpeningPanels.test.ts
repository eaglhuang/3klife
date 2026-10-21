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
    suite.test('等待開局存檔才關閉宿命面板；先更新 HUD 再送 locked 事件', async () => {
        const f = fixture();
        let release!: () => void;
        let saveCount = 0;
        const save = f.session.save.bind(f.session);
        f.session.save = async () => {
            if (++saveCount === 1) await new Promise<void>(resolve => { release = resolve; });
            return save();
        };
        await f.panels.mountOnboarding();
        assert.isFalse(f.hosts.get('OnboardingTutorialHost')!.node.active);
        await f.panels.nextTutorial();
        assert.equals(0, f.session.onboarding.nextIndex);
        await f.panels.mountDestiny();
        f.panels.openDestiny();
        f.click('DestinyOpeningHost', 'btnDestinyRoll');
        await flush();
        f.click('DestinyOpeningHost', 'btnDestinyRow0');
        await flush();
        assert.isTrue(f.hosts.get('DestinyOpeningHost')!.node.active);
        assert.isFalse(f.events.includes('destiny-locked'));
        assert.isFalse(f.hosts.get('OnboardingTutorialHost')!.node.active);
        release();
        await flush();
        assert.isFalse(f.hosts.get('DestinyOpeningHost')!.node.active);
        assert.equals('hud,destiny-locked', f.events.filter(e => e === 'hud' || e === 'destiny-locked').join(','));
        assert.equals(6, f.session.roster.length);
        const tutorial = f.hosts.get('OnboardingTutorialHost')!;
        assert.isTrue(tutorial.node.active);
        assert.equals('1 / 3', tutorial.texts.tutorialStep);
        await f.panels.nextTutorial();
        await f.panels.nextTutorial();
        await f.panels.nextTutorial();
        assert.isFalse(tutorial.node.active);
    });
    suite.test('開局存檔失敗時教學保持隱藏；重試選將成功後才刷新顯示', async () => {
        const f = fixture();
        let fail = true;
        const save = f.session.save.bind(f.session);
        f.session.save = async () => { if (fail) throw new Error('save failed'); return save(); };
        await f.panels.mountOnboarding();
        await f.panels.mountDestiny();
        f.panels.openDestiny();
        f.click('DestinyOpeningHost', 'btnDestinyRoll');
        await flush();
        f.click('DestinyOpeningHost', 'btnDestinyRow0');
        await flush();
        assert.isTrue(f.hosts.get('DestinyOpeningHost')!.node.active);
        assert.isFalse(f.hosts.get('OnboardingTutorialHost')!.node.active);
        assert.isTrue(f.hosts.get('DestinyOpeningHost')!.texts.destinyMessage.includes('開局失敗'));
        fail = false;
        f.click('DestinyOpeningHost', 'btnDestinyRow0');
        await flush();
        assert.isFalse(f.hosts.get('DestinyOpeningHost')!.node.active);
        assert.isTrue(f.hosts.get('OnboardingTutorialHost')!.node.active);
        assert.equals(1, f.events.filter(e => e === 'destiny-locked').length);
    });
    suite.test('第一次自動存檔成功、第二次 onStarted 顯式存檔失敗；重試後才放行教學', async () => {
        const f = fixture();
        let calls = 0;
        let persisted = 0;
        const save = f.session.save.bind(f.session);
        f.session.save = async () => {
            if (++calls === 2) throw new Error('explicit onStarted save failed');
            const snapshot = await save();
            persisted++;
            return snapshot;
        };
        await f.panels.mountOnboarding();
        await f.panels.mountDestiny();
        f.panels.openDestiny();
        f.click('DestinyOpeningHost', 'btnDestinyRoll');
        await flush();
        f.click('DestinyOpeningHost', 'btnDestinyRow0');
        await flush();
        assert.equals(2, calls);
        assert.equals(1, persisted);
        assert.isTrue(f.hosts.get('DestinyOpeningHost')!.node.active);
        assert.contains(f.hosts.get('DestinyOpeningHost')!.texts.destinyMessage, 'explicit onStarted save failed');
        assert.isFalse(f.hosts.get('OnboardingTutorialHost')!.node.active);
        assert.equals(0, f.events.filter(e => e === 'hud' || e === 'destiny-locked').length);
        await f.panels.nextTutorial();
        assert.equals(0, f.session.onboarding.nextIndex);
        f.click('DestinyOpeningHost', 'btnDestinyRow0');
        await flush();
        assert.equals(4, calls);
        assert.equals(3, persisted);
        assert.equals(6, f.session.roster.length);
        assert.isFalse(f.hosts.get('DestinyOpeningHost')!.node.active);
        assert.isTrue(f.hosts.get('OnboardingTutorialHost')!.node.active);
        assert.equals('1 / 3', f.hosts.get('OnboardingTutorialHost')!.texts.tutorialStep);
        assert.equals('hud,destiny-locked', f.events.filter(e => e === 'hud' || e === 'destiny-locked').join(','));
    });
    for (const progress of ['missing', 1, 3] as const) {
        suite.test(`實際 JSON 舊檔 load→ready：引導進度 ${progress} 不重置`, async () => {
            const original = fixture();
            await original.panels.mountDestiny();
            original.panels.openDestiny();
            original.click('DestinyOpeningHost', 'btnDestinyRoll');
            await flush();
            original.click('DestinyOpeningHost', 'btnDestinyRow0');
            await flush();
            if (progress !== 'missing') {
                for (const segment of ['fate', 'growth', 'legacy'].slice(0, progress)) {
                    await original.session.acknowledgeOnboarding(segment as 'fate' | 'growth' | 'legacy');
                }
            }
            const snapshot = await original.session.save();
            if (progress === 'missing') delete snapshot.onboarding;
            const serialized = JSON.stringify(snapshot);
            const storage = new MemoryStorageAdapter();
            await storage.set(PLAYER_SAVE_KEY, JSON.parse(serialized));
            const restored = new GameSession();
            restored.setRosterStore(new InMemoryRosterStore([]));
            restored.setSaveService(new PlayerSaveService(storage));
            // Match LobbyScene's load-result decision; do not mock load or ready.
            const loaded = await restored.load();
            assert.isTrue(loaded);
            assert.equals(6, restored.roster.length);
            assert.equals(original.session.leadGeneralId, restored.leadGeneralId);
            const expected = progress === 'missing' ? 0 : progress;
            assert.equals(expected, restored.onboarding.nextIndex);
            const f = fixture(true, !loaded, restored);
            await f.panels.mountOnboarding();
            const tutorial = f.hosts.get('OnboardingTutorialHost')!;
            // No destiny controller was mounted in the restored lobby.
            assert.isTrue(!f.hosts.has('DestinyOpeningHost'));
            assert.equals(expected < 3, tutorial.node.active);
            if (expected < 3) {
                assert.equals(`${expected + 1} / 3`, tutorial.texts.tutorialStep);
                await f.panels.nextTutorial();
                assert.equals(expected + 1, restored.onboarding.nextIndex);
            } else {
                await f.panels.nextTutorial();
                assert.equals(3, restored.onboarding.nextIndex);
            }
        });
    }
    return suite;
}
