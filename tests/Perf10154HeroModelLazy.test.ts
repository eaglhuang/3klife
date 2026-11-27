// @spec-source → PROG-2-10154（戰場手機效能：有 Spine 時不載隱藏的 3D 主將模型）
import { assert, TestSuite } from './TestRunner';
import { shouldLoadHeroModel } from '../assets/scripts/battle/views/GeneralPortraitStandee';

export function createPerf10154HeroModelLazySuite(): TestSuite {
    const suite = new TestSuite('Perf10154HeroModelLazy (有 Spine 不載 3D 主將，兩者都沒有才載後備)');

    suite.test('Spine 可用：不載 3D 主將模型', () => {
        assert.equals(false, shouldLoadHeroModel('spine/generals/zhaoyun/zhaoyun', () => false));
    });

    suite.test('沒有 Spine 設定：載 3D 後備', () => {
        assert.equals(true, shouldLoadHeroModel(null, () => false));
        assert.equals(true, shouldLoadHeroModel(undefined, () => false));
        assert.equals(true, shouldLoadHeroModel('', () => false));
    });

    suite.test('Spine 素材確定載不起來：載 3D 後備', () => {
        assert.equals(true, shouldLoadHeroModel('spine/generals/x/x', (p) => p === 'spine/generals/x/x'));
        assert.equals(false, shouldLoadHeroModel('spine/generals/y/y', (p) => p === 'spine/generals/x/x'));
    });

    return suite;
}
