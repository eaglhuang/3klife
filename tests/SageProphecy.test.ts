/**
 * SageProphecy.test.ts — 結緣前預言子嗣與名士解鎖（PROG-2-0054，headless）
 *
 * 驗證：父母祖譜因子池的進池機率、名士預言的準確 / 扭曲分支與偏好加權、
 * 名士依累計占卜次數解鎖、GameSession 扣求籤令與存檔往返，以及 SageOracleController 的預言畫面。
 *
 * Unity 對照：EditMode Test 直接呼叫純 C# 規則與 Presenter，不開 Scene。
 */
import { TestSuite, assert } from './TestRunner';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import type { FactorPoolEntry } from '../assets/scripts/core/systems/BreedingSystem';
import { buildFactorDictionary, FactorDictionary, resolveFactorColor } from '../assets/scripts/core/systems/FactorInheritance';
import { isSageUnlocked, predictOffspring, ProphecyKeywordSource } from '../assets/scripts/core/systems/SageDivination';
import { ITEM_ORACLE_TOKEN } from '../assets/scripts/core/systems/PlayerInventory';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService, validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { ORACLE_CONFLICT_TEXT, SageOracleController } from '../assets/scripts/ui/core/SageOracleController';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

/** 依序回傳給定值的亂數；用完後停在最後一個值 */
function seq(...values: number[]): () => number {
    let n = 0;
    return () => values[Math.min(n++, values.length - 1)];
}

function person(id: string, gender: '男' | '女', genes: GeneralConfig['genes'] = []): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender, age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 70, int: 70, lea: 70, pol: 60, cha: 60, luk: 40,
        genes,
    } as unknown as GeneralConfig;
}

const POOL: FactorPoolEntry[] = [
    { id: 'gene_command', color: 'blue', chance: 1, displayName: '號令' },
    { id: 'gene_strategy', color: 'green', chance: 0.5, displayName: '權謀' },
];

function loadDictionary(): FactorDictionary {
    return buildFactorDictionary(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/master/gene-dictionary.json'), 'utf8')));
}

function keywordSources(dictionary: FactorDictionary): ProphecyKeywordSource[] {
    const out: ProphecyKeywordSource[] = [];
    for (const def of dictionary.values()) {
        const color = resolveFactorColor(def.id, dictionary);
        if (color) out.push({ id: def.id, color, displayName: def.displayName });
    }
    return out;
}

function makeSession(random: () => number, generals: GeneralConfig[] = [person('dad', '男'), person('mom', '女')]): GameSession {
    const session = new GameSession(7);
    session.setRosterStore(new InMemoryRosterStore(generals));
    session.setRandomSource(random);
    session.setFactorDictionary(loadDictionary());
    return session;
}

export function createSageProphecySuite(): TestSuite {
    const suite = new TestSuite('SageProphecy (預言子嗣 / 名士解鎖)');

    suite.test('因子池預覽：父母 100%，祖父母兩位都帶同因子 → 1 − 0.5 × 0.5 = 75%', () => {
        const graph = new BloodlineGraph();
        const node = (uid: string, gene_refs: string[] = []) => ({ uid, template_id: null, name: uid, gene_refs, ep_base: 50, faction: 'shu', is_virtual: false });
        graph.loadFromData({
            version: 't',
            updatedAt: 't',
            persons: [node('gf', ['gene_command']), node('gm', ['gene_command']), node('dad'), node('mom')],
            links: [
                { child_uid: 'dad', parent_uid: 'gf', relation: 'F', generation: 1 },
                { child_uid: 'dad', parent_uid: 'gm', relation: 'M', generation: 1 },
            ],
        });
        const store = new InMemoryRosterStore([
            person('dad', '男', [{ id: 'gene_strategy', type: 'green' }]),
            person('mom', '女', [{ id: 'gene_naval', type: 'pink' }]),
        ]);
        const service = new BreedingService(store, graph, { random: () => 0, dictionary: loadDictionary() });
        const pool = service.previewFactorPool('dad', 'mom');
        assert.equals('gene_naval:1,gene_strategy:1,gene_command:0.75', pool.map((e) => `${e.id}:${e.chance}`).join(','));
        assert.equals('號令', pool[2].displayName);
        assert.equals(2, store.getAll().length, '預覽不改名冊');
    });

    suite.test('預言：Random 0.10 ≤ 諸葛亮 85% → 合理預言，依偏好加權抽中藍色', () => {
        const result = predictOffspring(POOL, 'zhuge-liang', seq(0.1, 0));
        assert.equals('predicted', result.outcome);
        assert.isTrue(result.consumed);
        assert.equals('blue', result.prophecy!.color);
        assert.equals('號令', result.prophecy!.keyword);
        assert.isFalse(result.prophecy!.isDistorted);
    });

    suite.test('預言：偏好權重 = 進池機率 × 3；藍 3、綠 0.5，第二顆骰落在尾段才抽到綠色', () => {
        // 總權重 3.5；0.99 × 3.5 = 3.465 > 3 → 綠色
        const green = predictOffspring(POOL, 'zhuge-liang', seq(0.1, 0.99));
        assert.equals('gene_strategy', green.prophecy!.factorId);
        // 0.85 × 3.5 = 2.975 < 3 → 仍是藍色
        const blue = predictOffspring(POOL, 'zhuge-liang', seq(0.1, 0.85));
        assert.equals('gene_command', blue.prophecy!.factorId);
    });

    suite.test('預言：Random 0.90 > 85% → 扭曲，色彩改向且關鍵詞換成池外的誘餌因子', () => {
        const sources = keywordSources(loadDictionary());
        // 抽中綠色 → 諸葛亮偏見拉向藍色；號令在池內，誘餌改用字典裡同色的另一個因子
        const biased = predictOffspring(POOL, 'zhuge-liang', seq(0.9, 0.99), sources);
        assert.equals('predicted', biased.outcome);
        assert.isTrue(biased.prophecy!.isDistorted);
        assert.equals('blue', biased.prophecy!.color);
        assert.equals('gene_politics', biased.prophecy!.factorId, '治世的 category 歸藍色');
        assert.equals('治世', biased.prophecy!.keyword);

        // 抽中藍色、偏好也是藍 → 改用六色順序的下一色（粉）
        const next = predictOffspring(POOL, 'zhuge-liang', seq(0.9, 0), sources);
        assert.equals('pink', next.prophecy!.color);
        assert.equals('騎軍適性', next.prophecy!.keyword, '字典順序第一個粉色因子');

        // 沒有字典時不給關鍵詞，但仍算一次預言
        const bare = predictOffspring(POOL, 'sima-hui', seq(0.9, 0));
        assert.equals('pink', bare.prophecy!.color);
        assert.equals(null, bare.prophecy!.keyword);
        assert.isTrue(bare.consumed);
    });

    suite.test('預言：沒有可預言的因子或名士不存在時不擲骰', () => {
        let calls = 0;
        const counting = () => { calls++; return 0; };
        assert.equals('no-candidate', predictOffspring([], 'zhuge-liang', counting).outcome);
        assert.equals('no-candidate', predictOffspring([{ id: 'x', color: 'red', chance: 0 }], 'hua-tuo', counting).outcome);
        assert.equals('no-such-sage', predictOffspring(POOL, 'cao-cao', counting).outcome);
        assert.equals(0, calls);
    });

    suite.test('名士解鎖：龐統累計 50 次、左慈 100 次，其餘一開始可用', () => {
        assert.isTrue(isSageUnlocked('zhuge-liang', 0));
        assert.isTrue(isSageUnlocked('sima-hui', 0));
        assert.isFalse(isSageUnlocked('pang-tong', 49));
        assert.isTrue(isSageUnlocked('pang-tong', 50));
        assert.isFalse(isSageUnlocked('zuo-ci', 99));
        assert.isTrue(isSageUnlocked('zuo-ci', 100));
        assert.isFalse(isSageUnlocked('cao-cao', 999));
    });

    suite.test('GameSession：預言扣 1 張求籤令並累計次數；未解鎖或沒令牌都不扣', async () => {
        const session = makeSession(seq(0.1, 0));
        const locked = await session.predictOffspring(POOL, 'pang-tong');
        assert.equals('sage-locked', locked.outcome);
        assert.equals(3, session.itemCount(ITEM_ORACLE_TOKEN));
        assert.equals(0, session.oracleCount);

        const hit = await session.predictOffspring(POOL, 'zhuge-liang');
        assert.equals('predicted', hit.outcome);
        assert.equals(2, session.itemCount(ITEM_ORACLE_TOKEN));
        assert.equals(1, session.oracleCount);

        const divined = await session.divineFactor('dad', 'zhuge-liang');
        assert.equals('no-candidate', divined.outcome, '沒有鎖定因子不算一次占卜');
        assert.equals(1, session.oracleCount);

        await session.predictOffspring(POOL, 'zhuge-liang');
        await session.predictOffspring(POOL, 'zhuge-liang');
        const broke = await session.predictOffspring(POOL, 'zhuge-liang');
        assert.equals('no-token', broke.outcome);
        assert.equals(3, session.oracleCount);
    });

    suite.test('存檔往返保存累計占卜次數；舊存檔補 0；存到 50 次後龐統解鎖', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = makeSession(seq(0.1, 0));
        session.setSaveService(new PlayerSaveService(adapter));
        await session.predictOffspring(POOL, 'zhuge-liang');

        const reloaded = makeSession(seq(0));
        reloaded.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await reloaded.load());
        assert.equals(1, reloaded.oracleCount);
        assert.isFalse(reloaded.isSageUnlocked('pang-tong'));

        const legacy = validatePlayerSaveSnapshot({ ...reloaded.createSnapshot(), oracleCount: undefined });
        assert.equals(0, legacy.oracleCount);

        await new PlayerSaveService(adapter).save({ ...reloaded.createSnapshot(), oracleCount: 50 });
        assert.isTrue(await reloaded.load());
        assert.isTrue(reloaded.isSageUnlocked('pang-tong'));
        assert.isFalse(reloaded.isSageUnlocked('zuo-ci'));
    });

    suite.test('畫面：帶入父母才能預言；批語含色彩傾向與關鍵詞，不顯示是否扭曲', async () => {
        const session = makeSession(seq(0.1, 0));
        const breeding = { previewFactorPool: () => POOL };
        const flow = new SageOracleController({ roster: { getAll: () => session.roster }, session, breeding });

        flow.open('dad');
        let view = flow.getView();
        assert.isFalse(view.enabled.btnPredict, '沒有帶入父母');
        assert.equals('從結緣畫面選好父母後，可請名士預言子嗣', view.texts.coupleLabel);
        assert.isTrue(view.actives.oracleEmptyHint, '名冊沒有鎖定因子、也沒有父母 → 空畫面');

        flow.open('dad', { fatherId: 'dad', motherId: 'mom' });
        view = flow.getView();
        assert.isTrue(view.actives.oraclePanel);
        assert.isTrue(view.enabled.btnPredict);
        assert.equals('預言子嗣：dad × mom（批語未必準確）', view.texts.coupleLabel);

        const result = await flow.predict();
        assert.equals('predicted', result!.outcome);
        const notice = flow.getView().texts.oracleNotice;
        assert.isTrue(notice.startsWith('諸葛亮：『'), notice);
        assert.isTrue(notice.includes('色彩傾向：'), notice);
        assert.isTrue(notice.includes('關鍵詞：號令'), notice);
        assert.isFalse(/扭曲|準確/.test(notice.replace('（批語未必準確）', '')), notice);
        assert.equals('求籤令 ×2', flow.getView().texts.tokenLabel);

        const noBreeding = new SageOracleController({ roster: { getAll: () => session.roster }, session });
        noBreeding.open(null, { fatherId: 'dad', motherId: 'mom' });
        assert.isFalse(noBreeding.getView().enabled.btnPredict);
        assert.equals(null, await noBreeding.predict());
    });

    suite.test('畫面：兩位名士色彩傾向不同 → 提示意見相左', async () => {
        // 諸葛亮 (0.1, 0) → 藍；華佗 (0.1, 0.99) → 權重藍 1、綠 0.5，抽到綠
        const session = makeSession(seq(0.1, 0, 0.1, 0.99));
        const flow = new SageOracleController({ roster: { getAll: () => session.roster }, session, breeding: { previewFactorPool: () => POOL } });
        flow.open(null, { fatherId: 'dad', motherId: 'mom' });
        await flow.predict();
        assert.isFalse(flow.getView().texts.oracleNotice.includes(ORACLE_CONFLICT_TEXT));

        flow.cycleSage(2); // 華佗
        assert.equals('華佗', flow.getView().texts.sageName);
        await flow.predict();
        const notice = flow.getView().texts.oracleNotice;
        assert.isTrue(notice.includes('色彩傾向：'), notice);
        assert.isTrue(notice.endsWith(ORACLE_CONFLICT_TEXT), notice);
    });

    suite.test('畫面：未解鎖的名士顯示解鎖條件，占卜與預言都不能按', async () => {
        const session = makeSession(seq(0.1, 0), [person('dad', '男'), person('mom', '女'), person('liu', '男', [{ id: 'gene_command', type: 'blue', isLocked: true, discoveryLevel: 1 }])]);
        const flow = new SageOracleController({ roster: { getAll: () => session.roster }, session, breeding: { previewFactorPool: () => POOL } });
        flow.open('liu', { fatherId: 'dad', motherId: 'mom' });
        flow.cycleSage(1); // 龐統
        const view = flow.getView();
        assert.equals('龐統（未解鎖）', view.texts.sageName);
        assert.equals('此名士尚未解鎖（需累計占卜 50 次，目前 0 次）', view.texts.sageInfo);
        assert.equals(view.texts.sageInfo, view.texts.costLabel);
        assert.isFalse(view.enabled.btnDivine);
        assert.isFalse(view.enabled.btnPredict);

        const result = await flow.predict();
        assert.equals('sage-locked', result!.outcome);
        assert.equals('龐統尚未解鎖', flow.getView().texts.oracleNotice);
        assert.equals(3, session.itemCount(ITEM_ORACLE_TOKEN));
    });

    suite.test('LobbyScene 接線：預言按鈕綁定、結緣畫面帶入父母、傳入 breeding', () => {
        const lobby = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes("buttonId: 'btnPredict'"));
        assert.isTrue(lobby.includes('this._oracle.open(preferredTargetId, couple)'));
        assert.isTrue(/new SageOracleController\(\{[\s\S]*?breeding: services\(\)\.breeding/.test(lobby));
    });

    return suite;
}
