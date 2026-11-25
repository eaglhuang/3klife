/**
 * 戰法施放條件沒達成（火計沒起風）時要講出原因（PROG-2-9989）
 *
 * 手打補驗發現：沒起風時計謀鈕看起來可按，點下去只跳「戰法發動失敗」。
 * 根因是 BattleScene 自己的視圖刷新只看計謀點，把 UI Bridge 判定的「待風」蓋回；
 * 這裡鎖兩件事：選目標流程在條件沒達成時先 Toast 條件文字且不施放；起風後照常施放。
 * Unity 對照：EditMode Test，不開 Scene，用假的視圖回調收 Toast。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { BattleSkillTargetingFlow } from '../assets/scripts/battle/views/BattleSkillTargetingFlow';
import { Faction, Weather } from '../assets/scripts/core/config/Constants';
import { GeneralUnit, type GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';

const FIRE = { id: 'tactic-fire-scheme', battleSkillId: 'zhou-yu-inferno', tcond: [{ kind: 'weather', allowed: ['WINDY'] }] };

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 100, str: 80, int: 80, lea: 60,
        skillId: 'zhou-yu-inferno', battlePrimarySkillId: 'zhou-yu-inferno',
        tacticSlots: [{ slotId: 'slot-1', tacticId: FIRE.id, source: 'inborn' }],
    } as unknown as GeneralConfig);
}

function setup(weather: Weather): { ctrl: BattleController; toasts: string[]; flow: BattleSkillTargetingFlow } {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
    (ctrl as unknown as { tacticDefinitionMap: Map<string, unknown> }).tacticDefinitionMap = new Map([[FIRE.id, FIRE]]);
    ctrl.tutorialBattle = false;
    ctrl.configureSortie({ commandCapacity: 9000, cityTroops: 9000, stageSortieCap: 9000, food: 2000 });
    ctrl.state.playerGeneral!.currentSp = ctrl.state.playerGeneral!.maxSp;
    // 計謀點給滿，免得先被「計謀點不足」擋下，測不到條件分支
    const holder = ctrl as unknown as { sortie: { tacticCurrent: number; tacticMax: number } };
    holder.sortie = { ...holder.sortie, tacticCurrent: holder.sortie.tacticMax };
    ctrl.state.weather = weather;
    const toasts: string[] = [];
    const flow = new BattleSkillTargetingFlow({
        getCtrl: () => ctrl,
        clearBoardSkillPreview: () => undefined,
        setBoardSkillPreviewCells: () => undefined,
        showToast: (msg) => { toasts.push(msg); },
        appendBattleLog: () => undefined,
        raycastBoardCell: () => null,
        refreshBattleViews: () => undefined,
    });
    return { ctrl, toasts, flow };
}

export function createTacticConditionUnmetToastSuite(): TestSuite {
    const suite = new TestSuite('TacticConditionUnmetToast (戰法條件沒達成要講原因 PROG-2-9989)');

    suite.test('沒起風：點計謀先 Toast 條件文字，不施放、不扣計謀點', () => {
        const { ctrl, toasts, flow } = setup(Weather.Clear);
        const before = ctrl.state.playerGeneral!.currentSp;
        flow.beginPlayerSkillFlow('zhou-yu-inferno', SkillSourceType.SeedTactic, '戰法');
        assert.equals(1, toasts.length);
        // 單元測試不載語系檔，i18n.t 回傳鍵名；鍵名對上＝走的是「條件未達成」分支而不是「發動失敗」
        assert.isTrue(toasts[0].includes('ui.battle.skill.condition_unmet'), toasts[0]);
        assert.equals(before, ctrl.state.playerGeneral!.currentSp);
    });

    suite.test('起風了：不會被條件提示擋下（沒有「條件未達成」Toast）', () => {
        const { toasts, flow } = setup(Weather.Windy);
        flow.beginPlayerSkillFlow('zhou-yu-inferno', SkillSourceType.SeedTactic, '戰法');
        assert.isFalse(toasts.some((text) => text.includes('條件未達成')), toasts.join('|'));
    });

    suite.test('四個語系都有條件未達成提示，且保留兩個參數位置', () => {
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const file = path.join(__dirname, '..', 'assets', 'resources', 'i18n', `${locale}.json`);
            const text = JSON.parse(fs.readFileSync(file, 'utf8'))['ui.battle.skill.condition_unmet'] as string;
            assert.isTrue(typeof text === 'string' && text.includes('{0}') && text.includes('{1}'), locale);
        }
    });

    return suite;
}
