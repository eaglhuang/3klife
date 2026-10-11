/**
 * FactorAwakening.test.ts — 因子覺醒與紫紅因子配給（PROG-2-0036 / 0037，headless）
 *
 * Unity 對照：EditMode Test，驗證 AchievementUnlocker 規則與存檔往返，不開 Scene。
 */
import { TestSuite, assert } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService, validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { awakenFactor, discoveryPhase } from '../assets/scripts/core/systems/FactorAwakening';
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

    return suite;
}
