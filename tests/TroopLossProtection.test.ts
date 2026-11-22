/**
 * TroopLossProtection.test.ts — 第 1 年敗戰新手保護＋傷兵營（PROG-2-9717）
 *
 * 損兵上限＝戰前城市兵源 30%（陣亡＋傷兵總量）、上限內 60% 進傷兵營、傷兵營每季康復 30%；
 * 只限第 1 年敗戰，勝利、平手、第 2 年不保護；傷兵營進存檔。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { formatAftermathLines, planBattleAftermath } from '../assets/scripts/core/systems/BattleAftermath';
import {
    applyNoviceLossProtection, configureTroopLossRules, DEFAULT_TROOP_LOSS_RULES, resetTroopLossRules, splitLostTroops, troopLossRules,
} from '../assets/scripts/core/systems/CommandSortieLoss';
import { normalizeMilitaryReserve, regenMilitaryOneSeason, STARTER_MILITARY } from '../assets/scripts/core/systems/MilitaryReserve';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const ROOT = path.resolve(__dirname, '..');
/** 城市兵源上限 3000（ResourceCap），起始給滿 */
const START_TROOPS = 3000;
const REGEN = 100;
/** 敗戰時戰場回報的原始損兵：遠大於 30% 上限 */
const RAW_LOST = 3000;

function makeGeneral(id: string): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, ep: 10,
        vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
    } as unknown as GeneralConfig;
}

function setup(adapter?: MemoryStorageAdapter): GameSession {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([makeGeneral('lead-1')]));
    session.setRandomSource(() => 0.99);
    if (adapter) { session.setSaveService(new PlayerSaveService(adapter)); session.setAutoSave(false); }
    const internal = session as unknown as { _military: { cityTroops: number; recruitRegen: number; food: number } };
    internal._military.cityTroops = START_TROOPS;
    internal._military.recruitRegen = REGEN;
    internal._military.food = 500;
    return session;
}

function setYear(session: GameSession, year: number): void {
    const clock = (session as unknown as { _clock: { state: Record<string, unknown>; restore(s: unknown): void } })._clock;
    clock.restore({ ...clock.state, currentYear: year });
}

export function createTroopLossProtectionSuite(): TestSuite {
    const suite = new TestSuite('TroopLossProtection (PROG-2-9717 第一年敗戰新手保護與傷兵營)');

    suite.test('設定檔 troop-loss-rules.json 與預設一致；壞值退回預設', () => {
        const json = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/troop-loss-rules.json'), 'utf8')) as Record<string, number>;
        configureTroopLossRules(json);
        assert.equals(DEFAULT_TROOP_LOSS_RULES.woundedRatio, troopLossRules().woundedRatio);
        assert.equals(0.6, troopLossRules().woundedRatio);
        assert.equals(0.3, troopLossRules().recoveryRatio);
        assert.equals(0.3, troopLossRules().noviceLossCapRatio);
        assert.equals(1, troopLossRules().noviceProtectionMaxYear);
        configureTroopLossRules({ woundedRatio: 'x' as unknown as number, noviceLossCapRatio: 9 });
        assert.equals(0.6, troopLossRules().woundedRatio, '壞值退回預設');
        assert.equals(0.3, troopLossRules().noviceLossCapRatio, '超出 0~1 退回預設');
        resetTroopLossRules();
        const loader = fs.readFileSync(path.join(ROOT, 'assets/scripts/core/managers/ServiceLoader.ts'), 'utf8');
        assert.isTrue(loader.indexOf('TROOP_LOSS_RULES_JSON') >= 0 && loader.indexOf('configureTroopLossRules') >= 0, 'ServiceLoader 有載入設定檔');
    });

    suite.test('純邏輯：只有第 1 年敗戰受保護，上限＝戰前兵源 30%', () => {
        const loss = applyNoviceLossProtection(3000, 5000, 1, 'loss');
        assert.isTrue(loss.applies);
        assert.equals(1500, loss.lostTroops);
        assert.equals(1500, loss.reduced);
        const small = applyNoviceLossProtection(400, 5000, 1, 'loss');
        assert.equals(400, small.lostTroops, '損兵低於上限不動');
        assert.equals(0, small.reduced);
        for (const outcome of ['win', 'draw'] as const) {
            const r = applyNoviceLossProtection(3000, 5000, 1, outcome);
            assert.isFalse(r.applies);
            assert.equals(3000, r.lostTroops);
        }
        const y2 = applyNoviceLossProtection(3000, 5000, 2, 'loss');
        assert.isFalse(y2.applies, '第 2 年不保護');
        assert.equals(3000, y2.lostTroops);
        const s = splitLostTroops(1500);
        assert.equals(900, s.wounded);
        assert.equals(600, s.dead);
    });

    suite.test('四連敗兵源曲線（第 1 年，含每季康復）：每場損兵不超過戰前 30%，傷兵營逐季康復 30%', async () => {
        const session = setup();
        const curve: Array<[number, number]> = [];
        for (let i = 0; i < 4; i++) {
            const before = session.military.cityTroops;
            await session.recordBattle(['lead-1'], 'enemy-win', { sortie: { lostTroops: RAW_LOST, foodSpent: 0 } });
            const lost = before - session.military.cityTroops;
            assert.isTrue(lost <= Math.floor(before * 0.3), `第 ${i + 1} 敗損兵 ${lost} 不超過戰前 ${before} 的 30%`);
            curve.push([session.military.cityTroops, session.military.woundedCamp]);
            if (i < 3) {
                await session.advanceSeason();
                curve.push([session.military.cityTroops, session.military.woundedCamp]);
            }
        }
        // [敗1, 季1, 敗2, 季2, 敗3, 季3, 敗4]，每點為 [城市兵源, 傷兵營]
        assert.equals('2100,540', curve[0].join(','));
        assert.equals('2362,378', curve[1].join(','));
        assert.equals('1654,802', curve[2].join(','));
        assert.equals('1994,562', curve[3].join(','));
        assert.equals('1396,920', curve[4].join(','));
        assert.equals('1772,644', curve[5].join(','));
        assert.equals('1241,962', curve[6].join(','));
        assert.equals(1, session.gameTime.currentYear, '四場都在第 1 年內打完');
    });

    suite.test('敗戰結算文字：新手保護減免與傷兵營兩行', async () => {
        const session = setup();
        const result = await session.recordBattle(['lead-1'], 'enemy-win', { sortie: { lostTroops: RAW_LOST, foodSpent: 0 } });
        assert.equals(2100, result.aftermath?.noviceProtectionReduced);
        assert.equals(540, result.aftermath?.woundedSent);
        assert.isTrue(result.aftermathLines.indexOf('新手保護：損兵減免 2100') >= 0);
        assert.isTrue(result.aftermathLines.indexOf('傷兵 540 人送入傷兵營，每季康復 30%') >= 0);
        // 沒適用保護的帳本不出現這兩行
        const plain = planBattleAftermath('loss', { food: 0, foodCap: 100, gold: 0, goldCap: 100, random: () => 0.99 });
        assert.equals(0, formatAftermathLines(plain).filter((l) => l.indexOf('新手保護') >= 0 || l.indexOf('傷兵營') >= 0).length);
    });

    suite.test('年終守城敗戰（defense）同樣適用；極速決戰敗戰（8% < 30%）損兵照推估、不減免', async () => {
        const a = setup();
        const r = await a.recordBattle(['lead-1'], 'enemy-win', { sortie: { lostTroops: RAW_LOST, foodSpent: 0 }, defense: { moraleOnVictory: 2, playerGeneralsDown: false } });
        assert.equals(2100, r.aftermath?.noviceProtectionReduced);
        assert.equals(2100, a.military.cityTroops);
        const b = setup();
        const q = await b.recordBattle(['lead-1'], 'enemy-win', { offBoard: true });
        assert.equals(240, q.aftermath?.lostTroops, '3000 × 8% = 240');
        assert.equals(0, q.aftermath?.noviceProtectionReduced);
        assert.equals(144, b.military.woundedCamp);
    });

    suite.test('勝利與平手不受影響：損兵全額、傷兵營不動、沒有保護文字', async () => {
        for (const result of ['player-win', 'draw'] as const) {
            const session = setup();
            const r = await session.recordBattle(['lead-1'], result, { sortie: { lostTroops: 2000, foodSpent: 0 } });
            assert.equals(1000, session.military.cityTroops);
            assert.equals(0, session.military.woundedCamp);
            assert.equals(undefined, r.aftermath?.noviceProtectionReduced);
            assert.equals(0, r.aftermathLines.filter((l) => l.indexOf('新手保護') >= 0).length);
        }
    });

    suite.test('第 2 年敗戰不保護：損兵全額、傷兵營不動', async () => {
        const session = setup();
        setYear(session, 2);
        const r = await session.recordBattle(['lead-1'], 'enemy-win', { sortie: { lostTroops: 2000, foodSpent: 0 } });
        assert.equals(1000, session.military.cityTroops);
        assert.equals(0, session.military.woundedCamp);
        assert.equals(undefined, r.aftermath?.woundedSent);
    });

    suite.test('每季康復受兵源上限限制；傷兵營舊存檔缺欄位補 0', () => {
        const full = { ...STARTER_MILITARY, cityTroops: STARTER_MILITARY.cityTroopsCap, woundedCamp: 1000 };
        const after = regenMilitaryOneSeason(full);
        assert.equals(STARTER_MILITARY.cityTroopsCap, after.cityTroops);
        assert.equals(1000, after.woundedCamp, '兵源已滿時傷兵留在營內');
        assert.equals(0, normalizeMilitaryReserve({ cityTroops: 100, cityTroopsCap: 200, recruitRegen: 10, food: 1, foodCap: 2 }).woundedCamp);
        assert.equals(0, normalizeMilitaryReserve({ woundedCamp: -5 }).woundedCamp);
    });

    suite.test('傷兵營進存檔：存讀檔後保留，並繼續按季康復', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = setup(adapter);
        await session.recordBattle(['lead-1'], 'enemy-win', { sortie: { lostTroops: RAW_LOST, foodSpent: 0 } });
        assert.equals(540, session.military.woundedCamp);
        await session.save();
        const again = new GameSession(3);
        again.setRosterStore(new InMemoryRosterStore([makeGeneral('lead-1')]));
        again.setSaveService(new PlayerSaveService(adapter));
        again.setAutoSave(false);
        assert.isTrue(await again.load());
        assert.equals(540, again.military.woundedCamp, '讀檔後傷兵營保留');
        assert.equals(2100, again.military.cityTroops);
        await again.advanceSeason();
        assert.equals(378, again.military.woundedCamp, '讀檔後仍每季康復 30%');
    });

    return suite;
}
