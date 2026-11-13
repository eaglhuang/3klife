// @spec-source → Issue #2086；PROG-2-2234
import { TestSuite, assert } from './TestRunner';
import { battleCoachPlacement, battleCoachIsObstacle, coachRectsOverlap } from '../assets/scripts/ui/core/BattleCoachPlacement';
import { OPERATION_GUIDE } from '../assets/scripts/core/systems/FirstBattleOperationGuide';
import { strategistHudLogLine } from '../assets/scripts/core/systems/StrategistHud';
const { BattleHUDComposite } = require('../assets/scripts/ui/components/BattleHUDComposite');
const fs = require('fs'); const path = require('path');
export function createBattleHudIssue2086Suite(): TestSuite {
    const suite = new TestSuite('BattleHudIssue2086');
    suite.test('展開教學只用下半部，生命加成與單位標籤在任何高度都避讓', () => {
        const buff = { x: 760, y: 610, width: 225, height: 40 };
        assert.isTrue(battleCoachIsObstacle('TileBuff_2,4', buff, 1920, 1080, true));
        assert.isFalse(battleCoachIsObstacle('OffscreenLabel', { ...buff, y: 1200 }, 1920, 1080, true));
        const r = battleCoachPlacement(1920, 1080, [buff]);
        assert.isTrue(!!r); assert.isTrue(r!.y >= 594); assert.isFalse(coachRectsOverlap(r!, buff));
    });
    suite.test('卡牌數字說明與 atk hp cost 實際欄位對應，不誤稱蓄力', () => {
        const text = OPERATION_GUIDE.deploy.message;
        assert.contains(text, '「糧15」是糧草費用'); assert.contains(text, '「攻40／命100」是攻擊／生命');
        assert.contains(text, '不是蓄力'); assert.contains(text, 'SP');
        const src = fs.readFileSync(path.join(__dirname, '../assets/scripts/ui/components/TigerTallyComposite.ts'), 'utf8');
        // #2107-5：卡面常駐前綴
        assert.contains(src, "TALLY_STAT_PREFIX = { atk: '攻', hp: '命', cost: '糧' }"); assert.contains(src, '${TALLY_STAT_PREFIX.atk}${data.atk}'); assert.contains(src, '${TALLY_STAT_PREFIX.cost}${data.cost}');
    });
    suite.test('SP 建構前到達的 80 上限保留，未取得上限不顯示 0/0', () => {
        const hud: any = { _spLabel: null, _chargeLabel: null, _spReadyLabel: null, _spFill: null };
        const render = BattleHUDComposite.prototype['_renderSp']; render.call(hud, 0, 80);
        hud._spLabel = { string: '' }; hud._chargeLabel = { string: '' }; hud._spReadyLabel = { string: '' };
        render.call(hud, hud._spState.sp, hud._spState.maxSp);
        assert.equals('SP 0/80', hud._spLabel.string);
        render.call(hud, 0, 0); assert.equals('SP 準備中', hud._spLabel.string);
        assert.isFalse(hud._chargeLabel.string.includes('0/0'));
    });
    suite.test('兵種名留足字高並縮字；軍師欄位換行不留下孤立分隔符', () => {
        const layout = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/resources/ui-spec/layouts/tiger-tally-main.json'), 'utf8'));
        const skin = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/resources/ui-spec/skins/tiger-tally-default.json'), 'utf8'));
        const names: any[] = []; const walk = (n: any) => { if (/^UnitName\d+$/.test(n.name ?? '')) names.push(n); (n.children ?? []).forEach(walk); }; walk(layout.root);
        assert.equals(4, names.length); assert.isTrue(names.every(n => n.height >= 40));
        assert.equals('SHRINK', skin.slots['tally.label.name'].overflow);
        const line = strategistHudLogLine({ hazardsThisTurn: ['火場'], interactiveObjects: [], salvage: { stone: 0, wood: 0, supply: 0, intel: 0, weaponMaterial: 0, instructorExp: 0 }, missingCounters: [], environmentBonus: '平原 +10%、水域 -25%' });
        assert.contains(line, '\n危害 火場'); assert.isFalse(line.includes('｜')); assert.isFalse(line.includes('|'));
    });
    suite.test('撤退結算說撤退、返回大廳換場不因 guide 節點已失效而卡死（#2107-1／2）', () => {
        const read = (p: string) => fs.readFileSync(path.join(__dirname, '../assets/scripts/', p), 'utf8');
        assert.contains(read('battle/controllers/BattleController.ts'), "result: 'enemy-win', retreated: true");
        assert.contains(read('battle/views/BattleUIBridge.ts'), 'data.retreated === true');
        const popup = read('ui/components/ResultPopupComposite.ts');
        assert.contains(popup, 'retreat ? RETREAT_DESCRIPTION');
        assert.contains(popup, "title: retreat ? '撤退'");
        const panel = read('ui/components/BattleScenePanel.ts');
        assert.contains(panel, 'if (guideNode?.isValid) guideNode.destroy();');
        assert.equals(false, panel.includes('this._guideHost?.node.destroy()'));
    });
    return suite;
}
