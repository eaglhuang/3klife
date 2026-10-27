#!/usr/bin/env python3
"""Spine 4.2 動作庫合併工具 (merge_motion_library.py)

依據工單 AG-27 規範：
1. 輸入：builder 輸出的 Spine 4.2 JSON (骨架+分件) 與動作庫 Spine 4.2 JSON (animations, events, physics, ik)。
2. 比對驗證 (任一不符即拒絕合併，結束碼非 0)：
   - 兩邊骨骼名稱集合與父子階層關係完全相同。
   - Setup pose 逐骨座標與旋轉誤差: dx <= 0.5px, dy <= 0.5px, d_rotation <= 0.1°。
   - 動畫與 drawOrder 引用的 slot 均在骨架 slot 集合中存在。
3. 動作軌道違規檢查 (只報告不修改數值，即使拒絕合併亦完整列出)：
   - 手臂與武器骨骼 scale != 1.0。
   - 手臂根骨 translate 位移量 > 16.0px。
4. 輸出：
   - 合併成功時輸出整合骨架與動作之 Spine 4.2 JSON。
   - 輸出詳細驗證與審查報告 (每段動畫時長、事件、引用到但分件缺的 slot、軌道違規清單)。
5. 絕無武將名稱硬編碼，絕無 joints 關節名字面值。
"""
from __future__ import annotations

import argparse
import copy
import json
import math
import sys
from pathlib import Path
from typing import Any


DEFAULT_SPEC_PATH = Path(__file__).resolve().parent / "specs" / "canonical_skeleton_v3.json"


def load_spine_json(path: Path | str) -> dict[str, Any]:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"找不到 Spine JSON 檔案: {p}")
    return json.loads(p.read_text(encoding="utf-8"))


def normalize_angle_deg(deg: float) -> float:
    """將角度差正規化至 [-180, 180] 區間"""
    a = (deg + 180.0) % 360.0 - 180.0
    return a if a != -180.0 else 180.0


def compare_skeletons(
    builder_spine: dict[str, Any],
    motion_spine: dict[str, Any],
    pos_tol_px: float = 0.5,
    rot_tol_deg: float = 0.1,
) -> tuple[bool, list[str], list[dict[str, Any]]]:
    """比對骨骼集合、階層父子關係與 Setup pose 幾何參數"""
    refusal_reasons: list[str] = []
    bone_checks: list[dict[str, Any]] = []

    b_skel_list = builder_spine.get("bones", [])
    b_mot_list = motion_spine.get("bones", [])

    skel_bones_map = {b["name"]: b for b in b_skel_list if isinstance(b, dict) and "name" in b}
    mot_bones_map = {b["name"]: b for b in b_mot_list if isinstance(b, dict) and "name" in b}

    skel_names = set(skel_bones_map.keys())
    mot_names = set(mot_bones_map.keys())

    # 1. 骨名集合比對
    missing_in_motion = sorted(list(skel_names - mot_names))
    extra_in_motion = sorted(list(mot_names - skel_names))

    if missing_in_motion:
        refusal_reasons.append(f"動作庫缺少骨架骨骼 ({len(missing_in_motion)} 根): {', '.join(missing_in_motion)}")
    if extra_in_motion:
        refusal_reasons.append(f"動作庫含有多餘骨骼 ({len(extra_in_motion)} 根): {', '.join(extra_in_motion)}")

    all_names = sorted(list(skel_names | mot_names))
    skeletons_match = (len(missing_in_motion) == 0) and (len(extra_in_motion) == 0)

    for b_name in all_names:
        in_skel = b_name in skel_bones_map
        in_mot = b_name in mot_bones_map

        if not in_skel or not in_mot:
            bone_checks.append({
                "bone": b_name,
                "inSkeleton": in_skel,
                "inMotionLibrary": in_mot,
                "parentMatch": False,
                "withinTolerance": False,
                "detail": "骨骼未在雙方中同時存在",
            })
            continue

        b_s = skel_bones_map[b_name]
        b_m = mot_bones_map[b_name]

        p_s = b_s.get("parent")
        p_m = b_m.get("parent")
        parent_match = (p_s == p_m)
        if not parent_match:
            refusal_reasons.append(f"骨骼 '{b_name}' 父骨不符: 骨架={p_s}, 動作庫={p_m}")
            skeletons_match = False

        sx = float(b_s.get("x", 0.0))
        sy = float(b_s.get("y", 0.0))
        s_rot = float(b_s.get("rotation", 0.0))

        mx = float(b_m.get("x", 0.0))
        my = float(b_m.get("y", 0.0))
        m_rot = float(b_m.get("rotation", 0.0))

        dx = abs(sx - mx)
        dy = abs(sy - my)
        d_rot = abs(normalize_angle_deg(s_rot - m_rot))

        pos_pass = (dx <= pos_tol_px) and (dy <= pos_tol_px)
        rot_pass = (d_rot <= rot_tol_deg)
        within_tol = pos_pass and rot_pass

        if not within_tol:
            mismatches = []
            if dx > pos_tol_px:
                mismatches.append(f"dx={dx:.3f}px > {pos_tol_px}px (skel={sx:.2f}, mot={mx:.2f})")
            if dy > pos_tol_px:
                mismatches.append(f"dy={dy:.3f}px > {pos_tol_px}px (skel={sy:.2f}, mot={my:.2f})")
            if d_rot > rot_tol_deg:
                mismatches.append(f"d_rot={d_rot:.3f}° > {rot_tol_deg}° (skel={s_rot:.2f}°, mot={m_rot:.2f}°)")
            refusal_reasons.append(f"骨骼 '{b_name}' Setup pose 超差: {', '.join(mismatches)}")
            skeletons_match = False

        bone_checks.append({
            "bone": b_name,
            "parentSkeleton": p_s,
            "parentMotion": p_m,
            "parentMatch": parent_match,
            "skeletonSetup": {"x": sx, "y": sy, "rotation": s_rot},
            "motionSetup": {"x": mx, "y": my, "rotation": m_rot},
            "diffX": round(dx, 4),
            "diffY": round(dy, 4),
            "diffRotation": round(d_rot, 4),
            "withinTolerance": within_tol,
        })

    return skeletons_match, refusal_reasons, bone_checks


def check_animation_slots_and_draworder(
    builder_spine: dict[str, Any],
    motion_spine: dict[str, Any],
) -> tuple[bool, list[str], dict[str, Any]]:
    """檢查動畫中引用的 slot 與 drawOrder slot 是否在骨架定義中存在，並統計時長、事件與缺件 slot"""
    issues: list[str] = []
    skel_slots_list = builder_spine.get("slots", [])
    skel_slots_set = {s["name"] for s in skel_slots_list if isinstance(s, dict) and "name" in s}

    # 取得 builder 輸出的缺件槽位 (若有的話)
    missing_slots_set: set[str] = set()
    skins = builder_spine.get("skins", [])
    default_skin = next((sk for sk in skins if sk.get("name") == "default"), {})
    skin_attachments = default_skin.get("attachments", {})

    for slot_name in skel_slots_set:
        slot_att = skin_attachments.get(slot_name, {})
        # 若該 slot 無 attachment，判定為分件缺件
        if not slot_att:
            missing_slots_set.add(slot_name)

    animations = motion_spine.get("animations", {})
    summary_by_anim: dict[str, Any] = {}

    for anim_name, anim_data in animations.items():
        if not isinstance(anim_data, dict):
            continue

        max_time = 0.0
        used_slots: set[str] = set()
        events_in_anim: list[dict[str, Any]] = []

        # 1. 檢查 slots 時間軸
        anim_slots = anim_data.get("slots", {})
        for s_name, s_timeline in anim_slots.items():
            used_slots.add(s_name)
            if s_name not in skel_slots_set:
                issues.append(f"動畫 '{anim_name}' 引用未定義插槽: '{s_name}'")
            if isinstance(s_timeline, dict):
                for tl_type, keyframes in s_timeline.items():
                    if isinstance(keyframes, list):
                        for kf in keyframes:
                            t = float(kf.get("time", 0.0))
                            if t > max_time:
                                max_time = t

        # 2. 檢查 bones 時間軸最大時間
        anim_bones = anim_data.get("bones", {})
        for b_name, b_timeline in anim_bones.items():
            if isinstance(b_timeline, dict):
                for tl_type, keyframes in b_timeline.items():
                    if isinstance(keyframes, list):
                        for kf in keyframes:
                            t = float(kf.get("time", 0.0))
                            if t > max_time:
                                max_time = t

        # 3. 檢查 drawOrder 時間軸
        draw_orders = anim_data.get("drawOrder", [])
        if isinstance(draw_orders, list):
            for do_entry in draw_orders:
                if isinstance(do_entry, dict):
                    t = float(do_entry.get("time", 0.0))
                    if t > max_time:
                        max_time = t
                    offsets = do_entry.get("offsets", [])
                    for off in offsets:
                        target_slot = off.get("slot")
                        if target_slot and target_slot not in skel_slots_set:
                            issues.append(f"動畫 '{anim_name}' 的 drawOrder 引用未定義插槽: '{target_slot}'")

        # 4. 統計 events
        anim_events = anim_data.get("events", [])
        if isinstance(anim_events, list):
            for ev in anim_events:
                if isinstance(ev, dict):
                    t = float(ev.get("time", 0.0))
                    if t > max_time:
                        max_time = t
                    events_in_anim.append({
                        "name": ev.get("name"),
                        "time": t,
                        "int": ev.get("int"),
                        "float": ev.get("float"),
                        "string": ev.get("string"),
                    })

        missing_slots_referenced = sorted(list(used_slots & missing_slots_set))

        summary_by_anim[anim_name] = {
            "durationSeconds": round(max_time, 4),
            "eventsCount": len(events_in_anim),
            "events": events_in_anim,
            "usedSlotsCount": len(used_slots),
            "missingSlotsReferenced": missing_slots_referenced,
            "missingSlotsCount": len(missing_slots_referenced),
        }

    valid = (len(issues) == 0)
    return valid, issues, summary_by_anim


def derive_bone_audit_groups(
    spec: dict[str, Any] | None = None,
    limit_bones_override: list[str] | set[str] | None = None,
    scale_bones_override: list[str] | set[str] | None = None,
) -> tuple[set[str], set[str]]:
    """動態推導動作庫軌道違規審查之骨骼群組：
    1. limit_bones: 位移需受 16px 限制之骨骼群組 (由規格 bones 階層推導：掛在軀幹下且具肢體子鏈的手臂根骨)
    2. scale_bones: 縮放需受 1.0 限制之骨骼群組 (由規格 bones 階層推導：手臂子樹與武器所有骨骼)

    絕無任何寫死骨名或部分字串比對，100% 由規格結構驅動。支援外部參數覆蓋。
    """
    if limit_bones_override is not None and scale_bones_override is not None:
        return set(limit_bones_override), set(scale_bones_override)

    limit_bones: set[str] = set()
    scale_bones: set[str] = set()

    # 若未直接提供 spec，嘗試自預設路徑載入
    if spec is None and DEFAULT_SPEC_PATH.exists():
        try:
            spec = json.loads(DEFAULT_SPEC_PATH.read_text(encoding="utf-8"))
        except Exception:
            spec = None

    if spec and isinstance(spec, dict) and "bones" in spec and isinstance(spec["bones"], list):
        bones = spec["bones"]
        children_map: dict[str | None, list[str]] = {}
        for b in bones:
            if isinstance(b, dict) and "name" in b:
                p = b.get("parent")
                children_map.setdefault(p, []).append(b["name"])

        # 找尋 root -> pelvis -> torso 階層
        root_bone = next((b["name"] for b in bones if isinstance(b, dict) and not b.get("parent")), None)
        pelvis_bone = next(
            (b["name"] for b in bones if isinstance(b, dict) and b.get("parent") == root_bone and "ik" not in b.get("role", "")),
            None,
        )
        torso_bone = next(
            (b["name"] for b in bones if isinstance(b, dict) and b.get("parent") == pelvis_bone and len(children_map.get(b.get("name"), [])) > 1),
            None,
        )

        # 找出頭部 segment (具有 registration 定位屬性之 segment，例如 head)
        head_seg_names = {
            k for k, v in spec.get("segments", {}).items()
            if isinstance(v, dict) and "registration" in v
        }

        # 手臂根骨：parent 為 torso，排除頭部 segment，且其子樹深度 >= 3 (upper -> lower -> hand)
        def get_depth(b_name: str) -> int:
            ch = children_map.get(b_name, [])
            if not ch:
                return 1
            return 1 + max(get_depth(c) for c in ch)

        for b in bones:
            if not isinstance(b, dict):
                continue
            b_name = b.get("name")
            if not b_name:
                continue
            if b.get("parent") == torso_bone and b_name not in head_seg_names:
                if len(children_map.get(b_name, [])) >= 1 and get_depth(b_name) >= 3:
                    limit_bones.add(b_name)

        # 手臂與武器全骨骼：從 limit_bones 出發的所有子孫骨骼 (包含自身)
        stack = list(limit_bones)
        while stack:
            curr = stack.pop()
            scale_bones.add(curr)
            for ch in children_map.get(curr, []):
                if ch not in scale_bones:
                    stack.append(ch)

    if limit_bones_override is not None:
        limit_bones = set(limit_bones_override)
    if scale_bones_override is not None:
        scale_bones = set(scale_bones_override)

    return limit_bones, scale_bones


def audit_animation_tracks(
    motion_spine: dict[str, Any],
    limit_bones: list[str] | set[str] | None = None,
    scale_bones: list[str] | set[str] | None = None,
    spec: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """檢驗動作庫動畫軌道違規 (不修改數值，僅審查報告)：
    1. 手臂與武器骨骼 scale != 1.0
    2. 手臂根骨 translate 超過 16.0 px

    骨骼群組預設由規格 bones 階層動態推導，亦可由參數指定。
    """
    effective_limit_bones, effective_scale_bones = derive_bone_audit_groups(
        spec=spec,
        limit_bones_override=limit_bones,
        scale_bones_override=scale_bones,
    )

    violations: list[dict[str, Any]] = []
    animations = motion_spine.get("animations", {})

    for anim_name, anim_data in animations.items():
        if not isinstance(anim_data, dict):
            continue

        anim_bones = anim_data.get("bones", {})
        for b_name, b_timeline in anim_bones.items():
            if not isinstance(b_timeline, dict):
                continue

            # (A) 檢查 scale 是否存在非 1.0 (針對手臂及武器骨骼群組)
            is_scale_target = (b_name in effective_scale_bones)
            if is_scale_target and "scale" in b_timeline:
                scale_keys = b_timeline["scale"]
                if isinstance(scale_keys, list):
                    for kf in scale_keys:
                        sx = float(kf.get("x", 1.0))
                        sy = float(kf.get("y", 1.0))
                        if abs(sx - 1.0) > 1e-4 or abs(sy - 1.0) > 1e-4:
                            violations.append({
                                "rule": "scale_must_be_unity",
                                "animation": anim_name,
                                "bone": b_name,
                                "time": kf.get("time", 0.0),
                                "scaleX": sx,
                                "scaleY": sy,
                                "detail": f"動畫 '{anim_name}' 骨骼 '{b_name}' 於 t={kf.get('time', 0.0)}s scale 含有縮放: ({sx}, {sy})",
                            })

            # (B) 檢查手臂根骨 translate 位移是否超過 16px
            is_limit_target = (b_name in effective_limit_bones)
            if is_limit_target and "translate" in b_timeline:
                trans_keys = b_timeline["translate"]
                if isinstance(trans_keys, list):
                    max_dist = 0.0
                    violating_times: list[dict[str, Any]] = []
                    for kf in trans_keys:
                        tx = float(kf.get("x", 0.0))
                        ty = float(kf.get("y", 0.0))
                        dist = math.hypot(tx, ty)
                        if dist > 16.0:
                            violating_times.append({
                                "time": kf.get("time", 0.0),
                                "x": round(tx, 2),
                                "y": round(ty, 2),
                                "dist": round(dist, 2),
                            })
                        if dist > max_dist:
                            max_dist = dist

                    if violating_times:
                        violations.append({
                            "rule": "arm_upper_translate_limit_16px",
                            "animation": anim_name,
                            "bone": b_name,
                            "maxTranslatePx": round(max_dist, 2),
                            "thresholdPx": 16.0,
                            "violationsCount": len(violating_times),
                            "sampleViolations": violating_times[:5],
                            "detail": f"動畫 '{anim_name}' 骨骼 '{b_name}' translate 位移量最大達 {max_dist:.1f}px (超過 16.0px 上限)",
                        })

    return violations


def merge_motion_library(
    builder_spine_path: Path | str,
    motion_library_path: Path | str,
    output_spine_path: Path | str | None = None,
    report_output_path: Path | str | None = None,
    spec: Path | str | dict[str, Any] | None = None,
    limit_bones: list[str] | set[str] | None = None,
    scale_bones: list[str] | set[str] | None = None,
) -> tuple[dict[str, Any], bool]:
    """合併動作庫主流程"""
    builder_spine = load_spine_json(builder_spine_path)
    motion_spine = load_spine_json(motion_library_path)

    spec_data: dict[str, Any] | None = None
    if isinstance(spec, (str, Path)):
        sp = Path(spec)
        if sp.exists():
            spec_data = json.loads(sp.read_text(encoding="utf-8"))
    elif isinstance(spec, dict):
        spec_data = spec

    all_refusal_reasons: list[str] = []

    # 1. 骨架幾何比對
    skel_pass, skel_reasons, bone_checks = compare_skeletons(builder_spine, motion_spine)
    if not skel_pass:
        all_refusal_reasons.extend(skel_reasons)

    # 2. 插槽與時間軸有效性檢查
    slots_pass, slot_issues, anim_summary = check_animation_slots_and_draworder(builder_spine, motion_spine)
    if not slots_pass:
        all_refusal_reasons.extend(slot_issues)

    # 3. 動作軌道違規檢查 (照樣全面審查並記錄，即使已拒絕合併亦完整輸出)
    track_violations = audit_animation_tracks(
        motion_spine=motion_spine,
        limit_bones=limit_bones,
        scale_bones=scale_bones,
        spec=spec_data,
    )

    overall_pass = (len(all_refusal_reasons) == 0)

    merged_spine: dict[str, Any] | None = None
    if overall_pass:
        # 以 builder_spine 為基底，合併來自 motion_spine 的動作/事件/物理/IK，絕不修改任何動畫數值
        merged_spine = copy.deepcopy(builder_spine)
        for section in ["ik", "events", "animations", "physics"]:
            if section in motion_spine:
                merged_spine[section] = copy.deepcopy(motion_spine[section])

        if output_spine_path:
            out_p = Path(output_spine_path)
            out_p.parent.mkdir(parents=True, exist_ok=True)
            out_p.write_text(json.dumps(merged_spine, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    report: dict[str, Any] = {
        "schema": "3klife.merge-motion-library-report.v1",
        "verificationScope": "offline-spine42-motion-library-merge-only (NOT Cocos runtime verified)",
        "overallPass": overall_pass,
        "status": "MERGED" if overall_pass else "REFUSED",
        "refusalReasons": all_refusal_reasons,
        "refusalReasonsCount": len(all_refusal_reasons),
        "boneChecksSummary": {
            "totalBones": len(bone_checks),
            "bonesWithinTolerance": sum(1 for b in bone_checks if b.get("withinTolerance")),
            "bonesWithParentMatch": sum(1 for b in bone_checks if b.get("parentMatch")),
        },
        "boneChecks": bone_checks,
        "motionLibrarySummary": {
            "animationsCount": len(anim_summary),
            "animations": anim_summary,
        },
        "trackViolations": {
            "violationsCount": len(track_violations),
            "violations": track_violations,
        },
        "outputSpinePath": str(output_spine_path) if (overall_pass and output_spine_path) else None,
    }

    if report_output_path:
        rep_p = Path(report_output_path)
        rep_p.parent.mkdir(parents=True, exist_ok=True)
        rep_p.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    return report, overall_pass


def main() -> None:
    ap = argparse.ArgumentParser(description="Spine 4.2 動作庫合併工具 (merge_motion_library.py)")
    ap.add_argument("--skeleton", "--builder-spine", type=Path, required=True, dest="skeleton", help="builder 輸出的 Spine 4.2 JSON")
    ap.add_argument("--motions", "--motion-library", type=Path, required=True, dest="motions", help="動作庫 Spine 4.2 JSON")
    ap.add_argument("-o", "--output", type=Path, default=None, help="合併後的 Spine 4.2 JSON 輸出路徑")
    ap.add_argument("--report", type=Path, default=None, help="合併報告 JSON 輸出路徑")
    ap.add_argument("--spec", type=Path, default=None, help="規範 JSON 路徑 (預設使用 canonical_skeleton_v3.json)")
    ap.add_argument("--limit-bones", nargs="*", default=None, help="位移需限制 <= 16px 的骨骼名稱清單 (預設由規格產生)")
    ap.add_argument("--scale-bones", nargs="*", default=None, help="縮放需限制 == 1.0 的骨骼名稱清單 (預設由規格產生)")

    args = ap.parse_args()

    report, passed = merge_motion_library(
        builder_spine_path=args.skeleton,
        motion_library_path=args.motions,
        output_spine_path=args.output,
        report_output_path=args.report,
        spec=args.spec,
        limit_bones=args.limit_bones,
        scale_bones=args.scale_bones,
    )

    print(json.dumps(report, indent=2, ensure_ascii=False))
    if not passed:
        sys.exit(1)


if __name__ == "__main__":
    main()
