/**
 * GeneralMind.test.ts — 武將心智 MIND-1（PROG-2-9146）
 *
 * 鎖住：事件記錄與衰減、責任歸屬規則、心情門檻、同輸入可重播、存檔來回與舊檔相容、
 * 大廳小人泡泡台詞選擇（引用過去決定）、hallStageProfile 不再永遠 NORMAL。
 *
 * Unity 對照：像替一個 Mood 系統寫的 EditMode 測試，全部純邏輯，不開場景。
 */
import { assert, TestSuite } from './TestRunner';
import { OfflineGeneralMindService } from '../assets/scripts/core/mind/OfflineGeneralMindService';
import { effectiveValence, personalityVector, ruleFor } from '../assets/scripts/core/mind/MindRules';
import { normalizeGeneralMind } from '../assets/scripts/core/mind/MindSave';
import { BARK_FAIL, BARK_IDLE, BARK_MOOD, BARK_SUCCESS, mindHash } from '../assets/scripts/core/mind/MindBarks';
import { MIND_CONFIG, intelLevelOfPercent, type MindContext, type MindGeneralView } from '../assets/scripts/core/mind/MindTypes';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService, validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const BRAVE: MindGeneralView = { id: 'zhang-fei', personality: { type: 'Brave' } };
const WISE: MindGeneralView = { id: 'zhuge', personality: { type: 'Wise' } };

function task(service: OfflineGeneralMindService, id: string, season: number, outcome: 'SUCCESS' | 'FAIL', extra: Record<string, unknown> = {}, generalIds: string[] = ['zhang-fei']) {
    return service.onTaskSettled({
        taskId: id, season, tags: ['Military', 'hebei'], label: '河北押運', risk: 3, intelLevelAtDispatch: 3,
        generalIds, delegated: false, volunteered: false, outcome, ...extra,
    });
}

function ctx(general: MindGeneralView, season: number): MindContext {
    return { general, season };
}

function member(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id.toUpperCase(), ...extra } as unknown as GeneralConfig;
}

export function createGeneralMindSuite(): TestSuite {
    const suite = new TestSuite('GeneralMind (PROG-2-9146 武將心智 MIND-1)');

    suite.test('規則表：失敗但情報不足降一級、自請而敗加重、成功自請加一', () => {
        assert.equals(-2, ruleFor({ generalId: 'a', season: 1, kind: 'TASK_DONE', outcome: 'FAIL', intelLevel: 3 }).valence);
        const noIntel = ruleFor({ generalId: 'a', season: 1, kind: 'TASK_DONE', outcome: 'FAIL', intelLevel: 1 });
        assert.equals(-1, noIntel.valence);
        assert.equals('FAIL_NO_INTEL', noIntel.reason);
        assert.equals(-3, ruleFor({ generalId: 'a', season: 1, kind: 'TASK_DONE', outcome: 'FAIL', intelLevel: 3, volunteered: true }).valence);
        assert.equals(3, ruleFor({ generalId: 'a', season: 1, kind: 'TASK_DONE', outcome: 'SUCCESS', volunteered: true }).valence);
        assert.equals(5, ruleFor({ generalId: 'a', season: 1, kind: 'PROMOTED' }).weight);
        assert.equals(3, intelLevelOfPercent(80));
        assert.equals(0, intelLevelOfPercent(10));
    });

    suite.test('衰減：同一事件隨季數遞減，里程碑不衰減', () => {
        const e = { valence: 2 as const, weight: 2 as const, season: 0 };
        const now0 = effectiveValence(e, 0);
        const now4 = effectiveValence(e, 4);
        assert.isTrue(now4 < now0 * 0.5, '4 季後剩不到一半');
        const milestone = { valence: 3 as const, weight: 5 as const, season: 0 };
        assert.equals(effectiveValence(milestone, 0), effectiveValence(milestone, 20));
    });

    suite.test('記錄事件：冪等、累計器、容量上限折入累計器不遺失統計', () => {
        const s = new OfflineGeneralMindService();
        task(s, 'm1', 1, 'FAIL');
        const dup = task(s, 'm1', 1, 'FAIL');
        assert.isTrue(dup.duplicate, '同 id 重送忽略');
        assert.lengthEquals(1, s.recentMemories('zhang-fei'));
        // 灌 60 筆一般事件：容量 40，但累計器仍記得總數
        for (let i = 0; i < 60; i++) task(s, `bulk${i}`, 2 + i, i % 3 === 0 ? 'SUCCESS' : 'FAIL');
        const save = s.snapshot();
        assert.isTrue(save.events['zhang-fei'].length <= MIND_CONFIG.normalEventCap + MIND_CONFIG.milestoneCap);
        const stat = save.ledger['zhang-fei'].byTag['hebei'];
        assert.equals(61, stat.win + stat.loss, '累計器記得全部 61 次');
        assert.equals(20, stat.win);
    });

    suite.test('心情：一敗 LOW、一勝 HIGH、連勝近期有成功 EAGER，久未出手心情下滑', () => {
        const s = new OfflineGeneralMindService();
        assert.equals('NORMAL', s.moodOf('zhang-fei', { season: 1 }));
        task(s, 'a', 1, 'FAIL');
        assert.equals('LOW', s.moodOf('zhang-fei', { season: 1 }));
        const w = new OfflineGeneralMindService();
        task(w, 'a', 1, 'SUCCESS');
        assert.equals('HIGH', w.moodOf('zhang-fei', { season: 1 }));
        task(w, 'b', 2, 'SUCCESS', { risk: 4 });
        assert.equals('EAGER', w.moodOf('zhang-fei', { season: 2 }));
        // 衰減：十季後歸 NORMAL
        assert.equals('NORMAL', w.moodOf('zhang-fei', { season: 12 }));
    });

    suite.test('心情：轉蛋名將鎖忠誠不吃忠誠修正；低忠誠才會拉低', () => {
        const s = new OfflineGeneralMindService();
        task(s, 'a', 1, 'SUCCESS');
        assert.equals('HIGH', s.moodOf('zhang-fei', { season: 1, loyalty: 10, loyaltyLocked: true }));
        assert.equals('NORMAL', s.moodOf('zhang-fei', { season: 1, loyalty: 10, loyaltyLocked: false }));
    });

    suite.test('季結算：冷落累計、同季只結算一次、離隊者清掉', () => {
        const s = new OfflineGeneralMindService();
        task(s, 'a', 1, 'SUCCESS');
        task(s, 'b', 1, 'SUCCESS', {}, ['guan-yu']);
        assert.equals(0, s.onSeasonSettle(2, Math.random, ['zhang-fei', 'guan-yu']).idleGeneralIds.length, '上一季有事件');
        s.onSeasonSettle(3, Math.random, ['zhang-fei', 'guan-yu']);
        s.onSeasonSettle(4, Math.random, ['zhang-fei']);
        const report = s.onSeasonSettle(5, Math.random, ['zhang-fei']);
        assert.isTrue(report.idleGeneralIds.includes('zhang-fei'), '連兩季沒事件算被冷落');
        assert.lengthEquals(0, s.onSeasonSettle(4, Math.random).idleGeneralIds, '同季重呼叫不重算');
        assert.lengthEquals(0, s.recentMemories('guan-yu'), '不在名單的武將記憶清掉');
        assert.equals('LOW', s.moodOf('zhang-fei', { season: 8 }), '被冷落拉低心情');
    });

    suite.test('可重播：同事件序列同 seed，台詞與心情逐字相同', () => {
        const run = () => {
            const s = new OfflineGeneralMindService();
            task(s, 'a', 1, 'FAIL');
            task(s, 'b', 2, 'SUCCESS', { label: '剿匪' });
            return [1, 2, 3, 4, 5].map(seed => s.barkFor('zhang-fei', 'LOBBY', seed, ctx(BRAVE, 2)).text).join('|') + s.moodOf('zhang-fei', { season: 2 });
        };
        assert.equals(run(), run());
        assert.equals(mindHash(7, 'a'), mindHash(7, 'a'));
    });

    suite.test('泡泡台詞：失敗引用任務名；性格決定語氣；連敗換成連敗句', () => {
        const s = new OfflineGeneralMindService();
        task(s, 'a', 1, 'FAIL');
        const lines = new Set<string>();
        for (let seed = 0; seed < 40; seed++) {
            const line = s.barkFor('zhang-fei', 'LOBBY', seed, ctx(BRAVE, 1));
            if (line.source === 'MEMORY') {
                lines.add(line.text);
                assert.isTrue(line.text.includes('河北押運'), '引用玩家派過的任務');
            }
        }
        assert.isTrue(lines.size >= 1);
        const braveTexts = BARK_FAIL.Brave.map(t => t.replace('{label}', '河北押運').replace(/\{self\}/g, '某'));
        for (const text of lines) assert.isTrue(braveTexts.includes(text), '用豪爽型模板');
        // 連失兩回
        task(s, 'b', 2, 'FAIL');
        const streak = [0, 1, 2, 3, 4, 5, 6, 7].map(seed => s.barkFor('zhang-fei', 'LOBBY', seed, ctx(BRAVE, 2))).find(l => l.source === 'STREAK');
        assert.isTrue(!!streak, '連敗有專屬句');
        assert.isTrue(streak!.text.includes('2'), '帶回數');
        // 謹慎型要情報
        const wise = new OfflineGeneralMindService();
        task(wise, 'a', 1, 'FAIL', {}, ['zhuge']);
        task(wise, 'b', 2, 'FAIL', {}, ['zhuge']);
        const cautious = [0, 1, 2, 3, 4, 5, 6, 7].map(seed => wise.barkFor('zhuge', 'LOBBY', seed, ctx(WISE, 2))).find(l => l.source === 'STREAK');
        assert.isTrue(!!cautious && cautious.text.includes('情報') || !!cautious && cautious.text.includes('虛實'));
    });

    suite.test('泡泡台詞：成功引用得意句；沒故事且心情普通回空字串；超過四季不再引用', () => {
        const s = new OfflineGeneralMindService();
        assert.equals('', s.barkFor('zhang-fei', 'LOBBY', 1, ctx(BRAVE, 1)).text, '沒事件不說');
        task(s, 'a', 1, 'SUCCESS');
        const texts = [0, 1, 2, 3, 4, 5].map(seed => s.barkFor('zhang-fei', 'LOBBY', seed, ctx(BRAVE, 1)));
        const okSet = [...BARK_SUCCESS.Brave.map(t => t.replace('{label}', '河北押運').replace(/\{self\}/g, '某')), ...BARK_MOOD.HIGH.Brave.map(t => t.replace(/\{self\}/g, '某'))];
        for (const l of texts) assert.isTrue(okSet.includes(l.text), `成功後只說得意或高昂：${l.text}`);
        assert.equals('', s.barkFor('zhang-fei', 'LOBBY', 1, ctx(BRAVE, 30)).text, '久遠記憶不引用，心情已回 NORMAL');
        assert.isTrue(BARK_IDLE.Loyal.length > 0);
    });

    suite.test('搭檔並肩三次寫入羈絆事件，台詞能說出搭檔名', () => {
        const s = new OfflineGeneralMindService();
        for (let i = 0; i < 3; i++) task(s, `t${i}`, i + 1, 'SUCCESS', {}, ['zhang-fei', 'guan-yu']);
        const bonds = s.snapshot().events['zhang-fei'].filter(e => e.kind === 'BOND_FORMED');
        assert.lengthEquals(1, bonds);
        const named = [...Array(40).keys()].map(seed => s.barkFor('zhang-fei', 'LOBBY', seed, { ...ctx(BRAVE, 3), nameOf: id => (id === 'guan-yu' ? '關羽' : undefined) }));
        assert.isTrue(named.some(l => l.source === 'BOND' && l.text.includes('關羽')) || named.some(l => l.source === 'MEMORY'), '羈絆或任務記憶擇一被說出');
    });

    suite.test('性格向量：主軸 0.6 起算，屬性只微調；缺性格由屬性推導', () => {
        const v = personalityVector({ id: 'x', personality: { type: 'Wise' }, int: 90, pol: 90 });
        assert.isTrue(v.prudent > 0.6 && v.prudent <= 0.75);
        assert.isTrue(v.bold <= 0.25);
        const derived = personalityVector({ id: 'unknown', str: 99, int: 10, cha: 10, luk: 10 });
        assert.isTrue(derived.bold > derived.prudent);
    });

    suite.test('存檔來回：snapshot→restore 台詞與心情不變；壞值與舊檔缺欄位不丟例外', () => {
        const s = new OfflineGeneralMindService();
        task(s, 'a', 1, 'FAIL');
        task(s, 'b', 2, 'SUCCESS');
        const copy = new OfflineGeneralMindService();
        copy.restore(JSON.parse(JSON.stringify(s.snapshot())));
        assert.equals(s.moodOf('zhang-fei', { season: 2 }), copy.moodOf('zhang-fei', { season: 2 }));
        assert.equals(s.barkFor('zhang-fei', 'LOBBY', 3, ctx(BRAVE, 2)).text, copy.barkFor('zhang-fei', 'LOBBY', 3, ctx(BRAVE, 2)).text);
        assert.doesNotThrow(() => copy.restore(undefined));
        assert.doesNotThrow(() => copy.restore({ v: 1, events: { a: [{ id: 5 }, null, { id: 'x', season: 1, kind: 'NOPE', valence: 1, weight: 1 }] }, ledger: 7 }));
        assert.lengthEquals(0, copy.recentMemories('a'));
        assert.equals(1, normalizeGeneralMind({ v: 2 }).v, '未知版本視為空心智');
    });

    suite.test('GameSession：hallStageProfile 心情隨經歷變化，不再永遠 NORMAL', async () => {
        const session = new GameSession(1);
        await session.addGenerals([member('a', { careerClass: 'war' })]);
        assert.equals('NORMAL', session.hallStageProfile('a')!.mood);
        session.mind.record({ generalId: 'a', season: 0, kind: 'TASK_DONE', outcome: 'SUCCESS', tags: ['x'], label: '剿匪', risk: 4 });
        session.mind.record({ generalId: 'a', season: 0, kind: 'PRAISED' });
        assert.equals('EAGER', session.hallStageProfile('a')!.mood);
        // EAGER 且標籤吻合 → 任務標記真的出現（自告奮勇復活）
        session.refreshHallSpots(0, () => 0.1, 1);
        const cast = session.hallStageCast([{ id: 't1', tags: ['war'], flags: [] }]);
        assert.equals('a', [...cast.taskMarkIds].join(','));
        // 名冊自帶 mood 欄位時仍以名冊為準（既有行為不變）
        await session.addGenerals([member('b', { mood: 'CALM' })]);
        assert.equals('CALM', session.hallStageProfile('b')!.mood);
        const bark = session.hallMindBark('a', 1);
        assert.isTrue(bark.text.length > 0 && bark.source !== 'NONE');
    });

    suite.test('GameSession：generalMind 隨存檔來回；舊檔沒有欄位可載入；空心智不寫欄位', async () => {
        const adapter = new MemoryStorageAdapter();
        const make = () => {
            const s = new GameSession();
            s.setRosterStore(new InMemoryRosterStore([]));
            s.setSaveService(new PlayerSaveService(adapter));
            s.setRandomSource(() => 0.4);
            return s;
        };
        const first = make();
        await first.addGenerals([member('a')]);
        assert.isTrue(first.createSnapshot(new Date(0)).generalMind === undefined, '空心智不寫欄位');
        first.mind.record({ generalId: 'a', season: 0, kind: 'TASK_DONE', outcome: 'FAIL', tags: ['hebei'], label: '河北押運' });
        await first.save();
        const second = make();
        assert.isTrue(await second.load());
        assert.equals('LOW', second.mind.moodOf('a'));
        assert.equals('河北押運', second.mind.recentMemories('a')[0].label);
        // 舊檔：把欄位拿掉
        const raw = await new PlayerSaveService(adapter).load();
        const legacy = { ...raw!, generalMind: undefined };
        await new PlayerSaveService(adapter).save(legacy);
        const third = make();
        assert.isTrue(await third.load());
        assert.equals('NORMAL', third.mind.moodOf('a'));
        assert.equals(undefined, validatePlayerSaveSnapshot(legacy).generalMind);
    });

    suite.test('GameSession：換季結算呼叫心智；戰後寫入出戰武將的勝敗記憶', async () => {
        const session = new GameSession(1);
        await session.addGenerals([member('a'), member('b')]);
        await session.recordBattle(['a', 'b'], 'enemy-win');
        const lead = session.mind.recentMemories('a');
        assert.equals('BATTLE_RESULT', lead[0].kind);
        assert.equals('FAIL', lead[0].outcome);
        assert.equals('LOW', session.mind.moodOf('a'));
        await session.advanceSeason(0);
        assert.isTrue(session.mind.snapshot().lastSeasonSettled >= 1, '季結算已走過');
    });

    return suite;
}
