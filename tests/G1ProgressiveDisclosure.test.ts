/**
 * G1ProgressiveDisclosure.test.ts — PROG-2-9163 第一代結緣資訊揭露與專家視圖測試
 */
import { assert, TestSuite } from './TestRunner';
import { BondingSetupController } from '../assets/scripts/ui/core/BondingSetupController';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { Faction } from '../assets/scripts/core/config/Constants';
import { CHILD_STATUS_MYSTERY, epGradeLetter, type BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { G1_EP_DETAIL_MASK, G1_FACTOR_TEXT, g1EpEstimateText } from '../assets/scripts/core/systems/FamilyMilestone';

function makeGeneral(id: string, gender: '男' | '女', extra: Partial<BreedingGeneral> = {}): BreedingGeneral {
    return {
        id,
        name: id,
        faction: Faction.Player,
        gender,
        age: 26,
        status: 'Unveiled',
        hp: 1000,
        vitality: 100,
        maxVitality: 100,
        str: 86,
        int: 55,
        lea: 78,
        pol: 48,
        cha: 65,
        luk: 45,
        ep: 78,
        genes: [{ id: 'gene_bravery', level: 3 }],
        ...extra,
    } as BreedingGeneral;
}

export function createG1ProgressiveDisclosureSuite(): TestSuite {
    const suite = new TestSuite('G1ProgressiveDisclosure (PROG-2-9163)');

    suite.test('G1 未開專家視圖：藏公式明細、因子星等、空族譜，只顯示鄉評與良緣評語', () => {
        const roster = new InMemoryRosterStore([
            makeGeneral('father_1', '男'),
            makeGeneral('mother_1', '女', { str: 40, lea: 45, int: 85, pol: 82 }),
        ]);
        const breeding = new BreedingService(roster, new BloodlineGraph(), { random: () => 0.1 });
        let expert = false;
        const controller = new BondingSetupController({
            roster,
            breeding,
            milestoneStage: () => (expert ? 4 : 1),
            unlockStage: () => 1,
        });

        const g1View = controller.getView();
        assert.isTrue(g1View.texts.epEstimate.startsWith('良緣評語：'), 'G1 僅顯示良緣評語，不顯示 EP 數字');
        assert.isFalse(/\d/.test(g1View.texts.epEstimate), 'G1 epEstimate 不含數字');
        assert.isTrue(/（爆發力 [SABCDEF]）$/.test(g1View.texts.epEstimate), 'G1 epEstimate 附爆發力字母等級（PROG-2-9171）');
        assert.equals(G1_EP_DETAIL_MASK, g1View.texts.epDetail);
        assert.isFalse(g1View.texts.epDetail.includes('基礎 50'), 'G1 隱藏公式明細');
        assert.isFalse(g1View.texts.conceptionLabel.includes('雙親生平功業'), 'G1 隱藏雙親 EP 算式');
        assert.equals(G1_FACTOR_TEXT, g1View.texts.fatherFactors);
        assert.equals(G1_FACTOR_TEXT, g1View.texts.motherFactors);
        assert.isFalse(g1View.actives.fatherTree2 ?? true, 'G1 隱藏父系曾/祖父母空祖位');
        assert.isFalse(g1View.actives.motherTree2 ?? true, 'G1 隱藏母系曾/祖父母空祖位');
        assert.isTrue(g1View.texts.fatherRumor.length > 0, 'G1 保留鄉評風聞');
        assert.isTrue(g1View.texts.motherRumor.length > 0, 'G1 保留鄉評風聞');

        // 切換專家視圖後立即全開
        expert = true;
        const expertView = controller.getView();
        assert.isTrue(expertView.texts.epDetail.includes('基礎 50'), '專家視圖顯示公式明細');
        assert.isTrue(expertView.actives.fatherTree2 === true, '專家視圖顯示 14 祖位');
        assert.isTrue(expertView.actives.motherTree2 === true, '專家視圖顯示 14 祖位');
    });

    suite.test('第一位子嗣開蒙（unveilDueGenerals）後自動解鎖至 G2，並支援專家視圖存檔切換', async () => {
        const father = makeGeneral('f_g1', '男');
        const mother = makeGeneral('m_g1', '女', { str: 42, lea: 45, int: 88, pol: 85 });
        const baby = makeGeneral('child_g1', '男', {
            age: 4,
            status: CHILD_STATUS_MYSTERY,
            fatherId: father.id,
            motherId: mother.id,
            hiddenFlags: ['mystery-phase'],
        });
        const rosterStore = new InMemoryRosterStore([father, mother, baby]);
        const storage = new MemoryStorageAdapter();
        const saveService = new PlayerSaveService(storage);
        const session = new GameSession();
        session.setRosterStore(rosterStore);
        session.setSaveService(saveService);
        await session.save();

        // 初始為 G1
        assert.equals(1, session.milestoneStage);
        assert.equals(1, session.displayStage);

        // 設定頁 / 詳情頁一鍵開關專家視圖
        await session.setExpertView(true);
        assert.equals(true, session.expertView);
        assert.equals(4, session.displayStage);
        assert.equals(1, session.milestoneStage, '專家視圖僅改顯示，不提前變更實際階段');
        await session.setExpertView(false);
        assert.equals(1, session.displayStage);

        // 推進 4 季讓 4 歲幼兒滿 5 歲開蒙（SEASONS_PER_YEAR = 4）
        let unveiled = false;
        for (let i = 0; i < 4; i++) {
            const res = await session.advanceSeason();
            if (res.unveilings.length > 0) unveiled = true;
        }
        assert.isTrue(unveiled, '推進 1 年後應觸發首位子嗣開蒙');
        assert.isTrue(session.milestoneStage >= 2, '第一位子嗣開蒙後應解鎖至階段 2 以上');
        assert.isTrue(session.displayStage >= 2);
    });

    suite.test('爆發力字母等級每 10 分一級，與四段評語對齊（PROG-2-9171）', () => {
        const cases: Array<[number, string]> = [[100, 'S'], [90, 'S'], [89, 'A'], [80, 'A'], [79, 'B'], [70, 'B'], [69, 'C'], [60, 'C'], [59, 'D'], [50, 'D'], [49, 'E'], [40, 'E'], [39, 'F'], [0, 'F']];
        for (const [ep, grade] of cases) assert.equals(grade, epGradeLetter(ep), `EP ${ep} 應為 ${grade}`);
        assert.equals('良緣評語：良才美質（爆發力 B）', g1EpEstimateText('良才美質', 'B'));
    });

    return suite;
}
