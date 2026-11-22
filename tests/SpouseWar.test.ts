/**
 * SpouseWar.test.ts — 配偶 SP1 移籍／SP2 母國牽掛（PROG-2-9592）
 *
 * SP1：他國仕官的女性武將結緣成婚＝自動辭官（原屬國名冊移除）、入我方名冊可出征、記母國。
 * SP2：與配偶母國開戰＝心情 −30（換算成心智事件）、忠誠 −20、該場不可出征對抗母國；戰後解除；冪等。
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

const ROOT = join(__dirname, '..');
const generals = JSON.parse(readFileSync(join(ROOT, 'assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];
const readJson = (name: string): Record<string, unknown> => JSON.parse(readFileSync(join(ROOT, `assets/resources/data/${name}.json`), 'utf8')) as Record<string, unknown>;

type RivalsHolder = { _rivals: { nations: Array<{ id: string; relation: number; officerRoster?: { officers: Array<{ generalId: string }>; tallies: unknown[] } }> } };

async function newBundle() {
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore());
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setAutoSave(false);
    session.setRandomSource(() => 0.5);
    session.setGeneralTemplates(generals);
    session.configureFamily({ ...readJson('family-config'), spouseCapByHallLevel: { '1': 4, '2': 4, '3': 4, '4': 4, '5': 4 } });
    session.configureOccupancyMatrix(readJson('occupancy-matrix'));
    await session.startNewGameWithStarters(5, generals, {});
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    bundle.setFamilyHost(session.spouseHost);
    let seq = 0;
    const cmd = <T>(args: Record<string, unknown>) => bundle.api.cmd<T>('family.enrollSpouse', args, { idemKey: `w:${seq++}` });
    const holder = session as unknown as RivalsHolder;
    const setRelation = (nationId: string, relation: number): void => {
        holder._rivals = { nations: holder._rivals.nations.map((n) => (n.id === nationId ? { ...n, relation } : n)) };
    };
    return { session, cmd, holder, setRelation };
}

export function createSpouseWarSuite(): TestSuite {
    const suite = new TestSuite('SpouseWar (配偶 SP1 移籍／SP2 母國牽掛 PROG-2-9592)');

    suite.test('SP1：他國仕官女將好感達標成婚→自動辭官移籍、記母國、可出征；男性或君主不行', async () => {
        const { session, cmd, holder } = await newBundle();
        const girl = generals.find((g) => g.id === 'diao-chan') as GeneralConfig;
        assert.isFalse(session.roster.some((g) => g.id === girl.id), '前提：她還不在我方名冊');
        const male = generals.find((g) => g.gender === '男') as GeneralConfig;
        holder._rivals = { nations: holder._rivals.nations.map((n) => (n.id === 'wei'
            ? { ...n, officerRoster: { officers: [{ generalId: girl.id }, { generalId: male.id }], tallies: [] } } : n)) };
        session.giftFemale(girl.id, 100);
        const maleTry = await cmd({ source: 'bond', generalId: male.id });
        assert.isTrue(isApiFail(maleTry) && maleTry.errorCode === 'E364', '他國男性不能納為配偶');
        const ok = await cmd<{ generalId: string; created: boolean }>({ source: 'bond', generalId: girl.id });
        assert.isTrue(!isApiFail(ok) && ok.result.created && session.isSpouse(girl.id));
        const nation = holder._rivals.nations.find((n) => n.id === 'wei');
        assert.isFalse(!!nation?.officerRoster?.officers.some((o) => o.generalId === girl.id), '自動辭官：原屬國名冊移除');
        assert.equals('wei', session.spouseHomeNation(girl.id));
        assert.isTrue(session.getDeployableGenerals().some((g) => g.id === girl.id), '移籍後可出征');
    });

    suite.test('SP1：他國君主不能被結緣娶走；好感不足仍 E365', async () => {
        const { session, cmd, holder } = await newBundle();
        const girl = generals.find((g) => g.id === 'diao-chan') as GeneralConfig;
        holder._rivals = { nations: holder._rivals.nations.map((n) => (n.id === 'wei'
            ? { ...n, officerRoster: { officers: [{ generalId: girl.id }], tallies: [] } } : n)) };
        const low = await cmd({ source: 'bond', generalId: girl.id });
        assert.isTrue(isApiFail(low) && low.errorCode === 'E365');
        (session as unknown as { _rivalRulerIds: Record<string, string> })._rivalRulerIds = { wei: girl.id };
        session.giftFemale(girl.id, 100);
        const ruler = await cmd({ source: 'bond', generalId: girl.id });
        assert.isTrue(isApiFail(ruler) && ruler.errorCode === 'E364');
    });

    suite.test('SP2：與母國開戰→心情下降、忠誠 −20、該場不可出征；其他國不受影響；冪等；戰後解除', async () => {
        const { session, cmd, setRelation } = await newBundle();
        setRelation('shu', 50);
        const ok = await cmd<{ generalId: string; created: boolean }>({ source: 'diplomatic', nationId: 'shu' });
        const id = (ok as { result: { generalId: string } }).result.generalId;
        const roster = session.roster.map((g) => (g.id === id ? { ...g, loyaltyState: { value: 80, isLocked: false, sourceType: 'Mercenary' as const } } : g));
        (session as unknown as { _roster: { replaceAll(r: unknown): void } })._roster.replaceAll(roster);
        assert.equals('shu', session.spouseHomeNation(id));
        assert.isTrue(session.getDeployableGenerals().some((g) => g.id === id));
        assert.equals(0, session.beginHomeWar('wu').length, '對別國開戰不影響');
        assert.equals('NORMAL', session.mind.moodOf(id, {}));
        const hit = session.beginHomeWar('shu');
        assert.equals(id, hit.join(','));
        assert.equals('LOW', session.mind.moodOf(id, { season: (session as unknown as { _clock: { state: { totalSeasonsElapsed: number } } })._clock.state.totalSeasonsElapsed }), '心情 −30 → 低落');
        assert.equals(60, session.roster.find((g) => g.id === id)?.loyaltyState?.value, '忠誠 80 − 20');
        assert.isFalse(session.getDeployableGenerals().some((g) => g.id === id), '對母國這場不可出征');
        assert.isFalse(session.rivalBattleSquad().length === 0, '其他武將仍可迎戰');
        assert.equals(0, session.beginHomeWar('shu').length, '同一場戰役重複呼叫冪等');
        assert.equals(60, session.roster.find((g) => g.id === id)?.loyaltyState?.value, '不重複扣');
        session.endHomeWar('shu');
        assert.isTrue(session.getDeployableGenerals().some((g) => g.id === id), '戰後解除，可再出征');
        assert.equals(60, session.roster.find((g) => g.id === id)?.loyaltyState?.value, '忠誠不回復');
    });

    suite.test('SP2：忠誠鎖定者不扣忠誠，但仍受心情與出征限制', async () => {
        const { session, cmd, setRelation } = await newBundle();
        setRelation('shu', 50);
        const ok = await cmd<{ generalId: string; created: boolean }>({ source: 'diplomatic', nationId: 'shu' });
        const id = (ok as { result: { generalId: string } }).result.generalId;
        const roster = session.roster.map((g) => (g.id === id ? { ...g, loyaltyState: { value: 100, isLocked: true, sourceType: 'Mercenary' as const } } : g));
        (session as unknown as { _roster: { replaceAll(r: unknown): void } })._roster.replaceAll(roster);
        session.beginHomeWar('shu');
        assert.equals(100, session.roster.find((g) => g.id === id)?.loyaltyState?.value);
        assert.isFalse(session.getDeployableGenerals().some((g) => g.id === id));
    });

    suite.test('SP2 漏洞：宣戰後沒出征就議和（atWar 解除）或該國覆滅，配偶的 homeWar 占用自動解除', async () => {
        const { session, cmd, holder, setRelation } = await newBundle();
        setRelation('shu', 50);
        const ok = await cmd<{ generalId: string; created: boolean }>({ source: 'diplomatic', nationId: 'shu' });
        const id = (ok as { result: { generalId: string } }).result.generalId;
        const setWar = async (atWar: boolean, fallen = false): Promise<void> => {
            await session.setRivals({ nations: holder._rivals.nations.map((n) => (n.id === 'shu' ? { ...n, atWar, ...(fallen ? { fallen: true } : {}) } : n)) } as never);
        };
        const deployable = (): boolean => session.getDeployableGenerals().some((g) => g.id === id);
        session.beginHomeWar('shu');
        await setWar(true);
        assert.isFalse(deployable(), '交戰中仍被母國占用擋住');
        await setWar(false);
        assert.isTrue(deployable(), '議和後占用解除，可再出征');
        session.beginHomeWar('shu');
        assert.isFalse(deployable(), '重新開戰可再占（冪等鍵已釋放）');
        await setWar(false, true);
        assert.isTrue(deployable(), '該國覆滅也解除');
    });

    return suite;
}
