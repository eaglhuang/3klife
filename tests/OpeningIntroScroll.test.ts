/**
 * OpeningIntroScroll.test.ts — 第一幕單頁自動長卷（PROG-2-10064，稽核 B1）headless 測試
 *
 * 鎖住：四段原文合併成一頁、依時間逐段浮現、全部出現再停留後自動結束（零點擊）、
 * 右下略過一次跳到結束、語系字串可覆蓋原文、layout 有略過鈕且錨在右下。
 *
 * Unity 對照：EditMode Test 以假時間推進 Timeline 的播放頭，不實際等待。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { INTRO_PANELS } from '../assets/scripts/core/systems/NewPlayerOpening';
import {
    INTRO_HOLD_MS, INTRO_PARAGRAPH_MS, INTRO_SKIP_LABEL_DEFAULT, OpeningIntroController,
} from '../assets/scripts/ui/core/OpeningIntroController';

function readJson<T>(relative: string): T {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf-8')) as T;
}

export function createOpeningIntroScrollSuite(): TestSuite {
    const suite = new TestSuite('OpeningIntroScroll (第一幕單頁自動長卷 PROG-2-10064)');

    suite.test('一開始只浮現第一段，每隔 INTRO_PARAGRAPH_MS 多一段，最終四段原文都在同一頁', () => {
        const intro = new OpeningIntroController();
        assert.equals(1, intro.revealedCount);
        assert.equals(INTRO_PANELS[0].text, intro.getFlowView().texts.introText);
        intro.tick(INTRO_PARAGRAPH_MS);
        assert.equals(2, intro.revealedCount);
        intro.tick(INTRO_PARAGRAPH_MS * 2);
        assert.equals(4, intro.revealedCount);
        assert.equals(INTRO_PANELS.map(p => p.text).join('\n\n'), intro.getFlowView().texts.introText);
    });

    suite.test('零點擊：播放滿總時長自動結束，結束前一刻仍在播', () => {
        const intro = new OpeningIntroController();
        assert.isTrue(intro.autoPlaying);
        assert.isFalse(intro.tick(intro.totalMs - 1));
        assert.isFalse(intro.finished);
        assert.isTrue(intro.tick(1));
        assert.isTrue(intro.finished);
        assert.isFalse(intro.autoPlaying);
        assert.isFalse(intro.tick(1000), '結束後不再回報結束');
    });

    suite.test('總時長 = 前三段間隔 + 停留，整段不超過 8 秒（含略過前的最長等待）', () => {
        const intro = new OpeningIntroController();
        assert.equals((INTRO_PANELS.length - 1) * INTRO_PARAGRAPH_MS + INTRO_HOLD_MS, intro.totalMs);
        assert.isTrue(intro.totalMs <= 8000);
    });

    suite.test('略過：播放中按一次立即結束，只回報一次；結束後 FlowView 收起卡片與按鈕', () => {
        const intro = new OpeningIntroController();
        intro.tick(300);
        assert.isTrue(intro.next());
        assert.isTrue(intro.finished);
        assert.isFalse(intro.next());
        const view = intro.getFlowView();
        assert.isFalse(view.actives.introCard);
        assert.isFalse(view.enabled.btnIntroNext);
        assert.equals('', view.texts.introText);
    });

    suite.test('非法時間步長不動作', () => {
        const intro = new OpeningIntroController();
        assert.isFalse(intro.tick(0));
        assert.isFalse(intro.tick(-5));
        assert.isFalse(intro.tick(Number.NaN));
        assert.equals(1, intro.revealedCount);
    });

    suite.test('語系字串：texts 與 skipLabel 覆蓋預設；段數不符時退回原文', () => {
        const texts = INTRO_PANELS.map((_, i) => `T${i}`);
        const intro = new OpeningIntroController(INTRO_PANELS, { texts, skipLabel: 'Skip' });
        assert.equals('T0', intro.getFlowView().texts.introText);
        assert.equals('Skip', intro.getFlowView().texts.btnIntroNextLabel);
        const bad = new OpeningIntroController(INTRO_PANELS, { texts: ['only one'] });
        assert.equals(INTRO_PANELS[0].text, bad.getFlowView().texts.introText);
        assert.equals(INTRO_SKIP_LABEL_DEFAULT, bad.getFlowView().texts.btnIntroNextLabel);
    });

    suite.test('layout：略過鈕錨在畫面右下（不用絕對座標），四語系都有開場新字串', () => {
        const layout = readJson<any>('assets/resources/ui-spec/layouts/opening-intro-main.json');
        const button = (layout.root.children as any[]).find(child => child.id === 'btnIntroNext');
        assert.isDefined(button);
        assert.isDefined(button.widget.bottom);
        assert.isDefined(button.widget.right);
        const keys = [
            'ui.opening.intro.skip', 'ui.opening.intro.p1', 'ui.opening.intro.p2', 'ui.opening.intro.p3', 'ui.opening.intro.p4',
            'ui.opening.showcase.heading', 'ui.opening.showcase.btn', 'ui.gacha.reveal.tap_continue', 'ui.opening.destiny.prelude',
        ];
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = readJson<Record<string, string>>(`assets/resources/i18n/${locale}.json`);
            for (const key of keys) assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${locale} 缺 ${key}`);
        }
        // 繁中四段原文必須與 INTRO_PANELS 一致（不改寫使用者原稿）
        const zh = readJson<Record<string, string>>('assets/resources/i18n/zh-TW.json');
        INTRO_PANELS.forEach((panel, i) => assert.equals(panel.text, zh[`ui.opening.intro.p${i + 1}`]));
    });

    return suite;
}
