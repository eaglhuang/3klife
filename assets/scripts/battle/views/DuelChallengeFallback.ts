/**
 * DuelChallengeFallback — 單挑邀請後備彈窗（純程式建節點，不依賴場景綁定與 ui-spec）
 *
 * 為什麼需要：
 *   BattleScene.duelChallengePanel 在場景檔中是 null，而 DuelChallengePanel 需要 dialog-confirm
 *   template，DuelChallengeComposite 需要 duel-challenge-screen ui-spec；兩者都要先載入資源才能顯示。
 *   若直接略過，玩家會被自動接受單挑、完全沒有選擇權。因此在執行期用程式建一個置中小窗，
 *   讓玩家實際按下「接受」或「拒絕」。
 *
 * 介面與 IDuelChallengeLike 相同：node / show(...) / waitUntilReady(...)，
 * 按鈕結果以 node.emit('duelAccepted' | 'duelRejected') 回傳，與原本兩個元件的事件協定一致。
 */
import { BlockInputEvents, Button, Color, js, Label, Node, tween, UIOpacity, UITransform, Widget } from 'cc';
import type { IDuelChallengeLike } from '../../shared/interfaces/IBattleUIComponents';

/**
 * 替節點鋪純色底。底色元件屬於 ui 模組，battle 模組依邊界規則不可直接引用，
 * 所以用註冊名稱向引擎取類別（戰場 UI 一定已載入它）；萬一取不到就不鋪底，彈窗文字與按鈕仍可用。
 */
function paintSolid(node: Node, color: Color): void {
  const SolidBackgroundClass = js.getClassByName('SolidBackground') as (new () => { color: Color }) | null;
  if (!SolidBackgroundClass) return;
  (node.addComponent(SolidBackgroundClass as never) as unknown as { color: Color }).color = color;
}

const PANEL_W = 560;
const PANEL_H = 300;
const BTN_W = 200;
const BTN_H = 64;
const DEFAULT_HOST_W = 1920;
const DEFAULT_HOST_H = 1080;

/** 彈窗標題（純文字，方便單元測試） */
export function formatDuelChallengeTitle(enemyName: string, playerName: string): string {
  return `敵將 ${enemyName} 向 ${playerName} 發起單挑！`;
}

/** 勝算一行文字；playerScore 為 0~1 的我方勝算，超出範圍夾住，NaN 視為 0 */
export function formatDuelWinRateText(playerScore: number): string {
  const safe = Number.isFinite(playerScore) ? Math.min(1, Math.max(0, playerScore)) : 0;
  return `我方勝算約 ${Math.round(safe * 100)}%`;
}

function createLabelNode(
  parent: Node,
  name: string,
  width: number,
  height: number,
  text: string,
  fontSize: number,
  color: Color,
  x: number,
  y: number,
): Label {
  const node = new Node(name);
  node.layer = parent.layer;
  node.parent = parent;
  node.setPosition(x, y, 0);
  node.addComponent(UITransform).setContentSize(width, height);
  const label = node.addComponent(Label);
  label.string = text;
  label.fontSize = fontSize;
  label.lineHeight = fontSize + 8;
  label.color = color;
  label.horizontalAlign = Label.HorizontalAlign.CENTER;
  label.verticalAlign = Label.VerticalAlign.CENTER;
  label.overflow = Label.Overflow.SHRINK;
  return label;
}

function createButtonNode(
  parent: Node,
  name: string,
  text: string,
  x: number,
  y: number,
  background: Color,
  onClick: () => void,
): void {
  const node = new Node(name);
  node.layer = parent.layer;
  node.parent = parent;
  node.setPosition(x, y, 0);
  node.addComponent(UITransform).setContentSize(BTN_W, BTN_H);
  paintSolid(node, background);
  node.addComponent(Button);
  node.on(Button.EventType.CLICK, onClick);
  createLabelNode(node, 'Label', BTN_W, BTN_H, text, 26, Color.WHITE, 0, 0);
}

function fillParent(node: Node): void {
  const widget = node.getComponent(Widget) ?? node.addComponent(Widget);
  widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
  widget.top = widget.bottom = widget.left = widget.right = 0;
}

export class DuelChallengeFallback implements IDuelChallengeLike {
  public readonly node: Node;
  private readonly _titleLabel: Label;
  private readonly _rateLabel: Label;

  constructor(host: Node) {
    this.node = new Node('DuelChallengeFallback');
    this.node.layer = host.layer;
    this.node.parent = host;

    const hostTf = host.getComponent(UITransform);
    const root = this.node.addComponent(UITransform);
    root.setContentSize(hostTf?.width || DEFAULT_HOST_W, hostTf?.height || DEFAULT_HOST_H);
    fillParent(this.node);
    // 彈窗開啟時擋住底下棋盤與按鈕的點擊
    this.node.addComponent(BlockInputEvents);

    const dim = new Node('Dim');
    dim.layer = this.node.layer;
    dim.parent = this.node;
    dim.addComponent(UITransform);
    paintSolid(dim, new Color(0, 0, 0, 160));
    fillParent(dim);

    const card = new Node('Card');
    card.layer = this.node.layer;
    card.parent = this.node;
    card.addComponent(UITransform).setContentSize(PANEL_W, PANEL_H);
    paintSolid(card, new Color(28, 26, 38, 240));

    this._titleLabel = createLabelNode(card, 'Title', PANEL_W - 40, 48, '', 30, Color.WHITE, 0, PANEL_H / 2 - 50);
    this._rateLabel = createLabelNode(card, 'Rate', PANEL_W - 40, 40, '', 26, new Color(255, 214, 120, 255), 0, 20);
    createLabelNode(
      card, 'Hint', PANEL_W - 40, 40, '接受可一決雌雄，拒絕則全軍攻防減半。', 22,
      new Color(210, 210, 210, 255), 0, -20,
    );
    const btnY = -PANEL_H / 2 + 50;
    createButtonNode(card, 'BtnAccept', '接受', -120, btnY, new Color(46, 125, 50, 255), () => this._decide(true));
    createButtonNode(card, 'BtnReject', '拒絕', 120, btnY, new Color(120, 50, 50, 255), () => this._decide(false));

    this.node.active = false;
  }

  /** 顯示邀請；每次都更新文字並置於最上層，淡入 */
  public show(enemyName: string, playerName: string, playerScore: number): void {
    this._titleLabel.string = formatDuelChallengeTitle(enemyName, playerName);
    this._rateLabel.string = formatDuelWinRateText(playerScore);

    if (this.node.parent) {
      this.node.setSiblingIndex(this.node.parent.children.length - 1);
    }
    this.node.active = true;
    const opacity = this.node.getComponent(UIOpacity) ?? this.node.addComponent(UIOpacity);
    opacity.opacity = 0;
    tween(opacity).to(0.15, { opacity: 255 }).start();
  }

  public hide(): void {
    this.node.active = false;
  }

  /** 純程式建立，建構完成即可用 */
  public waitUntilReady(_timeoutMs?: number): Promise<boolean> {
    return Promise.resolve(true);
  }

  private _decide(accepted: boolean): void {
    // 先隱藏再發事件，避免連點重複觸發
    this.hide();
    this.node.emit(accepted ? 'duelAccepted' : 'duelRejected');
  }
}
