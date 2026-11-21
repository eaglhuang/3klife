/**
 * FamilyCommands.test.ts — family.enrollSpouse 共通 API 與 QA 快進（PROG-2-9582 F11）
 *
 * 涵蓋：首子系統配偶走命令納入名冊（可出征）、冪等、上限、禁帶欄位與未知來源的錯誤碼、
 * 宿主未綁定回 E360、QA 快進網址解析與兩個情境（spouse／nursing）。
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
import { fastForwardFamily, parseQaFamilyParams } from '../assets/scripts/ui/core/FamilyQaFastForward';

const ROOT = join(__dirname, '..');
const generals = JSON.parse(readFileSync(join(ROOT, 'assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];
const readJson = (name: string): unknown => JSON.parse(readFileSync(join(ROOT, `assets/resources/data/${name}.json`), 'utf8'));

async function newBundle() {
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore());
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setAutoSave(false);
    session.setRandomSource(() => 0.5);
    session.setGeneralTemplates(generals);
    session.configureFamily(readJson('family-config'));
    session.configureOccupancyMatrix(readJson('occupancy-matrix'));
    await session.startNewGameWithStarters(5, generals, {});
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    bundle.setFamilyHost(session.spouseHost);
    bundle.setOccupancyHost(session.occupancyHost);
    return { session, api: bundle.api, bundle };
}

export function createFamilyCommandsSuite(): TestSuite {
    const suite = new TestSuite('FamilyCommands (family.enrollSpouse 與 QA 快進 PROG-2-9582)');

    suite.test('first-child：命令納入系統配偶，名冊有她、可出征；重送冪等', async () => {
        const { session, api } = await newBundle();
        const first = await api.cmd<{ generalId: string; created: boolean }>('family.enrollSpouse', { source: 'first-child' }, { idemKey: 'fam:1' });
        assert.isTrue(!isApiFail(first) && first.result.created);
        const id = (first as { result: { generalId: string } }).result.generalId;
        assert.isTrue(session.isSpouse(id));
        assert.isTrue(session.getDeployableGenerals().some((g) => g.id === id), '配偶應在可出征名單');
        const again = await api.cmd<{ generalId: string; created: boolean }>('family.enrollSpouse', { source: 'first-child' }, { idemKey: 'fam:2' });
        assert.isTrue(!isApiFail(again) && !again.result.created && again.result.generalId === id, '新 idemKey 重送＝冪等，不重複入冊');
        assert.equals(1, session.roster.filter((g) => g.id === id).length);
    });

    suite.test('錯誤碼：未知來源 E363、多帶欄位 E103、宿主未綁定 E360、上限 E362', async () => {
        const { api, session } = await newBundle();
        const unknown = await api.cmd('family.enrollSpouse', { source: 'ghost' }, { idemKey: 'fam:3' });
        assert.isTrue(isApiFail(unknown) && unknown.errorCode === 'E363');
        const extra = await api.cmd('family.enrollSpouse', { source: 'first-child', generalId: 'x' }, { idemKey: 'fam:4' });
        assert.isTrue(isApiFail(extra) && extra.errorCode === 'E103');
        const bare = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
        const none = await bare.api.cmd('family.enrollSpouse', { source: 'first-child' }, { idemKey: 'fam:5' });
        assert.isTrue(isApiFail(none) && none.errorCode === 'E360');
        // 上限：幕府等級 1 上限 2，先塞滿兩位再命令納入第三個 slot 的來源不存在，改直接驗 session 上限路徑
        assert.isTrue(session.enrollGeneratedSpouse('cap:1').ok);
        assert.isTrue(session.enrollGeneratedSpouse('cap:2').ok);
        const full = await api.cmd('family.enrollSpouse', { source: 'first-child' }, { idemKey: 'fam:6' });
        assert.isTrue(isApiFail(full) && full.errorCode === 'E362');
    });

    suite.test('QA 快進網址解析：沒帶／未知情境回 null', () => {
        assert.equals('spouse', parseQaFamilyParams('?qaFamily=spouse'));
        assert.equals('nursing', parseQaFamilyParams('?a=1&qaFamily=nursing'));
        assert.equals(null, parseQaFamilyParams('?qaFamily=ghost'));
        assert.equals(null, parseQaFamilyParams(''));
        assert.equals(null, parseQaFamilyParams(undefined));
    });

    suite.test('QA 快進 spouse／nursing：只走共通 API；nursing 的配偶出征被擋、太守放行', async () => {
        const { api, session } = await newBundle();
        let seq = 0;
        const port = {
            cmd: async (name: string, args: Record<string, unknown>) => {
                const res = await api.cmd(name, args, { idemKey: `qa:${seq++}` });
                return isApiFail(res) ? { ok: false, reason: res.reason } : { ok: true, result: res.result };
            },
        };
        const spouse = await fastForwardFamily(port, 'spouse');
        assert.isTrue(spouse.created && session.getDeployableGenerals().some((g) => g.id === spouse.generalId));
        const nursing = await fastForwardFamily(port, 'nursing');
        assert.isFalse(nursing.created, '同一位配偶，重送冪等');
        assert.isFalse(session.getDeployableGenerals().some((g) => g.id === nursing.generalId), '哺乳中不在出征名單');
        const gov = session.assignGovernor('farming', nursing.generalId);
        assert.isTrue(gov.ok, '哺乳中仍可當太守');
    });

    suite.test('clan：高門求親走 family.enrollSpouse（source: clan）納配偶且可出征，無效 id 回 E364', async () => {
        const { api, session } = await newBundle();
        const missing = await api.cmd('family.enrollSpouse', { source: 'clan', proposalId: 'missing-prop' }, { idemKey: 'clan:1' });
        assert.isTrue(isApiFail(missing) && missing.errorCode === 'E364');
        const proposal = {
            id: 'prop-clan-1',
            targetId: session.roster[0].id,
            targetName: session.roster[0].name,
            family: '潁川荀氏',
            giftGold: 650,
            fromHighClanProposal: true,
            suitor: { id: 'suitor-clan-1', name: '荀氏千金', gender: '女' as const, age: 18, str: 45, int: 82, lea: 60, pol: 85, cha: 88, luk: 60, ep: 72 },
        };
        (session as unknown as { _marriageProposal: unknown })._marriageProposal = proposal;
        const ok = await api.cmd<{ generalId: string; created: boolean }>('family.enrollSpouse', { source: 'clan', proposalId: 'prop-clan-1' }, { idemKey: 'clan:2' });
        assert.isTrue(!isApiFail(ok) && ok.result.created && ok.result.generalId === 'suitor-clan-1');
        assert.isTrue(session.isSpouse('suitor-clan-1'));
        assert.isTrue(session.getDeployableGenerals().some((g) => g.id === 'suitor-clan-1'));
        assert.equals(null, session.marriageProposal);
    });

    return suite;
}
