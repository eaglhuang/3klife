/**
 * BloodlineUltimateStages.test.ts — Bloodline_Ultimate 子欄位讀取模型（TSK-10，PROG-2-1384）
 *
 * 鎖住：合規資料讀為 VALUE；階數超過上限、目前階高於上限、標籤數量不對、進度越界都回 NO_DATA。
 */
import { assert, TestSuite } from './TestRunner';
import { BLOODLINE_ULTIMATE_MAX_STAGE, mapBloodlineUltimateStages } from '../assets/scripts/core/systems/GeneralReadModel';

const VALID = {
    Bloodline_Ultimate: {
        Bloodline_Beast: '玄龜',
        Persona_Tags: ['沉穩', '守節'],
        Stage_Current: 2,
        Stage_Cap: 3,
        Stage_Progress: 0.5,
        Stage_Requirements: ['升星至 3'],
    },
};

export function createBloodlineUltimateStagesSuite(): TestSuite {
    const suite = new TestSuite('BloodlineUltimateStages (Bloodline_Ultimate 子欄位 TSK-10)');

    suite.test('合規資料讀為 VALUE', () => {
        const stages = mapBloodlineUltimateStages(VALID);
        assert.equals('VALUE', stages.beast.state);
        assert.equals('VALUE', stages.personaTags.state);
        assert.equals('VALUE', stages.stageCurrent.state);
        assert.equals('VALUE', stages.stageCap.state);
        assert.equals('VALUE', stages.stageProgress.state);
        assert.equals('VALUE', stages.stageRequirements.state);
    });

    suite.test('缺整包時全部為 NO_DATA', () => {
        const stages = mapBloodlineUltimateStages({});
        assert.equals('NO_DATA', stages.stageCap.state);
        assert.equals('NO_DATA', stages.stageCurrent.state);
        assert.equals('NO_DATA', stages.beast.state);
    });

    suite.test('階數上限超過五階或目前階高於上限都不採用', () => {
        const overCap = mapBloodlineUltimateStages({ Bloodline_Ultimate: { ...VALID.Bloodline_Ultimate, Stage_Cap: BLOODLINE_ULTIMATE_MAX_STAGE + 1 } });
        assert.equals('NO_DATA', overCap.stageCap.state);
        assert.equals('NO_DATA', overCap.stageCurrent.state, '上限無效時目前階也不採用');
        const aboveCap = mapBloodlineUltimateStages({ Bloodline_Ultimate: { ...VALID.Bloodline_Ultimate, Stage_Current: 4 } });
        assert.equals('NO_DATA', aboveCap.stageCurrent.state);
    });

    suite.test('性格標籤必須為 2~3 個非空字串', () => {
        const one = mapBloodlineUltimateStages({ Bloodline_Ultimate: { ...VALID.Bloodline_Ultimate, Persona_Tags: ['沉穩'] } });
        assert.equals('NO_DATA', one.personaTags.state);
        const blank = mapBloodlineUltimateStages({ Bloodline_Ultimate: { ...VALID.Bloodline_Ultimate, Persona_Tags: ['沉穩', ''] } });
        assert.equals('NO_DATA', blank.personaTags.state);
    });

    suite.test('進度必須在 0~1 之間', () => {
        const over = mapBloodlineUltimateStages({ Bloodline_Ultimate: { ...VALID.Bloodline_Ultimate, Stage_Progress: 1.2 } });
        assert.equals('NO_DATA', over.stageProgress.state);
    });

    return suite;
}
