/**
 * OpeningDanmaku.test.ts — 開場方案 B「AI 武將搶先連線」（PROG-2-10149）headless 測試
 *
 * 鎖住：彈幕台詞四語系鍵齊備、自稱走 SpeakerVoice、固定槽位物件池不長出新節點、點選釘住、
 * 六輪廓逐一點亮且按鈕不增加點擊、轉蛋回呼六句、版面檔含全部彈幕槽位、開場信新文五段。
 *
 * Unity 對照：EditMode Test，驗證字幕時間軸與 Object Pool 的行為。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    DANMAKU_TRACKS,
    OPENING_CAST_VOICE,
    OPENING_LETTER_SENDERS,
    SHOWCASE_LIGHT_STEP_MS,
    SHOWCASE_SIX,
    buildDanmakuCues,
    openingCallbackKey,
    openingCallbackLine,
} from '../assets/scripts/core/systems/OpeningDanmaku';
import { INITIAL_SHOWCASE_ENTRIES } from '../assets/scripts/core/systems/InitialGeneralShowcase';
import { DANMAKU_LIFE_MS, DANMAKU_PIN_EXTRA_MS, DANMAKU_SLOT_COUNT, OpeningDanmakuController } from '../assets/scripts/ui/core/OpeningDanmakuController';
import { InitialShowcaseController } from '../assets/scripts/ui/core/InitialShowcaseController';

const root = path.resolve(__dirname, '..');
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'];
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8');
const locale = (name: string): Record<string, string> => JSON.parse(read(`assets/resources/i18n/${name}.json`));

function collectIds(node: unknown, ids: Set<string>): void {
    if (!node || typeof node !== 'object') return;
    const n = node as { id?: string; children?: unknown[] };
    if (typeof n.id === 'string') ids.add(n.id);
    for (const c of n.children ?? []) collectIds(c, ids);
}

export function createOpeningDanmakuSuite(): TestSuite {
    const suite = new TestSuite('OpeningDanmaku (開場方案 B AI 武將搶先連線 PROG-2-10149)');
    const zh = locale('zh-TW');
    const t = (key: string): string => zh[key] ?? key;

    suite.test('每條彈幕軌的每一句，四個語系都有字串，名字前綴也有', () => {
        for (const loc of LOCALES) {
            const table = locale(loc);
            for (const track of Object.values(DANMAKU_TRACKS)) {
                for (const def of track) {
                    assert.isTrue(!!table[def.key], `${loc} 缺 ${def.key}`);
                    if (def.speaker !== 'system') assert.isTrue(!!table[`ui.opening.cast.${def.speaker.replace(/-/g, '_')}`], `${loc} 缺名字 ${def.speaker}`);
                }
            }
            for (const id of SHOWCASE_SIX) assert.isTrue(!!table[openingCallbackKey(id)], `${loc} 缺回呼 ${id}`);
            assert.isTrue(!!table['ui.opening.letter.sender'], `${loc} 缺寄件人`);
        }
    });

    suite.test('台詞樣板不寫死自稱：樣板沒有「某」「咱」「老夫」，{self} 由聲線代入', () => {
        for (const track of Object.values(DANMAKU_TRACKS)) {
            for (const def of track) assert.isFalse(/[某咱]|老夫|老身/.test(zh[def.key]), def.key);
        }
        const cues = buildDanmakuCues('intro', t);
        assert.isTrue(cues.some(c => c.text.includes('劉備：是某。')), '劉備（義氣男）自稱某');
        assert.isFalse(cues.some(c => c.text.includes('{self}')), '不留未代入槽位');
        const showcase = buildDanmakuCues('showcase', t).map(c => c.text).join('|');
        assert.isTrue(showcase.includes('甘寧：錦帆賊報到，咱帶頭衝！'), '甘寧（玩樂男）自稱咱');
    });

    suite.test('查不到語系字串的那句略過，不用萬用句補', () => {
        const cues = buildDanmakuCues('letter', key => (key.endsWith('letter_ai') ? key : t(key)));
        assert.equals(DANMAKU_TRACKS.letter.length - 1, cues.length);
    });

    suite.test('固定聲線：寄件人三位與亮相六位都有性別、性格、年齡；亮相六位與名將登場名單一致', () => {
        for (const id of [...OPENING_LETTER_SENDERS, ...SHOWCASE_SIX]) {
            const v = OPENING_CAST_VOICE[id];
            assert.isTrue(!!v && !!v.gender && !!v.type && typeof v.age === 'number', id);
        }
        assert.equals(INITIAL_SHOWCASE_ENTRIES.map(e => e.generalId).join(','), SHOWCASE_SIX.join(','));
    });

    suite.test('彈幕時間軸：全軌排在第一幕長卷（約 4.8 秒）內；亮相軌依點亮順序出現', () => {
        const last = DANMAKU_TRACKS.intro[DANMAKU_TRACKS.intro.length - 1].atMs;
        assert.isTrue(last < 3 * 1100 + 1500, `intro 最後一句 ${last}ms 超出長卷`);
        const showcase = DANMAKU_TRACKS.showcase;
        for (let i = 1; i < showcase.length; i++) assert.isTrue(showcase[i].atMs > showcase[i - 1].atMs);
    });

    suite.test('物件池：槽位固定 6 個，彈幕再多也只回收這 6 格，FlowView key 不增加', () => {
        const cues = Array.from({ length: 20 }, (_, i) => ({ atMs: i * 100, text: `第${i}句` }));
        const pool = new OpeningDanmakuController(cues);
        for (let i = 0; i < 30; i++) {
            pool.tick(100);
            const keys = Object.keys(pool.getFlowView().actives);
            assert.equals(DANMAKU_SLOT_COUNT, keys.length);
        }
        assert.equals(DANMAKU_SLOT_COUNT, pool.slotCount);
    });

    suite.test('槽位滿時回收最早出現的；每放進新句 serial 加一', () => {
        const cues = Array.from({ length: DANMAKU_SLOT_COUNT + 1 }, (_, i) => ({ atMs: i, text: `S${i}` }));
        const pool = new OpeningDanmakuController(cues);
        pool.tick(DANMAKU_SLOT_COUNT + 1);
        const view = pool.getFlowView();
        assert.equals('S6', view.texts.danmakuText0);
        assert.equals('S1', view.texts.danmakuText1);
        assert.equals(2, pool.slotState(0).serial);
    });

    suite.test('彈幕到時退場，播完 finished；clear 立刻收乾淨', () => {
        const pool = new OpeningDanmakuController([{ atMs: 0, text: 'A' }]);
        assert.isTrue(pool.getFlowView().actives.danmakuSlot0);
        assert.isFalse(pool.finished);
        pool.tick(DANMAKU_LIFE_MS + 10);
        assert.isFalse(pool.getFlowView().actives.danmakuSlot0);
        assert.isTrue(pool.finished);
        const p2 = new OpeningDanmakuController([{ atMs: 0, text: 'A' }, { atMs: 5000, text: 'B' }]);
        p2.clear();
        assert.isTrue(p2.finished);
    });

    suite.test('點彈幕釘住：多停一段時間且標記放大；空槽或已釘住回 false', () => {
        const pool = new OpeningDanmakuController([{ atMs: 0, text: 'A' }]);
        assert.isFalse(pool.pin(3));
        assert.isTrue(pool.pin(0));
        assert.isFalse(pool.pin(0));
        assert.isTrue(pool.slotState(0).pinned);
        pool.tick(DANMAKU_LIFE_MS + 10);
        assert.isTrue(pool.getFlowView().actives.danmakuSlot0, '釘住的彈幕比原本多停');
        pool.tick(DANMAKU_PIN_EXTRA_MS);
        assert.isFalse(pool.getFlowView().actives.danmakuSlot0);
    });

    suite.test('六輪廓：自動逐一點亮、點擊立刻點亮；按鈕從頭到尾可按，一次結束（點擊數不增加）', () => {
        const showcase = new InitialShowcaseController(INITIAL_SHOWCASE_ENTRIES, { lightStepMs: SHOWCASE_LIGHT_STEP_MS });
        assert.equals(1, showcase.litCount);
        let view = showcase.getFlowView();
        assert.equals('張飛', view.texts.showcaseName0);
        assert.equals('', view.texts.showcaseName3);
        assert.isTrue(view.enabled.btnShowcaseNext, '按鈕一開始就可按（可跳過）');
        assert.isTrue(showcase.lightNow(4));
        assert.isFalse(showcase.lightNow(4));
        assert.isFalse(showcase.lightNow(99));
        assert.equals('孫策', showcase.getFlowView().texts.showcaseName4);
        showcase.tick(SHOWCASE_LIGHT_STEP_MS * 5);
        assert.equals(6, showcase.litCount);
        view = showcase.getFlowView();
        assert.equals('甘寧', view.texts.showcaseName5);
        assert.isTrue(showcase.next());
    });

    suite.test('舊行為相容：沒給 lightStepMs 就全部點亮', () => {
        const showcase = new InitialShowcaseController();
        assert.equals(6, showcase.litCount);
        assert.equals('甘寧', showcase.getFlowView().texts.showcaseName5);
    });

    suite.test('轉蛋回呼：六位亮相名將各一句且走聲線；非亮相名將回空字串', () => {
        for (const id of SHOWCASE_SIX) {
            const line = openingCallbackLine(id, t);
            assert.isTrue(line.length > 0, id);
            assert.isFalse(line.includes('{self}'), id);
        }
        assert.equals('我就說是某寄的吧，這封信沒白寄！', openingCallbackLine('zhang-fei', t));
        assert.equals('我就說是咱寄的！江東出品，必屬精品。', openingCallbackLine('sun-ce', t));
        // 名冊聲線優先：同一句換成女聲線不會出現「某」
        assert.equals('我就說是本姑娘寄的吧，這封信沒白寄！', openingCallbackLine('zhang-fei', t, { gender: '女', type: 'Brave', age: 25 }));
        assert.equals('', openingCallbackLine('cao-cao', t));
        assert.equals('', openingCallbackLine('zhang-fei', key => key));
    });

    suite.test('版面檔：三個畫面都有 6 個彈幕槽位與對應文字節點；信有寄件人欄', () => {
        for (const layout of ['opening-intro-main', 'opening-letter-main', 'initial-showcase-main']) {
            const ids = new Set<string>();
            collectIds(JSON.parse(read(`assets/resources/ui-spec/layouts/${layout}.json`)).root, ids);
            for (let i = 0; i < DANMAKU_SLOT_COUNT; i++) {
                assert.isTrue(ids.has(`danmakuSlot${i}`), `${layout} 缺 danmakuSlot${i}`);
                assert.isTrue(ids.has(`danmakuText${i}`), `${layout} 缺 danmakuText${i}`);
            }
        }
        const letterIds = new Set<string>();
        collectIds(JSON.parse(read('assets/resources/ui-spec/layouts/opening-letter-main.json')).root, letterIds);
        assert.isTrue(letterIds.has('openingLetterSender'));
    });

    suite.test('開場信新文：五段、骨架與關鍵梗保留、第一人稱複數；標題暫保留', () => {
        const paragraphs = zh['copy.letter.opening.body'].split('\n\n');
        assert.equals(5, paragraphs.length);
        assert.equals('朋友，我們剛才看到你又在玩《三國志2》……還是劉備？', paragraphs[0]);
        const all = paragraphs.join('');
        for (const gag of ['落鳳坡', '五丈原', '史境全息時光頭盔', '滾滾長江', '忠誠度鎖死100', '搜尋再久也不會有美女的年代']) assert.isTrue(all.includes(gag), gag);
        assert.isFalse(/他|她/.test(all), '信文不出現性別字');
        assert.equals('準備好了，就按下：啟動宿命轉蛋。', paragraphs[4]);
        assert.equals('致你的一封信', zh['copy.letter.opening.title']);
    });

    suite.test('開場介紹四頁新版：不含性別字，四語系都已更新（不再是舊稿）', () => {
        for (const loc of LOCALES) {
            const table = locale(loc);
            for (let i = 1; i <= 4; i++) assert.isFalse(/祖紋命篆在黑暗|轉蛋盤自遠而近|宿命之將，正在等你/.test(table[`ui.opening.intro.p${i}`]), `${loc} p${i} 仍是舊稿`);
        }
        for (let i = 1; i <= 4; i++) assert.isFalse(/[他她]/.test(zh[`ui.opening.intro.p${i}`]));
        assert.isTrue(zh['ui.opening.intro.p4'].includes('史小境'));
    });

    return suite;
}
