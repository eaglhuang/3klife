/**
 * NewPlayerOpening.test.ts — 新玩家開場一路走通（PROG-2-0646）
 *
 * Unity 對照：像開場 Timeline 的 PlayMode 測試：從第一幕翻頁一路點到宿命鎖定、新局開始。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GachaConfig } from '../assets/scripts/core/models/GachaConfig';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { destinyLockedEvent } from '../assets/scripts/core/systems/DestinyOpening';
import { createNewPlayerOpeningFlow, INTRO_PANELS, OPENING_INTRO_DONE } from '../assets/scripts/core/systems/NewPlayerOpening';
import { DestinyOpeningController } from '../assets/scripts/ui/core/DestinyOpeningController';
import { OpeningIntroController } from '../assets/scripts/ui/core/OpeningIntroController';

function readJson<T>(relative: string): T {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8')) as T;
}

function collectIds(node: any, out: Set<string>): void {
    if (node.id) out.add(node.id);
    for (const child of node.children ?? []) collectIds(child, out);
}

export function createNewPlayerOpeningSuite(): TestSuite {
    const suite = new TestSuite('NewPlayerOpening (新玩家開場流程)');

    suite.test('第一幕四頁：古文 → 信件（按鈕為「開始宿命轉蛋」）→ 像素回憶 → 漩渦', () => {
        assert.equals('ancient,letter,pixel,vortex', INTRO_PANELS.map(p => p.id).join(','));
        assert.equals('開始宿命轉蛋', INTRO_PANELS[1].button);
    });

    suite.test('OpeningIntroController 逐頁翻，翻完最後一頁才回傳 true，之後不再動作', () => {
        const intro = new OpeningIntroController();
        const seen: string[] = [];
        for (let i = 0; i < INTRO_PANELS.length; i++) {
            const view = intro.getFlowView();
            seen.push(view.texts.introStep);
            assert.isTrue(view.actives.introCard);
            assert.equals(i === INTRO_PANELS.length - 1, intro.next());
        }
        assert.equals('1 / 4,2 / 4,3 / 4,4 / 4', seen.join(','));
        const done = intro.getFlowView();
        assert.isFalse(done.actives.introCard);
        assert.isFalse(done.enabled.btnIntroNext);
        assert.isFalse(intro.next());
    });

    suite.test('幕序：start → intro；intro-done → destiny；destiny-locked → 結束', () => {
        const flow = createNewPlayerOpeningFlow();
        assert.equals('intro', flow.start()!.id);
        assert.equals('intro', flow.advance({ type: 'destiny-locked' })!.id);
        assert.equals('destiny', flow.advance({ type: OPENING_INTRO_DONE })!.id);
        assert.equals(null, flow.advance({ type: 'destiny-locked' }));
    });

    suite.test('一路走通：翻完第一幕 → 宿命轉蛋 → 鎖定後開新局，幕序結束', async () => {
        const generals = readJson<GeneralConfig[]>('assets/resources/data/generals.json');
        const heroPool = readJson<GachaConfig[]>('assets/resources/data/gacha-config.json').find(c => c.poolId === 'hero-pool')!;
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        session.setRandomSource(() => 0.4);

        const flow = createNewPlayerOpeningFlow();
        flow.start();
        const intro = new OpeningIntroController();
        let finished = false;
        while (!finished) finished = intro.next();
        assert.equals('destiny', flow.advance({ type: OPENING_INTRO_DONE })!.id);

        const destiny = new DestinyOpeningController({
            config: () => heroPool, generals: () => generals, session,
            random: session.randomSource, seed: () => 1, onStarted: async () => { await session.save(); },
        });
        assert.isTrue(destiny.roll());
        assert.equals(null, destinyLockedEvent(destiny.state));
        assert.isTrue(await destiny.select(0));
        const locked = destinyLockedEvent(destiny.state)!;
        assert.equals(null, flow.advance(locked));
        assert.equals(destiny.state.locked, session.leadGeneralId);
        assert.equals(6, session.roster.length);
    });

    suite.test('開場後半：宿命鎖定存檔 → 重開不再是新玩家 → 首戰勝利 → 紅顏只彈一次（存讀往返）', async () => {
        const generals = readJson<GeneralConfig[]>('assets/resources/data/generals.json');
        const heroPool = readJson<GachaConfig[]>('assets/resources/data/gacha-config.json').find(c => c.poolId === 'hero-pool')!;
        const adapter = new MemoryStorageAdapter();
        const make = (): GameSession => {
            const s = new GameSession();
            s.setRosterStore(new InMemoryRosterStore([]));
            s.setSaveService(new PlayerSaveService(adapter));
            s.setRandomSource(() => 0.4);
            return s;
        };

        const first = make();
        assert.isFalse(await first.load(), '新玩家沒有存檔');
        const destiny = new DestinyOpeningController({
            config: () => heroPool, generals: () => generals, session: first,
            random: first.randomSource, seed: () => 1, onStarted: async () => { await first.save(); },
        });
        destiny.roll();
        assert.isTrue(await destiny.select(1));
        const leadId = first.leadGeneralId!;

        // 重開遊戲：讀得到存檔（LobbyScene 不再開開場），主將仍是所選，尚未打過首戰
        const second = make();
        assert.isTrue(await second.load());
        assert.equals(leadId, second.leadGeneralId);
        assert.isFalse(second.shouldShowOpeningRedFace);

        await second.recordBattle([leadId], 'player-win');
        assert.isTrue(second.shouldShowOpeningRedFace, '首戰通過後該彈紅顏');
        await second.markOpeningRedFaceShown();

        const third = make();
        assert.isTrue(await third.load());
        assert.isTrue(third.firstBattleCleared);
        assert.isFalse(third.shouldShowOpeningRedFace, '展示過不再彈');
        assert.equals(leadId, third.leadGeneralId);
    });

    suite.test('opening-intro layout 含 FlowView 所有 key，skin 含全部 slot', () => {
        const layout = readJson<any>('assets/resources/ui-spec/layouts/opening-intro-main.json');
        const ids = new Set<string>();
        collectIds(layout.root, ids);
        const view = new OpeningIntroController().getFlowView();
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)]) {
            assert.isTrue(ids.has(key), `layout 缺少節點 ${key}`);
        }
        const skin = readJson<any>('assets/resources/ui-spec/skins/opening-intro-screen.skin.json');
        for (const entry of JSON.stringify(layout).match(/"(?:skinSlot|styleSlot)":\s*"([^"]+)"/g) ?? []) {
            const slot = entry.replace(/.*:\s*"/, '').replace(/"$/, '');
            assert.isDefined(skin.slots[slot], `skin 缺少 ${slot}`);
        }
        assert.equals('opening-intro-main', readJson<any>('assets/resources/ui-spec/screens/opening-intro-screen.json').layout);
    });

    return suite;
}
