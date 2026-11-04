// @spec-source → 武將人物介面規格書.md (doc_ui_0012) §9；兵種（虎符）系統.md (doc_spec_0012) §G；UI-2-0170
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';
import {
    buildTallySlotCardView, buildTallySlotDetailText, resolveTallyName, tallyEquipLine, tallyHintHeight,
    tallyLoyaltyDropLine, tallySlotButtons, tallyUnequipLine,
} from '../assets/scripts/core/systems/TallySlotView';

const CARD: TigerTallyCard = {
    uid: 't1', templateId: 'guan-yu', sourceGeneralUid: 'guan-yu', quality: 'SSR', score: 70,
    source: 'death', producedSeason: 1, troopType: 'CAVALRY', stars: 3,
};
const noName = (): null => null;

export function createTallySlotViewSuite(): TestSuite {
    const suite = new TestSuite('TallySlotView');

    suite.test('虎符名稱：規格名優先，其次來源武將，最後兵種', () => {
        assert.equals('虎符：白馬', resolveTallyName({ ...CARD, templateId: 'tiger-tally-bai-ma-yi-cong' }, noName));
        assert.equals('虎符：關羽', resolveTallyName(CARD, (id) => (id === 'guan-yu' ? '關羽' : null)));
        assert.isTrue(resolveTallyName(CARD, noName).startsWith('虎符：'));
        assert.equals('虎符', resolveTallyName({ ...CARD, troopType: undefined }, noName));
    });

    suite.test('卡片摘要帶出品質、星級、投入兵力與虎符分', () => {
        const view = buildTallySlotCardView(CARD, '虎符：關羽');
        assert.equals('SSR', view.quality);
        assert.equals(3, view.stars);
        assert.equals('1,400', view.forceText);
        assert.equals('虎符分 70', view.scoreText);
        assert.isTrue(Number(view.grainText) > 0);
    });

    suite.test('舊存檔沒有星級時視為 1 星', () => {
        assert.equals(1, buildTallySlotCardView({ ...CARD, stars: undefined }, 'x').stars);
    });

    suite.test('詳情：規格虎符含效果，都有出陣行', () => {
        assert.isTrue(buildTallySlotDetailText(CARD).startsWith('出陣：投入兵力 1,400'));
        const spec = buildTallySlotDetailText({ ...CARD, templateId: 'tiger-tally-bai-ma-yi-cong' });
        assert.isTrue(spec.startsWith('騎射合一'));
        assert.isTrue(spec.includes('\n出陣：'));
    });

    suite.test('按鈕依模式切換', () => {
        const labels = (mode: Parameters<typeof tallySlotButtons>[0], has: boolean, n: number): string => {
            const b = tallySlotButtons(mode, has, n);
            return [b.primary, b.secondary, b.detail].join('|');
        };
        assert.equals('更換虎符|卸下虎符|查看詳情', labels('view', true, 0));
        assert.equals('裝備虎符||', labels('view', false, 0));
        assert.equals('下一張|確定|取消', labels('picking', true, 2));
        assert.equals('|確定|取消', labels('picking', true, 1));
        assert.equals('|確認卸下|取消', labels('confirm-unequip', true, 0));
        assert.equals('|確認沒收|取消', labels('confirm-confiscate', true, 0));
    });

    suite.test('§G 句子', () => {
        assert.equals('趙雲 裝備了【虎符：白馬】，現可指揮 騎兵！', tallyEquipLine('趙雲', '虎符：白馬', '騎兵'));
        assert.equals('趙雲 卸下了【虎符：白馬】。', tallyUnequipLine('趙雲', '虎符：白馬'));
        assert.equals('趙雲 對被拔除虎符一事感到不滿，忠誠度下降。', tallyLoyaltyDropLine('趙雲'));
    });

    suite.test('提示列高度隨行數變動，空字串不佔位', () => {
        assert.equals(0, tallyHintHeight(''));
        assert.equals(20, tallyHintHeight('短句'));
        assert.equals(40, tallyHintHeight('一\n二'));
        assert.equals(40, tallyHintHeight('字'.repeat(37)));
    });

    suite.test('兵分頁不再隱藏虎符卡，也不再建沒有定位的插卡按鈕', () => {
        const source = fs.readFileSync(path.resolve(__dirname, '../assets/scripts/ui/components/character-ds3/CharacterDs3AptitudeChild.ts'), 'utf8');
        assert.isFalse(source.includes("'AptitudeTally_card', false"));
        assert.isFalse(source.includes('BtnInsertCycle'));
        assert.isTrue(source.includes('AptitudeTally_btn_primary'));
    });

    return suite;
}
