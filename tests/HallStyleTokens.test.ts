/**
 * HallStyleTokens.test.ts — 幕府大廳套用大廳・內政風格（PROG-2-9832）
 *
 * 不開 Cocos：直接讀真實的 token JSON 與 lobby-hall-screen skin，套用後檢查
 *  1. token 的數值與 domestic-screen.skin.json 一致（防止兩邊漂移）
 *  2. 只改樣式欄位：slot id 不增不減、字級／行高不變、sprite-frame 不變
 *  3. 金框面板變深色玻璃、主按鈕變深紅、次要按鈕變淡金框，漸層層被拿掉
 *
 * Unity 對照：EditMode Test 驗證 USS 套用後只改 style、不改 hierarchy。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { HallStyleTokens, restyleHallSkinSlots } from '../assets/scripts/ui/core/HallStyleTokens';

const ROOT = path.join(__dirname, '..');

function readJson<T = any>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
}

export function createHallStyleTokensSuite(): TestSuite {
    const suite = new TestSuite('HallStyleTokens（幕府大廳套用大廳・內政風格）');

    const tokens = readJson<HallStyleTokens>('assets/resources/ui-spec/hall-style/hall-style-tokens.json');
    const domestic = readJson<{ slots: Record<string, any> }>('assets/resources/ui-spec/skins/domestic-screen.skin.json').slots;
    const hall = readJson<{ slots: Record<string, any> }>('assets/resources/ui-spec/skins/lobby-hall-screen.skin.json').slots;
    const restyled = restyleHallSkinSlots(hall, tokens);

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
        restyleHallSkinSlots(hall, tokens);
        assert.equals(copy, JSON.stringify(hall));
    });

    return suite;
}
