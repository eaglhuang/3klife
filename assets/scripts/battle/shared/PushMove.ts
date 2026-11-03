// @spec-source → 戰法系統.md (doc_spec_0038)；PROG-2-1429 依建檔紀錄補標出處
/**
 * 戰法位移（push，PROG-2-0767）純邏輯。
 *
 * 方向：遠離施放者。前後距離不同時沿 depth 軸；同一 depth 時沿 lane 軸。
 * 每一步都要求下一格可站立，遇到障礙即停在最後一個可站立的格子。
 */
export interface PushPlan {
  lane: number;
  depth: number;
  movedSteps: number;
  blocked: boolean;
}

export function pushAway(
  target: { lane: number; depth: number },
  caster: { lane: number; depth: number },
  steps: number,
  isFree: (lane: number, depth: number) => boolean,
): PushPlan {
  const dDepth = Math.sign(target.depth - caster.depth);
  const dLane = Math.sign(target.lane - caster.lane);
  const stepLane = dDepth !== 0 ? 0 : dLane;
  const stepDepth = dDepth !== 0 ? dDepth : 0;

  let lane = target.lane;
  let depth = target.depth;
  let movedSteps = 0;
  if (stepLane === 0 && stepDepth === 0) {
    return { lane, depth, movedSteps, blocked: false };
  }
  for (let i = 0; i < steps; i++) {
    const nextLane = lane + stepLane;
    const nextDepth = depth + stepDepth;
    if (!isFree(nextLane, nextDepth)) {
      return { lane, depth, movedSteps, blocked: true };
    }
    lane = nextLane;
    depth = nextDepth;
    movedSteps += 1;
  }
  return { lane, depth, movedSteps, blocked: false };
}

/**
 * 力量推入危險地形（戰場部署系統「高力量角色更適合擊退、破陣與把敵方推入 Hazard Tile」，PROG-2-1608 暫定）：
 * 施放者主將力量達門檻、擊退沒受阻，且再推 1 格就是可站立的危險地形時，多推那 1 格。
 */
export const STRENGTH_PUSH_THRESHOLD = 90;

export function extendPushIntoHazard(
  plan: PushPlan,
  origin: { lane: number; depth: number },
  casterStr: number | null | undefined,
  isFree: (lane: number, depth: number) => boolean,
  isHazard: (lane: number, depth: number) => boolean,
): PushPlan {
  if ((casterStr ?? 0) < STRENGTH_PUSH_THRESHOLD || plan.blocked || plan.movedSteps === 0) return plan;
  const stepLane = Math.sign(plan.lane - origin.lane);
  const stepDepth = Math.sign(plan.depth - origin.depth);
  const lane = plan.lane + stepLane;
  const depth = plan.depth + stepDepth;
  if (!isFree(lane, depth) || !isHazard(lane, depth)) return plan;
  return { lane, depth, movedSteps: plan.movedSteps + 1, blocked: false };
}
