/**
 * SageDivination.test.ts — 名士占卜觸發覺醒與地形因子標籤（PROG-2-0052，headless）
 *
 * Unity 對照：EditMode Test，用固定亂數驗證 OracleService.Divine 的準確率分支與偏好加權，不開 Scene。
 */
import { TestSuite, assert } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { divineFactor, SAGES } from '../assets/scripts/core/systems/SageDivination';
import { rollBattleAwakening } from '../assets/scripts/core/systems/FactorAwakening';
import { buildFactorDictionary, resolveFactorColor } from '../assets/scripts/core/systems/FactorInheritance';
import { specialActionFactorTags } from '../assets/scripts/core/systems/BattleSpecialActions';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function dictionary() {
    const file = path.resolve(__dirname, '../assets/resources/data/master/gene-dictionary.json');
    return buildFactorDictionary(JSON.parse(fs.readFileSync(file, 'utf8')));
}

/** 依序回傳給定值的亂數替身，並記錄呼叫次數 */
function seq(...values: number[]): { random: () => number; calls: () => number } {
    let n = 0;
    return { random: () => values[Math.min(n++, values.length - 1)], calls: () => n };
}

/** 鎖住的藍、綠、紅、紫各一顆 */
function scholar(): GeneralConfig {
    return {
        id: 'sch', name: '學士', faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 50, int: 90, lea: 60, pol: 80, cha: 60, luk: 40,
        genes: [
            { id: 'gene_command', type: 'blue', level: 2, isLocked: true, discoveryLevel: 1 },
            { id: 'gene_strategy', type: 'green', level: 3, isLocked: true, discoveryLevel: 20 },
            { id: 'gene_vitality', type: 'red', level: 2, isLocked: true, discoveryLevel: 45 },
            { id: 'gene_destiny', type: 'purple', level: 4, isLocked: true, discoveryLevel: 45 },
        ],
    } as unknown as GeneralConfig;
}

export function createSageDivinationSuite(): TestSuite {
    const suite = new TestSuite('SageDivination');

    suite.test('名士表對齊規格：六位名士與準確率', () => {
        assert.equals(6, Object.keys(SAGES).length);
        assert.equals(0.85, SAGES['zhuge-liang'].accuracy);
        assert.equals(0.8, SAGES['hua-tuo'].accuracy);
        assert.equals(0.75, SAGES['sima-hui'].accuracy);
        assert.equals(0.8, SAGES['xu-shao'].accuracy);
        assert.equals(0.85, SAGES['pang-tong'].accuracy);
        assert.equals(0.7, SAGES['zuo-ci'].accuracy);
    });

    suite.test('準確率分支：Random() <= accuracy 才覺醒（規格驗證示例 0.10 / 0.90 / 0.85）', () => {
        const general = scholar();
        const hit = divineFactor(general, 'zhuge-liang', 1, seq(0.1, 0).random);
        assert.equals('awakened', hit.outcome);
        assert.equals('gene_command', hit.event?.factorId);
        assert.equals('sage', hit.event?.trigger);
        assert.equals(false, hit.general?.genes?.[0].isLocked);
        assert.equals(true, general.genes![0].isLocked, '不改原資料');

        const edge = divineFactor(general, 'zhuge-liang', 1, seq(0.85, 0).random);
        assert.equals('awakened', edge.outcome, '0.85 <= 0.85 算準確');

        const miss = divineFactor(general, 'zhuge-liang', 1, seq(0.9).random);
        assert.equals('distorted', miss.outcome);
        assert.equals('blue', miss.hintColor, '扭曲時只給偏見方向的提示');
        assert.isTrue(miss.consumed);
        assert.equals(true, miss.general?.genes?.[0].isLocked);
    });

    suite.test('偏好加權：華佗偏紅，同樣的亂數在 45 級時多半挑到紅色', () => {
        const general = scholar();
        // 45 級候選：藍(1) 綠(1) 紅(3) 紫(1)，總權重 6；0.5 × 6 = 3 落在紅色區間 [2, 5)
        const huaTuo = divineFactor(general, 'hua-tuo', 45, seq(0, 0.5).random);
        assert.equals('gene_vitality', huaTuo.event?.factorId);
        // 司馬徽不加權：總權重 4，0.5 × 4 = 2 落在第 3 顆（紅）
        const sima = divineFactor(general, 'sima-hui', 45, seq(0, 0.5).random);
        assert.equals('gene_vitality', sima.event?.factorId);
        // 左慈偏紫：藍1 綠1 紅1 紫3，0.5 × 6 = 3 落在紫 [3, 6)
        const zuoCi = divineFactor(general, 'zuo-ci', 45, seq(0, 0.5).random);
        assert.equals('gene_destiny', zuoCi.event?.factorId);
    });

    suite.test('門檻仍有效；沒有候選、未知名士或武將都不擲骰', () => {
        const general = scholar();
        const low = divineFactor(general, 'pang-tong', 1, seq(0, 0.99).random);
        assert.equals('gene_command', low.event?.factorId, '1 級只能覺醒藍，龐統偏綠也挑不到');

        const empty = seq(0);
        const none = divineFactor({ ...general, genes: [] }, 'pang-tong', 99, empty.random);
        assert.equals('no-candidate', none.outcome);
        assert.isFalse(none.consumed);
        assert.equals(0, empty.calls());

        assert.equals('no-such-sage', divineFactor(general, 'nobody', 99, seq(0).random).outcome);
        assert.equals('no-such-general', divineFactor(undefined, 'zuo-ci', 99, seq(0).random).outcome);
    });

    suite.test('GameSession.divineFactor：覺醒寫回名冊、存檔、廣播；扭曲只存亂數狀態', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession(7);
        session.setRosterStore(new InMemoryRosterStore([scholar()]));
        session.setSaveService(new PlayerSaveService(adapter));
        const events: string[] = [];
        session.setEventEmitter({ emit: (name) => { events.push(name); } });

        session.setRandomSource(seq(0.95).random);
        const miss = await session.divineFactor('sch', 'zuo-ci');
        assert.equals('distorted', miss.outcome);
        assert.equals(true, session.roster[0].genes![0].isLocked);
        assert.equals(0, events.filter((e) => e === GAME_SESSION_EVENTS.FactorAwakened).length);
        assert.isTrue(events.includes(GAME_SESSION_EVENTS.Saved), '有擲骰就存檔');

        session.setRandomSource(seq(0, 0).random);
        const hit = await session.divineFactor('sch', 'zuo-ci');
        assert.equals('awakened', hit.outcome);
        assert.equals(false, session.roster[0].genes![0].isLocked);
        assert.equals(1, events.filter((e) => e === GAME_SESSION_EVENTS.FactorAwakened).length);

        const reloaded = new GameSession();
        reloaded.setRosterStore(new InMemoryRosterStore());
        reloaded.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await reloaded.load());
        assert.equals(false, reloaded.roster[0].genes![0].isLocked);
    });

    suite.test('因子字典：水戰 / 山地 / 林地適性為粉色，地形特定動作能精準對應', () => {
        const dict = dictionary();
        for (const id of ['gene_naval', 'gene_mountain', 'gene_forest']) {
            assert.isDefined(dict.get(id), id);
            assert.equals('pink', resolveFactorColor(id, dict), `${id} 歸粉色`);
        }
        const factorTags = (id: string) => dict.get(id)?.defaultTags;
        const general = {
            id: 'n', name: '水將',
            genes: [
                { id: 'gene_command', type: 'blue', level: 2, isLocked: true, discoveryLevel: 1 },
                { id: 'gene_mountain', type: 'pink', level: 2, isLocked: true, discoveryLevel: 1 },
                { id: 'gene_forest', type: 'pink', level: 2, isLocked: true, discoveryLevel: 1 },
                { id: 'gene_naval', type: 'pink', level: 2, isLocked: true, discoveryLevel: 1 },
            ],
        } as unknown as GeneralConfig;
        const pairs: [string, string][] = [['naval-battle', 'gene_naval'], ['mountain-battle', 'gene_mountain'], ['forest-battle', 'gene_forest']];
        for (const [action, factorId] of pairs) {
            const rolled = rollBattleAwakening(general, {
                discoveryLevel: 1, specialAction: true, actionTags: specialActionFactorTags([action]), factorTags, random: () => 0,
            });
            assert.equals(factorId, rolled && rolled.ok ? rolled.event.factorId : null, action);
        }
    });

    return suite;
}
