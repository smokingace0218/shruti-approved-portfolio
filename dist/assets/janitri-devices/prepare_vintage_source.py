from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFilter

root = Path(__file__).parent
names = ["tablet-3d", "phone-3d", "desktop-3d", "central-monitoring-tv-3d"]

# Tight silhouettes traced around the actual approved vintage renders. The source
# pixels inside these outlines remain untouched; only the dark studio backdrop is removed.
silhouettes = {
    "tablet-3d": [(157,205),(163,158),(190,136),(236,135),(1294,142),(1350,166),(1377,205),(1378,827),(1360,866),(1324,891),(212,892),(174,874),(157,838)],
    "phone-3d": [(208,175),(218,119),(244,80),(282,58),(690,51),(743,65),(788,96),(814,145),(820,1368),(803,1424),(770,1464),(270,1474),(229,1448),(207,1402)],
    "desktop-3d": [(254,232),(262,151),(292,89),(334,51),(1170,60),(1238,75),(1288,115),(1315,179),(1328,689),(1324,758),(1350,822),(1374,886),(1351,928),(1300,951),(438,958),(347,938),(284,901),(245,852)],
    "central-monitoring-tv-3d": [(211,292),(220,204),(245,130),(294,79),(354,54),(1150,55),(1220,73),(1281,118),(1308,184),(1310,645),(1284,713),(1235,763),(1170,791),(840,794),(856,827),(1007,840),(1094,874),(1094,911),(1069,935),(468,936),(443,912),(451,874),(497,845),(646,827),(663,793),(359,786),(291,763),(239,712),(212,653)]
}

for name in names:
    source = Image.open(root / f"{name}.png").convert("RGB")
    w, h = source.size
    alpha = Image.new("L", (w, h), 0)
    ImageDraw.Draw(alpha).polygon(silhouettes[name], fill=255)
    alpha = alpha.filter(ImageFilter.GaussianBlur(radius=1.0))
    rgba = source.convert("RGBA")
    rgba.putalpha(alpha)
    bounds = alpha.getbbox()
    if not bounds:
        raise RuntimeError(f"No foreground found: {name}")
    # Add a few transparent pixels so the bevel and source silhouette have breathing room.
    x0, y0, x1, y1 = bounds
    pad = 5
    bounds = (max(0, x0-pad), max(0, y0-pad), min(w, x1+pad), min(h, y1+pad))
    rgba.crop(bounds).save(root / f"{name}-cutout.png", optimize=True)
    try:
        metadata_path = root / "vintage-cutout-bounds.json"
        metadata = json.loads(metadata_path.read_text()) if metadata_path.exists() else {}
    except Exception:
        metadata = {}
    metadata[name] = {"bounds": list(bounds), "outline": silhouettes[name]}
    metadata_path.write_text(json.dumps(metadata, indent=2))
    print(f"{name}: {w}x{h} -> {bounds[2]-bounds[0]}x{bounds[3]-bounds[1]}")
