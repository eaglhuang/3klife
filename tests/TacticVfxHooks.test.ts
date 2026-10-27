/**
 * TacticVfxHooks.test.ts — 戰法特效掛點與掠奪飄字 headless 測試（TAC-16 / PROG-2-1303）
 *
 * 鎖住：SSR/UR 才閃現；火與水各掛一種格子特效；特效路徑只接受合規 ID；
 * 掠奪飄字只在掠奪型戰法且擊破或佔領時產生，數量為 0 的資源略過。
 *
 * Unity 對照：像技能觸發時的事件表，條件不符就不 Spawn，路徑由 ID 組出並先驗證。
 */
import { assert, TestSuite } from './TestRunner';
import {
    lootFloatingTexts,
    tacticFxPath,
    tacticVfxHooks,
    TACTIC_FX_ROOT,
} from '../assets/scripts/battle/shared/TacticVfxHooks';

export function createTacticVfxHooksSuite(): TestSuite {
    const suite = new TestSuite('TacticVfxHooks (戰法特效掛點與掠奪飄字 TAC-16 / PROG-2-1303)');

    suite.test('SSR 與 UR 戰法閃現；其他品質不閃現', () => {
        assert.equals(1, tacticVfxHooks({ tacticId: 'a', quality: 'SSR' }).length);
        assert.equals('flash', tacticVfxHooks({ tacticId: 'a', quality: 'UR' })[0].kind);
        assert.equals(0, tacticVfxHooks({ tacticId: 'a', quality: 'R' }).length);
    });

    suite.test('火計掛格子火焰；水計掛流動波紋並標示向右流向', () => {
        const fire = tacticVfxHooks({ tacticId: 'fire-plan', quality: 'R', element: 'fire' });
        assert.equals('grid-fire', fire[0].kind);
        const water = tacticVfxHooks({ tacticId: 'water-plan', quality: 'R', element: 'water' });
        assert.equals('grid-water-ripple', water[0].kind);
        assert.isTrue(water[0].kind === 'grid-water-ripple' && water[0].flowDirection === 'right');
    });

    suite.test('閃現與格子特效可同時出現，閃現在前', () => {
        const hooks = tacticVfxHooks({ tacticId: 'x', quality: 'SSR', element: 'fire' });
        assert.equals(2, hooks.length);
        assert.equals('flash', hooks[0].kind);
        assert.equals('grid-fire', hooks[1].kind);
    });

    suite.test('特效路徑依 ID 組在 assets/fx/tactics/；不合規 ID 回傳 null', () => {
        assert.equals(`${TACTIC_FX_ROOT}fire-plan.prefab`, tacticFxPath('fire-plan'));
        assert.isTrue(tacticFxPath('Fire Plan') === null);
        assert.isTrue(tacticFxPath('../etc') === null);
        assert.isTrue(tacticFxPath('') === null);
    });

    suite.test('掠奪飄字只在掠奪型且擊破或佔領時產生；0 數量略過', () => {
        const texts = lootFloatingTexts([
            { tacticId: 'valley-rock', lootTrigger: true, outcome: 'destroyed', resources: [{ name: '糧草', amount: 300 }, { name: '名聲', amount: 0 }] },
            { tacticId: 'valley-rock', lootTrigger: true, outcome: 'survived', resources: [{ name: '糧草', amount: 300 }] },
            { tacticId: 'fire-plan', lootTrigger: false, outcome: 'captured', resources: [{ name: '糧草', amount: 100 }] },
        ]);
        assert.equals(1, texts.length);
        assert.equals('+糧草 300', texts[0].text);
        assert.equals('gold', texts[0].color);
    });

    return suite;
}
