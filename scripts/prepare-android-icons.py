from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
root=Path(__file__).resolve().parent.parent
source=Image.open(root/'android/branding/app-logo.png').convert('RGBA')
res=root/'android/app/src/main/res'
for density,size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
 folder=res/('mipmap-'+density);folder.mkdir(parents=True,exist_ok=True)
 icon=ImageOps.contain(source,(size,size),Image.Resampling.LANCZOS)
 icon.save(folder/'ic_launcher.png',optimize=True)
 circular=icon.copy();alpha=Image.new('L',icon.size);ImageDraw.Draw(alpha).ellipse((0,0,size-1,size-1),fill=255);circular.putalpha(alpha);circular.save(folder/'ic_launcher_round.png',optimize=True)
folder=res/'drawable-nodpi';folder.mkdir(parents=True,exist_ok=True)
source.resize((512,512),Image.Resampling.LANCZOS).save(folder/'app_logo.png',optimize=True)
# Android status icons use alpha only. Keep the central paper + pencil motif;
# remove the opaque backdrop to avoid an unreadable white square.
image=source.resize((512,512),Image.Resampling.LANCZOS)
roi=Image.new('L',(512,512),0);draw=ImageDraw.Draw(roi)
draw.polygon([(138,126),(345,121),(381,377),(208,401),(167,382),(141,338)],fill=255)
mask=Image.new('L',(512,512),0)
for y in range(512):
 for x in range(512):
  r,g,b,a=image.getpixel((x,y))
  if roi.getpixel((x,y)) and min(r,g,b)>175 and max(r,g,b)-min(r,g,b)<65: mask.putpixel((x,y),255)
# Preserve the pencil outline from the reference image in the tiny alpha variant.
draw=ImageDraw.Draw(mask);draw.polygon([(294,329),(301,290),(359,204),(381,220),(322,311)],fill=255)
bounds=mask.getbbox();mask=mask.crop(bounds)
for density,size in [('mdpi',24),('hdpi',36),('xhdpi',48),('xxhdpi',72),('xxxhdpi',96)]:
 folder=res/('drawable-'+density);folder.mkdir(parents=True,exist_ok=True)
 scaled=ImageOps.contain(mask,(round(size*.8),round(size*.8)),Image.Resampling.LANCZOS)
 alpha=Image.new('L',(size,size));alpha.paste(scaled,((size-scaled.width)//2,(size-scaled.height)//2))
 icon=Image.new('RGBA',(size,size),'white');icon.putalpha(alpha);icon.save(folder/'ic_notification.png',optimize=True)
print('Reference image packaged as launcher, details, and notification assets')
