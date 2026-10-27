/**
 * RelationEventsBattle.test.ts — 戰場部署時偵測關係事件（KIN-08 戰場端，PROG-2-1420）
 *
 * 範圍：headless 驗證 BattleController 的偵測與事件送出；不含 cc 場景與戰報顯示。
 */
import { EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { GeneralUnit, type GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { HistoricalPairTable } from '../assets/scripts/core/systems/HistoricalPairs';
import type { RelationEventHit } from '../assets/scripts/core/systems/RelationEvents';
import type { TallyBattleInfo } from '../assets/scripts/core/systems/TigerTallyStar';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import { generalNameMapOf, relationEventLogLine } from '../assets/scripts/ui/core/RelationEventLogText';

const TABLE = HistoricalPairTable.load({
    relations: [
        { relationId: 'T_SWORN', templateA: 'liu-bei', templateB: 'guan-yu', type: 'SWORN', epBonus: 15, extraEffects: {}, loreKey: 'LORE_T' },
        { relationId: 'T_COUPLE', templateA: 'zhou-yu', templateB: 'xiao-qiao', type: 'COUPLE', epBonus: 15, extraEffects: {}, loreKey: 'LORE_T2' },
    ],
}).table;

/** 虎符 id 即來源武將模板 id，方便測試 */
function setup(table: HistoricalPairTable | null): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.historicalPairs = table;
    ctrl.tallyInfoOf = (tallyId) => ({ sourceTemplateId: tallyId, star: 1, templateId: null } as unknown as TallyBattleInfo);
    return ctrl;
}

function unit(ctrl: BattleController, id: string, faction: Faction, lane: number, tallyId: string | null): TroopUnit {
    const troop = new TroopUnit(id, TroopType.Infantry, faction, { hp: 1000, attack: 60, defense: 10, moveRange: 0, attackRange: 1 });
    troop.moveTo(lane, 0);
    troop.tallyId = tallyId;
    ctrl.state.addUnit(troop);
    return troop;
}

function captureEvents(): { hits: RelationEventHit[]; off: () => void } {
    const hits: RelationEventHit[] = [];
    const off = services().event.on(EVENT_NAMES.RelationEventTriggered, (data?: { hit: RelationEventHit }) => { if (data) hits.push(data.hit); });
    return { hits, off: off as () => void };
}

export function createRelationEventsBattleSuite(): TestSuite {
    const suite = new TestSuite('RelationEventsBattle (戰場關係事件 PROG-2-1420)');

    suite.test('兩支虎符部隊來源為結義：觸發義兄弟合攻一次並送出事件；再檢查不重播', () => {
        const ctrl = setup(TABLE);
        const cap = captureEvents();
        unit(ctrl, 'a', Faction.Player, 0, 'liu-bei');
        assert.equals(0, ctrl.checkBattleRelationEvents().length, '只有一人');
        unit(ctrl, 'b', Faction.Player, 1, 'guan-yu');
        const hits = ctrl.checkBattleRelationEvents();
        assert.equals(1, hits.length);
        assert.equals('sworn-combo', hits[0].eventId);
        assert.equals(0, ctrl.checkBattleRelationEvents().length, '同場不重播');
        assert.equals(1, ctrl.relationEventHits.length);
        assert.equals(1, cap.hits.length);
        cap.off();
    });

    suite.test('我方主將與虎符來源成夫妻：觸發名將契合', () => {
        const ctrl = setup(TABLE);
        ctrl.state.playerGeneral = new GeneralUnit({ id: 'zhou-yu', name: '周瑜', faction: Faction.Player } as unknown as GeneralConfig);
        unit(ctrl, 'a', Faction.Player, 0, 'xiao-qiao');
        const hits = ctrl.checkBattleRelationEvents();
        assert.equals(1, hits.length);
        assert.equals('famous-match', hits[0].eventId);
    });

    suite.test('敵方部隊、陣亡部隊不計入；沒有配對表不觸發', () => {
        const ctrl = setup(TABLE);
        unit(ctrl, 'a', Faction.Player, 0, 'liu-bei');
        unit(ctrl, 'e', Faction.Enemy, 1, 'guan-yu');
        assert.equals(0, ctrl.checkBattleRelationEvents().length, '敵方不算');
        const dead = unit(ctrl, 'd', Faction.Player, 2, 'guan-yu');
        dead.currentHp = 0;
        assert.equals(0, ctrl.checkBattleRelationEvents().length, '陣亡不算');
        const none = setup(null);
        unit(none, 'a', Faction.Player, 0, 'liu-bei');
        unit(none, 'b', Faction.Player, 1, 'guan-yu');
        assert.equals(0, none.checkBattleRelationEvents().length);
    });


    suite.test('戰報文字：名將契合帶入兩位名字，查不到退回 id；generals-index 轉名稱表', () => {
        const zh = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/resources/i18n/zh-TW.json'), 'utf8')) as Record<string, string>;
        const t = (key: string, ...args: string[]): string => args.reduce((s, v, i) => s.split(`{${i}}`).join(v), zh[key] ?? key);
        const names = generalNameMapOf({ data: [{ uid: 'zhou-yu', name: '周瑜' }, { uid: 'bad' }, null] });
        assert.equals(1, names.size);
        const nameOf = (id: string) => names.get(id) ?? null;
        assert.equals('周瑜與xiao-qiao，天作之合！',
            relationEventLogLine({ loreKey: 'LORE_REL_EVENT_FAMOUS_MATCH', templateA: 'zhou-yu', templateB: 'xiao-qiao' }, nameOf, t));
        assert.equals(zh.LORE_REL_EVENT_SWORN_COMBO,
            relationEventLogLine({ loreKey: 'LORE_REL_EVENT_SWORN_COMBO', templateA: 'liu-bei', templateB: 'guan-yu' }, nameOf, t));
        assert.equals(0, generalNameMapOf(null).size);
        for (const loc of ['zh-CN', 'en', 'ja']) {
            const j = JSON.parse(fs.readFileSync(path.join(__dirname, `../assets/resources/i18n/${loc}.json`), 'utf8')) as Record<string, string>;
            assert.isTrue(j.LORE_REL_EVENT_FAMOUS_MATCH.includes('{0}') && j.LORE_REL_EVENT_FAMOUS_MATCH.includes('{1}'), loc);
        }
    });

    return suite;
}
