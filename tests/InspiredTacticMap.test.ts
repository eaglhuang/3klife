/**
 * InspiredTacticMap.test.ts — 靈感戰法對應戰法庫（PROG-2-1135）；各招獨立戰場效果（PROG-2-1145）
 */
import { TestSuite, assert } from './TestRunner';
import { INSPIRED_TACTIC_MAP, inspiredTacticName, toLibraryTacticId } from '../assets/scripts/core/systems/InspiredTacticMap';
import { buildBattleConfig } from '../assets/scripts/core/systems/BattleRoster';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { isBattleSkillImplemented, resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { getTacticTpCost } from '../assets/scripts/core/systems/SortieDeploy';
import { StatusEffect } from '../assets/scripts/core/config/Constants';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.join(__dirname, '..');

export function createInspiredTacticMapSuite(): TestSuite {
    const suite = new TestSuite('InspiredTacticMap (靈感戰法對應戰法庫 PROG-2-1135)');

    suite.test('支援卡每個靈感戰法都有對照，且對到存在的戰法庫 id', () => {
        const library = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/master/tactic-library.json'), 'utf8'));
        const libraryIds = new Set((library.data as Array<{ id: string }>).map((t) => t.id));
        const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/mentor-support-cards.json'), 'utf8'));
        const cards = (Array.isArray(data) ? data : data.cards) as Array<{ Support: { Tactic_Inspire_Events?: Array<{ Tactic_ID: string }> } }>;
        for (const card of cards) {
            for (const event of card.Support.Tactic_Inspire_Events ?? []) {
                const entry = INSPIRED_TACTIC_MAP[event.Tactic_ID];
                assert.isTrue(!!entry, `${event.Tactic_ID} 沒有對照`);
                assert.isTrue(libraryIds.has(entry.libraryId), `${event.Tactic_ID} → ${entry.libraryId} 不在戰法庫`);
            }
        }
    });

    suite.test('轉換：靈感戰法轉戰法庫 id；戰法庫 id 原樣回傳；中文名可查', () => {
        assert.equals('tactic-insp-lance-thrust', toLibraryTacticId('TAC_LANCE_THRUST'));
        assert.equals('tactic-fire-scheme', toLibraryTacticId('tactic-fire-scheme'));
        assert.equals('長槍突刺', inspiredTacticName('TAC_LANCE_THRUST')!);
        assert.equals(undefined, inspiredTacticName('tactic-fire-scheme'));
    });

    suite.test('戰場組槽：學到的靈感戰法轉成戰法庫 id，重複對到同一招只佔一槽', () => {
        const general = {
            id: 'kid', name: 'kid', faction: 'shu', gender: '男', age: 20, hp: 1000,
            str: 80, int: 95, lea: 70, pol: 50, cha: 60, luk: 40,
            learnedTactics: ['TAC_LANCE_THRUST', 'TAC_LANCE_THRUST', 'TAC_FIRE_ATTACK'],
        } as unknown as GeneralConfig;
        const slots = buildBattleConfig(general, 'shu' as GeneralConfig['faction']).tacticSlots ?? [];
        assert.equals('tactic-insp-lance-thrust,tactic-insp-fire-attack', slots.map((s) => s.tacticId).join(','));
    });

    suite.test('17 招各有自己的戰法庫條目，戰場技能可施放、不進武將自動配招（PROG-2-1145）', () => {
        const library = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/master/tactic-library.json'), 'utf8'));
        const byId = new Map((library.data as Array<{ id: string; battleSkillId: string; rarityAccess: string[] }>).map((t) => [t.id, t]));
        const libraryIds = new Set<string>();
        for (const [specId, entry] of Object.entries(INSPIRED_TACTIC_MAP)) {
            const row = byId.get(entry.libraryId);
            assert.isTrue(!!row, `${specId} → ${entry.libraryId} 不在戰法庫`);
            assert.isTrue(isBattleSkillImplemented(row!.battleSkillId) && !!resolveBattleSkillProfile(row!.battleSkillId), `${specId} 的技能 ${row!.battleSkillId} 不可施放`);
            assert.equals(0, row!.rarityAccess.length);
            libraryIds.add(entry.libraryId);
        }
        assert.equals(17, libraryIds.size);
    });

    suite.test('招名與效果一致：緩速是減速、挑釁是單體暈眩、連擊兩段；TP 照數值表', () => {
        const skillOf = (specId: string): string => {
            const library = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/master/tactic-library.json'), 'utf8'));
            return (library.data as Array<{ id: string; battleSkillId: string }>).find((t) => t.id === toLibraryTacticId(specId))!.battleSkillId;
        };
        assert.equals('slow', resolveBattleSkillProfile(skillOf('TAC_SLOW'))!.effectKind!);
        const taunt = resolveBattleSkillProfile(skillOf('TAC_TAUNT'))!;
        assert.equals(StatusEffect.Stun, taunt.statusEffect!);
        assert.equals(1, taunt.maxTargets!);
        assert.equals(2, resolveBattleSkillProfile(skillOf('TAC_COMBO_ATTACK'))!.hitStageMultipliers!.length);
        assert.equals(20, getTacticTpCost(toLibraryTacticId('TAC_SLOW')));
        assert.equals(90, getTacticTpCost(toLibraryTacticId('TAC_RED_CLIFF')));
        assert.equals(30, getTacticTpCost(toLibraryTacticId('TAC_ZHAO_SPEAR')));
    });

    return suite;
}
