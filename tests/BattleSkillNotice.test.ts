/**
 * BattleSkillNotice.test.ts — 戰法與奧義的戰鬥訊息要進戰報（PROG-2-1781）
 *
 * Unity 對照：EditMode Test，執行器換成 spy，只驗派發器廣播了哪些句子。
 */
import { assert, TestSuite } from './TestRunner';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleSkillDispatcher } from '../assets/scripts/battle/runtime/BattleSkillDispatcher';
import { ANCESTRAL_SPIRIT_LOG } from '../assets/scripts/battle/shared/AncestralSpirit';
import { EVENT_NAMES, Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';

const unit = (id: string, faction: Faction) => ({ id, faction, lane: 0, depth: 0, type: 'infantry', currentHp: 10, isDead: () => false });

function rig(faction: Faction, context: Record<string, unknown> = {}, generalId = 'zhou-yu') {
    const state = new BattleState();
    const general = new GeneralUnit({ id: generalId, name: '周瑜', faction, hp: 100, vitality: 100, maxVitality: 100 } as never);
    if (faction === Faction.Player) state.playerGeneral = general;
    else state.enemyGeneral = general;
    state.units.set('caster', unit('caster', faction) as never);
    const dispatcher = new BattleSkillDispatcher({ state, ...context } as never, {} as never);
    (dispatcher as unknown as { skillExecutor: unknown }).skillExecutor = {
        execute: (request: { battleSkillId: string }) => ({ requestId: 'spy', battleSkillId: request.battleSkillId, applied: true, deltas: [], battleLogLines: [] }),
    };
    return { state, dispatcher };
}

function notices(run: () => void): string[] {
    const lines: string[] = [];
    const off = services().event.on(EVENT_NAMES.BattleSkillNotice, (line: string) => { lines.push(line); });
    run();
    off?.();
    return lines;
}

const ultimate = (extra: Record<string, unknown> = {}) => ({
    sourceType: SkillSourceType.Ultimate,
    ownerUid: 'caster',
    ultimateId: 'ult-qa-1',
    ultimateAttack: 100,
    battleSkillId: 'zhou-yu-inferno',
    targetMode: 'tile',
    timing: 'active-cast',
    ...extra,
}) as never;

export function createBattleSkillNoticeSuite(): TestSuite {
    const suite = new TestSuite('BattleSkillNotice');

    suite.test('組合奧義生效時進戰報，敵方也顯示', () => {
        for (const faction of [Faction.Player, Faction.Enemy]) {
            const { dispatcher } = rig(faction, { getUnitSourceGeneralId: () => 'zhuge-liang' });
            assert.equals('組合奧義：赤壁大火（威力 ×1.5）', notices(() => dispatcher.executeBattleSkillRequest(ultimate())).join('|'));
        }
    });

    suite.test('英靈附體生效時進戰報，一場只一次', () => {
        const { state, dispatcher } = rig(Faction.Player);
        state.units.set('foe', unit('foe', Faction.Enemy) as never);
        state.units.set('foe2', unit('foe2', Faction.Enemy) as never);
        assert.equals(ANCESTRAL_SPIRIT_LOG, notices(() => dispatcher.executeBattleSkillRequest(ultimate())).join('|'));
        assert.equals(0, notices(() => dispatcher.executeBattleSkillRequest(ultimate({ ultimateId: 'ult-qa-2' }))).length);
    });

    suite.test('玩家被擋下看得到原因；AI 被擋下不寫戰報', () => {
        const player = rig(Faction.Player);
        player.dispatcher.executeBattleSkillRequest(ultimate());
        assert.equals('此奧義本場已施放過', notices(() => player.dispatcher.executeBattleSkillRequest(ultimate())).join('|'));

        const enemy = rig(Faction.Enemy);
        enemy.dispatcher.executeBattleSkillRequest(ultimate());
        assert.equals(0, notices(() => enemy.dispatcher.executeBattleSkillRequest(ultimate())).length);

        const retreat = rig(Faction.Player, { isUnitActionBlocked: () => true });
        assert.equals('本回合撤退失敗，無法行動', notices(() => retreat.dispatcher.executeBattleSkillRequest(ultimate())).join('|'));

        const condition = rig(Faction.Player, { getTacticConditions: () => [{ type: 'weather', value: 'qa-never' }] });
        assert.equals('戰法條件未達成，無法發動', notices(() => condition.dispatcher.executeBattleSkillRequest(ultimate({ tacticId: 'qa' }))).join('|'));
    });

    return suite;
}
