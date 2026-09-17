"""Regenerates src/assets/brand/logo-mark-night.png from logo-mark.png.

Recolors the mark for dark backgrounds (shapes unchanged). Run from the repo
root: python3 scripts/brand/make-night-mark.py  (needs Pillow, numpy, scipy).
"""
from PIL import Image
import numpy as np
from scipy import ndimage
src=Image.open('src/assets/brand/logo-mark.png').convert('RGBA')
a=np.array(src).astype(float); H,W=a.shape[:2]
r,g,b,al=a[...,0],a[...,1],a[...,2],a[...,3]
purpleish=(b>r*1.15)&(b>g*1.5)&(al>0)
redish=(r>b*1.3)&(r>g*1.5)&(al>0)
whiteish=(r>170)&(g>150)&(b>170)&(al>0)&~purpleish&~redish
lab,n=ndimage.label(purpleish)
sizes=ndimage.sum(np.ones_like(lab),lab,range(1,n+1))
edge=set(np.unique(np.concatenate([lab[:, :60].ravel(),lab[:, -60:].ravel(),lab[:60,:].ravel(),lab[-60:,:].ravel()])))-{0}
ring=lab==max(edge,key=lambda l:sizes[l-1]); hands=purpleish&~ring
yy,xx=np.mgrid[0:H,0:W]/np.array([H,W])[:,None,None]
def lerp(c1,c2,t):
    c1=np.array(c1,float);c2=np.array(c2,float);t=np.clip(t,0,1)[...,None];return c1*(1-t)+c2*t
out=a.copy()
def paint(m,c): out[m,:3]=c[m]
paint(ring,lerp((118,40,236),(60,4,150),yy*0.8+xx*0.2))
paint(hands,lerp((150,92,255),(96,24,226),(yy-0.3)/0.45))
d=np.sqrt(((xx-0.5)/0.55)**2+((yy-0.32)/0.6)**2)
paint(redish,lerp((228,30,44),(118,0,10),d))
paint(whiteish,lerp((255,250,255),(230,218,255),yy))
img=Image.fromarray(out.clip(0,255).astype('uint8'),'RGBA')
img.save('src/assets/brand/logo-mark-night.png', optimize=True)
