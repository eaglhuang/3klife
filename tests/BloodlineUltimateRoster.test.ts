/**
 * BloodlineUltimateRoster.test.ts — 五階血脈傳承奧義套回名冊武將（PROG-2-0718）headless 測試
 *
 * 鎖住：升星只提高 Stage_Cap 且不降低；覺醒依名聲與事蹟點亮下一階；條件不足時原物件不變；
 * 缺欄位的舊武將視為初始狀態；函式不修改輸入。
 */
import { assert, TestSuite } from './TestRunner';
import { awakenBloodlineUltimate, raiseBloodlineUltimateCap, type BloodlineUltimateHolder } from '../assets/scripts/core/systems/BloodlineUltimateRoster';

function general(extra: Partial<BloodlineUltimateHolder> = {}): BloodlineUltimateHolder & { id: string } {
    return { id: 'gen_test', fame: 0, incidents: 0, epicIncidents: 0, ...extra };
}

export function createBloodlineUltimateRosterSuite(): TestSuite {
    const suite = new TestSuite('BloodlineUltimateRoster (五階奧義套回名冊 PROG-2-0718)');

    suite.test('升星提高 Stage_Cap，且不會因較小的星數降低', () => {
        const up = raiseBloodlineUltimateCap(general({ bloodlineUltimate: { stageCap: 2, stageCurrent: 1 } }), 4);
        assert.equals(4, up.bloodlineUltimate?.stageCap);
        assert.equals(1, up.bloodlineUltimate?.stageCurrent);
        const kept = raiseBloodlineUltimateCap(general({ bloodlineUltimate: { stageCap: 4, stageCurrent: 1 } }), 2);
        assert.equals(4, kept.bloodlineUltimate?.stageCap);
    });

    suite.test('缺欄位的武將升星時從初始狀態（上限 1）開始計算', () => {
        const up = raiseBloodlineUltimateCap(general(), 3);
        assert.equals(3, up.bloodlineUltimate?.stageCap);
        assert.equals(1, up.bloodlineUltimate?.stageCurrent);
    });

    suite.test('名聲與事蹟足夠時覺醒下一階，回傳新副本', () => {
        const g = general({ bloodlineUltimate: { stageCap: 3, stageCurrent: 1 }, fame: 100, incidents: 1 });
        const result = awakenBloodlineUltimate(g);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(2, result.awakenedStage);
        assert.equals(2, result.general.bloodlineUltimate?.stageCurrent);
        assert.equals(3, result.general.bloodlineUltimate?.stageCap);
    });

    suite.test('上限未升星時覺醒被擋（CAP_LOCKED）', () => {
        const g = general({ bloodlineUltimate: { stageCap: 1, stageCurrent: 1 }, fame: 100, incidents: 1 });
        const result = awakenBloodlineUltimate(g);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('CAP_LOCKED', result.reason);
    });

    suite.test('名聲不足時覺醒被擋（FAME_SHORT），原物件不變', () => {
        const g = general({ bloodlineUltimate: { stageCap: 3, stageCurrent: 1 }, fame: 99, incidents: 1 });
        const result = awakenBloodlineUltimate(g);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('FAME_SHORT', result.reason);
        assert.equals(1, g.bloodlineUltimate?.stageCurrent);
    });

    suite.test('第 5 階需要史詩事蹟，沒有時回傳 EPIC_REQUIRED', () => {
        const g = general({ bloodlineUltimate: { stageCap: 5, stageCurrent: 4 }, fame: 1500, incidents: 3, epicIncidents: 0 });
        const result = awakenBloodlineUltimate(g);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('EPIC_REQUIRED', result.reason);
    });

    suite.test('已點亮滿 5 階時回傳 ALREADY_MAX', () => {
        const g = general({ bloodlineUltimate: { stageCap: 5, stageCurrent: 5 }, fame: 1500, incidents: 3, epicIncidents: 1 });
        const result = awakenBloodlineUltimate(g);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('ALREADY_MAX', result.reason);
    });

    suite.test('升星與覺醒都不修改輸入的武將物件', () => {
        const g = general({ bloodlineUltimate: { stageCap: 2, stageCurrent: 1 }, fame: 100, incidents: 1 });
        raiseBloodlineUltimateCap(g, 5);
        awakenBloodlineUltimate(g);
        assert.equals(2, g.bloodlineUltimate?.stageCap);
        assert.equals(1, g.bloodlineUltimate?.stageCurrent);
    });

    return suite;
}
