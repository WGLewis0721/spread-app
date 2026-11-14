# Convert the PNG frames in a folder to WebP (quality 85) and delete only the PNG files this run produced.
import sys, os, glob
from PIL import Image
d = sys.argv[1]
for p in sorted(glob.glob(os.path.join(d, '*.png'))):
    im = Image.open(p).convert('RGB')
    out = p[:-4] + '.webp'
    im.save(out, 'WEBP', quality=85, method=6)
    os.remove(p)
    print(os.path.basename(out), im.size, os.path.getsize(out))
