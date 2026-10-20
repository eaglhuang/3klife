/**
 * BloodlineTransmissionUltimate.test.ts — 五階血脈傳承奧義（GDUI-07 / PROG-2-0714）headless 測試
 *
 * Unity 對照：像 EditMode 測試，逐條驗技能樹的解鎖上限、門檻與拒絕原因。
 */
import { assert, TestSuite } from './TestRunner';
import {
    awakenNextStage,
    checkNextStage,
    initialUltimateState,
    normalizeUltimateState,
    raiseStageCap,
    type UltimateProgressInput,
} from '../assets/scripts/core/systems/BloodlineTransmissionUltimate';

const enough: UltimateProgressInput = { fame: 2000, incidents: 5, epicIncidents: 1 };

export function createBloodlineTransmissionUltimateSuite(): TestSuite {
    const suite = new TestSuite('BloodlineTransmissionUltimate (五階血脈傳承奧義 GDUI-07)');

    suite.test('初始：第 1 階已點亮，上限 1；升星只提高上限、不降低', () => {
        const start = initialUltimateState();
        assert.equals(1, start.stageCurrent);
        assert.equals(3, raiseStageCap(start, 3).stageCap);
        assert.equals(3, raiseStageCap(raiseStageCap(start, 3), 2).stageCap);
    });

    suite.test('升星上限擋住覺醒：上限 1 時第 2 階回報 CAP_LOCKED', () => {
        assert.equals('CAP_LOCKED', (checkNextStage(initialUltimateState(), enough) as { reason: string }).reason);
    });

    suite.test('名聲與事蹟門檻：第 2 階需 名聲 100 + 1 次事蹟', () => {
        const capped = raiseStageCap(initialUltimateState(), 5);
        assert.equals('FAME_SHORT', (checkNextStage(capped, { fame: 99, incidents: 9, epicIncidents: 0 }) as { reason: string }).reason);
        assert.equals('INCIDENT_SHORT', (checkNextStage(capped, { fame: 100, incidents: 0, epicIncidents: 0 }) as { reason: string }).reason);
        const ok = awakenNextStage(capped, { fame: 100, incidents: 1, epicIncidents: 0 });
        assert.isTrue(ok.ok);
        assert.equals(2, (ok as { awakenedStage: number }).awakenedStage);
    });

    suite.test('逐階點亮：第 5 階需 名聲 1500 與一次史詩事蹟；不能跳階', () => {
        let state = raiseStageCap(initialUltimateState(), 5);
        for (let stage = 2; stage <= 4; stage += 1) {
            const r = awakenNextStage(state, enough);
            assert.isTrue(r.ok);
            state = (r as { state: typeof state }).state;
        }
        assert.equals(4, state.stageCurrent);
        assert.equals('EPIC_REQUIRED', (checkNextStage(state, { fame: 1500, incidents: 9, epicIncidents: 0 }) as { reason: string }).reason);
        const last = awakenNextStage(state, enough);
        assert.equals(5, (last as { awakenedStage: number }).awakenedStage);
        assert.equals('ALREADY_MAX', (checkNextStage((last as { state: typeof state }).state, enough) as { reason: string }).reason);
    });

    suite.test('覺醒失敗不改狀態；存檔防呆：缺欄位、超出範圍、current 超過 cap 都夾回合法值', () => {
        const state = raiseStageCap(initialUltimateState(), 2);
        const failed = awakenNextStage(state, { fame: 0, incidents: 0, epicIncidents: 0 });
        assert.isFalse(failed.ok);
        assert.equals(1, state.stageCurrent);
        assert.equals(JSON.stringify({ stageCap: 1, stageCurrent: 1 }), JSON.stringify(normalizeUltimateState(undefined)));
        assert.equals(JSON.stringify({ stageCap: 2, stageCurrent: 2 }), JSON.stringify(normalizeUltimateState({ stageCap: 2, stageCurrent: 9 })));
    });

    return suite;
}
