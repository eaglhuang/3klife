// @spec-source → Issue #2159 Round 4；PROG-2-9042
import { TestSuite, assert } from './TestRunner';

const Module = require('module');
const _origLoad = Module._load;
Module._load = function (request: string, parent: unknown, isMain: boolean) {
    if (request === 'cc/env') {
        return { EDITOR: false, PREVIEW: false };
    }
    return _origLoad.call(this, request, parent, isMain);
};

const { Node, UITransform } = require('cc');
const { UIScreenPreviewHost } = require('../assets/scripts/ui/components/UIScreenPreviewHost');
const { buildLobbyCityHubView, computeSubMenuWidth } = require('../assets/scripts/ui/core/LobbyCityHubController');

function createBaseCityHubInput(openCategory: string | null) {
    return {
        leadName: '劉備',
        officerRank: '白身',
        gold: 1000,
        gems: 50,
        food: 500,
        cityTroops: 300,
        cityTroopsCap: 1000,
        totalSeasonsElapsed: 2,
        fame: 100,
        territoryCount: 1,
        rivals: { nations: [] },
        openCategory,
    };
}

export function createPlaytestRound4FixesSuite(): TestSuite {
    const suite = new TestSuite('PlaytestRound4Fixes');

    suite.test('UIScreenPreviewHost.showScreen 在非同步載入途中節點被銷毀時不會拋出 children.length null TypeError', async () => {
        const host = new Node('BloodlineMirrorLoadingHost').addComponent(UIScreenPreviewHost);
        const hostNode = host.node;
        hostNode.isValid = true;
        hostNode.children = [];
        host.isValid = true;
        Object.defineProperty(host, '_specLoader', {
            get: () => ({
                invalidateScreen: () => undefined,
                loadFullScreen: async () => {
                    // 模擬切場後 node 被銷毀、Cocos 3.8 將 children 設為 null
                    hostNode.isValid = false;
                    hostNode.children = null;
                    return {
                        screen: { id: 'bloodline-mirror-loading-screen', uiId: 'BloodlineMirrorLoading' },
                        layout: { id: 'bloodline-mirror-loading-main', root: { type: 'container', name: 'Root' } },
                        skin: { id: 'bloodline-mirror-loading-skin', slots: {} },
                    };
                },
            }),
        });

        await host.showScreen('bloodline-mirror-loading-screen');
        assert.isFalse(host._isLoading, '結束後應重置 _isLoading');
        assert.isFalse(host._currentScreenId === 'bloodline-mirror-loading-screen', '中斷後不應標記為已掛載');
    });

    suite.test('UIScreenPreviewHost._destroyBuiltChildren 與 _applyPreviewSlot 在節點 children 為 null 時應安全返回', async () => {
        const host = new Node('InvalidHost').addComponent(UIScreenPreviewHost);
        const hostNode = host.node;
        hostNode.isValid = false;
        hostNode.children = null;
        host.isValid = true;

        host._destroyBuiltChildren();

        const slotNode = new Node('Slot');
        slotNode.isValid = true;
        slotNode.children = [];
        Object.defineProperty(host, '_specLoader', {
            get: () => ({
                loadLayout: async () => {
                    slotNode.isValid = false;
                    slotNode.children = null;
                    return { root: { type: 'container', name: 'FragRoot' } };
                },
            }),
        });
        await host._applyPreviewSlot({ node: slotNode, currentFragmentId: null, parentW: 100, parentH: 100 }, 'frag-1');
        assert.equals(null, host._binder, '安全中斷不應產生例外');
    });

    suite.test('computeSubMenuWidth 應依可見按鈕數收斂 SubMenu 寬度並夾在 192..900', () => {
        assert.equals(192, computeSubMenuWidth(0));
        assert.equals(192, computeSubMenuWidth(1));
        assert.equals(364, computeSubMenuWidth(2));
        assert.equals(536, computeSubMenuWidth(3));
        assert.equals(708, computeSubMenuWidth(4));
        assert.equals(880, computeSubMenuWidth(5));
        assert.equals(900, computeSubMenuWidth(6));
    });

    suite.test('buildLobbyCityHubView 應正確回傳 visibleSubCount 供 SubMenu 緊湊排版使用', () => {
        const closed = buildLobbyCityHubView(createBaseCityHubInput(null));
        assert.equals(0, closed.visibleSubCount);
        assert.isFalse(closed.actives.subMenu);

        const sortie = buildLobbyCityHubView(createBaseCityHubInput('sortie'));
        assert.equals(3, sortie.visibleSubCount);
        assert.isTrue(sortie.actives.subMenu);
        assert.isTrue(sortie.actives.btnSub2);
        assert.isFalse(sortie.actives.btnSub3);

        const generals = buildLobbyCityHubView(createBaseCityHubInput('generals'));
        assert.equals(5, generals.visibleSubCount);
        assert.isTrue(generals.actives.btnSub4);
    });

    suite.test('SubMenu UITransform 在依 visibleSubCount 更新後可正確設定緊湊寬度', () => {
        const subMenuNode = new Node('SubMenu');
        const uit = subMenuNode.addComponent(UITransform);
        uit.setContentSize(900, 116);
        const view = buildLobbyCityHubView(createBaseCityHubInput('nurture'));
        uit.setContentSize(computeSubMenuWidth(view.visibleSubCount), uit.height);
        assert.equals(708, uit.width, '4 個子按鈕時 SubMenu 寬度應從 900 收合至 708');
        assert.equals(116, uit.height, '高度應維持 116');
    });

    return suite;
}
