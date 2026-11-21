# PROG-2-9713：部隊頭頂徽章底圖（2 倍解析度）。左 80x80＝九宮格底框，右 80x80＝兵種圓章。
# 顏色與 UnitRenderer 武將名牌的 Graphics 版一致；描邊比 Graphics 參數略細，因為 Graphics 沒有反鋸齒、實際看起來較細。
# 用法：python tools_node/gen-battle-badge-atlas.py assets/resources/sprites/battle/battle_badge_atlas.png
import sys
from PIL import Image, ImageDraw
SS=4; W,H=160,80
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
out=base.convert('RGBa').resize((W,H),Image.LANCZOS).convert('RGBA')
out.save(sys.argv[1])
print(out.size)
