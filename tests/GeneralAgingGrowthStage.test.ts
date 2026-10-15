/**
 * 成長階段事件與劇本句接線（LIFE-13，PROG-2-0800）
 *
 * 鎖住：跨過起點才發事件、已跨過不重複、一次跨多段全部發出；死者不增齡不發事件；
 * 劇本 Key 在 zh-TW 有對應；LobbyScene 接了階段與退役劇本句。
 */
import { assert, TestSuite } from './TestRunner';
import {
    AgingGeneral,
    ageGeneralsOneSeason,
    growthStagesCrossed,
} from '../assets/scripts/core/systems/GeneralAging';
import { LIFE_SCRIPT_KEYS } from '../assets/scripts/core/systems/LifeScriptCopy';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

function general(id: string, age: number | undefined, status = 'alive'): AgingGeneral {
    return { id, name: id, age, status, redGeneLevel: 0 } as unknown as AgingGeneral;
}

export function createGeneralAgingGrowthStageSuite(): TestSuite {
    const suite = new TestSuite('GeneralAgingGrowthStage (成長階段事件與劇本句 LIFE-13)');

    suite.test('growthStagesCrossed：只有跨過起點才回傳，已跨過不重複', () => {
        assert.equals('grow-up', growthStagesCrossed(4.75, 5).join(','));
        assert.equals('', growthStagesCrossed(5, 5.25).join(','));
        assert.equals('prime', growthStagesCrossed(39.75, 40.25).join(','));
        assert.equals('', growthStagesCrossed(15, 15.25).join(','));
    });

    suite.test('growthStagesCrossed：一次跨多段時全部依序回傳', () => {
        assert.equals('grow-up,prime,elder', growthStagesCrossed(4, 56).join(','));
    });

    suite.test('ageGeneralsOneSeason：存活武將跨過 5 歲時發出 entered-growth-stage，帶 stage', () => {
        const { events } = ageGeneralsOneSeason([general('kid', 4.75)], () => 0.99);
        const staged = events.filter((e) => e.type === 'entered-growth-stage');
        assert.equals(1, staged.length);
        assert.equals('grow-up', staged[0].stage ?? '');
        assert.equals('kid', staged[0].generalId);
    });

    suite.test('ageGeneralsOneSeason：死者不增齡、不發成長階段事件；沒有 age 的武將不參與', () => {
        const { events } = ageGeneralsOneSeason(
            [general('dead', 4.75, 'dead'), general('noage', undefined)],
            () => 0.99,
        );
        assert.equals(0, events.filter((e) => e.type === 'entered-growth-stage').length);
    });

    suite.test('劇本 Key 三個成長階段與退役、死亡都在 zh-TW 語系檔有對應', () => {
        const zhTw = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n/zh-TW.json'), 'utf8')) as Record<string, string>;
        for (const key of [LIFE_SCRIPT_KEYS['grow-up'], LIFE_SCRIPT_KEYS.prime, LIFE_SCRIPT_KEYS.elder, LIFE_SCRIPT_KEYS.retire, LIFE_SCRIPT_KEYS.death]) {
            assert.isTrue(typeof zhTw[key] === 'string' && zhTw[key].length > 0);
        }
    });

    suite.test('LobbyScene 接了成長階段、退役與死亡劇本句（字串接線鎖定）', () => {
        const lobby = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8') as string;
        assert.isTrue(lobby.includes('GAME_SESSION_EVENTS.GeneralGrowthStage'));
        assert.isTrue(lobby.includes("this._showLifeScriptToast('retire'"));
        assert.isTrue(lobby.includes("this._lifeScriptText('death'"));
    });

    return suite;
}
