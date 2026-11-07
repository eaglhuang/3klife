// @spec-source → 戰法場景規格書.md (doc_spec_0039)；PROG-2-1429 依建檔紀錄補標出處
import { BattleTactic } from '../../../core/config/Constants';
import {
  BattleSkillTargetMode,
  BattleSkillTiming,
  SkillSourceType,
  type BattleSkillRequest,
} from '../../../shared/SkillRuntimeContract';

const SCENE_GAMBIT_PROFILE: Partial<Record<BattleTactic, { battleSkillId: string; notes: string }>> = {
  [BattleTactic.FireAttack]: { battleSkillId: 'scene-fire-attack', notes: 'scene:fire-attack' },
  [BattleTactic.FloodAttack]: { battleSkillId: 'scene-flood-attack', notes: 'scene:flood-attack' },
  [BattleTactic.RockSlide]: { battleSkillId: 'scene-rock-slide', notes: 'scene:rock-slide' },
  [BattleTactic.AmbushAttack]: { battleSkillId: 'scene-ambush-attack', notes: 'scene:ambush-attack' },
  [BattleTactic.NightRaid]: { battleSkillId: 'scene-night-raid', notes: 'scene:night-raid' },
  // 攻城（場景全局戰法注入與場勢視覺連動規格書 doc_spec_0366 §2，PROG-2-2049）
  [BattleTactic.Siege]: { battleSkillId: 'scene-siege', notes: 'scene:siege' },
};

export class SceneGambitAdapter {
  public buildRequest(battleTactic: BattleTactic, ownerUid: string = SkillSourceType.SceneGambit): BattleSkillRequest | null {
    const mapped = SCENE_GAMBIT_PROFILE[battleTactic];
    if (!mapped) {
      return null;
    }

    return {
      sourceType: SkillSourceType.SceneGambit,
      ownerUid,
      battleSkillId: mapped.battleSkillId,
      targetMode: BattleSkillTargetMode.GlobalStage,
      timing: BattleSkillTiming.StartOfBattle,
      notes: mapped.notes,
    };
  }
}