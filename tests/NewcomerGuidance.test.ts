import { tutorialPointerPlacement } from '../assets/scripts/ui/core/OnboardingTargetHighlight';
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { ONBOARDING_ACTIONS } from '../assets/scripts/ui/core/OnboardingFlowController';
import { scoutLoadoutHelp, SCOUT_PANEL_TEXTS } from '../assets/scripts/ui/core/ScoutPanelController';
import { FirstBattleOperationGuide } from '../assets/scripts/core/systems/FirstBattleOperationGuide';
import { BattleTutorialHint } from '../assets/scripts/battle/views/BattleTutorialHint';
import { EVENT_NAMES, Faction } from '../assets/scripts/core/config/Constants';
const read = (p: string): string => readFileSync(join(__dirname, '..', p), 'utf8');
export function createNewcomerGuidanceSuite(): TestSuite {
    const suite = new TestSuite('新手操作引導第一版 PROG-2-2212');
    suite.test('底列箭頭改置上方，兩側標籤不超出可見畫面', () => {
        const bottom = tutorialPointerPlacement(800, -480, 88, 600, -960, 960, -540);
        assert.isTrue(bottom.above); assert.equals(-148, bottom.offsetX);
        const top = tutorialPointerPlacement(-800, 480, 88, 600, -960, 960, -540);
        assert.isFalse(top.above); assert.equals(148, top.offsetX);
    });
    suite.test('三段引導保留正式文案，資源用途與實際入口另外說明', () => {
        assert.contains(ONBOARDING_ACTIONS.fate.text, '金是銅錢');
        assert.contains(ONBOARDING_ACTIONS.fate.text, '玉是玉璧');
        assert.equals('ResourceBar', ONBOARDING_ACTIONS.fate.target);
        assert.equals('btnCatSortie', ONBOARDING_ACTIONS.growth.target);
        assert.equals('btnCatGenerals', ONBOARDING_ACTIONS.legacy.target);
    });
    suite.test('鼓舞缺口有操作路徑，不虛構已擁有物品或強制鎖出征', () => {
        const help = scoutLoadoutHelp(['鼓舞']);
        assert.contains(help, '武將→主將→「技」'); assert.contains(help, '【鼓舞】');
        assert.contains(help, '未裝備不算'); assert.contains(help, '先行出征');
        assert.equals('', scoutLoadoutHelp([]));
        assert.contains(SCOUT_PANEL_TEXTS.noIntel, '尚未偵查');
        assert.contains(SCOUT_PANEL_TEXTS.noIntel, '不代表沒有風險');
    });
    suite.test('首戰依部署、推進交鋒、怒氣滿、奧義與勝利推進', () => {
        const g = new FirstBattleOperationGuide();
        assert.equals('deploy', g.step); assert.isFalse(g.advance('ultimate-used'));
        assert.isTrue(g.advance('deployed')); assert.equals('clash', g.step);
        assert.isTrue(g.advance('sp-ready')); assert.equals('ultimate', g.step);
        assert.equals('UltimateBtn', g.hint?.target);
        assert.isTrue(g.advance('ultimate-used')); assert.equals('victory', g.step);
        assert.isTrue(g.advance('won')); assert.equals(null, g.hint);
    });
    suite.test('提前勝利可收起提示，不重複發獎或卡住結算', () => {
        const g = new FirstBattleOperationGuide(); assert.isTrue(g.advance('won'));
        assert.isFalse(g.advance('deployed')); assert.isFalse(g.advance('won')); assert.equals(null, g.hint);
    });
    suite.test('只接受我方部署、滿怒及奧義事件；退場釋放訂閱', () => {
        const handlers = new Map<string, (d: any) => void>();
        const shown: (string | null)[] = [];
        const hint = new BattleTutorialHint({ on: (name, fn) => { handlers.set(name, fn); return () => { handlers.delete(name); }; } },
            () => undefined, h => { shown.push(h?.target ?? null); });
        handlers.get(EVENT_NAMES.UnitDeployed)!({ faction: Faction.Enemy }); assert.equals(1, shown.length);
        handlers.get(EVENT_NAMES.UnitDeployed)!({ faction: Faction.Player });
        handlers.get(EVENT_NAMES.GeneralSpChanged)!({ faction: Faction.Player, sp: 1, maxSp: 100 }); assert.equals('EndTurnBtn', shown[shown.length - 1]);
        handlers.get(EVENT_NAMES.GeneralSpChanged)!({ faction: Faction.Player, sp: 100, maxSp: 100 }); assert.equals('UltimateBtn', shown[shown.length - 1]);
        handlers.get(EVENT_NAMES.GeneralSkillUsed)!({ faction: Faction.Player, sourceType: 'tactic' }); assert.equals('UltimateBtn', shown[shown.length - 1]);
        handlers.get(EVENT_NAMES.GeneralSkillUsed)!({ faction: Faction.Player, sourceType: 'ultimate' }); assert.equals('EndTurnBtn', shown[shown.length - 1]);
        hint.dispose(); assert.equals(0, handlers.size); assert.equals(null, shown[shown.length - 1]);
    });
    suite.test('斬不再只是裝飾 panel，接既有奧義選單與蓄力回饋', () => {
        const src = read('assets/scripts/ui/components/ActionCommandComposite.ts');
        assert.contains(src, "event.on('hud-ultimate-requested'");
        assert.contains(src, "services().i18n.t('ui.ultimate.charging')");
        for (const file of ['battle-hud-screen.json', 'battle-hud-screen.layout.json']) {
            const d = JSON.parse(read('assets/resources/ui-spec/layouts/' + file));
            const find = (n: any): any => n.id === 'btnHudUltimate' ? n : (n.children ?? []).map(find).find(Boolean);
            assert.equals('button', find(d.root).type);
        }
    });
    suite.test('初始提示在 deployRuntime 與事件橋完成後建立，不再吞掉第一則', () => {
        const src = read('assets/scripts/battle/views/BattleScene.ts');
        assert.isTrue(src.indexOf('await ensureDeployPanelRuntime') < src.indexOf('new BattleTutorialHint'));
        assert.isTrue(src.indexOf('this.battleUIBridge?.subscribeEvents') < src.indexOf('new BattleTutorialHint'));
    });
    return suite;
}
