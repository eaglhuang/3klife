// @spec-source → 血統EP綜合評級精算模型與天命波動規格書.md (doc_spec_1098)、血統理論系統.md (doc_spec_0011)；PROG-2-9045
import { TestSuite, assert } from './TestRunner';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import {
    EP_AFFINITY_BONUS,
    EP_OUTCROSS_BONUS,
    EP_VITALITY_FULL_BONUS,
    computeParentEpBonus,
    computeResonanceBonus,
    previewBreedingEp,
    type BreedingGeneral,
} from '../assets/scripts/core/systems/BreedingSystem';
import { buildBreedingPreviewLines } from '../assets/scripts/ui/core/BreedingPreviewPresenter';

const fs = require('fs');
const path = require('path');

export function createBondingEpFormulaSuite(): TestSuite {
    const suite = new TestSuite('BondingEpFormula (PROG-2-9045)');

    suite.test('doc_spec_1098 門檻與常數對齊：異脈 +10、契合 +10、滿精 +5', () => {
        assert.equals(10, EP_OUTCROSS_BONUS);
        assert.equals(10, EP_AFFINITY_BONUS);
        assert.equals(5, EP_VITALITY_FULL_BONUS);
    });

    suite.test('共鳴階梯計分：3~4→+5、5~6→+10、≥7→+15', () => {
        assert.equals(0, computeResonanceBonus(2));
        assert.equals(5, computeResonanceBonus(3));
        assert.equals(5, computeResonanceBonus(4));
        assert.equals(10, computeResonanceBonus(5));
        assert.equals(10, computeResonanceBonus(6));
        assert.equals(15, computeResonanceBonus(7));
        assert.equals(15, computeResonanceBonus(10));
    });

    suite.test('computeParentEpBonus：未傳 ep 回 0，有傳 ep 依平均 EP 相對 65 折算', () => {
        assert.equals(0, computeParentEpBonus(undefined, undefined));
        assert.equals(0, computeParentEpBonus(65, 65));
        assert.equals(15, computeParentEpBonus(95, 95));
        assert.equals(-7, computeParentEpBonus(50, 50));
        assert.equals(20, computeParentEpBonus(120, 120));
        assert.equals(-10, computeParentEpBonus(20, 20));
    });

    suite.test('真實資料：大喬更換不同強度的父親（曹操 / 呂布 / 鄂煥）應產出不同預估 EP 與親代明細', () => {
        const generals = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets/resources/data/generals.json'), 'utf8')) as BreedingGeneral[];
        const registry = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets/resources/data/person-registry.json'), 'utf8'));
        const graph = new BloodlineGraph();
        graph.loadFromData(registry);

        const mother = generals.find((g) => g.id === 'da-qiao')!;
        const caoCao = generals.find((g) => g.id === 'cao-cao')!;
        const luBu = generals.find((g) => g.id === 'lu-bu')!;
        const eHuan = generals.find((g) => g.id === 'e-huan')!;
        const lookup = (id: string) => generals.find((g) => g.id === id);

        const epCao = previewBreedingEp({ father: caoCao, mother, pedigree: graph, rosterLookup: lookup }).ep;
        const epLu = previewBreedingEp({ father: luBu, mother, pedigree: graph, rosterLookup: lookup }).ep;
        const epEHuan = previewBreedingEp({ father: eHuan, mother, pedigree: graph, rosterLookup: lookup }).ep;

        assert.isTrue(epCao.ep > epLu.ep, `曹操(${epCao.ep}) 應高於 呂布(${epLu.ep})`);
        assert.isTrue(epLu.ep > epEHuan.ep, `呂布(${epLu.ep}) 應高於 鄂煥(${epEHuan.ep})`);
        assert.isTrue((epCao.parentBonus ?? 0) > 0, '高 EP 父親應有正向親代加成');
        assert.isTrue((epEHuan.parentBonus ?? 0) < 0, '低 EP 父親應有負向親代折減');

        const linesCao = buildBreedingPreviewLines(epCao);
        assert.isTrue(linesCao.breakdownLine.includes('親代 +'), `預覽明細應顯示親代加成: ${linesCao.breakdownLine}`);
    });

    return suite;
}
