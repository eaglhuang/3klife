import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
// @spec-source → 見 docs/cross-reference-index.md  (UCUF M12)
/**
 * BattleHUDComposite — 戰鬥 HUD（CompositePanel 版）
 *
 * UCUF M12 — 將 BattleHUD（UIPreviewBuilder）遷移至 CompositePanel 架構。
 *
 * 遷移重點：
 *   - buildScreen(layout, skin, i18n) → mount('battle-hud-screen')
 *   - onReady(binder)                 → _onAfterBuildReady(binder)
 *   - onBuildComplete(rootNode)       → onBuildComplete(rootNode)（保留 SolidBackground HP bar 邏輯）
 *   - 公開 API 完全與原 BattleHUD 相同（向後相容）
 *
 * Unity 對照：GameHUDController，監聽事件更新各個 Binding
 */
import { _decorator, Button, Color, Director, director, Label, Node, Sprite, UITransform, Vec3 } from 'cc';
import { portraitPathOf } from '../../core/systems/GeneralArtPaths';
import { loadGeneralAvatar } from '../core/GeneralAvatarLoader';
import { playTacticFlash, TACTIC_FLASH_NODE } from '../core/TacticFlashOverlay';
import type { TacticFlashTiming, TacticFlashView } from '../../shared/interfaces/IBattleUIComponents';
import { EVENT_NAMES, Faction, GAME_CONFIG, SceneName } from '../../core/config/Constants';
import { buildBattleSkillEffectMessage, buildBattleSkillUsedMessage } from '../../shared/BattleSkillPresentation';
import { services } from '../../core/managers/ServiceLoader';
import { CompositePanel } from '../core/CompositePanel';
import { UITemplateBinder } from '../core/UITemplateBinder';
import { BattleSettingsComposite } from './BattleSettingsComposite';
import { SolidBackground } from './SolidBackground';
import { isVitalityBarGrayed, vitalityBarRatio } from '../../core/systems/VitalityBarView';
import { FORTRESS_MAX_HP, fortressBarRatio } from '../../core/systems/FortressBarView';
import { foodLabelText } from '../../core/systems/FoodLabelText';

const { ccclass } = _decorator;

/** 精力條（FORM-11）在血條正下方的高度與間距 */
const VITALITY_BAR_HEIGHT = 6;
const VITALITY_BAR_GAP = 4;
const VITALITY_FILL_COLOR = new Color(240, 200, 60, 255);
/** 我軍陣地血條為藍色（doc_ui_0001 §2.1）；敵軍維持紅色 */
const PLAYER_FORTRESS_FILL_COLOR = new Color(70, 150, 255, 255);
const VITALITY_TRACK_COLOR = new Color(0, 0, 0, 160);
/** 體力歸零時底板變灰，表示已無法發動大招 */
const VITALITY_TRACK_GRAYED_COLOR = new Color(90, 90, 90, 200);

@ccclass('BattleHUDComposite')
export class BattleHUDComposite extends CompositePanel {

    // ── 私有狀態 ─────────────────────────────────────────────
    private _isMounted = false;
    private _settings: BattleSettingsComposite | null = null;
    private _spLabel: Label | null = null;
    private _chargeLabel: Label | null = null;
    private _spFill: Node | null = null;
    private _spReadyLabel: Label | null = null;
    private _buildCompleted = false;
    private _playerGeneralMaxHp = 1;
    private _enemyGeneralMaxHp  = 1;
    private readonly _unsubs: Array<() => void> = [];
    private readonly _readyWaiters: Array<(ready: boolean) => void> = [];
    /** 暫存 refresh() 在 mount 完成前的呼叫參數，mount 後自動重播 */
    private _pendingRefreshArgs: [number, number, number, number, number, number, number] | null = null;
    private _playerTallySetLabel: Label  | null = null;
    private _pendingPlayerName: string | null = null;
    private _pendingEnemyName: string | null = null;
    private _pendingStageTitle: string | null = null;
    private _pendingPlayerGeneralId: string | null = null;
    private _pendingEnemyGeneralId: string | null = null;
    private _pendingSceneGambitBadgeText: string | null = null;
    private _playerPortraitLoadSeq = 0;
    private _enemyPortraitLoadSeq = 0;
    private _persistentStatusMsg: string | null = null;

    // ── 節點引用（由 _onAfterBuildReady / onBuildComplete 填入）──
    private _turnLabel:           Label  | null = null;
    private _stageTitleLabel:     Label  | null = null;
    private _stageSubtitleLabel:  Label  | null = null;
    private _foodLabel:           Label  | null = null;
    private _statusLabel:         Label  | null = null;
    private _sceneGambitBadgeDock: Node   | null = null;
    private _sceneGambitBadgeLabel: Label | null = null;
    private _playerNameLabel:     Label  | null = null;
    /** 底部指令列的主將名（battle-hud-screen 的 div_124），與頂部陣列第一格同步 */
    private _playerCommandNameLabel: Label | null = null;
    private _enemyNameLabel:      Label  | null = null;
    private _playerFortressLabel: Label  | null = null;
    private _enemyFortressLabel:  Label  | null = null;
    // HP bar：以 SolidBackground 子節點 + 直接設 contentSize.width 取代 ProgressBar
    private _playerFortressFill:  Node   | null = null;
    private _enemyFortressFill:   Node   | null = null;
    private _playerFortressTotalW = 691;
    private _enemyFortressTotalW  = 691;
    // 頂部長條顯示城寨（陣地）血量，頭像旁標籤顯示主將血量（doc_ui_0001 §2.1，PROG-2-1889）
    private _playerFortressHp = FORTRESS_MAX_HP;
    private _enemyFortressHp  = FORTRESS_MAX_HP;
    private _playerPortraitNode:  Node | null = null;
    private _enemyPortraitNode:   Node | null = null;
    // 體力條（FORM-11）：玩家血條下方的細條，執行期建立；值先存起來，建好後再套用
    private _playerVitalityTrack: Node | null = null;
    private _playerVitalityFill:  Node | null = null;
    private _playerVitality = 0;
    private _playerMaxVitality = 0;

    // ── 生命週期 ─────────────────────────────────────────────

    private _mounting: Promise<void> | null = null;
    private _sceneLeaving = false;

    private _isActiveBattleScene(): boolean {
        const scene = director.getScene();
        return !this._sceneLeaving && !!scene && scene.name === SceneName.Battle && this.node.scene === scene;
    }

    private _hideForSceneLeave(): void {
        this._sceneLeaving = true;
        this.node.active = false;
    }

    async onLoad(): Promise<void> {
        director.on(Director.EVENT_BEFORE_SCENE_LAUNCH, this._hideForSceneLeave, this);
        if (!this._isActiveBattleScene()) { this.node.active = false; return; }
        services().initialize(this.node);
        // 建構前就接收 SP，避免掛載期間漏掉已知上限（各將可能為 80 或 100）。
        this._subscribeEvents();
        await this.show();
    }

    /**
     * 初次呼叫時掛載畫面，後續呼叫為 no-op。
     * 掛載完成後自動重播暫存的 refresh / setName / setGeneralId。
     */
    public async show(): Promise<void> {
        if (!this._isActiveBattleScene()) { this.node.active = false; return; }
        // 非同步建構期間不可曝光預設標題；多個呼叫共用同一次掛載。
        this.node.active = false;
        if (!this._isMounted) {
            if (!this._mounting) this._mounting = this.mount('battle-hud-screen').then(() => { this._isMounted = true; });
            try { await this._mounting; } finally { this._mounting = null; }
        }
        // 切場景時尚未完成的資源請求不能把舊 HUD 再打開。
        if (!this._isActiveBattleScene()) return;
        this._subscribeEvents();
        this._replayPendingCalls();
        this.node.active = true;
    }

    protected onDestroy(): void {
        this._hideForSceneLeave();
        director.off(Director.EVENT_BEFORE_SCENE_LAUNCH, this._hideForSceneLeave, this);
        this.unmount();
        this._isMounted = false;
        this._unsubs.forEach(fn => fn());
    }

    // ── CompositePanel 鉤子 ───────────────────────────────────

    /**
     * buildScreen 完成後，綁定 Label 節點與頭像互動。
     * Unity 對照：MonoBehaviour.Start()
     */
    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        binder.getButton('btnHudUltimate')?.node.on(Button.EventType.CLICK, () => { services().event.emit('hud-ultimate-requested', undefined); }, this);
        // HTML 匯入的齒輪／退原本只是裝飾，沒有任何 Button 或事件。
        for (const id of ['BattleHudScreen_div_12', 'BattleHudScreen_div_142']) {
            const node = binder.getNode(id);
            if (!node) continue;
            if (!node.getComponent(Button)) node.addComponent(Button);
            node.on(Button.EventType.CLICK, () => { void this._showSettings(); }, this);
        }
        this._spLabel = binder.getLabel('BattleHudScreen_div_127');
        this._chargeLabel = binder.getLabel('BattleHudScreen_div_121');
        this._spReadyLabel = binder.getLabel('BattleHudScreen_div_129');
        this._spFill = binder.getNode('BattleHudScreen_div_126')?.getChildByName('skinLayer_BattleHudScreen_div_128_BattleHudScreen_i_9') ?? null;
        for (const label of [this._spLabel, this._spReadyLabel]) {
            label?.node.getComponent(UITransform)?.setContentSize(320, 32);
        }
        // 百分比寬度在builder只求值一次，Canvas變寬窄後也要重算標題區。
        const topBar = binder.getNode('BattleHudScreen_div_1');
        const resizeTitle = (): void => {
            const width = topBar?.getComponent(UITransform)?.width;
            if (!width) return;
            binder.getNode('BattleHudScreen_div_6')?.getComponent(UITransform)?.setContentSize(width * 0.35, 53);
            binder.getNode('BattleHudScreen_div_7')?.getComponent(UITransform)?.setContentSize(width * 0.35, 40);
        };
        topBar?.on(Node.EventType.SIZE_CHANGED, resizeTitle, this);
        resizeTitle();
        this._renderSp(this._spState.sp, this._spState.maxSp);
        this._turnLabel           = binder.getLabel('TurnLabel');
        this._stageTitleLabel     = binder.getLabel('StageTitleLabel');
        this._stageSubtitleLabel  = binder.getLabel('StageSubtitleLabel');
        this._foodLabel           = binder.getLabel('FoodLabel');
        this._statusLabel         = binder.getLabel('StatusLabel');
        this._sceneGambitBadgeDock = binder.getNode('SceneGambitBadgeDock');
        this._sceneGambitBadgeLabel = binder.getLabel('SceneGambitBadgeLabel');
        this._playerNameLabel     = binder.getLabel('PlayerNameLabel');
        this._playerCommandNameLabel = binder.getLabel('PlayerCommandNameLabel');
        this._playerTallySetLabel = binder.getLabel('PlayerTallySetLabel');
        this._enemyNameLabel      = binder.getLabel('EnemyNameLabel');
        this._playerFortressLabel = binder.getLabel('PlayerFortressLabel');
        this._enemyFortressLabel  = binder.getLabel('EnemyFortressLabel');
        this._playerPortraitNode  = binder.getNode('PlayerPortrait');
        this._enemyPortraitNode   = binder.getNode('EnemyPortrait');

        this._bindPortraitInteraction(this._playerPortraitNode, 'player');
        this._bindPortraitInteraction(this._enemyPortraitNode,  'enemy');
    }

    /**
     * 節點樹建構完成後，建立 SolidBackground HP bar 填充子節點。
     * HP bar 使用非標準 Widget，不在 binder 系統內，需在此處處理。
     *
     * Unity 對照：Awake() — 取得物件引用並初始化非標準元件。
     */
    protected override onBuildComplete(rootNode: Node): void {
        this._playerFortressFill = this._ensureBarFill(rootNode, 'PlayerFortressBar', PLAYER_FORTRESS_FILL_COLOR);
        this._enemyFortressFill  = this._ensureBarFill(rootNode, 'EnemyFortressBar',  Color.RED);

        const playerBarTf = rootNode.getChildByPath('PlayerFortressBar')?.getComponent(UITransform);
        const enemyBarTf  = rootNode.getChildByPath('EnemyFortressBar')?.getComponent(UITransform);
        if (playerBarTf) this._playerFortressTotalW = playerBarTf.contentSize.width;
        if (enemyBarTf)  this._enemyFortressTotalW  = enemyBarTf.contentSize.width;
        this._renderFortress(Faction.Player);
        this._renderFortress(Faction.Enemy);

        this._ensureVitalityBar(rootNode);
        this._renderPlayerVitality();

        this._buildCompleted = true;
        this._flushReadyWaiters(true);
    }

    // ── 公開 API（與原 BattleHUD 完全相同）──────────────────

    /**
     * 更新玩家精力條（FORM-11）。精力歸零時底板變灰；畫面未建好前只暫存數值。
     * Unity 對照：Slider.value 的 setter，值變時直接更新 fillAmount 與顏色。
     */
    public setPlayerVitality(vitality: number, maxVitality: number): void {
        this._playerVitality = vitality;
        this._playerMaxVitality = maxVitality;
        this._renderPlayerVitality();
    }

    /**
     * 刷新 HUD 所有數據欄位。
     * 若 mount 尚未完成，呼叫會被暫存，待 mount 後自動重播。
     */
    public refresh(
        turn:       number,
        food:       number,
        maxFood:    number,
        playerHp:   number,
        playerMaxHp: number,
        enemyHp:    number,
        enemyMaxHp: number,
    ): void {
        if (!this._buildCompleted) {
            this._pendingRefreshArgs = [turn, food, maxFood, playerHp, playerMaxHp, enemyHp, enemyMaxHp];
            return;
        }
        this._playerGeneralMaxHp = playerMaxHp;
        this._enemyGeneralMaxHp  = enemyMaxHp;
        // refresh 只在開場與重新開始時呼叫，此時城寨血量一律回滿（與 BattleState 重設同步）
        this.setFortressHp(Faction.Player, FORTRESS_MAX_HP);
        this.setFortressHp(Faction.Enemy,  FORTRESS_MAX_HP);
        this._setTurn(turn);
        this._setFood(food, maxFood);
        this._setGeneralHealth(Faction.Player, playerHp);
        this._setGeneralHealth(Faction.Enemy,  enemyHp);
    }

    public setFood(food: number, maxFood: number): void {
        this._setFood(food, maxFood);
    }

    /** 更新頂部城寨血條；畫面未建好前只暫存數值（PROG-2-1889） */
    public setFortressHp(faction: Faction, hp: number): void {
        if (faction === Faction.Player) this._playerFortressHp = hp;
        else                            this._enemyFortressHp  = hp;
        this._renderFortress(faction);
    }

    public setPlayerName(name: string): void {
        if (!this._buildCompleted) { this._pendingPlayerName = name; return; }
        if (this._playerNameLabel) this._playerNameLabel.string = name;
        if (this._playerCommandNameLabel) this._playerCommandNameLabel.string = name;
    }

    /** 玩家在場的 Set 顯示文字（PROG-2-0580）；沒有 Set 時清空，只是提示、不是持續狀態列 */
    public setPlayerTallySetLabels(labels: string[]): void {
        if (this._playerTallySetLabel) this._playerTallySetLabel.string = labels.join('  ');
    }

    /** 關卡標題（PROG-2-2133）；關卡資料沒有英文名，副標清空，不留示意稿假字 */
    public setStageTitle(title: string): void {
        if (!this._buildCompleted) { this._pendingStageTitle = title; return; }
        if (this._stageTitleLabel) this._stageTitleLabel.string = title;
        if (this._stageSubtitleLabel) this._stageSubtitleLabel.string = '';
    }

    public setEnemyName(name: string): void {
        if (!this._buildCompleted) { this._pendingEnemyName = name; return; }
        if (this._enemyNameLabel) this._enemyNameLabel.string = name;
    }

    /** SSR／UR 戰法的半身英靈閃現（PROG-2-1861）：用施放方主將立繪；掛在 HUD 的父節點最上層，避免被卡欄蓋住；連續施放時新的取代舊的 */
    public async playTacticFlash(view: TacticFlashView, timing: TacticFlashTiming): Promise<void> {
        const generalId = view.side === 'player' ? this._pendingPlayerGeneralId : this._pendingEnemyGeneralId;
        const portrait = generalId
            ? await services().resource.loadSpriteFrame(this._buildPortraitPath(generalId)).catch(() => null)
            : null;
        if (!this.node.isValid) return;
        const host = this.node.parent?.isValid ? this.node.parent : this.node;
        host.getChildByName(TACTIC_FLASH_NODE)?.destroy();
        await playTacticFlash(host, portrait, view, timing);
    }

    public setPlayerGeneralId(generalId: string): void {
        this._pendingPlayerGeneralId = generalId;
        if (this._buildCompleted) this._refreshPortrait('player');
    }

    public setEnemyGeneralId(generalId: string): void {
        this._pendingEnemyGeneralId = generalId;
        if (this._buildCompleted) this._refreshPortrait('enemy');
    }

    public showPersistentStatus(msg: string): void {
        const nextMsg = msg.trim();
        this._persistentStatusMsg = nextMsg.length > 0 ? nextMsg : null;

        if (this._persistentStatusMsg) {
            this._showStatus(this._persistentStatusMsg);
            return;
        }

        this._clearStatus();
    }

    public clearPersistentStatus(): void {
        this._persistentStatusMsg = null;
        this._clearStatus();
    }

    /** SP bar 目前未使用，保留介面相容性 */
    public get playerSpBarNode(): Node | null { return null; }
    public get enemySpBarNode():  Node | null { return null; }

    /**
     * 等待 HUD 建構完成的 Promise。
     * @param timeoutMs  超時毫秒（預設 5000ms）
     */
    public waitUntilReady(timeoutMs = 5000): Promise<boolean> {
        if (this._buildCompleted) return Promise.resolve(true);
        return new Promise<boolean>((finish) => {
            this._readyWaiters.push(finish);
            this.scheduleOnce(() => finish(this._buildCompleted), Math.max(0, timeoutMs) / 1000);
        });
    }

    private async _showSettings(): Promise<void> {
        const host = this.node.parent ?? this.node;
        const node = host.getChildByName('BattleSettings') ?? new Node('BattleSettings');
        node.layer = this.node.layer;
        if (!node.parent) host.addChild(node);
        (node.getComponent(UITransform) ?? node.addComponent(UITransform)).setContentSize(1920, 1080);
        this._settings = node.getComponent(BattleSettingsComposite) ?? node.addComponent(BattleSettingsComposite);
        try { await this._settings.show(); }
        catch { services().event.emit(EVENT_NAMES.ShowToast, { text: '設定載入失敗，請再試一次' }); }
    }

    private _spState = { sp: 0, maxSp: 0 };

    private _renderSp(sp: number, maxSp: number): void {
        this._spState = { sp, maxSp };
        // 真實主將尚未就緒時不假造上限，也不曝光無意義的 0/0。
        if (maxSp <= 0) {
            if (this._spLabel) this._spLabel.string = 'SP 準備中';
            if (this._chargeLabel) this._chargeLabel.string = '奧義數值準備中';
            if (this._spReadyLabel) this._spReadyLabel.string = '奧義準備中';
            this._spFill?.setScale(0, 1, 1);
            return;
        }
        if (this._spLabel) this._spLabel.string = `SP ${sp}/${maxSp}`;
        if (this._chargeLabel) this._chargeLabel.string = `奧義消耗 SP ${maxSp}；目前 ${sp}/${maxSp}`;
        if (this._spReadyLabel) this._spReadyLabel.string = maxSp > 0 && sp >= maxSp ? '奧義可施放' : '奧義蓄力中';
        this._spFill?.setScale(maxSp > 0 ? Math.min(1, sp / maxSp) : 0, 1, 1);
    }

    // ── 私有工具 ─────────────────────────────────────────────

    private _flushReadyWaiters(ready: boolean): void {
        for (const fn of this._readyWaiters) fn(ready);
        this._readyWaiters.length = 0;
    }

    /**
     * 確保 HP bar 容器下存在 SolidBackground 填充子節點。
     * 若已存在則直接回傳；若不存在則建立。
     */
    /**
     * 在玩家血條正下方建立精力條（底板 + 填充），沿用血條的 SolidBackground 做法。
     * 布局 JSON 沒有這個節點，所以執行期建立；位置以血條中心為錨點推算。
     */
    private _ensureVitalityBar(root: Node): void {
        const hpBar = root.getChildByPath('PlayerFortressBar');
        if (!hpBar) return;

        if (!root.getChildByPath('PlayerVitalityBar')) {
            const hpTf = hpBar.getComponent(UITransform);
            const hpHeight = hpTf?.contentSize.height ?? 20;
            const trackNode = new Node('PlayerVitalityBar');
            trackNode.layer = hpBar.layer;
            root.addChild(trackNode);
            const trackTf = trackNode.addComponent(UITransform);
            trackTf.setContentSize(hpTf?.contentSize.width ?? 691, VITALITY_BAR_HEIGHT);
            const trackY = hpBar.position.y - hpHeight / 2 - VITALITY_BAR_GAP - VITALITY_BAR_HEIGHT / 2;
            trackNode.setPosition(hpBar.position.x, trackY, hpBar.position.z);
            trackNode.addComponent(SolidBackground).color = VITALITY_TRACK_COLOR;
        }

        this._playerVitalityTrack = root.getChildByPath('PlayerVitalityBar');
        this._playerVitalityFill = this._ensureBarFill(root, 'PlayerVitalityBar', VITALITY_FILL_COLOR);
    }

    private _renderPlayerVitality(): void {
        if (!this._playerVitalityFill) return;
        const ratio = vitalityBarRatio(this._playerVitality, this._playerMaxVitality);
        this._setBarFillRatio(this._playerVitalityFill, this._playerFortressTotalW, ratio);

        const grayed = isVitalityBarGrayed(this._playerVitality);
        const trackBg = this._playerVitalityTrack?.getComponent(SolidBackground);
        if (trackBg) trackBg.color = grayed ? VITALITY_TRACK_GRAYED_COLOR : VITALITY_TRACK_COLOR;
    }

    private _ensureBarFill(root: Node, barPath: string, color: Color): Node | null {
        const barNode = root.getChildByPath(barPath);
        if (!barNode) return null;

        const tf = barNode.getComponent(UITransform);
        const totalW = tf?.contentSize.width ?? 691;
        const totalH = tf?.contentSize.height ?? 20;

        let fillNode = barNode.getChildByPath('Fill');
        if (!fillNode) {
            fillNode = new Node('Fill');
            barNode.addChild(fillNode);
            const bg = fillNode.addComponent(SolidBackground);
            bg.color = color;
            const fillTf = fillNode.addComponent(UITransform);
            fillTf.setContentSize(totalW, totalH);

            const _anchorPoint = fillNode.getComponent(UITransform) ?? fillTf;
            const pos = fillNode.position.clone();
            fillNode.setPosition(-(totalW / 2), pos.y, pos.z);
        }
        return fillNode;
    }

    /**
     * 訂閱戰鬥相關事件。
     * 呼叫前確保 services().event 已初始化。
     */
    private _subscribeEvents(): void {
        if (this._unsubs.length > 0) return; // 防止重複訂閱
        const ev = services().event;
        this._unsubs.push(
            ev.on(EVENT_NAMES.GeneralSpChanged, (d: { faction: Faction; sp: number; maxSp: number }) => {
                if (d.faction === Faction.Player) this._renderSp(d.sp, d.maxSp);
            }),
            ev.on(EVENT_NAMES.TurnPhaseChanged,  (d) => this._onTurnPhaseChanged(d as { turn: number; food: number; maxFood: number })),
            ev.on(EVENT_NAMES.GeneralDamagedVisualCommitted, (d) => this._onGeneralDamaged(d as { faction: Faction; hp: number; maxHp: number })),
            ev.on(EVENT_NAMES.GeneralSkillUsed,  (d) => this._onGeneralSkillUsed(d as { faction: Faction; skillId?: string; skillName?: string; sourceType?: any })),
            ev.on(EVENT_NAMES.GeneralSkillEffect,(d) => this._onSkillEffect(d as { faction: Faction; skillId: string })),
            ev.on(EVENT_NAMES.FortressDamaged,   (d) => this._onFortressDamaged(d as { faction: Faction; hp: number })),
        );
    }

    private _replayPendingCalls(): void {
        if (this._pendingRefreshArgs) {
            this.refresh(...this._pendingRefreshArgs);
            this._pendingRefreshArgs = null;
        }
        if (this._pendingPlayerName !== null) {
            this.setPlayerName(this._pendingPlayerName);
            this._pendingPlayerName = null;
        }
        if (this._pendingStageTitle !== null) {
            this.setStageTitle(this._pendingStageTitle);
            this._pendingStageTitle = null;
        }
        if (this._pendingEnemyName !== null) {
            this.setEnemyName(this._pendingEnemyName);
            this._pendingEnemyName = null;
        }
        if (this._pendingPlayerGeneralId !== null) {
            this._refreshPortrait('player');
        }
        if (this._pendingEnemyGeneralId !== null) {
            this._refreshPortrait('enemy');
        }
        if (this._pendingSceneGambitBadgeText !== null) {
            this.showSceneGambitBadge(this._pendingSceneGambitBadgeText);
            this._pendingSceneGambitBadgeText = null;
        }
    }

    public showSceneGambitBadge(text: string): void {
        const nextText = text.trim();
        this._pendingSceneGambitBadgeText = nextText.length > 0 ? nextText : null;

        if (!this._buildCompleted) {
            return;
        }

        const visible = this._pendingSceneGambitBadgeText !== null;
        if (this._sceneGambitBadgeDock) {
            this._sceneGambitBadgeDock.active = visible;
        }
        if (this._sceneGambitBadgeLabel && this._pendingSceneGambitBadgeText !== null) {
            this._sceneGambitBadgeLabel.string = this._pendingSceneGambitBadgeText;
        }
    }

    public clearSceneGambitBadge(): void {
        this._pendingSceneGambitBadgeText = null;
        if (this._sceneGambitBadgeDock) {
            this._sceneGambitBadgeDock.active = false;
        }
        if (this._sceneGambitBadgeLabel) {
            this._sceneGambitBadgeLabel.string = '';
        }
    }

    // ── 事件處理 ─────────────────────────────────────────────

    private _onTurnPhaseChanged(d: { turn: number; food: number; maxFood: number }): void {
        this._setTurn(d.turn);
        this._setFood(d.food, d.maxFood);
    }

    private _onGeneralDamaged(d: { faction: Faction; hp: number; maxHp: number }): void {
        if (d.faction === Faction.Player) this._playerGeneralMaxHp = d.maxHp;
        else                              this._enemyGeneralMaxHp  = d.maxHp;
        this._setGeneralHealth(d.faction, d.hp);
    }

    private _onFortressDamaged(d: { faction: Faction; hp: number }): void {
        if (!d) return;
        this.setFortressHp(d.faction, d.hp);
    }

    private _onGeneralSkillUsed(d: { faction: Faction; skillId?: string; skillName?: string; sourceType?: any }): void {
        const skillId = d.skillId ?? d.skillName ?? null;
        const fallback = d.faction === Faction.Player ? '我方使用技能' : '敵方使用技能';
        this._flashStatus(skillId ? buildBattleSkillUsedMessage(skillId, d.faction, d.sourceType) : fallback);
    }

    private _onSkillEffect(d: { faction: Faction; skillId: string }): void {
        this._flashStatus(buildBattleSkillEffectMessage(d.skillId));
    }

    // ── 頭像互動 ─────────────────────────────────────────────

    private _onPortraitClick(side: 'player' | 'enemy'): void {
        const isEnemy = side === 'enemy';
        services().event.emit(EVENT_NAMES.RequestGeneralQuickView, { side, isEnemy });
        UCUFLogger.info(LogCategory.UI, `[BattleHUDComposite] 頭像點擊 → ${side}`);
    }

    private _bindPortraitInteraction(node: Node | null, side: 'player' | 'enemy'): void {
        if (!node) return;
        const defaultScale = node.scale.clone();
        const pressedScale = new Vec3(defaultScale.x * 1.05, defaultScale.y * 1.05, defaultScale.z);

        node.on(Button.EventType.CLICK, () => this._onPortraitClick(side), this);
        node.on(Node.EventType.TOUCH_START, () => { node.setScale(pressedScale); }, this);
        const resetScale = () => node.setScale(defaultScale);
        node.on(Node.EventType.TOUCH_END,   resetScale, this);
        node.on(Node.EventType.TOUCH_CANCEL,resetScale, this);
    }

    private _refreshPortrait(side: 'player' | 'enemy'): void {
        void this._applyPortrait(side);
    }

    private async _applyPortrait(side: 'player' | 'enemy'): Promise<void> {
        const portraitNode = side === 'player' ? this._playerPortraitNode : this._enemyPortraitNode;
        const generalId    = side === 'player' ? this._pendingPlayerGeneralId : this._pendingEnemyGeneralId;
        const fallbackPath = this._getPortraitFallbackPath(side);

        if (!portraitNode) return;

        const loadSeq = side === 'player'
            ? ++this._playerPortraitLoadSeq
            : ++this._enemyPortraitLoadSeq;

        const res = services().resource;
        let spriteFrame = null;

        if (generalId) {
            // 優先嘗試頭像（正式 → 自動裁切，規則見 data/general-art-paths.json）
            spriteFrame = await loadGeneralAvatar(generalId, false);
            // 退回完整立繪
            if (!spriteFrame) {
                spriteFrame = await res.loadSpriteFrame(this._buildPortraitPath(generalId)).catch(() => null);
                if (!spriteFrame) UCUFLogger.warn(LogCategory.UI, `[BattleHUDComposite] ${side} 立繪載入失敗：${generalId}`);
            }
        }

        // 最終退回 placeholder
        if (!spriteFrame) {
            spriteFrame = await res.loadSpriteFrame(fallbackPath).catch(() => null);
        }

        const latestSeq = side === 'player' ? this._playerPortraitLoadSeq : this._enemyPortraitLoadSeq;
        if (loadSeq !== latestSeq || !spriteFrame) return;

        const sprite = portraitNode.getComponent(Sprite) ?? portraitNode.addComponent(Sprite);
        sprite.spriteFrame = spriteFrame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    }

    private _buildPortraitPath(generalId: string): string {
        return portraitPathOf(generalId);
    }

    private _getPortraitFallbackPath(side: 'player' | 'enemy'): string {
        return side === 'player'
            ? 'sprites/battle/portrait_player_placeholder'
            : 'sprites/battle/portrait_enemy_placeholder';
    }

    // ── 內部更新 ─────────────────────────────────────────────

    private _setTurn(turn: number): void {
        if (this._turnLabel) this._turnLabel.string = `第 ${turn} 回合`;
    }

    private _setFood(food: number, maxFood: number): void {
        if (this._foodLabel) this._foodLabel.string = foodLabelText(food, maxFood);
    }

    /** 頭像旁標籤顯示主將血量；頂部長條改由城寨血量驅動（_renderFortress） */
    private _setGeneralHealth(faction: Faction, hp: number): void {
        const max   = faction === Faction.Player ? this._playerGeneralMaxHp : this._enemyGeneralMaxHp;
        const label = faction === Faction.Player ? this._playerFortressLabel : this._enemyFortressLabel;
        if (label) label.string = `${hp} / ${max}`;
    }

    private _renderFortress(faction: Faction): void {
        if (faction === Faction.Player) {
            this._setBarFillRatio(this._playerFortressFill, this._playerFortressTotalW, fortressBarRatio(this._playerFortressHp));
        } else {
            this._setBarFillRatio(this._enemyFortressFill, this._enemyFortressTotalW, fortressBarRatio(this._enemyFortressHp));
        }
    }

    private _setBarFillRatio(fillNode: Node | null, totalW: number, ratio: number): void {
        if (!fillNode) return;
        const tf = fillNode.getComponent(UITransform);
        if (!tf) return;
        const w = Math.max(0, Math.min(totalW, totalW * ratio));
        tf.setContentSize(w, tf.contentSize.height);
    }

    private _showStatus(msg: string): void {
        if (this._statusLabel) this._statusLabel.string = msg;
    }

    private _flashStatus(msg: string): void {
        this._showStatus(msg);
        this.scheduleOnce(() => {
            if (this._persistentStatusMsg) {
                this._showStatus(this._persistentStatusMsg);
                return;
            }

            this._clearStatus();
        }, GAME_CONFIG.SKILL_STATUS_DISPLAY_MS / 1000);
    }

    private _clearStatus(): void {
        if (this._statusLabel) this._statusLabel.string = '';
    }
}
