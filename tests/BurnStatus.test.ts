/**
 * BurnStatus.test.ts — 燃燒狀態（PROG-2-9726，使用者 11/22 裁決）
 * 單元：疊層、傷害、JSON 一致；端到端：踩火格、火攻命中、每回合 4%、2 回合消失、疊層上限 3、不蔓延、火格到期。
 */
import * as fs from 'fs';
import * as path from 'path';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleSkillTargetMode, SkillSourceType } from '../shared/skill-runtime';
import { BURN_CONFIG, advanceUnitBurn, applyUnitBurn, burnDamageOf, type BurnConfig, type UnitBurn } from '../assets/scripts/battle/shared/BurnStatus';
import { computeUnitStatusIcons, emptyStatusContext } from '../assets/scripts/battle/shared/UnitStatusIcons';
import { statusEffectFloatText } from '../assets/scripts/battle/shared/StatusEffectLabel';
import { statusPolarityOf } from '../assets/scripts/battle/shared/StatusApplyFeedback';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 100, str: 100, int: 90, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function enemyUnit(id: string, hp: number, lane = 2, depth = 3): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, Faction.Enemy, { hp, attack: 10, defense: 10, moveRange: 0, attackRange: 1 });
    unit.moveTo(lane, depth);
    return unit;
}

function quietBattle(): { ctrl: BattleController; player: GeneralUnit } {
    services().initialize();
    services().session.setRandomSource(() => 0);
    const ctrl = new BattleController();
    const player = general('caster', Faction.Player);
    const foe = general('foe', Faction.Enemy);
    ctrl.initBattle(player, foe);
    player.currentSp = player.maxSp;
    foe.currentSp = 0;
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
    return { ctrl, player };
}

function playTurn(ctrl: BattleController): void {
    ctrl.advanceTurn();
    ctrl.finalizeAdvanceTurn();
}

function castFire(ctrl: BattleController, targetUid: string): boolean {
    return ctrl.triggerPlayerBattleSkill('tally-fire-chain', SkillSourceType.TigerTally, {
        targetMode: BattleSkillTargetMode.EnemySingle,
        targetUnitUid: targetUid,
    });
}

export function createBurnStatusSuite(): TestSuite {
    const suite = new TestSuite('BurnStatus (燃燒狀態 PROG-2-9726)');

    suite.test('內建設定與 battle-burn.json 一致，數值為 4%／2 回合／3 層／不蔓延', () => {
        const file = path.join(__dirname, '..', 'assets', 'resources', 'data', 'battle-burn.json');
        const json = JSON.parse(fs.readFileSync(file, 'utf8')) as BurnConfig;
        assert.equals(JSON.stringify(BURN_CONFIG), JSON.stringify(json));
        assert.equals(0.04, json.burn.maxHpRatioPerTurn);
        assert.equals(2, json.burn.durationTurns);
        assert.equals(3, json.burn.stackCap);
        assert.isFalse(json.burn.spreads);
        assert.equals(2, json.fireTile.durationTurns);
    });

    suite.test('疊層上限 3：連續施加 5 次層數恆為 3，回合取 max 不相加', () => {
        const book = new Map<string, UnitBurn>();
        for (let i = 0; i < 5; i++) applyUnitBurn(book, 'u');
        assert.equals(3, book.get('u')!.stacks);
        assert.equals(2, book.get('u')!.remainingTurns);
    });

    suite.test('每回合傷害 = 最大 HP 4% x 層數，至少 1；兩回合後 advance 回傳 false', () => {
        assert.equals(40, burnDamageOf(1000, 1));
        assert.equals(120, burnDamageOf(1000, 3));
        assert.equals(1, burnDamageOf(5, 1));
        const burn: UnitBurn = { unitId: 'u', stacks: 1, remainingTurns: 2 };
        assert.isTrue(advanceUnitBurn(burn));
        assert.isFalse(advanceUnitBurn(burn));
    });

    suite.test('狀態圖示、飄字、極性都認得燃燒', () => {
        const list = computeUnitStatusIcons(
            { attackBonus: 0, maxHpBonus: 0, shield: 0, morale: 0, moraleTurns: 0 },
            { ...emptyStatusContext(), burn: { remainingTurns: 2 } },
        );
        assert.equals('burn', list.icons[0].kind);
        assert.equals('燃', list.icons[0].glyph);
        assert.equals('燃燒', statusEffectFloatText('burn'));
        assert.equals('debuff', statusPolarityOf('burn'));
    });

    suite.test('火攻命中會燃燒並在命中格留下火格；2 回合後燃燒消失', () => {
        const { ctrl } = quietBattle();
        const target = enemyUnit('victim', 1000, 2, 5);
        ctrl.state.addUnit(target);
        assert.isTrue(castFire(ctrl, 'victim'));
        assert.isTrue(ctrl.state.unitBurns.has('victim'), '被火攻命中就燃燒');
        assert.equals('hazard-fire', ctrl.state.getTileEffect(2, 5)?.state, '命中格留下火格');
        const hpBefore = target.currentHp;
        playTurn(ctrl);
        assert.isTrue(hpBefore - target.currentHp >= 40, '第 1 回合至少扣 4% 燃燒');
        ctrl.state.removeTileEffect(2, 5); // 火格還在時會一直重新點燃，拿掉才看得到燃燒自己的 2 回合
        playTurn(ctrl);
        playTurn(ctrl);
        assert.isFalse(ctrl.state.unitBurns.has('victim'), '火格拿掉後再 2 回合燃燒消失');
    });

    suite.test('純燃燒傷害：拿掉火格後每回合恰好 -4%，共 2 回合', () => {
        const { ctrl } = quietBattle();
        const target = enemyUnit('plain', 1000, 2, 5);
        ctrl.state.addUnit(target);
        assert.isTrue(castFire(ctrl, 'plain'));
        ctrl.state.removeTileEffect(2, 5);
        const start = target.currentHp;
        playTurn(ctrl);
        assert.equals(start - 40, target.currentHp, '第 1 回合 -4%');
        playTurn(ctrl);
        assert.equals(start - 80, target.currentHp, '第 2 回合 -4%');
        assert.isFalse(ctrl.state.unitBurns.has('plain'));
        playTurn(ctrl);
        assert.equals(start - 80, target.currentHp, '燃燒結束後不再扣血');
    });

    suite.test('疊層：連續被火攻 4 次層數封頂 3，每回合扣 12%', () => {
        const { ctrl, player } = quietBattle();
        const target = enemyUnit('stacked', 1000, 2, 5);
        ctrl.state.addUnit(target);
        for (let i = 0; i < 4; i++) {
            player.currentSp = player.maxSp;
            castFire(ctrl, 'stacked');
        }
        assert.equals(3, ctrl.state.unitBurns.get('stacked')!.stacks);
        ctrl.state.removeTileEffect(2, 5);
        const before = target.currentHp;
        playTurn(ctrl);
        assert.equals(before - 120, target.currentHp, '3 層 = 12% 最大 HP');
    });

    suite.test('踩到火格會燃燒（燃燒到下一回合才扣）；不蔓延到相鄰單位', () => {
        const { ctrl } = quietBattle();
        const standing = enemyUnit('stander', 1000, 1, 4);
        const neighbour = enemyUnit('neighbour', 1000, 2, 4);
        ctrl.state.addUnit(standing);
        ctrl.state.addUnit(neighbour);
        ctrl.state.placeFireTile(1, 4, 1, null, 'map-fire', 'stage:fire');
        playTurn(ctrl);
        assert.isTrue(ctrl.state.unitBurns.has('stander'), '站在火格上就燃燒');
        assert.isFalse(ctrl.state.unitBurns.has('neighbour'), '不蔓延到相鄰單位');
        assert.equals(999, standing.currentHp, '剛燒起來的當回合只吃火格傷害 1，不扣燃燒傷害');
        playTurn(ctrl);
        assert.equals(999 - 1 - 40, standing.currentHp, '下一回合 火格 1 + 燃燒 4%');
    });

    suite.test('戰法留下的火格 2 輪後消失；地圖原生火格（無回合數）永久存在', () => {
        const { ctrl } = quietBattle();
        ctrl.state.placeFireTile(0, 6, 0, 2, 'skill-fire', 'skill:hazard-cross');
        ctrl.state.placeFireTile(0, 7, 0, null, 'map-fire', 'stage:fire');
        playTurn(ctrl);
        assert.isTrue(ctrl.state.getTileEffect(0, 6) !== null, '第 1 輪後仍在');
        playTurn(ctrl);
        assert.isTrue(ctrl.state.getTileEffect(0, 6) === null, '第 2 輪後移除');
        assert.isTrue(ctrl.state.getTileEffect(0, 7) !== null, '原生火格永久');
    });

    return suite;
}
