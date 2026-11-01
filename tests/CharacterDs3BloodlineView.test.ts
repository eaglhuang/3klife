/**
 * CharacterDs3BloodlineView.test.ts — 命分頁依武將產生爆發力與因子列（PROG-2-1691）
 */
import { assert, TestSuite } from './TestRunner';
import { buildDs3BloodlineView } from '../assets/scripts/ui/components/character-ds3/CharacterDs3BloodlineChild';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

export function createCharacterDs3BloodlineViewSuite(): TestSuite {
    const suite = new TestSuite('CharacterDs3BloodlineView (命分頁血脈檢視)');

    suite.test('爆發力、因子與鎖定因子依武將資料產生', () => {
        const view = buildDs3BloodlineView({
            id: 'test-general', name: '測試', ep: 89, bloodlineId: 'BL_SHU_ZHAO',
            genes: [
                { id: 'g1', displayName: '膽量', type: '戰鬥', level: 4, description: '無視士氣壓制' },
                { id: 'g2', displayName: '隱藏因子', isLocked: true, discoveryLevel: 18 },
            ],
        } as unknown as GeneralConfig);
        assert.equals(89, view.ep);
        assert.equals('良才美質', view.epLabel);
        assert.equals('⚔|膽量|戰鬥★4|無視士氣壓制', Object.values(view.factors[0]).join('|'));
        assert.equals('★?🔒|等級 18 時發現', `${view.factors[1].tag}|${view.factors[1].desc}`);
        assert.isTrue(view.awakeningProgress >= 0 && view.awakeningProgress <= 100, `progress=${view.awakeningProgress}`);
    });

    suite.test('因子超過 4 列截斷、缺資料不拋錯', () => {
        const genes = [1, 2, 3, 4, 5].map((i) => ({ id: `g${i}`, displayName: `因子${i}`, type: '戰法', level: i }));
        const view = buildDs3BloodlineView({ id: 'x', name: 'x', genes } as unknown as GeneralConfig);
        assert.equals(4, view.factors.length);
        assert.equals(0, view.ep);
        assert.equals('命途多舛', view.epLabel);
    });

    return suite;
}
