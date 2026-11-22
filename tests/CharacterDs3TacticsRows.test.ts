/**
 * CharacterDs3TacticsRows.test.ts — 技分頁依武將產生戰法列（PROG-2-1690）
 */
import { assert, TestSuite } from './TestRunner';
import { buildDs3TacticRows, tacticDetailSource } from '../assets/scripts/ui/components/character-ds3/CharacterDs3TacticsChild';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { CanonicalTacticDefinition } from '../assets/scripts/shared/SkillRuntimeContract';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { buildSkillDetailView, formatSkillDetailText } from '../assets/scripts/core/systems/SkillDetailView';

export function createCharacterDs3TacticsRowsSuite(): TestSuite {
    const suite = new TestSuite('CharacterDs3TacticsRows (技分頁戰法列)');

    suite.test('依武將戰法產生已習得與未啟發列', () => {
        const rows = buildDs3TacticRows({
            learnedTactics: ['龍膽旋風', '孤軍救主', '百鳥朝鳳'],
            inspiredTactics: ['七進七出'],
            lockedTactics: ['🔒 龍魂覺醒'],
        } as unknown as GeneralConfig);
        assert.equals('龍膽旋風,孤軍救主,百鳥朝鳳', rows.learned.map((r) => r.name).join(','));
        assert.equals('龍', rows.learned[0].glyph);
        assert.equals('七進七出|未啟發', rows.inspired.map((r) => `${r.name}|${r.hint}`).join(','));
        assert.equals('龍魂覺醒|🔒 待解鎖', rows.locked.map((r) => `${r.name}|${r.hint}`).join(','));
    });

    suite.test('超過槽位截斷、空資料回傳空列', () => {
        const rows = buildDs3TacticRows({ learnedTactics: ['甲', '乙', '丙', '丁', '戊'], inspiredTactics: ['一', '二', '三'] } as unknown as GeneralConfig);
        assert.equals(4, rows.learned.length);
        assert.equals(2, rows.inspired.length);
        const empty = buildDs3TacticRows(null);
        assert.equals(0, empty.learned.length + empty.inspired.length + empty.locked.length);
    });

    suite.test('已習得列以 tacticSlots 為準，經定義名稱轉換；無定義時退回 tacticId', () => {
        const cfg = {
            tacticSlots: [
                { slotId: 'slot-1', tacticId: 'tactic-cavalry-shock', source: 'inborn' },
                { slotId: 'slot-2', tacticId: 'tactic-unknown', source: 'inborn' },
            ],
        } as unknown as GeneralConfig;
        const names: Record<string, string> = { 'tactic-cavalry-shock': '騎軍衝鋒' };
        const named = buildDs3TacticRows(cfg, (id) => names[id]);
        assert.equals('騎軍衝鋒,tactic-unknown', named.learned.map((r) => r.name).join(','));
        assert.equals('騎', named.learned[0].glyph);
        const bare = buildDs3TacticRows(cfg);
        assert.equals('tactic-cavalry-shock,tactic-unknown', bare.learned.map((r) => r.name).join(','));
    });

    suite.test('戰法（非奧義）來源含戰場效果數值，詳情產生效果列', () => {
        const tactic = {
            id: 'tactic-cavalry-shock',
            displayName: '騎軍衝鋒',
            category: 'charge',
            battleSkillId: 'zhao-yun-pierce',
            targetMode: 'line',
            timing: 'active-cast',
        } as unknown as CanonicalTacticDefinition;
        const profile = resolveBattleSkillProfile('zhao-yun-pierce');
        assert.isTrue(profile !== null, 'zhao-yun-pierce 應有戰場效果檔');
        const view = buildSkillDetailView(tacticDetailSource(tactic, profile), { state: 'learned' });
        const text = formatSkillDetailText(view);
        assert.equals('戰法', view.kindLabel);
        assert.contains(text, '效果係數：×0.8');
        assert.contains(text, '成長屬性：武力');
        assert.contains(text, '目標範圍：直線');
        assert.contains(text, '目標數上限：4 個');
        assert.contains(text, '發動時機：主動施放');
    });

    suite.test('查無戰場效果檔的戰法仍保留定義欄位，不補假數值', () => {
        const tactic = { id: 'tactic-x', displayName: '甲', targetMode: 'self', timing: null } as unknown as CanonicalTacticDefinition;
        const source = tacticDetailSource(tactic, null);
        assert.equals(null, source.coefficient ?? null);
        assert.equals('self', source.targetMode ?? '');
        assert.equals(null, source.maxTargets ?? null);
    });

    return suite;
}
