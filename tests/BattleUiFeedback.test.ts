/**
 * BattleUiFeedback — 戰場 UI 演出 B2（PROG-2-9731）
 *
 * 覆蓋：調校表 JSON 與內建預設一致且缺值退預設、名牌戰鬥淡出時間線、狀態圖示層數／回合角標、
 * 治療三步嚴格依序、毒箭上身事件與樣式、燃燒飄字層數、哪些佇列任務會讓名牌淡出。
 *
 * Unity 對照：像測一份調校 ScriptableObject 與純規則 Presenter。
 */
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import {
    DEFAULT_BATTLE_UI_FEEDBACK, NameplateCombatFade, isPlateFadeTask, parseBattleUiFeedback, planHealSteps,
    statusBadgeTexts, statusFloatWithStacks,
} from '../assets/scripts/battle/shared/BattleUiFeedback';
import { computeUnitStatusIcons, emptyStatusContext } from '../assets/scripts/battle/shared/UnitStatusIcons';
import { statusEffectFloatText, POISON_STATUS_ID } from '../assets/scripts/battle/shared/StatusEffectLabel';
import { statusMakesTargetFlinch, statusPolarityOf } from '../assets/scripts/battle/shared/StatusApplyFeedback';
import { FLOAT_TEXT_STYLES, overrideFloatTextStyle } from '../assets/scripts/core/systems/FloatTextStyle';

const unit = { attackBonus: 0, maxHpBonus: 0, shield: 0, morale: 0, moraleTurns: 0 };

export function createBattleUiFeedbackSuite(): TestSuite {
    const suite = new TestSuite('BattleUiFeedback (戰場 UI 演出 B2 PROG-2-9731)');

    suite.test('battle-ui-feedback.json 解析後與內建預設完全一致', () => {
        const file = path.join(__dirname, '..', 'assets', 'resources', 'data', 'battle-ui-feedback.json');
        const json = JSON.parse(fs.readFileSync(file, 'utf8'));
        assert.equals(JSON.stringify(DEFAULT_BATTLE_UI_FEEDBACK), JSON.stringify(parseBattleUiFeedback(json)));
    });

    suite.test('解析：缺欄位、型別錯、超出範圍一律退預設或夾到範圍', () => {
        const cfg = parseBattleUiFeedback({ nameplate: { combatAlpha: 9, fadeOutSec: 'x' }, heal: { floatDelaySec: -5 }, poisonHit: { flashFillColor: [1, 2] } });
        assert.equals(1, cfg.nameplate.combatAlpha);
        assert.equals(DEFAULT_BATTLE_UI_FEEDBACK.nameplate.fadeOutSec, cfg.nameplate.fadeOutSec);
        assert.equals(0, cfg.heal.floatDelaySec);
        assert.equals(DEFAULT_BATTLE_UI_FEEDBACK.poisonHit.flashFillColor[0], cfg.poisonHit.flashFillColor[0]);
        assert.equals(JSON.stringify(DEFAULT_BATTLE_UI_FEEDBACK), JSON.stringify(parseBattleUiFeedback(null)));
    });

    suite.test('名牌戰鬥淡出：開始後淡到 combatAlpha、結束後先停留再淡回 1，連續打擊之間不閃', () => {
        const cfg = DEFAULT_BATTLE_UI_FEEDBACK.nameplate;
        const fade = new NameplateCombatFade(() => cfg);
        assert.equals(1, fade.alpha);
        fade.begin();
        let t = 0;
        let a = 1;
        while (t < cfg.fadeOutSec + 0.05) { a = fade.step(0.016); t += 0.016; }
        assert.isTrue(Math.abs(a - cfg.combatAlpha) < 1e-9, `淡出後應為 ${cfg.combatAlpha}，實際 ${a}`);
        // 演出結束但還在停留時間內：維持淡出
        fade.end();
        const held = fade.step(cfg.restoreDelaySec * 0.5);
        assert.isTrue(Math.abs(held - cfg.combatAlpha) < 1e-9, '停留期間不回升');
        // 停留期間下一個打擊開始：不回升
        fade.begin();
        assert.isTrue(fade.step(0.5) <= cfg.combatAlpha + 1e-9);
        fade.end();
        // 停留結束後淡回
        fade.step(cfg.restoreDelaySec + 0.001);
        let back = 0;
        for (let i = 0; i < 100 && back < 1; i++) back = fade.step(0.016);
        assert.equals(1, back);
        assert.isFalse(fade.isActive);
    });

    suite.test('名牌淡出：releaseNow 立刻放掉計數並開始淡回（治療要讓玩家看血條）', () => {
        const cfg = DEFAULT_BATTLE_UI_FEEDBACK.nameplate;
        const fade = new NameplateCombatFade(() => cfg);
        fade.begin(); fade.begin();
        for (let i = 0; i < 20; i++) fade.step(0.016);
        fade.releaseNow();
        const next = fade.step(0.05);
        assert.isTrue(next > cfg.combatAlpha, '應開始回升');
    });

    suite.test('哪些佇列任務讓名牌淡出：攻擊受擊閃避擋下是；治療、狀態、施放不是', () => {
        for (const l of ['unit-damage:a', 'unit-miss:a', 'unit-blocked:a', 'general-damage:0', 'general-dodge:1']) assert.isTrue(isPlateFadeTask(l), l);
        for (const l of ['unit-heal:a', 'status-apply:a:burn', 'skill-cast:x', 'ult-cutin:g']) assert.isFalse(isPlateFadeTask(l), l);
    });

    suite.test('狀態圖示角標：層數 ≥2 才顯示 ×N，回合數照顯示，永久不顯示', () => {
        assert.equals('', statusBadgeTexts(1, 2).stack);
        assert.equals('×2', statusBadgeTexts(2, 2).stack);
        assert.equals('×3', statusBadgeTexts(3, null).stack);
        assert.equals('2', statusBadgeTexts(null, 2).turns);
        assert.equals('', statusBadgeTexts(null, null).turns);
        assert.equals('', statusBadgeTexts(null, 0).turns);
    });

    suite.test('狀態圖示：燃燒帶層數與回合，簽名隨層數改變（才會重畫角標）', () => {
        const ctx1 = { ...emptyStatusContext(), burn: { remainingTurns: 2, stacks: 1 } };
        const ctx3 = { ...emptyStatusContext(), burn: { remainingTurns: 2, stacks: 3 } };
        const l1 = computeUnitStatusIcons(unit, ctx1);
        const l3 = computeUnitStatusIcons(unit, ctx3);
        assert.equals(1, l1.icons[0].stacks);
        assert.equals(3, l3.icons[0].stacks);
        assert.equals(2, l3.icons[0].turns);
        assert.isTrue(l1.signature !== l3.signature, '層數不同簽名要不同');
        const poison = computeUnitStatusIcons(unit, { ...emptyStatusContext(), dot: { remainingTurns: 3 } });
        assert.equals(null, poison.icons[0].stacks);
        assert.equals(3, poison.icons[0].turns);
    });

    suite.test('燃燒飄字：第 2 層起加 ×N，第 1 層與無層數維持原字', () => {
        assert.equals('燃燒', statusFloatWithStacks('燃燒', 1));
        assert.equals('燃燒', statusFloatWithStacks('燃燒', undefined));
        assert.equals('燃燒 ×2', statusFloatWithStacks('燃燒', 2));
        assert.equals('燃燒 ×3', statusFloatWithStacks('燃燒', 3));
        assert.equals('', statusFloatWithStacks('', 3));
    });

    suite.test('毒箭上身：狀態代號有中文名、算減益會讓目標縮一下；毒字樣式是紫綠並可被資料檔覆蓋', () => {
        assert.equals('中毒', statusEffectFloatText(POISON_STATUS_ID));
        assert.equals('debuff', statusPolarityOf(POISON_STATUS_ID));
        assert.isTrue(statusMakesTargetFlinch(statusPolarityOf(POISON_STATUS_ID)));
        const style = FLOAT_TEXT_STYLES.poison;
        assert.isTrue(style.color.g > style.color.r && style.color.g > style.color.b, '毒字主色偏綠');
        assert.isTrue(style.outlineColor.b > style.outlineColor.g, '描邊偏紫');
        const backup = { ...style };
        overrideFloatTextStyle('poison', { fontSize: 99 });
        assert.equals(99, FLOAT_TEXT_STYLES.poison.fontSize);
        overrideFloatTextStyle('poison', { fontSize: backup.fontSize });
        assert.equals(DEFAULT_BATTLE_UI_FEEDBACK.poisonHit.float.fontSize, FLOAT_TEXT_STYLES.poison.fontSize);
    });

    suite.test('治療三步：治療光 → 綠字 → 血條嚴格遞增；設定亂填也不會同一刻', () => {
        const plan = planHealSteps(DEFAULT_BATTLE_UI_FEEDBACK.heal);
        assert.equals(0, plan.lightAtSec);
        assert.isTrue(plan.floatAtSec > plan.lightAtSec);
        assert.isTrue(plan.hpBarAtSec > plan.floatAtSec);
        const bad = planHealSteps({ ...DEFAULT_BATTLE_UI_FEEDBACK.heal, floatDelaySec: 0, hpBarDelaySec: 0 });
        assert.isTrue(bad.floatAtSec > bad.lightAtSec && bad.hpBarAtSec > bad.floatAtSec);
    });

    return suite;
}
