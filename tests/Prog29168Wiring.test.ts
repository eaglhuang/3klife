/**
 * Prog29168Wiring.test.ts — PROG-2-9168 三項接線驗證：
 *   1. 命分頁因子區：生平凝練白因子不被 Lv21 鎖頭擋住，直接顯示名稱與星等
 *   2. 世交 K 接線：BreedingService.previewEp 與 breed() 實際吃進 FamilySynergyLedger 世交滑動窗
 *   3. 規則 JSON 載入端：ServiceLoader.loadBloodlineRuleTables() 載入後改動規則立即生效，且 .meta 為完整格式
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { Faction } from '../assets/scripts/core/config/Constants';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { ServiceLoader } from '../assets/scripts/core/managers/ServiceLoader';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { buildDs3BloodlineView } from '../assets/scripts/ui/components/character-ds3/CharacterDs3BloodlineChild';
import { inheritChildAptitudes, resetChildAptitudeRules } from '../assets/scripts/core/systems/ChildAptitudeInheritance';
import { computeFamilyCompatibilityK, resetFamilyCompatibilityRules } from '../assets/scripts/core/systems/FamilyCompatibility';
import { emptyFamilySynergyLedger, familyPairKey, PLAYER_FAMILY_UID, recordFinalizedChild } from '../assets/scripts/core/systems/FamilySynergy';
import { withLifeImprints } from '../assets/scripts/core/systems/LifeImprint';
import { resetWhiteFactorAchievements, whiteFactorDiscountRate } from '../assets/scripts/core/systems/WhiteFactorTraits';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

export function createProg29168WiringSuite(): TestSuite {
    const suite = new TestSuite('Prog29168Wiring (PROG-2-9168 三項接線)');

    suite.test('項目 1：魏延退役凝練白因子於玩家 Lv1 命分頁直接顯示名稱與星等，不被 Lv21 鎖頭擋住', () => {
        const weiYan: GeneralConfig = {
            id: 'wei-yan',
            name: '魏延',
            faction: Faction.Player,
            gender: '男',
            age: 62,
            hp: 1200,
            str: 78,
            int: 55,
            lea: 80,
            pol: 50,
            cha: 60,
            luk: 45,
            ep: 75,
            genes: [
                { id: 'gene_bravery', displayName: '勇武', type: 'blue', level: 3 },
                { id: 'gene_cavalry', displayName: '騎兵', type: 'pink', level: 2 },
                { id: 'gene_tactic_1', displayName: '猛虎', type: 'green', level: 2 },
                { id: 'gene_extra_1', displayName: '剛毅', type: 'blue', level: 2 },
                { id: 'gene_extra_2', displayName: '堅忍', type: 'blue', level: 1 },
            ],
            battleRecord: { wins: 12, losses: 3, duelsWon: 1 },
        } as unknown as GeneralConfig;

        const imprinted = withLifeImprints(weiYan);
        // 以最低玩家發現等級 playerLevel = 1 呼叫命分頁 view
        const view = buildDs3BloodlineView(imprinted.general, 4, 1);
        const baoma = view.factors.find((f) => f.name === '白馬從義');
        const xiandeng = view.factors.find((f) => f.name === '百戰先登');
        const shoucheng = view.factors.find((f) => f.name === '守城如鐵');

        assert.isDefined(baoma, '即使已有 5 個一般因子，生平白因子仍應於命分頁顯示');
        assert.isDefined(xiandeng);
        assert.isDefined(shoucheng);
        assert.isFalse(baoma!.name.includes('???'), '不可顯示 ??? 遮罩');
        assert.isFalse(baoma!.desc.includes('Lv21 解鎖'), '不可被 Lv21 鎖頭擋住');
        assert.equals('白★2', baoma!.tag);
        assert.equals('白★2', xiandeng!.tag);
        assert.equals('白★3', shoucheng!.tag);
    });

    suite.test('項目 2：BreedingService.previewEp 與 breed() 讀入世交 FamilySynergyLedger，世交加成生效', () => {
        const father: GeneralConfig = {
            id: 'f_synergy',
            name: '名門婿',
            faction: Faction.Player,
            gender: '男',
            age: 26,
            hp: 1000,
            vitality: 100,
            maxVitality: 100,
            str: 70,
            int: 70,
            lea: 70,
            pol: 70,
            cha: 70,
            luk: 50,
            ep: 65,
        };
        const mother: GeneralConfig = {
            id: 'm_synergy',
            name: '名門女',
            faction: Faction.Player,
            gender: '女',
            age: 24,
            hp: 950,
            vitality: 100,
            maxVitality: 100,
            str: 70,
            int: 70,
            lea: 70,
            pol: 70,
            cha: 70,
            luk: 50,
            ep: 65,
            familyUid: 'FAM_ZHUGE',
        } as unknown as GeneralConfig;

        const ledger = emptyFamilySynergyLedger();
        const key = familyPairKey(PLAYER_FAMILY_UID, 'FAM_ZHUGE');
        ledger.pairs[key] = recordFinalizedChild(recordFinalizedChild(undefined, true), true); // 2 名成材 → +4

        const roster = new InMemoryRosterStore([father, mother]);
        const service = new BreedingService(roster, new BloodlineGraph(), {
            random: () => 0.1,
            getFamilySynergy: () => ledger,
        });

        const preview = service.previewEp(father.id, mother.id);
        assert.equals(4, preview.affinity, '預覽應算入 2 名成材子代世交加成 +4');

        const result = service.breed(father.id, mother.id);
        assert.equals('conceived', result.outcome);
        assert.equals(4, result.ep?.affinity ?? 0, '實際結緣應套用世交加成 +4');
    });

    suite.test('項目 3：ServiceLoader.loadBloodlineRuleTables() 載入自訂 JSON 即生效，且 3 份 .meta 為完整格式', async () => {
        const loader = new ServiceLoader();
        (loader as unknown as { resource: { loadJson: (p: string) => Promise<unknown> } }).resource = {
            loadJson: async (jsonPath: string) => {
                if (jsonPath === 'data/child-aptitude-rules') {
                    return {
                        aptitudeInheritance: {
                            gradeOrder: ['D', 'C', 'B', 'A', 'S'],
                            defaultParentGrade: 'B',
                            childStepDelta: 0,
                            birthMaxGrade: 'S',
                            birthMinGrade: 'C',
                            defaultTroopKeys: ['CAVALRY'],
                        },
                    };
                }
                if (jsonPath === 'data/family-compatibility-rules') {
                    return {
                        maxTotalBonus: 15,
                        styleResonance: { complementaryBonus: 9, sameEliteBonus: 3, eliteAvgThreshold: 75, martialLeanGap: 8, civilLeanGap: 8 },
                        lineageWindow: { windowSize: 6, bonusPerQualifiedMarriage: 2, maxLineageBonus: 10 },
                    };
                }
                if (jsonPath === 'data/white-factor-achievements') {
                    return {
                        starDiscounts: { '1': 0.15, '2': 0.2, '3': 0.3 },
                        maxDiscountRate: 0.3,
                        minDiscountedCost: 1,
                        achievements: [],
                    };
                }
                return null;
            },
        };

        try {
            await loader.loadBloodlineRuleTables(true);
            const apt = inheritChildAptitudes({ troopAptitude: { CAVALRY: 'S' } }, { troopAptitude: { CAVALRY: 'C' } });
            assert.equals('S', apt.troopAptitude.CAVALRY, '載入 childStepDelta=0, birthMaxGrade=S 後子嗣直接為 S');

            const compat = computeFamilyCompatibilityK({
                fatherStats: { str: 90, lea: 85, int: 40, pol: 40 },
                motherStats: { str: 40, lea: 40, int: 90, pol: 85 },
            });
            assert.equals(9, compat.kStyle, '載入 complementaryBonus=9 後立即生效');
            assert.equals(0.3, whiteFactorDiscountRate(3), '載入 3★ 折扣 0.3 後立即生效');
        } finally {
            resetChildAptitudeRules();
            resetFamilyCompatibilityRules();
            resetWhiteFactorAchievements();
        }

        // 檢查三份 .meta 是否為完整 Cocos 格式（ver 2.0.1 + imported: true + files）
        for (const name of [
            'child-aptitude-rules.json.meta',
            'family-compatibility-rules.json.meta',
            'white-factor-achievements.json.meta',
        ]) {
            const meta = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data', name), 'utf8'));
            assert.equals('2.0.1', meta.ver);
            assert.equals(true, meta.imported);
            assert.isTrue(Array.isArray(meta.files) && meta.files.includes('.json'));
        }
    });

    return suite;
}
