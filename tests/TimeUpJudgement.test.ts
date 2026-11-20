// @spec-source → PROG-2-9423 瓦口隘 15 回合時限：時限到依戰果判勝負
/**
 * TimeUpJudgement.test.ts — 回合用盡依戰果判定：純函式、設定檔，以及戰場勝負判定的整合。
 *
 * Unity 對照：比賽時間到的判定規則測試，不開場景，直接建 BattleController 改血量。
 */
import { TestSuite, assert } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { resolveBattleVictory, type BattleEndedPayload } from '../assets/scripts/battle/runtime/BattleVictoryResolver';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { EVENT_NAMES, Faction, Weather } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { FORTRESS_MAX_HP } from '../assets/scripts/core/systems/FortressBarView';
import {
    DEFAULT_TIME_UP_JUDGEMENT,
    isTimeUpRule,
    judgeTimeUp,
    lostRatio,
    parseTimeUpJudgementConfig,
    timeUpVerdictLine,
    turnLabelText,
    turnLimitIntroLine,
    type TimeUpSnapshot,
} from '../assets/scripts/core/systems/TimeUpJudgement';

function snap(over: Partial<TimeUpSnapshot> = {}): TimeUpSnapshot {
    return {
        playerFortressHp: 500, enemyFortressHp: 500, fortressMaxHp: 500,
        playerGeneralHp: 1000, playerGeneralMaxHp: 1000, enemyGeneralHp: 1000, enemyGeneralMaxHp: 1000,
        ...over,
    };
}

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({ id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 100, str: 80, int: 80, lea: 80 });
}

function wakouBattle(): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(general('p-timeup', Faction.Player), general('e-timeup', Faction.Enemy), undefined, Weather.Clear);
    ctrl.configureEncounterTurnLimit(15, 'by-damage');
    return ctrl;
}

function setTurn(turn: number): void {
    (services().battle as unknown as { turn: number }).turn = turn;
}

function endAfterTimeUp(ctrl: BattleController): { result: string; payload: BattleEndedPayload | null } {
    let payload: BattleEndedPayload | null = null;
    const off = services().event.on(EVENT_NAMES.BattleEnded, (data?: BattleEndedPayload) => { if (data) payload = data; });
    setTurn(16);
    const result = resolveBattleVictory(ctrl.state);
    off();
    return { result, payload };
}

export function createTimeUpJudgementSuite(): TestSuite {
    const suite = new TestSuite('TimeUpJudgement');

    suite.test('戰果：打得重的一方勝；城寨與主將失血比例相加', () => {
        const win = judgeTimeUp(snap({ enemyFortressHp: 250, playerGeneralHp: 800 }));
        assert.equals('player-win', win.winner);
        assert.equals(0.5, win.playerScore);
        assert.isTrue(Math.abs(win.enemyScore - 0.2) < 1e-9);
        const lose = judgeTimeUp(snap({ playerFortressHp: 100, enemyGeneralHp: 500 }));
        assert.equals('enemy-win', lose.winner);
    });

    suite.test('平手判 tieWinner（預設敵方）；都沒受傷也算平手', () => {
        assert.equals('enemy-win', judgeTimeUp(snap()).winner);
        assert.equals('enemy-win', judgeTimeUp(snap({ enemyFortressHp: 400, playerFortressHp: 400 })).winner);
        const cfg = parseTimeUpJudgementConfig({ tieWinner: 'player-win' });
        assert.equals('player-win', judgeTimeUp(snap(), cfg).winner);
    });

    suite.test('權重可調：只看城寨時主將失血不算', () => {
        const cfg = parseTimeUpJudgementConfig({ fortressWeight: 1, generalWeight: 0 });
        const v = judgeTimeUp(snap({ enemyGeneralHp: 1, playerFortressHp: 450 }), cfg);
        assert.equals('enemy-win', v.winner);
    });

    suite.test('設定檔：不合法或兩個權重都 0 時退回預設；實際設定檔是 1／1／敵方', () => {
        const bad = parseTimeUpJudgementConfig({ fortressWeight: -1, generalWeight: 'x', tieWinner: 'draw' });
        assert.equals(DEFAULT_TIME_UP_JUDGEMENT.fortressWeight, bad.fortressWeight);
        assert.equals(DEFAULT_TIME_UP_JUDGEMENT.generalWeight, bad.generalWeight);
        assert.equals('enemy-win', bad.tieWinner);
        const zero = parseTimeUpJudgementConfig({ fortressWeight: 0, generalWeight: 0 });
        assert.equals(1, zero.fortressWeight);
        assert.equals(1, zero.generalWeight);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const real = parseTimeUpJudgementConfig(require('../assets/resources/data/time-up-judgement.json'));
        assert.equals(1, real.fortressWeight);
        assert.equals(1, real.generalWeight);
        assert.equals('enemy-win', real.tieWinner);
    });

    suite.test('失血比例夾在 0~1；上限不合法視為沒失血', () => {
        assert.equals(0, lostRatio(600, 500));
        assert.equals(1, lostRatio(-10, 500));
        assert.equals(0, lostRatio(100, 0));
    });

    suite.test('文案：HUD 分母、開戰說明、結算百分比', () => {
        assert.equals('第 3/15 回合', turnLabelText(3, 15));
        assert.equals('第 3 回合', turnLabelText(3, null));
        assert.equals('第 15/15 回合', turnLabelText(16, 15));
        assert.isTrue((turnLimitIntroLine(15, 'by-damage') ?? '').includes('15 回合'));
        assert.equals(null, turnLimitIntroLine(undefined, 'by-damage'));
        const line = timeUpVerdictLine(judgeTimeUp(snap({ enemyFortressHp: 250, playerGeneralHp: 800 })));
        assert.equals('時限到：我軍戰果 25%，敵軍戰果 10%，我軍戰果較優。', line);
        assert.isTrue(timeUpVerdictLine(judgeTimeUp(snap())).includes('不分軒輊'));
    });

    suite.test('瓦口隘設定：encounters.json 是 15 回合、by-damage', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const data = require('../assets/resources/data/encounters.json') as { encounters: Array<{ id: string; turnLimit?: number; timeUpRule?: string }> };
        const wakou = data.encounters.find((e) => e.id === 'theme-canyon-wakou');
        assert.equals(15, wakou?.turnLimit);
        assert.isTrue(isTimeUpRule(wakou?.timeUpRule));
        assert.equals('by-damage', wakou?.timeUpRule);
    });

    suite.test('整合：第 15 回合還沒到不結束；用盡後戰果較優判我方勝，事件帶分數', () => {
        const ctrl = wakouBattle();
        assert.equals(15, services().battle.getTurnLimit());
        assert.equals(15, services().battle.getDisplayTurnLimit());
        setTurn(15);
        assert.equals('ongoing', resolveBattleVictory(ctrl.state));
        ctrl.state.enemyFortressHp = FORTRESS_MAX_HP - 100;
        const { result, payload } = endAfterTimeUp(ctrl);
        assert.equals('player-win', result);
        const p = payload as BattleEndedPayload | null;
        assert.equals('time-up', p?.cause);
        assert.isTrue((p?.timeUpVerdict?.playerScore ?? 0) > 0);
        assert.equals(undefined, p?.retreated);
    });

    suite.test('整合：用盡時我方損失較重或平手判敵方勝（撤退）', () => {
        const ctrl = wakouBattle();
        ctrl.state.playerFortressHp = FORTRESS_MAX_HP - 100;
        const lose = endAfterTimeUp(ctrl);
        assert.equals('enemy-win', lose.result);
        assert.equals(true, (lose.payload as BattleEndedPayload | null)?.retreated);
        const tie = endAfterTimeUp(wakouBattle());
        assert.equals('enemy-win', tie.result);
    });

    suite.test('整合：開戰會清掉關卡時限；教學戰與不合法上限不套用', () => {
        const ctrl = wakouBattle();
        services().battle.beginBattle();
        assert.equals(null, services().battle.getDisplayTurnLimit());
        assert.equals('enemy-win', services().battle.getTurnLimitOutcome());
        ctrl.configureEncounterTurnLimit(0, 'by-damage');
        assert.equals(null, services().battle.getDisplayTurnLimit());
        ctrl.tutorialBattle = true;
        const tutorialLimit = services().battle.getTurnLimit();
        ctrl.configureEncounterTurnLimit(15, 'by-damage');
        assert.equals(tutorialLimit, services().battle.getTurnLimit());
        assert.equals('player-win', services().battle.getTurnLimitOutcome());
    });

    return suite;
}
