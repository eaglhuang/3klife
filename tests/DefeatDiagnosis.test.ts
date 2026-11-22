/**
 * DefeatDiagnosis.test.ts — 戰敗軍師敗因診斷與下一步建議（PROG-2-9712）
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import {
    consumeBattleTip,
    defeatAdviceLabel,
    defeatDiagnosisLines,
    diagnoseDefeat,
    listDefeatReasons,
    queueBattleTip,
    type DefeatStats,
} from '../assets/scripts/core/systems/DefeatDiagnosis';
import { buildResultSections, classifyResultLine } from '../assets/scripts/shared/ResultDetailSections';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

/** 打得還不錯的一場：每回合派滿、主將有出陣、奧義有放、雙方實力相當 */
function goodGame(over: Partial<DefeatStats> = {}): DefeatStats {
    return {
        playerTurns: 8, playerDeploys: 24, deployLimitPerTurn: 3, generalSortied: true,
        ultimatesUsed: 2, spFullIdleTurns: 0, enemyDeploys: 24,
        playerGeneralStats: 240, enemyGeneralStats: 240, ...over,
    };
}

export function createDefeatDiagnosisSuite(): TestSuite {
    const suite = new TestSuite('DefeatDiagnosis (戰敗敗因診斷 PROG-2-9712)');

    suite.test('舊委任 AI 的典型敗局：主將沒出陣排第一、兵派太少排第二，只取 2 條', () => {
        const reasons = diagnoseDefeat(goodGame({ generalSortied: false, playerDeploys: 8, spFullIdleTurns: 4 }));
        assert.equals(2, reasons.length);
        assert.equals('no-sortie', reasons[0].id);
        assert.equals('under-deploy', reasons[1].id);
        assert.isTrue(reasons[1].text.includes('每回合能派 3 隊') && reasons[1].text.includes('平均只派了 1 隊'), reasons[1].text);
        assert.equals('replay', reasons[0].advice);
        assert.isTrue(listDefeatReasons(goodGame({ generalSortied: false, playerDeploys: 8, spFullIdleTurns: 4 })).some((r) => r.id === 'idle-ultimate'));
    });

    suite.test('主將出陣後倒下：說主將衝太前，不說沒出陣', () => {
        const reasons = diagnoseDefeat(goodGame({ cause: 'general' }));
        assert.equals('general-fell', reasons[0].id);
        assert.isFalse(reasons.some((r) => r.id === 'no-sortie'));
    });

    suite.test('打法沒問題但敵將明顯較強：建議回去整備', () => {
        const reasons = diagnoseDefeat(goodGame({ enemyGeneralStats: 400 }));
        assert.equals('outmatched', reasons[0].id);
        assert.equals('prepare', reasons[0].advice);
        assert.equals('回去整備', defeatAdviceLabel(reasons[0].advice));
        assert.isTrue(reasons[0].text.includes('1.7 倍'), reasons[0].text);
    });

    suite.test('兵派太少時敵軍兵多不算實力差距（是自己派太少）', () => {
        const reasons = listDefeatReasons(goodGame({ playerDeploys: 6, enemyDeploys: 24 }));
        assert.isFalse(reasons.some((r) => r.id === 'outmatched'));
    });

    suite.test('時限到的敗局會點出打太保守；沒有明顯敗因時給換路建議', () => {
        assert.isTrue(diagnoseDefeat(goodGame({ cause: 'time-up' })).some((r) => r.id === 'time-up'));
        const fallback = diagnoseDefeat(goodGame());
        assert.equals(1, fallback.length);
        assert.equals('close-fight', fallback[0].id);
        assert.equals('照建議再戰', defeatAdviceLabel(fallback[0].advice));
    });

    suite.test('診斷行歸到結算「戰況」區，欄名是軍師診斷', () => {
        const lines = defeatDiagnosisLines(diagnoseDefeat(goodGame({ generalSortied: false })));
        assert.equals('battle', classifyResultLine(lines[0]));
        const sections = buildResultSections(lines);
        assert.equals('battle', sections[0].id);
        assert.equals('軍師診斷', sections[0].rows[0].key);
    });

    suite.test('照建議再戰的提醒只取用一次；空字串不排隊', () => {
        queueBattleTip('軍師提醒：記得讓主將出陣');
        assert.equals('軍師提醒：記得讓主將出陣', consumeBattleTip());
        assert.equals(null, consumeBattleTip());
        queueBattleTip('');
        assert.equals(null, consumeBattleTip());
    });

    suite.test('接線：戰敗結算放診斷與建議鈕；撤退與極速決戰不診斷；重打開場顯示提醒', () => {
        const bridge = read('assets/scripts/battle/views/BattleUIBridge.ts');
        assert.isTrue(bridge.includes('details.unshift(...defeatDiagnosisLines(diagnosis));'));
        assert.isTrue(bridge.includes("c.resultPopup?.setDefeatAdvice?.(this._defeatAdvice ? defeatAdviceLabel(this._defeatAdvice.advice) : null);"));
        assert.isTrue(bridge.includes("if (data.result !== 'enemy-win' || data.cause === 'auto') return [];"));
        assert.isTrue(bridge.includes("if (data.retreated === true && data.cause !== 'time-up') return [];"));
        assert.isTrue(bridge.includes("bindNodeEvent(c.resultPopup?.node, 'advice'"));
        const flow = read('assets/scripts/battle/views/BattleSceneFlow.ts');
        assert.isTrue(flow.includes('const tip = consumeBattleTip();'));
        const layout = JSON.parse(read('assets/resources/ui-spec/layouts/result-popup-main.json'));
        const json = JSON.stringify(layout);
        assert.isTrue(json.includes('"name":"BtnAdvice"'));
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            assert.isDefined(JSON.parse(read(`assets/resources/i18n/${lang}.json`))['ui.result.advice'], lang);
        }
    });

    return suite;
}
