/**
 * 「我的教官卡」列表顯示原型標籤（FORM-04；PROG-2-2088）
 */
import { assert, TestSuite } from './TestRunner';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import { mentorHoldingRows } from '../assets/scripts/ui/core/MentorHoldingRows';

const general = { id: 'lu-bu', name: '呂布', str: 99, int: 30, lea: 80, pol: 20, cha: 40 };
const card = (support?: object) => ({
    uid: 'mentor-lu-bu', sourceGeneralId: 'lu-bu', name: '呂布', faction: 'neutral',
    retiredAge: 50, retiredSeason: 10, retiredYear: 200, ep_snapshot: 0, gene_refs: [], parentUids: ['', ''],
    generalSnapshot: general, support,
}) as unknown as MentorCard;
const support = {
    supportId: 'SUP_LVBU_SSR_01', name: '呂布', rarity: 'SSR', teachingStyle: '戟法', statBonus: { str: 10, lea: 3 },
    tacticInspireEvents: [], passiveEffects: [], friendshipBonus: [0], trainingEffect: [0],
    trainingSlotAffinity: ['str', 'lea'], slotBurstRate: 0.55, synergyPartners: [], source: 'Gacha', roleBoundary: 'TeachingOnly',
};

export function createMentorArchetypeLabelSuite(): TestSuite {
    const suite = new TestSuite('MentorArchetypeLabel (教官卡原型標籤 FORM-04 PROG-2-2088)');

    suite.test('帶支援卡資料時列文字附上原型標籤', () => {
        const [row] = mentorHoldingRows([card(support)]);
        assert.isTrue(row.text.includes('數值炮台型'), row.text);
        const [resource] = mentorHoldingRows([card({ ...support, trainingSlotAffinity: [] })]);
        assert.isTrue(resource.text.includes('資源調度型'), resource.text);
    });

    suite.test('沒有支援卡資料的舊教官卡不顯示標籤', () => {
        const [row] = mentorHoldingRows([card()]);
        assert.isTrue(!row.text.includes('型'), row.text);
    });

    return suite;
}
