/**
 * WiringBatch0513.test.ts — P0 外部呼叫端接線批次（PROG-2-0513，headless）
 *
 * 涵蓋：FUL-01（統一門檻、階段摘要、結緣文字）、FUL-02（剛解鎖差異與詳情 Presenter）、
 * BRD-03（配種服務走到受孕率公式）、MENT-11（教官支援卡不改基因與受孕率、不能配種）。
 * Unity 對照：整合 EditMode Test，從服務入口跑，不開場景。
 */
import { TestSuite, assert } from './TestRunner';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { chooseFate, unveilGeneral, UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import { checkBreedingEligibility, conceptionRate, BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { attachSupportToCards, SupportCatalog } from '../assets/scripts/core/systems/MentorSupportCatalog';
import { parseSupportCard, SupportCardDef } from '../assets/scripts/core/models/MentorSupportSchema';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import type { GeneralConfig, GeneralGeneConfig } from '../assets/scripts/core/models/GeneralUnit';
import { factorRequiredLevel, factorMaskView } from '../assets/scripts/core/systems/FactorMask';
import { factorStageSummary, factorStageText, isGeneFactorVisible, requiredDiscoveryLevel } from '../assets/scripts/core/systems/FactorVisibility';
import { FactorMaskPresenter, buildFactorMaskView, newlyUnlockedSlots } from '../assets/scripts/core/systems/FactorMaskState';

function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function gene(type: string, extra: Partial<GeneralGeneConfig> = {}): GeneralGeneConfig {
    return { type, id: `g_${type}`, displayName: `${type}因子`, isLocked: true, ...extra } as GeneralGeneConfig;
}

function breedable(id: string, extra: Record<string, unknown> = {}): BreedingGeneral {
    return {
        id, name: id, faction: 'shu', gender: id.startsWith('mom') ? '女' : '男', age: 30, hp: 1000, vitality: 200, maxVitality: 200,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, ...extra,
    } as unknown as BreedingGeneral;
}

function graphFor(ids: string[]): BloodlineGraph {
    const graph = new BloodlineGraph();
    const person = (uid: string) => ({ uid, template_id: null, name: uid, gene_refs: [] as string[], ep_base: 50, faction: 'shu', is_virtual: false });
    graph.loadFromData({ version: 't', updatedAt: 't', persons: ids.map(person), links: [] });
    return graph;
}

function supportDef(): SupportCardDef {
    const result = parseSupportCard({
        Support_ID: 'SUP_TEST_SSR_01', Name: '測試教官', Rarity: 'SSR', Teaching_Style: '槍法',
        Stat_Bonus: { STR: 8 },
        Tactic_Inspire_Events: [{ Event_ID: 'EVT_A', Tactic_ID: 'TAC_A', Trigger_Window: [1, 36], Base_Rate: 1, Min_Star: 0 }],
        Passive_Effects: [], Friendship_Bonus: [1.0, 1.1, 1.2, 1.3, 1.4, 1.5], Training_Effect: [1.0, 1.05, 1.1, 1.15, 1.2, 1.3],
        Training_Slot_Affinity: ['STR'], Slot_Burst_Rate: 0.55, Synergy_Partners: [], Source: 'Gacha', Role_Boundary: 'TeachingOnly',
    });
    if (!result.ok) throw new Error(result.errors.join('; '));
    return result.value;
}

function mentorCard(sourceGeneralId: string): MentorCard {
    const generalSnapshot = chooseFate(unveilGeneral({
        id: sourceGeneralId, name: sourceGeneralId, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30, hiddenFlags: ['mystery-phase'], genes: [],
    } as UnveilingGeneral).general, 'accept') as unknown as GeneralConfig;
    return {
        uid: `mentor-${sourceGeneralId}`, sourceGeneralId, name: sourceGeneralId, faction: 'shu',
        retiredAge: 66, retiredSeason: 4, retiredYear: 2, ep_snapshot: 80, gene_refs: [],
        parentUids: ['f', 'm'], generalSnapshot,
    } as MentorCard;
}

export function createWiringBatch0513Suite(): TestSuite {
    const suite = new TestSuite('WiringBatch0513 (P0 外部呼叫端接線 PROG-2-0513)');

    // ── FUL-01 ──────────────────────────────────────────────────────────

    suite.test('FUL-01 門檻統一：遮罩與可見性對同一因子給出相同門檻', () => {
        const cases = [
            gene('blue'), gene('green'), gene('purple'), gene('red', { discoveryLevel: 50 }),
            gene('unknown'), gene('', { discoveryLevel: 7 }),
        ];
        for (const g of cases) {
            assert.equals(requiredDiscoveryLevel(g), factorRequiredLevel(g), `${g.type} 門檻一致`);
            assert.equals(factorRequiredLevel(g), factorMaskView(g, 1).requiredLevel);
        }
    });

    suite.test('FUL-01 未知色系統一視為 Lv1：遮罩與可見性同步', () => {
        const unknown = gene('unknown');
        assert.equals(1, factorRequiredLevel(unknown));
        assert.isTrue(isGeneFactorVisible(unknown, 1));
        assert.isTrue(factorMaskView(unknown, 1).revealed);
    });

    suite.test('FUL-01 階段摘要：Lv1 只開放藍粉，Lv45 全開', () => {
        const low = factorStageSummary(1);
        assert.equals('blue,pink', low.visibleTypes.join(','));
        assert.equals('green,purple,white,red', low.lockedTypes.join(','));
        const high = factorStageSummary(45);
        assert.equals(6, high.visibleTypes.length);
        assert.equals(0, high.lockedTypes.length);
    });

    suite.test('FUL-01 結緣階段文字：由摘要產生，全開時未開放顯示「無」', () => {
        assert.equals('已開放：藍 · 粉｜未開放：綠 · 紫 · 白 · 紅', factorStageText(1));
        assert.isTrue(factorStageText(20).startsWith('已開放：藍 · 粉 · 綠 · 白'));
        assert.isTrue(factorStageText(45).endsWith('未開放：無'));
    });

    // ── FUL-02 ──────────────────────────────────────────────────────────

    suite.test('FUL-02 剛解鎖差異：前一次鎖住、這一次看見的槽位才回報', () => {
        const genes = [gene('blue'), gene('green'), gene('purple')];
        const before = genes.map((g) => buildFactorMaskView(g, 1));
        const after = genes.map((g) => buildFactorMaskView(g, 20));
        assert.equals('1', newlyUnlockedSlots(before, after).join(','), '綠因子（槽 1）剛解鎖；紫仍鎖住');
        assert.equals('', newlyUnlockedSlots(undefined, after).join(','), '首次載入不回報');
        assert.equals('', newlyUnlockedSlots(after, after).join(','), '沒變化不回報');
    });

    suite.test('FUL-02 詳情 Presenter：保存上一次 view，剛解鎖旗標只出現一次', () => {
        const presenter = new FactorMaskPresenter();
        const genes = [gene('blue'), gene('green')];
        const first = presenter.update('alpha', genes, 1);
        assert.equals('', first.justRevealed.join(','), '首次不亮起');
        const second = presenter.update('alpha', genes, 20);
        assert.equals('1', second.justRevealed.join(','), '升到 Lv20，綠因子剛解鎖');
        const third = presenter.update('alpha', genes, 20);
        assert.equals('', third.justRevealed.join(','), '同一等級不重複亮起');
    });

    suite.test('FUL-02 換人時不沿用舊狀態，避免誤判為剛解鎖', () => {
        const presenter = new FactorMaskPresenter();
        const genes = [gene('green')];
        presenter.update('alpha', genes, 1);
        const other = presenter.update('beta', genes, 20);
        assert.equals('', other.justRevealed.join(','), '換武將從頭計算');
    });

    suite.test('FUL-02 差異函式不修改輸入', () => {
        const genes = Object.freeze([gene('green')]);
        const views = Object.freeze([buildFactorMaskView(genes[0], 1)]);
        const next = [buildFactorMaskView(genes[0], 20)];
        newlyUnlockedSlots(views, next);
        assert.isTrue(views[0].locked);
    });

    // ── BRD-03 ──────────────────────────────────────────────────────────

    suite.test('BRD-03 服務入口走到受孕率公式：結果與直接算的公式一致且 ≤ 0.95', () => {
        const father = breedable('dad');
        const mother = breedable('mom', { age: 28 });
        const store = new InMemoryRosterStore([father, mother]);
        const graph = graphFor(['dad', 'mom']);
        const service = new BreedingService(store, graph, { random: () => 0.999999 });
        const result = service.breed('dad', 'mom');
        assert.isTrue(result.outcome !== 'blocked', '走的是真正的配種路徑，不是資格擋下');
        assert.isTrue(result.conceptionRate <= 0.95, '封頂 0.95');
        assert.isTrue(Math.abs(result.conceptionRate - conceptionRate(father, mother)) < 1e-9, '服務與公式結果相同');
    });

    suite.test('BRD-03 母方年齡因子生效：年長母方的受孕率較低', () => {
        const father = breedable('dad');
        const young = breedable('mom', { age: 28 });
        const old = breedable('mom', { age: 45 });
        assert.isTrue(conceptionRate(father, old) < conceptionRate(father, young));
    });

    // ── MENT-11 ─────────────────────────────────────────────────────────

    suite.test('MENT-11 教官支援卡經目錄接上後，不改子嗣基因，也不改受孕率', () => {
        const catalog: SupportCatalog = { byGeneralId: new Map([['guan', supportDef()]]), problems: [] };
        const [mentor] = attachSupportToCards([mentorCard('guan')], catalog);
        assert.isTrue(mentor.support !== undefined, '目錄接上');

        const roster = new InMemoryRosterStore([unveilChild('alpha')]);
        const nurture = new NurtureService(roster, {
            random: seeded(11),
            currentSeason: () => 3,
            currentMode: () => GameTimeMode.Nurture,
            requireNurtureMode: true,
        });
        nurture.startWithCards('alpha', [mentor]);
        const snapshot = () => {
            const child = roster.getAll()[0] as unknown as Record<string, unknown>;
            return JSON.stringify({ genes: child.genes ?? [], cha: child.cha, luk: child.luk });
        };
        const before = snapshot();
        for (let round = 0; round < 6; round++) nurture.train('alpha', 'str');
        // 受孕率讀取的是魅力、運氣、精力與年齡；培育不得改動這些欄位（教官效果只寫進訓練增量）
        assert.equals(before, snapshot(), '培育（含支援卡靈感）不改基因，也不改受孕率相關的魅力與運氣');
    });

    suite.test('MENT-11 教官卡不能進配種（配種端擋下），一般武將不受影響', () => {
        const normal = breedable('mom', { age: 28 });
        const mentorFather = { ...breedable('guan'), isMentorCard: true } as BreedingGeneral;
        const blocked = checkBreedingEligibility(mentorFather, normal);
        assert.isFalse(blocked.ok, '教官卡不能當父方');
        assert.isTrue(blocked.reasons.includes('father-mentor-card'));
        assert.isTrue(checkBreedingEligibility(breedable('dad'), normal).ok, '一般武將可以配種');
    });

    return suite;
}

function unveilChild(id: string): UnveilingGeneral {
    const raw = {
        id, name: id, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30, hiddenFlags: ['mystery-phase'], genes: [],
    } as UnveilingGeneral;
    return chooseFate(unveilGeneral(raw).general, 'accept') as UnveilingGeneral;
}
