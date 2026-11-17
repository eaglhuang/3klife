/**
 * GachaButtonRules.test.ts — 轉蛋按鈕稽核與資源顯示（PROG-2-9117）
 *
 * Unity 對照：EditMode Test，檢查 Presenter 規則（能不能按、顯示什麼），不碰 View。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GachaConfig } from '../assets/scripts/core/models/GachaConfig';
import type { GachaMainPoolConfig, GachaPoolDto, GachaWalletDto } from '../assets/scripts/core/gacha/GachaApi';
import {
    buildPoolDetailRows, checkGachaAffordable, describeGachaAction, formatGachaWalletStrip, formatPoolBalance, formatResultBalance,
    planGachaButton, syncMainPoolCosts, GACHA_WALLET_DISPLAY_ORDER,
} from '../assets/scripts/core/gacha/GachaButtonRules';
import { gachaApiView } from '../assets/scripts/ui/core/GachaApiTexts';
import { GACHA_ACTION_NODES } from '../assets/scripts/ui/core/GachaActionBindings';
import { GACHA_NODES, GACHA_POOLS } from '../assets/scripts/ui/core/GachaScreenNodes';

const ROOT = path.join(__dirname, '..');
const UI_SPEC = path.join(ROOT, 'assets/resources/ui-spec');

const WALLET: GachaWalletDto = { gems: 1280, gold: 128450, tickets: 12, bronze: 1500, oracle: 3, mentorTickets: 5, scorePoints: 40 };

const GENERAL: Pick<GachaMainPoolConfig, 'currencies' | 'singleCost' | 'tenCost'> = { currencies: ['bronze', 'gems'], singleCost: 150, tenCost: 1500 };

function dtoOf(over: Partial<GachaPoolDto> = {}): GachaPoolDto {
    return {
        key: 'general', poolId: 'GENERAL_STANDARD_01', theme: 'wood', name: '名將召喚', sub: '副標', badge: '常設池', series: '系列', brief: '第一行\n第二行',
        showcaseGeneralId: null, featuredGeneralIds: [], endsAtMs: null, currencies: ['bronze', 'gems'], singleCost: 150, tenCost: 1500,
        rates: [{ rarity: 'SSR', percent: 1 }, { rarity: 'SR', percent: 2 }],
        pity: { label: 'SSR 保底進度', current: 10, max: 50, destinyCurrent: 20, destinyMax: 200 },
        ...over,
    };
}

function readJson(rel: string): unknown {
    return JSON.parse(fs.readFileSync(path.join(UI_SPEC, rel), 'utf8'));
}

function hasNodeNamed(tree: unknown, name: string): boolean {
    if (Array.isArray(tree)) return tree.some((child) => hasNodeNamed(child, name));
    if (tree && typeof tree === 'object') {
        const node = tree as Record<string, unknown>;
        return node.name === name || node.id === name || Object.values(node).some((child) => hasNodeNamed(child, name));
    }
    return false;
}

export function createGachaButtonRulesSuite(): TestSuite {
    const suite = new TestSuite('GachaButtonRules (轉蛋按鈕稽核 / 資源顯示)');

    suite.test('資源列：七種資源全部顯示並帶數量', () => {
        const text = formatGachaWalletStrip(WALLET);
        for (const label of ['靈玉 1,280', '銅錢符 1,500', '召喚券 12', '支援券 5', '黃金 128,450', '積分 40', '求籤令 3']) assert.contains(text, label);
        assert.lengthEquals(7, GACHA_WALLET_DISPLAY_ORDER);
        assert.contains(formatGachaWalletStrip({}), '靈玉 0', '缺欄位當 0，不顯示 NaN');
    });

    suite.test('各池餘額文字與結果畫面剩餘：靈玉池同列銅錢符', () => {
        assert.equals('銅錢符 1,500 ・ 靈玉 1,280', formatPoolBalance(['bronze', 'gems'], WALLET));
        assert.equals('靈玉 1,280 ・ 銅錢符 1,500', formatResultBalance('gems', WALLET));
        assert.equals('召喚券 12', formatResultBalance('tickets', WALLET));
    });

    suite.test('按鈕規劃：單抽十連各池都能按；黃金／召喚券只在名將池', () => {
        assert.equals(10, (planGachaButton('limited', 'ten') as { count: number }).count);
        assert.equals('pool', planGachaButton('support', 'single').run);
        assert.equals('gold', planGachaButton('general', 'gold').run);
        assert.equals('ticket', planGachaButton('general', 'ticket').run);
        for (const key of ['limited', 'legendary', 'support'] as const) {
            const gold = planGachaButton(key, 'gold');
            assert.equals('blocked', gold.run, `${key} 的黃金鈕不能偷偷改扣別種貨幣`);
            assert.contains((gold as { message: string }).message, '名將池');
            assert.equals('blocked', planGachaButton(key, 'ticket').run);
        }
    });

    suite.test('餘額檢查：不足時說明缺哪種、要多少、現有多少', () => {
        const ten = planGachaButton('general', 'ten');
        assert.isTrue(checkGachaAffordable(ten, GENERAL, WALLET).ok);
        const poor = checkGachaAffordable(ten, GENERAL, { ...WALLET, bronze: 100, gems: 1000 });
        assert.isFalse(poor.ok);
        const message = (poor as { message: string }).message;
        for (const part of ['銅錢符或靈玉不足', '十連需要 1,500', '銅錢符 100', '靈玉 1,000']) assert.contains(message, part);
        assert.isTrue(checkGachaAffordable(planGachaButton('general', 'single'), GENERAL, { ...WALLET, bronze: 0, gems: 150 }).ok, '銅錢符不夠時改用靈玉');
    });

    suite.test('餘額檢查：黃金召喚 500、召喚券 1 張；封鎖的鈕直接帶原因', () => {
        assert.isTrue(checkGachaAffordable({ run: 'gold' }, null, { gold: 500 }).ok);
        assert.contains((checkGachaAffordable({ run: 'gold' }, null, { gold: 499 }) as { message: string }).message, '黃金不足');
        assert.isTrue(checkGachaAffordable({ run: 'ticket' }, null, { tickets: 1 }).ok);
        assert.contains((checkGachaAffordable({ run: 'ticket' }, null, { tickets: 0 }) as { message: string }).message, '召喚券不足');
        const blocked = checkGachaAffordable(planGachaButton('limited', 'gold'), null, WALLET);
        assert.isFalse(blocked.ok);
    });

    suite.test('價格同步：紅顏池靈玉計價時畫面顯示實際扣的靈玉，其他池不動', () => {
        const pools = [
            { key: 'heroine', poolId: 'support-pool', theme: 'sakura', name: '紅顏', sub: '', badge: '', series: '', brief: '', currencies: ['tickets'], singleCost: 1, tenCost: 10, pityLabel: 'x' },
            { key: 'general', poolId: 'GENERAL_STANDARD_01', theme: 'wood', name: '名將', sub: '', badge: '', series: '', brief: '', currencies: ['bronze', 'gems'], singleCost: 150, tenCost: 1500, pityLabel: 'x' },
        ] as GachaMainPoolConfig[];
        const configs = [
            { poolId: 'support-pool', poolType: 'heroine', currencyType: 'gem', singlePullCost: 160 },
            { poolId: 'hero-pool', poolType: 'hero', currencyType: 'gem', singlePullCost: 1000 },
        ] as unknown as GachaConfig[];
        const synced = syncMainPoolCosts(pools, configs);
        assert.equals('gems', synced[0].currencies.join(','));
        assert.equals(160, synced[0].singleCost);
        assert.equals(1600, synced[0].tenCost);
        assert.equals(150, synced[1].singleCost, '名將池價格不動');
        assert.equals(1, pools[0].singleCost, '不改原物件');
        assert.equals(1, syncMainPoolCosts(pools, null)[0].singleCost);
    });

    suite.test('詳情：費用、持有、機率、保底都有；名將池附死亡傳承提示', () => {
        const rows = buildPoolDetailRows(dtoOf(), WALLET);
        const text = rows.map((row) => `${row.title}${row.detail}`).join('\n');
        for (const part of ['單抽 150', '十連 1,500', '銅錢符、靈玉', '銅錢符 1,500 ・ 靈玉 1,280', 'SSR 1%', '10 / 50', '20 / 200', '死亡後會留下英靈卡與虎符卡']) assert.contains(text, part);
        assert.notContains(buildPoolDetailRows(dtoOf({ key: 'support' }), WALLET).map((row) => row.detail).join(''), '死亡後');
    });

    suite.test('紀錄動作名稱：翻成玩家看得懂的字，未知代碼原樣顯示', () => {
        assert.equals('黃金召喚', describeGachaAction('LOCAL_GOLD_SUMMON'));
        assert.equals('天命商店兌換', describeGachaAction('LOCAL_DESTINY_SHOP_EXCHANGE'));
        assert.equals('UNKNOWN_X', describeGachaAction('UNKNOWN_X'));
    });

    suite.test('畫面文字：「我的餘額」顯示下一抽會扣的貨幣；說明框標明可開天命商店', () => {
        const general = GACHA_POOLS[0];
        const rich = gachaApiView(general, dtoOf(), WALLET, (id) => id, 0);
        assert.equals('銅錢符 1,500', rich.texts[GACHA_NODES.balance]);
        const noBronze = gachaApiView(general, dtoOf(), { ...WALLET, bronze: 0 }, (id) => id, 0);
        assert.equals('靈玉 1,280', noBronze.texts[GACHA_NODES.balance]);
        assert.contains(rich.texts[GACHA_NODES.briefTag], '天命商店');
        const heroine = GACHA_POOLS[2];
        assert.notContains(gachaApiView(heroine, dtoOf({ key: 'heroine', currencies: ['gems'] }), WALLET, (id) => id, 0).texts[GACHA_NODES.briefTag], '天命商店');
    });

    suite.test('節點對照：圓點與每個按鈕節點都真的在版面裡（避免綁到不存在的名字）', () => {
        const layout = readJson('layouts/gacha-ds3.layout.json');
        for (const pool of GACHA_POOLS) assert.isTrue(hasNodeNamed(layout, `PoolDot_${pool.layoutKey}`), `圓點 PoolDot_${pool.layoutKey} 不存在`);
        for (const node of Object.values(GACHA_ACTION_NODES)) assert.isTrue(hasNodeNamed(layout, node), `按鈕 ${node} 不存在`);
        for (const pool of GACHA_POOLS) {
            assert.isTrue(hasNodeNamed(readJson(`${pool.contentFragment}.json`), 'BtnPoolDetail'), `${pool.key} 的「詳情 ›」不存在`);
        }
    });

    suite.test('回歸：紀錄鈕不再被開發模式擋掉（正式版點了沒反應）、詳情鈕有人綁', () => {
        const overlay = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/dev/GachaDevOverlay.ts'), 'utf8');
        const history = overlay.slice(overlay.indexOf('export async function showGachaHistory'), overlay.indexOf('export function showGachaInfoModal'));
        assert.notContains(history, '!DEV', 'showGachaHistory 不可被 DEV 擋掉');
        const results = overlay.slice(overlay.indexOf('export async function showGachaResults'), overlay.indexOf('export async function showGachaHistory'));
        assert.notContains(results, '!DEV');
        const lobby = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.contains(lobby, 'bindGachaPoolDetail(');
        assert.contains(lobby, 'PoolDot_${pool.layoutKey}', '圓點用原稿池 id，不是程式 key');
    });

    return suite;
}
