import { assert, TestSuite } from './TestRunner';
import {
    GACHA_PREVIEW_BANNER_ART_BINDING,
    orderGachaPreviewCandidateIds,
    resolveGachaPreviewGeneralIdOverride,
    resolveGachaPreviewPortraitPath,
    resolveGachaPreviewStateKey,
} from '../assets/scripts/ui/core/GachaPreviewStateRoute';

export function createGachaPreviewStateRouteSuite(): TestSuite {
    const suite = new TestSuite('GachaPreviewStateRoute');

    suite.test('人物指定預覽保留卡池狀態並優先指定人物', () => {
        assert.equals('skinLayer_BannerCharacterArt', GACHA_PREVIEW_BANNER_ART_BINDING);
        assert.equals('bloodline-seed', resolveGachaPreviewStateKey('limited-spotlight', 'hero:zhao-yun'));
        assert.equals('zhao-yun', resolveGachaPreviewGeneralIdOverride('hero:zhao-yun'));
        assert.equals('sprites/generals/zhao_yun_portrait', resolveGachaPreviewPortraitPath('zhao-yun'));

        const ordered = orderGachaPreviewCandidateIds(['guan-yu', 'zhao-yun', 'guan-yu'], 'hero:zhao-yun', () => 0.5);
        assert.equals('zhao-yun', ordered[0]);
        assert.equals(2, ordered.length);
    });

    suite.test('seed 預覽每次以相同順序排列卡池人物', () => {
        const candidateIds = ['cao-cao', 'liu-bei', 'guan-yu', 'zhao-yun'];
        const first = orderGachaPreviewCandidateIds(candidateIds, 'hero:seed:qa-run');
        const second = orderGachaPreviewCandidateIds(candidateIds, 'hero:seed:qa-run');
        assert.equals(JSON.stringify(first), JSON.stringify(second));
        assert.equals('bloodline-seed', resolveGachaPreviewStateKey('limited-spotlight', 'hero:seed:qa-run'));
    });

    suite.test('隨機預覽會重新排序並忽略無效候選', () => {
        const ordered = orderGachaPreviewCandidateIds(['bad id', 'cao-cao', 'liu-bei'], 'hero', () => 0);
        assert.equals('liu-bei', ordered[0]);
        assert.equals(2, ordered.length);
    });

    return suite;
}
