import * as fs from 'fs';
import * as path from 'path';
import { BattleTactic, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { resolveCampCapture } from '../assets/scripts/battle/runtime/BattleVictoryResolver';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

function createGeneral(id: string, faction: Faction, skillId: string): GeneralUnit {
    return new GeneralUnit({
        id,
        name: id,
        faction,
        hp: 1000,
        maxSp: 100,
        initialSp: 100,
        str: 100,
        int: 90,
        lea: 90,
        skillId,
        battlePrimarySkillId: skillId,
    });
}

function campTiles(ctrl: BattleController): Array<{ lane: number; depth: number }> {
    const result: Array<{ lane: number; depth: number }> = [];
    for (const effect of ctrl.state.tileEffects.values()) {
        if (effect.state === 'scene-camp') result.push({ lane: effect.lane, depth: effect.depth });
    }
    return result;
}

function startBattle(tactic: BattleTactic, configure?: (ctrl: BattleController) => void): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    configure?.(ctrl);
    ctrl.initBattle(createGeneral('ma-chao', Faction.Player, 'ma-chao-charge'), createGeneral('cao-ren', Faction.Enemy, 'cao-ren-guard'), undefined, undefined, tactic);
    return ctrl;
}

export function createSceneCampSuite(): TestSuite {
    const suite = new TestSuite('SceneCamp (夜襲／埋伏營帳 PM 暫定)');

    suite.test('夜襲預設營帳在敵方後排中央（lane 3、depth 7），每場 1 個，不擋移動', () => {
        const ctrl = startBattle(BattleTactic.NightRaid);
        assert.equals(1, campTiles(ctrl).length);
        assert.equals(3, campTiles(ctrl)[0].lane);
        assert.equals(7, campTiles(ctrl)[0].depth);
        const effect = ctrl.state.getTileEffect(3, 7);
        assert.isFalse(effect?.blocksMovement ?? false);
    });

    suite.test('埋伏場景也有營帳；一般戰場沒有', () => {
        assert.equals(1, campTiles(startBattle(BattleTactic.AmbushAttack)).length);
        assert.equals(0, campTiles(startBattle(BattleTactic.Normal)).length);
    });

    suite.test('營帳座標可由場景資料覆寫（需在 initBattle 前設定）', () => {
        const ctrl = startBattle(BattleTactic.NightRaid, (c) => c.configureSceneCamp({ lane: 1, depth: 6 }));
        assert.equals(1, campTiles(ctrl).length);
        assert.equals(1, campTiles(ctrl)[0].lane);
        assert.equals(6, campTiles(ctrl)[0].depth);
    });

    suite.test('我方單位站在營帳格上即勝利；敵軍或已死亡單位不算', () => {
        const ctrl = startBattle(BattleTactic.NightRaid);

        const enemy = new TroopUnit('enemy-scout', TroopType.Infantry, Faction.Enemy, { hp: 100, attack: 10, defense: 5, moveRange: 0, attackRange: 1 });
        enemy.moveTo(3, 7);
        ctrl.state.addUnit(enemy);
        assert.isTrue(resolveCampCapture(ctrl.state) === null);

        const player = new TroopUnit('player-runner', TroopType.Infantry, Faction.Player, { hp: 100, attack: 10, defense: 5, moveRange: 0, attackRange: 1 });
        player.moveTo(3, 7);
        ctrl.state.addUnit(player);
        assert.equals('player-win', resolveCampCapture(ctrl.state));
    });

    suite.test('沒有營帳格或我方不在營帳上時，不觸發勝利', () => {
        const ctrl = startBattle(BattleTactic.Normal);
        assert.isTrue(resolveCampCapture(ctrl.state) === null);
    });

    suite.test('施放者預設為敵方（sceneCaster）；落石天命取施放陣營主將基因', () => {
        const ctrl = startBattle(BattleTactic.RockSlide);
        assert.equals(Faction.Enemy, ctrl.state.sceneCaster);
        const source = fs.readFileSync(path.join(__dirname, '..', 'assets/scripts/battle/controllers/BattleController.ts'), 'utf8');
        assert.isTrue(source.includes('this.state.getGeneral(this.state.sceneCaster)?.genes'), '施放者沒有接 sceneCaster');
        assert.isFalse(source.includes("this.state.getGeneral(Faction.Player)?.genes ?? [],\n    });"), '施放者仍寫死為玩家主將');
    });

    suite.test('回合結束判定接上營帳佔領', () => {
        const source = fs.readFileSync(path.join(__dirname, '..', 'assets/scripts/battle/controllers/BattleController.ts'), 'utf8');
        assert.isTrue(source.includes('resolveCampCapture(this.state)'), 'resolvePlayerTurn 沒有檢查營帳佔領');
    });

    return suite;
}
