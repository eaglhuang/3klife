/**
 * 增益治療減益代號對應（SYS-SKILL-TAC-0002 第一片，PROG-2-0586）headless 測試
 */
import { TestSuite, assert } from './TestRunner';
import { statusModuleTagOf } from '../assets/scripts/battle/skills/BattleSkillModuleTags';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';

export function createBattleSkillStatusModuleTagsSuite(): TestSuite {
    const suite = new TestSuite('BattleSkillStatusModuleTags (增益治療減益代號 TAC-0002)');

    const tagOf = (id: string) => {
        const profile = resolveBattleSkillProfile(id);
        assert.isTrue(profile !== null, `缺少戰法 profile：${id}`);
        return statusModuleTagOf(profile!);
    };

    suite.test('效果種類對到規格代號：治療 THEAL、士氣 TBUFF、緩速與 DOT 為 TDEBUFF', () => {
        assert.equals('THEAL', statusModuleTagOf({ effectKind: 'heal' }));
        assert.equals('TBUFF', statusModuleTagOf({ effectKind: 'morale' }));
        assert.equals('TDEBUFF', statusModuleTagOf({ effectKind: 'slow' }));
        assert.equals('TDEBUFF', statusModuleTagOf({ effectKind: 'dot' }));
    });

    suite.test('非狀態形狀不帶代號（傷害、控制、地格）', () => {
        assert.equals(null, statusModuleTagOf({ effectKind: 'damage' }));
        assert.equals(null, statusModuleTagOf({ effectKind: 'tile-buff' }));
        assert.equals(null, statusModuleTagOf({}));
    });

    suite.test('已落地的戰法對到規格代號：鼓舞為 TBUFF，緩速為 TDEBUFF，毒箭為 TDEBUFF', () => {
        assert.equals('TBUFF', tagOf('mentor-morale'));
        assert.equals('TDEBUFF', tagOf('mentor-slow'));
        assert.equals('TDEBUFF', tagOf('tally-poison-arrow'));
    });

    return suite;
}
