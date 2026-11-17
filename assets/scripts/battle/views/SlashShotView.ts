// PROG-2-9367：近戰刀光——畫面層小 Sprite 池，寫法比照 ArrowShotView。刀光貼圖沒有 prefab，無法走 EffectSystem。
import { assetManager, Color, ImageAsset, Node, Sprite, SpriteFrame, Texture2D, UITransform, Rect, Size } from 'cc';
import { ATTACK_SLASH_SHOT, slashPoseAt } from '../shared/AttackSlashShot';

interface Slash { node: Node; sprite: Sprite; t: number; dirDeg: number; active: boolean }

export class SlashShotView {
  /** 同時最多幾道刀光；一回合內多隊同時交戰時夠用，超過就略過，不無限長節點。 */
  private static readonly MAX = 8;
  private readonly slashes: Slash[] = [];
  private frame: SpriteFrame | null = null;
  /** 載入只試一次：失敗就永遠安靜略過，不刷錯誤。 */
  private loadState: 'idle' | 'loading' | 'ready' | 'failed' = 'idle';
  private readonly color = new Color(ATTACK_SLASH_SHOT.color.r, ATTACK_SLASH_SHOT.color.g, ATTACK_SLASH_SHOT.color.b, 255);

  constructor(private readonly getParent: () => Node | null, private readonly layer: () => number) {}

  /** 在 (x, y) 播一道刀光；(fromX, fromY) 是攻擊者位置，用來決定刀光朝向。回傳是否真的播出。 */
  public play(fromX: number, fromY: number, x: number, y: number): boolean {
    try {
      this.ensureLoaded();
      if (this.loadState !== 'ready' || !this.frame) return false;
      const parent = this.getParent();
      if (!parent || !parent.isValid) return false;
      // 場景重載後舊節點會失效：先清掉，免得重用到已銷毀的節點
      for (let i = this.slashes.length - 1; i >= 0; i--) if (!this.slashes[i].node.isValid) this.slashes.splice(i, 1);
      let slash = this.slashes.find(s => !s.active);
      if (!slash) {
        if (this.slashes.length >= SlashShotView.MAX) return false;
        const node = new Node('SlashShot');
        node.layer = this.layer();
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = this.frame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        node.getComponent(UITransform)?.setContentSize(new Size(ATTACK_SLASH_SHOT.size, ATTACK_SLASH_SHOT.size));
        slash = { node, sprite, t: 0, dirDeg: 0, active: false };
        this.slashes.push(slash);
      }
      if (slash.node.parent !== parent) parent.addChild(slash.node);
      slash.t = 0; slash.active = true;
      slash.dirDeg = Math.atan2(y - fromY, x - fromX) * 180 / Math.PI;
      slash.node.setPosition(x, y, 0);
      slash.node.setSiblingIndex(parent.children.length - 1);
      this.apply(slash);
      slash.node.active = true;
      return true;
    } catch (error) { console.warn('[SlashShotView] 刀光演出略過', error); return false; }
  }

  public update(dt: number): void {
    for (const s of this.slashes) {
      if (!s.active) continue;
      s.t += dt / ATTACK_SLASH_SHOT.durationSec;
      if (s.t >= 1 || !s.node.isValid) { s.active = false; if (s.node.isValid) s.node.active = false; continue; }
      this.apply(s);
    }
  }

  private apply(s: Slash): void {
    const pose = slashPoseAt(s.t, s.dirDeg);
    s.node.angle = pose.angle;
    s.node.setScale(pose.scale, pose.scale, 1);
    this.color.a = pose.opacity;
    s.sprite.color = this.color;
  }

  private ensureLoaded(): void {
    if (this.loadState !== 'idle') return;
    const bundle = assetManager.getBundle('vfx_core');
    if (!bundle) return; // bundle 還沒載好：不算失敗，下一刀再試（無錯誤輸出）
    this.loadState = 'loading';
    bundle.load(ATTACK_SLASH_SHOT.texturePath, ImageAsset, (err, image) => {
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
