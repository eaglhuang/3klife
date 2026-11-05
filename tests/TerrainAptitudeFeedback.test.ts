/**
 * TerrainAptitudeFeedback.test.ts — 部隊踏上擅長或極差地形時的提示（PROG-2-1850）
 */
import { TestSuite, assert } from './TestRunner';
import { TerrainFeedbackTracker, terrainFeedbackText } from '../assets/scripts/core/systems/TerrainAptitudeFeedback';
import { terrainGradeOf } from '../assets/scripts/core/systems/BattleAptitude';
import { TerrainType } from '../assets/scripts/shared/CommonEnums';
import { TERRAIN_LABEL } from '../assets/scripts/ui/core/EnvScoutPresenter';

export function createTerrainAptitudeFeedbackSuite(): TestSuite {
    const suite = new TestSuite('TerrainAptitudeFeedback');

    suite.test('S、A、D 用規格字串，其餘不提示', () => {
        assert.equals('林地 ★★★ 極強', terrainFeedbackText('S', '林地'));
        assert.equals('水域 ✗ 極差', terrainFeedbackText('D', '水域'));
        assert.equals('林地 ★★☆ 擅長', terrainFeedbackText('A', '林地'));
        assert.isTrue(terrainFeedbackText('B', '林地') === null);
        assert.isTrue(terrainFeedbackText('C', '林地') === null);
    });

    suite.test('地形沒變不提示', () => {
        const tracker = new TerrainFeedbackTracker();
        assert.isTrue(tracker.onMoved('u1', 'forest', 'forest', 'S', '林地') === null);
    });

    suite.test('同部隊同地形只提示一次，離開再回來也不重複', () => {
        const tracker = new TerrainFeedbackTracker();
        assert.equals('林地 ★★★ 極強', tracker.onMoved('u1', 'plain', 'forest', 'S', '林地'));
        assert.isTrue(tracker.onMoved('u1', 'forest', 'plain', 'B', '平原') === null);
        assert.isTrue(tracker.onMoved('u1', 'plain', 'forest', 'S', '林地') === null);
    });

    suite.test('不同部隊各提示一次', () => {
        const tracker = new TerrainFeedbackTracker();
        assert.isTrue(tracker.onMoved('u1', 'plain', 'forest', 'S', '林地') !== null);
        assert.isTrue(tracker.onMoved('u2', 'plain', 'forest', 'S', '林地') !== null);
    });

    suite.test('不需提示的等級不佔用次數', () => {
        const tracker = new TerrainFeedbackTracker();
        assert.isTrue(tracker.onMoved('u1', 'plain', 'forest', 'B', '林地') === null);
        assert.isTrue(tracker.onMoved('u1', 'plain', 'forest', 'S', '林地') !== null);
    });

    suite.test('戰場地形列舉都查得到適性等級與名稱', () => {
        const profile = { terrainAptitude: { FOREST: 'S', WATER: 'D', MOUNTAIN: 'S', DESERT: 'D', PLAIN: 'S' } };
        assert.equals('S', terrainGradeOf(profile, TerrainType.Forest));
        assert.equals('D', terrainGradeOf(profile, TerrainType.River));
        assert.equals('S', terrainGradeOf(profile, TerrainType.Mountain));
        assert.equals('D', terrainGradeOf(profile, TerrainType.Desert));
        assert.equals('S', terrainGradeOf(profile, TerrainType.Plain));
        assert.equals('水域', TERRAIN_LABEL[TerrainType.River]);
    });

    return suite;
}
