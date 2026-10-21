/**
 * BattlePerformanceTrackerE2E.test.ts — 戰績累加器對真實戰場事件的帳（QA，PROG-2-0658）
 *
 * Unity 對照：像 PlayMode 測試把「結算面板的傷害／擊殺」與戰場實際血量變化對帳，
 * 排行榜的數字都從這裡來，一旦重複計算整個榜都歪。
 */
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattlePerformanceTracker } from '../assets/scripts/core/systems/BattleRecordStats';
import { TestSuite, assert } from './TestRunner';

const SKILL = 'cao-cao-tactics';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 100, str: 60, int: 90, lea: 90,
        skillId: SKILL, battlePrimarySkillId: SKILL,
    });
}

/** 和 BattleUIBridge 一樣的事件接線；side 是被統計的陣營 */
function attachTracker(side: Faction): { tracker: BattlePerformanceTracker; off: () => void } {
    const svc = services();
    const tracker = new BattlePerformanceTracker(side);
    const handles = [
        svc.event.on(EVENT_NAMES.UnitDamaged, (d?: { unitId: string; damage: number; attackerFaction: Faction | null }) => {
            if (!d) return;
            const unit = currentCtrl?.state.units.get(d.unitId);
            tracker.observeUnitDamaged(d.damage, d.attackerFaction, unit?.faction ?? null);
        }),
        svc.event.on(EVENT_NAMES.UnitDied, (d?: { faction: Faction }) => { if (d) tracker.observeUnitDied(d.faction); }),
        svc.event.on(EVENT_NAMES.GeneralDamaged, (d?: { faction: Faction; damage?: number; wasDodged?: boolean }) => {
            if (d && !d.wasDodged) tracker.observeGeneralDamaged(d.damage ?? 0, d.faction);
        }),
    ];
    return { tracker, off: () => handles.forEach((off) => (typeof off === 'function' ? off() : undefined)) };
}

let currentCtrl: BattleController | null = null;

function playerSideHp(ctrl: BattleController): number {
    const units = [...ctrl.state.units.values()].filter((u) => u.faction === Faction.Player).reduce((s, u) => s + u.currentHp, 0);
    return units;
}

export function createBattlePerformanceTrackerE2ESuite(): TestSuite {
    const suite = new TestSuite('BattlePerformanceTrackerE2E (戰績累加器對帳 PROG-2-0658)');

    suite.test('敵方出招打我方：以敵方為統計方，傷害量 = 我方實際掉的血（沒有重複計算）', () => {
        services().initialize();
        services().session.setRandomSource(() => 0.99);
        const ctrl = new BattleController();
        currentCtrl = ctrl;
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        assert.equals('ok', ctrl.startGeneralDuel());
        assert.isDefined(ctrl.placeGeneralOnBoard(2, 2));
        const foot = new TroopUnit('player-foot', TroopType.Infantry, Faction.Player, { hp: 5000, attack: 1, defense: 10, moveRange: 1, attackRange: 1 });
        foot.moveTo(2, 3);
        ctrl.state.addUnit(foot);
        ctrl.state.getCell(2, 3)!.occupantId = foot.id;
        ctrl.state.enemyGeneral!.currentSp = ctrl.state.enemyGeneral!.maxSp;

        const { tracker, off } = attachTracker(Faction.Enemy);
        const before = playerSideHp(ctrl);
        for (let turn = 0; turn < 3; turn += 1) {
            ctrl.resolvePlayerTurn();
            ctrl.resolveEnemyTurn();
            ctrl.finalizeEnemyTurn();
        }
        off();
        const lost = before - playerSideHp(ctrl);
        assert.isTrue(lost > 0, '我方確實掉血');
        assert.equals(lost, tracker.snapshot().damageDealt, `累加器傷害 ${tracker.snapshot().damageDealt} 應等於實際掉血 ${lost}`);
    });

    suite.test('我方部隊殺敵：擊殺數 = 場上實際陣亡的敵軍數，且有記到傷害', () => {
        services().initialize();
        services().session.setRandomSource(() => 0.99);
        const ctrl = new BattleController();
        currentCtrl = ctrl;
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        assert.equals('ok', ctrl.startGeneralDuel());
        assert.isDefined(ctrl.placeGeneralOnBoard(0, 0));
        const hitter = new TroopUnit('player-hit', TroopType.Infantry, Faction.Player, { hp: 5000, attack: 500, defense: 50, moveRange: 1, attackRange: 1 });
        hitter.moveTo(4, 1);
        ctrl.state.addUnit(hitter);
        ctrl.state.getCell(4, 1)!.occupantId = hitter.id;
        const prey = new TroopUnit('enemy-prey', TroopType.Infantry, Faction.Enemy, { hp: 30, attack: 1, defense: 1, moveRange: 1, attackRange: 1 });
        prey.moveTo(4, 2);
        ctrl.state.addUnit(prey);
        ctrl.state.getCell(4, 2)!.occupantId = prey.id;
        (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;

        const { tracker, off } = attachTracker(Faction.Player);
        for (let turn = 0; turn < 3; turn += 1) {
            ctrl.resolvePlayerTurn();
            ctrl.resolveEnemyTurn();
            ctrl.finalizeEnemyTurn();
        }
        off();
        assert.isFalse(ctrl.state.units.has('enemy-prey'), '獵物已陣亡');
        const snapshot = tracker.snapshot();
        assert.equals(1, snapshot.kills, '擊殺數剛好 1');
        assert.isTrue(snapshot.damageDealt > 0, '有記到傷害');
    });

    return suite;
}
