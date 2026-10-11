/**
 * BattleRoster.test.ts — 培育武將出戰、戰後結算寫回名冊 headless 測試（PROG-2-0033）
 *
 * Unity 對照：等同 EditMode Test，不開 Scene，驗證「SaveData 的 HeroInstance → 戰鬥單位 → 戰後寫回」。
 */
import { TestSuite, assert } from './TestRunner';
import {
    BATTLE_MERIT,
    BATTLE_VITALITY_COST,
    BattleRosterGeneral,
    buildBattleConfig,
    checkDeployable,
    computeAttackBonus,
    listDeployable,
    PROWESS_PER_BATTLE_STAT,
    RATING_ATTACK_BONUS,
    recoverVitalityOneSeason,
    settleBattle,
} from '../assets/scripts/core/systems/BattleRoster';
import { baseVitalityMaxOf, VITALITY_MAX_FEMALE, VITALITY_MAX_MALE, VITALITY_MAX_UNKNOWN } from '../assets/scripts/core/systems/VitalityCap';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { UnveilingService } from '../assets/scripts/core/services/UnveilingService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { NURTURE_TOTAL_ROUNDS, TRAINING_KINDS } from '../assets/scripts/core/systems/NurtureSystem';
import { buildFactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import type { BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { buildLeadSelectView, LEAD_SELECT_PAGE_SIZE, nextLeadId } from '../assets/scripts/core/services/LeadGeneralSelectRules';
import { Faction } from '../assets/scripts/core/config/Constants';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

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

/** 抽卡來的成年武將：沒有開獎 / 實力層痕跡 */
function adult(id: string, extra: Partial<BattleRosterGeneral> = {}): BattleRosterGeneral {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 90, int: 50, lea: 85, pol: 40, cha: 50, luk: 40,
        ...extra,
    } as BattleRosterGeneral;
}

/** 培育畢業的武將：有宿命、評級、實力層 */
function graduate(id: string, extra: Partial<BattleRosterGeneral> = {}): BattleRosterGeneral {
    return adult(id, {
        age: 14,
        status: 'Unveiled',
        fate: { recommended: 'Warrior', choice: 'accept' },
        graduationRating: 'A',
        prowess: { str: 180, int: 60, lea: 160, pol: 40, cha: 50 },
        hp: 800,
        ...extra,
    });
}

export function createBattleRosterSuite(): TestSuite {
    const suite = new TestSuite('BattleRoster (培育武將出戰 / 戰後結算)');

    suite.test('新邏輯檔案不 import cc', () => {
        const text = fs.readFileSync(path.join(ROOT, 'assets/scripts/core/systems/BattleRoster.ts'), 'utf8');
        assert.isFalse(/from\s+['"]cc['"]/.test(text), 'BattleRoster.ts 不應 import cc');
    });

    // ── 資格 ───────────────────────────────────────────────────────────────

    suite.test('資格：畢業生與成年武將可出戰', () => {
        assert.isTrue(checkDeployable(graduate('g')).eligible);
        assert.isTrue(checkDeployable(adult('a')).eligible);
    });

    suite.test('資格：死亡 / 退役教官 / 未畢業子嗣 / 精力不足 / 培育中都不能出戰', () => {
        assert.equals('dead', checkDeployable(adult('a', { status: 'dead' })).reasons[0]);
        assert.equals('retired-mentor', checkDeployable(adult('a', { isMentorCard: true })).reasons[0]);
        const ungraduated = graduate('c', { graduationRating: undefined, prowess: undefined });
        assert.equals('not-graduated', checkDeployable(ungraduated).reasons[0]);
        const mystery = adult('m', { status: 'Mystery', hiddenFlags: ['mystery-phase'] });
        assert.equals('not-graduated', checkDeployable(mystery).reasons[0]);
        assert.equals('low-vitality', checkDeployable(adult('t', { vitality: BATTLE_VITALITY_COST - 1 })).reasons[0]);
        assert.equals('in-nurture', checkDeployable(graduate('n'), { nurturingIds: ['n'] }).reasons[0]);
        const ids = listDeployable([adult('a'), adult('b', { status: 'dead' }), graduate('g')]).map((g) => g.id);
        assert.equals(JSON.stringify(['a', 'g']), JSON.stringify(ids));
    });

    // ── 名冊 → 戰場 ────────────────────────────────────────────────────────

    suite.test('轉換：戰場數值取實力層 ÷ 2，血量由武力與統率推算', () => {
        const config = buildBattleConfig(graduate('g'), Faction.Player as unknown as GeneralConfig['faction']);
        assert.equals(180 / PROWESS_PER_BATTLE_STAT, config.str!);
        assert.equals(160 / PROWESS_PER_BATTLE_STAT, config.lea!);
        assert.equals(400 + 90 * 3 + 80 * 4, config.hp, 'hp = 400 + 武力×3 + 統率×4');
        assert.equals(Faction.Player as unknown as string, config.faction as unknown as string);
    });

    suite.test('轉換：沒有實力層的成年武將沿用卡面數值與血量', () => {
        const config = buildBattleConfig(adult('a'), Faction.Player as unknown as GeneralConfig['faction']);
        assert.equals(90, config.str!);
        assert.equals(1000, config.hp);
    });

    suite.test('轉換：精力低於一半血量打折、最低 ×0.7，不改傳入物件', () => {
        const tired = graduate('g', { vitality: 25 });
        const before = JSON.stringify(tired);
        const full = buildBattleConfig(graduate('g'), 'player' as never).hp;
        const half = buildBattleConfig(tired, 'player' as never).hp;
        assert.equals(Math.round(full * 0.85), half, '精力 25/100 → ×0.85');
        assert.equals(before, JSON.stringify(tired));
        const exhausted = buildBattleConfig(graduate('g', { vitality: 0 }), 'player' as never).hp;
        assert.equals(Math.round(full * 0.7), exhausted);
    });

    suite.test('轉換：因子星等、畢業評級、負面因子決定攻擊加成', () => {
        const base = graduate('g', { graduationRating: 'C' });
        assert.equals(0, computeAttackBonus(base));
        const withFactors = graduate('g', {
            graduationRating: 'S',
            genes: [
                { id: 'gene_command', type: 'blue', level: 3, isLocked: false },
                { id: 'gene_cavalry', type: 'pink', level: 2, isLocked: false },
                { id: 'gene_strategy', type: 'green', level: 5, isLocked: true },
            ],
        });
        assert.isTrue(Math.abs(RATING_ATTACK_BONUS.S + 0.05 - computeAttackBonus(withFactors)) < 1e-9, '鎖定的因子不算');
        const scarred = graduate('g', { graduationRating: 'S', negativeFactors: ['挫敗', '厭學'] });
        assert.isTrue(Math.abs(RATING_ATTACK_BONUS.S - 0.04 - computeAttackBonus(scarred)) < 1e-9);
        const capped = graduate('g', { genes: [{ id: 'x', type: 'blue', level: 99, isLocked: false }] });
        assert.isTrue(computeAttackBonus(capped) <= 0.25 + RATING_ATTACK_BONUS.A);
    });

    suite.test('轉換：學會的戰法帶進天賦戰法槽，最多 4 個、去重', () => {
        const config = buildBattleConfig(graduate('g', { learnedTactics: ['a', 'b', 'a', 'c', 'd', 'e'] }), 'player' as never);
        assert.equals(JSON.stringify(['a', 'b', 'c', 'd']), JSON.stringify(config.tacticSlots!.map((s) => s.tacticId)));
        const slotted = buildBattleConfig(graduate('g', { tacticSlots: [{ slotId: 's1', tacticId: 'fire' }] }), 'player' as never);
        assert.equals('fire', slotted.tacticSlots![0].tacticId, '已有槽位優先於 learnedTactics');
    });

    // ── 結算 ───────────────────────────────────────────────────────────────

    suite.test('結算：勝 / 敗 / 平各自記戰績、功勳，精力 -30，不改傳入名冊', () => {
        const roster = [graduate('g'), adult('other')];
        const before = JSON.stringify(roster);
        const win = settleBattle(roster, { deployedIds: ['g'], result: 'player-win', season: 5 });
        const g = win.roster[0] as BattleRosterGeneral;
        assert.equals(70, g.vitality!);
        assert.equals(1, g.battleRecord!.wins);
        assert.equals(BATTLE_MERIT.win, g.battleRecord!.merit);
        assert.equals(5, g.battleRecord!.lastBattleSeason!);
        assert.equals(100, (win.roster[1] as BattleRosterGeneral).vitality!, '未出戰者不受影響');
        assert.equals(before, JSON.stringify(roster));

        const loss = settleBattle(win.roster, { deployedIds: ['g'], result: 'enemy-win', season: 6 });
        const draw = settleBattle(loss.roster, { deployedIds: ['g'], result: 'draw', season: 7 });
        const rec = (draw.roster[0] as BattleRosterGeneral).battleRecord!;
        assert.equals(1, rec.wins);
        assert.equals(1, rec.losses);
        assert.equals(1, rec.draws);
        assert.equals(BATTLE_MERIT.win + BATTLE_MERIT.loss + BATTLE_MERIT.draw, rec.merit);
        assert.equals(10, (draw.roster[0] as BattleRosterGeneral).vitality!);
    });

    suite.test('結算：ongoing 不結算；名冊沒有的內建武將略過並回報', () => {
        const roster = [graduate('g')];
        assert.equals(0, settleBattle(roster, { deployedIds: ['g'], result: 'ongoing' }).entries.length);
        const skipped = settleBattle(roster, { deployedIds: ['zhang-fei'], result: 'player-win' });
        assert.equals(0, skipped.entries.length);
        assert.equals('zhang-fei', skipped.skippedIds[0]);
    });

    suite.test('結算：精力不會扣成負數', () => {
        const settled = settleBattle([graduate('g', { vitality: 10 })], { deployedIds: ['g'], result: 'enemy-win' });
        assert.equals(0, (settled.roster[0] as BattleRosterGeneral).vitality!);
    });

    suite.test('每季回補：待命 +30%、出征 +10%、不超過上限、死亡不回補', () => {
        const roster: BattleRosterGeneral[] = [
            graduate('idle', { vitality: 20 }),
            graduate('fought', { vitality: 20, lastDeployedSeason: 4 }),
            graduate('full', { vitality: 100 }),
            graduate('dead', { vitality: 20, status: 'dead' }),
            graduate('almost', { vitality: 80 }),
        ];
        const next = recoverVitalityOneSeason(roster, 4) as BattleRosterGeneral[];
        const v = (id: string) => next.find((g) => g.id === id)!.vitality!;
        assert.equals(50, v('idle'));
        assert.equals(30, v('fought'));
        assert.equals(100, v('full'));
        assert.equals(20, v('dead'));
        assert.equals(100, v('almost'));
    });

    suite.test('回補依精力上限計算，下一季改為待命且不修改原名冊', () => {
        const source = graduate('hero', { vitality: 20, maxVitality: 120, lastDeployedSeason: 4 });
        const deployed = recoverVitalityOneSeason([source], 4)[0] as BattleRosterGeneral;
        assert.equals(32, deployed.vitality!);
        const standby = recoverVitalityOneSeason([deployed], 5)[0] as BattleRosterGeneral;
        assert.equals(68, standby.vitality!);
        assert.equals(120, standby.maxVitality!);
        assert.equals(20, source.vitality!);
        assert.equals(32, deployed.vitality!);
    });

    // ── GameSession 整合 ───────────────────────────────────────────────────

    suite.test('GameSession：recordBattle 寫回名冊、存檔、廣播 BattleSettled，讀檔後戰績還在', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        const events: Array<[string, unknown]> = [];
        session.setRosterStore(new InMemoryRosterStore([graduate('g') as GeneralConfig]));
        session.setSaveService(new PlayerSaveService(adapter));
        session.setEventEmitter({ emit: (name, payload) => events.push([name, payload]) });

        const settlement = await session.recordBattle(['g'], 'player-win');
        assert.equals(1, settlement.entries.length);
        assert.equals(1, events.filter(([name]) => name === GAME_SESSION_EVENTS.BattleSettled).length);

        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore());
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        const g = restored.roster[0] as BattleRosterGeneral;
        assert.equals(70, g.vitality!);
        assert.equals(1, g.battleRecord!.wins);
    });

    suite.test('GameSession：出戰主將只接受可出戰武將，失效時退回遭遇戰預設，並隨存檔保存', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([graduate('g') as GeneralConfig, adult('dead', { status: 'dead' }) as GeneralConfig]));
        session.setSaveService(new PlayerSaveService(adapter));

        assert.equals('zhang-fei', session.resolveLeadGeneralId('zhang-fei'), '沒指定 → 預設');
        assert.isFalse(await session.setLeadGeneral('dead'), '死亡武將不能當主將');
        assert.isFalse(await session.setLeadGeneral('nobody'));
        assert.isTrue(await session.setLeadGeneral('g'));
        assert.equals('g', session.resolveLeadGeneralId('zhang-fei'));

        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore());
        restored.setSaveService(new PlayerSaveService(adapter));
        await restored.load();
        assert.equals('g', restored.leadGeneralId!);

        // 主將精力打光後不再可用 → 退回預設
        await restored.recordBattle(['g'], 'enemy-win');
        await restored.recordBattle(['g'], 'enemy-win');
        await restored.recordBattle(['g'], 'enemy-win');
        await restored.recordBattle(['g'], 'enemy-win');
        assert.equals('zhang-fei', restored.resolveLeadGeneralId('zhang-fei'));
        assert.equals(null, restored.getBattleConfig('g', 'player' as never));
    });

    suite.test('GameSession：getBattleConfig 只對可出戰的名冊武將回傳戰場設定', () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([graduate('g') as GeneralConfig]));
        assert.equals(90, session.getBattleConfig('g', 'player' as never)!.str!);
        assert.equals(null, session.getBattleConfig('zhang-fei', 'player' as never));
    });

    suite.test('GameSession：advanceSeason 回補精力（待命 +30%，出征 +10%）', async () => {
        const session = new GameSession();
        session.setAutoSave(false);
        session.setRandomSource(() => 0.99);
        session.setRosterStore(new InMemoryRosterStore([
            graduate('fought') as GeneralConfig,
            graduate('idle', { vitality: 40 }) as GeneralConfig,
        ]));
        await session.recordBattle(['fought'], 'player-win'); // 100 → 70，記在第 0 季
        await session.advanceSeason();
        const byId = (id: string) => session.roster.find((g) => g.id === id) as BattleRosterGeneral;
        assert.equals(80, byId('fought').vitality!, '70 + 10');
        assert.equals(70, byId('idle').vitality!, '40 + 30');
    });

    // ── 大廳選主將 ─────────────────────────────────────────────────────────

    suite.test('選主將：分頁、標出目前主將、頁碼夾回有效範圍', () => {
        const list = ['a', 'b', 'c', 'd', 'e'].map((id) => graduate(id) as GeneralConfig);
        const first = buildLeadSelectView(list, 'b', 0);
        assert.equals(2, first.pageCount);
        assert.equals(LEAD_SELECT_PAGE_SIZE, first.rows.length);
        assert.equals('b', first.rows.find((r) => r.selected)!.id);
        assert.equals('a（A）', first.rows[0].label);
        const last = buildLeadSelectView(list, 'b', 99);
        assert.equals(1, last.page);
        assert.equals(2, last.rows.length);
        assert.isFalse(last.rows.some((r) => r.selected));
        const empty = buildLeadSelectView([], null, 3);
        assert.equals(1, empty.pageCount);
        assert.equals(0, empty.rows.length);
    });

    suite.test('選主將：再點同一位取消，點別人改選', () => {
        assert.equals(null, nextLeadId('a', 'a'));
        assert.equals('b', nextLeadId('a', 'b'));
        assert.equals('a', nextLeadId(null, 'a'));
    });

    suite.test('選主將：UCUF JSON 三層齊全、按鈕與文字 id 對得上、.meta 的 uuid 不重複', () => {
        const read = (rel: string) => JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec', rel), 'utf8'));
        const screen = read('screens/lobby-lead-select-screen.json');
        assert.equals('lobby-lead-select-main', screen.layout);
        assert.equals('lobby-lead-select-default', screen.skin);
        const ids = new Set<string>();
        const skinSlots = new Set<string>();
        const walk = (node: { id?: string; skinSlot?: string; styleSlot?: string; children?: unknown[] }) => {
            if (node.id) ids.add(node.id);
            if (node.skinSlot) skinSlots.add(node.skinSlot);
            if (node.styleSlot) skinSlots.add(node.styleSlot);
            (node.children ?? []).forEach((child) => walk(child as typeof node));
        };
        walk(read('layouts/lobby-lead-select-main.json').root);
        for (let i = 0; i < LEAD_SELECT_PAGE_SIZE; i++) {
            assert.isTrue(ids.has(`btnLeadGeneral${i}`) && ids.has(`leadGeneralLabel${i}`), `缺少第 ${i} 列`);
        }
        for (const id of ['btnLeadPage', 'leadPageLabel', 'leadTitleLabel']) assert.isTrue(ids.has(id), `缺少 ${id}`);
        const skin = read('skins/lobby-lead-select-default.json');
        for (const slot of skinSlots) assert.isTrue(slot in skin.slots, `skin 缺少 ${slot}`);
        const uuids = ['screens/lobby-lead-select-screen', 'layouts/lobby-lead-select-main', 'skins/lobby-lead-select-default', 'screens/lobby-deck-select-screen']
            .map((rel) => JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec', `${rel}.json.meta`), 'utf8')).uuid as string);
        assert.equals(uuids.length, new Set(uuids).size);
    });

    // ── 端到端 ─────────────────────────────────────────────────────────────

    suite.test('端到端：結緣 → 5 歲開獎 → 36 回合培育畢業 → 出戰 → 結算 → 存檔重讀', async () => {
        const dictionary = buildFactorDictionary(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/master/gene-dictionary.json'), 'utf8')));
        const graph = new BloodlineGraph();
        const person = (uid: string) => ({ uid, template_id: null, name: uid, gene_refs: [] as string[], ep_base: 50, faction: 'shu', is_virtual: false });
        graph.loadFromData({ version: 't', updatedAt: 't', persons: [person('dad'), person('mom')], links: [] });

        const dad = { id: 'dad', name: 'dad', faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 200, maxVitality: 200, str: 90, int: 50, lea: 80, pol: 40, cha: 50, luk: 40 } as unknown as BreedingGeneral;
        const mom = { id: 'mom', name: 'mom', faction: 'shu', gender: '女', age: 28, hp: 800, vitality: 200, maxVitality: 200, str: 50, int: 70, lea: 60, pol: 60, cha: 70, luk: 40 } as unknown as BreedingGeneral;
        const adapter = new MemoryStorageAdapter();
        const store = new InMemoryRosterStore([dad, mom]);
        const session = new GameSession();
        session.setRosterStore(store);
        session.setSaveService(new PlayerSaveService(adapter));
        session.setRandomSource(() => 0.99);
        session.setFactorDictionary(dictionary);

        const breeding = new BreedingService(store, graph, { random: () => 0, currentSeason: () => session.gameTime.totalSeasonsElapsed });
        const childId = breeding.breed('dad', 'mom').child!.id;
        for (let i = 0; i < 20; i++) await session.advanceSeason();
        new UnveilingService(store, () => 0.5).choose(childId, 'accept');

        const nurture = new NurtureService(store, {
            random: seeded(13),
            currentSeason: () => session.gameTime.totalSeasonsElapsed,
            currentMode: () => session.gameTime.currentMode,
        });
        session.setNurtureStatePort(nurture);
        nurture.start(childId, []);

        // 培育中不能出戰
        assert.isFalse(session.checkDeployable(childId).eligible);
        assert.isTrue(session.checkDeployable(childId).reasons.includes('in-nurture'));

        for (let i = 0; i < NURTURE_TOTAL_ROUNDS; i++) {
            const current = nurture.getSession(childId)!;
            nurture.train(childId, current.vigor < 45 ? 'rest' : TRAINING_KINDS[i % 5]);
        }
        nurture.graduate(childId);

        // 畢業後可出戰，主將設為他
        assert.isTrue(session.checkDeployable(childId).eligible);
        assert.isTrue(await session.setLeadGeneral(childId));
        const config = session.getBattleConfig(childId, 'player' as never)!;
        const grown = store.getAll().find((g) => g.id === childId) as BattleRosterGeneral;
        assert.equals(Math.round(grown.prowess!.str! / PROWESS_PER_BATTLE_STAT), config.str!, '戰場武力 = 實力層 ÷ 2');
        assert.isTrue(config.hp > 0);

        const vitalityBefore = grown.vitality!;
        await session.recordBattle([childId], 'player-win');
        const after = session.roster.find((g) => g.id === childId) as BattleRosterGeneral;
        assert.equals(vitalityBefore - BATTLE_VITALITY_COST, after.vitality!);
        assert.equals(1, after.battleRecord!.wins);

        // 存檔重讀：畢業資料與戰績都保留
        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore());
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        const loaded = restored.roster.find((g) => g.id === childId) as BattleRosterGeneral;
        assert.equals(after.graduationRating!, loaded.graduationRating!);
        assert.equals(1, loaded.battleRecord!.wins);
        assert.equals(childId, restored.leadGeneralId!);
    });

    suite.test('精力上限：男 120 / 女 100（Q46），缺資料時依性別給基礎值，已存的數值不覆寫', () => {
        assert.equals(120, baseVitalityMaxOf('男'));
        assert.equals(120, baseVitalityMaxOf(' Male '));
        assert.equals(100, baseVitalityMaxOf('女'));
        assert.equals(100, baseVitalityMaxOf(undefined));
        assert.equals(VITALITY_MAX_MALE, baseVitalityMaxOf('m'));
        assert.equals(VITALITY_MAX_FEMALE, baseVitalityMaxOf('f'));
        assert.equals(VITALITY_MAX_UNKNOWN, baseVitalityMaxOf('?'));
        const saved = recoverVitalityOneSeason([graduate('f', { gender: '女', vitality: 0, maxVitality: 80 })], 1);
        assert.equals(24, saved[0].vitality!, '已存 maxVitality=80 沿用，不被性別基礎值覆寫');
    });

    return suite;
}
