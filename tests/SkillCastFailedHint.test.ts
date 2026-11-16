/**
 * 不用選目標的招式發動失敗時要說明原因（PROG-2-9342）
 *
 * 教學戰第 1 回合場上沒有敵軍，火攻自動瞄準不到目標，原本只跳「戰法發動失敗」。
 * Unity 對照：EditMode Test，只驗提示字的選擇，不開 Scene。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { castFailedToastKey, hasEnemyOnBoard } from '../assets/scripts/battle/views/BattleSkillTargetingFlow';
import { Faction } from '../assets/scripts/core/config/Constants';

const unit = (faction: Faction, dead = false) => ({ faction, isDead: () => dead });

export function createSkillCastFailedHintSuite(): TestSuite {
    const suite = new TestSuite('SkillCastFailedHint (招式失敗原因提示 PROG-2-9342)');

    suite.test('場上有沒有活著的敵軍', () => {
        assert.isFalse(hasEnemyOnBoard([]));
        assert.isFalse(hasEnemyOnBoard([unit(Faction.Player)]));
        assert.isFalse(hasEnemyOnBoard([unit(Faction.Enemy, true)]), '陣亡的不算');
        assert.isTrue(hasEnemyOnBoard([unit(Faction.Player), unit(Faction.Enemy)]));
    });

    suite.test('沒有敵軍時改用說明原因的提示字', () => {
        assert.equals('ui.battle.skill.cast_failed_no_enemy', castFailedToastKey(false));
        assert.equals('ui.battle.skill.cast_failed', castFailedToastKey(true));
    });

    suite.test('四個語系都有這句，且保留招式名稱的位置', () => {
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const file = path.join(__dirname, '..', 'assets', 'resources', 'i18n', `${locale}.json`);
            const text = JSON.parse(fs.readFileSync(file, 'utf8'))['ui.battle.skill.cast_failed_no_enemy'] as string;
            assert.isTrue(typeof text === 'string' && text.includes('{0}'), locale);
        }
    });

    return suite;
}
