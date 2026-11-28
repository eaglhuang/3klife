/**
 * SpineAtlasMerge — 戰場 Spine 多頁圖集執行期合併（PROG-2-10270）
 *
 * 根因（實測 draw call 逐項拆解）：騎兵／呂布骨架有 15～16 張 512 圖集頁，slot 繪製順序在各頁之間交錯，
 * Spine 每遇到貼圖不同就切一次 draw，一具騎兵 17～26 次；步、弓、盾、槍兵單頁，每具只有 1 次。
 * 101 具單位的 Spine 部分約 510 次 draw，騎兵就佔 480。
 * 做法：載入後把各頁貼圖用 GPU 拷貝併成單頁、改寫 atlas 文字（bounds 平移）、產生合併版 SkeletonData，
 * 骨骼、動畫、slot 順序、美術資產都不動，畫面等價，一具騎兵降為 1 次 draw。
 * 可由 setSpineAtlasMergeEnabled(false) 整個關閉、門檻 SPINE_ATLAS_MERGE_MIN_PAGES 可調；任何一步失敗都回傳原資料。
 */
import { Texture2D, director, gfx, sp } from 'cc';

/** 骨架貼圖頁數達到這個數字才合併；單頁骨架本來就只有 1 次 draw，不處理。 */
export const SPINE_ATLAS_MERGE_MIN_PAGES = 3;
/** 合併後單邊上限（像素）；超過就放棄合併（手機貼圖上限保守取 2048）。 */
export const SPINE_ATLAS_MERGE_MAX_SIZE = 2048;

let mergeEnabled = true;
/** 整個功能的總開關（除錯／回退用）；預設開。 */
export function setSpineAtlasMergeEnabled(enabled: boolean): void { mergeEnabled = enabled; }
export function isSpineAtlasMergeEnabled(): boolean { return mergeEnabled; }

export interface AtlasPageSize { name: string; width: number; height: number }
export interface MergedAtlasText {
  text: string; width: number; height: number; name: string;
  /** 各頁在合併頁內的左上角位置（與 pages 同序） */
  origins: Array<{ x: number; y: number }>;
}

/**
 * 純函式：把多頁 atlas 文字併成單頁。格子大小取各頁最大寬高、近似方陣排列，region 的 bounds 依所在格子平移。
 * 只支援 Spine 4.x 文字格式（bounds:）；舊格式（xy:）、頁名對不上、頁表頭 pma 不是 false、合併後超過 maxSize 一律回傳 null。
 */
export function mergeAtlasText(atlasText: string, pages: ReadonlyArray<AtlasPageSize>, maxSize = SPINE_ATLAS_MERGE_MAX_SIZE): MergedAtlasText | null {
  if (pages.length < 2 || /^\s*xy\s*:/m.test(atlasText)) return null;
  const cellW = Math.max(...pages.map(p => p.width));
  const cellH = Math.max(...pages.map(p => p.height));
  const cols = Math.ceil(Math.sqrt(pages.length));
  const rows = Math.ceil(pages.length / cols);
  const width = cols * cellW, height = rows * cellH;
  if (width > maxSize || height > maxSize) return null;
  const origins = pages.map((_, i) => ({ x: (i % cols) * cellW, y: Math.floor(i / cols) * cellH }));
  const originOf = new Map<string, { x: number; y: number }>();
  pages.forEach((p, i) => originOf.set(p.name, origins[i]));
  const name = 'merged-atlas.png';
  const out: string[] = [name, `size: ${width},${height}`, 'filter: Linear,Linear', 'pma: false'];
  let cur: { x: number; y: number } | null = null;
  let inHeader = false; // 頁名之後、第一個 region 名稱之前的行是頁表頭，丟棄
  let regions = 0;
  for (const raw of atlasText.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') continue;
    if (!line.includes(':')) {
      const page = originOf.get(line);
      if (page) { cur = page; inHeader = true; continue; }
      if (!cur) return null; // 還沒遇到任何頁就出現 region，格式不對
      inHeader = false;
      out.push(line); regions += 1;
      continue;
    }
    if (inHeader) {
      if (/^pma\s*:\s*true/i.test(line)) return null; // 預乘貼圖不合併（混合模式不同，保守處理）
      continue;
    }
    const bounds = /^bounds\s*:\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*$/.exec(line);
    if (bounds) {
      if (!cur) return null;
      out.push(`bounds: ${Number(bounds[1]) + cur.x},${Number(bounds[2]) + cur.y},${bounds[3]},${bounds[4]}`);
    } else out.push(line);
  }
  if (regions === 0) return null;
  return { text: out.join('\n'), width, height, name, origins };
}

interface MergedEntry { data: sp.SkeletonData; texture: Texture2D; users: number }
/** 原始骨架資料 → 合併版（含引用計數）；同一份原始資料只合併一次。 */
const mergedBySource = new Map<sp.SkeletonData, MergedEntry>();
/** 不需要或無法合併的原始資料（單頁、舊格式、建立失敗），不重複嘗試；弱參照不影響資源回收。 */
const unmergeable = new WeakSet<sp.SkeletonData>();

type PageImage = TexImageSource | ArrayBufferView;

function imageOf(texture: Texture2D): PageImage | null {
  const data = (texture.image as { data?: unknown } | null)?.data;
  return data ? data as PageImage : null;
}

function buildMerged(source: sp.SkeletonData): MergedEntry | null {
  const textures: Texture2D[] = source.textures;
  const names: string[] = source.textureNames;
  if (!textures || textures.length < SPINE_ATLAS_MERGE_MIN_PAGES || names.length !== textures.length) return null;
  // 只處理 JSON 骨架（骨架檔本身原封不動帶進合併版）
  if (!source.skeletonJson) return null;
  const images = textures.map(imageOf);
  if (images.some(image => !image)) return null;
  const atlas = mergeAtlasText(source.atlasText, textures.map((t, i) => ({ name: names[i], width: t.width, height: t.height })));
  if (!atlas) return null;
  const texture = new Texture2D();
  try {
    texture.reset({ width: atlas.width, height: atlas.height, format: Texture2D.PixelFormat.RGBA8888, mipmapLevel: 1 });
    texture.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);
    texture.setWrapMode(Texture2D.WrapMode.CLAMP_TO_EDGE, Texture2D.WrapMode.CLAMP_TO_EDGE);
    const gfxTexture = texture.getGFXTexture();
    const device = director.root?.device;
    if (!gfxTexture || !device) { texture.destroy(); return null; }
    const regions = textures.map((t, i) => {
      const region = new gfx.BufferTextureCopy();
      region.texOffset.x = atlas.origins[i].x; region.texOffset.y = atlas.origins[i].y;
      region.texExtent.width = t.width; region.texExtent.height = t.height; region.texExtent.depth = 1;
      return region;
    });
    // 網頁版頁圖是影像元素；原生版是位元組陣列，兩條路徑都支援
    if (ArrayBuffer.isView(images[0])) device.copyBuffersToTexture(images as ArrayBufferView[], gfxTexture, regions);
    else device.copyTexImagesToTexture(images as TexImageSource[], gfxTexture, regions);
    const data = new sp.SkeletonData();
    (data as unknown as { _uuid: string })._uuid = `${(source as unknown as { _uuid: string })._uuid}-merged`;
    data.name = `${source.name}-merged`;
    data.scale = source.scale;
    data.skeletonJson = source.skeletonJson;
    data.atlasText = atlas.text;
    data.textures = [texture];
    data.textureNames = [atlas.name];
    return { data, texture, users: 0 };
  } catch {
    if (texture.isValid) texture.destroy();
    return null;
  }
}

/**
 * 取得單位實際要用的骨架資料：多頁骨架回傳合併版，其餘（或失敗、功能關閉）回傳原資料。
 * 每次成功取得要配對一次 releaseMergedSkeleton，用引用計數決定何時銷毀合併貼圖。
 */
export function acquireMergedSkeleton(source: sp.SkeletonData): sp.SkeletonData {
  if (!mergeEnabled || unmergeable.has(source)) return source;
  let entry = mergedBySource.get(source);
  if (!entry) {
    const built = buildMerged(source);
    if (!built) { unmergeable.add(source); return source; }
    entry = built; mergedBySource.set(source, entry);
  }
  entry.users += 1;
  return entry.data;
}

/** 歸還 acquireMergedSkeleton 取得的引用；最後一個使用者離開時銷毀合併貼圖與資料。 */
export function releaseMergedSkeleton(source: sp.SkeletonData): void {
  const entry = mergedBySource.get(source);
  if (!entry) return;
  entry.users -= 1;
  if (entry.users > 0) return;
  mergedBySource.delete(source);
  if (entry.data.isValid) entry.data.destroy();
  if (entry.texture.isValid) entry.texture.destroy();
}

/** 目前存活的合併版數量（測試與除錯用）。 */
export function mergedSkeletonCount(): number {
  return mergedBySource.size;
}
