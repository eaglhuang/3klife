// @spec-source → 三國季報動態合成與市井奇遇微抉擇狀態機規格書.md (doc_spec_1171) 狀態機「存入存檔與歷史卷軸」「古樸木刻介面」；PROG-2-2206
/**
 * SeasonChronicleArchive.test.ts — 季報歷史卷軸：換季收卷、上限、同季不重複、存讀檔、彈窗翻頁、古樸卷軸 skin。
 *
 * Unity 對照：EditMode Test，不開 Scene。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    archiveSeasonChronicle,
    CHRONICLE_ARCHIVE_LIMIT,
    normalizeChronicleArchive,
    WORLD_TRENDS,
    type SeasonChronicleState,
} from '../assets/scripts/core/systems/SeasonChronicle';
import { SeasonChroniclePopupController, seasonChronicleView, type SeasonChronicleView } from '../assets/scripts/ui/core/SeasonChroniclePopupController';

const ROOT = path.join(__dirname, '..');

function general(id: string): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, maxLifespan: 70, str: 50, int: 50, cha: 50, luk: 10 } as unknown as GeneralConfig;
}

function setup(adapter = new MemoryStorageAdapter()): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([general('liu-bei')]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    session.setGovernanceEventRandom(() => 0.99);
    session.setSeasonEventRandom(() => 0.99);
    session.setChronicleRandom(() => 0.5);
    return session;
}

function chronicle(season: number, extra: Partial<SeasonChronicleState> = {}): SeasonChronicleState {
    return { season, trend: WORLD_TRENDS.wei, gossip: [`g${season}`], encounterId: null, encounterChoice: null, read: false, ...extra };
}

export function createSeasonChronicleArchiveSuite(): TestSuite {
    const suite = new TestSuite('SeasonChronicleArchive');

    suite.test('收卷規則：新的在前、同季不重複、未產生或同季不收、超過上限捨棄最舊；讀檔正規化', () => {
        let archive: SeasonChronicleState[] = [];
        archive = archiveSeasonChronicle(archive, chronicle(-1), 0);
        assert.equals(0, archive.length, '尚未產生不收');
        archive = archiveSeasonChronicle(archive, chronicle(3), 3);
        assert.equals(0, archive.length, '同季不收');
        for (let s = 0; s < CHRONICLE_ARCHIVE_LIMIT + 3; s += 1) archive = archiveSeasonChronicle(archive, chronicle(s), s + 1);
        assert.equals(CHRONICLE_ARCHIVE_LIMIT, archive.length);
        assert.equals(CHRONICLE_ARCHIVE_LIMIT + 2, archive[0].season, '新的在前');
        assert.equals(3, archive[archive.length - 1].season, '捨棄最舊');
        assert.isTrue(archive.every((e) => e.read));
        archive = archiveSeasonChronicle(archive, chronicle(archive[0].season, { trend: 'x' }), 99);
        assert.equals(1, archive.filter((e) => e.season === CHRONICLE_ARCHIVE_LIMIT + 2).length, '同季不重複');
        const normalized = normalizeChronicleArchive([chronicle(2), null, { season: -5 }, chronicle(7), chronicle(2), 'bad']);
        assert.equals('7,2', normalized.map((e) => e.season).join());
        assert.equals(0, normalizeChronicleArchive(undefined).length);
    });

    suite.test('換季時上一季季報收進卷軸；存讀檔保留；舊檔沒有卷軸讀回為空', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = setup(adapter);
        await session.advanceSeason();
        const first = session.seasonChronicle;
        assert.isTrue(first.season >= 0);
        assert.equals(0, session.chronicleArchive.length);
        await session.advanceSeason();
        await session.advanceSeason();
        const archive = session.chronicleArchive;
        assert.equals(2, archive.length);
        assert.equals(first.season, archive[1].season);
        assert.equals(first.trend, archive[1].trend);
        assert.isTrue(archive[0].season > archive[1].season);
        await session.save();
        const reloaded = setup(adapter);
        await reloaded.load();
        assert.equals(archive.map((e) => e.season).join(), reloaded.chronicleArchive.map((e) => e.season).join());
        const fresh = setup();
        await fresh.load();
        assert.equals(0, fresh.chronicleArchive.length);
    });

    suite.test('彈窗翻頁：往期只能看、標題帶【往期】與該季文字；未抉擇時可翻閱但不能收起；翻到底按鈕停用；重開回本季', async () => {
        let current = chronicle(5, { encounterId: 'HU_MERCHANT' });
        const archive = [chronicle(4, { encounterId: 'HU_MERCHANT', encounterChoice: 1 }), chronicle(3, { encounterId: 'BLACKSMITH' })];
        const views: SeasonChronicleView[] = [];
        const host = { node: { active: false }, binder: null };
        const popup = new SeasonChroniclePopupController({
            mountHost: async () => host as never,
            apply: (_h, view) => { views.push(view); },
            state: () => current,
            archive: () => archive,
            seasonLabel: (season) => `第${season}季`,
            markRead: () => { current = { ...current, read: true }; },
            resolve: async (index) => { current = { ...current, encounterChoice: index }; return { ok: true, line: 'done' }; },
            toast: () => undefined,
        });
        await popup.mount();
        assert.isTrue(popup.open());
        let view = views[views.length - 1];
        assert.isTrue(view.actives.btnChroniclePrev);
        assert.isTrue(view.enabled.btnChroniclePrev, '未抉擇也可翻閱往期');
        popup.turnPage(1);
        assert.equals(1, popup.page);
        view = views[views.length - 1];
        assert.isFalse(view.enabled.btnCloseChronicle, '本季未抉擇，往期頁也不能收起');
        popup.close();
        assert.isTrue(popup.isOpen, '收起被擋下');
        assert.equals(null, current.encounterChoice, '翻頁不改奇遇狀態');
        popup.turnPage(-1);
        assert.equals(0, popup.page);
        await popup.respond(1);
        popup.turnPage(1);
        assert.equals(1, popup.page);
        view = views[views.length - 1];
        assert.isTrue(view.enabled.btnCloseChronicle, '抉擇後往期頁可收起');
        assert.isTrue(view.texts.chronicleTitle.startsWith('【往期】'));
        assert.isTrue(view.texts.chronicleTitle.includes('第4季'));
        assert.isFalse(view.actives.btnEncounterA, '往期不能抉擇');
        assert.isTrue(view.texts.encounterNote.startsWith('已抉擇'));
        assert.isTrue(view.enabled.btnChronicleNext);
        popup.turnPage(1);
        view = views[views.length - 1];
        assert.isTrue(view.texts.encounterNote.includes('機緣已逝'), '往期未抉擇顯示已過期');
        assert.isFalse(view.enabled.btnChroniclePrev, '翻到最舊');
        popup.turnPage(1);
        assert.equals(2, popup.page);
        await popup.respond(0);
        assert.equals(1, current.encounterChoice, '往期頁不能改本季抉擇');
        popup.close();
        assert.isFalse(host.node.active);
        popup.open();
        assert.equals(0, popup.page, '重開回本季');
        const empty = seasonChronicleView(chronicle(1), '春', null);
        assert.isFalse(empty.actives.btnChroniclePrev, '沒有往期時不顯示翻頁');
    });

    suite.test('古樸卷軸樣式：版面有翻頁鈕；skin 改用現有羊皮紙框與紙質按鈕（貼圖都存在），文字為深墨色', () => {
        const layout = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/layouts/season-chronicle-main.json'), 'utf8'));
        const ids = new Set<string>();
        const walk = (node: { id?: string; children?: unknown[] }): void => {
            if (node.id) ids.add(node.id);
            for (const c of node.children ?? []) walk(c as { id?: string; children?: unknown[] });
        };
        walk(layout.root);
        for (const id of ['btnChroniclePrev', 'chroniclePrevLabel', 'btnChronicleNext', 'chronicleNextLabel', 'btnCloseChronicle', 'chronicleTitle']) assert.isTrue(ids.has(id), `版面缺 ${id}`);
        const skin = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/skins/season-chronicle-default.json'), 'utf8')).slots as Record<string, Record<string, unknown>>;
        assert.equals('sprite-frame', skin['season.chronicle.card.bg'].kind);
        assert.equals('button-skin', skin['season.chronicle.page.bg'].kind);
        const paths = Object.values(skin).flatMap((slot) => ['path', 'normal', 'pressed', 'disabled'].map((k) => slot[k]).filter((v): v is string => typeof v === 'string'));
        assert.isTrue(paths.length >= 5);
        for (const p of paths) assert.isTrue(fs.existsSync(path.join(ROOT, 'assets/resources', `${p}.png`)), `缺貼圖 ${p}`);
        for (const [key, slot] of Object.entries(skin)) {
            if (slot.kind === 'label-style') assert.isTrue(String(slot.color).startsWith('textOnParchment'), `${key} 應為深墨色`);
        }
    });

    return suite;
}
