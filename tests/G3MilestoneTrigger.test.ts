/**
 * G3MilestoneTrigger.test.ts — PROG-2-9172 血統里程碑 G3 補觸發測試
 */
import { assert, TestSuite } from './TestRunner';
import {
    configureFamilyMilestoneRules,
    FAMILY_MILESTONE_RULES_JSON,
    milestoneStageOfClan,
    milestoneUnlockLines,
    resetFamilyMilestoneRules,
} from '../assets/scripts/core/systems/FamilyMilestone';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { Faction } from '../assets/scripts/core/config/Constants';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import * as fs from 'fs';
import * as path from 'path';

type LineageConfig = GeneralConfig & { fatherId?: string; motherId?: string };

function makePerson(id: string, extra: Partial<LineageConfig> = {}): LineageConfig {
    return {
        id,
        name: id,
        faction: Faction.Player,
        gender: '男',
        hp: 100,
        age: 22,
        ep: 65,
        stats: { str: 70, int: 65, lea: 65, pol: 60, cha: 60, luk: 50 },
        genes: [],
        ...extra,
    };
}

export function createG3MilestoneTriggerSuite(): TestSuite {
    const suite = new TestSuite('G3MilestoneTrigger (PROG-2-9172)');

    suite.test('JSON 規則檔載入與階段門檻：2代仍是G2、3代升G3、4代+3名EP>=75升G4', () => {
        resetFamilyMilestoneRules();
        const jsonPath = path.resolve(__dirname, `../assets/resources/${FAMILY_MILESTONE_RULES_JSON}.json`);
        const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        configureFamilyMilestoneRules(raw);

        assert.equals(1, milestoneStageOfClan({ adultDescendants: 0, generations: 1, ep75: 0 }));
        assert.equals(2, milestoneStageOfClan({ adultDescendants: 1, generations: 2, ep75: 1 }), '純外婚 2 代應維持 G2');
        assert.equals(3, milestoneStageOfClan({ adultDescendants: 2, generations: 3, ep75: 1 }), '累積 3 代應升 G3');
        assert.equals(3, milestoneStageOfClan({ adultDescendants: 3, generations: 4, ep75: 2 }), '4 代但 EP>=75 不足 3 人應維持 G3');
        assert.equals(4, milestoneStageOfClan({ adultDescendants: 4, generations: 4, ep75: 3 }), '4 代且 3 名 EP>=75 應升 G4');

        // 純世代升入 G3（無表親資料）時應有預設 STORY_LINE[3] 與 UNLOCK_LINE[3]
        const lines = milestoneUnlockLines(2, 3);
        assert.equals(2, lines.length);
        assert.isTrue(lines[0].includes('世交合譜') && lines[1].includes('血脈清濁燈號'));

        resetFamilyMilestoneRules();
    });

    suite.test('GameSession 整合：純外婚第 3 代自動升 G3，選表親仍立即升 G3，且階段不會倒退', async () => {
        const storage = new MemoryStorageAdapter();
        const save = new PlayerSaveService(storage);

        // 2 代純外婚名冊：一代父母 -> 二代子嗣（generations = 2）
        const g1f = makePerson('g1f', { gender: '男', age: 45 });
        const g1m = makePerson('g1m', { gender: '女', age: 42 });
        const g2c = makePerson('g2c', { gender: '男', age: 20, fatherId: 'g1f', motherId: 'g1m' });
        const g2Spouse = makePerson('g2s', { gender: '女', age: 20 });

        const roster = new InMemoryRosterStore([g1f, g1m, g2c, g2Spouse]);
        const session = new GameSession();
        session.setRosterStore(roster);
        session.setSaveService(save);
        await session.save();

        // 推進 1 季觸發家族階段重算，2 代仍為 G2
        await session.advanceSeason();
        assert.equals(2, session.milestoneStage, '純外婚 2 代應為 G2');

        // 加入第 3 代成人子嗣（純外婚無共祖）
        const g3c = makePerson('g3c', { gender: '男', age: 18, fatherId: 'g2c', motherId: 'g2s' });
        roster.replaceAll([...roster.getAll(), g3c]);
        await session.advanceSeason();
        assert.equals(3, session.milestoneStage, '純外婚累積第 3 代應自動升入 G3');

        // 測試選表親仍可立即觸發 G3（從 G2 直接升 G3），且之後即使名冊回到 2 代也不會倒退
        const roster2 = new InMemoryRosterStore([g1f, g1m, g2c]);
        const session2 = new GameSession();
        session2.setRosterStore(roster2);
        session2.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        await session2.save();
        await session2.advanceSeason();
        assert.equals(2, session2.milestoneStage);

        session2.noteKinPair('g2c', 'g2s', '先祖');
        assert.equals(3, session2.milestoneStage, '選中表親應立即升為 G3');

        await session2.advanceSeason();
        assert.equals(3, session2.milestoneStage, '升至 G3 後重算不應倒退回 G2');
    });

    return suite;
}
