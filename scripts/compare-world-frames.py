from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance

ROOT = Path("docs/design-references/world-frames")
ORIGINAL_ROOT = ROOT / "original"
CLONE_ROOT = ROOT / "clone"
OUTPUT_ROOT = Path("docs/design-references/frame-comparison-v3")
REPORT_PATH = Path("docs/research/samsy/frame-comparison-v3.json")

PHASE_MAP = {
    "idle": "idle",
    "forward": "forward",
    "forward-right": "forward-right",
    "right": "right",
    "backward-right": "backward-right",
    "backward": "backward",
    "backward-left": "backward-left",
    "left": "left",
    "forward-left": "forward-left",
    "jump-forward": "jump-forward",
    "camera-sweep-forward": "camera-sweep-forward",
    "settle": "settle",
}

ANALYSIS_SIZE = (320, 200)
SHEET_SIZE = (480, 300)


def load_manifest(root: Path) -> list[dict]:
    return json.loads((root / "frames.json").read_text(encoding="utf-8"))


def group_by_phase(frames: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for frame in frames:
        grouped[frame["phase"]].append(frame)
    return dict(grouped)


def frame_path(root: Path, frame: dict) -> Path:
    return root / "frames" / frame["filename"]


def load_rgb(path: Path, size: tuple[int, int]) -> Image.Image:
    return Image.open(path).convert("RGB").resize(size, Image.Resampling.BILINEAR)


def luminance(array: np.ndarray) -> np.ndarray:
    return array[..., 0] * 0.2126 + array[..., 1] * 0.7152 + array[..., 2] * 0.0722


def metrics(original: Image.Image, clone: Image.Image) -> dict[str, float]:
    original_array = np.asarray(original, dtype=np.float32)
    clone_array = np.asarray(clone, dtype=np.float32)
    difference = np.abs(original_array - clone_array)

    height = original_array.shape[0]
    scene_slice = np.s_[int(height * 0.08) : int(height * 0.96), :, :]
    floor_slice = np.s_[int(height * 0.48) : int(height * 0.96), :, :]

    scene_mae = float(difference[scene_slice].mean())
    floor_mae = float(difference[floor_slice].mean())
    original_floor = original_array[floor_slice]
    clone_floor = clone_array[floor_slice]
    original_floor_luma = luminance(original_floor)
    clone_floor_luma = luminance(clone_floor)

    original_chroma = original_floor.max(axis=2) - original_floor.min(axis=2)
    clone_chroma = clone_floor.max(axis=2) - clone_floor.min(axis=2)
    original_bright_color = (original_floor_luma > 95) & (original_chroma > 55)
    clone_bright_color = (clone_floor_luma > 95) & (clone_chroma > 55)

    return {
        "sceneMae": round(scene_mae, 4),
        "sceneSimilarity": round(max(0.0, 1.0 - scene_mae / 255.0), 6),
        "floorMae": round(floor_mae, 4),
        "originalFloorLuminance": round(float(original_floor_luma.mean()), 4),
        "cloneFloorLuminance": round(float(clone_floor_luma.mean()), 4),
        "originalFloorBrightColorRatio": round(float(original_bright_color.mean()), 6),
        "cloneFloorBrightColorRatio": round(float(clone_bright_color.mean()), 6),
    }


def sheet_panel(image: Image.Image, title: str) -> Image.Image:
    panel = Image.new("RGB", (SHEET_SIZE[0], SHEET_SIZE[1] + 30), "black")
    resized = image.resize(SHEET_SIZE, Image.Resampling.LANCZOS)
    panel.paste(resized, (0, 30))
    ImageDraw.Draw(panel).text((10, 8), title, fill="white")
    return panel


def save_worst_sheet(records: list[dict], count: int = 12) -> None:
    worst = sorted(records, key=lambda item: item["metrics"]["sceneMae"], reverse=True)[:count]
    sheet = Image.new("RGB", (SHEET_SIZE[0] * 3, (SHEET_SIZE[1] + 30) * len(worst)), "black")
    for row, record in enumerate(worst):
        original = Image.open(record["originalPath"]).convert("RGB")
        clone = Image.open(record["clonePath"]).convert("RGB")
        diff = ImageChops.difference(
            original.resize(SHEET_SIZE, Image.Resampling.BILINEAR),
            clone.resize(SHEET_SIZE, Image.Resampling.BILINEAR),
        )
        diff = ImageEnhance.Contrast(diff).enhance(2.2)
        y = row * (SHEET_SIZE[1] + 30)
        sheet.paste(sheet_panel(original, f"ORIGINAL {record['phase']} #{record['originalIndex']}") , (0, y))
        sheet.paste(sheet_panel(clone, f"CLONE #{record['cloneIndex']} similarity {record['metrics']['sceneSimilarity']:.3f}"), (SHEET_SIZE[0], y))
        sheet.paste(sheet_panel(diff, f"DIFF floor MAE {record['metrics']['floorMae']:.1f}"), (SHEET_SIZE[0] * 2, y))
    sheet.save(OUTPUT_ROOT / "worst-frame-pairs.jpg", quality=88)


def save_phase_sheet(records_by_phase: dict[str, list[dict]]) -> None:
    rows = []
    for phase in PHASE_MAP:
        phase_records = records_by_phase.get(phase, [])
        if not phase_records:
            continue
        for fraction in (0.0, 0.5, 1.0):
            index = round(fraction * (len(phase_records) - 1))
            rows.append((phase, fraction, phase_records[index]))

    sheet = Image.new("RGB", (SHEET_SIZE[0] * 2, (SHEET_SIZE[1] + 30) * len(rows)), "black")
    for row, (phase, fraction, record) in enumerate(rows):
        original = Image.open(record["originalPath"]).convert("RGB")
        clone = Image.open(record["clonePath"]).convert("RGB")
        y = row * (SHEET_SIZE[1] + 30)
        sheet.paste(sheet_panel(original, f"ORIGINAL {phase} {fraction:.0%}"), (0, y))
        sheet.paste(sheet_panel(clone, f"CLONE {phase} {fraction:.0%}"), (SHEET_SIZE[0], y))
    sheet.save(OUTPUT_ROOT / "phase-start-mid-end.jpg", quality=88)


def summarize(values: list[float]) -> dict[str, float]:
    array = np.asarray(values, dtype=np.float64)
    return {
        "mean": round(float(array.mean()), 6),
        "median": round(float(np.median(array)), 6),
        "p90": round(float(np.quantile(array, 0.9)), 6),
        "min": round(float(array.min()), 6),
        "max": round(float(array.max()), 6),
    }


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

    original_frames = load_manifest(ORIGINAL_ROOT)
    clone_frames = load_manifest(CLONE_ROOT)
    original_by_phase = group_by_phase(original_frames)
    clone_by_phase = group_by_phase(clone_frames)

    records: list[dict] = []
    records_by_phase: dict[str, list[dict]] = defaultdict(list)

    for original_phase, clone_phase in PHASE_MAP.items():
        originals = original_by_phase.get(original_phase, [])
        clones = clone_by_phase.get(clone_phase, [])
        if not originals or not clones:
            continue
        for local_index, original_frame in enumerate(originals):
            progress = local_index / max(len(originals) - 1, 1)
            clone_local_index = round(progress * max(len(clones) - 1, 0))
            clone_frame = clones[clone_local_index]
            original_file = frame_path(ORIGINAL_ROOT, original_frame)
            clone_file = frame_path(CLONE_ROOT, clone_frame)
            original_image = load_rgb(original_file, ANALYSIS_SIZE)
            clone_image = load_rgb(clone_file, ANALYSIS_SIZE)
            record = {
                "phase": original_phase,
                "phaseProgress": round(progress, 6),
                "originalIndex": original_frame["index"],
                "cloneIndex": clone_frame["index"],
                "originalFilename": original_frame["filename"],
                "cloneFilename": clone_frame["filename"],
                "originalPath": str(original_file).replace("\\", "/"),
                "clonePath": str(clone_file).replace("\\", "/"),
                "metrics": metrics(original_image, clone_image),
            }
            records.append(record)
            records_by_phase[original_phase].append(record)

    phase_summaries = {}
    for phase, phase_records in records_by_phase.items():
        phase_summaries[phase] = {
            "pairedOriginalFrames": len(phase_records),
            "sceneSimilarity": summarize([record["metrics"]["sceneSimilarity"] for record in phase_records]),
            "sceneMae": summarize([record["metrics"]["sceneMae"] for record in phase_records]),
            "floorMae": summarize([record["metrics"]["floorMae"] for record in phase_records]),
            "originalFloorLuminance": summarize([record["metrics"]["originalFloorLuminance"] for record in phase_records]),
            "cloneFloorLuminance": summarize([record["metrics"]["cloneFloorLuminance"] for record in phase_records]),
            "originalFloorBrightColorRatio": summarize([record["metrics"]["originalFloorBrightColorRatio"] for record in phase_records]),
            "cloneFloorBrightColorRatio": summarize([record["metrics"]["cloneFloorBrightColorRatio"] for record in phase_records]),
        }

    report = {
        "method": "Every original compositor frame paired to the nearest clone frame at the same normalized progress within the matching input phase.",
        "originalFrameCount": len(original_frames),
        "cloneFrameCount": len(clone_frames),
        "pairedOriginalFrameCount": len(records),
        "phaseMap": PHASE_MAP,
        "overall": {
            "sceneSimilarity": summarize([record["metrics"]["sceneSimilarity"] for record in records]),
            "sceneMae": summarize([record["metrics"]["sceneMae"] for record in records]),
            "floorMae": summarize([record["metrics"]["floorMae"] for record in records]),
            "originalFloorLuminance": summarize([record["metrics"]["originalFloorLuminance"] for record in records]),
            "cloneFloorLuminance": summarize([record["metrics"]["cloneFloorLuminance"] for record in records]),
            "originalFloorBrightColorRatio": summarize([record["metrics"]["originalFloorBrightColorRatio"] for record in records]),
            "cloneFloorBrightColorRatio": summarize([record["metrics"]["cloneFloorBrightColorRatio"] for record in records]),
        },
        "phases": phase_summaries,
        "frames": records,
    }

    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    save_worst_sheet(records)
    save_phase_sheet(records_by_phase)

    print(json.dumps({
        "originalFrameCount": report["originalFrameCount"],
        "cloneFrameCount": report["cloneFrameCount"],
        "pairedOriginalFrameCount": report["pairedOriginalFrameCount"],
        "overall": report["overall"],
        "report": str(REPORT_PATH),
        "worstSheet": str(OUTPUT_ROOT / "worst-frame-pairs.jpg"),
        "phaseSheet": str(OUTPUT_ROOT / "phase-start-mid-end.jpg"),
    }, indent=2))


if __name__ == "__main__":
    main()
