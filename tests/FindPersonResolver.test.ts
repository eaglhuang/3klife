/**
 * FindPersonResolver.test.ts — WP4 找人的情報等級規則（PROG-2-10212）
 * 鎖住 QSOC-01 4.3 表：Lv0～Lv5 各自看得到什麼、能跳去哪；熟人例外 +1 級且上限 Lv5；搜尋（名、拼音、勢力、官職）。
 */
import { assert, TestSuite } from './TestRunner';
import { SceneRegistry } from '../assets/scripts/ui/life/SceneRegistry';
import {
    FindPersonResolver,
    FAKE_FIND_ROSTER,
    intelLevelFromValue,
    effectiveIntelLevel,
    isAcquaintance,
    type FindPersonEntry,
    type IntelLevel,
} from '../assets/scripts/ui/life/FindPersonResolver';

const stranger: FindPersonEntry = {
    generalId: 'x', name: '陌生人', pinyin: 'moshengren', faction: '魏', office: '校尉',
    friendship: 0, hasBond: false, sceneId: 'mkt_tavern', activityId: 'S04', nextSceneId: 'home_general',
};

export function createFindPersonResolverSuite(): TestSuite {
    const suite = new TestSuite('FindPersonResolver (PROG-2-10212 WP4)');
    const reg = new SceneRegistry();
    const resolver = new FindPersonResolver(reg);

    suite.test('intel 值換等級：0/10/25/45/65/85 為門檻', () => {
        const cases: Array<[number, IntelLevel]> = [[0, 0], [9, 0], [10, 1], [24, 1], [25, 2], [44, 2], [45, 3], [64, 3], [65, 4], [84, 4], [85, 5], [100, 5]];
        for (const [v, lv] of cases) assert.equals(lv, intelLevelFromValue(v), `intel ${v}`);
    });

    suite.test('Lv0：只回「這個時段他在城裡」，沒有任何位置欄位，不能跳', () => {
        const r = resolver.resolve(stranger, 0);
        assert.equals(0, r.level);
        assert.equals('life.panel.find.cityOnly', r.locationTextKey);
        assert.equals(0, r.locationArgKeys.length);
        assert.isTrue(r.jump === null);
        assert.isFalse(r.showAvatar);
        assert.isTrue(r.activityId === undefined && r.nextSceneNameKey === undefined);
    });

    suite.test('Lv1：只有大區名稱，跳到該大圖並置中，不洩漏場景', () => {
        const r = resolver.resolve(stranger, 10);
        assert.equals('life.panel.find.inArea', r.locationTextKey);
        assert.equals('life.scene.area.mkt', r.locationArgKeys[0]);
        assert.equals('center', (r.jump as any).focus);
        assert.equals('mkt', reg.areaOf((r.jump as any).sceneId) as string);
        assert.isFalse(r.locationArgKeys.includes('life.scene.mkt_tavern'));
    });

    suite.test('Lv2：場景名＋「？」，跳到該場景；Lv3：加頭像並對焦', () => {
        const r2 = resolver.resolve(stranger, 25);
        assert.equals('life.scene.mkt_tavern', r2.locationArgKeys[0]);
        assert.isTrue(r2.questionMark);
        assert.isFalse(r2.showAvatar);
        assert.equals('mkt_tavern', (r2.jump as any).sceneId);
        assert.equals('none', (r2.jump as any).focus);
        const r3 = resolver.resolve(stranger, 45);
        assert.isFalse(r3.questionMark);
        assert.isTrue(r3.showAvatar);
        assert.equals('actor', (r3.jump as any).focus);
        assert.isTrue(r3.activityId === undefined);
    });

    suite.test('Lv4 加活動符號；Lv5 再加下一時段預測', () => {
        const r4 = resolver.resolve(stranger, 65);
        assert.equals('S04', r4.activityId as string);
        assert.isTrue(r4.nextSceneNameKey === undefined);
        const r5 = resolver.resolve(stranger, 90);
        assert.equals('S04', r5.activityId as string);
        assert.equals('life.scene.home_general', r5.nextSceneNameKey as string);
    });

    suite.test('熟人例外：友誼 ≥ 30 或有羈絆 → 等級 +1，上限 Lv5；非熟人不加', () => {
        assert.isTrue(isAcquaintance({ friendship: 30, hasBond: false }));
        assert.isTrue(isAcquaintance({ friendship: 0, hasBond: true }));
        assert.isFalse(isAcquaintance({ friendship: 29, hasBond: false }));
        assert.equals(3, effectiveIntelLevel(2, true));
        assert.equals(2, effectiveIntelLevel(2, false));
        assert.equals(5, effectiveIntelLevel(5, true));
        const friend: FindPersonEntry = { ...stranger, friendship: 40 };
        // intel 0（Lv0）的熟人看得到大區
        const r0 = resolver.resolve(friend, 0);
        assert.equals(1, r0.level);
        assert.isTrue(r0.friendBoost);
        assert.equals('life.panel.find.inArea', r0.locationTextKey);
        // intel 85（Lv5）的熟人維持 Lv5，不顯示加成
        const r5 = resolver.resolve(friend, 85);
        assert.equals(5, r5.level);
        assert.isFalse(r5.friendBoost);
        // intel 45（Lv3）的羈絆熟人升到 Lv4，看得到活動
        const bonded: FindPersonEntry = { ...stranger, hasBond: true };
        const r4 = resolver.resolve(bonded, 45);
        assert.equals(4, r4.level);
        assert.equals('S04', r4.activityId as string);
    });

    suite.test('搜尋：名、拼音、勢力、官職都能找，空字串回全部，大小寫不分', () => {
        assert.equals(FAKE_FIND_ROSTER.length, resolver.search(FAKE_FIND_ROSTER, '', 50).length);
        assert.equals('zhangfei', resolver.search(FAKE_FIND_ROSTER, '張飛', 50)[0].generalId);
        assert.equals('zhugeliang', resolver.search(FAKE_FIND_ROSTER, 'ZHUGE', 50)[0].generalId);
        assert.equals(4, resolver.search(FAKE_FIND_ROSTER, '蜀', 50).length);
        assert.equals('huatuo', resolver.search(FAKE_FIND_ROSTER, '醫官', 50)[0].generalId);
        assert.equals(0, resolver.search(FAKE_FIND_ROSTER, '不存在', 50).length);
    });

    suite.test('假名冊的場景都在註冊表內，任何情報等級都不會丟例外', () => {
        for (const e of FAKE_FIND_ROSTER) {
            assert.isTrue(reg.hasScene(e.sceneId), e.sceneId);
            if (e.nextSceneId) assert.isTrue(reg.hasScene(e.nextSceneId), e.nextSceneId);
            for (const intel of [0, 10, 25, 45, 65, 85, 100]) assert.doesNotThrow(() => resolver.resolve(e, intel));
        }
    });

    suite.test('自家家臣：身分永遠可見；情報 Lv0～2 看不到活動也查不到場景（11/28 裁決）', () => {
        const vassal: FindPersonEntry = { ...stranger, isOwnVassal: true, friendship: 50, hasBond: true };
        for (const intel of [0, 10, 25]) {
            const v = resolver.resolve(vassal, intel);
            assert.equals('陌生人', v.name);
            assert.isTrue(v.showAvatar, `intel ${intel} 臉可見`);
            assert.isTrue(v.jump === null, `intel ${intel} 不可跳場景`);
            assert.isTrue(v.activityId === undefined, `intel ${intel} 無活動`);
            assert.equals('life.panel.find.cityOnly', v.locationTextKey);
            assert.equals(0, v.locationArgKeys.length);
        }
        const open = resolver.resolve(vassal, 65);
        assert.isTrue(open.jump !== null && open.jump.sceneId === 'mkt_tavern', 'Lv4 看得到場景');
        assert.equals('S04', open.activityId);
        assert.isTrue(resolver.resolve({ ...vassal, isOwnVassal: false }, 25).jump !== null, '非家臣照舊');
    });

    suite.test('Lv5 只有下一時段預測，不帶說溜嘴機率欄位', () => {
        const v = resolver.resolve(stranger, 90) as unknown as Record<string, unknown>;
        assert.equals('life.scene.home_general', v.nextSceneNameKey as string);
        assert.isTrue(!('slipChance' in v) && !('slipBonus' in v), '無說溜嘴加成欄位');
    });

    return suite;
}
