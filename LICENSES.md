# 서드파티 라이선스

## 운동 일러스트 — `public/exercises/*.svg`

- 출처: [workout-guide](https://github.com/bryllim/workout-guide) (Bryl Lim), 원본 일러스트 [Everkinetic](https://everkinetic.com/)
- 라이선스: **[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)** (이미지). 리포지터리 코드는 MIT.
- 변경 내용: `frame-1`(준비 자세)만 선별, `width`/`height` 속성 제거(`viewBox` 유지),
  `fill="#fff"` → `fill="currentColor"` 치환, svgo 최적화(`--precision=1`).
  변환 절차는 `scripts/build_assets.py` 에 있다.
- 표기 위치: 앱 설정 화면 하단 + 이 파일.

CC BY-SA 4.0 은 **출처 표기**와 **동일 조건 재배포(ShareAlike)** 를 요구한다.
일러스트를 고쳐서 배포할 경우 파생물도 같은 라이선스를 따라야 한다.
