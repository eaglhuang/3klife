/**
 * PrisonerOfWar.test.ts — 俘虜產生與四選一處置 headless 測試（PROG-2-0073）
 *
 * Unity 對照：EditMode Test，驗證戰後 DialogChoice 的結算結果與 SaveData 寫回。
 */
import { TestSuite, assert } from './TestRunner';
import {
    createPowRecord,
    isPowExempt,
    normalizePrisonState,
    persuadeRate,
    powOptionLabels,
    powRarityOf,
    powResultLine,
    PRISON_SLOTS_INITIAL,
    prisonYieldOf,
    prisonYieldOneSeason,
    resolvePowDecision,
    type PowRecord,
} from '../assets/scripts/core/systems/PrisonerOfWar';
import { STARTER_MILITARY } from '../assets/scripts/core/systems/MilitaryReserve';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const LU_BU = { id: 'lu-bu', name: '呂布', cha: 40, luk: 30, int: 26, pol: 13, loyalty: 20, rarityTier: 'legendary' };

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 80, pol: 50, cha: 80, luk: 50, ...extra } as unknown as GeneralConfig;
}

function ctx(roll: number, extra: Partial<Parameters<typeof resolvePowDecision>[2]> = {}) {
    return { random: () => roll, gold: 10000, cityTroops: 10000, prisonUsed: 0, ...extra };
}

export function createPrisonerOfWarSuite(): TestSuite {
    const suite = new TestSuite('PrisonerOfWar');

    suite.test('勸降率：20% + 魅力差×0.5 + 運氣×0.2 − 忠誠×0.3，夾在 1~95%', () => {
        // 20 + (80-40)*0.5 + 50*0.2 - 20*0.3 = 20 + 20 + 10 - 6 = 44
        assert.equals(44, persuadeRate({ cha: 80, luk: 50 }, LU_BU));
        assert.equals(54, persuadeRate({ cha: 80, luk: 50 }, LU_BU, 10), '道具加成');
        assert.equals(1, persuadeRate({ cha: 0, luk: 0 }, { ...LU_BU, cha: 100, loyalty: 100 }), '下界');
        assert.equals(95, persuadeRate({ cha: 200, luk: 200 }, { ...LU_BU, cha: 0, loyalty: 0 }), '上界');
        // 沒有忠誠度資料：預設 60
        assert.equals(20 + 20 + 10 - 18, persuadeRate({ cha: 80, luk: 50 }, { ...LU_BU, loyalty: null }));
    });

    suite.test('POW_Record：稀有度、招募消耗、監獄產出、放走名聲依規格表', () => {
        const record = createPowRecord(LU_BU, { cha: 80, luk: 50 })!;
        assert.equals('SSR', record.rarity);
        assert.equals(8000, record.options.recruitCost.gold);
        assert.equals(1500, record.options.recruitCost.troops);
        assert.equals(500, record.options.releaseFame);
        assert.equals(2, record.options.prisonYield.intel);
        assert.equals(56, record.options.prisonYield.resource);
        assert.equals(null, record.decision);
        assert.equals('SR', powRarityOf('epic'));
        assert.equals('R', powRarityOf('rare'));
        assert.equals('R', powRarityOf(undefined));
        assert.equals(JSON.stringify({ intel: 9, resource: 90 }), JSON.stringify(prisonYieldOf({ id: 'x', name: 'x', int: 95, pol: 80 })));
    });

    suite.test('試用傭兵絕對豁免（Q74），不產生 POW', () => {
        assert.equals(null, createPowRecord({ ...LU_BU, isMercenary: true }, {}));
        assert.equals(null, createPowRecord({ ...LU_BU, templateFlag: 'MERC_TRIAL' }, {}));
        assert.isTrue(isPowExempt({ id: 'm', name: 'm', hiddenFlags: ['MERC_TRIAL'] }));
        assert.isFalse(isPowExempt(LU_BU));
    });

    suite.test('四選一：勸降擲骰可注入、失敗不能重擲但可改關押或放走', () => {
        const record = createPowRecord(LU_BU, { cha: 80, luk: 50 })!;
        const ok = resolvePowDecision(record, 'persuade', ctx(0.43));
        assert.isTrue(ok.ok && ok.joined);
        assert.equals('persuade', ok.record.decision);
        const fail = resolvePowDecision(record, 'persuade', ctx(0.44));
        assert.isFalse(fail.ok);
        assert.equals('PERSUADE_FAILED', fail.reasons.join(','));
        assert.equals('呂布：寧死不降！', powResultLine(fail));
        assert.equals('ALREADY_DECIDED', resolvePowDecision(fail.record, 'persuade', ctx(0)).reasons.join(','));
        const jailed = resolvePowDecision(fail.record, 'imprison', ctx(0));
        assert.isTrue(jailed.ok && jailed.imprisoned);
        assert.equals('ALREADY_DECIDED', resolvePowDecision(jailed.record, 'release', ctx(0)).reasons.join(','));
    });

    suite.test('招募：黃金與城市兵源都要夠，不足時分開提示且不扣；放走得名聲；監獄滿不能關', () => {
        const record: PowRecord = createPowRecord(LU_BU, {})!;
        const short = resolvePowDecision(record, 'recruit', ctx(0, { gold: 100, cityTroops: 100 }));
        assert.equals('GOLD_SHORT,CITY_TROOPS_SHORT', short.reasons.join(','));
        assert.equals(0, short.goldSpent);
        assert.equals(null, short.record.decision, '資源不足保持未決定');
        const paid = resolvePowDecision(record, 'recruit', ctx(0));
        assert.isTrue(paid.joined);
        assert.equals(8000, paid.goldSpent);
        assert.equals(1500, paid.cityTroopsSpent);
        const released = resolvePowDecision(record, 'release', ctx(0));
        assert.equals(500, released.fameGained);
        assert.equals('主公義釋 呂布，呂布：此恩必報！', powResultLine(released));
        assert.equals('PRISON_FULL', resolvePowDecision(record, 'imprison', ctx(0, { prisonUsed: PRISON_SLOTS_INITIAL })).reasons.join(','));
        const labels = powOptionLabels(record);
        assert.equals('招募（消耗 8000 黃金 + 1500 城市兵源）', labels.recruit);
        assert.equals('放走（獲得 500 名聲）', labels.release);
    });

    suite.test('監獄狀態：正規化與每季產出合計', () => {
        const state = normalizePrisonState({ pending: [null, { record: { targetUid: 'a' } }], prisoners: [{ targetUid: 'b', yieldPerSeason: { intel: 3, resource: 60 } }], slots: 99, fame: -5 });
        assert.equals(1, state.pending.length);
        assert.equals(10, state.slots, '格數上限 10');
        assert.equals(0, state.fame);
        assert.equals(JSON.stringify({ intel: 3, resource: 60 }), JSON.stringify(prisonYieldOneSeason(state.prisoners)));
        assert.equals(0, normalizePrisonState(undefined).pending.length);
    });

    suite.test('GameSession：俘虜敵將→招募入名冊並扣城市兵源；關押每季產出；放走加名聲；存讀檔保留', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([general('lead')]));
        session.setSaveService(new PlayerSaveService(adapter));

        const record = (await session.capturePrisoner(general('lu-bu', { name: '呂布', rarityTier: 'legendary', cha: 40 })))!;
        assert.equals('SSR', record.rarity);
        assert.equals(null, await session.capturePrisoner(general('lu-bu')), '同一人不重複俘虜');
        assert.equals(null, await session.capturePrisoner(general('lead')), '自己人不能俘虜');
        assert.equals(null, await session.capturePrisoner(general('merc', { hiddenFlags: ['MERC_TRIAL'] })), '傭兵豁免');
        await session.capturePrisoner(general('chen-gong', { name: '陳宮', rarityTier: 'epic', int: 90, pol: 80 }));
        await session.capturePrisoner(general('gao-shun', { name: '高順', rarityTier: 'rare' }));
        assert.equals(3, session.prison.pending.length);

        const recruited = (await session.resolvePrisoner('lu-bu', 'recruit', { gold: 9000 }))!;
        assert.isTrue(recruited.joined);
        assert.equals(8000, recruited.goldSpent);
        assert.isTrue(session.roster.some((g) => g.id === 'lu-bu'), '加入名冊');
        assert.equals(STARTER_MILITARY.cityTroops - 1500, session.military.cityTroops);

        const jailed = (await session.resolvePrisoner('chen-gong', 'imprison'))!;
        assert.isTrue(jailed.imprisoned);
        const released = (await session.resolvePrisoner('gao-shun', 'release'))!;
        assert.equals(100, released.fameGained);
        assert.equals(null, await session.resolvePrisoner('nobody', 'release'));

        const restored = new GameSession(3);
        restored.setRosterStore(new InMemoryRosterStore());
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        assert.equals(0, restored.prison.pending.length);
        assert.equals('chen-gong', restored.prison.prisoners.map((p) => p.targetUid).join(','));
        assert.equals(100, restored.prison.fame);
        await restored.advanceSeason();
        assert.equals(9, restored.prison.intel, '陳宮 INT 90 → 每季情報 9');
    });

    return suite;
}
