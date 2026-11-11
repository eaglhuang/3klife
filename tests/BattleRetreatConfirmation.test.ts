// @spec-source → Issue #2086；PROG-2-2232
import { TestSuite, assert } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { EVENT_NAMES, Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
const { Node, Button } = require('cc');
// CLI stub 未提供 Button.EventType，與 Cocos 的 click 事件字串對齊。
Button.EventType ??= { CLICK: 'click' };
const { BattleSettingsComposite } = require('../assets/scripts/ui/components/BattleSettingsComposite');
const { BattleUIBridge, createBattleSceneContext } = require('../assets/scripts/battle/views/BattleUIBridge');
const noop = () => undefined;

export function createBattleRetreatConfirmationSuite(): TestSuite {
    const suite = new TestSuite('BattleRetreatConfirmation');
    suite.test('設定按鈕第二次確認即使隔 60 秒仍送達戰敗結算，返回事件可回大廳', () => {
        services().initialize();
        const ctrl = new BattleController();
        const g = (id: string, faction: Faction) => new GeneralUnit({ id, name: id, faction, hp: 1000, str: 80, int: 80, lea: 80 });
        ctrl.initBattle(g('p', Faction.Player), g('e', Faction.Enemy));
        const ctx = createBattleSceneContext(); ctx.ctrl = ctrl;
        let results = 0, backs = 0, ended = 0;
        const resultNode = new Node('Result');
        ctx.resultPopup = { node: resultNode, showResult: (result: string) => { assert.equals('enemy-win', result); results++; } };
        const bridge = new BattleUIBridge(ctx, {});
        // 略過與撤退接線無關的美術演出與名冊獎勵；保留真實 RetreatRequested → controller → BattleEnded → showResult。
        bridge['_settleRosterBattle'] = () => [];
        bridge.refreshBattleViews = noop;
        bridge.subscribeEvents({ onEndTurn: noop, onPlayerDeployed: noop, onTactics: noop,
            onGeneralDuelRequest: noop, onReplay: noop, onBack: () => { backs++; } });
        const off = services().event.on(EVENT_NAMES.BattleEnded, () => { ended++; });
        const settings = new Node('Settings').addComponent(BattleSettingsComposite);
        const retreat = new Node('BtnRetreat');
        settings['_onAfterBuildReady']({ getNode: (name: string) => name === 'BtnRetreat' ? retreat : null });
        const now = Date.now; let clock = 1000; Date.now = () => clock;
        try {
            retreat.emit(Button.EventType.CLICK);
            assert.equals(0, ended); assert.equals(0, results);
            clock += 60000;
            retreat.emit(Button.EventType.CLICK);
            assert.equals(1, ended); assert.equals(1, results);
            assert.isFalse(ctrl.canAdvanceBattleTurn());
            resultNode.emit('back'); assert.equals(1, backs);
            retreat.emit(Button.EventType.CLICK); retreat.emit(Button.EventType.CLICK);
            assert.equals(1, ended); assert.equals(1, results);
        } finally { Date.now = now; off(); bridge.unsubscribeEvents(); }
    });
    suite.test('關閉設定就取消待確認，重新開啟不能沿用舊的確認', () => {
        const settings = new Node('Settings').addComponent(BattleSettingsComposite);
        settings['_retreatArmedAt'] = 1000;
        settings.hide();
        assert.equals(null, settings['_retreatArmedAt']);
    });
    return suite;
}
