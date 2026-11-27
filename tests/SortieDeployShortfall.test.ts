import { TestSuite, assert } from './TestRunner';
import { createSortieState, getDeployCost, type SortieState } from '../assets/scripts/core/systems/SortieDeploy';
import {
    deployHowToFix,
    deployShortBand,
    deployShortToast,
    deploySheetTitleKey,
    describeDeployShortfall,
    resourceAfterDeploy,
    resourceFillRatio,
    resourceSnapshot,
    resourceTone,
} from '../assets/scripts/core/systems/SortieDeployScripts';

/** 直接改欄位湊出情境；帳本其餘欄位維持 createSortieState 的預設 */
function stateWith(patch: Partial<SortieState>): SortieState {
    return { ...createSortieState({ commandCapacity: 9000, cityTroops: 9000, food: 500 }), ...patch };
}

const deepEq = (expected: unknown, actual: unknown): void => assert.equals(JSON.stringify(expected), JSON.stringify(actual));

export function createSortieDeployShortfallSuite(): TestSuite {
    const suite = new TestSuite('SortieDeployShortfall');
    const cav = getDeployCost({ troopType: 'cavalry' });

    suite.test('兵不夠：缺口 = 需求 - 現有，糧夠不算缺', () => {
        const sf = describeDeployShortfall(stateWith({ poolCurrent: cav.troopCost - 100, food: 500 }), { troopType: 'cavalry' });
        assert.equals('troops', sf.kind);
        assert.equals(100, sf.troops.gap);
        assert.equals(cav.troopCost, sf.troops.need);
        assert.equals(cav.troopCost - 100, sf.troops.have);
        assert.equals(0, sf.food.gap);
    });

    suite.test('糧不夠：只缺糧', () => {
        const sf = describeDeployShortfall(stateWith({ food: cav.foodCost - 6 }), { troopType: 'cavalry' });
        assert.equals('food', sf.kind);
        assert.equals(6, sf.food.gap);
        assert.equals(0, sf.troops.gap);
    });

    suite.test('兵糧皆缺：kind=both，兩項缺口各自算', () => {
        const sf = describeDeployShortfall(stateWith({ poolCurrent: 0, food: 0 }), { troopType: 'cavalry' });
        assert.equals('both', sf.kind);
        assert.equals(cav.troopCost, sf.troops.gap);
        assert.equals(cav.foodCost, sf.food.gap);
    });

    suite.test('場上已滿優先於資源不足；資源夠時 ok', () => {
        const full = describeDeployShortfall(stateWith({ fieldUnitLimit: 0, poolCurrent: 0 }), { troopType: 'cavalry' });
        assert.equals('field', full.kind);
        assert.equals(true, full.fieldFull);
        const ok = describeDeployShortfall(stateWith({}), { troopType: 'infantry' });
        assert.equals('ok', ok.kind);
        assert.equals(0, ok.troops.gap + ok.food.gap);
    });

    suite.test('Toast：缺兵帶兵種、需要、現有、差多少；糧為 0 沿用糧倉見底句', () => {
        const troops = describeDeployShortfall(stateWith({ poolCurrent: cav.troopCost - 100 }), { troopType: 'cavalry' });
        const t = deployShortToast(troops, '騎兵')!;
        assert.equals('battle.deploy.toast.troops', t.key);
        deepEq(['騎兵', String(cav.troopCost), String(cav.troopCost - 100), '100'], t.args);
        const empty = describeDeployShortfall(stateWith({ food: 0 }), { troopType: 'cavalry' });
        assert.equals('battle.deploy.toast.foodEmpty', deployShortToast(empty, '騎兵')!.key);
        const some = describeDeployShortfall(stateWith({ food: 3 }), { troopType: 'cavalry' });
        assert.equals('battle.deploy.toast.food', deployShortToast(some, '騎兵')!.key);
        const both = describeDeployShortfall(stateWith({ poolCurrent: 0, food: 0 }), { troopType: 'cavalry' });
        assert.equals('battle.deploy.toast.both', deployShortToast(both, '騎兵')!.key);
        const field = describeDeployShortfall(stateWith({ fieldUnitLimit: 0 }), { troopType: 'cavalry' });
        assert.equals('battle.deploy.toast.field', deployShortToast(field, '騎兵')!.key);
        assert.equals(null, deployShortToast(describeDeployShortfall(stateWith({}), { troopType: 'infantry' }), '步兵'));
    });

    suite.test('卡面缺額帶：兩者皆缺分兩行，場上已滿只一行', () => {
        const both = describeDeployShortfall(stateWith({ poolCurrent: 0, food: 0 }), { troopType: 'cavalry' });
        deepEq(['battle.deploy.short.troops', 'battle.deploy.short.food'], deployShortBand(both).map((c) => c.key));
        const field = describeDeployShortfall(stateWith({ fieldUnitLimit: 0, poolCurrent: 0, food: 0 }), { troopType: 'cavalry' });
        deepEq(['battle.deploy.short.field'], deployShortBand(field).map((c) => c.key));
        assert.equals(0, deployShortBand(describeDeployShortfall(stateWith({}), { troopType: 'infantry' })).length);
    });

    suite.test('說明面板標題與「怎麼補」只列當下真能做的項目', () => {
        const troops = describeDeployShortfall(stateWith({ poolCurrent: 0 }), { troopType: 'cavalry' });
        assert.equals('battle.deploy.sheet.title.troops', deploySheetTitleKey(troops.kind));
        const all = deployHowToFix(troops, { canRetreat: true, canPromote: true, redirect: { troopName: '民兵', troopCost: 300, foodCost: 5 } });
        deepEq(['battle.deploy.how.retreat', 'battle.deploy.how.redirect', 'battle.deploy.how.promote'], all.map((c) => c.key));
        deepEq(['民兵', '300', '5'], all[1].args);
        const none = deployHowToFix(troops, { canRetreat: false, canPromote: false, redirect: null });
        deepEq(['battle.deploy.how.none'], none.map((c) => c.key));
        const food = describeDeployShortfall(stateWith({ food: 0 }), { troopType: 'cavalry' });
        deepEq(['battle.deploy.how.foodFixed'], deployHowToFix(food, { canRetreat: true, canPromote: true, redirect: null }).map((c) => c.key));
    });

    suite.test('資源快照：名冊出征有軍勢；舊路徑只有糧草', () => {
        const s = stateWith({ poolCurrent: 400, poolMax: 8000, food: 120, maxFood: 300 });
        deepEq({ troops: { cur: 400, max: 8000 }, food: { cur: 120, max: 300 } }, resourceSnapshot(s, { cur: 1, max: 2 }));
        const legacy = resourceSnapshot(null, { cur: 80, max: 100 });
        assert.equals(undefined, legacy.troops);
        deepEq({ cur: 80, max: 100 }, legacy.food);
    });

    suite.test('狀態色與填滿比例；預覽剩餘不會變負', () => {
        assert.equals('normal', resourceTone(25, 100));
        assert.equals('low', resourceTone(24, 100));
        assert.equals('empty', resourceTone(0, 100));
        assert.equals(0, resourceFillRatio(5, 0));
        assert.equals(1, resourceFillRatio(150, 100));
        const after = resourceAfterDeploy({ troops: { cur: 400, max: 8000 }, food: { cur: 10, max: 300 } }, { troopCost: 500, foodCost: 18 });
        assert.equals(0, after.troops!.cur);
        assert.equals(0, after.food.cur);
    });

    return suite;
}
