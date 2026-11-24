/**
 * 五位初始名將的第一階專屬奧義（PROG-2-9327）
 *
 * Unity 對照：像檢查五個角色的 ScriptableObject 都掛上了大招，且每個大招指到的效果腳本真的存在、可施放。
 */
import * as fs from 'fs';
import { useZhTwSkillNames } from './zhTwSkillNames';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { buildUltimateSkills, seedUltimateDataForHeadless } from '../assets/scripts/battle/views/BattleSceneLoader';
import { ProjectedDamageSkillResolver } from '../assets/scripts/battle/skills/resolvers/ProjectedDamageSkillResolver';
import { isBattleSkillImplemented, resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { getBattleSkillPresentation } from '../assets/scripts/shared/BattleSkillPresentation';
import { Faction, GAME_CONFIG, StatusEffect } from '../assets/scripts/core/config/Constants';
import { GeneralUnit, type GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { SkillSourceType, type CanonicalUltimateDefinition } from '../assets/scripts/shared/SkillRuntimeContract';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

const DATA_DIR = path.join(__dirname, '..', 'assets', 'resources', 'data');
const readJson = <T>(...parts: string[]): T => JSON.parse(fs.readFileSync(path.join(DATA_DIR, ...parts), 'utf-8')) as T;

/** 武將 id → [招名, 自己的技能 id, 被沿用的技能 id] */
const STARTERS: Record<string, [string, string, string]> = {
    'wei-yan': ['子午奇襲', 'wei-yan-ziwu-raid', 'zhao-yun-pierce'],
    'xiahou-dun': ['拔矢啖睛', 'xiahou-dun-eye-devour', 'liu-bei-rally'],
    'zhang-he': ['巧變連營', 'zhang-he-adaptive-camp', 'liu-bei-reset'],
    'sun-ce': ['小霸王之威', 'sun-ce-conqueror', 'lu-bu-rampage'],
    'gan-ning': ['百騎劫營', 'gan-ning-night-raid', 'zhang-fei-roar'],
};

function raidRequest(ownerUid: string) {
    return { sourceType: SkillSourceType.Ultimate, ownerUid, battleSkillId: 'gan-ning-night-raid', targetMode: 'enemy-all', timing: 'active-cast' } as never;
}

export function createStarterGeneralUltimatesSuite(): TestSuite {
    const suite = new TestSuite('StarterGeneralUltimates (五位初始名將第一階專屬奧義 PROG-2-9327)');
    const ultimates = readJson<{ data: CanonicalUltimateDefinition[] }>('master', 'ultimate-definitions.json').data;
    const generals = readJson<GeneralConfig[]>('generals.json');

    suite.test('資料：五位武將第 1 格奧義指到存在的定義，招名、技能、可施放都對得上', () => {
        useZhTwSkillNames();
        for (const [generalId, [name, skillId]] of Object.entries(STARTERS)) {
            const general = generals.find((g) => g.id === generalId);
            assert.isDefined(general, generalId);
            const slot = (general?.ultimateSlots ?? []).find((s) => s.slot === 1);
            assert.equals(`ult-${generalId}-1`, slot?.ultimateId, generalId);
            assert.equals(1, slot?.unlockReincarnation, `${generalId} 一轉就能用`);
            const def = ultimates.find((u) => u.id === slot?.ultimateId);
            assert.equals(name, def?.name, generalId);
            assert.equals(skillId, def?.battleSkillId, generalId);
            assert.equals((general as unknown as { templateId: string }).templateId, def?.templateId, `${generalId} templateId`);
            assert.isTrue(resolveBattleSkillProfile(skillId) !== null && isBattleSkillImplemented(skillId), `${skillId} 可施放`);
            assert.equals(name, getBattleSkillPresentation(skillId).name, `${skillId} 戰報招名`);
        }
    });

    suite.test('效果沿用指定的那一招：除了技能 id、戰報鍵、最後排旗標與百騎劫營另加的傷害，其餘數值完全相同', () => {
        for (const [, skillId, baseId] of Object.values(STARTERS)) {
            const strip = (id: string) => {
                const { battleSkillId: _id, battleLogKey: _key, enemyRearRowOnly: _rear, effectKind: _kind, coefficient: _coef, scalingStat: _stat, ...rest } = resolveBattleSkillProfile(id) ?? {} as never;
                return JSON.stringify(rest);
            };
            assert.equals(strip(baseId), strip(skillId), skillId);
        }
    });

    suite.test('戰場選單：五位武將都拿到自己的專屬奧義，不是通用的全軍突擊', () => {
        services().initialize();
        seedUltimateDataForHeadless(ultimates, {});
        for (const [generalId, [name, skillId]] of Object.entries(STARTERS)) {
            const config = generals.find((g) => g.id === generalId) as GeneralConfig;
            const items = buildUltimateSkills(new GeneralUnit({ ...config, faction: Faction.Player } as unknown as GeneralConfig));
            assert.equals(1, items.length, generalId);
            assert.equals(skillId, items[0].skillId, generalId);
            assert.equals(name, items[0].label, generalId);
            assert.isTrue(items[0].skillId !== GAME_CONFIG.genericUltimate.skillId);
        }
        seedUltimateDataForHeadless([], {});
    });

    suite.test('百騎劫營：我方施放只打敵軍最後排（depth 最大、且有敵軍的那排），有傷害也有暈眩', () => {
        services().initialize();
        const caster = createTestUnit('me', Faction.Player, 0, 0);
        const front = createTestUnit('front', Faction.Enemy, 1, 3);
        const rearA = createTestUnit('rearA', Faction.Enemy, 0, 5);
        const rearB = createTestUnit('rearB', Faction.Enemy, 2, 5);
        const { context, buffLog, damageLog } = createBattleSkillTestContext({
            playerGeneral: createTestGeneral('pg', Faction.Player), enemyGeneral: createTestGeneral('eg', Faction.Enemy),
            units: [caster, front, rearA, rearB],
        });
        const result = new ProjectedDamageSkillResolver().execute(raidRequest('me'), context);
        assert.isTrue(result.applied);
        assert.equals('rearA,rearB', damageLog.map((d) => d.unitId).sort().join(','), '只有最後排受傷');
        assert.isTrue(damageLog.every((d) => d.damage > 0), '傷害大於 0');
        assert.equals('rearA,rearB', buffLog.filter((b) => b.effect === StatusEffect.Stun).map((b) => b.unitId).sort().join(','));
    });

    suite.test('百騎劫營：敵方施放時方向相反，暈的是我方 depth 最小的那排', () => {
        services().initialize();
        const mine0 = createTestUnit('mine0', Faction.Player, 0, 0);
        const mine2 = createTestUnit('mine2', Faction.Player, 1, 2);
        const foe = createTestUnit('foe', Faction.Enemy, 1, 5);
        const { context, buffLog } = createBattleSkillTestContext({
            playerGeneral: createTestGeneral('pg', Faction.Player), enemyGeneral: createTestGeneral('eg', Faction.Enemy),
            units: [mine0, mine2, foe],
        });
        new ProjectedDamageSkillResolver().execute(raidRequest(Faction.Enemy), context);
        assert.equals('mine0', buffLog.filter((b) => b.effect === StatusEffect.Stun).map((b) => b.unitId).join(','));
    });

    return suite;
}
