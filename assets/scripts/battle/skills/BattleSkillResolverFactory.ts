// @spec-source → 戰法系統.md (doc_spec_0038)；PROG-2-1429 依建檔紀錄補標出處
import { BattleSkillExecutor } from './BattleSkillExecutor';
import { CounterSkillResolver } from './resolvers/CounterSkillResolver';
import { BuffDebuffSkillResolver } from './resolvers/BuffDebuffSkillResolver';
import { HealSkillResolver } from './resolvers/HealSkillResolver';
import { LinkSkillResolver } from './resolvers/LinkSkillResolver';
import { ProjectedDamageSkillResolver } from './resolvers/ProjectedDamageSkillResolver';
import { ResetSkillResolver } from './resolvers/ResetSkillResolver';
import { MoraleSkillResolver } from './resolvers/MoraleSkillResolver';
import { PushSkillResolver } from './resolvers/PushSkillResolver';
import { DotSkillResolver } from './resolvers/DotSkillResolver';
import { RootSkillResolver } from './resolvers/RootSkillResolver';
import { SlowSkillResolver } from './resolvers/SlowSkillResolver';
import { FireGodHuntSkillResolver } from './resolvers/FireGodHuntSkillResolver';
import { FormationZoneSkillResolver } from './resolvers/FormationZoneSkillResolver';
import { VitalityRestoreSkillResolver } from './resolvers/VitalityRestoreSkillResolver';

export function createDefaultBattleSkillExecutor(): BattleSkillExecutor {
  return new BattleSkillExecutor([
    new BuffDebuffSkillResolver(),
    new CounterSkillResolver(),
    new HealSkillResolver(),
    new LinkSkillResolver(),
    new ResetSkillResolver(),
    new ProjectedDamageSkillResolver(),
    new MoraleSkillResolver(),
    new VitalityRestoreSkillResolver(),
    new PushSkillResolver(),
    new DotSkillResolver(),
    new RootSkillResolver(),
    new SlowSkillResolver(),
    new FireGodHuntSkillResolver(),
    new FormationZoneSkillResolver(),
  ]);
}
