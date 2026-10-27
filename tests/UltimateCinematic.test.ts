/**
 * UltimateCinematic.test.ts — 奧義演出設定檔解析（ULT-12，PROG-2-1061）headless 測試
 *
 * 鎖住：8 個效果家族都有預設演出；奧義有明寫就用明寫的；沒寫或只有空白就退回家族預設；
 * 解析結果不為空字串。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { cinematicProfileOf, DEFAULT_CINEMATIC_PROFILE } from '../assets/scripts/core/systems/UltimateCinematic';
import { UltimateEffectFamily } from '../assets/scripts/shared/SkillRuntimeContract';

const ULTIMATE_DATA_PATH = path.join(__dirname, '..', 'assets', 'resources', 'data', 'master', 'ultimate-definitions.json');

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

    suite.test('缺 family 且沒明寫時退回 special-rule 家族預設（PROG-2-1320 暫定）', () => {
        const expected = DEFAULT_CINEMATIC_PROFILE[UltimateEffectFamily.SpecialRule];
        assert.equals(expected, cinematicProfileOf({}));
        assert.equals(expected, cinematicProfileOf({ family: null, cinematicProfile: '' }));
    });

    suite.test('實際奧義資料檔每一筆都有合法 family，且解析得到非空演出', () => {
        const list = JSON.parse(fs.readFileSync(ULTIMATE_DATA_PATH, 'utf8')).data as Array<{ id: string; family?: string }>;
        const validFamilies = Object.values(UltimateEffectFamily) as string[];
        assert.isTrue(list.length > 0);
        for (const item of list) {
            assert.isTrue(validFamilies.includes(item.family ?? ''), `${item.id} 的 family 不合法：${item.family}`);
            const profile = cinematicProfileOf({ family: item.family as UltimateEffectFamily });
            assert.isTrue(profile.length > 0, `${item.id} 解析不到演出`);
        }
    });

    return suite;
}
