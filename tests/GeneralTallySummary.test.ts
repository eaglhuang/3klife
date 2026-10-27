/**
 * GeneralTallySummary.test.ts — 人物頁虎符戰記摘要（PROG-2-1344，general-tally-summary）
 */
import { TestSuite, assert } from './TestRunner';
import { buildGeneralTallySummary } from '../assets/scripts/core/systems/GeneralTallySummary';
import type { TalismanInventoryEntry } from '../assets/scripts/core/systems/ReadModelValidators';
import type { TalismanSlotView } from '../assets/scripts/core/systems/TalismanSlotView';
import { deriveInventoryViews } from '../assets/scripts/core/systems/InventoryProjection';
import { buildTallyInventoryRecords } from '../assets/scripts/core/systems/InventoryRecordBridge';
import { battleRecordOf, buildGeneralDetailOverviewContentState } from '../assets/scripts/ui/components/GeneralDetailOverviewMapper';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function equipped(score: number, troop?: string): TalismanSlotView {
    const talisman = {
        Tally_ID: 't1', Quality: 'SSR', TigerTallyScore: score, Star: 3, Star_Exp: 0,
        Source_Template_ID: 'tpl', Source_General_UID: 'src', Source_Type: 'death',
        Equipped_General_UID: 'liu-bei', Acquired_Season: 1, Is_Displayed: false,
        ...(troop ? { Linked_Troop_ID: troop } : {}),
    } as unknown as TalismanInventoryEntry;
    return { state: 'EQUIPPED', talisman };
}

export function createGeneralTallySummarySuite(): TestSuite {
    const suite = new TestSuite('GeneralTallySummary (PROG-2-1344 虎符戰記摘要)');

    suite.test('裝備中：品質、星級、分數與分數帶，兵種中文名', () => {
        const s = buildGeneralTallySummary(equipped(78, 'cavalry'));
        assert.equals('虎符：SSR 3★｜分數 78（SSR 帶 65-84）', s.tallyLine);
        assert.equals('兵種傾向：騎兵', s.troopLine);
    });

    suite.test('分數帶邊界：85 為 UR、39 為 R', () => {
        assert.isTrue(buildGeneralTallySummary(equipped(85)).tallyLine.includes('UR 帶 85+'));
        assert.isTrue(buildGeneralTallySummary(equipped(39)).tallyLine.includes('R 帶 0-39'));
    });

    suite.test('未綁定兵種與未知兵種代碼', () => {
        assert.equals('兵種傾向：未綁定', buildGeneralTallySummary(equipped(50)).troopLine);
        assert.equals('兵種傾向：spear-x', buildGeneralTallySummary(equipped(50, 'spear-x')).troopLine);
    });

    suite.test('未裝備：空狀態文字', () => {
        const s = buildGeneralTallySummary({ state: 'EMPTY' });
        assert.equals('虎符：未裝備', s.tallyLine);
        assert.equals('兵種傾向：—', s.troopLine);
    });

    suite.test('戰績：有勝敗時顯示勝率，沒有時顯示尚無戰績', () => {
        assert.equals('近期戰績：3 勝 1 敗｜勝率 75%', buildGeneralTallySummary({ state: 'EMPTY' }, { wins: 3, losses: 1 }).recordLine);
        assert.equals('近期戰績：尚無戰績', buildGeneralTallySummary({ state: 'EMPTY' }).recordLine);
    });

    suite.test('人物頁 overview 內容狀態帶出 tallySummary', () => {
        const config = { id: 'liu-bei', name: '劉備' } as unknown as GeneralConfig;
        const views = deriveInventoryViews(buildTallyInventoryRecords(
            { t1: { uid: 't1', templateId: 'tpl', sourceGeneralUid: 'src', quality: 'SR', score: 50, source: 'death', producedSeason: 1 } },
            { t1: 'liu-bei' },
        ));
        const state = buildGeneralDetailOverviewContentState(config, views, [], null, { wins: 2, losses: 0 });
        assert.isTrue(state.tallySummary.tallyLine.startsWith('虎符：SR'));
        assert.equals('近期戰績：2 勝 0 敗｜勝率 100%', state.tallySummary.recordLine);
        assert.equals('虎符：未裝備', buildGeneralDetailOverviewContentState(config).tallySummary.tallyLine);
    });

    suite.test('PROG-2-1345：沒傳戰績時讀武將身上的 battleRecord，傳入值優先', () => {
        const config = { id: 'liu-bei', name: '劉備', battleRecord: { wins: 5, losses: 5 } } as unknown as GeneralConfig;
        assert.equals('近期戰績：5 勝 5 敗｜勝率 50%', buildGeneralDetailOverviewContentState(config).tallySummary.recordLine);
        assert.equals('近期戰績：1 勝 0 敗｜勝率 100%', buildGeneralDetailOverviewContentState(config, undefined, [], null, { wins: 1, losses: 0 }).tallySummary.recordLine);
    });

    suite.test('PROG-2-1345：battleRecord 缺少或格式不對時視為無戰績', () => {
        assert.equals(null, battleRecordOf({ id: 'a' } as unknown as GeneralConfig));
        assert.equals(null, battleRecordOf({ id: 'a', battleRecord: { wins: '3' } } as unknown as GeneralConfig));
        assert.equals(null, battleRecordOf({ id: 'a', battleRecord: 7 } as unknown as GeneralConfig));
    });

    return suite;
}
