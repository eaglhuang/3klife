import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { presentLobbyLead } from '../assets/scripts/ui/core/LobbyLeadPresentation';
import { sceneLoadingProgressText } from '../assets/scripts/ui/core/UIBloodlineMirrorLoading';

const read = (path: string): string => readFileSync(join(__dirname, '..', path), 'utf8');
export function createNewcomerUiRegressionSuite(): TestSuite {
    const suite = new TestSuite('新手試玩 UI 回歸 PROG-2-2209');
    suite.test('主將立繪與姓名同源，載入前先清空關羽範例圖', async () => {
        let frame: string | null = '關羽';
        let visible = true;
        let texts: Record<string, string> = {};
        let loadedId = '';
        await presentLobbyLead<string>({ id: 'xiahou-dun', name: '夏侯惇', title: '魏武元勳' }, {
            setTexts: value => { texts = value; }, setFrame: value => { frame = value; },
            setVisible: value => { visible = value; }, isCurrent: () => true,
            load: async id => { assert.equals(null, frame); assert.isFalse(visible); loadedId = id; return '夏侯惇立繪'; },
        });
        assert.equals('xiahou-dun', loadedId);
        assert.equals('夏侯惇', texts.LobbyMainScreen_div_22);
        assert.equals('魏武元勳', texts.LobbyMainScreen_div_23);
        assert.equals('夏侯惇立繪', frame); assert.isTrue(visible);
    });
    suite.test('切換主將或宿主後，過期立繪不得覆蓋', async () => {
        const frames: (string | null)[] = [];
        await presentLobbyLead<string>({ id: 'xiahou-dun', name: '夏侯惇' }, {
            setTexts: () => undefined, setFrame: value => { frames.push(value); },
            setVisible: () => undefined, isCurrent: () => false, load: async () => '過期立繪',
        });
        assert.equals(1, frames.length); assert.equals(null, frames[0]);
    });
    suite.test('沒有主將或缺圖時不回退到關羽', async () => {
        let visible = true;
        let texts: Record<string, string> = {};
        let loads = 0;
        const ports = { setTexts: (v: Record<string, string>) => { texts = v; }, setFrame: (_v: string | null) => undefined,
            setVisible: (v: boolean) => { visible = v; }, isCurrent: () => true, load: async () => { loads++; return null; } };
        await presentLobbyLead<string>(null, ports);
        assert.equals(0, loads); assert.equals('', texts.LobbyMainScreen_div_22); assert.isFalse(visible);
        await presentLobbyLead<string>({ id: 'missing', name: '缺圖武將' }, ports);
        assert.equals(1, loads); assert.isFalse(visible);
    });
    suite.test('載入進度來自實際數量且限制在零到一百', () => {
        assert.equals('載入中…', sceneLoadingProgressText(0, 0));
        assert.equals('載入中…', sceneLoadingProgressText(NaN, 10));
        assert.equals('載入中 25%', sceneLoadingProgressText(1, 4));
        assert.equals('載入中 100%', sceneLoadingProgressText(50, 4));
        assert.equals('載入中 0%', sceneLoadingProgressText(-1, 4));
    });
    suite.test('真載入不使用範例 42% 與繼續觀測，輪播後也要重套進度', () => {
        const src = read('assets/scripts/ui/scenes/LoadingScene.ts');
        assert.contains(src, 'sceneLoadingProgressText(completedCount, totalCount)');
        assert.contains(src, 'PrimaryActionButton: false');
        assert.contains(src, 'carousel.next(); this._refreshSceneLoadingProgress();');
        assert.contains(src, 'hostNode.active = false');
    });
    suite.test('宿命台詞不壓住第二排卡片，稱號字級不縮回 22', () => {
        const layout = JSON.parse(read('assets/resources/ui-spec/layouts/destiny-opening-main.json'));
        const nodes: Record<string, any> = {};
        const walk = (n: any): void => { if (n.id) nodes[n.id] = n; for (const c of n.children ?? []) walk(c); };
        walk(layout.root);
        const quote = nodes.destinyQuote;
        for (let i = 0; i < 10; i++) {
            const card = nodes[`btnFrame${i}`];
            assert.isTrue(card.widget.top + card.height <= quote.widget.top);
            assert.isTrue(nodes[`frame${i}Sub`].height >= 32);
        }
        assert.isTrue(quote.widget.top + quote.height <= nodes.btnDestinyRoll.widget.top);
        const skin = JSON.parse(read('assets/resources/ui-spec/skins/destiny-opening-screen.skin.json'));
        assert.isTrue(skin.slots['pg.label.sub'].fontSize >= 26);
    });
    suite.test('標題初始化先藏舊標題（含預設 Button），載入失敗才拿出 BtnStart 備援且不放回 Button（PROG-2-2240）', () => {
        const src = read('assets/scripts/ui/scenes/LoginScene.ts');
        const onLoad = src.slice(src.indexOf('onLoad(): void'), src.indexOf('start(): void'));
        assert.contains(onLoad, '_setLegacyTitleActive(this.node, false)');
        assert.contains(src, "const LEGACY_TITLE_NODES: readonly string[] = ['Button', 'TitleLabel', 'SubtitleLabel', 'BtnStart'];");
        const fallback = src.slice(src.indexOf('} catch (error) {'), src.indexOf('hostNode.destroy();'));
        assert.contains(fallback, '_setLegacyTitleActive(this.node, true)');
        assert.contains(fallback, "_hideNamed(this.node, 'Button')");
    });
    suite.test('戰鬥在第一個 await 前遮蔽 UI，正式背景及 HUD 完成後才揭露', () => {
        const src = read('assets/scripts/battle/views/BattleScene.ts');
        assert.isTrue(src.indexOf('opacity = 0') < src.indexOf('async start()'));
        const reveal = src.indexOf('this._startupOpacity.opacity = 255');
        assert.isTrue(src.indexOf('await initSceneBackground') < reveal);
        assert.isTrue(src.indexOf('await this.hud.waitUntilReady(15000)') < reveal);
    });
    suite.test('宿命轉蛋面板沒掛上先重掛再開，新玩家不跳日報（PROG-2-2241，issue #2099）', () => {
        const src = read('assets/scripts/ui/scenes/LobbyScene.ts');
        const open = src.slice(src.indexOf('public openDestinyOpening(): void {'));
        const body = open.slice(0, open.indexOf('\n    }\n'));
        assert.isTrue(body.indexOf('this._mountDestinyOpening()') > 0, '先重掛');
        assert.isTrue(body.indexOf('this._mountDestinyOpening()') < body.indexOf('this._openingUnavailable = true'), '重掛後才放棄');
        assert.isTrue(src.includes('this._isNewPlayer || this._isOpeningInProgress() ? null : this._dailyReport'), '新玩家不開日報');
    });
    suite.test('大廳對話泡泡選項可點並收起泡泡（PROG-2-2241，issue #2099）', () => {
        const src = read('assets/scripts/ui/core/LobbyHallScreenBinder.ts');
        assert.isTrue(src.includes("'lobby-hall-screen.bubble'"));
        assert.isTrue(src.includes('bubble.active = false'));
        assert.isTrue(src.includes('this._bindBubbleChoices();'));
        // #2107-9：泡泡本體也能點
        assert.isTrue(src.includes('bubble.on(Node.EventType.TOUCH_END'));
        // #2107-3：名牌等小人站位算好才建立
        const crowd = readFileSync(join(__dirname, '../assets/scripts/ui/components/HallStageCrowd.ts'), 'utf8');
        assert.isTrue(crowd.indexOf('const tag = this._makeLabel') > crowd.indexOf('await this._loadFirst'));
    });
    return suite;
}
