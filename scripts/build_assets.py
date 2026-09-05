#!/usr/bin/env python3
"""운동 일러스트 에셋 빌드.

workout-guide(Everkinetic / Bryl Lim, 이미지 CC BY-SA 4.0) 의 SVG 중
seeds/exercises.json 의 asset_slug 에 매핑된 것만 골라 public/exercises/ 로 옮긴다.

하는 일
  1. frame-1·2·3 을 모두 옮긴다
     - frame-1 은 `<slug>.svg` — 목록 썸네일이 쓰는 정지 컷
     - frame-2·3 은 `<slug>-2.svg` / `<slug>-3.svg` — 확대 모달에서만 받아 동작을 순환 재생한다
  2. width/height 속성 제거 — viewBox 만 남겨 CSS 가 크기를 정하게 한다
  3. fill="#fff" → fill="currentColor" — 라이트/다크 양쪽에서 CSS 토큰이 색을 정한다
  4. svgo 로 최적화 (약 40% 감소)

쓰는 법
  python3 scripts/build_assets.py [--src <workout-guide/packages/workout-guide/assets 경로>]
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEEDS = ROOT / "seeds" / "exercises.json"
OUT = ROOT / "public" / "exercises"
SVGO = ROOT / "node_modules" / ".bin" / "svgo"
SVGO_CONFIG = ROOT / "scripts" / "svgo.config.mjs"
DEFAULT_SRC = ROOT / ".cache" / "workout-guide" / "packages" / "workout-guide" / "assets"

CLONE_HINT = (
    "에셋 원본이 없습니다. 아래로 받은 뒤 다시 실행하세요:\n"
    "  git clone --depth 1 https://github.com/bryllim/workout-guide.git .cache/workout-guide\n"
    "다른 경로에 있다면 --src 로 지정하세요."
)

# width/height 는 지우고 viewBox 는 남긴다
SIZE_ATTR = re.compile(r'\s(?:width|height)="[^"]*"')


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", type=Path, default=DEFAULT_SRC)
    args = ap.parse_args()

    src: Path = args.src
    if not src.is_dir():
        print(CLONE_HINT, file=sys.stderr)
        return 1
    if not SVGO.exists():
        print("svgo 가 없습니다. `npm install` 을 먼저 실행하세요.", file=sys.stderr)
        return 1

    exercises = json.loads(SEEDS.read_text(encoding="utf-8"))
    slugs = sorted({e["asset_slug"] for e in exercises if e.get("asset_slug")})
    no_slug = sum(1 for e in exercises if not e.get("asset_slug"))

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    missing = []
    for slug in slugs:
        for n in (1, 2, 3):
            frame = src / slug / f"frame-{n}.svg"
            if not frame.is_file():
                missing.append(f"{slug}/frame-{n}")
                continue
            svg = frame.read_text(encoding="utf-8")
            # <svg ...> 여는 태그에서만 width/height 를 지운다 (내부 도형에는 손대지 않는다)
            head, rest = svg.split(">", 1)
            svg = SIZE_ATTR.sub("", head) + ">" + rest
            svg = svg.replace('fill="#fff"', 'fill="currentColor"')
            # frame-1 은 접미사 없이 — 목록 썸네일이 slug 만으로 주소를 만든다
            name = slug if n == 1 else f"{slug}-{n}"
            (OUT / f"{name}.svg").write_text(svg, encoding="utf-8")

    if missing:
        print(f"원본 없음 {len(missing)}개: {', '.join(missing[:5])}…", file=sys.stderr)

    subprocess.run(
        [str(SVGO), "-q", "-f", str(OUT), "-o", str(OUT), "--config", str(SVGO_CONFIG)],
        check=True,
    )

    files = sorted(OUT.glob("*.svg"))
    total = sum(f.stat().st_size for f in files)
    first = [f for f in files if not f.stem.endswith(("-2", "-3"))]
    first_total = sum(f.stat().st_size for f in first)
    print(f"프레임 {len(files)}개 · {total / 1024:.0f}KB (평균 {total / len(files) / 1024:.1f}KB)")
    print(f"  이 중 목록 썸네일(frame-1) {len(first)}개 · {first_total / 1024:.0f}KB")
    print(f"에셋 없는 종목 {no_slug}개 → 화면에서는 부위 색 폴백으로 채운다")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
