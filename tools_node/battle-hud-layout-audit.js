#!/usr/bin/env node
/** Battle-only static contract audit. Not a Cocos renderer: decorative skin layers and scroll content are intentionally excluded.
 * Canvas uses project fitHeight=1080: report both logical bounds and CSS-pixel touch/font sizes.
 * node tools_node/battle-hud-layout-audit.js --strict [--ref <git-ref>]
 */
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ROOT=path.resolve(__dirname,'..');
const VIEWPORTS=[[1920,1080],[1280,720],[1440,900],[1024,768],[1080,1920]];
const len=(n,total,fallback=0)=>typeof n==='string'&&n.endsWith('%')?parseFloat(n)*total/100:typeof n==='number'?n:fallback;
function visible(root){const result=[];const walk=n=>{if(n.active===false)return;result.push(n);for(const c of n.children||[])walk(c);};walk(root);return result;}
function overlap(a,b){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
function rect(n,w,h){const a=n.widget||{};const width=a.left!==undefined&&a.right!==undefined?w-a.left-a.right:len(n.width,w,w);
 const height=a.top!==undefined&&a.bottom!==undefined?h-a.top-a.bottom:len(n.height,h,0);
 return {x:a.left??(a.right!==undefined?w-a.right-width:(w-width)/2),y:a.top??(a.bottom!==undefined?h-a.bottom-height:0),width,height};}
function auditBattleHud(options={}) {
 const cache=new Map();const read=f=>{if(!cache.has(f))cache.set(f,options.ref?cp.execFileSync('git',['show',`${options.ref}:${f}`],{cwd:ROOT,encoding:'utf8'}):fs.readFileSync(path.join(ROOT,f),'utf8'));return cache.get(f);};
 const json=(kind,f)=>JSON.parse(read(`assets/resources/ui-spec/${kind}/${f}.json`));
 const names=['battle-hud-screen','action-command-main','tiger-tally-main','battle-log-main','strategist-hud-main'];
 const docs=names.map(n=>json('layouts',n));
 const skins=['battle-hud-screen.skin','action-command-default','tiger-tally-default','battle-log-default','strategist-hud-battle'].map(n=>json('skins',n).slots);
 const issues=[],cases=[];const add=(v,code,node,detail)=>issues.push({viewport:v,code,node,detail});
 const get=(nodes,name)=>nodes.find(n=>n.name===name);
 for(const [pw,ph] of options.viewports||VIEWPORTS){
  const key=`${pw}x${ph}`,w=1080*pw/ph,h=1080,scale=ph/1080;
  const active=docs.map(d=>visible(d.root));const hud=active[0],commands=active[1],cards=active[2],log=active[3];
  const top=get(hud,'BattleHudScreen_div_1'),sp=get(hud,'BattleHudScreen_div_122');
  const cardRect=rect(docs[2].root,w,h),logRect=rect(docs[3].root,w,h);
  // 戰報面板改成右緣直排後根節點自帶高度、不再靠直向排版加總（PROG-2-9377）
  logRect.height=docs[3].root.layout?.type==='vertical'?(docs[3].root.children||[]).filter(n=>n.active!==false).reduce((s,n)=>s+len(n.height,h),0):len(docs[3].root.height,h);
  const groups={top:rect(top,w,h),cards:cardRect,log:logRect,commands:rect(docs[1].root,w,h)};
  // B1（PROG-2-10133）：功能鈕列放在頂欄右側；頂欄的內容區止於功能鈕列左緣，之後的重疊才算違規
  if(logRect.y>=groups.top.y-.1&&logRect.y+logRect.height<=groups.top.y+groups.top.height+.1&&logRect.x>groups.top.x)groups.top.width=Math.min(groups.top.width,logRect.x-groups.top.x);
  if(sp)groups.sp=rect(sp,w,h);
  for(const n of docs[4].root.children) if(n.active!==false) groups[n.name]=rect(n,w,h);
  for(const [name,r]of Object.entries(groups)){
   if(r.x<0||r.y<0||r.x+r.width>w+.1||r.y+r.height>h+.1)add(key,'viewport',name,r);
  }
  const pairs=Object.entries(groups);for(let i=0;i<pairs.length;i++)for(let j=i+1;j<pairs.length;j++)if(overlap(pairs[i][1],pairs[j][1]))add(key,'group-overlap',`${pairs[i][0]} / ${pairs[j][0]}`,'active HUD groups intersect');
  if(get(hud,'BattleHudScreen_button_1'))add(key,'duplicate-endturn','BattleHudScreen_button_1','HTML sample end-turn overlaps authoritative ActionCommand');
  const row=(get(log,'ControlBar'));const padding=(row.layout?.paddingLeft||0)+(row.layout?.paddingRight||0);
  const rowKids=row.children.filter(n=>n.active!==false);
  // 直排時每顆鈕各佔一列，只要最寬的那顆不超出；橫排維持原本的加總
  const rowWidth=(row.layout?.type==='vertical'?Math.max(0,...rowKids.map(n=>len(n.width,logRect.width))):rowKids.reduce((s,n)=>s+len(n.width,logRect.width),0)+(row.layout?.spacing||0)*Math.max(0,rowKids.length-1))+padding;
  if(rowWidth>logRect.width+.1)add(key,'row-overflow','ControlBar',{rowWidth,available:logRect.width});
  const mainWidth=top.widget?.left!==undefined&&top.widget?.right!==undefined?w:len(top.width,w);
  const parts=top.children.filter(n=>n.active!==false);const topWidth=parts.reduce((s,n)=>s+len(n.width,mainWidth),0)+(top.layout?.paddingLeft||0)+(top.layout?.paddingRight||0);
  if(topWidth>mainWidth+.1)add(key,'row-overflow','TopBar',{topWidth,available:mainWidth});
  for(let i=0;i<active.length;i++)for(const n of active[i]){
   const interactive=n.type==='button'||n.name==='BattleHudScreen_div_12';
   if(interactive){const parentWidth=i===2?cardRect.width:i===3?logRect.width:i===1?groups.commands.width:w;
    const bw=len(n.width,parentWidth,parentWidth),bh=len(n.height,h);
    if(Math.min(bw,bh)*scale<47.9)add(key,'touch-target',n.name,{cssWidth:bw*scale,cssHeight:bh*scale});
   }
   if(n.type==='label'&&n.styleSlot){const style=skins[i][n.styleSlot];if(!style)continue;
    const font=Number(style.fontSize)||0,line=Number(style.lineHeight)||font;
    if(font*scale<14)add(key,'small-font',n.name,{cssFont:font*scale});
    if(n.height&&typeof n.height==='number'&&line>n.height+.1)add(key,'line-clipped',n.name,{line,height:n.height});
   }
  }
  for(const n of cards.filter(n=>/^UnitName|^FrameTitlePlaque/.test(n.name))){if(len(n.width,cardRect.width)>cardRect.width-16)add(key,'card-overflow',n.name,{width:n.width,cardWidth:cardRect.width});}
  const cardChildren=docs[2].root.children.filter(n=>n.active!==false);const cardBottom=cardRect.y+cardChildren.reduce((s,n)=>s+n.height,0)+(cardChildren.length-1)*(docs[2].root.layout?.spacing||0);
  if(cardBottom>h)add(key,'card-stack-clipped','TigerTallyRoot',{bottom:cardBottom,height:h});
  const sample=docs[2].root.children[0];
  const nameNode=get(sample.children,'UnitName1'),costNode=get(sample.children,'CostBadge1');
  if(overlap(rect(nameNode,cardRect.width,sample.height),rect(costNode,cardRect.width,sample.height)))add(key,'card-label-overlap','name / cost','card title covers deploy cost');
  // 乙版卡面（PROG-2-10131）：卡面文字列彼此不可重疊（攻／命已移到短按面板）
  const faceRows=['UnitName1','RarityLabel1','UnitSub1','StarsLabel1','InfuseBadge1','CostBadge1','ResonanceLabel1','DeployedFlag1'].map(name=>get(sample.children,name)).filter(n=>n&&n.active!==false).map(n=>({name:n.name,...rect(n,cardRect.width,sample.height)}));
  for(let i=0;i<faceRows.length;i++)for(let j=i+1;j<faceRows.length;j++)if(overlap(faceRows[i],faceRows[j]))add(key,'card-label-overlap',`${faceRows[i].name} / ${faceRows[j].name}`,'card face rows overlap');
  const ultimate=get(commands,'UltimateBtn');const labels=ultimate.children.filter(n=>n.type==='label');
  const boxes=labels.map(n=>({name:n.name,...rect(n,ultimate.width,ultimate.height)}));
  if(boxes.length===2&&overlap(boxes[0],boxes[1]))add(key,'label-overlap','UltimateBtn',boxes);
  cases.push({viewport:key,logical:{width:w,height:h},scale,groups});
 }
 const hudCode=read('assets/scripts/ui/components/BattleHUDComposite.ts');
 const actionCode=read('assets/scripts/ui/components/ActionCommandComposite.ts');
 if(hudCode.includes('setContentSize(180, 18)'))add('runtime','runtime-clipped','SP labels','composite overrides layout with 18px high labels');
 if(actionCode.includes('this._tacticsLabel.fontSize = 12'))add('runtime','runtime-small-font','TacticsLabel','composite overrides skin at 12px');
 return {passed:issues.length===0,issues,cases,limits:['Static contract audit, not Cocos visual proof.','Decorative skin overlap, scroll content and modal overlays excluded.','Touch target >=48 CSS px and text >=14 CSS px in tested viewports; smaller windows need separate review.']};
}
module.exports={auditBattleHud,VIEWPORTS,rect,overlap};
if(require.main===module){const args=process.argv.slice(2),at=args.indexOf('--ref');const report=auditBattleHud({ref:at<0?undefined:args[at+1]});process.stdout.write(JSON.stringify(report,null,2)+'\n');if(args.includes('--strict')&&!report.passed)process.exitCode=1;}
