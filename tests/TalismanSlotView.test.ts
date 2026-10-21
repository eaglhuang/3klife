/**
 * TalismanSlotView.test.ts — 兵分頁虎符槽讀取統一物件庫（PROG-2-1026）
 *
 * 鎖住：裝備中回 EQUIPPED；未裝備回 EMPTY；多筆依 Tally_ID 排序取第一筆；
 * 其他武將的虎符不會被取到；人物頁 overview 內容狀態帶入 tallySlot。
 */
import { TestSuite, assert } from './TestRunner';
import { deriveInventoryViews, type InventoryViews } from '../assets/scripts/core/systems/InventoryProjection';
import { buildTallyInventoryRecords } from '../assets/scripts/core/systems/InventoryRecordBridge';
import { equippedTalismanSlot } from '../assets/scripts/core/systems/TalismanSlotView';
import { buildGeneralDetailOverviewContentState } from '../assets/scripts/ui/components/GeneralDetailOverviewMapper';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function card(uid: string): TigerTallyCard {
    return { uid, templateId: 'tpl-' + uid, sourceGeneralUid: 'src', quality: 'SR', score: 70, source: 'death', producedSeason: 3 };
}

function viewsOf(cards: string[], holders: Record<string, string | null>): InventoryViews {
    const cardMap: Record<string, TigerTallyCard> = {};
    for (const uid of cards) cardMap[uid] = card(uid);
    return deriveInventoryViews(buildTallyInventoryRecords(cardMap, holders));
}

export function createTalismanSlotViewSuite(): TestSuite {
    const suite = new TestSuite('TalismanSlotView (兵分頁虎符槽 PROG-2-1026)');

    suite.test('武將裝備中的虎符回傳 EQUIPPED，內容為該虎符', () => {
        const views = viewsOf(['t1'], { t1: 'liu-bei' });
        const slot = equippedTalismanSlot(views, 'liu-bei');
        assert.equals('EQUIPPED', slot.state);
        if (slot.state === 'EQUIPPED') assert.equals('t1', slot.talisman.Tally_ID);
    });

    suite.test('未裝備任何虎符回傳 EMPTY', () => {
        const views = viewsOf(['t1'], { t1: null });
        assert.equals('EMPTY', equippedTalismanSlot(views, 'liu-bei').state);
    });

    suite.test('其他武將的虎符不會被取到', () => {
        const views = viewsOf(['t1'], { t1: 'guan-yu' });
        assert.equals('EMPTY', equippedTalismanSlot(views, 'liu-bei').state);
    });

    suite.test('多筆虎符依 Tally_ID 排序取第一筆，結果固定', () => {
        const views = viewsOf(['t9', 't2'], { t9: 'liu-bei', t2: 'liu-bei' });
        const slot = equippedTalismanSlot(views, 'liu-bei');
        if (slot.state === 'EQUIPPED') assert.equals('t2', slot.talisman.Tally_ID);
        else throw new Error('應有裝備中的虎符');
    });

    suite.test('空視圖回傳 EMPTY，不拋例外', () => {
        const empty: InventoryViews = { talismans: {}, spiritCards: {}, skipped: [] };
        assert.equals('EMPTY', equippedTalismanSlot(empty, 'liu-bei').state);
    });

    suite.test('人物頁 overview 內容狀態帶入 tallySlot：傳入視圖時為 EQUIPPED，未傳時為 EMPTY', () => {
        const config = { id: 'liu-bei', name: '劉備' } as unknown as GeneralConfig;
        const views = viewsOf(['t1'], { t1: 'liu-bei' });
        const withViews = buildGeneralDetailOverviewContentState(config, views);
        assert.equals('EQUIPPED', withViews.tallySlot.state);
        const withoutViews = buildGeneralDetailOverviewContentState(config);
        assert.equals('EMPTY', withoutViews.tallySlot.state);
    });

    return suite;
}
