// @spec-source → 主戰場UI規格書.md (doc_ui_0001)；回合開始提示改用橫幅（PROG-2-1888）
/**
 * TurnBannerPresenter.ts — BattleUIBridge 與 BattleSceneFlow 共用的回合開始提示
 *
 * 部署面板有橫幅就用橫幅；舊版 DeployPanel 沒有橫幅時退回 Toast。
 */
import { Color } from 'cc';
import { Faction } from '../../core/config/Constants';
import type { IDeployRuntimeLike } from '../../shared/interfaces/IBattleUIComponents';
import { claimTurnBannerSlot, turnBannerOf } from '../shared/TurnBanner';
import { BATTLE_TURN_FLOW_TIMING } from './BattlePresentationTiming';

export function playTurnBannerOn(runtime: IDeployRuntimeLike | null | undefined, faction: Faction): void {
  if (!claimTurnBannerSlot(Date.now(), BATTLE_TURN_FLOW_TIMING.turnBannerDebounceMs)) return;
  const spec = turnBannerOf(faction);
  const color = new Color(spec.rgba[0], spec.rgba[1], spec.rgba[2], spec.rgba[3]);
  if (runtime?.showTurnBanner) {
    runtime.showTurnBanner(spec.text, color, BATTLE_TURN_FLOW_TIMING.turnBannerSec);
    return;
  }
  runtime?.showToast(spec.text, BATTLE_TURN_FLOW_TIMING.turnBannerToastSec, { color });
}
