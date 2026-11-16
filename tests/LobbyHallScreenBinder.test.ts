/**
 * LobbyHallScreenBinder.test.ts — 幕府大廳綁定器頂列同步與動態字元快取防護測試（PROG-2-9039）
 */
import { Label, Node } from 'cc';
import { assert, TestSuite } from './TestRunner';
import { UITemplateBinder } from '../assets/scripts/ui/core/UITemplateBinder';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { LobbyHallScreenBinder } = require('../assets/scripts/ui/core/LobbyHallScreenBinder');

const CACHE_MODE_NONE = Label.CacheMode?.NONE ?? 0;
const CACHE_MODE_CHAR = Label.CacheMode?.CHAR ?? 2;

function makeLabelNode(name: string, parent: Node, ucufId?: string): { node: Node; label: Label } {
    const node = new Node(name);
    if (ucufId) {
        (node as unknown as { _ucufId: string })._ucufId = ucufId;
    }
    (node as unknown as { isValid: boolean }).isValid = true;
    const label = node.addComponent(Label);
    (label as unknown as { isValid: boolean }).isValid = true;
    label.cacheMode = CACHE_MODE_CHAR;
    parent.children.push(node);
    return { node, label };
}

export function createLobbyHallScreenBinderSuite(): TestSuite {
    const suite = new TestSuite('LobbyHallScreenBinder (大廳頂列與 CHAR 快取防護)');

    suite.test('setTopbar() 更新頂列資源、官職主將與季節時間，並將 Label.CacheMode.CHAR 轉為 NONE', () => {
        const root = new Node('LobbyHallScreen');
        const gold = makeLabelNode('LobbyHallScreen_span_1', root);
        const gems = makeLabelNode('LobbyHallScreen_span_2', root);
        const food = makeLabelNode('LobbyHallScreen_span_3', root);
        const troops = makeLabelNode('LobbyHallScreen_span_4', root);
        const officer = makeLabelNode('LobbyHallScreen_div_7', root);
        const time = makeLabelNode('LobbyHallScreen_div_10', root, 'lobby-hall-screen.hall-time');

        const binder = new LobbyHallScreenBinder(root, {
            themeConfig: null,
            fxConfig: null,
            onAdvanceSeason: () => undefined,
            onDock: () => undefined,
        });

        binder.setTopbar({
            gold: 127450,
            gems: 980,
            food: 420,
            troops: 3150,
            officerSubtitle: '官職 校尉 · 主將 趙雲',
            timeLabel: '第 2 年 秋 · 夜',
        });

        assert.equals('127,450', gold.label.string);
        assert.equals('980', gems.label.string);
        assert.equals('420', food.label.string);
        assert.equals('3,150', troops.label.string);
        assert.equals('官職 校尉 · 主將 趙雲', officer.label.string);
        assert.equals('第 2 年 秋 · 夜', time.label.string);

        for (const item of [gold, gems, food, troops, officer, time]) {
            assert.equals(CACHE_MODE_NONE, item.label.cacheMode, `${item.node.name} 應取消 CHAR 快取避免掉字`);
        }
    });

    suite.test('UITemplateBinder.setTexts / setTextsByPath 改字前關閉 Label.CacheMode.CHAR', () => {
        const root = new Node('Root');
        const byId = makeLabelNode('goldLabel', root);
        const container = new Node('Header');
        root.children.push(container);
        const byPath = makeLabelNode('SilverValue', container);

        const templateBinder = new UITemplateBinder();
        templateBinder.bind(root, {
            name: 'Root',
            type: 'container',
            children: [
                { name: 'goldLabel', id: 'goldLabel', type: 'label' },
                {
                    name: 'Header',
                    type: 'container',
                    children: [
                        { name: 'SilverValue', type: 'label' },
                    ],
                },
            ],
        });

        templateBinder.setTexts({ goldLabel: '127450' });
        templateBinder.setTextsByPath({ 'Header/SilverValue': '9999' });

        assert.equals('127450', byId.label.string);
        assert.equals(CACHE_MODE_NONE, byId.label.cacheMode);
        assert.equals('9999', byPath.label.string);
        assert.equals(CACHE_MODE_NONE, byPath.label.cacheMode);
    });

    return suite;
}
