// @spec-source → 見 docs/cross-reference-index.md (UCUF Wave 2 - Final Gap)
/**
 * DeployComposite — 玩家部署操作面板（CompositePanel 版）
 *
 * 以 `deploy-panel-screen` 三層 spec 為底，保留 DeployPanel 對 BattleScene 的公開 API：
 *   - setController / registerDragDropCallback / updateFood / updateSkillStatus
 *   - selectLane / deploySelected / showToast / dragging
 *
 * Unity 對照：等同 MonoBehaviour 完整搬進 CompositePanel 容器，spec 已覆蓋全部 UI 節點。
 */
import {
  deployHowToFix,
  deploySheetTitleKey,
  deployShortToast,
  describeDeployShortfall,
  foodShortMessage,
  resourceSnapshot,
} from '../../core/systems/SortieDeployScripts';
import {
  _decorator,
  Color,
  EventMouse,
  EventTouch,
  Graphics,
  input,
  Input,
  Label,
  Node,
  UIOpacity,
  UITransform,
  Vec3,
  Widget,
} from 'cc';
import { GAME_CONFIG, TROOP_DEPLOY_COST, TroopType } from '../../core/config/Constants';
import {
  checkDeploy,
  DEPLOY_SUGGESTION_CANDIDATES,
  deploySuggestionCopy,
  nextRedirectStep,
  suggestLowCostDeploy,
  type RedirectPrompt,
} from '../../core/systems/SortieDeploy';
import { IDeployController, IDeployRuntimeLike } from '../../shared/interfaces/IBattleUIComponents';
import { CompositePanel } from '../core/CompositePanel';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { services } from '../../core/managers/ServiceLoader';
import { UI_EVENTS } from '../core/UIEvents';
import { TallyCardData } from '../../shared/TallyCardContract';
import type { ToastOptions } from './ToastMessage';
import { emitDeployDragDebug, shouldLogDeployDragMove } from './DeployDragDebug';
import { tallyDeployRefOf, type TallyDeployRef } from '../../core/config/TallyCardCatalog';
import { UCUFLogger, LogLevel } from '../../core/utils/UCUFLogger';
import { TurnBannerComposite } from './TurnBannerComposite';
import { turnBannerVisibleSeconds } from '../core/TurnBannerTiming';
import { EnemyThinkingComposite } from './EnemyThinkingComposite';
import { BattleResourceBar } from './BattleResourceBar';
import { DeployShortSheet, type DeploySheetSpec } from './DeployShortSheet';

const { ccclass } = _decorator;

/** 本回合部署已達上限（總PM 2026-11-16 裁決：上限 3，由玩家自己按結束回合推進） */
const DEPLOY_LIMIT_TOAST = '本回合部署已達上限，請按結束回合';

interface ToastMessageLike {
  node: Node;
  show: (message: string, duration?: number, options?: ToastOptions) => void | Promise<void>;
  hide?: (key?: string) => void;
  /** 回合橫幅期間暫停顯示（PROG-2-9416）；舊版 ToastMessage 沒有這個方法 */
  holdFor?: (seconds: number) => void;
}

export enum DeployDragState {
  Idle,
  Dragging,
  Validating,
  Deployed,
  Cancelled,
}

@ccclass('DeployComposite')
export class DeployComposite extends CompositePanel implements IDeployRuntimeLike {
  private ctrl: IDeployController | null = null;
  private selectedType: TroopType = TroopType.Infantry;
  private selectedUnitName = '';
  /** 目前選的虎符 id（TRP-13）；選一般兵種時為 null */
  private selectedTally: TallyDeployRef | null = null;
  private selectedLane = 0;
  /** 改派二次確認：上一次被擋的目標（DEP-10 A 案） */
  private redirectPrompt: RedirectPrompt | null = null;
  private currentFood = GAME_CONFIG.INITIAL_FOOD;

  private infoRow: Node | null = null;
  private costLabel: Label | null = null;
  private hintLabel: Label | null = null;
  private toast: ToastMessageLike | null = null;
  private turnBanner: TurnBannerComposite | null = null;
  private enemyThinking: EnemyThinkingComposite | null = null;

  private _dragState: DeployDragState = DeployDragState.Idle;
  private ghostNode: Node | null = null;
  private dragDropCallback: ((screenX: number, screenY: number) => void) | null = null;
  /** 拖曳中回報懸停位置，讓棋盤高亮手指所在格（主戰場UI規格書 §3.3，PROG-2-1880） */
  private dragHoverCallback: ((point: { x: number; y: number } | null) => void) | null = null;
  private _cardSelectedUnsub: (() => void) | null = null;
  private _cardDragUnsub: (() => void) | null = null;
  private _cardShortUnsub: (() => void) | null = null;
  /** 常駐資源列與出牌不足說明面板（doc_spec_1341）；掛在戰場 UI 根上，第一次用到才建 */
  private resourceBar: BattleResourceBar | null = null;
  private shortSheet: DeployShortSheet | null = null;
  private _lastDragMoveLogAt = 0;

  private isMounted = false;
  public get dragging(): boolean {
    return this._dragState !== DeployDragState.Idle;
  }

  public setController(ctrl: IDeployController): void {
    this.ctrl = ctrl;
  }

  public registerDragDropCallback(cb: (screenX: number, screenY: number) => void): void {
    this.dragDropCallback = cb;
  }

  public registerDragHoverCallback(cb: (point: { x: number; y: number } | null) => void): void {
    this.dragHoverCallback = cb;
  }

  /** @deprecated v3-4 改用 updateFood（PROG-2-1896）；留給尚未改名的 BattleScene 呼叫 */
  public updateDp(food: number): void {
    this.updateFood(food);
  }

  public updateFood(food: number): void {
    this.currentFood = food;
    this.updateSelectionLabels();
    this.refreshResources();
  }

  /** 常駐資源列重畫：軍勢（出征帳本）與糧草的目前值／總量；沒有出征帳本只顯示糧草（doc_spec_1341 §3.2） */
  public refreshResources(): void {
    const host = this.node.parent;
    if (!host?.isValid) return;
    if (!this.resourceBar?.isValid) this.resourceBar = BattleResourceBar.mount(host);
    const sortie = this.ctrl?.getSortieState?.() ?? null;
    const maxFood = services().battle?.getMaxFood?.() ?? this.currentFood;
    this.resourceBar.setSnapshot(resourceSnapshot(sortie, { cur: this.currentFood, max: Math.max(maxFood, this.currentFood) }));
  }

  /** 選中兵牌時，在資源列標出派出後會剩多少；null 取消（doc_spec_1341 §3.5） */
  private setSelectionPreview(type: TroopType | null): void {
    this.unschedule(this._clearSelectionPreview);
    const sortie = this.ctrl?.getSortieState?.() ?? null;
    if (!type || !sortie || !this.resourceBar?.isValid) {
      this.resourceBar?.setPreview(null);
      return;
    }
    this.resourceBar.setPreview(checkDeploy(sortie, { troopType: type }).cost);
    // 點選後沒有「取消選取」的入口，數秒後自動收掉預覽線
    this.scheduleOnce(this._clearSelectionPreview, 4);
  }

  private _clearSelectionPreview = (): void => {
    this.resourceBar?.setPreview(null);
  };

  private troopName(type: string): string {
    const key = `battle.troop.${type}`;
    const text = services().i18n.t(key);
    return text === key ? this.toTroopDisplayName(type as TroopType) : text;
  }

  /** 點了派不出去的卡：開「缺多少、從哪扣、怎麼補」說明面板（doc_spec_1341 §5.2） */
  private openShortSheet(index: number, data: TallyCardData): void {
    const host = this.node.parent;
    const sortie = this.ctrl?.getSortieState?.() ?? null;
    if (!host?.isValid || !sortie) return;
    const type = data.unitType as TroopType;
    const sf = describeDeployShortfall(sortie, { troopType: type });
    if (sf.kind === 'ok') return;
    if (!this.shortSheet?.isValid) this.shortSheet = DeployShortSheet.mount(host);
    const t = (k: string, ...a: string[]): string => services().i18n.t(k, ...a);
    const unit = this.troopName(type);
    const help = this.ctrl?.getDeployHelpContext?.() ?? { canRetreat: false, canPromote: false };
    const suggestion = suggestLowCostDeploy(sortie, type, DEPLOY_SUGGESTION_CANDIDATES);
    const redirect = suggestion
      ? (() => {
          const cost = checkDeploy(sortie, { troopType: suggestion }).cost;
          return { troopName: this.troopName(suggestion), troopCost: cost.troopCost, foodCost: cost.foodCost };
        })()
      : null;
    const gapText = (g: { gap: number }): string => (g.gap > 0 ? t('battle.deploy.sheet.gap', String(g.gap)) : t('battle.deploy.sheet.enough'));
    const spec: DeploySheetSpec = {
      title: t(deploySheetTitleKey(sf.kind)),
      summary: t('battle.deploy.sheet.summary', unit, String(sf.troops.need), String(sf.food.need)),
      headers: { need: t('battle.deploy.sheet.head.need'), have: t('battle.deploy.sheet.head.have'), gap: t('battle.deploy.sheet.head.gap') },
      rows: [
        { name: t('battle.deploy.sheet.row.troops'), need: String(sf.troops.need), have: String(sf.troops.have), gap: gapText(sf.troops), ok: sf.troops.gap === 0 },
        { name: t('battle.deploy.sheet.row.food'), need: String(sf.food.need), have: String(sf.food.have), gap: gapText(sf.food), ok: sf.food.gap === 0 },
      ],
      source: t('battle.deploy.sheet.source'),
      how: deployHowToFix(sf, { ...help, redirect }).map((c) => t(c.key, ...c.args)),
      buttons: [],
    };
    // 改派不自動代換：只把選取改成建議兵種，仍要玩家自己拖出去（doc_spec_0377 §3.2）
    if (suggestion && redirect) {
      spec.buttons.push({
        label: t('battle.deploy.sheet.btn.redirect', redirect.troopName, String(redirect.troopCost)),
        primary: true,
        onClick: () => {
          this.selectedType = suggestion as TroopType;
          this.selectedUnitName = '';
          this.selectedTally = null;
          this.shortSheet?.hide();
          this.setSelectionPreview(this.selectedType);
          this.showToast(t('battle.deploy.redirected', redirect.troopName));
        },
      });
    }
    spec.buttons.push({
      label: t('battle.deploy.sheet.btn.info'),
      onClick: () => {
        this.shortSheet?.hide();
        services().event.emit(UI_EVENTS.CardSelected, { index, data });
      },
    });
    spec.buttons.push({ label: t('battle.deploy.sheet.btn.ok'), onClick: () => this.shortSheet?.hide() });
    this.shortSheet.show(spec);
  }

  /**
   * TigerTallyComposite 已接手卡槽主視覺，Composite 路徑下此 API 保留為相容 stub。
   */
  public setTroopSlotButtonsVisible(_visible: boolean): void {
    // noop
  }

  /** @deprecated SkillButton 已遷移至 ActionCommandComposite，此方法保留為空 stub 供舊呼叫者兼容 */
  public updateSkillStatus(_isReady: boolean): void {
    // noop — skill button is now owned by ActionCommandComposite
  }

  public selectLane(lane: number): void {
    this.selectedLane = lane;
    this.endDrag();
    this.onDeployClick();
  }

  public deploySelected(): void {
    this.onDeployClick();
  }

  /** 未指定時長時由 ToastMessage 停留 2 秒（主戰場UI §4.1，PROG-2-1894） */
  public showToast(message: string, duration?: number, options?: ToastOptions): void {
    // 常駐資源列與提示條同在頂部：提示要蓋在資源列上面，不然「軍勢不足」會被擋住
    const bar = this.resourceBar?.node;
    let anchor: Node | null = (this.toast as unknown as { node?: Node } | null)?.node ?? null;
    while (anchor && bar?.isValid && anchor.parent !== bar.parent) anchor = anchor.parent;
    if (anchor?.isValid && bar?.isValid && bar.getSiblingIndex() > anchor.getSiblingIndex()) bar.setSiblingIndex(anchor.getSiblingIndex());
    void this.toast?.show(message, duration, options);
  }

  /** 回合開始橫幅：掛在部署面板的父節點（戰場 UI 根）上，橫貫整個畫面（PROG-2-1888） */
  public showTurnBanner(text: string, color: Color, durationSec: number): void {
    if (!this.turnBanner || !this.turnBanner.isValid) {
      const bannerNode = this.ensureFullScreenOverlayNode('TurnBanner');
      this.turnBanner = bannerNode.getComponent(TurnBannerComposite) ?? bannerNode.addComponent(TurnBannerComposite);
    }
    this.turnBanner.node.setSiblingIndex(this.turnBanner.node.parent!.children.length - 1);
    // 橫幅與提示框都在畫面中央：橫幅期間提示先暫停，收掉後再依序播，不疊字（PROG-2-9416）
    this.toast?.holdFor?.(turnBannerVisibleSeconds(durationSec));
    void this.turnBanner.show(text, color, durationSec);
  }

  /** 敵方回合「敵軍行動中…」細帶：與回合橫幅同樣掛在戰場 UI 根上（PROG-2-1891） */
  public setEnemyThinkingVisible(visible: boolean): void {
    if (!this.enemyThinking || !this.enemyThinking.isValid) {
      if (!visible) return;
      const thinkingNode = this.ensureFullScreenOverlayNode('EnemyThinking');
      this.enemyThinking = thinkingNode.getComponent(EnemyThinkingComposite) ?? thinkingNode.addComponent(EnemyThinkingComposite);
    }
    void this.enemyThinking.setVisible(visible);
  }

  /** 在部署面板的父節點（戰場 UI 根）上取得或建立一個全畫面疊加層節點 */
  private ensureFullScreenOverlayNode(name: string): Node {
    const host = this.node.parent ?? this.node;
    const overlayNode = host.getChildByName(name) ?? new Node(name);
    overlayNode.layer = this.node.layer;
    if (!overlayNode.parent) overlayNode.parent = host;
    const ut = overlayNode.getComponent(UITransform) ?? overlayNode.addComponent(UITransform);
    ut.setContentSize(1920, 1080);
    const widget = overlayNode.getComponent(Widget) ?? overlayNode.addComponent(Widget);
    widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
    widget.top = widget.bottom = widget.left = widget.right = 0;
    return overlayNode;
  }

  public async mount(): Promise<void> {
    if (this.isMounted) return;
    emitDeployDragDebug('DeployComposite', 'mount-start', { node: this.node.name });
    const legacyChildren = [...this.node.children];
    await super.mount('deploy-panel-screen');
    for (const child of legacyChildren) {
      if (child?.isValid && child.parent === this.node) {
        child.destroy();
      }
    }
    this.isMounted = true;
    input.on(Input.EventType.TOUCH_MOVE, this.onGlobalTouchMove, this);
    input.on(Input.EventType.TOUCH_END, this.onGlobalTouchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.onGlobalTouchEnd, this);
    input.on(Input.EventType.MOUSE_UP, this.onGlobalMouseUp, this);
    emitDeployDragDebug('DeployComposite', 'mount-complete', {
      legacyFallback: false,
    });
  }

  protected onDestroy(): void {
    emitDeployDragDebug('DeployComposite', 'on-destroy');
    input.off(Input.EventType.TOUCH_MOVE, this.onGlobalTouchMove, this);
    input.off(Input.EventType.TOUCH_END, this.onGlobalTouchEnd, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.onGlobalTouchEnd, this);
    input.off(Input.EventType.MOUSE_UP, this.onGlobalMouseUp, this);
    this._cardSelectedUnsub?.();
    this._cardSelectedUnsub = null;
    this._cardDragUnsub?.();
    this._cardDragUnsub = null;
    this._cardShortUnsub?.();
    this._cardShortUnsub = null;
    this.endDrag();
    this.unmount();
  }

  protected override _onAfterBuildReady(binder: UITemplateBinder): void {
    emitDeployDragDebug('DeployComposite', 'on-after-build-ready');
    this.infoRow = binder.getNode('InfoRow') ?? binder.getNodeByPath('InfoRow');
    if (this.infoRow) {
      this.infoRow.active = false;
    }
    this.costLabel = binder.getLabel('costLabel');
    this.hintLabel = binder.getLabel('hintLabel');

    const toastNode = binder.getNode('toastContainer') ?? this.node.getChildByName('Toast');
    if (toastNode) {
      this.toast = ((
        toastNode.getComponent('ToastMessageComposite')
        ?? toastNode.getComponent('ToastMessage')
        ?? toastNode.addComponent('ToastMessageComposite')
      ) as unknown) as ToastMessageLike | null;
    }

    // [UCUF Wave 2] 兵種選擇已委由 TigerTallyComposite / CardSelected 事件驅動
    this._cardSelectedUnsub?.();
    this._cardSelectedUnsub = services().event.on(
      UI_EVENTS.CardSelected,
      (payload: { index: number; data: TallyCardData }) => {
        emitDeployDragDebug('DeployComposite', 'event-card-selected', {
          index: payload.index,
          unitType: payload.data.unitType,
        });
        this.selectedType = payload.data.unitType as TroopType;
        this.selectedUnitName = payload.data.unitName?.trim() || this.toTroopDisplayName(this.selectedType);
        this.selectedTally = tallyDeployRefOf(payload.data);
        this.updateSelectionLabels();
        this.shortSheet?.hide();
        this.setSelectionPreview(this.selectedType);
      },
    );

    // 派不出去的卡被點了：開說明面板，而不是兵種資訊
    this._cardShortUnsub?.();
    this._cardShortUnsub = services().event.on(
      UI_EVENTS.CardShortTapped,
      (payload: { index: number; data: TallyCardData }) => this.openShortSheet(payload.index, payload.data),
    );

    // [UCUF Wave 2] 接收 TigerTallyComposite 的 CardDragStart → 啟動 ghost drag
    this._cardDragUnsub?.();
    this._cardDragUnsub = services().event.on(
      UI_EVENTS.CardDragStart,
      (payload: { ev: import('cc').EventTouch; data: TallyCardData }) => {
        emitDeployDragDebug('DeployComposite', 'event-card-drag-start', {
          unitType: payload.data.unitType,
          dragState: this._dragState,
        });
        this.selectedType = payload.data.unitType as TroopType;
        this.selectedUnitName = payload.data.unitName?.trim() || this.toTroopDisplayName(this.selectedType);
        this.selectedTally = tallyDeployRefOf(payload.data);
        this.updateSelectionLabels();
        this.setSelectionPreview(this.selectedType);
        // 本回合已達部署上限就不開始拖曳，直接提示（與 tryDeployTroop 的 limit 同一判斷）
        if (this.ctrl?.getPlayerDeployProgress?.().reached) {
          this.showToast(DEPLOY_LIMIT_TOAST);
          return;
        }
        this.beginDrag(payload.ev, this.selectedType);
      },
    );

    this.updateSelectionLabels();
    this.refreshResources();
  }

  private beginDrag(ev: EventTouch, type: TroopType): void {
    if (this._dragState !== DeployDragState.Idle) this.endDrag();
    this._dragState = DeployDragState.Dragging;
    emitDeployDragDebug('DeployComposite', 'begin-drag', { type, state: this._dragState });

    const canvas = this.node.parent;
    if (!canvas) return;

    this.ghostNode = new Node('DragGhost');
    this.ghostNode.layer = this.node.layer;
    canvas.addChild(this.ghostNode);

    const transform = this.ghostNode.addComponent(UITransform);
    transform.setContentSize(120, 60);

    const graphics = this.ghostNode.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = new Color(255, 220, 80, 210);
    graphics.roundRect(-60, -30, 120, 60, 8);
    graphics.fill();

    const opacity = this.ghostNode.addComponent(UIOpacity);
    opacity.opacity = 200;

    const labelNode = new Node('GhostLabel');
    labelNode.layer = this.node.layer;
    this.ghostNode.addChild(labelNode);
    const labelTf = labelNode.addComponent(UITransform);
    labelTf.setContentSize(120, 60);
    const label = labelNode.addComponent(Label);
    label.string = this.selectedUnitName || this.toTroopDisplayName(type);
    label.fontSize = 24;
    label.lineHeight = 28;
    label.color = new Color(20, 20, 20, 255);

    this.moveGhostToTouch(ev);
    this._watchDragSourceRelease(ev);
  }

  /**
   * 放開時游標還在來源卡片上，全域放開事件會被卡片吃掉，殘影就留在畫面上。
   * 這裡直接聽來源卡片：放在卡上＝取消拖曳（不跳提示）；滑出卡片外放開＝走原本的落點判定。
   */
  private _watchDragSourceRelease(ev: EventTouch): void {
    const source = ev.target as Node | null;
    if (!source?.isValid) return;
    source.off(Node.EventType.TOUCH_END, this._onDragSourceTouchEnd, this);
    source.off(Node.EventType.TOUCH_CANCEL, this.onGlobalTouchEnd, this);
    source.once(Node.EventType.TOUCH_END, this._onDragSourceTouchEnd, this);
    source.once(Node.EventType.TOUCH_CANCEL, this.onGlobalTouchEnd, this);
  }

  private _onDragSourceTouchEnd(): void {
    if (this._dragState !== DeployDragState.Dragging) return;
    emitDeployDragDebug('DeployComposite', 'drag-released-on-source');
    this.endDrag();
  }

  private moveGhostToTouch(ev: EventTouch): void {
    if (!this.ghostNode) return;
    const canvas = this.node.parent;
    const canvasTf = canvas?.getComponent(UITransform);
    if (!canvasTf) return;
    const loc = ev.getUILocation();
    this.ghostNode.setPosition(new Vec3(
      loc.x - canvasTf.width * 0.5,
      loc.y - canvasTf.height * 0.5,
      0,
    ));
  }

  private endDrag(): void {
    if (this._dragState === DeployDragState.Idle) return;
    emitDeployDragDebug('DeployComposite', 'end-drag', {
      state: this._dragState,
      hadGhost: !!this.ghostNode,
    });
    this._dragState = DeployDragState.Idle;
    this.resourceBar?.setPreview(null);
    this.ghostNode?.destroy();
    this.ghostNode = null;
    this.dragHoverCallback?.(null);
  }

  private onGlobalTouchMove(ev: EventTouch): void {
    if (this._dragState === DeployDragState.Dragging) {
      this.moveGhostToTouch(ev);
      const hover = ev.getLocation();
      this.dragHoverCallback?.({ x: hover.x, y: hover.y });
      if (UCUFLogger.getLevel() <= LogLevel.DEBUG) {
        const now = Date.now();
        if (shouldLogDeployDragMove(now, this._lastDragMoveLogAt, 120)) {
          this._lastDragMoveLogAt = now;
          const loc = ev.getLocation();
          emitDeployDragDebug('DeployComposite', 'touch-move', { x: loc.x, y: loc.y });
        }
      }
    }
  }

  private onGlobalTouchEnd(ev: EventTouch): void {
    if (this._dragState === DeployDragState.Idle) return;
    const loc = ev.getLocation();
    emitDeployDragDebug('DeployComposite', 'touch-end', { x: loc.x, y: loc.y, state: this._dragState });
    this.processDragEnd(loc.x, loc.y);
  }

  private onGlobalMouseUp(ev: EventMouse): void {
    if (this._dragState === DeployDragState.Idle) return;
    const loc = ev.getLocation();
    emitDeployDragDebug('DeployComposite', 'mouse-up', { x: loc.x, y: loc.y, state: this._dragState });
    this.processDragEnd(loc.x, loc.y);
  }

  private processDragEnd(screenX: number, screenY: number): void {
    this._dragState = DeployDragState.Validating;
    emitDeployDragDebug('DeployComposite', 'process-drag-end', {
      x: screenX,
      y: screenY,
      hasCallback: !!this.dragDropCallback,
    });
    this.dragDropCallback?.(screenX, screenY);
    emitDeployDragDebug('DeployComposite', 'process-drag-end-after-callback', {
      state: this._dragState,
    });
    if (this._dragState === DeployDragState.Validating) {
      this._dragState = DeployDragState.Cancelled;
      emitDeployDragDebug('DeployComposite', 'process-drag-end-cancelled', {
        x: screenX,
        y: screenY,
      });
      this.showToast('請拖曳到最前排（第一列）部署');
      this.endDrag();
    }
  }

  private updateSelectionLabels(): void {
    if (this.infoRow && !this.infoRow.active) {
      return;
    }
    const cost = TROOP_DEPLOY_COST[this.selectedType];
    if (this.costLabel) {
      this.costLabel.string = `費用：${cost} 糧草`;
    }
    if (this.hintLabel) {
      this.hintLabel.string = `兵種：${this.toTroopDisplayName(this.selectedType)} / 路線：${this.selectedLane + 1}`;
    }
  }

  /** 選到虎符時才帶入 tally 參數（TRP-13）；一般兵種回傳 undefined */
  private _tallyOptions(): { tally: TallyDeployRef } | undefined {
    return this.selectedTally ? { tally: this.selectedTally } : undefined;
  }

  private onDeployClick(): void {
    if (!this.ctrl) {
      emitDeployDragDebug('DeployComposite', 'deploy-click-without-controller', {
        type: this.selectedType,
        lane: this.selectedLane,
      });
      return;
    }
    let outcome = this.ctrl.tryDeployTroop(this.selectedType, this.selectedLane, this.selectedUnitName || undefined, this._tallyOptions());
    emitDeployDragDebug('DeployComposite', 'deploy-click-result', {
      ok: outcome.ok,
      reason: outcome.reason,
      type: this.selectedType,
      lane: this.selectedLane,
    });
    if (!outcome.ok) {
      const step = nextRedirectStep(this.redirectPrompt, { troopType: this.selectedType, lane: this.selectedLane }, outcome.suggestion ?? null);
      this.redirectPrompt = step.prompt;
      if (step.action === 'arm' && step.troopType) {
        this.showToast(`${this.getDeployFailMessage(outcome.reason, this.selectedType)}\n${deploySuggestionCopy(this.toTroopDisplayName(step.troopType as TroopType))}，再點一次確認改派`);
        return;
      }
      if (step.action === 'confirm' && step.troopType) {
        outcome = this.ctrl.tryDeployTroop(step.troopType as TroopType, this.selectedLane);
      }
    }
    if (outcome.ok) {
      this.redirectPrompt = null;
      this.endDrag();
      this.node.emit('playerDeployed');
      return;
    }
    this.showToast(this.getDeployFailMessage(outcome.reason, this.selectedType));
  }

  private toTroopDisplayName(type: TroopType): string {
    const map: Partial<Record<TroopType, string>> = {
      [TroopType.Cavalry]: '騎兵',
      [TroopType.Infantry]: '步兵',
      [TroopType.Shield]: '盾兵',
      [TroopType.Archer]: '弓兵',
      [TroopType.Pikeman]: '槍兵',
    };
    return map[type] ?? String(type);
  }

  private getDeployFailMessage(reason?: string, type?: TroopType): string {
    const t = (k: string, ...a: string[]): string => services().i18n.t(k, ...a);
    if (reason === 'battle-locked') return '目前流程鎖定，暫時無法部署';
    if (reason === 'limit') return DEPLOY_LIMIT_TOAST;
    if (reason === 'occupied') return '目標格已有單位，請改放其他格子';
    if (reason === 'order-refused') return '⚠ 主將忠誠不足，本回合拒絕執行命令';
    // 兵／糧／場上已滿：有出征帳本就直接講缺多少（doc_spec_1341 §5.1）；沒有帳本才退回簡短句
    const sortie = type ? this.ctrl?.getSortieState?.() ?? null : null;
    if (sortie && type && (reason === 'troops-short' || reason === 'field-limit' || reason === 'food-short' || reason === undefined)) {
      const call = deployShortToast(describeDeployShortfall(sortie, { troopType: type }), this.troopName(type));
      if (call) return t(call.key, ...call.args);
    }
    if (reason === 'troops-short') return t('battle.deploy.sheet.title.troops');
    if (reason === 'field-limit') return t('battle.deploy.toast.field');
    return foodShortMessage(this.currentFood);
  }
}
