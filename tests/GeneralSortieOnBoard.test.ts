/**
 * GeneralSortieOnBoard.test.ts — 主將出陣站格逐格走（PROG-2-9715）
 * 使用者回饋：主將出陣後看不到 Q 版小人衝出去、站上格子走。根因是格上主將的 Spine 腳點被釘在場邊待命點。
 * 這裡鎖住接線：格上主將用自己的格子腳點、移動時播走路、上場從待命點衝到出陣格、不從天上落下。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

export function createGeneralSortieOnBoardSuite(): TestSuite {
    const suite = new TestSuite('GeneralSortieOnBoard (主將出陣站格逐格走 PROG-2-9715)');
    const src = read('assets/scripts/battle/views/UnitRenderer.ts');

    suite.test('格上主將的 Spine 與立繪站牌都用格子腳點，不再釘在場邊待命點', () => {
        assert.isTrue(src.includes('const foot = isGeneral ? this.boardGeneralFoot(unitId, unit.faction, view, dt) : this.unitGroundFoot(view);'));
        assert.isTrue(src.includes('const side = this.boardGeneralFoot(unitId, unit.faction, view, dt);'));
        assert.isFalse(src.includes('const foot = isGeneral ? this.generalSidelineFoot(unit.faction)'));
    });

    suite.test('主將逐格移動與出陣衝刺都播走路（揚塵、腳步聲跟小兵同一套）', () => {
        assert.isTrue(src.includes('const moving = this.movingUnits.has(unitId) || (isGeneral && this.generalDashes.has(unitId));'));
        assert.isFalse(src.includes('!isGeneral && this.movingUnits.has(unitId)'));
    });

    suite.test('上場從待命點衝到出陣格：素材載好才起跑、跑完刪除；主將不播從天落下', () => {
        const fn = src.slice(src.indexOf('private boardGeneralFoot'), src.indexOf('private unitGroundFoot'));
        assert.isTrue(fn.includes('this.generalSidelineFoot(faction)'), '起點是己方待命點');
        assert.isTrue(fn.includes('this.spineUnits.isShown(unitId)'), '載好才起跑');
        assert.isTrue(fn.includes('GENERAL_DASH_WAIT_SEC'), '載太久不卡在待命點');
        assert.isTrue(fn.includes('this.generalDashes.delete(unitId)'));
        assert.isTrue(src.includes('if (!this.isGeneralAvatarUnit(unit)) this.spineUnits.deploy(unit.id);'));
    });

    return suite;
}
