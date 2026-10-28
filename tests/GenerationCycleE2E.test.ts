/**
 * GenerationCycleE2E — 兩代養成循環整合（QA，PROG-2-0697）
 * 結緣 → 子嗣 5 歲開獎 → 培育畢業 → 長大成人後與另一位結緣 → 孫輩出生 → 第一代退役傳承；每個階段存讀檔後續跑。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { TRAINING_KINDS } from '../assets/scripts/core/systems/NurtureSystem';
import { DEFAULT_SEASON_MODIFIERS, setActiveSeasonModifiers } from '../assets/scripts/core/systems/SeasonModifiers';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import { buildWorld, person, type World } from './MvpMainFlowE2E.test';

function find(w: World, id: string): GeneralConfig | undefined {
    return w.store.getAll().find((g) => g.id === id);
}

/** 存檔後用新 Session 讀回，回傳同一份名冊上的新世界（模擬關遊戲重開） */
async function reopen(w: World, adapter: MemoryStorageAdapter): Promise<World> {
    await w.session.save();
    const next = buildWorld(adapter, []);
    assert.isTrue(await next.session.load(), '讀檔成功');
    next.breeding.syncGraphFromRoster(); // 正式環境由 ServiceLoader 在讀檔後呼叫
    return next;
}

export function createGenerationCycleE2ESuite(): TestSuite {
    const suite = new TestSuite('GenerationCycleE2E (兩代養成循環 PROG-2-0697)');

    suite.test('結緣→開獎→培育畢業→長大結緣生孫→長輩退役，每階段存讀檔後續跑', async () => {
        setActiveSeasonModifiers(DEFAULT_SEASON_MODIFIERS);
        const adapter = new MemoryStorageAdapter();
        let w = buildWorld(adapter, [person('hero', '男', 30), person('lady', '女', 28), person('mate', '女', 20), person('mate-m', '男', 20)]);
        w.session.startNewGame(20261027);

        // 第一代結緣，存讀檔
        const bred = w.breeding.breed('hero', 'lady');
        assert.equals('conceived', bred.outcome);
        const childId = bred.child!.id;
        w = await reopen(w, adapter);
        assert.isTrue(!!find(w, childId), '讀檔後子嗣仍在名冊');

        // 長到 5 歲開獎
        let guard = 0;
        while (!(find(w, childId) as UnveilingGeneral).fate && guard++ < 40) await w.session.advanceSeason();
        assert.isTrue(!!(find(w, childId) as UnveilingGeneral).fate, '開獎');
        w.unveiling.choose(childId, 'accept');
        w = await reopen(w, adapter);
        assert.isTrue(!!(find(w, childId) as UnveilingGeneral).fate?.choice, '宿命選擇存讀檔後保留');

        // 培育畢業
        guard = 0;
        while (w.session.gameTime.currentMode !== GameTimeMode.Nurture && guard++ < 6) await w.session.advanceSeason();
        w.nurture.start(childId);
        let current = w.nurture.getSession(childId)!;
        let rounds = 0;
        while (current.status === 'active' && rounds++ < 80) {
            const action = current.vigor < 45 ? 'rest' : TRAINING_KINDS[current.round % TRAINING_KINDS.length];
            current = w.nurture.train(childId, action).session;
        }
        assert.equals('completed', current.status);
        w.nurture.graduate(childId);
        w = await reopen(w, adapter);
        assert.isTrue(!!(find(w, childId) as GeneralConfig & { graduationRating?: string }).graduationRating, '畢業評價存讀檔後保留');

        // 長大成人（途中關遊戲重開一次），與另一位結緣生下孫輩
        const child = find(w, childId) as GeneralConfig;
        const spouseId = child.gender === '男' ? 'mate' : 'mate-m';
        guard = 0;
        let reopened = false;
        while (((find(w, childId) as GeneralConfig).age ?? 0) < 20 && guard++ < 120) {
            await w.session.advanceSeason();
            if (!reopened && guard === 20) { w = await reopen(w, adapter); reopened = true; }
        }
        assert.isTrue(((find(w, childId) as GeneralConfig).age ?? 0) >= 20, '子嗣長大成人');
        const [fatherId, motherId] = (find(w, childId) as GeneralConfig).gender === '男' ? [childId, spouseId] : [spouseId, childId];
        const second = w.breeding.breed(fatherId, motherId);
        assert.equals('conceived', second.outcome, '第二代結緣');
        const grandId = second.child!.id;
        w = await reopen(w, adapter);
        const grand = find(w, grandId) as GeneralConfig & { fatherId?: string; motherId?: string };
        assert.isTrue(!!grand, '孫輩存讀檔後在名冊');
        assert.equals(childId, grand.fatherId === childId ? grand.fatherId : grand.motherId, '孫輩的父母是子嗣');
        const chain = (grand as GeneralConfig & { ancestor_chain?: string[] }).ancestor_chain ?? [];
        assert.isTrue(chain.includes('hero') && chain.includes('lady'), `孫輩祖譜應含第一代 hero、lady：${chain.join(',')}`);
        assert.isTrue((grand.genes ?? []).some((g) => g.id === 'gene_command' && (g.level ?? 0) >= 3), '祖輩的藍色因子傳到孫輩且至少 3 星');

        // 第一代長輩滿 65 歲退役成教官卡，存讀檔後教官卡與孫輩都在
        guard = 0;
        while (((find(w, 'hero') as GeneralConfig).age ?? 0) < 65 && guard++ < 200) await w.session.advanceSeason();
        assert.isTrue(((find(w, 'hero') as GeneralConfig).age ?? 0) >= 65, '祖父年滿 65');
        const card = await w.session.retireGeneral('hero');
        assert.equals('hero', card.sourceGeneralId);
        w = await reopen(w, adapter);
        assert.equals(1, (await w.legacy.getMentorCards()).length, '教官卡存讀檔後仍在');
        assert.isTrue(!!find(w, grandId), '孫輩仍在名冊');
    });

    return suite;
}
