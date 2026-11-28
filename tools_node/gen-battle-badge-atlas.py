# PROG-2-9713／PROG-2-10266：部隊頭頂徽章底圖（2 倍解析度，5x2 格每格 80x80）。
# 第一列：底框（九宮格）、兵種圓章、騎、步、盾；第二列：弓、槍、工、醫、水。兵種剪影＝單色象牙白，戰場頭頂與 UI 面板共用同一張圖。
# 顏色與 UnitRenderer 武將名牌的 Graphics 版一致；描邊比 Graphics 參數略細，因為 Graphics 沒有反鋸齒、實際看起來較細。
# 用法：python tools_node/gen-battle-badge-atlas.py assets/resources/sprites/battle/battle_badge_atlas.png
import sys, math
from PIL import Image, ImageDraw
SS=4; W,H=400,160
FILL=(22,15,9,215); RING=(255,214,90,255); INNER=(255,225,110,90); DISC=(42,28,16,255)
def layer(): return Image.new('RGBA',(W*SS,H*SS),(0,0,0,0))
def s(v): return int(round(v*SS))
def rr(img,box,r,fill=None,outline=None,width=0):
    d=ImageDraw.Draw(img); d.rounded_rectangle([s(box[0]),s(box[1]),s(box[2])-1,s(box[3])-1],radius=s(r),fill=fill,outline=outline,width=s(width) if width else 0)
def ring_rr(box,r,width,color):
    # 置中描邊：外框 box 外擴 width/2、內縮 width/2 的差集
    L=layer(); h=width/2
    rr(L,(box[0]-h,box[1]-h,box[2]+h,box[3]+h),r+h,fill=color)
    M=layer(); rr(M,(box[0]+h,box[1]+h,box[2]-h,box[3]-h),max(0,r-h),fill=(255,255,255,255))
    a=L.getchannel('A'); a.paste(0,mask=M.getchannel('A')); L.putalpha(a); return L
base=layer()
m=3; box=(m,m,80-m,80-m)
f=layer(); rr(f,box,20,fill=FILL); base=Image.alpha_composite(base,f)
base=Image.alpha_composite(base,ring_rr((box[0]+8,box[1]+8,box[2]-8,box[3]-8),14,3,INNER))
base=Image.alpha_composite(base,ring_rr(box,20,4,RING))
cx,cy,r=120,40,36
def circ(img,rad,color):
    ImageDraw.Draw(img).ellipse([s(cx-rad),s(cy-rad),s(cx+rad)-1,s(cy+rad)-1],fill=color)
d=layer(); circ(d,r,DISC); base=Image.alpha_composite(base,d)
L=layer(); circ(L,r+1.75,RING); M=layer(); circ(M,r-1.75,(255,255,255,255))
a=L.getchannel('A'); a.paste(0,mask=M.getchannel('A')); L.putalpha(a); base=Image.alpha_composite(base,L)
IV=(243,233,210,255)
def cell(i,j): return (i*80,j*80)
def poly(img,pts,ox,oy,fill=IV):
    ImageDraw.Draw(img).polygon([(s(ox+x),s(oy+y)) for x,y in pts],fill=fill)
def rect(img,b,ox,oy,fill=IV):
    ImageDraw.Draw(img).rectangle([s(ox+b[0]),s(oy+b[1]),s(ox+b[2])-1,s(oy+b[3])-1],fill=fill)
def ell(img,b,ox,oy,fill=IV):
    ImageDraw.Draw(img).ellipse([s(ox+b[0]),s(oy+b[1]),s(ox+b[2])-1,s(oy+b[3])-1],fill=fill)
def rot(img,ox,oy,deg):
    # 只旋轉該格
    box=(s(ox),s(oy),s(ox+80),s(oy+80)); c=img.crop(box).rotate(deg,resample=Image.BICUBIC); img.paste((0,0,0,0),box); img.paste(c,box)
ic=layer()
# 步兵＝劍
ox,oy=cell(3,0)
poly(ic,[(40,4),(47,14),(47,52),(33,52),(33,14)],ox,oy); rect(ic,(22,52,58,59),ox,oy); rect(ic,(36,59,44,70),ox,oy); ell(ic,(35,69,45,79),ox,oy); rot(ic,ox,oy,35)
# 盾兵＝盾
ox,oy=cell(4,0)
sh=[(12,10),(68,10),(68,40),(60,56),(40,74),(20,56),(12,40)]
poly(ic,sh,ox,oy); poly(ic,[(20,17),(60,17),(60,38),(54,50),(40,64),(26,50),(20,38)],ox,oy,fill=(0,0,0,0)); ell(ic,(30,28,50,48),ox,oy)
# 槍兵＝長槍
ox,oy=cell(1,1)
poly(ic,[(40,0),(49,22),(40,30),(31,22)],ox,oy); rect(ic,(37,28,43,80),ox,oy); rect(ic,(30,32,50,36),ox,oy); rot(ic,ox,oy,38)
# 弓兵＝弓＋箭
ox,oy=cell(0,1)
d=ImageDraw.Draw(ic); d.arc([s(ox+2),s(oy+6),s(ox+54),s(oy+74)],-75,75,fill=IV,width=s(6))
pa=(ox+28+26*math.cos(math.radians(75)),oy+40+34*math.sin(math.radians(75)))
d.line([s(pa[0]),s(pa[1]),s(pa[0]),s(oy+80-pa[1]+oy-oy+ (oy+40-(pa[1]-oy-40)) -oy-80 + oy)],fill=IV,width=s(2)) if False else None
d.line([s(ox+31),s(oy+10),s(ox+31),s(oy+70)],fill=IV,width=s(2))
d.line([s(ox+10),s(oy+40),s(ox+70),s(oy+40)],fill=IV,width=s(4))
poly(ic,[(78,40),(64,32),(64,48)],ox,oy); poly(ic,[(10,40),(4,32),(18,40),(4,48)],ox,oy)
# 騎兵＝馬頭
ox,oy=cell(2,0)
poly(ic,[(16,76),(22,52),(16,40),(20,24),(28,8),(34,20),(42,14),(44,26),(58,32),(72,48),(74,58),(66,64),(54,58),(46,60),(42,76)],ox,oy)
ell(ic,(46,32,52,38),ox,oy,fill=(0,0,0,0))
# 工兵＝齒輪
ox,oy=cell(2,1)
ell(ic,(18,18,62,62),ox,oy)
for k in range(8):
    a=math.radians(k*45); cx0,cy0=40+math.cos(a)*27,40+math.sin(a)*27
    ell(ic,(cx0-7,cy0-7,cx0+7,cy0+7),ox,oy)
ell(ic,(30,30,50,50),ox,oy,fill=(0,0,0,0))
# 醫兵＝十字
ox,oy=cell(3,1)
poly(ic,[(30,8),(50,8),(50,30),(72,30),(72,50),(50,50),(50,72),(30,72),(30,50),(8,50),(8,30),(30,30)],ox,oy)
# 水軍＝帆船
ox,oy=cell(4,1)
poly(ic,[(10,52),(70,52),(60,68),(20,68)],ox,oy); rect(ic,(38,8,42,52),ox,oy); poly(ic,[(44,10),(68,46),(44,46)],ox,oy); poly(ic,[(36,16),(36,46),(14,46)],ox,oy)
base=Image.alpha_composite(base,ic)
out=base.convert('RGBa').resize((W,H),Image.LANCZOS).convert('RGBA')
out.save(sys.argv[1])
print(out.size)
