/**
 * 戰場精力閘門接線（LIFE-10，PROG-2-0426）
 *
 * 覆蓋：施放者精力不足時，奧義與種子戰法被擋下且不進入執行器；
 * 武將缺精力資料時預設滿值；區間判定本身見 VitalityBattleGate.test.ts。
 *
 * 只測阻擋路徑：放行路徑會進入技能執行器，需要完整戰鬥環境，不在本卡範圍。
 */
import { assert, TestSuite } from './TestRunner';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleSkillDispatcher } from '../assets/scripts/battle/runtime/BattleSkillDispatcher';
import { Faction } from '../assets/scripts/core/config/Constants';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';

/** 建立一個玩家方武將與施放者單位；精力數值由參數指定 */
function setupCaster(vitality: number | undefined, maxVitality: number | undefined): { state: BattleState; dispatcher: BattleSkillDispatcher } {
    const state = new BattleState();
    const config = { id: 'test-general', name: '測試武將', faction: Faction.Player, hp: 100, vitality, maxVitality };
    state.playerGeneral = new GeneralUnit(config as never);
    state.units.set('player-unit', { id: 'player-unit', faction: Faction.Player, lane: 0, depth: 0, type: 'infantry', currentHp: 10 } as never);
    const dispatcher = new BattleSkillDispatcher({ state } as never, {} as never);
    return { state, dispatcher };
}

export function createBattleVitalityGateSuite(): TestSuite {
    const suite = new TestSuite('BattleVitalityGate (戰場精力閘門接線 LIFE-10)');

    suite.test('耗盡段（<10%）：種子戰法被擋下，回傳 vitality-restricted 與精力耗盡文字', () => {
        const { dispatcher } = setupCaster(5, 100);
        const result = dispatcher.executeBattleSkillRequest({
            sourceType: SkillSourceType.SeedTactic,
            ownerUid: 'player-unit',
            battleSkillId: 'zhou-yu-inferno',
            targetMode: 'tile',
            timing: 'active-cast',
        } as never);
        assert.equals(false, result.applied);
        assert.equals('vitality-restricted', result.blockedReason ?? '');
        assert.equals('精力耗盡，無法發動戰法', result.battleLogLines[0] ?? '');
    });

    suite.test('中段（10%~50%）：奧義被擋下，回傳精力低迷文字', () => {
        const { dispatcher } = setupCaster(30, 100);
        const result = dispatcher.executeBattleSkillRequest({
            sourceType: SkillSourceType.Ultimate,
            ownerUid: 'player-unit',
            battleSkillId: 'zhou-yu-inferno',
            targetMode: 'tile',
            timing: 'active-cast',
        } as never);
        assert.equals(false, result.applied);
        assert.equals('vitality-restricted', result.blockedReason ?? '');
        assert.equals('精力低迷，無法發動終極戰法', result.battleLogLines[0] ?? '');
    });

    suite.test('耗盡段：奧義同樣被擋下', () => {
        const { dispatcher } = setupCaster(0, 100);
        const result = dispatcher.executeBattleSkillRequest({
            sourceType: SkillSourceType.Ultimate,
            ownerUid: 'player-unit',
            battleSkillId: 'zhou-yu-inferno',
            targetMode: 'tile',
            timing: 'active-cast',
        } as never);
        assert.equals('vitality-restricted', result.blockedReason ?? '');
    });

    suite.test('直接派發：ownerUid 是陣營字串（不是單位 uid）時，仍依該陣營武將的精力擋下', () => {
        // 直接派發（dispatchDirectBattleSkill）的 ownerUid 填的是陣營，戰場上找不到同名單位
        const { dispatcher, state } = setupCaster(5, 100);
        assert.isTrue(state.units.get(Faction.Player) === undefined);
        const result = dispatcher.executeBattleSkillRequest({
            sourceType: SkillSourceType.Ultimate,
            ownerUid: Faction.Player,
            battleSkillId: 'zhou-yu-inferno',
            targetMode: 'tile',
            timing: 'active-cast',
        } as never);
        assert.equals(false, result.applied);
        assert.equals('vitality-restricted', result.blockedReason ?? '');
    });

    suite.test('武將缺精力資料：預設滿值，不因缺值被擋', () => {
        const general = new GeneralUnit({ id: 'no-vit', name: '無精力', faction: Faction.Player, hp: 100 } as never);
        assert.equals(100, general.vitality);
        assert.equals(100, general.maxVitality);
    });

    suite.test('非武將來源（虎符等）不受精力閘門影響：耗盡時仍不會回傳 vitality-restricted', () => {
        const { dispatcher } = setupCaster(0, 100);
        // 虎符來源不進入精力閘門；後續執行會因缺少戰鬥環境而拋錯，因此只確認閘門本身放行
        const check = (dispatcher as unknown as { checkVitalityGate: (r: unknown) => { allowed: boolean } }).checkVitalityGate({
            sourceType: SkillSourceType.TigerTally,
            ownerUid: 'player-unit',
        });
        assert.isTrue(check.allowed);
    });

    suite.test('撤退失敗鎖回合：被鎖定的部隊發動戰法被擋下，不扣資源，回傳 action-blocked', () => {
        const state = new BattleState();
        state.units.set('troop-unit', { id: 'troop-unit', faction: Faction.Player, lane: 0, depth: 0, type: 'infantry', currentHp: 10 } as never);
        const dispatcher = new BattleSkillDispatcher({ state, isUnitActionBlocked: (id: string) => id === 'troop-unit' } as never, {} as never);
        const result = dispatcher.executeBattleSkillRequest({
            sourceType: SkillSourceType.SeedTactic,
            ownerUid: 'troop-unit',
            battleSkillId: 'zhou-yu-inferno',
            targetMode: 'tile',
            timing: 'active-cast',
        } as never);
        assert.equals(false, result.applied);
        assert.equals('action-blocked', result.blockedReason ?? '');
        assert.equals('本回合撤退失敗，無法行動', result.battleLogLines[0] ?? '');
    });

    suite.test('撤退鎖回合不影響其他單位：未鎖定的部隊仍照精力閘門判定', () => {
        const { state } = setupCaster(5, 100);
        const dispatcher = new BattleSkillDispatcher({ state, isUnitActionBlocked: (id: string) => id === 'other-unit' } as never, {} as never);
        const result = dispatcher.executeBattleSkillRequest({
            sourceType: SkillSourceType.SeedTactic,
            ownerUid: 'player-unit',
            battleSkillId: 'zhou-yu-inferno',
            targetMode: 'tile',
            timing: 'active-cast',
        } as never);
        assert.equals('vitality-restricted', result.blockedReason ?? '');
    });

    return suite;
}
