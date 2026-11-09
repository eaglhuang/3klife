/**
 * CharacterDs3BloodlineView.test.ts — 命分頁依武將產生爆發力與因子列（PROG-2-1691）
 */
import { FACTOR_LOCKED_TINT } from '../assets/scripts/core/systems/FactorMaskState';
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
        assert.equals('⚔|膽量|戰鬥★4|無視士氣壓制', [view.factors[0].icon, view.factors[0].name, view.factors[0].tag, view.factors[0].desc].join('|'));
        assert.equals('★?🔒|等級 18 時發現', `${view.factors[1].tag}|${view.factors[1].desc}`);
        assert.isTrue(view.awakeningProgress >= 0 && view.awakeningProgress <= 100, `progress=${view.awakeningProgress}`);
    });

    suite.test('G1 因子列不顯示星數，G2 起顯示（PROG-2-1843）', () => {
        const cfg = {
            id: 'test-general', name: '測試',
            genes: [
                { id: 'g1', displayName: '膽量', type: '戰鬥', level: 4, description: '無視士氣壓制' },
                { id: 'g2', displayName: '隱藏因子', isLocked: true, discoveryLevel: 18 },
            ],
        } as unknown as GeneralConfig;
        const g1 = buildDs3BloodlineView(cfg, 1);
        assert.equals('⚔|膽量|戰鬥|無視士氣壓制', [g1.factors[0].icon, g1.factors[0].name, g1.factors[0].tag, g1.factors[0].desc].join('|'));
        assert.equals('🔒', g1.factors[1].tag);
        for (const stage of [2, 3, 4] as const) {
            const view = buildDs3BloodlineView(cfg, stage);
            assert.equals('戰鬥★4', view.factors[0].tag);
            assert.equals('★?🔒', view.factors[1].tag);
        }
    });

    suite.test('因子超過 4 列截斷、缺資料不拋錯', () => {
        const genes = [1, 2, 3, 4, 5].map((i) => ({ id: `g${i}`, displayName: `因子${i}`, type: '戰法', level: i }));
        const view = buildDs3BloodlineView({ id: 'x', name: 'x', genes } as unknown as GeneralConfig);
        assert.equals(4, view.factors.length);
        assert.equals(0, view.ep);
        assert.equals('命途多舛', view.epLabel);
    });

    suite.test('FUL-03 未達發現等級的因子遮罩：不露名稱、類型、說明，名稱灰色', () => {
        const cfg = {
            id: 'mask-test',
            genes: [
                { id: 'g_b', type: 'blue', displayName: '藍因子', level: 3, isLocked: false, description: '藍說明' },
                { id: 'g_p', type: 'purple', displayName: '紫因子', level: 3, isLocked: false, description: '紫說明' },
            ],
        } as unknown as GeneralConfig;
        const low = buildDs3BloodlineView(cfg, 4, 1);
        assert.equals('藍因子', low.factors[0].name);
        assert.equals('#50A0FF', low.factors[0].tint);
        assert.equals('???', low.factors[1].name);
        assert.equals('', low.factors[1].tag);
        assert.equals('Lv46 解鎖', low.factors[1].desc);
        assert.equals(FACTOR_LOCKED_TINT, low.factors[1].tint);

        const high = buildDs3BloodlineView(cfg, 4, 99);
        assert.equals('紫因子', high.factors[1].name);
        assert.equals('#AA78E6', high.factors[1].tint);
    });

    return suite;
}
