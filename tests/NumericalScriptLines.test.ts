/**
 * NumericalScriptLines.test.ts — 數值表現文案（PROG-2-1782）
 *
 * Unity 對照：EditMode Test；暴擊與 SP 走真實戰鬥結算，只把亂數固定。
 */
import { assert, TestSuite } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { bloodlineBirthLines } from '../assets/scripts/core/systems/BloodlineBirthLines';
import { critLine, highEpLine, rebirthBreakthroughLine, SP_FULL_LINE } from '../assets/scripts/core/systems/NumericalScriptLines';

const general = (id: string, name: string, faction: Faction) => new GeneralUnit({ id, name, faction, hp: 1000, str: 80, lea: 80 } as never);
const troop = (id: string, faction: Faction, row: number, col: number) => {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, { hp: 1000, attack: 40, defense: 10, moveRange: 1, attackRange: 1 });
    unit.moveTo(row, col);
    return unit;
};

function battle() {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', '張飛', Faction.Player), general('e', '呂布', Faction.Enemy));
    return { ctrl, resolver: ctrl['combatResolver'] };
}

function notices(run: () => void): string[] {
    const lines: string[] = [];
    const off = services().event.on(EVENT_NAMES.BattleSkillNotice, (line: string) => { lines.push(line); });
    run();
    off?.();
    return lines;
}

export function createNumericalScriptLinesSuite(): TestSuite {
    const suite = new TestSuite('NumericalScriptLines');

    suite.test('部隊暴擊：句子帶主將名與防守方實際扣的血；沒暴擊不說', () => {
        const { ctrl, resolver } = battle();
        const attacker = troop('atk', Faction.Player, 2, 3);
        const defender = troop('def', Faction.Enemy, 2, 4);
        ctrl.state.addUnit(attacker);
        ctrl.state.addUnit(defender);
        resolver.hitRandom = () => 0.01;
        const lines = notices(() => resolver.resolveCombat(attacker, defender, services()));
        assert.equals(critLine('張飛', 1000 - defender.currentHp), lines.join('|'));

        resolver.hitRandom = () => 0.5;
        assert.equals(0, notices(() => resolver.resolveCombat(attacker, defender, services())).length);
    });

    suite.test('SP 蓄滿：玩家跨過滿格才說，已滿與敵方都不說', () => {
        const { ctrl, resolver } = battle();
        const killer = troop('killer', Faction.Player, 3, 3);
        const victim = troop('victim', Faction.Enemy, 2, 2);
        const enemyKiller = troop('enemy-killer', Faction.Enemy, 1, 3);
        const enemyVictim = troop('enemy-victim', Faction.Player, 2, 4);
        for (const unit of [killer, victim, enemyKiller, enemyVictim]) ctrl.state.addUnit(unit);
        const player = ctrl.state.playerGeneral!;
        player.currentSp = player.maxSp - 1;
        assert.equals(SP_FULL_LINE, notices(() => resolver.onUnitKilled(victim, killer, services())).join('|'));
        assert.equals(0, notices(() => resolver.onUnitKilled(victim, killer, services())).length);
        player.currentSp = 0;
        assert.equals(0, notices(() => resolver.onUnitKilled(victim, killer, services())).length);
        const foe = ctrl.state.enemyGeneral!;
        foe.currentSp = foe.maxSp - 1;
        assert.equals(0, notices(() => resolver.onUnitKilled(enemyVictim, enemyKiller, services())).length);
    });

    suite.test('轉生突破：N 是轉數減 1，一批只說最高，滿轉溢出不算', () => {
        const entry = (rebirthCount: number, attributeCap: number, overflow = false) => ({ rebirthCount, attributeCap, overflow });
        assert.equals('第 1 次轉生！屬性上限突破至 1100！', rebirthBreakthroughLine([entry(2, 1100)]) ?? '');
        assert.equals('第 3 次轉生！屬性上限突破至 1350！', rebirthBreakthroughLine([entry(2, 1100), entry(4, 1350), entry(5, 1500, true)]) ?? '');
        assert.equals(null, rebirthBreakthroughLine([entry(5, 1500, true)]));
        assert.equals(null, rebirthBreakthroughLine([]));
    });

    suite.test('EP 特高：達 100 才說，也會出現在出生提示最後', () => {
        assert.equals(null, highEpLine(99));
        assert.equals(null, highEpLine(undefined));
        const line = '天賦異稟！爆發力 EP 達到 100！此子前途不可限量。';
        assert.equals(line, highEpLine(100) ?? '');
        assert.equals(line, bloodlineBirthLines({ ep: { resonance: 0, ep: 100 } }, () => null).join('|'));
        assert.equals(0, bloodlineBirthLines({ ep: { resonance: 0, ep: 60 } }, () => null).length);
    });

    return suite;
}
