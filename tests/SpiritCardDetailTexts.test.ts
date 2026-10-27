/**
 * SpiritCardDetailTexts.test.ts — 英靈卡詳情血脈區文字（DUP-02，PROG-2-1141）headless 測試
 *
 * 鎖住：三個血脈數值顯示、舊卡缺欄位顯示 0、非正式英靈卡不開放灌注入口、語系表未載入時用 zh-TW 預設。
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildSpiritCardInfusionTexts,
    fallbackSpiritCardDetailText,
} from '../assets/scripts/ui/core/SpiritCardDetailTexts';
import type { SpiritCard } from '../assets/scripts/core/models/SpiritCard';

function cardOf(extra: Partial<SpiritCard>): SpiritCard {
    return {
        uid: 'guan-yu', name: '關羽', faction: 'shu', characterCategory: 'military', rarityTier: 'legendary',
        gene_refs: [], ep_snapshot: 0, deathContext: { battleId: 'b', cause: 'battle', season: 1, year: 200 },
        archivedAt: 0, lifecycleClass: 'A', resurrectionEligible: true, parentUids: ['', ''],
        isSpiritRelic: true, ...extra,
    } as SpiritCard;
}

export function createSpiritCardDetailTextsSuite(): TestSuite {
    const suite = new TestSuite('SpiritCardDetailTexts (英靈卡詳情血脈區 DUP-02 PROG-2-1141)');

    suite.test('顯示血脈等級、英靈濃度與虎符層級', () => {
        const result = buildSpiritCardInfusionTexts(cardOf({ bloodlineLevel: 3, spiritPower: 55, linkedTallyLevel: 2 }));
        assert.equals('血脈等級 3', result.texts.bloodlineLevelLabel);
        assert.equals('英靈濃度 55', result.texts.spiritPowerLabel);
        assert.equals('虎符層級 2', result.texts.linkedTallyLabel);
        assert.equals('血脈灌注', result.texts.infuseButtonLabel);
    });

    suite.test('舊卡缺血脈欄位顯示 0，負數與非有限數也當 0', () => {
        const result = buildSpiritCardInfusionTexts(cardOf({ spiritPower: -4, bloodlineLevel: Number.NaN }));
        assert.equals('血脈等級 0', result.texts.bloodlineLevelLabel);
        assert.equals('英靈濃度 0', result.texts.spiritPowerLabel);
        assert.equals('虎符層級 0', result.texts.linkedTallyLabel);
    });

    suite.test('非正式英靈卡不開放灌注入口', () => {
        assert.isTrue(buildSpiritCardInfusionTexts(cardOf({ isSpiritRelic: true })).infuseEnabled);
        assert.isTrue(!buildSpiritCardInfusionTexts(cardOf({ isSpiritRelic: false })).infuseEnabled);
        assert.isTrue(!buildSpiritCardInfusionTexts(cardOf({ isSpiritRelic: undefined })).infuseEnabled);
    });

    suite.test('語系表未載入（回傳 key）時改用 zh-TW 預設', () => {
        const raw = (key: string) => key;
        const result = buildSpiritCardInfusionTexts(cardOf({ bloodlineLevel: 1 }), (key, ...args) => {
            const text = raw(key);
            return text === key ? fallbackSpiritCardDetailText(key, ...args) : text;
        });
        assert.equals('血脈等級 1', result.texts.bloodlineLevelLabel);
    });

    return suite;
}
