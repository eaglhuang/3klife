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
parser.add_argument("--vertical-anchor", "--nose", dest="vertical_anchor", nargs=2, type=float,
                    metavar=("X", "Y"), help="Optional vertical framing anchor; X must remain inside the face box and never replaces horizontal face-center alignment.")
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
face_mid_x = (left + right) / 2
face_mid_y = (top + bottom) / 2
if args.vertical_anchor:
    anchor_x, anchor_y = args.vertical_anchor
    if not (left < anchor_x < right and top < anchor_y < bottom):
        parser.error("Vertical anchor must be inside the face box.")
else:
    anchor_x, anchor_y = face_mid_x, face_mid_y
if args.source.resolve() == args.output.resolve():
    parser.error("Use a separate output file.")
rw = reference_box[2] - reference_box[0]
rh = reference_box[3] - reference_box[1]
# Match face area when the candidate and reference have different aspect ratios.
side = reference_side * math.sqrt((right-left)*(bottom-top)/(rw*rh))
if args.extent:
    ex1, ey1, ex2, ey2 = args.extent
    side = max(side, 2*max(abs(ex1-face_mid_x), abs(ex2-face_mid_x))/.94,
               (ey2-ey1)/.94)
if args.shoulders:
    lx, ly, rx, ry = args.shoulders
    side = max(side, 2*max(abs(lx-face_mid_x), abs(rx-face_mid_x))/.90,
               (max(ly,ry)-top)/.88)
with Image.open(args.source) as im:
    source_size = [im.width, im.height]
    if side > im.width or side > im.height:
        parser.error("No square crop of this size fits the source image.")
    crop_margin = side * .03
    min_y, max_y = 0.0, im.height-side
    if args.extent:
        min_y = max(min_y, ey2 + crop_margin - side)
        max_y = min(max_y, ey1 - crop_margin)
    if args.shoulders:
        min_y = max(min_y, max(ly, ry) + crop_margin - side)
        max_y = min(max_y, min(ly, ry))
    min_y = max(min_y, bottom-side)
    max_y = min(max_y, top)
    if min_y > max_y:
        parser.error("No vertical crop can preserve the face, marked headwear, and shoulder anchors with clearance.")
    reference_face_mid_y = (reference_box[1] + reference_box[3]) / 2 / reference_side
    desired_y = anchor_y - reference_face_mid_y*side
    crop_y = min(max(desired_y, min_y), max_y)
    crop_x = face_mid_x-side/2
    box = (crop_x, crop_y, crop_x+side, crop_y+side)
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
    extent_inside = None
    if args.extent:
        ex1, ey1, ex2, ey2 = args.extent
        extent_overlay = tuple(round((v-box[i % 2])*256/side) for i,v in enumerate((ex1,ey1,ex2,ey2)))
        draw.rectangle(extent_overlay, outline="lime", width=1)
        extent_inside = (box[0]+crop_margin <= ex1 and box[1]+crop_margin <= ey1 and
                         ex2 <= box[2]-crop_margin and ey2 <= box[3]-crop_margin)
    shoulders_inside = None
    if args.shoulders:
        lx,ly,rx,ry = args.shoulders
        for px,py in ((lx,ly),(rx,ry)):
            qx=(px-box[0])*256/side; qy=(py-box[1])*256/side
            draw.ellipse((qx-2,qy-2,qx+2,qy+2),fill="yellow",outline="red")
        shoulders_inside = (box[0] <= lx < box[2] and box[0] <= rx < box[2] and
                            box[1] <= ly <= box[3]-crop_margin and box[1] <= ry <= box[3]-crop_margin and
                            left-lx >= side*.05 and rx-right >= side*.05)
    guide.save(args.output.with_name(args.output.stem + "-center.png"))
height = (bottom-top)/side
width=(right-left)/side
axis_difference = abs(cx-face_axis)
report = dict(status="needs_visual_review", faceMethod="opencv_estimate" if automatic else "supplied", referenceBoxAt125=reference_box,
              sourceImageSize=source_size, sourceFace=args.face, sourceExtent=args.extent,
              sourceShoulders=args.shoulders, sourceVerticalAnchorXY=args.vertical_anchor,
              verticalAnchorOutputXY=([round((anchor_x-box[0])*256/side,2), round((anchor_y-box[1])*256/side,2)] if args.vertical_anchor else None),
              faceCenterXPercent=round((face_mid_x-box[0])/side*100,2),
              canvasAxisX=cx, faceAxisX=face_axis, axisDifferencePx=axis_difference,
              crop=box,
              faceHeightPercent=round(100*height,1), faceWidthPercent=round(100*width,1),
              referenceFaceHeightPercent=44.0, referenceFaceWidthPercent=33.6,
              faceHeightDeltaPercent=round((height-.44)*100,1), faceWidthDeltaPercent=round((width-.336)*100,1),
              passesFaceCenter=axis_difference<=1,
              passesHeadwearExtent=extent_inside,
              passesShoulderAnchors=shoulders_inside,
              passesReferenceScale=abs(height-.44)<=.06 and abs(width-.336)<=.06 and axis_difference<=1,
              faceCenterTolerancePixels=1, faceCenterTolerancePercent=round(100/256,3))
args.output.with_suffix(".json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(report)
