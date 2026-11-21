/**
 * GachaResultCardTheme.test.ts — 轉蛋結果卡稀有度配色（PROG-2-9810）
 *
 * 回報：十連結果卡外框／角標顏色不依稀有度（SR 綠角標、R 藍框、同名關索一綠一藍）。
 * 這裡鎖：稀有度 → 色票 slot 的對應、同稀有度必同色、skin 檔的色票照規格 --rarity-*、版面有卡牌需要的圖層。
 *
 * Unity 對照：EditMode Test，檢查資料與對應規則，不碰 View。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    GACHA_CARD_PARTS, buildCardSlotAliases, buildHeroSlotAliases, buildResultSlotAliases,
    gachaCardStars, gachaLayoutNodeSlotId, gachaLayoutSlotId, gachaThemeSlotId, toGachaCardTier, type GachaCardTier,
} from '../assets/scripts/ui/core/GachaResultCardTheme';
import { coverCropRect } from '../assets/scripts/ui/core/GachaResultRanking';

const SKIN = path.join(__dirname, '../assets/resources/ui-spec/skins/gacha-pull-result.skin.json');
const LAYOUT = path.join(__dirname, '../assets/resources/ui-spec/layouts/gacha-pull-result.json');
const LAYOUT_COPY = path.join(__dirname, '../assets/resources/ui-spec/layouts/gacha-pull-result.layout.json');
const CARDS = Array.from({ length: 10 }, (_, i) => `GachaPullResult_card_${i}`);
const TIERS: GachaCardTier[] = ['N', 'R', 'SR', 'SSR', 'UR'];
// 規格色票：Design System colors_and_type.css 的 --rarity-*（也是 ui-design-tokens.json 的 rarity*）
const SPEC_COLOR: Record<GachaCardTier, string> = { N: '#E0E0E0', R: '#4CAF50', SR: '#2196F3', SSR: '#9C27B0', UR: '#FFC107' };

interface SkinSlots { [id: string]: { kind?: string; borderColor?: string; color?: string; gradient?: { stops: Array<{ color: string }> } } }
function readSlots(): SkinSlots { return JSON.parse(fs.readFileSync(SKIN, 'utf8')).slots; }

function collectNames(node: any, out: any[] = []): any[] {
    out.push(node);
    for (const child of node.children ?? []) collectNames(child, out);
    return out;
}

export function createGachaResultCardThemeSuite(): TestSuite {
    const suite = new TestSuite('GachaResultCardTheme (轉蛋結果卡稀有度配色)');

    suite.test('rarityTier 轉卡片等級：資料字串與顯示標籤都對得上，未知值退回 R', () => {
        assert.equals('N', toGachaCardTier('common'));
        assert.equals('R', toGachaCardTier('rare'));
        assert.equals('SR', toGachaCardTier('epic'));
        assert.equals('SSR', toGachaCardTier('legendary'));
        assert.equals('UR', toGachaCardTier('mythic'));
        assert.equals('SR', toGachaCardTier('SR'));
        assert.equals('UR', toGachaCardTier('LR'));
        assert.equals('R', toGachaCardTier(undefined));
        assert.equals('R', toGachaCardTier('???'));
    });

    suite.test('每個稀有度每個部位都有色票 slot，且 skin 檔裡存在', () => {
        const slots = readSlots();
        for (const tier of TIERS) {
            for (const part of [...GACHA_CARD_PARTS, 'heroBox', 'hero']) {
                assert.isTrue(!!slots[gachaThemeSlotId(tier, part)], `缺色票 ${gachaThemeSlotId(tier, part)}`);
            }
        }
    });

    suite.test('外框色與規格 --rarity-* 一致（SR 藍、R 綠、SSR 紫、UR 金）', () => {
        const slots = readSlots();
        for (const tier of TIERS) {
            const frame = slots[gachaThemeSlotId(tier, 'frame')];
            assert.equals(SPEC_COLOR[tier], String(frame.borderColor).toUpperCase(), `${tier} 外框色`);
            const tagbox = slots[gachaThemeSlotId(tier, 'tagbox')];
            assert.equals(SPEC_COLOR[tier], String(tagbox.gradient!.stops[0].color).toUpperCase(), `${tier} 角標底色`);
        }
    });

    suite.test('同名同等階同色：同一稀有度的兩張卡指到完全相同的色票 slot', () => {
        // 回報案例：十連裡關索出現兩次，一張綠框一張藍框
        const aliases = buildResultSlotAliases(CARDS, ['rare', 'epic', 'rare', 'rare', 'rare', 'epic', 'rare', 'rare', 'rare', 'common'], 'epic');
        const themeOf = (card: string, part: string): string => aliases[gachaLayoutSlotId(card, part)];
        for (const part of GACHA_CARD_PARTS) {
            assert.equals(themeOf(CARDS[2], part), themeOf(CARDS[6], part), `R 卡 ${part} 色票不同`);
            assert.equals(themeOf(CARDS[1], part), themeOf(CARDS[5], part), `SR 卡 ${part} 色票不同`);
        }
    });

    suite.test('每張卡的外框／角標／名牌都由自己的稀有度決定，與位置無關', () => {
        const tiers = ['rare', 'rare', 'rare', 'epic', 'legendary', 'rare', 'rare', 'rare', 'rare', 'epic'];
        const aliases = buildResultSlotAliases(CARDS, tiers, 'legendary');
        CARDS.forEach((card, index) => {
            const tier = toGachaCardTier(tiers[index]);
            for (const part of GACHA_CARD_PARTS) {
                assert.equals(gachaThemeSlotId(tier, part), aliases[gachaLayoutSlotId(card, part)], `${card} ${part}`);
            }
        });
        // 把順序倒過來，每張卡仍只看自己的稀有度
        const reversed = buildResultSlotAliases(CARDS, [...tiers].reverse(), undefined);
        assert.equals(gachaThemeSlotId('SR', 'frame'), reversed[gachaLayoutSlotId(CARDS[0], 'frame')]);
        assert.equals(gachaThemeSlotId('SSR', 'tagbox'), reversed[gachaLayoutSlotId(CARDS[5], 'tagbox')]);
    });

    suite.test('結果比卡片少時，多出來的卡不換色；未傳展示區稀有度時不動展示區', () => {
        const aliases = buildResultSlotAliases(CARDS, ['rare', 'epic'], undefined);
        assert.isTrue(!!aliases[gachaLayoutSlotId(CARDS[1], 'frame')]);
        assert.isTrue(aliases[gachaLayoutSlotId(CARDS[2], 'frame')] === undefined);
        assert.equals(0, Object.keys(aliases).filter((id) => id.includes('hero')).length);
    });

    suite.test('展示區標籤與底框跟最高稀有度', () => {
        const hero = buildHeroSlotAliases('SR');
        assert.equals(gachaThemeSlotId('SR', 'hero'), hero[gachaLayoutNodeSlotId('GachaPullResult_hero_rarity')]);
        assert.equals(gachaThemeSlotId('SR', 'heroBox'), hero[gachaLayoutNodeSlotId('GachaPullResult_hero_badge_box')]);
        const withHero = buildResultSlotAliases(CARDS, ['rare'], 'mythic');
        assert.equals(gachaThemeSlotId('UR', 'hero'), withHero[gachaLayoutNodeSlotId('GachaPullResult_hero_rarity')]);
    });

    suite.test('星列：N1 R2 SR3 SSR4 UR5，色票 slot 不重複寫死在流程裡', () => {
        assert.equals('★,★★,★★★,★★★★,★★★★★', TIERS.map(gachaCardStars).join(','));
        const src = fs.readFileSync(path.join(__dirname, '../assets/scripts/ui/core/GachaFlowCoordinator.ts'), 'utf8');
        assert.notContains(src, "'#2196F3'", '流程裡不可寫死稀有度色碼');
        assert.notContains(src, 'rarityBlue');
        assert.notContains(src, 'restyleLike', '不再用示意卡當配色樣板');
    });

    suite.test('版面：每張卡有底圖／光澤／流光／外框圖層與名牌星列，兩份版面檔一致', () => {
        const layout = JSON.parse(fs.readFileSync(LAYOUT, 'utf8'));
        assert.equals(fs.readFileSync(LAYOUT, 'utf8'), fs.readFileSync(LAYOUT_COPY, 'utf8'), '兩份版面檔要同步');
        const nodes = collectNames(layout.root);
        const slots = readSlots();
        for (const card of CARDS) {
            const node = nodes.find((n) => n.name === card);
            assert.isTrue(!!node, `缺卡片 ${card}`);
            const layerIds = (node.skinLayers ?? []).map((l: any) => l.layerId);
            for (const part of ['art', 'gloss', 'sheen', 'frame']) assert.isTrue(layerIds.includes(`${card}_${part}`), `${card} 缺圖層 ${part}`);
            assert.isTrue(nodes.some((n) => n.name === `${card}_stars`), `${card} 缺星列`);
            // 版面引用的預設 slot 都存在（沒套稀有度前不會空白）
            for (const part of GACHA_CARD_PARTS) assert.isTrue(!!slots[gachaLayoutSlotId(card, part)], `${card} 缺預設 slot ${part}`);
        }
    });

    suite.test('頭像裁切：方形圖裁成卡面比例，不拉伸', () => {
        const wide = coverCropRect(512, 512, 188 / 248);
        assert.isTrue(Math.abs(wide.width / wide.height - 188 / 248) < 1e-6);
        assert.equals(0, wide.y, '垂直靠上（臉在上半）');
        assert.isTrue(Math.abs(wide.x - (512 - wide.width) / 2) < 1e-6, '水平置中');
        const tall = coverCropRect(200, 800, 1);
        assert.equals(200, tall.width);
        assert.equals(200, tall.height);
    });

    return suite;
}
