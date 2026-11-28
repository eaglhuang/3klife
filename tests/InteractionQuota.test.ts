/**
 * InteractionQuota.test.ts — 生活層每季互動次數與市井大街開放旗標（PROG-2-10219）
 * 鎖住 QSOC-01 4.4.1：每季免費 6 次、額外購買價格 5/7/9…上限 15、每季最多買 12 次、換季重置；9.3：第一場戰鬥後才開大街。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { InteractionQuota, DEFAULT_INTERACTION_QUOTA } from '../assets/scripts/ui/life/InteractionQuota';
import { isStreetOpen, DEFAULT_STREET_OPEN_CONFIG } from '../assets/scripts/ui/life/StreetOpenGate';

export function createInteractionQuotaSuite(): TestSuite {
    const suite = new TestSuite('InteractionQuota / StreetOpenGate (PROG-2-10219)');

    suite.test('資料檔：freePerSeason=6、額外上限 12，且沒有 resetHour', () => {
        const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/life-interaction-quota.json'), 'utf8'));
        assert.equals(6, raw.freePerSeason);
        assert.equals(12, raw.extraSeasonMax);
        assert.isTrue(!('resetHour' in raw), '不再有 resetHour');
        assert.equals(6, DEFAULT_INTERACTION_QUOTA.freePerSeason);
    });

    suite.test('前 6 次免費，第 7 次要買；買了才能用', () => {
        const q = new InteractionQuota();
        for (let i = 0; i < 6; i++) assert.equals('free', q.consume());
        assert.equals('needPurchase', q.consume());
        assert.equals(5, q.confirmExtraPurchase());
        assert.equals('extra', q.consume());
        assert.equals('needPurchase', q.consume());
    });

    suite.test('額外價格 5、7、9、11、13、15、15…；本季最多買 12 次，之後 capReached', () => {
        const q = new InteractionQuota();
        const prices: number[] = [];
        for (let i = 0; i < 12; i++) prices.push(q.confirmExtraPurchase());
        assert.equals('5,7,9,11,13,15,15,15,15,15,15,15', prices.join(','));
        assert.equals(-1, q.confirmExtraPurchase());
        assert.equals(-1, q.nextExtraPrice());
        for (let i = 0; i < 6 + 12; i++) q.consume();
        assert.equals('capReached', q.consume());
    });

    suite.test('換季重置免費與額外；同季或倒退的換季事件不重置', () => {
        const q = new InteractionQuota();
        q.onSeasonChange(1);
        for (let i = 0; i < 6; i++) q.consume();
        q.confirmExtraPurchase();
        assert.isTrue(!q.onSeasonChange(1), '同季不重置');
        assert.isTrue(!q.onSeasonChange(0), '倒退不重置');
        assert.equals(0, q.freeRemaining);
        assert.isTrue(q.onSeasonChange(2), '新季重置');
        assert.equals(6, q.freeRemaining);
        assert.equals(0, q.extraRemaining);
        assert.equals(5, q.nextExtraPrice());
    });

    suite.test('市井大街開放：第一場戰鬥前不開，之後（第一季起）開；條件來自 JSON', () => {
        assert.isTrue(DEFAULT_STREET_OPEN_CONFIG.openAfterFirstBattle, '預設要先打第一場');
        assert.isTrue(!isStreetOpen({ firstBattleDone: false, seasonIndex: 1 }), '戰前不開');
        assert.isTrue(!isStreetOpen({ firstBattleDone: true, seasonIndex: 1 }), '戰後但家臣帶逛未走完：不開（PROG-2-10229 起 tutorialEscortRequired=true）');
        assert.isTrue(isStreetOpen({ firstBattleDone: true, seasonIndex: 1, tutorialDone: true }), '戰後且帶逛走完：開');
        const strict = { openAfterFirstBattle: true, openSeasonMin: 2, tutorialEscortRequired: true };
        assert.isTrue(!isStreetOpen({ firstBattleDone: true, seasonIndex: 1, tutorialDone: true }, strict), '季數不足');
        assert.isTrue(!isStreetOpen({ firstBattleDone: true, seasonIndex: 2 }, strict), '教學未播');
        assert.isTrue(isStreetOpen({ firstBattleDone: true, seasonIndex: 2, tutorialDone: true }, strict));
    });

    return suite;
}
