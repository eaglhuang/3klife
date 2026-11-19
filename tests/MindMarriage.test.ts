/**
 * MindMarriage.test.ts — PROG-2-9165 武將心智接結緣單元測試
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { Faction } from '../assets/scripts/core/config/Constants';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { ServiceLoader } from '../assets/scripts/core/managers/ServiceLoader';
import { OfflineGeneralMindService } from '../assets/scripts/core/mind/OfflineGeneralMindService';
import {
    computeEarlyEnthusiasmMultiplier,
    configureMindMarriageRules,
    defaultMindMarriageRules,
    processUnwedMarriageReminders,
    recordBondFormedMindEvents,
    recordMarriageRejectedMindEvent,
    resetMindMarriageRules,
} from '../assets/scripts/core/mind/MindMarriage';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { computeStatGain, createNurtureSession } from '../assets/scripts/core/systems/NurtureSystem';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function makeGeneral(id: string, gender: '男' | '女', extra: Partial<GeneralConfig> = {}): GeneralConfig {
    return {
        id,
        name: id,
        faction: Faction.Player,
        gender,
        age: 26,
        status: 'Unveiled',
        hp: 1000,
        vitality: 100,
        maxVitality: 100,
        str: 80,
        int: 60,
        lea: 78,
        pol: 55,
        cha: 70,
        luk: 45,
        ep: 75,
        ...extra,
    } as GeneralConfig;
}

export function createMindMarriageSuite(): TestSuite {
    const suite = new TestSuite('MindMarriage (PROG-2-9165 武將心智接結緣)');

    suite.test('mind-marriage-rules.json 與預設值及完整 .meta 一致', () => {
        const json = JSON.parse(
            fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/mind-marriage-rules.json'), 'utf8'),
        );
        const def = defaultMindMarriageRules();
        assert.equals(JSON.stringify(json.unwedReminder), JSON.stringify(def.unwedReminder));
        assert.equals(JSON.stringify(json.bondFormed), JSON.stringify(def.bondFormed));
        assert.equals(JSON.stringify(json.childEarlyEnthusiasm), JSON.stringify(def.childEarlyEnthusiasm));

        const meta = JSON.parse(
            fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/mind-marriage-rules.json.meta'), 'utf8'),
        );
        assert.equals('2.0.1', meta.ver);
        assert.equals(true, meta.imported);
        assert.isTrue(Array.isArray(meta.files) && meta.files.includes('.json'));
    });

    suite.test('三組算例：久未結緣提醒 / 門當戶對佳話 / 極端雙親 EAGER 與 LOW 保底', () => {
        const mind = new OfflineGeneralMindService();
        const bachelor = makeGeneral('bachelor_1', '男', { age: 26, breedingCount: 0 } as Partial<GeneralConfig>);

        // 算例 1：新手期久未結緣（第 1 季觸發 1 次，同一 4 季窗內不重複）
        const r1 = processUnwedMarriageReminders({ mind, roster: [bachelor], season: 1 });
        assert.equals(1, r1.length);
        const r2 = processUnwedMarriageReminders({ mind, roster: [bachelor], season: 2 });
        assert.equals(0, r2.length, '同一 4 季冷卻窗內不重複提醒');
        const mem1 = mind.recentMemories(bachelor.id, 1)[0];
        assert.equals('PASSED_OVER', mem1.kind);
        assert.equals(-1, mem1.valence);
        assert.equals(2, mem1.weight);

        // 算例 2：中期門當戶對佳話（K=7 >= 5 → V=+3, W=5；雙親 HIGH → 1.10）
        const outcome = recordBondFormedMindEvents({
            mind,
            fatherId: 'f_good',
            motherId: 'm_good',
            season: 5,
            compatibilityK: 7,
            isHistoricalPair: false,
            childId: 'c_good',
        });
        assert.isTrue(outcome.auspicious);
        assert.equals(3, outcome.valence);
        assert.equals(5, outcome.weight);
        assert.equals('EAGER', mind.moodOf('f_good'));
        assert.equals(1.1, computeEarlyEnthusiasmMultiplier('HIGH', 'HIGH'));

        // 算例 3：極端雙親 EAGER → 1.15 上限；LOW → 1.0 保底
        assert.equals(1.15, computeEarlyEnthusiasmMultiplier('EAGER', 'EAGER'));
        assert.equals(1.0, computeEarlyEnthusiasmMultiplier('LOW', 'LOW'));
    });

    suite.test('拒婚／冷落僅寫入心智記憶（V=-1, W=3），絕不扣忠誠與資源', () => {
        const session = new GameSession();
        const suitor = makeGeneral('suitor_1', '男', {
            loyaltyState: { value: 85, isLocked: false, sourceType: 'Capture' },
        });
        const rosterStore = new InMemoryRosterStore([suitor]);
        session.setRosterStore(rosterStore);

        const inventoryBefore = JSON.stringify(session.inventory);
        const bondPointsBefore = session.bondPoints;
        session.recordMarriageRejected('suitor_1', 'target_1');

        const after = session.roster.find((g) => g.id === 'suitor_1')!;
        assert.equals(85, after.loyaltyState?.value ?? 0, '拒婚不可扣忠誠');
        assert.equals(inventoryBefore, JSON.stringify(session.inventory), '拒婚不可扣道具／資源');
        assert.equals(bondPointsBefore, session.bondPoints, '拒婚不可扣結緣點數');
        const mem = session.mind.recentMemories('suitor_1', 1)[0];
        assert.equals('REQUEST_DENIED', mem.kind);
        assert.equals(-1, mem.valence);
        assert.equals(3, mem.weight);
    });

    suite.test('接線測試：BreedingService 結緣帶動子嗣開蒙前 4 回合幹勁倍率與雙親心情', () => {
        const mind = new OfflineGeneralMindService();
        // 先寫入雙親戰勝與賞賜讓心情為 EAGER / HIGH
        mind.record({ generalId: 'f_enth', season: 1, kind: 'PROMOTED' });
        mind.record({ generalId: 'm_enth', season: 1, kind: 'PRAISED' });
        assert.equals('EAGER', mind.moodOf('f_enth'));
        assert.equals('HIGH', mind.moodOf('m_enth'));

        const father = makeGeneral('f_enth', '男', { str: 90, lea: 85, int: 40, pol: 40 });
        const mother = makeGeneral('m_enth', '女', { str: 40, lea: 45, int: 88, pol: 86 });
        const roster = new InMemoryRosterStore([father, mother]);
        const service = new BreedingService(roster, new BloodlineGraph(), {
            random: () => 0.05,
            getParentMood: (id) => mind.moodOf(id),
            onMarriageConceived: (ctx) => {
                recordBondFormedMindEvents({
                    mind,
                    fatherId: ctx.fatherId,
                    motherId: ctx.motherId,
                    season: 2,
                    compatibilityK: ctx.compatibilityK,
                    isHistoricalPair: ctx.isHistoricalPair,
                    childId: ctx.childId,
                });
            },
        });

        const bred = service.breed(father.id, mother.id);
        assert.equals('conceived', bred.outcome);
        const child = bred.child as GeneralConfig & { earlyEnthusiasmMultiplier?: number };
        assert.equals(1.125, child.earlyEnthusiasmMultiplier, 'EAGER(0.075) + HIGH(0.05) = 1.125');

        const sessionBoosted = createNurtureSession({
            sessionId: 'ns_1',
            child: child as never,
            mentors: [],
            startSeason: 2,
            random: () => 0.5,
        });
        const sessionPlain = createNurtureSession({
            sessionId: 'ns_2',
            child: { ...child, earlyEnthusiasmMultiplier: 1.0 } as never,
            mentors: [],
            startSeason: 2,
            random: () => 0.5,
        });

        const earlyGain = computeStatGain({ ...sessionBoosted, round: 0 }, 'str', 100);
        const plainGain = computeStatGain({ ...sessionPlain, round: 0 }, 'str', 100);
        assert.isTrue(earlyGain.gain > plainGain.gain, '開蒙前 4 回合幹勁加成應提升屬性成長');

        const lateGain = computeStatGain({ ...sessionBoosted, round: 4 }, 'str', 100);
        const latePlain = computeStatGain({ ...sessionPlain, round: 4 }, 'str', 100);
        assert.equals(latePlain.gain, lateGain.gain, '第 5 回合（round=4）起恢復基準成長');
    });

    suite.test('ServiceLoader.loadBloodlineRuleTables() 可載入自訂 mind-marriage-rules.json', async () => {
        const loader = new ServiceLoader();
        (loader as unknown as { resource: { loadJson: (p: string) => Promise<unknown> } }).resource = {
            loadJson: async (p: string) => {
                if (p === 'data/mind-marriage-rules') {
                    return {
                        childEarlyEnthusiasm: {
                            earlyRoundsLimit: 4,
                            moodBonuses: { EAGER: 0.1, HIGH: 0.06, NORMAL: 0, LOW: 0 },
                            minMultiplier: 1.0,
                            maxMultiplier: 1.2,
                        },
                    };
                }
                return null;
            },
        };
        try {
            await loader.loadBloodlineRuleTables(true);
            assert.equals(1.2, computeEarlyEnthusiasmMultiplier('EAGER', 'EAGER'));
        } finally {
            resetMindMarriageRules();
            configureMindMarriageRules(defaultMindMarriageRules());
        }
    });

    return suite;
}
