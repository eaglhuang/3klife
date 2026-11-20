// PROG-2-9410：放招演出（蓄力、中央招式名橫幅排隊／合併）的純邏輯測試
import {
    SKILL_CAST_TIMING,
    SkillBannerQueue,
    planSkillCast,
    sampleChargePose,
    skillBannerText,
} from '../assets/scripts/battle/shared/SkillCastPresentation';
import { TestSuite, assert } from './TestRunner';

export function createSkillCastPresentationSuite(): TestSuite {
    const suite = new TestSuite('SkillCastPresentation');
    const T = SKILL_CAST_TIMING;

    suite.test('時間符合 11/18 裁決：蓄力 0.4 秒、橫幅總長 0.8～1 秒', () => {
        assert.isTrue(T.chargeSec === 0.4);
        const total = T.bannerFadeInSec + T.bannerHoldSec + T.bannerFadeOutSec;
        assert.isTrue(total >= 0.8 && total <= 1, `${total}`);
    });

    suite.test('有漫畫分鏡的奧義不蓄力也不出橫幅；SSR／UR 戰法只蓄力；其他都蓄力加橫幅', () => {
        const cut = planSkillCast({ ultCutin: true, tacticFlash: false });
        assert.isTrue(cut.chargeSec === 0 && !cut.banner);
        const flash = planSkillCast({ ultCutin: false, tacticFlash: true });
        assert.isTrue(flash.chargeSec === T.chargeSec && !flash.banner);
        const plain = planSkillCast({ ultCutin: false, tacticFlash: false });
        assert.isTrue(plain.chargeSec === T.chargeSec && plain.banner);
    });

    suite.test('橫幅文字：施放者＋招式名；合併用「・」；超過上限寫「等 N 招」；沒名字時只寫招式', () => {
        assert.isTrue(skillBannerText({ side: 'player', caster: '孫策', names: ['疾風突進'] }) === '孫策　疾風突進');
        assert.isTrue(skillBannerText({ side: 'player', caster: '孫策', names: ['甲', '乙', '丙'] }) === '孫策　甲・乙・丙');
        assert.isTrue(skillBannerText({ side: 'player', caster: '孫策', names: ['甲', '乙', '丙', '丁'] }) === '孫策　甲・乙 等 4 招');
        assert.isTrue(skillBannerText({ side: 'enemy', caster: '', names: ['火攻', ''] }) === '火攻');
    });

    suite.test('同一方在合併時間窗內連放：併進目前這條', () => {
        const q = new SkillBannerQueue();
        assert.isTrue(q.push({ side: 'player', caster: '孫策', names: ['甲'] }, 10) === 'show');
        assert.isTrue(q.push({ side: 'player', caster: '孫策', names: ['乙'] }, 10 + T.mergeWindowSec - 0.01) === 'merged');
        assert.isTrue(q.showing?.names.join() === '甲,乙' && q.pending === 0);
    });

    suite.test('超過時間窗或不同方：排隊，播完依序出下一條', () => {
        const q = new SkillBannerQueue();
        q.push({ side: 'player', caster: 'A', names: ['甲'] }, 0);
        assert.isTrue(q.push({ side: 'enemy', caster: 'B', names: ['乙'] }, 0.1) === 'queued');
        assert.isTrue(q.push({ side: 'player', caster: 'A', names: ['丙'] }, 0.2) === 'queued');
        assert.isTrue(q.pending === 2);
        assert.isTrue(q.finish(1)?.names.join() === '乙');
        assert.isTrue(q.finish(2)?.names.join() === '丙');
        assert.isTrue(q.finish(3) === null && q.showing === null);
    });

    suite.test('排隊滿了就合併，不讓橫幅一直拖下去', () => {
        const q = new SkillBannerQueue(0.5, 2);
        q.push({ side: 'player', caster: 'A', names: ['1'] }, 0);
        q.push({ side: 'enemy', caster: 'B', names: ['2'] }, 0.1);
        q.push({ side: 'player', caster: 'A', names: ['3'] }, 0.2);
        q.push({ side: 'enemy', caster: 'B', names: ['4'] }, 0.3);
        q.push({ side: 'player', caster: 'A', names: ['5'] }, 0.4);
        assert.isTrue(q.pending === 2);
        assert.isTrue(q.finish(1)?.names.join() === '2,4');
        assert.isTrue(q.finish(2)?.names.join() === '3,5');
    });

    suite.test('呼叫端傳進來的物件不會被改到', () => {
        const q = new SkillBannerQueue();
        const first = { side: 'player' as const, caster: 'A', names: ['甲'] };
        q.push(first, 0);
        q.push({ side: 'player', caster: 'A', names: ['乙'] }, 0.1);
        assert.isTrue(first.names.length === 1);
    });

    suite.test('蓄力姿勢：慢慢膨脹，放招瞬間與範圍外回到原狀', () => {
        assert.isTrue(sampleChargePose(0, 0.4).scale === 1);
        const early = sampleChargePose(0.1, 0.4).scale, late = sampleChargePose(0.35, 0.4).scale;
        assert.isTrue(early > 1 && late > early && late <= 1.07, `${early} ${late}`);
        const done = sampleChargePose(0.4, 0.4);
        assert.isTrue(done.scale === 1 && done.shakeX === 0);
        assert.isTrue(sampleChargePose(-1, 0.4).scale === 1 && sampleChargePose(0.1, 0).scale === 1 && sampleChargePose(NaN, 0.4).scale === 1);
        assert.isTrue(Math.abs(sampleChargePose(0.3, 0.4).shakeX) <= 2);
    });

    return suite;
}
