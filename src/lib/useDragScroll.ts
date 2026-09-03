import { useEffect, useRef } from 'react';

/**
 * 가로 스크롤 컨테이너의 드래그 + 관성. 날짜 스트립과 종목 시트 필터 행이 같이 쓴다.
 * setPointerCapture 는 쓰지 않는다 — 탭이 자식 버튼에 도달하지 못한다.
 */
export function useDragScroll() {
  const drag = useRef<{
    on: boolean;
    x: number;
    left: number;
    lastX: number;
    lastT: number;
    v: number;
    moved: boolean;
  } | null>(null);
  const fling = useRef(0);

  useEffect(() => () => cancelAnimationFrame(fling.current), []);

  const onPointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    const el = ev.currentTarget;
    cancelAnimationFrame(fling.current);
    drag.current = {
      on: true,
      x: ev.clientX,
      left: el.scrollLeft,
      lastX: ev.clientX,
      lastT: performance.now(),
      v: 0,
      moved: false,
    };
  };

  const onPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    const s = drag.current;
    if (!s || !s.on) return;
    const now = performance.now();
    const dt = now - s.lastT;
    if (Math.abs(ev.clientX - s.x) > 6) s.moved = true;
    ev.currentTarget.scrollLeft = s.left - (ev.clientX - s.x);
    if (dt > 0) {
      // 속도 EMA
      s.v = 0.72 * ((ev.clientX - s.lastX) / dt) + 0.28 * s.v;
      s.lastX = ev.clientX;
      s.lastT = now;
    }
  };

  const onPointerUp = (ev: React.PointerEvent<HTMLDivElement>) => {
    const s = drag.current;
    if (!s || !s.on) return;
    s.on = false;
    const el = ev.currentTarget;
    let v = s.v * 16;
    const glide = () => {
      v *= 0.94; // 관성 감속
      if (Math.abs(v) < 0.4) return;
      el.scrollLeft -= v;
      fling.current = requestAnimationFrame(glide);
    };
    if (Math.abs(v) > 1) fling.current = requestAnimationFrame(glide);
  };

  // 6px 넘게 끌었으면 그 클릭 1회를 무효화한다 (스와이프 후 오탭 방지)
  const onClickCapture = (ev: React.MouseEvent<HTMLDivElement>) => {
    const s = drag.current;
    if (s?.moved) {
      s.moved = false;
      ev.stopPropagation();
      ev.preventDefault();
    }
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave: onPointerUp, onClickCapture };
}
