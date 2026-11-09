/**
 * PersonalityBadge — 人物頁標頭性格圓徽的資料與擺放（HUM-02，PROG-2-2127）
 */
import { offlinePersonalityOf } from '../assets/scripts/core/systems/OfflinePersonalityBehavior';
import { PERSONALITY_TOTEMS } from '../assets/scripts/core/systems/PersonalityTotem';
import {
    PERSONALITY_BADGE_GAP,
    PERSONALITY_BADGE_RADIUS,
    estimateLabelTextWidth,
    personalityBadgeOf,
    personalityBadgeOffsetX,
} from '../assets/scripts/ui/core/UIPersonalityBadge';
import { TestSuite, assert } from './TestRunner';

export function createPersonalityBadgeSuite(): TestSuite {
    const suite = new TestSuite('PersonalityBadge (人物頁性格圓徽 HUM-02 PROG-2-2127)');

    suite.test('明確設定的性格：顯示該型的單字、顏色與提示', () => {
        const badge = personalityBadgeOf({ id: 'x', personality: { type: 'Wise' } as never });
        assert.equals('睿', badge?.glyph);
        assert.equals(PERSONALITY_TOTEMS.Wise.color, badge?.color);
        assert.isTrue((badge?.tooltip ?? '').startsWith('睿智型：'));
    });

    suite.test('沒有設定：與離線行為推導出的性格一致', () => {
        const general = { id: 'x', cha: 10, str: 90, int: 20, luk: 5 };
        assert.equals('Brave', offlinePersonalityOf(general));
        assert.equals('豪', personalityBadgeOf(general)?.glyph);
    });

    suite.test('未知性格不顯示圓徽', () => {
        assert.equals(null, personalityBadgeOf({ id: 'x', personality: { type: 'Nope' } as never }));
    });

    suite.test('文字寬度：全形佔滿字級，半形較窄，字距逐字累加', () => {
        assert.equals(40, estimateLabelTextWidth('蜀．', 17, 3));
        assert.isTrue(estimateLabelTextWidth('ab', 10, 0) < estimateLabelTextWidth('蜀漢', 10, 0));
    });

    suite.test('靠左文字：圓徽緊貼文字右側', () => {
        const x = personalityBadgeOffsetX(100, 296, 0.5, 0);
        assert.equals(-148 + 100 + PERSONALITY_BADGE_GAP + PERSONALITY_BADGE_RADIUS, x);
    });

    suite.test('文字很長：圓徽不超出節點右緣', () => {
        assert.equals(148 - PERSONALITY_BADGE_RADIUS, personalityBadgeOffsetX(900, 296, 0.5, 0));
    });

    return suite;
}
