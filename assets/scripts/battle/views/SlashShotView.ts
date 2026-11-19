// PROG-2-9367：近戰刀光——畫面層小 Sprite 池，寫法比照 ArrowShotView。刀光貼圖沒有 prefab，無法走 EffectSystem。
// PROG-2-9400：改為通用「普攻閃光」池，依 AttackShotSpec 畫刀光、刺光、衝擊圈、命中小爆、塵土；貼圖各自載入、各自快取。
import { assetManager, Color, ImageAsset, Node, Sprite, SpriteFrame, Texture2D, UITransform, Rect, Size } from 'cc';
import { ATTACK_SHOTS, AttackShotSpec, ShotPose, shotPoseAt, shotTotalSec } from '../shared/AttackShotStyle';

interface Shot { node: Node; sprite: Sprite; spec: AttackShotSpec; t: number; dirDeg: number; baseX: number; baseY: number; active: boolean }
type LoadState = 'loading' | 'ready' | 'failed';

export class SlashShotView {
  /** 同時最多幾道閃光；一回合內多隊同時交戰時夠用，超過就略過，不無限長節點。 */
  private static readonly MAX = 16;
  private readonly shots: Shot[] = [];
  private readonly frames = new Map<string, { state: LoadState; frame: SpriteFrame | null }>();
  private readonly color = new Color(255, 255, 255, 255);

  constructor(private readonly getParent: () => Node | null, private readonly layer: () => number) {}

  /**
   * 依特效清單在攻擊者 (fromX, fromY) 與目標 (toX, toY) 之間播閃光（畫面層座標）。
   * defaultAnchor 給沒指定出現位置的閃光（刀光）使用。回傳是否至少播出一個；全部貼圖都沒就緒時回 false，呼叫端可退回粒子特效。
   */
  public playShots(specs: readonly AttackShotSpec[], fromX: number, fromY: number, toX: number, toY: number, defaultAnchor: number): boolean {
    let played = false;
    const dirDeg = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
    for (const spec of specs) {
      const anchor = spec.anchor ?? defaultAnchor;
      if (this.play(spec, fromX + (toX - fromX) * anchor, fromY + (toY - fromY) * anchor, dirDeg)) played = true;
    }
    return played;
  }

  private play(spec: AttackShotSpec, x: number, y: number, dirDeg: number): boolean {
    try {
      const frame = this.frameFor(spec);
      if (!frame) return false;
      const parent = this.getParent();
      if (!parent || !parent.isValid) return false;
      // 場景重載後舊節點會失效：先清掉，免得重用到已銷毀的節點
      for (let i = this.shots.length - 1; i >= 0; i--) if (!this.shots[i].node.isValid) this.shots.splice(i, 1);
      let shot = this.shots.find(s => !s.active);
      if (!shot) {
        if (this.shots.length >= SlashShotView.MAX) return false;
        const node = new Node('AttackShot');
        node.layer = this.layer();
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        shot = { node, sprite, spec, t: 0, dirDeg: 0, baseX: 0, baseY: 0, active: false };
        this.shots.push(shot);
      }
      shot.spec = spec;
      shot.sprite.spriteFrame = frame;
      shot.node.getComponent(UITransform)?.setContentSize(new Size(spec.width, spec.height));
      if (shot.node.parent !== parent) parent.addChild(shot.node);
      shot.t = 0; shot.active = true; shot.dirDeg = dirDeg; shot.baseX = x; shot.baseY = y;
      shot.node.setSiblingIndex(parent.children.length - 1);
      this.apply(shot, shotPoseAt(spec, 0, dirDeg));
      return true;
    } catch (error) { console.warn('[SlashShotView] 普攻閃光略過', error); return false; }
  }

  /** PROG-2-9412：貼圖第一次用到才載，會讓開戰第一刀的火花／刀光整個不出現；bundle 一就緒就先把全部普攻貼圖載好。 */
  private warmed = false;

  public update(dt: number): void {
    if (!this.warmed && assetManager.getBundle('vfx_core')) {
      this.warmed = true;
      for (const specs of Object.values(ATTACK_SHOTS)) for (const spec of specs) this.frameFor(spec);
    }
    for (const s of this.shots) {
      if (!s.active) continue;
      s.t += dt;
      if (s.t >= shotTotalSec(s.spec) || !s.node.isValid) { s.active = false; if (s.node.isValid) s.node.active = false; continue; }
      this.apply(s, shotPoseAt(s.spec, s.t, s.dirDeg));
    }
  }

  private apply(s: Shot, pose: ShotPose): void {
    s.node.active = pose.visible;
    s.node.angle = pose.angle;
    s.node.setScale(pose.scale, pose.scale, 1);
    const rad = s.dirDeg * Math.PI / 180;
    s.node.setPosition(s.baseX + Math.cos(rad) * pose.slide, s.baseY + Math.sin(rad) * pose.slide, 0);
    this.color.set(s.spec.color.r, s.spec.color.g, s.spec.color.b, pose.opacity);
    s.sprite.color = this.color;
  }

  /** 取貼圖；沒載入就開始載（每張只試一次，失敗永遠安靜略過）。就緒才回傳。 */
  private frameFor(spec: AttackShotSpec): SpriteFrame | null {
    const entry = this.frames.get(spec.key);
    if (entry) return entry.state === 'ready' ? entry.frame : null;
    const bundle = assetManager.getBundle('vfx_core');
    if (!bundle) return null; // bundle 還沒載好：不算失敗，下一次再試（無錯誤輸出）
    const record: { state: LoadState; frame: SpriteFrame | null } = { state: 'loading', frame: null };
    this.frames.set(spec.key, record);
    bundle.load(spec.texturePath, ImageAsset, (err, image) => {
      if (err || !image) { record.state = 'failed'; return; }
      try {
        const texture = new Texture2D();
        texture.image = image;
        const frame = new SpriteFrame();
        // 先設 texture 再設 rect，否則 rect 會被重設
        frame.texture = texture;
        const r = spec.rect;
        frame.rect = r ? new Rect(r.x, r.y, r.w, r.h) : new Rect(0, 0, image.width, image.height);
        record.frame = frame;
        record.state = 'ready';
      } catch { record.state = 'failed'; }
    });
    return null;
  }
}
