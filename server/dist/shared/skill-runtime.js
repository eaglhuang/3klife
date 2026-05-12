"use strict";
/**
 * Shared skill runtime contracts for server/tooling/tests.
 *
 * Keep this file Cocos-independent so Node.js and Docker builds can compile
 * without importing from `assets/scripts/**`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UltimateEffectFamily = exports.TacticModuleType = exports.BattleSkillTiming = exports.BattleSkillTargetMode = exports.SkillSourceType = void 0;
exports.buildIdMap = buildIdMap;
var SkillSourceType;
(function (SkillSourceType) {
    SkillSourceType["TigerTally"] = "tiger-tally";
    SkillSourceType["Mentor"] = "mentor";
    SkillSourceType["Bloodline"] = "bloodline";
    SkillSourceType["SceneGambit"] = "scene-gambit";
    SkillSourceType["SeedTactic"] = "seed-tactic";
    SkillSourceType["Ultimate"] = "ultimate";
})(SkillSourceType || (exports.SkillSourceType = SkillSourceType = {}));
var BattleSkillTargetMode;
(function (BattleSkillTargetMode) {
    BattleSkillTargetMode["Self"] = "self";
    BattleSkillTargetMode["AllySingle"] = "ally-single";
    BattleSkillTargetMode["EnemySingle"] = "enemy-single";
    BattleSkillTargetMode["AllyAll"] = "ally-all";
    BattleSkillTargetMode["EnemyAll"] = "enemy-all";
    BattleSkillTargetMode["Line"] = "line";
    BattleSkillTargetMode["Fan"] = "fan";
    BattleSkillTargetMode["AroundSelf"] = "around-self";
    BattleSkillTargetMode["Area"] = "area";
    BattleSkillTargetMode["Tile"] = "tile";
    BattleSkillTargetMode["AdjacentTiles"] = "adjacent-tiles";
    BattleSkillTargetMode["GlobalStage"] = "global-stage";
    BattleSkillTargetMode["ReactiveSourceTarget"] = "reactive-source-target";
})(BattleSkillTargetMode || (exports.BattleSkillTargetMode = BattleSkillTargetMode = {}));
var BattleSkillTiming;
(function (BattleSkillTiming) {
    BattleSkillTiming["ActiveCast"] = "active-cast";
    BattleSkillTiming["StartOfBattle"] = "start-of-battle";
    BattleSkillTiming["StartOfTurn"] = "start-of-turn";
    BattleSkillTiming["OnAttack"] = "on-attack";
    BattleSkillTiming["OnHit"] = "on-hit";
    BattleSkillTiming["OnCounter"] = "on-counter";
    BattleSkillTiming["OnKill"] = "on-kill";
    BattleSkillTiming["OnDeath"] = "on-death";
    BattleSkillTiming["OnEnterTile"] = "on-enter-tile";
    BattleSkillTiming["EndOfTurn"] = "end-of-turn";
})(BattleSkillTiming || (exports.BattleSkillTiming = BattleSkillTiming = {}));
var TacticModuleType;
(function (TacticModuleType) {
    TacticModuleType["DirectDamage"] = "direct-damage";
    TacticModuleType["LineDamage"] = "line-damage";
    TacticModuleType["AreaDamage"] = "area-damage";
    TacticModuleType["MovementModifier"] = "movement-modifier";
    TacticModuleType["ForcedMove"] = "forced-move";
    TacticModuleType["TileState"] = "tile-state";
    TacticModuleType["BuffApply"] = "buff-apply";
    TacticModuleType["DebuffApply"] = "debuff-apply";
    TacticModuleType["HealRecover"] = "heal-recover";
    TacticModuleType["LinkShare"] = "link-share";
    TacticModuleType["CounterReaction"] = "counter-reaction";
    TacticModuleType["ActionReset"] = "action-reset";
    TacticModuleType["StealthReveal"] = "stealth-reveal";
    TacticModuleType["ObstacleSpawn"] = "obstacle-spawn";
    TacticModuleType["ConditionalTrigger"] = "conditional-trigger";
})(TacticModuleType || (exports.TacticModuleType = TacticModuleType = {}));
var UltimateEffectFamily;
(function (UltimateEffectFamily) {
    UltimateEffectFamily["SelfBurst"] = "self-burst";
    UltimateEffectFamily["TeamBuff"] = "team-buff";
    UltimateEffectFamily["TeamHeal"] = "team-heal";
    UltimateEffectFamily["EnemyMassDebuff"] = "enemy-mass-debuff";
    UltimateEffectFamily["SingleExecute"] = "single-execute";
    UltimateEffectFamily["AreaBurst"] = "area-burst";
    UltimateEffectFamily["ControlOverride"] = "control-override";
    UltimateEffectFamily["SpecialRule"] = "special-rule";
})(UltimateEffectFamily || (exports.UltimateEffectFamily = UltimateEffectFamily = {}));
function buildIdMap(items) {
    return new Map((items !== null && items !== void 0 ? items : []).map((item) => [item.id, item]));
}
