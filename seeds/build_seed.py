#!/usr/bin/env python3
"""
docs/research/exercises.md 의 부위별 표를 파싱해 시드 파일을 만든다.
출력: seeds/exercises.json (사람이 읽는 정본) + seeds/seed_exercises.sql (Supabase 주입용)

정본은 마크다운 문서다. 종목을 고칠 때는 문서를 고치고 이 스크립트를 다시 돌린다.
"""
import re, json, sys, pathlib

SRC = pathlib.Path("docs/research/exercises.md")
OUT_DIR = pathlib.Path("seeds")

# 한글 초성 추출 --------------------------------------------------
CHO = list("ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ")

def chosung(text: str) -> str:
    """'벤치프레스' -> 'ㅂㅊㅍㄹㅅ'. 한글이 아닌 글자는 그대로 둔다."""
    out = []
    for ch in text:
        code = ord(ch)
        if 0xAC00 <= code <= 0xD7A3:          # 완성형 한글
            out.append(CHO[(code - 0xAC00) // 588])
        elif ch.strip():                       # 영문·숫자는 소문자로 보존
            out.append(ch.lower())
    return "".join(out)

# 표기 → DB 코드 --------------------------------------------------
MUSCLE = {"가슴":"chest","등":"back","어깨":"shoulder","하체":"leg",
          "이두":"biceps","삼두":"triceps","코어":"core"}

SUB = {"전반":"general","윗가슴":"upper_chest","광배":"lats","승모":"traps",
       "기립근":"erectors","전면":"front_delt","측면":"side_delt","후면":"rear_delt",
       "대퇴사두":"quads","햄스트링":"hamstrings","둔근":"glutes","종아리":"calves",
       "내전근":"adductors","장두":"long_head","복직근":"rectus_abdominis",
       "복사근":"obliques"}

EQUIP = {"바벨":"barbell","덤벨":"dumbbell","머신":"machine","케이블":"cable",
         "맨몸":"bodyweight","케틀벨":"kettlebell","밴드":"band","기타":"other"}

TRACK = {"무게+횟수":"weight_reps","횟수만":"bodyweight_reps",
         # 어시스트 머신 — 무게추가 체중을 덜어준다. 값이 줄어드는 게 성장이라
         # 일일 총 볼륨에서 제외하고 비교 시 부호를 뒤집는다.
         "보조중량":"assist_reps"}

# 파싱 ------------------------------------------------------------
def parse():
    text = SRC.read_text(encoding="utf-8")
    rows, part, in_table = [], None, False

    for line in text.splitlines():
        head = re.match(r"^### (가슴|등|어깨|하체|이두|삼두|코어) \((\d+)\)", line)
        if head:
            part, in_table = head.group(1), True
            continue
        if line.startswith("## ") or (line.startswith("### ") and not head):
            in_table = False                    # 부위 표 구간을 벗어남
            continue
        if not (in_table and line.startswith("| ")):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 8 or cells[0] == "표준명" or set(cells[0]) <= {"-"}:
            continue

        name, alias_raw, part_ko, sub_ko, equip_ko, track_ko, asset_raw = cells[:7]
        if part_ko not in MUSCLE:               # 부위 칸이 아니면 표가 아니다
            continue

        aliases = [a.strip() for a in alias_raw.split(",") if a.strip()]
        asset = re.sub(r"[`\s]", "", asset_raw)
        rows.append({
            "name": name,
            "chosung": chosung(name),
            "aliases": aliases,
            "alias_chosung": [chosung(a) for a in aliases if re.search(r"[가-힣]", a)],
            "muscle_group": MUSCLE[part_ko],
            "sub_region": SUB.get(sub_ko),      # '—' 등은 None
            "equipment": EQUIP.get(equip_ko, "other"),
            "tracking_type": TRACK.get(track_ko, "weight_reps"),
            "asset_slug": None if asset in ("없음", "") else asset,
        })
    return rows

def sql_str(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"

def sql_arr(items):
    return "array[" + ",".join(sql_str(i) for i in items) + "]::text[]" if items else "'{}'::text[]"

def main():
    rows = parse()
    OUT_DIR.mkdir(exist_ok=True)

    (OUT_DIR / "exercises.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines = [
        "-- 기본 운동 종목 시드 (자동 생성 — 직접 고치지 마라)",
        "-- 정본: docs/research/exercises.md  /  생성: seeds/build_seed.py",
        f"-- 종목 {len(rows)}개",
        "",
        "insert into exercises",
        "  (name, chosung, aliases, alias_chosung, muscle_group, sub_region, equipment, tracking_type, asset_slug, owner_id)",
        "values",
    ]
    vals = []
    for r in rows:
        vals.append("  (" + ", ".join([
            sql_str(r["name"]), sql_str(r["chosung"]), sql_arr(r["aliases"]),
            sql_arr(r["alias_chosung"]),
            sql_str(r["muscle_group"]), sql_str(r["sub_region"]),
            sql_str(r["equipment"]), sql_str(r["tracking_type"]),
            sql_str(r["asset_slug"]), "null",
        ]) + ")")
    lines.append(",\n".join(vals))
    lines.append("on conflict do nothing;")
    (OUT_DIR / "seed_exercises.sql").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # 요약
    from collections import Counter
    print(f"종목 {len(rows)}개")
    print("  부위:", dict(Counter(r["muscle_group"] for r in rows)))
    print("  기록:", dict(Counter(r["tracking_type"] for r in rows)))
    print("  에셋 없음:", sum(1 for r in rows if not r["asset_slug"]))
    print("  세부부위 없음:", sum(1 for r in rows if not r["sub_region"]))
    dup = [n for n, c in Counter(r["name"] for r in rows).items() if c > 1]
    print("  이름 중복:", dup or "없음")

if __name__ == "__main__":
    main()
