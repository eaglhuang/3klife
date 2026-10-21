/**
 * TigerTallyShellGate — 殼戰法不可施放（PROG-2-0933，QA 提醒）
 *
 * TRP-15 的 23 條殼 profile 效果尚未實作，必須擋下施放：不扣 SP、不改敵方血量。
 * 用真實 BattleController 跑完整回合；同場景的已實作虎符戰法當正向對照，確認閘門沒有誤擋。
 *
 * Unity 對照：像技能按鈕的 interactable 條件，效果腳本沒掛上時按鈕本身就不能按。
 */
import { Faction } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { isBattleSkillImplemented } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { TroopType } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 90, int: 60, lea: 80,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function fullTurn(ctrl: BattleController): void {
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

/** 玩家主將在前排，敵方三隊步兵在同一縱列；回傳可觀察的玩家與敵方狀態 */
function setup() {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    const player = general('p', Faction.Player);
    ctrl.initBattle(player, general('e', Faction.Enemy));
    ctrl.placeGeneralOnBoard(2, 2);
    const enemies: TroopUnit[] = [];
    for (let i = 0; i < 3; i += 1) {
        const troop = new TroopUnit(`e-${i}`, TroopType.Infantry, Faction.Enemy, {
            hp: 100000, attack: 1, defense: 0, moveRange: 1, attackRange: 1,
        });
        troop.moveTo(2, 4 + i);
        ctrl.state.addUnit(troop);
        enemies.push(troop);
    }
    player.currentSp = player.maxSp;
    return { ctrl, player, enemies };
}

export function createTigerTallyShellGateSuite(): TestSuite {
    const suite = new TestSuite('TigerTallyShellGate (殼戰法不可施放 PROG-2-0933)');

    suite.test('isBattleSkillImplemented：殼為 false，已實作與查無 profile 的 id 為 true', () => {
        assert.isFalse(isBattleSkillImplemented('tally-shen-wei'));
        assert.isTrue(isBattleSkillImplemented('tally-defense-pierce'));
        assert.isTrue(isBattleSkillImplemented('no-such-skill'));
    });

    suite.test('真實多回合：殼戰法施放被擋，SP 不被重置、敵方血量三回合都不變', () => {
        const { ctrl, player, enemies } = setup();
        const hpBefore = enemies.reduce((sum, troop) => sum + troop.currentHp, 0);

        const applied = ctrl.triggerPlayerBattleSkill('tally-shen-wei', SkillSourceType.TigerTally);
        assert.isFalse(applied, '殼戰法不應施放成功');
        assert.equals(player.maxSp, player.currentSp, '未施放時 SP 不應被重置');

        for (let turn = 0; turn < 3; turn += 1) fullTurn(ctrl);
        const hpAfter = enemies.reduce((sum, troop) => sum + troop.currentHp, 0);
        assert.equals(hpBefore, hpAfter, '殼戰法不應造成任何傷害');
    });

    suite.test('正向對照：已實作的虎符戰法（陷陣）同場景可施放並造成傷害', () => {
        const { ctrl, enemies } = setup();
        const hpBefore = enemies.reduce((sum, troop) => sum + troop.currentHp, 0);

        const applied = ctrl.triggerPlayerBattleSkill('tally-defense-pierce', SkillSourceType.TigerTally);
        const hpAfter = enemies.reduce((sum, troop) => sum + troop.currentHp, 0);
        assert.isTrue(applied, '已實作戰法應可施放');
        assert.isTrue(hpAfter < hpBefore, '已實作戰法應造成傷害');
    });

    return suite;
}
