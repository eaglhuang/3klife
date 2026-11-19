# Batch avatar crop handoff

Run from the repository root:

    node tools_node/batch-general-avatar-crops.js <manifest.json> <new-run-name>

Copy an existing manifest, such as artwork/temp/avatar-batch-gao-gan.json when available. The manifest contains references (seven approved PNG paths) and entries (character id and ordered sources). Each source has file, head, extent, face and shoulders. Mark boxes in original PNG pixels as [x,y,width,height]. Measure face from hairline to chin, excluding hat and hair, and retain the complete headwear in extent. Mark shoulders as [leftX,leftY,rightX,rightY] on the visible shoulder surfaces. For large avatars from standing art, also provide chest as [topY,bottomY].

For small avatars, keep the two measurements distinct: use `smallHeadCalibration` with a minimum of `0.65` and target of `0.75`, while `smallFaceCalibration` defaults to `{ "minimum": 0.38, "target": 0.44 }`. The first measures cranial hair/helmet mass to chin; the second measures forehead to chin. Do not apply the head-height target to the face box. The midpoint of the face box must overlap the canvas vertical centerline within one output pixel (0.39% at 256×256); reject sources where complete headwear and shoulders force the face off center.

Read artwork/temp/avatar-batch-<new-run-name>/report.json:

- no-candidate: read attempts.reason and attempts.geometry. Correct inaccurate marks or use another approved source.
- needs-visual-review: inspect the marked source and the same-size comparison sheet. Confirm face scale, centering, both shoulders and complete headwear before formal acceptance.

Use the crop tool for framing only. Keep the approved source art and its original angle.

Align the vertical centerline through the midpoint of the marked left and right face edges with the vertical centerline of the square. Vertical framing is independent.
