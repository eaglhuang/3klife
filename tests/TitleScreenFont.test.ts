// @spec-source → PROG-2-2231 標題畫面中文字改用思源宋體
import { assert, TestSuite } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';

const LATIN_ONLY_FONTS = ['fonts/newsreader/newsreader', 'fonts/manrope/manrope'];
const CJK = /[㐀-鿿]/;

export function createTitleScreenFontSuite(): TestSuite {
    const suite = new TestSuite('TitleScreenFont');
    const root = join(__dirname, '..');
    const layout = JSON.parse(readFileSync(join(root, 'assets/resources/ui-spec/layouts/title-screen.json'), 'utf8'));
    const skin = JSON.parse(readFileSync(join(root, 'assets/resources/ui-spec/skins/title-screen.skin.json'), 'utf8'));
    const slots = skin.slots ?? skin;
    const texts: { name: string; text: string; slot: any }[] = [];
    (function walk(n: any) {
        if (typeof n.text === 'string') texts.push({ name: n.name, text: n.text, slot: slots[n.skinSlot ?? n.styleSlot] ?? {} });
        (n.children ?? []).forEach(walk);
    })(layout.root ?? layout);

    suite.test('含中文的文字不可使用只有拉丁字母的字型（否則退回系統細黑體）', () => {
        const bad = texts.filter(t => CJK.test(t.text) && LATIN_ONLY_FONTS.includes(t.slot.font));
        assert.equals('', bad.map(t => `${t.name}「${t.text}」→${t.slot.font}`).join('、'));
    });
    suite.test('主標題「三國傳承」用思源宋體、粗體、描邊至少 4', () => {
        const title = texts.find(t => t.text === '三國傳承');
        assert.isTrue(!!title);
        assert.equals('fonts/notoserif_tc/notoserif_tc', title!.slot.font);
        assert.isTrue(title!.slot.isBold === true);
        assert.isTrue(title!.slot.outlineWidth >= 4);
    });
    suite.test('思源宋體字型檔存在（子集需涵蓋標題用字，由工具另行驗證）', () => {
        const buf = readFileSync(join(root, 'assets/resources/fonts/notoserif_tc/notoserif_tc.ttf'));
        assert.isTrue(buf.length > 1000);
    });
    return suite;
}
