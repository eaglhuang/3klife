/**
 * FamilyCompatibilityWhiteFactor.test.ts — PROG-2-9162 門風契合 K 與生平閱歷白因子單元測試
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    classifyParentStyle,
    computeFamilyCompatibilityK,
    configureFamilyCompatibilityRules,
    countQualifiedInRecentWindow,
    defaultFamilyCompatibilityRules,
    resetFamilyCompatibilityRules,
} from '../assets/scripts/core/systems/FamilyCompatibility';
import {
    calmReductionOf,
    computeDiscountedTpCost,
    condenseLifeWhiteFactors,
    configureWhiteFactorAchievements,
    defaultWhiteFactorAchievements,
    furyModifiersOf,
    resetWhiteFactorAchievements,
    whiteFactorDiscountRate,
} from '../assets/scripts/core/systems/WhiteFactorTraits';
import { computeEpMvp, previewBreedingEp, type BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { withLifeImprints } from '../assets/scripts/core/systems/LifeImprint';
import { tacticTagsOf } from '../assets/scripts/core/systems/WhiteFactorTraits';
import { Faction } from '../assets/scripts/core/config/Constants';
import { BloodlineGraph, createEmptyPedigree } from '../assets/scripts/core/services/BloodlineGraph';

export function createFamilyCompatibilityWhiteFactorSuite(): TestSuite {
    const suite = new TestSuite('FamilyCompatibility & WhiteFactorTraits (PROG-2-9162)');

    suite.test('JSON 資料表與預設值完全一致', () => {
        const compatJson = JSON.parse(
            fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/family-compatibility-rules.json'), 'utf8'),
        );
        const compatDefault = defaultFamilyCompatibilityRules();
        assert.equals(compatJson.maxTotalBonus, compatDefault.maxTotalBonus);
        assert.equals(JSON.stringify(compatJson.styleResonance), JSON.stringify(compatDefault.styleResonance));
        assert.equals(JSON.stringify(compatJson.lineageWindow), JSON.stringify(compatDefault.lineageWindow));

        const whiteJson = JSON.parse(
            fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/white-factor-achievements.json'), 'utf8'),
        );
        const whiteDefault = defaultWhiteFactorAchievements();
        assert.equals(8, whiteJson.achievements.length);
        assert.equals(JSON.stringify(whiteJson.starDiscounts), JSON.stringify(whiteDefault.starDiscounts));
        assert.equals(JSON.stringify(whiteJson.achievements), JSON.stringify(whiteDefault.achievements));
    });

    suite.test('門風契合度 K：文武雙修佳話 +5、同系精銳 +3、近 6 胎滑動窗最高 +10、總上限 15', () => {
        const martial = { str: 88, lea: 84, int: 45, pol: 42, cha: 60 };
        const civil = { str: 38, lea: 44, int: 86, pol: 88, cha: 78 };
        const balanced = { str: 65, lea: 65, int: 64, pol: 64, cha: 65 };

        assert.equals('martial', classifyParentStyle(martial).kind);
        assert.equals('civil', classifyParentStyle(civil).kind);
        assert.equals('balanced', classifyParentStyle(balanced).kind);

        // 算例 1：新手 G1（文武雙修佳話 +5，無世交 0）
        const g1 = computeFamilyCompatibilityK({
            fatherStats: martial,
            motherStats: civil,
            qualifiedMarriagesInWindow: 0,
        });
        assert.equals(5, g1.kStyle);
        assert.equals(0, g1.kLineage);
        assert.equals(5, g1.totalK);
        assert.equals('文武雙修佳話', g1.styleLabel ?? '');

        // 算例 2：中期 G2（文武互補 +5，1 次世交 +2 → K=7）
        const g2 = computeFamilyCompatibilityK({
            fatherStats: martial,
            motherStats: civil,
            qualifiedMarriagesInWindow: 1,
        });
        assert.equals(7, g2.totalK);

        // 同系精銳（雙武高階 +3，3 次世交 +6 → K=9）
        const elite = computeFamilyCompatibilityK({
            fatherStats: martial,
            motherStats: { str: 82, lea: 80, int: 40, pol: 40, cha: 60 },
            qualifiedMarriagesInWindow: 3,
        });
        assert.equals(3, elite.kStyle);
        assert.equals(6, elite.kLineage);
        assert.equals(9, elite.totalK);
        assert.equals('同系精銳共鳴', elite.styleLabel ?? '');

        // 封頂檢驗：互補 +5 且滑動窗 6 次 (+10 → cap 10) 或超額傳入 9 次 → 總分仍不超過 15
        const capped = computeFamilyCompatibilityK({
            fatherStats: martial,
            motherStats: civil,
            qualifiedMarriagesInWindow: 9,
        });
        assert.equals(10, capped.kLineage);
        assert.equals(15, capped.totalK);
    });

    suite.test('FamilyPairRecord 滑動窗轉換與 BreedingSystem.computeEpMvp 串接', () => {
        // bitmap 0b10110111 (8 筆)，只取最近 6 bit (0b110111 → 5 筆成材)
        const record = { recentBitmap: 0b10110111, recentCount: 8, lifetimeQualified: 12 };
        assert.equals(5, countQualifiedInRecentWindow(record, 6));

        const k = computeFamilyCompatibilityK({
            fatherStats: { str: 85, lea: 82, int: 40, pol: 40 },
            motherStats: { str: 40, lea: 40, int: 85, pol: 82 },
            pairRecord: record,
        });
        assert.equals(5, k.kStyle);
        assert.equals(10, k.kLineage);
        assert.equals(15, k.totalK);

        const pedigree = createEmptyPedigree();
        const ep = computeEpMvp(pedigree, new Map(), false, false, undefined, k.totalK);
        assert.equals(15, ep.affinity);
        assert.equals(65, ep.ep);
    });

    suite.test('生平閱歷白因子凝練：依戰功／單挑／內政／外交門檻與星等門檻產出 1★~3★', () => {
        const hero = condenseLifeWhiteFactors(
            { str: 90, lea: 82, int: 84, pol: 85, cha: 80 },
            { battles: 18, wins: 15, duelsWon: 4, governanceSeasons: 14, diplomacyCount: 6 },
        );
        const byId = new Map(hero.map((item) => [item.id, item]));
        assert.equals(3, byId.get('gene_white_baoma')?.level ?? 0, '18 戰 >= 18 → 3★ 白馬從義');
        assert.equals(2, byId.get('gene_white_jiuzhu')?.level ?? 0, '4 次單挑 >= 4 → 2★ 單騎救主');
        assert.equals(2, byId.get('gene_white_tuntian')?.level ?? 0, '14 季內政 >= 12 → 2★ 安民屯田');
        assert.equals(2, byId.get('gene_white_lianzong')?.level ?? 0, '6 次外交 >= 6 → 2★ 合縱連橫');
        assert.equals(3, byId.get('gene_white_weimo')?.level ?? 0, '18 戰 >= 14 → 3★ 運籌帷幄');

        // 勝率不足時不凝練高勝率戰鬥白因子
        const lowWinRate = condenseLifeWhiteFactors(
            { str: 90, lea: 82, int: 40, pol: 40, cha: 50 },
            { battles: 10, wins: 2 },
        );
        assert.isFalse(lowWinRate.some((item) => item.id === 'gene_white_baoma'));
    });

    suite.test('生平閱歷白因子 TP 折扣：1★=15%、2★=20%、3★=25%，單項上限 25%、最低 1 點', () => {
        assert.equals(0.15, whiteFactorDiscountRate(1));
        assert.equals(0.2, whiteFactorDiscountRate(2));
        assert.equals(0.25, whiteFactorDiscountRate(3));
        assert.equals(0.25, whiteFactorDiscountRate(5), '星等溢位仍封頂 25%');

        const d1 = computeDiscountedTpCost(100, [{ id: 'gene_white_baoma', level: 1 }], ['騎兵']);
        assert.equals(85, d1.finalCost);
        assert.equals(0.15, d1.discountRate);

        const d2 = computeDiscountedTpCost(100, [{ id: 'gene_white_baoma', level: 2 }], ['騎兵']);
        assert.equals(80, d2.finalCost);

        const d3 = computeDiscountedTpCost(100, [{ id: 'gene_white_baoma', level: 3 }], ['突擊']);
        assert.equals(75, d3.finalCost);

        // 鎖定中或不相干標籤不折扣
        const locked = computeDiscountedTpCost(100, [{ id: 'gene_white_baoma', level: 3, isLocked: true }], ['騎兵']);
        assert.equals(100, locked.finalCost);
        const mismatch = computeDiscountedTpCost(100, [{ id: 'gene_white_baoma', level: 3 }], ['外交']);
        assert.equals(100, mismatch.finalCost);

        // 下限保護 TP >= 1
        const minFloor = computeDiscountedTpCost(1, [{ id: 'gene_white_baoma', level: 3 }], ['騎兵']);
        assert.equals(1, minFloor.finalCost);
    });

    suite.test('保留原有冷靜／暴躁白因子與設定覆寫還原函式', () => {
        assert.equals(0.2, calmReductionOf([{ id: 'gene_calm', level: 2 }]));
        assert.equals(1.06, furyModifiersOf([{ id: 'gene_fury', level: 2 }]).attack);

        configureFamilyCompatibilityRules({ maxTotalBonus: 12 });
        configureWhiteFactorAchievements({ maxDiscountRate: 0.2 });
        assert.equals(0.2, whiteFactorDiscountRate(3));
        resetFamilyCompatibilityRules();
        resetWhiteFactorAchievements();
        assert.equals(0.25, whiteFactorDiscountRate(3));
    });

    suite.test('接線測試：previewBreedingEp 預覽會計算門風契合 K，使契合不為 0', () => {
        const father: BreedingGeneral = {
            id: 'f_compat',
            name: '猛將父',
            faction: Faction.Player,
            gender: '男',
            age: 26,
            status: 'Unveiled',
            hp: 1000,
            currentHp: 1000,
            str: 90,
            lea: 85,
            int: 40,
            pol: 40,
            cha: 60,
            luk: 50,
            ep: 80,
            vitality: 100,
            maxVitality: 100,
            role: 'Combat',
        };
        const mother: BreedingGeneral = {
            id: 'm_compat',
            name: '才女母',
            faction: Faction.Player,
            gender: '女',
            age: 24,
            status: 'Unveiled',
            hp: 900,
            currentHp: 900,
            str: 35,
            lea: 42,
            int: 88,
            pol: 86,
            cha: 82,
            luk: 50,
            ep: 78,
            vitality: 100,
            maxVitality: 100,
            role: 'Combat',
        };
        const preview = previewBreedingEp({
            father,
            mother,
            pedigree: new BloodlineGraph(),
            qualifiedMarriagesInWindow: 1,
        });
        // 文武互補 +5 且 1 次世交 +2 → affinity = 7
        assert.equals(7, preview.ep.affinity);
        assert.isTrue(preview.ep.affinity > 0);
    });

    suite.test('接線測試：withLifeImprints 凝練生平白因子並與 tacticTagsOf 折抵 TP', () => {
        const veteran = {
            id: 'vet_1',
            name: '老將',
            faction: Faction.Player,
            gender: '男' as const,
            age: 62,
            status: 'Unveiled' as const,
            hp: 1000,
            str: 90,
            int: 60,
            lea: 82,
            pol: 78,
            cha: 80,
            luk: 50,
            genes: [],
            battleRecord: { wins: 15, losses: 3, duelsWon: 4, governanceSeasons: 12 },
        };
        const imprinted = withLifeImprints(veteran);
        const baoma = imprinted.general.genes?.find((g) => g.id === 'gene_white_baoma');
        assert.isDefined(baoma, '應凝練出白馬從義');
        assert.equals(3, baoma!.level ?? 0);
        assert.isTrue(imprinted.added.includes('白馬從義'));

        const tp = computeDiscountedTpCost(100, imprinted.general.genes, tacticTagsOf('tiger-charge'));
        assert.equals(75, tp.finalCost, '3★ 白馬從義折抵虎豹突擊戰法 25% TP');
    });

    return suite;
}
