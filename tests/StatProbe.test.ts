/**
 * StatProbe.test.ts — 單維細查（PROG-2-1834）
 */
import { TestSuite, assert } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { ITEM_ORACLE_TOKEN } from '../assets/scripts/core/systems/ItemDef';
import type { RumorStatKey } from '../assets/scripts/core/systems/MatchRumor';
import { normalizePedigreeProbes, statBoxLabel, statProbeKey, statProbeLine } from '../assets/scripts/core/systems/PedigreeProbe';
import { BondingSetupController, type BondingSetupDeps } from '../assets/scripts/ui/core/BondingSetupController';

const person = (id: string, name: string, gender: string, str: number, int: number): GeneralConfig => ({ id, name, gender, age: 24, ep: 60, vitality: 100, maxVitality: 100, genes: [], str, int }) as unknown as GeneralConfig;

function rig(tokens: number, probed: Set<string>): { controller: BondingSetupController; calls: string[] } {
    const calls: string[] = [];
    const deps: BondingSetupDeps = {
        roster: { getAll: () => [person('f', '趙統', '男', 83, 41), person('m', '表妹', '女', 60, 95)] },
        oracleTokens: () => tokens,
        isStatProbed: (id: string, stat: RumorStatKey) => probed.has(statProbeKey(id, stat)),
        probeStat: async (id: string, stat: RumorStatKey) => { calls.push(statProbeKey(id, stat)); probed.add(statProbeKey(id, stat)); return true; },
        breeding: {
            checkEligibility: () => ({ ok: true, reasons: [], commonAncestorDistance: null, inbred: false }),
            previewEp: () => ({ ep: 60, rating: '中規中矩', resonance: 0, outcross: 0, compact: 0, vigor: 0, topTag: null, topTagCount: 0 }),
            breed: () => { throw new Error('unused'); },
        } as unknown as BondingSetupDeps['breeding'],
    };
    return { controller: new BondingSetupController(deps), calls };
}

export function createStatProbeSuite(): TestSuite {
    const suite = new TestSuite('StatProbe');

    suite.test('細箱：寬 5，含邊界', () => {
        assert.equals('80–84', statBoxLabel(80));
        assert.equals('80–84', statBoxLabel(84));
        assert.equals('85–89', statBoxLabel(85));
        assert.equals('0–4', statBoxLabel(0));
    });

    suite.test('結果句：未查不露值', () => {
        const line = statProbeLine('str', { name: '趙統', stats: { str: 83 }, probed: true }, { name: '表妹', stats: { str: 60 }, probed: false });
        assert.equals('武骨細箱：趙統 80–84｜表妹 未查', line);
    });

    suite.test('查前：兩邊都未查，券不足不能按', () => {
        const none = rig(0, new Set()).controller.getView();
        assert.isFalse(none.enabled.btnProbeFatherStat);
        assert.isFalse(none.enabled.btnProbeMotherStat);
        const view = rig(1, new Set()).controller.getView();
        assert.equals('細查維度：武骨', view.texts.cycleProbeStatLabel);
        assert.equals('細查（1 券）', view.texts.probeFatherStatLabel);
        assert.equals('武骨細箱：趙統 未查｜表妹 未查', view.texts.statProbeLine);
        assert.isTrue(view.enabled.btnProbeFatherStat);
    });

    suite.test('查一邊只露一邊；換維度要重查', async () => {
        const { controller, calls } = rig(3, new Set());
        assert.isTrue(await controller.probeStat('father'));
        assert.equals('f__str', calls[0]);
        const view = controller.getView();
        assert.equals('武骨細箱：趙統 80–84｜表妹 未查', view.texts.statProbeLine);
        assert.equals('已細查', view.texts.probeFatherStatLabel);
        assert.isFalse(view.enabled.btnProbeFatherStat);
        assert.isTrue(view.enabled.btnProbeMotherStat);
        controller.cycleProbeStat();
        const next = controller.getView();
        assert.equals('細查維度：才思', next.texts.cycleProbeStatLabel);
        assert.equals('才思細箱：趙統 未查｜表妹 未查', next.texts.statProbeLine);
        assert.isTrue(next.enabled.btnProbeFatherStat);
    });

    suite.test('維度循環一輪回到第一項', () => {
        const { controller } = rig(1, new Set());
        for (let i = 0; i < 5; i++) controller.cycleProbeStat();
        assert.equals('細查維度：武骨', controller.getView().texts.cycleProbeStatLabel);
    });

    suite.test('Session：扣 1 券，同人同維不重複收，換維另收', async () => {
        const session = new GameSession();
        session.startNewGame();
        const before = session.itemCount(ITEM_ORACLE_TOKEN);
        assert.isTrue(before >= 2);
        assert.isTrue(await session.probeStat('f', 'str'));
        assert.isTrue(await session.probeStat('f', 'str'));
        assert.equals(before - 1, session.itemCount(ITEM_ORACLE_TOKEN));
        assert.isFalse(session.isStatProbed('f', 'int'));
        assert.isTrue(await session.probeStat('f', 'int'));
        assert.equals(before - 2, session.itemCount(ITEM_ORACLE_TOKEN));
        for (let i = session.itemCount(ITEM_ORACLE_TOKEN); i > 0; i--) await session.probeStat(`g${i}`, 'str');
        assert.isFalse(await session.probeStat('late', 'str'));
        assert.isFalse(session.isStatProbed('late', 'str'));
    });

    suite.test('讀檔整理：舊檔沒有此欄位', () => {
        assert.lengthEquals(0, normalizePedigreeProbes(undefined));
    });

    return suite;
}
