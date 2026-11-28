/**
 * SpineAtlasMerge — 戰場 Spine 多頁圖集合併的 atlas 文字改寫（PROG-2-10270）
 * 重點：region 的 bounds 要依所在頁平移、其他屬性原樣保留、不支援的格式回傳 null（呼叫端退回原資料）。
 */
import { assert, TestSuite } from './TestRunner';
import { mergeAtlasText } from '../assets/scripts/battle/views/SpineAtlasMerge';

const ATLAS = [
  'a.png', 'size: 512,512', 'filter: Linear,Linear', 'pma: false',
  'head', 'bounds: 2,2,171,169',
  'arm', 'bounds: 177,2,114,119', 'offsets: 1,2,120,130', 'rotate: 90',
  '',
  'b.png', 'size: 512,512', 'filter: Linear,Linear', 'pma: false',
  'body', 'bounds: 2,254,428,247',
  '',
  'c.png', 'size: 256,512', 'filter: Linear,Linear', 'pma: false',
  'tail', 'bounds: 2,2,140,172',
].join('\n');
const PAGES = [{ name: 'a.png', width: 512, height: 512 }, { name: 'b.png', width: 512, height: 512 }, { name: 'c.png', width: 256, height: 512 }];

export function createSpineAtlasMergeSuite(): TestSuite {
  const suite = new TestSuite('SpineAtlasMerge (多頁圖集合併 PROG-2-10270)');

  suite.test('三頁併成 2x2 格子，bounds 依頁平移，其他屬性保留', () => {
    const merged = mergeAtlasText(ATLAS, PAGES);
    assert.isTrue(!!merged, '應可合併');
    const m = merged!;
    assert.equals(1024, m.width); assert.equals(1024, m.height);
    assert.equals(JSON.stringify([{ x: 0, y: 0 }, { x: 512, y: 0 }, { x: 0, y: 512 }]), JSON.stringify(m.origins));
    const lines = m.text.split('\n');
    assert.equals('merged-atlas.png', lines[0]);
    assert.equals(1, lines.filter(l => l.endsWith('.png')).length, '只剩一頁');
    assert.equals(1, lines.filter(l => l.startsWith('size:')).length, '頁表頭只留一份');
    assert.isTrue(lines.includes('bounds: 2,2,171,169'), '第一頁不平移');
    assert.isTrue(lines.includes('bounds: 514,254,428,247'), '第二頁 x 平移 512');
    assert.isTrue(lines.includes('bounds: 2,514,140,172'), '第三頁 y 平移 512');
    assert.isTrue(lines.includes('offsets: 1,2,120,130') && lines.includes('rotate: 90'), 'offsets／rotate 原樣保留');
  });

  suite.test('不支援的情況一律回傳 null：舊格式、預乘貼圖、超過上限、頁名對不上', () => {
    assert.isTrue(mergeAtlasText('a.png\nsize: 8,8\nhead\n  xy: 0, 0\n  size: 4, 4', PAGES) === null, '舊格式 xy:');
    assert.isTrue(mergeAtlasText(ATLAS.replace('pma: false', 'pma: true'), PAGES) === null, '預乘貼圖');
    assert.isTrue(mergeAtlasText(ATLAS, PAGES, 512) === null, '合併後超過單邊上限');
    assert.isTrue(mergeAtlasText(ATLAS, [{ name: 'x.png', width: 512, height: 512 }, { name: 'y.png', width: 512, height: 512 }]) === null, '頁名對不上');
    assert.isTrue(mergeAtlasText(ATLAS, [PAGES[0]]) === null, '單頁不合併');
  });

  return suite;
}
