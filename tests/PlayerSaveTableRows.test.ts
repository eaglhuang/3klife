/**
 * PlayerSaveTableRows.test.ts — 存檔快照映射六表列（MVP-12，PROG-2-0880）
 *
 * 檢查：武將、傭兵、資源三張表的映射；映射結果通過 server/schema 的列驗證；
 * 資源列往返還原後欄位一致；缺欄位時回報錯誤而不補預設。
 *
 * Unity 對照：像存檔前把角色資料轉成 DB 行，再拿 Server 端的 Constraint 驗一次，驗不過就列出來。
 */
import { assert, TestSuite } from './TestRunner';
import { mapSnapshotToSixTables, mapPlayerResourcesRow, resourceFieldsFromRow, LOCAL_PLAYER_ID } from '../assets/scripts/core/services/PlayerSaveTableRows';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import {
    validateGeneralRow,
    validateMercenaryRow,
    validatePlayerResourcesRow,
} from '../server/schema/mvp12-row-validators';

function snapshot(overrides: Record<string, unknown> = {}): PlayerSaveSnapshot {
    return {
        schemaVersion: 1,
        savedAt: '2026-10-20T00:00:00Z',
        roster: [
            { id: 'G001', templateId: 'T001', bloodlineId: 'B001', vitality: 80, maxVitality: 100, role: 'Commander', status: 'Active' },
        ],
        deck: [],
        discoveryLevel: 1,
        military: { cityTroops: 500, cityTroopsCap: 800, recruitRegen: 10, food: 300, foodCap: 900 },
        gachaWallet: { gems: 0, gold: 120, tickets: 0, bronze: 0, oracle: 0 },
        resources: { fame: 15 },
        bondPoints: 7,
        mercenaries: {
            mercenaries: [{ uid: 'M1', daysLeft: 3, bond: 2, status: 'Trial' }],
            upkeep: [{ uid: 'M1', status: 'Frozen', unpaidDays: 1, frozenDaysLeft: 2 }],
            cooldowns: [],
        },
        ...overrides,
    } as unknown as PlayerSaveSnapshot;
}

export function createPlayerSaveTableRowsSuite(): TestSuite {
    const suite = new TestSuite('PlayerSaveTableRows (存檔六表列映射 MVP-12)');

    suite.test('武將、傭兵、資源三張表依欄位對應映射', () => {
        const { rows, errors } = mapSnapshotToSixTables(snapshot());
        assert.equals(0, errors.length);
        assert.equals(JSON.stringify([{ id: 'G001', template_id: 'T001', bloodline_id: 'B001', vitality: 80, vitality_max: 100, role: 'Commander', status: 'Active' }]), JSON.stringify(rows.generals));
        assert.equals(JSON.stringify([{ id: 'M1', player_id: LOCAL_PLAYER_ID, bond_status: 'Trial', days_left: 3, upkeep_status: 'Frozen' }]), JSON.stringify(rows.mercenaries));
        assert.equals(JSON.stringify({ player_id: LOCAL_PLAYER_ID, food: 300, gold: 120, troop_source: 500, fame: 15, essence: 0, bond_points: 7 }), JSON.stringify(rows.player_resources));
        assert.equals(0, rows.nurture_sessions.length);
        assert.equals(0, rows.gene_dictionary.length);
        assert.equals(0, rows.gacha_history.length);
    });

    suite.test('映射結果通過 server/schema 的列驗證（口徑一致）', () => {
        const { rows } = mapSnapshotToSixTables(snapshot());
        for (const row of rows.generals) assert.equals(0, validateGeneralRow(row).length);
        for (const row of rows.mercenaries) assert.equals(0, validateMercenaryRow(row).length);
        assert.equals(0, validatePlayerResourcesRow(rows.player_resources).length);
    });

    suite.test('資源列往返還原：欄位與來源一致', () => {
        const source = snapshot();
        const back = resourceFieldsFromRow(mapPlayerResourcesRow(source, LOCAL_PLAYER_ID));
        assert.equals(JSON.stringify({ food: 300, cityTroops: 500 }), JSON.stringify(back.military));
        assert.equals(120, back.gold);
        assert.equals(15, back.fame);
        assert.equals(7, back.bondPoints);
    });

    suite.test('缺模板或血脈欄位：回報錯誤且不補預設值', () => {
        const broken = snapshot({
            roster: [{ id: 'G009', vitality: 10, maxVitality: 10, role: 'Scout', status: 'Active' }],
        });
        const { rows, errors } = mapSnapshotToSixTables(broken);
        assert.equals('', rows.generals[0].template_id);
        assert.isTrue(errors.includes('generals[G009].template_id: 缺少'));
        assert.isTrue(errors.includes('generals[G009].bloodline_id: 缺少'));
    });

    return suite;
}
