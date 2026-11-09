/**
 * UiTextContrast.test.ts — 淺底淡字／深底深字的對比守門（PROG-2-2113）
 *
 * Unity 對照：像一個 Editor 驗證測試，掃配色表確認每組「字色 vs 底色」達到 WCAG 對比度。
 * 底色取自各背景貼圖取樣出的平均色（見 BG 常數註解）；改貼圖換底色時請同步更新。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { blendOver, contrastRatio, DS3_RARITY_PILL_BG, DS3_RARITY_PILL_TEXT, type UIRgb } from '../assets/scripts/ui/core/UIContrast';

const SPEC = path.join(__dirname, '..', 'assets', 'resources', 'ui-spec');
const MIN_TEXT = 4.5;

const tokens: Record<string, string> = JSON.parse(fs.readFileSync(path.join(SPEC, 'ui-design-tokens.json'), 'utf8')).colors;
const readSkin = (name: string): Record<string, Record<string, unknown>> => JSON.parse(fs.readFileSync(path.join(SPEC, 'skins', name), 'utf8')).slots;
const readLayout = (name: string): string => fs.readFileSync(path.join(SPEC, 'layouts', name), 'utf8');

function hex(color: string): UIRgb {
    const raw = tokens[color] ?? color;
    const m = /^#([0-9a-fA-F]{6})/.exec(raw);
    if (!m) throw new Error(`無法解析顏色 ${color}`);
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 貼圖取樣平均色（8x8 取樣，略過透明像素） */
const BG = {
    goldCard: [227, 187, 114] as UIRgb, // sprites/common/popup_card_bg
    mintCard: [186, 204, 183] as UIRgb, // general_detail/v3_final/module_card_panel_mint_rect_v1
    parchment: [229, 217, 198] as UIRgb, // ui_families/common/parchment/fill
    darkPlaque: [42, 36, 30] as UIRgb, // general_detail/detail_header_fill
};
const bannerOnMint = blendOver(hex('stdArtTroopBanner'), BG.mintCard, 216 / 255);
const railDark = blendOver(hex('surfaceDeep'), [39, 32, 28], 232 / 255); // 側欄深底疊在 detail_content_bg 上
const railSummary = blendOver(hex('stdPanelModule'), railDark, 238 / 255);
const detailPanel = blendOver(blendOver(hex('stdPanelModule'), hex('stdPanelEliteTroop'), 238 / 255), hex('stdPanelEliteTroop'), 1);

function labelColor(slots: Record<string, Record<string, unknown>>, slot: string): UIRgb {
    const s = slots[slot];
    assert.isTrue(!!s && s.kind === 'label-style', `缺少字型樣式 ${slot}`);
    return hex(String(s.color));
}

export function createUiTextContrastSuite(): TestSuite {
    const suite = new TestSuite('UiTextContrast (文字對比 PROG-2-2113)');

    suite.test('contrastRatio：黑白 21、同色 1', () => {
        assert.isTrue(Math.abs(contrastRatio([0, 0, 0], [255, 255, 255]) - 21) < 0.01);
        assert.isTrue(Math.abs(contrastRatio([10, 20, 30], [10, 20, 30]) - 1) < 0.001);
    });

    suite.test('人物頁稀有度標籤：每個稀有度的字色對底色 >= 4.5', () => {
        for (const tier of Object.keys(DS3_RARITY_PILL_BG) as Array<keyof typeof DS3_RARITY_PILL_BG>) {
            const ratio = contrastRatio(DS3_RARITY_PILL_TEXT[tier], DS3_RARITY_PILL_BG[tier]);
            assert.isTrue(ratio >= MIN_TEXT, `${tier} 對比 ${ratio.toFixed(2)} 低於 ${MIN_TEXT}`);
        }
    });

    suite.test('沙盤賽季卡：標題與三行文字用深墨色，對金底 >= 4.5；其他列表文字不受影響', () => {
        const slots = readSkin('sandtable-territory-default.json');
        for (const slot of ['sandtable-picker.text.onCard.primary', 'sandtable-picker.text.onCard.secondary']) {
            const ratio = contrastRatio(labelColor(slots, slot), BG.goldCard);
            assert.isTrue(ratio >= MIN_TEXT, `${slot} 對金底 ${ratio.toFixed(2)}`);
        }
        const layout = JSON.parse(readLayout('sandtable-territory-main.json'));
        const season = findNode(layout.root ?? layout, 'SeasonCard');
        assert.isTrue(!!season, '找不到 SeasonCard');
        for (const child of season.children as Array<{ name: string; styleSlot?: string }>) {
            if (!child.styleSlot) continue;
            assert.isTrue(child.styleSlot.includes('.onCard.'), `${child.name} 仍用淺金字樣式 ${child.styleSlot}`);
        }
        // 深底列表（標題列、關閉鈕、列項）維持原淺金字
        assert.equals('secondaryLight', String(slots['sandtable-picker.text.title'].color));
    });

    suite.test('虎符圖鑑：卡片文字對薄荷底、徽章文字對羊皮紙底、標題對深色匾額 >= 4.5', () => {
        const slots = readSkin('elite-troop-codex-default.json');
        const checks: Array<[string, UIRgb, string]> = [
            ['etc.label.card.title', BG.mintCard, '卡片標題'],
            ['etc.label.card.subtitle', BG.mintCard, '卡片副標'],
            ['etc.label.card.meta', BG.mintCard, '卡片資訊'],
            ['etc.label.card.body', BG.mintCard, '卡片特性'],
            ['etc.label.quality', BG.mintCard, '品質'],
            ['etc.label.badge', BG.mintCard, '徽章（薄荷卡上的序號）'],
            ['etc.label.badge', bannerOnMint, '徽章（兵牌圖上的角標）'],
            ['widget.header.plaque.badge.label', BG.parchment, '頁首狀態徽章'],
            ['widget.header.plaque.title', BG.darkPlaque, '頁首標題'],
            ['etc.label.detail.title', detailPanel, '詳情標題'],
            ['etc.label.detail.subtitle', detailPanel, '詳情副標'],
            ['etc.label.detail.meta', detailPanel, '詳情資訊'],
            ['etc.label.detail.body', detailPanel, '詳情內文'],
            ['etc.label.meta.onLight', railSummary, '側欄統計（淺色摘要面板）'],
            ['etc.label.meta', railDark, '側欄備註（深底）'],
            ['etc.label.rail.body', railDark, '側欄內文'],
            ['etc.label.rail.title', railDark, '側欄標題'],
        ];
        for (const [slot, bg, what] of checks) {
            const ratio = contrastRatio(labelColor(slots, slot), bg);
            assert.isTrue(ratio >= MIN_TEXT, `${what}（${slot}）對比 ${ratio.toFixed(2)} 低於 ${MIN_TEXT}`);
        }
    });

    suite.test('虎符圖鑑：側欄摘要面板（淺底）的三行統計改用 onLight 樣式', () => {
        const layout = JSON.parse(readLayout('elite-troop-codex-main.json'));
        for (const name of ['RailTotalLabel', 'RailFormalLabel', 'RailMissingLabel']) {
            const node = findNode(layout.root ?? layout, name);
            assert.equals('etc.label.meta.onLight', node.styleSlot);
        }
    });

    return suite;
}

function findNode(node: any, name: string): any {
    if (!node || typeof node !== 'object') return null;
    if (node.name === name) return node;
    for (const child of node.children ?? []) {
        const hit = findNode(child, name);
        if (hit) return hit;
    }
    return null;
}
