import { useEffect, useRef } from 'react';

/** 닫힘 임계값 — 100px 과 시트 높이의 25% 중 먼저 닿는 쪽 */
const CLOSE_PX = 100;
const CLOSE_RATIO = 0.25;
/** 복귀·퇴장 길이. 이징은 토큰의 --ease-swipe */
const SNAP_MS = 240;

/**
 * 바텀시트 그랩 핸들을 아래로 끌어 닫는다. 8개 시트가 같이 쓴다.
 * sheetRef 를 .gp-sheet 에, handle 을 .gp-grab 에 편다.
 *
 * 핸들에만 붙인다 — 시트 헤더까지 넓히면 PickerSheet 의 검색 입력과
 * 가로 드래그 필터 행, TimeSheet 의 스크롤 휠을 가로챈다.
 * 대신 .gp-grab 의 히트 영역을 CSS 에서 넓혀 뒀다(시각 크기는 38×4 그대로).
 */
export function useSheetDrag(onClose: () => void) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; y: number; dy: number; still: boolean } | null>(null);
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onPointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    const el = sheetRef.current;
    if (!el) return;
    // 핸들에는 자식 버튼이 없다 — 캡처해도 탭을 가로채지 않는다
    ev.currentTarget.setPointerCapture(ev.pointerId);
    clearTimeout(timer.current);
    drag.current = {
      id: ev.pointerId,
      y: ev.clientY,
      dy: 0,
      // reduce 면 따라오는 애니메이션 없이 임계값만 판단한다
      still: matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
    el.style.transition = 'none';
    // 열림 애니메이션이 아직 돌고 있으면 transform 을 덮어써 손가락을 못 따라온다
    el.style.animation = 'none';
  };

  const onPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    const s = drag.current;
    const el = sheetRef.current;
    if (!s || !el || ev.pointerId !== s.id) return;
    // 위로 끄는 건 무시한다
    s.dy = Math.max(0, ev.clientY - s.y);
    if (!s.still) el.style.transform = `translateY(${s.dy}px)`;
  };

  const onPointerUp = (ev: React.PointerEvent<HTMLDivElement>) => {
    const s = drag.current;
    const el = sheetRef.current;
    if (!s || !el || ev.pointerId !== s.id) return;
    drag.current = null;

    const limit = Math.min(CLOSE_PX, el.offsetHeight * CLOSE_RATIO);
    if (s.dy < limit) {
      // 못 넘겼으면 제자리로
      el.style.transition = `transform ${SNAP_MS}ms var(--ease-swipe)`;
      el.style.transform = 'translateY(0)';
      return;
    }

    if (s.still) {
      onClose();
      return;
    }
    el.style.transition = `transform ${SNAP_MS}ms var(--ease-swipe)`;
    el.style.transform = 'translateY(100%)';
    timer.current = window.setTimeout(onClose, SNAP_MS);
  };

  return {
    sheetRef,
    handle: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
