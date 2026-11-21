// PROG-2-9407：落腳揚塵粒子（2D 疊層）。一顆顆小塵粒往上飄、慢慢放大、淡出。
// 自寫輕量版：專案沒有現成的 2D 腳下塵土積木（ParticleSystem2D 沒人用、vfx-block-registry 都是大型 3D 煙霧）。
// 不用 tween：逐幀自己推進每顆粒子，節點是否啟用都不影響進度（引擎不推進未啟用節點上的 tween）。
// 手機記憶體優先：節點池有上限、共用一張程式產生的柔邊圓點貼圖，池滿就略過不新建。
import { Color, Layers, Node, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { DUST_START_ALPHA, MoveDustSpec, dustCountFor, rollDustParticle } from '../shared/MoveFeedback';

/**
 * 粒子池上限。估法：每次落腳帶頭者 4～7 顆（騎兵 7～10、沙漠再 ×1.25）＋兩名隊員減量，一般約 11 顆；
 * 步態倍率封頂 2.2 時約每 0.18 秒落一腳、塵粒壽命最長 0.9 秒，單隊同時存活約 50 顆。
 * 實機三隊同走時 120 顆會滿（11/19 量到 116），放寬到 160；再多的就略過（缺幾顆塵看不出來，節點不再增加）。
 */
export const DUST_PARTICLE_POOL_MAX = 160;
/** 貼圖邊長（像素）。小粒子不需要大圖，32×32 RGBA 只有 4KB。 */
const DOT_TEXTURE_SIZE = 32;

interface Particle {
  node: Node;
  sprite: Sprite;
  color: Color;
  alive: boolean;
  t: number;
  life: number;
  x0: number;
  y0: number;
  /** 水平位移總量（已含朝向，往身後） */
  dx: number;
  dy: number;
  s0: number;
  s1: number;
}

/** 產生柔邊圓點貼圖：白色、alpha 由中心向外平滑衰減，顏色交給 Sprite.color 上色。 */
function makeSoftDotFrame(): SpriteFrame | null {
  try {
    const size = DOT_TEXTURE_SIZE;
    const texture = new Texture2D();
    texture.reset({ width: size, height: size, format: Texture2D.PixelFormat.RGBA8888 });
    const data = new Uint8Array(size * size * 4);
    const center = (size - 1) / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x - center, y - center) / (size / 2);
        const falloff = Math.max(0, 1 - d);
        const alpha = falloff * falloff * (3 - 2 * falloff); // smoothstep，邊緣柔
        data.set([255, 255, 255, Math.round(alpha * 255)], (y * size + x) * 4);
      }
    }
    texture.uploadData(data);
    const frame = new SpriteFrame();
    frame.texture = texture;
    return frame;
  } catch {
    return null;
  }
}

/** 把 0→1 的進度做成快出慢收（塵粒剛揚起時動得快、之後飄緩）。 */
const easeOut = (u: number): number => 1 - (1 - u) * (1 - u);

export class MoveDustEmitter {
  private container: Node | null = null;
  private frame: SpriteFrame | null | undefined;
  private readonly pool: Particle[] = [];

  constructor(private readonly getParent: () => Node | null, private readonly layer: () => number = () => Layers.Enum.UI_2D) {}

  /**
   * 在腳點 (x, y) 揚起一次塵（座標與 SpineUnitOverlay 的單位節點同一個父節點）。
   * @param facing 單位面向；塵粒往面向的反側（身後）散開
   * @param isLeader 帶頭者揚滿量，小隊隊員減量
   */
  public emit(x: number, y: number, facing: 1 | -1, spec: MoveDustSpec, isLeader = true): void {
    const count = dustCountFor(spec, isLeader);
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return; // 池滿：略過，不新建
      const roll = rollDustParticle(spec);
      p.t = 0;
      p.life = roll.lifeSec;
      p.x0 = x + roll.jitterX;
      p.y0 = y + roll.jitterY;
      p.dx = -facing * roll.drift;
      p.dy = roll.rise;
      p.s0 = roll.startSize / DOT_TEXTURE_SIZE;
      p.s1 = p.s0 * roll.endScale;
      p.color.set(roll.color.r, roll.color.g, roll.color.b, Math.round(DUST_START_ALPHA * 255));
      p.sprite.color = p.color;
      p.node.setPosition(p.x0, p.y0, 0);
      p.node.setScale(p.s0, p.s0, 1);
      p.alive = true;
      p.node.active = true;
    }
  }

  /** 每幀推進；要在單位疊層排序之後呼叫，容器才會被放回最底層（塵在單位後面，不擋單位與跳字）。 */
  public update(dt: number): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.t += dt;
      if (p.t >= p.life || !p.node.isValid) {
        p.alive = false;
        if (p.node.isValid) p.node.active = false;
        continue;
      }
      const u = p.t / p.life;
      const e = easeOut(u);
      const s = p.s0 + (p.s1 - p.s0) * u;
      p.node.setPosition(p.x0 + p.dx * e, p.y0 + p.dy * e, 0);
      p.node.setScale(s, s, 1);
      p.color.a = Math.round(DUST_START_ALPHA * 255 * (1 - u * u)); // 前段維持濃度、後段才淡出，塵團看得清楚
      p.sprite.color = p.color;
    }
    // 單位疊層每幀重排 sibling index，容器要跟著送回最底
    if (this.container?.isValid && this.container.getSiblingIndex() !== 0) this.container.setSiblingIndex(0);
  }

  /** 揚塵容器（地面層），給單位疊層排序時固定壓在單位底下（PROG-2-9708） */
  public groundNode(): Node | null {
    return this.container?.isValid ? this.container : null;
  }

  /** 釋放所有節點與貼圖（場景銷毀時呼叫）。 */
  public destroy(): void {
    if (this.container?.isValid) this.container.destroy();
    this.container = null;
    this.pool.length = 0;
    const frame = this.frame;
    this.frame = undefined;
    if (frame) { frame.texture?.destroy(); frame.destroy(); }
  }

  private ensureContainer(): Node | null {
    if (this.container?.isValid) return this.container;
    const parent = this.getParent();
    if (!parent?.isValid) return null;
    const node = new Node('MoveDustLayer');
    node.layer = this.layer();
    parent.addChild(node);
    node.setSiblingIndex(0);
    this.container = node;
    return node;
  }

  private acquire(): Particle | null {
    for (const p of this.pool) if (!p.alive && p.node.isValid) return p;
    if (this.pool.length >= DUST_PARTICLE_POOL_MAX) return null;
    if (this.frame === undefined) this.frame = makeSoftDotFrame();
    const container = this.ensureContainer();
    if (!this.frame || !container) return null;
    const node = new Node('MoveDust');
    node.layer = this.layer();
    node.addComponent(UITransform).setContentSize(DOT_TEXTURE_SIZE, DOT_TEXTURE_SIZE);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.spriteFrame = this.frame;
    node.active = false;
    container.addChild(node);
    const particle: Particle = { node, sprite, color: new Color(), alive: false, t: 0, life: 1, x0: 0, y0: 0, dx: 0, dy: 0, s0: 1, s1: 1 };
    this.pool.push(particle);
    return particle;
  }
}
