/**
 * 名士占卜面板的方向提示（FUL-07 cc 接線，PROG-2-0447）
 *
 * 鎖住：有未解鎖方向時 directionHint 顯示色系（用面板用語）且 active；沒有時文字為空且 inactive；
 * 等級到門檻後提示消失；沒有對象時不給提示。佈局節點由 SageOracle.test.ts 的 key 檢查另外守住。
 */
import { assert, TestSuite } from './TestRunner';
import { SageOracleController } from '../assets/scripts/ui/core/SageOracleController';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function person(genes: Array<{ id: string; type: string; isLocked?: boolean }>): GeneralConfig {
    return { id: 'liu', name: '劉備', status: 'alive', genes } as unknown as GeneralConfig;
}

function controllerFor(general: GeneralConfig, discoveryLevel: number): SageOracleController {
    const session = {
        discoveryLevel,
        oracleCount: 0,
        itemCount: () => 1,
        isSageUnlocked: () => true,
        divineFactor: async () => ({ outcome: 'no-candidate' }) as never,
        predictOffspring: async () => ({ outcome: 'no-candidate' }) as never,
    };
    return new SageOracleController({ roster: { getAll: () => [general] }, session: session as never });
}

export function createSageOracleDirectionHintSuite(): TestSuite {
    const suite = new TestSuite('SageOracle 方向提示 (FUL-07 cc 接線 PROG-2-0447)');

    suite.test('等級不足時顯示未解鎖方向（面板用語），且節點啟用', () => {
        const g = person([
            { id: 'a', type: 'blue', isLocked: true },
            { id: 'b', type: 'green', isLocked: true },
            { id: 'c', type: 'red', isLocked: true },
        ]);
        const view = controllerFor(g, 1).getView();
        assert.equals('未解鎖方向：戰法、體魄', view.texts.directionHint);
        assert.isTrue(view.actives.directionHint);
    });

    suite.test('等級到門檻後提示消失，節點不啟用', () => {
        const g = person([{ id: 'b', type: 'green', isLocked: true }]);
        const view = controllerFor(g, 21).getView();
        assert.equals('', view.texts.directionHint);
        assert.isFalse(view.actives.directionHint);
    });

    suite.test('沒有可占卜對象時不給方向提示', () => {
        const dead = { ...person([{ id: 'b', type: 'green', isLocked: true }]), status: 'dead' } as unknown as GeneralConfig;
        const view = controllerFor(dead, 1).getView();
        assert.equals(undefined, view.texts.directionHint);
    });

    return suite;
}
