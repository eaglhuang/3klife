/**
 * GeneralQuickView.test.ts — 主將屬性戰法快覽小窗（主戰場UI規格補充 v3-5，PROG-2-1864）
 *
 * 點 HUD 頭像後小窗要填的字：我方顯示實數，敵方血量與四圍顯示 ???，戰法不足三條補 ——；
 * 填字用的 id 必須都在版面上，否則 binder 會靜默略過。
 *
 * Unity 對照：Presenter 單元測試 + 檢查 Prefab 上確實有對應名稱的 Text。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { generalQuickViewTexts, QUICK_VIEW_SKILL_ROWS } from '../assets/scripts/ui/components/GeneralQuickViewTexts';

const LAYOUT = path.resolve(__dirname, '../assets/resources/ui-spec/layouts/general-quickview-main.json');
const SCREEN = path.resolve(__dirname, '../assets/resources/ui-spec/screens/general-quickview-screen.json');

type LayoutNode = { id?: string; children?: LayoutNode[] };

function layoutIds(): Set<string> {
    const ids = new Set<string>();
    const walk = (node: LayoutNode) => {
        if (node.id) ids.add(node.id);
        for (const child of node.children ?? []) walk(child);
    };
    walk(JSON.parse(fs.readFileSync(LAYOUT, 'utf8')).root);
    return ids;
}

const PLAYER = { name: '關羽', title: '我方主將', faction: '玩家', hp: 1200, maxHp: 1500, atk: 970, def: 880, spd: 60, int: 75, skills: ['青龍偃月'], isEnemy: false };

export function createGeneralQuickViewSuite(): TestSuite {
    const suite = new TestSuite('GeneralQuickView (主將快覽小窗 PROG-2-1864)');

    suite.test('我方主將：顯示實際血量與四圍，戰法不足補 ——', () => {
        const t = generalQuickViewTexts(PLAYER);
        assert.equals('關羽', t.gqName);
        assert.equals('我方主將', t.gqTitle);
        assert.equals(`❤ HP：${(1200).toLocaleString()} / ${(1500).toLocaleString()}`, t.gqHpRow);
        assert.equals('⚔ 攻：970', t.gqAtk);
        assert.equals('🛡 防：880', t.gqDef);
        assert.equals('🐎 速：60', t.gqSpd);
        assert.equals('🧠 智：75', t.gqInt);
        assert.equals('青龍偃月', t.gqSkill1);
        assert.equals('——', t.gqSkill2);
        assert.equals('——', t.gqSkill3);
    });

    suite.test('敵方主將：血量與四圍遮成 ???，戰法列照上游給的字', () => {
        const t = generalQuickViewTexts({ ...PLAYER, name: '呂布', title: '敵方主將', faction: '敵方', isEnemy: true, skills: ['🔒 未知戰法'] });
        assert.equals('❤ HP：???', t.gqHpRow);
        assert.equals('⚔ 攻：???', t.gqAtk);
        assert.equals('🛡 防：???', t.gqDef);
        assert.equals('🐎 速：???', t.gqSpd);
        assert.equals('🧠 智：???', t.gqInt);
        assert.equals('🔒 未知戰法', t.gqSkill1);
    });

    suite.test('沒有速度或智力時該列留白', () => {
        const t = generalQuickViewTexts({ ...PLAYER, spd: undefined, int: undefined, skills: undefined });
        assert.equals('', t.gqSpd);
        assert.equals('', t.gqInt);
        assert.equals('——', t.gqSkill1);
    });

    suite.test('填字的 id、根節點與關閉按鈕都在版面上；畫面規格指向這份版面', () => {
        const ids = layoutIds();
        for (const id of Object.keys(generalQuickViewTexts(PLAYER))) assert.isTrue(ids.has(id), `版面缺 ${id}`);
        for (const id of ['quickViewRoot', 'gqCloseBtn', 'bgOverlay']) assert.isTrue(ids.has(id), `版面缺 ${id}`);
        assert.equals(QUICK_VIEW_SKILL_ROWS, [...ids].filter((id) => /^gqSkill\d$/.test(id)).length);
        const screen = JSON.parse(fs.readFileSync(SCREEN, 'utf8'));
        assert.equals('general-quickview-screen', screen.id);
        assert.equals('general-quickview-main', screen.layout);
    });

    return suite;
}
