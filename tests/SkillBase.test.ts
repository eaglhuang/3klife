/**
 * SkillBase.test.ts — 技能 base 最小版（PROG-2-9204 SKL-M；技能規格 doc_spec_1187）
 *
 * 涵蓋：定義庫與中文名、授予／學習／升級／調整值的純邏輯、skill.* 命令（冪等、權威欄位、錯誤碼）、
 * 學府結業經 skill.grant 寫回、舊存檔相容。
 */
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GeneralSkillStore } from '../assets/scripts/core/systems/skill/GeneralSkillStore';
import { createDefaultSkillRegistry, skillNameOf } from '../assets/scripts/core/systems/skill/SkillCatalog';
import type { AcademyStateSnapshot } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import { isApiFail } from '../assets/scripts/shared/api/ApiProtocol';
import { NURTURE_SKILL_DEFS } from '../assets/scripts/shared/skill/NurtureSkillDefs';
import { SkillRegistry } from '../assets/scripts/shared/skill/SkillRegistry';
import { SkillService } from '../assets/scripts/shared/skill/SkillService';
import type { HolderRef, SkillDef, SkillLearnAuthority } from '../assets/scripts/shared/skill/SkillTypes';

const HOLDER: HolderRef = { kind: 'general', id: 'g1' };

function general(extra: Partial<GeneralConfig> = {}): GeneralConfig {
    return { id: 'g1', name: '測試', str: 30, lea: 30, int: 30, pol: 30, cha: 30, ...extra } as unknown as GeneralConfig;
}

function makeRoster(g: GeneralConfig) {
    const list = [g];
    return {
        list,
        roster: {
            find: (id: string) => list.find((x) => x.id === id),
            replace: (next: GeneralConfig) => { list[list.findIndex((x) => x.id === next.id)] = next; },
        },
    };
}

function def(id: string, extra: Partial<SkillDef> = {}): SkillDef {
    return { schema: 'skill-def.v1', id, domain: 'battle', name: id, tags: [], ...extra };
}

function rig(g: GeneralConfig = general(), authority: SkillLearnAuthority | null = null) {
    const r = makeRoster(g);
    const registry = new SkillRegistry().registerAll([
        def('t-a', { cost: { tp: 30 }, learn: { tpThresholdMul: 2 } }),
        def('t-b'),
        def('t-lv', { levels: [{ lv: 1 }, { lv: 2, xpRequired: 10 }] }),
    ]);
    const service = new SkillService({ registry, store: new GeneralSkillStore(r.roster), authority, now: () => 5 });
    return { ...r, registry, service };
}

function snapshot(overrides: Partial<AcademyStateSnapshot> = {}): AcademyStateSnapshot {
    return {
        graduated: true, childId: 'g1',
        stats: { str: 210, lea: 180, int: 150, pol: 120, cha: 140 },
        learnedTactics: ['TACTIC_GENERIC_VALOR', 'TAC_LIAODI_JIXIAN'], learnedTraits: [],
        ...overrides,
    } as unknown as AcademyStateSnapshot;
}

function session(withApi: boolean) {
    const s = new GameSession();
    s.setRosterStore(new InMemoryRosterStore([general({ learnedTactics: ['OLD_TACTIC'] })]));
    s.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    s.setRandomSource(() => 0.4);
    let bundle: ReturnType<typeof createLocalApi> | null = null;
    if (withApi) {
        bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
        bundle.setSkillHost(s.skillHost);
        s.setSkillApi(bundle.api);
    }
    return { s, bundle };
}

export function createSkillBaseSuite(): TestSuite {
    const suite = new TestSuite('SkillBase (技能 base 最小版 PROG-2-9204)');

    suite.test('學府戰法定義齊全：學府引擎可能出現的戰法 id 都有中文名', () => {
        const ids = ['TACTIC_GENERIC_VALOR', 'TACTIC_GENERIC_STRATEGY', 'TACTIC_GENERIC_COMMAND', 'TAC_LIAODI_JIXIAN', 'TAC_SHISHENG_SHIBAI',
            'TAC_QUHU_TUNLANG', 'TAC_YIJI', 'TAC_JIUPIN_GUANREN', 'TAC_HENGJIANG_ESHO', 'TAC_LIANHUAN_SHENHUO', 'TAC_BAZHEN_XUANJI',
            'TAC_SHENJI_LIANNU', 'TAC_JIUPIN_ZHONGZHENG', 'TAC_GONGQING_WEIYI', 'TAC_TUQI_POZHEN', 'TAC_BAIMA_YICONG'];
        for (const id of ids) {
            const name = skillNameOf(id);
            assert.isTrue(!!name && name !== id && !/^TAC/.test(name), `${id} 缺中文名`);
        }
        assert.equals('勇武歷練', skillNameOf('TACTIC_GENERIC_VALOR'));
        assert.equals('火攻', skillNameOf('TAC_FIRE_ATTACK'));
        assert.equals(undefined, skillNameOf('NOPE'));
        assert.equals(NURTURE_SKILL_DEFS.length, createDefaultSkillRegistry().list('nurture').length);
    });

    suite.test('grant 冪等：已持有略過、重送不重複；未知 id 仍寫入但回報', () => {
        const { service, list } = rig();
        const first = service.grant(HOLDER, ['t-a', 'mystery', 't-a'], 'academy');
        assert.equals('t-a,mystery', first.granted.join(','));
        assert.equals('mystery', first.unknown.join(','));
        const again = service.grant(HOLDER, ['t-a', 'mystery'], 'academy');
        assert.equals(0, again.granted.length);
        assert.equals('t-a,mystery', again.skipped.join(','));
        assert.equals('t-a,mystery', (list[0].learnedTactics ?? []).join(','));
        assert.equals('academy', list[0].skillMeta!['t-a'].from);
    });

    suite.test('舊存檔相容：只有 learnedTactics 的武將讀成等級 1、來源 legacy，寫入新技能不傷舊戰法', () => {
        const { service, list } = rig(general({ learnedTactics: ['old-1'] }));
        const holding = service.list(HOLDER);
        assert.equals(1, holding.skills[0].level);
        assert.equals('legacy', holding.skills[0].learnedFrom);
        assert.equals(0, holding.modifiers.length);
        service.grant(HOLDER, ['t-b'], 'reward');
        assert.equals('old-1,t-b', (list[0].learnedTactics ?? []).join(','));
    });

    suite.test('learn：沒有權威回 null；TP 不足、未取資格、槽位滿、已學各回對應原因；成功扣 TP 並寫持有', () => {
        assert.equals(null, rig().service.learn(HOLDER, 't-a', 'learn'));
        let tp = 59;
        let spent = 0;
        let qualified = true;
        let cap = 2;
        const authority: SkillLearnAuthority = {
            facts: () => ({ tp, slotCapacity: cap, qualified }),
            spendTp: (_h, n) => { spent += n; tp -= n; return true; },
        };
        const { service, list } = rig(general(), authority);
        assert.equals('TP_SHORT', service.learn(HOLDER, 't-a', 'learn')!.blocked);
        tp = 60;
        qualified = false;
        assert.equals('NOT_INSPIRED', service.canLearn(HOLDER, 't-a')!.blocked);
        qualified = true;
        cap = 0;
        assert.equals('NO_SLOT', service.canLearn(HOLDER, 't-a')!.blocked);
        cap = 2;
        assert.equals('INVALID_SKILL', service.canLearn(HOLDER, 'ghost')!.blocked);
        const ok = service.learn(HOLDER, 't-a', 'inspired')!;
        assert.isTrue(ok.ok);
        assert.equals(30, ok.spent!.tp);
        assert.equals(30, spent);
        assert.equals('inspired', list[0].skillMeta!['t-a'].from);
        assert.equals('ALREADY_LEARNED', service.learn(HOLDER, 't-a', 'inspired')!.blocked);
    });

    suite.test('upgrade：沒有等級表 MAX_LEVEL、熟練度不足不升、達標升一級', () => {
        const { service, list } = rig();
        service.grant(HOLDER, ['t-b', 't-lv'], 'reward');
        assert.equals('NOT_LEARNED', service.upgrade(HOLDER, 't-a').blocked);
        assert.equals('MAX_LEVEL', service.upgrade(HOLDER, 't-b').blocked);
        assert.equals('APTITUDE_UNMET', service.upgrade(HOLDER, 't-lv').blocked);
        list[0] = { ...list[0], skillMeta: { ...list[0].skillMeta, 't-lv': { ...list[0].skillMeta!['t-lv'], xp: 10 } } };
        const up = service.upgrade(HOLDER, 't-lv');
        assert.isTrue(up.ok);
        assert.equals(2, up.skill!.level);
        assert.equals('MAX_LEVEL', service.upgrade(HOLDER, 't-lv').blocked);
    });

    suite.test('modifier：policy:* 可疊加、同 id 重送不重複、可移除、結業時清掉 graduation 類', () => {
        const { service, list } = rig();
        assert.isTrue(service.applyModifier(HOLDER, { id: 'policy:STRENGTH', source: 'academy', until: 'graduation' }).applied);
        assert.isFalse(service.applyModifier(HOLDER, { id: 'policy:STRENGTH', source: 'academy', until: 'graduation' }).applied);
        service.applyModifier(HOLDER, { id: 'buff:x', source: 'reward', until: 'manual' });
        assert.equals(2, list[0].skillModifiers!.length);
        assert.isTrue(service.removeModifier(HOLDER, 'buff:x').removed);
        assert.isFalse(service.removeModifier(HOLDER, 'buff:x').removed);
        service.applyModifier(HOLDER, { id: 'buff:y', source: 'reward', until: 'manual' });
        assert.equals('policy:STRENGTH', service.clearModifiersUntil(HOLDER, 'graduation').join(','));
        assert.equals('buff:y', list[0].skillModifiers!.map((m) => m.id).join(','));
    });

    suite.test('skill.* 命令：list／grant 走 localserver；同 idemKey 重送回放不重複；權威欄位 E103；未知持有者 E612；無宿主 E611', async () => {
        const { s, bundle } = session(true);
        const api = bundle!.api;
        const holder = { kind: 'general', id: 'g1' };
        const key = 'skill.grant:test:1';
        const first = await api.cmd<{ granted: string[] }>('skill.grant', { holder, skillIds: ['TAC_YIJI'], source: 'reward' }, { idemKey: key });
        assert.isTrue(first.ok);
        const replay = await api.cmd('skill.grant', { holder, skillIds: ['TAC_YIJI'], source: 'reward' }, { idemKey: key });
        assert.isTrue(!!(replay as { replayed?: boolean }).replayed);
        const second = await api.cmd<{ granted: string[]; skipped: string[] }>('skill.grant', { holder, skillIds: ['TAC_YIJI'], source: 'reward' }, { idemKey: 'skill.grant:test:2' });
        assert.isTrue(second.ok);
        if (!isApiFail(second)) assert.equals('TAC_YIJI', second.result.skipped.join(','));
        const listed = await api.query<{ skills: { skillId: string }[] }>('skill.list', { holder });
        if (isApiFail(listed)) throw new Error('list failed');
        assert.equals('OLD_TACTIC,TAC_YIJI', listed.result.skills.map((x) => x.skillId).join(','));
        assert.equals(2, (s.roster.find((g) => g.id === 'g1')!.learnedTactics ?? []).length);

        const forbidden = await api.cmd('skill.learn', { holder, skillId: 'TAC_YIJI', source: 'x', level: 9 }, { idemKey: 'k3' });
        assert.isTrue(isApiFail(forbidden) && forbidden.errorCode === 'E103');
        const missing = await api.query('skill.list', { holder: { kind: 'general', id: 'nobody' } });
        assert.isTrue(isApiFail(missing) && missing.errorCode === 'E612');
        const noAuthority = await api.cmd('skill.learn', { holder, skillId: 'TAC_YIDI', source: 'x' }, { idemKey: 'k4' });
        assert.isTrue(isApiFail(noAuthority) && noAuthority.errorCode === 'E601');
        const noLearn = await api.cmd('skill.learn', { holder, skillId: 'TAC_HEAL', source: 'x' }, { idemKey: 'k5' });
        assert.isTrue(isApiFail(noLearn) && noLearn.errorCode === 'E611');
        const bad = await api.cmd('skill.grant', { holder, skillIds: 'x', source: 'x' }, { idemKey: 'k6' });
        assert.isTrue(isApiFail(bad) && bad.errorCode === 'E001');

        const bare = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()));
        const down = await bare.api.query('skill.list', { holder });
        assert.isTrue(isApiFail(down) && down.errorCode === 'E611');
    });

    suite.test('skill.upgrade／applyModifier 命令：沒有等級表回 E610；調整值可套用與移除', async () => {
        const { bundle } = session(true);
        const api = bundle!.api;
        const holder = { kind: 'general', id: 'g1' };
        const up = await api.cmd('skill.upgrade', { holder, skillId: 'TAC_YIJI' }, { idemKey: 'u1' });
        assert.isTrue(isApiFail(up) && up.errorCode === 'E601' || isApiFail(up) && up.errorCode === 'E613');
        await api.cmd('skill.grant', { holder, skillIds: ['TAC_YIJI'], source: 'reward' }, { idemKey: 'u2' });
        const up2 = await api.cmd('skill.upgrade', { holder, skillId: 'TAC_YIJI' }, { idemKey: 'u3' });
        assert.isTrue(isApiFail(up2) && up2.errorCode === 'E610');
        const applied = await api.cmd<{ changed: boolean }>('skill.applyModifier', { holder, modifierId: 'policy:BALANCE', source: 'academy', until: 'graduation' }, { idemKey: 'u4' });
        assert.isTrue(applied.ok && !isApiFail(applied) && applied.result.changed);
        const removed = await api.cmd<{ changed: boolean }>('skill.removeModifier', { holder, modifierId: 'policy:BALANCE' }, { idemKey: 'u5' });
        assert.isTrue(removed.ok && !isApiFail(removed) && removed.result.changed);
    });

    for (const withApi of [true, false]) {
        suite.test(`學府結業新戰法經 skill.grant 寫回（${withApi ? '經 localserver 端點' : '無 API 時退回同一服務'}）：保留舊戰法、記來源 academy、結業清期中方針`, async () => {
            const { s } = session(withApi);
            s.skillHost.service.applyModifier(HOLDER, { id: 'policy:STRENGTH', source: 'academy', until: 'graduation' });
            const result = await s.graduateFromAcademy('g1', snapshot());
            assert.isTrue(result !== null);
            assert.equals('TACTIC_GENERIC_VALOR,TAC_LIAODI_JIXIAN', result!.newTactics.join(','));
            const g = s.roster.find((x) => x.id === 'g1')!;
            assert.equals('OLD_TACTIC,TACTIC_GENERIC_VALOR,TAC_LIAODI_JIXIAN', (g.learnedTactics ?? []).join(','));
            assert.equals('academy', g.skillMeta!.TAC_LIAODI_JIXIAN.from);
            assert.equals(210, g.str);
            assert.equals(0, (g.skillModifiers ?? []).length);
            assert.equals('OLD_TACTIC,TACTIC_GENERIC_VALOR,TAC_LIAODI_JIXIAN', result!.general.learnedTactics!.join(','));
        });
    }

    suite.test('結業重送不重複寫戰法（舊存檔補結業路徑）', async () => {
        const { s } = session(true);
        await s.graduateFromAcademy('g1', snapshot());
        const again = await s.graduateFromAcademy('g1', snapshot());
        assert.equals(0, again!.newTactics.length);
        assert.equals(3, (s.roster.find((x) => x.id === 'g1')!.learnedTactics ?? []).length);
    });

    return suite;
}
