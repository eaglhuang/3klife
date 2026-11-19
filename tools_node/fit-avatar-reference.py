"""Fit a marked face to Da Qiao's approved square thumbnail using uniform scaling."""
import argparse
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--face", nargs=4, type=float, metavar=("LEFT","TOP","RIGHT","BOTTOM"))
parser.add_argument("--nose", nargs=2, type=float)
parser.add_argument("--extent", nargs=4, type=float, metavar=("LEFT","TOP","RIGHT","BOTTOM"))
parser.add_argument("--shoulders", nargs=4, type=float, metavar=("LX","LY","RX","RY"))
parser.add_argument("--detect-only", action="store_true")
args = parser.parse_args()
# Manual cheek and hairline/chin marks on 125px da_qiao small_avatar_0001.
reference_side = 125
reference_box = (55, 39, 97, 94)
automatic = args.face is None
if automatic:
    import cv2
    import numpy as np
    with Image.open(args.source) as original:
        rgba = original.convert("RGBA")
        background = Image.new("RGBA", rgba.size, "white")
        gray = np.asarray(Image.alpha_composite(background, rgba).convert("L"))
    detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = detector.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=8, minSize=(20, 20))
    faces = [r for r in faces if r[1] + r[3]/2 <= gray.shape[0]*0.65]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(args.source) as original:
        marked = original.convert("RGBA")
    draw = ImageDraw.Draw(marked)
    boxes = []
    for index, (x, y, w, h) in enumerate(faces, start=1):
        draw.rectangle((x, y, x+w, y+h), outline="yellow", width=2)
        draw.text((x+2, y+2), str(index), fill="red", stroke_width=1, stroke_fill="white")
        boxes.append({"id": index, "face": [int(x), int(y), int(x+w), int(y+h)]})
    marked.save(args.output.with_name(args.output.stem + "-detections.png"))
    args.output.with_suffix(".detections.json").write_text(json.dumps(boxes, indent=2), encoding="utf-8")
    if args.detect_only or len(faces) != 1:
        print(json.dumps({"status": "needs_face_selection", "count": len(faces), "candidates": boxes}, indent=2))
        raise SystemExit(4 if len(faces) else 3)
    x, y, w, h = map(int, faces[0])
    args.face = [x, y, x+w, y+h]
args.output.parent.mkdir(parents=True, exist_ok=True)
left, top, right, bottom = args.face
nx, ny = args.nose or ((left+right)/2, (top+bottom)/2)
if not (left < nx < right and top < ny < bottom):
    parser.error("Nose must be inside the face box.")
if args.source.resolve() == args.output.resolve():
    parser.error("Use a separate output file.")
rw = reference_box[2] - reference_box[0]
rh = reference_box[3] - reference_box[1]
# Match face area when the candidate and reference have different aspect ratios.
side = reference_side * math.sqrt((right-left)*(bottom-top)/(rw*rh))
face_mid_x = (left + right) / 2
if args.extent:
    ex1, ey1, ex2, ey2 = args.extent
    side = max(side, (ex2-ex1)/.94, (ey2-ey1)/.94)
if args.shoulders:
    lx, ly, rx, ry = args.shoulders
    side = max(side, (rx-lx)/.90, (max(ly,ry)-top)/.88)
box = (face_mid_x-side/2, ny-side/2, face_mid_x+side/2, ny+side/2)
with Image.open(args.source) as im:
    if side <= im.height:
        upper = min(max(box[1], 0), im.height-side)
        box = (box[0], upper, box[2], upper+side)
    if not (0 <= box[0] and 0 <= box[1] and box[2] <= im.width and box[3] <= im.height):
        parser.error("The requested crop exceeds the source.")
    crop = im.convert("RGBA").resize((256,256), Image.Resampling.LANCZOS, box=box)
    crop.save(args.output)
    guide = crop.copy()
    draw = ImageDraw.Draw(guide)
    cx = crop.width / 2
    face_overlay = tuple((v - box[i % 2]) * 256 / side
                         for i, v in enumerate((left, top, right, bottom)))
    draw.rectangle(face_overlay, outline="yellow", width=1)
    face_axis = (face_overlay[0] + face_overlay[2]) / 2
    draw.line((cx, 0, cx, crop.height-1), fill="cyan", width=1)
    for y in range(0, crop.height, 12):
        draw.line((face_axis, y, face_axis, min(y+5, crop.height-1)), fill="magenta", width=1)
    guide.save(args.output.with_name(args.output.stem + "-center.png"))
height = (bottom-top)/side
width=(right-left)/side
report = dict(status="needs_visual_review", faceMethod="opencv_estimate" if automatic else "supplied", referenceBoxAt125=reference_box, sourceFace=args.face, sourceNose=args.nose,
              noseOutputXY=([round((nx-box[0])*256/side,2), round((ny-box[1])*256/side,2)] if args.nose else None),
              faceCenterXPercent=round((face_mid_x-box[0])/side*100,2),
              canvasAxisX=cx, faceAxisX=face_axis, axisDifferencePx=abs(cx-face_axis),
              crop=box,
              faceHeightPercent=round(100*height,1), faceWidthPercent=round(100*width,1),
              referenceFaceHeightPercent=44.0, referenceFaceWidthPercent=33.6,
              faceHeightDeltaPercent=round((height-.44)*100,1), faceWidthDeltaPercent=round((width-.336)*100,1),
              passesReferenceScale=abs(height-.44)<=.06 and abs(width-.336)<=.06 and abs((face_mid_x-box[0])/side-.5)<=1/256,
              faceCenterTolerancePixels=1, faceCenterTolerancePercent=round(100/256,3))
args.output.with_suffix(".json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(report)
