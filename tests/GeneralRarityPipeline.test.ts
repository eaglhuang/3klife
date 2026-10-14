/**
 * 稀有度雙軸重算的管線檢查（GDP-07）
 *
 * 用正式的 rarity-thresholds.json 重算 generals.json，鎖住現況：
 * 只允許已知的不一致（xiahou-shi，待企劃確認），legendary 佔比低於 20%。
 */
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import { getRarityThresholds, resolveRarityTier, setRarityThresholds } from '../assets/scripts/core/utils/RarityResolver';

/** 已知不一致：資料 common，雙軸重算 rare；待企劃確認後再改資料或門檻 */
const KNOWN_MISMATCH_IDS = ['xiahou-shi'];

export function createGeneralRarityPipelineSuite(): TestSuite {
    const suite = new TestSuite('GeneralRarityPipeline (稀有度雙軸重算 GDP-07)');

    suite.test('正式門檻重算 generals.json：不一致只有已知項目，legendary 佔比低於 20%', () => {
        const previous = getRarityThresholds();
        try {
            setRarityThresholds(JSON.parse(fs.readFileSync('assets/resources/data/rarity-thresholds.json', 'utf8')));
            const generals = JSON.parse(fs.readFileSync('assets/resources/data/generals.json', 'utf8')) as Array<Record<string, unknown> & { id: string; rarityTier?: string }>;
            const mismatches: string[] = [];
            let legendary = 0;
            for (const general of generals) {
                const { rarityTier, ...rest } = general;
                const calc = resolveRarityTier(rest as never);
                if (rarityTier !== calc) mismatches.push(general.id);
                if (rarityTier === 'legendary') legendary++;
            }
            assert.equals(JSON.stringify(KNOWN_MISMATCH_IDS), JSON.stringify(mismatches));
            assert.isTrue(legendary / generals.length < 0.2, `legendary ${legendary}/${generals.length}`);
        } finally {
            setRarityThresholds(previous);
        }
    });

    return suite;
}
