/**
 * GachaBannerConsistency.test.ts — 同一個池的橫幅名字、立繪、說明、機率表 UP 必須是同一位武將（PROG-2-9118）
 *
 * 起因：限定池橫幅寫「呂布」、立繪與說明卻是趙雲。橫幅名字節點是外框（panel），字在子 Label，
 * 直接對外框寫字寫不進去，原稿示意字「呂 布」就留在畫面上。
 *
 * Unity 對照：EditMode Test，檢查 View 綁定與 ViewModel 取同一個資料來源。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GachaPoolDto, GachaWalletDto } from '../assets/scripts/core/gacha/GachaApi';
import { GACHA_TEN_NOTE_NODE, gachaApiView, gachaHeroIdOf } from '../assets/scripts/ui/core/GachaApiTexts';
import { syncMainPoolCosts } from '../assets/scripts/core/gacha/GachaButtonRules';
import { GACHA_NODES, GACHA_POOLS } from '../assets/scripts/ui/core/GachaScreenNodes';

const UI_SPEC = path.join(__dirname, '..', 'assets/resources/ui-spec');
const WALLET: GachaWalletDto = { gems: 1280, gold: 1, tickets: 1, bronze: 1, oracle: 0, mentorTickets: 1, scorePoints: 0 };
const NAMES: Record<string, string> = { 'zhao-yun': '趙雲', 'lu-bu': '呂布', 'guan-yu': '關羽', 'da-qiao': '大喬', 'zhuge-liang': '諸葛亮' };
const nameOf = (id: string): string => NAMES[id] ?? id;

function dto(key: string, over: Partial<GachaPoolDto>): GachaPoolDto {
    return {
        key, poolId: key, theme: 'wood', name: `${key}召喚`, sub: '', badge: '', series: '', brief: '第一行\n第二行', showcaseGeneralId: null,
        featuredGeneralIds: [], endsAtMs: null, currencies: ['gems'], singleCost: 150, tenCost: 1500,
        rates: [{ rarity: 'UP', percent: 2 }, { rarity: 'SSR', percent: 1 }, { rarity: 'SR', percent: 9 }, { rarity: 'R', percent: 88 }],
        pity: { label: 'SSR 保底進度', current: 0, max: 50, destinyCurrent: 0, destinyMax: 200 },
        ...over,
    };
}

function find(tree: unknown, name: string): Record<string, unknown> | null {
    if (Array.isArray(tree)) { for (const c of tree) { const r = find(c, name); if (r) return r; } return null; }
    if (tree && typeof tree === 'object') {
        const node = tree as Record<string, unknown>;
        if (node.name === name) return node;
        for (const v of Object.values(node)) { const r = find(v, name); if (r) return r; }
    }
    return null;
}

function hasLabel(node: Record<string, unknown>): boolean {
    if (node.type === 'label') return true;
    return Array.isArray(node.children) && (node.children as Record<string, unknown>[]).some(hasLabel);
}

export function createGachaBannerConsistencySuite(): TestSuite {
    const suite = new TestSuite('GachaBannerConsistency (同池橫幅名字／立繪／說明一致 PROG-2-9118)');

    suite.test('限定池：橫幅名字、立繪、說明框都取本期焦點武將（趙雲，不是原稿示意的呂布）', () => {
        const pool = GACHA_POOLS[1];
        const d = dto('limited', { featuredGeneralIds: ['zhao-yun'], showcaseGeneralId: 'zhao-yun' });
        const view = gachaApiView(pool, d, WALLET, nameOf, 0);
        assert.equals('zhao-yun', gachaHeroIdOf(pool, d), '立繪用的 id');
        assert.equals('趙 雲', view.texts[pool.heroName]);
        assert.contains(view.texts['BriefLine'], '本期 UP：趙雲');
        assert.isTrue(view.actives['RateItem0'], '機率表有 UP 列');
        assert.equals('UP', view.texts['RateRarity0']);
    });

    suite.test('限定池焦點與展示武將不同時，立繪、名字、說明仍以焦點為準', () => {
        const pool = GACHA_POOLS[1];
        const d = dto('limited', { featuredGeneralIds: ['zhao-yun'], showcaseGeneralId: 'lu-bu' });
        const view = gachaApiView(pool, d, WALLET, nameOf, 0);
        assert.equals('zhao-yun', gachaHeroIdOf(pool, d));
        assert.equals('趙 雲', view.texts[pool.heroName]);
        assert.contains(view.texts['BriefLine'], '趙雲');
    });

    suite.test('其他三池：名字與立繪取池設定的展示武將；沒有焦點的池不出現 UP 列以外的人名', () => {
        const cases: Array<[number, string]> = [[0, 'guan-yu'], [2, 'da-qiao'], [3, 'zhuge-liang']];
        for (const [index, heroId] of cases) {
            const pool = GACHA_POOLS[index];
            const d = dto(pool.key, { showcaseGeneralId: heroId, rates: [{ rarity: 'SSR', percent: 1 }, { rarity: 'SR', percent: 9 }, { rarity: 'R', percent: 90 }] });
            const view = gachaApiView(pool, d, WALLET, nameOf, 0);
            assert.equals(heroId, gachaHeroIdOf(pool, d), `${pool.key} 立繪`);
            assert.equals(nameOf(heroId).length === 2 ? `${nameOf(heroId)[0]} ${nameOf(heroId)[1]}` : nameOf(heroId), view.texts[pool.heroName], `${pool.key} 名字`);
            assert.isFalse(view.texts['RateRarity0'] === 'UP');
        }
    });

    suite.test('支援卡池稱號不再沿用原稿示意人物的「吳宮秘書」', () => {
        const pool = GACHA_POOLS[3];
        const view = gachaApiView(pool, dto('support', { showcaseGeneralId: 'zhuge-liang' }), WALLET, nameOf, 0);
        assert.notContains(view.texts[pool.heroTitle], '吳宮');
    });

    suite.test('版面：每個池寫字的節點，自己是 Label 或裡面有 Label（外框寫不進字）', () => {
        const layout = JSON.parse(fs.readFileSync(path.join(UI_SPEC, 'layouts/gacha-ds3.layout.json'), 'utf8'));
        for (const pool of GACHA_POOLS) {
            const tree = pool.key === 'general'
                ? layout
                : JSON.parse(fs.readFileSync(path.join(UI_SPEC, `fragments/layouts/gacha-ds3-${pool.layoutKey}-pool-panel-${pool.layoutKey}.json`), 'utf8'));
            for (const name of [pool.eventChip, pool.heroName, pool.heroTitle, pool.guarantee]) {
                const node = find(tree, name);
                assert.isTrue(!!node, `${pool.key} 缺節點 ${name}`);
                assert.isTrue(hasLabel(node!), `${pool.key} 的 ${name} 裡沒有 Label`);
            }
        }
    });

    suite.test('回歸：寫字走 setGachaTexts（外框改寫到內部 Label），立繪與名字共用 gachaHeroIdOf', () => {
        const lobby = fs.readFileSync(path.join(__dirname, '..', 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.contains(lobby, 'setGachaTexts(binder, view.texts)');
        assert.contains(lobby, 'gachaHeroIdOf(pool, dto)');
    });

    suite.test('紅顏池改靈玉計價後，說明文字不再寫「召喚券」，與單抽／十連實際扣款一致', () => {
        const base = { key: 'legendary', poolId: 'support-pool', theme: 'sakura', name: '紅顏召喚', sub: '', badge: '', series: '', brief: '女將專屬池，使用召喚券\n抽得女將入名冊', currencies: ['tickets'], singleCost: 1, tenCost: 10, pityLabel: 'SSR 保底進度' };
        const cfg = { poolId: 'support-pool', poolType: 'heroine', currencyType: 'gem', singlePullCost: 160 };
        const [pool] = syncMainPoolCosts([base] as never, [cfg] as never);
        assert.equals('gems', pool.currencies.join(','));
        assert.equals(1600, pool.tenCost);
        assert.contains(pool.brief, '使用靈玉');
        assert.notContains(pool.brief, '召喚券');
    });

    suite.test('十連鈕下方小字取程式保底（第 N 抽必出 SSR；有獎池資料的池取最近的硬保底），黃金／召喚券快捷只在名將池顯示', () => {
        for (let index = 0; index < GACHA_POOLS.length; index++) {
            const pool = GACHA_POOLS[index];
            const view = gachaApiView(pool, dto(pool.key, {}), WALLET, nameOf, 0);
            assert.equals('第 50 抽必出 SSR', view.texts[GACHA_TEN_NOTE_NODE], `${pool.key} 十連小字`);
            assert.equals(pool.key === 'general', view.actives[GACHA_NODES.goldSummon], `${pool.key} 黃金鈕`);
            assert.equals(pool.key === 'general', view.actives[GACHA_NODES.ticketSummon], `${pool.key} 召喚券鈕`);
        }
    });

    suite.test('版面：資源列放在立繪蓋不到的右欄中段，不再貼頂部', () => {
        const src = fs.readFileSync(path.join(__dirname, '..', 'assets/scripts/ui/core/GachaScreenExtras.ts'), 'utf8');
        assert.contains(src, 'widget.isAlignRight = true');
        assert.notContains(src, 'widget.left = 440');
    });

    return suite;
}
