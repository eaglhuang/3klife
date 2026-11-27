// @spec-source → PROG-2-10137 戰報重點整理
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { BattleHighlightTracker, buildBattleHighlights, outcomeReason } from '../assets/scripts/core/systems/BattleHighlights';

const ROOT = path.resolve(__dirname, '..');
const tr = (_k: string, fb: string, ...a: (string | number)[]): string => fb.replace(/\{(\d+)\}/g, (_m, i) => String(a[Number(i)]));
const perf = (dealt: number, taken: number, kills = 0) => ({ kills, damageDealt: dealt, damageTaken: taken, healingDone: 0 });

export function createBattleHighlightsSuite(): TestSuite {
    const suite = new TestSuite('BattleHighlights (戰報重點整理 PROG-2-10137)');

    suite.test('首功：累計各攻擊單位傷害，取最高', () => {
        const t = new BattleHighlightTracker();
        t.observePlayerDamage(30, 'u1', '虎豹騎');
        t.observePlayerDamage(20, 'u2', '弓兵');
        t.observePlayerDamage(25, 'u2', '弓兵');
        assert.equals('弓兵', t.topUnit()?.name);
        assert.equals(45, t.topUnit()?.damage);
    });

    suite.test('最強技能：無攻擊者傷害暫存，技能事件到來時歸戶；之後的新傷害不混入', () => {
        const t = new BattleHighlightTracker();
        t.observePlayerDamage(80, null, null);
        t.observePlayerSkill('火計');
        t.observePlayerDamage(50, null, null);
        t.observePlayerSkill('連弩');
        t.observePlayerSkill('空放');
        assert.equals('火計', t.topSkill()?.name);
        assert.equals(80, t.topSkill()?.damage);
        t.reset();
        assert.isTrue(t.topSkill() === null && t.topUnit() === null);
    });

    suite.test('三列重點：首功、最強技能、勝敗原因；沒資料就空陣列（維持原明細）', () => {
        const t = new BattleHighlightTracker();
        t.observePlayerDamage(40, 'u1', '虎豹騎');
        t.observePlayerDamage(90, null, null);
        t.observePlayerSkill('火計');
        const rows = buildBattleHighlights(t, perf(130, 20, 3), 'victory', false, tr);
        assert.equals(3, rows.length);
        assert.equals('勝因', rows[2].key);
        assert.isTrue(rows[0].value.includes('虎豹騎') && rows[0].value.includes('40'));
        assert.isTrue(rows[1].value.includes('火計') && rows[1].value.includes('90'));
        assert.isTrue(rows[2].value.includes('130') && rows[2].value.includes('20'));
        assert.equals(0, buildBattleHighlights(new BattleHighlightTracker(), perf(0, 0, 0), 'victory', false, tr).length);
        const none = buildBattleHighlights(new BattleHighlightTracker(), perf(10, 5), 'defeat', false, tr);
        assert.equals('敗因', none[2].key);
    });

    suite.test('勝敗原因分支：撤退、平手、勝（壓制／逆轉）、敗（接近／被壓制）', () => {
        assert.equals('ui.result.hl.reason.retreat', outcomeReason('defeat', perf(1, 9), true).key);
        assert.equals('ui.result.hl.reason.draw', outcomeReason('stalemate', perf(5, 5), false).key);
        assert.equals('ui.result.hl.reason.win_ahead', outcomeReason('victory', perf(9, 3), false).key);
        assert.equals('ui.result.hl.reason.win_close', outcomeReason('victory', perf(3, 9), false).key);
        assert.equals('ui.result.hl.reason.lose_close', outcomeReason('defeat', perf(9, 3), false).key);
        assert.equals('ui.result.hl.reason.lose_behind', outcomeReason('defeat', perf(3, 9), false).key);
    });

    suite.test('四語系字串齊全、版面有展開鈕、結算窗與戰場橋接已接線', () => {
        const keys = ['merit', 'merit.value', 'merit.none', 'skill', 'skill.value', 'skill.none', 'reason.win', 'reason.lose', 'reason.even',
            'reason.retreat', 'reason.draw', 'reason.win_ahead', 'reason.win_close', 'reason.lose_close', 'reason.lose_behind', 'expand', 'collapse'];
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const table = JSON.parse(fs.readFileSync(path.join(ROOT, `assets/resources/i18n/${lang}.json`), 'utf8')) as Record<string, string>;
            for (const k of keys) assert.isTrue(typeof table[`ui.result.hl.${k}`] === 'string' && table[`ui.result.hl.${k}`].length > 0, `${lang} ${k}`);
        }
        const layout = fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/layouts/result-popup-main.json'), 'utf8');
        assert.isTrue(layout.includes('BtnToggleDetail'));
        const popup = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/components/ResultPopupComposite.ts'), 'utf8');
        assert.isTrue(popup.includes('setHighlights') && popup.includes("'BtnToggleDetail'"));
        const bridge = fs.readFileSync(path.join(ROOT, 'assets/scripts/battle/views/BattleUIBridge.ts'), 'utf8');
        assert.isTrue(bridge.includes('buildBattleHighlights') && bridge.includes('observePlayerSkill'));
    });

    return suite;
}
