/**
 * SpiritCardDetailScreen.test.ts — 英靈卡詳情畫面接線（DUP-02，PROG-2-1142）headless 測試
 *
 * 鎖住：圖鑑只列正式英靈卡且新到舊；詳情文字的 key 都對得上版面節點；
 * 圖鑑列上有六個「詳情」按鈕；詳情 screen 指向正確版面與 skin。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { spiritRelicsNewestFirst, SPIRIT_CODEX_MAX_ROWS } from '../assets/scripts/ui/core/SpiritCodexController';
import { buildSpiritCardDetailView } from '../assets/scripts/ui/core/SpiritCardDetailTexts';
import type { SpiritCard } from '../assets/scripts/core/models/SpiritCard';

const UI_SPEC = path.join(__dirname, '../assets/resources/ui-spec');

function readJson(file: string): any {
    return JSON.parse(fs.readFileSync(path.join(UI_SPEC, file), 'utf8'));
}

function nodeIdsOf(layoutFile: string): string[] {
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

export function createSpiritCardDetailScreenSuite(): TestSuite {
    const suite = new TestSuite('SpiritCardDetailScreen (英靈卡詳情接線 DUP-02 PROG-2-1142)');

    suite.test('圖鑑只列正式英靈卡，依歸檔時間新到舊', () => {
        const cards = [
            cardOf({ uid: 'a', archivedAt: 1 }),
            cardOf({ uid: 'b', archivedAt: 3 }),
            cardOf({ uid: 'c', archivedAt: 2, isSpiritRelic: false }),
        ];
        assert.equals('b', spiritRelicsNewestFirst(cards)[0].uid);
        assert.equals(2, spiritRelicsNewestFirst(cards).length);
    });

    suite.test('圖鑑列上有與上限相同數量的詳情按鈕', () => {
        const ids = nodeIdsOf('layouts/spirit-codex-main.json');
        for (let i = 0; i < SPIRIT_CODEX_MAX_ROWS; i += 1) {
            assert.isTrue(ids.includes(`btnSpiritDetail${i}`));
        }
        assert.isTrue(!ids.includes(`btnSpiritDetail${SPIRIT_CODEX_MAX_ROWS}`));
    });

    suite.test('詳情文字的 key 都是版面節點，標題為名稱與死亡年', () => {
        const view = buildSpiritCardDetailView(cardOf({ bloodlineLevel: 2 }));
        assert.equals('關羽｜200 年', view.texts.spiritCardDetailTitle);
        const ids = nodeIdsOf('layouts/spirit-card-detail-main.json');
        for (const key of Object.keys(view.texts)) {
            assert.isTrue(ids.includes(key));
        }
        assert.isTrue(ids.includes('btnInfuseSpiritCard'));
        assert.isTrue(ids.includes('btnCloseSpiritCardDetail'));
    });

    suite.test('詳情 screen 指向詳情版面與圖鑑 skin', () => {
        const screen = readJson('screens/spirit-card-detail-screen.json');
        assert.equals('spirit-card-detail-main', screen.layout);
        assert.equals('spirit-codex-screen.skin', screen.skin);
        assert.isTrue(fs.existsSync(path.join(UI_SPEC, 'layouts/spirit-card-detail-main.json')));
    });

    return suite;
}
