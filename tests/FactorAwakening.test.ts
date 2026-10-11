/**
 * FactorAwakening.test.ts — 因子覺醒與紫紅因子配給（PROG-2-0036 / 0037，headless）
 *
 * Unity 對照：EditMode Test，驗證 AchievementUnlocker 規則與存檔往返，不開 Scene。
 */
import { TestSuite, assert } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService, validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import {
    awakenFactor,
    discoveryPhase,
    nurturePeekChance,
    rollBattleAwakening,
    rollNurtureAwakening,
} from '../assets/scripts/core/systems/FactorAwakening';
import { DISCOVERY_LEVEL_CAP, gainDiscoveryExp } from '../assets/scripts/core/systems/DiscoveryProgress';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { NURTURE_TOTAL_ROUNDS } from '../assets/scripts/core/systems/NurtureSystem';
import { chooseFate, unveilGeneral, UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import type { FactorAwakenedEvent } from '../assets/scripts/core/systems/FactorAwakening';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function child(): GeneralConfig {
    return {
        id: 'kid',
        name: '小孩',
        genes: [
            { id: 'gene_command', type: 'blue', level: 3, isLocked: false, discoveryLevel: 1 },
            { id: 'gene_strategy', type: 'green', level: 3, isLocked: true, discoveryLevel: 20 },
            { id: 'gene_destiny', type: 'purple', level: 4, isLocked: true, discoveryLevel: 45, displayName: '天命' },
            { id: 'gene_vitality', type: 'red', level: 2, isLocked: true, discoveryLevel: 45 },
        ],
    } as GeneralConfig;
}

/** 回傳固定值並記錄被呼叫次數的亂數替身 */
function fixed(value: number): { random: () => number; calls: () => number } {
    let n = 0;
    return { random: () => { n++; return value; }, calls: () => n };
}

/** 可出戰的成年武將，帶一顆鎖住的粉與紫 */
function warrior(): GeneralConfig {
    return {
        id: 'w', name: '武將', faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 90, int: 50, lea: 85, pol: 40, cha: 50, luk: 40,
        genes: [
            { id: 'gene_cavalry', type: 'pink', level: 2, isLocked: true, discoveryLevel: 1, displayName: '騎兵' },
            { id: 'gene_destiny', type: 'purple', level: 4, isLocked: true, discoveryLevel: 45, displayName: '天命' },
        ],
    } as unknown as GeneralConfig;
}

/** 已開獎、選過宿命、帶一顆鎖住綠因子的子嗣 */
function pupil(): UnveilingGeneral {
    const base = {
        id: 'kid', name: '小孩', faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30,
        hiddenFlags: ['mystery-phase'],
        genes: [{ id: 'gene_strategy', type: 'green', level: 3, isLocked: true, discoveryLevel: 20, displayName: '謀略' }],
    } as unknown as UnveilingGeneral;
    return chooseFate(unveilGeneral(base).general, 'accept');
}

export function createFactorAwakeningSuite(): TestSuite {
    const suite = new TestSuite('FactorAwakening (因子覺醒 / 紫紅因子)');

    suite.test('discoveryPhase：1~19 → 1、20~44 → 2、45+ → 3', () => {
        assert.equals(1, discoveryPhase(1));
        assert.equals(1, discoveryPhase(19));
        assert.equals(2, discoveryPhase(20));
        assert.equals(2, discoveryPhase(44));
        assert.equals(3, discoveryPhase(45));
    });

    suite.test('等級不足：綠要 20、紫要 45', () => {
        const kid = child();
        const green = awakenFactor(kid, 'gene_strategy', 'mentor', 19);
        assert.isTrue(!green.ok && green.reason === 'level-too-low');
        const purple = awakenFactor(kid, 'gene_destiny', 'battle', 44);
        assert.isTrue(!purple.ok && purple.reason === 'level-too-low');
    });

    suite.test('觸發方式：紫紅不能由教官或培育窺探覺醒；綠不能窺探', () => {
        const kid = child();
        const mentor = awakenFactor(kid, 'gene_destiny', 'mentor', 99);
        assert.isTrue(!mentor.ok && mentor.reason === 'trigger-not-allowed');
        const peek = awakenFactor(kid, 'gene_strategy', 'nurture-peek', 99);
        assert.isTrue(!peek.ok && peek.reason === 'trigger-not-allowed');
        const redPeek = awakenFactor(kid, 'gene_vitality', 'nurture-peek', 99);
        assert.isTrue(!redPeek.ok && redPeek.reason === 'trigger-not-allowed');
    });

    suite.test('成功覺醒：只改該因子的鎖，不動原物件，事件帶名稱與星等', () => {
        const kid = child();
        const result = awakenFactor(kid, 'gene_destiny', 'battle', 45);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(false, result.general.genes!.find((g) => g.id === 'gene_destiny')!.isLocked);
        assert.equals(true, result.general.genes!.find((g) => g.id === 'gene_vitality')!.isLocked);
        assert.equals(true, kid.genes!.find((g) => g.id === 'gene_destiny')!.isLocked, '原物件不變');
        assert.equals('天命', result.event.displayName);
        assert.equals(4, result.event.level);
        assert.equals('purple', result.event.color);
    });

    suite.test('其他失敗原因：沒這個人、沒這個因子、已解鎖', () => {
        const kid = child();
        const none = awakenFactor(undefined, 'x', 'battle', 99);
        assert.isTrue(!none.ok && none.reason === 'no-such-general');
        const missing = awakenFactor(kid, 'nope', 'battle', 99);
        assert.isTrue(!missing.ok && missing.reason === 'no-such-factor');
        const done = awakenFactor(kid, 'gene_command', 'battle', 99);
        assert.isTrue(!done.ok && done.reason === 'already-unlocked');
    });

    suite.test('GameSession：覺醒寫回名冊、廣播事件，discoveryLevel 隨存檔往返；舊檔補 1', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([child()]));
        session.setSaveService(new PlayerSaveService(adapter));
        const events: string[] = [];
        session.setEventEmitter({ emit: (name) => { events.push(name); } });

        const early = await session.awakenFactor('kid', 'gene_destiny', 'battle');
        assert.isTrue(!early.ok && early.reason === 'level-too-low', '預設 discoveryLevel = 1');

        await session.setDiscoveryLevel(46);
        const ok = await session.awakenFactor('kid', 'gene_destiny', 'battle');
        assert.isTrue(ok.ok);
        assert.isTrue(events.includes(GAME_SESSION_EVENTS.FactorAwakened));
        assert.equals(false, session.roster[0].genes!.find((g) => g.id === 'gene_destiny')!.isLocked);

        const reloaded = new GameSession();
        reloaded.setRosterStore(new InMemoryRosterStore());
        reloaded.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await reloaded.load());
        assert.equals(46, reloaded.discoveryLevel);
        assert.equals(false, reloaded.roster[0].genes!.find((g) => g.id === 'gene_destiny')!.isLocked);

        const legacy = validatePlayerSaveSnapshot({ ...session.createSnapshot(), discoveryLevel: undefined });
        assert.equals(1, legacy.discoveryLevel);
    });

    suite.test('資料：person-registry 有武將帶紫與紅因子，且皆在字典內', () => {
        const root = path.resolve(__dirname, '..');
        const read = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf-8'));
        const dict = new Set<string>(read('assets/resources/data/master/gene-dictionary.json').data.map((g: { id: string }) => g.id));
        const persons = read('assets/resources/data/person-registry.json').persons as Array<{ uid: string; gene_refs: string[] }>;
        const purple = persons.filter((p) => p.gene_refs.some((g) => g === 'gene_destiny' || g === 'gene_luck'));
        const red = persons.filter((p) => p.gene_refs.some((g) => g === 'gene_vitality' || g === 'gene_endurance'));
        assert.isTrue(purple.length > 0, '有人帶紫因子');
        assert.isTrue(red.length > 0, '有人帶紅因子');
        assert.isTrue(persons.every((p) => p.gene_refs.every((g) => dict.has(g))), 'gene_refs 全部在字典內');
        const lubu = persons.find((p) => p.uid === 'lu-bu');
        if (lubu) assert.isTrue(lubu.gene_refs.includes('gene_vitality'), '呂布 STR 高 → 強健');
    });

    // ── PROG-2-0044：成長來源與事件接線 ──────────────────────────────────

    suite.test('覺醒經驗：100 經驗升一級、可連升、跨 20 級換階段、99 級封頂', () => {
        const up = gainDiscoveryExp({ level: 19, exp: 90 }, 'battle-win');
        assert.equals(20, up.after.level);
        assert.equals(20, up.after.exp);
        assert.equals(1, up.levelsGained);
        assert.equals(1, up.phaseBefore);
        assert.equals(2, up.phaseAfter);
        const multi = gainDiscoveryExp({ level: 1, exp: 0 }, 'nurture-graduate', 250);
        assert.equals(3, multi.after.level);
        assert.equals(50, multi.after.exp);
        const cap = gainDiscoveryExp({ level: 98, exp: 99 }, 'battle-win', 500);
        assert.equals(DISCOVERY_LEVEL_CAP, cap.after.level);
        assert.equals(0, cap.after.exp);
    });

    suite.test('培育窺探機率：0.08 ×（1 + 星等 × 0.1），星等夾在 0~5', () => {
        assert.isTrue(Math.abs(nurturePeekChance(0) - 0.08) < 1e-9);
        assert.isTrue(Math.abs(nurturePeekChance(5) - 0.12) < 1e-9);
        assert.isTrue(Math.abs(nurturePeekChance(9) - 0.12) < 1e-9);
    });

    suite.test('培育擲骰：綠只在教官站格時可覺醒；沒有候選不消耗亂數', () => {
        const kid = child();
        const noMentor = fixed(0);
        assert.equals(null, rollNurtureAwakening(kid, { discoveryLevel: 20, mentorRank: 0, mentorOnSlot: false, random: noMentor.random }));
        assert.equals(0, noMentor.calls(), '藍已解鎖、綠需要教官 → 沒候選');

        const miss = fixed(0.09);
        assert.equals(null, rollNurtureAwakening(kid, { discoveryLevel: 20, mentorRank: 0, mentorOnSlot: true, random: miss.random }));
        assert.equals(1, miss.calls(), '0.09 ≥ 0.08 沒觸發，只擲一次');

        const hit = rollNurtureAwakening(kid, { discoveryLevel: 20, mentorRank: 2, mentorOnSlot: true, random: fixed(0.09).random });
        assert.isTrue(hit !== null && hit.ok, '2 星教官機率 0.096 > 0.09');
        if (!hit || !hit.ok) return;
        assert.equals('gene_strategy', hit.event.factorId);
        assert.equals('mentor', hit.event.trigger);
    });

    suite.test('戰場擲骰：一般實戰只開藍粉；特定動作才開綠白紫紅（紫紅仍要 45 級），機率 0.15', () => {
        const kid = child();
        const plain = fixed(0);
        assert.equals(null, rollBattleAwakening(kid, { discoveryLevel: 99, random: plain.random }));
        assert.equals(0, plain.calls(), '一般實戰：藍已解鎖，綠紫紅不在候選');

        assert.equals(null, rollBattleAwakening(kid, { discoveryLevel: 99, specialAction: true, random: fixed(0.16).random }), '0.16 ≥ 0.15');
        const boosted = rollBattleAwakening(kid, { discoveryLevel: 99, specialAction: true, random: fixed(0.06).random });
        assert.isTrue(boosted !== null && boosted.ok, '特定動作 0.15 > 0.06');

        const low = rollBattleAwakening(kid, { discoveryLevel: 20, specialAction: true, random: fixed(0).random });
        assert.isTrue(low !== null && low.ok);
        if (!low || !low.ok) return;
        assert.equals('gene_strategy', low.event.factorId, '20 級特定動作：候選只有綠');
    });

    suite.test('GameSession.recordBattle：給經驗、擲覺醒、升級廣播，經驗隨存檔往返', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession(7);
        session.setRosterStore(new InMemoryRosterStore([warrior()]));
        session.setSaveService(new PlayerSaveService(adapter));
        session.setRandomSource(() => 0);
        const events: string[] = [];
        session.setEventEmitter({ emit: (name) => { events.push(name); } });

        const lost = await session.recordBattle(['w'], 'enemy-win');
        assert.equals(10, session.discoveryExp);
        assert.equals(1, lost.awakenings.length);
        assert.equals('gene_cavalry', lost.awakenings[0].factorId);
        assert.equals(false, session.roster[0].genes![0].isLocked);
        assert.equals(true, session.roster[0].genes![1].isLocked, '敗戰不開紫');

        await session.setDiscoveryLevel(44);
        await session.gainDiscoveryExp('battle-win', 80);
        const won = await session.recordBattle(['w'], 'player-win', { specialActions: { w: ['last-stand'] } });
        assert.equals(45, session.discoveryLevel, '80 + 30 = 110 → 升到 45');
        assert.equals(10, session.discoveryExp);
        assert.isDefined(won.discovery);
        assert.equals('gene_destiny', won.awakenings[0]?.factorId, '升到 45 後同場做出特定動作即可覺醒紫');
        assert.isTrue(events.includes(GAME_SESSION_EVENTS.DiscoveryLevelChanged));
        assert.equals(2, events.filter((e) => e === GAME_SESSION_EVENTS.FactorAwakened).length);

        const reloaded = new GameSession();
        reloaded.setRosterStore(new InMemoryRosterStore());
        reloaded.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await reloaded.load());
        assert.equals(45, reloaded.discoveryLevel);
        assert.equals(10, reloaded.discoveryExp);
        assert.equals(false, reloaded.roster[0].genes![1].isLocked);

        const legacy = validatePlayerSaveSnapshot({ ...session.createSnapshot(), discoveryExp: undefined });
        assert.equals(0, legacy.discoveryExp);
    });

    suite.test('GameSession.recordBattle：ongoing 不給經驗也不覺醒；名冊沒人出戰則什麼都不做', async () => {
        const session = new GameSession(7);
        session.setRosterStore(new InMemoryRosterStore([warrior()]));
        session.setRandomSource(() => 0);
        const ongoing = await session.recordBattle(['w'], 'ongoing');
        assert.equals(0, ongoing.awakenings.length);
        assert.equals(0, session.discoveryExp);
        const nobody = await session.recordBattle(['ghost'], 'player-win');
        assert.equals(0, nobody.awakenings.length);
        assert.equals(0, session.discoveryExp);
    });

    suite.test('NurtureService：有掛覺醒時教官站格的訓練回合覺醒綠因子；休息與未掛鉤不擲', () => {
        const awakened: FactorAwakenedEvent[] = [];
        let graduated = 0;
        const make = (withHooks: boolean, level: number) => {
            const store = new InMemoryRosterStore([pupil() as unknown as GeneralConfig]);
            const service = new NurtureService(store, {
                random: () => 0,
                requireNurtureMode: false,
                currentSeason: () => 3,
                ...(withHooks ? { awakening: { discoveryLevel: () => level, onAwakened: (e: FactorAwakenedEvent) => { awakened.push(e); } } } : {}),
                onGraduated: () => { graduated++; },
            });
            service.start('kid', [{ id: 'm', name: '教官', tpBonus: 20, specialty: 'str', burstRate: 1, stars: 1 }]);
            return { store, service };
        };

        const plain = make(false, 99);
        assert.equals(undefined, plain.service.train('kid', 'str').awakening, '未掛鉤不擲');

        const low = make(true, 19);
        assert.equals(undefined, low.service.train('kid', 'str').awakening, '19 級綠還沒開');

        const ok = make(true, 20);
        assert.equals(undefined, ok.service.train('kid', 'rest').awakening, '休息回合不擲');
        const round = ok.service.train('kid', 'str');
        assert.equals('gene_strategy', round.awakening?.factorId);
        assert.equals('mentor', round.awakening?.trigger);
        assert.equals(1, awakened.length);
        assert.equals(false, ok.store.getAll()[0].genes![0].isLocked, '名冊立即寫回');

        for (let i = 2; i < NURTURE_TOTAL_ROUNDS; i++) ok.service.train('kid', 'rest');
        ok.service.graduate('kid');
        assert.equals(1, graduated);
        assert.equals(false, ok.store.getAll()[0].genes![0].isLocked, '畢業寫回不會蓋掉覺醒');
    });

    return suite;
}
