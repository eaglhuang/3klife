// @spec-source → 使用者 11/20 裁決 Q-C2；PROG-2-9420
/**
 * EnemyInitialDeployment.test.ts — 遭遇戰敵軍開場布陣：資料整理、控制器生成、正式關卡資料全部可用。
 *
 * Unity 對照：像 EditMode 測試讀 ScriptableObject 的 initial spawn list，再開一場戰鬥數敵方後排生成了幾隊。
 */
import * as fs from 'fs';
import * as path from 'path';
import { Faction, GAME_CONFIG, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { resolveEnemyInitialDeployment } from '../assets/scripts/battle/shared/EnemyInitialDeployment';
import { TestSuite, assert } from './TestRunner';

const SKILL = 'cao-cao-tactics';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 100, str: 60, int: 90, lea: 90,
        skillId: SKILL, battlePrimarySkillId: SKILL, tacticSlots: [],
    });
}

function battle(tutorial = false): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
    ctrl.tutorialBattle = tutorial;
    return ctrl;
}

function enemyUnits(ctrl: BattleController): { type: string; lane: number; depth: number }[] {
    const list: { type: string; lane: number; depth: number }[] = [];
    ctrl.state.units.forEach((u) => { if (u.faction === Faction.Enemy) list.push({ type: u.type, lane: u.lane, depth: u.depth }); });
    return list.sort((a, b) => a.lane - b.lane);
}

const SAMPLE = [{ type: 'infantry', lane: 1 }, { type: 'cavalry', lane: 3 }, { type: 'shield', lane: 2 }];

export function createEnemyInitialDeploymentSuite(): TestSuite {
    const suite = new TestSuite('EnemyInitialDeployment (遭遇戰敵軍開場布陣 PROG-2-9420)');

    suite.test('資料整理：無效兵種、越界路線略過，同一路只取第一筆', () => {
        const spawns = resolveEnemyInitialDeployment([
            { type: 'infantry', lane: 1 },
            { type: 'dragon', lane: 2 },
            { type: 'archer', lane: 5 },
            { type: 'archer', lane: -1 },
            { type: 'archer', lane: 1.5 },
            { type: 'cavalry', lane: 1 },
            { type: 'pikeman', lane: 4 },
        ], { lanes: 5 });
        assert.equals(JSON.stringify([{ type: 'infantry', lane: 1 }, { type: 'pikeman', lane: 4 }]), JSON.stringify(spawns));
    });

    suite.test('沒寫資料、教學戰、路數不合法時不布陣', () => {
        assert.equals(0, resolveEnemyInitialDeployment(undefined, { lanes: 5 }).length);
        assert.equals(0, resolveEnemyInitialDeployment(null, { lanes: 5 }).length);
        assert.equals(0, resolveEnemyInitialDeployment(SAMPLE, { lanes: 5, tutorialBattle: true }).length);
        assert.equals(0, resolveEnemyInitialDeployment(SAMPLE, { lanes: 0 }).length);
    });

    suite.test('開戰後敵方後排照資料生成，不扣敵方糧草', () => {
        const ctrl = battle();
        const foodBefore = (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood;
        const spawned = ctrl.applyEnemyInitialDeployment(SAMPLE);
        assert.equals(3, spawned.length);
        const depth = GAME_CONFIG.GRID_DEPTH - 1;
        assert.equals(JSON.stringify([
            { type: TroopType.Infantry, lane: 1, depth },
            { type: TroopType.Shield, lane: 2, depth },
            { type: TroopType.Cavalry, lane: 3, depth },
        ]), JSON.stringify(enemyUnits(ctrl)));
        assert.equals(foodBefore, (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood);
    });

    suite.test('教學戰不布陣（波次表就是劇本）', () => {
        const ctrl = battle(true);
        assert.equals(0, ctrl.applyEnemyInitialDeployment(SAMPLE).length);
        assert.equals(0, enemyUnits(ctrl).length);
    });

    suite.test('格子已有部隊就跳過，不疊兵', () => {
        const ctrl = battle();
        ctrl.applyEnemyInitialDeployment([{ type: 'infantry', lane: 1 }]);
        const again = ctrl.applyEnemyInitialDeployment([{ type: 'cavalry', lane: 1 }, { type: 'archer', lane: 0 }]);
        assert.equals(1, again.length);
        assert.equals(2, enemyUnits(ctrl).length);
    });

    suite.test('正式 encounters.json 每關的開場布陣全部有效，開戰都生成得出來', () => {
        const file = path.resolve(__dirname, '../assets/resources/data/encounters.json');
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
        const list: { id: string; enemyInitialDeployment?: { type: string; lane: number }[] }[] = Array.isArray(raw) ? raw : (raw.encounters ?? Object.values(raw));
        let checked = 0;
        for (const enc of list) {
            if (!enc.enemyInitialDeployment) continue;
            const spawns = resolveEnemyInitialDeployment(enc.enemyInitialDeployment, { lanes: GAME_CONFIG.GRID_LANES });
            assert.equals(enc.enemyInitialDeployment.length, spawns.length, `${enc.id} 有資料被略過`);
            const ctrl = battle();
            assert.equals(spawns.length, ctrl.applyEnemyInitialDeployment(enc.enemyInitialDeployment).length, `${enc.id} 開戰生成數不符`);
            checked++;
        }
        assert.isTrue(checked >= 6, `至少要檢查六關，實際 ${checked}`);
    });

    return suite;
}
