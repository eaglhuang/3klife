/**
 * TroopTypeBadge.test.ts — 兵種徽章共用繪製（PROG-2-9724）
 * 鎖住兩件事：① 戰場頭頂、虎符卡、武將資訊、精兵圖鑑都走共用函式，不再各自組圖路徑；
 * ② 剪影圖檔缺失（或尚未交件）時退回單字，疊在同一顆圓章上；同一兵種不重複換圖。
 * Unity 對照：Icon 元件是唯一入口，圖缺失就切到 TMP 文字子物件，各面板不再各寫一套載入邏輯。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { TroopTypeBadge, troopTypeIconPath } from '../assets/scripts/ui/shared/TroopTypeBadge';
import { troopTypeGlyph } from '../assets/scripts/shared/TallyCardContract';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

/** 所有畫兵種符號的呼叫點（戰場頭頂徽章＋虎符卡＋武將資訊＋精兵圖鑑） */
const CALL_SITES = [
    'assets/scripts/battle/views/UnitRenderer.ts',
    'assets/scripts/ui/components/TigerTallyComposite.ts',
    'assets/scripts/ui/components/TigerTallyDetailComposite.ts',
    'assets/scripts/ui/components/TigerTallyPanel.ts',
    'assets/scripts/ui/components/UnitInfoComposite.ts',
    'assets/scripts/ui/components/UnitInfoPanel.ts',
    'assets/scripts/ui/components/EliteTroopCodexComposite.ts',
];

function flush(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

/** 假節點：只留 TroopTypeBadge 會讀寫的欄位 */
function fakeBadge(loader: (p: string) => Promise<unknown>) {
    const icon = { node: { active: true, isValid: true }, isValid: true, spriteFrame: null, color: null };
    const glyph = { node: { active: true, isValid: true }, string: '', color: null };
    const disc = { isValid: true };
    const badge = new TroopTypeBadge({ icon, disc, glyph } as any, loader as any);
    return { badge, icon, glyph };
}

export function createTroopTypeBadgeSuite(): TestSuite {
    const suite = new TestSuite('TroopTypeBadge (兵種徽章共用繪製 PROG-2-9724)');

    suite.test('所有兵種符號呼叫點都走共用函式，且不再自己組剪影路徑', () => {
        for (const rel of CALL_SITES) {
            const src = read(rel);
            assert.isTrue(src.includes('shared/TroopTypeBadge'), `${rel} 未 import 共用徽章`);
            assert.isTrue(src.includes('TroopTypeBadge.'), `${rel} 未呼叫 TroopTypeBadge`);
            assert.isFalse(src.includes('battle_unit_type_icon_'), `${rel} 仍自己組 battle_unit_type_icon_ 路徑`);
        }
    });

    suite.test('戰場頭頂徽章已移除舊的單字與剪影載入函式', () => {
        const src = read('assets/scripts/battle/views/UnitRenderer.ts');
        assert.isFalse(src.includes('toTroopShortName'), 'UnitRenderer 仍有 toTroopShortName');
        assert.isFalse(src.includes('applyTroopTypeIcon'), 'UnitRenderer 仍有 applyTroopTypeIcon');
    });

    suite.test('兵種剪影路徑：正規化後組成 battle_unit_type_icon_<key>，空白回 null', () => {
        assert.equals('sprites/battle/battle_unit_type_icon_cavalry', troopTypeIconPath('cavalry'));
        assert.equals('sprites/battle/battle_unit_type_icon_navy', troopTypeIconPath('Navy'));
        assert.equals(null, troopTypeIconPath(''));
        assert.equals(null, troopTypeIconPath(null));
    });

    suite.test('單字對照與規格一致：騎步盾弓槍工醫水', () => {
        const expected: Array<[string, string]> = [
            ['cavalry', '騎'], ['infantry', '步'], ['shield', '盾'], ['archer', '弓'],
            ['pikeman', '槍'], ['engineer', '工'], ['medic', '醫'], ['navy', '水'],
        ];
        for (const [key, glyph] of expected) {
            assert.equals(glyph, troopTypeGlyph(key));
        }
    });

    suite.test('圖檔缺失時退回單字：剪影隱藏、單字顯示（同一顆圓章）', async () => {
        const { badge, icon, glyph } = fakeBadge(async () => null);
        badge.setType('medic');
        await flush();
        assert.equals('醫', glyph.string);
        assert.isTrue(glyph.node.active, '單字應顯示');
        assert.isFalse(icon.node.active, '剪影應隱藏');
    });

    suite.test('圖檔載入成功時換成剪影，單字隱藏', async () => {
        const { badge, icon, glyph } = fakeBadge(async () => ({ name: 'frame' }));
        badge.setType('shield');
        await flush();
        assert.isTrue(icon.node.active, '剪影應顯示');
        assert.isFalse(glyph.node.active, '單字應隱藏');
    });

    suite.test('同一兵種不重複載入（節點重用，只換一次圖）', async () => {
        let calls = 0;
        const { badge } = fakeBadge(async () => { calls++; return { name: 'frame' }; });
        badge.setType('engineer');
        badge.setType('engineer');
        await flush();
        assert.equals(1, calls);
    });

    return suite;
}
