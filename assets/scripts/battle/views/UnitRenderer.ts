
// @spec-source → 見 docs/cross-reference-index.md
import { UCUFLogger, LogCategory } from "../../core/utils/UCUFLogger";
import { perfBegin, perfEnd, perfFrame } from "./BattlePerfProbe";
import { BadgeBatchLayers } from "./BadgeBatchLayers";
import { setCacheModeDeferred } from "../../ui/core/LabelLayoutDeferral";
import { BADGE_ATLAS_SCALE, TroopTypeBadge, loadBadgeAtlasFrames } from "../../ui/shared/TroopTypeBadge";
import { troopTypeGlyph } from "../../shared/TallyCardContract";
import { awaitWithTimeout } from "../../core/utils/AwaitGuard";
import {
  _decorator,
  ImageAsset,
  Camera,
  Canvas,
  Color,
  Component,
  gfx,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Layers,
  DirectionalLight,
  Material,
  Mesh,
  MeshRenderer,
  Node,
  Prefab,
  Sprite,
  SpriteFrame,
  SkinnedMeshRenderer,
  Texture2D,
  primitives,
  instantiate,
  isValid,
  assetManager,
  tween,
  Tween,
  UIOpacity,
  UITransform,
  Size,
  utils,
  Vec3,
  VerticalTextAlignment,
  resources,
  Rect,
  JsonAsset,
} from "cc";
import { BattleTactic, EVENT_NAMES, Faction, GAME_CONFIG, TroopType } from "../../core/config/Constants";
import { GeneralUnit } from "../../core/models/GeneralUnit";
import { TroopUnit } from "../../core/models/TroopUnit";
import { BattleState } from "../models/BattleState";
import { isUnitVisibleToPlayer } from "../shared/BattleVision";
import { BoardRenderer } from "./BoardRenderer";
import { ArrowShotView } from "./ArrowShotView";
import { SlashShotView } from "./SlashShotView";
import { AttackVfxPlayer } from "./AttackVfxPlayer";
import { attackVfxFor } from "../shared/AttackVfxMapping";
import { attackStyleFor } from "../shared/AttackStyle";
import { createMoveSfxThrottleState, moveBeatFor, tryAcquireMoveSfx } from "../shared/MoveFeedback";
import { DEPLOY_LANDING_PUFFS, deployLandingDust, deployLandingThud } from "../shared/DeployLanding";
import { playBattleAudio, playBattleFootstep } from "../shared/BattleAudio";
import { MoveDustEmitter } from "./MoveDustEmitter";
import { SpineUnitOverlay } from "./SpineGeneralOverlay";
import { GeneralPortraitStandee, STANDEE_HEIGHT_PX, needsStandeeFallback } from "./GeneralPortraitStandee";
import { generalSpineConfig, resolveRidingTier, squadMemberCount, troopSpineConfigWithFallback } from '../shared/UnitPresentationConfig';
import { DuelExchange } from '../shared/DuelPresentationCore';
import { BATTLE_VISUAL_TIMING, buildHitShakeSteps, hitScaleNeighborDepth, planHitFeedback, planMoveSegment } from "./BattlePresentationTiming";
import { BuffGainEffectPool } from "./effects/BuffGainEffectPool";
import { statBonusTone, statWithBonusText, type StatBonusTone } from "../shared/StatBonusText";
import {
  ATTACK_SURGE_GOLD,
  ATTACK_SURGE_RED,
  DEFAULT_ATTACK_SURGE_CONFIG,
  attackSurgeTier,
  parseAttackSurgeConfig,
  type AttackSurgeConfig,
  type AttackSurgeTier,
} from "../shared/AttackSurgeHighlight";
import { hpChipOnChange, stepHpChip, unitHpBarState, type HpChipState, type UnitHpBarState } from "../shared/UnitHpBar";
import { unitValueFloatType } from "../shared/DamageFloatType";
import { UnitStatusIconBar, StatusHaloPool, STATUS_ICON_SIZE } from "./UnitStatusIconBar";
import { UnitFeedbackGlowPool } from "./UnitFeedbackGlow";
import { NameplateCombatFade, getBattleUiFeedback } from "../shared/BattleUiFeedback";
import { TileBuffMarkers } from "./TileBuffMarkers";
import { UnitBuffPickupVfx } from "./UnitBuffPickupVfx";
import type { TileBuffBadge } from "../shared/TileBuffBadge";
import { BADGE_HIT_PRIORITY_SEC, badgeRectFromExtent, easePlateOffset, stackBadgeOffsets, unionExtent, type LabelRect, type LocalExtent, type StackBadgeEntry } from "../shared/GeneralPlateAvoidance";
import { buildUnitStatusContext, computeUnitStatusIcons, gainedTones, newlyGainedKinds, type StatusIconKind } from "../shared/UnitStatusIcons";
import { services } from "../../core/managers/ServiceLoader";
import { FLOAT_MISS_TEXT, FloatTextType } from "../../core/systems/FloatTextStyle";
import { vitalityRingView, type VitalityRingView } from "../../core/systems/VitalityBarView";
import { GeneralVitalityStrip } from "./GeneralVitalityStrip";
import {
  DEFAULT_ENEMY_HERO_ASSET_ID,
  DEFAULT_PLAYER_HERO_ASSET_ID,
  HERO_UNIT_ASSET_CATALOG,
  HeroUnitAssetEntry,
  TROOP_UNIT_ASSET_CATALOG,
  TroopUnitAssetEntry,
  SubFaction,
  GENERAL_SUBFACTION_MAP,
  getTroopSubFactionPrefabPath,
} from "../../core/config/UnitAssetCatalog";

const { ccclass, property } = _decorator;
interface UnitView {
  worldNode: Node;   // 世界空間根節點，負責移動 tween（Unity: Root Transform）
  visualNode: Node;  // 本地空間效果層，負責 bump / recoil / charge（Unity: Visual Child Transform）
  bodyNode: Node;
  ringNode?: Node;
  raftNode: Node;
  accentNode: Node;
  formationRoot: Node;
  labelNode: Node;
  attackLabel: Label;
  typeLabel: Label;
  hpLabel: Label;
  labelOpacity: UIOpacity;
  bottomNameLabel: Label | null;
  /** 頭頂血條（主戰場UI規格書 §3.1，PROG-2-1874） */
  hpBar: Graphics;
  /** 上一次畫的血條狀態與掉血殘影（PROG-2-9412）；殘影由每幀 update 推進。 */
  hpState?: UnitHpBarState;
  hpChip?: HpChipState | null;
  /** 頭頂狀態小圖示列（buff／debuff，PROG-2-9399） */
  statusBar: UnitStatusIconBar;
  /** 上一次盤點的狀態種類；null 代表還沒畫過（出陣時不彈出） */
  statusKinds: StatusIconKind[] | null;
  /** 外部（如踩到地形 buff 格）要求下一次刷新時補播彈出＋光環：'buff' | 'debuff' */
  pendingStatusPulse: 'buff' | 'debuff' | null;
  /** 攻擊 ≥ 紅色門檻時，攻擊數字後方的脈動光環（PROG-2-9422）；第一次需要時才建立，之後重用 */
  surgeGlow?: Node;
  troopType: TroopType;
  usingTroopFormation: boolean;
  usingGeneralPawn?: boolean;
  formationLoad?: Promise<void>;
  formationLoading?: boolean;
}

interface UnitShapeProfile {
  bodyScale: Vec3;
  accentScale: Vec3;
  accentOffset: Vec3;
  accentRotation: Vec3;
}

interface GeneralView {
  worldNode: Node;
  bodyNode: Node;
  modelRoot: Node;
  labelNode: Node;
  attackLabel: Label;
  typeLabel: Label;
  hpLabel: Label;
  labelOpacity: UIOpacity;
  /** 名牌左側精力能量環（PROG-2-1853） */
  vitalityRing: Graphics;
  vitalityText: Label;
  /** 名牌血量列下方精力細條（PROG-2-9432） */
  vitalityStrip: GeneralVitalityStrip;
  faction: Faction;
  usingHeroModel: boolean;
  heroLoading: boolean;
}

interface BadgeView {
  rootNode: Node;
  attackLabel: Label;
  typeLabel: Label;
  hpLabel: Label;
  opacity: UIOpacity;
  bottomNameLabel: Label | null;  // 下排兵種名稱（將軍無用）
}

/** 掠奪飄字每行間隔（秒） */
const LOOT_TEXT_STAGGER_SEC = 0.5;
/** PROG-2-9715：主將出陣從待命點衝到出陣格的秒數（約一格半距離，比小兵前進稍快，表現「衝出去」） */
const GENERAL_DASH_SEC = 0.55;
/** 主將素材載入最多等幾秒才起跑；超過就直接站格，不讓主將卡在待命點 */
const GENERAL_DASH_WAIT_SEC = 3;
/** 單挑場邊位置離最外側那路的距離（以路寬計，PROG-2-9719）。 */
const DUEL_SIDELINE_LANES = 1.1;

/** 頭頂血條尺寸（名牌座標，名牌本身縮 0.7；PROG-2-1874） */
const HP_BAR_WIDTH = 150;
/** 頭頂狀態小圖示列：排在血條正上方，從名牌底板（寬 180）左緣開始，3 格不超出名牌寬度、不擠到隔壁路 */
const STATUS_ICON_START_X = -90;
/** 圖示列中心 y：名牌半高 39 + 血條（間距 4、高 8）+ 間距 4 + 圖示半高（PROG-2-9436：48/2） */
const STATUS_ICON_Y = 39 + 4 + 8 + 4 + STATUS_ICON_SIZE / 2;
const HP_BAR_HEIGHT = 8;
/** 掉血殘影色：暖白偏金，在藍、紅血條上都看得清楚（PROG-2-9412）。 */
const HP_BAR_CHIP_COLOR = new Color(255, 232, 190, 235);
const HP_BAR_COLOR = {
  player: new Color(70, 150, 255, 255),
  enemy: new Color(230, 70, 60, 255),
} as const;

/**
 * 頭頂名牌徽章風格（PROG-2-9705，對齊格子 buff 徽章）：深色底＋金圈、兵種放金圈圓章、字一律黑描邊。
 * 顏色取自 TileBuffMarkers 的金圈與描邊色，兩邊看起來是同一套 UI。
 */
const BADGE_FILL = new Color(22, 15, 9, 215);
const BADGE_RING = new Color(255, 214, 90, 255);
const BADGE_RING_INNER = new Color(255, 225, 110, 90);
const BADGE_TEXT_OUTLINE = new Color(30, 18, 8, 255);
const BADGE_TEXT_OUTLINE_WIDTH = 3;
const BADGE_TYPE_DISC_FILL = new Color(42, 28, 16, 255);

/** 名牌旁精力能量環半徑（PROG-2-1853） */
const VITALITY_RING_RADIUS = 24;
/** 武將名牌徽章尺寸（createGeneralView 的 buildBadge 參數；避讓計算共用） */
const GENERAL_PLATE_WIDTH = 186;
const GENERAL_PLATE_HEIGHT = 40;

/**
 * 主將名牌＋精力環在 Overlay 上的安全座標區間（以 1920x1080 中心為基準等比例換算），
 * 避開左側虎符列與右上軍師／控制鈕區域（Issue #2159）。
 */
export function clampGeneralOverlayPosition(
  x: number,
  y: number,
  canvasWidth = 1920,
  canvasHeight = 1080,
): { x: number; y: number } {
  const safeW = canvasWidth > 0 ? canvasWidth : 1920;
  const safeH = canvasHeight > 0 ? canvasHeight : 1080;
  const scaleX = safeW / 1920;
  const scaleY = safeH / 1080;
  const halfW = safeW / 2;
  const halfH = safeH / 2;
  const minX = -(halfW - 390 * scaleX);
  const maxX = halfW - 430 * scaleX;
  const minY = -(halfH - 320 * scaleY);
  const maxY = halfH - 230 * scaleY;
  return {
    x: minX <= maxX ? Math.min(maxX, Math.max(minX, x)) : 0,
    y: minY <= maxY ? Math.min(maxY, Math.max(minY, y)) : 0,
  };
}

@ccclass("UnitRenderer")
export class UnitRenderer extends Component {
  @property({ tooltip: "cube 單位高度" })
  public unitHeight = 0.72;

  @property({ tooltip: "cube 單位寬度" })
  public unitScale = 0.56;

  @property({ tooltip: "頭頂資訊距離單位的高度" })
  public labelHeight = 0.55;

  @property({ tooltip: "主將 cube 相對小兵尺寸倍率" })
  public generalScaleMultiplier = 1.5;

  private boardRenderer: BoardRenderer | null = null;
  private worldCamera: Camera | null = null;
  private canvasNode: Node | null = null;
  private worldRoot: Node | null = null;
  private uiRoot: Node | null = null;
  /** 部隊徽章分層合批（PROG-2-9713） */
  private badgeLayers: BadgeBatchLayers | null = null;
  private cubeMesh: Mesh | null = null;
  private discMesh: Mesh | null = null;  // 圓形陰影 mesh，對照 Unity: blob shadow disc
  private ringMesh: Mesh | null = null;  // Faction Ring mesh
  private raftMaterial: Material | null = null;
  private atkLossPool: BuffGainEffectPool | null = null;
  private hpLossPool:  BuffGainEffectPool | null = null;
  private readonly unitViews = new Map<string, UnitView>();
  private readonly movingUnits = new Set<string>();
  /**
   * PROG-2-9715：主將出陣衝刺。上場那一刻 Spine 從己方底線外的待命點跑到出陣格，之後跟小兵一樣站格、逐格走。
   * key＝格上主將單位 id；from＝待命點腳點，t＝已跑秒數。Unity 對照：一次性的 DOTween 位移，跑完即刪。
   */
  private readonly generalDashes = new Map<string, { from: { x: number; y: number }; t: number; wait: number }>();
  private readonly dyingUnits = new Set<string>();
  private readonly uiProjectionBuffer = new Vec3();
  private readonly screenProjectionBuffer = new Vec3();
  // lateUpdate 每幀重用的 Vec3 暫存，避免動態分配（對照 Unity: 快取 Vector3 工具變數）
  private readonly labelWorldPosBuf = new Vec3();
  private readonly generalViews = new Map<Faction, GeneralView>();
  /** 部隊資訊框避開武將名牌的目前 Y 位移（PROG-2-9434），每幀平滑逼近目標 */
  private readonly plateAvoidOffsets = new Map<string, number>();
  private readonly plateRectsBuf: LabelRect[] = [];
  /** 部隊框錯開（PROG-2-9440）：每幀重用的輸入陣列、各單位最後受擊時間（戰場時鐘） */
  private readonly badgeEntriesBuf: StackBadgeEntry[] = [];
  private readonly lastHitAt = new Map<string, number>();
  private badgeClock = 0;
  private unsubVitality: (() => void) | null = null;
  /** 腳下光環節點池（PROG-2-9399），第一次需要時才建立 */
  private statusHalos: StatusHaloPool | null = null;
  /** 毒箭上身與治療用的色光節點池（PROG-2-9731），第一次需要時才建立 */
  private feedbackGlows: UnitFeedbackGlowPool | null = null;
  /** 名牌戰鬥淡出（PROG-2-9731）：攻擊、受擊演出期間淡出，結束後淡回 */
  private readonly plateFade = new NameplateCombatFade();
  private readonly healHolds = new Map<string, number>();
  private plateFadeApplied = false;
  /** 高倍率攻擊提示門檻（PROG-2-9422）；載入 data/attack-surge-highlight 前先用預設 */
  private attackSurgeConfig: AttackSurgeConfig = { ...DEFAULT_ATTACK_SURGE_CONFIG };
  private readonly attackSurgeGoldColor = new Color(ATTACK_SURGE_GOLD.r, ATTACK_SURGE_GOLD.g, ATTACK_SURGE_GOLD.b, ATTACK_SURGE_GOLD.a);
  private readonly attackSurgeRedColor = new Color(ATTACK_SURGE_RED.r, ATTACK_SURGE_RED.g, ATTACK_SURGE_RED.b, ATTACK_SURGE_RED.a);
  private readonly arrowShots = new ArrowShotView(() => this.uiRoot, () => this.canvasNode?.layer ?? Layers.Enum.UI_2D);
  private readonly slashShots = new SlashShotView(() => this.uiRoot, () => this.canvasNode?.layer ?? Layers.Enum.UI_2D);
  /** 攻擊特效試作（零貼圖單一 Graphics，JSON 驅動；?atkVfx=old 可退回舊特效） */
  private readonly attackVfx = new AttackVfxPlayer(() => this.uiRoot, () => this.canvasNode?.layer ?? Layers.Enum.UI_2D);
  /** PROG-2-9407：落腳揚塵粒子，畫在 2D 疊層、單位後面（粒子池有上限，見 MoveDustEmitter） */
  private readonly moveSfxThrottle = createMoveSfxThrottleState();
  private readonly moveDust = new MoveDustEmitter(() => this.uiRoot, () => this.canvasNode?.layer ?? Layers.Enum.UI_2D);
  private readonly spineUnits = new SpineUnitOverlay(() => this.uiRoot, () => this.canvasNode?.layer ?? Layers.Enum.UI_2D,
    (id, x, y, facing, isLeader) => this.emitFootfallDust(id, x, y, facing, isLeader),
    (id, x, y, isLeader) => this.emitDeployLanding(id, x, y, isLeader));
  /** 沒有 Spine 的主將改用立繪站牌，不退回藍色通用棋子（issue #2238） */
  private readonly generalStandees = new GeneralPortraitStandee(() => this.uiRoot, () => this.canvasNode?.layer ?? Layers.Enum.UI_2D);
  /** 棋盤 buff 格標記（PROG-2-9411）：與頭頂狀態圖示同款，節點重用 */
  private readonly tileBuffMarkers = new TileBuffMarkers(
    () => this.uiRoot,
    (cell, node) => {
      const pos = this.boardRenderer?.getCellWorldPosition(cell.lane, cell.depth, 0);
      if (pos) this.projectWorldPoint(pos, node);
    },
  );
  /** 部隊吃到 buff 當下腳下的 2.5 秒大特效（PROG-2-9734） */
  private readonly unitBuffPickupVfx = new UnitBuffPickupVfx(
    () => this.uiRoot,
    () => this.tileBuffMarkers.groundNode(),
    () => this.canvasNode?.layer ?? Layers.Enum.UI_2D,
  );
  private readonly tileBuffFlyFrom = new Vec3();
  private readonly tileBuffFlyTo = new Vec3();
  private readonly troopPrefabLoads = new Map<string, Promise<Prefab | null>>();
  private readonly heroPrefabLoads = new Map<string, Promise<Prefab | null>>();
  // MatCap 貼圖快取（所有英雄共用同一張，載入一次後復用）
  private heroMatcapTex: Texture2D | null = null;
  private matcapLoadPromise: Promise<Texture2D | null> | null = null;
  private latestState: BattleState | null = null;

  onLoad(): void {
    this.cubeMesh = utils.MeshUtils.createMesh(primitives.box());
    // 建立圓形碟狀 mesh，用於地面陰影（far smaller than box）
    this.discMesh = utils.MeshUtils.createMesh(primitives.cylinder(0.5, 0.5, 0.01, { radialSegments: 20 }));
    // 建立六邊形環當作外發光
    this.ringMesh = utils.MeshUtils.createMesh(primitives.torus(0.40, 0.03, { radialSegments: 8, tubularSegments: 6 }));
    this.node.layer = Layers.Enum.DEFAULT;
    this.ensureRoots();
    // 格子 buff 標記在最底、揚塵在其上，兩者都壓在小兵底下（PROG-2-9708）
    this.spineUnits.setGroundNodes(() => [this.tileBuffMarkers.groundNode(), this.moveDust.groundNode()]);
    this.ensureSceneKeyLight();
    // 精力一變就即時刷新名牌能量環與細條（放招、回復、地形），不等整盤重繪（PROG-2-9432）
    this.unsubVitality = services().event.on(EVENT_NAMES.GeneralVitalityChanged, (d) => {
      const e = d as { faction: Faction; vitality: number; maxVitality: number };
      const view = this.generalViews.get(e.faction);
      if (!view) return;
      this.drawVitalityRing(view, vitalityRingView(e.vitality, e.maxVitality));
      view.vitalityStrip.set(e.vitality, e.maxVitality);
    });
  }

  /** QA 用：讀取某方武將名牌精力細條的繪製狀態 */
  public debugVitalityStrip(faction: Faction) {
    return this.generalViews.get(faction)?.vitalityStrip.debugState() ?? null;
  }

  public initialize(boardRenderer: BoardRenderer | null, worldCamera: Camera | null, canvasNode: Node | null): void {
    this.loadInnateRidingTiers();
    this.boardRenderer = boardRenderer;
    this.worldCamera = worldCamera;
    this.canvasNode = canvasNode;
    this.ensureRoots();
    this.ensureSceneKeyLight();
    // FloatTextSystem 共用 3D→UI 座標轉換逻輯，需在 ensureRoots() 後設定
    if (this.uiRoot && this.worldCamera && this.canvasNode) {
      services().floatText.setup(this.uiRoot, this.worldCamera, this.canvasNode);
      // 跳字避開棋盤 buff 格的圖示與倍數（PROG-2-9415）
      services().floatText.setAvoidProvider(() => this.tileBuffMarkers.avoidRectsForFloatText());
    }
    // fire-and-forget: 特效 Pool 初始化是非同步（需載入資源），不阻塞主流程
    void this.setupAllEffectPools();
    void this.loadAttackSurgeConfig();
  }

  public renderState(state: BattleState): void {
    this.ensureRoots();
    this.latestState = state;

    const activeIds = new Set<string>();
    state.units.forEach(unit => {
      if (unit.currentHp <= 0) return;
      activeIds.add(unit.id);

      let view = this.unitViews.get(unit.id);
      if (!view) {
        view = this.createUnitView(unit);
        this.unitViews.set(unit.id, view);
      }

      this.updateUnitView(view, unit);
    });

    this.unitViews.forEach((view, unitId) => {
      if (!activeIds.has(unitId) && !this.dyingUnits.has(unitId)) {
        if (view.surgeGlow) this.stopAttackSurgeGlow(view.surgeGlow);
        view.worldNode.destroy();
        view.labelNode.destroy();
        this.spineUnits.remove(unitId);
        this.generalStandees.remove(unitId);
        this.unitViews.delete(unitId);
        this.generalDashes.delete(unitId);
      }
    });

    this.updateGeneralViews(state);
    this.syncTileBuffViews(state);
  }

  private getBattleSurfaceLift(): number {
    return this.latestState?.battleTactic === BattleTactic.FloodAttack ? 0.16 : 0;
  }

  private shouldShowFloodRaft(unit: TroopUnit): boolean {
    return this.latestState?.battleTactic === BattleTactic.FloodAttack && unit.faction === Faction.Player;
  }

  private updateFloodRaft(view: UnitView, unit: TroopUnit): void {
    const raftNode = view.raftNode;
    const showRaft = this.shouldShowFloodRaft(unit);
    raftNode.active = showRaft;
    if (!showRaft) {
      return;
    }

    const profile = this.getShapeProfile(unit.type);
    const worldScale = view.worldNode.scale;
    const scaleX = Math.max(0.0001, worldScale.x);
    const scaleY = Math.max(0.0001, worldScale.y);
    const scaleZ = Math.max(0.0001, worldScale.z);

    const raftWorldWidth = this.unitScale * Math.max(1.12, profile.bodyScale.x * 1.22);
    const raftWorldDepth = this.unitScale * Math.max(0.88, Math.min(profile.bodyScale.z, 1.15) * 1.08);
    const raftWorldThickness = 0.042;
    const raftWorldYOffset = -(this.unitHeight * 0.65);

    raftNode.setPosition(0, raftWorldYOffset / scaleY, 0);
    raftNode.setScale(
      raftWorldWidth / scaleX,
      raftWorldThickness / scaleY,
      raftWorldDepth / scaleZ,
    );
  }

  private getUnitWorldPosition(lane: number, depth: number, yOffset?: number): Vec3 | null {
    if (!this.boardRenderer) {
      return null;
    }

    const resolvedYOffset = (yOffset ?? this.unitHeight * 0.5) + this.getBattleSurfaceLift();
    return this.boardRenderer.getCellWorldPosition(lane, depth, resolvedYOffset);
  }

  public async playDeploy(unit: TroopUnit | null): Promise<void> {
    if (!unit) return;

    let view = this.unitViews.get(unit.id);
    if (!view) {
      view = this.createUnitView(unit);
      this.unitViews.set(unit.id, view);
    }

    // 建構、refresh 與部署演出共用同一個載入任務，完成即換模型，不等下回合。
    await this.ensureTroopFormation(view, unit);
    if (!view.worldNode.isValid) return;

    // 以正確狀態（formation 已就緒）更新視圖，取得最終尺寸與面向
    this.updateUnitView(view, unit);

    // PROG-2-9409：Spine 小隊由疊層演從上方落下（spineUnits.deploy）。3D 節點只縮放登場、不再從地下升起，
    // 否則名牌與 Spine 腳點會跟著往上滑，和下落方向相反；沒有 Spine 的單位照舊靠 3D 縮放登場。
    // PROG-2-9715：主將不從天上落下，改由 lateUpdate 從待命點衝到出陣格
    if (!this.isGeneralAvatarUnit(unit)) this.spineUnits.deploy(unit.id);
    const targetScale = view.worldNode.scale.clone();
    view.worldNode.setScale(new Vec3(targetScale.x * 0.01, targetScale.y * 0.01, targetScale.z * 0.01));
    this.updateFloodRaft(view, unit);

    tween(view.worldNode)
      .to(BATTLE_VISUAL_TIMING.deployAppearSec, { scale: targetScale })
      .start();
  }

  public animateMove(unit: TroopUnit | null, fromLane: number, fromDepth: number, forcedMoveReason?: string): void {
    if (!unit) return;

    let view = this.unitViews.get(unit.id);
    if (!view) {
      view = this.createUnitView(unit);
      this.unitViews.set(unit.id, view);
    }

    // 必須在 updateUnitView 之前記下：還在移動中代表同一瞬間剛收到前一格事件（或上一段 tween 未結束），
    // 這時節點的畫面位置才是正確起點；事件的 from 格只是最後一步的起點，會造成瞬移。
    const wasMoving = this.movingUnits.has(unit.id);
    const livePos = wasMoving ? view.worldNode.worldPosition.clone() : null;

    this.updateUnitView(view, unit);
    const eventFromPos = this.getUnitWorldPosition(fromLane, fromDepth);
    const toPos = this.getUnitWorldPosition(unit.lane, unit.depth);
    if (!eventFromPos || !toPos) return;
    const plan = planMoveSegment(eventFromPos, toPos, livePos, wasMoving);
    const fromPos = wasMoving && livePos ? livePos : eventFromPos;

    // 停止該節點上一切進行中的 tween，避免多回合快速推進時舊 tween 的 .call() 把單位定位到前一回合的目標格
    Tween.stopAllByTarget(view.worldNode);
    this.movingUnits.add(unit.id);
    view.worldNode.setWorldPosition(fromPos);
    const isRiverCurrentMove = typeof forcedMoveReason === 'string' && forcedMoveReason.startsWith('river-current');
    if (isRiverCurrentMove) {
      this.playRiverCurrentMoveTween(view, unit, fromPos, toPos);
      return;
    }
    // 揚塵改由步態落腳時發（SpineUnitOverlay 的落腳通知 → emitFootfallDust），強制位移走路也一樣會出塵
    tween(view.worldNode)
      .to(plan.durationSec, { worldPosition: toPos })
      .call(() => {
        this.movingUnits.delete(unit.id);
        view?.worldNode.setWorldPosition(toPos);
      })
      .start();
  }

  /**
   * PROG-2-9407：小兵每次落腳（walk 步態每 0.4 動畫秒一次）同時出腳步聲與揚塵，兩者共用 moveBeatFor 的同一個拍點。
   * 只改表現，不影響位移。兵種與腳下地形決定塵量；河流格、水軍不出塵。聲音只由帶頭者出，避免小隊三倍音量。
   */
  private emitFootfallDust(id: string, x: number, y: number, facing: 1 | -1, isLeader: boolean): void {
    const unit = this.latestState?.units.get(id);
    if (!unit) return;
    const beat = moveBeatFor(unit.type, this.latestState?.getCell(unit.lane, unit.depth)?.terrain);
    if (beat.dust.kind !== 'none') this.moveDust.emit(x, y, facing, beat.dust, isLeader);
    if (!isLeader) return;
    const { footstep } = beat;
    for (let i = 0; i < footstep.beats; i++) {
      // PROG-2-9729：分兵種變調 clip、隨機音量與延遲、總量上限都在 playBattleFootstep 內處理
      const play = (): void => { if (this.canPlayDeferredMoveSfx()) playBattleFootstep(unit.type, footstep.cue, footstep.volume); };
      if (i === 0) play(); else setTimeout(play, i * footstep.intervalMs);
    }
  }

  /**
   * PROG-2-9409：部署落地瞬間一圈塵團往兩側吹開（粒子比走路大），帶頭者出落地聲。河流格、水軍不出塵，規則同走路。
   */
  private emitDeployLanding(id: string, x: number, y: number, isLeader: boolean): void {
    const unit = this.latestState?.units.get(id);
    if (!unit) return;
    const beat = moveBeatFor(unit.type, this.latestState?.getCell(unit.lane, unit.depth)?.terrain);
    const dust = deployLandingDust(beat.dust);
    if (dust.kind !== 'none') for (const puff of DEPLOY_LANDING_PUFFS) this.moveDust.emit(x + puff.dx, y, puff.driftFacing, dust, isLeader);
    if (!isLeader) return;
    const thud = deployLandingThud(beat.footstep, unit.type);
    for (let i = 0; i < thud.beats; i++) {
      const play = (): void => { if (this.canPlayDeferredMoveSfx() && tryAcquireMoveSfx(this.moveSfxThrottle, Date.now())) playBattleAudio(thud.cue, thud.volume); };
      if (i === 0) play(); else setTimeout(play, i * thud.intervalMs);
    }
  }

  /**
   * 腳步／落地聲的後續拍用 setTimeout 延後播放；離開戰場後元件已銷毀、欄位被引擎清成 null，延後的拍要直接略過（避免 windowStartMs of null）。
   */
  private canPlayDeferredMoveSfx(): boolean {
    return this.isValid && Boolean(this.moveSfxThrottle);
  }

  public playSwapAdvanceAnimation(
    unit: TroopUnit | null,
    swapWithUnitId: string,
    fromLane: number,
    fromDepth: number,
    duration: number,
    swapPassengerFromLane?: number,
    swapPassengerFromDepth?: number,
    swapPassengerToLane?: number,
    swapPassengerToDepth?: number,
  ): void {
    if (!unit) return;

    let moverView = this.unitViews.get(unit.id);
    if (!moverView) {
      moverView = this.createUnitView(unit);
      this.unitViews.set(unit.id, moverView);
      this.updateUnitView(moverView, unit);
    }

    const passengerView = this.unitViews.get(swapWithUnitId);
    // 同一回合先走了幾格再換位時，節點還在上一段 tween 上；從目前畫面位置起算，避免瞬移
    const moverLive = this.movingUnits.has(unit.id) ? moverView.worldNode.worldPosition.clone() : null;
    const passengerLive = passengerView && this.movingUnits.has(swapWithUnitId) ? passengerView.worldNode.worldPosition.clone() : null;
    const moverFrom = moverLive ?? this.getUnitWorldPosition(fromLane, fromDepth);
    const moverTo = this.getUnitWorldPosition(unit.lane, unit.depth);
    const passengerUnit = this.findUnitById(swapWithUnitId);
    const passengerTo = (swapPassengerToLane !== undefined && swapPassengerToDepth !== undefined)
      ? this.getUnitWorldPosition(swapPassengerToLane, swapPassengerToDepth)
      : (passengerUnit ? this.getUnitWorldPosition(passengerUnit.lane, passengerUnit.depth) : null);
    const passengerFrom = passengerLive ?? ((swapPassengerFromLane !== undefined && swapPassengerFromDepth !== undefined)
      ? this.getUnitWorldPosition(swapPassengerFromLane, swapPassengerFromDepth)
      : (passengerView ? passengerView.worldNode.worldPosition.clone() : null));

    if (!moverFrom || !moverTo) return;

    Tween.stopAllByTarget(moverView.worldNode);
    this.movingUnits.add(unit.id);
    moverView.worldNode.setWorldPosition(moverFrom);

    const liftOffset = Math.max(0.28, this.unitHeight * 0.75);
    const midPos = moverFrom.clone().lerp(moverTo, 0.52);
    midPos.y += liftOffset;
    const moveDuration = Math.max(BATTLE_VISUAL_TIMING.swapAdvanceMinSec, duration);

    tween(moverView.worldNode)
      .to(moveDuration * 0.48, { worldPosition: midPos }, { easing: "sineOut" })
      .to(moveDuration * 0.52, { worldPosition: moverTo }, { easing: "quadInOut" })
      .call(() => {
        this.movingUnits.delete(unit.id);
        moverView?.worldNode.setWorldPosition(moverTo);
      })
      .start();

    if (passengerView && passengerFrom && passengerTo) {
      Tween.stopAllByTarget(passengerView.worldNode);
      this.movingUnits.add(swapWithUnitId);
      passengerView.worldNode.setWorldPosition(passengerFrom);
      const passengerMid = passengerFrom.clone().lerp(passengerTo, 0.48);
      passengerMid.y += liftOffset * 0.55;

      tween(passengerView.worldNode)
        .to(moveDuration * 0.46, { worldPosition: passengerMid }, { easing: "sineOut" })
        .to(moveDuration * 0.54, { worldPosition: passengerTo }, { easing: "quadInOut" })
        .call(() => {
          this.movingUnits.delete(swapWithUnitId);
          passengerView?.worldNode.setWorldPosition(passengerTo);
        })
        .start();
    }
  }

  public playDeath(unitId: string): void {
    const view = this.unitViews.get(unitId);
    if (!view) return;

    this.dyingUnits.add(unitId);
    if (this.spineUnits.play(unitId, 'fall')) this.scheduleOnce(() => this.spineUnits.remove(unitId), 1.8);

    // 死亡消融特效 (Tier 2 Instancing Dissolve)
    const dissolveObj = { val: 0 };
    tween(dissolveObj)
      .to(BATTLE_VISUAL_TIMING.deathDissolveSec, { val: 1.0 }, {
        onUpdate: (target: any) => {
          services().material.setDissolve(`${unitId}_body`, "unit-base", target.val);
          services().material.setDissolve(`${unitId}_accent`, "unit-base", target.val);
        }
      })
      .call(() => {
        services().material.releaseUnit(`${unitId}_body`);
        services().material.releaseUnit(`${unitId}_accent`);
        if (view.surgeGlow) this.stopAttackSurgeGlow(view.surgeGlow);
        view.worldNode.destroy();
        view.labelNode.destroy();
        this.unitViews.delete(unitId);
        this.generalDashes.delete(unitId);
        this.dyingUnits.delete(unitId);
      })
      .start();

    // UI 血條/文字退隱保持原樣
    tween(view.labelOpacity)
      .to(BATTLE_VISUAL_TIMING.deathLabelFadeSec, { opacity: 0 })
      .start();
  }

  public markDyingUnit(unitId: string): void {
    this.dyingUnits.add(unitId);
  }

  public async playDeathAsync(unitId: string): Promise<void> {
    this.playDeath(unitId);
    await this.waitSeconds(BATTLE_VISUAL_TIMING.deathAwaitSec);
  }

  public playAttackAnimation(attackerId: string, defenderLane: number, defenderDepth: number): void {
    const attackerUnit = this.findUnitById(attackerId);
    // PROG-2-9400：依兵種播突刺／盾擊／劈砍／射箭分動作，缺動作時退回通用攻擊
    this.spineUnits.play(attackerId, 'attack', attackStyleFor(attackerUnit?.type));
    const attackerNode = this.resolveCombatNode(attackerId);
    if (!attackerNode) return;
    if (!attackerUnit) return;

    this.playAttackVfx(attackerNode, attackerUnit.type, this.getUnitWorldPosition(defenderLane, defenderDepth, attackerNode.worldPosition.y));
    if (attackerUnit.type === TroopType.Cavalry) {
      const targetPos = this.getUnitWorldPosition(defenderLane, defenderDepth, attackerNode.worldPosition.y);
      if (targetPos) {
        this.playCavalryChargeAnimation(attackerNode, targetPos);
      }
      return;
    }
    this.bumpNodeForward(attackerNode, attackerUnit.faction, 0.38);
  }

  public async playAttackAnimationAsync(attackerId: string, defenderLane: number, defenderDepth: number): Promise<void> {
    const attackerUnit = this.findUnitById(attackerId);
    this.playAttackAnimation(attackerId, defenderLane, defenderDepth);
    await this.waitSeconds(attackerUnit?.type === TroopType.Cavalry ? BATTLE_VISUAL_TIMING.cavalryAttackAwaitSec : BATTLE_VISUAL_TIMING.attackAwaitSec);
  }

  public playAttackGeneralAnimation(attackerId: string, defenderFaction: Faction): void {
    const attackerUnit = this.findUnitById(attackerId);
    this.spineUnits.play(attackerId, 'attack', attackStyleFor(attackerUnit?.type));
    const attackerNode = this.resolveCombatNode(attackerId);
    const defenderNode = this.generalViews.get(defenderFaction)?.worldNode ?? null;
    if (!attackerNode || !defenderNode) return;
    if (!attackerUnit) return;

    this.playAttackVfx(attackerNode, attackerUnit.type, defenderNode.worldPosition);
    if (attackerUnit.type === TroopType.Cavalry) {
      this.playCavalryChargeAnimation(attackerNode, defenderNode.worldPosition);
      return;
    }
    this.bumpNodeForward(attackerNode, attackerUnit.faction, 0.38);
  }

  public async playAttackGeneralAnimationAsync(attackerId: string, defenderFaction: Faction): Promise<void> {
    const attackerUnit = this.findUnitById(attackerId);
    this.playAttackGeneralAnimation(attackerId, defenderFaction);
    await this.waitSeconds(attackerUnit?.type === TroopType.Cavalry ? BATTLE_VISUAL_TIMING.cavalryAttackAwaitSec : BATTLE_VISUAL_TIMING.attackAwaitSec);
  }

  /**
   * 受擊表現（PROG-2-9401）：全身閃白 + 左右小抖動；重擊／爆擊再加輕微畫面震動。
   * 致命一擊只閃白，不抖也不震畫面（接著要播倒地與 boom，疊起來會亂）。
   * 抖動只作用在 Spine 疊層的畫面偏移與 Visual 子節點，不動 worldNode 的移動 tween。
   */
  public playHitAnimation(defenderId: string, _attackerId: string | null, opts?: { heavy?: boolean; lethal?: boolean }): void {
    this.spineUnits.play(defenderId, 'hit');
    this.markBadgeHit(defenderId);
    const defenderView = this.unitViews.get(defenderId);
    const defenderNode = defenderView?.worldNode ?? null;
    const defenderUnit = this.findUnitById(defenderId);
    if (!defenderNode || !defenderUnit) return;

    const plan = planHitFeedback(opts?.lethal === true, opts?.heavy === true);
    // 先打一次 Spine 疊層（小兵與武將化身都走這裡）；沒有 Spine 的單位走下面的 3D 後備
    // PROG-2-9412：Spine 單位另外往後推（以前的後退只動 3D 子節點，畫面上的小兵沒動），並與攻擊方一起頓格
    const shakePx = this.hitShakeAmplitudePx(defenderUnit.lane, defenderUnit.depth);
    const pushPx = plan.shake ? shakePx / BATTLE_VISUAL_TIMING.hitShakeAmplitudeRatio * BATTLE_VISUAL_TIMING.hitRecoilRatio : 0;
    const spineHit = this.spineUnits.hit(defenderId, plan.shake ? shakePx : 0, plan.flash, pushPx);
    this.spineUnits.hitStop(defenderId, BATTLE_VISUAL_TIMING.hitStopSec);
    if (_attackerId) this.spineUnits.hitStop(_attackerId, BATTLE_VISUAL_TIMING.hitStopSec);
    if (!spineHit && plan.shake) this.shakeVisualChildren(defenderView!);

    this.recoilNode(defenderNode, defenderUnit.faction);

    // 閃白：3D 後備用白色邊緣光（Tier 2 Instancing）；Spine 疊層已在 hit() 內處理
    if (plan.flash && !spineHit) {
      services().material.setRim(`${defenderId}_body`, "unit-base", new Color(255, 255, 255, 255));
      services().material.setRim(`${defenderId}_accent`, "unit-base", new Color(255, 255, 255, 255));
      setTimeout(() => {
        // 確保仍存在才清空（可能已經死亡被銷毀）
        if (this.unitViews.has(defenderId)) {
          services().material.clearRim(`${defenderId}_body`, "unit-base");
          services().material.clearRim(`${defenderId}_accent`, "unit-base");
        }
      }, BATTLE_VISUAL_TIMING.hitRimFlashMs);
    }
    if (plan.screenShake) this.playHitScreenShake();
  }

  /** 一格在畫面上的寬度（像素），受擊抖動幅度以它為基準；算不出來就用 100。 */
  private hitShakeAmplitudePx(lane: number, depth: number): number {
    let cellPx = 100;
    const a = this.getUnitWorldPosition(lane, depth);
    const b = this.getUnitWorldPosition(lane, hitScaleNeighborDepth(depth, GAME_CONFIG.GRID_DEPTH));
    if (a && b) {
      // overlayPoint 回傳共用緩衝，必須先把第一點取出來再算第二點
      const pa = this.overlayPoint(a);
      const ax = pa?.x ?? 0; const ay = pa?.y ?? 0;
      const pb = this.overlayPoint(b);
      if (pa && pb) {
        const dist = Math.hypot(pb.x - ax, pb.y - ay);
        if (dist > 20 && dist < 400) cellPx = dist;
      }
    }
    return cellPx * BATTLE_VISUAL_TIMING.hitShakeAmplitudeRatio;
  }

  /** 重擊／爆擊的輕微畫面震動；EffectSystem 內有重疊保護，連續重擊不會讓鏡頭漂移。 */
  private playHitScreenShake(): void {
    try {
      services().effect.playCameraShake(BATTLE_VISUAL_TIMING.hitScreenShakeStrength, BATTLE_VISUAL_TIMING.hitScreenShakeSec);
    } catch (error) { console.warn('[UnitRenderer] 畫面震動略過', error); }
  }

  /** 各 3D 後備節點抖動前的原位；只在第一次（沒有進行中的抖動）記錄，被打斷時下一次仍以它為準，不會漂移。 */
  private readonly shakeBase = new Map<Node, Vec3>();

  /** 沒有 Spine 的 3D 單位：抖動 Visual 底下的兵陣與本體（不動 visualNode，那是受擊後退 tween 的目標）。 */
  private shakeVisualChildren(view: UnitView): void {
    const cellWorld = this.boardRenderer?.cellSize ?? 1;
    const amplitudeWorld = cellWorld * BATTLE_VISUAL_TIMING.hitShakeAmplitudeRatio;
    const ws = view.worldNode.worldScale.x || 1;
    const amplitude = amplitudeWorld / ws;
    [view.formationRoot, view.bodyNode].forEach(node => { if (node?.isValid && node.activeInHierarchy) this.shakeLocalNode(node, amplitude); });
  }

  private shakeLocalNode(node: Node, amplitude: number): void {
    let base = this.shakeBase.get(node);
    if (!base) { base = node.position.clone(); this.shakeBase.set(node, base); }
    const home = base;
    Tween.stopAllByTarget(node);
    const seq = tween(node);
    buildHitShakeSteps(amplitude).forEach(step => seq.to(step.durationSec, { position: new Vec3(home.x + step.offsetX, home.y, home.z) }));
    seq.call(() => { node.setPosition(home); this.shakeBase.delete(node); }).start();
  }

  public playDodgeAnimation(unitId: string): void { this.spineUnits.play(unitId, 'dodge'); }
  public playGeneralDodge(faction: Faction): void { this.spineUnits.play(this.generalSpineId(faction), 'dodge'); }

  public async playHitAnimationAsync(defenderId: string, attackerId: string | null, opts?: { heavy?: boolean; lethal?: boolean }): Promise<void> {
    this.playHitAnimation(defenderId, attackerId, opts);
    await this.waitSeconds(BATTLE_VISUAL_TIMING.hitAwaitSec);
  }

  public async playBoundaryDamageSpinAsync(defenderId: string): Promise<void> {
    const defenderView = this.unitViews.get(defenderId);
    if (!defenderView) return;

    await this.waitForUnitMovementIdle(defenderId);

    const spinNode = defenderView.worldNode;
    const pulseNode = defenderView.visualNode;
    const originalEuler = spinNode.eulerAngles.clone();
    const originalPos = pulseNode.position.clone();
    const originalScale = pulseNode.scale.clone();
    const liftPos = originalPos.clone();
    liftPos.y += this.unitHeight * 0.08;
    const spunEuler = new Vec3(originalEuler.x, originalEuler.y + 360, originalEuler.z + 16);
    const pulseScale = new Vec3(originalScale.x * 1.05, originalScale.y * 1.03, originalScale.z * 1.05);

    Tween.stopAllByTarget(pulseNode);
    tween(spinNode)
      .to(BATTLE_VISUAL_TIMING.boundaryDamageSpinSec, { eulerAngles: spunEuler }, { easing: "quadInOut" })
      .start();
    tween(pulseNode)
      .parallel(
        tween<Node>()
          .to(BATTLE_VISUAL_TIMING.boundaryDamageSpinSec * 0.4, { position: liftPos }, { easing: "quadOut" })
          .to(BATTLE_VISUAL_TIMING.boundaryDamageSpinSec * 0.6, { position: originalPos }, { easing: "quadIn" }),
        tween<Node>()
          .to(BATTLE_VISUAL_TIMING.boundaryDamageSpinSec * 0.4, { scale: pulseScale }, { easing: "quadOut" })
          .to(BATTLE_VISUAL_TIMING.boundaryDamageSpinSec * 0.6, { scale: originalScale }, { easing: "quadIn" }),
      )
      .start();

    await this.waitSeconds(BATTLE_VISUAL_TIMING.boundaryDamageSpinSec);
  }

  private playRiverCurrentMoveTween(view: UnitView, unit: TroopUnit, fromPos: Vec3, toPos: Vec3): void {
    const sinkDepth = Math.max(0.2, this.unitHeight * 0.32);
    const originalVisualPos = view.visualNode.position.clone();
    const originalVisualEuler = view.visualNode.eulerAngles.clone();
    const sinkVisualPos = originalVisualPos.clone();
    sinkVisualPos.y -= sinkDepth;
    const sinkVisualEuler = originalVisualEuler.clone();
    sinkVisualEuler.z += 30;
    const sinkSec = Math.max(0.18, BATTLE_VISUAL_TIMING.moveAdvanceSec * 0.18);
    const carrySec = Math.max(0.5, BATTLE_VISUAL_TIMING.moveAdvanceSec - sinkSec * 2.0);

    Tween.stopAllByTarget(view.worldNode);
    Tween.stopAllByTarget(view.visualNode);

    this.movingUnits.add(unit.id);
    view.worldNode.setWorldPosition(fromPos);
    view.visualNode.setPosition(originalVisualPos);
    view.visualNode.setRotationFromEuler(originalVisualEuler);

    let completedParts = 0;
    const finish = (): void => {
      completedParts += 1;
      if (completedParts < 2) {
        return;
      }
      this.movingUnits.delete(unit.id);
      view.worldNode.setWorldPosition(toPos);
      view.visualNode.setPosition(originalVisualPos);
      view.visualNode.setRotationFromEuler(originalVisualEuler);
    };

    tween(view.worldNode)
      .to(BATTLE_VISUAL_TIMING.moveAdvanceSec, { worldPosition: toPos }, { easing: 'linear' })
      .call(finish)
      .start();

    tween(view.visualNode)
      .to(sinkSec, { position: sinkVisualPos, eulerAngles: sinkVisualEuler }, { easing: 'quadOut' })
      .to(carrySec, { position: sinkVisualPos, eulerAngles: sinkVisualEuler }, { easing: 'linear' })
      .to(sinkSec, { position: originalVisualPos, eulerAngles: originalVisualEuler }, { easing: 'quadIn' })
      .call(finish)
      .start();
  }

  /**
   * 主將受擊。recoil 一律播（閃避時橋接層也呼叫它當等待節奏）；
   * 閃白與抖動只在真的受傷時播（silent = true 表示閃避，略過）。PROG-2-9401。
   */
  public playGeneralHitAnimation(defenderFaction: Faction, _attackerId: string | null, opts?: { heavy?: boolean; lethal?: boolean; silent?: boolean }): void {
    const generalView = this.generalViews.get(defenderFaction);
    const defenderNode = generalView?.worldNode ?? null;
    if (!generalView || !defenderNode) return;

    this.recoilNode(defenderNode, defenderFaction);
    if (opts?.silent) return;

    const plan = planHitFeedback(opts?.lethal === true, opts?.heavy === true);
    const amplitudePx = plan.shake ? this.hitShakeAmplitudePx(2, 2) : 0;
    if (!this.spineUnits.hit(this.generalSpineId(defenderFaction), amplitudePx, plan.flash) && plan.shake) {
      // 沒有 Spine 的 3D 武將模型：抖動模型根節點（recoil 動的是 worldNode，兩者不衝突）
      const cellWorld = this.boardRenderer?.cellSize ?? 1;
      const amplitude = cellWorld * BATTLE_VISUAL_TIMING.hitShakeAmplitudeRatio / (generalView.worldNode.worldScale.x || 1);
      if (generalView.modelRoot?.isValid && generalView.modelRoot.activeInHierarchy) this.shakeLocalNode(generalView.modelRoot, amplitude);
    }
    if (plan.screenShake) this.playHitScreenShake();
  }

  public async playGeneralHitAnimationAsync(defenderFaction: Faction, attackerId: string | null, opts?: { heavy?: boolean; lethal?: boolean; silent?: boolean }): Promise<void> {
    this.playGeneralHitAnimation(defenderFaction, attackerId, opts);
    await this.waitSeconds(BATTLE_VISUAL_TIMING.hitAwaitSec);
  }

  public playGeneralValueChange(defenderFaction: Faction, value: number, isCrit = false): void {
    const generalView = this.generalViews.get(defenderFaction);
    if (!generalView) return;

    const worldPos = generalView.worldNode.worldPosition.clone();
    worldPos.y += this.unitHeight * 0.5;

    // 暴擊時使用 dmg_crit 字體，否則依陣營選色
    const isPlayerSide = defenderFaction === Faction.Player;
    const floatType = isCrit ? 'dmg_crit' : (isPlayerSide ? 'dmg_player' : 'dmg_enemy');
    this.spawnFloatText(`-${value}`, floatType, worldPos, `general:${defenderFaction}`);
  }

  /** 閃避飄字（灰字「閃避」）：小兵被攻擊落空時，在被攻擊的單位頭上跳。PROG-2-9401。 */
  public playMissFloat(unit: TroopUnit | null): void {
    if (!unit || !this.uiRoot || !this.worldCamera || !this.canvasNode) return;
    const worldPos = this.getUnitWorldPosition(unit.lane, unit.depth);
    if (!worldPos) return;
    this.spawnFloatText(FLOAT_MISS_TEXT, 'dmg_miss', worldPos, unit.id);
  }

  /** 主將閃避飄字。 */
  public playGeneralMissFloat(faction: Faction): void {
    const generalView = this.generalViews.get(faction);
    if (!generalView) return;
    const worldPos = generalView.worldNode.worldPosition.clone();
    worldPos.y += this.unitHeight * 0.5;
    this.spawnFloatText(FLOAT_MISS_TEXT, 'dmg_miss', worldPos, `general:${faction}`);
  }

  public async playGeneralValueChangeAsync(defenderFaction: Faction, value: number, isCrit = false): Promise<void> {
    this.playGeneralValueChange(defenderFaction, value, isCrit);
    await this.waitSeconds(BATTLE_VISUAL_TIMING.generalValueAwaitSec);
  }

  public playValueChange(unit: TroopUnit | null, value: number, kind: "damage" | "heal", isCrit = false, heavy = false): void {
    if (!unit || !this.uiRoot || !this.worldCamera || !this.canvasNode) return;

    let worldPos = this.getUnitWorldPosition(unit.lane, unit.depth);
    const view = unit ? this.unitViews.get(unit.id) : undefined;
    
    if (view && view.usingTroopFormation && view.formationRoot.children.length > 0) {
      // 找出所有活著的小兵模型（排除陰影節點）
      const soldiers = view.formationRoot.children.filter(c => c.name.startsWith("Soldier_"));
      if (soldiers.length > 0) {
        // 隨機抽選一個被攻擊的小兵身上冒出數字
        const randomSoldier = soldiers[Math.floor(Math.random() * soldiers.length)];
        worldPos = randomSoldier.worldPosition.clone();
        worldPos.y += this.unitHeight * 0.5; // 保留在小兵大約中段的高度
      }
    }

    if (!worldPos) return;

    // 延遲傷害數字跳出，配合攻擊方抵達的時刻。
    setTimeout(() => {
      const sign = kind === "heal" ? "+" : "-";
      // 主戰場UI規格書 §3.2：暴擊用橘金放大字（PROG-2-1875）
      const dmgType: FloatTextType = unitValueFloatType(kind, unit.faction === Faction.Player, isCrit, heavy);
      this.spawnFloatText(`${sign}${value}`, dmgType, worldPos!, unit.id);

      const currentView = this.unitViews.get(unit.id);
      if (currentView) {
        if (currentView.usingTroopFormation) {
          // 只針對實際的兵模型做受擊跳動，不要震動到陰影
          currentView.formationRoot.children.forEach(child => {
            if (child.name.startsWith("Soldier_")) {
              const originalPos = child.position.clone();
              Tween.stopAllByTarget(child);
              tween(child)
                .to(BATTLE_VISUAL_TIMING.unitValueSoldierPopUpSec, { position: new Vec3(originalPos.x, originalPos.y + 0.06, originalPos.z) })
                .to(BATTLE_VISUAL_TIMING.unitValueSoldierPopDownSec, { position: originalPos })
                .start();
            }
          });
        } else {
          const originalScale = currentView.worldNode.scale.clone();
          tween(currentView.worldNode)
            .to(BATTLE_VISUAL_TIMING.unitValueScaleInSec, { scale: new Vec3(originalScale.x * 1.15, originalScale.y * 0.9, originalScale.z * 1.15) })
            .to(BATTLE_VISUAL_TIMING.unitValueScaleOutSec, { scale: originalScale })
            .start();
        }
      }
    }, BATTLE_VISUAL_TIMING.valuePopupDelayMs);
  }

  public async playValueChangeAsync(unit: TroopUnit | null, value: number, kind: "damage" | "heal", isCrit = false, heavy = false): Promise<void> {
    this.playValueChange(unit, value, kind, isCrit, heavy);
    await this.waitSeconds(BATTLE_VISUAL_TIMING.unitValueAwaitSec);
  }

  public async waitForMovementIdle(maxWaitMs = BATTLE_VISUAL_TIMING.movementIdleMaxWaitMs): Promise<void> {
    const startedAt = Date.now();
    // 換場景後元件被銷毀，引擎會把欄位清成 null，但這個等待迴圈可能還在跑；先確認元件還活著再讀
    while (isValid(this, true) && this.movingUnits?.size > 0) {
      if (Date.now() - startedAt >= maxWaitMs) {
        return;
      }
      await this.waitMs(BATTLE_VISUAL_TIMING.movementIdlePollMs);
    }
  }

  public isMovementBusy(): boolean {
    return this.movingUnits.size > 0;
  }

  public async waitForUnitMovementIdle(unitId: string, maxWaitMs = BATTLE_VISUAL_TIMING.movementIdleMaxWaitMs): Promise<void> {
    const startedAt = Date.now();
    while (isValid(this, true) && this.movingUnits?.has(unitId)) {
      if (Date.now() - startedAt >= maxWaitMs) {
        return;
      }
      await this.waitMs(BATTLE_VISUAL_TIMING.movementIdlePollMs);
    }
  }

  /**
   * 飄字委托至 FloatTextSystem，由其統一管理物件池、動畫、maxConcurrent
   * 外觀設定請修改 FloatTextSystem.ts 中的 FLOAT_CONFIGS
   */
  /** anchorKey：同一單位短時間連續跳字會依序錯開（FloatTextSystem 內處理）。 */
  private spawnFloatText(text: string, type: FloatTextType, worldPos: Vec3, anchorKey?: string): void {
    services().floatText.show(type, text, worldPos, anchorKey);
  }

  private waitSeconds(seconds: number): Promise<void> {
    return this.waitMs(seconds * 1000);
  }

  private waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private toUiPosition(worldPos: Vec3): Vec3 {
    const uiPos = new Vec3();
    const screenPos = new Vec3();
    this.worldCamera!.worldToScreen(worldPos, screenPos);
    const uiCamera = this.canvasNode!.getComponentInChildren(Camera);
    if (uiCamera) {
      const uiWorldPos = new Vec3();
      uiCamera.screenToWorld(screenPos, uiWorldPos);
      const uiTrans = this.uiRoot!.getComponent(UITransform);
      if (uiTrans) {
        uiTrans.convertToNodeSpaceAR(uiWorldPos, uiPos);
      }
    } else {
      this.worldCamera!.convertToUINode(worldPos, this.uiRoot!, uiPos);
    }
    return uiPos;
  }

  public playSpGainAnimation(
    fromLane: number,
    fromDepth: number,
    amount: number,
    isPlayer: boolean,
    targetUiNode: Node | null = null,
  ): void {
    if (!this.uiRoot || !this.worldCamera || !this.canvasNode) return;

    // 從擊敗的小兵位置產生
    const worldPos = this.getUnitWorldPosition(fromLane, fromDepth);
    if (!worldPos) return;

    const startPos = this.toUiPosition(worldPos);
    let endPos: Vec3;
    if (targetUiNode) {
      const uiTrans = this.uiRoot.getComponent(UITransform);
      const local = new Vec3();
      if (uiTrans) {
        uiTrans.convertToNodeSpaceAR(targetUiNode.worldPosition, local);
      }
      endPos = local;
    } else {
      const targetFaction = isPlayer ? Faction.Player : Faction.Enemy;
      const generalView = this.generalViews.get(targetFaction);
      const targetWorldPos = generalView?.worldNode.worldPosition.clone() ?? worldPos.clone();
      targetWorldPos.y += this.unitHeight * 0.8;
      endPos = this.toUiPosition(targetWorldPos);
    }

    const floatNode = new Node(`SP_GAIN`);
    floatNode.layer = this.canvasNode?.layer ?? Layers.Enum.UI_2D;
    this.uiRoot.addChild(floatNode);

    const tf = floatNode.addComponent(UITransform);
    tf.setContentSize(140, 36);
    const opacity = floatNode.addComponent(UIOpacity);
    opacity.opacity = 255;
    const label = floatNode.addComponent(Label);
    label.fontSize = 24;
    label.lineHeight = 26;
    label.string = `+${amount} SP`;
    label.color = new Color(255, 230, 80, 255); // 金黃色
    label.isBold = true;
    floatNode.setPosition(startPos);

    floatNode.setScale(new Vec3(1, 1, 1));

    // 先快後慢，並同步放大到三倍
    tween(floatNode)
      .to(0.18, {
        position: new Vec3(
          startPos.x + (endPos.x - startPos.x) * 0.72,
          startPos.y + (endPos.y - startPos.y) * 0.72 + 56,
          startPos.z,
        ),
        scale: new Vec3(2.2, 2.2, 2.2),
      }, { easing: "quadOut" })
      .to(0.42, { position: endPos, scale: new Vec3(3, 3, 3) }, { easing: "quadIn" })
      .call(() => {
        // 到達時閃一下，然後消失
        tween(floatNode)
          .to(0.1, { scale: new Vec3(1.5, 1.5, 1.5) })
          .to(0.1, { scale: new Vec3(0.1, 0.1, 0.1) })
          .call(() => floatNode.destroy())
          .start();
      })
      .start();
  }

  lateUpdate(dt = 0): void {
    if (!this.uiRoot || !this.worldCamera) return;
    perfFrame();
    const tAll = perfBegin();
    let t = tAll;

    this.unitViews.forEach((view, unitId) => {
      const unit = this.latestState?.units.get(unitId);
      if (unit) {
        this.updateFloodRaft(view, unit);
      }
      this.projectWorldLabel(view.worldNode, view.labelNode, this.labelHeight);
      if (unit) {
        const isGeneral = this.isGeneralAvatarUnit(unit);
        const general = isGeneral ? this.latestState?.getGeneral(unit.faction) : null;
        const config = isGeneral ? (general ? this.generalSpine(general, unit.faction) : null)
          : troopSpineConfigWithFallback(unit.type, unit.faction === Faction.Enemy, unit.tallyTemplateId, path => this.spineUnits.hasFailed(path));
        // 主將沒有 Spine（或素材載不起來）：改畫立繪站牌，站位與 Spine 主將相同；站牌也載不到才留 3D 棋子（issue #2238）
        if (isGeneral && general && needsStandeeFallback(config?.path, path => this.spineUnits.hasFailed(path))) {
          this.spineUnits.remove(unitId);
          const side = this.boardGeneralFoot(unitId, unit.faction, view, dt);
          const shownStandee = this.generalStandees.sync(unitId, general.id, side?.x ?? view.labelNode.position.x,
            side?.y ?? view.labelNode.position.y - STANDEE_HEIGHT_PX, view.labelNode.active);
          view.visualNode.active = !shownStandee;
        } else if (config) {
          this.generalStandees.remove(unitId);
          const p = view.labelNode.position;
          // PROG-2-9715：格上主將跟小兵一樣站在自己的格子上（以前釘在場邊待命點，玩家看不到主將出陣走格）
          const foot = isGeneral ? this.boardGeneralFoot(unitId, unit.faction, view, dt) : this.unitGroundFoot(view);
          const moving = this.movingUnits.has(unitId) || (isGeneral && this.generalDashes.has(unitId));
          const shown = this.spineUnits.sync(unitId, config, foot?.x ?? p.x, foot?.y ?? p.y - config.labelToFoot,
            unit.faction === Faction.Enemy ? -1 : 1, moving, dt, view.labelNode.active,
            isGeneral ? 1 : squadMemberCount(unit.currentHp, unit.getEffectiveMaxHp()));
          view.visualNode.active = !shown;
        } else { this.spineUnits.remove(unitId); view.visualNode.active = true; }
      }
    });
    perfEnd('unitViews', t); t = perfBegin();

    this.generalViews.forEach((view, faction) => {
      this.projectClampedGeneralLabel(view);
      const general = this.latestState?.getGeneral(faction);
      const config = general && this.generalSpine(general, faction);
      if (config) {
        const p = view.labelNode.position;
        const side = this.generalSidelineFoot(faction);
        const shown = this.spineUnits.sync(`general:${faction}`, config, side?.x ?? p.x, side?.y ?? p.y - config.labelToFoot,
          faction === Faction.Enemy ? -1 : 1, false, dt);
        if (shown) view.modelRoot.active = false;
        else if (view.usingHeroModel) view.modelRoot.active = true;
      } else { this.spineUnits.remove(`general:${faction}`); if (view.usingHeroModel) view.modelRoot.active = true; }
    });
    perfEnd('generalViews', t); t = perfBegin();
    this.applyNameplateFade(dt);
    this.avoidGeneralPlates(dt);
    perfEnd('avoidPlates', t); t = perfBegin();
    this.spineUnits.update(dt);
    perfEnd('spineUnits', t); t = perfBegin();
    this.stepHpChips(dt);
    perfEnd('hpChips', t); t = perfBegin();
    this.moveDust.update(dt);
    this.arrowShots.update(dt);
    this.slashShots.update(dt);
    this.attackVfx.update(dt);
    perfEnd('fxShots', t); t = perfBegin();

    this.tileBuffMarkers.update(dt);
    this.unitBuffPickupVfx.update(dt);
    perfEnd('tileBuff', t); t = perfBegin();
    // 徽章代理節點跟上本幀最終位置（投影、避讓都做完之後；PROG-2-9713）
    this.badgeLayers?.sync();
    perfEnd('badgeSync', t);
    perfEnd('lateUpdate', tAll);
  }

  /** 數值帶增減量時字串變長，單行縮字塞進徽章（PROG-2-1870） */
  private shrinkToFit(label: Label): void {
    label.enableWrapText = false;
    label.overflow = Label.Overflow.SHRINK;
  }

  /** 讀高倍率攻擊提示門檻；讀不到就沿用預設（不影響戰鬥） */
  private async loadAttackSurgeConfig(): Promise<void> {
    try {
      const raw = await services().resource.loadJson<unknown>("data/attack-surge-highlight", { tags: ["battle"] });
      this.attackSurgeConfig = parseAttackSurgeConfig(raw);
    } catch {
      this.attackSurgeConfig = { ...DEFAULT_ATTACK_SURGE_CONFIG };
    }
  }

  private attackSurgeColor(tier: Exclude<AttackSurgeTier, "none">): Color {
    return tier === "red" ? this.attackSurgeRedColor : this.attackSurgeGoldColor;
  }

  /**
   * 紅色門檻的脈動光環：數字後方一圈紅色柔光，慢速放大縮回並明暗呼吸。
   * 只在開／關切換時動 tween，同一狀態重複刷新不重建。
   */
  private applyAttackSurgeGlow(view: UnitView, on: boolean): void {
    const existing = view.surgeGlow;
    if (!on) {
      if (existing && existing.active) this.stopAttackSurgeGlow(existing);
      return;
    }
    if (existing && existing.active) return;
    const glow = existing ?? this.createAttackSurgeGlow(view);
    if (!glow) return;
    const opacity = glow.getComponent(UIOpacity) ?? glow.addComponent(UIOpacity);
    glow.active = true;
    glow.setScale(1, 1, 1);
    opacity.opacity = 210;
    const half = Math.max(0.2, this.attackSurgeConfig.pulsePeriodSec / 2);
    tween(glow)
      .repeatForever(tween(glow)
        .to(half, { scale: new Vec3(1.22, 1.22, 1) }, { easing: "sineInOut" })
        .to(half, { scale: new Vec3(0.96, 0.96, 1) }, { easing: "sineInOut" }))
      .start();
    tween(opacity)
      .repeatForever(tween(opacity)
        .to(half, { opacity: 70 }, { easing: "sineInOut" })
        .to(half, { opacity: 210 }, { easing: "sineInOut" }))
      .start();
  }

  private stopAttackSurgeGlow(glow: Node): void {
    Tween.stopAllByTarget(glow);
    const opacity = glow.getComponent(UIOpacity);
    if (opacity) Tween.stopAllByTarget(opacity);
    glow.active = false;
  }

  /**
   * 光環畫在攻擊數字那一格的最底層：內部深色底讓紅字看得清楚，外圈三道由內而外漸淡的紅邊，
   * 呼吸時像一圈往外擴散的紅光。（實機發現整片紅色柔光會把紅字吃掉，所以內部不鋪紅）
   */
  private createAttackSurgeGlow(view: UnitView): Node | null {
    const segment = view.attackLabel.node.parent;
    if (!segment || !isValid(segment)) return null;
    const tf = segment.getComponent(UITransform);
    const w = tf?.width ?? 60;
    const h = tf?.height ?? 28;
    const node = new Node("AttackSurgeGlow");
    node.layer = segment.layer;
    segment.insertChild(node, 0);
    node.addComponent(UITransform).setContentSize(w + 20, h + 16);
    const g = node.addComponent(Graphics);
    g.fillColor = new Color(24, 8, 8, 200);
    g.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, (h / 2 + 2) * 0.85);
    g.fill();
    const rings: ReadonlyArray<readonly [number, number]> = [[3, 240], [7, 130], [11, 60]];
    for (const [pad, alpha] of rings) {
      g.lineWidth = 3;
      g.strokeColor = new Color(255, 70, 60, alpha);
      // 圓角半徑略小於半高：剛好等於半高時兩端描邊會冒出尖角
      g.roundRect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2, (h / 2 + pad) * 0.85);
      g.stroke();
    }
    node.addComponent(UIOpacity);
    view.surgeGlow = node;
    return node;
  }

  private statToneColor(tone: StatBonusTone): Color {
    if (tone === "up") return new Color(110, 255, 120, 255);
    if (tone === "down") return new Color(255, 120, 110, 255);
    return new Color(245, 245, 245, 255);
  }

  /** 掠奪金色飄字（戰法系統 §H-3，PROG-2-1852）：多行依序飄出，避免疊在一起 */
  public playLootTexts(lane: number, depth: number, texts: readonly string[]): void {
    const worldPos = this.getUnitWorldPosition(lane, depth);
    if (!worldPos) return;
    texts.forEach((text, index) => {
      this.scheduleOnce(() => this.spawnFloatText(text, 'loot', worldPos), index * LOOT_TEXT_STAGGER_SEC);
    });
  }

  public playBuffConsumeValue(lane: number, depth: number, text: string): void {
    const worldPos = this.getUnitWorldPosition(lane, depth);
    if (!worldPos) return;
    this.spawnFloatText(text, 'status', worldPos);
  }

  /**
   * 根據 delta 分派到對應特效 Pool：ATK± / HP±。
   * 由 BattleScene.onTileBuffConsumed 呼叫。
   *
   * 對照 Unity：直接呼叫不同 ParticleSystem.Play() 實例
   */
  public playBuffEffect(unitId: string, lane: number, depth: number, attackDelta: number, hpDelta: number): void {
    const worldPos = this.getUnitWorldPosition(lane, depth, 0.02);
    if (!worldPos) return;
    UCUFLogger.info(LogCategory.BATTLE, `[UnitRenderer] playBuffEffect unit=${unitId} lane=${lane} depth=${depth} atk=${attackDelta} hp=${hpDelta}`);
    // 增益（ATK+／HP+）已改由 UnitBuffPickupVfx 的腳下特效負責，這裡只剩減益
    if (attackDelta < 0) this.atkLossPool?.play(worldPos);
    if (hpDelta < 0)     this.hpLossPool?.play(worldPos);
  }

  /** 建立 2 個 BuffGainEffectPool：ATK−、HP−（增益已改由腳下特效負責，PROG-2-9734） */
  private async setupAllEffectPools(): Promise<void> {
    if (!this.worldRoot) return;

    const makePool = (label: string): BuffGainEffectPool => {
      const n = new Node(label);
      n.layer = Layers.Enum.DEFAULT;
      this.worldRoot!.addChild(n);
      const pool = n.addComponent(BuffGainEffectPool);
      pool.setCameraNode(this.worldCamera?.node ?? null);
      return pool;
    };

    const debuffRing = new Color(96, 28, 28, 220);
    const debuffMain = new Color(190, 72, 72, 236);
    const debuffArrow = new Color(128, 42, 42, 220);

    this.atkLossPool = makePool("Pool_AtkLoss");
    this.hpLossPool  = makePool("Pool_HpLoss");

    await Promise.all([
      this.atkLossPool.initialize({ variant: "AtkLoss", prefabPath: "fx/buff/buff_debuff_3d", ringTexturePath: "vfx_core:textures/rings/tex_ring_addatk",  mainTexturePath: "vfx_core:textures/icons/tex_icon_addatk",  arrowTexturePath: "vfx_core:textures/shapes/tex_shape_arrow_addatk",  sparkTexturePath: "vfx_core:textures/glow/ex_hit_flash",  arrowUp: false, mainScaleMultiplier: 0.78, ringColor: debuffRing, mainColor: debuffMain, arrowColor: debuffArrow, label: "AtkLoss" }),
      this.hpLossPool.initialize({ variant: "HpLoss", prefabPath: "fx/buff/buff_debuff_3d", ringTexturePath: "vfx_core:textures/rings/tex_ring_addlife", mainTexturePath: "vfx_core:textures/icons/tex_icon_addlife", arrowTexturePath: "vfx_core:textures/shapes/tex_shape_arrow_addlife", sparkTexturePath: "vfx_core:textures/glow/ex_hit_flash", arrowUp: false, useDualArrows: true, mainRotationDeg: 90, ringColor: debuffRing, mainColor: debuffMain, arrowColor: debuffArrow, label: "HpLoss" }),
    ]);
    UCUFLogger.info(LogCategory.BATTLE, "[UnitRenderer] ✅ 全部特效 Pool 初始化完成 (ATK−, HP−)");
  }

  private ensureRoots(): void {
    if (!this.worldRoot) {
      this.worldRoot = new Node("UnitWorldRoot");
      this.worldRoot.layer = Layers.Enum.DEFAULT;
      this.node.addChild(this.worldRoot);
    }

    if (!this.uiRoot && this.canvasNode) {
      // 為了避免層級與佈局變形影響，直接掛在 Canvas 底下
      let uiRoot = this.canvasNode.getChildByName("UnitOverlayRoot");
      if (!uiRoot) {
        uiRoot = new Node("UnitOverlayRoot");
        uiRoot.layer = this.canvasNode.layer;
        this.canvasNode.addChild(uiRoot);
        const tf = uiRoot.addComponent(UITransform);
        const canvasTf = this.canvasNode.getComponent(UITransform);
        if (canvasTf) {
          tf.setContentSize(canvasTf.contentSize);
        } else {
          tf.setContentSize(new Size(1920, 1080));
        }
        uiRoot.setPosition(Vec3.ZERO);
      }
      // 置於 Canvas 最底層，確保 3D 浮動名牌／武將徽章永遠排在 HUD／設定／結算視窗之下（Issue #2159）
      uiRoot.setSiblingIndex(0);
      this.uiRoot = uiRoot;
    } else if (this.uiRoot) {
      this.uiRoot.setSiblingIndex(0);
    }
  }

  private updateGeneralViews(state: BattleState): void {
    this.updateSingleGeneralView(Faction.Player, state.playerGeneral);
    this.updateSingleGeneralView(Faction.Enemy, state.enemyGeneral);
  }

  private updateSingleGeneralView(faction: Faction, general: GeneralUnit | null): void {
    const avatarOnBoard = this.hasGeneralAvatarOnBoard(faction);
    if (general && general.currentHp <= 0 && !avatarOnBoard && this.spineUnits.play(`general:${faction}`, 'fall')) {
      // Spine 武將留在場上演倒地，只收掉標籤
      const fallen = this.generalViews.get(faction);
      if (fallen) fallen.labelOpacity.opacity = 0;
      return;
    }
    if (!general || general.currentHp <= 0 || avatarOnBoard) {
      this.removeGeneralView(faction);
      return;
    }

    let view = this.generalViews.get(faction);
    if (!view) {
      view = this.createGeneralView(faction);
      this.generalViews.set(faction, view);
    }

    const centerLane = Math.floor(GAME_CONFIG.GRID_LANES / 2);
    const frontDepth = faction === Faction.Player ? 0 : GAME_CONFIG.GRID_DEPTH - 1;
    const inwardDepth = faction === Faction.Player ? 1 : GAME_CONFIG.GRID_DEPTH - 2;
    const front = this.getUnitWorldPosition(centerLane, frontDepth, this.unitHeight * 0.75);
    const inward = this.getUnitWorldPosition(centerLane, inwardDepth, this.unitHeight * 0.75);
    if (front && inward) {
      const step = inward.clone().subtract(front).multiplyScalar(1.05);
      const behind = front.clone().subtract(step);
      view.worldNode.setWorldPosition(behind);
    }

    this.alignNodeToFactionFacing(view.worldNode, faction);


    if (view.usingHeroModel) {
      view.worldNode.setScale(Vec3.ONE);
      view.bodyNode.active = false;
      this.applyGeneralHeroTransform(view, faction);
    } else {
      view.worldNode.setScale(Vec3.ONE);
      view.bodyNode.active = false;
      view.modelRoot.active = false;
      if (!view.heroLoading) {
        void this.ensureGeneralHeroModel(view, faction);
      }
    }

    view.attackLabel.string = `+${Math.round(general.attackBonus * 100)}%`;
    view.typeLabel.string = "將";
    view.hpLabel.string = `${Math.max(0, general.currentHp)}`;
    this.drawVitalityRing(view, vitalityRingView(general.vitality, general.maxVitality));
    view.vitalityStrip.set(general.vitality, general.maxVitality);
    view.labelOpacity.opacity = 255;
    const label = this.projectClampedGeneralLabel(view);

    // Spine 2D 武將站在標籤下方；載入完成後隱藏 3D 模型
    const config = this.generalSpine(general, faction);
    this.spineUnits.revive(`general:${faction}`);
    const side = this.generalSidelineFoot(faction);
    const shown = !!config && this.spineUnits.sync(`general:${faction}`, config, side?.x ?? label.x, side?.y ?? label.y - config.labelToFoot,
      faction === Faction.Enemy ? -1 : 1, false, 0);
    if (!config) this.spineUnits.remove(`general:${faction}`);
    if (shown) view.modelRoot.active = false;
    else if (view.usingHeroModel) view.modelRoot.active = true;
  }

  /** 武將出招：Spine 武將播一次長槍突刺 */
  /** PROG-2-9410：武將放招前蓄力（Spine 主將聚氣膨脹＋顫動）；沒有 Spine 主將時回 false，不影響流程。 */
  public playGeneralCharge(faction: Faction, durationSec: number): boolean {
    return this.spineUnits.charge(this.generalSpineId(faction), durationSec);
  }

  public playGeneralAttackPose(faction: Faction): void {
    this.spineUnits.play(this.generalSpineId(faction), 'attack');
    // PROG-2-9353：沒有目標位置，朝對方武將方向在自身前方播刀光；任何一方不在場就略過
    const self = this.generalViews.get(faction)?.worldNode;
    const foe = this.generalViews.get(faction === Faction.Player ? Faction.Enemy : Faction.Player)?.worldNode;
    if (self && foe) this.playAttackVfx(self, 'general', foe.worldPosition, 0.2, this.generalVfxInfo(faction));
  }

  /** 攻擊特效試作掛鉤：武將走武器模板、小兵依風格；沒就緒或開關關閉回 false，呼叫端沿用舊特效 */
  private tryAttackVfx(troopType: string, general: { id: string; role?: string; element?: string } | undefined, ax: number, ay: number, tx: number, ty: number, ratio: number, isArrow: boolean): boolean {
    const style = attackStyleFor(troopType);
    const hit = troopType === 'general' && general ? this.attackVfx.playGeneral(general, ax, ay, tx, ty)
      : this.attackVfx.playTroop(style === 'generic' ? '' : style, ax, ay, tx, ty, ratio); // 槍／步／弓／盾／騎都走新特效，未知兵種退回舊特效
    if (hit && isArrow) this.arrowShots.shoot(ax, ay, tx, ty);
    return hit;
  }

  private generalVfxInfo(faction: Faction): { id: string; role?: string; element?: string } | undefined {
    const g = this.latestState?.getGeneral(faction) as unknown as { id: string; role?: string; element?: string } | undefined;
    return g ? { id: g.id, role: g.role, element: g.element } : undefined;
  }

  /** 試作／QA：以指定武將 id 在場上兩位武將之間播一次攻擊（施法）特效，不動戰鬥狀態 */
  public previewGeneralAttackVfx(generalId: string, faction: Faction, role?: string): void {
    const self = this.generalViews.get(faction)?.worldNode;
    const foe = this.generalViews.get(faction === Faction.Player ? Faction.Enemy : Faction.Player)?.worldNode;
    if (self && foe) this.playAttackVfx(self, 'general', foe.worldPosition, 0.2, { id: generalId, role });
  }

  /**
   * PROG-2-9353：攻擊特效。近戰播刀光（走 EffectSystem.playBlock，與受擊特效同一池）；弓兵飛箭（畫面層 Sprite 池）。
   * 一次攻擊最多一個特效；演出失敗不可影響戰鬥流程。
   */
  private playAttackVfx(attackerNode: Node, troopType: string, targetPos: Vec3 | null, ratio = 0.67, general?: { id: string; role?: string; element?: string }): void {
    if (!targetPos) return;
    try {
      const vfx = attackVfxFor(troopType);
      const from = attackerNode.worldPosition;
      const a = this.overlayPoint(from); const ax = a?.x ?? 0; const ay = a?.y ?? 0;
      const target = this.overlayPoint(targetPos);
      if (a && target && this.tryAttackVfx(troopType, general, ax, ay, target.x, target.y, ratio, vfx.kind === 'arrow')) return;
      if (vfx.kind === 'arrow') {
        if (a && target) {
          this.arrowShots.shoot(ax, ay, target.x, target.y);
          // PROG-2-9400：箭飛到才在命中點小爆一下
          this.slashShots.playShots(vfx.shots, ax, ay, target.x, target.y, ratio);
        }
        return;
      }
      // PROG-2-9367/9400：依兵種畫在畫面層（刺光、衝擊圈、月牙、塵土）；貼圖還沒載好的那一下退回原本的粒子刀光，不漏播
      if (a && target && this.slashShots.playShots(vfx.shots, ax, ay, target.x, target.y, ratio)) return;
      const pos = new Vec3(from.x + (targetPos.x - from.x) * ratio, from.y + (targetPos.y - from.y) * ratio, from.z + (targetPos.z - from.z) * ratio);
      services().effect.playBlock(vfx.effectId, pos, undefined, 0.6);
    } catch (error) { console.warn('[UnitRenderer] 攻擊特效略過', error); }
  }

  /** 武將中招（閃避不呼叫）：Spine 武將播一次受擊後退 */
  public playGeneralKnockback(faction: Faction): void {
    this.spineUnits.play(this.generalSpineId(faction), 'hit');
  }

  private generalSpineId(faction: Faction): string {
    const side = `general:${faction}`;
    if (this.spineUnits.exists(side)) return side;
    const prefix = faction === Faction.Player ? 'player-general-' : 'enemy-general-';
    for (const id of this.unitViews.keys()) if (id.startsWith(prefix) && this.spineUnits.exists(id)) return id;
    return side;
  }

  private ensureGeneralSpineId(faction: Faction): string {
    const id = this.generalSpineId(faction);
    if (this.spineUnits.exists(id)) return id;
    const general = this.latestState?.getGeneral(faction);
    const config = general && this.generalSpine(general, faction);
    const foot = this.generalSidelineFoot(faction);
    if (config && foot) this.spineUnits.sync(id, config, foot.x, foot.y, faction === Faction.Enemy ? -1 : 1, false, 0);
    return id;
  }

  public playDuelPresentation(winner: 0 | 1 | null, fallen: boolean, exchanges: readonly DuelExchange[]): Promise<boolean> {
    return this.spineUnits.playDuel(this.ensureGeneralSpineId(Faction.Player), this.ensureGeneralSpineId(Faction.Enemy), winner, fallen, exchanges, this.duelSidelineArena());
  }

  /**
   * PROG-2-9719（使用者 11/22 裁決 Q1=B）：單挑移到場邊演出，不在格子上打。
   * 取棋盤中段（兩軍中線）往棋盤外側延伸 DUEL_SIDELINE_LANES 路的點；兩側取畫面上方（遠側）那邊，避開下方手牌與按鈕。
   */
  private duelSidelineArena(): { x: number; y: number } | null {
    const lanes = GAME_CONFIG.GRID_LANES, depth = GAME_CONFIG.GRID_DEPTH;
    const dA = Math.floor((depth - 1) / 2), dB = Math.ceil((depth - 1) / 2);
    const mid = (lane: number): Vec3 | null => {
      const a = this.getUnitWorldPosition(lane, dA, 0), b = this.getUnitWorldPosition(lane, dB, 0);
      return a && b ? a.clone().add(b).multiplyScalar(0.5) : null;
    };
    const first = mid(0), second = mid(1), last = mid(lanes - 1), beforeLast = mid(lanes - 2);
    if (!first || !second || !last || !beforeLast) return null;
    const outFirst = first.clone().subtract(second.clone().subtract(first).multiplyScalar(DUEL_SIDELINE_LANES));
    const outLast = last.clone().add(last.clone().subtract(beforeLast).multiplyScalar(DUEL_SIDELINE_LANES));
    const pFirst = this.overlayPoint(outFirst), pLast = this.overlayPoint(outLast);
    if (!pFirst || !pLast) return pFirst ?? pLast ?? null;
    const top = pFirst.y >= pLast.y ? pFirst : pLast;
    return { x: top.x, y: top.y };
  }

  /** 單挑演出逾時保底（PROG-2-9404）：強制收掉進行中的交鋒動畫，讓雙方回到正常跟隨 */
  public abortDuelPresentation(): void {
    this.spineUnits.abortDuel();
  }

  onDestroy(): void { this.unsubVitality?.(); this.unsubVitality = null; this.spineUnits.clear(); this.generalStandees.clear(); this.moveDust.destroy(); this.attackVfx.destroy(); services().floatText?.setAvoidProvider(null); }

  private createGeneralView(faction: Faction): GeneralView {
    this.ensureRoots();

    const worldNode = new Node(`General_${faction}`);
    worldNode.layer = Layers.Enum.DEFAULT;
    this.worldRoot!.addChild(worldNode);

    const shadowNode = new Node("GeneralShadow");
    shadowNode.layer = Layers.Enum.DEFAULT;
    worldNode.addChild(shadowNode);
    shadowNode.setPosition(0, -(this.unitHeight * this.generalScaleMultiplier * 0.5) + 0.008, 0);
    shadowNode.setScale(new Vec3(0.28, 1.0, 0.22));
    const shadowMr = shadowNode.addComponent(MeshRenderer);
    shadowMr.mesh = this.discMesh ?? this.cubeMesh;
    const shadowMat = new Material();
    shadowMat.initialize({ effectName: 'builtin-unlit', technique: 1, states: { rasterizerState: { cullMode: gfx.CullMode.NONE } }});
    shadowMat.setProperty('mainColor', new Color(0, 0, 0, 90));
    shadowMr.setSharedMaterial(shadowMat, 0);

    const bodyNode = new Node("Body");
    bodyNode.layer = Layers.Enum.DEFAULT;
    worldNode.addChild(bodyNode);
    const mr = bodyNode.addComponent(MeshRenderer);
    mr.mesh = this.cubeMesh;
    
    // 使用 MaterialSystem 取代 createSolidMaterial
    const generalId = `General_${faction}`;
    services().material.bindUnit(generalId, "unit-base", mr);
    const outfitConfig = services().material.captureOutfit(generalId, "unit-base");
    outfitConfig.primaryColor = faction === Faction.Player ? [0.18, 0.82, 0.47, 1] : [0.92, 0.43, 0.43, 1];
    services().material.applyOutfit(generalId, "unit-base", outfitConfig);

    const labelNode = new Node(`GeneralLabel_${faction}`);
    labelNode.layer = this.canvasNode?.layer ?? Layers.Enum.UI_2D;
    this.uiRoot?.addChild(labelNode);
    const badge = this.buildBadge(labelNode, GENERAL_PLATE_WIDTH, GENERAL_PLATE_HEIGHT);
    // 武將 HUD 標籤陣營色：玩家藍、敵軍紅
    badge.typeLabel.color = faction === Faction.Enemy
      ? new Color(255, 130, 130, 255)
      : new Color(160, 200, 255, 255);
    const ring = this.buildVitalityRing(labelNode, GENERAL_PLATE_WIDTH);
    // 名牌上排（血量列）底緣在 y=2；細條貼在其正下方，名牌整體縮 0.7，6 單位約為畫面 4px
    const vitalityStrip = new GeneralVitalityStrip(labelNode, { y: -3, width: 176, height: 6 });

    const modelRoot = new Node("ModelRoot");
    modelRoot.layer = Layers.Enum.DEFAULT;
    modelRoot.active = false;
    worldNode.addChild(modelRoot);

    const view: GeneralView = {
      worldNode,
      bodyNode,
      modelRoot,
      labelNode,
      attackLabel: badge.attackLabel,
      typeLabel: badge.typeLabel,
      hpLabel: badge.hpLabel,
      labelOpacity: badge.opacity,
      vitalityRing: ring.graphics,
      vitalityText: ring.label,
      vitalityStrip,
      faction,
      usingHeroModel: false,
      heroLoading: false,
    };

    bodyNode.active = false;

    void this.ensureGeneralHeroModel(view, faction);

    return view;
  }

  private removeGeneralView(faction: Faction): void {
    const view = this.generalViews.get(faction);
    if (!view) return;
    services().material.releaseUnit(`General_${faction}`);
    this.spineUnits.remove(`general:${faction}`);
    view.worldNode.destroy();
    view.labelNode.destroy();
    this.generalViews.delete(faction);
  }

  /**
   * 名牌優先（PROG-2-9434）：部隊集中在武將附近時，部隊頭頂資訊框會壓到武將名牌（能量環、將血量、精力條）。
   * 名牌排到最上層；與名牌重疊的部隊框往上或往下推開（取較短方向），位移平滑逼近，避免部隊走動時跳動。
   * 部隊框位置每幀由投影重設，這裡在投影後加位移，不會累積。
   */
  private avoidGeneralPlates(dt: number): void {
    const plates = this.plateRectsBuf;
    plates.length = 0;
    // 名牌只排到最上層部隊框之上；之後加進來的傷害跳字等特效仍在名牌之上
    let topUnitIndex = -1;
    this.unitViews.forEach((view) => {
      if (view.labelNode.parent === this.uiRoot) topUnitIndex = Math.max(topUnitIndex, view.labelNode.getSiblingIndex());
    });
    this.generalViews.forEach((view) => {
      const label = view.labelNode;
      if (!label.active) return;
      if (label.getSiblingIndex() < topUnitIndex) label.setSiblingIndex(topUnitIndex);
      const s = label.scale.x;
      // 名牌本體寬 186＋底板 10；左側另有能量環（見 buildVitalityRing 的位置）
      const left = (GENERAL_PLATE_WIDTH / 2 + 5 + VITALITY_RING_RADIUS + 8 + VITALITY_RING_RADIUS + 6) * s;
      const right = (GENERAL_PLATE_WIDTH + 10) / 2 * s;
      const halfH = (GENERAL_PLATE_HEIGHT * 2 + 10) / 2 * s;
      plates.push({ x: label.position.x + (right - left) / 2, y: label.position.y, halfW: (left + right) / 2, halfH });
    });
    // PROG-2-9440：部隊框彼此也錯開；剛受擊的框先擺（留原位），其他框讓開
    this.badgeClock += dt > 0 ? dt : 0;
    const entries = this.badgeEntriesBuf;
    entries.length = 0;
    this.unitViews.forEach((view, unitId) => {
      const label = view.labelNode;
      if (!label.active) return;
      const tf = label.getComponent(UITransform);
      const s = label.scale.x;
      const p = label.position;
      const hitAt = this.lastHitAt.get(unitId);
      entries.push({
        id: unitId,
        rect: tf ? badgeRectFromExtent(p.x, p.y, s, this.badgeLocalExtent(view, tf)) : { x: p.x, y: p.y, halfW: 63, halfH: 31 },
        priority: hitAt !== undefined && this.badgeClock - hitAt < BADGE_HIT_PRIORITY_SEC ? 1 : 0,
      });
    });
    const targets = stackBadgeOffsets(entries, plates);
    this.unitViews.forEach((view, unitId) => {
      const label = view.labelNode;
      const current = this.plateAvoidOffsets.get(unitId) ?? 0;
      if (!label.active) {
        if (current !== 0) this.plateAvoidOffsets.delete(unitId);
        return;
      }
      const next = easePlateOffset(current, targets.get(unitId) ?? 0, dt);
      if (next === 0) { this.plateAvoidOffsets.delete(unitId); return; }
      this.plateAvoidOffsets.set(unitId, next);
      const p = label.position;
      label.setPosition(p.x, p.y + next, p.z);
    });
    for (const unitId of this.plateAvoidOffsets.keys()) {
      if (!this.unitViews.has(unitId)) this.plateAvoidOffsets.delete(unitId);
    }
    for (const unitId of this.lastHitAt.keys()) {
      if (!this.unitViews.has(unitId)) this.lastHitAt.delete(unitId);
    }
  }

  /**
   * 部隊框在名牌本地座標的完整外框（PROG-2-9701）：框本體＋上方血條＋狀態圖示列。
   * 9440 只算框本體，血條與「士／命」圖示會壓到上方的框。
   */
  private badgeLocalExtent(view: UnitView, tf: UITransform): LocalExtent {
    const halfW = (tf.contentSize.width + 10) / 2;
    const halfH = tf.contentSize.height / 2;
    let ext: LocalExtent = { left: -halfW, right: halfW, top: halfH, bottom: -halfH };
    const bar = view.hpBar?.node;
    if (bar?.active) ext = { ...ext, top: Math.max(ext.top, bar.position.y + HP_BAR_HEIGHT / 2) };
    return unionExtent(ext, view.statusBar?.localExtent() ?? null);
  }

  /** 受擊時記下時間並把框排到部隊框最上層（不蓋過傷害跳字等特效；PROG-2-9440） */
  private markBadgeHit(unitId: string): void {
    this.lastHitAt.set(unitId, this.badgeClock);
    const label = this.unitViews.get(unitId)?.labelNode;
    if (!label?.isValid || label.parent !== this.uiRoot) return;
    let topUnitIndex = -1;
    this.unitViews.forEach((view) => {
      if (view.labelNode.parent === this.uiRoot) topUnitIndex = Math.max(topUnitIndex, view.labelNode.getSiblingIndex());
    });
    if (label.getSiblingIndex() < topUnitIndex) label.setSiblingIndex(topUnitIndex);
    this.badgeLayers?.bringToFront(label);
  }

  /** QA／測試：部隊框目前的避讓位移 */
  public debugPlateAvoidOffsets(): Record<string, number> {
    return Object.fromEntries(this.plateAvoidOffsets);
  }

  private projectClampedGeneralLabel(view: GeneralView): Vec3 {
    this.projectWorldLabel(view.worldNode, view.labelNode, this.labelHeight + 0.28);
    const rootSize = this.uiRoot?.getComponent(UITransform)?.contentSize;
    const pos = view.labelNode.position;
    const clamped = clampGeneralOverlayPosition(pos.x, pos.y, rootSize?.width, rootSize?.height);
    if (clamped.x !== pos.x || clamped.y !== pos.y) {
      view.labelNode.setPosition(clamped.x, clamped.y, pos.z);
    }
    return view.labelNode.position;
  }

  private projectWorldLabel(worldNode: Node, labelNode: Node, yOffset: number): void {
    if (!this.uiRoot || !this.worldCamera || !this.canvasNode) return;

    // 加上高度偏移後投影到螢幕空間
    const worldPos = worldNode.getWorldPosition(this.labelWorldPosBuf);
    worldPos.y += yOffset;

    // 引擎 API 同時處理 UI 相機與 Canvas 縮放；不可拿3D螢幕深度交給UI相機screenToWorld。
    this.projectToOverlay(worldPos, labelNode);
  }

  private createUnitView(unit: TroopUnit): UnitView {
    this.ensureRoots();

    const worldNode = new Node(`Unit_${unit.id}`);
    worldNode.layer = Layers.Enum.DEFAULT;
    this.worldRoot!.addChild(worldNode);
    // 第一個 playDeploy 可能要等模型下載；不能讓名牌先停在世界原點。
    const initialPosition = this.getUnitWorldPosition(unit.lane, unit.depth);
    if (initialPosition) worldNode.setWorldPosition(initialPosition);

    // 效果層：bump / recoil / charge 動畫在此子節點的 local position 播放，
    // 父節點 worldNode 的 worldPosition tween（移動）永遠不受影響。
    // 對照 Unity：就像在 Visual Object 子節點上播受擊動畫，Root 移動不中斷。
    const visualNode = new Node("Visual");
    visualNode.layer = Layers.Enum.DEFAULT;
    worldNode.addChild(visualNode);

    // 陰影（blob shadow）：不再建立於整體 WorldNode，改為掛載在每個士兵腳下或將軍腳下，以避免位置偏差
    // -- 此段移除 --

    // 主體
    const bodyNode = new Node("Body");
    bodyNode.layer = Layers.Enum.DEFAULT;
    visualNode.addChild(bodyNode);
    const mr = bodyNode.addComponent(MeshRenderer);
    mr.mesh = this.cubeMesh;
    services().material.bindUnit(`${unit.id}_body`, "unit-base", mr);

    // 配件 (Accent)
    const accentNode = new Node("Accent");
    accentNode.layer = Layers.Enum.DEFAULT;
    visualNode.addChild(accentNode);
    const accentMr = accentNode.addComponent(MeshRenderer);
    accentMr.mesh = this.cubeMesh;
    services().material.bindUnit(`${unit.id}_accent`, "unit-base", accentMr);

    // 陣營外發光環 Faction Ring
    const ringNode = new Node("FactionRing");
    ringNode.layer = Layers.Enum.DEFAULT;
    worldNode.addChild(ringNode);
    // 稍微高於陰影避免 z-fighting，並壓扁
    ringNode.setPosition(0, -(this.unitHeight * 0.5) + 0.02, 0);
    ringNode.setScale(new Vec3(0.85, 0.2, 0.85)); // 縮小六邊形底盤
    const ringMr = ringNode.addComponent(MeshRenderer);
    ringMr.mesh = this.ringMesh ?? this.cubeMesh; // 若 mesh 初始化失敗仍有備案
    const ringMat = new Material();
    ringMat.initialize({
      effectName: 'builtin-unlit',
      technique: 1, // transparent
      states: { rasterizerState: { cullMode: gfx.CullMode.NONE } },
    });
    // 給予透明陣營色
    if (unit.faction === Faction.Player) {
      ringMat.setProperty('mainColor', new Color(80, 160, 255, 180)); // 我軍藍發光
    } else {
      ringMat.setProperty('mainColor', new Color(255, 80, 80, 180));  // 敵軍紅發光
    }
    ringMr.setSharedMaterial(ringMat, 0);

    const raftNode = new Node("Raft");
    raftNode.layer = Layers.Enum.DEFAULT;
    worldNode.addChild(raftNode);
    const raftMr = raftNode.addComponent(MeshRenderer);
    raftMr.mesh = this.cubeMesh ?? this.discMesh;
    raftMr.setSharedMaterial(this.getFloodRaftMaterial(), 0);
    raftNode.active = false;

    const formationRoot = new Node("Formation");
    formationRoot.layer = Layers.Enum.DEFAULT;
    formationRoot.active = false;
    visualNode.addChild(formationRoot);

    // 套用陣營配色 (Tier 1)
    const outfitConfig = services().material.captureOutfit(`${unit.id}_body`, "unit-base");
    if (unit.faction === Faction.Player) {
      outfitConfig.primaryColor = [0.15, 0.45, 1.0, 1]; // 我軍藍 bottom pad
      services().material.applyOutfit(`${unit.id}_body`, "unit-base", outfitConfig);
      
      outfitConfig.primaryColor = [0.8, 0.3, 0.3, 1]; // 配件對比色
      services().material.applyOutfit(`${unit.id}_accent`, "unit-base", outfitConfig);
    } else {
      outfitConfig.primaryColor = [0.8, 0.3, 0.3, 1]; // 敵軍紅
      services().material.applyOutfit(`${unit.id}_body`, "unit-base", outfitConfig);

      outfitConfig.primaryColor = [0.2, 0.7, 0.4, 1]; // 配件對比色
      services().material.applyOutfit(`${unit.id}_accent`, "unit-base", outfitConfig);
    }

    // 合批圖層要排在徽章節點之前建立：武將名牌以「最上層部隊徽章節點」為基準往上排，才會蓋在圖層之上
    const badgeLayers = this.ensureBadgeLayers();
    const labelNode = new Node(`UnitLabel_${unit.id}`);
    labelNode.layer = this.canvasNode?.layer ?? Layers.Enum.UI_2D;
    this.uiRoot?.addChild(labelNode);
    const badge = this.buildBadge(labelNode, 170, 34, unit.type, badgeLayers);
    const hpBar = this.buildHpBar(labelNode, 34 + 5);

    // 敵軍單位：HUD 上方標籤顯示紅色，不需修改 badge.hpLabel（已是豉紅）
    if (unit.faction === Faction.Enemy) {
      badge.typeLabel.color = new Color(255, 130, 130, 255);
      if (badge.bottomNameLabel) {
        badge.bottomNameLabel.color = new Color(255, 160, 160, 255);
      }
    }

    const view: UnitView = {
      worldNode,
      visualNode,
      bodyNode,
      ringNode,
      raftNode,
      accentNode,
      formationRoot,
      labelNode,
      attackLabel: badge.attackLabel,
      typeLabel: badge.typeLabel,
      hpLabel: badge.hpLabel,
      labelOpacity: badge.opacity,
      bottomNameLabel: badge.bottomNameLabel,
      hpBar,
      statusBar: new UnitStatusIconBar(labelNode, STATUS_ICON_START_X, STATUS_ICON_Y),
      statusKinds: null,
      pendingStatusPulse: null,
      troopType: unit.type,
      usingTroopFormation: false,
    };

    void this.ensureTroopFormation(view, unit);

    return view;
  }

  private updateUnitView(view: UnitView, unit: TroopUnit): void {
    const worldPos = this.getUnitWorldPosition(unit.lane, unit.depth);
    if (worldPos && !this.movingUnits.has(unit.id)) {
      view.worldNode.setWorldPosition(worldPos);
    }

    const profile = this.getShapeProfile(unit.type);
    if (view.usingTroopFormation) {
      // formation 模式：隱藏所有 cube fallback 顯示
      view.accentNode.active = false;
      view.bodyNode.active = false;
      view.formationRoot.active = true;
      if (view.usingGeneralPawn) view.formationRoot.setPosition(0, -this.unitHeight * 0.5, 0);
      else this.applyTroopFormationTransform(view, unit);
      view.worldNode.setScale(Vec3.ONE);
    } else {
      view.bodyNode.active = !view.formationLoading;
      view.accentNode.active = !view.formationLoading;
      view.formationRoot.active = false;
      view.bodyNode.setScale(profile.bodyScale);
      view.bodyNode.setPosition(0, 0, 0); // 重置 cube 位置（formation 底板與 cube 共用 bodyNode）
      view.accentNode.setScale(profile.accentScale);
      view.accentNode.setPosition(profile.accentOffset);
      view.accentNode.setRotationFromEuler(profile.accentRotation);
      view.worldNode.setScale(new Vec3(this.unitScale, this.unitHeight, this.unitScale));
      void this.ensureTroopFormation(view, unit);
    }
    this.applyPlayerVision(view, unit);

    const attackBonus = unit.getEffectiveAttack() - unit.attack;
    const hpBonus = unit.getEffectiveMaxHp() - unit.maxHp;
    // 主戰場UI規格書 §3.1：Buff 帶來的數值變化顯示成「35 (+10)」（PROG-2-1870）
    const isGeneral = this.isGeneralAvatarUnit(unit);
    view.attackLabel.string = statWithBonusText(unit.getEffectiveAttack(), attackBonus, isGeneral ? "攻 " : "");
    view.typeLabel.string = isGeneral ? "將" : troopTypeGlyph(unit.type);
    // PROG-2-9731：治療三步——血條最後才升，期間顯示治療前的血量（別處刷新也不會提早跳）
    const shownHp = this.healHolds.get(unit.id) ?? unit.currentHp;
    view.hpLabel.string = statWithBonusText(Math.max(0, shownHp), hpBonus, isGeneral ? "命 " : "");
    // PROG-2-9422（Q-C1 選 A）：攻擊疊到 2 倍以上變金、4 倍以上變紅加脈動光環，敵我都適用
    const surgeTier = attackSurgeTier(unit.getEffectiveAttack(), unit.attack, this.attackSurgeConfig);
    view.attackLabel.color = surgeTier === "none" ? this.statToneColor(statBonusTone(attackBonus)) : this.attackSurgeColor(surgeTier);
    this.applyAttackSurgeGlow(view, surgeTier === "red");
    view.hpLabel.color = this.statToneColor(statBonusTone(hpBonus));
    view.troopType = unit.type;
    view.labelOpacity.opacity = 255;
    const hpState = unitHpBarState(shownHp, unit.getEffectiveMaxHp(), unit.faction === Faction.Player);
    if (view.hpState) view.hpChip = hpChipOnChange(view.hpChip ?? null, view.hpState.ratio, hpState.ratio);
    view.hpState = hpState;
    this.drawHpBar(view.hpBar, hpState, view.hpChip?.lag);
    this.refreshStatusIcons(view, unit);

    // 更新下排兵種名稱（小兵顯示完整對應名稱，將軍化身則顯示「將」）
    if (view.bottomNameLabel) {
      view.bottomNameLabel.string = this.isGeneralAvatarUnit(unit)
        ? `${this.latestState?.getGeneral(unit.faction)?.name ?? unit.name}（主將棋子）`
        : view.formationLoading ? `${unit.name}（模型載入中）`
          : view.formationLoad && !view.usingTroopFormation ? `${unit.name}（戰術棋子）` : unit.name;
    }

    this.updateFloodRaft(view, unit);

    // worldNode 統一控制所有單位面向（cube placeholder 與 formation 模式皆相同）
    // formationRoot 不再負責旋轉，各 soldier 以 0° local rotation 繼承 worldNode 方向
    this.alignNodeToFactionFacing(view.worldNode, unit.faction);
    this.projectWorldLabel(view.worldNode, view.labelNode, this.labelHeight);
  }

  // ── PROG-2-9731 戰場 UI 演出（名牌戰鬥淡出、毒上身、治療光）──────────────

  /** 攻擊／受擊演出開始：名牌淡出（可重入，與 endCombatPresentation 成對） */
  public beginCombatPresentation(): void { this.plateFade.begin(); }
  public endCombatPresentation(): void { this.plateFade.end(); }
  /** 佇列清空或治療要讓玩家看血條時：放掉所有淡出計數，名牌馬上開始淡回 */
  public releaseNameplateFade(): void { this.plateFade.releaseNow(); }
  /** 治療事件一到先把該單位的顯示血量定在治療前，等血條那一步才放開（只記第一次，連續治療不被覆蓋） */
  public holdHealHp(unitId: string, hpBefore: number): void { if (!this.healHolds.has(unitId)) this.healHolds.set(unitId, hpBefore); }
  /** 放開血量定格；不帶 id 放開全部（演出佇列結束的保底，避免血條卡在舊值） */
  public releaseHealHp(unitId?: string): void { if (unitId === undefined) this.healHolds.clear(); else this.healHolds.delete(unitId); }
  /** QA 用：目前名牌不透明度比例（0~1） */
  public debugNameplateAlpha(): number { return this.plateFade.alpha; }

  /** 每幀把淡出比例套到所有名牌；已陣亡淡出中的名牌與倒地隱藏（opacity 0）的主將名牌不動 */
  private applyNameplateFade(dt: number): void {
    const a = this.plateFade.step(dt);
    const faded = a < 0.999;
    if (!faded && !this.plateFadeApplied) return;
    const v = faded ? Math.round(a * 255) : 255;
    this.unitViews.forEach((view, id) => {
      if (this.dyingUnits.has(id) || !isValid(view.labelOpacity)) return;
      view.labelOpacity.opacity = v;
    });
    this.generalViews.forEach((view) => {
      if (!isValid(view.labelOpacity) || view.labelOpacity.opacity === 0) return;
      view.labelOpacity.opacity = v;
    });
    this.plateFadeApplied = faded;
  }

  private glowPool(): UnitFeedbackGlowPool {
    if (!this.feedbackGlows) this.feedbackGlows = new UnitFeedbackGlowPool(() => this.uiRoot, () => this.canvasNode?.layer ?? Layers.Enum.UI_2D);
    return this.feedbackGlows;
  }

  /** QA 用：色光累計播放次數 */
  public debugGlowPlayCount(): number { return this.feedbackGlows?.playCount ?? 0; }

  /** 毒箭上身：受擊者身上罩一團紫綠光（顏色、大小、秒數見 battle-ui-feedback.json poisonHit） */
  public playPoisonHit(unitId: string): void {
    const view = this.unitViews.get(unitId);
    if (!view) return;
    const foot = this.unitGroundFoot(view);
    if (!foot) return;
    const c = getBattleUiFeedback().poisonHit;
    this.glowPool().play(foot.x, foot.y, { fill: c.flashFillColor, edge: c.flashEdgeColor, peakAlpha: c.flashPeakAlpha, sec: c.flashSec, radiusX: c.flashRadiusX, radiusY: c.flashRadiusY, rise: c.flashRise });
  }

  /** 治療光：綠白光暈由下往上升（治療三步的第一步） */
  public playHealLight(unitId: string): void {
    const view = this.unitViews.get(unitId);
    if (!view) return;
    const foot = this.unitGroundFoot(view);
    if (!foot) return;
    const c = getBattleUiFeedback().heal;
    this.glowPool().play(foot.x, foot.y, { fill: c.lightFillColor, edge: c.lightEdgeColor, peakAlpha: c.lightPeakAlpha, sec: c.lightSec, radiusX: c.lightRadiusX, radiusY: c.lightRadiusY, rise: c.lightRise });
  }

  /** 治療綠字（第二步）；與 playValueChange 的 heal 一樣走 'heal' 類型，但不帶受擊小跳 */
  public playHealFloat(unit: TroopUnit | null, amount: number): void {
    if (!unit) return;
    const worldPos = this.getUnitWorldPosition(unit.lane, unit.depth);
    if (!worldPos) return;
    this.spawnFloatText(`+${amount}`, 'heal', worldPos, unit.id);
  }

  /** 狀態字用毒紫綠類型（毒箭上身） */
  public playPoisonFloat(lane: number, depth: number, text: string): void {
    const worldPos = this.getUnitWorldPosition(lane, depth);
    if (!worldPos) return;
    this.spawnFloatText(text, 'poison', worldPos);
  }

  /**
   * 盤點單位狀態並更新頭頂小圖示（PROG-2-9399）。
   * updateUnitView 只在狀態刷新事件時呼叫；簽名沒變不重畫。新增狀態時圖示彈出＋腳下光環。
   */
  private refreshStatusIcons(view: UnitView, unit: TroopUnit): void {
    const ctx = buildUnitStatusContext(unit, this.latestState, services().buff.getBuffs(unit.id));
    const list = computeUnitStatusIcons(unit, ctx);
    const { changed } = view.statusBar.apply(list);
    const gained = changed ? newlyGainedKinds(view.statusKinds, list.allKinds) : [];
    if (changed) view.statusKinds = list.allKinds;
    const pending = view.pendingStatusPulse;
    view.pendingStatusPulse = null;
    if (gained.length === 0 && !pending) return;

    const tones = gainedTones(gained);
    if (gained.length > 0) view.statusBar.pop(gained);
    else view.statusBar.pop(null); // 只有外部要求（吃到格子 buff）時，整排輕彈一次
    if (!view.labelNode.active) return;
    // 同時有增益與減益時各放一圈；外部要求的色別補在沒有的那一邊
    const wantBuff = tones.buff || pending === 'buff';
    const wantDebuff = tones.debuff || pending === 'debuff';
    this.playStatusHalo(view, wantBuff, wantDebuff);
  }

  private playStatusHalo(view: UnitView, buff: boolean, debuff: boolean): void {
    if (!this.uiRoot) return;
    if (!this.statusHalos) this.statusHalos = new StatusHaloPool(() => this.uiRoot, () => this.canvasNode?.layer ?? Layers.Enum.UI_2D);
    const foot = this.unitGroundFoot(view);
    if (!foot) return;
    if (buff) this.statusHalos.play(foot.x, foot.y, false);
    if (debuff) this.statusHalos.play(foot.x, foot.y, true);
  }

  /**
   * 單位踩到地形 buff 格拿到效果時呼叫（BattleUIBridge）：下一次刷新補播圖示彈出與腳下光環。
   * 若同一次刷新已因新增圖示而播過，不會重複（pending 只在沒有新增時才補播）。
   */
  public playStatusGain(unitId: string, isDebuff: boolean): void {
    const view = this.unitViews.get(unitId);
    if (!view) return;
    view.pendingStatusPulse = isDebuff ? 'debuff' : 'buff';
  }

  /**
   * 吃到 buff 格（PROG-2-9411）：格子上的圖示飛到單位頭頂圖示列，抵達時頭頂整排彈一下、腳下亮光環。
   * 要在刷新畫面（標記被收起）之前呼叫；那格沒有標記或單位已不在畫面上時，退回原本的刷新時補播。
   */
  public playTileBuffPickup(unitId: string, lane: number, depth: number, badge: TileBuffBadge, factor: number): void {
    const view = this.unitViews.get(unitId);
    // 吃到的當下：部隊腳下播 2.5 秒大特效（跟著部隊走，依倍率分級）；與頭頂圖示飛入互不等待
    if (view) this.unitBuffPickupVfx.play(unitId, () => (isValid(view.worldNode) ? this.unitGroundFoot(view) : null), badge.kind.startsWith('attack') ? 'attack' : 'hp', badge.isDebuff, factor);
    const from = this.tileBuffMarkers.iconPositionOf({ lane, depth }, this.tileBuffFlyFrom);
    if (!view || !from || !view.labelNode.active) { this.playStatusGain(unitId, badge.isDebuff); return; }
    const target = (): Vec3 | null => {
      const label = view.labelNode;
      if (!isValid(label)) return null;
      const k = label.scale.x || 1;
      const p = label.position;
      return this.tileBuffFlyTo.set(p.x + (STATUS_ICON_START_X + STATUS_ICON_SIZE / 2) * k, p.y + STATUS_ICON_Y * k, 0);
    };
    this.tileBuffMarkers.flyPickup(from, badge, target, () => {
      if (!isValid(view.labelNode)) return;
      view.statusBar.pop(null);
      this.playStatusHalo(view, !badge.isDebuff, badge.isDebuff);
    });
  }

  /** 頭頂血條節點：放在名牌上緣之上（主戰場UI規格書 §3.1，PROG-2-1874） */
  private buildHpBar(labelNode: Node, badgeHalfHeight: number): Graphics {
    const barNode = new Node("HpBar");
    barNode.layer = labelNode.layer;
    labelNode.addChild(barNode);
    barNode.addComponent(UITransform).setContentSize(HP_BAR_WIDTH, HP_BAR_HEIGHT);
    barNode.setPosition(0, badgeHalfHeight + 4 + HP_BAR_HEIGHT / 2, 0);
    barNode.active = false;
    return barNode.addComponent(Graphics);
  }

  /** 推進各單位的掉血殘影並重畫（PROG-2-9412）；沒有殘影的單位不動。 */
  private stepHpChips(dt: number): void {
    for (const view of this.unitViews.values()) {
      if (!view.hpChip || !view.hpState) continue;
      view.hpChip = stepHpChip(view.hpChip, view.hpState.ratio, dt);
      if (view.hpBar?.isValid) this.drawHpBar(view.hpBar, view.hpState, view.hpChip?.lag);
    }
  }

  /** 受傷才顯示；我方藍、敵方紅。chipRatio：掉血殘影右端（PROG-2-9412），畫在主血條後面的淺色段。 */
  private drawHpBar(g: Graphics, state: UnitHpBarState, chipRatio?: number): void {
    g.node.active = state.visible;
    if (!state.visible) return;
    const x = -HP_BAR_WIDTH / 2;
    const y = -HP_BAR_HEIGHT / 2;
    g.clear();
    g.fillColor = new Color(22, 15, 9, 220);
    g.roundRect(x - 2, y - 2, HP_BAR_WIDTH + 4, HP_BAR_HEIGHT + 4, 3);
    g.fill();
    // 金色細框（PROG-2-9705），與名牌金圈同色
    g.lineWidth = 1.5;
    g.strokeColor = BADGE_RING;
    g.roundRect(x - 2, y - 2, HP_BAR_WIDTH + 4, HP_BAR_HEIGHT + 4, 3);
    g.stroke();
    if (chipRatio !== undefined && chipRatio > state.ratio) {
      g.fillColor = HP_BAR_CHIP_COLOR;
      g.rect(x, y, HP_BAR_WIDTH * Math.min(1, chipRatio), HP_BAR_HEIGHT);
      g.fill();
    }
    g.fillColor = HP_BAR_COLOR[state.tone];
    g.rect(x, y, HP_BAR_WIDTH * state.ratio, HP_BAR_HEIGHT);
    g.fill();
  }

  /** 名牌左側精力能量環（武將壽命系統 §UI，PROG-2-1853）：底環＋精力弧＋百分比 */
  private buildVitalityRing(labelNode: Node, badgeWidth: number): { graphics: Graphics; label: Label } {
    const ringNode = new Node("VitalityRing");
    ringNode.layer = labelNode.layer;
    labelNode.addChild(ringNode);
    ringNode.setPosition(-(badgeWidth / 2 + 5 + VITALITY_RING_RADIUS + 8), 0, 0);
    ringNode.addComponent(UITransform).setContentSize(VITALITY_RING_RADIUS * 2 + 12, VITALITY_RING_RADIUS * 2 + 12);
    const graphics = ringNode.addComponent(Graphics);

    const textNode = new Node("VitalityText");
    textNode.layer = labelNode.layer;
    ringNode.addChild(textNode);
    textNode.addComponent(UITransform).setContentSize(VITALITY_RING_RADIUS * 2 - 6, 24);
    const label = textNode.addComponent(Label);
    label.fontSize = 17;
    label.lineHeight = 20;
    label.isBold = true;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.enableOutline = true;
    label.outlineColor = BADGE_TEXT_OUTLINE;
    label.outlineWidth = 2;
    return { graphics, label };
  }

  private drawVitalityRing(view: GeneralView, ring: VitalityRingView): void {
    const g = view.vitalityRing;
    const [r, gr, b] = ring.color;
    g.clear();
    g.fillColor = BADGE_FILL;
    g.circle(0, 0, VITALITY_RING_RADIUS + 5);
    g.fill();
    g.lineWidth = 2.5;
    g.strokeColor = BADGE_RING;
    g.circle(0, 0, VITALITY_RING_RADIUS + 6);
    g.stroke();
    g.lineWidth = 6;
    g.strokeColor = new Color(70, 70, 70, 220);
    g.circle(0, 0, VITALITY_RING_RADIUS);
    g.stroke();
    if (ring.ratio > 0) {
      g.strokeColor = new Color(r, gr, b, 255);
      const start = Math.PI / 2;
      g.arc(0, 0, VITALITY_RING_RADIUS, start, start - ring.ratio * Math.PI * 2, false);
      g.stroke();
    }
    view.vitalityText.string = ring.text;
    view.vitalityText.color = ring.band === "exhausted" ? new Color(170, 170, 170, 255) : new Color(r, gr, b, 255);
  }

  /** 部隊徽章合批圖層（PROG-2-9713）：uiRoot 換了（重建戰場）就重建 */
  private ensureBadgeLayers(): BadgeBatchLayers | null {
    if (!this.uiRoot) return null;
    if (!this.badgeLayers || !this.badgeLayers.isValid || this.badgeLayers.bg.parent !== this.uiRoot) {
      this.badgeLayers = new BadgeBatchLayers(this.uiRoot, this.canvasNode?.layer ?? Layers.Enum.UI_2D);
    }
    return this.badgeLayers;
  }

  /** 底框精靈（九宮格，2 倍解析度縮 0.5）；底圖載好才指定 SpriteFrame；圓章改由 TroopTypeBadge 繪製（PROG-2-9724） */
  private addBadgeBgSprite(parent: Node, w: number, h: number): void {
    const node = new Node("Bg");
    node.layer = parent.layer;
    parent.addChild(node);
    node.setScale(BADGE_ATLAS_SCALE, BADGE_ATLAS_SCALE, 1);
    node.addComponent(UITransform).setContentSize(w / BADGE_ATLAS_SCALE, h / BADGE_ATLAS_SCALE);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.type = Sprite.Type.SLICED;
    void loadBadgeAtlasFrames().then((frames) => {
      if (frames && sprite.isValid) sprite.spriteFrame = frames.bg;
    });
  }

  /**
   * layers 有給（部隊徽章）時走分層合批：底框／圓章是共用底圖精靈、文字是 BITMAP 點陣快取，各自掛到共用圖層的代理節點；
   * rootNode 只保留位置、縮放、透明度與尺寸。沒給（武將名牌）時維持原本的 Graphics 版（PROG-2-9713）。
   */
  private buildBadge(rootNode: Node, width: number, height: number, troopType: TroopType | null = null,
    layers: BadgeBatchLayers | null = null): BadgeView {
    const rootTf = rootNode.addComponent(UITransform);
    rootTf.setContentSize(width, height * 2 + 10);
    const opacity = rootNode.addComponent(UIOpacity);
    opacity.opacity = 255;

    // 將 HUD 縮小 (原本尺寸偏大)
    rootNode.setScale(0.7, 0.7, 1);

    const bgParent = layers ? layers.proxyFor(rootNode, "bg") : rootNode;
    const textParent = layers ? layers.proxyFor(rootNode, "text") : rootNode;
    const bw = width + 10;
    const bh = height * 2 + 10;
    if (layers) {
      // 底框：與 Graphics 版同色同尺寸；外框描邊外擴 1.5，所以精靈比框大 3
      this.addBadgeBgSprite(bgParent, bw + 3, bh + 3);
    } else {
      // 背景底板：提升頭頂資訊可讀性
      const bgNode = new Node("Bg");
      bgNode.layer = rootNode.layer;
      rootNode.addChild(bgNode);
      const bgTf = bgNode.addComponent(UITransform);
      bgTf.setContentSize(bw, bh);
      const bgGraphics = bgNode.addComponent(Graphics);
      // 徽章底：深色底＋金圈外框＋內側淡金細線（PROG-2-9705）
      bgGraphics.fillColor = BADGE_FILL;
      bgGraphics.roundRect(-bw / 2, -bh / 2, bw, bh, 10);
      bgGraphics.fill();
      bgGraphics.lineWidth = 3;
      bgGraphics.strokeColor = BADGE_RING;
      bgGraphics.roundRect(-bw / 2, -bh / 2, bw, bh, 10);
      bgGraphics.stroke();
      bgGraphics.lineWidth = 1.5;
      bgGraphics.strokeColor = BADGE_RING_INNER;
      bgGraphics.roundRect(-bw / 2 + 4, -bh / 2 + 4, bw - 8, bh - 8, 7);
      bgGraphics.stroke();
    }

    const segmentHeight = height;
    let gap = 8;
    if (width > 180) gap = 12;

    // 上排：戰力 + 兵種符號 + 生命
    const totalGap = gap * 2;
    const sideWidth = Math.floor((width - 44 - totalGap) * 0.5);
    const centerWidth = width - sideWidth * 2 - totalGap;
    const offset = (centerWidth + gap) * 0.5 + sideWidth * 0.5;
    const topRowY = segmentHeight / 2 + 2;

    const attackLabel = this.createBadgeSegment(
      textParent,
      "AttackBadge",
      -offset,
      sideWidth,
      segmentHeight,
      new Color(69, 36, 94, 0),
      new Color(109, 255, 105, 255),
      22,
    );
    // 將上排三塊徽章上移
    attackLabel.node.parent!.setPosition(-offset, topRowY, 0);
    this.shrinkToFit(attackLabel);

    const typeLabel = this.createBadgeSegment(
      textParent,
      "TypeBadge",
      0,
      centerWidth,
      segmentHeight,
      new Color(36, 38, 44, 0),
      new Color(245, 245, 245, 255),
      18,
    );
    typeLabel.node.parent!.setPosition(0, topRowY, 0);
    // 兵種圓章：金圈深底圓（畫在兵種剪影／單字後面），由 TroopTypeBadge 統一繪製（PROG-2-9724）
    const discR = segmentHeight / 2 + 1;
    if (troopType) {
      // 底圖圓章直徑 40 ＝部隊徽章 discR 18 的 2 倍解析度換算
      const discSize = (discR / 18) * 40;
      const iconParent = layers ? layers.proxyFor(rootNode, "icon") : typeLabel.node.parent!;
      const iconNode = new Node("TypeIcon");
      iconNode.layer = iconParent.layer;
      iconParent.addChild(iconNode);

      const iconTf = iconNode.addComponent(UITransform);
      const iconSize = Math.max(18, Math.min(segmentHeight - 6, centerWidth - 8));
      iconTf.setContentSize(iconSize, iconSize);
      iconNode.setPosition(0, layers ? topRowY : 0, 0);

      const icon = iconNode.addComponent(Sprite);
      icon.type = Sprite.Type.SIMPLE;
      icon.sizeMode = Sprite.SizeMode.CUSTOM;
      icon.color = new Color(255, 255, 255, 255);

      // 剪影載入前先顯示單字；剪影到了才換圖（同一顆圓章）
      const badge = TroopTypeBadge.attach(icon, { size: discSize, discParent: layers ? bgParent : undefined, glyph: typeLabel });
      badge.setType(troopType);
    } else {
      const discNode = new Node("TypeDisc");
      discNode.layer = rootNode.layer;
      const typeSeg = typeLabel.node.parent!;
      typeSeg.insertChild(discNode, 0);
      discNode.addComponent(UITransform).setContentSize(segmentHeight + 8, segmentHeight + 8);
      const disc = discNode.addComponent(Graphics);
      disc.fillColor = BADGE_TYPE_DISC_FILL;
      disc.circle(0, 0, discR);
      disc.fill();
      disc.lineWidth = 2.5;
      disc.strokeColor = BADGE_RING;
      disc.circle(0, 0, discR);
      disc.stroke();
    }

    const hpLabel = this.createBadgeSegment(
      textParent,
      "HpBadge",
      offset,
      sideWidth,
      segmentHeight,
      new Color(44, 44, 48, 0),
      new Color(255, 104, 104, 255),
      22,
    );
    hpLabel.node.parent!.setPosition(offset, topRowY, 0);
    this.shrinkToFit(hpLabel);
    // 點陣快取（PROG-2-9713）：打包進動態圖集，徽章文字共用貼圖可合批；不用 CHAR 的原因見下方名稱標籤。
    // 必須在 SHRINK 設好之後才切：切換快取模式會立刻重排，若當下還是 NONE＋空字串，節點會被自動縮成寬 6，之後縮字就看不見
    // 兵種字只有一兩個字、徽章分段尺寸固定：也設成 SHRINK 固定外框，下面三個才能一起延後重排（PROG-2-9718）
    this.shrinkToFit(typeLabel);
    // 三個都是 SHRINK 固定外框：切快取模式的強制重排改標髒、幀末一次刷新（PROG-2-9718）
    for (const l of [attackLabel, typeLabel, hpLabel]) setCacheModeDeferred(l, Label.CacheMode.BITMAP);

    // 下排：完整兵種名稱（由 updateUnitView 動態更新）
    const nameLabelNode = new Node("NameLabel");
    nameLabelNode.layer = rootNode.layer;
    textParent.addChild(nameLabelNode);
    nameLabelNode.setPosition(0, -segmentHeight / 2 - 2, 0);
    const nameTf = nameLabelNode.addComponent(UITransform);
    nameTf.setContentSize(width, segmentHeight);
    const nameStrLabel = nameLabelNode.addComponent(Label);
    nameStrLabel.string = "";   // 顯式清空：Cocos Label 預設值為 "label"，避免未賦值時顯示佔位文字
    nameStrLabel.fontSize = 20;
    nameStrLabel.lineHeight = segmentHeight;
    nameStrLabel.horizontalAlign = HorizontalTextAlignment.CENTER;
    nameStrLabel.verticalAlign = VerticalTextAlignment.CENTER;
    nameStrLabel.color = new Color(255, 255, 255, 255);
    nameStrLabel.enableOutline = true;
    nameStrLabel.outlineColor = BADGE_TEXT_OUTLINE;
    nameStrLabel.outlineWidth = BADGE_TEXT_OUTLINE_WIDTH;
    // 點陣快取（PROG-2-9713）：畫好的字打包進動態圖集，所有徽章文字共用貼圖可合批。
    // 不用 CHAR：字元圖集是全專案共用的稀缺預算（見 UIPreviewStyleBuilder 的 charAtlasGuard），預算不足會被退回且數字會畫壞。
    // 外框固定（寬 width、高 segmentHeight）：過長的名稱縮字塞進徽章；SHRINK 先設好，切快取的重排才能延後（PROG-2-9718）
    this.shrinkToFit(nameStrLabel);
    setCacheModeDeferred(nameStrLabel, Label.CacheMode.BITMAP);

    // 以擴充屬性保存引用，供 updateUnitView 快速更新
    (rootNode as any)._bottomNameLabel = nameStrLabel;

    return { rootNode, attackLabel, typeLabel, hpLabel, opacity, bottomNameLabel: nameStrLabel };
  }

  private findUnitById(unitId: string): TroopUnit | null {
    return this.latestState?.units.get(unitId) ?? null;
  }

  private hasGeneralAvatarOnBoard(faction: Faction): boolean {
    const prefix = faction === Faction.Player ? "player-general-" : "enemy-general-";
    for (const unitId of this.unitViews.keys()) {
      if (unitId.startsWith(prefix)) {
        return true;
      }
    }
    return false;
  }

  /** 天生騎術表（data/riding-tiers.json 的 acquire.innate），讀一次；讀到前為 null，只看武將自己的 ridingTier。 */
  private innateRidingTiers: Record<string, number> | null = null;
  private innateRidingLoading = false;

  /** 開戰前就開始讀，讓第一次建立武將骨架時已拿到天生騎術表。 */
  private loadInnateRidingTiers(): void {
    if (this.innateRidingTiers || this.innateRidingLoading) return;
    this.innateRidingLoading = true;
    resources.load('data/riding-tiers', JsonAsset, (err, asset) => {
      if (err || !asset) return;
      this.innateRidingTiers = (asset.json as { acquire?: { innate?: Record<string, number> } })?.acquire?.innate ?? {};
    });
  }

  private generalSpine(general: { id: string; templateId?: string | null; ridingTier?: number }, _faction: Faction) {
    this.loadInnateRidingTiers();
    const tier = resolveRidingTier(general.id, general.ridingTier ?? 0, this.innateRidingTiers);
    return generalSpineConfig(general.id, general.templateId, tier, path => this.spineUnits.hasFailed(path));
  }

  private isGeneralAvatarUnit(unit: TroopUnit): boolean {
    return unit.id.startsWith("player-general-") || unit.id.startsWith("enemy-general-");
  }

  private createBadgeSegment(
    rootNode: Node,
    name: string,
    x: number,
    width: number,
    height: number,
    background: Color,
    textColor: Color,
    fontSize: number,
  ): Label {
    const segmentNode = new Node(name);
    segmentNode.layer = this.canvasNode?.layer ?? Layers.Enum.UI_2D;
    rootNode.addChild(segmentNode);
    segmentNode.setPosition(new Vec3(x, 0, 0));

    const tf = segmentNode.addComponent(UITransform);
    tf.setContentSize(width, height);

    // 全透明的底板看不到，卻仍佔一次繪製（每個名牌三塊）；透明時不建立（PROG-2-9310）
    if (background.a > 0) {
      const bgNode = new Node("Background");
      bgNode.layer = segmentNode.layer;
      segmentNode.addChild(bgNode);
      const bgTf = bgNode.addComponent(UITransform);
      bgTf.setContentSize(width, height);

      const graphics = bgNode.addComponent(Graphics);
      graphics.fillColor = background;
      graphics.roundRect(-width * 0.5, -height * 0.5, width, height, 7);
      graphics.fill();
    }

    const textNode = new Node("Text");
    textNode.layer = segmentNode.layer;
    segmentNode.addChild(textNode);
    const textTf = textNode.addComponent(UITransform);
    textTf.setContentSize(width, height);

    const label = textNode.addComponent(Label);
    label.string = "";
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 2;
    label.color = textColor;
    label.isBold = true;
    label.enableOutline = true;
    label.outlineColor = BADGE_TEXT_OUTLINE;
    label.outlineWidth = BADGE_TEXT_OUTLINE_WIDTH;
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    return label;
  }

  private resolveCombatNode(id: string | null): Node | null {
    if (!id) return null;
    // unitViews 包含一般小兵及武將化身（ID 格式："player-general-N" / "enemy-general-N"）
    return this.unitViews.get(id)?.worldNode ?? null;
  }

  private syncTileBuffViews(state: BattleState): void {
    this.tileBuffMarkers.sync(state.tileBuffs.values());
  }

  /**
   * 3D 世界點 → 螢幕 → Canvas 相機 → UnitOverlayRoot 本地座標。
   * 網頁建置下 convertToUINode 回傳以左下角為原點的座標，標籤整批偏到右上角（#2107-4／10），
   * 改走 worldToScreen + Canvas 相機 screenToWorld + convertToNodeSpaceAR；取不到 Canvas 相機才退回舊 API。
   */
  private projectToOverlay(worldPos: Vec3, target: Node): void {
    const point = typeof this.overlayPoint === 'function'
      ? this.overlayPoint(worldPos)
      : UnitRenderer.prototype.overlayPoint.call(this, worldPos);
    if (point) target.setPosition(point);
  }

  private overlayPoint(worldPos: Vec3): Vec3 | null {
    if (!this.uiRoot || !this.worldCamera) return null;
    const uiCamera = this.canvasNode?.getComponent(Canvas)?.cameraComponent;
    const rootTf = this.uiRoot.getComponent(UITransform);
    if (!uiCamera || !rootTf) {
      this.worldCamera.convertToUINode(worldPos, this.uiRoot, this.uiProjectionBuffer);
      return this.uiProjectionBuffer;
    }
    const screen = this.worldCamera.worldToScreen(worldPos, this.screenProjectionBuffer);
    screen.z = 0;
    uiCamera.screenToWorld(screen, this.uiProjectionBuffer);
    rootTf.convertToNodeSpaceAR(this.uiProjectionBuffer, this.uiProjectionBuffer);
    this.uiProjectionBuffer.z = 0;
    return this.uiProjectionBuffer;
  }

  /** 主將待命點的世界座標（己方底線外、中路），抬到身體高度；主將技能光效打在這裡（PROG-2-9365）。棋盤還沒建好時回傳 null。 */
  public getGeneralSidelineWorldPosition(faction: Faction): Vec3 | null {
    const ground = this.generalSidelineWorld(faction);
    if (!ground) return null;
    ground.y += this.unitHeight * 0.5;
    return ground;
  }

  private generalSidelineWorld(faction: Faction): Vec3 | null {
    const lane = Math.floor(GAME_CONFIG.GRID_LANES / 2);
    const frontDepth = faction === Faction.Player ? 0 : GAME_CONFIG.GRID_DEPTH - 1;
    const innerDepth = faction === Faction.Player ? 1 : GAME_CONFIG.GRID_DEPTH - 2;
    const front = this.getUnitWorldPosition(lane, frontDepth, 0);
    const inner = this.getUnitWorldPosition(lane, innerDepth, 0);
    if (!front || !inner) return null;
    return front.clone().subtract(inner.clone().subtract(front).multiplyScalar(1.05));
  }

  /** 主將待命點位於己方底線外；定位點為地面腳底。 */
  private generalSidelineFoot(faction: Faction): { x: number; y: number } | null {
    const world = this.generalSidelineWorld(faction);
    if (!world) return null;
    const p = this.overlayPoint(world);
    return p ? { x: p.x, y: p.y } : null;
  }

  /**
   * PROG-2-9715：格上主將的腳點。第一次出現時從待命點衝到格子（GENERAL_DASH_SEC 秒、先快後慢），之後就是格子腳點。
   * 衝刺期間 moving=true，疊層會播跑步、揚塵與腳步聲，跟小兵前進同一套。
   */
  private boardGeneralFoot(unitId: string, faction: Faction, view: UnitView, dt: number): { x: number; y: number } | null {
    const ground = this.unitGroundFoot(view);
    if (!ground) return null;
    let dash = this.generalDashes.get(unitId);
    if (!dash && !this.spineUnits.exists(unitId) && !this.generalStandees.has(unitId)) {
      const from = this.generalSidelineFoot(faction);
      if (from) { dash = { from, t: 0, wait: 0 }; this.generalDashes.set(unitId, dash); }
    }
    if (!dash) return ground;
    // 素材還在載入：先停在待命點，載好才起跑，玩家才看得到衝出去；載太久（GENERAL_DASH_WAIT_SEC）就放棄衝刺直接站格
    if (!this.spineUnits.isShown(unitId) && !this.generalStandees.has(unitId)) {
      dash.wait += Math.max(0, dt);
      if (dash.wait < GENERAL_DASH_WAIT_SEC) return dash.from;
      this.generalDashes.delete(unitId);
      return ground;
    }
    dash.t += Math.max(0, dt);
    const k = Math.min(1, dash.t / GENERAL_DASH_SEC);
    if (k >= 1) { this.generalDashes.delete(unitId); return ground; }
    const e = 1 - (1 - k) * (1 - k);
    return { x: dash.from.x + (ground.x - dash.from.x) * e, y: dash.from.y + (ground.y - dash.from.y) * e };
  }

  private unitGroundFoot(view: UnitView): { x: number; y: number } | null {
    const world = view.worldNode.getWorldPosition(this.labelWorldPosBuf);
    world.y -= this.unitHeight * 0.5;
    const p = this.overlayPoint(world);
    return p ? { x: p.x, y: p.y } : null;
  }

  private projectWorldPoint(worldPos: Vec3, targetNode: Node): void {
    if (!this.uiRoot || !this.worldCamera || !this.canvasNode) return;
    // 與單位名牌同一投影 API，免除每個 Buff 每幀搜尋 Canvas 的相機子樹。
    this.projectToOverlay(worldPos, targetNode);
  }

  private bumpNodeForward(node: Node, faction: Faction, distance: number): void {
    const visual = node.getChildByName("Visual");
    if (visual) {
      // worldNode 已經依據陣營轉向，使其 local 的 +X 軸正對著前方（敵方）
      // 因此在 Visual 的 local 空間中，往前衝就是沿著正 X 軸移動
      const ws = node.worldScale;
      // 攻擊方往前撞擊 -> 撞上後停頓(Hit Stop, 頓幀) -> 彈回
      const localBump = new Vec3(distance / ws.x, 0, 0);
      Tween.stopAllByTarget(visual);
      tween(visual)
        .to(BATTLE_VISUAL_TIMING.attackBumpForwardSec, { position: localBump }, { easing: "quadIn" })
        .delay(BATTLE_VISUAL_TIMING.attackHitStopSec) // 打擊頓幀
        .to(BATTLE_VISUAL_TIMING.attackRecoverSec, { position: new Vec3() }, { easing: "quadOut" })
        .start();
    } else {
      // 將軍節點（無 Visual 子節點）：直接動世界座標
      const worldPos = node.worldPosition;
      const forward = this.getBoardForwardVector(faction) || new Vec3(0, 0, 1);
      const bumpPos = worldPos.clone().add(forward.clone().normalize().multiplyScalar(distance));
      tween(node)
        .to(BATTLE_VISUAL_TIMING.attackBumpForwardSec, { worldPosition: bumpPos }, { easing: "quadIn" })
        .delay(BATTLE_VISUAL_TIMING.attackHitStopSec) // 打擊頓幀
        .to(BATTLE_VISUAL_TIMING.attackRecoverSec, { worldPosition: worldPos.clone() }, { easing: "quadOut" })
        .start();
    }
  }

  private recoilNode(node: Node, defenderFaction: Faction): void {
    const visual = node.getChildByName("Visual");
    if (visual) {
      // worldNode 已經轉向前方 (+X為正前)
      // 受擊彈退就是在 local 空間往 -X 移動
      const ws = node.worldScale;
      const localRecoil = new Vec3(-0.2 / ws.x, 0, 0);
      Tween.stopAllByTarget(visual);
      tween(visual)
        .delay(BATTLE_VISUAL_TIMING.recoilStartDelaySec) // 等待攻擊方撞過來才播放受擊
        .to(BATTLE_VISUAL_TIMING.recoilPushSec, { position: localRecoil }, { easing: "quadOut" }) // 擊退
        .delay(BATTLE_VISUAL_TIMING.recoilHitStopSec) // 受擊頓幀
        .to(BATTLE_VISUAL_TIMING.recoilRecoverSec, { position: new Vec3() }, { easing: "quadIn" }) // 歸位
        .start();
    } else {
      // 將軍節點（無 Visual 子節點）：直接動世界座標
      const worldPos = node.worldPosition;
      const forward = this.getBoardForwardVector(defenderFaction) || new Vec3(0, 0, 1);
      const recoilDir = forward.clone().multiplyScalar(-0.2);
      const recoilPos = worldPos.clone().add(recoilDir);
      tween(node)
        .delay(BATTLE_VISUAL_TIMING.recoilStartDelaySec)
        .to(BATTLE_VISUAL_TIMING.recoilPushSec, { worldPosition: recoilPos }, { easing: "quadOut" })
        .delay(BATTLE_VISUAL_TIMING.recoilHitStopSec)
        .to(BATTLE_VISUAL_TIMING.recoilRecoverSec, { worldPosition: worldPos.clone() }, { easing: "quadIn" })
        .start();
    }
  }

  private getShapeProfile(type: TroopType): UnitShapeProfile {
    if (type === TroopType.Cavalry) {
      return {
        bodyScale: new Vec3(0.78, 0.72, 1.35),
        accentScale: new Vec3(0.36, 0.42, 0.55),
        accentOffset: new Vec3(0, 0.28, 0.46),
        accentRotation: new Vec3(0, 0, 0),
      };
    }
    if (type === TroopType.Shield) {
      return {
        bodyScale: new Vec3(0.92, 1.02, 0.82),
        accentScale: new Vec3(0.42, 0.82, 0.18),
        accentOffset: new Vec3(0.45, 0.0, 0),
        accentRotation: new Vec3(0, 0, 0),
      };
    }
    if (type === TroopType.Archer) {
      return {
        bodyScale: new Vec3(0.72, 1.15, 0.62),
        accentScale: new Vec3(0.12, 0.85, 0.5),
        accentOffset: new Vec3(0.34, 0.05, 0),
        accentRotation: new Vec3(0, 0, 26),
      };
    }
    if (type === TroopType.Pikeman) {
      return {
        bodyScale: new Vec3(0.78, 1.08, 0.68),
        accentScale: new Vec3(0.1, 1.5, 0.1),
        accentOffset: new Vec3(0.38, 0.28, 0),
        accentRotation: new Vec3(0, 0, 20),
      };
    }
    if (type === TroopType.Engineer) {
      return {
        bodyScale: new Vec3(0.92, 0.82, 0.82),
        accentScale: new Vec3(0.48, 0.28, 0.48),
        accentOffset: new Vec3(-0.12, 0.48, 0),
        accentRotation: new Vec3(0, 0, 0),
      };
    }
    if (type === TroopType.Medic) {
      return {
        bodyScale: new Vec3(0.82, 1.0, 0.72),
        accentScale: new Vec3(0.24, 0.24, 0.24),
        accentOffset: new Vec3(0, 0.7, 0),
        accentRotation: new Vec3(0, 0, 45),
      };
    }
    if (type === TroopType.Navy) {
      return {
        bodyScale: new Vec3(1.25, 0.52, 1.1),
        accentScale: new Vec3(0.35, 0.58, 0.35),
        accentOffset: new Vec3(0, 0.34, 0),
        accentRotation: new Vec3(0, 0, 0),
      };
    }

    return {
      bodyScale: new Vec3(0.88, 0.98, 0.76),
      accentScale: new Vec3(0.2, 0.52, 0.2),
      accentOffset: new Vec3(0, 0.64, 0),
      accentRotation: new Vec3(0, 0, 0),
    };
  }

  /** 主將化身不可落入小兵 cube fallback；暫無對應模型時使用明示身分的通用戰術棋子。 */
  private ensureGeneralPawn(view: UnitView, unit: TroopUnit): void {
    if (view.usingTroopFormation) return;
    const material = view.bodyNode.getComponent(MeshRenderer)?.getSharedMaterial(0);
    const parts = [
      { name: 'GeneralPawnBody', mesh: utils.MeshUtils.createMesh(primitives.cylinder(0.16, 0.27, 0.44, { radialSegments: 12 })), y: 0.22 },
      { name: 'GeneralPawnHead', mesh: utils.MeshUtils.createMesh(primitives.sphere(0.18, { segments: 12 })), y: 0.61 },
    ];
    for (const part of parts) {
      const node = new Node(part.name);
      node.layer = Layers.Enum.DEFAULT;
      view.formationRoot.addChild(node);
      node.setPosition(0, part.y, 0);
      const renderer = node.addComponent(MeshRenderer);
      renderer.mesh = part.mesh;
      if (material) renderer.setSharedMaterial(material, 0);
    }
    view.usingGeneralPawn = true;
    view.usingTroopFormation = true;
    view.bodyNode.active = false;
    view.accentNode.active = false;
    view.formationRoot.active = true;
    UCUFLogger.info(LogCategory.BATTLE, `[UnitRenderer] 主將化身 ${unit.id} 使用通用戰術棋子（非角色專屬模型）`);
  }

  private ensureTroopFormation(view: UnitView, unit: TroopUnit): Promise<void> {
    if (this.isGeneralAvatarUnit(unit)) {
      this.ensureGeneralPawn(view, unit);
      return Promise.resolve();
    }
    if (view.usingTroopFormation || view.formationRoot.children.length > 0) return Promise.resolve();
    if (view.formationLoad) return view.formationLoad;
    const entry = TROOP_UNIT_ASSET_CATALOG[unit.type];
    if (!entry) return Promise.resolve();
    const general = this.latestState?.getGeneral(unit.faction);
    const subFaction = general ? (GENERAL_SUBFACTION_MAP[general.id] ?? SubFaction.Shu) : SubFaction.Shu;
    view.formationLoading = true;
    // 等資源時保留陣營圓環與名牌，不把工程用方塊當成正式士兵。
    view.bodyNode.active = false;
    view.accentNode.active = false;
    if (view.bottomNameLabel) view.bottomNameLabel.string = `${unit.name}（模型載入中）`;
    view.formationLoad = (async () => {
      try {
        // 模型載入逾時就放棄、改用戰術棋子（PROG-2-9404）；否則下載卡住時 formationLoading 永遠不放
        const prefab = await awaitWithTimeout<Prefab | null>(this.loadTroopPrefab(unit.type, entry, subFaction), BATTLE_VISUAL_TIMING.modelLoadMaxMs, null, { label: `troop-prefab:${unit.type}` });
        if (!view.worldNode.isValid) return;
        if (prefab && view.formationRoot.children.length === 0) this.buildTroopFormation(view, prefab, unit, entry);
      } finally {
        view.formationLoading = false;
        if (view.worldNode.isValid) {
          view.bodyNode.active = !view.usingTroopFormation;
          view.accentNode.active = !view.usingTroopFormation;
          if (view.bottomNameLabel) view.bottomNameLabel.string = view.usingTroopFormation ? unit.name : `${unit.name}（戰術棋子）`;
        }
      }
    })();
    return view.formationLoad;
  }

  private loadTroopPrefab(type: TroopType, entry: TroopUnitAssetEntry, subFaction: SubFaction): Promise<Prefab | null> {
    const cacheKey = `${type}_${subFaction}`;
    const cached = this.troopPrefabLoads.get(cacheKey);
    if (cached) {
      return cached;
    }

    const pending = new Promise<Prefab | null>((resolve) => {
      // 最終 UUID 回退：Wu 陣營優先使用 sceneUuidRed，其他陣營使用 sceneUuid
      const resolveByUuid = (): void => {
        const uuid = (subFaction === SubFaction.Wu && entry.sceneUuidRed)
          ? entry.sceneUuidRed
          : entry.sceneUuid;
        assetManager.loadAny({ uuid }, (error, asset) => {
          if (error || !(asset instanceof Prefab)) {
            UCUFLogger.warn(LogCategory.BATTLE, `[UnitRenderer] 載入小兵 prefab 失敗: ${entry.glbPath}`, error ?? new Error("asset is not Prefab"));
            resolve(null);
            return;
          }
          resolve(asset);
        });
      };

      // 優先載入子陣營特定的 Prefab (例如 unit_red)
      const subFactionPath = getTroopSubFactionPrefabPath(type, subFaction);
      
      services().resource.loadPrefab(subFactionPath)
        .then(prefab => resolve(prefab))
        .catch(() => {
          // 若子陣營特定的 Prefab 不存在 (例如還沒做藍兵)，回退到預設 Prefab (綠兵)
          UCUFLogger.info(LogCategory.BATTLE, `[UnitRenderer] 找不到子陣營 Prefab: ${subFactionPath}, 回退到預設路徑`);
          if (entry.prefabPath && subFactionPath !== entry.prefabPath) {
            services().resource.loadPrefab(entry.prefabPath)
              .then(p => resolve(p))
              .catch(() => resolveByUuid());
          } else {
            resolveByUuid();
          }
        });
    });

    this.troopPrefabLoads.set(cacheKey, pending);
    return pending;
  }

  private buildTroopFormation(view: UnitView, prefab: Prefab, unit: TroopUnit, entry: TroopUnitAssetEntry): void {
    const offsets = this.getTroopFormationOffsets(entry);

    offsets.forEach((offset, index) => {
      const soldier = instantiate(prefab);
      soldier.name = `Soldier_${index}`;
      soldier.layer = Layers.Enum.DEFAULT;
      view.formationRoot.addChild(soldier);
      this.applyDefaultLayerRecursively(soldier);
      // GLB 如实顯色，陣營區別由底板（bodyNode）顏色處理而非染 shader
      this.normalizeModelVisuals(soldier);
      soldier.setPosition(offset);
      soldier.setRotationFromEuler(0, entry.soldierYawOffset ?? 0, 0);
      soldier.setScale(entry.modelScale, entry.modelScale, entry.modelScale);

      // 給每個小兵加上專屬腳下陰影。將其加在 formationRoot 之下以避免受到小兵旋轉 (soldierYawOffset) 影響
      // 這樣可以保持統一的光影方向與形狀（皆為相對於棋盤朝向的橢圓）
      const soldierShadow = new Node(`Shadow_${index}`);
      soldierShadow.layer = Layers.Enum.DEFAULT;
      soldierShadow.setPosition(offset.x, 0.01, offset.z);
      // 隨同小兵模型縮小一併縮減陰影面積，使其不超過小兵真正的腳步寬度
      // 讀取 config，如果沒有個別設定（如騎兵的特製橢圓）就套用預設的放大版小扁圓形
      const shadowScaleX = entry.shadowScaleX ?? 0.28;
      const shadowScaleZ = entry.shadowScaleZ ?? 0.22;
      soldierShadow.setScale(new Vec3(shadowScaleX, 0.02, shadowScaleZ));
      const shadowMr = soldierShadow.addComponent(MeshRenderer);
      shadowMr.mesh = this.discMesh ?? this.cubeMesh;
      const shadowMat = new Material();
      shadowMat.initialize({
        effectName: 'builtin-unlit',
        technique: 1, // transparent blend
        states: { rasterizerState: { cullMode: gfx.CullMode.NONE } },
      });
      shadowMat.setProperty('mainColor', new Color(0, 0, 0, 90));
      shadowMr.setSharedMaterial(shadowMat, 0);
      view.formationRoot.addChild(soldierShadow);
    });

    view.usingTroopFormation = true;
    view.bodyNode.active = false;
    view.accentNode.active = false;
    view.formationRoot.active = true;
    view.worldNode.setScale(Vec3.ONE);
    this.applyTroopFormationTransform(view, unit);
    this.applyPlayerVision(view, unit);
  }

  /**
   * 夜襲視野（PROG-2-2132）：視野外的敵軍連同標籤一起不畫。
   * 世界節點用縮放隱藏，不可設 active=false：tween 會暫停，movingUnits 清不掉，回合流程要等到逾時。
   * 可見時不動縮放，由呼叫端依顯示模式設定，所以要在設完縮放之後呼叫。
   */
  private applyPlayerVision(view: UnitView, unit: TroopUnit): void {
    const visible = !this.latestState || isUnitVisibleToPlayer(this.latestState, unit);
    view.labelNode.active = visible;
    if (!visible) view.worldNode.setScale(Vec3.ZERO);
  }

  private applyTroopFormationTransform(view: UnitView, unit: TroopUnit): void {
    const entry = TROOP_UNIT_ASSET_CATALOG[unit.type];
    if (!entry) {
      return;
    }
    view.formationRoot.setPosition(0, entry.heightOffset, 0);
    // 面向旋轉由 worldNode 統一負責，formationRoot 只需歸零
    view.formationRoot.setRotationFromEuler(0, 0, 0);
  }

  private getTroopFormationOffsets(entry: TroopUnitAssetEntry): Vec3[] {
      const dx = entry.spacingX * 0.5;
      const dz = entry.spacingZ * 0.5;
      
      // 依據需求：「所有小兵的陣型應該都是正面的 2x2，請不要擺出斜的隊形」
      // 因為攝影機與棋盤呈現約 45 度的等角視角 (isometric)，直接沿著世界的 X, Z 軸排會導致畫面上看起來是菱形(斜的)。
      // 因此我們將相對於兵團中心的座標旋轉 45 度，使其在視覺上抵銷畫面的斜角，變成正對攝影機的 2x2 方陣。
      const angle = -45 * (Math.PI / 180);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const rotate = (x: number, z: number) => {
          return new Vec3(
              x * cos - z * sin,
              0,
              x * sin + z * cos
          );
      };

      return [
        rotate(-dx, dz),
        rotate(dx, dz),
        rotate(-dx, -dz),
        rotate(dx, -dz),
      ];
    }

  private async ensureGeneralHeroModel(view: GeneralView, faction: Faction): Promise<void> {
    if (view.usingHeroModel || view.heroLoading || view.modelRoot.children.length > 0) {
      return;
    }

    view.heroLoading = true;

    const heroId = faction === Faction.Player ? DEFAULT_PLAYER_HERO_ASSET_ID : DEFAULT_ENEMY_HERO_ASSET_ID;
    const entry = HERO_UNIT_ASSET_CATALOG[heroId];
    if (!entry) {
      view.heroLoading = false;
      return;
    }

    const prefab = await awaitWithTimeout<Prefab | null>(this.loadHeroPrefab(heroId, entry), BATTLE_VISUAL_TIMING.modelLoadMaxMs, null, { label: `hero-prefab:${heroId}` });
    if (!prefab || !view.worldNode.isValid || view.modelRoot.children.length > 0) {
      view.heroLoading = false;
      view.bodyNode.active = false;
      view.modelRoot.active = false;
      return;
    }

    const hero = instantiate(prefab);
    hero.name = `${heroId}_Model`;
    hero.layer = Layers.Enum.DEFAULT;
    view.modelRoot.addChild(hero);
    this.applyDefaultLayerRecursively(hero);
    // 武將保持原色（不染色），陣營由 HUD 標籤顏色區別
    // 並行載入 MatCap 貼圖與 RM 貼圖，再套用 heroine-toon 著色器
    const [matcap, rmTex] = await awaitWithTimeout<[Texture2D | null, Texture2D | null]>(Promise.all([
      this.loadHeroMatcap(),
      this.loadHeroRmTex(entry),
    ]), BATTLE_VISUAL_TIMING.modelLoadMaxMs, [null, null], { label: `hero-textures:${heroId}` });
    // 等貼圖的期間主將節點可能已被銷毀（出陣後重建畫面、戰鬥結束換場）；
    // 對已銷毀的節點呼叫 getComponentsInChildren 會丟「null 的 length」（PROG-2-9387）
    if (!hero.isValid || !view.worldNode.isValid) {
      view.heroLoading = false;
      return;
    }
    this.applyHeroineToonMaterial(hero, matcap, rmTex);
    hero.setPosition(0, 0, 0);
    hero.setRotationFromEuler(0, 0, 0);
    hero.setScale(entry.modelScale, entry.modelScale, entry.modelScale);

    view.usingHeroModel = true;
    view.heroLoading = false;
    view.bodyNode.active = false;
    view.modelRoot.active = true;
    this.applyGeneralHeroTransform(view, faction);
  }

  private loadHeroPrefab(heroId: string, entry: HeroUnitAssetEntry): Promise<Prefab | null> {
    const cached = this.heroPrefabLoads.get(heroId);
    if (cached) {
      return cached;
    }

    const pending = new Promise<Prefab | null>((resolve) => {
      const resolveByUuid = (): void => {
        if (!entry.sceneUuid) {
          UCUFLogger.warn(LogCategory.BATTLE, `[UnitRenderer] 載入武將 prefab 失敗: ${entry.glbPath}`);
          this.heroPrefabLoads.delete(heroId);
          resolve(null);
          return;
        }
        assetManager.loadAny({ uuid: entry.sceneUuid }, (error, asset) => {
          if (error || !(asset instanceof Prefab)) {
            UCUFLogger.warn(LogCategory.BATTLE, `[UnitRenderer] 載入武將 prefab 失敗: ${entry.glbPath}`, error ?? new Error("asset is not Prefab"));
            this.heroPrefabLoads.delete(heroId);
            resolve(null);
            return;
          }
          resolve(asset);
        });
      };

      if (entry.prefabPath) {
        services().resource.loadPrefab(entry.prefabPath)
          .then(prefab => resolve(prefab))
          .catch(() => resolveByUuid());
        return;
      }

      resolveByUuid();
    });

    this.heroPrefabLoads.set(heroId, pending);
    return pending;
  }

  private applyGeneralHeroTransform(view: GeneralView, faction: Faction): void {
    const heroId = faction === Faction.Player ? DEFAULT_PLAYER_HERO_ASSET_ID : DEFAULT_ENEMY_HERO_ASSET_ID;
    const entry = HERO_UNIT_ASSET_CATALOG[heroId];
    if (!entry) {
      return;
    }

    view.modelRoot.setPosition(0, entry.heightOffset, 0);
    view.modelRoot.setRotationFromEuler(0, entry.yawOffset, 0);
  }

  private alignNodeToFactionFacing(node: Node, faction: Faction, yawOffsetDeg: number = 0): boolean {
    // 計算棋盤前方向量並只套用 Y 軸旋轉
    const forward = this.getBoardForwardVector(faction);
    if (!forward) {
      return false;
    }

    // 本專案所有 troop / hero GLB 模型的視覺正面為 local +X 方向
    // 需要求 R_y(theta) 使得 R_y(theta) * (+X_local) = forward_world
    // 即：cos(theta) = f_x, -sin(theta) = f_z  →  theta = atan2(-f_z, f_x)
    // 驗證（boardYaw=0）：
    //   player forward=(0,0,+1) → atan2(-1, 0) = -90° → local +X 指向 +Z（面向敵方 depth 增大方向）✓
    //   enemy  forward=(0,0,-1) → atan2( 1, 0) = +90° → local +X 指向 -Z（面向我方 depth 減小方向）✓
    const RAD2DEG = 180 / Math.PI;
    const yawRad = Math.atan2(-forward.z, forward.x);
    const yawDeg = yawRad * RAD2DEG + yawOffsetDeg;

    node.setRotationFromEuler(0, yawDeg, 0);
    return true;
  }

  private getBoardForwardVector(faction: Faction): Vec3 | null {
    if (!this.boardRenderer) {
      return null;
    }

    const centerLane = Math.floor(GAME_CONFIG.GRID_LANES / 2);
    const fromDepth = faction === Faction.Player ? 0 : GAME_CONFIG.GRID_DEPTH - 1;
    const toDepth = faction === Faction.Player ? 1 : GAME_CONFIG.GRID_DEPTH - 2;
    const from = this.boardRenderer.getCellWorldPosition(centerLane, fromDepth, 0);
    const to = this.boardRenderer.getCellWorldPosition(centerLane, toDepth, 0);
    const forward = to.subtract(from);
    forward.y = 0;
    if (forward.lengthSqr() <= 0.0001) {
      return null;
    }
    forward.normalize();
    return forward;
  }

  private normalizeModelVisuals(root: Node, tint: Color = new Color(255, 255, 255, 255)): void {
    const meshRenderers = root.getComponentsInChildren(MeshRenderer);
    meshRenderers.forEach(renderer => this.rebindRendererToUnlit(renderer, tint));

    const skinnedRenderers = root.getComponentsInChildren(SkinnedMeshRenderer);
    skinnedRenderers.forEach(renderer => this.rebindRendererToUnlit(renderer, tint));
  }

  /**
   * 以非同步方式載入並快取 MatCap 貼圖（resources/textures/tex_matcap_cold_blue_128）。
   * 多次呼叫只觸發一次 resources.load，後續直接回傳快取。
   */
  private loadHeroMatcap(): Promise<Texture2D | null> {
    if (this.heroMatcapTex) return Promise.resolve(this.heroMatcapTex);
    if (this.matcapLoadPromise) return this.matcapLoadPromise;
    this.matcapLoadPromise = new Promise<Texture2D | null>((resolve) => {
      const matcapPath = 'textures/tex_matcap_cold_blue_128';

      resources.load(`${matcapPath}/texture`, Texture2D, (err, tex) => {
        if (tex) {
          this.heroMatcapTex = tex;
          resolve(tex);
          return;
        }

        resources.load(matcapPath, ImageAsset, (imageErr, imageAsset) => {
          if (imageErr || !imageAsset) {
            UCUFLogger.warn(LogCategory.BATTLE, '[UnitRenderer] MatCap 貼圖載入失敗', imageErr ?? err);
            resolve(null);
            return;
          }

          const fallbackTex = new Texture2D();
          fallbackTex.image = imageAsset;
          this.heroMatcapTex = fallbackTex;
          resolve(fallbackTex);
        });
      });
    });
    return this.matcapLoadPromise;
  }

  /**
   * 武將專用：以 heroine-toon Effect 取代所有原始材質，
   * 保留原始主貼圖作為 mainTexture，套入 MatCap 貼圖。
   * （Unity 對照：替換 Material.shader = Shader.Find("Custom/HeroineToon")）
   */
  private applyHeroineToonMaterial(root: Node, matcap: Texture2D | null, rmOverride?: Texture2D | null): void {
    if (!root?.isValid) return;
    const allRenderers: (MeshRenderer | SkinnedMeshRenderer)[] = [
      ...root.getComponentsInChildren(MeshRenderer),
      ...root.getComponentsInChildren(SkinnedMeshRenderer),
    ];
    for (const renderer of allRenderers) {
      const anyRenderer = renderer as any;
      const sharedMaterials = Array.isArray(anyRenderer.sharedMaterials)
        ? anyRenderer.sharedMaterials
        : (Array.isArray(anyRenderer.materials) ? anyRenderer.materials : []);
      if (!sharedMaterials || sharedMaterials.length === 0) continue;

      sharedMaterials.forEach((sourceMaterial: Material | null, index: number) => {
        const toonMat = this.createHeroineToonMaterial(sourceMaterial, matcap, rmOverride);
        this.setRendererMaterialSafe(anyRenderer, toonMat, index);
      });

      if ('shadowCastingMode' in anyRenderer) anyRenderer.shadowCastingMode = 0;
      if ('shadowReceivingMode' in anyRenderer) anyRenderer.shadowReceivingMode = 0;
    }
  }

  /**
   * 建立一個 heroine-toon 材質實例，從原始 PBR 材質提取：
   * - mainTexture (Base Color)
   * - controlMap (從 _rm / pbrMap 提取 Roughness-Metallic 合圖)
   * - matcapTex (外部傳入的 MatCap 反射球)
   *
   * _rm 圖的通道映射到 controlMap：
   *   R(AO) → R(Ramp偏移)  |  G(Roughness) → G(BlushMask, 暫用)  |  B(Metallic) → B(MetalMask)
   */
  private createHeroineToonMaterial(sourceMaterial: Material | null, matcap: Texture2D | null, rmOverride?: Texture2D | null): Material {
    const mat = new Material();
    mat.initialize({
      effectName: 'heroine-toon',
      states: {
        rasterizerState: { cullMode: gfx.CullMode.NONE },
      },
    });

    const texture = this.tryExtractMainTexture(sourceMaterial);
    if (texture) {
      mat.setProperty('mainTexture', texture);
    }
    // rmOverride 優先（由 catalog rmTexUuid 直接載入）；fallback 再試 material property 提取
    // 若兩者皆失敗，controlMap 維持 YAML 預設值 black → metalMask=0，避免全身金屬
    const rmTex = rmOverride ?? this.tryExtractRMTexture(sourceMaterial);
    if (rmTex) {
      mat.setProperty('controlMap', rmTex);
    }
    if (matcap) {
      mat.setProperty('matcapTex', matcap);
    }
    return mat;
  }

  /**
   * 從 PBR 材質提取 Roughness-Metallic 合圖（fallback 用）。
   * 優先路徑：catalog 的 rmTexUuid → loadHeroRmTex() 直接以 UUID 載入（最可靠）。
   * 此函數為次要 fallback，嘗試從 Cocos gltf-material 的 property 讀出 RM Texture2D。
   * glTF 標準在 Cocos Creator 中的屬性名稱會依版本而異，嘗試多種候選。
   * Unity 對照：material.GetTexture("_MetallicGlossMap")
   */
  private tryExtractRMTexture(sourceMaterial: Material | null): Texture2D | null {
    if (!sourceMaterial) return null;
    // Cocos Creator 3.x builtin-standard 材質的 RM 屬性名稱候選
    const candidates = ['pbrMap', 'metallicRoughnessMap', 'metallicGlossMap', 'occlusionMap', 'ormMap'];
    const anyMat = sourceMaterial as any;
    for (const name of candidates) {
      try {
        const val = anyMat.getProperty?.(name);
        if (val instanceof Texture2D) return val;
      } catch { /* ignore */ }
    }
    return null;
  }

  /**
   * 以 catalog 內的 rmTexUuid 直接從 assetManager 載入 RM 貼圖。
   * 相比 tryExtractRMTexture 從 material property 提取，這個方法完全不依賴
   * Cocos gltf-material 的 effect property name，因此更可靠。
   * GLB 一旦被 loadHeroPrefab 載入，所有 sub-asset 便已快取，此處為同步回呼。
   * Unity 對照：AssetDatabase.LoadAssetAtPath<Texture2D>(...)
   */
  private loadHeroRmTex(entry: HeroUnitAssetEntry): Promise<Texture2D | null> {
    if (!entry.rmTexUuid) return Promise.resolve(null);
    return new Promise<Texture2D | null>(resolve => {
      assetManager.loadAny({ uuid: entry.rmTexUuid! }, (err, asset) => {
        if (err || !asset) {
          UCUFLogger.warn(LogCategory.BATTLE, '[UnitRenderer] 武將 RM 貼圖載入失敗', err);
          resolve(null);
          return;
        }
        if (asset instanceof Texture2D) {
          resolve(asset);
        } else {
          UCUFLogger.warn(LogCategory.BATTLE, '[UnitRenderer] 武將 RM 資產非 Texture2D，type:', (asset as any)?.constructor?.name);
          resolve(null);
        }
      });
    });
  }

  private rebindRendererToUnlit(renderer: MeshRenderer | SkinnedMeshRenderer, tint: Color = new Color(255, 255, 255, 255)): void {
    const anyRenderer = renderer as any;
    const sharedMaterials = Array.isArray(anyRenderer.sharedMaterials)
      ? anyRenderer.sharedMaterials
      : (Array.isArray(anyRenderer.materials) ? anyRenderer.materials : []);

    if (!sharedMaterials || sharedMaterials.length === 0) {
      return;
    }

    sharedMaterials.forEach((sourceMaterial: Material | null, index: number) => {
      const unlitMaterial = this.createTexturedUnlitMaterial(sourceMaterial, tint);
      this.setRendererMaterialSafe(anyRenderer, unlitMaterial, index);
    });

    if ('shadowCastingMode' in anyRenderer) {
      anyRenderer.shadowCastingMode = 0;
    }
    if ('shadowReceivingMode' in anyRenderer) {
      anyRenderer.shadowReceivingMode = 0;
    }
  }

  private createTexturedUnlitMaterial(sourceMaterial: Material | null, tint: Color = new Color(255, 255, 255, 255)): Material {
    const mat = new Material();
    mat.initialize({
      effectName: 'builtin-unlit',
      defines: { USE_TEXTURE: true },
      states: {
        rasterizerState: { cullMode: gfx.CullMode.NONE },
      },
    });

    const texture = this.tryExtractMainTexture(sourceMaterial);
    if (texture) {
      mat.setProperty('mainTexture', texture);
    }
    mat.setProperty('mainColor', tint);
    return mat;
  }

  private getFloodRaftMaterial(): Material {
    if (this.raftMaterial) {
      return this.raftMaterial;
    }

    const mat = new Material();
    mat.initialize({
      effectName: 'builtin-unlit',
      technique: 1,
      states: {
        rasterizerState: { cullMode: gfx.CullMode.NONE },
      },
    });
    mat.setProperty('mainColor', new Color(160, 118, 76, 235));
    this.raftMaterial = mat;
    return mat;
  }

  private tryExtractMainTexture(sourceMaterial: Material | null): Texture2D | null {
    if (!sourceMaterial) {
      return null;
    }

    const propertyNames = ['mainTexture', 'albedoMap', 'baseColorMap', 'diffuseMap'];
    const anyMaterial = sourceMaterial as any;
    for (const propertyName of propertyNames) {
      try {
        const value = anyMaterial.getProperty?.(propertyName);
        if (value instanceof Texture2D) {
          return value;
        }
      } catch {
        // ignore unsupported property name
      }
    }

    return null;
  }

  private setRendererMaterialSafe(renderer: any, mat: Material, index: number): void {
    try {
      if (typeof renderer.setSharedMaterial === 'function') {
        renderer.setSharedMaterial(mat, index);
        return;
      }
      if (typeof renderer['setMaterial'] === 'function') {
        try {
          renderer['setMaterial'](mat, index);
          return;
        } catch {
          renderer['setMaterial'](index, mat);
          return;
        }
      }
      if (Array.isArray(renderer.sharedMaterials)) {
        const copy = renderer.sharedMaterials.slice();
        copy[index] = mat;
        renderer.sharedMaterials = copy;
        return;
      }
      if (Array.isArray(renderer.materials)) {
        const copy = renderer.materials.slice();
        copy[index] = mat;
        renderer.materials = copy;
      }
    } catch (error) {
      UCUFLogger.warn(LogCategory.BATTLE, '[UnitRenderer] 無法套用保底材質', error);
    }
  }

  private ensureSceneKeyLight(): void {
    const scene = this.node.scene;
    if (!scene) {
      return;
    }

    const existing = scene.getComponentInChildren(DirectionalLight);
    if (existing) {
      const anyLight = existing as any;
      if (typeof anyLight.illuminance === 'number' && anyLight.illuminance < 30000) {
        anyLight.illuminance = 45000;
      }
      return;
    }

    const lightNode = new Node('RuntimeKeyLight');
    lightNode.layer = Layers.Enum.DEFAULT;
    scene.addChild(lightNode);
    lightNode.setRotationFromEuler(-52, -28, 0);

    const light = lightNode.addComponent(DirectionalLight) as any;
    if (light) {
      if ('illuminance' in light) {
        light.illuminance = 45000;
      }
      if ('color' in light) {
        light.color = new Color(255, 244, 228, 255);
      }
    }
  }

  private applyDefaultLayerRecursively(root: Node): void {
    root.layer = Layers.Enum.DEFAULT;
    root.children.forEach(child => this.applyDefaultLayerRecursively(child));
  }

  private toTroopName(type: TroopType): string {
    if (type === TroopType.Cavalry) return "騎兵";
    if (type === TroopType.Infantry) return "步兵";
    if (type === TroopType.Shield) return "盾兵";
    if (type === TroopType.Archer) return "弓兵";
    if (type === TroopType.Pikeman) return "長槍兵";
    if (type === TroopType.Engineer) return "工兵";
    if (type === TroopType.Medic) return "醫護兵";
    return "水軍";
  }

  private playCavalryChargeAnimation(node: Node, targetWorldPos: Vec3): void {
    const worldPos = node.worldPosition;
    // 取得衝鋒的世界方向
    const direction = targetWorldPos.clone().subtract(worldPos);
    direction.y = 0;
    if (direction.lengthSqr() <= 0.0001) return;
    direction.normalize();

    const visual = node.getChildByName("Visual");
    if (visual) {
      const ws = node.worldScale;
      // 在 visual 的 local 空間，正前方是 +X 軸。所以衝鋒方向是正 X
      const liftLocal = new Vec3(0, 0.18 / ws.y, 0);
      const chargeLocal = new Vec3(0.5 / ws.x, 0, 0); // 取代依照方向計算，一律往 local +X 衝
      
      Tween.stopAllByTarget(visual);
      tween(visual)
        .parallel(
          tween<Node>()
            .to(BATTLE_VISUAL_TIMING.cavalryLiftSec, { position: liftLocal }, { easing: "quadOut" })
            .to(BATTLE_VISUAL_TIMING.cavalryImpactSec, { position: chargeLocal }, { easing: "quadIn" }) // 衝撞
            .delay(BATTLE_VISUAL_TIMING.cavalryHitStopSec) // 打擊頓幀
            .to(BATTLE_VISUAL_TIMING.cavalryRecoverSec, { position: new Vec3() }, { easing: "quadOut" }),
          tween<Node>()
            // 上揚：繞著 local Z 軸旋轉 (因為 local +X 是前方)
            .to(BATTLE_VISUAL_TIMING.cavalryLiftSec, { eulerAngles: new Vec3(0, 0, 18) }, { easing: "quadOut" })
            // 前傾衝刺：繞著 local Z 軸反向旋轉
            .to(BATTLE_VISUAL_TIMING.cavalryImpactSec, { eulerAngles: new Vec3(0, 0, -12) }, { easing: "quadIn" })
            .delay(BATTLE_VISUAL_TIMING.cavalryHitStopSec)
            .to(BATTLE_VISUAL_TIMING.cavalryRecoverSec, { eulerAngles: new Vec3() }, { easing: "quadOut" }),
        )
        .start();
    } else {
      // 將軍騎兵（無 Visual 子節點）：fallback 直接動世界座標
      const originalPos = worldPos.clone();
      const originalEuler = node.eulerAngles.clone();
      const liftPos = originalPos.clone().add(new Vec3(0, 0.18, 0));
      const impactPos = originalPos.clone().add(direction.clone().multiplyScalar(0.5));
      Tween.stopAllByTarget(node);
      tween(node)
        .parallel(
          tween<Node>()
            .to(BATTLE_VISUAL_TIMING.cavalryLiftSec, { worldPosition: liftPos }, { easing: "quadOut" })
            .to(BATTLE_VISUAL_TIMING.cavalryImpactSec, { worldPosition: impactPos }, { easing: "quadIn" })
            .delay(BATTLE_VISUAL_TIMING.cavalryHitStopSec)
            .to(BATTLE_VISUAL_TIMING.cavalryRecoverSec, { worldPosition: originalPos }, { easing: "quadOut" }),
          tween<Node>()
            // 將軍沒有 visual，所以旋轉比較複雜，這裡簡化處理或者保持原本的 X 軸
            .to(BATTLE_VISUAL_TIMING.cavalryLiftSec, { eulerAngles: new Vec3(originalEuler.x, originalEuler.y, originalEuler.z + 18) }, { easing: "quadOut" })
            .to(BATTLE_VISUAL_TIMING.cavalryImpactSec, { eulerAngles: new Vec3(originalEuler.x, originalEuler.y, originalEuler.z - 12) }, { easing: "quadIn" })
            .delay(BATTLE_VISUAL_TIMING.cavalryHitStopSec)
            .to(BATTLE_VISUAL_TIMING.cavalryRecoverSec, { eulerAngles: originalEuler }, { easing: "quadOut" }),
        )
        .start();
    }
  }
}
