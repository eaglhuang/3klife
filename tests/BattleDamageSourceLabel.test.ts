/**
 * BattleDamageSourceLabel — 戰鬥日誌不得把內部傷害來源代號印給玩家（PROG-2-9375）
 *
 * 線上實打看到「受到 27 傷害（troop-counter）」；另外兵種動態相剋觸發時，舊的剋制句不該同時出現。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { battleDamageSourceLabel, battleEndLogLine } from '../assets/scripts/battle/shared/BattleDamageSourceLabel';

function read(relative: string): string {
    return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
}

export function createBattleDamageSourceLabelSuite(): TestSuite {
    const suite = new TestSuite('BattleDamageSourceLabel（戰鬥日誌傷害來源說明，PROG-2-9375）');

    suite.test('認得的代號換成中文', () => {
        assert.equals('拒馬反擊', battleDamageSourceLabel('troop-counter'));
        assert.equals('夜襲先制', battleDamageSourceLabel('night-raid-opening-strike'));
        assert.equals('中毒', battleDamageSourceLabel('poison'));
        assert.equals('落石', battleDamageSourceLabel('hazard-rock'));
    });

    suite.test('帶編號的代號用前綴判斷', () => {
        assert.equals('水流', battleDamageSourceLabel('river-current:boundary'));
        assert.equals('傷害分攤', battleDamageSourceLabel('linked-share:skill-01'));
        assert.equals('反擊', battleDamageSourceLabel('counter:tally-evade'));
    });

    suite.test('不認得或沒有來源時不顯示', () => {
        assert.equals('', battleDamageSourceLabel('some-new-internal-id'));
        assert.equals('', battleDamageSourceLabel(undefined));
        assert.equals('', battleDamageSourceLabel(null));
        assert.equals('', battleDamageSourceLabel(''));
    });

    suite.test('程式裡寫死的傷害來源代號都有中文說明', () => {
        const files = [
            'assets/scripts/battle/runtime/BattleCombatResolver.ts',
            'assets/scripts/battle/runtime/phases/BattleTileEffectPhase.ts',
        ];
        const found = new Set<string>();
        for (const file of files) {
            const source = read(file);
            for (const match of source.matchAll(/damageSource: '([^']+)'/g)) found.add(match[1]);
            for (const match of source.matchAll(/damageSource: `([a-z-]+:)\$\{/g)) found.add(match[1] + 'x');
        }
        assert.isTrue(found.size >= 8, '至少掃到 8 個寫死的代號');
        for (const id of found) {
            assert.isTrue(battleDamageSourceLabel(id) !== '', `${id} 沒有中文說明`);
        }
    });

    suite.test('戰鬥日誌不再直接印出傷害來源代號', () => {
        const source = read('assets/scripts/battle/views/BattleUIBridge.ts');
        assert.isTrue(!source.includes('`（${data.damageSource}）`'), '不得直接印 damageSource');
        assert.isTrue(source.includes('battleDamageSourceLabel(data.damageSource)'));
    });

    suite.test('觸發兵種動態相剋時不再同時播舊的剋制句', () => {
        const source = read('assets/scripts/battle/runtime/BattleCombatResolver.ts');
        const guard = source.indexOf('if (!counter?.mechanic) {');
        const take = source.indexOf('this.counterAnnouncer.take(attacker.type, defender.type)');
        assert.isTrue(guard > 0 && take > guard, '舊剋制句要放在「沒觸發動態相剋」的判斷裡');
        assert.equals(take, source.lastIndexOf('this.counterAnnouncer.take(attacker.type, defender.type)'), '只能有一處');
    });

    suite.test('戰鬥結束那行寫中文結果，不印內部代號（PROG-2-9379）', () => {
        assert.equals('戰鬥結束：我方獲勝', battleEndLogLine('player-win'));
        assert.equals('戰鬥結束：敵方獲勝', battleEndLogLine('enemy-win'));
        assert.equals('戰鬥結束：平手', battleEndLogLine('draw'));
        assert.equals('戰鬥結束', battleEndLogLine('some-new-code'));
        const bridge = read('assets/scripts/battle/views/BattleUIBridge.ts');
        assert.isTrue(bridge.includes('this.appendLog(battleEndLogLine(data.result));'));
        assert.isFalse(bridge.includes('戰鬥結束：${data.result}'));
    });

    return suite;
}
