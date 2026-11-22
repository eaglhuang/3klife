// @spec-source → Issue #2139（奧義漫畫分鏡 cut-in）；PROG-2-2250
/**
 * UltCutinOverlay — 奧義漫畫分鏡 cut-in 的 Cocos 畫面層（cutinCore 的取樣結果 → 節點）。
 *
 * 核心（cutinCore）只回答「現在這一刻畫面該長怎樣」；這裡只負責把取樣結果畫出來：
 *   dim → 黑色暗幕、letterbox → 上下黑邊、imageKey / prev* → 分鏡圖與淡入前一格、
 *   scale / shake → 圖的縮放與震動、flash / burst → 閃白與爆發光、文字 → 底部武將名與奧義名。
 * 疊層是獨立的全螢幕節點，蓋在戰場最上層、攔截點擊（點一下跳到收尾爆發），播完自毀。
 * 時間用真實時鐘，不吃 dt：戰場暫停時 director 的 dt 被壓到幾乎為 0，疊層仍要照常播。
 *
 * Unity 對照：像一個 Timeline Director 掛在全螢幕 Canvas 上，Time.unscaledDeltaTime 驅動。
 */
import { BlockInputEvents, Color, Component, Graphics, Label, Node, Sprite, SpriteFrame, UIOpacity, UITransform, Vec3, _decorator, sys, view } from 'cc';
import { createCutinPlayer, type CutinConfig, type CutinPlayer, type CutinSample, type PlaybackMode, type Rgb } from '../../shared/cutin/cutinCore';
import { PLACEHOLDER_CUTIN_IMAGE_KEY, PLACEHOLDER_CUTIN_TEXT, computeSafeInsets, layoutCutinText } from '../../shared/cutin/cutinSupport';
import { burstGlowLayers, lightenChannel } from '../../shared/cutin/cutinBurstGlow';

const { ccclass } = _decorator;

export const ULT_CUTIN_NODE = 'UltCutinOverlay';

/** 取得靜態分鏡圖；沒有就跳過那一格（hasImage 的依據） */
export type CutinFrameLookup = (imageKey: string) => SpriteFrame | null | undefined;
/** 音效／語音播放：缺檔只記一行 log，不影響畫面 */
export type CutinCuePlayer = (kind: 'sfx' | 'voice', key: string) => void;

export interface UltCutinPlayArgs {
  /** 疊層掛在這個節點的最上層（通常是 Canvas 底下的 HUD 父節點） */
  parent: Node;
  config: CutinConfig;
  frames: CutinFrameLookup;
  mode: PlaybackMode;
  playCue?: CutinCuePlayer;
  /** 播放開始時要求暫停戰場 */
  onPauseRequest?: () => void;
  /** 播放結束（含跳過、被銷毀）時要求恢復戰場 */
  onResumeRequest?: () => void;
  /** 這是暫代圖演出（該武將還沒有專屬分鏡圖）：畫面中央疊招式名大字，下方小字標「暫代圖 待替換」 */
  placeholder?: boolean;
  /** 暫代圖的字級與顏色（PROG-2-9731，來源 data/battle-ui-feedback.json）；不給用內建值 */
  placeholderStyle?: PlaceholderStyle;
}

/** 暫代圖中央大字（招式名）與下方小字（暫代標記）的樣式；字級以畫面高度的比例表示 */
export interface PlaceholderStyle {
  skillFontRatio: number;
  skillColor: readonly [number, number, number, number];
  skillOutlineColor: readonly [number, number, number, number];
  tagFontRatio: number;
  tagColor: readonly [number, number, number, number];
}
const DEFAULT_PLACEHOLDER_STYLE: PlaceholderStyle = {
  skillFontRatio: 0.17, skillColor: [255, 236, 160, 255], skillOutlineColor: [60, 20, 90, 255],
  tagFontRatio: 0.035, tagColor: [214, 200, 240, 255],
};

export type UltCutinOutcome = 'played' | 'skipped' | 'unplayable';

/** 目前是否有 cut-in 在播；戰場的全域點擊（落子、選目標）要先看這個，避免點穿 */
let activeCount = 0;
export function isUltCutinPlaying(): boolean {
  return activeCount > 0;
}

/** 正在播的驅動元件；逾時保底時由 abortAllUltCutins 一次收掉 */
const activeDrivers = new Set<UltCutinDriver>();

/** 強制結束所有正在播的 cut-in（疊層銷毀、戰場恢復、Promise 解決為 'skipped'）；逾時保底與換場用 */
export function abortAllUltCutins(): void {
  for (const driver of Array.from(activeDrivers)) driver.forceFinish();
}

/** 設計用的參考高度（cutinCore 的震動幅度、黑邊以 720p 為準） */
const REFERENCE_HEIGHT = 720;
const NAME_FONT = 0.075;
const SKILL_FONT = 0.052;
const TEXT_MARGIN = 24;

function nowSeconds(): number {
  const perf = (globalThis as { performance?: { now(): number } }).performance;
  return (perf ? perf.now() : Date.now()) / 1000;
}

function toColor(rgb: Rgb, alpha01 = 1): Color {
  return new Color(Math.round(rgb[0] * 255), Math.round(rgb[1] * 255), Math.round(rgb[2] * 255), Math.round(Math.max(0, Math.min(1, alpha01)) * 255));
}

function makeNode(name: string, layer: number, width: number, height: number): Node {
  const node = new Node(name);
  node.layer = layer;
  node.addComponent(UITransform).setContentSize(width, height);
  return node;
}

function makeImage(name: string, layer: number): { node: Node; sprite: Sprite; opacity: UIOpacity } {
  const node = makeNode(name, layer, 100, 100);
  const sprite = node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  const opacity = node.addComponent(UIOpacity);
  opacity.opacity = 0;
  return { node, sprite, opacity };
}

/**
 * 純色節點（暗幕、閃白、黑邊、爆發光）。Graphics 的顏色在 fill() 當下就烘進頂點，
 * 事後改 fillColor 不會變色，所以換色時要清掉重畫；透明度則走 UIOpacity，不重畫。
 */
interface Solid {
  node: Node;
  opacity: UIOpacity;
  /** 換色（同色不重畫） */
  paint(color: Color): void;
}

function makeSolid(name: string, layer: number, width: number, height: number, anchorY: number, shape: 'rect' | 'circle' = 'rect'): Solid {
  const node = makeNode(name, layer, width, height);
  node.getComponent(UITransform)!.setAnchorPoint(0.5, anchorY);
  const g = node.addComponent(Graphics);
  const opacity = node.addComponent(UIOpacity);
  opacity.opacity = 0;
  let key = '';
  const paint = (color: Color): void => {
    const next = `${color.r},${color.g},${color.b}`;
    if (next === key) return;
    key = next;
    g.clear();
    if (shape === 'circle') {
      // 爆光：多層柔光＋衝擊波環（PROG-2-9419），不再是硬邊平塗實心圓
      for (const layer of burstGlowLayers(Math.min(width, height) / 2)) {
        const c = new Color(
          lightenChannel(color.r, layer.lighten),
          lightenChannel(color.g, layer.lighten),
          lightenChannel(color.b, layer.lighten),
          Math.round(layer.alpha * 255),
        );
        g.circle(0, 0, layer.radius);
        if (layer.kind === 'ring') {
          g.lineWidth = layer.lineWidth ?? 1;
          g.strokeColor = c;
          g.stroke();
        } else {
          g.fillColor = c;
          g.fill();
        }
      }
      return;
    }
    g.fillColor = new Color(color.r, color.g, color.b, 255);
    g.rect(-width / 2, -height * anchorY, width, height);
    g.fill();
  };
  paint(new Color(255, 255, 255, 255));
  return { node, opacity, paint };
}

interface OverlayParts {
  root: Node;
  imageCur: { node: Node; sprite: Sprite; opacity: UIOpacity };
  imagePrev: { node: Node; sprite: Sprite; opacity: UIOpacity };
  dim: Solid;
  flash: Solid;
  burst: Solid;
  barTop: Node;
  barBottom: Node;
  textRoot: Node;
  textOpacity: UIOpacity;
  nameLabel: Label;
  skillLabel: Label;
  textStrip: Solid;
  /** 暫代圖警示字樣（非暫代圖演出為 null） */
  placeholder: { node: Node; opacity: UIOpacity } | null;
  viewW: number;
  viewH: number;
  barMax: number;
  textHeight: number;
}

/** 驅動元件：每幀向核心取樣並套到節點；被銷毀（換場、被取代）時一定要結束播放，戰場才能恢復 */
@ccclass('UltCutinDriver')
export class UltCutinDriver extends Component {
  private _player: CutinPlayer | null = null;
  private _parts: OverlayParts | null = null;
  private _frames: CutinFrameLookup = () => null;
  private _playCue: CutinCuePlayer | undefined;
  private _startedAt = 0;
  private _finished = false;
  private _skipped = false;
  private _resolve: ((outcome: UltCutinOutcome) => void) | null = null;
  private _countedActive = false;

  public setup(player: CutinPlayer, parts: OverlayParts, frames: CutinFrameLookup, playCue: CutinCuePlayer | undefined, resolve: (outcome: UltCutinOutcome) => void): void {
    this._player = player;
    this._parts = parts;
    this._frames = frames;
    this._playCue = playCue;
    this._resolve = resolve;
    this._startedAt = nowSeconds();
    activeCount++;
    this._countedActive = true;
    activeDrivers.add(this);
  }

  /** 逾時保底：不等播完，立刻收掉疊層並恢復戰場 */
  public forceFinish(): void {
    this._skipped = true;
    this._finish();
  }

  /** 點一下：跳到收尾爆發（之後仍會接著播完收尾，再回到奧義特效） */
  public requestSkip(): void {
    if (!this._player || this._finished) return;
    this._player.skip(nowSeconds() - this._startedAt);
  }

  protected update(): void {
    if (!this._player || !this._parts || this._finished) return;
    const t = nowSeconds() - this._startedAt;
    const sample = this._player.sample(t);
    this._apply(sample, this._parts);
    for (const cue of sample.cues) this._playCue?.(cue.kind, cue.key);
    if (sample.skipped) this._skipped = true;
    if (sample.ended) this._finish();
  }

  protected onDestroy(): void {
    // 換場或被取代：照樣結束播放並恢復戰場
    this._finish();
  }

  private _finish(): void {
    if (this._finished) return;
    this._finished = true;
    activeDrivers.delete(this);
    this._player?.stop();
    if (this._countedActive) {
      this._countedActive = false;
      activeCount = Math.max(0, activeCount - 1);
    }
    const resolve = this._resolve;
    this._resolve = null;
    if (this.node.isValid) this.node.destroy();
    resolve?.(this._skipped ? 'skipped' : 'played');
  }

  private _applyImage(slot: OverlayParts['imageCur'], key: string | null, alpha: number, scale: number, ox: number, oy: number, p: OverlayParts): void {
    const frame = key ? this._frames(key) ?? null : null;
    if (!frame || alpha <= 0) {
      slot.opacity.opacity = 0;
      return;
    }
    if (slot.sprite.spriteFrame !== frame) {
      slot.sprite.spriteFrame = frame;
      const rect = frame.rect;
      const fw = rect.width > 0 ? rect.width : p.viewW;
      const fh = rect.height > 0 ? rect.height : p.viewH;
      // 滿版（cover）：取較大的縮放，圖片不留邊；超出的部分被裁掉
      const cover = Math.max(p.viewW / fw, p.viewH / fh);
      slot.node.getComponent(UITransform)!.setContentSize(fw * cover, fh * cover);
    }
    slot.node.setScale(scale, scale, 1);
    slot.node.setPosition(ox, oy, 0);
    slot.opacity.opacity = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  }

  private _apply(s: CutinSample, p: OverlayParts): void {
    const shakeScale = p.viewH / REFERENCE_HEIGHT;
    const ox = s.shakeX * shakeScale;
    const oy = s.shakeY * shakeScale;
    // 前一格先畫在下面，當作淡入的底
    this._applyImage(p.imagePrev, s.prevImageKey, s.prevPanelAlpha, s.scale, ox, oy, p);
    this._applyImage(p.imageCur, s.imageKey, s.panelAlpha, s.scale, ox, oy, p);

    p.dim.opacity.opacity = Math.round(Math.max(0, Math.min(1, s.dim)) * 255);

    // 暫代圖警示字樣：跟著分鏡圖淡入淡出，同樣吃震動
    if (p.placeholder) {
      const on = s.imageKey === PLACEHOLDER_CUTIN_IMAGE_KEY;
      p.placeholder.opacity.opacity = on ? Math.round(Math.max(0, Math.min(1, s.panelAlpha)) * 255) : 0;
      p.placeholder.node.setPosition(ox, oy, 0);
    }

    // 爆發光：從中心放大並淡出
    p.burst.paint(toColor(s.burstColor));
    p.burst.opacity.opacity = Math.round(Math.max(0, Math.min(1, s.burstAlpha)) * 255);
    const burstScale = 0.35 + 1.25 * Math.max(0, Math.min(1, s.burstProgress));
    p.burst.node.setScale(burstScale, burstScale, 1);

    p.flash.paint(toColor(s.flashColor));
    p.flash.opacity.opacity = Math.round(Math.max(0, Math.min(1, s.flashAlpha)) * 255);

    // 黑邊：以邊緣為錨點，縮放 Y 即高度變化
    const barScale = Math.max(0, Math.min(1, s.letterbox));
    p.barTop.setScale(1, barScale, 1);
    p.barBottom.setScale(1, barScale, 1);

    p.textOpacity.opacity = Math.round(Math.max(0, Math.min(1, s.textAlpha)) * 255);
    if (s.textAlpha > 0) {
      if (p.nameLabel.string !== s.generalName) p.nameLabel.string = s.generalName;
      if (p.skillLabel.string !== s.skillName) p.skillLabel.string = s.skillName;
      const insets = computeSafeInsets({ width: p.viewW, height: p.viewH }, sys.getSafeAreaRect?.() ?? null);
      const layout = layoutCutinText({
        view: { width: p.viewW, height: p.viewH },
        insets,
        letterboxHeight: barScale * p.barMax,
        textHeight: p.textHeight,
        margin: TEXT_MARGIN,
      });
      p.textRoot.setPosition(layout.centerX, layout.centerY, 0);
      p.textRoot.getComponent(UITransform)!.setContentSize(layout.width, p.textHeight);
    }
  }
}

function buildParts(parent: Node, config: CutinConfig, viewW: number, viewH: number, placeholder: boolean, style: PlaceholderStyle = DEFAULT_PLACEHOLDER_STYLE): OverlayParts {
  const layer = parent.layer;
  const root = makeNode(ULT_CUTIN_NODE, layer, viewW, viewH);
  // 全螢幕攔截：底下的戰場與按鈕收不到這次點擊
  root.addComponent(BlockInputEvents);

  const imagePrev = makeImage(`${ULT_CUTIN_NODE}Prev`, layer);
  const imageCur = makeImage(`${ULT_CUTIN_NODE}Cur`, layer);
  const dim = makeSolid(`${ULT_CUTIN_NODE}Dim`, layer, viewW, viewH, 0.5);
  dim.paint(new Color(0, 0, 0, 255));
  const burstSize = Math.max(viewW, viewH);
  const burst = makeSolid(`${ULT_CUTIN_NODE}Burst`, layer, burstSize, burstSize, 0.5, 'circle');
  const flash = makeSolid(`${ULT_CUTIN_NODE}Flash`, layer, viewW, viewH, 0.5);

  const barMax = (config.letterboxMax ?? 44 / REFERENCE_HEIGHT) * viewH;
  const barTop = makeSolid(`${ULT_CUTIN_NODE}BarTop`, layer, viewW, barMax, 1);
  const barBottom = makeSolid(`${ULT_CUTIN_NODE}BarBottom`, layer, viewW, barMax, 0);
  for (const bar of [barTop, barBottom]) {
    bar.paint(new Color(0, 0, 0, 255));
    bar.opacity.opacity = 255;
    bar.node.setScale(1, 0, 1);
  }
  barTop.node.setPosition(0, viewH / 2, 0);
  barBottom.node.setPosition(0, -viewH / 2, 0);

  const nameSize = Math.round(viewH * NAME_FONT);
  const skillSize = Math.round(viewH * SKILL_FONT);
  const textHeight = Math.round((nameSize + skillSize) * 1.5);
  const textRoot = makeNode(`${ULT_CUTIN_NODE}Text`, layer, viewW, textHeight);
  const textOpacity = textRoot.addComponent(UIOpacity);
  textOpacity.opacity = 0;

  const makeLabel = (name: string, size: number, y: number, color: Color): Label => {
    const node = makeNode(name, layer, viewW, Math.round(size * 1.4));
    const label = node.addComponent(Label);
    label.fontSize = size;
    label.lineHeight = Math.round(size * 1.3);
    label.isBold = true;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.color = color;
    node.setPosition(0, y, 0);
    textRoot.addChild(node);
    return label;
  };
  const nameLabel = makeLabel(`${ULT_CUTIN_NODE}Name`, nameSize, textHeight / 2 - nameSize * 0.7, new Color(255, 240, 200, 255));
  const skillLabel = makeLabel(`${ULT_CUTIN_NODE}Skill`, skillSize, -textHeight / 2 + skillSize * 0.7, new Color(255, 255, 255, 255));
  const textStrip = makeSolid(`${ULT_CUTIN_NODE}Strip`, layer, viewW, textHeight, 0.5);
  textStrip.paint(new Color(0, 0, 0, 255));
  textStrip.opacity.opacity = 120;
  textRoot.insertChild(textStrip.node, 0);

  // 暫代圖警示字樣：畫面中央一行大字，淡入淡出跟著分鏡圖
  let placeholderParts: OverlayParts['placeholder'] = null;
  if (placeholder) {
    // PROG-2-9731：中央改放招式名大字（以前是「暫代圖 待替換」警示，玩家看不出放的是什麼招），
    // 「暫代圖 待替換」降成下方小字標記；暫代清單與 console 警告照舊，補專屬分鏡後整個節點就不會再出現。
    const size = Math.round(viewH * style.skillFontRatio);
    const tagSize = Math.max(12, Math.round(viewH * style.tagFontRatio));
    const node = makeNode(`${ULT_CUTIN_NODE}Placeholder`, layer, viewW, Math.round(size * 1.5 + tagSize * 1.6));
    const skillNode = makeNode(`${ULT_CUTIN_NODE}PlaceholderSkill`, layer, viewW, Math.round(size * 1.5));
    node.addChild(skillNode);
    skillNode.setPosition(0, Math.round(tagSize * 0.8), 0);
    const label = skillNode.addComponent(Label);
    label.string = config.skillName || '奧義';
    label.fontSize = size;
    label.lineHeight = Math.round(size * 1.3);
    label.isBold = true;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.color = new Color(style.skillColor[0], style.skillColor[1], style.skillColor[2], style.skillColor[3]);
    label.enableOutline = true;
    label.outlineColor = new Color(style.skillOutlineColor[0], style.skillOutlineColor[1], style.skillOutlineColor[2], style.skillOutlineColor[3]);
    label.outlineWidth = Math.max(3, Math.round(size * 0.05));
    const tagNode = makeNode(`${ULT_CUTIN_NODE}PlaceholderTag`, layer, viewW, Math.round(tagSize * 1.5));
    node.addChild(tagNode);
    tagNode.setPosition(0, -Math.round(size * 0.65), 0);
    const tag = tagNode.addComponent(Label);
    tag.string = PLACEHOLDER_CUTIN_TEXT;
    tag.fontSize = tagSize;
    tag.lineHeight = Math.round(tagSize * 1.3);
    tag.horizontalAlign = Label.HorizontalAlign.CENTER;
    tag.overflow = Label.Overflow.SHRINK;
    tag.color = new Color(style.tagColor[0], style.tagColor[1], style.tagColor[2], style.tagColor[3]);
    const opacity = node.addComponent(UIOpacity);
    opacity.opacity = 0;
    placeholderParts = { node, opacity };
  }

  // 由下往上：暗幕（蓋在戰場上）→ 前一格 → 目前這格 → 爆發光 → 閃白 → 黑邊 → 文字
  root.addChild(dim.node);
  root.addChild(imagePrev.node);
  root.addChild(imageCur.node);
  if (placeholderParts) root.addChild(placeholderParts.node);
  root.addChild(burst.node);
  root.addChild(flash.node);
  root.addChild(barTop.node);
  root.addChild(barBottom.node);
  root.addChild(textRoot);

  return {
    root, imageCur, imagePrev, dim,
    flash,
    burst,
    barTop: barTop.node, barBottom: barBottom.node,
    textRoot, textOpacity, nameLabel, skillLabel, textStrip,
    placeholder: placeholderParts,
    viewW, viewH, barMax, textHeight,
  };
}

/**
 * 在 parent 最上層播一次 cut-in。回傳的 Promise 在整段播完（含跳過與被銷毀）後解決；
 * 沒有可播的分鏡圖時不建任何節點、直接以 'unplayable' 解決，呼叫端照常接奧義特效。
 */
export function playUltCutin(args: UltCutinPlayArgs): Promise<UltCutinOutcome> {
  if (!args.parent.isValid) return Promise.resolve('unplayable');
  return new Promise<UltCutinOutcome>((resolve) => {
    let player: CutinPlayer;
    try {
      player = createCutinPlayer(args.config, {
        mode: args.mode,
        hasImage: (key) => !!args.frames(key),
        onPauseRequest: args.onPauseRequest,
        onResumeRequest: args.onResumeRequest,
      });
    } catch {
      // 設定檔有誤：當作沒有 cut-in，不擋住奧義
      resolve('unplayable');
      return;
    }
    if (!player.playable) {
      resolve('unplayable');
      return;
    }

    const host = args.parent.getComponent(UITransform);
    const visible = view.getVisibleSize();
    const viewW = host?.width || visible.width || 1920;
    const viewH = host?.height || visible.height || 1080;
    const parts = buildParts(args.parent, args.config, viewW, viewH, !!args.placeholder, args.placeholderStyle);
    args.parent.addChild(parts.root);
    parts.root.setPosition(new Vec3(0, 0, 0));

    const driver = parts.root.addComponent(UltCutinDriver);
    driver.setup(player, parts, args.frames, args.playCue, resolve);
    parts.root.on(Node.EventType.TOUCH_END, () => driver.requestSkip());
    parts.root.on(Node.EventType.MOUSE_UP, () => driver.requestSkip());

    player.start();
  });
}
