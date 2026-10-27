/**
 * RelationTexts.test.ts — 相性關係劇本與標籤字串（KIN-12，PROG-2-1250）headless 測試
 *
 * 鎖住：五種史實關係都有標籤、語系表沒載入時退回 zh-TW 預設、模板參數依序代入、
 * 找不到 key 時原樣回傳、已載入的語系值優先於預設。
 */
import { assert, TestSuite } from './TestRunner';
import {
    RELATION_TEXT_FALLBACK_ZH_TW,
    RELATION_TYPE_LABEL_KEY,
    fallbackRelationText,
    relationLoreText,
    relationTypeLabel,
    withRelationFallback,
} from '../assets/scripts/ui/core/RelationTexts';
import { HISTORICAL_RELATION_TYPES } from '../assets/scripts/core/systems/KinRelation';

export function createRelationTextsSuite(): TestSuite {
    const suite = new TestSuite('RelationTexts (相性劇本與字串 KIN-12 PROG-2-1250)');

    suite.test('五種史實關係都有標籤 key，且每個 key 都有 zh-TW 預設', () => {
        for (const type of HISTORICAL_RELATION_TYPES) {
            const key = RELATION_TYPE_LABEL_KEY[type];
            assert.isTrue(RELATION_TEXT_FALLBACK_ZH_TW[key] !== undefined);
        }
        assert.equals('史實夫妻', relationTypeLabel('COUPLE'));
        assert.equals('師徒', relationTypeLabel('MASTER_STUDENT'));
        assert.equals('宿敵', relationTypeLabel('RIVAL'));
    });

    suite.test('模板依序代入 {0}、{1}', () => {
        assert.equals('血脈共鳴觸發！白馬 共享 3 人', fallbackRelationText('UI_RESONANCE_TRIGGER', '白馬', '3'));
        assert.equals('【家風傳承】趙 家：忠義', fallbackRelationText('UI_FAMILY_TRADITION', '趙', '忠義'));
    });

    suite.test('劇本台詞取規格 §G 示例，家風台詞帶家名', () => {
        assert.equals(
            '周瑜與小喬，天作之合！爆發力大幅提升！',
            relationLoreText('LORE_REL_EVENT_FAMOUS_MATCH'),
        );
        assert.equals(
            '三代忠義傳承，劉家風已成！',
            relationLoreText('LORE_REL_EVENT_FAMILY_TRADITION', ['劉']),
        );
    });

    suite.test('找不到的 key 原樣回傳，不丟錯', () => {
        assert.equals('UI_UNKNOWN', fallbackRelationText('UI_UNKNOWN'));
    });

    suite.test('語系表回傳 key 本身時退回預設；已有譯文時採用譯文', () => {
        const unresolved = withRelationFallback((key) => key);
        assert.equals('宿敵', unresolved('UI_REL_RIVAL'));

        const localized = withRelationFallback((key) => (key === 'UI_REL_RIVAL' ? 'Rival' : key));
        assert.equals('Rival', localized('UI_REL_RIVAL'));
        assert.equals('Rival', relationTypeLabel('RIVAL', localized));
    });

    return suite;
}
