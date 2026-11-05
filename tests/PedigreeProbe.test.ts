/**
 * PedigreeProbe.test.ts — 譜牒密考（PROG-2-1832）
 */
import { TestSuite, assert } from './TestRunner';
import type { GeneralConfig, GeneralGeneConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { ITEM_ORACLE_TOKEN } from '../assets/scripts/core/systems/ItemDef';
import { normalizePedigreeProbes, pedigreeProbeKey, pedigreeProbeLine } from '../assets/scripts/core/systems/PedigreeProbe';
import { BondingSetupController, type BondingSetupDeps } from '../assets/scripts/ui/core/BondingSetupController';

const person = (id: string, name: string, gender: string): GeneralConfig => ({ id, name, gender, age: 24, ep: 60, vitality: 100, maxVitality: 100, genes: [] }) as unknown as GeneralConfig;
const brave = { id: 'factor-brave', displayName: '勇烈' } as unknown as GeneralGeneConfig;

function rig(tokens: number, probed: { value: boolean }): { controller: BondingSetupController; calls: string[] } {
    const calls: string[] = [];
    const deps: BondingSetupDeps = {
        roster: { getAll: () => [person('f', '趙統', '男'), person('m', '表妹', '女')] },
        oracleTokens: () => tokens,
        isPedigreeProbed: () => probed.value,
        probePedigree: async (f, m) => { calls.push(`${f}/${m}`); probed.value = true; return true; },
        breeding: {
            checkEligibility: () => ({ ok: true, reasons: [], commonAncestorDistance: 2, inbred: true }),
            previewEp: () => ({ ep: 60, rating: '中規中矩', resonance: 0, outcross: 0, compact: 0, vigor: 0, topTag: null, topTagCount: 0 }),
            breed: () => { throw new Error('unused'); },
            diversityOf: () => 0.5,
            kinPurificationTargets: () => [],
            pedigreeProbe: () => ({ diversity: 0.5, ancestorNames: ['甲祖'], targets: [], fatherFatigue: 1, motherFatigue: 0 }),
        } as unknown as BondingSetupDeps['breeding'],
    };
    return { controller: new BondingSetupController(deps), calls };
}

export function createPedigreeProbeSuite(): TestSuite {
    const suite = new TestSuite('PedigreeProbe');

    suite.test('報告句列出精確值與隱藏因子', () => {
        const line = pedigreeProbeLine({ diversity: 0.5, ancestorNames: ['甲祖', '乙祖母'], targets: [{ gene: brave, ancestorName: '甲祖' }], fatherFatigue: 1, motherFatigue: 0 });
        assert.equals('譜牒密考：多樣性 0.50｜共祖 甲祖、乙祖母｜可純化 勇烈（甲祖）｜血脈疲勞 父 1／母 0', line);
    });

    suite.test('報告句：外婚時寫無', () => {
        const line = pedigreeProbeLine({ diversity: 1, ancestorNames: [], targets: [], fatherFatigue: 0, motherFatigue: 0 });
        assert.equals('譜牒密考：多樣性 1.00｜共祖 無｜可純化 無｜血脈疲勞 父 0／母 0', line);
    });

    suite.test('報告句：共祖太多時只列前 6 位', () => {
        const ancestorNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const line = pedigreeProbeLine({ diversity: 0, ancestorNames, targets: [], fatherFatigue: 0, motherFatigue: 0 });
        assert.isTrue(line.indexOf('共祖 a、b、c、d、e、f 等 8 位｜') >= 0);
    });

    suite.test('讀檔整理：舊檔與壞資料', () => {
        assert.lengthEquals(0, normalizePedigreeProbes(undefined));
        assert.equals('a__b', normalizePedigreeProbes(['a__b', 3])[0]);
    });

    suite.test('密考前：不給精確多樣性，有券才能按', () => {
        const view = rig(1, { value: false }).controller.getView();
        assert.equals('譜牒密考（1 券）', view.texts.probePedigreeLabel);
        assert.equals('', view.texts.pedigreeProbeLine);
        assert.isTrue(view.enabled.btnProbePedigree);
        assert.isTrue(view.texts.inbreedingLabel.indexOf('多樣性受損') >= 0);
        assert.isTrue(view.texts.inbreedingLabel.indexOf('0.50') < 0);
        assert.isFalse(rig(0, { value: false }).controller.getView().enabled.btnProbePedigree);
    });

    suite.test('密考後：顯示結果，按鈕鎖住', async () => {
        const probed = { value: false };
        const { controller, calls } = rig(1, probed);
        assert.isTrue(await controller.probePedigree());
        assert.equals('f/m', calls[0]);
        const view = controller.getView();
        assert.equals('已密考', view.texts.probePedigreeLabel);
        assert.isFalse(view.enabled.btnProbePedigree);
        assert.isTrue(view.texts.pedigreeProbeLine.indexOf('多樣性 0.50') >= 0);
    });

    suite.test('GameSession：扣券一次，同一對不重收，不累計占卜次數', async () => {
        const session = new GameSession();
        session.startNewGame();
        const before = session.itemCount(ITEM_ORACLE_TOKEN);
        const count = session.oracleCount;
        assert.isTrue(before >= 1);
        assert.isTrue(await session.probePedigree('f', 'm'));
        assert.equals(before - 1, session.itemCount(ITEM_ORACLE_TOKEN));
        assert.isTrue(session.isPedigreeProbed('f', 'm'));
        assert.isFalse(session.isPedigreeProbed('f', 'other'));
        assert.isTrue(await session.probePedigree('f', 'm'));
        assert.equals(before - 1, session.itemCount(ITEM_ORACLE_TOKEN));
        assert.equals(count, session.oracleCount);
    });

    suite.test('GameSession：券不足時不記錄', async () => {
        const session = new GameSession();
        session.startNewGame();
        for (let i = session.itemCount(ITEM_ORACLE_TOKEN); i > 0; i--) await session.probePedigree(`f${i}`, 'm');
        assert.equals(0, session.itemCount(ITEM_ORACLE_TOKEN));
        assert.isFalse(await session.probePedigree('late', 'm'));
        assert.isFalse(session.isPedigreeProbed('late', 'm'));
        assert.equals('late__m', pedigreeProbeKey('late', 'm'));
    });

    return suite;
}
