/**
 * StaminaBurn — 破釜沉舟體力水池、燃燒率與根性減免（FORM-07，PROG-2-2125）
 */
import * as fs from 'fs';
import * as path from 'path';
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { aiDifficultyEntryOf, parseAiDifficultyTable } from '../assets/scripts/core/systems/AiDifficultyTable';
import { lastSpurtAdjustedDamage } from '../assets/scripts/core/systems/LastSpurt';
import { burnStamina, gutsBurnMultiplier, staminaBurnPerTurn, staminaPool, willOf } from '../assets/scripts/core/systems/StaminaBurn';
import { TestSuite, assert } from './TestRunner';

function near(expected: number, actual: number): void {
    assert.isTrue(Math.abs(expected - actual) < 1e-9, `expected ${expected}, got ${actual}`);
}

function battle(moveRange: number): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0.99);
    const ctrl = new BattleController();
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-difficulty.json'), 'utf8'));
    const player = new GeneralUnit({ id: 'p', name: 'p', faction: Faction.Player, hp: 400, maxSp: 100, initialSp: 0, str: 60, int: 60, lea: 60, luk: 50, tacticSlots: [], rebirthCount: 1 });
    const enemy = new GeneralUnit({ id: 'e', name: 'e', faction: Faction.Enemy, hp: 100000, maxSp: 100, initialSp: 0, str: 60, int: 60, lea: 60, tacticSlots: [], rebirthCount: 1 });
    ctrl.initBattle(player, enemy);
    ctrl.configureAiDifficulty(aiDifficultyEntryOf(parseAiDifficultyTable(raw).table!, 'normal'));
    ctrl.placeGeneralOnBoard(2, 2);
    const unit = new TroopUnit('p-troop', TroopType.Infantry, Faction.Player, { hp: 100000, attack: 1, defense: 1, moveRange, attackRange: 0 });
    unit.moveTo(0, 1);
    ctrl.state.addUnit(unit);
    return ctrl;
}

function runCycle(ctrl: BattleController): void {
    (ctrl as unknown as { turnManager: { enemyFood: number } }).turnManager.enemyFood = 0;
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

export function createStaminaBurnSuite(): TestSuite {
    const suite = new TestSuite('StaminaBurn (破釜沉舟體力燃燒 FORM-07 PROG-2-2125)');

    suite.test('體力庫：基礎體能加生命換算，兵種消耗率放大換算段', () => {
        near(100 + 50 * 0.8, staminaPool(1000));
        near(100 + 50 * 0.8 * 2, staminaPool(1000, 2));
        near(100, staminaPool(-5));
    });

    suite.test('WILL 以士氣為主、運氣為輔，負士氣視為 0，至少 1', () => {
        assert.equals(1250, willOf(100, 50));
        assert.equals(250, willOf(-30, 50));
        assert.equals(1, willOf(0, 0));
    });

    suite.test('根性係數照公式，WILL 越高燒得越少', () => {
        near(1 + 200 / 600, gutsBurnMultiplier(600));
        assert.isTrue(gutsBurnMultiplier(1200) < gutsBurnMultiplier(300));
    });

    suite.test('速度越快燒得越多，呈平方成長', () => {
        near(9 * gutsBurnMultiplier(600), staminaBurnPerTurn(1, 600));
        near(25 * gutsBurnMultiplier(600), staminaBurnPerTurn(3, 600));
    });

    suite.test('扣體力不低於 0', () => {
        near(100 - staminaBurnPerTurn(1, 600), burnStamina(100, 1, 600));
        assert.equals(0, burnStamina(1, 3, 600));
    });

    suite.test('體力耗盡後爆發失效，但低 STR 不會因此變強', () => {
        assert.equals(100, lastSpurtAdjustedDamage(100, 100, 1, true));
        assert.equals(Math.floor(100 * Math.sqrt(0.6)), lastSpurtAdjustedDamage(100, 30, 1, true));
        assert.equals(Math.floor(100 * Math.sqrt(2)), lastSpurtAdjustedDamage(100, 100, 1, false));
    });

    suite.test('流程：殘局前不燒；進殘局後每回合燒，歸零發一次事件；沒有兵的陣營不燒', () => {
        const ctrl = battle(3);
        const fired: Array<{ faction: Faction; turn: number }> = [];
        const off = services().event.on(EVENT_NAMES.StaminaExhausted, (data?: { faction: Faction; turn: number }) => {
            if (data) fired.push(data);
        });
        for (let cycle = 1; cycle <= 3; cycle += 1) runCycle(ctrl);
        assert.equals(false, ctrl.state.generalStamina.has(Faction.Player), '第 4 回合還沒進殘局');

        // 體力庫 116、每回合 25×根性(WILL 250 ≈1.516)≈37.9：第 5、6、7 回合仍有剩
        runCycle(ctrl);
        const pool = staminaPool(400);
        const burn = staminaBurnPerTurn(3, willOf(0, 50));
        near(pool - burn, ctrl.state.generalStamina.get(Faction.Player)!);
        runCycle(ctrl);
        runCycle(ctrl);
        assert.equals(false, ctrl.state.isStaminaExhausted(Faction.Player));
        assert.equals(0, fired.length);

        runCycle(ctrl);
        assert.equals(true, ctrl.state.isStaminaExhausted(Faction.Player), '第 8 回合耗盡');
        assert.equals(1, fired.length);
        assert.equals(Faction.Player, fired[0].faction);
        assert.equals(8, fired[0].turn);

        runCycle(ctrl);
        assert.equals(1, fired.length, '事件不重發');
        assert.equals(false, ctrl.state.isStaminaExhausted(Faction.Enemy), '敵方無兵不燒');
        off();
    });

    return suite;
}
