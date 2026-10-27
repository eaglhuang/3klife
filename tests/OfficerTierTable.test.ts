/**
 * OfficerTierTable — 官職階位資料檔載入（OFC-01 接線）的 headless 測試
 *
 * 鎖住：officer-tiers.json 與內建門檻一致、驗證失敗不覆寫、驗證通過才套用門檻。
 * 注意：安裝會改動共用的門檻表，每個測試結束前都要還原。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { installOfficerTierTable, parseOfficerTierTable } from '../assets/scripts/core/systems/OfficerTierTable';
import { OFFICER_PROMOTION_REWARD_GOLD, OFFICER_TIER_EXP_THRESHOLDS, tierForExp } from '../assets/scripts/core/systems/OfficerState';

const DATA_PATH = path.resolve(__dirname, '..', 'assets/resources/data/officer-tiers.json');
const readTable = (): unknown => JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const BUILT_IN = { 2: 100, 3: 260, 4: 520, 5: 920 };
const BUILT_IN_REWARD = { 2: 200, 3: 400, 4: 800, 5: 1500 };

function restoreBuiltIn(): void {
    for (const [tier, exp] of Object.entries(BUILT_IN)) {
        OFFICER_TIER_EXP_THRESHOLDS[Number(tier)] = exp;
    }
    for (const [tier, gold] of Object.entries(BUILT_IN_REWARD)) {
        OFFICER_PROMOTION_REWARD_GOLD[Number(tier)] = gold;
    }
}

export function createOfficerTierTableSuite(): TestSuite {
    const suite = new TestSuite('OfficerTierTable (官職階位資料檔載入 OFC-01)');

    suite.test('officer-tiers.json 通過驗證，且門檻與內建備援一致', () => {
        const result = parseOfficerTierTable(readTable());
        assert.isTrue(result.ok);
        if (!result.ok) return;
        for (const row of result.rows) {
            assert.equals(BUILT_IN[row.tier as keyof typeof BUILT_IN] ?? 0, row.expToReach);
            assert.equals(BUILT_IN_REWARD[row.tier as keyof typeof BUILT_IN_REWARD] ?? 0, row.promotionRewardGold ?? -1);
        }
    });

    suite.test('驗證失敗：門檻未遞增、階位缺漏、任務上限不合法都會列出 issues', () => {
        const table = readTable() as { tiers: Array<Record<string, unknown>> };
        const broken = JSON.parse(JSON.stringify(table)) as typeof table;
        broken.tiers[2].expToReach = 90;
        broken.tiers[3].questCap = 'legendary';
        const result = parseOfficerTierTable(broken);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.isTrue(result.issues.some((issue) => issue.includes('階位 3 的 expToReach')));
        assert.isTrue(result.issues.some((issue) => issue.includes('階位 4 的 questCap')));
        assert.isFalse(parseOfficerTierTable({ tiers: [] }).ok);
    });

    suite.test('驗證失敗時不覆寫門檻', () => {
        const table = readTable() as { tiers: Array<Record<string, unknown>> };
        const broken = JSON.parse(JSON.stringify(table)) as typeof table;
        broken.tiers[4].expToReach = 1;
        assert.isFalse(installOfficerTierTable(broken).ok);
        assert.equals(920, OFFICER_TIER_EXP_THRESHOLDS[5]);
        restoreBuiltIn();
    });

    suite.test('晉升獎勵：資料檔覆寫、省略沿用內建、負數與階位 1 非 0 會擋（PROG-2-1197）', () => {
        const table = readTable() as { tiers: Array<Record<string, unknown>> };
        const tuned = JSON.parse(JSON.stringify(table)) as typeof table;
        tuned.tiers[2].promotionRewardGold = 999;
        delete tuned.tiers[3].promotionRewardGold;
        try {
            assert.isTrue(installOfficerTierTable(tuned).ok);
            assert.equals(999, OFFICER_PROMOTION_REWARD_GOLD[3]);
            assert.equals(800, OFFICER_PROMOTION_REWARD_GOLD[4]);
        } finally {
            restoreBuiltIn();
        }
        const bad = JSON.parse(JSON.stringify(table)) as typeof table;
        bad.tiers[0].promotionRewardGold = 50;
        bad.tiers[1].promotionRewardGold = -1;
        const result = parseOfficerTierTable(bad);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.isTrue(result.issues.some((i) => i.includes('階位 1 的 promotionRewardGold')));
        assert.isTrue(result.issues.some((i) => i.includes('階位 2 的 promotionRewardGold')));
        assert.equals(200, OFFICER_PROMOTION_REWARD_GOLD[2]);
    });

    suite.test('驗證通過後套用門檻：晉升判定跟著資料檔走', () => {
        const table = readTable() as { tiers: Array<Record<string, unknown>> };
        const tuned = JSON.parse(JSON.stringify(table)) as typeof table;
        tuned.tiers[1].expToReach = 50;
        try {
            assert.isTrue(installOfficerTierTable(tuned).ok);
            assert.equals(50, OFFICER_TIER_EXP_THRESHOLDS[2]);
            assert.equals(2, tierForExp(50));
        } finally {
            restoreBuiltIn();
        }
        assert.equals(1, tierForExp(50));
    });

    return suite;
}
