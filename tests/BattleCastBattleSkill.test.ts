import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { Faction } from '../assets/scripts/core/config/Constants';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { SkillSourceType } from '../shared/skill-runtime';
import { TestSuite, assert } from './TestRunner';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

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

function createBattle(): BattleController {
    services().initialize();
    services().session.setRandomSource(() => 0);
    const ctrl = new BattleController();
    ctrl.initBattle(createGeneral('guan-yu', Faction.Player, 'guan-yu-slash'), createGeneral('lu-bu', Faction.Enemy, 'lu-bu-rampage'));
    return ctrl;
}

type DispatcherSpy = { calls: Array<{ method: string; args: unknown[] }> };

/** 把 dispatcher 的兩個入口換成記錄器，回傳假結果，避免真的結算戰鬥狀態。 */
function spyDispatcher(ctrl: BattleController, applied: boolean): DispatcherSpy {
    const spy: DispatcherSpy = { calls: [] };
    const dispatcher = ctrl['skillDispatcher'] as unknown as Record<string, (...args: unknown[]) => unknown>;
    const fakeResult = (battleSkillId: string | null) => ({
        requestId: 'spy',
        battleSkillId: battleSkillId ?? 'spy',
        applied,
        blockedReason: applied ? undefined : 'spy-blocked',
        deltas: [],
        battleLogLines: [],
    });
    dispatcher.dispatchSeedTactic = (...args: unknown[]) => {
        spy.calls.push({ method: 'dispatchSeedTactic', args });
        return fakeResult((args[1] as { battleSkillId?: string | null }).battleSkillId ?? null);
    };
    dispatcher.dispatchDirectBattleSkill = (...args: unknown[]) => {
        spy.calls.push({ method: 'dispatchDirectBattleSkill', args });
        return fakeResult(args[0] as string | null);
    };
    return spy;
}

export function createBattleCastBattleSkillSuite(): TestSuite {
    const suite = new TestSuite('BattleCastBattleSkill (戰法共用入口 PROG-2-0916)');

    suite.test('castBattleSkill：戰法來源以指定陣營走 dispatchSeedTactic（玩家與敵方同一入口）', () => {
        const ctrl = createBattle();
        const spy = spyDispatcher(ctrl, true);

        const playerResult = ctrl.castBattleSkill(Faction.Player, { battleSkillId: 'skill-a' });
        const enemyResult = ctrl.castBattleSkill(Faction.Enemy, { battleSkillId: 'skill-b' });

        assert.equals(2, spy.calls.length);
        assert.equals('dispatchSeedTactic', spy.calls[0].method);
        assert.equals(Faction.Player, spy.calls[0].args[0]);
        assert.equals('dispatchSeedTactic', spy.calls[1].method);
        assert.equals(Faction.Enemy, spy.calls[1].args[0]);
        assert.equals('skill-a', playerResult.battleSkillId);
        assert.equals('skill-b', enemyResult.battleSkillId);
    });

    suite.test('castBattleSkill：非戰法來源走 dispatchDirectBattleSkill 並帶入陣營與來源', () => {
        const ctrl = createBattle();
        const spy = spyDispatcher(ctrl, true);

        ctrl.castBattleSkill(Faction.Enemy, { battleSkillId: 'ult-x' }, SkillSourceType.Ultimate);

        assert.equals(1, spy.calls.length);
        assert.equals('dispatchDirectBattleSkill', spy.calls[0].method);
        assert.equals('ult-x', spy.calls[0].args[0]);
        assert.equals(SkillSourceType.Ultimate, spy.calls[0].args[1]);
        assert.equals(Faction.Enemy, spy.calls[0].args[2]);
    });

    suite.test('玩家既有行為不變：triggerPlayerSeedTactic 施放成功後仍重設 SP', () => {
        const ctrl = createBattle();
        const general = ctrl.state.playerGeneral!;
        general.currentSp = general.maxSp;
        const spy = spyDispatcher(ctrl, true);

        const didCast = ctrl.triggerPlayerSeedTactic({ battleSkillId: 'skill-a' });

        assert.isTrue(didCast);
        assert.equals(Faction.Player, spy.calls[0].args[0]);
        assert.equals(0, general.currentSp);
    });

    suite.test('玩家既有行為不變：dispatcher 未施放（applied=false）時 SP 不變、回傳 false', () => {
        const ctrl = createBattle();
        const general = ctrl.state.playerGeneral!;
        general.currentSp = general.maxSp;
        spyDispatcher(ctrl, false);

        const didCast = ctrl.triggerPlayerSeedTactic({ battleSkillId: 'skill-a' });

        assert.isFalse(didCast);
        assert.equals(general.maxSp, general.currentSp);
    });

    return suite;
}
