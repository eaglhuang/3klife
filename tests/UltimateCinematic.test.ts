/**
 * UltimateCinematic.test.ts — 奧義演出設定檔解析（ULT-12，PROG-2-1061）headless 測試
 *
 * 鎖住：8 個效果家族都有預設演出；奧義有明寫就用明寫的；沒寫或只有空白就退回家族預設；
 * 解析結果不為空字串。
 */
import { assert, TestSuite } from './TestRunner';
import { cinematicProfileOf, DEFAULT_CINEMATIC_PROFILE } from '../assets/scripts/core/systems/UltimateCinematic';
import { UltimateEffectFamily } from '../assets/scripts/shared/SkillRuntimeContract';

export function createUltimateCinematicSuite(): TestSuite {
    const suite = new TestSuite('UltimateCinematic (奧義演出設定檔 ULT-12 PROG-2-1061)');

    suite.test('8 個效果家族都有非空的預設演出', () => {
        const families = Object.values(UltimateEffectFamily);
        assert.equals(8, families.length);
        families.forEach((family) => {
            assert.isTrue(DEFAULT_CINEMATIC_PROFILE[family].length > 0);
        });
    });

    suite.test('奧義明寫 cinematicProfile 時優先使用', () => {
        const profile = cinematicProfileOf({ family: UltimateEffectFamily.AreaBurst, cinematicProfile: 'cinematic-zhuge-star-fall' });
        assert.equals('cinematic-zhuge-star-fall', profile);
    });

    suite.test('沒寫（null、空字串、只有空白）時退回家族預設', () => {
        const expected = DEFAULT_CINEMATIC_PROFILE[UltimateEffectFamily.TeamBuff];
        assert.equals(expected, cinematicProfileOf({ family: UltimateEffectFamily.TeamBuff }));
        assert.equals(expected, cinematicProfileOf({ family: UltimateEffectFamily.TeamBuff, cinematicProfile: null }));
        assert.equals(expected, cinematicProfileOf({ family: UltimateEffectFamily.TeamBuff, cinematicProfile: '   ' }));
    });

    return suite;
}
