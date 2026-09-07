import { memo, useEffect, useRef, useState } from 'react';

const LINES = ['+ADD', 'PLATES!!'];
const POOL = '#%&@$?!*+=/{}[]<>~^';
const FLAT = LINES.join('').split('');

/** mulberry32 — 시드 고정. 매 재생이 같은 순서로 흐른다 (로그인 화면과 같은 함수) */
function makeRng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 홈 헤더 좌측의 브랜드 마크.
 *
 * 로그인 화면 헤드라인과 같은 decrypt/scramble 이다 — 락인 시각·교체 주기·재실행
 * 간격을 그대로 쓴다. 다른 것은 팔레트뿐이다: 로그인은 검은 배경이라 회색에서
 * 흰색으로 굳지만, 여기는 밝은 배경이라 흐르는 동안 accent 를 띠고 ink 로 굳는다.
 *
 * DOM 을 직접 만지지 않고 상태로 돌린다. 12글자짜리라 리렌더 비용이 무의미하고,
 * 정지 상태(글자가 전부 확정된 상태)가 곧 정답이라 애니메이션이 끊겨도 안전하다.
 */
function BrandMarkBase() {
  const [txt, setTxt] = useState<string[]>(() => FLAT.map((c) => c));
  const [on, setOn] = useState<boolean[]>(() => FLAT.map(() => true));
  const raf = useRef(0);
  const timer = useRef(0);

  useEffect(() => {
    // 감속 설정이면 흐르게 하지 않는다. 최종 상태가 이미 초기값이다
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rng = makeRng(7);
    let alive = true;

    const run = () => {
      const t0 = performance.now();
      const lock = FLAT.map((_, i) => 820 + i * 72 + (rng() * 2 - 1) * 110);
      const next = FLAT.map(() => 0);
      const cur = FLAT.map(() => ' ');
      const done = FLAT.map(() => false);

      const tick = () => {
        if (!alive) return;
        const now = performance.now() - t0;
        let all = true;
        for (let i = 0; i < FLAT.length; i += 1) {
          if (done[i]) continue;
          if (now >= lock[i]) {
            cur[i] = FLAT[i];
            done[i] = true;
          } else {
            all = false;
            if (now >= next[i]) {
              cur[i] = POOL[Math.floor(rng() * POOL.length)];
              next[i] = now + 46 + rng() * 35;
            }
          }
        }
        setTxt(cur.slice());
        setOn(done.slice());
        if (all) {
          timer.current = window.setTimeout(run, 6800); // 완료 6.8초 뒤 재실행
          return;
        }
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    };

    run();
    return () => {
      alive = false;
      cancelAnimationFrame(raf.current);
      clearTimeout(timer.current);
    };
  }, []);

  const cut = LINES[0].length;
  const line = (from: number, to: number) => (
    <div>
      {txt.slice(from, to).map((ch, i) => (
        <span key={from + i} className={on[from + i] ? 'gp-brand__c gp-brand__c--on' : 'gp-brand__c'}>
          {ch}
        </span>
      ))}
    </div>
  );

  return (
    <div className="gp-brand" aria-label={LINES.join(' ')}>
      <span aria-hidden="true">
        {line(0, cut)}
        {line(cut, FLAT.length)}
      </span>
    </div>
  );
}

export const BrandMark = memo(BrandMarkBase);
