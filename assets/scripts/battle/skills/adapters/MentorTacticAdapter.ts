// @spec-source → 教官系統（支援卡）.md (doc_spec_0027)、戰法系統.md (doc_spec_0038)；PROG-2-1429 依建檔紀錄補標出處
import type { GeneralUnit } from '../../../core/models/GeneralUnit';
import { SkillSourceType, type CanonicalTacticDefinition } from '../../../shared/SkillRuntimeContract';
import { SeedTacticAdapter, type SeedTacticRequestOptions } from './SeedTacticAdapter';

export class MentorTacticAdapter extends SeedTacticAdapter {
  constructor(tacticDefinitionsById: Map<string, CanonicalTacticDefinition>) {
    super(tacticDefinitionsById);
  }

  public override buildRequest(general: GeneralUnit, ownerUid: string, options: SeedTacticRequestOptions = {}) {
    // 未指定戰法時優先取 awakened 槽；否則第一個普通種子槽會擋掉 Mentor 來源（MENT-16）
    const tacticId = options.tacticId ?? this.firstAwakenedTacticId(general);
    const request = super.buildRequest(general, ownerUid, { ...options, tacticId });
    if (!request) {
      return null;
    }

    if (request.sourceType !== SkillSourceType.Mentor && !this.isMentorSlot(general, request.tacticId)) {
      return null;
    }

    return {
      ...request,
      sourceType: SkillSourceType.Mentor,
    };
  }

  private firstAwakenedTacticId(general: GeneralUnit): string | null {
    return (general.tacticSlots ?? []).find((slot) => slot.source === 'awakened')?.tacticId ?? null;
  }

  private isMentorSlot(general: GeneralUnit, tacticId?: string | null): boolean {
    return (general.tacticSlots ?? []).some((slot) => slot.tacticId === tacticId && slot.source === 'awakened');
  }
}