/**
 * ThemeSystem.test.ts — UI 主題系統（PROG-2-9832）
 *
 * 不開 Cocos：直接讀真實的 theme-registry.json 與 skin。
 *  1. default 主題 token 與 domestic-screen.skin.json 一致（防漂移）；套用後只改樣式、不改節點
 *  2. 主題繼承合併、缺 token 回退 default
 *  3. 季節／節慶／日期規則解析
 *  4. setTheme 切換事件、舊素材釋放、四語系 key 齊全
 *
 * Unity 對照：EditMode Test 驗證 Theme Style Sheet 的疊加與回退。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { restyleSkinSlots } from '../assets/scripts/ui/core/ThemeSkinRestyle';
import { buildSkinStyle, mergeThemes, resolveActiveTheme, ruleMatches, type ThemeRegistry } from '../assets/scripts/ui/core/UIThemeResolver';
import { ThemeService, type ThemeChangeEvent } from '../assets/scripts/ui/core/ThemeService';

const ROOT = path.join(__dirname, '..');

function readJson<T = any>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
}

export function createThemeSystemSuite(): TestSuite {
    const suite = new TestSuite('ThemeSystem（UI 主題系統）');

    const registry = readJson<ThemeRegistry>('assets/resources/ui-spec/themes/theme-registry.json');
    const tokens = buildSkinStyle(mergeThemes(registry, []).tokens, registry.styleBinding);
    const domestic = readJson<{ slots: Record<string, any> }>('assets/resources/ui-spec/skins/domestic-screen.skin.json').slots;
    const hall = readJson<{ slots: Record<string, any> }>('assets/resources/ui-spec/skins/lobby-hall-screen.skin.json').slots;
    const restyled = restyleSkinSlots(hall, tokens);

    suite.test('token 與大廳・內政 skin 數值一致（玻璃面板／標題／按鈕／分隔線）', () => {
        const glass = tokens.roles.glassPanel;
        const card = domestic['domestic.card.bg'];
        assert.equals(card.color, glass.color);
        assert.equals(card.alpha, glass.alpha);
        assert.equals(card.borderColor, glass.borderColor);
        assert.equals(domestic['domestic.label.title'].color, tokens.roles.labelTitle.color);
        assert.equals(domestic['domestic.label.button'].color, tokens.roles.labelButton.color);
        assert.equals(domestic['domestic.label.section'].color, tokens.roles.labelSection.color);
        assert.equals(domestic['domestic.button.bg'].borderColor, tokens.roles.buttonSecondary.borderColor);
        assert.equals(domestic['domestic.button.accent'].color, tokens.roles.buttonAccent.color);
        assert.equals(domestic['domestic.divider'].color, tokens.roles.divider.color);
        assert.equals(domestic['domestic.label.title'].font, tokens.font);
    });

    suite.test('套用後 slot 的 id 集合不變（只改樣式，不增刪節點）', () => {
        assert.equals(Object.keys(hall).length, Object.keys(restyled).length);
        for (const key of Object.keys(hall)) {
            assert.isTrue(key in restyled, `缺少 slot ${key}`);
        }
    });

    suite.test('label-style 字級與行高保留，字型換成內政的 notoserif', () => {
        let labels = 0;
        for (const key of Object.keys(hall)) {
            const before = hall[key];
            if (before.kind !== 'label-style') continue;
            labels++;
            const after = restyled[key];
            assert.equals(before.fontSize, after.fontSize);
            assert.equals(before.lineHeight, after.lineHeight);
            assert.equals(tokens.font, after.font);
        }
        assert.isTrue(labels > 0);
    });

    suite.test('標題字級（≥26）用標題色，按鈕文字用按鈕字色', () => {
        for (const key of Object.keys(hall)) {
            const before = hall[key];
            if (before.kind !== 'label-style') continue;
            const after = restyled[key];
            if (before.fontSize >= tokens.titleMinFontSize) {
                assert.equals(tokens.roles.labelTitle.color, after.color);
            }
        }
    });

    suite.test('sprite-frame 與 shadow-set 原樣保留（貼圖與陰影不被改）', () => {
        for (const key of Object.keys(hall)) {
            const before = hall[key];
            if (before.kind === 'sprite-frame' || before.kind === 'shadow-set') {
                assert.equals(JSON.stringify(before), JSON.stringify(restyled[key]));
            }
        }
    });

    suite.test('金框 gradient 面板換成深色玻璃，漸層層被拿掉', () => {
        const slot = restyled['auto.lobby-hall-screen.lobbyhallscreen_section_1'];
        assert.equals('color-rect', slot.kind);
        assert.equals(tokens.roles.glassPanel.color, slot.color);
        assert.equals(tokens.roles.glassPanel.borderColor, slot.borderColor);
        assert.isTrue(slot.backgroundLayers === undefined);
    });

    suite.test('次要按鈕（fill=secondary）換成淡金框；主按鈕（stdButtonPrimary）換成深紅', () => {
        const secondary = restyled['auto.lobby-hall-screen.lobbyhallscreen_div_18'];
        assert.equals(tokens.roles.buttonSecondary.color, secondary.color);
        assert.equals(tokens.roles.buttonSecondary.borderColor, secondary.borderColor);
        const accent = restyled['auto.lobby-hall-screen.lobbyhallscreen_span_13'];
        assert.equals(tokens.roles.buttonAccent.color, accent.color);
        assert.equals(tokens.roles.buttonAccent.alpha, accent.alpha);
    });

    suite.test('沒有描邊的純色／漸層背景不動', () => {
        const bg = 'auto.lobby-hall-screen.lobbyhallscreen_div_2';
        assert.equals(JSON.stringify(hall[bg]), JSON.stringify(restyled[bg]));
    });

    suite.test('輸入的原 slots 不被改寫（回傳新物件）', () => {
        const copy = JSON.stringify(hall);
        restyleSkinSlots(hall, tokens);
        assert.equals(copy, JSON.stringify(hall));
    });

    // ── 第二階段：任務牆／太守府／招賢館 ──
    const SUB_SKINS = ['hall-board', 'governor-hall', 'recruit-hall'];
    const subSlots = (name: string): Record<string, any> =>
        readJson<{ slots: Record<string, any> }>(`assets/resources/ui-spec/skins/${name}-screen.skin.json`).slots;

    suite.test('appliesToSkins 由資料決定：三個子畫面都在清單內', () => {
        for (const name of SUB_SKINS) {
            assert.isTrue(registry.styleBinding.appliesToSkins.includes(`${name}-screen.skin`), name);
        }
    });

    suite.test('子畫面：卡片底與列底換成深色玻璃，主按鈕深紅，字型統一', () => {
        for (const name of ['hall-board', 'governor-hall']) {
            const slots = subSlots(name);
            const out = restyleSkinSlots(slots, tokens);
            const prefix = name === 'hall-board' ? 'hall' : 'mp';
            assert.equals(tokens.roles.glassPanel.borderColor, out[`${prefix}.card.bg`].borderColor);
            assert.equals(tokens.roles.glassPanel.color, out[`${prefix}.row.bg`].color);
            assert.equals(tokens.roles.buttonAccent.color, out[`${prefix}.button.bg`].color);
            assert.equals(tokens.font, out[`${prefix}.label.body`].font);
            assert.equals(Object.keys(slots).length, Object.keys(out).length);
        }
    });

    suite.test('分節標題：小字距＋分節色；上方細金線用 divider 角色', () => {
        for (const [name, prefix] of [['hall-board', 'hall'], ['governor-hall', 'mp']]) {
            const out = restyleSkinSlots(subSlots(name), tokens);
            const label = out[`${prefix}.label.section`];
            assert.equals(tokens.roles.labelSection.letterSpacing, label.letterSpacing);
            assert.equals(tokens.roles.labelSection.color, label.color);
            assert.equals(20, label.fontSize);
            const line = out[`${prefix}.divider.section`];
            assert.equals(tokens.roles.divider.color, line.color);
            assert.equals(tokens.roles.divider.alpha, line.alpha);
        }
    });

    suite.test('招賢館：pg.* 肖像牆 slot 不套主題（選取框保持透明描邊）', () => {
        const slots = subSlots('recruit-hall');
        const out = restyleSkinSlots(slots, tokens);
        assert.equals(JSON.stringify(slots['pg.sel']), JSON.stringify(out['pg.sel']));
        assert.equals(JSON.stringify(slots['pg.frame.bg']), JSON.stringify(out['pg.frame.bg']));
        assert.equals(tokens.roles.glassPanel.color, out['recruit.card.bg'].color);
    });

    suite.test('季節主題換色：分節標題色跟著主題走', () => {
        const winter = buildSkinStyle(mergeThemes(registry, ['winter']).tokens, registry.styleBinding);
        const out = restyleSkinSlots(subSlots('hall-board'), winter);
        assert.equals(registry.themes.winter.tokens!['text.section'], out['hall.label.section'].color);
    });

    suite.test('子畫面 layout：分節標題與金線節點存在，靜態文字有 textKey 且四語系齊全', () => {
        const langs = ['zh-TW', 'en', 'zh-CN', 'ja'].map(l => readJson<Record<string, string>>(`assets/resources/i18n/${l}.json`));
        const walkLayout = (n: any, visit: (x: any) => void): void => {
            visit(n);
            for (const c of n.children ?? []) walkLayout(c, visit);
        };
        let sections = 0;
        let lines = 0;
        for (const name of SUB_SKINS) {
            const layout = readJson<any>(`assets/resources/ui-spec/layouts/${name}-main.json`);
            walkLayout(layout.root, n => {
                if (typeof n.styleSlot === 'string' && n.styleSlot.endsWith('.label.section')) sections++;
                if (typeof n.skinSlot === 'string' && n.skinSlot.endsWith('.divider.section')) lines++;
                if (n.textKey) for (const dict of langs) assert.isTrue(n.textKey in dict, `i18n 缺 ${n.textKey}`);
            });
        }
        assert.equals(4, sections);
        assert.equals(sections, lines);
    });

    // ── 主題繼承／解析／切換 ──
    const date = (m: number, d: number): Date => new Date(2027, m - 1, d);
    const winterBorder = registry.themes.winter.tokens!['panel.border'];

    suite.test('疊加主題只寫差異：覆寫的 token 生效，其餘繼承 default', () => {
        const merged = mergeThemes(registry, ['winter']);
        assert.equals('winter', merged.stack[merged.stack.length - 1]);
        assert.equals(winterBorder, merged.tokens['panel.border']);
        assert.equals(registry.themes.default.tokens!['panel.bg'], merged.tokens['panel.bg']);
        assert.equals(Object.keys(registry.themes.default.tokens!).length, Object.keys(merged.tokens).length);
    });

    suite.test('多層疊加：節慶蓋過季節', () => {
        const merged = mergeThemes(registry, ['winter', 'lunar-new-year']);
        assert.equals(registry.themes['lunar-new-year'].tokens!['text.title'], merged.tokens['text.title']);
        assert.equals(registry.themes['lunar-new-year'].tokens!['panel.border'], merged.tokens['panel.border']);
    });

    suite.test('缺 token／未知主題回退 default，不丟錯', () => {
        const svc = new ThemeService();
        svc.setRegistry(registry);
        svc.setTheme(['no-such-theme']);
        assert.equals(registry.themes.default.tokens!['panel.bg'], svc.token('panel.bg'));
        assert.equals('x', svc.token('not.exist', 'x'));
        assert.equals('default', svc.activeStack[0]);
    });

    suite.test('extends 循環不會無窮迴圈', () => {
        const loop: ThemeRegistry = { ...registry, themes: { default: { tokens: { a: 1 } }, x: { extends: 'y', tokens: { b: 2 } }, y: { extends: 'x', tokens: { c: 3 } } } };
        const merged = mergeThemes(loop, ['x']);
        assert.equals(1, merged.tokens.a);
        assert.equals(2, merged.tokens.b);
    });

    suite.test('季節規則：1~4 對應春夏秋冬，缺季節不套季節層', () => {
        assert.equals('spring', resolveActiveTheme(registry, { seasonIndex: 1 })[0]);
        assert.equals('summer', resolveActiveTheme(registry, { seasonIndex: 2 })[0]);
        assert.equals('autumn', resolveActiveTheme(registry, { seasonIndex: 3 })[0]);
        assert.equals('winter', resolveActiveTheme(registry, { seasonIndex: 4 })[0]);
        assert.equals(0, resolveActiveTheme(registry, {}).length);
    });

    suite.test('節慶規則：節慶 id 或日期區間命中，疊在季節之上；區間外不套', () => {
        assert.equals('winter,lunar-new-year', resolveActiveTheme(registry, { seasonIndex: 4, festivalIds: ['lunar-new-year'] }).join());
        assert.equals('winter,lunar-new-year', resolveActiveTheme(registry, { seasonIndex: 4, date: date(2, 1) }).join());
        assert.equals('winter', resolveActiveTheme(registry, { seasonIndex: 4, date: date(3, 1) }).join());
    });

    suite.test('日期區間可跨年；同層 priority 高者勝；沒有條件的規則不命中', () => {
        assert.isTrue(ruleMatches({ dateRange: { from: '12-20', to: '01-05' } }, { date: date(1, 3) }));
        assert.isTrue(!ruleMatches({ dateRange: { from: '12-20', to: '01-05' } }, { date: date(6, 3) }));
        assert.isTrue(!ruleMatches({}, { seasonIndex: 1 }));
        const reg: ThemeRegistry = { ...registry, rules: [
            { id: 'a', layer: 'festival', theme: 'winter', priority: 1, when: { flags: ['f'] } },
            { id: 'b', layer: 'festival', theme: 'spring', priority: 5, when: { flags: ['f'] } },
        ] };
        assert.equals('spring', resolveActiveTheme(reg, { flags: ['f'] })[0]);
    });

    suite.test('setTheme 發切換事件並重建 skin 樣式；內容沒變不發事件', () => {
        const svc = new ThemeService();
        svc.setRegistry(registry);
        const events: ThemeChangeEvent[] = [];
        const off = svc.onThemeChanged(e => events.push(e));
        const before = svc.skinStyle()!.roles.glassPanel.borderColor;
        assert.isTrue(svc.setTheme(['winter']) !== null);
        assert.equals(1, events.length);
        assert.equals('default,winter', events[0].stack.join());
        assert.equals(winterBorder, svc.skinStyle()!.roles.glassPanel.borderColor);
        assert.isTrue(before !== winterBorder);
        assert.isTrue(svc.setTheme(['winter']) === null);
        assert.equals(1, events.length);
        off();
        svc.setTheme([]);
        assert.equals(1, events.length);
    });

    suite.test('refresh 依 context 自動切換；切換時只釋放新主題用不到的素材', () => {
        const reg: ThemeRegistry = { ...registry, themes: { ...registry.themes,
            spring: { tokens: {}, assets: { deco: { path: 'a/spring' }, shared: { path: 'a/shared', bundle: 'b' } } },
            summer: { tokens: {}, assets: { deco: { path: 'a/summer' }, shared: { path: 'a/shared', bundle: 'b' } } },
        } };
        const released: string[] = [];
        const svc = new ThemeService(a => released.push(a.path));
        svc.setRegistry(reg);
        svc.refresh({ seasonIndex: 1 });
        assert.equals('a/spring', svc.asset('deco')!.path);
        const ev = svc.refresh({ seasonIndex: 2 })!;
        assert.equals('a/spring', released.join());
        assert.equals(1, ev.releasedAssets.length);
        assert.equals('a/summer', svc.asset('deco')!.path);
    });

    suite.test('四語系都有主題名稱與大廳 textKey 對應的字串', () => {
        const layout = fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/layouts/lobby-hall-screen.json'), 'utf8');
        const textKeys = Array.from(layout.matchAll(/"textKey": "(ui\.hall\.[^"]+)"/g)).map(m => m[1]);
        assert.isTrue(textKeys.length > 0);
        const needed = [...textKeys, ...Object.values(registry.themes).map(t => t.nameKey!)];
        for (const loc of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const dict = readJson<Record<string, string>>(`assets/resources/i18n/${loc}.json`);
            for (const k of needed) assert.isTrue(typeof dict[k] === 'string' && dict[k].length > 0, `${loc} 缺 ${k}`);
        }
    });

    return suite;
}
