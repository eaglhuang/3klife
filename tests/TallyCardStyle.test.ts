// @spec-source → 虎符卡面UI佈局與部隊卡圖備援渲染規格書.md（doc_spec_0355）；PROG-2-10131 虎符卡乙版精簡
/**
 * TallyCardStyle — 虎符卡品階色板映射、乙版欄位、圖鑑四態、主題資料完整性
 */
import { TestSuite, assert } from './TestRunner';
import {
    TALLY_CARD_TEXT_FALLBACK_ZH_TW,
    TALLY_GRAYED_BRIGHTNESS,
    TALLY_TIERS,
    TALLY_TIER_STAR_CAP,
    TallyCardFaceSource,
    buildTallyCardFaceB,
    resolveTallyCollectionState,
    resolveTallyStarLevel,
    resolveTallyTier,
    tallyInfuseBadgeOf,
    tallyTierOfQuality,
    tallyTierOfRarity,
    validateTallyCardTheme,
    withTallyCardTextFallback,
} from '../assets/scripts/core/systems/TallyCardStyle';

const fs = require('fs');
const path = require('path');

function readJson(rel: string): any {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));
}

function src(partial: Partial<TallyCardFaceSource> = {}): TallyCardFaceSource {
    return { unitName: '陷陣營', rarity: 'legendary', stars: '★★★★', cost: 185, ...partial };
}

export function createTallyCardStyleSuite(): TestSuite {
    const suite = new TestSuite('TallyCardStyle (虎符卡乙版 PROG-2-10131)');

    suite.test('品階 4 級：舊五級稀有度映射，mythic 併入 UR、N 不使用', () => {
        assert.equals('R,SR,SSR,UR,UR', ['normal', 'rare', 'epic', 'legendary', 'mythic'].map(tallyTierOfRarity).join(','));
        assert.equals('R', tallyTierOfRarity('???'));
        assert.equals('R,SR,SSR,UR', TALLY_TIERS.join(','));
        assert.equals(null, tallyTierOfQuality('LR'));
        assert.equals('SSR', tallyTierOfQuality('ssr'));
    });

    suite.test('持有卡品質優先於舊稀有度', () => {
        assert.equals('SR', resolveTallyTier({ rarity: 'legendary', qualityTier: 'SR' }));
        assert.equals('UR', resolveTallyTier({ rarity: 'legendary', qualityTier: 'bogus' }));
    });

    suite.test('星級封頂：R3／SR4／SSR5／UR5，至少 1 星', () => {
        assert.equals('3,4,5,5', TALLY_TIERS.map((t) => TALLY_TIER_STAR_CAP[t]).join(','));
        assert.equals(3, resolveTallyStarLevel({ rarity: 'normal', starLevel: 5 }));
        assert.equals(4, resolveTallyStarLevel({ rarity: 'rare', starLevel: 9 }));
        assert.equals(1, resolveTallyStarLevel({ rarity: 'epic', starLevel: 0 }));
        assert.equals(3, resolveTallyStarLevel({ rarity: 'epic', stars: '★★★' }));
    });

    suite.test('乙版欄位：名稱、品階、持有、星級（含空星）、糧耗、共鳴；不含攻防命與兵力', () => {
        const face = buildTallyCardFaceB(src({ rarity: 'rare', stars: '★★', starLevel: 3, cost: 70, ownerName: '關羽' }));
        assert.equals('SR', face.tier);
        assert.equals('陷陣營', face.name);
        assert.equals('持有 關羽', face.ownerLine);
        assert.equals('★★★☆', face.starsText);
        assert.equals(3, face.starsFilled);
        assert.equals('糧 70', face.grainText);
        assert.equals('共鳴 +50%', face.resonanceText);
        const keys = Object.keys(face).join(',');
        assert.isFalse(/atk|hp|def|1500|limit/i.test(keys));
        assert.isFalse(face.grayed);
        assert.equals(1, face.brightness);
    });

    suite.test('四狀態：LOCKED 黑影問號、DISCOVERED 未獲得、ACQUIRED 全彩、STAR_ENHANCED 描邊', () => {
        const locked = buildTallyCardFaceB(src({ collectionState: 'LOCKED', ownerName: '呂布' }));
        assert.equals('？？？', locked.name);
        assert.equals('', locked.ownerLine);
        assert.equals('silhouette', locked.artMode);
        assert.equals(0, locked.starsFilled);
        assert.equals('糧 0', locked.grainText);
        assert.equals(null, locked.infuseBadge);
        const found = buildTallyCardFaceB(src({ collectionState: 'DISCOVERED', ownerName: '呂布' }));
        assert.equals('陷陣營', found.name);
        assert.equals('未獲得', found.ownerLine);
        assert.equals('dim', found.artMode);
        assert.isTrue(found.brightness < 1);
        const owned = buildTallyCardFaceB(src({ collectionState: 'ACQUIRED', ownerName: '呂布', starLevel: 1 }));
        assert.equals('持有 呂布', owned.ownerLine);
        assert.equals('normal', owned.artMode);
        assert.isFalse(owned.enhancedGlow);
        const enhanced = buildTallyCardFaceB(src({ collectionState: 'STAR_ENHANCED', starLevel: 4 }));
        assert.isTrue(enhanced.enhancedGlow);
        // 沒給狀態：依星級推導（戰場出戰卡）
        assert.equals('ACQUIRED', resolveTallyCollectionState({ rarity: 'normal', stars: '★' }));
        assert.equals('STAR_ENHANCED', resolveTallyCollectionState({ rarity: 'normal', stars: '★★' }));
    });

    suite.test('灌注小章：Lv5 銀、Lv8 金，未滿 5 級沒有章；沒入庫不顯示', () => {
        assert.equals(null, tallyInfuseBadgeOf(4));
        assert.equals('lv5', tallyInfuseBadgeOf(5));
        assert.equals('lv5', tallyInfuseBadgeOf(7));
        assert.equals('lv8', tallyInfuseBadgeOf(8));
        const face = buildTallyCardFaceB(src({ infuseLevel: 8 }));
        assert.equals('灌8', face.infuseText);
        assert.equals(null, buildTallyCardFaceB(src({ infuseLevel: 8, collectionState: 'DISCOVERED' })).infuseBadge);
    });

    suite.test('出戰中標籤取代冷卻；派不出去的灰態亮度明顯降低', () => {
        assert.equals('出戰中', buildTallyCardFaceB(src({ deployed: true })).deployedText);
        assert.equals('', buildTallyCardFaceB(src()).deployedText);
        const gray = buildTallyCardFaceB(src({ isDisabled: true }));
        assert.isTrue(gray.grayed);
        assert.equals(TALLY_GRAYED_BRIGHTNESS, gray.brightness);
        assert.isTrue(gray.brightness <= 0.5);
        // 未解鎖又派不出去：取較暗者
        assert.isTrue(buildTallyCardFaceB(src({ isDisabled: true, collectionState: 'LOCKED' })).brightness <= TALLY_GRAYED_BRIGHTNESS);
    });

    suite.test('文字走 i18n：有語系用語系，沒載入（回 key）退 zh-TW 預設；四語系檔都有全部 key', () => {
        const en = withTallyCardTextFallback((k, ...a) => (k === 'ui.tally.card.grain' ? `Food ${a[0]}` : k));
        assert.equals('Food 20', en('ui.tally.card.grain', '20'));
        assert.equals('出戰中', en('ui.tally.card.deployed'));
        assert.equals('共鳴 +25%', withTallyCardTextFallback()('ui.tally.card.resonance', '25'));
        for (const loc of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = readJson(`assets/resources/i18n/${loc}.json`);
            for (const key of Object.keys(TALLY_CARD_TEXT_FALLBACK_ZH_TW)) {
                assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${loc} 缺 ${key}`);
            }
        }
        const zh = readJson('assets/resources/i18n/zh-TW.json');
        for (const [key, text] of Object.entries(TALLY_CARD_TEXT_FALLBACK_ZH_TW)) assert.equals(text, zh[key]);
    });

    suite.test('主題資料：四階色板與路徑完整、九宮格 56/40/40/40、卡比例 287:142', () => {
        const theme = readJson('assets/resources/ui-spec/tiger-tally-card-theme.json');
        assert.equals('', validateTallyCardTheme(theme).join('；'));
        assert.equals('56,40,40,40', theme.sliceBorder.join(','));
        assert.equals(287, theme.cardWidth);
        assert.equals(142, theme.cardHeight);
        assert.equals('暗銅,銀,金,赤金', TALLY_TIERS.map((t) => theme.tiers[t].name).join(','));
        // 品階色板彼此不同（一眼分得出）
        const tints = new Set(TALLY_TIERS.map((t) => theme.tiers[t].frameTint.join(',')));
        assert.equals(4, tints.size);
        // 佔位框與共用拉絲圖實際存在（缺檔會讓卡面沒有框）
        for (const rel of [theme.placeholderFrame, theme.brushed]) {
            assert.isTrue(fs.existsSync(path.join(__dirname, '..', 'assets/resources', `${rel}.png`)), `缺 ${rel}.png`);
        }
        assert.isTrue(validateTallyCardTheme({}).length > 0);
    });

    suite.test('版面：4 張卡都有乙版節點、沒有攻／命／冷卻節點，卡高符合 287:142', () => {
        const layout = readJson('assets/resources/ui-spec/layouts/tiger-tally-main.json');
        const cards = layout.root.children;
        assert.equals(4, cards.length);
        for (let i = 1; i <= 4; i++) {
            const names = cards[i - 1].children.map((c: any) => c.name);
            for (const n of ['ArtBg', 'FrameShell', 'FrameBrushed', 'UnitTypeBadge', 'UnitName', 'RarityLabel', 'UnitSub', 'StarsLabel', 'CostBadge', 'ResonanceLabel', 'InfuseBadge', 'DeployedFlag', 'DisabledMask']) {
                assert.isTrue(names.includes(`${n}${i}`), `卡${i}缺 ${n}`);
            }
            assert.isFalse(names.includes(`AtkLabel${i}`));
            assert.isFalse(names.includes(`HpLabel${i}`));
            assert.isFalse(names.some((n: string) => /Cooldown/i.test(n)));
            assert.equals(111, cards[i - 1].height);
        }
        // 欄寬 224 × 142/287 ≈ 111（誤差 1px 內）
        assert.isTrue(Math.abs(layout.root.width * 142 / 287 - 111) <= 1);
    });

    return suite;
}
