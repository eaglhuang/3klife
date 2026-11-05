/**
 * HiddenLineage.test.ts — 隱藏血脈（PROG-2-1833）
 */
import { TestSuite, assert } from './TestRunner';
import type { GeneralConfig, GeneralGeneConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { previewAtavismSeeds } from '../assets/scripts/core/systems/BreedingSystem';
import { ITEM_ORACLE_TOKEN } from '../assets/scripts/core/systems/ItemDef';
import { hiddenGoldsOf, hiddenLineageLine } from '../assets/scripts/core/systems/PedigreeProbe';
import { BondingSetupController, type BondingSetupDeps } from '../assets/scripts/ui/core/BondingSetupController';

const gene = (id: string, extra: Partial<GeneralGeneConfig>): GeneralGeneConfig => ({ id, displayName: id, level: 3, ...extra }) as unknown as GeneralGeneConfig;
const person = (id: string, name: string, gender: string, genes: GeneralGeneConfig[] = [], peakFactors: unknown[] = []): GeneralConfig => ({ id, name, gender, age: 24, ep: 60, vitality: 100, maxVitality: 100, genes, peakFactors }) as unknown as GeneralConfig;

function rig(tokens: number, probed: { value: boolean }): { controller: BondingSetupController; calls: string[] } {
    const calls: string[] = [];
    const deps: BondingSetupDeps = {
        roster: { getAll: () => [person('f', '趙統', '男'), person('m', '表妹', '女')] },
        oracleTokens: () => tokens,
        isHiddenLineageProbed: () => probed.value,
        probeHiddenLineage: async (f, m) => { calls.push(`${f}/${m}`); probed.value = true; return true; },
        breeding: {
            checkEligibility: () => ({ ok: true, reasons: [], commonAncestorDistance: null, inbred: false }),
            previewEp: () => ({ ep: 60, rating: '中規中矩', resonance: 0, outcross: 0, compact: 0, vigor: 0, topTag: null, topTagCount: 0 }),
            breed: () => { throw new Error('unused'); },
            hiddenLineage: () => ({ fatherGolds: [gene('gold_clan_a', { displayName: '趙家學' })], motherGolds: [], childSeeds: [] }),
        } as unknown as BondingSetupDeps['breeding'],
    };
    return { controller: new BondingSetupController(deps), calls };
}

export function createHiddenLineageSuite(): TestSuite {
    const suite = new TestSuite('HiddenLineage');

    suite.test('金因子：等級不足或未覺醒才算隱藏', () => {
        const genes = [
            gene('gold_clan_low', { type: 'white', discoveryLevel: 20 }),
            gene('gold_clan_shown', { type: 'white', discoveryLevel: 1 }),
            gene('gold_clan_sealed', { type: 'white', discoveryLevel: 1, isLocked: true }),
            gene('factor-blue', { type: 'blue', discoveryLevel: 99 }),
        ];
        assert.equals('gold_clan_low,gold_clan_sealed', hiddenGoldsOf(genes, 5).map((item) => item.id).join(','));
        assert.equals('gold_clan_sealed', hiddenGoldsOf(genes, 50).map((item) => item.id).join(','));
        assert.lengthEquals(0, hiddenGoldsOf(undefined, 5));
    });

    suite.test('報告句：有內容與全無', () => {
        const line = hiddenLineageLine({
            fatherGolds: [gene('a', { displayName: '趙家學' })],
            motherGolds: [],
            childSeeds: [{ gene: gene('b', { displayName: '勇烈', level: 4 }), ancestorName: '甲祖' }],
        });
        assert.equals('隱藏血脈：金因子 父 趙家學／母 無｜子嗣隔代種子 勇烈 4★（甲祖）', line);
        assert.equals('隱藏血脈：金因子 父 無／母 無｜子嗣隔代種子 無', hiddenLineageLine({ fatherGolds: [], motherGolds: [], childSeeds: [] }));
    });

    suite.test('子嗣種子預覽：父親記著的高星因子，雙親都斷代才算', () => {
        const brave = gene('factor-brave', { displayName: '勇烈', level: 3 });
        const graph = new BloodlineGraph();
        const peak = { gene: brave, ancestorName: '老祖' };
        const lost = previewAtavismSeeds({ father: person('f', '父', '男', [], [peak]) as never, mother: person('m', '母', '女') as never, pedigree: graph });
        assert.equals('老祖', lost[0]?.ancestorName);
        const kept = previewAtavismSeeds({ father: person('f', '父', '男', [gene('factor-brave', { level: 2 })], [peak]) as never, mother: person('m', '母', '女') as never, pedigree: graph });
        assert.lengthEquals(0, kept);
    });

    suite.test('查前：看不到內容，券不足不能按', () => {
        assert.isFalse(rig(1, { value: false }).controller.getView().enabled.btnProbeHidden);
        const view = rig(2, { value: false }).controller.getView();
        assert.equals('隱藏血脈（2 券）', view.texts.probeHiddenLabel);
        assert.equals('', view.texts.hiddenLineageLine);
        assert.isTrue(view.enabled.btnProbeHidden);
    });

    suite.test('查後：顯示內容，不能再按', async () => {
        const probed = { value: false };
        const { controller, calls } = rig(2, probed);
        assert.isTrue(await controller.probeHiddenLineage());
        assert.equals('f/m', calls[0]);
        const view = controller.getView();
        assert.equals('已查隱藏血脈', view.texts.probeHiddenLabel);
        assert.equals('隱藏血脈：金因子 父 趙家學／母 無｜子嗣隔代種子 無', view.texts.hiddenLineageLine);
        assert.isFalse(view.enabled.btnProbeHidden);
    });

    suite.test('Session：扣 2 券，同一對不重複收，與譜牒密考分開算', async () => {
        const session = new GameSession();
        session.startNewGame();
        const before = session.itemCount(ITEM_ORACLE_TOKEN);
        assert.isTrue(before >= 2);
        assert.isTrue(await session.probeHiddenLineage('f', 'm'));
        assert.equals(before - 2, session.itemCount(ITEM_ORACLE_TOKEN));
        assert.isTrue(await session.probeHiddenLineage('f', 'm'));
        assert.equals(before - 2, session.itemCount(ITEM_ORACLE_TOKEN));
        assert.isFalse(session.isPedigreeProbed('f', 'm'));
        for (let i = session.itemCount(ITEM_ORACLE_TOKEN); i > 1; i--) await session.probePedigree(`f${i}`, 'm');
        assert.equals(1, session.itemCount(ITEM_ORACLE_TOKEN));
        assert.isFalse(await session.probeHiddenLineage('g', 'm'));
        assert.isFalse(session.isHiddenLineageProbed('g', 'm'));
    });

    return suite;
}
