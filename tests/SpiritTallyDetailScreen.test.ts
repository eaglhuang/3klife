/**
 * SpiritTallyDetailScreen.test.ts — 英靈卡與虎符詳情共用 spirit-tally-detail-screen（TSK-12，PROG-2-1504）headless 測試
 *
 * 鎖住：兩個入口的文字 key 都對得上共用版面節點；英靈卡只有正式卡能灌注；
 * 虎符缺值時的預設句；共用 screen 指向共用版面，且版面 id 不重複。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { spiritTallyDetailOfSpirit, spiritTallyDetailOfTally, SPIRIT_TALLY_DETAIL_SCREEN_ID } from '../assets/scripts/ui/core/SpiritTallyDetailView';
import type { SpiritCard } from '../assets/scripts/core/models/SpiritCard';
import type { TallyCardData } from '../assets/scripts/shared/TallyCardContract';

const UI_SPEC = path.join(__dirname, '../assets/resources/ui-spec');
const SHARED_LAYOUT = 'layouts/spirit-tally-detail-main.json';

function readJson(file: string): any {
    return JSON.parse(fs.readFileSync(path.join(UI_SPEC, file), 'utf8'));
}

/** 版面上所有可綁定的名稱與 id（binder 兩種都認） */
function bindableNamesOf(layoutFile: string): string[] {
    const names: string[] = [];
    const walk = (node: any): void => {
        if (!node || typeof node !== 'object') return;
        if (typeof node.id === 'string') names.push(node.id);
        if (typeof node.name === 'string') names.push(node.name);
        for (const child of node.children ?? []) walk(child);
    };
    walk(readJson(layoutFile).root);
    return names;
}

function idsOf(layoutFile: string): string[] {
    const ids: string[] = [];
    const walk = (node: any): void => {
        if (!node || typeof node !== 'object') return;
        if (typeof node.id === 'string') ids.push(node.id);
        for (const child of node.children ?? []) walk(child);
    };
    walk(readJson(layoutFile).root);
    return ids;
}

function cardOf(extra: Partial<SpiritCard>): SpiritCard {
    return {
        uid: 'guan-yu', name: '關羽', faction: 'shu', characterCategory: 'military', rarityTier: 'legendary',
        gene_refs: [], ep_snapshot: 0, deathContext: { battleId: 'b', cause: 'battle', season: 1, year: 200 },
        archivedAt: 0, lifecycleClass: 'A', resurrectionEligible: true, parentUids: ['', ''],
        isSpiritRelic: true, ...extra,
    } as SpiritCard;
}

function tallyOf(extra: Partial<TallyCardData>): TallyCardData {
    return {
        unitType: 'cavalry', unitName: '白馬義從', unitSub: '騎兵', atk: 80, def: 60, hp: 900, spd: 70, cost: 12,
        rarity: 'rare', traits: [], abilities: [], desc: '', ...extra,
    } as TallyCardData;
}

export function createSpiritTallyDetailScreenSuite(): TestSuite {
    const suite = new TestSuite('SpiritTallyDetailScreen (英靈卡與虎符共用詳情 PROG-2-1504)');

    suite.test('英靈卡：名稱與標題放進 HeroName、TallyTitle，文字 key 都是版面節點', () => {
        const view = spiritTallyDetailOfSpirit(cardOf({ bloodlineLevel: 2 }));
        assert.equals('關羽', view.texts.HeroName);
        assert.equals('關羽｜200 年', view.texts.TallyTitle);
        const names = bindableNamesOf(SHARED_LAYOUT);
        for (const key of Object.keys(view.texts)) {
            assert.isTrue(names.includes(key), `缺節點 ${key}`);
        }
    });

    suite.test('英靈卡：只有正式英靈卡能灌注血脈', () => {
        assert.isTrue(spiritTallyDetailOfSpirit(cardOf({ isSpiritRelic: true })).infuseEnabled);
        assert.isTrue(!spiritTallyDetailOfSpirit(cardOf({ isSpiritRelic: false })).infuseEnabled);
    });

    suite.test('虎符：缺來源、典故與摘要時給預設句；有典故內文時用內文', () => {
        const bare = spiritTallyDetailOfTally(tallyOf({}));
        assert.equals('未設定陣營', bare.texts.SourceFaction);
        assert.equals('虎符典故', bare.texts.LoreTitle);
        assert.equals('尚未提供典故摘要', bare.texts.LoreSummary);
        assert.equals('此虎符目前尚未補齊完整典故敘述。', bare.texts.LoreBody);
        assert.equals('', bare.texts.SummaryText);

        const full = spiritTallyDetailOfTally(tallyOf({
            desc: '精騎', source: { faction: '蜀', origin: '長坂坡', sourceType: '戰役', obtainHint: '擊破名將' },
            lore: { title: '義從', summary: '忠義', body: '趙雲單騎救主' },
        } as Partial<TallyCardData>));
        assert.equals('長坂坡 / 戰役', full.texts.SourceLine);
        assert.equals('精騎\n取得：擊破名將', full.texts.SummaryText);
        assert.equals('趙雲單騎救主', full.texts.LoreBody);
    });

    suite.test('虎符：數值文字與共用版面節點對得上', () => {
        const view = spiritTallyDetailOfTally(tallyOf({}));
        assert.equals('80', view.texts.AtkValue);
        assert.equals('12', view.texts.CostValue);
        const names = bindableNamesOf(SHARED_LAYOUT);
        for (const key of Object.keys(view.texts)) {
            assert.isTrue(names.includes(key), `缺節點 ${key}`);
        }
    });

    suite.test('共用 screen 指向共用版面與兩個關閉鈕（英靈卡綁 id、虎符綁名稱）', () => {
        const screen = readJson('screens/spirit-tally-detail-screen.json');
        assert.equals(SPIRIT_TALLY_DETAIL_SCREEN_ID, screen.id);
        assert.equals('spirit-tally-detail-main', screen.layout);
        const ids = idsOf(SHARED_LAYOUT);
        assert.isTrue(ids.includes('btnCloseSpiritCardDetail'));
        assert.isTrue(ids.includes('btnInfuseSpiritCard'));
        assert.isTrue(bindableNamesOf(SHARED_LAYOUT).includes('BtnCloseSpiritCardDetail'));
    });

    suite.test('共用版面的 id 不重複', () => {
        const ids = idsOf(SHARED_LAYOUT);
        assert.equals(new Set(ids).size, ids.length);
    });

    return suite;
}
