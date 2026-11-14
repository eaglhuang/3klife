// @spec-source → Issue #2159；PROG-2-9032
import { TestSuite, assert } from './TestRunner';
import { EVENT_NAMES, Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';

const Module = require('module');
const _origLoad = Module._load;
Module._load = function (request: string, parent: unknown, isMain: boolean) {
    if (request === 'cc/env') {
        return { EDITOR: false, PREVIEW: false };
    }
    return _origLoad.call(this, request, parent, isMain);
};

const { Node, UITransform, Widget, Label, Sprite, Button } = require('cc');
Button.EventType ??= { CLICK: 'click' };
const { UISpecLoader } = require('../assets/scripts/ui/core/UISpecLoader');
const { clampGeneralOverlayPosition, UnitRenderer } = require('../assets/scripts/battle/views/UnitRenderer');
const { UIScreenPreviewHost } = require('../assets/scripts/ui/components/UIScreenPreviewHost');
const { BattleHUDComposite } = require('../assets/scripts/ui/components/BattleHUDComposite');
const { ActionCommandComposite } = require('../assets/scripts/ui/components/ActionCommandComposite');
const { ResultPopupComposite } = require('../assets/scripts/ui/components/ResultPopupComposite');
const { BattleUIBridge, createBattleSceneContext } = require('../assets/scripts/battle/views/BattleUIBridge');
const fs = require('fs');
const path = require('path');

function makeRichNode(name: string, parent: any = null): any {
    const node = new Node(name);
    node.parent = parent;
    node.children = [];
    node.siblingHistory = [];
    node.addChild = (child: any) => {
        child.parent = node;
        node.children.push(child);
    };
    node.setParent = (p: any) => {
        node.parent = p;
    };
    node.setSiblingIndex = (idx: number) => {
        node.siblingIndex = idx;
        node.siblingHistory.push(idx);
    };
    node.getSiblingIndex = () => node.siblingIndex ?? 0;
    node.setPosition = () => undefined;
    node.getComponentsInChildren = () => [];
    return node;
}

export function createIssue2159BattleHudRetreatFixesSuite(): TestSuite {
    const suite = new TestSuite('Issue2159BattleHudRetreatFixes');

    suite.test('UISpecLoader.loadI18n 與 UIScreenPreviewHost 對空語系退回 zh-TW 且不因載入失敗崩潰', async () => {
        const loadedPaths: string[] = [];
        const loader = new UISpecLoader({
            loadJson: async (p: string) => {
                loadedPaths.push(p);
                return { 'ui.test': 'OK' };
            },
        } as any);

        const r1 = await loader.loadI18n('');
        const r2 = await loader.loadI18n('   ');
        assert.equals('OK', r1['ui.test']);
        assert.equals('OK', r2['ui.test']);
        assert.equals('i18n/zh-TW', loadedPaths[0]);
        assert.equals('i18n/zh-TW', loadedPaths[1]);

        services().initialize();
        const origLocale = services().i18n.currentLocale;
        const origSpecLoader = (services() as any).specLoader;
        const previewLoaded: string[] = [];
        let builtI18n: any = null;
        try {
            (services().i18n as any)._locale = '';
            const host = new Node('PreviewHost').addComponent(UIScreenPreviewHost);
            host.locale = '  ';
            Object.defineProperty(host, '_specLoader', {
                get: () => ({
                    invalidateScreen: () => undefined,
                    loadFullScreen: async () => ({
                        screen: { id: 'bloodline-mirror-loading-screen' },
                        layout: { root: { name: 'Root' } },
                        skin: { slots: {} },
                    }),
                    loadI18n: async (loc: string) => {
                        previewLoaded.push(loc);
                        throw new Error('simulated missing i18n');
                    },
                    loadDesignTokensForScreen: async () => ({}),
                }),
                configurable: true,
            });
            host._destroyBuiltChildren = () => undefined;
            host.buildScreen = async (_l: any, _s: any, i18n: any) => { builtI18n = i18n; };
            host._loadDefaultFragments = async () => undefined;
            host._installSyncedInteractionSidecars = async () => undefined;
            host._applyRuntimeState = async () => undefined;

            await host.showScreen('bloodline-mirror-loading-screen');
            assert.equals('zh-TW', previewLoaded[0]);
            assert.isTrue(builtI18n !== null && typeof builtI18n === 'object');
        } finally {
            (services().i18n as any)._locale = origLocale;
            if (origSpecLoader) {
                Object.defineProperty(services(), 'specLoader', { value: origSpecLoader, configurable: true });
            }
        }
    });

    suite.test('BattleHUDComposite.show 與 ActionCommandComposite.mount 可接收並渲染初期 SP，不殘留準備中佔位字', async () => {
        services().initialize();
        const ccMod = require('cc');
        const oldOff = ccMod.director?.off;
        if (ccMod.director && !ccMod.director.off) {
            ccMod.director.off = () => undefined;
        }

        const hudNode = makeRichNode('HUD');
        const hud = hudNode.addComponent(BattleHUDComposite);
        try {
            hud._isActiveBattleScene = () => true;
            hud._spLabel = { string: 'SP 準備中' };
            hud._chargeLabel = { string: '奧義數值準備中' };
            hud._spReadyLabel = { string: '奧義準備中' };
            hud._spFill = { setScale: () => undefined };
            hud.mount = async () => undefined;

            await hud.show();
            // show() 完成訂閱後收到來自 BattleScene.refreshBattleViews() 的初始 GeneralSpChanged
            services().event.emit(EVENT_NAMES.GeneralSpChanged, {
                faction: Faction.Player,
                sp: 45,
                maxSp: 100,
            });
            assert.equals('SP 45/100', hud._spLabel.string);
            assert.equals('奧義蓄力中', hud._spReadyLabel.string);
        } finally {
            hud['_unsubs']?.forEach((fn: () => void) => fn());
            if (hud['_unsubs']) hud['_unsubs'].length = 0;
            if (ccMod.director) {
                if (oldOff === undefined) delete ccMod.director.off;
                else ccMod.director.off = oldOff;
            }
        }

        const cmdNode = makeRichNode('ActionCmd');
        const cmd = cmdNode.addComponent(ActionCommandComposite);
        const spRingNode = new Node('SpRing');
        const spRingSprite = spRingNode.addComponent(Sprite);
        const ultLabelNode = new Node('UltLabel');
        const ultLabel = ultLabelNode.addComponent(Label);
        ultLabel.string = '奧義準備中';
        const spPctNode = new Node('SpPctLabel');
        spPctNode.active = true;
        const spPctLabel = spPctNode.addComponent(Label);
        spPctLabel.string = 'SP 準備中';

        const mockBinder = {
            getNode: (name: string) => (name === 'SpRing' ? spRingNode : null),
            getLabel: (name: string) => {
                if (name === 'UltLabel') return ultLabel;
                if (name === 'SpPctLabel') return spPctLabel;
                return null;
            },
        };

        const protoParent = Object.getPrototypeOf(ActionCommandComposite.prototype);
        const origProtoMount = protoParent.mount;
        protoParent.mount = async function () {
            services().event.emit(EVENT_NAMES.GeneralSpChanged, {
                faction: Faction.Player,
                sp: 60,
                maxSp: 100,
            });
            cmd._onAfterBuildReady(mockBinder);
        };
        try {
            await cmd.mount();
            assert.equals(0.6, Number(spRingSprite.fillRange.toFixed(2)));
            assert.equals('SP 60%', spPctLabel.string);
            assert.isFalse(ultLabel.string === '奧義準備中');
        } finally {
            protoParent.mount = origProtoMount;
            cmd['_unsubs']?.forEach((fn: () => void) => fn());
            if (cmd['_unsubs']) cmd['_unsubs'].length = 0;
        }
    });

    suite.test('UnitRenderer 夾限主將名牌避開左側虎符列與右上軍師區，且 UnitOverlayRoot 置於最底層', () => {
        // 1920x1080 基準：左緣虎符安全界 -570、右緣軍師安全界 530、上下 [-220, 310]
        const leftClamped = clampGeneralOverlayPosition(-880, -350, 1920, 1080);
        assert.equals(-570, leftClamped.x);
        assert.equals(-220, leftClamped.y);

        const rightClamped = clampGeneralOverlayPosition(840, 440, 1920, 1080);
        assert.equals(530, rightClamped.x);
        assert.equals(310, rightClamped.y);

        const inside = clampGeneralOverlayPosition(120, 40, 1920, 1080);
        assert.equals(120, inside.x);
        assert.equals(40, inside.y);

        // 1280x720 比例縮放驗證
        const scaled = clampGeneralOverlayPosition(-700, 300, 1280, 720);
        assert.equals(-380, Math.round(scaled.x));
        assert.equals(207, Math.round(scaled.y));

        const ccMod = require('cc');
        const origLayersEnum = ccMod.Layers?.Enum;
        const origSetPosition = Node.prototype.setPosition;
        const origSetSiblingIndex = Node.prototype.setSiblingIndex;
        if (ccMod.Layers && !ccMod.Layers.Enum) {
            ccMod.Layers.Enum = { DEFAULT: 0, UI_2D: 1 << 25 };
        }
        Node.prototype.setPosition ??= function () { return undefined; };
        Node.prototype.setSiblingIndex ??= function (idx: number) { this.siblingIndex = idx; };
        try {
            const rendererNode = makeRichNode('UnitRendererHost');
            const canvasNode = makeRichNode('Canvas');
            const canvasTf = canvasNode.addComponent(UITransform);
            canvasTf.setContentSize(1920, 1080);
            canvasTf.contentSize = { width: 1920, height: 1080 };
            const hudChild = makeRichNode('BattleHUD', canvasNode);
            canvasNode.addChild(hudChild);

            const renderer = rendererNode.addComponent(UnitRenderer);
            renderer['canvasNode'] = canvasNode;
            renderer['ensureRoots']();

            const overlayRoot = canvasNode.getChildByName('UnitOverlayRoot');
            assert.isTrue(overlayRoot !== null);
            assert.equals(0, overlayRoot.siblingIndex);
        } finally {
            if (origSetPosition === undefined) delete Node.prototype.setPosition;
            else Node.prototype.setPosition = origSetPosition;
            if (origSetSiblingIndex === undefined) delete Node.prototype.setSiblingIndex;
            else Node.prototype.setSiblingIndex = origSetSiblingIndex;
            if (ccMod.Layers) {
                if (origLayersEnum === undefined) delete ccMod.Layers.Enum;
                else ccMod.Layers.Enum = origLayersEnum;
            }
        }
    });

    suite.test('ResultPopupComposite.show 在 mount 前先啟用並展開尺寸且鎖定併發掛載；撤退時若彈窗未開可補打開', async () => {
        const canvas = makeRichNode('Canvas');
        const canvasTf = canvas.addComponent(UITransform);
        canvasTf.contentSize = { width: 1920, height: 1080 };
        const popupNode = makeRichNode('Popup', canvas);
        popupNode.active = false;
        const popupTf = popupNode.addComponent(UITransform);
        popupTf.setContentSize(100, 100);
        const widget = popupNode.addComponent(Widget);
        widget.isAlignHorizontalCenter = true;
        widget.isAlignVerticalCenter = true;
        widget.updateAlignment = () => undefined;

        const popup = popupNode.addComponent(ResultPopupComposite);
        let mountCalls = 0;
        let activeAtMount = false;
        let sizeAtMount = { w: 0, h: 0 };
        popup.mount = async () => {
            mountCalls++;
            activeAtMount = popupNode.active;
            sizeAtMount = { w: popupTf.width, h: popupTf.height };
            await new Promise((r) => setTimeout(r, 10));
        };

        await Promise.all([
            popup.show({ resultType: 'defeat', title: '撤退', description: 'save army' }),
            popup.show({ resultType: 'defeat', title: '撤退', description: 'save army' }),
        ]);

        assert.equals(1, mountCalls);
        assert.isTrue(activeAtMount);
        assert.equals(1920, sizeAtMount.w);
        assert.equals(1080, sizeAtMount.h);
        assert.isTrue(popupNode.active);
        assert.isTrue(widget.isAlignTop && widget.isAlignBottom && widget.isAlignLeft && widget.isAlignRight);

        // BattleUIBridge._onRetreatRequested 保底檢查
        services().initialize();
        const ctrl = new BattleController();
        const g = (id: string, faction: Faction) => new GeneralUnit({ id, name: id, faction, hp: 500, str: 60, int: 60, lea: 60 });
        ctrl.initBattle(g('p', Faction.Player), g('e', Faction.Enemy));
        ctrl.state.battleEndAnnounced = true;

        const ctx = createBattleSceneContext();
        ctx.ctrl = ctrl;
        ctx.pg = { id: 'player-general' } as any;
        let fallbackShown = 0;
        const resultNode = new Node('Result');
        resultNode.active = false;
        ctx.resultPopup = {
            node: resultNode,
            showResult: (result: string, _d?: string, _gid?: string, retreated?: boolean) => {
                assert.equals('enemy-win', result);
                assert.equals(true, retreated);
                resultNode.active = true;
                fallbackShown++;
            },
        };
        const bridge = new BattleUIBridge(ctx, {});
        bridge['_onRetreatRequested']();
        assert.equals(1, fallbackShown);

        // 當結算視窗已開啟時，再觸發不得重複顯示
        bridge['_onRetreatRequested']();
        assert.equals(1, fallbackShown);
    });

    suite.test('LobbyScene._mountDailyReport 保持隱藏，直到 SceneLoadProgress.complete() 後才由 _openDailyReportIfPending 開啟', () => {
        const src = fs.readFileSync(path.join(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        const mountIdx = src.indexOf('private async _mountDailyReport(): Promise<void>');
        const openIdx = src.indexOf('private _openDailyReportIfPending(): void');
        assert.isTrue(mountIdx !== -1 && openIdx !== -1 && mountIdx < openIdx);

        const mountBody = src.slice(mountIdx, openIdx);
        assert.contains(mountBody, 'this._dailyReportHost.node.active = false;');
        assert.isFalse(mountBody.includes('this._bringNodeToFront'));

        const openBody = src.slice(openIdx, openIdx + 700);
        assert.contains(openBody, 'const report = this._isNewPlayer || this._isOpeningInProgress() ? null : this._dailyReport;');
        assert.contains(openBody, 'this._dailyReportHost.node.active = report !== null;');
        assert.contains(openBody, 'this._bringNodeToFront(this._dailyReportHost.node);');

        const completeIdx = src.indexOf('SceneLoadProgress.complete();');
        const openCallIdx = src.indexOf('this._openDailyReportIfPending();');
        assert.isTrue(completeIdx !== -1 && openCallIdx !== -1 && completeIdx < openCallIdx);
        assert.isTrue(openCallIdx - completeIdx < 300);
    });

    return suite;
}
