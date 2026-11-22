/**
 * TeamRecover.test.ts — 奧義團隊回復（SYS-SKILL-ULT-0003）
 */
import * as fs from 'fs';
import * as path from 'path';
import { StatusEffect } from '../assets/scripts/shared/CommonEnums';
import { TestSuite, assert } from './TestRunner';
import {
    TEAM_RECOVER_PARAMS,
    cleansePick,
    recoverOrder,
    calcTeamRecoverHeal,
    resolveTeamRecover,
    teamRecoverNoticeText,
    type RecoverTarget,
} from '../assets/scripts/battle/shared/TeamRecover';

function t(id: string, currentHp: number, maxHp = 1000, morale = 50, effects: StatusEffect[] = []): RecoverTarget {
    return { id, currentHp, maxHp, morale, effects };
}

export function createTeamRecoverSuite(): TestSuite {
    const suite = new TestSuite('TeamRecover (奧義團隊回復 SYS-SKILL-ULT-0003)');

    suite.test('群補：劉備昭烈仁政回 20% 最大 HP，不越過上限，死亡單位排除', () => {
        const out = resolveTeamRecover('ult-liu-bei-3', [t('a', 500), t('b', 950), t('dead', 0)]);
        assert.equals('a,b', out.map((o) => o.id).join(','));
        assert.equals(200, out[0].healed);
        assert.equals(50, out[1].healed);
    });

    suite.test('已損 HP 25%：固定量 + 已損 × 0.25，且不超過已損 HP', () => {
        // 1000 最大、500 現有：固定 200 + 已損 500 × 0.25 = 125，合計 325（未超過已損 500）
        assert.equals(325, calcTeamRecoverHeal(1000, 500, 0.2, 0.25));
        // 950 現有：固定 200 + 12 = 212，截到已損 50
        assert.equals(50, calcTeamRecoverHeal(1000, 950, 0.2, 0.25));
        const out = resolveTeamRecover('ult-liu-bei-3', [t('a', 500)], 0.25);
        assert.equals(325, out[0].healed);
    });

    suite.test('未傳已損比例時維持舊行為（只有固定量）；JSON 昭烈仁政標記 0.25', () => {
        assert.equals(200, resolveTeamRecover('ult-liu-bei-3', [t('a', 500)])[0].healed);
        const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/master/ultimate-definitions.json'), 'utf8'));
        const list: Array<{ id: string; teamHealMissingRatio?: number }> = raw.data ?? raw;
        assert.equals(0.25, list.find((u) => u.id === 'ult-liu-bei-3')?.teamHealMissingRatio as number);
    });

    suite.test('醫護兵常態治療不經團隊回復公式，維持固定量（PM 11/22 不動）', () => {
        const src = fs.readFileSync(path.resolve(__dirname, '../assets/scripts/battle/runtime/phases/BattleSpecialResolvePhase.ts'), 'utf8');
        const start = src.indexOf('function resolveMedic');
        const body = src.slice(start, src.indexOf('function resolveEngineer'));
        assert.equals(true, body.includes('svc.formula.calculateHeal('));
        assert.equals(false, body.includes('calcTeamRecoverHeal'));
    });

    suite.test('瀕死優先：血量比例低者先處理，同比例依 id', () => {
        const order = recoverOrder([t('c', 800), t('b', 100), t('a', 100)]);
        assert.equals('a,b,c', order.map((o) => o.id).join(','));
    });

    suite.test('淨化：只移除白名單負面狀態、控制類優先，不誤刪正面狀態', () => {
        assert.equals('stun', cleansePick([StatusEffect.Weak, StatusEffect.Stun, StatusEffect.Haste], 1).join(','));
        assert.equals('', cleansePick([StatusEffect.Haste, StatusEffect.Fortified, StatusEffect.Invincible], 3).join(','));
        const out = resolveTeamRecover('ult-cao-zhi-3', [t('a', 500, 1000, 50, [StatusEffect.Slow, StatusEffect.Fortified])]);
        assert.equals('slow', out[0].cleansed.join(','));
    });

    suite.test('士氣回復不越過 100；護盾依最大 HP；非回復奧義回空', () => {
        const morale = resolveTeamRecover('ult-liu-bei-1', [t('a', 500, 1000, 90), t('b', 500, 1000, 10)]);
        assert.equals(10, morale.find((o) => o.id === 'a')?.moraleGained);
        assert.equals(25, morale.find((o) => o.id === 'b')?.moraleGained);
        assert.equals(150, resolveTeamRecover('ult-sun-quan-4', [t('a', 500)])[0].shield);
        assert.equals(0, resolveTeamRecover('ult-cao-cao-1', [t('a', 500)]).length);
    });

    suite.test('參數表每一筆都對得到 team-heal 家族的奧義', () => {
        const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/master/ultimate-definitions.json'), 'utf8'));
        const list: Array<{ id: string; family?: string }> = raw.data ?? raw;
        for (const id of Object.keys(TEAM_RECOVER_PARAMS)) {
            assert.equals('team-heal', list.find((u) => u.id === id)?.family, id);
        }
    });

    suite.test('戰報提示：寫出實際受惠部隊數與總量；沒有效果時不寫', () => {
        const outcomes = resolveTeamRecover('ult-liu-bei-3', [t('a', 500), t('b', 950), t('c', 1000)]);
        assert.equals('我軍團隊回復：2 支部隊回復 250 HP',
            teamRecoverNoticeText({ faction: 'player', ultimateId: 'ult-liu-bei-3', outcomes }, true));
        const cleanse = resolveTeamRecover('ult-liu-bei-1', [t('a', 500, 1000, 50, [StatusEffect.Stun])]);
        assert.equals('敵軍團隊回復：解除 1 個負面狀態、1 支部隊士氣提升',
            teamRecoverNoticeText({ faction: 'enemy', ultimateId: 'ult-liu-bei-1', outcomes: cleanse }, false));
        assert.equals('', teamRecoverNoticeText({ faction: 'player', ultimateId: 'ult-liu-bei-3', outcomes: resolveTeamRecover('ult-liu-bei-3', [t('a', 1000)]) }, true));
    });

    return suite;
}
