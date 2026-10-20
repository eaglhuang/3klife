import { BattleSkillExecutor } from './BattleSkillExecutor';
import { CounterSkillResolver } from './resolvers/CounterSkillResolver';
import { BuffDebuffSkillResolver } from './resolvers/BuffDebuffSkillResolver';
import { HealSkillResolver } from './resolvers/HealSkillResolver';
import { LinkSkillResolver } from './resolvers/LinkSkillResolver';
import { ProjectedDamageSkillResolver } from './resolvers/ProjectedDamageSkillResolver';
import { ResetSkillResolver } from './resolvers/ResetSkillResolver';
import { PushSkillResolver } from './resolvers/PushSkillResolver';
import { DotSkillResolver } from './resolvers/DotSkillResolver';
import { RootSkillResolver } from './resolvers/RootSkillResolver';
import { SlowSkillResolver } from './resolvers/SlowSkillResolver';
import { FormationZoneSkillResolver } from './resolvers/FormationZoneSkillResolver';

export function createDefaultBattleSkillExecutor(): BattleSkillExecutor {
  return new BattleSkillExecutor([
    new BuffDebuffSkillResolver(),
    new CounterSkillResolver(),
    new HealSkillResolver(),
    new LinkSkillResolver(),
    new ResetSkillResolver(),
    new ProjectedDamageSkillResolver(),
    new PushSkillResolver(),
    new DotSkillResolver(),
    new RootSkillResolver(),
    new SlowSkillResolver(),
    new FormationZoneSkillResolver(),
  ]);
}
