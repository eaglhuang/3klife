/**
 * FamilyModel.test.ts — 家族資料模型與存檔欄位（PROG-2-9441 F1；doc_spec_1241 第 3、7、8、11 章，TC-FAM-09）
 *
 * 涵蓋：family-config.json 載入與 fail-fast、四種成員類別與家族屬性、開局義子特例（Q-F1）、
 * 分家標記、存檔往返與舊檔對帳、靜態檢查（玩法與 UI 不直接寫家族登記表）。
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { FamilyConfigError, parseFamilyConfig, spouseCapFor } from '../assets/scripts/shared/family/FamilyConfig';
import { FamilyService, normalizeFamilyState } from '../assets/scripts/shared/family/FamilyService';
import { FamilyError, familyTraits, type FamilyMemberRecord } from '../assets/scripts/shared/family/FamilyTypes';

const ROOT = join(__dirname, '..');
const generals = JSON.parse(readFileSync(join(ROOT, 'assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];
const familyJson = (): Record<string, unknown> => JSON.parse(readFileSync(join(ROOT, 'assets/resources/data/family-config.json'), 'utf8')) as Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const guard = require('../tools_node/check-api-bypass.js') as { scanSource(source: string): Record<string, number> };

function member(personId: string, kind: FamilyMemberRecord['kind'], extra: Partial<FamilyMemberRecord> = {}): FamilyMemberRecord {
    return { personId, kind, parentIds: [], branchId: null, joinedAt: 0, ...extra };
}

function expectFamilyCode(run: () => unknown, code: string): void {
    try {
        run();
    } catch (error) {
        assert.isTrue(error instanceof FamilyError && error.code === code, `預期 ${code}，實際 ${(error as Error).message}`);
        return;
    }
    assert.isTrue(false, `預期丟 ${code}，但沒有丟`);
}

async function newGame(): Promise<{ session: GameSession; storage: MemoryStorageAdapter }> {
    const storage = new MemoryStorageAdapter();
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore());
    session.setSaveService(new PlayerSaveService(storage));
    session.setAutoSave(false);
    session.setRandomSource(() => 0.5);
    session.setGeneralTemplates(generals);
    await session.startNewGameWithStarters(5, generals, {});
    return { session, storage };
}

function listTs(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) listTs(full, out);
        else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) out.push(full);
    }
    return out;
}

export function createFamilyModelSuite(): TestSuite {
    const suite = new TestSuite('FamilyModel (家族資料模型與存檔欄位 PROG-2-9441)');

    suite.test('family-config.json 完整可載入；配偶上限依幕府等級；待使用者價格允許 null', () => {
        const config = parseFamilyConfig(familyJson());
        assert.equals(2, spouseCapFor(config, 1));
        assert.equals(3, spouseCapFor(config, 3));
        assert.equals(4, spouseCapFor(config, 5));
        assert.equals(4, spouseCapFor(config, 9));
        assert.equals(20, config.wetNurseSilverPerQuarter);
        assert.equals(100, config.matchmakerPrice, "matchmakerPrice 暫定 100 銀兩（待使用者裁決）");
        assert.equals(null, config.branchGrantSilver);
    });

    suite.test('設定缺欄位 fail-fast：逐一刪掉每個欄位都要丟 FamilyConfigError 並點名', () => {
        const full = familyJson();
        for (const key of Object.keys(full)) {
            if (key.startsWith('_')) continue;
            const broken = { ...full };
            delete broken[key];
            try {
                parseFamilyConfig(broken);
            } catch (error) {
                assert.isTrue(error instanceof FamilyConfigError, `${key}：應丟 FamilyConfigError`);
                assert.isTrue((error as FamilyConfigError).issues.join('|').indexOf(key) >= 0, `${key}：錯誤訊息要點名欄位`);
                continue;
            }
            assert.isTrue(false, `缺 ${key} 卻沒有丟錯`);
        }
    });

    suite.test('設定型別或範圍不對、整份不是物件都 fail-fast，且一次列出全部問題', () => {
        const base = familyJson();
        const bad = { ...base, geniusChance: 3, generatedSpouseEp: [70, 50], wetNurseSilverPerQuarter: 1.5, allianceMinRelation: '' };
        try {
            parseFamilyConfig(bad);
            assert.isTrue(false, '應丟錯');
        } catch (error) {
            const issues = (error as FamilyConfigError).issues;
            assert.equals(4, issues.length);
        }
        try { parseFamilyConfig(null); assert.isTrue(false, 'null 應丟錯'); } catch (error) { assert.isTrue(error instanceof FamilyConfigError); }
        try { parseFamilyConfig({ ...base, matchmakerPrice: -1 }); assert.isTrue(false, '負價格應丟錯'); } catch (error) { assert.isTrue(error instanceof FamilyConfigError); }
    });

    suite.test('GameSession.configureFamily 缺欄位丟錯、不留下半套設定', () => {
        const session = new GameSession(1);
        assert.equals(null, session.familyConfig);
        const broken = familyJson();
        delete broken.branchPrestige;
        try { session.configureFamily(broken); assert.isTrue(false, '應丟錯'); } catch (error) { assert.isTrue(error instanceof FamilyConfigError); }
        assert.equals(null, session.familyConfig);
        session.configureFamily(familyJson());
        assert.equals(40, session.familyConfig!.branchPrestige);
    });

    suite.test('四種成員類別的家族屬性：配偶／親生傳血統；義子、家臣子嗣不傳；家臣子嗣與分家者不進家譜；配偶不可入學', () => {
        assert.equals('1,1,0', [familyTraits(member('s', 'spouse')).inGenealogy, familyTraits(member('s', 'spouse')).passesBloodline, familyTraits(member('s', 'spouse')).canEnroll].map(Number).join(','));
        const bio = familyTraits(member('b', 'biological'));
        assert.isTrue(bio.inGenealogy && bio.passesBloodline && bio.canEnroll);
        const adopted = familyTraits(member('a', 'adopted', { adoptSource: 'story' }));
        assert.isTrue(adopted.inGenealogy && adopted.canEnroll);
        assert.isFalse(adopted.passesBloodline);
        const retainer = familyTraits(member('r', 'retainerChild', { parentIds: ['guard'] }));
        assert.isFalse(retainer.inGenealogy);
        assert.isFalse(retainer.passesBloodline);
        assert.isTrue(retainer.canEnroll);
        assert.isFalse(familyTraits(member('b2', 'biological', { branchId: 'br1' })).inGenealogy);
    });

    suite.test('新增成員的檢查：義子必須有來源、非義子不能有來源、家臣子嗣必須有家臣、重複 id 擋下', () => {
        const svc = new FamilyService();
        expectFamilyCode(() => svc.addFamilyMember(member('a', 'adopted')), 'INVALID');
        expectFamilyCode(() => svc.addFamilyMember(member('b', 'biological', { adoptSource: 'story' })), 'INVALID');
        expectFamilyCode(() => svc.addFamilyMember(member('r', 'retainerChild')), 'INVALID');
        expectFamilyCode(() => svc.addFamilyMember(member('x', 'biological', { parentIds: ['x'] })), 'INVALID');
        expectFamilyCode(() => svc.addFamilyMember(member('y', 'biological', { parentIds: ['p', 'q', 'z'] })), 'INVALID');
        svc.addFamilyMember(member('s1', 'spouse'));
        expectFamilyCode(() => svc.addFamilyMember(member('s1', 'biological')), 'DUPLICATE');
        assert.equals(1, svc.members().length);
    });

    suite.test('配偶上限：依幕府等級與設定判斷（供 F3 三來源共用）；配偶可多位', () => {
        const config = parseFamilyConfig(familyJson());
        const svc = new FamilyService();
        assert.isTrue(svc.canAddSpouse(config, 1));
        svc.addFamilyMember(member('s1', 'spouse'));
        svc.addFamilyMember(member('s2', 'spouse'));
        assert.equals(2, svc.spouseCount());
        assert.isFalse(svc.canAddSpouse(config, 1));
        assert.isTrue(svc.canAddSpouse(config, 3));
    });

    suite.test('開局義子特例（Q-F1）：標記義子、進家譜、可入學、不遺傳血統；登記冪等', () => {
        const svc = new FamilyService();
        const first = svc.seedStarterAdoptee('zhao-yun', 0);
        assert.equals('adopted', first.kind);
        assert.equals('starter', first.adoptSource);
        assert.equals(0, first.parentIds.length);
        const traits = familyTraits(first);
        assert.isTrue(traits.inGenealogy);
        assert.isTrue(traits.canEnroll);
        assert.isFalse(traits.passesBloodline);
        svc.seedStarterAdoptee('zhao-yun', 99);
        assert.equals(1, svc.members().length);
        assert.equals(0, svc.get('zhao-yun')!.joinedAt);
    });

    suite.test('分家標記：成員改記分家 id 並登記分家紀錄；同一位不能分家兩次；配偶不能分家', () => {
        const svc = new FamilyService();
        svc.addFamilyMember(member('kid', 'biological'));
        svc.addFamilyMember(member('wife', 'spouse'));
        const branch = svc.markFamilyBranch('kid', 'br-1', 40);
        assert.equals('kid', branch.headId);
        assert.equals('br-1', svc.get('kid')!.branchId);
        assert.isFalse(familyTraits(svc.get('kid')!).inGenealogy);
        expectFamilyCode(() => svc.markFamilyBranch('kid', 'br-2', 41), 'DUPLICATE');
        expectFamilyCode(() => svc.markFamilyBranch('wife', 'br-3', 41), 'INVALID');
        expectFamilyCode(() => svc.markFamilyBranch('nobody', 'br-4', 41), 'NOT_FOUND');
        assert.equals(1, svc.branches().length);
        assert.isTrue(svc.removeFamilyMember('wife'));
        assert.isFalse(svc.removeFamilyMember('wife'));
    });

    suite.test('讀檔正規化：壞紀錄丟棄、重複 id 留第一筆、缺值得空狀態，不丟錯', () => {
        const state = normalizeFamilyState({
            v: 1,
            members: [
                { personId: 'a', kind: 'biological', parentIds: [], branchId: null, joinedAt: 1 },
                { personId: 'a', kind: 'spouse', parentIds: [], branchId: null, joinedAt: 2 },
                { personId: 'b', kind: 'adopted', parentIds: [], branchId: null, joinedAt: 0 },
                { personId: '', kind: 'spouse' },
                'garbage',
            ],
            branches: [{ branchId: 'x', headId: 'a', atSeason: 3 }, { branchId: '' }],
        });
        assert.equals('a', state.members.map((m) => m.personId).join(','));
        assert.equals('biological', state.members[0].kind);
        assert.equals(1, state.branches.length);
        assert.equals(0, normalizeFamilyState(undefined).members.length);
    });

    suite.test('新開局：開局少年登記為開局義子特例；存檔欄位 familyState 往返；沒有家族資料時不寫欄位', async () => {
        const { session, storage } = await newGame();
        const youth = session.familyHost.service.members('adopted');
        assert.equals(1, youth.length);
        assert.equals('starter', youth[0].adoptSource);
        assert.isTrue(!!session.roster.find((g) => g.id === youth[0].personId && (g as { youth?: unknown }).youth));
        await session.save();
        const raw = await new PlayerSaveService(storage).load();
        assert.equals(1, raw!.familyState!.members.length);
        const loaded = new GameSession(5);
        loaded.setSaveService(new PlayerSaveService(storage));
        assert.isTrue(await loaded.load());
        assert.equals(youth[0].personId, loaded.familyHost.service.members()[0].personId);

        const plain = new GameSession(6);
        const plainStorage = new MemoryStorageAdapter();
        plain.setSaveService(new PlayerSaveService(plainStorage));
        plain.enrollGenerals([{ id: 'a', name: '甲', faction: 'shu', hp: 1, careerClass: 'Warrior' } as unknown as GeneralConfig]);
        await plain.save();
        const plainRaw = await new PlayerSaveService(plainStorage).load();
        assert.isFalse(plainRaw !== null && 'familyState' in plainRaw, '沒有家族資料就不寫 familyState，舊檔形狀不變');
    });

    suite.test('舊檔對帳：名冊有少年版標記、存檔沒有 familyState 時，讀檔補登為開局義子特例', async () => {
        const { session, storage } = await newGame();
        const youthId = session.familyHost.service.members('adopted')[0].personId;
        await session.save();
        const snap = (await new PlayerSaveService(storage).load())!;
        delete (snap as { familyState?: unknown }).familyState;
        const legacyStorage = new MemoryStorageAdapter();
        const legacySave = new PlayerSaveService(legacyStorage);
        await legacySave.save(snap);
        const loaded = new GameSession(5);
        loaded.setSaveService(legacySave);
        assert.isTrue(await loaded.load());
        assert.equals('starter', loaded.familyHost.service.get(youthId)!.adoptSource);
    });

    suite.test('TC-FAM-09 靜態檢查：玩法與 UI 呼叫家族寫入方法會被 check-api-bypass 抓到；定義行與註解不算', () => {
        const hit = guard.scanSource('session.familyHost.service.addFamilyMember(x);\nsvc.markFamilyBranch(id, b, 1);\nsvc.removeFamilyMember(id);');
        assert.equals(3, hit['family-write']);
        const clean = guard.scanSource('// svc.addFamilyMember(x)\npublic addFamilyMember(member: FamilyMemberRecord): void {}\nconst t = "addFamilyMember(";');
        assert.equals(undefined, clean['family-write']);
    });

    suite.test('TC-FAM-09 實際程式碼：assets/scripts 內沒有任何玩法或 UI 檔案直接呼叫家族寫入方法（權威實作目錄除外）', () => {
        const offenders: string[] = [];
        const scriptsDir = join(ROOT, 'assets', 'scripts');
        for (const file of listTs(scriptsDir)) {
            const rel = file.slice(scriptsDir.length + 1).split('\\').join('/');
            if (rel.startsWith('shared/api/') || rel.startsWith('core/api/') || rel.startsWith('shared/family/')) continue;
            if (guard.scanSource(readFileSync(file, 'utf8'))['family-write']) offenders.push(rel);
        }
        assert.equals('', offenders.join(','));
    });

    return suite;
}
