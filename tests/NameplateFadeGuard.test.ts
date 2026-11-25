/**
 * NameplateFadeGuard.test.ts — 名牌淡出入口對已銷毀的 UnitRenderer 不崩潰（PROG-2-10007）
 *
 * 場景：換場景／推進一季後 UnitRenderer 已被銷毀，Cocos 把 plateFade 清成 null，
 * BattleUIBridge 仍握舊參照呼叫 releaseNameplateFade → reading 'releaseNow' of null。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { UnitRenderer } = require('../assets/scripts/battle/views/UnitRenderer');

const src = readFileSync(join(__dirname, '..', 'assets/scripts/battle/views/UnitRenderer.ts'), 'utf8');

export function createNameplateFadeGuardSuite(): TestSuite {
    const suite = new TestSuite('NameplateFadeGuard');

    suite.test('名牌淡出入口都走 plateFadeAlive（isValid＋null 防線），不直接解參照 plateFade', () => {
        assert.isTrue(/private plateFadeAlive\(\)[^{]*\{\s*return this\.isValid && this\.plateFade \? this\.plateFade : null;/.test(src));
        for (const name of ['beginCombatPresentation', 'endCombatPresentation', 'releaseNameplateFade', 'debugNameplateAlpha']) {
            const line = src.split('\n').find((l) => l.includes(`public ${name}(`)) ?? '';
            assert.isTrue(line.includes('plateFadeAlive()'), `${name} 未走防線`);
            assert.isTrue(!/this\.plateFade\./.test(line), `${name} 直接解參照 plateFade`);
        }
    });

    suite.test('已銷毀（isValid=false、plateFade=null）時呼叫入口不丟錯', () => {
        const dead = Object.create(UnitRenderer.prototype);
        dead.plateFade = null;
        Object.defineProperty(dead, 'isValid', { value: false });
        dead.beginCombatPresentation();
        dead.endCombatPresentation();
        dead.releaseNameplateFade();
        assert.equals(dead.debugNameplateAlpha(), 1);
    });

    suite.test('存活時照常放掉淡出計數', () => {
        const calls: string[] = [];
        const live = Object.create(UnitRenderer.prototype);
        live.plateFade = { begin: () => calls.push('b'), end: () => calls.push('e'), releaseNow: () => calls.push('r'), alpha: 0.5 };
        Object.defineProperty(live, 'isValid', { value: true });
        live.beginCombatPresentation(); live.endCombatPresentation(); live.releaseNameplateFade();
        assert.equals(calls.join(''), 'ber');
        assert.equals(live.debugNameplateAlpha(), 0.5);
    });

    return suite;
}
