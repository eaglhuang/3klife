/**
 * TallyCodexDeploy — 虎符圖鑑四態與委任 AI 出展（doc_spec_0346；PROG-2-2032）
 */
import { assert, TestSuite } from './TestRunner';
import {
    advanceTallyCodex, aiTallyDeployScore, enhanceTallyStar, evaluateAiTallyDeployment, isTallyAcquired, isTallyRevealed,
    pickAiTallyDeployment, tallyCodexFromSave, type TallyCodexEntry,
} from '../assets/scripts/core/systems/TallyCodexDeploy';

const LOCKED: TallyCodexEntry = { state: 'LOCKED', star: 1 };
const base = { generalInt: 90, currentGrain: 1000, tallyGrainCost: 300, counterRatio: 1, tallyStarLevel: 3 };

export function createTallyCodexDeploySuite(): TestSuite {
    const suite = new TestSuite('TallyCodexDeploy (虎符圖鑑與 AI 出展 doc_spec_0346 PROG-2-2032)');

    suite.test('§1 四態只進不退，入庫才可出征', () => {
        const seen = advanceTallyCodex(LOCKED, 'DISCOVERED');
        assert.isTrue(isTallyRevealed(seen));
        assert.isFalse(isTallyAcquired(seen));
        const got = advanceTallyCodex(seen, 'ACQUIRED');
        assert.isTrue(isTallyAcquired(got));
        assert.equals('ACQUIRED', advanceTallyCodex(got, 'DISCOVERED').state);
        assert.isFalse(isTallyRevealed(LOCKED));
    });

    suite.test('§1 升星需入庫、上限 5、不降星', () => {
        assert.equals('LOCKED', enhanceTallyStar(LOCKED, 3).state);
        const s3 = enhanceTallyStar({ state: 'ACQUIRED', star: 1 }, 3);
        assert.equals('STAR_ENHANCED', s3.state);
        assert.equals(3, s3.star);
        assert.equals(3, enhanceTallyStar(s3, 2).star);
        assert.equals(5, enhanceTallyStar(s3, 9).star);
    });

    suite.test('§4-1 存檔往返與異常值', () => {
        const entry = enhanceTallyStar({ state: 'ACQUIRED', star: 1 }, 4);
        const back = tallyCodexFromSave(JSON.parse(JSON.stringify(entry)));
        assert.equals('STAR_ENHANCED', back.state);
        assert.equals(4, back.star);
        assert.equals('LOCKED', tallyCodexFromSave({ state: 'X', star: 99 }).state);
        assert.equals(5, tallyCodexFromSave({ state: 'X', star: 99 }).star);
    });

    suite.test('§4-2 智力 74 或糧草不足絕不出展', () => {
        assert.isTrue(evaluateAiTallyDeployment(base));
        assert.isFalse(evaluateAiTallyDeployment({ ...base, generalInt: 74 }));
        assert.isFalse(evaluateAiTallyDeployment({ ...base, currentGrain: 599 }));
        assert.isTrue(evaluateAiTallyDeployment({ ...base, currentGrain: 600 }));
    });

    suite.test('§2.2 評分公式與門檻', () => {
        // 1×0.4 + 0.9×0.35 + 0.6×0.25 = 0.865
        assert.isTrue(Math.abs(aiTallyDeployScore(base) - 0.865) < 1e-9);
        assert.isFalse(evaluateAiTallyDeployment({ ...base, generalInt: 75, counterRatio: 0.3, tallyStarLevel: 1 }));
    });

    suite.test('§4-3 剋制比例高者優先出擊', () => {
        const picked = pickAiTallyDeployment([
            { ...base, tallyId: 'camp_cavalry', counterRatio: 0.4 },
            { ...base, tallyId: 'camp_xianzhen', counterRatio: 1.2 },
            { ...base, tallyId: 'camp_dajishi', counterRatio: 1.0 },
        ]);
        assert.equals('camp_xianzhen', picked);
        assert.equals(null, pickAiTallyDeployment([{ ...base, tallyId: 'x', generalInt: 60 }]));
    });

    return suite;
}
