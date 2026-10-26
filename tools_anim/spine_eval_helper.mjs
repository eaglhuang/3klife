// Evaluate a Spine 4.2 skeleton + atlas with official @esotericsoftware/spine-core
// and dump per-frame world vertices, triangles, UVs, bone world transforms, and IK state.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [coreDir, jsonPath, atlasPath, outPath, fpsArg] = process.argv.slice(2);
if (!coreDir || !jsonPath || !atlasPath || !outPath) {
  console.error("Usage: node spine_eval_helper.mjs <spine-core-dir> <skeleton.json> <atlas.atlas> <out.json> [fps]");
  process.exit(1);
}

const fps = Number(fpsArg || 24);
const indexJs = path.join(coreDir, "dist", "index.js");
const spine = await import(pathToFileURL(indexJs).href);

const result = {
  loadSuccess: false,
  loadErrors: [],
  spineVersion: null,
  bonesCount: 0,
  slotsCount: 0,
  ikCount: 0,
  physicsCount: 0,
  physicsConstraints: [],
  setupBones: {},
  animations: {},
};

try {
  const atlasText = fs.readFileSync(atlasPath, "utf8");
  const jsonText = fs.readFileSync(jsonPath, "utf8");
  const rawJson = JSON.parse(jsonText);
  result.spineVersion = rawJson?.skeleton?.spine || null;

  const atlas = new spine.TextureAtlas(atlasText);
  for (const page of atlas.pages) {
    // Provide dummy texture with actual page dimensions so UV computation works accurately
    const pageW = page.width || 2048;
    const pageH = page.height || 4096;
    page.setTexture({
      width: pageW,
      height: pageH,
      getImage() { return { width: pageW, height: pageH }; },
      setFilters() {},
      setWraps() {},
      dispose() {},
    });
  }
  // Ensure region u/v/u2/v2 are updated if page dimensions were set after construction
  for (const region of atlas.regions) {
    if (region.page && region.page.width && region.page.height) {
      const pw = region.page.width;
      const ph = region.page.height;
      region.u = region.x / pw;
      region.v = region.y / ph;
      if (region.degrees === 90) {
        region.u2 = (region.x + region.height) / pw;
        region.v2 = (region.y + region.width) / ph;
      } else {
        region.u2 = (region.x + region.width) / pw;
        region.v2 = (region.y + region.height) / ph;
      }
    }
  }

  const loader = new spine.AtlasAttachmentLoader(atlas);
  const skelJson = new spine.SkeletonJson(loader);
  const data = skelJson.readSkeletonData(jsonText);

  result.loadSuccess = true;
  result.bonesCount = data.bones.length;
  result.slotsCount = data.slots.length;
  result.ikCount = data.ikConstraints ? data.ikConstraints.length : 0;
  result.physicsCount = data.physicsConstraints ? data.physicsConstraints.length : 0;
  if (data.physicsConstraints) {
    result.physicsConstraints = data.physicsConstraints.map((p) => ({
      name: p.name,
      bone: p.bone ? p.bone.name : null,
      inertia: p.inertia,
      strength: p.strength,
      damping: p.damping,
      mix: p.mix,
    }));
  }

  // Evaluate setup pose first
  const setupSkel = new spine.Skeleton(data);
  setupSkel.setToSetupPose();
  setupSkel.updateWorldTransform(spine.Physics.none);
  for (const b of setupSkel.bones) {
    result.setupBones[b.data.name] = {
      worldX: Number(b.worldX.toFixed(4)),
      worldY: Number(b.worldY.toFixed(4)),
      a: Number(b.a.toFixed(6)),
      b: Number(b.b.toFixed(6)),
      c: Number(b.c.toFixed(6)),
      d: Number(b.d.toFixed(6)),
    };
  }

  function extractFrameDrawables(skel) {
    const drawOrderNames = [];
    const drawables = [];
    for (let idx = 0; idx < skel.drawOrder.length; idx++) {
      const slot = skel.drawOrder[idx];
      if (!slot || !slot.data) {
        drawOrderNames.push(null);
        continue;
      }
      drawOrderNames.push(slot.data.name);
      const att = slot.getAttachment();
      if (!att) continue;

      if (att instanceof spine.RegionAttachment) {
        const v = new Float32Array(8);
        att.computeWorldVertices(slot, v, 0, 2);
        const r = att.region;
        // Spine RegionAttachment vertices: BL(0), TL(1), TR(2), BR(3)
        // uvs array on RegionAttachment has 8 floats matching the 4 vertices
        const uvs = Array.from(att.uvs).map((x) => Number(x.toFixed(6)));
        drawables.push({
          slot: slot.data.name,
          bone: slot.bone.data.name,
          attachment: att.name,
          type: "region",
          vertices: Array.from(v).map((x) => Number(x.toFixed(3))),
          uvs,
          triangles: [0, 1, 2, 0, 2, 3],
          regionRect: r ? [r.x, r.y, r.width, r.height] : null,
          degrees: r ? r.degrees : 0,
        });
      } else if (att instanceof spine.MeshAttachment) {
        const numFloats = att.worldVerticesLength;
        const v = new Float32Array(numFloats);
        att.computeWorldVertices(slot, 0, numFloats, v, 0, 2);
        const r = att.region;
        const uvs = Array.from(att.uvs).map((x) => Number(x.toFixed(6)));
        const triangles = Array.from(att.triangles);
        drawables.push({
          slot: slot.data.name,
          bone: slot.bone.data.name,
          attachment: att.name,
          type: "mesh",
          weighted: Boolean(att.bones && att.bones.length > 0),
          vertices: Array.from(v).map((x) => Number(x.toFixed(3))),
          uvs,
          triangles,
          regionRect: r ? [r.x, r.y, r.width, r.height] : null,
          degrees: r ? r.degrees : 0,
        });
      }
    }
    return { drawOrderNames, drawables };
  }

  result.setupDraw = extractFrameDrawables(setupSkel);

  for (const anim of data.animations) {
    const skel = new spine.Skeleton(data);
    const stateData = new spine.AnimationStateData(data);
    const state = new spine.AnimationState(stateData);
    state.setAnimation(0, anim.name, false);

    const dur = anim.duration;
    const numSteps = Math.max(1, Math.round(dur * fps));
    const dt = dur > 0 ? dur / numSteps : 1 / fps;
    const frames = [];
    const animErrors = [];

    skel.setToSetupPose();
    for (let i = 0; i <= numSteps; i++) {
      const t = i * dt;
      try {
        if (i === 0) {
          state.update(0);
          state.apply(skel);
          skel.updateWorldTransform(spine.Physics.reset);
        } else {
          state.update(dt);
          state.apply(skel);
          skel.update(dt);
          skel.updateWorldTransform(spine.Physics.update);
        }
        const { drawOrderNames, drawables } = extractFrameDrawables(skel);
        const bones = {};
        for (const b of skel.bones) {
          bones[b.data.name] = {
            x: Number(b.x.toFixed(3)),
            y: Number(b.y.toFixed(3)),
            rotation: Number(b.rotation.toFixed(3)),
            worldX: Number(b.worldX.toFixed(3)),
            worldY: Number(b.worldY.toFixed(3)),
            a: Number(b.a.toFixed(5)),
            b: Number(b.b.toFixed(5)),
            c: Number(b.c.toFixed(5)),
            d: Number(b.d.toFixed(5)),
          };
        }
        const ik = {};
        if (skel.ikConstraints) {
          for (const c of skel.ikConstraints) {
            ik[c.data.name] = {
              mix: Number(c.mix.toFixed(4)),
              bendDirection: c.bendDirection,
            };
          }
        }
        frames.push({
          frameIndex: i,
          time: Number(t.toFixed(4)),
          drawOrder: drawOrderNames,
          bones,
          ik,
          drawables,
        });
      } catch (err) {
        animErrors.push({
          frameIndex: i,
          time: Number(t.toFixed(4)),
          error: String(err && err.stack ? err.stack : err),
        });
      }
    }

    result.animations[anim.name] = {
      duration: Number(dur.toFixed(4)),
      fps,
      frameCount: frames.length,
      errors: animErrors,
      frames,
    };
  }
} catch (err) {
  result.loadErrors.push(String(err && err.stack ? err.stack : err));
}

fs.writeFileSync(outPath, JSON.stringify(result));
console.log(
  JSON.stringify({
    loadSuccess: result.loadSuccess,
    loadErrors: result.loadErrors,
    spineVersion: result.spineVersion,
    bonesCount: result.bonesCount,
    slotsCount: result.slotsCount,
    physicsCount: result.physicsCount,
    animations: Object.fromEntries(
      Object.entries(result.animations).map(([k, v]) => [k, { frames: v.frameCount, errors: v.errors.length }])
    ),
  })
);
