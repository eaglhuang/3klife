/**
 * TeamAura.test.ts — 奧義全隊增益 aura（SYS-SKILL-ULT-0002）
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import {
    TEAM_AURA_CAPS,
    TEAM_AURA_PARAMS,
    applyTeamAuraToDamage,
    startTeamAura,
    teamAuraAttackMultiplier,
    teamAuraDefenseMultiplier,
    teamAuraNoticeText,
    teamAuraShieldFor,
    teamAuraTargets,
    tickTeamAura,
} from '../assets/scripts/battle/shared/TeamAura';

export function createTeamAuraSuite(): TestSuite {
    const suite = new TestSuite('TeamAura (奧義全隊增益 SYS-SKILL-ULT-0002)');

    suite.test('全隊目標只取同陣營存活單位，死亡與敵方排除', () => {
        const u = (id: string, faction: string, dead = false) => ({ id, faction, isDead: () => dead });
        const picked = teamAuraTargets([u('a', 'player'), u('b', 'player', true), u('c', 'enemy')], 'player');
        assert.equals('a', picked.map((x) => x.id).join(','));
    });

    suite.test('曹操魏武揮鞭：攻擊 ×1.3 持續 3 回合，到期回報 ended 並回 1', () => {
        let a = startTeamAura(null, 'ult-cao-cao-1');
        assert.equals(1.3, teamAuraAttackMultiplier(a));
        let t = tickTeamAura(a);
        t = tickTeamAura(t.aura);
        assert.equals('active', t.phase);
        t = tickTeamAura(t.aura);
        assert.equals('ended', t.phase);
        assert.equals(1, teamAuraAttackMultiplier(t.aura));
    });

    suite.test('同家族不疊加：逐欄取高、回合取長、來源改為最後施放者，且不超過上限', () => {
        const a = startTeamAura(startTeamAura(null, 'ult-cao-cao-1'), 'ult-zhao-yun-4');
        assert.equals('ult-zhao-yun-4', a?.ultimateId);
        assert.equals(1.3, teamAuraAttackMultiplier(a));
        assert.equals(1.4, teamAuraDefenseMultiplier(a));
        const twice = startTeamAura(startTeamAura(null, 'ult-guan-yu-4'), 'ult-guan-yu-4');
        assert.isTrue(teamAuraAttackMultiplier(twice) <= TEAM_AURA_CAPS.attackMultiplier);
        assert.equals(startTeamAura(null, 'ult-diao-chan-1'), null);
    });

    suite.test('結算順序：先減傷再護盾吸收，剩餘扣 HP', () => {
        const sima = startTeamAura(null, 'ult-sima-yi-5');
        assert.equals(80, applyTeamAuraToDamage(sima, 100, 0).hpDamage);
        const r = applyTeamAuraToDamage(sima, 100, 30);
        assert.equals(50, r.hpDamage);
        assert.equals(0, r.shieldLeft);
        const shielded = { ...startTeamAura(null, 'ult-cao-cao-1')!, shieldPct: 0.15 };
        assert.equals(150, teamAuraShieldFor(shielded, 1000));
        assert.equals(0, teamAuraShieldFor(startTeamAura(null, 'ult-cao-cao-1'), 1000));
    });

    suite.test('參數表每一筆都對得到 team-buff 家族的奧義', () => {
        const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/master/ultimate-definitions.json'), 'utf8'));
        const list: Array<{ id: string; family?: string }> = raw.data ?? raw;
        for (const id of Object.keys(TEAM_AURA_PARAMS)) {
            assert.equals('team-buff', list.find((u) => u.id === id)?.family, id);
        }
    });

    suite.test('戰報提示：開始寫全隊效果與回合，結束寫回退', () => {
        assert.equals('我軍全隊增益：攻擊 +30%（3 回合）',
            teamAuraNoticeText({ faction: 'player', phase: 'started', ultimateId: 'ult-cao-cao-1', turns: 3 }, true));
        assert.equals('敵軍全隊增益：攻擊 +100%、免控（2 回合）',
            teamAuraNoticeText({ faction: 'enemy', phase: 'started', ultimateId: 'ult-guan-yu-4', turns: 2 }, false));
        assert.equals('我軍全隊增益結束',
            teamAuraNoticeText({ faction: 'player', phase: 'ended', ultimateId: 'ult-cao-cao-1', turns: 0 }, true));
    });

    return suite;
}
