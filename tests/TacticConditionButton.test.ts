/**
 * 計謀鈕在戰法條件沒達成時反灰並寫出條件（PROG-2-9333）
 *
 * 以前火攻沒起風時按鈕照樣亮著，按下去才跳「戰法條件未達成」；現在按鈕先變灰並寫「待風」。
 * Unity 對照：Button.interactable 由 CanCast 決定，並把不能施放的原因寫在按鈕的副標上。
 */
import { assert, TestSuite } from './TestRunner';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { Faction, Weather } from '../assets/scripts/core/config/Constants';
import { GeneralUnit, type GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { describeTacticCondition } from '../assets/scripts/core/systems/TacticCondition';
import { buildTacticAvailability } from '../assets/scripts/ui/core/TacticAvailabilityPresenter';

const FIRE = { id: 'tactic-fire-scheme', battleSkillId: 'zhou-yu-inferno', tcond: [{ kind: 'weather', allowed: ['WINDY'] }] };
const READY = { weather: Weather.Clear, tacticPointEnabled: true, generalCanUseSkill: true };

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 80, int: 80, lea: 60,
        tacticSlots: [{ slotId: 'slot-1', tacticId: FIRE.id, source: 'inborn' }],
    } as unknown as GeneralConfig);
}

function battle(tutorial: boolean, weather: Weather): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
    (ctrl as unknown as { tacticDefinitionMap: Map<string, unknown> }).tacticDefinitionMap = new Map([[FIRE.id, FIRE]]);
    ctrl.tutorialBattle = tutorial;
    ctrl.state.weather = weather;
    return ctrl;
}

export function createTacticConditionButtonSuite(): TestSuite {
    const suite = new TestSuite('TacticConditionButton (計謀鈕寫出沒達成的條件 PROG-2-9333)');

    suite.test('一般戰鬥沒起風：查得到沒達成的條件，文字是「需要起風／待風」', () => {
        const unmet = battle(false, Weather.Clear).getPlayerSeedTacticUnmetCondition();
        assert.isTrue(unmet !== null);
        const text = describeTacticCondition(unmet!);
        assert.equals('需要起風', text.full);
        assert.equals('待風', text.short);
    });

    suite.test('一般戰鬥起風了：沒有未達成的條件', () => {
        assert.equals(null, battle(false, Weather.Windy).getPlayerSeedTacticUnmetCondition());
    });

    suite.test('教學戰免條件：沒起風也沒有未達成的條件', () => {
        assert.equals(null, battle(true, Weather.Clear).getPlayerSeedTacticUnmetCondition());
    });

    suite.test('按鈕狀態：條件沒達成時不可用，原因與兩個字的短原因都帶出來', () => {
        const [item] = buildTacticAvailability(
            [{ id: 'zhou-yu-inferno', label: '火攻', tags: [], unmetCondition: { kind: 'weather', allowed: [Weather.Windy] } }], READY);
        assert.isFalse(item.enabled);
        assert.equals('需要起風', item.reason ?? '');
        assert.equals('待風', item.shortReason ?? '');
    });

    suite.test('天氣擋下火計時，按鈕照樣寫「待風」而不是「受限」（PROG-2-9347）', () => {
        const [item] = buildTacticAvailability(
            [{ id: 'zhou-yu-inferno', label: '火攻', tags: ['fire'], unmetCondition: { kind: 'weather', allowed: [Weather.Windy] } }],
            { ...READY, weather: Weather.Rain });
        assert.isFalse(item.enabled);
        assert.equals('天氣禁用', item.reason ?? '');
        assert.equals('待風', item.shortReason ?? '');
    });

    suite.test('原因優先序：計謀點不足排在戰法條件前面', () => {
        const [item] = buildTacticAvailability(
            [{ id: 'zhou-yu-inferno', label: '火攻', tags: [], unmetCondition: { kind: 'weather', allowed: [Weather.Windy] } }],
            { ...READY, tacticPointEnabled: false });
        assert.equals('計謀點不足', item.reason ?? '');
        assert.equals(undefined, item.shortReason);
    });

    suite.test('鄰格與兵種條件也有固定兩個字的短原因', () => {
        assert.equals('缺敵', describeTacticCondition({ kind: 'adjacentCount', side: 'enemy', min: 2 }).short);
        assert.equals('身邊要有 2 隊友軍', describeTacticCondition({ kind: 'adjacentCount', side: 'ally', min: 2 }).full);
        assert.equals('兵種', describeTacticCondition({ kind: 'troopType', allowed: [] }).short);
    });

    return suite;
}
