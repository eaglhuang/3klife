/**
 * TutorialBattleEntry — 首戰教學戰入口（PROG-2-0581）測試
 *
 * 規則：還沒通關任何關卡時，大廳開的戰鬥帶 tutorial=true；通關過後不再是教學戰。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { isTutorialBattle } from '../assets/scripts/shared/BattleEntryParams';

const ROOT = path.resolve(__dirname, '..');

export function createTutorialBattleEntrySuite(): TestSuite {
    const suite = new TestSuite('TutorialBattleEntry (首戰教學戰入口 PROG-2-0581)');

    suite.test('沒有通關任何關卡時是教學戰', () => {
        assert.isTrue(isTutorialBattle([]));
    });

    suite.test('通關過任何一關後不再是教學戰', () => {
        assert.isFalse(isTutorialBattle(['stage-1']));
        assert.isFalse(isTutorialBattle(['stage-1', 'stage-2']));
    });

    suite.test('大廳的開戰參數帶上 tutorial 旗標', () => {
        const source = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(source.includes('tutorial: isTutorialBattle(services().session.clearedStageIds)'), 'LobbyScene 沒有帶 tutorial 旗標');
    });

    return suite;
}
