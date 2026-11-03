/**
 * 奉孝符遺計定遼（陣亡全場敵軍混亂）與狼顧符鷹視狼顧（每回合策反殘血敵軍），PROG-2-1572。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { applyTallyDefection, tallyDeathConfusionOf } from '../assets/scripts/battle/shared/TallyPassive';
import { TestSuite, assert } from './TestRunner';

function unit(id: string, faction: Faction, template?: string, hp = 100): TroopUnit {
    const u = new TroopUnit(id, TroopType.Archer, faction, { hp: 100, attack: 30, defense: 20, moveRange: 2, attackRange: 1 });
    u.currentHp = hp;
    if (template) u.tallyTemplateId = template;
    return u;
}

export function createTallyFengXiaoLangGuSuite(): TestSuite {
    const suite = new TestSuite('TallyFengXiaoLangGu (奉孝符混亂／狼顧符叛變 PROG-2-1572)');

    suite.test('奉孝符陣亡：全場存活敵軍混亂 1 回合，友軍不受影響', () => {
        const fx = unit('fx', Faction.Player, 'tiger-tally-feng-xiao-fu');
        const e1 = unit('e1', Faction.Enemy);
        const e2 = unit('e2', Faction.Enemy, undefined, 0);
        const ally = unit('a', Faction.Player);
        const r = tallyDeathConfusionOf(fx, [e1, e2, ally]);
        assert.equals(1, r!.turns);
        assert.equals('e1', r!.targets.map((u) => u.id).join(','));
    });

    suite.test('沒有奉孝符的部隊陣亡不觸發', () => {
        assert.equals(null, tallyDeathConfusionOf(unit('x', Faction.Player), [unit('e', Faction.Enemy)]));
    });

    suite.test('狼顧符：只策反血量 ≤ 30% 的非主將敵軍', () => {
        const lg = unit('lg', Faction.Player, 'tiger-tally-lang-gu-fu');
        const healthy = unit('h', Faction.Enemy, undefined, 80);
        const weak = unit('w', Faction.Enemy, undefined, 30);
        const general = unit('g', Faction.Enemy, undefined, 10);
        const defected = applyTallyDefection([lg, healthy, weak, general], Faction.Player, (u) => u.id === 'g', () => 0.99);
        assert.equals('w', defected.map((u) => u.id).join(','));
        assert.equals(Faction.Player, weak.faction);
        assert.equals(Faction.Enemy, healthy.faction);
        assert.equals(Faction.Enemy, general.faction);
    });

    suite.test('狼顧符：非己方回合或沒有候選時不策反', () => {
        const lg = unit('lg', Faction.Player, 'tiger-tally-lang-gu-fu');
        const weak = unit('w', Faction.Enemy, undefined, 10);
        assert.equals(0, applyTallyDefection([lg, weak], Faction.Enemy, () => false, () => 0).length);
        assert.equals(0, applyTallyDefection([lg, unit('h', Faction.Enemy)], Faction.Player, () => false, () => 0).length);
    });

    return suite;
}
