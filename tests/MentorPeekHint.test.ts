/**
 * MentorPeekHint.test.ts — 教官窺探句（PROG-2-1785）
 */
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { chooseFate, unveilGeneral, UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';

const pupil = (type = 'purple') => {
    const base = {
        id: 'kid', name: '子嗣', faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30,
        hiddenFlags: ['mystery-phase'],
        genes: [{ id: 'gene_x', type, level: 3, displayName: '秘密名字', isLocked: true, discoveryLevel: 45 }],
    } as unknown as UnveilingGeneral;
    return chooseFate(unveilGeneral(base).general, 'accept') as unknown as GeneralConfig;
};

const mentors = [
    { id: 'low', name: '小教官', tpBonus: 20, specialty: 'str', burstRate: 1, stars: 1 },
    { id: 'high', name: '老教官', tpBonus: 20, specialty: 'str', burstRate: 1, stars: 3 },
];

function make(options: { level?: number; random?: () => number; hooks?: boolean; type?: string; noMentors?: boolean } = {}) {
    const store = new InMemoryRosterStore([pupil(options.type)]);
    const service = new NurtureService(store, {
        random: options.random ?? (() => 0),
        requireNurtureMode: false,
        currentSeason: () => 3,
        ...(options.hooks === false ? {} : { awakening: { discoveryLevel: () => options.level ?? 1 } }),
    });
    service.start('kid', options.noMentors ? [] : mentors as never);
    return { store, service };
}

export function createMentorPeekHintSuite(): TestSuite {
    const suite = new TestSuite('MentorPeekHint');

    suite.test('等級未到的鎖定因子：星等最高的教官暗示方向，不透露名字也不解鎖', () => {
        const { store, service } = make();
        const hint = service.train('kid', 'str').peekHint ?? '';
        assert.equals('教官 老教官：此子似乎還藏有天命之力…', hint);
        assert.isFalse(hint.includes('秘密名字'));
        assert.isTrue(store.getAll()[0].genes![0].isLocked === true);
    });

    suite.test('休息、沒教官、沒掛鉤都不說', () => {
        assert.equals(undefined, make().service.train('kid', 'rest').peekHint);
        assert.equals(undefined, make({ noMentors: true }).service.train('kid', 'str').peekHint);
        assert.equals(undefined, make({ hooks: false }).service.train('kid', 'str').peekHint);
    });

    suite.test('機率沒中不說', () => {
        assert.equals(undefined, make({ random: () => 0.99 }).service.train('kid', 'str').peekHint);
    });

    suite.test('因子已到等級：不會暗示', () => {
        assert.equals(undefined, make({ level: 99 }).service.train('kid', 'str').peekHint);
    });

    return suite;
}
