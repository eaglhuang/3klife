/**
 * AptitudeDialogueFlow.test.ts — 適性台詞接進戰鬥回合流程的多回合測試（APT-14 戰鬥接線 / PROG-2-1310）
 *
 * 鎖住：排程天氣 晴→大風→大風→晴 推進四回合，只有風向突變的第 2 回合發一次風向台詞；
 * 沒有存活的我方部隊時，即使風向突變也不發台詞。
 *
 * Unity 對照：像回合管理器的 OnTurnStart 事件，只有條件成立的那一回合才 Raise 一次。
 */
import { TestSuite, assert } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { TroopType } from '../assets/scripts/shared/CommonEnums';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { EVENT_NAMES, Faction, Weather } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { WeatherScheduleEntry } from '../assets/scripts/core/systems/WeatherSchedule';

const SCHEDULE: WeatherScheduleEntry[] = [
    { turnStart: 1, turnEnd: 1, weather: Weather.Clear },
    { turnStart: 2, turnEnd: 3, weather: Weather.Windy },
    { turnStart: 4, turnEnd: 4, weather: Weather.Clear },
];

interface AptitudeLineEvent { turn: number; line: string }

function createGeneral(): GeneralUnit {
    return new GeneralUnit({
        id: 'zhao-yun', name: 'zhao-yun', faction: Faction.Player, hp: 1000, maxSp: 100, initialSp: 100,
        str: 100, int: 90, lea: 90, skillId: 'zhao-yun-slash', battlePrimarySkillId: 'zhao-yun-slash',
    });
}

function setup(withTroop: boolean): { ctrl: BattleController; lines: AptitudeLineEvent[]; off: () => void } {
    services().initialize();
    const ctrl = new BattleController();
    const enemy = new GeneralUnit({
        id: 'lu-bu', name: 'lu-bu', faction: Faction.Enemy, hp: 1000, maxSp: 100, initialSp: 100,
        str: 100, int: 90, lea: 90, skillId: 'lu-bu-rampage', battlePrimarySkillId: 'lu-bu-rampage',
    });
    ctrl.initBattle(createGeneral(), enemy, undefined, Weather.Clear);
    ctrl.setWeatherSchedule(SCHEDULE);
    if (withTroop) {
        const troop = new TroopUnit('zhao-yun-infantry', TroopType.Infantry, Faction.Player, {
            hp: 100, attack: 30, defense: 10, moveRange: 0, attackRange: 1,
        });
        troop.moveTo(2, 2);
        (ctrl as unknown as { state: { addUnit(unit: TroopUnit): void } }).state.addUnit(troop);
    }
    const lines: AptitudeLineEvent[] = [];
    const off = services().event.on(EVENT_NAMES.AptitudeDialogue, (data?: AptitudeLineEvent) => {
        if (data) lines.push(data);
    });
    return { ctrl, lines, off };
}

function advanceToTurn(ctrl: BattleController, target: number): void {
    let guard = 0;
    while (services().battle.getSnapshot().turn < target && guard++ < 10) {
        (ctrl as unknown as { finalizeRuntimeTurnCycle(): void }).finalizeRuntimeTurnCycle();
    }
}

export function createAptitudeDialogueFlowSuite(): TestSuite {
    const suite = new TestSuite('AptitudeDialogueFlow (適性台詞回合流程 APT-14 / PROG-2-1310)');

    suite.test('多回合推進：只有風向突變的第 2 回合播一次風向台詞', () => {
        const { ctrl, lines, off } = setup(true);
        advanceToTurn(ctrl, 4);
        off();
        assert.equals(4, services().battle.getSnapshot().turn);
        assert.equals(1, lines.length);
        assert.equals(2, lines[0].turn);
        assert.isTrue(lines[0].line.length > 0);
    });

    suite.test('沒有存活的我方部隊時，風向突變也不播台詞', () => {
        const { ctrl, lines, off } = setup(false);
        advanceToTurn(ctrl, 4);
        off();
        assert.equals(0, lines.length);
    });

    return suite;
}
