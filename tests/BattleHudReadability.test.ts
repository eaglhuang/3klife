// @spec-source → Issue #2074；PROG-2-2217
import { assert, TestSuite } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';
const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');
export function createBattleHudReadabilitySuite(): TestSuite {
 const suite = new TestSuite('BattleHudReadability');
 const layout = JSON.parse(read('assets/resources/ui-spec/layouts/action-command-main.json')).root;
 const nodes = Object.fromEntries(layout.children.map((n: any) => [n.name, n]));
 const rect = (n: any) => { const x = n.widget.left ?? layout.width - (n.widget.right ?? 0) - n.width;
   const y = n.widget.top ?? layout.height - (n.widget.bottom ?? 0) - n.height;
   return { x, y, right: x+n.width, bottom: y+n.height }; };
 suite.test('奧義含10px充能環與計謀、單挑的點擊矩形不相交', () => {
   const u=rect(nodes.UltimateBtn); u.right+=10; u.x-=10; u.y-=10; u.bottom+=10;
   const t=rect(nodes.TacticsBtn), d=rect(nodes.DuelBtn);
   assert.isTrue(u.right+8<=t.x); assert.isTrue(t.right+8<=d.x);
 });
 suite.test('結束回合有清楚文字、大點擊區，與下方指令群不重疊', () => {
   const e=nodes.EndTurnBtn, r=rect(e), u=rect(nodes.UltimateBtn);
   assert.isTrue(e.width>=200 && e.height>=56); assert.isTrue(r.bottom+8<=u.y);
   assert.equals('結束回合',e.children.find((n:any)=>n.name==='EndTurnLabel').text);
   const skin=JSON.parse(read('assets/resources/ui-spec/skins/action-command-default.json'));
   assert.isTrue(skin.slots['action.util.endturn.label'].fontSize>=22);
 });
 suite.test('戰報文字頂端錨點、內距與實際換行高度接線，避免第一行長到標題上', () => {
   const src=read('assets/scripts/ui/components/BattleLogComposite.ts');
   assert.contains(src,'labelTf.setAnchorPoint(0.5, 1)');
   assert.contains(src,'this.logLabel.node.setPosition(0, -12, 0)');
   assert.contains(src,'Label.Overflow.RESIZE_HEIGHT');
   assert.contains(src,'Math.max(viewportHeight, renderedHeight + 24)');
 });
 return suite;
}
