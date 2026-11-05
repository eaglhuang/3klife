import { TestSuite, assert } from './TestRunner';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { chooseFate, unveilGeneral, type UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    CAPPING_RITE_ROUND,
    RITE_FORMATION_CHANCE,
    type NurtureRiteResult,
    performNurtureRite,
    riteAncestorsOf,
    riteBreakthroughOf,
    riteNoticeLines,
    ritesDue,
} from '../assets/scripts/core/systems/EnrollmentRites';

const g = (fields: Record<string, unknown>): GeneralConfig => fields as unknown as GeneralConfig;

function family() {
    const grandpa = g({ id: 'mgf', name: '黃承彥', genes: [{ id: 'water', type: 'red', level: 3, displayName: '水師統御', isLocked: false }], troopAptitude: { NAVY: 'S' } });
    const father = g({ id: 'dad', name: '趙雲', fatherId: '', motherId: '', genes: [{ id: 'spear', type: 'blue', level: 4, displayName: '神槍', isLocked: false }], troopAptitude: { CAVALRY: 'S', INFANTRY: 'A' } });
    const mother = g({ id: 'mom', name: '黃氏', fatherId: 'mgf', motherId: '', genes: [], troopAptitude: { ARCHER: 'B' } });
    const child = g({
        id: 'kid', name: '趙統', fatherId: 'dad', motherId: 'mom',
        genes: [
            { id: 'weak', type: 'blue', level: 1, displayName: '小聰明', isLocked: true },
            { id: 'spear', type: 'blue', level: 2, displayName: '神槍', isLocked: true },
        ],
        troopAptitude: { CAVALRY: 'A' },
    });
    const all = [grandpa, father, mother, child];
    return { child, lookup: (id: string) => all.find((x) => x.id === id) };
}

export function createEnrollmentRitesSuite(): TestSuite {
    const suite = new TestSuite('EnrollmentRites');

    suite.test('祖輩關係：外祖父從母親那邊找，名冊沒有的略過', () => {
        const { child, lookup } = family();
        assert.equals('父親,母親,外祖父', riteAncestorsOf(child, lookup).map((a) => a.relation).join(','));
    });

    suite.test('到期：第一回合後開蒙，第 24 回合後加冠，辦過不再辦', () => {
        assert.lengthEquals(0, ritesDue([], 0));
        assert.equals('enrollment', ritesDue([], 1).join(','));
        assert.equals('enrollment,capping', ritesDue([], CAPPING_RITE_ROUND).join(','));
        assert.lengthEquals(0, ritesDue(['enrollment'], CAPPING_RITE_ROUND - 1));
        assert.equals('capping', ritesDue(['enrollment'], CAPPING_RITE_ROUND).join(','));
    });

    suite.test('開蒙形成檢定命中：寫入 1★ 並標明祖輩來源，只形成一個', () => {
        const { child, lookup } = family();
        const rite = performNurtureRite(child, 'enrollment', { lookup, discoveryLevel: 0, random: () => RITE_FORMATION_CHANCE - 0.001 });
        assert.equals('water', rite.formed?.id ?? '');
        const gene = (rite.general.genes ?? []).find((x) => x.id === 'water');
        assert.equals(1, gene?.level ?? 0);
        assert.isFalse(gene?.isLocked ?? true);
        assert.equals('外祖父', rite.origin?.relation ?? '');
        assert.equals('【開蒙覺醒】趙統 展現了來自外祖父 黃承彥 的【水師統御】資質！', riteNoticeLines('趙統', rite)[0]);
    });

    suite.test('形成沒中：喚醒星等最高的沉睡因子，並找出持有的祖輩', () => {
        const { child, lookup } = family();
        const rite = performNurtureRite(child, 'enrollment', { lookup, discoveryLevel: 5, random: () => 0.9 });
        assert.equals('spear', rite.awakening?.factorId ?? '');
        assert.equals('父親', rite.origin?.relation ?? '');
        assert.isFalse((rite.general.genes ?? []).find((x) => x.id === 'spear')?.isLocked ?? true);
        assert.isTrue((rite.general.genes ?? []).find((x) => x.id === 'weak')?.isLocked ?? false);
    });

    suite.test('探索等級不夠：不喚醒也沒有提示', () => {
        const { child, lookup } = family();
        const rite = performNurtureRite(child, 'enrollment', { lookup, discoveryLevel: 0, random: () => 0.9 });
        assert.isTrue(rite.awakening === undefined);
        assert.lengthEquals(0, riteNoticeLines('趙統', rite));
    });

    suite.test('開蒙禮不做適性突破', () => {
        const { child, lookup } = family();
        const rite = performNurtureRite(child, 'enrollment', { lookup, discoveryLevel: 0, random: () => 0.9 });
        assert.equals('A', rite.general.troopAptitude?.CAVALRY ?? '');
    });

    suite.test('加冠適性突破：取祖輩最高階且高於子嗣者，只升一階', () => {
        const { child, lookup } = family();
        const rite = performNurtureRite(child, 'capping', { lookup, discoveryLevel: 0, random: () => 0.9 });
        assert.equals('S', rite.general.troopAptitude?.CAVALRY ?? '');
        assert.equals('A', rite.breakthrough?.from ?? '');
        assert.equals('【加冠大成】血脈共鳴！趙統 的【騎兵】適性突破至 S 階！', riteNoticeLines('趙統', rite)[0]);
    });

    suite.test('子嗣沒有該兵種適性時視為 C，升到 B', () => {
        const child = g({ id: 'kid', name: '甲', fatherId: 'dad', motherId: '' });
        const dad = g({ id: 'dad', name: '乙', troopAptitude: { NAVY: 'A' } });
        const result = riteBreakthroughOf(child, [{ relation: '父親', general: dad }]);
        assert.equals('NAVY', result?.troop ?? '');
        assert.equals('C', result?.from ?? '');
        assert.equals('B', result?.to ?? '');
    });

    suite.test('沒有祖輩或祖輩不比子嗣高：不突破', () => {
        const child = g({ id: 'kid', troopAptitude: { NAVY: 'S' } });
        const dad = g({ id: 'dad', name: '乙', troopAptitude: { NAVY: 'A' } });
        assert.isTrue(riteBreakthroughOf(child, []) === undefined);
        assert.isTrue(riteBreakthroughOf(child, [{ relation: '父親', general: dad }]) === undefined);
    });

    suite.test('NurtureService：親手培育只辦一次開蒙，第 24 回合辦加冠', () => {
        const dad = g({ id: 'dad', name: '趙雲', troopAptitude: { CAVALRY: 'S' } });
        const pupil = chooseFate(unveilGeneral({ id: 'kid', name: '趙統', faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800, str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30, hiddenFlags: ['mystery-phase'], genes: [], fatherId: 'dad', motherId: '', troopAptitude: { CAVALRY: 'A' } } as unknown as UnveilingGeneral).general, 'accept');
        const store = new InMemoryRosterStore([dad, pupil as unknown as GeneralConfig]);
        const service = new NurtureService(store, { random: () => 0.9, requireNurtureMode: false, currentSeason: () => 3 });
        service.start('kid', []);
        const first = service.train('kid', 'str');
        assert.equals('enrollment', (first.rites ?? []).map((r) => r.kind).join(','));
        assert.equals('enrollment', (first.session.ritesDone ?? []).join(','));
        let capping: NurtureRiteResult[] = [];
        for (let i = 1; i < CAPPING_RITE_ROUND; i++) {
            const step = service.train('kid', 'rest');
            if (step.rites) capping = capping.concat(step.rites);
        }
        assert.equals('capping', capping.map((r) => r.kind).join(','));
        assert.equals('S', store.getAll().find((x) => x.id === 'kid')?.troopAptitude?.CAVALRY ?? '');
    });

    return suite;
}
