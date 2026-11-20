/**
 * MarriageVitality.test.ts — PROG-2-9181 寒門新血 × 佳話聯姻單元測試（含 3 組算例與畫面可見文案驗證）
 */
import { assert, TestSuite } from './TestRunner';
import {
    DEFAULT_MARRIAGE_VITALITY_RULES,
    evaluateMarriageVitality,
    marriageVitalityBadgeLine,
    type MarriageVitalityRulesConfig,
} from '../assets/scripts/core/systems/MarriageVitality';
import { bloodlineBirthLines } from '../assets/scripts/core/systems/BloodlineBirthLines';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { Faction } from '../assets/scripts/core/config/Constants';
import type { BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import * as fs from 'fs';
import * as path from 'path';

function makeGeneral(id: string, gender: '男' | '女', extra: Partial<BreedingGeneral> = {}): BreedingGeneral {
    return {
        id,
        name: id,
        faction: Faction.Player,
        gender,
        hp: 100,
        age: 22,
        ep: 55,
        vitality: 100,
        maxVitality: 100,
        stats: { str: 60, int: 60, lea: 60, pol: 60, cha: 60, luk: 50 },
        genes: [],
        ...extra,
    };
}

export function createMarriageVitalitySuite(): TestSuite {
    const suite = new TestSuite('MarriageVitality (PROG-2-9181)');

    suite.test('marriage-vitality-rules.json 與預設常數同步', () => {
        const filePath = path.resolve(__dirname, '../assets/resources/data/marriage-vitality-rules.json');
        const rules = JSON.parse(fs.readFileSync(filePath, 'utf8')) as MarriageVitalityRulesConfig;
        assert.equals(JSON.stringify(DEFAULT_MARRIAGE_VITALITY_RULES), JSON.stringify(rules));
    });

    suite.test('算例 A（新手隨意找無名武將）：EP<65 且無 3★ 因子不觸發寒門新血', () => {
        const father = makeGeneral('f1', '男', { ancestor_chain: ['a1', 'a2', 'a3', 'a4'], ep: 60 });
        const mother = makeGeneral('m1', '女', { ancestor_chain: [], ep: 45, genes: [] });
        const res = evaluateMarriageVitality({ father, mother, hasCommonAncestor: false });
        assert.equals(false, res.freshBlood.active);
        assert.equals(0, res.freshBlood.level);
        assert.equals(0, res.epithets.length);
    });

    suite.test('算例 B（G3 迎娶寒門高星奇才＋文武並濟）：V=3（+12%）與初始 TP +20', () => {
        const father = makeGeneral('f2', '男', {
            name: '張飛',
            ancestor_chain: ['a1', 'a2', 'a3', 'a4'],
            ep: 72,
            stats: { str: 92, int: 45, lea: 80, pol: 40, cha: 60, luk: 50 },
        });
        const mother = makeGeneral('m2', '女', {
            name: '黃月英',
            ancestor_chain: ['b1'],
            ep: 78,
            stats: { str: 40, int: 91, lea: 60, pol: 85, cha: 75, luk: 60 },
            genes: [{ id: 'gene_int', level: 3 }],
        });
        const res = evaluateMarriageVitality({ father, mother, hasCommonAncestor: false });
        assert.equals(true, res.freshBlood.active);
        assert.equals(3, res.freshBlood.level);
        assert.equals(0.12, res.freshBlood.earlyTrainingBonus);
        assert.equals(1, res.freshBlood.extraFatigueRecovery);
        assert.isTrue(res.epithets.some((e) => e.id === 'civil_martial'));
        assert.equals(20, res.bonusTp);
    });

    suite.test('算例 C（極端名門跨勢力＋雙星輝映）：不觸發寒門，但觸發化干戈為玉帛與雙星輝映', () => {
        const fullChain = Array.from({ length: 14 }, (_, i) => `anc_${i}`);
        const father = makeGeneral('f3', '男', {
            name: '趙雲',
            faction: Faction.Player,
            ancestor_chain: fullChain,
            genes: [{ id: 'gene_cav', level: 3 }],
        });
        const mother = makeGeneral('m3', '女', {
            name: '張春華',
            faction: Faction.Enemy,
            ancestor_chain: fullChain,
            genes: [{ id: 'gene_int', level: 3 }],
        });
        // 名冊有多位同姓張姓武將使其不屬稀少姓氏
        const roster = [father, mother, makeGeneral('z1', '男', { name: '張遼' }), makeGeneral('z2', '男', { name: '張郃' })];
        const res = evaluateMarriageVitality({ father, mother, hasCommonAncestor: false, roster });
        assert.equals(false, res.freshBlood.active);
        assert.isTrue(res.epithets.some((e) => e.id === 'foes_to_allies'));
        assert.isTrue(res.epithets.some((e) => e.id === 'twin_stars'));
        assert.equals(2, res.synergyBonus);
        assert.equals(0.05, res.awakenRateBonus);
    });

    suite.test('接線驗證：結緣預覽（BondingSetupController）與成婚提示（bloodlineBirthLines）皆可看見寒門新血與佳話稱號', () => {
        const father = makeGeneral('f_ui', '男', {
            name: '關羽',
            faction: Faction.Player,
            ancestor_chain: ['a1', 'a2', 'a3', 'a4'],
            stats: { str: 96, int: 75, lea: 92, pol: 65, cha: 80, luk: 60 },
            genes: [{ id: 'gene_inf', level: 3 }],
        });
        const mother = makeGeneral('m_ui', '女', {
            name: '蔡文姬',
            faction: Faction.Enemy,
            ancestor_chain: [],
            ep: 78,
            stats: { str: 30, int: 88, lea: 45, pol: 82, cha: 90, luk: 65 },
            genes: [{ id: 'gene_int', level: 3 }],
        });
        const roster = new InMemoryRosterStore([father, mother]);
        const graph = BloodlineGraph.getInstance();
        graph.clear();
        const breeding = new BreedingService(roster, graph, { random: () => 0.05 });
        const controller = new BondingSetupController({ breeding, roster });
        controller.selectFather('f_ui');
        controller.selectMother('m_ui');

        const view = controller.getView();
        assert.isTrue(view.texts.conceptionLabel.includes('寒門新血 V3'));
        assert.isTrue(view.texts.conceptionLabel.includes('文武並濟'));
        assert.isTrue(view.texts.conceptionLabel.includes('化干戈為玉帛'));
        assert.isTrue(view.texts.conceptionLabel.includes('雙星輝映'));

        const result = breeding.breed('f_ui', 'm_ui');
        assert.equals('conceived', result.outcome);
        assert.equals(0.12, result.child?.earlyTrainingBonus);
        assert.equals(20, result.child?.initialBonusTp);
        assert.equals(0.05, result.child?.earlyAwakenBonusPct);

        const lines = bloodlineBirthLines(result, (uid) => breeding.ancestorName(uid));
        assert.isTrue(lines.some((l) => l.includes('寒門新血 V3')));
        assert.isTrue(lines.some((l) => l.includes('文武並濟')));
        assert.isTrue(lines.some((l) => l.includes('化干戈為玉帛')));
        assert.isTrue(lines.some((l) => l.includes('雙星輝映')));
        assert.isTrue(marriageVitalityBadgeLine(result.marriageVitality!).includes('文武並濟'));
    });

    return suite;
}
