/**
 * SpouseSources.test.ts — 配偶三來源（結緣好感、聯姻外交、媒人說親）（PROG-2-9583 F3）
 *
 * 涵蓋：好感門檻與一位只能納一次、邦交門檻與成婚 +20 與每國上限、媒人價格未定＝即將開放（E368）、
 * 價格開放後固定種子候選與每年上限（E369）、錯誤碼與冪等。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { isApiFail } from '../assets/scripts/shared/api/ApiProtocol';
import { matchmakerCandidates, matchmakerSlot, matchmakerYearOf, spouseHomeNationOf, spouseSourceOf } from '../assets/scripts/core/systems/SpouseSources';
import { parseFamilyConfig } from '../assets/scripts/shared/family/FamilyConfig';

const ROOT = join(__dirname, '..');
const generals = JSON.parse(readFileSync(join(ROOT, 'assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];
const readJson = (name: string): Record<string, unknown> => JSON.parse(readFileSync(join(ROOT, `assets/resources/data/${name}.json`), 'utf8')) as Record<string, unknown>;

interface MatchmakerOffer { open: boolean; notice: string; remaining: number; candidates: Array<{ index: number; generalId: string; hint: string }> }

async function newBundle(familyOverride: Record<string, unknown> = {}) {
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore());
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setAutoSave(false);
    session.setRandomSource(() => 0.5);
    session.setGeneralTemplates(generals);
    session.configureFamily({ ...readJson('family-config'), ...familyOverride });
    session.configureOccupancyMatrix(readJson('occupancy-matrix'));
    await session.startNewGameWithStarters(5, generals, {});
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    bundle.setFamilyHost(session.spouseHost);
    let seq = 0;
    const cmd = <T>(args: Record<string, unknown>) => bundle.api.cmd<T>('family.enrollSpouse', args, { idemKey: `f3:${seq++}` });
    const yearOf = (): number => (session as unknown as { _clock: { state: { currentYear: number } } })._clock.state.currentYear;
    return { session, api: bundle.api, cmd, yearOf };
}

/** 讓名冊上有這位女性（結緣好感納配偶的前提） */
function ensureOnRoster(session: GameSession, id: string): void {
    if (!session.roster.some((g) => g.id === id)) session.enrollGenerals([generals.find((g) => g.id === id) as GeneralConfig]);
}

export function createSpouseSourcesSuite(): TestSuite {
    const suite = new TestSuite('SpouseSources (配偶三來源 PROG-2-9583)');

    suite.test('結緣好感：未達門檻 E365；達標納入且只能納一次；非女性或不在名冊 E364', async () => {
        const { session, cmd } = await newBundle();
        ensureOnRoster(session, 'diao-chan');
        const low = await cmd({ source: 'bond', generalId: 'diao-chan' });
        assert.isTrue(isApiFail(low) && low.errorCode === 'E365');
        session.giftFemale('diao-chan', 100);
        const ok = await cmd<{ generalId: string; created: boolean }>({ source: 'bond', generalId: 'diao-chan' });
        assert.isTrue(!isApiFail(ok) && ok.result.created && session.isSpouse('diao-chan'));
        const again = await cmd<{ generalId: string; created: boolean }>({ source: 'bond', generalId: 'diao-chan' });
        assert.isTrue(!isApiFail(again) && !again.result.created, '同一位女性只能被納一次（重送冪等）');
        const male = await cmd({ source: 'bond', generalId: (generals.find((g) => g.gender === '男') as GeneralConfig).id });
        assert.isTrue(isApiFail(male) && male.errorCode === 'E364');
        const ghost = await cmd({ source: 'bond', generalId: 'nobody' });
        assert.isTrue(isApiFail(ghost) && ghost.errorCode === 'E364');
    });

    suite.test('聯姻：邦交不足 E366；友好以上成婚且邦交 +20、來源為 diplomatic；每國上限 E367', async () => {
        const { session, cmd } = await newBundle({ marriagePerNation: 1 });
        const cold = await cmd({ source: 'diplomatic', nationId: 'shu' });
        assert.isTrue(isApiFail(cold) && cold.errorCode === 'E366');
        const sess = session as unknown as { _rivals: { nations: Array<{ id: string; relation: number }> } };
        sess._rivals = { nations: sess._rivals.nations.map((n) => (n.id === 'shu' ? { ...n, relation: 50 } : n)) };
        const ok = await cmd<{ generalId: string; created: boolean }>({ source: 'diplomatic', nationId: 'shu' });
        assert.isTrue(!isApiFail(ok) && ok.result.created);
        const id = (ok as { result: { generalId: string } }).result.generalId;
        assert.equals('diplomatic', spouseSourceOf(id));
        assert.isTrue(session.isSpouse(id));
        assert.equals(70, (session.rivals.nations.find((n) => n.id === 'shu') as { relation: number }).relation, '成婚邦交 +20');
        const second = await cmd({ source: 'diplomatic', nationId: 'shu' });
        assert.isTrue(isApiFail(second) && second.errorCode === 'E367');
        const nation = await cmd({ source: 'diplomatic', nationId: 'atlantis' });
        assert.isTrue(isApiFail(nation) && nation.errorCode === 'E364');
    });

    suite.test('媒人：價格未定（null）＝即將開放（E368），名冊不變；offer 回 open=false', async () => {
        const { api, session, cmd } = await newBundle({ matchmakerPrice: null });
        const offer = await api.query<MatchmakerOffer>('family.matchmakerOffer', {});
        assert.isTrue(!isApiFail(offer) && !offer.result.open && offer.result.notice === '即將開放' && offer.result.candidates.length === 0);
        const before = session.roster.length;
        const res = await cmd({ source: 'matchmaker', pick: 0 });
        assert.isTrue(isApiFail(res) && res.errorCode === 'E368');
        assert.equals(before, session.roster.length);
    });

    suite.test('媒人：價格開放後三位固定種子候選；選位無效 E364；納入後可出征', async () => {
        const { api, session, cmd, yearOf } = await newBundle({ matchmakerPerYear: 2 });
        const offer = await api.query<MatchmakerOffer>('family.matchmakerOffer', {});
        assert.isTrue(!isApiFail(offer) && offer.result.open && offer.result.candidates.length === 3 && offer.result.remaining === 2);
        const config = parseFamilyConfig({ ...readJson('family-config'), matchmakerPrice: 100 });
        const year = yearOf();
        const expected = matchmakerCandidates(year, config).map((c) => c.generalId);
        const got = (offer as { result: MatchmakerOffer }).result.candidates.map((c) => c.generalId);
        assert.equals(expected.join(','), got.join(','), '候選固定種子，同年永遠同三人');
        assert.equals(`spouse_gen_matchmaker_y${year}_0`, expected[0]);
        assert.equals(year, matchmakerYearOf(expected[0]));
        assert.isTrue(matchmakerSlot(year, 1).startsWith('matchmaker:y'));
        assert.isTrue((offer as { result: MatchmakerOffer }).result.candidates.every((c) => c.hint.length > 0), '每位都有家世提示');
        const bad = await cmd({ source: 'matchmaker', pick: 9 });
        assert.isTrue(isApiFail(bad) && bad.errorCode === 'E364');
        const a = await cmd<{ generalId: string; created: boolean }>({ source: 'matchmaker', pick: 0 });
        assert.isTrue(!isApiFail(a) && a.result.created && session.isSpouse(expected[0]));
        assert.isTrue(session.getDeployableGenerals().some((g) => g.id === expected[0]), '媒人說來的配偶可出征');
    });

    suite.test('媒人每年上限：同年超過 matchmakerPerYear 回 E369', async () => {
        const { session, cmd } = await newBundle({ matchmakerPerYear: 1, spouseCapByHallLevel: { '1': 5, '2': 5, '3': 5, '4': 5, '5': 5 } });
        const first = await cmd({ source: 'matchmaker', pick: 0 });
        assert.isTrue(!isApiFail(first));
        const second = await cmd({ source: 'matchmaker', pick: 1 });
        assert.isTrue(isApiFail(second) && second.errorCode === 'E369');
        assert.equals(1, session.roster.filter((g) => matchmakerYearOf(g.id) !== null).length);
    });

    suite.test('聯姻配偶母國可由 id 反推（Q-SP2 開戰處置的依據）', () => {
        assert.equals('shu', spouseHomeNationOf('spouse_gen_diplomatic_shu_0'));
        assert.equals(null, spouseHomeNationOf('spouse_gen_first-child'));
        assert.equals(null, spouseHomeNationOf('diao-chan'));
    });

    suite.test('禁帶多餘欄位 E103；bond 缺 generalId E363', async () => {
        const { cmd } = await newBundle();
        const extra = await cmd({ source: 'bond', generalId: 'diao-chan', pick: 1 });
        assert.isTrue(isApiFail(extra) && extra.errorCode === 'E103');
        const missing = await cmd({ source: 'bond' });
        assert.isTrue(isApiFail(missing) && missing.errorCode === 'E363');
    });

    return suite;
}
