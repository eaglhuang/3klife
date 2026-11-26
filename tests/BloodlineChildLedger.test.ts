/**
 * BloodlineChildLedger.test.ts — 開局 7 歲幼苗與親子資料基礎（PROG-2-10058）
 * 鎖住：親子好感／小名碎片／同窗好友帳本的不可變更新與 normalize（舊存檔相容）、
 * 幼苗生成（7 歲、性別、出生年、來源 starter）、新局名冊與家族登記、一年後 8 歲、存檔讀回、family.childLedger 命令。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    addChildFavor,
    addClassmateFriend,
    addEpithetFragments,
    CHILD_FAVOR_DEFAULT,
    childFavorOf,
    emptyChildLedger,
    hasClassmateFriend,
    isEmptyChildLedger,
    normalizeChildLedger,
    seedChildFavor,
} from '../assets/scripts/core/systems/BloodlineChildLedger';
import {
    buildStarterSeedling,
    childBirthYear,
    configureStarterSeedling,
    DEFAULT_STARTER_SEEDLING_CONFIG,
    getStarterSeedlingConfig,
} from '../assets/scripts/core/services/StarterSeedlingService';
import { buildStarterRoster, STARTER_CORE_GENERAL_ID } from '../assets/scripts/core/services/StarterRosterService';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { FamilyChildLedgerResult } from '../assets/scripts/shared/api/ApiCommands';
import { isApiFail } from '../assets/scripts/shared/api/ApiProtocol';

const ROOT = join(__dirname, '..');
const generals = JSON.parse(readFileSync(join(ROOT, 'assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];
const SEEDLING_ID = DEFAULT_STARTER_SEEDLING_CONFIG.childId;

async function newSession(opts: { seed?: number; random?: () => number } = {}): Promise<{ session: GameSession; save: PlayerSaveService }> {
    const save = new PlayerSaveService(new MemoryStorageAdapter());
    const session = new GameSession(opts.seed ?? 5);
    session.setRosterStore(new InMemoryRosterStore());
    session.setSaveService(save);
    session.setAutoSave(false);
    session.setRandomSource(opts.random ?? (() => 0.5));
    await session.startNewGameWithStarters(opts.seed ?? 5, generals, {});
    return { session, save };
}

export function createBloodlineChildLedgerSuite(): TestSuite {
    const suite = new TestSuite('BloodlineChildLedger (7 歲幼苗與親子資料 PROG-2-10058)');

    suite.test('帳本：好感夾在 0~100、沒紀錄回預設、更新不改原狀態', () => {
        const empty = emptyChildLedger();
        assert.isTrue(isEmptyChildLedger(empty));
        assert.equals(CHILD_FAVOR_DEFAULT, childFavorOf(empty, 'a'));
        const up = addChildFavor(empty, 'a', 5);
        assert.equals(CHILD_FAVOR_DEFAULT + 5, childFavorOf(up, 'a'));
        assert.isTrue(isEmptyChildLedger(empty), '原狀態不被改');
        assert.equals(100, childFavorOf(addChildFavor(up, 'a', 999), 'a'));
        assert.equals(0, childFavorOf(addChildFavor(up, 'a', -999), 'a'));
        assert.equals(up, addChildFavor(up, '', 3), '空 id 不處理');
        assert.equals(up, addChildFavor(up, 'a', Number.NaN), '非有限數不處理');
    });

    suite.test('帳本：seedChildFavor 只在沒紀錄時設定；碎片只收正整數；同窗好友累加', () => {
        const seeded = seedChildFavor(emptyChildLedger(), 'a', 40);
        assert.equals(40, childFavorOf(seeded, 'a'));
        assert.equals(40, childFavorOf(seedChildFavor(seeded, 'a', 90), 'a'), '已有紀錄不覆蓋');
        const frag = addEpithetFragments(addEpithetFragments(seeded, 2), 3);
        assert.equals(5, frag.epithetFragments);
        assert.equals(5, addEpithetFragments(frag, 0).epithetFragments);
        assert.equals(5, addEpithetFragments(frag, -2).epithetFragments);
        assert.equals(5, addEpithetFragments(frag, 1.5).epithetFragments);
        assert.isTrue(!hasClassmateFriend(frag, 'a'));
        const friend = addClassmateFriend(addClassmateFriend(frag, 'a'), 'a');
        assert.isTrue(hasClassmateFriend(friend, 'a'));
        assert.equals(2, friend.classmateFriends.a);
        assert.isTrue(!hasClassmateFriend(friend, 'b'));
    });

    suite.test('normalize：舊存檔缺欄位／壞值回可用狀態，好感夾範圍、碎片與好友取非負整數', () => {
        for (const bad of [undefined, null, 5, 'x', [], {}]) assert.isTrue(isEmptyChildLedger(normalizeChildLedger(bad)), '缺值或壞值視為空帳本');
        const cleaned = normalizeChildLedger({
            favor: { a: 150, b: -5, c: 'x', d: Number.NaN, '': 3, e: 61.4 },
            epithetFragments: 7.9,
            classmateFriends: { a: 2.7, b: 0, c: -1, d: 'x' },
            extra: 'ignored',
        });
        assert.equals(JSON.stringify({ a: 100, b: 0, e: 61 }), JSON.stringify(cleaned.favor));
        assert.equals(7, cleaned.epithetFragments);
        assert.equals(JSON.stringify({ a: 2 }), JSON.stringify(cleaned.classmateFriends));
        assert.equals(JSON.stringify(cleaned), JSON.stringify(normalizeChildLedger(cleaned)), 'normalize 冪等');
        assert.equals(1, cleaned.v);
    });

    suite.test('幼苗生成：7 歲、有名字與性別、父＝核心主將、出生年 -6、不是 Mystery、不可出戰旗標', () => {
        const starters = buildStarterRoster(generals);
        const seedling = buildStarterSeedling(starters, { random: () => 0.1 });
        assert.equals(SEEDLING_ID, seedling.id);
        assert.equals(7, seedling.age);
        assert.equals('男', seedling.gender);
        assert.equals(`${starters.find((g) => g.id === STARTER_CORE_GENERAL_ID)!.name}之少主`, seedling.name);
        assert.equals(STARTER_CORE_GENERAL_ID, seedling.fatherId);
        assert.equals(undefined, seedling.motherId);
        assert.equals(undefined, seedling.status, '不走 5 歲自動開獎');
        assert.isTrue((seedling.hiddenFlags ?? []).includes('mystery-phase') && (seedling.hiddenFlags ?? []).includes('seedling'));
        assert.equals(-6, childBirthYear(seedling));
        assert.equals('女', buildStarterSeedling(starters, { random: () => 0.9 }).gender);
        for (const key of ['str', 'int', 'lea', 'pol', 'cha'] as const) {
            assert.isTrue((seedling[key] ?? 0) >= 18 && (seedling[key] ?? 0) <= 30, `${key} 在 7 歲範圍內`);
        }
    });

    suite.test('幼苗設定來自 JSON：configure 後生效、缺欄位退回預設', () => {
        const raw = JSON.parse(readFileSync(join(ROOT, 'assets/resources/data/starter-seedling-config.json'), 'utf8'));
        try {
            configureStarterSeedling(raw);
            assert.equals(7, getStarterSeedlingConfig().age);
            assert.equals(SEEDLING_ID, getStarterSeedlingConfig().childId);
            configureStarterSeedling({ initialFavor: 55, statRange: { min: 'x', max: 3 } as never });
            assert.equals(55, getStarterSeedlingConfig().initialFavor);
            assert.equals(DEFAULT_STARTER_SEEDLING_CONFIG.statRange.min, getStarterSeedlingConfig().statRange.min, '壞範圍退回預設');
            assert.equals(7, getStarterSeedlingConfig().age);
        } finally {
            configureStarterSeedling(null);
        }
    });

    suite.test('新局：名冊有幼苗，家族登記為義子 starter（父＝核心主將），親子好感為起始值', async () => {
        const { session } = await newSession();
        const seedling = session.roster.find((g) => g.id === SEEDLING_ID);
        assert.isTrue(!!seedling, '名冊有幼苗');
        assert.equals(7, seedling!.age);
        const member = session.familyHost.service.get(SEEDLING_ID);
        assert.equals('adopted', member?.kind);
        assert.equals('starter', member?.adoptSource);
        assert.equals(STARTER_CORE_GENERAL_ID, member?.parentIds[0]);
        assert.equals(DEFAULT_STARTER_SEEDLING_CONFIG.initialFavor, session.childFavor(SEEDLING_ID));
        assert.equals(DEFAULT_STARTER_SEEDLING_CONFIG.initialFavor, session.childLedger().favor[SEEDLING_ID]);
    });

    suite.test('includeStarterSeedling=false 不送幼苗，也不留好感紀錄', async () => {
        const session = new GameSession(5);
        session.setRosterStore(new InMemoryRosterStore());
        session.setAutoSave(false);
        await session.startNewGameWithStarters(5, generals, { includeStarterSeedling: false });
        assert.isTrue(!session.roster.some((g) => g.id === SEEDLING_ID));
        assert.isTrue(isEmptyChildLedger(session.childLedger()));
    });

    suite.test('過一年（4 季）幼苗長到 8 歲；連過三年到 10 歲', async () => {
        const { session } = await newSession({ random: () => 0.99 });
        for (let i = 0; i < 4; i++) await session.advanceSeason();
        assert.equals(8, session.roster.find((g) => g.id === SEEDLING_ID)!.age);
        for (let i = 0; i < 8; i++) await session.advanceSeason();
        assert.equals(10, session.roster.find((g) => g.id === SEEDLING_ID)!.age);
    });

    suite.test('存檔讀回：好感、碎片、同窗好友與幼苗都在；舊存檔沒有欄位讀回空帳本', async () => {
        const { session, save } = await newSession();
        await session.save();
        const loaded = new GameSession(9);
        loaded.setRosterStore(new InMemoryRosterStore());
        loaded.setSaveService(save);
        assert.isTrue(await loaded.load());
        assert.equals(DEFAULT_STARTER_SEEDLING_CONFIG.initialFavor, loaded.childFavor(SEEDLING_ID));
        assert.isTrue(loaded.roster.some((g) => g.id === SEEDLING_ID));
        assert.equals('starter', loaded.familyHost.service.get(SEEDLING_ID)?.adoptSource);

        // 舊存檔：直接拿掉欄位再讀
        const snapshot = JSON.parse(JSON.stringify(await save.load())) as Record<string, unknown>;
        assert.isTrue('bloodlineChildLedger' in snapshot, '新存檔帶帳本欄位');
        delete snapshot.bloodlineChildLedger;
        const oldStorage = new PlayerSaveService(new MemoryStorageAdapter());
        await oldStorage.save(snapshot as never);
        const old = new GameSession(9);
        old.setRosterStore(new InMemoryRosterStore());
        old.setSaveService(oldStorage);
        assert.isTrue(await old.load());
        assert.isTrue(isEmptyChildLedger(old.childLedger()), '舊存檔讀回空帳本');
        assert.equals(CHILD_FAVOR_DEFAULT, old.childFavor(SEEDLING_ID));
    });

    suite.test('family.childLedger 命令：讀得到帳本；宿主沒綁定回 E360；不能用命令改帳本', async () => {
        const { session } = await newSession();
        const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
        const unbound = await bundle.api.query<FamilyChildLedgerResult>('family.childLedger', {});
        assert.isTrue(isApiFail(unbound) && unbound.errorCode === 'E360');
        bundle.setChildGrowthHost(session.childGrowthHost);
        const res = await bundle.api.query<FamilyChildLedgerResult>('family.childLedger', {});
        assert.isTrue(!isApiFail(res));
        const view = (res as { result: FamilyChildLedgerResult }).result;
        assert.equals(DEFAULT_STARTER_SEEDLING_CONFIG.initialFavor, view.favor[SEEDLING_ID]);
        assert.equals(CHILD_FAVOR_DEFAULT, view.favorDefault);
        assert.equals(0, view.epithetFragments);
        view.favor[SEEDLING_ID] = 99;
        assert.equals(DEFAULT_STARTER_SEEDLING_CONFIG.initialFavor, session.childFavor(SEEDLING_ID), '回傳是複本，改它不影響權威帳本');
    });

    return suite;
}
