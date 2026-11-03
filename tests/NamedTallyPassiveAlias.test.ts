/** 名將死亡卡原始 ID 必須能進入三個被動效果入口（PROG-2-9015）。 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { produceDeathTally } from '../assets/scripts/core/systems/TigerTally';
import { tallyBattleInfoOf } from '../assets/scripts/core/systems/TigerTallyStar';
import { applyTallyDefection, hasGhostMove, tallyDeathConfusionOf } from '../assets/scripts/battle/shared/TallyPassive';
import { TestSuite, assert } from './TestRunner';

function unit(id: string, faction: Faction, template: string | null = null, hp = 100): TroopUnit {
    const u = new TroopUnit(id, TroopType.Archer, faction,
        { hp: 100, attack: 30, defense: 20, moveRange: 2, attackRange: 1 });
    u.currentHp = hp;
    u.tallyTemplateId = template;
    return u;
}

function namedOwner(templateId: string, hp = 100) {
    const source = { id: `uid-${templateId}`, templateId, isHistorical: true, characterCategory: 'famed', gender: 'male' };
    const card = produceDeathTally(source, 100, 0, 3);
    if (!card) throw new Error(`名將 ${templateId} 未產出死亡虎符`);
    const info = tallyBattleInfoOf(card);
    assert.equals(templateId, source.templateId);
    assert.equals(templateId, card.templateId);
    assert.equals(templateId, info.templateId);
    assert.equals(templateId, info.sourceTemplateId);
    const owner = unit('owner', Faction.Player, info.templateId, hp);
    return { source, card, info, owner, before: JSON.stringify({ source, card, info }) };
}

function assertOriginUnchanged(named: ReturnType<typeof namedOwner>): void {
    assert.equals(named.before, JSON.stringify({ source: named.source, card: named.card, info: named.info }));
    assert.equals(named.source.templateId, named.card.templateId);
    assert.equals(named.source.id, named.card.sourceGeneralUid);
    assert.equals(named.source.templateId, named.info.sourceTemplateId);
    assert.equals(named.source.templateId, named.owner.tallyTemplateId);
}

function defectionTrial(owner: TroopUnit) {
    const edge = unit('edge30', Faction.Enemy, null, 30);
    const weak = unit('weak10', Faction.Enemy, null, 10);
    let calls = 0;
    const changed = applyTallyDefection([owner, edge, weak], Faction.Player, () => false, () => { calls++; return 0.75; });
    return { ids: changed.map((u) => u.id).join(','), calls, edge: edge.faction, weak: weak.faction };
}

export function createNamedTallyPassiveAliasSuite(): TestSuite {
    const suite = new TestSuite('NamedTallyPassiveAlias (PROG-2-9015)');

    suite.test('死亡趙雲卡經戰場資訊後有七進七出，與龍膽符相同', () => {
        const named = namedOwner('zhao-yun');
        assert.isTrue(hasGhostMove(named.owner), '原始 zhao-yun ID 應有七進七出');
        assert.equals(hasGhostMove(unit('direct', Faction.Player, 'tiger-tally-long-dan')), hasGhostMove(named.owner));
        assertOriginUnchanged(named);
    });

    suite.test('死亡郭嘉卡只讓存活敵軍混亂一回合，與奉孝符相同', () => {
        const named = namedOwner('guo-jia', 0);
        const units = [named.owner, unit('alive', Faction.Enemy), unit('dead', Faction.Enemy, null, 0), unit('ally', Faction.Player)];
        const actual = tallyDeathConfusionOf(named.owner, units);
        assert.equals(1, actual?.turns, '原始 guo-jia ID 應觸發一回合混亂');
        assert.equals('alive', actual?.targets.map((u) => u.id).join(','));
        const direct = tallyDeathConfusionOf(unit('direct', Faction.Player, 'tiger-tally-feng-xiao-fu', 0), units);
        assert.equals(direct?.turns, actual?.turns);
        assert.equals(direct?.targets.map((u) => u.id).join(','), actual?.targets.map((u) => u.id).join(','));
        assertOriginUnchanged(named);
    });

    suite.test('死亡司馬懿卡固定亂數策反一軍，與狼顧符選擇和取樣次數相同', () => {
        const named = namedOwner('sima-yi');
        const actual = defectionTrial(named.owner);
        assert.equals('weak10', actual.ids, '原始 sima-yi ID 應策反固定亂數選中的敵軍');
        assert.equals(1, actual.calls);
        assert.equals(Faction.Enemy, actual.edge);
        assert.equals(Faction.Player, actual.weak);
        assert.equals(JSON.stringify(defectionTrial(unit('direct', Faction.Player, 'tiger-tally-lang-gu-fu'))), JSON.stringify(actual));
        assertOriginUnchanged(named);
    });

    for (const template of [null, 'unknown-tally']) {
        suite.test(`${template ?? 'null'} ID 三個效果均不生效且不取亂數`, () => {
            const owner = unit('owner', Faction.Player, template);
            const enemy = unit('enemy', Faction.Enemy, null, 10);
            let calls = 0;
            assert.isFalse(hasGhostMove(owner));
            assert.equals(null, tallyDeathConfusionOf(owner, [enemy]));
            assert.equals(0, applyTallyDefection([owner, enemy], Faction.Player, () => false, () => { calls++; return 0; }).length);
            assert.equals(0, calls);
            assert.equals(Faction.Enemy, enemy.faction);
            assert.equals(template, owner.tallyTemplateId);
        });
    }

    for (const template of ['sima-yi', 'tiger-tally-lang-gu-fu']) {
        suite.test(`${template} 策反含30%邊界，排除友軍死人主將及31%血量`, () => {
            const owner = unit('owner', Faction.Player, template);
            const excluded = [unit('ally', Faction.Player, null, 10), unit('dead', Faction.Enemy, null, 0),
                unit('general', Faction.Enemy, null, 10), unit('healthy', Faction.Enemy, null, 31)];
            const before = excluded.map((u) => u.faction).join(',');
            const edge = unit('edge', Faction.Enemy, null, 30);
            let calls = 0;
            const result = applyTallyDefection([owner, ...excluded, edge], Faction.Player, (u) => u.id === 'general', () => { calls++; return 0; });
            assert.equals('edge', result.map((u) => u.id).join(','));
            assert.equals(Faction.Player, edge.faction);
            assert.equals(before, excluded.map((u) => u.faction).join(','));
            assert.equals(1, calls);
        });

        suite.test(`${template} 沒有合格候選不改陣營也不取亂數`, () => {
            const units = [unit('owner', Faction.Player, template), unit('ally', Faction.Player, null, 10),
                unit('dead', Faction.Enemy, null, 0), unit('general', Faction.Enemy, null, 10), unit('healthy', Faction.Enemy, null, 31)];
            const before = units.map((u) => u.faction).join(',');
            let calls = 0;
            assert.equals(0, applyTallyDefection(units, Faction.Player, (u) => u.id === 'general', () => { calls++; return 0; }).length);
            assert.equals(before, units.map((u) => u.faction).join(','));
            assert.equals(0, calls);
        });

        suite.test(`${template} 死亡或非行動陣營的來源不策反`, () => {
            for (const owner of [unit('dead-owner', Faction.Player, template, 0), unit('enemy-owner', Faction.Enemy, template)]) {
                const target = unit('target', Faction.Enemy, null, 10);
                let calls = 0;
                assert.equals(0, applyTallyDefection([owner, target], Faction.Player, () => false, () => { calls++; return 0; }).length);
                assert.equals(Faction.Enemy, target.faction);
                assert.equals(0, calls);
            }
        });
    }

    return suite;
}
