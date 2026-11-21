/**
 * DuplicatePullPopup — 重複抽卡分流彈窗（DUP-01；PROG-2-2072）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { DuplicatePullPopupController, rebirthTargetsOf, starUpTargetsOf } from '../assets/scripts/ui/core/DuplicatePullPopupController';

const UI_SPEC = path.resolve(__dirname, '../assets/resources/ui-spec');

interface SpecNode {
    id?: string;
    children?: SpecNode[];
}

function ids(node: SpecNode, out = new Set<string>()): Set<string> {
    if (node.id) out.add(node.id);
    for (const child of node.children ?? []) ids(child, out);
    return out;
}

const readSpec = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(UI_SPEC, rel), 'utf8')) as T;

const TEN = [
    { id: 'zhao-yun', name: '趙雲' },
    { id: 'guan-yu', name: '關羽' },
    { id: 'lu-bu', name: '呂布' },
];

export function createDuplicatePullPopupSuite(): TestSuite {
    const suite = new TestSuite('DuplicatePullPopup (重複抽卡分流彈窗 DUP-01 PROG-2-2072)');

    suite.test('設計稿配色：復生綠、升星金（標推薦）、灌注紅；亮底按鈕深字、深底文字淺色', () => {
        const { slots } = readSpec<{ slots: Record<string, { color?: string; kind: string }> }>('skins/duplicate-pull-popup-screen.skin.json');
        assert.equals('#7FE0A8', slots['dup.button.Rebirth.bg'].color);
        assert.equals('#FFE088', slots['dup.button.StarUp.bg'].color);
        assert.equals('#FF9A7A', slots['dup.button.Infusion.bg'].color);
        assert.equals('#1A1408', slots['dup.label.button.choice'].color);
        const luminance = (hex: string): number => {
            const n = parseInt(hex.slice(1), 16);
            return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
        };
        // 淺底（羊皮紙泡泡、印章、亮色按鈕）才可深字；其餘文字一律要夠亮
        const darkOk = new Set(['dup.label.quip', 'dup.label.stamp', 'dup.label.button.choice']);
        for (const [name, slot] of Object.entries(slots)) {
            if (slot.kind !== 'label-style' || darkOk.has(name)) continue;
            assert.isTrue(luminance(slot.color ?? '#000000') > 150, `${name} 文字太暗`);
        }
        const layoutText = fs.readFileSync(path.join(UI_SPEC, 'layouts/duplicate-pull-popup-main.json'), 'utf8');
        assert.isTrue(layoutText.includes('"id": "dupStarUpRecommend"'));
    });

    suite.test('view key 全部對得到 layout 節點 id；screen 指向自己的 layout/skin', () => {
        const layoutIds = ids(readSpec<{ root: SpecNode }>('layouts/duplicate-pull-popup-main.json').root);
        const ctrl = new DuplicatePullPopupController();
        void ctrl.ask(TEN);
        const view = ctrl.getView();
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled), ...Object.keys(view.fills)]) {
            assert.isTrue(layoutIds.has(key), key);
        }
        const screen = readSpec<{ layout: string; skin: string }>('screens/duplicate-pull-popup-screen.json');
        assert.equals('duplicate-pull-popup-main', screen.layout);
        assert.equals('duplicate-pull-popup-screen.skin', screen.skin);
        const skin = readSpec<{ slots: Record<string, unknown> }>('skins/duplicate-pull-popup-screen.skin.json');
        const layoutText = fs.readFileSync(path.join(UI_SPEC, 'layouts/duplicate-pull-popup-main.json'), 'utf8');
        for (const slot of layoutText.match(/"(?:skinSlot|styleSlot)": "([^"]+)"/g) ?? []) {
            const name = slot.replace(/^.*: "|"$/g, '');
            assert.isTrue(name in skin.slots, name);
        }
    });

    suite.test('文字：兩張分流卡與目前名將，多位時顯示進度', () => {
        const ctrl = new DuplicatePullPopupController();
        void ctrl.ask(TEN);
        const view = ctrl.getView();
        assert.equals('復生重練', view.texts.dupRebirthTitle);
        assert.equals('血脈灌注', view.texts.dupInfusionTitle);
        assert.isTrue(view.texts.dupSubtitle.includes('趙雲'));
        assert.equals('1 → 2 / 5', view.texts.dupRebirthDeltaV);
        assert.equals('+500', view.texts.dupInfusionDeltaV);
        assert.equals('1 / 3', view.texts.dupPager);
        assert.isTrue(view.actives.btnDupBatchDefault);
        assert.isTrue(view.enabled.btnDupRebirth && view.enabled.btnDupInfusion);
    });

    suite.test('逐位選擇：每位重複卡回傳一筆，選完才 resolve', async () => {
        const ctrl = new DuplicatePullPopupController();
        const pending = ctrl.ask(TEN);
        assert.equals(false, ctrl.choose('rebirth'));
        assert.isTrue(ctrl.getView().texts.dupSubtitle.includes('關羽'));
        assert.equals(false, ctrl.choose('infusion'));
        assert.equals(false, ctrl.getView().actives.btnDupBatchDefault);
        assert.equals(true, ctrl.choose('rebirth'));
        assert.equals(false, ctrl.isOpen());
        assert.equals('zhao-yun:rebirth,guan-yu:infusion,lu-bu:rebirth', (await pending).map((c) => `${c.id}:${c.route}`).join(','));
    });

    suite.test('批次預設：勾選後選一次套用到剩下的；再按一次取消勾選', async () => {
        const ctrl = new DuplicatePullPopupController();
        const pending = ctrl.ask(TEN);
        ctrl.choose('rebirth');
        ctrl.toggleBatchDefault();
        ctrl.toggleBatchDefault();
        assert.equals('', ctrl.getView().texts.dupBatchCheck);
        ctrl.toggleBatchDefault();
        assert.equals('✓', ctrl.getView().texts.dupBatchCheck);
        assert.equals(true, ctrl.choose('infusion'));
        assert.equals('rebirth,infusion,infusion', (await pending).map((c) => c.route).join(','));
    });

    suite.test('沒有重複卡立即回傳空陣列；cancel 以已選的部分結束；新一輪會結束舊一輪', async () => {
        const ctrl = new DuplicatePullPopupController();
        assert.equals(0, (await ctrl.ask([])).length);
        assert.equals(false, ctrl.isOpen());
        const first = ctrl.ask(TEN);
        ctrl.choose('infusion');
        const second = ctrl.ask(TEN.slice(0, 1));
        assert.equals('zhao-yun:infusion', (await first).map((c) => `${c.id}:${c.route}`).join(','));
        ctrl.cancel();
        assert.equals(0, (await second).length);
        assert.equals(true, ctrl.choose('rebirth'));
    });

    suite.test('升星：顯示進度；不能升星時按鈕關閉，批次沿用改走復生', async () => {
        const ctrl = new DuplicatePullPopupController();
        const pending = ctrl.ask([
            { id: 'zhao-yun', name: '趙雲', starUp: { stars: 2, cards: 1, need: 2 } },
            { id: 'guan-yu', name: '關羽', starUp: null },
        ]);
        const view = ctrl.getView();
        assert.equals('★2 → ★3　同名卡', view.texts.dupStarUpDeltaK);
        assert.equals('1 → 2 / 2', view.texts.dupStarUpDeltaV);
        assert.equals(1, view.fills.dupStarUpBarFill);
        assert.isTrue(view.actives.dupStarUpRecommend);
        assert.isTrue(view.enabled.btnDupStarUp);
        ctrl.toggleBatchDefault();
        ctrl.choose('starUp');
        const choices = await pending;
        assert.equals('starUp', choices[0].route);
        assert.equals('rebirth', choices[1].route);
        const owned = [{ id: 'zhao-yun' }, { id: 'guan-yu' }];
        assert.equals('zhao-yun', starUpTargetsOf(owned, choices)[0].id);
        assert.equals(1, starUpTargetsOf(owned, choices).length);
        assert.equals('guan-yu', rebirthTargetsOf(owned, choices)[0].id);
        assert.equals(1, rebirthTargetsOf(owned, choices).length);
    });

    suite.test('升星：單張不能升星時選了不前進', () => {
        const ctrl = new DuplicatePullPopupController();
        void ctrl.ask([{ id: 'guan-yu', name: '關羽' }]);
        assert.equals(false, ctrl.getView().enabled.btnDupStarUp);
        assert.equals(false, ctrl.choose('starUp'));
        assert.isTrue(ctrl.isOpen());
    });

    suite.test('設計稿欄位：轉生次數、星級、立繪 id、剩餘數、稀有度與字號', () => {
        const ctrl = new DuplicatePullPopupController();
        void ctrl.ask([
            { id: 'zhao-yun', name: '趙雲', title: '常山子龍', rarity: 'SSR', rebirthCount: 1, starUp: { stars: 3, cards: 2, need: 3 } },
            { id: 'guan-yu', name: '關羽', rebirthCount: 5, starUp: { stars: 2, cards: 0, need: 2 }, infusionAvailable: false },
            { id: 'lu-bu', name: '呂布' },
        ]);
        let view = ctrl.getView();
        assert.equals('zhao-yun', view.portraitKey);
        assert.equals('SSR', view.texts.dupRarity);
        assert.equals('常山子龍　★3　轉生 1 次', view.texts.dupHeroSub);
        assert.equals('本次十連還有 2 位重複名將待處理', view.texts.dupRemain);
        assert.equals('★3 → ★4　同名卡', view.texts.dupStarUpDeltaK);
        assert.isTrue(view.texts.dupStarUpBody.includes('★4 開放血脈奧義第 4 階'));
        assert.isTrue(view.actives.dupStarUpRecommend);
        assert.equals(false, view.actives.dupInfusionDim);
        ctrl.choose('rebirth');
        view = ctrl.getView();
        assert.equals('5 → 5 / 5', view.texts.dupRebirthDeltaV);
        // 灌注不可用：整張變灰＋原因；升星還沒集滿：同名卡進度、不標推薦
        assert.equals(true, view.actives.dupInfusionDim);
        assert.equals(true, view.actives.dupInfusionReason);
        assert.equals('未裝配英靈卡，無法灌注', view.texts.dupInfusionReason);
        assert.equals(false, view.enabled.btnDupInfusion);
        assert.equals('★2　同名卡', view.texts.dupStarUpDeltaK);
        assert.equals(false, view.actives.dupStarUpRecommend);
        ctrl.choose('rebirth');
        view = ctrl.getView();
        assert.equals(false, view.actives.dupRemain);
        // 不能升星：整張變灰、不標推薦、進度條空
        assert.equals(true, view.actives.dupStarUpDim);
        assert.equals(false, view.actives.dupStarUpRecommend);
        assert.equals(0, view.fills.dupStarUpBarFill);
        assert.equals('無法升星', view.texts.dupStarUpLabel);
    });

    suite.test('同名卡未集滿：進度條按比例、不標推薦', () => {
        const ctrl = new DuplicatePullPopupController();
        void ctrl.ask([{ id: 'zhao-yun', name: '趙雲', starUp: { stars: 2, cards: 0, need: 4 } }]);
        const view = ctrl.getView();
        assert.equals('★2　同名卡', view.texts.dupStarUpDeltaK);
        assert.equals('0 → 1 / 4', view.texts.dupStarUpDeltaV);
        assert.equals(0.25, view.fills.dupStarUpBarFill);
        assert.equals(false, view.actives.dupStarUpRecommend);
    });

    suite.test('史小境吐槽句：{name} 代入、每位只抽一次、集滿升星用專屬句庫、資料檔結構正確', () => {
        const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/duplicate-pull-quips.json'), 'utf8')) as { general: string[]; starUpReady: string[] };
        assert.isTrue(data.general.length >= 5 && data.starUpReady.length >= 3);
        for (const line of [...data.general, ...data.starUpReady]) assert.isTrue(line.startsWith('史小境：'), line);
        let calls = 0;
        const ctrl = new DuplicatePullPopupController(() => (calls++ % 2 === 0 ? 0 : 0.99));
        ctrl.setQuips(data);
        void ctrl.ask([{ id: 'a', name: '甲' }, { id: 'b', name: '乙', starUp: { stars: 1, cards: 1, need: 2 } }]);
        const first = ctrl.getView().texts.dupQuip;
        assert.equals(first, ctrl.getView().texts.dupQuip);
        assert.isTrue(first.includes('甲') && !first.includes('{name}'));
        assert.isTrue(data.general.some((line) => line.replace('{name}', '甲') === first));
        ctrl.choose('rebirth');
        const second = ctrl.getView().texts.dupQuip;
        assert.isTrue(data.starUpReady.some((line) => line.replace('{name}', '乙') === second));
    });

    return suite;
}
