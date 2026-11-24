/**
 * GeneralAttackSfx.test.ts — 主將普攻音效依武器分開：刀、槍、劍、弓、法術各有專屬音效鍵，法術不再播刀聲。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { BATTLE_AUDIO_CUE, BATTLE_AUDIO_CLIP_MAP, resolveBattleGeneralAttackSfxKey } from '../assets/scripts/battle/shared/BattleAudio';
import { TestSuite, assert } from './TestRunner';

const bridge = readFileSync(join(__dirname, '../assets/scripts/battle/views/BattleUIBridge.ts'), 'utf8');

export function createGeneralAttackSfxSuite(): TestSuite {
    const suite = new TestSuite('GeneralAttackSfx');

    suite.test('五種武器各自對應不同的音效鍵，未知或無武器回通用聲', () => {
        const keys = ['blade', 'spear', 'sword', 'bow', 'cast'].map(w => resolveBattleGeneralAttackSfxKey(w));
        assert.equals(5, new Set(keys).size, '五種武器應有五個不同音效鍵');
        assert.equals(BATTLE_AUDIO_CUE.generalAttackCommon, resolveBattleGeneralAttackSfxKey());
        assert.equals(BATTLE_AUDIO_CUE.generalAttackCommon, resolveBattleGeneralAttackSfxKey('unknown'));
        assert.equals(BATTLE_AUDIO_CUE.generalAttackCommon, resolveBattleGeneralAttackSfxKey(null));
    });

    suite.test('法術普攻不再播刀聲（weapon）；槍用 bite、弓用 feijian', () => {
        const cast = BATTLE_AUDIO_CLIP_MAP[resolveBattleGeneralAttackSfxKey('cast')];
        assert.isTrue(cast !== 'weapon', `法術普攻不應播刀聲，實際 ${cast}`);
        assert.equals('bite', BATTLE_AUDIO_CLIP_MAP[resolveBattleGeneralAttackSfxKey('spear')]);
        assert.equals('feijian', BATTLE_AUDIO_CLIP_MAP[resolveBattleGeneralAttackSfxKey('bow')]);
        assert.equals('weapon', BATTLE_AUDIO_CLIP_MAP[resolveBattleGeneralAttackSfxKey('blade')]);
    });

    suite.test('每個主將音效鍵都有 clip 對應（缺檔時已就近借用，待補音檔）', () => {
        for (const w of ['blade', 'spear', 'sword', 'bow', 'cast']) {
            const key = resolveBattleGeneralAttackSfxKey(w);
            assert.isTrue(typeof BATTLE_AUDIO_CLIP_MAP[key] === 'string' && BATTLE_AUDIO_CLIP_MAP[key].length > 0, `${w} 缺 clip`);
        }
    });

    suite.test('接線：主將化身攻擊依武器選音效，小兵仍依兵種', () => {
        assert.isTrue(/_attackSfxKeyOf\(/.test(bridge), '小兵與主將化身攻擊音效需經 _attackSfxKeyOf');
        assert.isTrue(/resolveBattleGeneralAttackSfxKey\(this\._generalWeaponSfxOf/.test(bridge), '主將受攻擊音效需依攻擊方武器');
    });

    return suite;
}
