// PROG-2-9353：弓兵箭矢——畫面層小 Sprite 池，不動 core 層；proj_arrow 沒有 prefab，無法走 EffectSystem。
import { assetManager, ImageAsset, Node, Sprite, SpriteFrame, Texture2D, UITransform, Rect, Size } from 'cc';
import { ATTACK_ARROW_TEXTURE_PATH } from '../shared/AttackVfxMapping';

interface Shot { node: Node; t: number; fromX: number; fromY: number; toX: number; toY: number; active: boolean }

export class ArrowShotView {
  private static readonly MAX = 6;
  private static readonly FLIGHT_SEC = 0.25;
  private readonly shots: Shot[] = [];
  private frame: SpriteFrame | null = null;
  /** 載入只試一次：失敗就永遠安靜略過，不刷錯誤。 */
  private loadState: 'idle' | 'loading' | 'ready' | 'failed' = 'idle';

  constructor(private readonly getParent: () => Node | null, private readonly layer: () => number) {}

  public shoot(fromX: number, fromY: number, toX: number, toY: number): void {
    try {
      this.ensureLoaded();
      if (this.loadState !== 'ready' || !this.frame) return;
      const parent = this.getParent();
      if (!parent || !parent.isValid) return;
      // 場景重載後舊節點會失效：先清掉，免得重用到已銷毀的節點
      for (let i = this.shots.length - 1; i >= 0; i--) if (!this.shots[i].node.isValid) this.shots.splice(i, 1);
      let shot = this.shots.find(s => !s.active);
      if (!shot) {
        if (this.shots.length >= ArrowShotView.MAX) return;
        const node = new Node('ArrowShot');
        node.layer = this.layer();
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = this.frame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        node.getComponent(UITransform)?.setContentSize(new Size(64, 16));
        shot = { node, t: 0, fromX, fromY, toX, toY, active: false };
        this.shots.push(shot);
      }
      if (shot.node.parent !== parent) parent.addChild(shot.node);
      shot.t = 0; shot.fromX = fromX; shot.fromY = fromY; shot.toX = toX; shot.toY = toY; shot.active = true;
      shot.node.setPosition(fromX, fromY, 0);
      shot.node.angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
      shot.node.active = true;
    } catch (error) { console.warn('[ArrowShotView] 射箭演出略過', error); }
  }

  public update(dt: number): void {
    for (const s of this.shots) {
      if (!s.active) continue;
      s.t += dt / ArrowShotView.FLIGHT_SEC;
      if (s.t >= 1 || !s.node.isValid) { s.active = false; if (s.node.isValid) s.node.active = false; continue; }
      s.node.setPosition(s.fromX + (s.toX - s.fromX) * s.t, s.fromY + (s.toY - s.fromY) * s.t, 0);
    }
  }

  private ensureLoaded(): void {
    if (this.loadState !== 'idle') return;
    const bundle = assetManager.getBundle('vfx_core');
    if (!bundle) return; // bundle 還沒載好：不算失敗，下一箭再試（無錯誤輸出）
    this.loadState = 'loading';
    bundle.load(ATTACK_ARROW_TEXTURE_PATH, ImageAsset, (err, image) => {
      if (err || !image) { this.loadState = 'failed'; return; }
      try {
        const texture = new Texture2D();
        texture.image = image;
        const frame = new SpriteFrame();
        // 先設 texture 再設 rect，否則 rect 會被重設
        frame.texture = texture;
        frame.rect = new Rect(0, 0, image.width, image.height);
        this.frame = frame;
        this.loadState = 'ready';
      } catch { this.loadState = 'failed'; }
    });
  }
}
