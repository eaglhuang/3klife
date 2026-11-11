/**
 * GachaPoolSwitcher.test.ts — 轉蛋各池共用畫面、原稿固定 id 命名（PROG-2-2237）
 *
 * 驗證：切池依序換橫幅 → 右側內容 → 橫幅區塊 → 附加區塊 → 文字；只有紅顏池掛紅顏展示；
 * 連點時只有最後一次寫字；固定節點名都登記在綁定表，且重轉後的執行期版面確實帶有這些名字。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { GachaPoolHostPort, GachaPoolSwitcher } from '../assets/scripts/ui/core/GachaPoolSwitcher';
import {
    GACHA_CONTENT_SLOT,
    GACHA_NODES,
    GACHA_POOL_INDEX,
    GACHA_POOLS,
    RED_FACE_SECTION_FRAGMENT,
} from '../assets/scripts/ui/core/GachaScreenNodes';

function readJson(relative: string): any {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8'));
}

function namesOf(node: any, out = new Set<string>()): Set<string> {
    if (!node || typeof node !== 'object') return out;
    if (typeof node.name === 'string') out.add(node.name);
    for (const child of node.children ?? []) namesOf(child, out);
    if (node.root) namesOf(node.root, out);
    return out;
}

interface Recorder extends GachaPoolHostPort {
    log: string[];
    texts: Record<string, string>;
    release: Array<() => void>;
}

function recorder(deferSlot = false): Recorder {
    const rec: Recorder = {
        log: [], texts: {}, release: [],
        setActives: (actives) => { rec.log.push(`actives:${Object.keys(actives).filter(k => actives[k]).join(',')}`); },
        setTexts: (texts) => { rec.log.push('texts'); Object.assign(rec.texts, texts); },
        switchLazySlot: (slot, fragment) => {
            rec.log.push(`slot:${slot}:${fragment}`);
            if (!deferSlot) return Promise.resolve(true);
            return new Promise<boolean>((resolve) => rec.release.push(() => resolve(true)));
        },
        applyTabRegionsForFragment: (fragment) => { rec.log.push(`regions:${fragment}`); return Promise.resolve(); },
        mountSection: (anchor, fragment, replace) => { rec.log.push(`section:${anchor}:${fragment}:${replace}`); return Promise.resolve(null); },
    };
    return rec;
}

export function createGachaPoolSwitcherSuite(): TestSuite {
    const suite = new TestSuite('GachaPoolSwitcher (轉蛋各池共用畫面 PROG-2-2237)');

    suite.test('切到紅顏池：橫幅、右側內容、橫幅區塊、紅顏展示依序換好，最後才寫字', async () => {
        const rec = recorder();
        const shown: string[] = [];
        const switcher = new GachaPoolSwitcher(rec, GACHA_POOLS, (pool) => shown.push(pool.key));
        await switcher.show(GACHA_POOL_INDEX.redFace);
        const pool = GACHA_POOLS[GACHA_POOL_INDEX.redFace];
        assert.equals(JSON.stringify([
            `actives:${pool.banner}`,
            `slot:${GACHA_CONTENT_SLOT}:${pool.contentFragment}`,
            `regions:${pool.contentFragment}`,
            `section:PoolLegendaryArt:${RED_FACE_SECTION_FRAGMENT}:true`,
            'texts',
        ]), JSON.stringify(rec.log));
        assert.equals('紅 顏', rec.texts[pool.heroName]);
        assert.equals('150', rec.texts[GACHA_NODES.pullSingleCost]);
        assert.equals('legendary', shown.join(','));
    });

    suite.test('名將池與支援卡池沒有附加區塊；左右切換會繞圈', async () => {
        const rec = recorder();
        const switcher = new GachaPoolSwitcher(rec);
        await switcher.step(-1);
        assert.equals(GACHA_POOL_INDEX.support, switcher.index);
        await switcher.step(1);
        assert.equals(GACHA_POOL_INDEX.general, switcher.index);
        assert.isFalse(rec.log.some(entry => entry.startsWith('section:')));
    });

    suite.test('連點時前一次還在載入，只有最後一次寫字與通知', async () => {
        const rec = recorder(true);
        const shown: string[] = [];
        const switcher = new GachaPoolSwitcher(rec, GACHA_POOLS, (pool) => shown.push(pool.key));
        const first = switcher.show(GACHA_POOL_INDEX.redFace);
        const second = switcher.show(GACHA_POOL_INDEX.support);
        rec.release.forEach(release => release());
        await Promise.all([first, second]);
        assert.equals('support', shown.join(','));
        assert.isFalse(rec.log.some(entry => entry.startsWith('section:')));
        assert.equals(GACHA_POOL_INDEX.support, switcher.index);
    });

    suite.test('固定節點名都登記在 gacha-ds3 綁定表（重轉不會變回流水號）', () => {
        const bound = new Set<string>(readJson('tools_node/data/ui-bind-maps/gacha-ds3.json').bindings.map((b: { name: string }) => b.name));
        // 這兩個名字原稿本身就有 data-name
        const fromSource = new Set<string>([GACHA_NODES.poolPrev, GACHA_NODES.poolNext]);
        for (const name of Object.values(GACHA_NODES)) {
            if (!fromSource.has(name)) assert.isTrue(bound.has(name), `綁定表缺 ${name}`);
        }
        for (const pool of GACHA_POOLS) {
            for (const name of [pool.eventChip, pool.heroName, pool.heroTitle, pool.guarantee]) {
                assert.isTrue(bound.has(name), `綁定表缺 ${name}`);
            }
            if (pool.section) assert.isTrue(bound.has(pool.section.anchor), `綁定表缺 ${pool.section.anchor}`);
        }
    });

    suite.test('執行期版面帶有固定節點名（主版面、各池橫幅區塊、右側內容）', () => {
        const main = namesOf(readJson('assets/resources/ui-spec/layouts/gacha-ds3.json'));
        for (const name of [GACHA_NODES.poolBrief, GACHA_NODES.briefTag, GACHA_NODES.briefLine, GACHA_NODES.history,
            GACHA_NODES.pullSingle, GACHA_NODES.pullTen, GACHA_NODES.goldSummon, GACHA_NODES.ticketSummon]) {
            assert.isTrue(main.has(name), `gacha-ds3 主版面缺 ${name}`);
        }
        const general = GACHA_POOLS[GACHA_POOL_INDEX.general];
        assert.isTrue(main.has(general.eventChip), `gacha-ds3 主版面缺 ${general.eventChip}`);
        const redFace = GACHA_POOLS[GACHA_POOL_INDEX.redFace];
        const region = namesOf(readJson('assets/resources/ui-spec/fragments/layouts/gacha-ds3-legendary-pool-panel-legendary.json'));
        for (const name of [redFace.eventChip, redFace.heroName, redFace.heroTitle, redFace.guarantee, redFace.section!.anchor]) {
            assert.isTrue(region.has(name), `紅顏池橫幅區塊缺 ${name}`);
        }
        const content = namesOf(readJson(`assets/resources/ui-spec/${general.contentFragment}.json`));
        assert.isTrue(content.has(GACHA_NODES.balance), `名將池右側內容缺 ${GACHA_NODES.balance}`);
    });

    return suite;
}
