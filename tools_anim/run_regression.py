#!/usr/bin/env python3
"""雙角色回歸測試（run_regression.py）

依工單 AG-04 與 AG-05 規定：
1. 包含「趙雲（C2 母圖）＋張飛（Q3 母圖）」兩組。
2. 支援原解析度 Master（`--mode master`）與執行期縮放（`--mode runtime --runtime-height 480`）。
3. 執行流程：
   slice_and_rig.py -> Sparkle v4 產生器 -> validate_spine.py --fail-on
4. 最終輸出兩行 OVERALL 判定，供每次 Sparkle 交付時快速比對。
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PYTHON = sys.executable

ZHAOYUN_IMG = Path(
    r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r188-quarterview-candidates\master-candidates\zhaoyun-c2-master-realesrgan-alpha-direct-2x.png"
)
ZHAOYUN_LM = Path(
    r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r190-comfy-dwpose\zhaoyun-pose-18body-hands.json"
)
ZHAOYUN_POLY = Path(
    r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\artifacts\scratch\r206-c2-cutout\c2-cutout-manifest.json"
)

ZHANGFEI_IMG = Path(
    r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\artifacts\scratch\r174-zhangfei-review\zhangfei-q3-front-approval-candidate-02.png"
)
ZHANGFEI_LM = Path(
    r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r182-zhangfei-landmark-correction\r183-q3-validation\zhangfei-r183-19point-coordinates.json"
)
ZHANGFEI_PARTS = Path(
    r"C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\r182-zhangfei-landmark-correction\r183-q3-validation\parts"
)

SPARKLE_GEN = HERE.parent / "scratch" / "sparkle_v4_runner" / "3KLife-spine38-tool" / "generate_spine38.py"


def run_pipeline(
    char_id: str,
    img_path: Path,
    lm_path: Path,
    opt_args: list[str],
    out_base: Path,
    runtime_height: int | None = None,
) -> tuple[str, str]:
    """跑單個角色的 slice_and_rig -> sparkle_gen -> validate_spine"""
    slice_out = out_base / f"{char_id}_slice"
    sparkle_out = out_base / f"{char_id}_sparkle"
    val_out = out_base / f"{char_id}_audit"

    # 1. slice_and_rig
    slice_cmd = [
        PYTHON,
        str(HERE / "slice_and_rig.py"),
        "--image",
        str(img_path),
        "--landmarks",
        str(lm_path),
        "--name",
        char_id,
        "--out-dir",
        str(slice_out),
    ] + opt_args
    if runtime_height:
        slice_cmd.extend(["--runtime-height", str(runtime_height)])

    proc_s = subprocess.run(slice_cmd, capture_output=True, text=True, encoding="utf-8", check=False)
    if proc_s.returncode != 0:
        return char_id, f"FAIL (slice_and_rig error: {proc_s.stderr or proc_s.stdout})"

    # 2. sparkle generator
    # 若為 runtime 模式則從 slice_out 讀取，若為 master 模式則從 master/ 讀取
    rig_dir = (slice_out / "master") if (slice_out / "master").exists() and not runtime_height else slice_out
    rig_compat = rig_dir / "source-rig-v1-compat.json"
    atlas_png = rig_dir / f"{char_id}.png"

    if not SPARKLE_GEN.exists():
        return char_id, "FAIL (Sparkle generator script not found)"

    gen_cmd = [
        PYTHON,
        str(SPARKLE_GEN),
        "--rig",
        str(rig_compat),
        "--png",
        str(atlas_png),
        "--name",
        char_id,
        "--out-dir",
        str(sparkle_out),
        "--no-render",
    ]
    proc_g = subprocess.run(gen_cmd, capture_output=True, text=True, encoding="utf-8", check=False)
    # Sparkle 自身 validator 可能會 fail 拋 2，但我們只要它有產出 spine42.json 即可
    skel_42 = sparkle_out / f"{char_id}_spine42.json"
    skel_atlas = sparkle_out / f"{char_id}.atlas"
    if not skel_42.exists():
        return char_id, f"FAIL (Sparkle generation failed: {proc_g.stderr or proc_g.stdout})"

    # 3. validate_spine --fail-on
    val_cmd = [
        PYTHON,
        str(HERE / "validate_spine.py"),
        "--json",
        str(skel_42),
        "--atlas",
        str(skel_atlas),
        "--rig",
        str(rig_dir / "source-rig.json"),
        "--out-dir",
        str(val_out),
        "--fail-on",
    ]
    proc_v = subprocess.run(val_cmd, capture_output=True, text=True, encoding="utf-8", check=False)
    out_lines = [l.strip() for l in (proc_v.stdout or "").splitlines() if l.strip()]
    overall_line = next((l for l in out_lines if l.startswith("OVERALL:")), None)
    summary_txt = val_out / "validation_summary.txt"

    status = "PASS" if proc_v.returncode == 0 else "FAIL"
    detail = overall_line if overall_line else f"OVERALL: {status} (summary: {summary_txt})"
    return char_id, detail


def main() -> None:
    ap = argparse.ArgumentParser(description="雙角色回歸測試（趙雲＋張飛）")
    ap.add_argument("--mode", choices=["runtime", "master"], default="runtime", help="測試模式：runtime (預設 480px) 或 master (原圖)")
    ap.add_argument("--runtime-height", type=int, default=480, help="執行期目標高度（預設 480）")
    ap.add_argument("--out-dir", default=str(HERE.parent / "scratch" / "regression_run"), help="輸出目錄")
    args = ap.parse_args()

    sys.stdout.reconfigure(encoding="utf-8")

    out_base = Path(args.out_dir).resolve()
    out_base.mkdir(parents=True, exist_ok=True)
    rt_h = args.runtime_height if args.mode == "runtime" else None

    print(f"=== 執行雙角色回歸測試 (mode={args.mode}, runtime_height={rt_h}) ===")
    
    # 1. 趙雲 C2
    c_zy, res_zy = run_pipeline(
        char_id="zhaoyun_c2",
        img_path=ZHAOYUN_IMG,
        lm_path=ZHAOYUN_LM,
        opt_args=["--polygons", str(ZHAOYUN_POLY)],
        out_base=out_base,
        runtime_height=rt_h,
    )
    # 2. 張飛 Q3
    c_zf, res_zf = run_pipeline(
        char_id="zhangfei_q3",
        img_path=ZHANGFEI_IMG,
        lm_path=ZHANGFEI_LM,
        opt_args=["--parts-dir", str(ZHANGFEI_PARTS)],
        out_base=out_base,
        runtime_height=rt_h,
    )

    print("\n=== 回歸測試兩行 OVERALL 輸出 ===")
    print(f"[{c_zy}]: {res_zy}")
    print(f"[{c_zf}]: {res_zf}")


if __name__ == "__main__":
    main()
