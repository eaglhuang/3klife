// @spec-source → 新手開場規格書 §16.5、三國季報規格書 §一、§三；PROG-2-2208；Issue #2067
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { createNewPlayerOpeningFlow, OPENING_INTRO_DONE, SHOWCASE_DONE_EVENT } from '../assets/scripts/core/systems/NewPlayerOpening';
import { DESTINY_LOCKED_EVENT_TYPE } from '../assets/scripts/core/systems/DestinyOpening';
import { chronicleShouldOpen, type SeasonChronicleState } from '../assets/scripts/core/systems/SeasonChronicle';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { LobbyOpeningPanels, type LobbyOpeningPanelHost } from '../assets/scripts/ui/core/LobbyOpeningPanels';
import { canShowSeasonChronicle, SeasonChroniclePopupController } from '../assets/scripts/ui/core/SeasonChroniclePopupController';

async function fixture(returning = false) {
    const context = { openingUiReady: false, openingInProgress: !returning,
        onboarding: { nextIndex: returning ? 3 : 0 }, openingLetter: { seen: returning } };
    const state: SeasonChronicleState = { season: 0, trend: '天下大勢', gossip: [], encounterId: 'ROAD_DOCTOR', encounterChoice: null, read: false };
    const host = { node: { active: true }, binder: null };
    let reads = 0;
    let opened = 0;
    const popup = new SeasonChroniclePopupController({
        mountHost: async () => host,
        apply: () => undefined, state: () => state, archive: () => [], seasonLabel: () => '第一季',
        markRead: () => { reads++; state.read = true; },
        resolve: async (option) => { state.encounterChoice = option; return { ok: true as const, line: '已抉擇' }; },
        toast: () => undefined,
        canOpen: () => canShowSeasonChronicle(context), onOpened: () => { opened++; },
    });
    await popup.mount();
    return { popup, host, context, state, reads: () => reads, opened: () => opened };
}

export function createSeasonChronicleOnboardingSuite(): TestSuite {
    const suite = new TestSuite('SeasonChronicleOnboarding');
    suite.test('新玩家：掛載、旁白、信件、宿命轉蛋與名將介紹期間季報不開、不標已讀、不跳過抉擇', async () => {
        const f = await fixture();
        assert.isFalse(f.host.node.active);
        assert.isFalse(f.popup.open());
        f.context.openingUiReady = true;
        const flow = createNewPlayerOpeningFlow();
        flow.start();
        for (const event of [OPENING_INTRO_DONE, DESTINY_LOCKED_EVENT_TYPE, SHOWCASE_DONE_EVENT]) {
            f.context.openingInProgress = flow.current() !== null;
            assert.isFalse(f.popup.open());
            assert.isFalse(f.host.node.active);
            flow.advance({ type: event });
        }
        f.context.openingInProgress = false;
        assert.isFalse(f.popup.refreshAvailability(), '三段教學未完成仍不可開');
        assert.equals(0, f.reads());
        assert.equals(null, f.state.encounterChoice);
        assert.isFalse(f.state.read);
    });
    suite.test('新玩家：三段教學與信件全部退場後只開一次，重複刷新與重複排隊不重播', async () => {
        const f = await fixture();
        f.popup.open(); f.popup.open();
        f.context.openingUiReady = true;
        f.context.openingInProgress = false;
        f.context.openingLetter.seen = true;
        for (let n = 0; n < 3; n++) {
            f.context.onboarding.nextIndex = n;
            assert.isFalse(f.popup.refreshAvailability());
            assert.isFalse(f.host.node.active);
        }
        f.context.onboarding.nextIndex = 3;
        assert.isTrue(f.popup.refreshAvailability());
        assert.isTrue(f.host.node.active);
        assert.equals(1, f.reads()); assert.equals(1, f.opened());
        f.popup.refreshAvailability(); f.popup.open();
        assert.equals(1, f.reads());
        await f.popup.respond(1);
        f.popup.close();
        assert.isFalse(f.host.node.active);
        assert.isFalse(f.popup.refreshAvailability());
        assert.equals(1, f.opened());
    });
    suite.test('舊玩家：已完成開場的首登照常開啟；戰後返回仍不觸發季報', async () => {
        const f = await fixture(true);
        f.context.openingUiReady = true;
        assert.isTrue(chronicleShouldOpen(f.state, 0, 'daily-first-login'));
        assert.isTrue(f.popup.open());
        assert.isTrue(f.popup.isOpen);
        assert.equals(1, f.reads());
        assert.isFalse(chronicleShouldOpen(f.state, 0, 'battle-return'));
    });
    suite.test('讀檔接續：即使教學已完成，未播完的開場或未讀信件仍阻擋季報', async () => {
        const f = await fixture(true);
        f.context.openingUiReady = true;
        f.context.openingInProgress = true;
        f.popup.open();
        assert.isFalse(f.popup.isOpen);
        f.context.openingInProgress = false;
        f.context.openingLetter.seen = false;
        assert.isFalse(f.popup.refreshAvailability());
        f.context.openingLetter.seen = true;
        assert.isTrue(f.popup.refreshAvailability());
        assert.equals(1, f.reads());
    });
    suite.test('殘影防護：出現開場遮擋時停用整個季報 host，不強制抉擇；解除後可正常收起', async () => {
        const f = await fixture(true);
        f.context.openingUiReady = true;
        f.popup.open();
        f.context.openingInProgress = true;
        f.popup.refreshAvailability();
        assert.isFalse(f.host.node.active, '不是只把透明度改成零');
        assert.equals(null, f.state.encounterChoice);
        await f.popup.respond(0);
        assert.equals(null, f.state.encounterChoice, '隱藏期間不得回應按鈕');
        f.context.openingInProgress = false;
        assert.isTrue(f.popup.refreshAvailability());
        f.popup.close();
        assert.isTrue(f.popup.isOpen, '保留必須完成抉擇才可收起的規則');
        await f.popup.respond(1);
        f.popup.close();
        assert.isFalse(f.host.node.active);
    });
    suite.test('沒有季報與沒有待開請求時，開場結束不憑空新增彈窗', async () => {
        const f = await fixture(true);
        f.context.openingUiReady = true;
        assert.isFalse(f.popup.refreshAvailability());
        f.state.season = -1;
        assert.isFalse(f.popup.open());
        assert.isFalse(f.popup.refreshAvailability());
        assert.equals(0, f.reads());
    });
    suite.test('面板整合：信件關閉與第三段教學退場才釋放季報，三者不會同時顯示', async () => {
        const f = await fixture();
        const session = new GameSession();
        const hosts = new Map<string, LobbyOpeningPanelHost>();
        f.context.openingUiReady = true;
        f.context.openingInProgress = false;
        const sync = () => {
            f.context.onboarding = session.onboarding;
            f.context.openingLetter = session.openingLetter;
            f.popup.refreshAvailability();
        };
        const panels = new LobbyOpeningPanels({
            session: () => session, generals: () => [], isNewPlayer: () => false,
            loadGachaConfig: async () => [],
            mountHost: async (name) => {
                const host = { node: { active: false }, binder: null } as unknown as LobbyOpeningPanelHost;
                hosts.set(name, host); return host;
            },
            bringToFront: () => undefined, refreshSeasonHud: () => undefined,
            notifyBeauty: () => undefined, advanceOpening: () => undefined,
            warn: () => undefined, onOverlayChanged: sync,
        });
        f.popup.open();
        await panels.mountOpeningLetter();
        assert.isTrue(hosts.get('OpeningLetterHost')!.node.active);
        assert.isFalse(f.popup.isOpen);
        await panels.closeOpeningLetter();
        await panels.mountOnboarding();
        for (let i = 0; i < 3; i++) {
            assert.isTrue(hosts.get('OnboardingTutorialHost')!.node.active);
            assert.isFalse(f.popup.isOpen);
            await panels.nextTutorial();
        }
        assert.isFalse(hosts.get('OpeningLetterHost')!.node.active);
        assert.isFalse(hosts.get('OnboardingTutorialHost')!.node.active);
        assert.isTrue(f.popup.isOpen);
        assert.equals(1, f.opened());
    });
    suite.test('場景接線：自動首登與手動開窗共用守衛，開場完成及面板退場都會重查', () => {
        const scene = readFileSync(join(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        const panels = readFileSync(join(__dirname, '../assets/scripts/ui/core/LobbyOpeningPanels.ts'), 'utf8');
        assert.contains(scene, 'private _openingUiReady = false');
        assert.contains(scene, 'canOpen: () => canShowSeasonChronicle(');
        assert.contains(scene, 'onOpened: (host) => this._bringNodeToFront(host.node)');
        assert.contains(scene, 'onOverlayChanged: () => { this._seasonChroniclePopup?.refreshAvailability(); }');
        assert.contains(panels, 'this._ports.onOverlayChanged?.()');
        assert.contains(scene, "this._openSeasonChronicle('daily-first-login')");
        assert.contains(scene, 'if (session.seasonChronicleUnread) chronicle?.open()');
    });
    return suite;
}
