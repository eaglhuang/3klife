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
